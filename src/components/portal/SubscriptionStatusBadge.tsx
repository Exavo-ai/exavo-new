import { Badge } from "@/components/ui/badge";
import { Zap, Pause, XCircle, Clock } from "lucide-react";

interface SubscriptionStatusBadgeProps {
  status: string | null;
  cancelAtPeriodEnd?: boolean;
  className?: string;
}

export function SubscriptionStatusBadge({ 
  status, 
  cancelAtPeriodEnd,
  className = "" 
}: SubscriptionStatusBadgeProps) {
  if (!status) return null;

  const getStatusConfig = () => {
    // If scheduled to cancel at period end, show as "Canceling"
    if (cancelAtPeriodEnd && status === "active") {
      return {
        label: "Canceling",
        variant: "outline" as const,
        icon: Clock,
        className: "border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20",
      };
    }

    switch (status.toLowerCase()) {
      case "active":
        return {
          label: "Active",
          variant: "default" as const,
          icon: Zap,
          className: "bg-emerald-500 hover:bg-emerald-600 text-white",
        };
      case "paused":
        return {
          label: "Paused",
          variant: "secondary" as const,
          icon: Pause,
          className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        };
      case "canceled":
      case "cancelled":
        return {
          label: "Canceled",
          variant: "destructive" as const,
          icon: XCircle,
          className: "",
        };
      case "past_due":
        return {
          label: "Past Due",
          variant: "destructive" as const,
          icon: Clock,
          className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
      case "trialing":
        return {
          label: "Trial",
          variant: "outline" as const,
          icon: Zap,
          className: "border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1),
          variant: "secondary" as const,
          icon: Clock,
          className: "",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1 ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
