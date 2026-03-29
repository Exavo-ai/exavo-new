import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, ArrowLeft, Copy, Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { toast } from "sonner";

const WEBHOOK_URL =
  "https://n8n.exavo.app/webhook-test/bced3110-6367-4575-a0fd-3e77ae210772";

const PlaygroundViralForge = () => {
  const { user, loading: authLoading } = useAuth();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (generatedContent && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [generatedContent]);

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

  const handleGenerate = async () => {
    const trimmed = topic.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);
    setGeneratedContent("");
    setCopied(false);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      const text = await res.text();
      let content: string;
      try {
        const json = JSON.parse(text);
        content =
          json.output || json.content || json.reply || json.response || json.message || text;
      } catch {
        content = text;
      }

      if (!content || content.trim().length === 0) {
        throw new Error("Empty response");
      }

      setGeneratedContent(content);
    } catch (err: any) {
      console.error("ViralForge error:", err);
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      toast.success("Content copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="ViralForge AI – Social Media Content Generator | Exavo AI"
        description="Generate high-performing social media content using multi-agent AI workflows. Platform-optimized posts with high engagement writing style."
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
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ViralForge AI</h1>
              <p className="text-sm text-muted-foreground">
                AI Social Media Strategist — multi-agent content generation
              </p>
            </div>
          </div>

          {/* Input Card */}
          <Card className="border-border/50 mb-6">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Topic or Idea
                </label>
                <Input
                  placeholder="e.g. Why AI automation saves SMBs 20+ hours per week"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleGenerate()
                  }
                  disabled={isGenerating}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!topic.trim() || isGenerating}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Content →
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Loading state */}
          {isGenerating && (
            <Card className="border-border/50 mb-6">
              <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Multi-agent AI is crafting your content...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {generatedContent && !isGenerating && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 ring-1 ring-primary/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      Generated Content
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-1.5 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {generatedContent}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default PlaygroundViralForge;
