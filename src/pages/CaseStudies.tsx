import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Globe, Bot, Workflow, FileText, Puzzle, Building2, 
  ArrowRight, Sparkles, Loader2, FolderOpen
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import type { CaseStudyProject, CaseStudyModule } from "@/hooks/useCaseStudies";

const moduleTypeIcons: Record<string, React.ElementType> = {
  website: Globe,
  automation: Workflow,
  ai_agent: Bot,
  ai_content: FileText,
  integration: Puzzle,
  other: Building2,
};

const moduleTypeColors: Record<string, string> = {
  website: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  automation: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  ai_agent: "bg-green-500/10 text-green-600 border-green-500/20",
  ai_content: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  integration: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  real_client: { label: "Real Client", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  demo: { label: "Demo", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  internal: { label: "Internal", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
};

const moduleTypeLabels: Record<string, string> = {
  website: "Website",
  automation: "Automation",
  ai_agent: "AI Agent",
  ai_content: "AI Content",
  integration: "Integration",
  other: "Other",
};

// Hook to fetch all visible case studies (no limit, no landing filter)
function useAllVisibleCaseStudies() {
  return useQuery({
    queryKey: ["case-study-projects-public-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_study_projects")
        .select(`
          *,
          modules:case_study_modules(*)
        `)
        .eq("visibility", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as (CaseStudyProject & { modules: CaseStudyModule[] })[];
    },
  });
}

const CaseStudiesPage = () => {
  const { data: projects = [], isLoading } = useAllVisibleCaseStudies();

  // Get unique module types from all projects
  const getUniqueModuleTypes = (modules: CaseStudyModule[] = []) => {
    const types = new Set(modules.map((m) => m.module_type));
    return Array.from(types);
  };

  // Get unique tech stack (limit to 4)
  const getUniqueTechStack = (modules: CaseStudyModule[] = []) => {
    const techs = new Set<string>();
    modules.forEach((m) => m.tech_stack?.forEach((t) => techs.add(t)));
    return Array.from(techs).slice(0, 4);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Case Studies – Real AI Solutions | Exavo AI"
        description="Explore real AI-powered solutions built and deployed for real businesses. See our portfolio of websites, automations, AI agents, and integrations."
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
                Portfolio
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                Real Work. Real Results.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
                Our AI infrastructure & implementation model delivers measurable AI automation and custom AI implementation results across industries.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Projects Grid Section */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-20"
              >
                <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No Case Studies Yet</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We're working on documenting our projects. Check back soon to see our portfolio of AI solutions.
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {projects.map((project, index) => {
                  const moduleTypes = getUniqueModuleTypes(project.modules);
                  const techStack = getUniqueTechStack(project.modules);
                  const statusInfo = statusLabels[project.project_status];

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-all duration-300 group border-border/50 hover:border-primary/20">
                        <CardContent className="p-4 sm:p-6 flex flex-col h-full">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                {project.client_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {project.industry}
                              </p>
                            </div>
                            <Badge variant="outline" className={statusInfo?.className}>
                              {statusInfo?.label}
                            </Badge>
                          </div>

                          {/* Summary */}
                          <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                            {project.summary}
                          </p>

                          {/* Module Types */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {moduleTypes.map((type) => {
                              const Icon = moduleTypeIcons[type] || Building2;
                              return (
                                <Badge
                                  key={type}
                                  variant="outline"
                                  className={`gap-1 ${moduleTypeColors[type]}`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {moduleTypeLabels[type]}
                                </Badge>
                              );
                            })}
                          </div>

                          {/* Tech Stack */}
                          {techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {techStack.map((tech) => (
                                <Badge
                                  key={tech}
                                  variant="secondary"
                                  className="text-xs font-normal"
                                >
                                  {tech}
                                </Badge>
                              ))}
                              {project.modules?.flatMap((m) => m.tech_stack || []).length > 4 && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  +{project.modules.flatMap((m) => m.tech_stack || []).length - 4}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* CTA */}
                          <Link to={`/case-study/${project.id}`}>
                            <Button 
                              variant="outline" 
                              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            >
                              View Case Study
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CaseStudiesPage;
