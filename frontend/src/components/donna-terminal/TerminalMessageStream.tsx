'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Terminal,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TerminalMessage } from '@/types/donna-terminal.types';

interface TerminalMessageStreamProps {
  messages: TerminalMessage[];
  isTyping: boolean;
  isConnected: boolean;
  className?: string;
}

export const TerminalMessageStream: React.FC<TerminalMessageStreamProps> = ({
  messages,
  isTyping,
  isConnected,
  className,
}) => {
  const streamEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show welcome message if no messages
  if (messages.length === 0) {
    return (
      <div className={cn('h-full flex flex-col items-center justify-center p-8', className)}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 max-w-md"
        >
          <div className="flex justify-center">
            <div className="relative">
              <Terminal className="h-12 w-12 text-purple-300" />
              <Sparkles className="h-5 w-5 text-pink-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-purple-100 uppercase tracking-wider">
              DONNA TERMINAL v2.1.0
            </h3>
            <p className="text-xs text-purple-300 leading-relaxed">
              Cross-Enterprise Intelligence System
            </p>
          </div>

          <div className="space-y-2 text-left bg-purple-900/30 border border-purple-500/30 p-4 rounded-none">
            <p className="text-[10px] text-purple-300 uppercase tracking-wide font-bold mb-2">
              QUICK START:
            </p>
            <ul className="space-y-1.5 text-[11px] text-purple-200">
              <li className="flex items-start gap-2">
                <ChevronRight className="h-3 w-3 text-pink-400 mt-0.5 flex-shrink-0" />
                <span>Ask about vendor consolidation opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-3 w-3 text-pink-400 mt-0.5 flex-shrink-0" />
                <span>Request contract renewal strategies</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-3 w-3 text-pink-400 mt-0.5 flex-shrink-0" />
                <span>Get compliance risk assessments</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-3 w-3 text-pink-400 mt-0.5 flex-shrink-0" />
                <span>Discover cost optimization patterns</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 justify-center pt-2">
            <div className={cn('w-1.5 h-1.5', isConnected ? 'bg-green-400' : 'bg-red-400')} />
            <span className="text-[10px] text-purple-300 uppercase tracking-wide">
              {isConnected ? 'System Ready' : 'Connecting...'}
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn('h-full overflow-y-auto px-4 py-4 space-y-4', className)}>
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
          <MessageItem key={message.id} message={message} index={index} />
        ))}
      </AnimatePresence>

      {/* Typing Indicator */}
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 text-purple-300 text-xs"
        >
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[10px] uppercase tracking-wide">Analyzing patterns...</span>
        </motion.div>
      )}

      <div ref={streamEndRef} />
    </div>
  );
};

// Individual Message Component
const MessageItem: React.FC<{ message: TerminalMessage; index: number }> = ({
  message,
  index,
}) => {
  const isUser = message.type === 'user_query';
  const isError = message.type === 'error';
  const isInsight = message.type === 'insight';
  const isSystem = message.type === 'system_response';

  const getIcon = () => {
    if (isError) return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    if (isInsight) return <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />;
    if (isSystem) return <Sparkles className="h-3.5 w-3.5 text-purple-300" />;
    return <ChevronRight className="h-3.5 w-3.5 text-pink-400" />;
  };

  const getBorderColor = () => {
    if (isError) return 'border-red-500/50';
    if (isInsight) return 'border-yellow-500/50';
    if (isUser) return 'border-pink-500/50';
    return 'border-purple-500/50';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={cn(
        'message-item border-l-2 pl-3 py-2',
        getBorderColor(),
        isUser && 'ml-8'
      )}
    >
      {/* Message Header */}
      <div className="flex items-center gap-2 mb-1.5">
        {getIcon()}
        <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">
          {isUser ? 'USER' : isError ? 'ERROR' : isInsight ? 'INSIGHT' : 'DONNA'}
        </span>
        <span className="text-[9px] text-purple-400 font-mono">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        {message.content.confidence && (
          <span className="text-[9px] text-purple-400 font-mono ml-auto">
            CONF: {(message.content.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Message Content */}
      <div className="space-y-2">
        <p className="text-sm text-purple-100 leading-relaxed whitespace-pre-wrap">
          {message.content.message}
        </p>

        {/* Insights */}
        {message.content.insights && message.content.insights.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {message.content.insights.slice(0, 3).map((insight: any, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-purple-200 bg-purple-900/30 border border-purple-500/20 p-2"
              >
                <TrendingUp className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span>{insight.description || 'Insight detected'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {message.content.recommendations && message.content.recommendations.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {message.content.recommendations.map((rec: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-purple-200"
              >
                <CheckCircle2 className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}

        {/* Best Practices */}
        {message.content.bestPractices && message.content.bestPractices.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.content.bestPractices.map((practice: any, idx: number) => (
              <div
                key={idx}
                className="text-xs bg-purple-900/40 border border-purple-500/30 p-2.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3 w-3 text-pink-400" />
                  <span className="text-purple-100 font-bold uppercase text-[10px] tracking-wide">
                    {practice.title || 'Best Practice'}
                  </span>
                  {practice.success_rate && (
                    <span className="text-[9px] text-green-400 ml-auto font-mono">
                      {(practice.success_rate * 100).toFixed(0)}% SUCCESS
                    </span>
                  )}
                </div>
                {practice.description && (
                  <p className="text-purple-200 text-[11px] mt-1 leading-relaxed">
                    {practice.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  // Handle action click
                  console.log('[Terminal Action]', action.type, action.payload);
                }}
                className={cn(
                  'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide',
                  'border border-purple-500 text-purple-200',
                  'hover:bg-purple-500 hover:text-white',
                  'transition-all duration-200',
                  'font-mono'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Metadata */}
        {message.content.metadata && (
          <div className="mt-3 pt-2 border-t border-purple-500/20 flex flex-wrap gap-3 text-[10px] font-mono text-purple-400">
            {message.content.metadata.patternCount && (
              <span>PATTERNS: {message.content.metadata.patternCount.toLocaleString()}</span>
            )}
            {message.content.metadata.industries && message.content.metadata.industries.length > 0 && (
              <span>INDUSTRIES: {message.content.metadata.industries.join(', ')}</span>
            )}
            {message.content.metadata.avgSavings && (
              <span>AVG SAVINGS: {message.content.metadata.avgSavings}%</span>
            )}
            {message.content.metadata.successRate && (
              <span>SUCCESS: {(message.content.metadata.successRate * 100).toFixed(0)}%</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TerminalMessageStream;
