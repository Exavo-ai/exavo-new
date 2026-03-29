import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ArrowLeft, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BrainChatMessage from "@/components/brain/BrainChatMessage";
import BrainTypingIndicator from "@/components/brain/BrainTypingIndicator";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const PlaygroundBrain = () => {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const { data: raw, error } = await supabase.functions.invoke("brain-proxy", {
        body: { message: trimmed },
      });

      if (error) throw new Error(error.message || "Request failed");

      const extractMessageFromString = (value: string): string | null => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return null;

        if (trimmedValue.startsWith("{") || trimmedValue.startsWith("[")) {
          try {
            return deepExtract(JSON.parse(trimmedValue));
          } catch {
            const messageMatch = trimmedValue.match(/"message"\s*:\s*([\s\S]*?)\s*}\s*$/);
            if (messageMatch?.[1]) {
              return messageMatch[1]
                .trim()
                .replace(/^"|"$/g, "")
                .replace(/\\r/g, "")
                .replace(/\\n/g, "\n")
                .replace(/\\"/g, '"')
                .trim();
            }
          }
        }

        return trimmedValue;
      };

      const deepExtract = (val: unknown): string | null => {
        if (!val) return null;

        if (typeof val === "string") {
          return extractMessageFromString(val);
        }

        if (typeof val === "object") {
          const obj = val as Record<string, unknown>;
          const message = obj.message;
          if (typeof message === "string") {
            return extractMessageFromString(message);
          }

          for (const key of ["reply", "response", "output", "text", "content", "result"]) {
            const found = deepExtract(obj[key]);
            if (found) return found;
          }
        }

        return null;
      };

      const reply = deepExtract(raw) ?? "Something went wrong";

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error("Brain chat error:", err);
      toast.error("Failed to get a response. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I couldn't process your request right now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Exavo Brain – Knowledge Support AI | Exavo AI"
        description="Ask anything about Exavo — services, case studies, and capabilities. Powered by our internal knowledge base."
      />
      <Navigation />

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <Link
          to="/playground"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Playground
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Exavo Brain</h1>
              <p className="text-sm text-muted-foreground">
                Knowledge Support AI — ask anything about Exavo
              </p>
            </div>
          </div>

          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Chat area */}
              <div className="h-[500px] overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-background to-muted/20">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"
                    >
                      <Brain className="h-8 w-8 text-primary" />
                    </motion.div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">How can I help you?</p>
                      <p className="text-xs max-w-xs text-muted-foreground">
                        Ask anything about Exavo — services, case studies, capabilities, and more.
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <BrainChatMessage key={msg.id} role={msg.role} content={msg.content} />
                ))}

                {isSending && <BrainTypingIndicator />}

                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-border p-3 flex gap-2">
                <Input
                  placeholder="Ask anything about Exavo..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default PlaygroundBrain;
