import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserCredits {
  user_id: string;
  balance: number;
  updated_at: string;
}

interface Subscription {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  price_id: string;
  status: string;
  current_period_end: string;
  updated_at: string;
}

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const creditsQuery = useQuery({
    queryKey: ["user-credits", user?.id],
    queryFn: async (): Promise<UserCredits | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credits:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  const subscriptionQuery = useQuery({
    queryKey: ["user-subscription", user?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const refetchCredits = () => {
    queryClient.invalidateQueries({ queryKey: ["user-credits", user?.id] });
  };

  const refetchSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ["user-subscription", user?.id] });
  };

  const refetchAll = () => {
    refetchCredits();
    refetchSubscription();
  };

  return {
    credits: creditsQuery.data?.balance ?? 0,
    creditsData: creditsQuery.data,
    isLoadingCredits: creditsQuery.isLoading,
    subscription: subscriptionQuery.data,
    isLoadingSubscription: subscriptionQuery.isLoading,
    isSubscribed: subscriptionQuery.data?.status === "active",
    refetchCredits,
    refetchSubscription,
    refetchAll,
  };
}
