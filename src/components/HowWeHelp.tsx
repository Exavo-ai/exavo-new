import { Users, Target, Award, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HowWeHelp = () => {
  const { language } = useLanguage();

  const solutions = [
    {
      icon: Users,
      title: language === 'ar' ? 'فريق تنفيذ مخصص' : 'Dedicated Implementation Team',
      description: language === 'ar' 
        ? 'استراتيجيون ومهندسون متخصصون في بناء أنظمة الذكاء الاصطناعي.'
        : 'Strategists and engineers specialized in building AI systems.'
    },
    {
      icon: Target,
      title: language === 'ar' ? 'تسليم منظم من البداية للنهاية' : 'End-to-End Structured Delivery',
      description: language === 'ar'
        ? 'من الاستراتيجية إلى النشر والتحسين المستمر.'
        : 'From strategy to deployment and ongoing optimization.'
    },
    {
      icon: Award,
      title: language === 'ar' ? 'عائد استثمار قابل للقياس' : 'Measurable ROI',
      description: language === 'ar'
        ? 'كل نظام مصمم لتحقيق نتائج أعمال ملموسة.'
        : 'Every system designed to deliver tangible business outcomes.'
    },
    {
      icon: TrendingUp,
      title: language === 'ar' ? 'بنية تحتية قابلة للتوسع' : 'Scalable Infrastructure',
      description: language === 'ar'
        ? 'أنظمة ذكاء اصطناعي تنمو مع نمو أعمالك.'
        : 'AI systems that scale as your business grows.'
    }
  ];

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6">
            {language === 'ar' 
              ? 'لماذا تختار Exavo'
              : 'Why Companies Choose Exavo'}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6">
            {language === 'ar'
              ? 'Exavo هو شريك تنفيذ بنية تحتية للذكاء الاصطناعي يقدم تسليماً منظماً بدون تعقيد.'
              : 'Exavo is an AI implementation & infrastructure partner delivering structured execution without complexity.'}
          </p>
        </div>

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
