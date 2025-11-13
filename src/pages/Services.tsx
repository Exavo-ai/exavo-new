import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3 } from "lucide-react";

const Services = () => {
  const { t } = useLanguage();

  const services = [
    {
      icon: Bot,
      title: "AI Chatbot",
      description: "Intelligent conversational AI for customer support and engagement",
      price: "From 3,500 EGP/mo",
      features: ["24/7 Support", "Multi-language", "Custom Training", "Analytics Dashboard"]
    },
    {
      icon: Workflow,
      title: "Workflow Automation",
      description: "Automate repetitive tasks and streamline business processes",
      price: "From 5,000 EGP/mo",
      features: ["Process Mapping", "Integration", "Custom Workflows", "Monitoring"]
    },
    {
      icon: LineChart,
      title: "Predictive Analytics",
      description: "Data-driven insights for better business decisions",
      price: "From 6,500 EGP/mo",
      features: ["Forecasting", "Trend Analysis", "Reports", "AI Recommendations"]
    },
    {
      icon: Mail,
      title: "Marketing Automation",
      description: "AI-powered marketing campaigns and customer engagement",
      price: "From 4,000 EGP/mo",
      features: ["Email Campaigns", "Segmentation", "A/B Testing", "ROI Tracking"]
    },
    {
      icon: FileText,
      title: "Content Generation",
      description: "AI-assisted content creation for marketing and communications",
      price: "From 3,000 EGP/mo",
      features: ["Blog Posts", "Social Media", "Ad Copy", "SEO Optimization"]
    },
    {
      icon: BarChart3,
      title: "Data Visualization",
      description: "Transform complex data into actionable visual insights",
      price: "From 4,500 EGP/mo",
      features: ["Interactive Dashboards", "Real-time Data", "Custom Charts", "Export Options"]
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
                {t('services.title')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('services.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-xl p-8 border border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-14 h-14 rounded-lg bg-gradient-hero flex items-center justify-center mb-6 group-hover:shadow-glow transition-shadow">
                      <service.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                    <p className="text-muted-foreground mb-4">{service.description}</p>
                    
                    <div className="text-primary font-semibold mb-6">{service.price}</div>
                    
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex flex-col gap-2">
                      <Button variant="hero" className="w-full">
                        Order Now
                      </Button>
                      <Button variant="outline" className="w-full">
                        Book Consultation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Need a Custom Solution?
              </h2>
              <p className="text-lg text-muted-foreground">
                Our team can create a tailored AI solution specifically for your business needs
              </p>
              <Button variant="hero" size="lg" className="shadow-glow">
                Contact Our Experts
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
