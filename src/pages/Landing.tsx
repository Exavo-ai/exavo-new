import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, MessageSquare, Zap, DollarSign, Package, Star } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import DemoRequestDialog from '@/components/DemoRequestDialog';

const Landing = () => {
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const steps = [
    {
      number: "1",
      title: "Request a Demo",
      description: "Tell us about your business needs in a quick call."
    },
    {
      number: "2",
      title: "Get Your AI Plan",
      description: "We recommend the right AI tools for your goals."
    },
    {
      number: "3",
      title: "Start Growing",
      description: "Launch your AI tools and see results fast."
    }
  ];

  const benefits = [
    {
      icon: Package,
      title: "Ready-to-Use AI Tools",
      description: "No building from scratch. Pick from our library of proven AI solutions."
    },
    {
      icon: Zap,
      title: "No Technical Skills Needed",
      description: "We handle the tech. You focus on running your business."
    },
    {
      icon: DollarSign,
      title: "Affordable for SMEs",
      description: "Enterprise-grade AI at prices small businesses can afford."
    }
  ];

  const testimonials = [
    { name: "Sarah J.", role: "Retail Owner", quote: "Saved 20 hours a week on customer support." },
    { name: "Ahmed H.", role: "Agency Director", quote: "Our team productivity doubled in 2 months." },
    { name: "Maria G.", role: "E-commerce Founder", quote: "Best investment we made this year." }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4 pt-24 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[120px]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Your One-Stop{' '}
              <span className="bg-gradient-hero bg-clip-text text-transparent">AI Marketplace</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Helping small and mid-sized businesses adopt AI easily — no technical complexity, no big budgets required.
            </p>

            <div className="pt-4">
              <Button 
                size="lg" 
                className="text-base sm:text-lg px-10 py-6 bg-gradient-hero hover:shadow-glow-lg transition-all group font-semibold"
                onClick={() => setDemoDialogOpen(true)}
              >
                Request a Demo
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3">Simple Process</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="text-center p-6 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-hero text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3">Why Exavo</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Built for Businesses Like Yours</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card 
                key={index}
                className="border-border/50 hover:border-primary/30 transition-all animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Social Proof */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Trusted by Growing Businesses</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {testimonials.map((t, index) => (
              <Card key={index} className="border-border/50 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-5">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">"{t.quote}"</p>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
            <CardContent className="p-8 sm:p-10 text-center space-y-5">
              <MessageSquare className="w-10 h-10 mx-auto text-primary" />
              <h2 className="text-2xl sm:text-3xl font-bold">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                See how Exavo can help your business adopt AI — no technical skills required.
              </p>
              <Button 
                size="lg" 
                className="text-base px-10 py-6 bg-gradient-hero hover:shadow-glow-lg transition-all group font-semibold"
                onClick={() => setDemoDialogOpen(true)}
              >
                Request a Demo
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />

      <DemoRequestDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </div>
  );
};

export default Landing;
