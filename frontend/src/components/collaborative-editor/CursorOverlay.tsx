'use client';

import { useMemo } from 'react';

import type { RemoteUser } from './hooks/useAwareness';
import { getContrastColor } from './hooks/useAwareness';

// ============================================================================
// CURSOR OVERLAY
// ============================================================================

interface CursorOverlayProps {
  remoteUsers: RemoteUser[];
  editorElement: HTMLElement | null;
  getPositionFromOffset: (offset: number) => { top: number; left: number } | null;
}

export function CursorOverlay({
  remoteUsers,
  editorElement,
  getPositionFromOffset,
}: CursorOverlayProps) {
  if (!editorElement) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {remoteUsers.map((user) => (
        <RemoteCursor
          key={user.id}
          user={user}
          getPositionFromOffset={getPositionFromOffset}
        />
      ))}
    </div>
  );
}

// ============================================================================
// REMOTE CURSOR
// ============================================================================

interface RemoteCursorProps {
  user: RemoteUser;
  getPositionFromOffset: (offset: number) => { top: number; left: number } | null;
}

function RemoteCursor({ user, getPositionFromOffset }: RemoteCursorProps) {
  const cursorPosition = useMemo(() => {
    if (!user.cursor) return null;
    return getPositionFromOffset(user.cursor.head);
  }, [user.cursor, getPositionFromOffset]);

  const selectionRange = useMemo(() => {
    if (!user.selection || user.selection.from === user.selection.to) return null;

    const fromPos = getPositionFromOffset(user.selection.from);
    const toPos = getPositionFromOffset(user.selection.to);

    if (!fromPos || !toPos) return null;

    return {
      from: fromPos,
      to: toPos,
      isSingleLine: fromPos.top === toPos.top,
    };
  }, [user.selection, getPositionFromOffset]);

  const textColor = getContrastColor(user.color);

  if (!cursorPosition) return null;

  return (
    <>
      {/* Selection highlight */}
      {selectionRange && (
        <SelectionHighlight
          range={selectionRange}
          color={user.color}
        />
      )}

      {/* Cursor line */}
      <div
        className="absolute w-0.5 transition-all duration-75"
        style={{
          backgroundColor: user.color,
          top: cursorPosition.top,
          left: cursorPosition.left,
          height: '1.2em',
        }}
      >
        {/* Cursor flag with name */}
        <div
          className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-t whitespace-nowrap"
          style={{
            backgroundColor: user.color,
            transform: 'translateX(-2px)',
          }}
        >
          <span
            className="font-mono text-xs font-medium"
            style={{ color: textColor }}
          >
            {user.name.split(' ')[0]}
          </span>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// SELECTION HIGHLIGHT
// ============================================================================

interface SelectionHighlightProps {
  range: {
    from: { top: number; left: number };
    to: { top: number; left: number };
    isSingleLine: boolean;
  };
  color: string;
}

function SelectionHighlight({ range, color }: SelectionHighlightProps) {
  if (range.isSingleLine) {
    // Single line selection
    return (
      <div
        className="absolute transition-all duration-75"
        style={{
          backgroundColor: `${color}33`, // 20% opacity
          top: range.from.top,
          left: range.from.left,
          width: range.to.left - range.from.left,
          height: '1.2em',
        }}
      />
    );
  }

  // Multi-line selection would need more complex rendering
  // For now, just show the first line
  return (
    <div
      className="absolute transition-all duration-75"
      style={{
        backgroundColor: `${color}33`,
        top: range.from.top,
        left: range.from.left,
        right: 0,
        height: '1.2em',
      }}
    />
  );
}

// ============================================================================
// CURSOR STYLES (for use with Tiptap/ProseMirror)
// ============================================================================

export function generateCursorCSS(users: RemoteUser[]): string {
  return users.map((user) => `
    .collaboration-cursor-${user.id.replace(/[^a-zA-Z0-9]/g, '')} {
      border-left: 2px solid ${user.color};
      margin-left: -1px;
      position: relative;
    }

    .collaboration-cursor-${user.id.replace(/[^a-zA-Z0-9]/g, '')}::before {
      content: "${user.name.split(' ')[0]}";
      position: absolute;
      top: -1.4em;
      left: -2px;
      background-color: ${user.color};
      color: ${getContrastColor(user.color)};
      font-size: 10px;
      font-family: ui-monospace, monospace;
      padding: 1px 4px;
      border-radius: 2px 2px 2px 0;
      white-space: nowrap;
    }

    .collaboration-selection-${user.id.replace(/[^a-zA-Z0-9]/g, '')} {
      background-color: ${user.color}33;
    }
  `).join('\n');
}
