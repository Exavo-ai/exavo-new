import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Send to Make.com webhook
      await fetch('https://hook.eu1.make.com/yyuv8e5e2tjnaaah69ek9pii0ctk026h', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      });

      toast({
        title: "Success!",
        description: "Thank you for subscribing to our newsletter!",
      });

      setEmail('');
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: "Success!",
        description: "Thank you for subscribing to our newsletter!",
      });
      setEmail('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(195_100%_25%)] via-[hsl(240_30%_15%)] to-[hsl(270_100%_30%)] p-8 sm:p-12 shadow-glow">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsl(195_100%_50%_/_0.1)_0%,_transparent_50%)]" />
          
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Subscribe to Our NewsLetter
              </h2>
              <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto">
                Get the latest insights on AI, project management, and exclusive offers.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 bg-background/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-primary focus-visible:border-primary"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 px-8 bg-gradient-hero hover:opacity-90 text-white font-semibold shadow-glow"
              >
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
