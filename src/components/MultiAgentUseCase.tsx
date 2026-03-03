import { MessageSquare, Bot, Filter, Users } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  { icon: Bot, label: "Website AI Agent", desc: "Handles inbound queries 24/7 with contextual responses" },
  { icon: MessageSquare, label: "Social Media AI Agent", desc: "Automates Instagram & Facebook DM engagement" },
  { icon: Filter, label: "Lead Qualification Logic", desc: "Scores and routes leads based on intent signals" },
  { icon: Users, label: "Human Escalation Routing", desc: "Hands off complex queries to your team seamlessly" },
];

const MultiAgentUseCase = () => {
  return (
    <section className="py-16 lg:py-20 relative overflow-hidden bg-muted/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.08),transparent_50%)]" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Multi-Agent Customer Interaction System
          </h2>
          <p className="text-lg text-muted-foreground">
            Eliminate manual replies, missed DMs, and slow response times with an interconnected AI agent architecture.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-card hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center mx-auto mb-4 shadow-glow">
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-foreground">{step.label}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MultiAgentUseCase;
