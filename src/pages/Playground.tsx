import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Sparkles, PenTool, Linkedin, Brain, Zap, TrendingUp, Briefcase, BotMessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const playgroundCards = [
  {
    id: "rag",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: FileText,
    title: "Document Intelligence (RAG)",
    description:
      "Upload up to 3 documents and ask questions powered by secure multi-tenant AI retrieval.",
    features: [
      "7 free questions per day",
      "Persistent document storage",
      "Secure per-user isolation",
      "No re-embedding unless files change",
    ],
    href: "/playground/rag",
    enabled: true,
  },
  {
    id: "blog",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: PenTool,
    title: "AI Blog Generator",
    description:
      "Generate up to 3 AI-powered blog posts per day from a simple title.",
    features: [
      "3 free generations per day",
      "AI-powered content creation",
      "Formatted markdown output",
      "Instant results",
    ],
    href: "/playground/blog",
    enabled: true,
  },
  {
    id: "linkedin",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: Linkedin,
    title: "AI LinkedIn Post Generator",
    description:
      "Generate professional LinkedIn posts from a topic using our multi-agent AI system that writes, improves, and reviews the content automatically.",
    features: [
      "Multi-Agent AI Workflow",
      "Topic → LinkedIn Post",
      "AI Quality Review",
      "Professional LinkedIn formatting",
      "Instant generation",
    ],
    href: "/playground/linkedin-generator",
    enabled: true,
  },
  {
    id: "brain",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: Brain,
    title: "Knowledge Support AI",
    description:
      "Ask anything about Exavo — services, case studies, and capabilities.",
    features: [
      "Instant company insights",
      "Accurate & contextual answers",
      "Powered by internal knowledge base",
    ],
    href: "/playground/brain",
    enabled: true,
    glow: true,
  },
  {
    id: "viralforge",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: Zap,
    title: "AI Social Media Strategist",
    description:
      "Generate high-performing social media content using multi-agent AI workflows.",
    features: [
      "Multi-agent content generation",
      "Platform-optimized posts",
      "High engagement writing style",
      "Instant output",
    ],
    href: "/playground/viralforge",
    enabled: true,
    glow: true,
  },
  {
    id: "revenue",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: TrendingUp,
    title: "Revenue Growth AI",
    description:
      "Get data-driven strategies to scale your business using AI and CRO frameworks.",
    features: [
      "AI-powered growth plans",
      "CRO-driven insights",
      "Actionable recommendations",
      "Business-focused outputs",
    ],
    href: "/playground/revenue-architect",
    enabled: true,
    glow: true,
  },
  {
    id: "cso",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: Briefcase,
    title: "CSO Assistant",
    description:
      "AI-powered sales strategist for pipelines, closing strategies, and sales performance optimization.",
    features: [
      "Sales strategy insights",
      "Pipeline optimization",
      "Closing technique advice",
      "Real-time AI chat",
    ],
    href: "/playground/cso-assistant",
    enabled: true,
    glow: true,
  },
  {
    id: "social-growth",
    tag: "Live Demo",
    tagClass: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: BotMessageSquare,
    title: "ExavoAI Sales Assistant",
    description:
      "AI-powered sales advisor that helps you understand how ExavoAI can automate your business and generate leads.",
    features: [
      "AI automation consulting",
      "Lead generation strategies",
      "Business workflow insights",
      "Real-time AI chat",
    ],
    href: "/playground/social-growth",
    enabled: true,
    glow: true,
  },
];

const Playground = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="AI Playground – Test AI Infrastructure Live | Exavo AI"
        description="Test our AI infrastructure live. Upload documents and interact with them using enterprise-grade retrieval systems."
      />
      <Navigation />

      <main>
        {/* Hero Section */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/50 to-background relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Interactive Demos
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                AI Playground
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4 mb-8">
                Test our AI infrastructure live. Upload documents and interact with them using enterprise-grade retrieval systems.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Available for registered users only.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {playgroundCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className={`h-full hover:shadow-lg transition-all duration-300 group border-border/50 hover:border-primary/20 ${(card as any).glow ? "ring-1 ring-primary/20 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.25)]" : ""}`}>
                      <CardContent className="p-4 sm:p-6 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {card.title}
                            </h3>
                          </div>
                          <Badge variant="outline" className={card.tagClass}>
                            {card.tag}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground text-sm mb-4 flex-1">
                          {card.description}
                        </p>

                        {card.features.length > 0 && (
                          <ul className="space-y-1.5 mb-4 text-sm text-muted-foreground">
                            {card.features.map((f) => (
                              <li key={f} className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}

                        {card.enabled ? (
                          <Link to={card.href}>
                            <Button
                              variant="outline"
                              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            >
                              {card.id === "brain" ? "Ask Exavo Brain →" : card.id === "viralforge" ? "Generate Content →" : card.id === "revenue" ? "Build Strategy →" : card.id === "cso" ? "Talk to CSO →" : card.id === "social-growth" ? "Grow Social →" : "Try Now"}
                              {!["brain", "viralforge", "revenue", "cso", "social-growth"].includes(card.id) && <ArrowRight className="h-4 w-4 ml-2" />}
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="outline" className="w-full" disabled>
                            Coming Soon
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Playground;
