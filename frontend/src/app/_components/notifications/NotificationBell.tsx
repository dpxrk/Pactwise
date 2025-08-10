'use client';

import React, { useState } from 'react';
import { useNotifications, useNotificationMutations } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tables } from '@/types/database.types';

type Notification = Tables<'notifications'>;

const priorityIcons = {
  low: Info,
  medium: AlertCircle,
  high: XCircle,
  urgent: XCircle,
};

const priorityColors = {
  low: 'text-blue-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch notifications with real-time updates
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    refetch 
  } = useNotifications({
    limit: 20,
    realtime: true,
  });

  const { 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    isLoading: isMutating 
  } = useNotificationMutations();

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId, {
      onSuccess: () => {
        console.log('Notification marked as read');
      },
      onError: (error) => {
        console.error('Failed to mark notification as read:', error);
      }
    });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead({
      onSuccess: () => {
        console.log('All notifications marked as read');
      },
      onError: (error) => {
        console.error('Failed to mark all as read:', error);
      }
    });
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId, {
      onSuccess: () => {
        console.log('Notification deleted');
      },
      onError: (error) => {
        console.error('Failed to delete notification:', error);
      }
    });
  };

  const getNotificationIcon = (notification: Notification) => {
    const Icon = priorityIcons[notification.priority || 'low'];
    const color = priorityColors[notification.priority || 'low'];
    return <Icon className={cn('h-4 w-4', color)} />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
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
              disabled={isMutating}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                    !notification.is_read && 'bg-muted/30'
                  )}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm',
                      !notification.is_read && 'font-medium'
                    )}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true 
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        disabled={isMutating}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      disabled={isMutating}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center justify-center text-sm"
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/dashboard/notifications';
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}