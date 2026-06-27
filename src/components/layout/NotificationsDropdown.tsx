import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  AlertTriangle,
  FileText,
  BarChart3,
  CheckCheck,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/services/api';
import { ApiError } from '@/lib/apiClient';

interface Notification {
  id: string;
  type: 'alert' | 'report' | 'survey' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function inferType(title: string): Notification['type'] {
  const lower = title.toLowerCase();
  if (lower.includes('survey')) return 'survey';
  if (lower.includes('report')) return 'report';
  if (lower.includes('risk') || lower.includes('alert') || lower.includes('engagement')) return 'alert';
  return 'system';
}

function mapNotification(row: { id: string; title: string; message: string; read: boolean; createdAt: string }): Notification {
  return {
    id: row.id,
    type: inferType(row.title),
    title: row.title,
    description: row.message,
    time: formatRelativeTime(row.createdAt),
    read: row.read,
  };
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await api.notifications.list();
      setNotifications(rows.map(mapNotification));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to load notifications';
      toast.error('Notifications unavailable', { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'report':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'survey':
        return <BarChart3 className="h-4 w-4 text-success" />;
      case 'system':
        return <Bell className="h-4 w-4 text-white/60" />;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Update failed';
      toast.error('Could not mark notifications as read', { description: message });
    }
  };

  const handleNotificationClick = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.read) {
      if (notification) {
        toast.info(notification.title, { description: notification.description });
      }
      return;
    }

    try {
      await api.notifications.markRead(id);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Update failed';
      toast.error('Could not update notification', { description: message });
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    toast.info('Notifications', { description: `${notifications.length} notifications loaded` });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="glass-button h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-medium animate-scale-in"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0 glass-card border-white/10"
        sideOffset={8}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs text-white/60 hover:text-white h-7 px-2"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="divide-y divide-white/5">
            {isLoading && notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-white/50">Loading notifications...</div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-white/50">No notifications yet</div>
            )}
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id)}
                className={`p-4 cursor-pointer transition-all duration-200 hover:bg-white/5 animate-slide-in-right ${
                  !notification.read ? 'bg-white/[0.02]' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${
                    notification.type === 'alert' ? 'bg-warning/10' :
                    notification.type === 'report' ? 'bg-primary/10' :
                    notification.type === 'survey' ? 'bg-success/10' :
                    'bg-white/5'
                  }`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${
                        !notification.read ? 'text-white' : 'text-white/70'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                      {notification.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-white/40">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{notification.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-white/10">
          <Button
            variant="ghost"
            className="w-full text-sm text-white/60 hover:text-white hover:bg-white/5"
            onClick={handleViewAll}
          >
            View all notifications
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
