import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Key, CreditCard, Palette } from "lucide-react";
import { useTeam } from "@/contexts/TeamContext";

export default function WorkspaceConfigPage() {
  const { isWorkspaceOwner } = useTeam();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workspace Configuration</h1>
        <p className="text-muted-foreground">Customize your workspace settings</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          {isWorkspaceOwner && (
            <TabsTrigger value="billing">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Methods
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <Button variant="outline">Upload Logo</Button>
                </div>
                <p className="text-sm text-muted-foreground">Recommended: PNG or SVG, 500x500px</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Your Company Name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input id="primaryColor" placeholder="#6B4EFF" className="flex-1" />
                  <div className="w-12 h-10 rounded border bg-primary" />
                </div>
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Production API Key</Label>
                <div className="flex gap-2">
                  <Input type="password" value="sk_live_••••••••••••••••" disabled />
                  <Button variant="outline">Reveal</Button>
                  <Button variant="outline">Copy</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Test API Key</Label>
                <div className="flex gap-2">
                  <Input type="password" value="sk_test_••••••••••••••••" disabled />
                  <Button variant="outline">Reveal</Button>
                  <Button variant="outline">Copy</Button>
                </div>
              </div>

              <Button variant="destructive">Generate New Keys</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isWorkspaceOwner ? (
                <>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gradient-hero rounded flex items-center justify-center text-white font-bold">
                          ****
                        </div>
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-sm text-muted-foreground">Expires 12/25</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm" className="text-destructive">Remove</Button>
                      </div>
                    </div>
                  </div>
                  <Button>Add Payment Method</Button>
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Only workspace owners can manage payment methods.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
