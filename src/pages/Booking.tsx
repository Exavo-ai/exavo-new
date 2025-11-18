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
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3, Search, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'AI Chatbot': Bot,
  'Workflow Automation': Workflow,
  'Predictive Analytics': LineChart,
  'Marketing Automation': Mail,
  'Content Generation': FileText,
  'Data Visualization': BarChart3
};

// Generate gradient backgrounds for services
const gradientMap: Record<string, string> = {
  'AI Chatbot': 'from-blue-500/20 via-blue-400/10 to-purple-500/20',
  'Workflow Automation': 'from-orange-500/20 via-amber-400/10 to-yellow-500/20',
  'Predictive Analytics': 'from-green-500/20 via-emerald-400/10 to-teal-500/20',
  'Marketing Automation': 'from-pink-500/20 via-rose-400/10 to-red-500/20',
  'Content Generation': 'from-violet-500/20 via-purple-400/10 to-indigo-500/20',
  'Data Visualization': 'from-cyan-500/20 via-sky-400/10 to-blue-500/20'
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
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={language === 'ar' ? 'ابحث عن أي شيء' : 'Search for anything'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-card/50 backdrop-blur-sm border-border/50 focus:bg-card transition-colors"
                  />
                </div>

                {/* Locations Filter */}
                <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-4">
                  <button className="flex items-center justify-between w-full text-left group">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {language === 'ar' ? 'الفئات' : 'Locations'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>

                {/* Clear Filters */}
                <Button 
                  variant="outline" 
                  className="w-full h-11 bg-card/50 backdrop-blur-sm hover:bg-card border-border/50"
                  onClick={() => setSearchQuery('')}
                >
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                </Button>

                {/* Newsletter */}
                <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-5">
                  <h3 className="font-semibold mb-2 text-foreground text-base">
                    {language === 'ar' ? 'ابق على اطلاع' : 'Stay in the loop'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {language === 'ar' 
                      ? 'احصل على إشعارات حول الخدمات الجديدة والعروض والمزيد!' 
                      : 'Get notified about new services, discounts, and much more!'}
                  </p>
                  <Input
                    type="email"
                    placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'your@email.com'}
                    value={emailAlert}
                    onChange={(e) => setEmailAlert(e.target.value)}
                    className="mb-3 h-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
                  />
                  <Button variant="default" className="w-full h-10 font-medium">
                    {language === 'ar' ? 'إنشاء تنبيهات' : 'Create alerts'}
                  </Button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">
                  {language === 'ar' 
                    ? `عرض ${filteredServices.length} خدمة` 
                    : `Showing ${filteredServices.length} services`}
                </h1>
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredServices.map((service) => {
                  const Icon = iconMap[service.name] || Bot;
                  const gradient = gradientMap[service.name] || 'from-primary/20 via-primary/10 to-primary/5';
                  
                  return (
                    <Card
                      key={service.id}
                      className="group overflow-hidden bg-card border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col"
                    >
                      {/* Image Header */}
                      <div className={`relative h-44 bg-gradient-to-br ${gradient} overflow-hidden`}>
                        {service.image_url ? (
                          <img 
                            src={service.image_url} 
                            alt={language === 'ar' ? service.name_ar : service.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon className="w-24 h-24 text-primary/20" strokeWidth={1.5} />
                          </div>
                        )}
                        
                        {/* Icon Badge */}
                        <div className="absolute top-3 left-3 w-11 h-11 rounded-lg bg-primary shadow-lg flex items-center justify-center backdrop-blur-sm">
                          <Icon className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
                        </div>

                        {/* Menu Dots */}
                        <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors flex items-center justify-center">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-foreground"></div>
                            <div className="w-1 h-1 rounded-full bg-foreground"></div>
                            <div className="w-1 h-1 rounded-full bg-foreground"></div>
                          </div>
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col">
                        {/* Title */}
                        <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {language === 'ar' ? service.name_ar : service.name}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed flex-1">
                          {language === 'ar' ? service.description_ar : service.description}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-2 py-0.5 font-medium bg-primary/10 text-primary hover:bg-primary/20 border-0"
                          >
                            {language === 'ar' ? 'ذكاء اصطناعي' : 'AI Service'}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-0.5 font-medium border-border/50"
                          >
                            {language === 'ar' ? 'سنة واحدة كحد أدنى' : 'Min 1 year'}
                          </Badge>
                        </div>

                        {/* Price & Meta Info */}
                        <div className="flex items-center justify-between text-sm mb-4 py-3 border-t border-border/50">
                          <span className="font-bold text-foreground text-base">
                            ${service.price.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { 
                              month: 'numeric', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="default"
                            className="flex-1 h-10 font-medium border-border/50 hover:bg-secondary/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/services');
                            }}
                          >
                            {language === 'ar' ? 'التفاصيل' : 'Details'}
                          </Button>
                          <Button 
                            variant="default"
                            size="default"
                            className="flex-1 h-10 font-semibold shadow-glow"
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

              {/* Empty State */}
              {filteredServices.length === 0 && (
                <div className="text-center py-20">
                  <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'جرب تعديل البحث أو الفلاتر' 
                      : 'Try adjusting your search or filters'}
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
