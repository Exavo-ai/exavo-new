import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Mail, Palette, Zap, Bell, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Setting {
  key: string;
  value: string;
  category: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((setting: Setting) => {
        settingsMap[setting.key] = setting.value;
      });

      setSettings(settingsMap);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async (keys: string[]) => {
    setSaving(true);
    try {
      for (const key of keys) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: settings[key] })
          .eq('key', key);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                <Input
                  id="siteName"
                  value={settings.site_name || ''}
                  onChange={(e) => updateSetting('site_name', e.target.value)}
                  placeholder="Exavo AI"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.site_description || ''}
                  onChange={(e) => updateSetting('site_description', e.target.value)}
                  placeholder="AI-powered business solutions..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={(e) => updateSetting('contact_email', e.target.value)}
                  placeholder="contact@exavo.ai"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="maintenance"
                  checked={settings.maintenance_mode === 'true'}
                  onCheckedChange={(checked) => updateSetting('maintenance_mode', checked.toString())}
                />
                <Label htmlFor="maintenance">Maintenance Mode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="registration"
                  checked={settings.allow_registration === 'true'}
                  onCheckedChange={(checked) => updateSetting('allow_registration', checked.toString())}
                />
                <Label htmlFor="registration">Allow User Registration</Label>
              </div>
              <Button
                onClick={() => saveSettings(['site_name', 'site_description', 'contact_email', 'maintenance_mode', 'allow_registration'])}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
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
                <Input
                  id="logo"
                  value={settings.logo_url || ''}
                  onChange={(e) => updateSetting('logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the URL of your logo image
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon URL</Label>
                <Input
                  id="favicon"
                  value={settings.favicon_url || ''}
                  onChange={(e) => updateSetting('favicon_url', e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the URL of your favicon
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="w-20"
                    value={settings.primary_color || '#8B5CF6'}
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                  />
                  <Input
                    value={settings.primary_color || '#8B5CF6'}
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    className="w-20"
                    value={settings.secondary_color || '#7C3AED'}
                    onChange={(e) => updateSetting('secondary_color', e.target.value)}
                  />
                  <Input
                    value={settings.secondary_color || '#7C3AED'}
                    onChange={(e) => updateSetting('secondary_color', e.target.value)}
                    placeholder="#7C3AED"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroTitle">Hero Section Title</Label>
                <Input
                  id="heroTitle"
                  value={settings.hero_title || ''}
                  onChange={(e) => updateSetting('hero_title', e.target.value)}
                  placeholder="Transform Your Business with AI"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">Hero Section Subtitle</Label>
                <Input
                  id="heroSubtitle"
                  value={settings.hero_subtitle || ''}
                  onChange={(e) => updateSetting('hero_subtitle', e.target.value)}
                  placeholder="Unlock the power of artificial intelligence"
                />
              </div>
              <Button
                onClick={() => saveSettings(['logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'hero_title', 'hero_subtitle'])}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure SMTP settings for sending emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={settings.smtp_host || ''}
                  onChange={(e) => updateSetting('smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  value={settings.smtp_port || ''}
                  onChange={(e) => updateSetting('smtp_port', e.target.value)}
                  placeholder="587"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input
                  id="smtpUser"
                  value={settings.smtp_user || ''}
                  onChange={(e) => updateSetting('smtp_user', e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPass">SMTP Password</Label>
                <Input
                  id="smtpPass"
                  type="password"
                  value={settings.smtp_password || ''}
                  onChange={(e) => updateSetting('smtp_password', e.target.value)}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">
                  Your SMTP password is encrypted and secure
                </p>
              </div>
              <Button
                onClick={() => saveSettings(['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'])}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
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
                <Switch
                  id="bookings"
                  checked={settings.feature_bookings === 'true'}
                  onCheckedChange={(checked) => updateSetting('feature_bookings', checked.toString())}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="payments">Online Payments</Label>
                  <p className="text-sm text-muted-foreground">Enable payment processing</p>
                </div>
                <Switch
                  id="payments"
                  checked={settings.feature_payments === 'true'}
                  onCheckedChange={(checked) => updateSetting('feature_payments', checked.toString())}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="chatbot">AI Chatbot</Label>
                  <p className="text-sm text-muted-foreground">Enable AI-powered chat support</p>
                </div>
                <Switch
                  id="chatbot"
                  checked={settings.feature_chatbot === 'true'}
                  onCheckedChange={(checked) => updateSetting('feature_chatbot', checked.toString())}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="tickets">Support Tickets</Label>
                  <p className="text-sm text-muted-foreground">Enable ticket system</p>
                </div>
                <Switch
                  id="tickets"
                  checked={settings.feature_tickets === 'true'}
                  onCheckedChange={(checked) => updateSetting('feature_tickets', checked.toString())}
                />
              </div>
              <Button
                onClick={() => saveSettings(['feature_bookings', 'feature_payments', 'feature_chatbot', 'feature_tickets'])}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
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
                  <Label htmlFor="newUsers">New User Registrations</Label>
                  <p className="text-sm text-muted-foreground">Notify on new user signups</p>
                </div>
                <Switch
                  id="newUsers"
                  checked={settings.notify_new_users === 'true'}
                  onCheckedChange={(checked) => updateSetting('notify_new_users', checked.toString())}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newBookings">New Bookings</Label>
                  <p className="text-sm text-muted-foreground">Notify on new bookings</p>
                </div>
                <Switch
                  id="newBookings"
                  checked={settings.notify_new_bookings === 'true'}
                  onCheckedChange={(checked) => updateSetting('notify_new_bookings', checked.toString())}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newPayments">New Payments</Label>
                  <p className="text-sm text-muted-foreground">Notify on successful payments</p>
                </div>
                <Switch
                  id="newPayments"
                  checked={settings.notify_new_payments === 'true'}
                  onCheckedChange={(checked) => updateSetting('notify_new_payments', checked.toString())}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newTickets">New Support Tickets</Label>
                  <p className="text-sm text-muted-foreground">Notify on new tickets</p>
                </div>
                <Switch
                  id="newTickets"
                  checked={settings.notify_new_tickets === 'true'}
                  onCheckedChange={(checked) => updateSetting('notify_new_tickets', checked.toString())}
                />
              </div>
              <Button
                onClick={() => saveSettings(['notify_new_users', 'notify_new_bookings', 'notify_new_payments', 'notify_new_tickets'])}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
