import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Status = 'Active' | 'Inactive' | 'Pending' | 'Completed' | 'Ongoing' | 'Review' | 'Resolved' | 'Open' | 'In Progress' | 'Hot' | 'Warm' | 'Cold' | 'Expiring Soon' | 'Canceled';

interface StatusBadgeProps {
  status: Status;
  className?: string;
  showCompletedTooltip?: boolean;
}

export function StatusBadge({ status, className, showCompletedTooltip = false }: StatusBadgeProps) {
  const getVariant = (status: Status): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Active':
      case 'Resolved':
      case 'Hot':
        return 'default';
      case 'Inactive':
      case 'Pending':
      case 'Review':
      case 'Cold':
      case 'Canceled':
        return 'secondary';
      case 'Open':
      case 'Expiring Soon':
        return 'destructive';
      case 'In Progress':
      case 'Ongoing':
      case 'Warm':
        return 'outline';
      case 'Completed':
        return 'default'; // Will be overridden with custom styling
      default:
        return 'secondary';
    }
  };

  // Special handling for Completed status with green styling and checkmark
  if (status === 'Completed') {
    const badge = (
      <Badge 
        variant="default" 
        className={`bg-green-600 hover:bg-green-700 text-white ${className || ''}`}
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );

    if (showCompletedTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent>
              <p>Project completed and approved by client</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  }

  return (
    <Badge variant={getVariant(status)} className={className}>
      {status}
    </Badge>
  );
}
