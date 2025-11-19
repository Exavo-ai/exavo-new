import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Target, TrendingUp, Users, Zap, ArrowRight, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Newsletter from '@/components/Newsletter';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Solutions",
      description: "Cutting-edge artificial intelligence tailored to your business needs"
    },
    {
      icon: Target,
      title: "Strategic Consulting",
      description: "Expert guidance to transform your digital presence"
    },
    {
      icon: TrendingUp,
      title: "Growth Optimization",
      description: "Data-driven strategies that deliver measurable results"
    },
    {
      icon: Zap,
      title: "Rapid Implementation",
      description: "Fast deployment with seamless integration"
    },
    {
      icon: Users,
      title: "24/7 Support",
      description: "Round-the-clock assistance from our expert team"
    },
    {
      icon: Sparkles,
      title: "Custom Solutions",
      description: "Bespoke AI tools designed for your unique challenges"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO, TechCorp",
      content: "Exavo AI transformed our business operations. Their AI solutions increased our efficiency by 300%.",
      rating: 5
    },
    {
      name: "Ahmed Hassan",
      role: "Director, Innovation Labs",
      content: "Outstanding service and cutting-edge technology. The results exceeded our expectations.",
      rating: 5
    },
    {
      name: "Maria Garcia",
      role: "CTO, Digital Solutions",
      content: "The team's expertise and support are unmatched. Best investment we've made this year.",
      rating: 5
    }
  ];

  const solutions = [
    "AI Chatbot Development",
    "Business Process Automation",
    "Predictive Analytics",
    "Natural Language Processing",
    "Computer Vision Solutions",
    "Machine Learning Models"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section with Video Animation */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-16 sm:py-20">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsl(270_100%_50%_/_0.1)_0%,_transparent_50%)]" />
        
        {/* Floating particles - hide on mobile */}
        <div className="absolute inset-0 hidden sm:block">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in">
            <Badge className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gradient-hero border-0 text-white hover:scale-105 transition-transform">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 inline" />
              Next-Generation AI Solutions
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight">
              Transform Your Business with{' '}
              <span className="bg-gradient-hero bg-clip-text text-transparent animate-pulse">
                Exavo AI
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-2">
              Unlock the power of artificial intelligence to drive growth, automate processes, and make smarter decisions.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4 sm:pt-8 px-4">
              <Button 
                size="lg" 
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto bg-gradient-hero hover:shadow-glow-lg transition-all group"
                onClick={() => navigate('/booking')}
              >
                Book a Demo
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto hover:bg-card transition-all"
                onClick={() => navigate('/services')}
              >
                Explore Solutions
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-6 sm:pt-8 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span>Free Consultation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span>Custom Solutions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span>Proven Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-20 lg:py-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
            <Badge className="mb-3 sm:mb-4">Our Services</Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Comprehensive AI Solutions
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Everything you need to harness the power of AI for your business
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group hover:border-primary/50 transition-all hover:shadow-glow cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions List */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4">What We Offer</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                AI Tools & Technologies
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {solutions.map((solution, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-6 rounded-lg bg-background border border-border hover:border-primary/50 transition-all hover:shadow-glow animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-lg font-medium">{solution}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Success Stories</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What Our Clients Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index}
                className="hover:border-primary/50 transition-all hover:shadow-glow animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  <div className="pt-4 border-t border-border">
                    <p className="font-bold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <Card className="max-w-4xl mx-auto bg-gradient-card border-primary/20">
            <CardContent className="p-12 text-center space-y-8">
              <MessageSquare className="w-16 h-16 mx-auto text-primary animate-pulse" />
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Book a free consultation with our AI experts and discover how we can transform your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 bg-gradient-hero hover:shadow-glow-lg transition-all group"
                  onClick={() => navigate('/booking')}
                >
                  Book Your Demo Now
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6"
                  onClick={() => navigate('/contact')}
                >
                  Contact Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Newsletter />
      <Footer />
    </div>
  );
};

export default Landing;
