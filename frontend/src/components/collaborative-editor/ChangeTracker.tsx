'use client';

import { useState, useEffect, useMemo } from 'react';
import { History, Check, X, ChevronDown, ChevronUp, User } from 'lucide-react';
import * as Y from 'yjs';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface TrackedChange {
  id: string;
  type: 'insert' | 'delete' | 'format';
  content: string;
  author: {
    id: string;
    name: string;
    color: string;
  };
  timestamp: Date;
  position: {
    from: number;
    to: number;
  };
  accepted?: boolean;
  rejected?: boolean;
}

interface ChangeTrackerProps {
  doc: Y.Doc | null;
  changes: TrackedChange[];
  onAccept: (changeId: string) => void;
  onReject: (changeId: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  currentUserId: string;
}

// ============================================================================
// CHANGE TRACKER
// ============================================================================

export function ChangeTracker({
  changes,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  currentUserId,
}: ChangeTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'mine'>('all');

  const filteredChanges = useMemo(() => {
    return changes.filter((change) => {
      if (change.accepted || change.rejected) return false;
      if (filter === 'pending') return true;
      if (filter === 'mine') return change.author.id === currentUserId;
      return true;
    });
  }, [changes, filter, currentUserId]);

  const stats = useMemo(() => ({
    total: changes.length,
    pending: changes.filter((c) => !c.accepted && !c.rejected).length,
    accepted: changes.filter((c) => c.accepted).length,
    rejected: changes.filter((c) => c.rejected).length,
    insertions: changes.filter((c) => c.type === 'insert').length,
    deletions: changes.filter((c) => c.type === 'delete').length,
  }), [changes]);

  return (
    <div className="border border-ghost-300 bg-white">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-ghost-50 border-b border-ghost-300 hover:bg-ghost-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-ghost-600" />
          <span className="font-mono text-sm font-semibold text-purple-900">
            TRACK CHANGES
          </span>
          {stats.pending > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 font-mono text-xs rounded">
              {stats.pending}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-ghost-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ghost-400" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Stats */}
          <div className="px-4 py-2 bg-ghost-50 border-b border-ghost-200">
            <div className="flex items-center gap-4 text-ghost-600 font-mono text-xs">
              <span className="text-green-600">
                +{stats.insertions} insertions
              </span>
              <span className="text-red-600">
                -{stats.deletions} deletions
              </span>
              <span className="text-ghost-400">|</span>
              <span>{stats.accepted} accepted</span>
              <span>{stats.rejected} rejected</span>
            </div>
          </div>

          {/* Filter & Actions */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-ghost-200">
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="px-2 py-1 font-mono text-xs border border-ghost-300 bg-white focus:border-purple-900 focus:outline-none"
              >
                <option value="all">All Changes</option>
                <option value="pending">Pending Only</option>
                <option value="mine">My Changes</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onAcceptAll}
                disabled={stats.pending === 0}
                className="flex items-center gap-1 px-2 py-1 font-mono text-xs text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-3 w-3" />
                Accept All
              </button>
              <button
                onClick={onRejectAll}
                disabled={stats.pending === 0}
                className="flex items-center gap-1 px-2 py-1 font-mono text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-3 w-3" />
                Reject All
              </button>
            </div>
          </div>

          {/* Changes List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredChanges.length === 0 ? (
              <div className="py-8 text-center">
                <History className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                <p className="font-mono text-sm text-ghost-500">
                  No pending changes
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ghost-200">
                {filteredChanges.map((change) => (
                  <ChangeItem
                    key={change.id}
                    change={change}
                    onAccept={() => onAccept(change.id)}
                    onReject={() => onReject(change.id)}
                    isOwn={change.author.id === currentUserId}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// CHANGE ITEM
// ============================================================================

interface ChangeItemProps {
  change: TrackedChange;
  onAccept: () => void;
  onReject: () => void;
  isOwn: boolean;
}

function ChangeItem({ change, onAccept, onReject, isOwn }: ChangeItemProps) {
  const typeConfig = {
    insert: {
      label: 'Insert',
      color: 'text-green-700 bg-green-50',
      contentClass: 'text-green-700 bg-green-50',
    },
    delete: {
      label: 'Delete',
      color: 'text-red-700 bg-red-50',
      contentClass: 'text-red-700 bg-red-50 line-through',
    },
    format: {
      label: 'Format',
      color: 'text-blue-700 bg-blue-50',
      contentClass: 'text-blue-700 bg-blue-50',
    },
  }[change.type];

  const timeSince = useMemo(() => {
    const seconds = Math.floor((Date.now() - change.timestamp.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return change.timestamp.toLocaleDateString();
  }, [change.timestamp]);

  return (
    <div className="p-3 hover:bg-ghost-50">
      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: change.author.color }}
        >
          <User className="h-3 w-3 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-medium text-ghost-900">
              {change.author.name}
              {isOwn && <span className="text-ghost-400 ml-1">(You)</span>}
            </span>
            <span className={cn('px-1.5 py-0.5 font-mono text-xs rounded', typeConfig.color)}>
              {typeConfig.label}
            </span>
            <span className="font-mono text-xs text-ghost-400">{timeSince}</span>
          </div>

          {/* Change Content */}
          <div className={cn('font-mono text-sm px-2 py-1 rounded', typeConfig.contentClass)}>
            {change.content.length > 100
              ? change.content.slice(0, 100) + '...'
              : change.content || '(empty)'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onAccept}
            className="p-1.5 text-ghost-400 hover:text-green-600 hover:bg-green-50 rounded"
            title="Accept change"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={onReject}
            className="p-1.5 text-ghost-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Reject change"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: Extract changes from Yjs doc (simplified)
// ============================================================================

export function extractChangesFromYDoc(doc: Y.Doc, userId: string): TrackedChange[] {
  // This is a simplified implementation
  // In a real app, you'd track changes as they happen
  // or use a dedicated change tracking extension
  const changes: TrackedChange[] = [];

  // Get the main text type
  const text = doc.getText('content');
  if (!text) return changes;

  // For now, return empty - actual implementation would:
  // 1. Use Y.UndoManager to track changes
  // 2. Store changes in a separate Y.Array
  // 3. Compare document versions

  return changes;
}
