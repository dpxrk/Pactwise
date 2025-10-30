'use client';

import React from 'react';

export interface GlobalMetrics {
  totalSavings?: string;
  savingsChange?: string;
  activeContracts?: number;
  contractsChange?: string;
  pendingApprovals?: number;
  approvalsChange?: string;
  vendorsActive?: number;
  vendorsChange?: string;
  expiringContracts?: number;
  urgentApprovals?: number;
  complianceRate?: string;
}

export interface MetricsGridProps {
  metrics?: GlobalMetrics | null;
  isLoading?: boolean;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, isLoading = false }) => {
  // Determine if change is positive or negative
  const getChangeColor = (change?: string) => {
    if (!change) return '';
    if (change.startsWith('+')) return 'text-success';
    if (change.startsWith('-')) return 'text-error';
    return 'text-purple-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* Total Savings Metric */}
      <div className="terminal-panel rounded p-4 pro-glow state-transition">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Total Savings YTD</span>
          {metrics?.savingsChange && (
            <span className={`text-xs font-medium ${getChangeColor(metrics.savingsChange)}`}>
              {metrics.savingsChange}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-text-primary metric-value">
          {isLoading ? '—' : (metrics?.totalSavings || '—')}
        </div>
        <div className="mt-2 h-1 bg-terminal-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-success state-transition"
            style={{ width: metrics?.totalSavings ? '67%' : '0%' }}
          />
        </div>
      </div>

      {/* Active Contracts Metric */}
      <div className="terminal-panel rounded p-4 pro-glow state-transition">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Active Contracts</span>
          {metrics?.contractsChange && (
            <span className={`text-xs font-medium ${getChangeColor(metrics.contractsChange)}`}>
              {metrics.contractsChange}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-text-primary metric-value">
          {isLoading ? '—' : (metrics?.activeContracts ?? '—')}
        </div>
        {metrics?.expiringContracts !== undefined && (
          <div className="mt-2 text-xs text-text-tertiary">
            <span className="text-text-secondary">{metrics.expiringContracts}</span> expiring in 30 days
          </div>
        )}
      </div>

      {/* Pending Approvals Metric */}
      <div className="terminal-panel rounded p-4 pro-glow state-transition">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Pending Approvals</span>
          {metrics?.approvalsChange && (
            <span className={`text-xs font-medium ${getChangeColor(metrics.approvalsChange)}`}>
              {metrics.approvalsChange}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-text-primary metric-value">
          {isLoading ? '—' : (metrics?.pendingApprovals ?? '—')}
        </div>
        {metrics?.urgentApprovals !== undefined && (
          <div className="mt-2 text-xs text-text-tertiary">
            <span className="text-warning font-medium">{metrics.urgentApprovals}</span> urgent
          </div>
        )}
      </div>

      {/* Active Vendors Metric */}
      <div className="terminal-panel rounded p-4 pro-glow state-transition">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Active Vendors</span>
          {metrics?.vendorsChange && (
            <span className={`text-xs font-medium ${getChangeColor(metrics.vendorsChange)}`}>
              {metrics.vendorsChange}
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-text-primary metric-value">
          {isLoading ? '—' : (metrics?.vendorsActive ?? '—')}
        </div>
        {metrics?.complianceRate && (
          <div className="mt-2 text-xs text-text-tertiary">
            <span className="text-text-secondary">{metrics.complianceRate}</span> compliance rate
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsGrid;
