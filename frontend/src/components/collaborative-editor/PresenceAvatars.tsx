'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { RemoteUser } from './hooks/useAwareness';
import { getContrastColor } from './hooks/useAwareness';
import { cn } from '@/lib/utils';

// ============================================================================
// PRESENCE AVATARS
// ============================================================================

interface PresenceAvatarsProps {
  currentUser: {
    name: string;
    color: string;
  };
  remoteUsers: RemoteUser[];
  maxVisible?: number;
}

export function PresenceAvatars({
  currentUser,
  remoteUsers,
  maxVisible = 5,
}: PresenceAvatarsProps) {
  // Filter out stale users (inactive for more than 5 minutes)
  const activeUsers = useMemo(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return remoteUsers.filter((user) => user.lastActive > fiveMinutesAgo);
  }, [remoteUsers]);

  const visibleUsers = activeUsers.slice(0, maxVisible - 1); // -1 for current user
  const overflowCount = activeUsers.length - visibleUsers.length;
  const totalUsers = activeUsers.length + 1; // Include current user

  return (
    <div className="flex items-center gap-2">
      {/* User count */}
      <div className="flex items-center gap-1 px-2 py-1 bg-ghost-100 rounded">
        <Users className="h-3 w-3 text-ghost-600" />
        <span className="font-mono text-xs text-ghost-600">
          {totalUsers}
        </span>
      </div>

      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {/* Current user (always first) */}
        <Avatar
          name={currentUser.name}
          color={currentUser.color}
          isCurrentUser
        />

        {/* Remote users */}
        {visibleUsers.map((user) => (
          <Avatar
            key={user.id}
            name={user.name}
            color={user.color}
          />
        ))}

        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <div className="relative z-0 w-8 h-8 rounded-full bg-ghost-200 border-2 border-white flex items-center justify-center">
            <span className="font-mono text-xs text-ghost-600">
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

interface AvatarProps {
  name: string;
  color: string;
  isCurrentUser?: boolean;
}

function Avatar({ name, color, isCurrentUser }: AvatarProps) {
  const initials = useMemo(() => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  const textColor = getContrastColor(color);

  return (
    <div
      className={cn(
        'relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center cursor-default',
        isCurrentUser ? 'z-10' : 'z-0'
      )}
      style={{ backgroundColor: color }}
      title={isCurrentUser ? `${name} (You)` : name}
    >
      <span
        className="font-mono text-xs font-medium"
        style={{ color: textColor }}
      >
        {initials}
      </span>

      {/* Online indicator */}
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
    </div>
  );
}

// ============================================================================
// PRESENCE LIST (Detailed View)
// ============================================================================

interface PresenceListProps {
  currentUser: {
    name: string;
    color: string;
  };
  remoteUsers: RemoteUser[];
}

export function PresenceList({ currentUser, remoteUsers }: PresenceListProps) {
  return (
    <div className="border border-ghost-300 bg-white p-4">
      <h4 className="font-mono text-xs font-semibold text-ghost-500 uppercase mb-3">
        Collaborators
      </h4>
      <div className="space-y-2">
        {/* Current user */}
        <PresenceListItem
          name={currentUser.name}
          color={currentUser.color}
          isCurrentUser
          status="editing"
        />

        {/* Remote users */}
        {remoteUsers.map((user) => (
          <PresenceListItem
            key={user.id}
            name={user.name}
            color={user.color}
            status={user.cursor ? 'editing' : 'viewing'}
          />
        ))}

        {remoteUsers.length === 0 && (
          <p className="font-mono text-xs text-ghost-400 text-center py-2">
            No other editors
          </p>
        )}
      </div>
    </div>
  );
}

interface PresenceListItemProps {
  name: string;
  color: string;
  isCurrentUser?: boolean;
  status: 'editing' | 'viewing' | 'idle';
}

function PresenceListItem({ name, color, isCurrentUser, status }: PresenceListItemProps) {
  const initials = useMemo(() => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  const textColor = getContrastColor(color);

  const statusLabel = {
    editing: 'Editing',
    viewing: 'Viewing',
    idle: 'Idle',
  }[status];

  const statusColor = {
    editing: 'text-green-600',
    viewing: 'text-blue-600',
    idle: 'text-ghost-400',
  }[status];

  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <span
          className="font-mono text-xs font-medium"
          style={{ color: textColor }}
        >
          {initials}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-ghost-900 truncate">
          {name}
          {isCurrentUser && (
            <span className="text-ghost-400 ml-1">(You)</span>
          )}
        </p>
        <p className={cn('font-mono text-xs', statusColor)}>
          {statusLabel}
        </p>
      </div>
    </div>
  );
}
