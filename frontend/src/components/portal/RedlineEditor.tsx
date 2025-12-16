'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Minus,
  Edit3,
  MessageSquare,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import type { RedlineChange, RedlineSubmission } from '@/types/portal.types';
import { cn } from '@/lib/utils';

// ============================================================================
// REDLINE EDITOR
// ============================================================================

type RedlineType = 'insert' | 'delete' | 'replace' | 'comment';

export function RedlineEditor() {
  const { getRedlines, submitRedline, isLoading, error } = usePortal();

  const [redlines, setRedlines] = useState<RedlineChange[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<RedlineType>('replace');
  const [formData, setFormData] = useState({
    original_text: '',
    new_text: '',
    comment: '',
    start_position: 0,
    end_position: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // Load redlines
  useEffect(() => {
    const load = async () => {
      const data = await getRedlines();
      setRedlines(data);
    };
    load();
  }, [getRedlines]);

  // Refresh redlines
  const handleRefresh = useCallback(async () => {
    const data = await getRedlines();
    setRedlines(data);
  }, [getRedlines]);

  // Submit new redline
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const submission: RedlineSubmission = {
      redline_type: selectedType,
      start_position: formData.start_position,
      end_position: formData.end_position || undefined,
      original_text: formData.original_text || undefined,
      new_text: formData.new_text || undefined,
      comment: formData.comment || undefined,
    };

    const id = await submitRedline(submission);
    setSubmitting(false);

    if (id) {
      setShowAddForm(false);
      setFormData({
        original_text: '',
        new_text: '',
        comment: '',
        start_position: 0,
        end_position: 0,
      });
      await handleRefresh();
    }
  }, [selectedType, formData, submitRedline, handleRefresh]);

  // Cancel form
  const handleCancel = useCallback(() => {
    setShowAddForm(false);
    setFormData({
      original_text: '',
      new_text: '',
      comment: '',
      start_position: 0,
      end_position: 0,
    });
  }, []);

  const redlineTypeConfig = {
    insert: { icon: Plus, label: 'Insert', color: 'text-green-600 bg-green-50 border-green-200' },
    delete: { icon: Minus, label: 'Delete', color: 'text-red-600 bg-red-50 border-red-200' },
    replace: { icon: Edit3, label: 'Replace', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    comment: { icon: MessageSquare, label: 'Comment', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  };

  return (
    <div className="border border-ghost-300 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ghost-300 bg-ghost-50">
        <h3 className="font-mono text-sm font-semibold text-purple-900">
          REDLINE CHANGES
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 hover:bg-ghost-200 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4 text-ghost-600', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs bg-purple-900 text-white hover:bg-purple-800"
          >
            <Plus className="h-3 w-3" />
            ADD CHANGE
          </button>
        </div>
      </div>

      {/* Add Redline Form */}
      {showAddForm && (
        <div className="p-4 border-b border-ghost-300 bg-purple-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div>
              <p className="font-mono text-xs text-ghost-600 mb-2">Change Type</p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(redlineTypeConfig) as [RedlineType, typeof redlineTypeConfig.insert][]).map(
                  ([type, config]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        'flex items-center justify-center gap-2 px-3 py-2 border font-mono text-xs transition-colors',
                        selectedType === type
                          ? config.color
                          : 'border-ghost-300 text-ghost-600 hover:border-purple-500'
                      )}
                    >
                      <config.icon className="h-3 w-3" />
                      {config.label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Original Text (for delete/replace) */}
            {(selectedType === 'delete' || selectedType === 'replace') && (
              <div>
                <label className="font-mono text-xs text-ghost-600 block mb-1">
                  Original Text
                </label>
                <textarea
                  value={formData.original_text}
                  onChange={(e) => setFormData((f) => ({ ...f, original_text: e.target.value }))}
                  placeholder="Enter the text to be changed..."
                  className="w-full px-3 py-2 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none h-20 resize-none"
                  required
                />
              </div>
            )}

            {/* New Text (for insert/replace) */}
            {(selectedType === 'insert' || selectedType === 'replace') && (
              <div>
                <label className="font-mono text-xs text-ghost-600 block mb-1">
                  New Text
                </label>
                <textarea
                  value={formData.new_text}
                  onChange={(e) => setFormData((f) => ({ ...f, new_text: e.target.value }))}
                  placeholder="Enter the new text..."
                  className="w-full px-3 py-2 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none h-20 resize-none"
                  required
                />
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="font-mono text-xs text-ghost-600 block mb-1">
                {selectedType === 'comment' ? 'Comment' : 'Reason (optional)'}
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData((f) => ({ ...f, comment: e.target.value }))}
                placeholder={
                  selectedType === 'comment'
                    ? 'Enter your comment...'
                    : 'Explain why this change is needed...'
                }
                className="w-full px-3 py-2 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none h-16 resize-none"
                required={selectedType === 'comment'}
              />
            </div>

            {/* Position (simplified for now) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-xs text-ghost-600 block mb-1">
                  Start Position
                </label>
                <input
                  type="number"
                  value={formData.start_position}
                  onChange={(e) => setFormData((f) => ({ ...f, start_position: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none"
                  min={0}
                />
              </div>
              {selectedType !== 'insert' && (
                <div>
                  <label className="font-mono text-xs text-ghost-600 block mb-1">
                    End Position
                  </label>
                  <input
                    type="number"
                    value={formData.end_position}
                    onChange={(e) => setFormData((f) => ({ ...f, end_position: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none"
                    min={0}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 font-mono text-xs text-ghost-600 hover:text-ghost-900"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 font-mono text-xs bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    SUBMIT CHANGE
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 py-3 border-b border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="font-mono text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Redlines List */}
      <div className="max-h-[500px] overflow-y-auto">
        {isLoading && redlines.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : redlines.length === 0 ? (
          <div className="py-12 text-center">
            <Edit3 className="h-8 w-8 text-ghost-300 mx-auto mb-3" />
            <p className="font-mono text-sm text-ghost-500">No redline changes yet</p>
            <p className="font-mono text-xs text-ghost-400 mt-1">
              Click &quot;Add Change&quot; to suggest edits
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ghost-200">
            {redlines.map((redline) => (
              <RedlineItem key={redline.id} redline={redline} config={redlineTypeConfig} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-ghost-300 bg-ghost-50">
        <p className="font-mono text-xs text-ghost-500">
          {redlines.length} change{redlines.length !== 1 ? 's' : ''} •
          {redlines.filter((r) => r.status === 'pending').length} pending review
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// REDLINE ITEM
// ============================================================================

function RedlineItem({
  redline,
  config,
}: {
  redline: RedlineChange;
  config: Record<string, { icon: LucideIcon; label: string; color: string }>;
}) {
  const typeConfig = config[redline.redline_type] || config.comment;
  const Icon = typeConfig.icon;

  const statusClass = {
    pending: 'bg-ghost-100 text-ghost-600',
    accepted: 'bg-green-100 text-green-600',
    rejected: 'bg-red-100 text-red-600',
  }[redline.status];

  return (
    <div className="p-4 hover:bg-ghost-50">
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className={cn('p-2 border rounded', typeConfig.color)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-medium text-ghost-900">
              {typeConfig.label}
            </span>
            <span className={cn('px-2 py-0.5 font-mono text-xs rounded', statusClass)}>
              {redline.status}
            </span>
          </div>

          {/* Change Details */}
          {redline.original_text && (
            <div className="mb-2">
              <p className="font-mono text-xs text-ghost-500 mb-1">Original:</p>
              <p className="font-mono text-sm text-red-700 bg-red-50 px-2 py-1 line-through">
                {redline.original_text}
              </p>
            </div>
          )}
          {redline.new_text && (
            <div className="mb-2">
              <p className="font-mono text-xs text-ghost-500 mb-1">New:</p>
              <p className="font-mono text-sm text-green-700 bg-green-50 px-2 py-1">
                {redline.new_text}
              </p>
            </div>
          )}
          {redline.comment && (
            <div className="mb-2">
              <p className="font-mono text-xs text-ghost-500 mb-1">Comment:</p>
              <p className="font-mono text-sm text-ghost-700 bg-ghost-50 px-2 py-1">
                {redline.comment}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-ghost-400 font-mono text-xs">
            {redline.suggested_by_external && (
              <span>By: {redline.suggested_by_external}</span>
            )}
            <span>{new Date(redline.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
