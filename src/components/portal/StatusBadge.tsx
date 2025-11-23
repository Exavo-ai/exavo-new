import { Badge } from "@/components/ui/badge";

type Status = 'Active' | 'Inactive' | 'Pending' | 'Completed' | 'Ongoing' | 'Review' | 'Resolved' | 'Open' | 'In Progress' | 'Hot' | 'Warm' | 'Cold' | 'Expiring Soon' | 'Canceled';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariant = (status: Status): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Active':
      case 'Completed':
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
      default:
        return 'secondary';
    }
  };

  return (
    <Badge variant={getVariant(status)} className={className}>
      {status}
    </Badge>
  );
}
