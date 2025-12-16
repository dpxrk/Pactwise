// hooks/useAwareness.ts
// Hook for managing cursor/selection awareness in collaborative editing

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseProvider, AwarenessState } from './useYjsDocument';

// ============================================================================
// TYPES
// ============================================================================

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    anchor: number;
    head: number;
  };
  selection?: {
    from: number;
    to: number;
  };
  lastActive: Date;
}

interface UseAwarenessOptions {
  provider: SupabaseProvider | null;
  userId: string;
  userName: string;
  userColor: string;
}

interface UseAwarenessReturn {
  remoteUsers: RemoteUser[];
  updateCursor: (anchor: number, head: number) => void;
  updateSelection: (from: number, to: number) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAwareness(options: UseAwarenessOptions): UseAwarenessReturn {
  const { provider, userId, userName, userColor } = options;
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update remote users from provider awareness
  useEffect(() => {
    if (!provider) return;

    const updateUsers = () => {
      const users: RemoteUser[] = [];
      provider.awareness.forEach((state, id) => {
        if (id !== userId) {
          users.push({
            id: state.userId,
            name: state.userName,
            color: state.userColor,
            cursor: state.cursor,
            selection: state.selection,
            lastActive: new Date(),
          });
        }
      });
      setRemoteUsers(users);
    };

    // Poll for awareness updates
    updateIntervalRef.current = setInterval(updateUsers, 100);
    updateUsers();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [provider, userId]);

  // Update local cursor position
  const updateCursor = useCallback((anchor: number, head: number) => {
    if (!provider) return;
    provider.sendAwareness({
      cursor: { anchor, head },
    });
  }, [provider]);

  // Update local selection
  const updateSelection = useCallback((from: number, to: number) => {
    if (!provider) return;
    provider.sendAwareness({
      selection: { from, to },
    });
  }, [provider]);

  return {
    remoteUsers,
    updateCursor,
    updateSelection,
  };
}

// ============================================================================
// CURSOR COLOR UTILITIES
// ============================================================================

export function getCursorStyles(color: string): {
  cursorColor: string;
  selectionColor: string;
  labelBg: string;
} {
  return {
    cursorColor: color,
    selectionColor: `${color}33`, // 20% opacity
    labelBg: color,
  };
}

export function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}
