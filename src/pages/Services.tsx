import { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BookingDialog from "@/components/BookingDialog";
import { PremiumServiceCard } from "@/components/PremiumServiceCard";
import { PremiumServiceFilters } from "@/components/PremiumServiceFilters";
import { ServiceDetailsDialog } from "@/components/ServiceDetailsDialog";
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
  category: string;
  active: boolean;
  image_url?: string | null;
}

interface Category {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
}

const iconMap: Record<string, any> = {
  'AI Chatbot': Bot,
  'Workflow Automation': Workflow,
  'Predictive Analytics': LineChart,
  'Marketing Automation': Mail,
  'Content Generation': FileText,
  'Data Visualization': BarChart3,
  'AI Services': Brain,
  'Automation': Zap,
  'Analytics': LineChart,
  'Marketing': Mail,
  'Content': FileText,
  'Security': Shield,
  'Business': Target
};

const Services = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const fetchData = async () => {
    const [servicesResult, categoriesResult] = await Promise.all([
      supabase.from('services').select('*').eq('active', true).order('name'),
      supabase.from('categories').select('id, name, name_ar, icon').order('name')
    ]);
    
    if (servicesResult.data) {
      setServices(servicesResult.data);
      const maxPrice = Math.max(...servicesResult.data.map(s => s.price), 50000);
      setPriceRange([0, maxPrice]);
    }

    if (categoriesResult.data) {
      setCategories(categoriesResult.data);
    }
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setDetailsDialogOpen(true);
  };

  const handleSelectPackage = (serviceId: string, packageId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedService(service);
      setDialogOpen(true);
      toast({
        title: "Package Selected",
        description: "Please complete the booking form",
      });
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    const maxPrice = Math.max(...services.map(s => s.price), 50000);
    setPriceRange([0, maxPrice]);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach(service => {
      if (service.category) {
        counts[service.category] = (counts[service.category] || 0) + 1;
      }
    });
    return counts;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategories.length === 0 || 
        (service.category && selectedCategories.includes(service.category));

      const matchesPrice = service.price >= priceRange[0] && service.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [services, searchQuery, selectedCategories, priceRange]);

  const maxPrice = Math.max(...services.map(s => s.price), 50000);

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
      isOpen={sidebarOpen}
      onToggle={() => setSidebarOpen(!sidebarOpen)}
    />
  );

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {language === 'ar' ? 'خدمات الذكاء الاصطناعي' : 'AI Services'}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto px-4">
              {language === 'ar'
                ? 'اكتشف مجموعتنا الشاملة من الخدمات المدعومة بالذكاء الاصطناعي'
                : 'Discover our comprehensive suite of AI-powered services'}
            </p>
          </div>

          <div className="flex gap-6 lg:gap-8">
            {/* Desktop Sidebar */}
            {!isMobile && (
              <div 
                className={`transition-all duration-300 flex-shrink-0 ${
                  sidebarOpen ? 'w-72 lg:w-80' : 'w-16'
                }`}
              >
                <div className="sticky top-24">
                  {sidebarOpen ? (
                    FiltersComponent
                  ) : (
                    <Button
                      onClick={() => setSidebarOpen(true)}
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
                    <Button size="lg" className="rounded-full shadow-xl h-14 w-14 sm:h-auto sm:w-auto sm:px-6">
                      <SlidersHorizontal className="w-5 h-5 sm:mr-2" />
                      <span className="hidden sm:inline">Filters</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[85vw] sm:w-80 p-0">
                    <div className="p-4 sm:p-6">
                      {FiltersComponent}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}

            {/* Services Grid */}
            <div className="flex-1 min-w-0">
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filteredServices.map((service) => {
                    const category = categories.find(c => c.id === service.category);
                    const categoryName = category?.name || '';
                    const IconComponent = iconMap[service.name] || iconMap[categoryName] || Brain;
                    
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
                        Icon={IconComponent}
                        onBook={() => handleBookService(service)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-lg text-muted-foreground">
                    {language === 'ar'
                      ? 'لم يتم العثور على خدمات مطابقة'
                      : 'No matching services found'}
                  </p>
                  <Button onClick={handleClearFilters} className="mt-4">
                    {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      
      {selectedService && (
        <>
          <BookingDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            serviceName={language === 'ar' ? selectedService.name_ar : selectedService.name}
            serviceId={selectedService.id}
          />
          
          <ServiceDetailsDialog
            service={selectedService}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            onSelectPackage={handleSelectPackage}
          />
        </>
      )}
    </div>
  );
};

export default Services;
