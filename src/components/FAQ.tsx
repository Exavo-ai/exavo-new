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
        ? 'ما هو وسيط الذكاء الاصطناعي؟'
        : 'What is an AI broker?',
      answer: language === 'ar'
        ? <>
            <strong>وسيط الذكاء الاصطناعي هو شريك استراتيجي يدير تنفيذ الذكاء الاصطناعي من البداية إلى النهاية.</strong>{' '}
            بدلاً من التعامل مع عدة موردين أو التوظيف الداخلي، تعتمد الشركات على مزود واحد لاختيار حلول الذكاء الاصطناعي ومطابقة الخبراء المفحوصين وإدارة التسليم المنظم. هذا يقلل المخاطر ويسرّع تطبيق الذكاء الاصطناعي في الأعمال.
          </>
        : <>
            <strong>An AI broker is a strategic partner that manages AI implementation end-to-end.</strong>{' '}
            Instead of working with multiple vendors or hiring internally, businesses rely on a single provider to select AI solutions, match vetted experts, and manage structured delivery. This reduces risk and accelerates business AI implementation.
          </>
    },
    {
      question: language === 'ar'
        ? 'كيف يختلف Exavo عن مستشاري الذكاء الاصطناعي؟'
        : 'How does Exavo differ from AI consultants?',
      answer: language === 'ar'
        ? <>
            <strong>Exavo يعمل كوسيط ذكاء اصطناعي وليس مجرد مستشار.</strong>{' '}
            بينما يقدم المستشارون استراتيجية فقط، يدير Exavo مطابقة الخبراء وتطوير الذكاء الاصطناعي المخصص والتكامل ومراحل التسليم. هذا يضمن انتقال أتمتة الذكاء الاصطناعي من التخطيط إلى التنفيذ القابل للقياس.
          </>
        : <>
            <strong>Exavo operates as an AI broker, not just an advisor.</strong>{' '}
            While consultants provide strategy, Exavo manages expert matching, custom AI development, integration, and delivery milestones. This ensures AI automation moves from planning to measurable execution.
          </>
    },
    {
      question: language === 'ar'
        ? 'ما أنواع حلول الذكاء الاصطناعي التي يمكن للشركات تنفيذها؟'
        : 'What types of AI solutions can businesses implement?',
      answer: language === 'ar'
        ? <>
            <strong>يمكن للشركات تنفيذ أتمتة الذكاء الاصطناعي عبر العمليات والتحليلات وتفاعل العملاء.</strong>{' '}
            تشمل الأمثلة الشائعة أتمتة سير العمل وروبوتات الدردشة المدعومة بالذكاء الاصطناعي وأنظمة التحليلات التنبؤية وتطوير الذكاء الاصطناعي المخصص حسب احتياجات الصناعة.
          </>
        : <>
            <strong>Businesses can implement AI automation across operations, analytics, and customer engagement.</strong>{' '}
            Common examples include workflow automation, AI-powered chatbots, predictive analytics systems, and custom AI development tailored to industry needs.
          </>
    },
    {
      question: language === 'ar'
        ? 'كم يستغرق تنفيذ الذكاء الاصطناعي؟'
        : 'How long does AI implementation take?',
      answer: language === 'ar'
        ? <>
            <strong>تعتمد مدة تنفيذ الذكاء الاصطناعي على النطاق والتعقيد.</strong>{' '}
            مشاريع أتمتة الذكاء الاصطناعي الأصغر قد تستغرق أسابيع، بينما مبادرات تطوير الذكاء الاصطناعي المخصص الأكبر قد تستغرق عدة أشهر. إدارة المشاريع المنظمة تضمن تسليماً يمكن التنبؤ به.
          </>
        : <>
            <strong>AI implementation timelines depend on scope and complexity.</strong>{' '}
            Smaller AI automation projects may take weeks, while larger custom AI development initiatives may take several months. Structured project management ensures predictable delivery.
          </>
    },
    {
      question: language === 'ar'
        ? 'كم تكلف تنفيذ الذكاء الاصطناعي؟'
        : 'How much does AI implementation cost?',
      answer: language === 'ar'
        ? <>
            <strong>تختلف تكاليف تنفيذ الذكاء الاصطناعي حسب نطاق التخصيص والتكامل.</strong>{' '}
            تتراوح المشاريع من حلول أتمتة خفيفة إلى أنظمة ذكاء اصطناعي على مستوى المؤسسات. نموذج وسيط الذكاء الاصطناعي المنظم يساعد في مواءمة الميزانية مع عائد استثمار قابل للقياس.
          </>
        : <>
            <strong>AI implementation costs vary based on customization and integration scope.</strong>{' '}
            Projects range from lightweight automation solutions to enterprise-grade AI systems. A structured AI broker model helps align budget with measurable ROI.
          </>
    },
    {
      question: language === 'ar'
        ? 'هل تحتاج الشركات إلى خبرة تقنية داخلية؟'
        : 'Do businesses need in-house technical expertise?',
      answer: language === 'ar'
        ? <>
            <strong>لا يلزم فريق ذكاء اصطناعي داخلي عند العمل مع وسيط ذكاء اصطناعي.</strong>{' '}
            يوفر Exavo متخصصين مفحوصين وحوكمة منظمة وتسليماً شاملاً، مما يسمح للشركات بتبني حلول الذكاء الاصطناعي بدون تعقيدات التوظيف التقني.
          </>
        : <>
            <strong>No in-house AI team is required when working with an AI broker.</strong>{' '}
            Exavo provides vetted AI specialists, structured governance, and full-cycle delivery, allowing businesses to adopt AI solutions without technical hiring complexity.
          </>
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
