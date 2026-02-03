import { useParams, Link } from "react-router-dom";
import { useCaseStudyProject } from "@/hooks/useCaseStudies";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Globe, Bot, Workflow, FileText, Puzzle, Building2,
  ArrowRight, Loader2, CheckCircle2, Target, BarChart3,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

const moduleTypeIcons: Record<string, React.ElementType> = {
  website: Globe,
  automation: Workflow,
  ai_agent: Bot,
  ai_content: FileText,
  integration: Puzzle,
  other: Building2,
};

const moduleTypeLabels: Record<string, string> = {
  website: "Website",
  automation: "Automation",
  ai_agent: "AI Agent",
  ai_content: "AI Content",
  integration: "Integration",
  other: "Other",
};

const deliveryTypeLabels: Record<string, string> = {
  live_ui: "Live UI",
  background_automation: "Background Process",
  api: "API Integration",
  internal_tool: "Internal Tool",
};

const statusColors: Record<string, string> = {
  real_client: "bg-green-500/10 text-green-600 border-green-500/20",
  demo: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  internal: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const statusLabels: Record<string, string> = {
  real_client: "Real Client",
  demo: "Demo Project",
  internal: "Internal Project",
};

const ctaByModuleType: Record<string, { text: string; link: string }> = {
  website: { text: "Build a similar website", link: "/services?category=website" },
  automation: { text: "Automate my workflow", link: "/services?category=automation" },
  ai_agent: { text: "Build an AI agent", link: "/services?category=ai" },
  ai_content: { text: "Create AI content", link: "/services?category=content" },
  integration: { text: "Integrate my systems", link: "/services?category=integration" },
  other: { text: "Start a project", link: "/services" },
};

export default function CaseStudy() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, error } = useCaseStudyProject(id);

  // Get primary CTA based on modules
  const getPrimaryCTA = () => {
    if (!project?.modules?.length) {
      return { text: "Start Your Project", link: "/services" };
    }
    const primaryType = project.modules[0].module_type;
    return ctaByModuleType[primaryType] || ctaByModuleType.other;
  };

  // Check if any module has KPIs
  const hasKPIs = project?.modules?.some((m) => m.kpis);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Case Study Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The case study you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const primaryCTA = getPrimaryCTA();

  return (
    <div className="min-h-screen">
      <SEO
        title={`${project.client_name} Case Study | Exavo AI`}
        description={project.summary}
      />
      <Navigation />

      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-12 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge
                  variant="outline"
                  className={statusColors[project.project_status]}
                >
                  {statusLabels[project.project_status]}
                </Badge>
                <Badge variant="secondary">{project.industry}</Badge>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {project.client_name}
              </h1>

              <p className="text-xl text-muted-foreground max-w-3xl">
                {project.summary}
              </p>

              {/* Module badges */}
              <div className="flex flex-wrap gap-2 mt-6">
                {project.modules?.map((module) => {
                  const Icon = moduleTypeIcons[module.module_type] || Building2;
                  return (
                    <Badge
                      key={module.id}
                      variant="outline"
                      className="gap-1.5 px-3 py-1"
                    >
                      <Icon className="h-4 w-4" />
                      {moduleTypeLabels[module.module_type]}
                    </Badge>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Overview Section */}
        {project.overview && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  Project Overview
                </h2>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {project.overview}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>
        )}

        {/* What We Built Section */}
        {project.modules && project.modules.length > 0 && (
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  What We Built
                </h2>

                <div className="grid gap-6">
                  {project.modules.map((module, index) => {
                    const Icon = moduleTypeIcons[module.module_type] || Building2;
                    return (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card>
                          <CardHeader>
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-primary/10 rounded-lg">
                                <Icon className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle>{module.title}</CardTitle>
                                  <Badge variant="outline">
                                    {deliveryTypeLabels[module.delivery_type]}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground">
                                  {module.description}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Tech Stack */}
                            {module.tech_stack && module.tech_stack.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2">Tech Stack</h4>
                                <div className="flex flex-wrap gap-2">
                                  {module.tech_stack.map((tech) => (
                                    <Badge key={tech} variant="secondary">
                                      {tech}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Inputs / Outputs */}
                            {(module.inputs || module.outputs) && (
                              <div className="grid md:grid-cols-2 gap-4 mt-4">
                                {module.inputs && (
                                  <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="text-sm font-medium mb-2">Inputs</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {module.inputs}
                                    </p>
                                  </div>
                                )}
                                {module.outputs && (
                                  <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="text-sm font-medium mb-2">Outputs</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {module.outputs}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Media (placeholder for future) */}
                            {module.media && module.media.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                {module.media.map((item, i) => (
                                  <div
                                    key={i}
                                    className="aspect-video bg-muted rounded-lg overflow-hidden"
                                  >
                                    {item.type === "image" && (
                                      <img
                                        src={item.url}
                                        alt={item.caption || `Media ${i + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Results Section */}
        {hasKPIs && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Results & Impact
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {project.modules
                    ?.filter((m) => m.kpis)
                    .map((module) => (
                      <Card key={module.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            {(() => {
                              const Icon = moduleTypeIcons[module.module_type] || Building2;
                              return <Icon className="h-5 w-5 text-primary" />;
                            })()}
                            <h4 className="font-medium">{module.title}</h4>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {module.kpis}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-20 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4">
                Ready to Build Something Similar?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Let's discuss how we can help transform your business with 
                AI-powered solutions tailored to your needs.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to={primaryCTA.link}>
                  <Button size="lg">
                    {primaryCTA.text}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline">
                    Get in Touch
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
