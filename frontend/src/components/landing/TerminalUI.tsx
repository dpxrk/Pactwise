"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

// === ANIMATED COUNTER ===
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);

      // Easing function (easeOutExpo)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(eased * value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {prefix}
      {displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      {suffix}
    </span>
  );
};

// === LIVE TICKER ===
interface TickerItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

interface LiveTickerProps {
  items: TickerItem[];
  title?: string;
}

export const LiveTicker: React.FC<LiveTickerProps> = ({
  items,
  title = 'ACTIVITY FEED',
}) => {
  const typeStyles = {
    success: 'text-green-400',
    warning: 'text-amber-400',
    info: 'text-purple-300',
  };

  const typeIcons = {
    success: '✓',
    warning: '▲',
    info: '→',
  };

  return (
    <div className="border border-purple-500/30 bg-purple-950/80 backdrop-blur-sm">
      <div className="px-3 py-2 border-b border-purple-500/30 bg-purple-900/50">
        <span className="text-xs font-mono text-purple-400 tracking-wider">
          {title}
        </span>
      </div>
      <div className="max-h-40 overflow-hidden">
        {items.slice(0, 5).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="px-3 py-2 border-b border-purple-500/10 last:border-0 flex items-start gap-2"
          >
            <span className={`${typeStyles[item.type]} text-xs`}>
              {typeIcons[item.type]}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-purple-100 block truncate">
                {item.message}
              </span>
              <span className="text-[10px] font-mono text-purple-500">
                {item.timestamp}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// === METRIC DISPLAY ===
interface MetricDisplayProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  animate?: boolean;
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  unit = '',
  trend = 'neutral',
  animate = true,
}) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-purple-300',
  };

  const trendIcons = {
    up: '▲',
    down: '▼',
    neutral: '●',
  };

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs font-mono text-purple-500 tracking-wider">
        {label}:
      </span>
      <span className="text-lg font-mono text-white tabular-nums">
        {animate && typeof value === 'number' ? (
          <AnimatedCounter value={value} />
        ) : (
          value
        )}
        {unit && <span className="text-sm text-purple-400 ml-1">{unit}</span>}
      </span>
      <span className={`text-xs ${trendColors[trend]}`}>
        {trendIcons[trend]}
      </span>
    </div>
  );
};

// === TERMINAL PANEL ===
interface TerminalPanelProps {
  title: string;
  status?: 'active' | 'idle' | 'processing';
  children: React.ReactNode;
  className?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  title,
  status = 'active',
  children,
  className = '',
}) => {
  const statusStyles = {
    active: 'bg-green-400',
    idle: 'bg-purple-400',
    processing: 'bg-amber-400 animate-pulse',
  };

  return (
    <div className={`border border-purple-500/30 bg-purple-950/90 backdrop-blur-md ${className}`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-purple-500/30 bg-purple-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusStyles[status]}`} />
          <span className="text-xs font-mono text-purple-300 tracking-widest uppercase">
            {title}
          </span>
        </div>
        <span className="text-[10px] font-mono text-purple-500">
          [{status.toUpperCase()}]
        </span>
      </div>
      {/* Content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

// === AGENT TERMINAL CARD ===
interface AgentTerminalCardProps {
  name: string;
  id: string;
  status: 'active' | 'idle' | 'processing';
  metrics: {
    label: string;
    value: number | string;
    unit?: string;
  }[];
  capabilities: string[];
  color: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const AgentTerminalCard: React.FC<AgentTerminalCardProps> = ({
  name,
  id,
  status,
  metrics,
  capabilities,
  color,
  isActive = false,
  onClick,
}) => {
  return (
    <motion.div
      onClick={onClick}
      className={`
        cursor-pointer border bg-purple-950/90 backdrop-blur-md transition-all duration-300
        ${isActive
          ? 'border-purple-300 shadow-lg shadow-purple-500/30 scale-[1.02]'
          : 'border-purple-500/30 hover:border-purple-400/50'
        }
      `}
      whileHover={{ scale: isActive ? 1.02 : 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-purple-500/30 flex items-center justify-between"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-mono text-white tracking-wide">
            {name.toUpperCase()}
          </span>
        </div>
        <span className="text-[10px] font-mono text-purple-400">
          ID: {id}
        </span>
      </div>

      {/* Metrics */}
      <div className="p-4 border-b border-purple-500/20">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, i) => (
            <div key={i} className="text-left">
              <span className="text-[10px] font-mono text-purple-500 block mb-1">
                {metric.label}
              </span>
              <span className="text-lg font-mono text-white tabular-nums">
                {metric.value}
                {metric.unit && (
                  <span className="text-xs text-purple-400 ml-1">{metric.unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <div className="p-4">
        <span className="text-[10px] font-mono text-purple-500 block mb-2">
          CAPABILITIES
        </span>
        <div className="space-y-1">
          {capabilities.slice(0, 3).map((cap, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-purple-400 text-xs">→</span>
              <span className="text-xs font-mono text-purple-200">{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 bg-purple-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'active' ? 'bg-green-400' :
            status === 'processing' ? 'bg-amber-400 animate-pulse' :
            'bg-purple-400'
          }`} />
          <span className="text-[10px] font-mono text-purple-400">
            {status.toUpperCase()}
          </span>
        </div>
        {isActive && (
          <span className="text-[10px] font-mono text-purple-300">
            [SELECTED]
          </span>
        )}
      </div>
    </motion.div>
  );
};

// === COMPARISON ROW ===
interface ComparisonRowProps {
  label: string;
  traditional: string;
  pactwise: string;
  improvement?: string;
}

export const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label,
  traditional,
  pactwise,
  improvement,
}) => {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-purple-500/20 last:border-0">
      <div className="text-xs font-mono text-purple-400">{label}</div>
      <div className="text-sm font-mono text-purple-300 line-through opacity-60">
        {traditional}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-green-400">{pactwise}</span>
        {improvement && (
          <span className="text-[10px] font-mono text-green-500">
            {improvement}
          </span>
        )}
      </div>
    </div>
  );
};

// === COMMAND PROMPT ===
interface CommandPromptProps {
  command?: string;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

export const CommandPrompt: React.FC<CommandPromptProps> = ({
  command = '',
  placeholder = 'Enter command...',
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (!command) return;

    setIsTyping(true);
    setDisplayText('');

    let index = 0;
    const interval = setInterval(() => {
      if (index < command.length) {
        setDisplayText(command.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [command]);

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-purple-900/50 border border-purple-500/30 font-mono">
      <span className="text-purple-400">{'>'}</span>
      <span className="text-purple-100 flex-1">
        {displayText || placeholder}
      </span>
      <span className={`w-2 h-4 bg-purple-300 ${isTyping ? 'animate-pulse' : 'animate-blink'}`} />
    </div>
  );
};

// === STATUS BAR ===
interface StatusBarProps {
  items: { label: string; value: string; status?: 'success' | 'warning' | 'error' }[];
}

export const StatusBar: React.FC<StatusBarProps> = ({ items }) => {
  const statusColors = {
    success: 'text-green-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  };

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-purple-950/90 border-t border-purple-500/30">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-purple-500">
            {item.label}:
          </span>
          <span className={`text-[10px] font-mono ${
            item.status ? statusColors[item.status] : 'text-purple-300'
          }`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default {
  AnimatedCounter,
  LiveTicker,
  MetricDisplay,
  TerminalPanel,
  AgentTerminalCard,
  ComparisonRow,
  CommandPrompt,
  StatusBar,
};
