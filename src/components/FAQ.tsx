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
        ? 'وسيط الذكاء الاصطناعي هو مزود خدمة يربط الشركات بحلول الذكاء الاصطناعي الجاهزة والخبراء المتخصصين، ويدير عملية التنفيذ بالكامل. بدلاً من أن تبحث الشركات عن مطورين وتديرهم بنفسها، يتولى الوسيط الفحص والتوظيف وإدارة المشروع. هذا يسرّع تطبيق الذكاء الاصطناعي في الأعمال ويقلل التكلفة والتعقيد التقني.'
        : 'An AI broker is a managed service provider that connects businesses with ready-to-deploy AI solutions and vetted specialists, handling the entire implementation process. Instead of navigating the complex AI vendor landscape alone, businesses work with a single partner who manages custom AI development, expert selection, and project delivery. This approach reduces costs and accelerates business AI implementation for companies of all sizes.'
    },
    {
      question: language === 'ar'
        ? 'لماذا تستخدم وسيط ذكاء اصطناعي بدلاً من توظيف مطور مباشرة؟'
        : 'Why use an AI broker instead of hiring an AI developer directly?',
      answer: language === 'ar'
        ? 'توظيف مطور ذكاء اصطناعي مباشرة يتطلب وقتاً طويلاً للفحص والتفاوض وإدارة المشروع، مع مخاطر عالية في الجودة. وسيط الذكاء الاصطناعي يوفر خبراء مفحوصين مسبقاً وإدارة مشاريع شاملة وضمانات جودة، مما يقلل المخاطر ويسرّع الحصول على النتائج.'
        : 'Hiring an AI developer directly requires significant time for vetting candidates, negotiating contracts, and managing technical delivery — with no guaranteed outcome. An AI broker provides pre-vetted experts, structured project management, and quality assurance built into every engagement. For small and mid-sized businesses seeking AI automation without an in-house technical team, this managed approach delivers faster results at lower risk.'
    },
    {
      question: language === 'ar'
        ? 'كيف يتم ضمان نجاح مشاريع الذكاء الاصطناعي؟'
        : 'How does Exavo ensure successful AI project delivery?',
      answer: language === 'ar'
        ? 'يتم ضمان نجاح المشاريع من خلال عملية فحص صارمة لاختيار خبراء ذوي سجلات مثبتة، مع اتباع أفضل ممارسات إدارة المشاريع. يشمل ذلك مراجعات دورية وتحديثات شفافة ومعايير جودة صارمة لضمان التسليم في الوقت المحدد وضمن الميزانية.'
        : 'Successful AI project delivery is ensured through a structured process that includes rigorous expert vetting, milestone-based project management, and continuous quality checks. Every AI solutions engagement follows a clear workflow: requirements gathering, expert matching, iterative development with regular client check-ins, and final delivery validation. This methodology keeps custom AI development projects on time and within budget.'
    },
    {
      question: language === 'ar'
        ? 'ما أنواع حلول الذكاء الاصطناعي التي يمكن تنفيذها للشركات؟'
        : 'What types of AI solutions can be implemented for businesses?',
      answer: language === 'ar'
        ? 'تشمل حلول الذكاء الاصطناعي للشركات: أتمتة سير العمل، روبوتات الدردشة الذكية، التحليلات التنبؤية، معالجة اللغات الطبيعية، أنظمة CRM المخصصة، وتكامل الذكاء الاصطناعي مع الأنظمة الحالية. يمكن تطبيق هذه الحلول في مختلف القطاعات لتحسين الكفاءة وخفض التكاليف.'
        : 'Business AI implementation covers a wide range of use cases, including workflow automation, intelligent chatbots, predictive analytics, natural language processing, custom CRM systems, and AI integration with existing tools. Whether a company needs AI automation for repetitive tasks or custom AI development for a unique business challenge, these solutions can be tailored to fit specific industry requirements and operational goals.'
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
