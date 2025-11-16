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
    <section className="relative overflow-hidden pt-32 pb-20 min-h-screen flex items-center bg-gradient-to-br from-primary via-primary/90 to-secondary">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-secondary/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-white space-y-8 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              {language === 'ar' 
                ? 'تحليلات مدعومة بالذكاء الاصطناعي لأعمالك'
                : 'AI-Powered Analytics for Your Business'}
            </h1>
            
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed">
              {language === 'ar'
                ? 'حوّل بياناتك إلى رؤى قابلة للتنفيذ مع تحليلات الذكاء الاصطناعي فائقة السرعة. اتخذ قرارات أذكى وحقق النمو دون تعقيد تقني.'
                : 'Transform your data into actionable insights with lightning-fast AI analytics. Make smarter decisions and drive growth without technical complexity.'}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                variant="secondary"
                className="text-lg px-8 shadow-glow hover:shadow-glow-lg hover:scale-105 transition-all"
                onClick={() => navigate(user ? '/booking' : '/contact')}
              >
                {language === 'ar' ? 'احصل على استشارة مجانية' : 'Get Free Consultation'}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:scale-105 transition-all"
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
                  className="flex items-start gap-2 animate-fade-in-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/90">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-sm">
              <img 
                src={dashboardHero} 
                alt="Dashboard Preview"
                className="w-full h-auto"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent"></div>
            </div>
            
            {/* Floating stat badges */}
            <div className="absolute -top-6 -right-6 bg-white rounded-lg shadow-glow p-4 animate-float">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مستخدم نشط' : 'Active Users'}
              </div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 bg-white rounded-lg shadow-glow p-4 animate-float" style={{ animationDelay: '1s' }}>
              <div className="text-3xl font-bold text-secondary">70%</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'توفير الوقت' : 'Time Saved'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
