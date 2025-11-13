import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";

const Pricing = () => {
  const { t } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: "Starter",
      price: billingCycle === 'monthly' ? "2,500" : "25,000",
      period: billingCycle === 'monthly' ? "/month" : "/year",
      description: "Perfect for small businesses getting started with AI",
      features: [
        "1 AI Project",
        "Email Support",
        "Basic Analytics",
        "5 GB Storage",
        "API Access",
        "Community Support"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Business",
      price: billingCycle === 'monthly' ? "6,000" : "60,000",
      period: billingCycle === 'monthly' ? "/month" : "/year",
      description: "For growing businesses ready to scale with AI",
      features: [
        "3 AI Projects",
        "Priority Support",
        "Advanced Analytics",
        "50 GB Storage",
        "API Access",
        "Custom Integrations",
        "Dedicated Manager",
        "Training Sessions"
      ],
      cta: "Get Started",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored solutions for large organizations",
      features: [
        "Unlimited Projects",
        "24/7 Premium Support",
        "Enterprise Analytics",
        "Unlimited Storage",
        "Full API Access",
        "Custom Development",
        "Dedicated AI Expert",
        "On-site Training",
        "SLA Guarantee"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                {t('pricing.title')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('pricing.subtitle')}
              </p>
              
              {/* Billing Toggle */}
              <div className="inline-flex items-center gap-4 p-1 rounded-full bg-muted mt-8">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('pricing.monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('pricing.yearly')}
                  <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan, index) => (
                  <div
                    key={index}
                    className={`relative bg-card rounded-2xl p-8 border transition-all hover:-translate-y-2 shadow-card animate-fade-in-up ${
                      plan.popular
                        ? 'border-primary shadow-glow'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-hero text-primary-foreground text-sm font-semibold rounded-full">
                        Most Popular
                      </div>
                    )}
                    
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        {plan.period && (
                          <span className="text-muted-foreground mb-1">{plan.period}</span>
                        )}
                      </div>
                    </div>
                    
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      variant={plan.popular ? 'hero' : 'outline'}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Need Help Choosing?
              </h2>
              <p className="text-lg text-muted-foreground">
                Book a free consultation with our team to find the perfect plan for your business
              </p>
              <Button variant="hero" size="lg" className="shadow-glow">
                {t('common.bookDemo')}
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
