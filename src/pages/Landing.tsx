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
      title: "Book a Call",
      description: "Tell us what takes up your time. We listen."
    },
    {
      number: "2",
      title: "Pick Your Tools",
      description: "We show you which AI tools fit your needs and budget."
    },
    {
      number: "3",
      title: "We Set It Up",
      description: "We install everything. You start saving time."
    }
  ];

  const benefits = [
    {
      icon: Package,
      title: "Tools That Work Out of the Box",
      description: "Chatbots, content writers, data dashboards — ready to use, not projects to build."
    },
    {
      icon: Zap,
      title: "You Don't Need to Be Technical",
      description: "We handle setup and training. You just use it."
    },
    {
      icon: DollarSign,
      title: "Prices That Make Sense",
      description: "Start small. Pay for what you use. No enterprise contracts."
    }
  ];

  const testimonials = [
    { name: "Sarah J.", role: "Retail Owner", quote: "Cut my customer email time from 3 hours to 30 minutes a day." },
    { name: "Ahmed H.", role: "Agency Director", quote: "We stopped hiring for data entry. The AI does it now." },
    { name: "Maria G.", role: "E-commerce Founder", quote: "Finally understood my sales data without a spreadsheet degree." }
  ];

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section 
        className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden px-5 sm:px-6 pt-28 sm:pt-32 pb-12 sm:pb-16"
        aria-labelledby="hero-heading"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" aria-hidden="true" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[120px]" aria-hidden="true" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-5 sm:space-y-6 animate-fade-in">
            <h1 
              id="hero-heading"
              className="text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
            >
              AI Tools for Small Businesses
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Automate the repetitive work. Answer customers faster. Understand your data. We set it up for you.
            </p>

            <div className="pt-2 sm:pt-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto min-h-[56px] text-base sm:text-lg px-8 sm:px-10 py-4 bg-gradient-hero hover:shadow-glow-lg transition-all group font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setDemoDialogOpen(true)}
                aria-label="Book a free consultation call"
              >
                Book a Free Call
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section 
        className="py-12 sm:py-16 md:py-20 bg-muted/30 px-5 sm:px-6"
        aria-labelledby="how-it-works-heading"
      >
        <div className="container mx-auto">
          <h2 
            id="how-it-works-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-12"
          >
            Here's How It Works
          </h2>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <li 
                key={index}
                className="text-center p-4 sm:p-6 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-hero text-primary-foreground text-xl sm:text-2xl font-bold flex items-center justify-center mx-auto mb-4"
                  aria-hidden="true"
                >
                  {step.number}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-foreground/70 text-sm sm:text-base leading-relaxed">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Key Benefits */}
      <section 
        className="py-12 sm:py-16 md:py-20 px-5 sm:px-6"
        aria-labelledby="benefits-heading"
      >
        <div className="container mx-auto">
          <h2 
            id="benefits-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-12"
          >
            What You Actually Get
          </h2>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <li key={index}>
                <Card 
                  className="h-full border-border/50 hover:border-primary/30 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-5 sm:p-6 text-center">
                    <div 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4"
                      aria-hidden="true"
                    >
                      <benefit.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold mb-2">{benefit.title}</h3>
                    <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust / Social Proof */}
      <section 
        className="py-12 sm:py-16 md:py-20 bg-muted/30 px-5 sm:px-6"
        aria-labelledby="testimonials-heading"
      >
        <div className="container mx-auto">
          <h2 
            id="testimonials-heading"
            className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-10"
          >
            What Our Clients Say
          </h2>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {testimonials.map((t, index) => (
              <li key={index}>
                <Card 
                  className="h-full border-border/50 animate-fade-in" 
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex gap-1 mb-3" aria-label="5 out of 5 stars">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-primary text-primary" aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote className="text-foreground/80 text-sm sm:text-base mb-3 leading-relaxed">
                      "{t.quote}"
                    </blockquote>
                    <footer>
                      <p className="font-semibold text-sm sm:text-base">{t.name}</p>
                      <p className="text-xs sm:text-sm text-foreground/60">{t.role}</p>
                    </footer>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section 
        className="py-12 sm:py-16 md:py-20 px-5 sm:px-6"
        aria-labelledby="cta-heading"
      >
        <div className="container mx-auto">
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
            <CardContent className="p-6 sm:p-8 md:p-10 text-center space-y-4 sm:space-y-5">
              <h2 
                id="cta-heading"
                className="text-xl sm:text-2xl md:text-3xl font-bold"
              >
                Not Sure Where to Start?
              </h2>
              <p className="text-foreground/70 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Book a free 15-minute call. We'll ask about your business, show you what's possible, and give you honest advice — even if we're not the right fit.
              </p>
              <Button 
                size="lg" 
                className="w-full sm:w-auto min-h-[56px] text-base px-8 sm:px-10 py-4 bg-gradient-hero hover:shadow-glow-lg transition-all group font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setDemoDialogOpen(true)}
                aria-label="Book a free consultation call"
              >
                Book a Free Call
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />

      <DemoRequestDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </main>
  );
};

export default Landing;
