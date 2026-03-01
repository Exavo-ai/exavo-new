import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILES_PER_USER = 3;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "docx"]);
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;
const RAG_BUCKET = "rag-files";

// ── Helpers ─────────────────────────────────────────────────────────────────

function errorResp(body: string | { step: string; message: string }, status = 400) {
  const payload = typeof body === "string" ? { error: body } : { error: body.message, step: body.step };
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okResp(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── MIME type detection ──────────────────────────────────────────────────────

function getMimeType(filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}

// ── Gemini text extraction ──────────────────────────────────────────────────

async function extractTextWithGemini(filename: string, fileBytes: Uint8Array): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const mimeType = getMimeType(filename);

  // For plain text, just decode directly — no need for AI
  if (mimeType === "text/plain") {
    return new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
  }

  // Convert bytes to base64
  let base64File = "";
  const SLICE = 8192;
  for (let i = 0; i < fileBytes.length; i += SLICE) {
    base64File += String.fromCharCode(...fileBytes.subarray(i, i + SLICE));
  }
  base64File = btoa(base64File);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64File } },
            { text: "Extract ALL readable text from this document exactly as written. Return only raw text with no commentary." },
          ],
        }],
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const geminiJson = await response.json();
  return geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Chunking ────────────────────────────────────────────────────────────────

function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): string[] {
  if (!text.trim()) return [];
  const normalized = text.trim().replace(/\n{3,}/g, "\n\n");
  const paragraphs = normalized.split("\n\n").filter((p) => p.trim());
  const wordBudget = Math.floor(chunkSize / 1.33);
  const overlapWords = Math.floor(overlap / 1.33);
  const chunks: string[] = [];
  let currentWords: string[] = [];

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/);
    if (paraWords.length > wordBudget) {
      if (currentWords.length > 0) {
        chunks.push(currentWords.join(" "));
        currentWords = overlapWords
          ? currentWords.slice(-overlapWords)
          : [];
      }
      for (let i = 0; i < paraWords.length; i += wordBudget - overlapWords) {
        const piece = paraWords.slice(i, i + wordBudget);
        if (piece.length > 0) chunks.push(piece.join(" "));
      }
      if (overlapWords && chunks.length > 0) {
        currentWords = chunks[chunks.length - 1]
          .split(/\s+/)
          .slice(-overlapWords);
      }
      continue;
    }
    if (currentWords.length + paraWords.length <= wordBudget) {
      currentWords.push(...paraWords);
    } else {
      if (currentWords.length > 0) chunks.push(currentWords.join(" "));
      currentWords = overlapWords
        ? [...currentWords.slice(-overlapWords), ...paraWords]
        : [...paraWords];
    }
  }
  if (currentWords.length > 0) chunks.push(currentWords.join(" "));
  return chunks.filter((c) => c.trim());
}

// ── SHA-256 ─────────────────────────────────────────────────────────────────

async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeFilename(name: string): string {
  const base = name.split("/").pop()!.split("\\").pop()!;
  return base.replace(/[^\\w\\s\\-_.]/g, "").slice(0, 255) || "unnamed";
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── STEP 1: Auth validation ──
    console.info("[STEP 1] AUTH_VALIDATION — start");
    let authHeader: string | null;
    try {
      authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        console.error("[STEP 1] AUTH_VALIDATION FAILED: missing Bearer token");
        return errorResp({ step: "auth_validation", message: "Unauthorized — no Bearer token" }, 401);
      }
      console.info("[STEP 1] AUTH_VALIDATION — Bearer token present");
    } catch (e) {
      console.error("[STEP 1] AUTH_VALIDATION FAILED:", (e as Error).message);
      return errorResp({ step: "auth_validation", message: (e as Error).message }, 500);
    }

    // ── STEP 2: Create clients ──
    console.info("[STEP 2] CREATE_CLIENTS — start");
    let userClient: ReturnType<typeof createClient>;
    let serviceClient: ReturnType<typeof createClient>;
    try {
      const sbUrl = Deno.env.get("SUPABASE_URL");
      const sbAnon = Deno.env.get("SUPABASE_ANON_KEY");
      const sbService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      console.info("[STEP 2] ENV check — URL:", !!sbUrl, "ANON:", !!sbAnon, "SERVICE:", !!sbService);

      userClient = createClient(sbUrl!, sbAnon!, {
        global: { headers: { Authorization: authHeader! } },
      });
      serviceClient = createClient(sbUrl!, sbService!);
      console.info("[STEP 2] CREATE_CLIENTS — done");
    } catch (e) {
      console.error("[STEP 2] CREATE_CLIENTS FAILED:", (e as Error).message);
      return errorResp({ step: "create_clients", message: (e as Error).message }, 500);
    }

    // ── STEP 3: Verify user ──
    console.info("[STEP 3] VERIFY_USER — start");
    let userId: string;
    try {
      const token = authHeader!.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
      if (claimsError || !claimsData.user) {
        console.error("[STEP 3] VERIFY_USER FAILED:", claimsError?.message ?? "no user");
        return errorResp({ step: "verify_user", message: claimsError?.message ?? "Unauthorized" }, 401);
      }
      userId = claimsData.user.id;
      console.info("[STEP 3] VERIFY_USER — userId:", userId);
    } catch (e) {
      console.error("[STEP 3] VERIFY_USER FAILED:", (e as Error).message);
      return errorResp({ step: "verify_user", message: (e as Error).message }, 500);
    }

    // ── STEP 4: Parse body ──
    console.info("[STEP 4] PARSE_BODY — start");
    let fileName: string;
    let filePath: string;
    try {
      const body = await req.json();
      fileName = (body.file_name || "").trim();
      filePath = (body.file_path || "").trim();
      console.info("[STEP 4] PARSE_BODY — fileName:", fileName, "filePath:", filePath);

      if (!fileName) return errorResp({ step: "parse_body", message: "Missing file_name" });
      if (!filePath) return errorResp({ step: "parse_body", message: "Missing file_path" });

      const expectedPrefix = `${userId}/`;
      if (!filePath.startsWith(expectedPrefix)) {
        console.error("[STEP 4] PARSE_BODY — path does not match user");
        return errorResp({ step: "parse_body", message: "Invalid file path — access denied" }, 403);
      }

      const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return errorResp({ step: "parse_body", message: `Unsupported file type '.${ext}'` });
      }
      console.info("[STEP 4] PARSE_BODY — done, ext:", ext);
    } catch (e) {
      console.error("[STEP 4] PARSE_BODY FAILED:", (e as Error).message);
      return errorResp({ step: "parse_body", message: (e as Error).message }, 500);
    }

    // ── STEP 5: Storage download ──
    console.info("[STEP 5] STORAGE_DOWNLOAD — start, path:", filePath);
    let fileBytes: Uint8Array;
    try {
      const { data: fileData, error: downloadErr } = await serviceClient
        .storage
        .from(RAG_BUCKET)
        .download(filePath);

      if (downloadErr || !fileData) {
        console.error("[STEP 5] STORAGE_DOWNLOAD FAILED:", downloadErr?.message);
        return errorResp({ step: "storage_download", message: `Download failed: ${downloadErr?.message}` }, 500);
      }

      fileBytes = new Uint8Array(await fileData.arrayBuffer());
      console.info("[STEP 5] STORAGE_DOWNLOAD — done, bytes:", fileBytes.length);
    } catch (e) {
      console.error("[STEP 5] STORAGE_DOWNLOAD FAILED:", (e as Error).message);
      return errorResp({ step: "storage_download", message: (e as Error).message }, 500);
    }

    // ── STEP 6: File size validation ──
    console.info("[STEP 6] FILE_SIZE_CHECK — bytes:", fileBytes.length, "max:", MAX_FILE_SIZE_BYTES);
    if (fileBytes.length > MAX_FILE_SIZE_BYTES) {
      await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
      return errorResp({ step: "file_size_check", message: "File too large (max 5MB)" }, 413);
    }
    console.info("[STEP 6] FILE_SIZE_CHECK — passed");

    // ── STEP 7: Quota check ──
    console.info("[STEP 7] QUOTA_CHECK — start");
    try {
      const { count, error: countErr } = await userClient
        .from("rag_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countErr) {
        console.error("[STEP 7] QUOTA_CHECK FAILED:", countErr.message);
        return errorResp({ step: "quota_check", message: countErr.message }, 500);
      }

      console.info("[STEP 7] QUOTA_CHECK — current count:", count);
      if ((count ?? 0) >= MAX_FILES_PER_USER) {
        await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
        return errorResp({ step: "quota_check", message: `Limit reached (${MAX_FILES_PER_USER})` }, 429);
      }
    } catch (e) {
      console.error("[STEP 7] QUOTA_CHECK FAILED:", (e as Error).message);
      return errorResp({ step: "quota_check", message: (e as Error).message }, 500);
    }

    // ── STEP 8: Duplicate check ──
    console.info("[STEP 8] DUPLICATE_CHECK — start");
    let fileHash: string;
    try {
      fileHash = await sha256(fileBytes);
      console.info("[STEP 8] DUPLICATE_CHECK — hash:", fileHash.slice(0, 12) + "...");

      const { data: existing } = await userClient
        .from("rag_documents")
        .select("id")
        .eq("user_id", userId)
        .eq("file_hash", fileHash)
        .maybeSingle();

      if (existing) {
        await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
        console.info("[STEP 8] DUPLICATE_CHECK — duplicate found:", existing.id);
        return okResp({
          success: true,
          document_id: existing.id,
          chunks_created: 0,
          message: "File already indexed — skipping.",
          duplicate: true,
        });
      }
      console.info("[STEP 8] DUPLICATE_CHECK — no duplicate");
    } catch (e) {
      console.error("[STEP 8] DUPLICATE_CHECK FAILED:", (e as Error).message);
      return errorResp({ step: "duplicate_check", message: (e as Error).message }, 500);
    }

    // ── STEP 9: Text extraction (Gemini) ──
    console.info("[STEP 9] TEXT_EXTRACTION — start (Gemini)");
    let rawText: string;
    try {
      rawText = await extractTextWithGemini(fileName, fileBytes);
      console.info("[STEP 9] TEXT_EXTRACTION — done, chars:", rawText.length);
      if (!rawText.trim()) {
        await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
        return errorResp({ step: "text_extraction", message: "Gemini returned no text from file" }, 422);
      }
    } catch (e) {
      console.error("[STEP 9] TEXT_EXTRACTION FAILED:", (e as Error).message);
      await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
      return errorResp({ step: "text_extraction", message: (e as Error).message }, 422);
    }

    // ── STEP 10: Chunking ──
    console.info("[STEP 10] CHUNKING — start");
    let chunks: string[];
    try {
      chunks = chunkText(rawText);
      console.info("[STEP 10] CHUNKING — done, chunks:", chunks.length);
      if (chunks.length === 0) {
        await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
        return errorResp({ step: "chunking", message: "No chunks generated" }, 422);
      }
    } catch (e) {
      console.error("[STEP 10] CHUNKING FAILED:", (e as Error).message);
      await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
      return errorResp({ step: "chunking", message: (e as Error).message }, 500);
    }

    // ── STEP 11: Insert rag_documents ──
    console.info("[STEP 11] DOC_INSERT — start");
    let documentId: string;
    try {
      const safeName = sanitizeFilename(fileName);
      console.info("[STEP 11] DOC_INSERT — safeName:", safeName, "hash:", fileHash!.slice(0, 12));

      const { data: docRow, error: docErr } = await serviceClient
        .from("rag_documents")
        .insert({ user_id: userId, file_name: safeName, file_hash: fileHash! })
        .select("id")
        .single();

      if (docErr || !docRow) {
        console.error("[STEP 11] DOC_INSERT FAILED:", docErr?.message, "code:", docErr?.code, "details:", docErr?.details);
        await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
        return errorResp({ step: "doc_insert", message: docErr?.message ?? "Unknown insert error" }, 500);
      }
      documentId = docRow.id;
      console.info("[STEP 11] DOC_INSERT — done, id:", documentId);
    } catch (e) {
      console.error("[STEP 11] DOC_INSERT FAILED:", (e as Error).message);
      await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
      return errorResp({ step: "doc_insert", message: (e as Error).message }, 500);
    }

    // ── STEP 12: Insert rag_chunks ──
    console.info("[STEP 12] CHUNK_INSERT — start, count:", chunks.length);
    try {
      const chunkRows = chunks.map((text) => ({
        document_id: documentId,
        user_id: userId,
        chunk_text: text,
        embedding_json: "",
      }));

      const { error: chunkErr } = await serviceClient
        .from("rag_chunks")
        .insert(chunkRows);

      if (chunkErr) {
        console.error("[STEP 12] CHUNK_INSERT FAILED:", chunkErr.message, "code:", chunkErr.code, "details:", chunkErr.details);
        await serviceClient.from("rag_documents").delete().eq("id", documentId);
        await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
        return errorResp({ step: "chunk_insert", message: chunkErr.message }, 500);
      }
      console.info("[STEP 12] CHUNK_INSERT — done");
    } catch (e) {
      console.error("[STEP 12] CHUNK_INSERT FAILED:", (e as Error).message);
      await serviceClient.from("rag_documents").delete().eq("id", documentId);
      await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
      return errorResp({ step: "chunk_insert", message: (e as Error).message }, 500);
    }

    // ── STEP 13: Storage cleanup ──
    console.info("[STEP 13] STORAGE_CLEANUP — start");
    try {
      await serviceClient.storage.from(RAG_BUCKET).remove([filePath]);
      console.info("[STEP 13] STORAGE_CLEANUP — done");
    } catch (e) {
      console.error("[STEP 13] STORAGE_CLEANUP FAILED (non-fatal):", (e as Error).message);
    }

    console.info("[COMPLETE] Upload finished. docId:", documentId, "chunks:", chunks.length);

    return okResp({
      success: true,
      document_id: documentId,
      chunks_created: chunks.length,
    });
  } catch (e) {
    console.error("[FATAL] Unexpected error:", (e as Error).message, (e as Error).stack);
    return errorResp({ step: "unknown", message: (e as Error).message }, 500);
  }
});
