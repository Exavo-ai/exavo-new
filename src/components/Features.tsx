import { Card } from "@/components/ui/card";
import { Bot, Workflow, LineChart, Cog, Database, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { language } = useLanguage();
  
  const features = [
    { 
      icon: Database, 
      title: language === 'ar' ? 'نمذجة البيانات' : 'Data Modeling', 
      description: language === 'ar' 
        ? 'قم ببناء نماذج بيانات مخصصة تناسب احتياجات عملك الفريدة بدقة.'
        : 'Build custom data models tailored to your unique business needs with precision.'
    },
    { 
      icon: Bot, 
      title: language === 'ar' ? 'أتمتة الذكاء الاصطناعي' : 'AI Automation', 
      description: language === 'ar'
        ? 'أتمت المهام المتكررة بالذكاء الاصطناعي واوفر ساعات من العمل اليدوي.'
        : 'Automate repetitive tasks with AI and save hours of manual work.'
    },
    { 
      icon: LineChart, 
      title: language === 'ar' ? 'التحليلات التنبؤية' : 'Predictive Analytics', 
      description: language === 'ar'
        ? 'احصل على رؤى تنبؤية لاتخاذ قرارات أفضل والبقاء في المقدمة.'
        : 'Get predictive insights to make better decisions and stay ahead.'
    },
    { 
      icon: Cog, 
      title: language === 'ar' ? 'تكامل الأنظمة' : 'System Integration', 
      description: language === 'ar'
        ? 'قم بدمج حلولنا بسلاسة مع أدواتك وأنظمتك الحالية.'
        : 'Seamlessly integrate our solutions with your existing tools and systems.'
    },
    { 
      icon: Workflow, 
      title: language === 'ar' ? 'سير العمل الذكي' : 'Smart Workflows', 
      description: language === 'ar'
        ? 'قم بإنشاء سير عمل ذكي يتكيف مع احتياجات عملك المتغيرة.'
        : 'Create intelligent workflows that adapt to your changing business needs.'
    },
    { 
      icon: Sparkles, 
      title: language === 'ar' ? 'الرؤى القابلة للتنفيذ' : 'Actionable Insights', 
      description: language === 'ar'
        ? 'حوّل البيانات المعقدة إلى رؤى واضحة وقابلة للتنفيذ.'
        : 'Transform complex data into clear, actionable insights.'
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {language === 'ar' ? 'خدماتنا الأساسية' : 'Our Core Services'}
          </h2>
          <p className="text-lg text-muted-foreground">
            {language === 'ar'
              ? 'حلول شاملة مدعومة بالذكاء الاصطناعي لتحويل أعمالك'
              : 'Comprehensive AI-powered solutions to transform your business'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-glow transition-all duration-300 hover:-translate-y-2 bg-card border-border/50 group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-lg bg-gradient-hero flex items-center justify-center mb-6 group-hover:shadow-glow-lg group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
