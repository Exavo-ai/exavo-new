import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, TrendingUp, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import BrainTypingIndicator from "@/components/brain/BrainTypingIndicator";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const extractAssistantText = (payload: unknown): string => {
  if (typeof payload === "string") return payload;

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidate = obj.output ?? obj.text ?? obj.response ?? obj.message ?? obj.result;
    if (typeof candidate === "string") return candidate;
    return JSON.stringify(obj);
  }

  return "";
};

const PlaygroundRevenueArchitect = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      const { data, error } = await supabase.functions.invoke("revenue-architect-proxy", {
        body: { input: userMessage },
      });

      if (error) {
        throw new Error(error.message || "Backend function invocation failed");
      }

      const aiResponse = extractAssistantText(data);

      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error("Empty response");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);
    } catch (err: any) {
      console.error("Revenue Architect error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process your request right now. Please try again.",
        },
      ]);
      toast.error("Failed to get response. Please try again.");
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
        title="Revenue Architect – AI Growth Strategy Chat | Exavo AI"
        description="Chat with an AI-powered growth strategist to get data-driven strategies for scaling your business."
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
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Revenue Architect</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered growth strategies &amp; CRO insights
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 min-h-0 border border-border/50 rounded-2xl bg-muted/20 flex flex-col overflow-hidden">
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ minHeight: "400px", maxHeight: "calc(100vh - 340px)" }}
            >
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Ask about growth strategies, revenue optimization, CRO insights, or any business scaling question.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {[
                      "How can I reduce churn for my SaaS?",
                      "Best strategies to scale e-commerce revenue",
                      "How to improve my landing page conversions",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-background hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="relative shrink-0 mt-0.5">
                      <motion.div
                        className="absolute -inset-1 rounded-full bg-primary/20 blur-sm"
                        animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <Avatar className="h-9 w-9 relative ring-2 ring-primary/30">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          <TrendingUp className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  <div className={`flex flex-col ${msg.role === "assistant" ? "items-start" : "items-end"} max-w-[75%]`}>
                    {msg.role === "assistant" && (
                      <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
                        Revenue Architect
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
                        <TrendingUp className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
                      Revenue Architect
                    </span>
                    <div className="rounded-2xl bg-muted/70 border border-border/40 px-4 py-3">
                      <BrainTypingIndicator />
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
                  placeholder="Ask about growth strategies, revenue optimization..."
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

export default PlaygroundRevenueArchitect;
