import { Globe, User, LogOut, Settings as SettingsIcon, CreditCard, Sun, Moon, Menu } from "lucide-react";
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
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6">
      {/* Left: Mobile menu + Greeting with small logo */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger menu */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuToggle}
            className="mr-2"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <img src={exavoLogo} alt="Exavo AI" className="h-6 hidden sm:block" />
        <div>
          <h2 className="text-base md:text-lg font-semibold">
            Hello, {firstName}! 👋
          </h2>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Welcome to your AI workspace
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications */}
        <NotificationsDropdown />

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hover:scale-105 transition-transform"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Globe className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage("en")}>
              🇬🇧 English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("ar")}>
              🇸🇦 العربية
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{firstName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/client/settings")}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/client/subscriptions")}>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing & Subscription
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
