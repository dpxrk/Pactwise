'use client';

import React, { useState, useEffect } from 'react';
import { useConvexQuery, useConvexMutation } from '@/lib/api-client';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import { format, formatDistanceToNow } from 'date-fns';

// UI Components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Icons
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Settings,
  FileText,
  Building,
  AlertTriangle,
  Calendar,
  CreditCard,
  Users,
  Shield,
  Zap,
  Clock,
  Eye,
  ExternalLink,
  Archive,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  variant?: 'popover' | 'sheet' | 'inline';
  showUnreadCount?: boolean;
  maxHeight?: string;
  className?: string;
}

type NotificationWithRelations = {
  _id: Id<"notifications">;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  contract?: {
    _id: Id<"contracts">;
    title: string;
    status: string;
  };
  vendor?: {
    _id: Id<"vendors">;
    name: string;
    category?: string;
  };
};

// Priority colors
const priorityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
};

// Type icons
const typeIcons = {
  contract_expiration: Calendar,
  contract_created: FileText,
  approval_required: CheckCheck,
  payment_reminder: CreditCard,
  vendor_risk_alert: AlertTriangle,
  compliance_issue: Shield,
  task_assigned: Users,
  system_alert: Zap,
  digest: Bell,
};

export const NotificationCenter = ({
  variant = 'popover',
  showUnreadCount = true,
  maxHeight = 'max-h-96',
  className
}: NotificationCenterProps) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [selectedTab, setSelectedTab] = useState('all');

  // Queries
  const notificationArgs: {
    limit: number;
    includeRead: boolean;
    priority?: 'high';
  } = { 
    limit: 50, 
    includeRead: filter !== 'unread',
  };
  
  if (filter === 'high') {
    notificationArgs.priority = 'high';
  }
  
  const { data: notificationData, isLoading } = useConvexQuery(
    api.notifications.getMyNotifications,
    notificationArgs
  );

  const { data: unreadCount } = useConvexQuery(
    api.notifications.getUnreadCount,
    {}
  );

  // Mutations
  const markAsRead = useConvexMutation(api.notifications.markAsRead);
  const markAllAsRead = useConvexMutation(api.notifications.markAllAsRead);
  const dismissNotification = useConvexMutation(api.notifications.dismissNotification);

  const notifications = notificationData?.notifications || [];
  const totalUnread = unreadCount?.total || 0;

  // Filter notifications based on selected tab
  const filteredNotifications = notifications.filter(notification => {
    switch (selectedTab) {
      case 'unread':
        return !notification.isRead;
      case 'contracts':
        return ['contract_expiration', 'contract_created'].includes(notification.type);
      case 'approvals':
        return notification.type === 'approval_required';
      case 'alerts':
        return ['vendor_risk_alert', 'compliance_issue', 'system_alert'].includes(notification.type);
      default:
        return true;
    }
  });

  // Handlers
  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    try {
      await markAsRead.execute({ notificationId });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.execute({});
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDismiss = async (notificationId: Id<"notifications">) => {
    try {
      await dismissNotification.execute({ notificationId });
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const handleNotificationClick = async (notification: NotificationWithRelations) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  // Render notification item
  const renderNotificationItem = (notification: NotificationWithRelations) => {
    const IconComponent = typeIcons[notification.type as keyof typeof typeIcons] || Bell;
    const priorityColor = priorityColors[notification.priority];

    return (
      <div
        key={notification._id}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
          notification.isRead 
            ? 'bg-muted/20 border-muted' 
            : 'bg-background border-border hover:bg-muted/30',
          notification.priority === 'critical' && !notification.isRead && 'ring-2 ring-red-200'
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        {/* Icon and priority indicator */}
        <div className="flex-shrink-0 relative">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            notification.isRead ? 'bg-muted' : priorityColor
          )}>
            <IconComponent className={cn(
              'h-4 w-4',
              notification.isRead ? 'text-muted-foreground' : 'text-current'
            )} />
          </div>
          {!notification.isRead && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                notification.isRead ? 'text-muted-foreground' : 'text-foreground'
              )}>
                {notification.title}
              </p>
              <p className={cn(
                'text-xs mt-1 line-clamp-2',
                notification.isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'
              )}>
                {notification.message}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification._id);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(notification._id);
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            
            {notification.contract && (
              <>
                <span>•</span>
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-24">{notification.contract.title}</span>
              </>
            )}
            
            {notification.vendor && (
              <>
                <span>•</span>
                <Building className="h-3 w-3" />
                <span className="truncate max-w-24">{notification.vendor.name}</span>
              </>
            )}

            {notification.priority !== 'medium' && (
              <>
                <span>•</span>
                <Badge variant="outline" className={cn(priorityColor, 'text-xs px-1 py-0')}>
                  {notification.priority}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (filteredNotifications.length === 0) {
      return (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            {selectedTab === 'unread' ? 'No unread notifications' : 'No notifications'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedTab === 'unread' 
              ? "You're all caught up!" 
              : 'Notifications will appear here when you have updates'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {filteredNotifications.map(renderNotificationItem)}
      </div>
    );
  };

  // Render trigger button
  const triggerButton = (
    <Button
      variant="ghost"
      size="sm"
      className={cn("relative", className)}
    >
      {totalUnread > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      {showUnreadCount && totalUnread > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {totalUnread > 99 ? '99+' : totalUnread}
        </Badge>
      )}
    </Button>
  );

  // Render header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      {filteredNotifications.some(n => !n.isRead) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllAsRead}
          className="text-xs"
        >
          <CheckCheck className="h-4 w-4 mr-1" />
          Mark all read
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );

  // Render tabs
  const tabs = (
    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5 h-8">
        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
        <TabsTrigger value="unread" className="text-xs">
          Unread
          {totalUnread > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
              {totalUnread}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="contracts" className="text-xs">Contracts</TabsTrigger>
        <TabsTrigger value="approvals" className="text-xs">Approvals</TabsTrigger>
        <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
      </TabsList>
      
      <TabsContent value={selectedTab} className="mt-4">
        <ScrollArea className={cn(maxHeight)}>
          {renderContent()}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );

  // Render based on variant
  switch (variant) {
    case 'sheet':
      return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            {triggerButton}
          </SheetTrigger>
          <SheetContent side="right" className="w-96">
            <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </SheetTitle>
              {headerActions}
            </SheetHeader>
            {tabs}
          </SheetContent>
        </Sheet>
      );

    case 'inline':
      return (
        <Card className={className}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            {headerActions}
          </CardHeader>
          <CardContent>
            {tabs}
          </CardContent>
        </Card>
      );

    default: // popover
      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="flex items-center gap-2 font-semibold">
                <Bell className="h-5 w-5" />
                Notifications
              </h4>
              {headerActions}
            </div>
            <div className="p-4">
              {tabs}
            </div>
          </PopoverContent>
        </Popover>
      );
  }
};

export default NotificationCenter;