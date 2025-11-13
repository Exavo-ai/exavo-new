import { Card } from "@/components/ui/card";
import { Bot, Workflow, LineChart, Shield, Zap, Users } from "lucide-react";

const Features = () => {
  const features = [
    { icon: Bot, title: "AI-Powered Automation", description: "Automate repetitive tasks and workflows with intelligent AI agents." },
    { icon: Workflow, title: "Smart Workflows", description: "Build complex business processes with visual workflow builder." },
    { icon: LineChart, title: "Predictive Analytics", description: "Make data-driven decisions with AI-powered insights." },
    { icon: Users, title: "Expert Network", description: "Connect with verified AI consultants for custom solutions." },
    { icon: Shield, title: "Enterprise Security", description: "Bank-level encryption and data protection standards." },
    { icon: Zap, title: "Real-time Integration", description: "Seamlessly integrate with existing tools in minutes." },
  ];

  return (
    <section className="py-24 bg-gradient-accent/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Powerful Features for <span className="bg-gradient-hero bg-clip-text text-transparent">Modern Businesses</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 hover:shadow-glow transition-all hover:-translate-y-2 bg-card border-border/50 group">
              <div className="w-14 h-14 rounded-lg bg-gradient-hero flex items-center justify-center mb-6 group-hover:shadow-glow-lg transition-shadow">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
