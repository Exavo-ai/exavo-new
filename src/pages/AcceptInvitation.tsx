import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState<{
    email: string;
    role: string;
    organization_id: string;
    id: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError("Invalid invitation link - no token provided");
      setValidating(false);
      setLoading(false);
      return;
    }

    try {
      console.log("[ACCEPT-INVITE] Validating token:", token);
      
      const { data: member, error: fetchError } = await supabase
        .from("team_members")
        .select("id, email, role, organization_id, status, token_expires_at")
        .eq("invite_token", token)
        .maybeSingle();

      if (fetchError || !member) {
        console.error("[ACCEPT-INVITE] Invalid token:", fetchError);
        setError("Invalid or expired invitation link.");
        setValidating(false);
        setLoading(false);
        return;
      }

      // Check if token is expired
      if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
        console.log("[ACCEPT-INVITE] Token expired:", member.token_expires_at);
        setError("This invitation link has expired. Please request a new invitation.");
        setValidating(false);
        setLoading(false);
        return;
      }

      // Check if already activated
      if (member.status === "active") {
        console.log("[ACCEPT-INVITE] Already activated");
        setError("This invitation has already been accepted.");
        setValidating(false);
        setLoading(false);
        return;
      }

      console.log("[ACCEPT-INVITE] Valid invitation for:", member.email);
      setInviteData({
        email: member.email,
        role: member.role,
        organization_id: member.organization_id,
        id: member.id,
      });
      setValidating(false);

      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log("[ACCEPT-INVITE] User already logged in:", session.user.email);
        setIsLoggedIn(true);
        
        // Check if logged-in email matches invite email
        if (session.user.email === member.email) {
          // Same user - activate and redirect
          await activateAndRedirect();
        } else {
          // Different user - show error
          setError(`You are logged in as ${session.user.email}, but this invitation is for ${member.email}. Please log out and try again.`);
          setLoading(false);
        }
      } else {
        // Not logged in - check if user exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', member.email)
          .maybeSingle();
        
        if (profile) {
          // User exists, redirect to login
          console.log("[ACCEPT-INVITE] User exists, redirecting to login");
          navigate(`/login?inviteToken=${token}`);
        } else {
          // New user - show signup form
          console.log("[ACCEPT-INVITE] New user, showing signup form");
          setUserExists(false);
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error("[ACCEPT-INVITE] Validation error:", err);
      setError("Failed to validate invitation. Please try again.");
      setValidating(false);
      setLoading(false);
    }
  };

  const activateAndRedirect = async () => {
    if (!inviteData) return;
    
    try {
      console.log("[ACCEPT-INVITE] Activating invitation:", inviteData.id);
      
      // Update team member status to active
      const { error: updateError } = await supabase
        .from("team_members")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          invite_token: null,
          full_name: fullName || undefined,
        })
        .eq("id", inviteData.id);

      if (updateError) {
        console.error("[ACCEPT-INVITE] Activation error:", updateError);
        throw updateError;
      }

      console.log("[ACCEPT-INVITE] ✓ Invitation activated successfully");
      
      toast.success("Welcome to the team!", {
        description: "Your invitation has been accepted.",
        duration: 3000,
      });

      // Redirect after short delay
      setTimeout(() => navigate("/client/dashboard"), 1500);
    } catch (err: any) {
      console.error("[ACCEPT-INVITE] Activation failed:", err);
      toast.error("Failed to activate your account. Please contact support.");
    }
  };

  const handleNewUserSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      console.log("[ACCEPT-INVITE] Creating new user account for:", inviteData.email);
      
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/client/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        // If user already exists, show them the login link
        if (signUpError.message.includes("already registered") || signUpError.message.includes("User already registered")) {
          console.log("[ACCEPT-INVITE] User already exists, redirecting to login");
          toast.error("An account with this email already exists. Redirecting to login...");
          setSubmitting(false);
          setTimeout(() => handleExistingUserLogin(), 2000);
          return;
        }
        console.error("[ACCEPT-INVITE] Signup error:", signUpError);
        throw signUpError;
      }

      console.log("[ACCEPT-INVITE] ✓ User created:", authData.user?.id);

      // Update team member with full name
      const { error: nameUpdateError } = await supabase
        .from("team_members")
        .update({ full_name: fullName })
        .eq("id", inviteData.id);

      if (nameUpdateError) {
        console.warn("[ACCEPT-INVITE] Failed to update name:", nameUpdateError);
      }

      if (authData.user) {
        // Activate team member and redirect
        await activateAndRedirect();
      }
    } catch (err: any) {
      console.error("[ACCEPT-INVITE] Signup failed:", err);
      toast.error(err.message || "Failed to create account");
      setSubmitting(false);
    }
  };

  const handleExistingUserLogin = () => {
    console.log("[ACCEPT-INVITE] Redirecting to login with token");
    navigate(`/login?inviteToken=${token}`);
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        
        <Card className="w-full max-w-md mx-4 relative z-10 border-border shadow-glow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating your invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        
        <Card className="w-full max-w-md mx-4 relative z-10 border-border shadow-glow">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-6 h-6" />
              <CardTitle>Invitation Invalid</CardTitle>
            </div>
            <CardDescription className="text-base">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full" variant="hero">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        
        <Card className="w-full max-w-md mx-4 relative z-10 border-border shadow-glow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Setting up your account...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show signup form
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md mx-auto">
          <Card className="bg-card rounded-2xl border border-border shadow-glow">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  Accept Team Invitation
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                You've been invited to join as a <strong className="text-primary">{inviteData?.role}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewUserSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteData?.email}
                    disabled
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    This email is locked to the invitation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={submitting}
                  />
                </div>

                <Button type="submit" variant="hero" className="w-full shadow-glow" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Accept Invitation & Create Account"
                  )}
                </Button>

                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Already have an account?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExistingUserLogin}
                    className="w-full"
                    disabled={submitting}
                  >
                    Log In Instead
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Return to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
