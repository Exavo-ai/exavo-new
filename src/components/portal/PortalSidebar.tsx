import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  CreditCard,
  ShoppingBag,
  Receipt,
  LifeBuoy,
  UsersRound,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeam } from "@/contexts/TeamContext";

const allNavigation = [
  { name: "Dashboard", href: "/client", icon: LayoutDashboard, roles: ["Admin", "Member", "Viewer"] },
  { name: "Services", href: "/client/services/browse", icon: Briefcase, roles: ["Admin", "Member"] },
  { name: "Purchase History", href: "/client/purchase-history", icon: CreditCard, roles: ["Admin"] },
  { name: "My Orders", href: "/client/orders", icon: ShoppingBag, roles: ["Admin", "Member"] },
  { name: "Subscriptions", href: "/client/subscriptions", icon: Receipt, roles: ["Admin"] },
  { name: "Invoices", href: "/client/invoices", icon: Receipt, roles: ["Admin"] },
  { name: "Tickets", href: "/client/tickets", icon: LifeBuoy, roles: ["Admin", "Member"] },
  { name: "Team", href: "/client/team", icon: UsersRound, roles: ["Admin", "Member"] },
  { name: "Files", href: "/client/files", icon: FolderOpen, roles: ["Admin", "Member"] },
  { name: "Settings", href: "/client/settings", icon: Settings, roles: ["Admin", "Member", "Viewer"] },
];

interface PortalSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function PortalSidebar({ collapsed, onToggle }: PortalSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserRole } = useTeam();

  const isActive = (href: string) => location.pathname === href;

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => {
    if (!currentUserRole) return true; // Show all if role not loaded yet
    return item.roles.includes(currentUserRole);
  });

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
