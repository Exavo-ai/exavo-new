import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const BrainTypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-3 justify-start"
  >
    {/* Glowing avatar */}
    <div className="relative shrink-0 mt-0.5">
      <motion.div
        className="absolute -inset-1 rounded-full bg-primary/20 blur-sm"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <Avatar className="h-9 w-9 relative ring-2 ring-primary/30">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
          <Brain className="h-4.5 w-4.5" />
        </AvatarFallback>
      </Avatar>
      <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1 py-px rounded-full leading-none ring-2 ring-background">
        AI
      </span>
    </div>

    <div className="flex flex-col items-start">
      <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
        Exavo Brain
      </span>
      <div className="bg-muted/70 border border-border/40 rounded-2xl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-primary/50"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

export default BrainTypingIndicator;
