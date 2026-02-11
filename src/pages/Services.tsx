import { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { PremiumServiceCard } from "@/components/PremiumServiceCard";
import { PremiumServiceFilters } from "@/components/PremiumServiceFilters";
import { ServiceDetailsDialog } from "@/components/ServiceDetailsDialog";
import { ConsultationRequestDialog } from "@/components/ConsultationRequestDialog";
import { Bot, Workflow, LineChart, Mail, FileText, BarChart3, Brain, Zap, Shield, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const FREE_CONSULTATION_SERVICE_NAME = "Free AI Consultation";

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
  images?: unknown;
  payment_model?: 'one_time' | 'subscription';
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
  const isMobile = useIsMobile();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Filter states - no filters applied by default
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Only update sidebar state after initial mount to prevent hydration issues
    if (isMobile !== undefined) {
      setSidebarOpen(!isMobile);
    }
  }, [isMobile]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [servicesResult, categoriesResult] = await Promise.all([
        supabase.from('services').select('*').eq('active', true).order('name'),
        supabase.from('categories').select('id, name, name_ar, icon').order('name')
      ]);
      
      if (servicesResult.data) {
        setServices(servicesResult.data);
        // Initialize price range based on actual data - include 0 priced items
        const prices = servicesResult.data.map(s => s.price);
        const minPrice = Math.min(...prices, 0);
        const maxPrice = Math.max(...prices, 50000);
        setPriceRange([minPrice, maxPrice]);
      }

      if (categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenServiceDetails = (service: Service) => {
    setSelectedService(service);
    setDetailsDialogOpen(true);
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
    // No filtering until data is loaded
    if (!priceRange) return services;
    
    const filtered = services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Show all services if no category is selected
      const matchesCategory = selectedCategories.length === 0 || 
        (service.category && selectedCategories.includes(service.category));

      // Include services within price range (inclusive of 0)
      const matchesPrice = service.price >= priceRange[0] && service.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    });

    // Pin "Free AI Consultation" to the top
    return filtered.sort((a, b) => {
      if (a.name === FREE_CONSULTATION_SERVICE_NAME) return -1;
      if (b.name === FREE_CONSULTATION_SERVICE_NAME) return 1;
      return 0;
    });
  }, [services, searchQuery, selectedCategories, priceRange]);

  const maxPrice = Math.max(...services.map(s => s.price), 50000);
  const currentPriceRange = priceRange || [0, maxPrice];

  const FiltersComponent = (
    <PremiumServiceFilters
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedCategories={selectedCategories}
      onCategoryToggle={handleCategoryToggle}
      priceRange={currentPriceRange}
      onPriceRangeChange={setPriceRange}
      maxPrice={maxPrice}
      categoryCounts={categoryCounts}
      categories={categories}
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
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-muted/30 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filteredServices.map((service) => {
                    const category = categories.find(c => c.id === service.category);
                    const categoryName = category?.name || '';
                    const IconComponent = iconMap[service.name] || iconMap[categoryName] || Brain;
                    // Use image_url if exists, otherwise fallback to first image from images array
                    const imagesArray = Array.isArray(service.images) ? service.images : null;
                    const displayImage = service.image_url || (imagesArray && imagesArray.length > 0 ? String(imagesArray[0]) : null);
                    
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
                        image_url={displayImage}
                        Icon={IconComponent}
                        onBook={() => {
                          if (service.name === FREE_CONSULTATION_SERVICE_NAME) {
                            setConsultationDialogOpen(true);
                          } else {
                            handleOpenServiceDetails(service);
                          }
                        }}
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
        <ServiceDetailsDialog
          service={selectedService}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}

      <ConsultationRequestDialog
        trigger={<span className="hidden" />}
        open={consultationDialogOpen}
        onOpenChange={setConsultationDialogOpen}
      />
    </div>
  );
};

export default Services;
