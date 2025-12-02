import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, X, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface ClientOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  serviceId?: string;
  packageId?: string;
  packageName?: string;
}

const serviceOptions = [
  'AI Consultation',
  'Custom Development',
  'Integration Support',
  'Training & Onboarding',
  'Priority Support',
  'Data Migration',
  'API Access',
  'White Label Solution',
];

const ClientOrderDialog = ({ 
  open, 
  onOpenChange, 
  serviceName, 
  serviceId, 
  packageId, 
  packageName 
}: ClientOrderDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [title, setTitle] = useState('');
  const [shortMessage, setShortMessage] = useState('');
  const [longMessage, setLongMessage] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>(['']);

  const handleOptionToggle = (option: string) => {
    setSelectedOptions(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
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
    setShortMessage('');
    setLongMessage('');
    setSelectedOptions([]);
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

    setLoading(true);
    try {
      const validLinks = links.filter(l => l.trim());

      const { error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service_id: serviceId || null,
          title: title.trim(),
          short_message: shortMessage.trim() || null,
          long_message: longMessage.trim() || null,
          multiselect_options: selectedOptions,
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
            {packageName && <span className="text-primary"> - {packageName}</span>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
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

          {/* Short Message */}
          <div className="space-y-2">
            <Label htmlFor="shortMessage">Short Summary</Label>
            <Input
              id="shortMessage"
              value={shortMessage}
              onChange={(e) => setShortMessage(e.target.value)}
              placeholder="One-line summary of what you need"
            />
          </div>

          {/* Multiselect Options */}
          <div className="space-y-3">
            <Label>Select Options (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              {serviceOptions.map((option) => (
                <div
                  key={option}
                  className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleOptionToggle(option)}
                >
                  <Checkbox
                    checked={selectedOptions.includes(option)}
                    onCheckedChange={() => handleOptionToggle(option)}
                  />
                  <span className="text-sm">{option}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Long Message */}
          <div className="space-y-2">
            <Label htmlFor="longMessage">Detailed Description</Label>
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
