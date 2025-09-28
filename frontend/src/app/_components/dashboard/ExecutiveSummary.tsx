'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Users,
  Calendar,
  Target,
  Zap,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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

  const needsAttention = expiringCount + contractStats.byStatus.pending_analysis + contractStats.byStatus.draft + contractStats.byStatus.expired;
  
  // Check if contracts have passed their end date
  const hasExpiredContracts = contractStats.byStatus.expired > 0;

  const shouldShow = (section: string) => sectionsToShow.includes(section as any);

  return (
    <div className="space-y-6">
      {/* Hero Section - Axios Style */}
      {shouldShow('hero') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Contract Portfolio</h1>
                <p className="text-slate-300 text-lg">Your enterprise contract intelligence dashboard</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-sm px-3 py-1">
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                Live
              </Badge>
            </div>

            {/* Big Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="space-y-2">
                <div className="text-slate-400 text-sm font-medium">Total Contracts</div>
                <div className="text-5xl font-bold text-white">{formatNumber(contractStats.total)}</div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {activePercentage}% Active
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-slate-400 text-sm font-medium">Portfolio Value</div>
                <div className="text-5xl font-bold text-white">{formatCurrency(totalContractValue)}</div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>Tracked</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-slate-400 text-sm font-medium">Active Vendors</div>
                <div className="text-5xl font-bold text-white">{formatNumber(totalVendors)}</div>
                <div className="text-slate-400 text-sm">Relationships managed</div>
              </div>

              <div className="space-y-2">
                <div className="text-slate-400 text-sm font-medium">Health Score</div>
                <div className="text-5xl font-bold text-white">{complianceScore}%</div>
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>Compliant</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Active
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">{contractStats.byStatus.active}</div>
                <div className="text-sm text-slate-600">Active Contracts</div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <TrendingUp className="h-3 w-3" />
                  {activePercentage}% of total portfolio
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                  {expiringCount > 0 ? 'Action Required' : 'On Track'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">{expiringCount}</div>
                <div className="text-sm text-slate-600">Expiring Soon</div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="h-3 w-3" />
                  Next 30 days
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                  Pipeline
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {contractStats.byStatus.draft + contractStats.byStatus.pending_analysis}
                </div>
                <div className="text-sm text-slate-600">In Progress</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{contractStats.byStatus.draft} drafts</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{contractStats.byStatus.pending_analysis} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      )}

      {/* What's Happening - Axios Style */}
      {shouldShow('whatsHappening') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">What's happening</h2>
              <Button variant="ghost" size="sm" className="text-slate-600">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Priority Items */}
              {hasExpiredContracts && (
                <div className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">Expired Contracts</h3>
                      <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                        Action Required
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">
                      {contractStats.byStatus.expired} {contractStats.byStatus.expired === 1 ? 'contract has' : 'contracts have'} expired and need renewal or termination
                    </p>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100">
                      Review expired contracts
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
              
              {expiringCount > 0 && (
                <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">Expiring Contracts</h3>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        Urgent
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">
                      {expiringCount} {expiringCount === 1 ? 'contract' : 'contracts'} expiring in the next 30 days
                    </p>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                      Review renewals
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {contractStats.byStatus.pending_analysis > 0 && (
                <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">Pending Analysis</h3>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        In Progress
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">
                      {contractStats.byStatus.pending_analysis} {contractStats.byStatus.pending_analysis === 1 ? 'contract' : 'contracts'} awaiting AI analysis
                    </p>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-100">
                      View queue
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {contractStats.recentlyCreated > 0 && (
                <div className="flex items-start gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                        This Week
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700">
                      {contractStats.recentlyCreated} new {contractStats.recentlyCreated === 1 ? 'contract' : 'contracts'} added in the last 7 days
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      )}

      {/* By the Numbers */}
      {shouldShow('byTheNumbers') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">By the numbers</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-slate-900">{contractStats.byStatus.active}</div>
                <div className="text-sm text-slate-600">Active</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold text-slate-900">{contractStats.byStatus.draft}</div>
                <div className="text-sm text-slate-600">Drafts</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold text-slate-900">{contractStats.byStatus.pending_analysis}</div>
                <div className="text-sm text-slate-600">Pending</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold text-slate-900">{contractStats.byStatus.expired}</div>
                <div className="text-sm text-slate-600">Expired</div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{formatCurrency(totalContractValue)}</div>
                  <div className="text-xs text-slate-600">Total Value</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{totalVendors}</div>
                  <div className="text-xs text-slate-600">Vendor Partners</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center">
                  <Target className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    {totalVendors > 0 ? (contractStats.total / totalVendors).toFixed(1) : '0'}
                  </div>
                  <div className="text-xs text-slate-600">Avg Contracts/Vendor</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Compliance Health</h3>
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-bold text-slate-900">{complianceScore}</span>
                    <span className="text-2xl text-slate-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                      style={{ width: `${complianceScore}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {complianceScore >= 80 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm text-emerald-700 font-medium">Excellent compliance status</span>
                    </>
                  ) : complianceScore >= 60 ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="text-sm text-amber-700 font-medium">Moderate compliance risk</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-sm text-red-700 font-medium">Attention required</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Risk Assessment</h3>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-bold text-slate-900">{riskScore}</span>
                    <span className="text-2xl text-slate-500 mb-1">/100</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        riskScore < 30 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                        riskScore < 60 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                        'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${riskScore}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {riskScore < 30 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm text-emerald-700 font-medium">Low risk portfolio</span>
                    </>
                  ) : riskScore < 60 ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="text-sm text-amber-700 font-medium">Moderate risk detected</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-sm text-red-700 font-medium">High risk - review recommended</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
      )}
    </div>
  );
};