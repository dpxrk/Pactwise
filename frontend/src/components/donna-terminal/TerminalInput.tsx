'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface TerminalInputProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  isTyping?: boolean;
  className?: string;
}

export const TerminalInput: React.FC<TerminalInputProps> = ({
  onSubmit,
  disabled = false,
  isTyping = false,
  className,
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || disabled || isTyping) return;

    // Add to history
    setHistory((prev) => [...prev, trimmedInput]);
    setHistoryIndex(-1);

    // Submit query
    onSubmit(trimmedInput);

    // Clear input
    setInput('');

    // Refocus input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Navigate history with arrow keys
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;

      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(history[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;

      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Prompt Indicator */}
        <div className="flex items-center gap-1.5 text-pink-400 flex-shrink-0">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-xs font-bold font-mono">$</span>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isTyping}
          placeholder={
            disabled
              ? 'Disconnected...'
              : isTyping
              ? 'Processing...'
              : 'Ask Donna anything...'
          }
          className={cn(
            'flex-1 bg-transparent border-none outline-none',
            'text-sm text-purple-100 placeholder-purple-400/50',
            'font-mono',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || isTyping || !input.trim()}
          className={cn(
            'flex items-center justify-center',
            'w-8 h-8',
            'bg-purple-500/20 border border-purple-500',
            'hover:bg-purple-500 hover:border-purple-400',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-purple-500/20',
            'transition-all duration-200',
            'group'
          )}
          aria-label="Send query"
        >
          <Send className="h-3.5 w-3.5 text-purple-300 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Input Hint */}
      {!input && !disabled && (
        <div className="absolute bottom-full left-4 mb-2 text-[10px] text-purple-400 font-mono opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-purple-900/90 border border-purple-500/30 px-2 py-1">
            ↑↓ Navigate history | Enter Submit
          </div>
        </div>
      )}

      {/* Blinking Cursor Effect */}
      <style jsx>{`
        input:focus {
          caret-color: #9e829c;
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }

        input::placeholder {
          animation: blink 1.5s infinite;
        }
      `}</style>
    </form>
  );
};

export default TerminalInput;
