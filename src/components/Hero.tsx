import { Button } from "@/components/ui/button";
import { Zap, DollarSign, Package, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConsultationRequestDialog } from "@/components/ConsultationRequestDialog";

const Hero = () => {
  const { language } = useLanguage();
  const benefits = [
    {
      icon: Package,
      text: language === 'ar' ? 'أدوات ذكاء اصطناعي جاهزة للاستخدام' : 'Ready-to-use AI tools'
    },
    {
      icon: Zap,
      text: language === 'ar' ? 'لا تحتاج خبرة تقنية' : 'No technical skills needed'
    },
    {
      icon: DollarSign,
      text: language === 'ar' ? 'أسعار مناسبة للشركات الصغيرة' : 'Affordable for small businesses'
    }
  ];

  return (
    <section className="relative overflow-hidden pt-24 sm:pt-32 pb-16 lg:pt-40 lg:pb-24">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
      
      {/* Ambient glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            {language === 'ar' 
              ? 'أتمتة الذكاء الاصطناعي وحلول ذكية للأعمال'
              : 'AI Automation & Intelligent Solutions for Businesses'}
          </h1>
          
          {/* Clear Value Proposition */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            {language === 'ar'
              ? 'نساعد الشركات الصغيرة والمتوسطة على تبني الذكاء الاصطناعي بسهولة — بدون تعقيدات تقنية أو تكاليف باهظة.'
              : 'Helping small and mid-sized businesses adopt AI easily — no technical complexity, no big budgets required.'}
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2"
              >
                <benefit.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <ConsultationRequestDialog
              trigger={
                <Button 
                  size="lg"
                  variant="hero"
                  className="text-base sm:text-lg px-10 h-14 font-semibold gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  {language === 'ar' ? 'استشارة مجانية' : 'Free Consultation'}
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
