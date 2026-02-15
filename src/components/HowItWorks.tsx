import { Database, Brain, Repeat, BarChart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorks = () => {
  const { language } = useLanguage();
  
  const steps = [
    {
      icon: Database,
      title: language === 'ar' ? 'اكتشف وحدّد' : 'Discover & Define',
      description: language === 'ar' 
        ? 'حدّد فرص أتمتة الذكاء الاصطناعي عالية التأثير والمتوافقة مع أهداف عملك.'
        : 'Identify high-impact AI automation opportunities aligned with your business goals.',
      number: '01'
    },
    {
      icon: Brain,
      title: language === 'ar' ? 'طابق وصمّم' : 'Match & Design',
      description: language === 'ar'
        ? 'نطابقك مع متخصصي ذكاء اصطناعي مفحوصين ونصمم خارطة طريق منظمة لتطوير الذكاء الاصطناعي المخصص.'
        : 'We match you with vetted AI specialists and design a structured custom AI development roadmap.',
      number: '02'
    },
    {
      icon: Repeat,
      title: language === 'ar' ? 'ابنِ وادمج' : 'Build & Integrate',
      description: language === 'ar'
        ? 'نطوّر وندمج حلول الذكاء الاصطناعي بسلاسة مع أنظمتك وسير عملك الحالي.'
        : 'Develop and integrate AI solutions seamlessly into your existing systems and workflows.',
      number: '03'
    },
    {
      icon: BarChart,
      title: language === 'ar' ? 'قِس وحسّن' : 'Measure & Optimize',
      description: language === 'ar'
        ? 'تتبّع مؤشرات الأداء، تحقق من النتائج، وحسّن تنفيذ الذكاء الاصطناعي باستمرار لتحقيق عائد استثمار قابل للقياس.'
        : 'Track KPIs, validate performance, and continuously optimize AI implementation for measurable ROI.',
      number: '04'
    }
  ];

  return (
    <section className="py-16 lg:py-20 bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {language === 'ar' ? 'كيف نعمل' : 'How It Works'}
          </h2>
          <p className="text-lg text-muted-foreground">
            {language === 'ar'
              ? 'عملية بسيطة ومثبتة لتحويل بياناتك إلى رؤى قابلة للتنفيذ'
              : 'A simple, proven process to transform your data into actionable insights'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary to-transparent"></div>
              )}
              
              {/* Card */}
              <div className="relative bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
                {/* Number Badge */}
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-lg shadow-glow">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 rounded-lg bg-gradient-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-8 h-8 text-primary" strokeWidth={2} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
