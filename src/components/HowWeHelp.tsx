import { CheckCircle2, Users, Target, Award, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HowWeHelp = () => {
  const { language } = useLanguage();

  const solutions = [
    {
      icon: Users,
      title: language === 'ar' ? 'محترفو الذكاء الاصطناعي النخبة' : 'Elite AI Professionals',
      description: language === 'ar' 
        ? 'احصل على خبراء ومطورين ذكاء اصطناعي مختارين من الطراز الأول.'
        : 'Access curated top-tier AI experts & developers.'
    },
    {
      icon: Target,
      title: language === 'ar' ? 'إدارة المشاريع الشاملة' : 'End-to-End Project Management',
      description: language === 'ar'
        ? 'الاستراتيجية، التوظيف، التنفيذ، والتسليم.'
        : 'Strategy, hiring, execution, delivery.'
    },
    {
      icon: Award,
      title: language === 'ar' ? 'الجودة والنتائج' : 'Quality & Results',
      description: language === 'ar'
        ? 'فحص دقيق يضمن أعلى المعايير.'
        : 'Rigorous vetting ensures highest standards.'
    },
    {
      icon: TrendingUp,
      title: language === 'ar' ? 'تجنب الأخطاء المكلفة' : 'Avoid Costly Mistakes',
      description: language === 'ar'
        ? 'عظّم عائد الاستثمار في الذكاء الاصطناعي وحقق نتائج مضمونة.'
        : 'Maximize AI ROI and achieve guaranteed results.'
    }
  ];

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6">
            {language === 'ar' 
              ? 'كيف نساعدك في حل مشاكلك'
              : 'How We Help Solve Your Problems'}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6">
            {language === 'ar'
              ? 'نموذج الوساطة الخاص بنا يقدم نتائج مذهلة بدون أي متاعب.'
              : 'Our brokerage model delivers amazing results with none of the hassle.'}
          </p>
        </div>

        {/* Solutions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {solutions.map((solution, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-2xl p-6 lg:p-8 hover:shadow-card transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center mb-6 shadow-glow">
                <solution.icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">
                {solution.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {solution.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowWeHelp;
