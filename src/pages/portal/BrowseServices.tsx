import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BookingDialog from "@/components/BookingDialog";
import { PremiumServiceCard } from "@/components/PremiumServiceCard";
import { PremiumServiceFilters } from "@/components/PremiumServiceFilters";
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3, Brain, Zap, Shield, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

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

const BrowseServices = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
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
    setPriceRange([0, Math.max(...services.map(s => s.price), 50000)]);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach(service => {
      const category = getServiceCategory(service.name);
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.includes(getServiceCategory(service.name));
      
      const matchesPrice = service.price >= priceRange[0] && service.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [services, searchQuery, selectedCategories, priceRange]);

  const maxPrice = useMemo(() => Math.max(...services.map(s => s.price), 50000), [services]);

  const FiltersComponent = (
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
      isOpen={filtersOpen}
      onToggle={() => setFiltersOpen(!filtersOpen)}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Browse Services</h1>
          <p className="text-muted-foreground">
            Discover and purchase AI-powered services for your business
          </p>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          {!isMobile && (
            <div 
              className={`transition-all duration-300 flex-shrink-0 ${
                filtersOpen ? 'w-80' : 'w-16'
              }`}
            >
              <div className="sticky top-4">
                {filtersOpen ? (
                  FiltersComponent
                ) : (
                  <Button
                    onClick={() => setFiltersOpen(true)}
                    variant="outline"
                    size="icon"
                    className="w-12 h-12"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Mobile Filter Button */}
          {isMobile && (
            <div className="fixed bottom-6 right-6 z-40">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button size="lg" className="rounded-full shadow-lg">
                    <SlidersHorizontal className="w-5 h-5 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-6">
                    {FiltersComponent}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Services Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => {
                const ServiceIcon = iconMap[service.name] || iconMap[getServiceCategory(service.name)] || Bot;
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
                    Icon={ServiceIcon}
                    onBook={() => handleBookService(service)}
                  />
                );
              })}
            </div>

            {filteredServices.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No services found matching your criteria
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedService && (
        <BookingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          serviceId={selectedService.id}
          serviceName={selectedService.name}
        />
      )}
    </div>
  );
};

export default BrowseServices;
