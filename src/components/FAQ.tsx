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
        ? 'ما الذي يفعله وسيط الذكاء الاصطناعي؟'
        : 'What does an AI broker do?',
      answer: language === 'ar'
        ? 'وسيط الذكاء الاصطناعي يربط عملك بأفضل خبراء ومطورين الذكاء الاصطناعي، ويدير المشروع بأكمله من الاستراتيجية إلى التنفيذ والتسليم. نحن نتعامل مع الفحص والتوظيف وإدارة المشروع حتى تتمكن من التركيز على عملك الأساسي.'
        : 'An AI broker connects your business with top AI experts and developers, managing the entire project from strategy to execution and delivery. We handle the vetting, hiring, and project management so you can focus on your core business.'
    },
    {
      question: language === 'ar'
        ? 'لماذا لا أوظف مطور ذكاء اصطناعي مباشرة؟'
        : 'Why not hire an AI developer directly?',
      answer: language === 'ar'
        ? 'التوظيف المباشر يستغرق وقتاً طويلاً، مكلف، ومحفوف بالمخاطر. أنت بحاجة إلى فحص المرشحين، التفاوض على الشروط، وإدارة المشروع. نحن نقدم خبراء مفحوصين مسبقاً، إدارة مشاريع شاملة، وضمانات الجودة - مما يقلل من المخاطر ويسرّع من النتائج.'
        : 'Direct hiring is time-consuming, expensive, and risky. You need to vet candidates, negotiate terms, and manage the project yourself. We provide pre-vetted experts, end-to-end project management, and quality guarantees—reducing risk and accelerating results.'
    },
    {
      question: language === 'ar'
        ? 'كيف تضمنون نجاح المشروع؟'
        : 'How do you ensure project success?',
      answer: language === 'ar'
        ? 'نحن نستخدم عملية فحص صارمة لاختيار خبراء ذوي سجل حافل فقط. يتبع فريقنا أفضل الممارسات في إدارة المشاريع، مع مراجعات منتظمة، تحديثات شفافة، ومعايير جودة صارمة لضمان تسليم مشروعك في الوقت المحدد وضمن الميزانية.'
        : 'We use a rigorous vetting process to select only experts with proven track records. Our team follows best practices in project management, with regular check-ins, transparent updates, and strict quality standards to ensure your project is delivered on time and within budget.'
    },
    {
      question: language === 'ar'
        ? 'ما نوع مشاريع الذكاء الاصطناعي التي تتعاملون معها؟'
        : 'What kind of AI projects do you handle?',
      answer: language === 'ar'
        ? 'نتعامل مع مجموعة واسعة من مشاريع الذكاء الاصطناعي: نماذج الذكاء الاصطناعي المخصصة، معالجة اللغات الطبيعية، رؤية الكمبيوتر، التحليلات التنبؤية، روبوتات الدردشة، أتمتة العمليات، وتكامل الذكاء الاصطناعي في الأنظمة الحالية. إذا كان يتعلق بالذكاء الاصطناعي، يمكننا مساعدتك.'
        : 'We handle a wide range of AI projects: custom AI models, natural language processing, computer vision, predictive analytics, chatbots, process automation, and AI integration into existing systems. If it involves AI, we can help you succeed.'
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
              ? 'الأسئلة الشائعة'
              : 'Frequently Asked Questions'}
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
