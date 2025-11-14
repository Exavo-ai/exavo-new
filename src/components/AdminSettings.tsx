import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Palette, Mail, DollarSign, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [brandColor, setBrandColor] = useState('#8B5CF6');
  const [siteName, setSiteName] = useState('Exavo AI');
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [stripeTestMode, setStripeTestMode] = useState(true);

  const handleSaveGeneral = () => {
    toast.success('General settings saved successfully');
  };

  const handleSaveBranding = () => {
    toast.success('Branding settings saved successfully');
  };

  const handleSaveFeatures = () => {
    toast.success('Feature toggles updated successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Admin Settings</h2>
          <p className="text-sm text-muted-foreground">Configure your platform settings</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic site settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  placeholder="Your AI Solutions Partner"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="admin@exavoai.io"
                />
              </div>
              <Button onClick={handleSaveGeneral}>Save General Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Colors
              </CardTitle>
              <CardDescription>Customize your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-20"
                  />
                  <Input value={brandColor} readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://your-site.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroText">Hero Section Text</Label>
                <Input
                  id="heroText"
                  placeholder="Transform Your Business with AI"
                />
              </div>
              <Button onClick={handleSaveBranding}>Save Branding</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="w-5 h-5" />
                Feature Toggles
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Booking System</Label>
                  <p className="text-sm text-muted-foreground">Allow users to book appointments</p>
                </div>
                <Switch checked={bookingEnabled} onCheckedChange={setBookingEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>AI Chatbot</Label>
                  <p className="text-sm text-muted-foreground">Enable AI chat support</p>
                </div>
                <Switch checked={chatbotEnabled} onCheckedChange={setChatbotEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Payments</Label>
                  <p className="text-sm text-muted-foreground">Accept payments via Stripe</p>
                </div>
                <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} />
              </div>
              <Button onClick={handleSaveFeatures}>Save Feature Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>Configure Stripe payment settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Stripe Test Mode</Label>
                  <p className="text-sm text-muted-foreground">Use test mode for development</p>
                </div>
                <Switch checked={stripeTestMode} onCheckedChange={setStripeTestMode} />
              </div>
              {stripeTestMode && (
                <div className="p-4 bg-accent/20 border border-accent rounded-lg">
                  <p className="text-sm text-accent font-medium">Test Mode Active</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use test cards: 4242 4242 4242 4242 (any future date, any CVC)
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input id="currency" defaultValue="USD" />
              </div>
              <Button>Save Payment Settings</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Configure automated emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Booking Confirmation Email</Label>
                <p className="text-sm text-muted-foreground">Sent when a booking is made</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Confirmation Email</Label>
                <p className="text-sm text-muted-foreground">Sent when payment is successful</p>
              </div>
              <div className="space-y-2">
                <Label>Welcome Email Sequence</Label>
                <p className="text-sm text-muted-foreground">Sent to new users upon registration</p>
              </div>
              <Button>Configure Email Templates</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
