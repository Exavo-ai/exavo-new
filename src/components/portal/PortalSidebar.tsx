import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Zap,
  Clock,
  CreditCard,
  Workflow,
  Bot,
  Users,
  UserPlus,
  MessageSquare,
  ShoppingBag,
  FileText,
  Receipt,
  FileSignature,
  LifeBuoy,
  UsersRound,
  Plug,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import exavoLogo from "@/assets/exavo-logo.png";

const navigation = [
  { name: "Dashboard", href: "/client", icon: LayoutDashboard },
  {
    name: "Services",
    icon: Briefcase,
    children: [
      { name: "Browse Services", href: "/client/services/browse", icon: Briefcase },
      { name: "My Services", href: "/client/my-services", icon: Zap },
      { name: "Active Tools", href: "/client/active-tools", icon: Clock },
      { name: "Purchase History", href: "/client/purchase-history", icon: CreditCard },
    ],
  },
  {
    name: "AI Workspace",
    icon: Bot,
    children: [
      { name: "My AI Tools", href: "/client/ai-tools", icon: Bot },
      { name: "Automations", href: "/client/automations", icon: Workflow },
      { name: "Workflows", href: "/client/workflows", icon: Workflow },
    ],
  },
  {
    name: "CRM",
    icon: Users,
    children: [
      { name: "Leads", href: "/client/crm/leads", icon: UserPlus },
      { name: "Clients", href: "/client/crm/clients", icon: Users },
      { name: "Conversations", href: "/client/crm/conversations", icon: MessageSquare },
    ],
  },
  { name: "Orders", href: "/client/orders", icon: ShoppingBag },
  { name: "Forms", href: "/client/forms", icon: FileText },
  { name: "Subscriptions", href: "/client/subscriptions", icon: Receipt },
  { name: "Invoices", href: "/client/invoices", icon: Receipt },
  { name: "Proposals", href: "/client/proposals", icon: FileSignature },
  { name: "Tickets", href: "/client/tickets", icon: LifeBuoy },
  { name: "Team", href: "/client/team", icon: UsersRound },
  { name: "Integrations", href: "/client/integrations", icon: Plug },
  { name: "Files", href: "/client/files", icon: FolderOpen },
  { name: "Workspace Config", href: "/client/workspace-config", icon: Settings },
  { name: "Settings", href: "/client/settings", icon: Settings },
];

interface PortalSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function PortalSidebar({ collapsed, onToggle }: PortalSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Services", "AI Workspace", "CRM"]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-border px-4">
        <img src={exavoLogo} alt="Exavo" className={cn("h-8", collapsed && "h-6")} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 transition-transform",
                          expandedGroups.includes(item.name) && "rotate-90"
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && expandedGroups.includes(item.name) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.name}
                        onClick={() => navigate(child.href)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                          isActive(child.href)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <child.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{child.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </button>
            )}
          </div>
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
