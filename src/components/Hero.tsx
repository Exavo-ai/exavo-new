import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import dashboardHero from "@/assets/hero-dashboard.jpg";

const Hero = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  const benefits = [
    language === 'ar' ? 'تقليل وقت التنفيذ بنسبة 70%' : 'Reduce implementation time by 70%',
    language === 'ar' ? 'زيادة العائد على الاستثمار بالذكاء الاصطناعي' : 'Maximize ROI with AI insights',
    language === 'ar' ? 'لا حاجة لخبرة تقنية' : 'No technical expertise required',
    language === 'ar' ? 'فريق دعم خبراء 24/7' : '24/7 Expert support team'
  ];

  return (
    <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
      
      {/* Ambient glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                {language === 'ar' 
                  ? 'تحليلات مدعومة بالذكاء الاصطناعي لأعمالك'
                  : 'AI-Powered Analytics for Your Business'}
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                {language === 'ar'
                  ? 'حوّل بياناتك إلى رؤى قابلة للتنفيذ مع تحليلات الذكاء الاصطناعي فائقة السرعة. اتخذ قرارات أذكى وحقق النمو دون تعقيد تقني.'
                  : 'Transform your data into actionable insights with lightning-fast AI analytics. Make smarter decisions and drive growth without technical complexity.'}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                variant="hero"
                className="text-base sm:text-lg px-8 h-12 sm:h-14"
                onClick={() => navigate(user ? '/booking' : '/contact')}
              >
                {language === 'ar' ? 'احصل على استشارة مجانية' : 'Get Free Consultation'}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-8 h-12 sm:h-14"
                onClick={() => navigate('/services')}
              >
                {language === 'ar' ? 'تعرف على المزيد' : 'Learn More'}
              </Button>
            </div>

            {/* Benefits List */}
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-2xl overflow-hidden shadow-card border border-border/50 bg-card">
              <img 
                src={dashboardHero} 
                alt="Dashboard preview"
                className="w-full h-auto"
              />
              
              {/* Floating stat badges */}
              <div className="absolute top-6 right-6 backdrop-blur-md bg-card/80 rounded-xl p-4 shadow-glow border border-border/50 animate-float">
                <div className="text-2xl font-bold text-primary">+43%</div>
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'نمو الإيرادات' : 'Revenue Growth'}
                </div>
              </div>
              
              <div className="absolute bottom-6 left-6 backdrop-blur-md bg-card/80 rounded-xl p-4 shadow-glow border border-border/50 animate-float" style={{ animationDelay: '1s' }}>
                <div className="text-2xl font-bold text-secondary">99.9%</div>
                <div className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'دقة البيانات' : 'Data Accuracy'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
