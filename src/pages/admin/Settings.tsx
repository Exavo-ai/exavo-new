import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Mail, Palette, Zap, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();

  const handleSave = (section: string) => {
    toast({
      title: "Settings Saved",
      description: `${section} settings have been updated successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your platform configuration</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-2">
          <TabsTrigger value="general" className="text-xs sm:text-sm">
            <SettingsIcon className="h-4 w-4 mr-2 hidden sm:inline" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className="text-xs sm:text-sm">
            <Palette className="h-4 w-4 mr-2 hidden sm:inline" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="email" className="text-xs sm:text-sm">
            <Mail className="h-4 w-4 mr-2 hidden sm:inline" />
            Email
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs sm:text-sm">
            <Zap className="h-4 w-4 mr-2 hidden sm:inline" />
            Features
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">
            <Bell className="h-4 w-4 mr-2 hidden sm:inline" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure your platform's basic settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input id="siteName" placeholder="Exavo AI" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea id="siteDescription" placeholder="AI-powered business solutions..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" type="email" placeholder="contact@exavo.ai" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="maintenance" />
                <Label htmlFor="maintenance">Maintenance Mode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="registration" defaultChecked />
                <Label htmlFor="registration">Allow User Registration</Label>
              </div>
              <Button onClick={() => handleSave("General")}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your platform's appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input id="logo" placeholder="https://example.com/logo.png" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon URL</Label>
                <Input id="favicon" placeholder="https://example.com/favicon.ico" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex gap-2">
                  <Input id="brandColor" type="color" className="w-20" defaultValue="#8B5CF6" />
                  <Input placeholder="#8B5CF6" />
                </div>
              </div>
              <Button onClick={() => handleSave("Branding")}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure SMTP and email templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input id="smtpHost" placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input id="smtpPort" placeholder="587" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input id="smtpUser" placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPass">SMTP Password</Label>
                <Input id="smtpPass" type="password" placeholder="••••••••" />
              </div>
              <Button onClick={() => handleSave("Email")}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="bookings">Online Bookings</Label>
                  <p className="text-sm text-muted-foreground">Allow users to book services</p>
                </div>
                <Switch id="bookings" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="payments">Online Payments</Label>
                  <p className="text-sm text-muted-foreground">Enable payment processing</p>
                </div>
                <Switch id="payments" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="chatbot">AI Chatbot</Label>
                  <p className="text-sm text-muted-foreground">Enable AI-powered chat support</p>
                </div>
                <Switch id="chatbot" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="tickets">Support Tickets</Label>
                  <p className="text-sm text-muted-foreground">Enable ticket system</p>
                </div>
                <Switch id="tickets" defaultChecked />
              </div>
              <Button onClick={() => handleSave("Features")}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotif">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch id="emailNotif" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newUsers">New User Registrations</Label>
                  <p className="text-sm text-muted-foreground">Notify on new user signups</p>
                </div>
                <Switch id="newUsers" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newBookings">New Bookings</Label>
                  <p className="text-sm text-muted-foreground">Notify on new bookings</p>
                </div>
                <Switch id="newBookings" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newPayments">New Payments</Label>
                  <p className="text-sm text-muted-foreground">Notify on successful payments</p>
                </div>
                <Switch id="newPayments" defaultChecked />
              </div>
              <Button onClick={() => handleSave("Notifications")}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
