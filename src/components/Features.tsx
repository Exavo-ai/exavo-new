import { Card } from "@/components/ui/card";
import { Zap, DollarSign, Shield, LayoutDashboard, Users, Sparkles } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Ready-to-Use AI Tools",
    description: "Access a curated marketplace of pre-built AI solutions that work out of the box. No development required.",
  },
  {
    icon: DollarSign,
    title: "Cost-Effective",
    description: "Reduce AI implementation costs by up to 70%. Pay only for what you use with transparent pricing.",
  },
  {
    icon: LayoutDashboard,
    title: "All-in-One Control Panel",
    description: "Manage all your AI projects, tools, and services from a single, intuitive dashboard.",
  },
  {
    icon: Users,
    title: "Expert Services",
    description: "Connect with verified AI experts for custom solutions, consultation, and ongoing support.",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description: "Your data is protected with industry-leading security standards and compliance certifications.",
  },
  {
    icon: Sparkles,
    title: "Seamless Integration",
    description: "Integrate with your existing tools and workflows in minutes. Compatible with popular platforms.",
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">Succeed with AI</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We've eliminated the barriers to AI adoption so you can focus on growing your business
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-6 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 bg-gradient-card border-border/50"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
