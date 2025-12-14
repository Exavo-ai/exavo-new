import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ServicePackage {
  id: string;
  package_name: string;
  price: number;
  currency: string;
}

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  serviceId?: string;
  packageId?: string;
  packageName?: string;
  isGuest?: boolean;
}

const countries = [
  'Australia', 'United States', 'United Kingdom', 'Canada', 'Germany', 
  'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland',
  'New Zealand', 'Singapore', 'Japan', 'South Korea', 'UAE', 'Saudi Arabia',
  'Egypt', 'South Africa', 'Brazil', 'Mexico', 'Argentina', 'Other'
];

const communicationMethods = ['Email', 'Phone', 'WhatsApp', 'Zoom', 'Microsoft Teams', 'Slack'];
const timelines = ['ASAP', '1-2 weeks', '2-4 weeks', '1-2 months', '2-3 months', '3+ months', 'Flexible'];

const BookingDialog = ({ 
  open, 
  onOpenChange, 
  serviceName, 
  serviceId, 
  packageId, 
  packageName,
  isGuest = false 
}: BookingDialogProps) => {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(packageId || '');
  const [projectDescription, setProjectDescription] = useState('');
  const [preferredCommunication, setPreferredCommunication] = useState('');
  const [preferredTimeline, setPreferredTimeline] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!selectedPackageId) {
      toast.error('Please select a package');
      return;
    }

    setLoading(true);
    try {
      // For guests, we'll create the order without user_id or handle differently
      if (isGuest || !user) {
        // Send notification for guest order
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            full_name: fullName,
            email,
            phone: phone || 'N/A',
            company: company || 'N/A',
            country: country || 'N/A',
            service: serviceName,
            package: packageName || packages.find(p => p.id === selectedPackageId)?.package_name || 'N/A',
            project_description: projectDescription,
            preferred_communication: preferredCommunication || 'Email',
            preferred_timeline: preferredTimeline || 'Flexible',
            is_guest: true
          }
        });

        toast.success('Booking request submitted successfully! We\'ll contact you soon.');
      } else {
        // Create appointment for authenticated users
        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            user_id: user.id,
            service_id: serviceId || null,
            package_id: selectedPackageId || null,
            full_name: fullName,
            email,
            phone: phone || '',
            company: company || null,
            country: country || null,
            project_description: projectDescription,
            preferred_communication: preferredCommunication || null,
            preferred_timeline: preferredTimeline || null,
            appointment_date: new Date().toISOString().split('T')[0],
            appointment_time: new Date().toTimeString().split(' ')[0],
            status: 'pending'
          });

        if (appointmentError) throw appointmentError;

        // Send notification
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              full_name: fullName,
              email,
              phone,
              company,
              country,
              service: serviceName,
              package: packageName || packages.find(p => p.id === selectedPackageId)?.package_name || 'N/A',
              project_description: projectDescription,
              preferred_communication: preferredCommunication,
              preferred_timeline: preferredTimeline
            }
          });
        } catch (notificationError) {
          console.error('Notification error:', notificationError);
        }

        toast.success('Booking request submitted successfully! We\'ll contact you soon.');
      }

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit booking request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!user) {
      setFullName('');
      setEmail('');
      setPhone('');
      setCompany('');
    }
    setCountry('');
    setProjectDescription('');
    setPreferredCommunication('');
    setPreferredTimeline('');
  };

  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Book {serviceName}
            {(packageName || selectedPackage) && (
              <span className="text-primary"> - {packageName || selectedPackage?.package_name}</span>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Fill out the form below and we'll get back to you within 24 hours
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
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

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number {isGuest ? '(Optional)' : ''}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Project Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Project Description</Label>
              <Textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe your project, goals, and requirements..."
                rows={5}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="communication">Preferred Communication</Label>
                <Select value={preferredCommunication} onValueChange={setPreferredCommunication}>
                  <SelectTrigger>
                    <SelectValue placeholder="How should we contact you?" />
                  </SelectTrigger>
                  <SelectContent>
                    {communicationMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Preferred Timeline</Label>
                <Select value={preferredTimeline} onValueChange={setPreferredTimeline}>
                  <SelectTrigger>
                    <SelectValue placeholder="When do you need this?" />
                  </SelectTrigger>
                  <SelectContent>
                    {timelines.map((timeline) => (
                      <SelectItem key={timeline} value={timeline}>
                        {timeline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Booking Request'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
