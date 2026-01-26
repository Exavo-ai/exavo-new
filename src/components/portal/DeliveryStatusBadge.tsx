import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, RotateCcw } from "lucide-react";
import type { DeliveryStatus } from "@/hooks/useProjects";

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

export function DeliveryStatusBadge({ status, className }: DeliveryStatusBadgeProps) {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="default" className={`bg-green-600 hover:bg-green-700 ${className || ''}`}>
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case 'changes_requested':
      return (
        <Badge variant="destructive" className={className}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Changes Requested
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      );
  }
}
