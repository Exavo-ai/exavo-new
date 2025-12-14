import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  onSelectPackage?: (serviceId: string, packageId: string) => void;
}

const ChatWidget = ({ onSelectPackage }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(crypto.randomUUID());
  const { toast } = useToast();
  const { language } = useLanguage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send initial greeting when chat opens for the first time
  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      const greeting: Message = {
        role: 'assistant',
        content: language === 'ar' 
          ? 'مرحبًا! 👋 أنا مساعدك في Exavo AI. ما الذي تأمل في تحقيقه مع الذكاء الاصطناعي لعملك؟'
          : "Hi there! 👋 I'm your Exavo AI concierge. What are you hoping to achieve with AI for your business?"
      };
      setMessages([greeting]);
    }
  }, [isOpen, hasGreeted, messages.length, language]);

  const parseRecommendation = (content: string): { cleanContent: string; serviceId?: string; packageId?: string } => {
    const match = content.match(/\[RECOMMEND:([^:]+):([^\]]+)\]/);
    if (match) {
      return {
        cleanContent: content.replace(/\[RECOMMEND:[^\]]+\]/g, '').trim(),
        serviceId: match[1],
        packageId: match[2]
      };
    }
    return { cleanContent: content };
  };

  const handleBookingClick = useCallback((serviceId: string, packageId: string) => {
    if (onSelectPackage) {
      onSelectPackage(serviceId, packageId);
    } else {
      // Navigate to services page with package selection
      window.location.href = `/services?service=${serviceId}&package=${packageId}`;
    }
  }, [onSelectPackage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          sessionId: sessionId.current
        }
      });

      if (error) throw error;

      if (data?.data?.message) {
        const { cleanContent, serviceId, packageId } = parseRecommendation(data.data.message);
        
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: cleanContent 
        };
        setMessages(prev => [...prev, assistantMessage]);

        // If there's a recommendation, store it for the booking button
        if (serviceId && packageId) {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg.role === 'assistant') {
              (lastMsg as any).recommendation = { serviceId, packageId };
            }
            return updated;
          });
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (language === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: Message & { recommendation?: { serviceId: string; packageId: string } }, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={index}
        className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}
      >
        <div
          className={`inline-block p-3 rounded-lg max-w-[85%] ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        {message.recommendation && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="hero"
              className="text-xs"
              onClick={() => handleBookingClick(message.recommendation!.serviceId, message.recommendation!.packageId)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {language === 'ar' ? 'احجز هذه الباقة' : 'Book This Package'}
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
          <div className="bg-gradient-hero p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary-foreground">
                {language === 'ar' ? 'مستشار Exavo AI' : 'Exavo AI Concierge'}
              </h3>
              <p className="text-xs text-primary-foreground/80">
                {language === 'ar' ? 'هنا لمساعدتك في العثور على الحل المناسب' : 'Here to help you find the right solution'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.map((message, index) => renderMessage(message as any, index))}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {language === 'ar' ? 'جاري الكتابة...' : 'Typing...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                disabled={isLoading}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                variant="hero"
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
