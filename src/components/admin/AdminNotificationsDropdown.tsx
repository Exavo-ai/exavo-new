import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Info, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
  priority?: string;
  event_type?: string;
  role?: string;
}

export function AdminNotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    
    // Set up real-time subscription
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Show toast for new notification with priority styling
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.priority === "high" ? "destructive" : "default",
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read) {
      if (notification.link) {
        navigate(notification.link);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notification.id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );

      if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasHighPriority = notifications.some(n => !n.read && n.priority === "high");

  const getPriorityStyles = (priority?: string, read?: boolean) => {
    if (read) return "";
    
    switch (priority) {
      case "high":
        return "border-l-4 border-l-destructive bg-destructive/5";
      case "low":
        return "opacity-80";
      default:
        return "bg-muted/50";
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
      case "low":
        return <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-9 w-9 relative shrink-0",
            hasHighPriority && "animate-pulse"
          )}
        >
          <Bell className={cn("h-4 w-4", hasHighPriority && "text-destructive")} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center font-medium",
              hasHighPriority 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-primary text-primary-foreground"
            )}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start p-3 cursor-pointer",
                  getPriorityStyles(notification.priority, notification.read)
                )}
                onClick={() => handleMarkAsRead(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getPriorityIcon(notification.priority)}
                    <p className={cn(
                      "font-medium text-sm truncate",
                      notification.priority === "high" && !notification.read && "text-destructive"
                    )}>
                      {notification.title}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0 mt-1",
                      notification.priority === "high" ? "bg-destructive" : "bg-primary"
                    )} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 pl-5">
                  {notification.message}
                </p>
                <span className="text-xs text-muted-foreground mt-2 pl-5">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
