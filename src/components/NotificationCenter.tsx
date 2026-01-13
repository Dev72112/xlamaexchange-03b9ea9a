import { useState, useEffect, memo, useCallback } from "react";
import { Bell, Check, CheckCheck, X, ArrowUpRight, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { notificationService, type AppNotification } from "@/services/notificationService";

interface Notification {
  id: string;
  type: "transaction" | "alert" | "order" | "system";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "transaction":
      return <ArrowUpRight className="w-4 h-4" />;
    case "alert":
      return <TrendingUp className="w-4 h-4" />;
    case "order":
      return <Zap className="w-4 h-4" />;
    case "system":
      return <AlertTriangle className="w-4 h-4" />;
  }
};

const getNotificationColor = (type: Notification["type"]) => {
  switch (type) {
    case "transaction":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "alert":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "order":
      return "bg-primary/10 text-primary border-primary/20";
    case "system":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }
};

export const NotificationCenter = memo(function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  // Subscribe to notification service updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });
    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    hapticFeedback("light");
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    hapticFeedback("medium");
    notificationService.markAllAsRead();
  }, []);

  const dismissNotification = useCallback((id: string) => {
    hapticFeedback("light");
    notificationService.dismiss(id);
  }, []);

  const clearAll = useCallback(() => {
    hapticFeedback("medium");
    notificationService.clearAll();
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md glass border-l border-border/50">
        <SheetHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-10rem)] mt-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full glass border border-border/50 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative p-4 rounded-xl glass border transition-all",
                    notification.read
                      ? "border-border/30 opacity-70"
                      : "border-primary/20 glow-sm"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                        getNotificationColor(notification.type)
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => markAsRead(notification.id)}
                          aria-label="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => dismissNotification(notification.id)}
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {notification.link && (
                    <a
                      href={notification.link}
                      className="absolute inset-0 rounded-xl"
                      onClick={() => {
                        markAsRead(notification.id);
                        setOpen(false);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="pt-4 border-t border-border/50 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="w-full text-muted-foreground"
            >
              Clear all notifications
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
});
