'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Minimize2, Maximize2, X, Activity, Settings as SettingsIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useDonnaTerminal } from '@/hooks/useDonnaTerminal';
import { TerminalMessageStream } from './TerminalMessageStream';
import { TerminalInput } from './TerminalInput';
import { DonnaWidget } from './DonnaWidget';
import { TerminalSettings } from './TerminalSettings';

interface DonnaTerminalProps {
  className?: string;
  defaultMinimized?: boolean;
}

export const DonnaTerminal: React.FC<DonnaTerminalProps> = ({
  className,
  defaultMinimized = false,
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isConnected,
    isTyping,
    sendQuery,
    clearMessages,
    unreadCount,
    markAsRead,
    settings,
    updateSettings,
  } = useDonnaTerminal();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+D or Cmd+D to toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setIsMinimized((prev) => !prev);
      }

      // Escape to minimize
      if (e.key === 'Escape' && !isMinimized) {
        e.preventDefault();
        setIsMinimized(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMinimized]);

  // Mark messages as read when terminal is expanded
  useEffect(() => {
    if (!isMinimized) {
      markAsRead();
    }
  }, [isMinimized, markAsRead]);

  // Get theme colors based on settings
  const getThemeColors = () => {
    switch (settings.theme) {
      case 'green':
        return {
          gradient: 'from-green-900 via-green-800 to-green-900',
          border: 'border-green-500',
          text: 'text-green-100',
          textSecondary: 'text-green-300',
          hover: 'hover:bg-green-500/20',
          bg: 'bg-green-900/50',
        };
      case 'blue':
        return {
          gradient: 'from-blue-900 via-blue-800 to-blue-900',
          border: 'border-blue-500',
          text: 'text-blue-100',
          textSecondary: 'text-blue-300',
          hover: 'hover:bg-blue-500/20',
          bg: 'bg-blue-900/50',
        };
      default:
        return {
          gradient: 'from-purple-900 via-purple-800 to-purple-900',
          border: 'border-purple-500',
          text: 'text-purple-100',
          textSecondary: 'text-purple-300',
          hover: 'hover:bg-purple-500/20',
          bg: 'bg-purple-900/50',
        };
    }
  };

  const themeColors = getThemeColors();

  // Get font size class
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  // Show widget when minimized
  if (isMinimized) {
    return (
      <DonnaWidget
        onClick={() => setIsMinimized(false)}
        unreadCount={unreadCount}
        isConnected={isConnected}
        className={className}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={terminalRef}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          'donna-terminal',
          'fixed z-50',
          `bg-gradient-to-br ${themeColors.gradient}`,
          `border-2 ${themeColors.border}`,
          'shadow-2xl',
          'font-mono',
          'flex flex-col',
          getFontSizeClass(),
          isMaximized
            ? 'inset-4'
            : 'bottom-6 right-6 w-[600px] h-[700px]',
          className
        )}
        style={{
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Terminal Header */}
        <div className={cn('terminal-header relative z-10 flex items-center justify-between px-4 py-3', `border-b-2 ${themeColors.border} ${themeColors.bg}`)}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className={cn('h-4 w-4', themeColors.textSecondary)} />
              <span className={cn('text-xs font-bold uppercase tracking-wider', themeColors.text)}>
                DONNA TERMINAL
              </span>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-1.5 h-1.5 transition-colors',
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                )}
              />
              <span className={cn('text-[10px] uppercase tracking-wide', themeColors.textSecondary)}>
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            {/* Activity Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 ml-2">
                <Activity className="h-3 w-3 text-pink-400 animate-pulse" />
                <span className="text-[10px] text-pink-400 uppercase tracking-wide">
                  PROCESSING
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className={cn('p-1.5 rounded transition-colors group', themeColors.hover)}
              aria-label="Settings"
            >
              <SettingsIcon className={cn('h-3.5 w-3.5', themeColors.textSecondary, `group-hover:${themeColors.text}`)} />
            </button>

            {/* Maximize/Restore Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className={cn('p-1.5 rounded transition-colors group', themeColors.hover)}
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <Minimize2 className={cn('h-3.5 w-3.5', themeColors.textSecondary, `group-hover:${themeColors.text}`)} />
              ) : (
                <Maximize2 className={cn('h-3.5 w-3.5', themeColors.textSecondary, `group-hover:${themeColors.text}`)} />
              )}
            </button>

            {/* Minimize Button */}
            <button
              onClick={() => setIsMinimized(true)}
              className={cn('p-1.5 rounded transition-colors group', themeColors.hover)}
              aria-label="Minimize"
            >
              <Minimize2 className={cn('h-3.5 w-3.5', themeColors.textSecondary, `group-hover:${themeColors.text}`)} />
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                if (confirm('Close Donna Terminal?')) {
                  setIsMinimized(true);
                  clearMessages();
                }
              }}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors group"
              aria-label="Close"
            >
              <X className={cn('h-3.5 w-3.5', themeColors.textSecondary, 'group-hover:text-red-400')} />
            </button>
          </div>
        </div>

        {/* Terminal Grid Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(158, 130, 156, 0.5) 25%, rgba(158, 130, 156, 0.5) 26%, transparent 27%, transparent 74%, rgba(158, 130, 156, 0.5) 75%, rgba(158, 130, 156, 0.5) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(158, 130, 156, 0.5) 25%, rgba(158, 130, 156, 0.5) 26%, transparent 27%, transparent 74%, rgba(158, 130, 156, 0.5) 75%, rgba(158, 130, 156, 0.5) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Scanline Effect */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(158, 130, 156, 0.1) 2px, rgba(158, 130, 156, 0.1) 4px)',
            animation: 'scan 8s linear infinite',
          }}
        />

        {/* Message Stream */}
        <div className="flex-1 overflow-hidden relative z-10">
          <TerminalMessageStream
            messages={messages}
            isTyping={isTyping}
            isConnected={isConnected}
          />
        </div>

        {/* Input Area */}
        <div className={cn('relative z-10', `border-t-2 ${themeColors.border} ${themeColors.bg}`)}>
          <TerminalInput
            onSubmit={sendQuery}
            disabled={!isConnected}
            isTyping={isTyping}
          />
        </div>

        {/* Settings Panel */}
        <TerminalSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onUpdateSettings={updateSettings}
        />

        {/* CSS for animations */}
        <style jsx>{`
          @keyframes scan {
            0% {
              transform: translateY(-100%);
            }
            100% {
              transform: translateY(100%);
            }
          }

          .donna-terminal::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(158, 130, 156, 0.5) 50%,
              transparent
            );
            animation: glowLine 3s ease-in-out infinite;
          }

          @keyframes glowLine {
            0%,
            100% {
              opacity: 0.3;
            }
            50% {
              opacity: 0.8;
            }
          }

          /* Custom Scrollbar for Terminal */
          .donna-terminal ::-webkit-scrollbar {
            width: 8px;
          }

          .donna-terminal ::-webkit-scrollbar-track {
            background: rgba(41, 21, 40, 0.5);
          }

          .donna-terminal ::-webkit-scrollbar-thumb {
            background: rgba(158, 130, 156, 0.5);
            border-radius: 0;
          }

          .donna-terminal ::-webkit-scrollbar-thumb:hover {
            background: rgba(158, 130, 156, 0.8);
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default DonnaTerminal;
