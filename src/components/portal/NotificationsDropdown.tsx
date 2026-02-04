import { useState, useEffect } from "react";
import { Bell, CheckCheck, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { resolveNotificationRoute } from "@/lib/notificationRouteResolver";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
  priority?: string;
  event_type?: string;
  read_at?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: unknown;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    const unsubscribe = subscribeToNotifications();
    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel("client-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasHighPriority = notifications.some(n => !n.read && n.priority === "high");

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notification.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      );

      // Use safe route resolver for client users
      const safeRoute = resolveNotificationRoute(
        {
          link: notification.link,
          eventType: notification.event_type,
          entityType: notification.entity_type,
          entityId: notification.entity_id,
          metadata: notification.metadata as Record<string, unknown> | null | undefined,
        },
        'client'
      );
      
      navigate(safeRoute);
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

      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

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
            "h-9 w-9 shrink-0 relative",
            hasHighPriority && "animate-pulse"
          )}
        >
          <Bell className={cn("h-4 w-4", hasHighPriority && "text-destructive")} />
          {unreadCount > 0 && (
            <Badge 
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs",
                hasHighPriority && "bg-destructive"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
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
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer",
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
                      "w-2 h-2 rounded-full flex-shrink-0 mt-1",
                      notification.priority === "high" ? "bg-destructive" : "bg-primary"
                    )} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-5">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground pl-5">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
