import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors, successResponse, errors } from "../_shared/response.ts";
import { authenticateRequest, requireAdminRole, getServiceClient } from "../_shared/auth.ts";

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/jbt8dq78argmvlpe3gj3kojgb34v83wp";
const STUCK_THRESHOLD_MINUTES = 10;
const BATCH_LIMIT = 5;

serve(async (req) => {
  const executionId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return errors.badRequest("Method not allowed");
    }

    // Authenticate and require admin
    const authResult = await authenticateRequest(req);
    if (authResult.error) {
      return errors.unauthorized(authResult.error.message);
    }

    const adminCheck = await requireAdminRole(authResult.user!.id);
    if (!adminCheck.isAdmin) {
      return errors.forbidden("Admin access required");
    }

    const supabase = getServiceClient();

    console.log(`[scheduled-posts][${executionId}] START — server_time=${new Date().toISOString()}`);

    // ── STEP 3: Recover stuck rows ──
    const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();
    const { data: stuckRows, error: stuckErr } = await supabase
      .from("scheduled_blog_posts")
      .update({ status: "pending" } as any)
      .eq("status", "processing")
      .lt("updated_at", stuckCutoff)
      .select("id");

    const stuckRecovered = stuckRows?.length ?? 0;
    if (stuckRecovered > 0) {
      console.log(`[scheduled-posts][${executionId}] Recovered ${stuckRecovered} stuck row(s)`);
    }
    if (stuckErr) {
      console.warn(`[scheduled-posts][${executionId}] Stuck recovery error:`, stuckErr.message);
    }

    // ── STEP 2: Fetch pending posts using UTC-safe comparison ──
    const { data: postsToProcess, error: fetchError } = await supabase
      .from("scheduled_blog_posts")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      console.error(`[scheduled-posts][${executionId}] Fetch error:`, fetchError.message);
      return errors.internal("Failed to fetch scheduled posts");
    }

    if (!postsToProcess || postsToProcess.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`[scheduled-posts][${executionId}] END — no pending posts — ${duration}ms`);
      return successResponse({ execution_id: executionId, processed: 0, stuck_recovered: stuckRecovered, duration_ms: duration, message: "No pending posts to process" });
    }

    console.log(`[scheduled-posts][${executionId}] Found ${postsToProcess.length} post(s) to process`);

    const results: Array<{ id: string; title: string; status: string; error?: string }> = [];

    for (const post of postsToProcess) {
      try {
        console.log(`[scheduled-posts][${executionId}] Processing: "${post.title}" (scheduled_at=${post.scheduled_at})`);

        // ── Optimistic lock ──
        const { data: lockResult, error: lockError } = await supabase
          .from("scheduled_blog_posts")
          .update({ status: "processing" } as any)
          .eq("id", post.id)
          .eq("status", "pending")
          .select("id");

        if (lockError || !lockResult || lockResult.length === 0) {
          console.warn(`[scheduled-posts][${executionId}] Skipping "${post.title}" — lock failed`);
          results.push({ id: post.id, title: post.title, status: "skipped", error: "Lock failed" });
          continue;
        }

        // ── STEP 4: Idempotency — check if slug already exists in blog_posts ──
        const { data: existingPost } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("slug", post.slug)
          .maybeSingle();

        if (existingPost) {
          console.log(`[scheduled-posts][${executionId}] Slug "${post.slug}" already exists — marking published`);
          await supabase
            .from("scheduled_blog_posts")
            .update({ status: "published" } as any)
            .eq("id", post.id);
          results.push({ id: post.id, title: post.title, status: "published_dedup" });
          continue;
        }

        // ── Generate AI content via webhook ──
        let content: string | undefined;
        try {
          const webhookRes = await fetch(MAKE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: post.title.trim() }),
          });

          if (!webhookRes.ok) {
            throw new Error(`Webhook returned status ${webhookRes.status}`);
          }

          const rawText = await webhookRes.text();

          // Multi-stage parsing
          try {
            const data = JSON.parse(rawText);
            if (typeof data.content === "string" && data.content.trim()) {
              content = data.content.trim();
            } else if (typeof data === "string") {
              try {
                const nested = JSON.parse(data);
                if (typeof nested.content === "string" && nested.content.trim()) {
                  content = nested.content.trim();
                }
              } catch { /* not nested */ }
              if (!content && data.trim().length > 50) {
                content = data.trim();
              }
            }
          } catch {
            if (rawText && rawText.trim().length > 50) {
              content = rawText.trim();
            }
          }
        } catch (webhookErr) {
          throw new Error(`AI generation failed: ${(webhookErr as Error).message}`);
        }

        if (!content) {
          throw new Error("AI generation returned no usable content");
        }

        // Generate excerpt
        const plainText = content.replace(/<[^>]*>/g, "").replace(/\n+/g, " ");
        const excerpt = plainText.substring(0, 200).trim() + (plainText.length > 200 ? "..." : "");

        // ── Insert blog post ──
        const { error: insertError } = await supabase
          .from("blog_posts")
          .insert({
            title: post.title,
            slug: post.slug,
            content,
            excerpt,
            status: "published",
          });

        if (insertError) {
          throw new Error(`Blog insert failed: ${insertError.message}`);
        }

        // ── Mark scheduled post as published ──
        await supabase
          .from("scheduled_blog_posts")
          .update({ status: "published", generated_content: content } as any)
          .eq("id", post.id);

        console.log(`[scheduled-posts][${executionId}] Published: "${post.title}"`);
        results.push({ id: post.id, title: post.title, status: "published" });

      } catch (postErr) {
        const errorMessage = (postErr as Error).message || "Unknown error";
        console.error(`[scheduled-posts][${executionId}] FAILED "${post.title}": ${errorMessage}`);

        // ── Mark as failed (self-healing: next invocation won't retry failed) ──
        await supabase
          .from("scheduled_blog_posts")
          .update({ status: "failed", error_message: errorMessage } as any)
          .eq("id", post.id);

        results.push({ id: post.id, title: post.title, status: "failed", error: errorMessage });
      }
    }

    const published = results.filter(r => r.status === "published" || r.status === "published_dedup").length;
    const failed = results.filter(r => r.status === "failed").length;
    const duration = Date.now() - startTime;

    console.log(`[scheduled-posts][${executionId}] END — published=${published} failed=${failed} stuck_recovered=${stuckRecovered} duration=${duration}ms`);

    return successResponse({
      execution_id: executionId,
      processed: results.length,
      published,
      failed,
      stuck_recovered: stuckRecovered,
      duration_ms: duration,
      results,
    });

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[scheduled-posts][${executionId}] UNHANDLED ERROR (${duration}ms):`, err);
    return errors.internal("An unexpected error occurred");
  }
});
