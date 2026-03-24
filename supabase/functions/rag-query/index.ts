import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, createRateLimitKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_QUESTION_LENGTH = 2000;
const MAX_CONTEXT_CHARS = 12000;

// Soft rate limit: 15 questions per minute per user (invisible to user)
const QUERY_RATE_LIMIT = { maxRequests: 15, windowMs: 60 * 1000, prefix: "rag-query" };

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

function errorResp(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okResp(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return errorResp("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData.user) return errorResp("Unauthorized", 401);
    const userId = userData.user.id;

    // Soft rate limiting per user (invisible — returns generic error)
    const rateLimitKey = createRateLimitKey(req, userId);
    const rateCheck = checkRateLimit(rateLimitKey, QUERY_RATE_LIMIT);
    if (!rateCheck.allowed) {
      console.warn(`[RAG-QUERY] Rate limit hit for user ${userId}`);
      return errorResp("Please wait a moment before asking another question.", 429);
    }

    const body = await req.json();
    const question = (body.question || "").trim();
    if (!question) return errorResp("Missing or empty question");
    if (question.length > MAX_QUESTION_LENGTH) return errorResp(`Question too long (max ${MAX_QUESTION_LENGTH} chars)`);

    // Fetch all chunks for this user
    const { data: chunks, error: chunkErr } = await supabase
      .from("rag_chunks")
      .select("chunk_text, document_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (chunkErr) return errorResp(`Database error: ${chunkErr.message}`, 500);

    if (!chunks || chunks.length === 0) {
      return okResp({
        answer: "You have not uploaded any documents yet. Please upload a document before asking questions.",
        sources: [],
      });
    }

    // Concatenate chunks up to limit
    let documentText = "";
    const usedDocIds = new Set<string>();
    for (const chunk of chunks) {
      if (documentText.length + chunk.chunk_text.length > MAX_CONTEXT_CHARS) break;
      documentText += chunk.chunk_text + "\n\n";
      usedDocIds.add(chunk.document_id);
    }

    const prompt = `Answer the question based ONLY on the document below.\n\nDOCUMENT:\n${documentText.trim()}\n\nQUESTION:\n${question}`;

    // Call Gemini
    const resp = await fetch(GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      return new Response(JSON.stringify({ error: `Gemini failed (${resp.status}): ${errBody.substring(0, 500)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    const sources = Array.from(usedDocIds).map((id) => ({ document_id: id }));

    return okResp({
      answer: answer || "The requested information is not found in the provided documents.",
      sources,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("RAG QUERY ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
