import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, X, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface ServicePackage {
  id: string;
  package_name: string;
  price: number;
  currency: string;
}

interface ClientOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  serviceId?: string;
  packageId?: string;
  packageName?: string;
}

const ClientOrderDialog = ({ 
  open, 
  onOpenChange, 
  serviceName, 
  serviceId, 
  packageId, 
  packageName 
}: ClientOrderDialogProps) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(packageId || '');
  const [longMessage, setLongMessage] = useState('');
  const [links, setLinks] = useState<string[]>(['']);

  // Auto-fill for signed-in users
  useEffect(() => {
    if (user && userProfile) {
      setFullName(userProfile.full_name || '');
      setEmail(userProfile.email || user.email || '');
      setPhone(userProfile.phone || '');
    } else if (user) {
      setEmail(user.email || '');
    }
  }, [user, userProfile, open]);

  // Set package from props
  useEffect(() => {
    if (packageId) {
      setSelectedPackageId(packageId);
    }
  }, [packageId]);

  // Fetch available packages
  useEffect(() => {
    if (serviceId && open) {
      fetchPackages();
    }
  }, [serviceId, open]);

  const fetchPackages = async () => {
    if (!serviceId) return;
    setLoadingPackages(true);
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('id, package_name, price, currency')
        .eq('service_id', serviceId)
        .order('package_order', { ascending: true });
      
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const addLink = () => {
    setLinks([...links, '']);
  };

  const removeLink = (index: number) => {
    if (links.length > 1) {
      setLinks(links.filter((_, i) => i !== index));
    } else {
      setLinks(['']);
    }
  };

  const updateLink = (index: number, value: string) => {
    const updated = [...links];
    updated[index] = value;
    setLinks(updated);
  };

  const resetForm = () => {
    setTitle('');
    if (!user) {
      setFullName('');
      setEmail('');
      setPhone('');
      setCompany('');
    }
    setLongMessage('');
    setLinks(['']);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to place an order');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title for your order');
      return;
    }

    if (!selectedPackageId) {
      toast.error('Please select a package');
      return;
    }

    setLoading(true);
    try {
      const validLinks = links.filter(l => l.trim());

      const { error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service_id: serviceId || null,
          title: title.trim(),
          short_message: `Package: ${packageName || packages.find(p => p.id === selectedPackageId)?.package_name || 'N/A'}`,
          long_message: longMessage.trim() || null,
          multiselect_options: [],
          links: validLinks,
          attachments: [],
          amount: 0,
          status: 'pending',
          payment_status: 'unpaid',
        });

      if (error) throw error;

      setSuccess(true);
      toast.success('Order submitted successfully!');
    } catch (error: any) {
      console.error('Order submission error:', error);
      toast.error(error.message || 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  };

  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your order for <span className="font-medium text-foreground">{serviceName}</span> has been received. 
              We'll review it and get back to you soon.
            </p>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Order: {serviceName}
            {(packageName || selectedPackage) && (
              <span className="text-primary"> - {packageName || selectedPackage?.package_name}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Package Selection */}
          {packages.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="package">Package *</Label>
              <Select 
                value={selectedPackageId} 
                onValueChange={setSelectedPackageId}
                disabled={loadingPackages}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingPackages ? "Loading packages..." : "Select a package"} />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.package_name} - {pkg.currency} {pkg.price.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Order Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for your order"
              required
            />
          </div>

          {/* Personal Info (auto-filled for logged in users) */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
          </div>

          {/* Long Message */}
          <div className="space-y-2">
            <Label htmlFor="longMessage">Project Description</Label>
            <Textarea
              id="longMessage"
              value={longMessage}
              onChange={(e) => setLongMessage(e.target.value)}
              placeholder="Describe your requirements, goals, and any specific details..."
              rows={4}
            />
          </div>

          {/* Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Links / References (Optional)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-1" /> Add Link
              </Button>
            </div>
            {links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    placeholder="https://example.com"
                    className="pl-10"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLink(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-4 border-t gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Order'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientOrderDialog;
