import { useState, useEffect, useRef } from "react";
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead } from "../../hooks/useNotifications";
import { useAuthStore } from "../../store/auth";
import { getSocket, connectSocket } from "../../lib/socket";
import { Button } from "../ui/button";
import { Bell, CheckCheck } from "lucide-react";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const token = useAuthStore((s) => s.token);
  const { data: unreadData } = useUnreadCount();
  const { data: notifsData } = useNotifications({ limit: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unread = unreadData?.data?.count || 0;
  const notifications = notifsData?.data || [];

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socket.on("notification:new", () => {
      window.location.reload();
    });
  }, [token]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(!open)}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllRead.mutate()}>
                <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b last:border-0 text-sm cursor-pointer transition-colors ${
                    !n.is_read ? "bg-accent/30" : "hover:bg-muted"
                  }`}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.message && <p className="text-muted-foreground text-xs mt-1">{n.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
