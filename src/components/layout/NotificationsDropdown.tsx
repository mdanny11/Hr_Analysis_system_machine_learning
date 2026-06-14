import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Bell, 
  AlertTriangle, 
  FileText, 
  BarChart3, 
  CheckCheck, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'alert' | 'report' | 'survey' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'High attrition risk detected in Sales',
    description: '5 employees flagged as high risk this week',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'report',
    title: 'New report generated',
    description: 'Weekly Executive Summary is ready',
    time: '4 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'survey',
    title: 'Survey response rate reached 70%',
    description: 'Q1 Pulse Survey is performing well',
    time: '6 hours ago',
    read: false,
  },
  {
    id: '4',
    type: 'alert',
    title: 'Engagement score dropped in Engineering',
    description: 'Down 5% from last month',
    time: '1 day ago',
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Model retrained successfully',
    description: 'Prediction accuracy improved to 94.2%',
    time: '2 days ago',
    read: true,
  },
];

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

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

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    toast.info('Notification clicked (prototype)', {
      description: 'Would navigate to relevant page'
    });
  };

  const handleViewAll = () => {
    setOpen(false);
    toast.info('View All Notifications (prototype)', {
      description: 'Would navigate to notifications page'
    });
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
        {/* Header */}
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

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id)}
                className={`p-4 cursor-pointer transition-all duration-200 hover:bg-white/5 animate-slide-in-right ${
                  !notification.read ? 'bg-white/[0.02]' : ''
                }`}
                style={{ animationDelay: `${parseInt(notification.id) * 50}ms` }}
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

        {/* Footer */}
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
