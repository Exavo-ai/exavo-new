import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import BookingDialog from '@/components/BookingDialog';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const iconMap: Record<string, any> = {
  'AI Chatbot': Bot,
  'Workflow Automation': Workflow,
  'Predictive Analytics': LineChart,
  'Marketing Automation': Mail,
  'Content Generation': FileText,
  'Data Visualization': BarChart3
};

const Booking = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<{ name: string; id: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchServices();
  }, [user, navigate]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('name');

    setServices(data || []);
  };

  const handleBookService = (service: any) => {
    setSelectedService({
      name: language === 'ar' ? service.name_ar : service.name,
      id: service.id
    });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                {t('booking.title')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('services.subtitle')}
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service, index) => {
                  const Icon = iconMap[service.name] || Bot;
                  return (
                    <Card
                      key={service.id}
                      className="p-8 bg-card border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card cursor-pointer"
                      onClick={() => handleBookService(service)}
                    >
                      <div className="w-14 h-14 rounded-lg bg-gradient-hero flex items-center justify-center mb-6">
                        <Icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-3">
                        {language === 'ar' ? service.name_ar : service.name}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {language === 'ar' ? service.description_ar : service.description}
                      </p>
                      
                      <div className="text-primary font-semibold mb-6">
                        {service.price.toLocaleString()} {service.currency}/mo
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
          serviceName={selectedService.name}
          serviceId={selectedService.id}
        />
      )}
    </div>
  );
};

export default Booking;
