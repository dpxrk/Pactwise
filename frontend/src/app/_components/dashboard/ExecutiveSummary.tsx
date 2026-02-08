'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Users,
  Calendar,
  Target,
  Zap,
  Shield,
} from 'lucide-react';
import React from 'react';


interface ExecutiveSummaryProps {
  contractStats: {
    total: number;
    byStatus: {
      active: number;
      draft: number;
      pending_analysis: number;
      expired: number;
      terminated: number;
      archived: number;
    };
    recentlyCreated: number;
  };
  totalContractValue: number;
  expiringCount: number;
  totalVendors: number;
  complianceScore: number;
  riskScore: number;
  sectionsToShow?: Array<'hero' | 'quickStats' | 'whatsHappening' | 'byTheNumbers' | 'riskCompliance'>;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  contractStats,
  totalContractValue,
  expiringCount,
  totalVendors,
  complianceScore,
  riskScore,
  sectionsToShow = ['hero', 'quickStats', 'whatsHappening', 'byTheNumbers', 'riskCompliance'],
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate key insights
  const activePercentage = contractStats.total > 0 
    ? Math.round((contractStats.byStatus.active / contractStats.total) * 100)
    : 0;

  const _needsAttention = expiringCount + contractStats.byStatus.pending_analysis + contractStats.byStatus.draft + contractStats.byStatus.expired;
  
  // Check if contracts have passed their end date
  const hasExpiredContracts = contractStats.byStatus.expired > 0;

  const shouldShow = (section: string) => sectionsToShow.includes(section as any);

  return (
    <div className="space-y-4">
      {/* Hero Section - Bloomberg Terminal Style */}
      {shouldShow('hero') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="border border-ghost-300 bg-purple-900 overflow-hidden relative">
          <div className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">CONTRACT PORTFOLIO</h1>
                <p className="text-purple-200 font-mono text-xs uppercase tracking-wider">Enterprise Intelligence Dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-success animate-pulse" />
                <span className="font-mono text-xs text-white uppercase">LIVE</span>
              </div>
            </div>

            {/* Big Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="space-y-1">
                <div className="font-mono text-xs text-purple-200 uppercase tracking-wider">Total Contracts</div>
                <div className="text-4xl font-bold font-mono text-white">{formatNumber(contractStats.total)}</div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success-400" />
                  <span className="font-mono text-xs text-purple-200">{activePercentage}% ACTIVE</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-mono text-xs text-purple-200 uppercase tracking-wider">Portfolio Value</div>
                <div className="text-4xl font-bold font-mono text-white">{formatCurrency(totalContractValue)}</div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success-400" />
                  <span className="font-mono text-xs text-purple-200">TRACKED</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-mono text-xs text-purple-200 uppercase tracking-wider">Active Vendors</div>
                <div className="text-4xl font-bold font-mono text-white">{formatNumber(totalVendors)}</div>
                <div className="font-mono text-xs text-purple-200">MANAGED</div>
              </div>

              <div className="space-y-1">
                <div className="font-mono text-xs text-purple-200 uppercase tracking-wider">Health Score</div>
                <div className="text-4xl font-bold font-mono text-white">{complianceScore}%</div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-success-400" />
                  <span className="font-mono text-xs text-purple-200">COMPLIANT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* Quick Stats Grid */}
      {shouldShow('quickStats') && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="border border-ghost-300 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 className="h-4 w-4 text-ghost-400" />
              <span className="px-2 py-0.5 text-[10px] uppercase bg-success-50 text-success-700 border border-success-200 font-mono">ACTIVE</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold font-mono text-purple-900">{contractStats.byStatus.active}</div>
              <div className="font-mono text-xs text-ghost-600 uppercase tracking-wider">Active Contracts</div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success-600" />
                <span className="font-mono text-xs text-ghost-600">{activePercentage}% OF TOTAL</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="border border-ghost-300 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <Clock className="h-4 w-4 text-ghost-400" />
              <span className={`px-2 py-0.5 text-[10px] uppercase font-mono ${
                expiringCount > 0 ? 'bg-warning-50 text-warning-700 border border-warning-200' : 'bg-success-50 text-success-700 border border-success-200'
              }`}>
                {expiringCount > 0 ? 'ACTION REQUIRED' : 'ON TRACK'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold font-mono text-purple-900">{expiringCount}</div>
              <div className="font-mono text-xs text-ghost-600 uppercase tracking-wider">Expiring Soon</div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-ghost-500" />
                <span className="font-mono text-xs text-ghost-600">NEXT 30 DAYS</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="border border-ghost-300 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <FileText className="h-4 w-4 text-ghost-400" />
              <span className="px-2 py-0.5 text-[10px] uppercase bg-purple-50 text-purple-700 border border-purple-200 font-mono">PIPELINE</span>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold font-mono text-purple-900">
                {contractStats.byStatus.draft + contractStats.byStatus.pending_analysis}
              </div>
              <div className="font-mono text-xs text-ghost-600 uppercase tracking-wider">In Progress</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ghost-600">{contractStats.byStatus.draft} DRAFTS</span>
                <span className="text-ghost-400">•</span>
                <span className="font-mono text-xs text-ghost-600">{contractStats.byStatus.pending_analysis} PENDING</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      )}

      {/* What's Happening - Bloomberg Terminal Style */}
      {shouldShow('whatsHappening') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ghost-700">SYSTEM ALERTS</h2>
            <button className="font-mono text-xs text-purple-900 hover:text-purple-700 uppercase">
              VIEW ALL →
            </button>
          </div>
          <div className="p-4">

            <div className="space-y-3">
              {/* Priority Items */}
              {hasExpiredContracts && (
                <div className="flex items-start gap-3 p-3 bg-error-50 border-l-2 border-error-600">
                  <AlertTriangle className="h-4 w-4 text-error-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-purple-900">Expired Contracts</h3>
                      <span className="px-2 py-0.5 text-[10px] uppercase bg-error-100 text-error-800 border border-error-300 font-mono">
                        ACTION REQUIRED
                      </span>
                    </div>
                    <p className="font-mono text-xs text-ghost-700 mb-2">
                      {contractStats.byStatus.expired} {contractStats.byStatus.expired === 1 ? 'CONTRACT' : 'CONTRACTS'} EXPIRED - RENEWAL OR TERMINATION NEEDED
                    </p>
                    <button className="border border-error-300 bg-white px-3 py-1 font-mono text-[10px] text-error-700 hover:bg-error-100 uppercase">
                      REVIEW →
                    </button>
                  </div>
                </div>
              )}

              {expiringCount > 0 && (
                <div className="flex items-start gap-3 p-3 bg-warning-50 border-l-2 border-warning-600">
                  <AlertTriangle className="h-4 w-4 text-warning-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-purple-900">Expiring Contracts</h3>
                      <span className="px-2 py-0.5 text-[10px] uppercase bg-warning-100 text-warning-800 border border-warning-300 font-mono">
                        URGENT
                      </span>
                    </div>
                    <p className="font-mono text-xs text-ghost-700 mb-2">
                      {expiringCount} {expiringCount === 1 ? 'CONTRACT' : 'CONTRACTS'} EXPIRING IN NEXT 30 DAYS
                    </p>
                    <button className="border border-warning-300 bg-white px-3 py-1 font-mono text-[10px] text-warning-700 hover:bg-warning-100 uppercase">
                      REVIEW RENEWALS →
                    </button>
                  </div>
                </div>
              )}

              {contractStats.byStatus.pending_analysis > 0 && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 border-l-2 border-purple-600">
                  <Zap className="h-4 w-4 text-purple-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-purple-900">Pending Analysis</h3>
                      <span className="px-2 py-0.5 text-[10px] uppercase bg-purple-100 text-purple-800 border border-purple-300 font-mono">
                        IN PROGRESS
                      </span>
                    </div>
                    <p className="font-mono text-xs text-ghost-700 mb-2">
                      {contractStats.byStatus.pending_analysis} {contractStats.byStatus.pending_analysis === 1 ? 'CONTRACT' : 'CONTRACTS'} AWAITING AI ANALYSIS
                    </p>
                    <button className="border border-purple-300 bg-white px-3 py-1 font-mono text-[10px] text-purple-700 hover:bg-purple-100 uppercase">
                      VIEW QUEUE →
                    </button>
                  </div>
                </div>
              )}

              {contractStats.recentlyCreated > 0 && (
                <div className="flex items-start gap-3 p-3 bg-success-50 border-l-2 border-success-600">
                  <TrendingUp className="h-4 w-4 text-success-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-purple-900">Recent Activity</h3>
                      <span className="px-2 py-0.5 text-[10px] uppercase bg-success-100 text-success-800 border border-success-300 font-mono">
                        THIS WEEK
                      </span>
                    </div>
                    <p className="font-mono text-xs text-ghost-700">
                      {contractStats.recentlyCreated} NEW {contractStats.recentlyCreated === 1 ? 'CONTRACT' : 'CONTRACTS'} ADDED IN LAST 7 DAYS
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* By the Numbers */}
      {shouldShow('byTheNumbers') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-4 py-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ghost-700">BY THE NUMBERS</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold font-mono text-purple-900">{contractStats.byStatus.active}</div>
                <div className="font-mono text-xs text-ghost-600 uppercase">Active</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold font-mono text-purple-900">{contractStats.byStatus.draft}</div>
                <div className="font-mono text-xs text-ghost-600 uppercase">Drafts</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold font-mono text-purple-900">{contractStats.byStatus.pending_analysis}</div>
                <div className="font-mono text-xs text-ghost-600 uppercase">Pending</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold font-mono text-purple-900">{contractStats.byStatus.expired}</div>
                <div className="font-mono text-xs text-ghost-600 uppercase">Expired</div>
              </div>
            </div>

            <div className="border-t border-ghost-200 my-4" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-ghost-400" />
                <div>
                  <div className="text-lg font-bold font-mono text-purple-900">{formatCurrency(totalContractValue)}</div>
                  <div className="font-mono text-xs text-ghost-600 uppercase">Total Value</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-ghost-400" />
                <div>
                  <div className="text-lg font-bold font-mono text-purple-900">{totalVendors}</div>
                  <div className="font-mono text-xs text-ghost-600 uppercase">Vendor Partners</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-ghost-400" />
                <div>
                  <div className="text-lg font-bold font-mono text-purple-900">
                    {totalVendors > 0 ? (contractStats.total / totalVendors).toFixed(1) : '0'}
                  </div>
                  <div className="font-mono text-xs text-ghost-600 uppercase">Avg/Vendor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* Risk & Compliance */}
      {shouldShow('riskCompliance') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-ghost-300 bg-white">
            <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">Compliance Health</h3>
              <Shield className="h-4 w-4 text-ghost-400" />
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-bold font-mono text-purple-900">{complianceScore}</span>
                    <span className="text-2xl font-mono text-ghost-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-2 bg-ghost-200">
                    <div
                      className="h-full bg-green-600 transition-all duration-500"
                      style={{ width: `${complianceScore}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {complianceScore >= 80 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-mono text-xs text-green-700 uppercase">Excellent Status</span>
                    </>
                  ) : complianceScore >= 60 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-mono text-xs text-amber-700 uppercase">Moderate Risk</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-mono text-xs text-red-700 uppercase">Attention Required</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-ghost-300 bg-white">
            <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">Risk Assessment</h3>
              <AlertTriangle className="h-4 w-4 text-ghost-400" />
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-bold font-mono text-purple-900">{riskScore}</span>
                    <span className="text-2xl font-mono text-ghost-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-2 bg-ghost-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        riskScore < 30 ? 'bg-green-600' :
                        riskScore < 60 ? 'bg-amber-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${riskScore}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {riskScore < 30 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-mono text-xs text-green-700 uppercase">Low Risk Portfolio</span>
                    </>
                  ) : riskScore < 60 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-mono text-xs text-amber-700 uppercase">Moderate Risk</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-mono text-xs text-red-700 uppercase">High Risk - Review</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      )}
    </div>
  );
};