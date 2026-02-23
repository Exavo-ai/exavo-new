import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScheduledBlogPost {
  id: string;
  title: string;
  slug: string;
  scheduled_at: string;
  status: "pending" | "processing" | "published" | "failed";
  generated_content: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useScheduledPosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["scheduled-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_blog_posts" as any)
        .select("*")
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return (data as unknown as ScheduledBlogPost[]) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (post: { title: string; slug: string; scheduled_at: string }) => {
      const { error } = await supabase
        .from("scheduled_blog_posts" as any)
        .insert(post as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-blog-posts"] });
      toast.success("Scheduled post created");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("A post with this slug already exists");
      } else {
        toast.error("Failed to create scheduled post");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_blog_posts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-blog-posts"] });
      toast.success("Scheduled post deleted");
    },
    onError: () => {
      toast.error("Failed to delete scheduled post");
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_blog_posts" as any)
        .update({ status: "pending", error_message: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-blog-posts"] });
      toast.success("Post reset to pending");
    },
    onError: () => {
      toast.error("Failed to retry post");
    },
  });

  return {
    posts: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    remove: deleteMutation.mutate,
    retry: retryMutation.mutate,
  };
}
