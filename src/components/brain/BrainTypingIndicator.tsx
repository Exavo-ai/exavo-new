import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const BrainTypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-3 justify-start"
  >
    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
      <AvatarFallback className="bg-primary/10 text-primary">
        <Brain className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
    <div className="bg-muted/70 border border-border/40 rounded-2xl px-4 py-3 flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground/50"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  </motion.div>
);

export default BrainTypingIndicator;
