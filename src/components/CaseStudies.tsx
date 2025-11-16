import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Clock, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const CaseStudies = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const caseStudies = [
    {
      title: language === 'ar' ? 'تحليلات التجزئة بالذكاء الاصطناعي' : 'AI-Powered Retail Analytics',
      client: language === 'ar' ? 'شركة تجزئة كبرى' : 'Major Retail Chain',
      industry: language === 'ar' ? 'التجزئة' : 'Retail',
      description: language === 'ar'
        ? 'قمنا بتطوير نظام تحليلات مدعوم بالذكاء الاصطناعي لتحسين إدارة المخزون والتنبؤ بالطلب. النتيجة: تقليل 40% في التكاليف وزيادة 25% في المبيعات.'
        : 'Developed AI-powered analytics system to optimize inventory management and demand forecasting. Result: 40% cost reduction and 25% sales increase.',
      metrics: [
        { icon: TrendingUp, label: language === 'ar' ? 'زيادة المبيعات' : 'Sales Increase', value: '25%' },
        { icon: DollarSign, label: language === 'ar' ? 'توفير التكاليف' : 'Cost Savings', value: '40%' },
        { icon: Clock, label: language === 'ar' ? 'وقت التنفيذ' : 'Implementation', value: language === 'ar' ? '3 أشهر' : '3 months' }
      ]
    },
    {
      title: language === 'ar' ? 'أتمتة الخدمات المالية' : 'Financial Services Automation',
      client: language === 'ar' ? 'مؤسسة مالية' : 'Financial Institution',
      industry: language === 'ar' ? 'المالية' : 'Finance',
      description: language === 'ar'
        ? 'نفذنا حلول أتمتة مدعومة بالذكاء الاصطناعي لمعالجة القروض واكتشاف الاحتيال. النتيجة: تقليل 70% في وقت المعالجة وتحسين 95% في دقة اكتشاف الاحتيال.'
        : 'Implemented AI-driven automation for loan processing and fraud detection. Result: 70% reduction in processing time and 95% accuracy in fraud detection.',
      metrics: [
        { icon: Clock, label: language === 'ar' ? 'تقليل الوقت' : 'Time Reduction', value: '70%' },
        { icon: TrendingUp, label: language === 'ar' ? 'الدقة' : 'Accuracy', value: '95%' },
        { icon: DollarSign, label: language === 'ar' ? 'العائد السنوي' : 'Annual ROI', value: '250%' }
      ]
    }
  ];

  return (
    <section className="py-24 bg-gradient-accent/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[128px]"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-[128px]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {language === 'ar' ? 'قصص نجاح' : 'Success Stories'}
          </h2>
          <p className="text-lg text-muted-foreground">
            {language === 'ar'
              ? 'اكتشف كيف نساعد الشركات على تحقيق نتائج ملموسة من خلال الذكاء الاصطناعي'
              : 'Discover how we help businesses achieve measurable results with AI'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {caseStudies.map((study, index) => (
            <Card 
              key={index}
              className="p-8 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Header */}
              <div className="mb-6">
                <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">
                  {study.industry}
                </Badge>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {study.title}
                </h3>
                <p className="text-sm text-muted-foreground">{study.client}</p>
              </div>

              {/* Description */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {study.description}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-accent/50 rounded-lg">
                {study.metrics.map((metric, idx) => (
                  <div key={idx} className="text-center">
                    <metric.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground mb-1">
                      {metric.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button 
                variant="ghost" 
                className="w-full group/btn"
                onClick={() => navigate('/contact')}
              >
                {language === 'ar' ? 'اقرأ المزيد' : 'Read More'}
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 animate-fade-in">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/contact')}
          >
            {language === 'ar' ? 'عرض المزيد من دراسات الحالة' : 'View More Case Studies'}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;
