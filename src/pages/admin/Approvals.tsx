import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, MessageSquare, Instagram, Linkedin, Facebook, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type SocialPost = {
  id: string;
  platform: "Instagram" | "Facebook" | "LinkedIn";
  caption: string;
  image_url: string;
  status: "pending" | "approved" | "changes_requested";
  feedback: string | null;
  created_at: string;
  published_at: string | null;
  slug: string;
};

const platformIcons = {
  Instagram: Instagram,
  Facebook: Facebook,
  LinkedIn: Linkedin,
};

const platformColors = {
  Instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  Facebook: "bg-blue-600",
  LinkedIn: "bg-blue-700",
};

export default function AdminApprovals() {
  const queryClient = useQueryClient();
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["admin-pending-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SocialPost[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (postId: string) => {
      setProcessingIds((prev) => new Set(prev).add(postId));

      // Update database
      const { error: dbError } = await supabase
        .from("social_posts")
        .update({
          status: "approved",
          published_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (dbError) throw dbError;

      // Send webhook
      const { error: webhookError } = await supabase.functions.invoke("social-post-webhook", {
        body: {
          postId,
          decision: "approved",
          feedback: "",
        },
      });

      if (webhookError) {
        // Rollback if webhook fails
        await supabase
          .from("social_posts")
          .update({ status: "pending", published_at: null })
          .eq("id", postId);
        throw webhookError;
      }

      return postId;
    },
    onSuccess: (postId) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-posts"] });
      toast({
        title: "Post Approved",
        description: "The post has been approved and published.",
      });
    },
    onError: (error, postId) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve post",
        variant: "destructive",
      });
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async ({ postId, feedback }: { postId: string; feedback: string }) => {
      if (!feedback.trim()) {
        throw new Error("Feedback is required when requesting changes");
      }

      setProcessingIds((prev) => new Set(prev).add(postId));

      // Update database
      const { error: dbError } = await supabase
        .from("social_posts")
        .update({
          status: "changes_requested",
          feedback: feedback.trim(),
        })
        .eq("id", postId);

      if (dbError) throw dbError;

      // Send webhook
      const { error: webhookError } = await supabase.functions.invoke("social-post-webhook", {
        body: {
          postId,
          decision: "changes_requested",
          feedback: feedback.trim(),
        },
      });

      if (webhookError) {
        // Rollback if webhook fails
        await supabase
          .from("social_posts")
          .update({ status: "pending", feedback: null })
          .eq("id", postId);
        throw webhookError;
      }

      return postId;
    },
    onSuccess: (postId) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setFeedbackMap((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-posts"] });
      toast({
        title: "Changes Requested",
        description: "Your feedback has been sent.",
      });
    },
    onError: (error, { postId }) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request changes",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load pending posts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post Approvals</h1>
        <p className="text-muted-foreground">Review and approve social media posts</p>
      </div>

      {posts?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Check className="w-12 h-12 text-primary mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No pending posts to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts?.map((post) => {
            const PlatformIcon = platformIcons[post.platform];
            const isProcessing = processingIds.has(post.id);
            const feedback = feedbackMap[post.id] || "";

            return (
              <Card key={post.id} className="overflow-hidden">
                {/* Image */}
                <div className="relative aspect-square">
                  <img
                    src={post.image_url}
                    alt="Post preview"
                    className="w-full h-full object-cover"
                  />
                  <Badge
                    className={`absolute top-3 left-3 ${platformColors[post.platform]} text-white border-0`}
                  >
                    <PlatformIcon className="w-3 h-3 mr-1" />
                    {post.platform}
                  </Badge>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Date */}
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>

                  {/* Caption */}
                  <div className="max-h-40 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                  </div>

                  {/* Feedback textarea */}
                  <Textarea
                    placeholder="Feedback (required if requesting changes)"
                    value={feedback}
                    onChange={(e) =>
                      setFeedbackMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    disabled={isProcessing}
                    className="min-h-[80px]"
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => approveMutation.mutate(post.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        requestChangesMutation.mutate({ postId: post.id, feedback })
                      }
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <MessageSquare className="w-4 h-4 mr-2" />
                      )}
                      Request Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
