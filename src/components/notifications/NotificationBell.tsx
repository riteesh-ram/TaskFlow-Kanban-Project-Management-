import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  board_id?: string;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase.channel('user-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 shadow-xl border-border">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {unreadCount} unread
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No notifications</div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const typeClasses: Record<string, string> = {
                      info: 'bg-blue-100 text-blue-700',
                      success: 'bg-emerald-100 text-emerald-700',
                      warning: 'bg-amber-100 text-amber-800',
                      danger: 'bg-red-100 text-red-700',
                    };
                    const typeColor = typeClasses[notification.type] || 'bg-muted text-foreground';

                    return (
                      <button
                        key={notification.id}
                        className={`w-full text-left p-3 transition-all ${
                          notification.read
                            ? 'bg-card'
                            : 'bg-primary/5 hover:bg-primary/10 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                        } ${'hover:translate-y-[-1px]'}`}
                        onClick={async () => {
                          await markAsRead(notification.id);
                          if (notification.board_id) {
                            navigate(`/board/${notification.board_id}`);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-[10px] px-2 py-1 rounded-full capitalize ${typeColor}`}>
                            {notification.type || 'info'}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold leading-tight truncate">{notification.title}</p>
                              {!notification.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                            </div>
                            <p className="text-xs text-muted-foreground leading-snug break-words line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[11px] text-muted-foreground/80">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};