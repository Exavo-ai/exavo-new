import { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BookingDialog from "@/components/BookingDialog";
import { PremiumServiceCard } from "@/components/PremiumServiceCard";
import { PremiumServiceFilters } from "@/components/PremiumServiceFilters";
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3, Brain, Zap, Shield, Target } from "lucide-react";

interface Service {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  currency: string;
  active: boolean;
  image_url?: string | null;
}

const iconMap: Record<string, any> = {
  'AI Chatbot': Bot,
  'Workflow Automation': Workflow,
  'Predictive Analytics': LineChart,
  'Marketing Automation': Mail,
  'Content Generation': FileText,
  'Data Visualization': BarChart3,
  'AI': Brain,
  'Automation': Zap,
  'Analytics': LineChart,
  'Security': Shield,
  'Business': Target
};

// Map services to categories
const serviceToCategoryMap: Record<string, string> = {
  'Customer Support': 'ai',
  'Lead': 'marketing',
  'Workflow': 'automation',
  'Analytics': 'analytics',
  'Predictive': 'analytics',
  'Marketing': 'marketing',
  'Bot': 'automation',
  'HR': 'business',
  'Fraud': 'ai',
  'KPI': 'analytics',
  'Competitor': 'analytics',
  'Financial': 'analytics',
  'Email': 'marketing',
  'Social': 'marketing',
  'Document': 'business',
  'Sales': 'business',
  'Inventory': 'business',
  'Sentiment': 'analytics',
  'Voice': 'ai',
  'Content': 'ai',
  'Price': 'business',
  'Quality': 'automation',
  'Translation': 'ai',
  'Video': 'ai',
  'Recruitment': 'business',
  'Energy': 'analytics',
  'Supply': 'analytics',
  'Personalization': 'ai',
  'Churn': 'analytics',
  'Legal': 'business',
  'Healthcare': 'ai',
  'Real Estate': 'business',
  'Credit': 'business',
  'Scheduling': 'business',
  'Product': 'business',
  'Network': 'ai'
};

const getServiceCategory = (serviceName: string): string => {
  for (const [keyword, category] of Object.entries(serviceToCategoryMap)) {
    if (serviceName.includes(keyword)) return category;
  }
  return 'business';
};

const Services = () => {
  const { language } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (data) {
      setServices(data);
      const maxPrice = Math.max(...data.map(s => s.price), 50000);
      setPriceRange([0, maxPrice]);
    }
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    const maxPrice = Math.max(...services.map(s => s.price), 50000);
    setPriceRange([0, maxPrice]);
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        service.name.toLowerCase().includes(searchLower) ||
        service.name_ar.includes(searchQuery) ||
        service.description.toLowerCase().includes(searchLower) ||
        service.description_ar.includes(searchQuery);

      const serviceCategory = getServiceCategory(service.name);
      const matchesCategory = 
        selectedCategories.length === 0 || 
        selectedCategories.includes(serviceCategory);

      const matchesPrice = 
        service.price >= priceRange[0] && 
        service.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [services, searchQuery, selectedCategories, priceRange]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ai: 0,
      automation: 0,
      analytics: 0,
      marketing: 0,
      business: 0,
    };

    services.forEach(service => {
      const category = getServiceCategory(service.name);
      if (counts[category] !== undefined) {
        counts[category]++;
      }
    });

    return counts;
  }, [services]);

  const maxPrice = useMemo(() => 
    Math.max(...services.map(s => s.price), 50000),
    [services]
  );

  // Get icon for service
  const getServiceIcon = (serviceName: string) => {
    for (const [key, icon] of Object.entries(iconMap)) {
      if (serviceName.includes(key)) return icon;
    }
    return Bot;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1600px]">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              {language === 'ar' ? 'خدمات الذكاء الاصطناعي المتميزة' : 'Premium AI Services'}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'اكتشف مجموعتنا الكاملة من حلول الذكاء الاصطناعي المتقدمة لتحويل أعمالك'
                : 'Discover our complete collection of advanced AI solutions to transform your business'}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className={`transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'lg:w-64' : 'lg:w-0 overflow-hidden'}`}>
              <div className="sticky top-24">
                <PremiumServiceFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedCategories={selectedCategories}
                  onCategoryToggle={handleCategoryToggle}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                  maxPrice={maxPrice}
                  categoryCounts={categoryCounts}
                  onClearFilters={handleClearFilters}
                  isOpen={sidebarOpen}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                />
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Grid Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => {
                  const Icon = getServiceIcon(service.name);
                  
                  return (
                    <PremiumServiceCard
                      key={service.id}
                      id={service.id}
                      name={service.name}
                      name_ar={service.name_ar}
                      description={service.description}
                      description_ar={service.description_ar}
                      price={service.price}
                      currency={service.currency}
                      image_url={service.image_url}
                      Icon={Icon}
                      onBook={() => handleBookService(service)}
                    />
                  );
                })}
              </div>

              {/* Empty State */}
              {filteredServices.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
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
          serviceName={language === 'ar' ? selectedService.name_ar : selectedService.name}
          serviceId={selectedService.id}
        />
      )}
    </div>
  );
};

export default Services;
