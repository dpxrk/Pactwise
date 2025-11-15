'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Activity } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DonnaWidgetProps {
  onClick: () => void;
  unreadCount?: number;
  isConnected: boolean;
  className?: string;
}

export const DonnaWidget: React.FC<DonnaWidgetProps> = ({
  onClick,
  unreadCount = 0,
  isConnected,
  className,
}) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'donna-widget',
        'fixed bottom-6 right-6 z-50',
        'w-16 h-16',
        'bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900',
        'border-2 border-purple-500',
        'shadow-2xl',
        'flex items-center justify-center',
        'group cursor-pointer',
        'overflow-hidden',
        className
      )}
      aria-label="Open Donna Terminal"
    >
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(158, 130, 156, 0.5) 25%, rgba(158, 130, 156, 0.5) 26%, transparent 27%),
            linear-gradient(90deg, transparent 24%, rgba(158, 130, 156, 0.5) 25%, rgba(158, 130, 156, 0.5) 26%, transparent 27%)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Glow Effect */}
      <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Icon */}
      <div className="relative z-10">
        <Terminal className="h-7 w-7 text-purple-100 group-hover:text-white transition-colors" />

        {/* Activity Pulse */}
        {isConnected && (
          <motion.div
            className="absolute -bottom-1 -right-1"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Activity className="h-3 w-3 text-green-400" />
          </motion.div>
        )}
      </div>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 border-2 border-purple-900 flex items-center justify-center"
        >
          <span className="text-[10px] font-bold text-white font-mono">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </motion.div>
      )}

      {/* Status Indicator */}
      <div className="absolute bottom-1 left-1 flex items-center gap-1">
        <div
          className={cn(
            'w-1.5 h-1.5',
            isConnected ? 'bg-green-400' : 'bg-red-400'
          )}
        />
      </div>

      {/* Hover Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-purple-900 border border-purple-500 px-3 py-2 whitespace-nowrap">
          <p className="text-xs font-bold text-purple-100 uppercase tracking-wide font-mono">
            DONNA TERMINAL
          </p>
          <p className="text-[10px] text-purple-300 mt-0.5">
            {isConnected ? 'Click to open' : 'Reconnecting...'}
          </p>
        </div>
        {/* Arrow */}
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-500" />
      </div>

      {/* Animated Border Glow */}
      <div className="absolute inset-0 border-2 border-pink-500 opacity-0 group-hover:opacity-50 transition-opacity" />

      {/* CSS for animations */}
      <style jsx>{`
        .donna-widget::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent,
            rgba(158, 130, 156, 0.3),
            transparent
          );
          animation: rotate 4s linear infinite;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .donna-widget:hover::before {
          opacity: 1;
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </motion.button>
  );
};

export default DonnaWidget;
