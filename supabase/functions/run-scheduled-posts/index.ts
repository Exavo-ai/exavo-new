import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, handleCors, successResponse, errors } from "../_shared/response.ts";
import { authenticateRequest, requireAdminRole, getServiceClient } from "../_shared/auth.ts";

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/jbt8dq78argmvlpe3gj3kojgb34v83wp";

serve(async (req) => {
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

    // Fetch pending posts that are due, using FOR UPDATE SKIP LOCKED for concurrency safety
    const { data: pendingPosts, error: fetchError } = await supabase
      .rpc("get_and_lock_scheduled_posts" as any);

    // Fallback: if the RPC doesn't exist yet, use a standard query
    let postsToProcess = pendingPosts;
    if (fetchError || !pendingPosts) {
      console.log("[run-scheduled-posts] RPC not available, using standard query");
      const { data, error } = await supabase
        .from("scheduled_blog_posts")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

      if (error) {
        console.error("[run-scheduled-posts] Failed to fetch posts:", error);
        return errors.internal("Failed to fetch scheduled posts");
      }
      postsToProcess = data;
    }

    if (!postsToProcess || postsToProcess.length === 0) {
      return successResponse({ processed: 0, message: "No pending posts to process" });
    }

    console.log(`[run-scheduled-posts] Processing ${postsToProcess.length} scheduled post(s)`);

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const post of postsToProcess) {
      try {
        // Mark as processing (optimistic lock)
        const { error: lockError } = await supabase
          .from("scheduled_blog_posts")
          .update({ status: "processing" })
          .eq("id", post.id)
          .eq("status", "pending"); // Only update if still pending

        if (lockError) {
          console.error(`[run-scheduled-posts] Failed to lock post ${post.id}:`, lockError);
          results.push({ id: post.id, status: "skipped", error: "Failed to acquire lock" });
          continue;
        }

        // Generate AI content via existing webhook
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

          // Multi-stage parsing (reuse existing pattern from ai-generate-blog)
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

        // Insert into existing blog_posts table (reuse existing blog system)
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
          throw new Error(`Failed to create blog post: ${insertError.message}`);
        }

        // Update scheduled post as published
        await supabase
          .from("scheduled_blog_posts")
          .update({
            status: "published",
            generated_content: content,
          })
          .eq("id", post.id);

        console.log(`[run-scheduled-posts] Published: ${post.title}`);
        results.push({ id: post.id, status: "published" });

      } catch (postErr) {
        const errorMessage = (postErr as Error).message || "Unknown error";
        console.error(`[run-scheduled-posts] Failed for post ${post.id}:`, errorMessage);

        // Mark as failed
        await supabase
          .from("scheduled_blog_posts")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", post.id);

        results.push({ id: post.id, status: "failed", error: errorMessage });
      }
    }

    const published = results.filter(r => r.status === "published").length;
    const failed = results.filter(r => r.status === "failed").length;

    console.log(`[run-scheduled-posts] Done. Published: ${published}, Failed: ${failed}`);

    return successResponse({
      processed: results.length,
      published,
      failed,
      results,
    });

  } catch (err) {
    console.error("[run-scheduled-posts] Unhandled error:", err);
    return errors.internal("An unexpected error occurred");
  }
});
