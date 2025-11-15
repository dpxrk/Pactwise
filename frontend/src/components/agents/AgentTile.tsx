'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { AgentType, AgentStatus, AgentComplexityLevel } from '@/types/agents.types';

export interface AgentTileProps {
  name: string;
  path: string;
  description: string;
  icon: string;
  type: AgentType;
  status?: 'active' | 'ready' | 'beta' | 'disabled';
  wip?: boolean;
  metrics?: {
    processed?: number;
    savings?: string;
    activeCount?: number;
  };
  complexityLevel?: AgentComplexityLevel;
  useWhen?: string;
  exampleQueries?: string[];
}

const AgentTile: React.FC<AgentTileProps> = ({
  name,
  path,
  description,
  icon,
  type,
  status = 'active',
  wip = false,
  metrics,
  complexityLevel,
  useWhen,
  exampleQueries
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDisabled = wip || status === 'disabled';

  // Determine status color using purple/pink palette
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-purple-500'; // Mountbatten pink for active
      case 'beta':
        return 'bg-warning'; // Orange for beta
      case 'ready':
        return 'bg-success'; // Green for ready
      case 'disabled':
        return 'bg-ghost-500'; // Gray for disabled
      default:
        return 'bg-purple-500';
    }
  };

  // Determine badge styling
  const getBadgeStyle = () => {
    if (wip) {
      return 'bg-warning/20 text-warning border border-warning/30';
    }
    switch (status) {
      case 'active':
        return 'bg-purple-500/20 text-purple-500 border border-purple-500/30';
      case 'beta':
        return 'bg-warning/20 text-warning border border-warning/30';
      case 'ready':
        return 'bg-success/20 text-success border border-success/30';
      case 'disabled':
        return 'bg-ghost-500/20 text-ghost-500 border border-ghost-500/30';
      default:
        return 'bg-purple-500/20 text-purple-500 border border-purple-500/30';
    }
  };

  // Determine complexity badge styling
  const getComplexityBadgeStyle = () => {
    switch (complexityLevel) {
      case 'standard':
        return 'bg-success/20 text-success border-success/30';
      case 'advanced':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'expert':
        return 'bg-warning/20 text-warning border-warning/30';
      default:
        return 'bg-ghost-500/20 text-ghost-500 border-ghost-500/30';
    }
  };

  const content = (
    <div
      className={`group relative h-full min-h-[280px] ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Main Card - Light design with purple/pink accents */}
      <div className={`relative h-full bg-white border border-ghost-300 hover:border-purple-500 overflow-hidden transition-all duration-200 ${
        isDisabled ? 'opacity-50' : 'hover:shadow-luxury'
      }`}>
        {/* Top Status Bar - Purple/Pink accent */}
        <div className={`h-1 ${getStatusColor()}`} />

        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="text-2xl">{icon}</div>

            <div className="flex items-center gap-1.5">
              {/* Complexity Badge */}
              {complexityLevel && (
                <div
                  className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border ${getComplexityBadgeStyle()}`}
                  title={`Complexity: ${complexityLevel}`}
                >
                  {complexityLevel}
                </div>
              )}

              {/* Status Badge */}
              <div className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getBadgeStyle()}`}>
                {wip ? 'Beta' : status}
              </div>
            </div>
          </div>

          {/* Agent Name */}
          <h3 className="text-sm font-semibold text-purple-900 mb-1 leading-tight font-mono">
            {name}
          </h3>

          {/* Description */}
          <p className="text-xs text-ghost-600 leading-relaxed mb-3">
            {description}
          </p>

          {/* Use When Info */}
          {useWhen && (
            <div className="mb-3 p-2 bg-purple-50 border border-purple-200">
              <div className="flex items-start gap-2">
                <svg className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-[10px] text-ghost-500 uppercase tracking-wider mb-0.5 font-mono">Use When</div>
                  <div className="text-xs text-ghost-700 leading-snug">{useWhen}</div>
                </div>
              </div>
            </div>
          )}

          {/* Example Queries (shown on hover for agents with queries) */}
          {exampleQueries && exampleQueries.length > 0 && (
            <div className="mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="text-[10px] text-ghost-500 uppercase tracking-wider mb-1 font-mono">Example Queries</div>
              <div className="space-y-1">
                {exampleQueries.slice(0, 2).map((query, idx) => (
                  <div key={idx} className="text-[11px] text-purple-500 leading-snug flex items-start gap-1">
                    <span className="text-ghost-400">•</span>
                    <span>{query}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metrics */}
          {metrics && (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              {metrics.processed !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-ghost-500 font-mono">Processed:</span>
                  <span className="text-ghost-700 font-medium metric-value">{metrics.processed}</span>
                </div>
              )}
              {metrics.savings && (
                <div className="flex items-center gap-1">
                  <span className="text-ghost-500 font-mono">Saved:</span>
                  <span className="text-success font-medium metric-value">{metrics.savings}</span>
                </div>
              )}
              {metrics.activeCount !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-ghost-500 font-mono">Active:</span>
                  <span className="text-ghost-700 font-medium metric-value">{metrics.activeCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Hover Arrow Indicator */}
          {!isDisabled && (
            <div className="mt-3 flex items-center gap-1 text-purple-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-mono">
              <span>Open</span>
              <svg
                className="w-3 h-3 transform group-hover:translate-x-1 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Bottom border accent on hover - Purple glow */}
        {!isDisabled && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        )}
      </div>
    </div>
  );

  // Wrap in Link if not disabled
  if (isDisabled) {
    return content;
  }

  return (
    <Link href={path} className="block h-full">
      {content}
    </Link>
  );
};

export default AgentTile;
