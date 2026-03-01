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

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const EMBEDDING_MODEL = "models/text-embedding-004";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ── Helpers ─────────────────────────────────────────────────────────────────

function errorResp(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
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

// ── Text extraction ─────────────────────────────────────────────────────────

function extractTxt(data: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(data);
}

function extractPdf(data: Uint8Array): string {
  const content = new TextDecoder("latin1").decode(data);
  const btBlocks = content.match(/BT([\s\S]*?)ET/g) || [];
  const parts: string[] = [];
  for (const block of btBlocks) {
    const tjStrings = block.match(/\((.*?)\)\s*Tj/g) || [];
    for (const s of tjStrings) {
      const match = s.match(/\((.*?)\)\s*Tj/);
      if (match) {
        parts.push(
          match[1]
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\")
            .replace(/\\\(/g, "(")
            .replace(/\\\)/g, ")")
        );
      }
    }
    const tjArrayStrings = block.match(/\[(.*?)\]\s*TJ/g) || [];
    for (const s of tjArrayStrings) {
      const innerMatch = s.match(/\[(.*?)\]\s*TJ/);
      if (innerMatch) {
        const innerStrings = innerMatch[1].match(/\((.*?)\)/g) || [];
        for (const is of innerStrings) {
          const m = is.match(/\((.*?)\)/);
          if (m) parts.push(m[1]);
        }
      }
    }
  }
  return parts
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractDocx(data: Uint8Array): string {
  // DOCX is a ZIP; we need to find word/document.xml
  // Use a minimal approach: search for <w:t> tags
  // First, find the ZIP local file headers for word/document.xml
  const text = new TextDecoder("utf-8", { fatal: false }).decode(data);

  // Simple approach: find all <w:t> content
  const matches = text.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
  const parts: string[] = [];
  for (const m of matches) {
    const inner = m.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
    if (inner) parts.push(inner[1]);
  }
  return parts
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractText(filename: string, data: Uint8Array): string {
  const ext = filename.includes(".")
    ? filename.split(".").pop()!.toLowerCase()
    : "";
  if (ext === "txt") return extractTxt(data);
  if (ext === "pdf") return extractPdf(data);
  if (ext === "docx") return extractDocx(data);
  throw new Error(`Unsupported file type '.${ext}'`);
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

// ── Gemini embedding ────────────────────────────────────────────────────────

async function embedText(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  const url = `${GEMINI_BASE}/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType,
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Gemini embedding error ${resp.status}: ${errBody}`);
  }
  const data = await resp.json();
  return data.embedding.values;
}

const EMBED_CONCURRENCY = 5;

async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  console.log("Chunks count:", texts.length);
  const results: number[][] = new Array(texts.length);
  const totalBatches = Math.ceil(texts.length / EMBED_CONCURRENCY);

  for (let i = 0; i < texts.length; i += EMBED_CONCURRENCY) {
    const batchNum = Math.floor(i / EMBED_CONCURRENCY) + 1;
    console.log(`Embedding batch ${batchNum}/${totalBatches}`);
    const batch = texts.slice(i, i + EMBED_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((t) => embedText(t, taskType))
    );
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }

  return results;
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
  return base.replace(/[^\w\s\-_.]/g, "").slice(0, 255) || "unnamed";
}

// ── Base64 decode ───────────────────────────────────────────────────────────

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResp("Unauthorized", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return errorResp("Unauthorized", 401);
    }
    const userId = claimsData.user.id;

    // Parse body
    const body = await req.json();
    const fileName: string = (body.file_name || "").trim();
    const fileDataB64: string = body.file_data || "";

    if (!fileName) return errorResp("Missing file_name");
    if (!fileDataB64) return errorResp("Missing file_data");

    // Validate extension
    const ext = fileName.includes(".")
      ? fileName.split(".").pop()!.toLowerCase()
      : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return errorResp(
        `Unsupported file type '.${ext}'. Allowed: PDF, TXT, DOCX`
      );
    }

    // Decode
    let fileBytes: Uint8Array;
    try {
      fileBytes = base64ToUint8Array(fileDataB64);
    } catch {
      return errorResp("file_data must be valid base64");
    }

    if (fileBytes.length > MAX_FILE_SIZE_BYTES) {
      return errorResp("File too large. Maximum allowed size is 5MB.", 413);
    }

    // Check quota
    const { data: docCountData, error: countErr } = await supabase
      .from("rag_documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countErr) return errorResp(`Database error: ${countErr.message}`, 500);

    const docCount = docCountData?.length ?? 0;
    // Use the count from headers
    const { count } = await supabase
      .from("rag_documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count ?? 0) >= MAX_FILES_PER_USER) {
      return errorResp(
        `Document limit reached (${MAX_FILES_PER_USER} files). Delete one first.`,
        429
      );
    }

    // Check duplicate by hash
    const fileHash = await sha256(fileBytes);
    const { data: existing } = await supabase
      .from("rag_documents")
      .select("id")
      .eq("user_id", userId)
      .eq("file_hash", fileHash)
      .maybeSingle();

    if (existing) {
      return okResp({
        success: true,
        document_id: existing.id,
        chunks_created: 0,
        message: "File already indexed — skipping re-embedding.",
        duplicate: true,
      });
    }

    // Extract text
    let rawText: string;
    try {
      rawText = extractText(fileName, fileBytes);
    } catch (e) {
      return errorResp(`Text extraction failed: ${(e as Error).message}`, 422);
    }

    if (!rawText.trim()) {
      return errorResp("File appears empty or contains no readable text.", 422);
    }

    // Chunk
    const chunks = chunkText(rawText);
    if (chunks.length === 0) {
      return errorResp("No text chunks could be generated.", 422);
    }

    console.log("Upload started for:", fileName, "Chunks:", chunks.length);

    // Insert document (NO embedding — lazy embedding on first query)
    const safeName = sanitizeFilename(fileName);
    const { data: docRow, error: docErr } = await supabase
      .from("rag_documents")
      .insert({ user_id: userId, file_name: safeName, file_hash: fileHash })
      .select("id")
      .single();

    if (docErr || !docRow) {
      return errorResp(`Failed to create document: ${docErr?.message}`, 500);
    }

    const documentId = docRow.id;

    // Insert chunks with embedding_json = NULL (will be filled lazily on first query)
    const chunkRows = chunks.map((text) => ({
      document_id: documentId,
      user_id: userId,
      chunk_text: text,
      embedding_json: "",
    }));

    const { error: chunkErr } = await supabase
      .from("rag_chunks")
      .insert(chunkRows);

    if (chunkErr) {
      // Rollback document
      await supabase.from("rag_documents").delete().eq("id", documentId);
      return errorResp(`Failed to store chunks: ${chunkErr.message}`, 500);
    }

    return okResp({
      success: true,
      document_id: documentId,
      chunks_created: chunks.length,
    });
  } catch (e) {
    return errorResp(`Unexpected error: ${(e as Error).message}`, 500);
  }
});
