'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';


export interface Command {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
  icon?: string;
  category?: string;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: Command[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands: customCommands
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Default agent commands - matching Supabase backend agents
  const defaultCommands: Command[] = [
    {
      id: 'agents-home',
      name: 'Agent Dashboard',
      description: 'View all agents and system status',
      keywords: ['agents', 'dashboard', 'home', 'overview'],
      action: () => router.push('/dashboard/agents'),
      icon: '🏠',
      category: 'Navigation'
    },
    // Core Orchestration
    {
      id: 'manager-agent',
      name: 'Manager & Orchestration',
      description: 'System coordination and workflow orchestration',
      keywords: ['manager', 'orchestration', 'workflow', 'coordinate'],
      action: () => router.push('/dashboard/agents/manager'),
      icon: '⚙️',
      category: 'Core'
    },
    {
      id: 'workflow-agent',
      name: 'Workflow Automation',
      description: 'Multi-step workflow execution',
      keywords: ['workflow', 'automation', 'process', 'steps'],
      action: () => router.push('/dashboard/agents/workflow'),
      icon: '🔄',
      category: 'Core'
    },
    // Document Processing
    {
      id: 'secretary-agent',
      name: 'Secretary & Document Processing',
      description: 'Document extraction and metadata generation',
      keywords: ['secretary', 'document', 'extraction', 'processing', 'metadata'],
      action: () => router.push('/dashboard/agents/secretary'),
      icon: '📝',
      category: 'Core'
    },
    // Legal & Compliance
    {
      id: 'legal-agent',
      name: 'Legal & Contract Analysis',
      description: 'Contract analysis and legal risk assessment',
      keywords: ['legal', 'contract', 'analysis', 'review', 'risk'],
      action: () => router.push('/dashboard/agents/legal'),
      icon: '⚖️',
      category: 'Legal'
    },
    {
      id: 'compliance-agent',
      name: 'Compliance & Regulatory',
      description: 'Regulatory compliance and audit management',
      keywords: ['compliance', 'regulatory', 'audit', 'standards'],
      action: () => router.push('/dashboard/agents/compliance'),
      icon: '✅',
      category: 'Legal'
    },
    {
      id: 'risk-agent',
      name: 'Risk Assessment',
      description: 'Comprehensive risk evaluation',
      keywords: ['risk', 'assessment', 'evaluation', 'mitigation'],
      action: () => router.push('/dashboard/agents/risk-assessment'),
      icon: '⚠️',
      category: 'Legal'
    },
    // Financial
    {
      id: 'financial-agent',
      name: 'Financial Analysis',
      description: 'Financial risk assessment and reporting',
      keywords: ['financial', 'analysis', 'budget', 'cost', 'money'],
      action: () => router.push('/dashboard/agents/financial'),
      icon: '💵',
      category: 'Financial'
    },
    // Vendor & Analytics
    {
      id: 'vendor-agent',
      name: 'Vendor Management',
      description: 'Vendor lifecycle and performance tracking',
      keywords: ['vendor', 'supplier', 'management', 'performance'],
      action: () => router.push('/dashboard/agents/vendor'),
      icon: '🤝',
      category: 'Management'
    },
    {
      id: 'analytics-agent',
      name: 'Analytics & Insights',
      description: 'Data analysis and trend identification',
      keywords: ['analytics', 'insights', 'data', 'trends', 'analysis'],
      action: () => router.push('/dashboard/agents/analytics'),
      icon: '📈',
      category: 'Analytics'
    },
    // System Support
    {
      id: 'notifications-agent',
      name: 'Notifications & Alerts',
      description: 'Communication and alert management',
      keywords: ['notifications', 'alerts', 'messages', 'communication'],
      action: () => router.push('/dashboard/agents/notifications'),
      icon: '🔔',
      category: 'System'
    },
    {
      id: 'data-quality-agent',
      name: 'Data Quality',
      description: 'Data validation and quality assurance',
      keywords: ['data', 'quality', 'validation', 'accuracy'],
      action: () => router.push('/dashboard/agents/data-quality'),
      icon: '🎯',
      category: 'System'
    },
    {
      id: 'integration-agent',
      name: 'Integration Hub',
      description: 'External system integration',
      keywords: ['integration', 'sync', 'connect', 'external'],
      action: () => router.push('/dashboard/agents/integration'),
      icon: '🔌',
      category: 'System'
    },
  ];

  const commands = customCommands || defaultCommands;

  const filteredCommands = commands.filter((command) => {
    const searchText = query.toLowerCase();
    return (
      command.name.toLowerCase().includes(searchText) ||
      command.description.toLowerCase().includes(searchText) ||
      command.keywords.some((keyword) => keyword.includes(searchText)) ||
      (command.category && command.category.toLowerCase().includes(searchText))
    );
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
          setQuery('');
        }
      } else if (e.key === 'Escape') {
        onClose();
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    const category = command.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] command-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl terminal-panel rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-terminal-border">
          <svg
            className="w-5 h-5 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search agents... (or type '/')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder-text-tertiary"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-terminal-surface border border-terminal-border rounded text-text-tertiary">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-[400px] overflow-y-auto terminal-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-tertiary text-sm">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                <div key={category}>
                  {/* Category Header */}
                  <div className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-terminal-surface">
                    {category}
                  </div>

                  {/* Commands in Category */}
                  {categoryCommands.map((command, _index) => {
                    const globalIndex = filteredCommands.indexOf(command);
                    return (
                      <button
                        key={command.id}
                        onClick={() => {
                          command.action();
                          onClose();
                          setQuery('');
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left state-transition ${
                          globalIndex === selectedIndex
                            ? 'bg-terminal-hover border-l-2 border-purple-500'
                            : 'hover:bg-terminal-hover'
                        }`}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <span className="text-2xl">{command.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary">
                            {command.name}
                          </div>
                          <div className="text-xs text-text-tertiary truncate">
                            {command.description}
                          </div>
                        </div>
                        {command.shortcut && (
                          <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-terminal-surface border border-terminal-border rounded text-text-tertiary">
                            {command.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-terminal-border bg-terminal-surface flex items-center justify-between text-xs text-text-tertiary">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-terminal-panel border border-terminal-border rounded">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-terminal-panel border border-terminal-border rounded">
                ↓
              </kbd>
              <span className="ml-1">to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-terminal-panel border border-terminal-border rounded">
                ↵
              </kbd>
              <span className="ml-1">to select</span>
            </span>
          </div>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
