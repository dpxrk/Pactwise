"use client";

import React, { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Circle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color?: string;
  status?: 'active' | 'idle' | 'away';
  lastSeen?: Date;
  activity?: string;
}

interface PresenceAvatarsProps {
  users: User[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showActivity?: boolean;
  currentUserId?: string;
  className?: string;
}

export function PresenceAvatars({
  users,
  maxVisible = 5,
  size = 'md',
  showStatus = true,
  showActivity = false,
  currentUserId,
  className,
}: PresenceAvatarsProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    away: 'bg-gray-400',
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      // Put current user first
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      
      // Then sort by status (active > idle > away)
      const statusOrder = { active: 0, idle: 1, away: 2 };
      const aOrder = statusOrder[a.status || 'away'];
      const bOrder = statusOrder[b.status || 'away'];
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Finally sort by name
      return a.name.localeCompare(b.name);
    });
  }, [users, currentUserId]);

  const visibleUsers = sortedUsers.slice(0, maxVisible);
  const remainingCount = Math.max(0, sortedUsers.length - maxVisible);

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActivityText = (user: User) => {
    if (!user.activity) return 'Viewing';
    return user.activity;
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Active now';
      case 'idle':
        return 'Away';
      default:
        return 'Offline';
    }
  };

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        <div className="flex -space-x-3">
          {visibleUsers.map((user, index) => (
            <Tooltip key={user.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative inline-block rounded-full ring-2 ring-background',
                    user.id === currentUserId && 'ring-primary',
                    sizeClasses[size]
                  )}
                  style={{ zIndex: maxVisible - index }}
                >
                  <Avatar className={cn('border-2', sizeClasses[size])}>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback
                      style={{
                        backgroundColor: user.color || `hsl(${user.id.charCodeAt(0) * 10}, 70%, 60%)`,
                      }}
                      className="text-white font-medium"
                    >
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {showStatus && user.status && (
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
                        statusColors[user.status],
                        size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'
                      )}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    {user.id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  {showStatus && (
                    <div className="flex items-center gap-2 text-xs">
                      <Circle
                        className={cn('h-2 w-2 fill-current', statusColors[user.status || 'away'])}
                      />
                      <span>{getStatusText(user.status)}</span>
                      {user.status !== 'active' && user.lastSeen && (
                        <span className="text-muted-foreground">
                          • {formatLastSeen(user.lastSeen)}
                        </span>
                      )}
                    </div>
                  )}
                  {showActivity && user.activity && (
                    <div className="text-xs text-muted-foreground">
                      {getActivityText(user)}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background',
                    sizeClasses[size]
                  )}
                >
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{remainingCount} more {remainingCount === 1 ? 'person' : 'people'}</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {sortedUsers.slice(maxVisible).map(user => (
                      <div key={user.id} className="text-xs flex items-center gap-2">
                        {showStatus && (
                          <Circle
                            className={cn('h-2 w-2 fill-current', statusColors[user.status || 'away'])}
                          />
                        )}
                        <span>{user.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{users.length} {users.length === 1 ? 'person' : 'people'}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Presence indicator component for individual use
interface PresenceIndicatorProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showActivity?: boolean;
  className?: string;
}

export function PresenceIndicator({
  user,
  size = 'md',
  showName = true,
  showActivity = false,
  className,
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    away: 'bg-gray-400',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback
            style={{
              backgroundColor: user.color || `hsl(${user.id.charCodeAt(0) * 10}, 70%, 60%)`,
            }}
            className="text-white text-xs font-medium"
          >
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        {user.status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
              statusColors[user.status],
              size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3'
            )}
          />
        )}
      </div>
      {showName && (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.name}</span>
          {showActivity && user.activity && (
            <span className="text-xs text-muted-foreground">{user.activity}</span>
          )}
        </div>
      )}
    </div>
  );
}