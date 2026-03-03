import { Building2, Cog, BarChart3, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const phases = [
  {
    icon: Building2,
    title: "Company Context",
    content:
      "A mid-sized construction firm managing high-volume tendering manually across spreadsheets, email, and disconnected tools — limiting throughput and accuracy.",
  },
  {
    icon: Cog,
    title: "Operational Challenges",
    content:
      "Fragmented intake, inconsistent evaluation criteria, no centralized workflow, and zero visibility into pipeline performance metrics.",
  },
  {
    icon: BarChart3,
    title: "Architecture Design",
    items: [
      "Automated intake & document parsing",
      "AI-driven evaluation & scoring logic",
      "End-to-end workflow orchestration",
      "Real-time KPI reporting dashboard",
    ],
  },
  {
    icon: ArrowRight,
    title: "Results & Phase 2",
    content:
      "60% reduction in tender processing time. Phase 2 roadmap includes AI-powered project execution tracking and automated invoicing workflows.",
  },
];

const FlagshipCaseStudy = () => {
  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            From Manual Tendering to AI-Driven Operational Infrastructure
          </h2>
          <p className="text-lg text-muted-foreground">
            A structured case study in operational transformation
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {phases.map((phase, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 lg:p-8 hover:shadow-card transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-4">
                <phase.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{phase.title}</h3>
              {phase.content && (
                <p className="text-muted-foreground leading-relaxed">{phase.content}</p>
              )}
              {phase.items && (
                <ul className="space-y-2">
                  {phase.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlagshipCaseStudy;
