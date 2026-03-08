import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Linkedin, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const DAILY_LIMIT = 3;

const PlaygroundLinkedIn = () => {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session) await fetchUsage();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      if (session) await fetchUsage();
      else setRemaining(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUsage = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("user_daily_linkedin_usage")
        .select("generation_count")
        .eq("usage_date", today)
        .maybeSingle();

      setRemaining(DAILY_LIMIT - (data?.generation_count ?? 0));
    } catch {
      setRemaining(DAILY_LIMIT);
    }
  };

  const incrementUsage = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: existing } = await supabase
      .from("user_daily_linkedin_usage")
      .select("id, generation_count")
      .eq("usage_date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_daily_linkedin_usage")
        .update({ generation_count: existing.generation_count + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("user_daily_linkedin_usage")
        .insert({ user_id: session.user.id, usage_date: today, generation_count: 1 });
    }
  };

  const handleGenerate = useCallback(async () => {
    if (loading || !topic.trim() || remaining === 0) return;

    setLoading(true);
    setError("");
    setContent("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in to use this feature.");
        return;
      }

      const response = await fetch("https://agentic-content-engine.vercel.app/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        setError("Generation failed. Please try again.");
        return;
      }

      const result = await response.json();

      if (!result || (!result.post && !result.content && !result.output)) {
        setError("Unexpected response. Please try again.");
        return;
      }

      const generatedContent = result.post || result.content || result.output || JSON.stringify(result, null, 2);
      setContent(generatedContent);

      await incrementUsage();
      await fetchUsage();
    } catch {
      setError("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topic, loading, remaining]);

  const isDisabled = !isAuthenticated || loading || !topic.trim() || remaining === 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="AI LinkedIn Post Generator – Free AI Content | Exavo AI"
        description="Generate professional LinkedIn posts from a topic using our multi-agent AI workflow. Free for registered users."
      />
      <Navigation />

      <main className="py-20 lg:py-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              to="/playground"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Playground
            </Link>

            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl">AI LinkedIn Post Generator</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Live Demo
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-2">
                  Generate high-quality LinkedIn posts from a simple topic using our multi-agent AI workflow.
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Auth gate */}
                {isAuthenticated === false && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Please{" "}
                      <Link to="/register" className="text-primary hover:underline font-medium">sign up</Link>
                      {" "}or{" "}
                      <Link to="/login" className="text-primary hover:underline font-medium">log in</Link>
                      {" "}to use this feature.
                    </p>
                  </div>
                )}

                {/* Usage counter */}
                {isAuthenticated && remaining !== null && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-sm text-muted-foreground">
                      You have{" "}
                      <span className={`font-semibold ${remaining > 0 ? "text-primary" : "text-destructive"}`}>
                        {remaining}/{DAILY_LIMIT}
                      </span>{" "}
                      generations remaining today
                    </span>
                  </div>
                )}

                {/* Limit reached */}
                {isAuthenticated && remaining === 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">
                      You have reached your daily generation limit.
                    </p>
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter your LinkedIn post topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={!isAuthenticated || loading}
                    maxLength={200}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isDisabled) handleGenerate();
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={isDisabled}
                    className="shrink-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating…
                      </>
                    ) : (
                      "Generate LinkedIn Post"
                    )}
                  </Button>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Output */}
                {content && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg border border-border bg-muted/20 p-6 max-h-[600px] overflow-y-auto"
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {content}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlaygroundLinkedIn;
