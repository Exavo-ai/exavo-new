import { Card, CardContent } from "@/components/ui/card";
import { Bot, TrendingUp, Mail, ShoppingCart, HeadphonesIcon, FileText } from "lucide-react";

const UseCases = () => {
  const useCases = [
    {
      icon: Bot,
      title: "Intelligent Chatbots",
      description: "24/7 customer support with human-like conversations that understand context and provide accurate responses.",
      stats: "90% Customer Satisfaction"
    },
    {
      icon: TrendingUp,
      title: "Sales Forecasting",
      description: "Predict future sales trends with machine learning models trained on your historical data.",
      stats: "45% Better Accuracy"
    },
    {
      icon: Mail,
      title: "Email Automation",
      description: "Personalized email campaigns that adapt based on customer behavior and preferences.",
      stats: "3x Higher Engagement"
    },
    {
      icon: ShoppingCart,
      title: "Smart Recommendations",
      description: "AI-powered product recommendations that increase cross-selling and upselling opportunities.",
      stats: "60% More Conversions"
    },
    {
      icon: HeadphonesIcon,
      title: "Voice Assistants",
      description: "Natural language voice interfaces for hands-free interactions and improved accessibility.",
      stats: "80% Faster Service"
    },
    {
      icon: FileText,
      title: "Document Processing",
      description: "Automated extraction and analysis of data from documents, forms, and contracts.",
      stats: "95% Time Saved"
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Real-World <span className="bg-gradient-hero bg-clip-text text-transparent">AI Applications</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Discover how businesses are using AI to solve complex challenges and drive growth
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {useCases.map((useCase, index) => (
            <Card 
              key={index}
              className="group hover:border-primary/50 transition-all hover:shadow-glow cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-8 space-y-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                  <useCase.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{useCase.title}</h3>
                <p className="text-muted-foreground">{useCase.description}</p>
                <div className="pt-4 border-t border-border">
                  <span className="text-primary font-semibold">{useCase.stats}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
