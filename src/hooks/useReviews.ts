import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  project_id: string | null;
  delivery_id: string | null;
  service_id: string | null;
  client_id: string;
  service_type: string | null;
  client_name: string;
  client_company: string | null;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  show_on_home: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface UseReviewsOptions {
  status?: "pending" | "approved" | "rejected" | "all";
  serviceId?: string;
  showOnHomeOnly?: boolean;
  limit?: number;
}

export function useReviews(options: UseReviewsOptions = {}) {
  const { status = "all", serviceId, showOnHomeOnly, limit } = options;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Public consumers use the reviews_public view which excludes client_id
      // Admin consumers use useAdminReviews which queries the full reviews table
      let query = supabase
        .from("reviews_public" as any)
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      if (showOnHomeOnly) {
        query = query.eq("show_on_home", true);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setReviews((data as unknown as Review[]) || []);
    } catch (err: any) {
      console.error("Error fetching reviews:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [status, serviceId, showOnHomeOnly, limit]);

  return { reviews, loading, error, refetch: fetchReviews };
}

export function useAdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setReviews((data as Review[]) || []);
    } catch (err: any) {
      console.error("Error fetching reviews:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (
    reviewId: string,
    updates: Partial<Pick<Review, "status" | "show_on_home" | "priority">>
  ) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update(updates)
        .eq("id", reviewId);

      if (error) throw error;

      // Optimistically update local state
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ...updates } : r))
      );

      return true;
    } catch (err: any) {
      console.error("Error updating review:", err);
      throw err;
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      return true;
    } catch (err: any) {
      console.error("Error deleting review:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return { reviews, loading, error, refetch: fetchReviews, updateReview, deleteReview };
}

export function useHasSubmittedReview(deliveryId: string | undefined) {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deliveryId) {
      setLoading(false);
      return;
    }

    const checkReview = async () => {
      try {
        const { data } = await supabase
          .from("reviews")
          .select("id")
          .eq("delivery_id", deliveryId)
          .maybeSingle();

        setHasSubmitted(!!data);
      } catch (err) {
        console.error("Error checking review:", err);
      } finally {
        setLoading(false);
      }
    };

    checkReview();
  }, [deliveryId]);

  return { hasSubmitted, loading };
}
