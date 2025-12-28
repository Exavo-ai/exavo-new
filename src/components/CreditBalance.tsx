import { Coins, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";

interface CreditBalanceProps {
  showLabel?: boolean;
  className?: string;
}

export function CreditBalance({ showLabel = true, className = "" }: CreditBalanceProps) {
  const { user } = useAuth();
  const { credits, isLoadingCredits } = useCredits();

  if (!user) return null;

  if (isLoadingCredits) {
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        {showLabel && <span>Credits</span>}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={`gap-1 ${className}`}>
      <Coins className="h-3 w-3" />
      <span className="font-semibold">{credits}</span>
      {showLabel && <span className="text-muted-foreground">credits</span>}
    </Badge>
  );
}
