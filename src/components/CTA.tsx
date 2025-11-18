import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden bg-muted/30">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/50 to-primary/5"></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20"></div>
      
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground animate-fade-in">
            {language === 'ar' 
              ? 'هل أنت مستعد لتحويل أعمالك؟'
              : 'Ready to Transform Your Business?'}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {language === 'ar'
              ? 'انضم إلى آلاف الشركات التي تستخدم Exavo لاتخاذ قرارات مدعومة بالبيانات'
              : 'Join thousands of businesses using Exavo to make data-driven decisions'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button 
              variant="hero" 
              size="lg"
              className="text-base sm:text-lg px-8 h-12 sm:h-14"
              onClick={() => navigate('/login')}
            >
              {language === 'ar' ? 'ابدأ الآن' : 'Get Started Now'}
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-base sm:text-lg px-8 h-12 sm:h-14"
              onClick={() => navigate('/services')}
            >
              {language === 'ar' ? 'استكشف الخدمات' : 'Explore Services'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
