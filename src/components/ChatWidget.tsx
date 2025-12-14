import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Sparkles, ArrowRight, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  buttons?: Array<{
    label: string;
    value: string;
    action?: 'navigate' | 'intent';
    url?: string;
  }>;
}

interface ChatWidgetProps {
  onSelectPackage?: (serviceId: string, packageId: string) => void;
}

// Intent definitions with keywords and responses based on Project Knowledge
const INTENTS: Record<string, {
  keywords: string[];
  response: string;
  responseAr: string;
  buttons: Array<{ label: string; labelAr: string; action: 'navigate' | 'intent'; url?: string; value?: string }>;
}> = {
  about: {
    keywords: ['about', 'what is exavo', 'who are you', 'exavo', 'company', 'tell me', 'what do you do', 'what does exavo', 'mission', 'help'],
    response: "Exavo AI is a one-stop AI marketplace that helps small and mid-sized businesses adopt AI easily and affordably. We provide ready-to-use AI systems, expert-led projects, and managed delivery — no technical skills required.",
    responseAr: "Exavo AI هو سوق شامل للذكاء الاصطناعي يساعد الشركات الصغيرة والمتوسطة على تبني الذكاء الاصطناعي بسهولة وبأسعار معقولة. نقدم أنظمة ذكاء اصطناعي جاهزة للاستخدام ومشاريع يقودها خبراء وتسليم مُدار — دون الحاجة إلى مهارات تقنية.",
    buttons: [
      { label: 'View Services', labelAr: 'عرض الخدمات', action: 'navigate', url: '/services' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  },
  target: {
    keywords: ['who is it for', 'target', 'audience', 'customers', 'clients', 'for whom', 'who can use', 'businesses', 'sme', 'small business', 'startup', 'founder', 'agency'],
    response: "Exavo is designed for small businesses, SMEs, non-technical founders, agencies, and startups. If you want AI results without hiring an in-house AI team, Exavo is for you.",
    responseAr: "تم تصميم Exavo للشركات الصغيرة والمتوسطة والمؤسسين غير التقنيين والوكالات والشركات الناشئة. إذا كنت تريد نتائج الذكاء الاصطناعي دون توظيف فريق داخلي، فإن Exavo مناسب لك.",
    buttons: [
      { label: 'View Services', labelAr: 'عرض الخدمات', action: 'navigate', url: '/services' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  },
  services: {
    keywords: ['services', 'what do you offer', 'solutions', 'products', 'offerings', 'automation', 'website', 'crm', 'workflow', 'system', 'build', 'create', 'develop'],
    response: "We offer: AI Automation Systems (business workflows), AI-Powered Website Development, Custom CRM & Internal Systems, Pre-built AI Projects, and Custom AI Workflows. Each comes with packages for fast deployment.",
    responseAr: "نقدم: أنظمة أتمتة الذكاء الاصطناعي، تطوير مواقع ويب بالذكاء الاصطناعي، أنظمة CRM مخصصة، مشاريع ذكاء اصطناعي جاهزة، وسير عمل ذكاء اصطناعي مخصص. كل خدمة تأتي مع باقات للنشر السريع.",
    buttons: [
      { label: 'View Services', labelAr: 'عرض الخدمات', action: 'navigate', url: '/services' },
      { label: 'See Packages', labelAr: 'عرض الباقات', action: 'navigate', url: '/services' }
    ]
  },
  howItWorks: {
    keywords: ['how it works', 'how does it work', 'process', 'steps', 'start', 'get started', 'begin', 'order', 'request', 'booking', 'book'],
    response: "It's simple: 1) Browse our services and packages. 2) Select what fits your needs. 3) Submit a booking request. 4) We review and contact you. 5) Your AI solution is delivered in days.",
    responseAr: "الأمر بسيط: 1) تصفح خدماتنا وباقاتنا. 2) اختر ما يناسب احتياجاتك. 3) أرسل طلب حجز. 4) نراجع ونتواصل معك. 5) يتم تسليم حل الذكاء الاصطناعي في أيام.",
    buttons: [
      { label: 'Browse Services', labelAr: 'تصفح الخدمات', action: 'navigate', url: '/services' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  },
  pricing: {
    keywords: ['price', 'pricing', 'cost', 'how much', 'budget', 'money', 'payment', 'pay', 'expensive', 'cheap', 'affordable', 'fee', 'charge', 'rate'],
    response: "Pricing is package-based and clearly shown per service. Each package has a fixed price depending on scope. Custom pricing is available for complex or enterprise projects. Check our packages for details.",
    responseAr: "التسعير يعتمد على الباقات ويظهر بوضوح لكل خدمة. كل باقة لها سعر ثابت حسب النطاق. تسعير مخصص متاح للمشاريع المعقدة أو المؤسسية. تحقق من باقاتنا للتفاصيل.",
    buttons: [
      { label: 'View Packages', labelAr: 'عرض الباقات', action: 'navigate', url: '/services' },
      { label: 'Request Quote', labelAr: 'طلب عرض سعر', action: 'navigate', url: '/contact' }
    ]
  },
  timeline: {
    keywords: ['time', 'timeline', 'delivery', 'how long', 'duration', 'when', 'days', 'weeks', 'fast', 'quick', 'speed', 'turnaround'],
    response: "Typical delivery ranges from 3 to 14 days depending on the service and package. Simple automations can be faster, while complex custom systems take longer. We'll confirm the timeline during booking.",
    responseAr: "يتراوح وقت التسليم النموذجي من 3 إلى 14 يومًا حسب الخدمة والباقة. يمكن أن تكون الأتمتة البسيطة أسرع، بينما تستغرق الأنظمة المخصصة المعقدة وقتًا أطول. سنؤكد الجدول الزمني أثناء الحجز.",
    buttons: [
      { label: 'View Services', labelAr: 'عرض الخدمات', action: 'navigate', url: '/services' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  },
  vsFreelancers: {
    keywords: ['freelancer', 'fiverr', 'upwork', 'difference', 'compare', 'vs', 'versus', 'better', 'why exavo', 'why you', 'advantage'],
    response: "Unlike freelancer marketplaces, Exavo delivers managed AI solutions end-to-end. We're faster, more reliable, and more structured. You get curated experts and guaranteed delivery — not trial-and-error with random freelancers.",
    responseAr: "على عكس أسواق المستقلين، يقدم Exavo حلول ذكاء اصطناعي مُدارة من البداية إلى النهاية. نحن أسرع وأكثر موثوقية وأكثر تنظيمًا. تحصل على خبراء مختارين وتسليم مضمون — وليس تجربة وخطأ مع مستقلين عشوائيين.",
    buttons: [
      { label: 'View Services', labelAr: 'عرض الخدمات', action: 'navigate', url: '/services' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  },
  contact: {
    keywords: ['contact', 'support', 'email', 'reach', 'talk', 'speak', 'call', 'demo', 'meeting', 'schedule', 'consultation', 'help me'],
    response: "You can reach us at info@exavoai.com or book a free demo call. We're happy to discuss your project and recommend the best approach.",
    responseAr: "يمكنك التواصل معنا على info@exavoai.com أو حجز مكالمة عرض مجانية. يسعدنا مناقشة مشروعك والتوصية بأفضل نهج.",
    buttons: [
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' },
      { label: 'View Services', labelAr: 'عرض الخدمات', action: 'navigate', url: '/services' }
    ]
  },
  automate: {
    keywords: ['automate', 'automation', 'automate business', 'workflow automation', 'repetitive', 'tasks'],
    response: "Our AI Automation Systems help you automate repetitive business processes — from customer emails to data entry. Save time and reduce errors with workflows that run 24/7.",
    responseAr: "تساعدك أنظمة أتمتة الذكاء الاصطناعي لدينا على أتمتة العمليات التجارية المتكررة — من رسائل البريد الإلكتروني للعملاء إلى إدخال البيانات. وفر الوقت وقلل الأخطاء مع سير العمل الذي يعمل على مدار الساعة.",
    buttons: [
      { label: 'Select Package', labelAr: 'اختر باقة', action: 'navigate', url: '/services?highlight=ai-automation-systems' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  },
  website: {
    keywords: ['website', 'web', 'site', 'landing page', 'online presence', 'web development'],
    response: "Our AI-Powered Website Development service builds modern, fast websites with AI-enhanced development. Perfect for businesses that need a professional online presence quickly.",
    responseAr: "خدمة تطوير المواقع بالذكاء الاصطناعي تبني مواقع حديثة وسريعة مع تطوير معزز بالذكاء الاصطناعي. مثالية للشركات التي تحتاج إلى حضور احترافي عبر الإنترنت بسرعة.",
    buttons: [
      { label: 'Select Package', labelAr: 'اختر باقة', action: 'navigate', url: '/services?highlight=ai-powered-website-development' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  },
  crm: {
    keywords: ['crm', 'customer relationship', 'internal system', 'manage clients', 'leads', 'operations'],
    response: "Our Custom CRM Development creates tailored systems to manage your clients, leads, and internal operations efficiently. Built to fit your specific workflow, not a generic template.",
    responseAr: "تطوير CRM المخصص ينشئ أنظمة مصممة لإدارة عملائك والعملاء المحتملين والعمليات الداخلية بكفاءة. مبني ليناسب سير عملك المحدد، وليس قالبًا عامًا.",
    buttons: [
      { label: 'Select Package', labelAr: 'اختر باقة', action: 'navigate', url: '/services?highlight=custom-crm-development' },
      { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate', url: '/contact' }
    ]
  }
};

// Fallback response when no intent matches
const FALLBACK = {
  response: "I can help with Exavo, our services, pricing, and timelines. What are you most interested in?",
  responseAr: "يمكنني المساعدة في Exavo وخدماتنا والأسعار والجداول الزمنية. ما الذي يهمك أكثر؟",
  buttons: [
    { label: 'About Exavo', labelAr: 'عن Exavo', action: 'intent' as const, value: 'about' },
    { label: 'Services', labelAr: 'الخدمات', action: 'intent' as const, value: 'services' },
    { label: 'Pricing', labelAr: 'الأسعار', action: 'intent' as const, value: 'pricing' },
    { label: 'Timelines', labelAr: 'الجداول الزمنية', action: 'intent' as const, value: 'timeline' },
    { label: 'Book a Demo', labelAr: 'احجز عرضًا', action: 'navigate' as const, url: '/contact' }
  ]
};

// Quick start buttons
const QUICK_START_BUTTONS = [
  { label: 'Automate a process', labelAr: 'أتمتة عملية', action: 'intent' as const, value: 'automate' },
  { label: 'Build a website', labelAr: 'بناء موقع', action: 'intent' as const, value: 'website' },
  { label: 'Build a CRM/system', labelAr: 'بناء نظام CRM', action: 'intent' as const, value: 'crm' },
  { label: 'Not sure / advice', labelAr: 'غير متأكد / نصيحة', action: 'navigate' as const, url: '/contact' }
];

const ChatWidget = ({ onSelectPackage }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startConversation();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const startConversation = () => {
    const greeting: ChatMessage = {
      role: 'assistant',
      content: language === 'ar' 
        ? 'مرحبًا! 👋 أنا مساعد Exavo. اسألني عن خدماتنا أو الأسعار أو كيف نعمل. أو اختر موضوعًا للبدء:'
        : "Hi there! 👋 I'm the Exavo Assistant. Ask me about our services, pricing, or how we work. Or pick a topic to get started:",
      buttons: QUICK_START_BUTTONS.map(btn => ({
        label: language === 'ar' ? btn.labelAr : btn.label,
        value: btn.value || '',
        action: btn.action,
        url: btn.url
      }))
    };
    setMessages([greeting]);
  };

  // Intent detection using keyword matching
  const detectIntent = (text: string): string | null => {
    const normalizedText = text.toLowerCase().trim();
    
    // Check each intent's keywords
    for (const [intentKey, intent] of Object.entries(INTENTS)) {
      for (const keyword of intent.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          return intentKey;
        }
      }
    }
    
    return null;
  };

  const getResponseForIntent = (intentKey: string): ChatMessage => {
    const intent = INTENTS[intentKey];
    return {
      role: 'assistant',
      content: language === 'ar' ? intent.responseAr : intent.response,
      buttons: intent.buttons.map(btn => ({
        label: language === 'ar' ? btn.labelAr : btn.label,
        value: btn.value || '',
        action: btn.action,
        url: btn.url
      }))
    };
  };

  const getFallbackResponse = (): ChatMessage => {
    return {
      role: 'assistant',
      content: language === 'ar' ? FALLBACK.responseAr : FALLBACK.response,
      buttons: FALLBACK.buttons.map(btn => ({
        label: language === 'ar' ? btn.labelAr : btn.label,
        value: btn.value || '',
        action: btn.action,
        url: btn.url
      }))
    };
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate brief typing delay for natural feel
    setTimeout(() => {
      const intent = detectIntent(text);
      const response = intent ? getResponseForIntent(intent) : getFallbackResponse();
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 500);
  };

  const handleButtonClick = (button: ChatMessage['buttons'][0]) => {
    if (button.action === 'navigate' && button.url) {
      navigate(button.url);
      setIsOpen(false);
    } else if (button.action === 'intent' && button.value) {
      // Add user selection as message
      const userMessage: ChatMessage = { role: 'user', content: button.label };
      setMessages(prev => [...prev, userMessage]);
      
      setIsTyping(true);
      setTimeout(() => {
        const response = getResponseForIntent(button.value!);
        setMessages(prev => [...prev, response]);
        setIsTyping(false);
      }, 400);
    }
  };

  const handleReset = () => {
    setMessages([]);
    startConversation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isLastMessage = index === messages.length - 1;
    
    return (
      <div key={index} className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block p-3 rounded-lg max-w-[85%] ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        
        {/* Render buttons for last assistant message only */}
        {!isUser && message.buttons && isLastMessage && !isTyping && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.buttons.map((btn, btnIndex) => (
              <Button
                key={btnIndex}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1.5 px-3"
                onClick={() => handleButtonClick(btn)}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-glow z-50"
        variant="hero"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[520px] bg-background border border-border rounded-xl shadow-elegant z-50 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-hero p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary-foreground">
                  {language === 'ar' ? 'مساعد Exavo' : 'Exavo Assistant'}
                </h3>
                <p className="text-xs text-primary-foreground/80">
                  {language === 'ar' ? 'اسألني أي شيء عن خدماتنا' : 'Ask me anything about our services'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 text-xs"
              onClick={handleReset}
            >
              {language === 'ar' ? 'جديد' : 'New'}
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.map((message, index) => renderMessage(message, index))}
            {isTyping && (
              <div className="text-left mb-4">
                <div className="inline-block p-3 rounded-lg bg-muted">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 border-t border-border bg-background shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={language === 'ar' ? 'اكتب سؤالك...' : 'Type your question...'}
                className="flex-1 text-sm"
                disabled={isTyping}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
