import { useNavigate } from "react-router-dom";
import { Menu, Sun, Moon, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import exavoLogo from "@/assets/exavo-logo.png";
import { AdminNotificationsDropdown } from "./AdminNotificationsDropdown";

interface AdminHeaderProps {
  isMobile?: boolean;
  onMenuToggle?: () => void;
}

export function AdminHeader({ isMobile, onMenuToggle }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } else {
      navigate("/login");
    }
  };

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
        <img src={exavoLogo} alt="Exavo" className="h-7 sm:h-8 w-auto shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold truncate">
            Hello, {userName}! 👋
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block truncate">
            Welcome to your AI workspace
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Notifications */}
        <AdminNotificationsDropdown />

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
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">A</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
              <User className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
