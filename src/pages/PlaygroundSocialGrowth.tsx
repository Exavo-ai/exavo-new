import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, BotMessageSquare, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi 👋 I'm your Social Growth AI. Ask me about social media strategies, content ideas, audience growth, or engagement optimization.",
};

const extractAssistantText = (payload: unknown): string => {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidate =
      obj.output ?? obj.text ?? obj.response ?? obj.message ?? obj.result;
    if (typeof candidate === "string") return candidate;
    return JSON.stringify(obj);
  }
  return "";
};

const PlaygroundSocialGrowth = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "social-growth-proxy",
        { body: { input: userMessage } }
      );

      if (error) {
        console.error("Social Growth AI invoke error:", error);
        throw new Error(error.message || "Request failed");
      }

      const aiResponse = extractAssistantText(data);
      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error("Empty response");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);
    } catch (error) {
      console.error("Social Growth AI error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Content generation is temporarily unavailable. Please try again.",
        },
      ]);
      toast.error(
        "Content generation is temporarily unavailable. Please try again."
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Social Growth AI – Social Media Strategy Chat | Exavo AI"
        description="Chat with an AI-powered social media strategist for content ideas, growth tactics, and engagement optimization."
      />
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl flex flex-col min-h-0">
        <Link
          to="/playground"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Playground
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Social Growth AI</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered social media strategies &amp; content ideas
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 min-h-0 border border-border/50 rounded-2xl bg-muted/20 flex flex-col overflow-hidden">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ minHeight: "400px", maxHeight: "calc(100vh - 340px)" }}
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${
                    msg.role === "assistant" ? "justify-start" : "justify-end"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="relative shrink-0 mt-0.5">
                      <motion.div
                        className="absolute -inset-1 rounded-full bg-primary/20 blur-sm"
                        animate={{
                          opacity: [0.4, 0.8, 0.4],
                          scale: [0.95, 1.05, 0.95],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <Avatar className="h-9 w-9 relative ring-2 ring-primary/30">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          <Megaphone className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      msg.role === "assistant" ? "items-start" : "items-end"
                    } max-w-[75%]`}
                  >
                    {msg.role === "assistant" && (
                      <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
                        Social Growth AI
                      </span>
                    )}
                    <div
                      className={`rounded-2xl text-[14px] leading-[1.7] px-4 py-3 ${
                        msg.role === "assistant"
                          ? "bg-muted/70 border border-border/40 text-foreground"
                          : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:text-foreground [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        You
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="relative shrink-0 mt-0.5">
                    <Avatar className="h-9 w-9 relative ring-2 ring-primary/30">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                        <Megaphone className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
                      Social Growth AI
                    </span>
                    <div className="rounded-2xl bg-muted/70 border border-border/40 px-4 py-3 flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-2 w-2 rounded-full bg-primary/50"
                          animate={{
                            opacity: [0.3, 1, 0.3],
                            scale: [0.85, 1.1, 0.85],
                          }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Bar */}
            <div className="border-t border-border/50 p-3 bg-background/80 backdrop-blur-sm">
              <div className="flex gap-2 items-center">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about social media strategies, content ideas, growth tactics..."
                  disabled={isLoading}
                  className="flex-1"
                  maxLength={1000}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default PlaygroundSocialGrowth;
