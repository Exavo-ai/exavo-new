import { UserCheck, Code2, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const roles = [
  {
    icon: UserCheck,
    title: "Dedicated AI Strategist",
    description: "Your single point of contact for requirements, roadmap, and progress.",
  },
  {
    icon: Code2,
    title: "Technical Implementation Team",
    description: "Engineers and specialists who build, integrate, and deploy your AI systems.",
  },
  {
    icon: ShieldCheck,
    title: "Quality & Performance Oversight",
    description: "Continuous monitoring, testing, and optimization to ensure measurable results.",
  },
];

const ImplementationStructure = () => {
  const { language } = useLanguage();

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {language === "ar" ? "نموذج التنفيذ لدينا" : "Our Implementation Model"}
          </h2>
          <p className="text-lg text-muted-foreground">
            {language === "ar"
              ? "هيكل وكالة منظم يضمن تسليماً موثوقاً"
              : "A structured agency model that ensures reliable delivery"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {roles.map((role, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-6 lg:p-8 text-center hover:shadow-card hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center mx-auto mb-6 shadow-glow">
                <role.icon className="w-7 h-7 text-primary-foreground" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{role.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImplementationStructure;
