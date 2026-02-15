import { useLanguage } from "@/contexts/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const { language } = useLanguage();

  const faqs = [
    {
      question: language === 'ar' 
        ? 'ما هو وسيط الذكاء الاصطناعي وكيف يساعد الشركات؟'
        : 'What is an AI broker and how does it help businesses?',
      answer: language === 'ar'
        ? 'وسيط الذكاء الاصطناعي هو شريك واحد يربط الشركات بحلول ذكاء اصطناعي موثوقة وفرق تنفيذ متخصصة. بدلاً من إدارة عدة موردين، تتعامل الشركات مع مزود منظم يتولى اختيار الحلول وتطوير الذكاء الاصطناعي المخصص والإشراف على التسليم. هذا يبسّط تطبيق الذكاء الاصطناعي في الأعمال ويقلل المخاطر ويسرّع الأتمتة عبر الأقسام.'
        : 'An AI broker is a single partner that connects businesses with vetted AI solutions and expert implementation teams. Instead of managing multiple vendors, companies work with one structured provider that handles solution selection, custom AI development, and delivery oversight. This simplifies business AI implementation, reduces risk, and accelerates AI automation across departments.'
    },
    {
      question: language === 'ar'
        ? 'لماذا تستخدم وسيط ذكاء اصطناعي بدلاً من توظيف مطور مباشرة؟'
        : 'Why use an AI broker instead of hiring an AI developer directly?',
      answer: language === 'ar'
        ? 'استخدام وسيط ذكاء اصطناعي يقلل مخاطر التوظيف ويحسّن موثوقية التسليم. التوظيف المباشر يتطلب فحصاً تقنياً وإدارة مشاريع والتزاماً طويل الأمد بالموارد. وسيط مثل Exavo يوفر متخصصين مفحوصين مسبقاً وحوكمة منظمة وتسليماً قائماً على المراحل. هذا النهج يضمن نتائج أفضل لمشاريع الأتمتة وتطوير الذكاء الاصطناعي المخصص.'
        : 'Using an AI broker reduces hiring risk and improves delivery reliability. Direct hiring requires technical vetting, project management, and long-term resource commitment. An AI broker like Exavo provides pre-vetted specialists, structured governance, and milestone-based delivery. This approach ensures better outcomes for AI automation and custom AI development projects.'
    },
    {
      question: language === 'ar'
        ? 'كيف يضمن Exavo نجاح تسليم مشاريع الذكاء الاصطناعي؟'
        : 'How does Exavo ensure successful AI project delivery?',
      answer: language === 'ar'
        ? 'يضمن Exavo نجاح التنفيذ من خلال إطار تسليم منظم قائم على المراحل. كل مشروع يتبع عملية واضحة: تحليل المتطلبات، مطابقة الخبراء، التطوير التكراري، التحقق من الجودة، ودعم النشر. الإشراف المستمر ومؤشرات الأداء القابلة للقياس تساعد الشركات على تحقيق حلول ذكاء اصطناعي موثوقة تتوافق مع أهدافها التشغيلية.'
        : 'Exavo ensures successful AI implementation through a structured, milestone-based delivery framework. Every project follows a clear process: requirements analysis, expert matching, iterative development, quality validation, and deployment support. Continuous oversight and measurable KPIs help businesses achieve reliable AI solutions aligned with operational goals.'
    },
    {
      question: language === 'ar'
        ? 'ما أنواع حلول الذكاء الاصطناعي التي يمكن للشركات تنفيذها؟'
        : 'What types of AI solutions can businesses implement?',
      answer: language === 'ar'
        ? 'يمكن للشركات تنفيذ حلول ذكاء اصطناعي في مجالات الأتمتة والتحليلات وتفاعل العملاء. تشمل الأمثلة الشائعة أتمتة سير العمل المتكرر، روبوتات الدردشة المدعومة بالذكاء الاصطناعي، أنظمة التحليلات التنبؤية، وتطوير الذكاء الاصطناعي المخصص للاحتياجات الصناعية. تتكامل هذه الحلول مع الأدوات الحالية وتدعم تطبيق الذكاء الاصطناعي القابل للتوسع.'
        : 'Businesses can implement AI solutions across automation, analytics, and customer engagement. Common examples include AI automation for repetitive workflows, AI-powered chatbots, predictive analytics systems, and custom AI development for industry-specific needs. These solutions integrate with existing tools and support scalable business AI implementation.'
    }
  ];

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--primary)/0.08),transparent_50%)]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6">
            {language === 'ar' 
              ? 'وسيط الذكاء الاصطناعي وحلول الذكاء الاصطناعي – الأسئلة الشائعة'
              : 'AI Broker & AI Solutions – Frequently Asked Questions'}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            {language === 'ar'
              ? 'لديك أسئلة؟ لدينا إجابات.'
              : 'Have questions? We have answers.'}
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 hover:shadow-card transition-all duration-300"
              >
                <AccordionTrigger className="text-left text-base sm:text-lg font-semibold hover:text-primary py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5 pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
