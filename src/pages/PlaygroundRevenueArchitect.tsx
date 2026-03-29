import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Copy, Check, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { toast } from "sonner";

const WEBHOOK_URL =
  "https://n8n.exavo.app/webhook-test/245c2879-4f14-402f-93be-5dd8a61e2318";

const BUSINESS_TYPES = [
  "SaaS / Software",
  "E-commerce",
  "Agency / Consulting",
  "Local Business",
  "Marketplace",
  "B2B Services",
  "Other",
];

const GOALS = [
  "Increase revenue",
  "Reduce churn",
  "Improve conversions",
  "Scale operations",
  "Enter new market",
  "Launch new product",
];

const PlaygroundRevenueArchitect = () => {
  const { user, loading: authLoading } = useAuth();
  const [businessType, setBusinessType] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

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

  const canSubmit =
    businessType.trim() && goal.trim() && audience.trim() && !isGenerating;

  const handleGenerate = async () => {
    if (!canSubmit) return;

    const prompt = [
      `Business Type: ${businessType}`,
      `Goal: ${goal}`,
      `Target Audience: ${audience}`,
      context.trim() ? `Additional Context: ${context.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setIsGenerating(true);
    setResult("");
    setCopied(false);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: prompt }),
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      const text = await res.text();
      let content: string;
      try {
        const json = JSON.parse(text);
        content =
          json.output ||
          json.content ||
          json.reply ||
          json.response ||
          json.message ||
          json.strategy ||
          text;
      } catch {
        content = text;
      }

      if (!content || content.trim().length === 0) {
        throw new Error("Empty response");
      }

      setResult(content);
    } catch (err: any) {
      console.error("Revenue Architect error:", err);
      toast.error("Failed to generate strategy. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success("Strategy copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Revenue Architect – AI Growth Strategy Generator | Exavo AI"
        description="Get data-driven strategies to scale your business using AI and CRO frameworks."
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

          {/* Input Form */}
          <Card className="border-border/50 mb-6">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Business Type
                  </label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Primary Goal
                  </label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOALS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Target Audience
                </label>
                <Input
                  placeholder="e.g. SMB founders in the SaaS space"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  disabled={isGenerating}
                  maxLength={200}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Additional Context{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Textarea
                  placeholder="Current challenges, monthly revenue, team size..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={isGenerating}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!canSubmit}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Building Strategy...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Build Strategy →
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Loading */}
          {isGenerating && (
            <Card className="border-border/50 mb-6">
              <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Analyzing your business context and generating strategy...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && !isGenerating && (
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
                      Growth Strategy
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
                    {result}
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

export default PlaygroundRevenueArchitect;
