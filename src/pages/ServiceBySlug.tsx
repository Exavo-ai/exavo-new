import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGuestCheckoutGuard } from "@/hooks/useGuestCheckoutGuard";
import { 
  Bot, Workflow, LineChart, Mail, FileText, BarChart3, 
  Check, ArrowLeft, Star, Loader2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ServicePackage {
  id: string;
  package_name: string;
  description?: string;
  price: number;
  currency: string;
  features: string[];
  delivery_time?: string;
  notes?: string;
  package_order: number;
  build_cost?: number;
  monthly_fee?: number;
}

const iconMap: Record<string, any> = {
  'AI Chatbot': Bot,
  'Workflow Automation': Workflow,
  'Predictive Analytics': LineChart,
  'Marketing Automation': Mail,
  'Content Generation': FileText,
  'Data Visualization': BarChart3
};

const ServiceBySlug = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { guardCheckout } = useGuestCheckoutGuard();
  const [service, setService] = useState<any>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchServiceBySlug();
    }
  }, [slug]);

  useEffect(() => {
    if (service?.id) {
      fetchPackages(service.id);
      
      // Subscribe to real-time package changes
      const channel = supabase
        .channel(`service-packages-slug-${service.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'service_packages',
            filter: `service_id=eq.${service.id}`
          },
          () => {
            console.log('Package change detected, refetching...');
            fetchPackages(service.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [service?.id]);

  const fetchServiceBySlug = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (data) {
      setService(data);
    }
    setLoading(false);
  };

  const fetchPackages = async (serviceId: string) => {
    if (!serviceId) return;
    
    setPackagesLoading(true);
    const { data, error } = await supabase
      .from('service_packages')
      .select('*')
      .eq('service_id', serviceId)
      .order('package_order', { ascending: true });

    if (error) {
      console.error('Error fetching packages:', error);
    } else if (data) {
      setPackages(data.map(pkg => ({
        id: pkg.id,
        package_name: pkg.package_name,
        description: pkg.description || undefined,
        price: pkg.price,
        currency: pkg.currency,
        features: Array.isArray(pkg.features) 
          ? pkg.features.map(f => String(f)).filter(Boolean)
          : [],
        delivery_time: pkg.delivery_time || undefined,
        notes: pkg.notes || undefined,
        package_order: pkg.package_order,
        build_cost: pkg.build_cost || 0,
        monthly_fee: pkg.monthly_fee || 0,
      })));
    }
    setPackagesLoading(false);
  };

  const handleSelectPackage = async (pkg: ServicePackage) => {
    // Guard: redirect guest users to register first
    if (!guardCheckout({ packageId: pkg.id })) {
      return;
    }

    setCheckoutLoading(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-package-checkout', {
        body: {
          packageId: pkg.id,
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: language === 'ar' ? 'خطأ في الدفع' : 'Checkout Error',
        description: error.message || (language === 'ar' ? 'فشل في بدء الدفع. يرجى المحاولة مرة أخرى.' : 'Failed to start checkout. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-32 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-32 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">{language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found'}</h1>
              <Button onClick={() => navigate('/services')}>
                {language === 'ar' ? 'العودة إلى الخدمات' : 'Back to Services'}
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = iconMap[service.name] || Bot;
  const serviceName = language === 'ar' ? service.name_ar : service.name;
  const serviceDescription = language === 'ar' ? service.description_ar : service.description;

  const features = [
    { icon: Check, text: language === 'ar' ? 'دعم 24/7' : '24/7 Support' },
    { icon: Check, text: language === 'ar' ? 'تخصيص كامل' : 'Full Customization' },
    { icon: Check, text: language === 'ar' ? 'تكامل API' : 'API Integration' },
    { icon: Check, text: language === 'ar' ? 'تحديثات مجانية' : 'Free Updates' },
  ];

  const testimonials = [
    {
      name: language === 'ar' ? 'أحمد محمد' : 'Ahmed Mohamed',
      role: language === 'ar' ? 'الرئيس التنفيذي' : 'CEO',
      comment: language === 'ar' 
        ? 'خدمة ممتازة! حسّنت أعمالنا بشكل كبير.'
        : 'Excellent service! Improved our business significantly.',
      rating: 5
    },
    {
      name: language === 'ar' ? 'فاطمة علي' : 'Fatima Ali',
      role: language === 'ar' ? 'مديرة التسويق' : 'Marketing Manager',
      comment: language === 'ar'
        ? 'فريق محترف ونتائج رائعة.'
        : 'Professional team and amazing results.',
      rating: 5
    },
  ];

  const faqs = [
    {
      question: language === 'ar' ? 'كم من الوقت يستغرق التنفيذ؟' : 'How long does implementation take?',
      answer: language === 'ar'
        ? 'يستغرق التنفيذ النموذجي من 2 إلى 4 أسابيع حسب التخصيص المطلوب.'
        : 'Typical implementation takes 2-4 weeks depending on customization required.'
    },
    {
      question: language === 'ar' ? 'هل يمكنني ترقية خطتي لاحقًا؟' : 'Can I upgrade my plan later?',
      answer: language === 'ar'
        ? 'نعم، يمكنك الترقية أو التخفيض في أي وقت.'
        : 'Yes, you can upgrade or downgrade at any time.'
    },
    {
      question: language === 'ar' ? 'ما هي خيارات الدعم؟' : 'What support options are available?',
      answer: language === 'ar'
        ? 'نقدم دعم البريد الإلكتروني والدردشة والهاتف حسب خطتك.'
        : 'We offer email, chat, and phone support depending on your plan.'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/services')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'العودة إلى الخدمات' : 'Back to Services'}
          </Button>

          {/* Hero Section */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Image/Icon */}
            <div className="relative h-96 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 overflow-hidden">
              {service.image_url ? (
                <img 
                  src={service.image_url} 
                  alt={serviceName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon className="w-32 h-32 text-primary" strokeWidth={1} />
                </div>
              )}
              
              <div className="absolute top-6 left-6 w-16 h-16 rounded-lg bg-primary shadow-glow flex items-center justify-center">
                <Icon className="w-8 h-8 text-primary-foreground" strokeWidth={2} />
              </div>
            </div>

            {/* Right: Info */}
            <div className="flex flex-col justify-center">
              <div className="flex gap-2 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {language === 'ar' ? 'ذكاء اصطناعي' : 'AI Service'}
                </Badge>
                <Badge variant="outline">
                  {language === 'ar' ? 'شائع' : 'Popular'}
                </Badge>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">{serviceName}</h1>
              <p className="text-xl text-muted-foreground mb-6">{serviceDescription}</p>

              <Button 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => {
                  if (packages.length > 0) {
                    handleSelectPackage(packages[0]);
                  }
                }}
                disabled={checkoutLoading !== null || packages.length === 0}
              >
                {checkoutLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {language === 'ar' ? 'اشتري الآن' : 'Buy Now'}
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              {language === 'ar' ? 'الميزات الرئيسية' : 'Key Features'}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="p-6">
                  <feature.icon className="w-8 h-8 text-primary mb-3" />
                  <p className="font-medium">{feature.text}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Dynamic Packages */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              {language === 'ar' ? 'الباقات المتاحة' : 'Available Packages'}
            </h2>
            
            {packagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {language === 'ar' ? 'لا توجد باقات متاحة حاليًا' : 'No packages available currently'}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {packages.map((pkg, index) => {
                  const isSubscription = service?.payment_model === 'subscription';
                  const currencySymbol = pkg.currency === 'USD' ? '$' : pkg.currency;
                  const buildCost = pkg.build_cost || 0;
                  const monthlyFee = pkg.monthly_fee || 0;
                  const oneTimePrice = pkg.price || 0;
                  const hasValidPricing = isSubscription ? monthlyFee > 0 : oneTimePrice > 0;

                  return (
                    <Card key={pkg.id} className={`p-6 relative ${index === 1 ? 'border-primary shadow-glow scale-105' : ''}`}>
                      {index === 1 && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                          {language === 'ar' ? 'الأكثر شيوعًا' : 'Most Popular'}
                        </Badge>
                      )}
                      <h3 className="text-xl font-bold mb-2">{pkg.package_name}</h3>
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                      )}
                      <div className="mb-4">
                        {isSubscription ? (
                          <>
                            <div className="text-3xl font-bold text-primary">
                              {currencySymbol}{monthlyFee.toLocaleString()}
                              <span className="text-base font-normal text-muted-foreground">/mo</span>
                            </div>
                            {buildCost > 0 && (
                              <div className="text-sm text-muted-foreground mt-1">
                                + {currencySymbol}{buildCost.toLocaleString()} setup (one-time)
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-3xl font-bold text-primary">
                            {currencySymbol}{oneTimePrice.toLocaleString()}
                          </div>
                        )}
                      </div>
                      {pkg.delivery_time && (
                        <Badge variant="outline" className="mb-4">
                          ⏱️ {pkg.delivery_time}
                        </Badge>
                      )}
                      <ul className="space-y-3 mb-6">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {pkg.notes && (
                        <p className="text-xs text-muted-foreground mb-4 border-t pt-3">
                          {pkg.notes}
                        </p>
                      )}
                      <Button 
                        variant={index === 1 ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => handleSelectPackage(pkg)}
                        disabled={!hasValidPricing || checkoutLoading !== null}
                      >
                        {checkoutLoading === pkg.id && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {language === 'ar' ? 'اشتري الآن' : 'Buy Now'}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Testimonials */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              {language === 'ar' ? 'آراء العملاء' : 'Customer Testimonials'}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">{testimonial.comment}</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold mb-6">
              {language === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-6">
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServiceBySlug;
