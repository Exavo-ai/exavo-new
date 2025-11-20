import { User, LogOut, Settings as SettingsIcon, CreditCard, Sun, Moon, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { NotificationsDropdown } from "./NotificationsDropdown";
import exavoLogo from "@/assets/exavo-logo.png";

interface PortalHeaderProps {
  isMobile?: boolean;
  onMenuToggle?: () => void;
}

export function PortalHeader({ isMobile, onMenuToggle }: PortalHeaderProps) {
  const { user, userProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const firstName = userProfile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 w-full">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {isMobile && onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="md:hidden shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <img src={exavoLogo} alt="Exavo AI" className="h-7 sm:h-8 w-auto shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold truncate">
            Hello, {firstName}! 👋
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block truncate">
            Welcome to your AI workspace
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Notifications */}
        <NotificationsDropdown />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{firstName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/client/settings")}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/client/subscriptions")}>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
