'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Activity,
  Zap,
  FileText,
  Shield,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface AgentLog {
  id: string;
  timestamp: Date;
  agent: string;
  action: string;
  status: 'running' | 'completed' | 'error' | 'queued';
  details?: string;
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  'CONTRACT_ANALYZER': FileText,
  'VENDOR_INTEL': Bot,
  'COMPLIANCE_GUARD': Shield,
  'FINANCIAL_AGENT': DollarSign,
  'SECRETARY': Clock,
  'DONNA': Zap,
};

// Simulated agent activities for demo purposes
const DEMO_ACTIVITIES: Omit<AgentLog, 'id' | 'timestamp'>[] = [
  { agent: 'DONNA', action: 'pactwise analyze --watch enterprise-patterns', status: 'running' },
  { agent: 'CONTRACT_ANALYZER', action: '✓ Processed vendor-agreement-2024.pdf', status: 'completed', details: 'Risk: Low | Clauses: 47' },
  { agent: 'VENDOR_INTEL', action: '✓ Updated 12 vendor risk profiles', status: 'completed' },
  { agent: 'COMPLIANCE_GUARD', action: '✓ Compliance audit completed', status: 'completed', details: 'Score: 94.2%' },
  { agent: 'FINANCIAL_AGENT', action: '✓ Budget allocation optimized', status: 'completed' },
  { agent: 'SECRETARY', action: '✓ 3 renewal reminders scheduled', status: 'completed' },
  { agent: 'DONNA', action: 'pactwise learn --from recent-contracts', status: 'running' },
  { agent: 'CONTRACT_ANALYZER', action: '• Queued: 5 documents pending analysis', status: 'queued' },
];

interface AgentActivityTerminalProps {
  className?: string;
  maxHeight?: string;
  title?: string;
}

export function AgentActivityTerminal({
  className,
  maxHeight = "400px",
  title = "agent-activity"
}: AgentActivityTerminalProps) {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  const TYPING_SPEED = 25;
  const LOG_DELAY = 600;

  // Typing animation effect - flows downward like a real terminal
  useEffect(() => {
    if (currentLogIndex >= DEMO_ACTIVITIES.length) {
      setIsTyping(false);

      // After initial animation, start adding new random logs at the bottom
      const interval = setInterval(() => {
        const randomActivity = DEMO_ACTIVITIES[Math.floor(Math.random() * DEMO_ACTIVITIES.length)];
        const newLog: AgentLog = {
          ...randomActivity,
          id: `log-${Date.now()}`,
          timestamp: new Date(),
        };
        setLogs(prev => [...prev, newLog].slice(-20)); // Keep last 20 logs, append at bottom
      }, 8000 + Math.random() * 7000);

      return () => clearInterval(interval);
    }

    const currentActivity = DEMO_ACTIVITIES[currentLogIndex];
    const fullText = currentActivity.action;

    if (currentCharIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setLogs(prev => {
          const newLogs = [...prev];
          const existingIndex = newLogs.findIndex(l => l.id === `initial-${currentLogIndex}`);

          if (existingIndex === -1) {
            // Append new log at the bottom
            newLogs.push({
              ...currentActivity,
              id: `initial-${currentLogIndex}`,
              timestamp: new Date(),
              action: fullText.slice(0, currentCharIndex + 1)
            });
          } else {
            newLogs[existingIndex] = {
              ...newLogs[existingIndex],
              action: fullText.slice(0, currentCharIndex + 1)
            };
          }
          return newLogs;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentLogIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, LOG_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [currentLogIndex, currentCharIndex]);

  // Auto-scroll to bottom (like a real terminal)
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusColor = (status: AgentLog['status']) => {
    switch (status) {
      case 'running': return 'text-purple-400';
      case 'completed': return 'text-success';
      case 'error': return 'text-error-400';
      case 'queued': return 'text-warning-400';
    }
  };

  const getAgentColor = (agent: string) => {
    const colors: Record<string, string> = {
      'CONTRACT_ANALYZER': 'text-purple-400',
      'VENDOR_INTEL': 'text-blue-400',
      'COMPLIANCE_GUARD': 'text-green-400',
      'FINANCIAL_AGENT': 'text-amber-400',
      'SECRETARY': 'text-pink-400',
      'DONNA': 'text-violet-400',
    };
    return colors[agent] || 'text-purple-400';
  };

  return (
    <div className={cn(
      "overflow-hidden transition-colors duration-300",
      isDark ? "terminal-panel" : "bg-white border border-ghost-300",
      className
    )}>
      {/* Terminal Header - matching landing page style */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b transition-colors duration-300",
        isDark
          ? "bg-terminal-surface border-terminal-border"
          : "bg-ghost-100 border-ghost-200"
      )}>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-error-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
        </div>
        <span className={cn(
          "font-mono text-[10px] transition-colors duration-300",
          isDark ? "text-text-tertiary" : "text-ghost-500"
        )}>
          pactwise-cli — {title}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-mono text-[9px] text-success">LIVE</span>
          </div>
        </div>
      </div>

      {/* Terminal Body - fixed height, no visible scrollbar */}
      <div
        ref={terminalRef}
        className={cn(
          "p-3 font-mono text-xs overflow-y-auto scrollbar-hide transition-colors duration-300",
          isDark ? "bg-terminal-panel" : "bg-purple-950"
        )}
        style={{
          height: maxHeight,
        }}
      >
        {/* Initial command */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <span className="text-purple-400">$</span>
            <span className="text-ghost-100">pactwise agents --status --watch</span>
          </div>
          <div className="text-success pl-4 mt-1">
            ✓ Connected to 6 AI agents
          </div>
          <div className="text-ghost-400 pl-4 text-[10px] mt-1">
            Monitoring enterprise activity...
          </div>
        </div>

        {/* Divider */}
        <div className={cn(
          "border-t my-3",
          isDark ? "border-terminal-border" : "border-purple-800"
        )} />

        {/* Activity logs - flows downward */}
        <div className="space-y-2">
          {logs.map((log) => {
            return (
              <div key={log.id} className="group">
                <div className="flex items-start gap-2">
                  <span className={getAgentColor(log.agent)}>
                    [{log.agent}]
                  </span>
                </div>
                <div className={cn(
                  "pl-4 mt-0.5",
                  getStatusColor(log.status)
                )}>
                  {log.action}
                  {log.status === 'running' && (
                    <span className="inline-block w-2 h-3 bg-purple-500 animate-pulse ml-1" />
                  )}
                </div>
                {log.details && (
                  <div className="pl-4 text-ghost-400 text-[10px] mt-0.5">
                    {log.details}
                  </div>
                )}
                <div className="pl-4 text-ghost-500 text-[9px] mt-0.5">
                  {formatTime(log.timestamp)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Typing cursor at the bottom when animating */}
        {isTyping && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-purple-400">$</span>
            <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse" />
          </div>
        )}

        {/* Empty state */}
        {!isTyping && logs.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-8 h-8 text-ghost-500 mx-auto mb-2" />
            <p className="text-ghost-400 text-[10px]">
              Waiting for agent activity...
            </p>
          </div>
        )}
      </div>

      {/* Terminal Footer - matching landing page ticker style */}
      <div className={cn(
        "border-t transition-colors duration-300",
        isDark ? "border-terminal-border" : "border-ghost-200"
      )}>
        <div className={cn(
          "px-3 py-1.5 flex items-center justify-between font-mono text-[9px]",
          isDark ? "text-text-muted" : "text-ghost-500"
        )}>
          <div className="flex items-center gap-4">
            <span>AGENTS: 6</span>
            <span>TASKS: {logs.length}</span>
            <span>QUEUE: 0</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-success animate-pulse" />
            <span className="text-success">ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentActivityTerminal;
