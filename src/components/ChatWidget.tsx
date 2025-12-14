import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

type ConversationStep = 'greeting' | 'goal' | 'followup' | 'recommendation';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  buttons?: Array<{
    label: string;
    value: string;
  }>;
  cta?: {
    label: string;
    serviceSlug: string;
  };
}

interface ChatWidgetProps {
  onSelectPackage?: (serviceId: string, packageId: string) => void;
}

// Service mapping based on user goals
const SERVICE_MAP: Record<string, { slug: string; name: string; description: string }> = {
  'automate': {
    slug: 'ai-automation-systems',
    name: 'AI Automation Systems',
    description: 'Automate repetitive tasks and workflows to save time and reduce errors.'
  },
  'website': {
    slug: 'ai-powered-website-development',
    name: 'AI-Powered Website Development',
    description: 'Get a modern, fast website built with AI-enhanced development for better results.'
  },
  'crm': {
    slug: 'custom-crm-development',
    name: 'Custom CRM Development',
    description: 'A tailored system to manage your clients, leads, and internal operations efficiently.'
  },
  'unsure': {
    slug: 'book-demo',
    name: 'Book a Demo',
    description: "Let's discuss your needs and find the right solution together."
  }
};

const ChatWidget = ({ onSelectPackage }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<ConversationStep>('greeting');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startConversation();
    }
  }, [isOpen]);

  const startConversation = () => {
    const greeting: ChatMessage = {
      role: 'assistant',
      content: language === 'ar' 
        ? 'مرحبًا! 👋 أنا هنا لمساعدتك في العثور على الحل المناسب. ما الذي تتطلع لتحقيقه؟'
        : "Hi there! 👋 I'm here to help you find the right solution. What are you looking to achieve?",
      buttons: [
        { label: language === 'ar' ? 'أتمتة عملية تجارية' : 'Automate a business process', value: 'automate' },
        { label: language === 'ar' ? 'بناء أو تحسين موقع ويب' : 'Build or improve a website', value: 'website' },
        { label: language === 'ar' ? 'بناء نظام CRM مخصص' : 'Build a custom CRM or system', value: 'crm' },
        { label: language === 'ar' ? 'غير متأكد / أريد نصيحة' : 'Not sure / want advice', value: 'unsure' }
      ]
    };
    setMessages([greeting]);
    setStep('goal');
  };

  const handleButtonClick = (value: string, label: string) => {
    // Add user's selection as a message
    const userMessage: ChatMessage = { role: 'user', content: label };
    setMessages(prev => [...prev, userMessage]);

    if (step === 'goal') {
      setSelectedGoal(value);
      
      if (value === 'unsure') {
        // Skip follow-up for unsure, go straight to demo recommendation
        showRecommendation('unsure');
      } else {
        // Show follow-up question
        showFollowUp(value);
      }
    } else if (step === 'followup') {
      // After follow-up, show recommendation
      showRecommendation(selectedGoal || 'unsure');
    }
  };

  const showFollowUp = (goal: string) => {
    const followUpQuestions: Record<string, ChatMessage> = {
      'automate': {
        role: 'assistant',
        content: language === 'ar'
          ? 'رائع! ما هو الجدول الزمني المثالي لتنفيذ هذا؟'
          : 'Great choice! What\'s your ideal timeline for implementing this?',
        buttons: [
          { label: language === 'ar' ? 'في أقرب وقت ممكن' : 'As soon as possible', value: 'asap' },
          { label: language === 'ar' ? 'خلال شهر' : 'Within a month', value: 'month' },
          { label: language === 'ar' ? 'أنا فقط أستكشف' : 'Just exploring', value: 'exploring' }
        ]
      },
      'website': {
        role: 'assistant',
        content: language === 'ar'
          ? 'ممتاز! هل لديك موقع حالي أم تبدأ من الصفر؟'
          : 'Excellent! Do you have an existing website or are you starting fresh?',
        buttons: [
          { label: language === 'ar' ? 'موقع موجود يحتاج تحسين' : 'Existing site needs improvement', value: 'existing' },
          { label: language === 'ar' ? 'البدء من جديد' : 'Starting fresh', value: 'new' },
          { label: language === 'ar' ? 'غير متأكد بعد' : 'Not sure yet', value: 'unsure' }
        ]
      },
      'crm': {
        role: 'assistant',
        content: language === 'ar'
          ? 'فهمت! ما حجم فريقك الذي سيستخدم هذا النظام؟'
          : 'Got it! How big is the team that will use this system?',
        buttons: [
          { label: language === 'ar' ? 'فقط أنا' : 'Just me', value: 'solo' },
          { label: language === 'ar' ? '2-10 أشخاص' : '2-10 people', value: 'small' },
          { label: language === 'ar' ? 'أكثر من 10' : 'More than 10', value: 'large' }
        ]
      }
    };

    const followUp = followUpQuestions[goal];
    if (followUp) {
      setMessages(prev => [...prev, followUp]);
      setStep('followup');
    } else {
      showRecommendation(goal);
    }
  };

  const showRecommendation = (goal: string) => {
    const service = SERVICE_MAP[goal] || SERVICE_MAP['unsure'];
    
    const recommendation: ChatMessage = {
      role: 'assistant',
      content: language === 'ar'
        ? `بناءً على ما شاركته، أوصي بـ **${service.name}**.\n\n${service.description}`
        : `Based on what you've shared, I recommend **${service.name}**.\n\n${service.description}`,
      cta: {
        label: goal === 'unsure' 
          ? (language === 'ar' ? 'احجز عرضًا تجريبيًا' : 'Book a Demo')
          : (language === 'ar' ? 'اختر باقة' : 'Select Package'),
        serviceSlug: service.slug
      }
    };

    setMessages(prev => [...prev, recommendation]);
    setStep('recommendation');
  };

  const handleCtaClick = (serviceSlug: string) => {
    if (serviceSlug === 'book-demo') {
      navigate('/contact');
    } else {
      navigate(`/services?highlight=${serviceSlug}`);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setMessages([]);
    setStep('greeting');
    setSelectedGoal(null);
    startConversation();
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    
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
        
        {/* Render option buttons */}
        {message.buttons && index === messages.length - 1 && (
          <div className="mt-3 flex flex-col gap-2">
            {message.buttons.map((btn, btnIndex) => (
              <Button
                key={btnIndex}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                onClick={() => handleButtonClick(btn.value, btn.label)}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}

        {/* Render CTA button */}
        {message.cta && (
          <div className="mt-3">
            <Button
              variant="hero"
              size="sm"
              className="gap-2"
              onClick={() => handleCtaClick(message.cta!.serviceSlug)}
            >
              <Sparkles className="h-4 w-4" />
              {message.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
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
        <div className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] bg-background border border-border rounded-xl shadow-elegant z-50 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-hero p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary-foreground">
                  {language === 'ar' ? 'مساعد Exavo' : 'Exavo Assistant'}
                </h3>
                <p className="text-xs text-primary-foreground/80">
                  {language === 'ar' ? 'دعنا نجد الحل المناسب لك' : 'Let\'s find the right solution for you'}
                </p>
              </div>
            </div>
            {step === 'recommendation' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 text-xs"
                onClick={handleReset}
              >
                {language === 'ar' ? 'ابدأ من جديد' : 'Start over'}
              </Button>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Footer hint */}
          <div className="p-3 border-t border-border bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">
              {language === 'ar' 
                ? 'اختر من الخيارات أعلاه للمتابعة'
                : 'Choose from the options above to continue'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
