import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface DemoRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DemoRequestDialog = ({ open, onOpenChange }: DemoRequestDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send to webhook (same as signup webhook)
      await fetch('https://n8n.exavo.app/webhook/lovable-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'demo_request',
          name: fullName,
          email,
          company: company || 'Not provided',
          message: message || 'Demo request from website',
          created_at: new Date().toISOString()
        }),
      });

      setSubmitted(true);
      
      // Reset form after delay
      setTimeout(() => {
        setFullName('');
        setEmail('');
        setCompany('');
        setMessage('');
        setSubmitted(false);
        onOpenChange(false);
      }, 3000);
    } catch (error) {
      console.error('Demo request error:', error);
      // Still show success (webhook might fail but we don't want to block UX)
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onOpenChange(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSubmitted(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto p-5 sm:p-6">
        {submitted ? (
          <div className="py-6 sm:py-8 text-center space-y-4" role="status" aria-live="polite">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Thank You!</h3>
            <p className="text-foreground/70 text-sm sm:text-base">
              We've received your request and will contact you within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold">Book a Free Call</DialogTitle>
              <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
                15 minutes. No sales pitch. Just honest advice about what AI can do for your business.
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm sm:text-base font-medium">
                  Full Name <span className="text-destructive" aria-label="required">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="h-12 text-base"
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base font-medium">
                  Email Address <span className="text-destructive" aria-label="required">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  required
                  disabled={loading}
                  className="h-12 text-base"
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm sm:text-base font-medium">
                  Company <span className="text-foreground/50">(Optional)</span>
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  disabled={loading}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm sm:text-base font-medium">
                  What's taking up most of your time? <span className="text-foreground/50">(Optional)</span>
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g., Answering the same customer questions, updating spreadsheets, writing content..."
                  rows={3}
                  disabled={loading}
                  className="text-base resize-none"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full min-h-[52px] text-base font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  'Book My Free Call'
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DemoRequestDialog;
