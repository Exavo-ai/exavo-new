import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam } from "@/contexts/TeamContext";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodsDialog } from "@/components/portal/PaymentMethodsDialog";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();
  const { isWorkspaceOwner, permissions } = useTeam();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      // Initialize with user metadata if profile doesn't exist
      setFullName(user?.user_metadata?.full_name || "");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!permissions.change_workspace_info) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to update profile information",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Reload profile and refresh global state
      await loadProfile();
      await refreshProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/client`
        }
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!user || !newEmail || !currentPasswordForEmail) {
      toast({
        title: "Error",
        description: "Please provide both your current password and new email",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPasswordForEmail,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update email
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: `Please check ${newEmail} and click the confirmation link to complete the email change.`,
      });

      setNewEmail("");
      setCurrentPasswordForEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex gap-2">
                      <Input id="email" value={email} disabled className="flex-1" />
                      {user?.email_confirmed_at ? (
                        <Badge variant="default" className="flex items-center gap-1 self-center">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1 self-center">
                          <XCircle className="w-3 h-3" />
                          Unverified
                        </Badge>
                      )}
                    </div>
                    {!user?.email_confirmed_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="mt-2"
                      >
                        {isResending ? "Sending..." : "Resend verification email"}
                      </Button>
                    )}
                  </div>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password-email">Current Password</Label>
                  <Input
                    id="current-password-email"
                    type="password"
                    value={currentPasswordForEmail}
                    onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">New Email Address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll receive a confirmation link at the new email address
                  </p>
                </div>
                <Button 
                  onClick={handleChangeEmail}
                  disabled={isUpdatingEmail || !newEmail || !currentPasswordForEmail}
                >
                  {isUpdatingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Change Email"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button 
                  onClick={async () => {
                    if (newPassword !== confirmPassword) {
                      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
                      return;
                    }
                    if (newPassword.length < 6) {
                      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
                      return;
                    }
                    setIsUpdatingPassword(true);
                    try {
                      const { error } = await supabase.auth.updateUser({ password: newPassword });
                      if (error) throw error;
                      toast({ title: "Success", description: "Password updated successfully" });
                      setNewPassword("");
                      setConfirmPassword("");
                    } catch (error: any) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } finally {
                      setIsUpdatingPassword(false);
                    }
                  }}
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Configure your notification settings here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
