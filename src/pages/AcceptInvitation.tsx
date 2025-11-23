import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError("Invalid invitation link. No token provided.");
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
        // Not logged in - show signup form (user can click login link if they have an account)
        setUserExists(false);
        setLoading(false);
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
        })
        .eq("id", inviteData.id);

      if (updateError) {
        console.error("[ACCEPT-INVITE] Activation error:", updateError);
        throw updateError;
      }

      console.log("[ACCEPT-INVITE] ✓ Invitation activated successfully");
      
      toast({
        title: "Success",
        description: "Welcome to the team!",
      });

      // Redirect after short delay
      setTimeout(() => navigate("/client/dashboard"), 1500);
    } catch (err: any) {
      console.error("[ACCEPT-INVITE] Activation failed:", err);
      toast({
        title: "Error",
        description: "Failed to activate your account. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleNewUserSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

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
        if (signUpError.message.includes("already registered")) {
          console.log("[ACCEPT-INVITE] User already exists, redirecting to login");
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please log in instead.",
            variant: "destructive",
          });
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
      toast({
        title: "Error",
        description: err.message || "Failed to create account",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const handleExistingUserLogin = () => {
    // Redirect to login page with token preserved
    navigate(`/login?inviteToken=${token}`);
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-6 h-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-6 h-6" />
            <CardTitle>Accept Invitation</CardTitle>
          </div>
          <CardDescription>
            You've been invited to join as a <strong>{inviteData?.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNewUserSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteData?.email}
                disabled
                className="bg-muted"
              />
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Accept Invitation & Create Account"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={handleExistingUserLogin}
                className="text-primary hover:underline"
              >
                Log in here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}