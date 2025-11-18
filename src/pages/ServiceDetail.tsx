import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BookingDialog from "@/components/BookingDialog";
import { 
  Bot, Workflow, LineChart, Mail, FileText, BarChart3, 
  Check, ArrowLeft, Star
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const iconMap: Record<string, any> = {
  'AI Chatbot': Bot,
  'Workflow Automation': Workflow,
  'Predictive Analytics': LineChart,
  'Marketing Automation': Mail,
  'Content Generation': FileText,
  'Data Visualization': BarChart3
};

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [service, setService] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchService();
    }
  }, [id]);

  const fetchService = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setService(data);
    }
    setLoading(false);
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

  const pricingTiers = [
    {
      name: language === 'ar' ? 'الأساسي' : 'Basic',
      price: service.price,
      features: [
        language === 'ar' ? 'الميزات الأساسية' : 'Basic Features',
        language === 'ar' ? 'دعم البريد الإلكتروني' : 'Email Support',
        language === 'ar' ? '1 مستخدم' : '1 User',
      ]
    },
    {
      name: language === 'ar' ? 'المحترف' : 'Professional',
      price: service.price * 2,
      features: [
        language === 'ar' ? 'جميع الميزات الأساسية' : 'All Basic Features',
        language === 'ar' ? 'دعم الأولوية' : 'Priority Support',
        language === 'ar' ? '5 مستخدمين' : '5 Users',
        language === 'ar' ? 'تحليلات متقدمة' : 'Advanced Analytics',
      ]
    },
    {
      name: language === 'ar' ? 'المؤسسة' : 'Enterprise',
      price: service.price * 5,
      features: [
        language === 'ar' ? 'جميع الميزات الاحترافية' : 'All Professional Features',
        language === 'ar' ? 'دعم مخصص' : 'Dedicated Support',
        language === 'ar' ? 'مستخدمين غير محدودين' : 'Unlimited Users',
        language === 'ar' ? 'التكامل المخصص' : 'Custom Integration',
      ]
    },
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
              
              <div className="text-3xl font-bold text-primary mb-6">
                ${service.price.toLocaleString()}
                <span className="text-base text-muted-foreground font-normal">
                  {language === 'ar' ? ' / سنويًا' : ' / year'}
                </span>
              </div>

              <Button 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => setDialogOpen(true)}
              >
                {language === 'ar' ? 'احجز الآن' : 'Book Now'}
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

          {/* Pricing Tiers */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              {language === 'ar' ? 'خطط التسعير' : 'Pricing Tiers'}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {pricingTiers.map((tier, index) => (
                <Card key={index} className={`p-6 ${index === 1 ? 'border-primary shadow-glow' : ''}`}>
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <div className="text-3xl font-bold text-primary mb-4">
                    ${tier.price.toLocaleString()}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={index === 1 ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setDialogOpen(true)}
                  >
                    {language === 'ar' ? 'اختر الخطة' : 'Choose Plan'}
                  </Button>
                </Card>
              ))}
            </div>
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
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </main>
      <Footer />

      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceName={serviceName}
        serviceId={service.id}
      />
    </div>
  );
};

export default ServiceDetail;
