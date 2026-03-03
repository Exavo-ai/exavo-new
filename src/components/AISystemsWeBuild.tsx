import { TrendingUp, Workflow, MessageSquare, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const systems = [
  {
    icon: TrendingUp,
    title: "Revenue Automation Systems",
    bullets: [
      "AI lead qualification",
      "CRM automation",
      "Smart follow-up workflows",
    ],
  },
  {
    icon: Workflow,
    title: "Operational Workflow Infrastructure",
    bullets: [
      "End-to-end workflow automation",
      "Document processing systems",
      "Internal task orchestration",
    ],
  },
  {
    icon: MessageSquare,
    title: "Multi-Agent Customer Interaction Systems",
    bullets: [
      "Website AI agent",
      "Instagram & Facebook DM automation",
      "Intelligent escalation & lead routing",
    ],
  },
  {
    icon: BarChart3,
    title: "AI Intelligence Layer",
    bullets: [
      "KPI dashboards",
      "Data consolidation",
      "Performance tracking",
    ],
  },
];

const AISystemsWeBuild = () => {
  const { language } = useLanguage();

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden bg-muted/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {language === "ar" ? "أنظمة الذكاء الاصطناعي التي نبنيها" : "AI Systems We Build"}
          </h2>
          <p className="text-lg text-muted-foreground">
            {language === "ar"
              ? "حلول بنية تحتية قابلة للتوسع عبر الإيرادات والعمليات والتفاعل مع العملاء"
              : "Scalable infrastructure solutions across revenue, operations, and customer engagement"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {systems.map((system, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-6 lg:p-8 hover:shadow-card hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center mb-6 shadow-glow">
                <system.icon className="w-7 h-7 text-primary-foreground" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold mb-4 text-foreground">{system.title}</h3>
              <ul className="space-y-2">
                {system.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AISystemsWeBuild;
