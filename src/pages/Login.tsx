import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, userRole } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('inviteToken');

  useEffect(() => {
    // Redirect if already logged in with proper role (but not if handling invite)
    if (user && userRole && !loading && !inviteToken) {
      const targetPath = userRole === 'admin' ? '/admin' : '/client';
      navigate(targetPath, { replace: true });
    }
  }, [user, userRole, loading, navigate, inviteToken]);

  const handleInviteActivation = async () => {
    if (!inviteToken) return;

    try {
      console.log("[LOGIN] Processing invitation token:", inviteToken);
      
      // Validate the token and get invite data
      const { data: member, error: fetchError } = await supabase
        .from("team_members")
        .select("id, email, status, token_expires_at")
        .eq("invite_token", inviteToken)
        .eq("status", "pending")
        .maybeSingle();

      if (fetchError || !member) {
        console.error("[LOGIN] Invalid invite token:", fetchError);
        toast.error("Invalid or expired invitation");
        return;
      }

      // Check if token is expired
      if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
        console.log("[LOGIN] Invitation expired");
        toast.error("This invitation has expired");
        return;
      }

      // Check if logged-in user matches invite email
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email !== member.email) {
        console.log("[LOGIN] Email mismatch. Expected:", member.email, "Got:", user?.email);
        toast.error(`This invitation is for ${member.email}. Please log in with that email.`);
        return;
      }

      console.log("[LOGIN] Activating invitation for:", member.email);

      // Activate the invitation
      const { error: updateError } = await supabase
        .from("team_members")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          invite_token: null,
        })
        .eq("id", member.id);

      if (updateError) {
        console.error("[LOGIN] Failed to activate invitation:", updateError);
        toast.error("Failed to activate invitation");
        return;
      }

      console.log("[LOGIN] ✓ Invitation activated successfully");
      toast.success("Welcome to the team!", {
        description: "Your invitation has been accepted.",
        duration: 3000,
      });
    } catch (err: any) {
      console.error("[LOGIN] Invite activation error:", err);
      toast.error("Failed to process invitation");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("[LOGIN] Attempting login for:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[LOGIN] Login failed:", error);
        throw error;
      }

      console.log("[LOGIN] ✓ Login successful");
      toast.success(t('auth.loginSuccess'));
      
      // If there's an invite token, activate it first
      if (inviteToken) {
        console.log("[LOGIN] Processing invitation after login");
        await handleInviteActivation();
      }
      
      // Fetch user role immediately
      if (data.user) {
        console.log("[LOGIN] Fetching user role for:", data.user.email);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
        
        const role = roleData?.role || 'client';
        console.log("[LOGIN] User role:", role);
        
        const targetPath = role === 'admin' ? '/admin' : '/client/dashboard';
        console.log("[LOGIN] Redirecting to:", targetPath);
        
        // Force immediate navigation
        navigate(targetPath, { replace: true });
      }
    } catch (error: any) {
      console.error("[LOGIN] Login error:", error);
      toast.error(error.message || t('auth.loginError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-2xl p-8 border border-border shadow-glow">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
                {inviteToken ? 'Log In to Accept Invitation' : t('auth.welcomeBack')}
              </h1>
              <p className="text-muted-foreground">
                {inviteToken ? 'Sign in to join your team' : t('auth.loginSubtitle')}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  {t('contact.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ahmed@exavoai.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full shadow-glow" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <button
                type="button"
                onClick={() => navigate('/password-reset')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
              <p className="text-sm text-muted-foreground">
                {t('auth.noAccount')}{' '}
                <a href="/register" className="text-primary hover:underline">
                  {t('auth.signUp')}
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← {t('auth.backHome')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
