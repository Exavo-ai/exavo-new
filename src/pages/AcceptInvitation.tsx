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
      const { data: member, error: fetchError } = await supabase
        .from("team_members")
        .select("id, email, role, organization_id, status, token_expires_at")
        .eq("invite_token", token)
        .maybeSingle();

      if (fetchError || !member) {
        setError("Invalid or expired invitation link.");
        setValidating(false);
        setLoading(false);
        return;
      }

      // Check if token is expired
      if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
        setError("This invitation link has expired. Please request a new invitation.");
        setValidating(false);
        setLoading(false);
        return;
      }

      // Check if already activated
      if (member.status === "active") {
        setError("This invitation has already been accepted.");
        setValidating(false);
        setLoading(false);
        return;
      }

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
        // User is already logged in - activate and redirect
        await activateAndRedirect(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError("Failed to validate invitation. Please try again.");
      setValidating(false);
      setLoading(false);
    }
  };

  const activateAndRedirect = async (userId: string) => {
    try {
      // Update team member status to active
      const { error: updateError } = await supabase
        .from("team_members")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          invite_token: null,
        })
        .eq("id", inviteData!.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Welcome to the team!",
      });

      navigate("/client/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to activate your account. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

    setSubmitting(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/client/dashboard`,
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Activate team member
        await activateAndRedirect(authData.user.id);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation",
        variant: "destructive",
      });
      setSubmitting(false);
    }
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
          <form onSubmit={handleAccept} className="space-y-4">
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
              <a href="/login" className="text-primary hover:underline">
                Sign in here
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
