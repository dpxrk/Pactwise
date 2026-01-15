'use client';

import {
  Send,
  RefreshCw,
  AlertCircle,
  Star,
  MessageSquare,
  User,
  Building2,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { usePortal } from '@/hooks/usePortal';
import { cn } from '@/lib/utils';
import type { NegotiationMessage, MessageSubmission } from '@/types/portal.types';

// ============================================================================
// NEGOTIATION CHAT
// ============================================================================

export function NegotiationChat() {
  const { getMessages, sendMessage, session, isLoading, error } = usePortal();

  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<NegotiationMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages
  useEffect(() => {
    const load = async () => {
      const data = await getMessages();
      setMessages(data);
    };
    load();
  }, [getMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Refresh messages
  const handleRefresh = useCallback(async () => {
    const data = await getMessages();
    setMessages(data);
  }, [getMessages]);

  // Send message
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const submission: MessageSubmission = {
      message_text: newMessage.trim(),
      is_important: isImportant,
      parent_message_id: replyTo?.id,
    };

    const messageId = await sendMessage(submission);
    setSending(false);

    if (messageId) {
      setNewMessage('');
      setIsImportant(false);
      setReplyTo(null);
      await handleRefresh();
    }
  }, [newMessage, isImportant, replyTo, sendMessage, handleRefresh]);

  // Handle reply
  const handleReply = useCallback((message: NegotiationMessage) => {
    setReplyTo(message);
    inputRef.current?.focus();
  }, []);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }, [handleSend]);

  return (
    <div className="border border-ghost-300 bg-white flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ghost-300 bg-ghost-50 flex-shrink-0">
        <h3 className="font-mono text-sm font-semibold text-purple-900">
          NEGOTIATION MESSAGES
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-ghost-200 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4 text-ghost-600', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-3 border-b border-red-200 bg-red-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="font-mono text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="h-8 w-8 text-ghost-300 mx-auto mb-3" />
            <p className="font-mono text-sm text-ghost-500">No messages yet</p>
            <p className="font-mono text-xs text-ghost-400 mt-1">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender_type === 'external'}
                currentPartyName={session?.party_name}
                onReply={() => handleReply(message)}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 border-t border-ghost-200 bg-ghost-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ghost-500">Replying to:</span>
              <span className="font-mono text-xs text-ghost-700 truncate max-w-[200px]">
                {replyTo.sender_name}: {replyTo.message_text}
              </span>
            </div>
            <button
              onClick={cancelReply}
              className="font-mono text-xs text-ghost-500 hover:text-ghost-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-ghost-300 p-4 flex-shrink-0">
        <form onSubmit={handleSend}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="w-full px-3 py-2 font-mono text-sm border border-ghost-300 focus:border-purple-900 focus:outline-none resize-none h-20"
                disabled={sending}
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportant(!isImportant)}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isImportant
                      ? 'text-amber-500 bg-amber-50'
                      : 'text-ghost-400 hover:text-amber-500'
                  )}
                  title={isImportant ? 'Marked as important' : 'Mark as important'}
                >
                  <Star className="h-4 w-4" fill={isImportant ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed self-end"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="font-mono text-xs text-ghost-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

function MessageBubble({
  message,
  isOwnMessage,
  currentPartyName,
  onReply,
}: {
  message: NegotiationMessage;
  isOwnMessage: boolean;
  currentPartyName?: string;
  onReply: () => void;
}) {
  const isInternal = message.sender_type === 'internal';

  return (
    <div className={cn('flex gap-3', isOwnMessage && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isInternal ? 'bg-purple-100' : 'bg-ghost-100'
        )}
      >
        {isInternal ? (
          <Building2 className="h-4 w-4 text-purple-600" />
        ) : (
          <User className="h-4 w-4 text-ghost-600" />
        )}
      </div>

      {/* Content */}
      <div className={cn('max-w-[70%]', isOwnMessage && 'items-end')}>
        {/* Header */}
        <div className={cn('flex items-center gap-2 mb-1', isOwnMessage && 'flex-row-reverse')}>
          <span className="font-mono text-xs font-medium text-ghost-900">
            {message.sender_name}
            {isOwnMessage && currentPartyName === message.sender_name && ' (You)'}
          </span>
          {message.is_important && (
            <Star className="h-3 w-3 text-amber-500" fill="currentColor" />
          )}
        </div>

        {/* Message */}
        <div
          className={cn(
            'px-4 py-3 font-mono text-sm',
            isOwnMessage
              ? 'bg-purple-900 text-white rounded-tl-lg rounded-bl-lg rounded-br-lg'
              : 'bg-ghost-100 text-ghost-900 rounded-tr-lg rounded-bl-lg rounded-br-lg'
          )}
        >
          {message.subject && (
            <p className={cn('font-semibold mb-1', isOwnMessage ? 'text-purple-200' : 'text-ghost-700')}>
              {message.subject}
            </p>
          )}
          <p className="whitespace-pre-wrap">{message.message_text}</p>
        </div>

        {/* Footer */}
        <div className={cn('flex items-center gap-3 mt-1', isOwnMessage && 'flex-row-reverse')}>
          <span className="font-mono text-xs text-ghost-400">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={onReply}
            className="font-mono text-xs text-ghost-400 hover:text-purple-600"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}
