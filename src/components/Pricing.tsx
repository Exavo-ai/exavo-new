import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const PricingSection = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "999",
      period: "/month",
      description: "Perfect for small businesses getting started with AI",
      features: [
        "AI Chatbot Integration",
        "Basic Analytics Dashboard",
        "Email Support",
        "5 User Accounts",
        "API Access",
        "Community Resources"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "2,499",
      period: "/month",
      description: "Advanced AI solutions for growing businesses",
      features: [
        "Everything in Starter",
        "Advanced AI Models",
        "Predictive Analytics",
        "Priority Support 24/7",
        "20 User Accounts",
        "Custom Integrations",
        "Dedicated Account Manager",
        "Training & Onboarding"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored AI solutions for large organizations",
      features: [
        "Everything in Professional",
        "Custom AI Development",
        "Unlimited Users",
        "SLA Guarantee",
        "On-Premise Deployment",
        "White-Label Options",
        "Advanced Security Features",
        "Dedicated Support Team"
      ],
      popular: false
    }
  ];

  return (
    <section className="py-24 bg-gradient-accent/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Simple, <span className="bg-gradient-hero bg-clip-text text-transparent">Transparent Pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Choose the plan that fits your business needs
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative hover:shadow-glow transition-all hover:-translate-y-2 animate-fade-in-up ${
                plan.popular ? 'border-primary shadow-glow' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-hero border-0">
                  Most Popular
                </Badge>
              )}
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>
                
                <div className="py-4">
                  <div className="flex items-baseline gap-1">
                    {plan.price !== "Custom" && <span className="text-2xl">$</span>}
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                
                <Button 
                  className={`w-full ${plan.popular ? 'bg-gradient-hero hover:shadow-glow-lg' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => navigate('/booking')}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                </Button>
                
                <div className="space-y-3 pt-6 border-t border-border">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <p className="text-center text-muted-foreground mt-12 animate-fade-in">
          All plans include 30-day money-back guarantee. Need a custom solution? 
          <button 
            onClick={() => navigate('/contact')}
            className="text-primary hover:underline ml-1"
          >
            Contact our sales team
          </button>
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
