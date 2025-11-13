import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookingDialog from "@/components/BookingDialog";
import { useNavigate } from "react-router-dom";

interface Service {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  currency: string;
  active: boolean;
}

const Services = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (data) setServices(data);
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const iconMap: Record<string, any> = {
    'AI Chatbot': Bot,
    'Workflow Automation': Workflow,
    'Predictive Analytics': LineChart,
    'Marketing Automation': Mail,
    'Content Generation': FileText,
    'Data Visualization': BarChart3
  };

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

        {/* Services Grid - Database-driven */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service, index) => {
                  const Icon = iconMap[service.name] || Bot;

                  return (
                    <Card
                      key={service.id}
                      className="p-8 border border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up group cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="w-14 h-14 rounded-lg bg-gradient-hero flex items-center justify-center mb-6 group-hover:shadow-glow transition-shadow">
                        <Icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-3">
                        {language === 'ar' ? service.name_ar : service.name}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {language === 'ar' ? service.description_ar : service.description}
                      </p>
                      
                      <div className="text-primary font-semibold mb-6">
                        {t('pricing.from')} {service.price.toLocaleString()} {service.currency}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="hero" 
                          className="w-full"
                          onClick={() => navigate('/contact')}
                        >
                          {t('services.orderNow')}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleBookService(service)}
                        >
                          {t('services.bookConsultation')}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      
      {selectedService && (
        <BookingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          serviceName={language === 'ar' ? selectedService.name_ar : selectedService.name}
          serviceId={selectedService.id}
        />
      )}
    </div>
  );
};

export default Services;
