import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Globe, Bot, Workflow, FileText, Puzzle, Building2, 
  ArrowRight, Sparkles, Loader2 
} from "lucide-react";
import { 
  useLandingCaseStudies, 
  useCaseStudiesSectionVisibility,
  type CaseStudyModule 
} from "@/hooks/useCaseStudies";
import { motion } from "framer-motion";

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

export function RealWorkSection() {
  const { data: sectionVisible, isLoading: visibilityLoading } = useCaseStudiesSectionVisibility();
  const { data: projects = [], isLoading: projectsLoading } = useLandingCaseStudies();

  // Don't render if section is disabled or no projects
  if (visibilityLoading || projectsLoading) return null;
  if (!sectionVisible) return null;
  if (projects.length === 0) return null;

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
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Portfolio
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Real Work. Real Results.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI infrastructure & implementation model delivers measurable AI automation results across industries, from e-commerce to technology and professional services.
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => {
            const moduleTypes = getUniqueModuleTypes(project.modules);
            const techStack = getUniqueTechStack(project.modules);
            const statusInfo = statusLabels[project.project_status];

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group border-border/50 hover:border-primary/20">
                  <CardContent className="p-6 flex flex-col h-full">
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
                      <Badge variant="outline" className={statusInfo.className}>
                        {statusInfo.label}
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

        {/* View All Link */}
        {projects.length >= 6 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link to="/case-studies">
              <Button variant="outline" size="lg">
                View All Case Studies
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
