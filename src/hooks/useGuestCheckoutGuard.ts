import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GuestCheckoutGuardOptions {
  packageId?: string;
  serviceId?: string;
}

/**
 * Hook that guards checkout actions for guests.
 * If user is not authenticated, redirects to register with return URL.
 */
export function useGuestCheckoutGuard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAuthenticated = !!user;

  /**
   * Call this before initiating checkout.
   * Returns true if user can proceed, false if redirected to register.
   */
  const guardCheckout = useCallback((options?: GuestCheckoutGuardOptions): boolean => {
    // Still loading auth state - allow to proceed (edge function will handle)
    if (loading) return true;

    // User is authenticated - allow checkout
    if (isAuthenticated) return true;

    // Guest user - show toast and redirect to register
    toast({
      title: "Account Required",
      description: "You'll need an account to continue — it's free and takes 10 seconds.",
      duration: 5000,
    });

    // Build return URL with package/service info
    const currentUrl = window.location.pathname + window.location.search;
    const returnUrl = encodeURIComponent(
      options?.packageId 
        ? `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}autoCheckout=${options.packageId}`
        : currentUrl
    );

    navigate(`/register?returnUrl=${returnUrl}`);
    return false;
  }, [user, loading, navigate, toast, isAuthenticated]);

  return {
    isAuthenticated,
    loading,
    guardCheckout,
  };
}
