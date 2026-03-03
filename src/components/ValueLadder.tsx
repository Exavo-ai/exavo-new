import { Zap, Layers, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ladder = [
  {
    icon: Zap,
    step: "Step 1",
    title: "AI System Sprint",
    description: "Deploy a high-impact AI system in 4–6 weeks.",
  },
  {
    icon: Layers,
    step: "Step 2",
    title: "AI Infrastructure Build",
    description: "Design and implement interconnected AI workflows across your operations.",
  },
  {
    icon: RefreshCw,
    step: "Step 3",
    title: "Ongoing Optimization",
    description: "Continuously refine and scale AI systems as your business grows.",
  },
];

const ValueLadder = () => {
  const { language } = useLanguage();

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {language === "ar" ? "نموذج التنفيذ لدينا" : "Our AI Implementation Model"}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {ladder.map((item, i) => (
            <div
              key={i}
              className="relative bg-card border border-border rounded-2xl p-6 lg:p-8 hover:shadow-card hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-sm shadow-glow">
                {i + 1}
              </div>
              <div className="w-14 h-14 rounded-lg bg-gradient-accent flex items-center justify-center mb-5">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{item.step}</p>
              <h3 className="text-xl font-bold mb-3 text-foreground">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueLadder;
