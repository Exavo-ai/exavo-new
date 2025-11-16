import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import BookingDialog from '@/components/BookingDialog';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3, Search, Filter } from 'lucide-react';
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
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<{ name: string; id: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailAlert, setEmailAlert] = useState('');

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
    setFilteredServices(data || []);
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = services.filter(service => {
        const name = language === 'ar' ? service.name_ar : service.name;
        const description = language === 'ar' ? service.description_ar : service.description;
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               description.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services);
    }
  }, [searchQuery, services, language]);

  const handleBookService = (service: any) => {
    setSelectedService({
      name: language === 'ar' ? service.name_ar : service.name,
      id: service.id
    });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={language === 'ar' ? 'ابحث عن أي شيء' : 'Search for anything'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card border-border"
                  />
                </div>

                {/* Filters */}
                <Card className="p-4 bg-card border-border">
                  <button className="flex items-center justify-between w-full mb-3">
                    <span className="font-semibold text-foreground">{language === 'ar' ? 'الفئات' : 'Categories'}</span>
                    <Filter className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <Button variant="outline" className="w-full justify-start">
                    {language === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                  </Button>
                </Card>

                {/* Newsletter */}
                <Card className="p-6 bg-card border-border">
                  <h3 className="font-semibold mb-2 text-foreground">
                    {language === 'ar' ? 'ابق على اطلاع' : 'Stay in the loop'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'ar' ? 'احصل على إشعارات حول الخدمات الجديدة والعروض' : 'Get notified about new services, discounts, and much more!'}
                  </p>
                  <Input
                    type="email"
                    placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'your@email.com'}
                    value={emailAlert}
                    onChange={(e) => setEmailAlert(e.target.value)}
                    className="mb-3 bg-background border-border"
                  />
                  <Button variant="default" className="w-full">
                    {language === 'ar' ? 'إنشاء تنبيهات' : 'Create alerts'}
                  </Button>
                </Card>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  {language === 'ar' ? `عرض ${filteredServices.length} خدمة` : `Showing ${filteredServices.length} services`}
                </h1>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => {
                  const Icon = iconMap[service.name] || Bot;
                  return (
                    <Card
                      key={service.id}
                      className="overflow-hidden bg-card border-border hover:shadow-elegant transition-all cursor-pointer group"
                    >
                      {/* Image */}
                      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                        {service.image_url ? (
                          <img 
                            src={service.image_url} 
                            alt={language === 'ar' ? service.name_ar : service.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-20 h-20 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4 w-12 h-12 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                          {language === 'ar' ? service.name_ar : service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {language === 'ar' ? service.description_ar : service.description}
                        </p>

                        {/* Tags */}
                        <div className="flex gap-2 mb-4">
                          <Badge variant="secondary" className="text-xs">
                            {language === 'ar' ? 'الذكاء الاصطناعي' : 'AI Service'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {language === 'ar' ? 'متاح الآن' : 'Available'}
                          </Badge>
                        </div>

                        {/* Price & Details */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                          <span className="font-semibold text-primary">
                            {service.price.toLocaleString()} {service.currency}
                          </span>
                          <span>{language === 'ar' ? 'شهرياً' : '/month'}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/services');
                            }}
                          >
                            {language === 'ar' ? 'التفاصيل' : 'Details'}
                          </Button>
                          <Button 
                            variant="default"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookService(service);
                            }}
                          >
                            {language === 'ar' ? 'احجز الآن' : 'Book now'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {filteredServices.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">
                    {language === 'ar' ? 'لا توجد خدمات متاحة' : 'No services found'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
