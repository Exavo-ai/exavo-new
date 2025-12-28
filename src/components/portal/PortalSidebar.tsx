import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  CreditCard,
  UsersRound,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const allNavigation = [
  { name: "Dashboard", href: "/client", icon: LayoutDashboard },
  { name: "Workspace", href: "/client/workspace", icon: UsersRound },
  { name: "Services", href: "/client/services/browse", icon: Briefcase },
  { name: "Consultations", href: "/client/consultations", icon: MessageSquare },
  { name: "Billing", href: "/client/billing", icon: CreditCard },
  { name: "Team", href: "/client/team", icon: UsersRound },
  { name: "Settings", href: "/client/settings", icon: Settings },
];

interface PortalSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function PortalSidebar({ collapsed, onToggle }: PortalSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/client") return location.pathname === "/client";
    return location.pathname.startsWith(href);
  };

  // Show all navigation items for authenticated users
  const navigation = allNavigation;

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate(item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 mb-1 text-sm font-medium rounded-lg transition-colors",
              isActive(item.href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="h-12 flex items-center justify-center border-t border-border hover:bg-muted transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </div>
  );
}
