/**
 * Shared blog content generation via Make.com webhook.
 * Single source of truth — used by both Admin and Playground generators.
 */

const MAKE_WEBHOOK_URL =
  "https://hook.eu1.make.com/jbt8dq78argmvlpe3gj3kojgb34v83wp";

export interface BlogGenerationResult {
  content: string;
}

export interface BlogGenerationError {
  error: string;
}

/**
 * Calls the Make.com webhook to generate blog content from a title.
 * Handles timeout, non-200 responses, and multi-format response parsing.
 *
 * @returns `{ content }` on success, `{ error }` on failure.
 */
export async function generateBlogContent(
  title: string
): Promise<BlogGenerationResult | BlogGenerationError> {
  // 1. Call webhook
  let webhookRes: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    webhookRes = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.error("[blog-webhook] Fetch failed:", err);
    return {
      error:
        "AI generation service is temporarily unavailable. Please try again later.",
    };
  }

  if (!webhookRes.ok) {
    console.error(`[blog-webhook] Webhook returned status ${webhookRes.status}`);
    return {
      error:
        "AI generation service is temporarily unavailable. Please try again later.",
    };
  }

  // 2. Parse response (multi-format: JSON object, plain text, nested JSON)
  let content: string | undefined;
  try {
    const rawText = await webhookRes.text();
    console.log(
      "[blog-webhook] Raw response (first 500 chars):",
      rawText.substring(0, 500)
    );

    let data: unknown;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Not JSON — treat as plain text if long enough
      if (rawText && rawText.trim().length > 50) {
        content = rawText.trim();
      }
    }

    if (!content && data) {
      // { "content": "..." }
      if (
        typeof (data as Record<string, unknown>).content === "string" &&
        ((data as Record<string, unknown>).content as string).trim()
      ) {
        content = ((data as Record<string, unknown>).content as string).trim();
      }
      // Stringified JSON or plain string
      else if (typeof data === "string") {
        try {
          const nested = JSON.parse(data);
          if (typeof nested.content === "string" && nested.content.trim()) {
            content = nested.content.trim();
          }
        } catch {
          /* not nested JSON */
        }
        if (!content && (data as string).trim().length > 50) {
          content = (data as string).trim();
        }
      }
    }
  } catch (parseErr) {
    console.error("[blog-webhook] Parse failed:", parseErr);
    return {
      error:
        "AI generation service returned an unexpected response. Please try again later.",
    };
  }

  if (!content) {
    console.error("[blog-webhook] No usable content extracted");
    return {
      error:
        "AI generation service returned no content. Please try again later.",
    };
  }

  return { content };
}
