import { motion } from "framer-motion";
import { Brain, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";

interface BrainChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

const ERROR_CONTENT = "Sorry, I couldn't process your request right now. Please try again.";

const BrainChatMessage = ({ role, content, isError }: BrainChatMessageProps) => {
  const isAssistant = role === "assistant";
  const showError = isError || content === ERROR_CONTENT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      {/* AI Avatar */}
      {isAssistant && (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Brain className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message bubble */}
      <div
        className={`max-w-[70%] rounded-2xl text-[14px] leading-[1.7] ${
          isAssistant
            ? showError
              ? "bg-destructive/10 border border-destructive/20 text-foreground px-4 py-3"
              : "bg-muted/70 border border-border/40 text-foreground px-4 py-3"
            : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-4 py-3"
        }`}
      >
        {isAssistant ? (
          showError ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive/90">{content}</p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:text-foreground [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>

      {/* User Avatar */}
      {!isAssistant && (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
            You
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
};

export default BrainChatMessage;
