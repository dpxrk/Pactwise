'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FileText,
  Clock,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Terminal,
  Code,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Settings,
  ChevronDown,
} from 'lucide-react';

export default function RevampDemo() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>('agent-001');
  const [activeTab, setActiveTab] = useState<'overview' | 'terminal' | 'analytics'>('overview');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  return (
    <div className="min-h-screen bg-ghost-100 font-sans">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700">SYSTEM ACTIVE</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">VENDORS:</span>
              <span className="font-semibold text-purple-900">247</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">CONTRACTS:</span>
              <span className="font-semibold text-purple-900">1,834</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">AGENTS:</span>
              <span className="font-semibold text-purple-900">12</span>
            </div>
          </div>
        </div>
      </div>

      {/* Three Column Grid */}
      <div className="grid grid-cols-12 gap-0">
        {/* Left Sidebar - Agent List */}
        <div className="col-span-3 border-r border-ghost-300 bg-white h-[calc(100vh-57px)] overflow-y-auto">
          <div className="border-b border-ghost-300 px-4 py-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
              ACTIVE AGENTS
            </h2>
          </div>
          <div className="divide-y divide-ghost-200">
            {[
              { id: 'agent-001', name: 'Contract Analyzer', status: 'active', tasks: 23 },
              { id: 'agent-002', name: 'Vendor Intelligence', status: 'active', tasks: 18 },
              { id: 'agent-003', name: 'Legal Operations', status: 'idle', tasks: 5 },
              { id: 'agent-004', name: 'Compliance Guardian', status: 'active', tasks: 31 },
              { id: 'agent-005', name: 'Financial Analyzer', status: 'processing', tasks: 12 },
              { id: 'agent-006', name: 'Document Processor', status: 'active', tasks: 45 },
            ].map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedAgent === agent.id
                    ? 'bg-purple-50 border-l-2 border-purple-900'
                    : 'hover:bg-ghost-50 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-mono text-xs text-ghost-900">{agent.id}</span>
                  <span className="flex items-center gap-1">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        agent.status === 'active'
                          ? 'bg-green-500'
                          : agent.status === 'processing'
                          ? 'bg-purple-500 animate-pulse'
                          : 'bg-ghost-400'
                      }`}
                    />
                    <span className="font-mono text-[10px] uppercase text-ghost-600">
                      {agent.status}
                    </span>
                  </span>
                </div>
                <div className="text-sm text-ghost-900 mb-1">{agent.name}</div>
                <div className="font-mono text-xs text-ghost-600">{agent.tasks} TASKS</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-6 h-[calc(100vh-57px)] overflow-y-auto bg-ghost-50 p-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-0 mb-6 border border-ghost-300 bg-white w-fit">
            {[
              { id: 'overview', label: 'OVERVIEW', icon: <BarChart3 className="h-3 w-3" /> },
              { id: 'terminal', label: 'TERMINAL', icon: <Terminal className="h-3 w-3" /> },
              { id: 'analytics', label: 'ANALYTICS', icon: <Activity className="h-3 w-3" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2 font-mono text-xs uppercase flex items-center gap-2 transition-colors border-r border-ghost-300 last:border-r-0 ${
                  activeTab === tab.id
                    ? 'bg-purple-900 text-white'
                    : 'text-ghost-700 hover:bg-ghost-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-ghost-400" />
                    <input
                      type="text"
                      placeholder="SEARCH CONTRACTS..."
                      className="border border-ghost-300 bg-white pl-9 pr-4 py-2 font-mono text-xs placeholder:text-ghost-400 focus:outline-none focus:border-purple-900 w-64"
                    />
                  </div>
                  <button className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 flex items-center gap-2">
                    <Filter className="h-3 w-3" />
                    FILTER
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 flex items-center gap-2">
                    <Download className="h-3 w-3" />
                    EXPORT
                  </button>
                  <button className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 flex items-center gap-2">
                    <RefreshCw className="h-3 w-3" />
                    REFRESH
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricCard
              label="PROCESSED TODAY"
              value="2,847"
              change={12.5}
              trend="up"
              icon={<FileText className="h-4 w-4" />}
            />
            <MetricCard
              label="AVG PROCESSING TIME"
              value="1.2s"
              change={-8.3}
              trend="down"
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricCard
              label="ACCURACY RATE"
              value="99.7%"
              change={0.3}
              trend="up"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>

          {/* Main Data Panel */}
          <div className="border border-ghost-300 bg-white mb-6">
            <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                RECENT CONTRACTS ANALYZED
              </h3>
              <button className="font-mono text-xs text-purple-900 hover:text-purple-700">
                VIEW ALL →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-ghost-300 bg-ghost-700">
                    <th className="px-4 py-2 text-left font-normal text-white">ID</th>
                    <th className="px-4 py-2 text-left font-normal text-white">VENDOR</th>
                    <th className="px-4 py-2 text-left font-normal text-white">TYPE</th>
                    <th className="px-4 py-2 text-right font-normal text-white">VALUE</th>
                    <th className="px-4 py-2 text-left font-normal text-white">RISK</th>
                    <th className="px-4 py-2 text-left font-normal text-white">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ghost-200">
                  {[
                    {
                      id: 'CTR-2847',
                      vendor: 'CloudTech Solutions',
                      type: 'SAAS',
                      value: 245000,
                      risk: 'LOW',
                      status: 'APPROVED',
                    },
                    {
                      id: 'CTR-2846',
                      vendor: 'DataFlow Systems',
                      type: 'MAINTENANCE',
                      value: 180000,
                      risk: 'LOW',
                      status: 'APPROVED',
                    },
                    {
                      id: 'CTR-2845',
                      vendor: 'SecureNet Inc',
                      type: 'SECURITY',
                      value: 98000,
                      risk: 'MEDIUM',
                      status: 'REVIEW',
                    },
                    {
                      id: 'CTR-2844',
                      vendor: 'Apex Consulting',
                      type: 'CONSULTING',
                      value: 150000,
                      risk: 'LOW',
                      status: 'APPROVED',
                    },
                    {
                      id: 'CTR-2843',
                      vendor: 'Legal Partners LLP',
                      type: 'LEGAL',
                      value: 85000,
                      risk: 'HIGH',
                      status: 'FLAGGED',
                    },
                  ].map((contract) => (
                    <tr
                      key={contract.id}
                      className="hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-purple-900">{contract.id}</td>
                      <td className="px-4 py-2.5 text-ghost-900">{contract.vendor}</td>
                      <td className="px-4 py-2.5 text-ghost-700">{contract.type}</td>
                      <td className="px-4 py-2.5 text-right text-ghost-900">
                        ${contract.value.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            contract.risk === 'LOW'
                              ? 'text-green-600'
                              : contract.risk === 'MEDIUM'
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              contract.risk === 'LOW'
                                ? 'bg-green-500'
                                : contract.risk === 'MEDIUM'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {contract.risk}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase ${
                            contract.status === 'APPROVED'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : contract.status === 'REVIEW'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {contract.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow Visualization */}
          <div className="border border-ghost-300 bg-white">
            <div className="border-b border-ghost-300 px-4 py-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                PROCESSING PIPELINE
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                {[
                  { label: 'INTAKE', count: 45, color: 'purple' },
                  { label: 'ANALYSIS', count: 23, color: 'purple' },
                  { label: 'REVIEW', count: 12, color: 'purple' },
                  { label: 'APPROVAL', count: 8, color: 'green' },
                ].map((stage, idx) => (
                  <React.Fragment key={stage.label}>
                    <div className="border border-ghost-300 px-6 py-4 min-w-[140px]">
                      <div className="font-mono text-xs text-ghost-600 mb-1">{stage.label}</div>
                      <div className="text-2xl font-bold text-purple-900">{stage.count}</div>
                      <div className="mt-2 h-1 bg-ghost-200">
                        <div
                          className={`h-full bg-${stage.color}-500`}
                          style={{ width: `${(stage.count / 45) * 100}%` }}
                        />
                      </div>
                    </div>
                    {idx < 3 && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="h-px w-full border-t border-dashed border-ghost-300" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  RISK DISTRIBUTION
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {[
                    { level: 'LOW', count: 142, percentage: 68, color: 'green' },
                    { level: 'MEDIUM', count: 48, percentage: 23, color: 'amber' },
                    { level: 'HIGH', count: 19, percentage: 9, color: 'red' },
                  ].map((risk) => (
                    <div key={risk.level}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full bg-${risk.color}-500`} />
                          <span className="font-mono text-xs text-ghost-700">{risk.level}</span>
                        </div>
                        <span className="font-mono text-xs text-ghost-900">{risk.count}</span>
                      </div>
                      <div className="h-1.5 bg-ghost-200">
                        <div
                          className={`h-full bg-${risk.color}-500`}
                          style={{ width: `${risk.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                  VENDOR CATEGORIES
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {[
                    { category: 'TECHNOLOGY', count: 89, trend: 'up' },
                    { category: 'CONSULTING', count: 45, trend: 'up' },
                    { category: 'LEGAL', count: 32, trend: 'down' },
                    { category: 'LOGISTICS', count: 28, trend: 'up' },
                    { category: 'FACILITIES', count: 15, trend: 'neutral' },
                  ].map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between py-1">
                      <span className="font-mono text-xs text-ghost-700">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-purple-900 font-semibold">
                          {cat.count}
                        </span>
                        {cat.trend === 'up' ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : cat.trend === 'down' ? (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        ) : (
                          <div className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
            </div>
          )}

          {/* Terminal View */}
          {activeTab === 'terminal' && (
            <div className="border border-ghost-300 bg-black text-green-400 font-mono text-xs h-[calc(100vh-200px)]">
              <div className="border-b border-ghost-700 px-4 py-2 bg-ghost-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="ml-3 text-ghost-400">agent-001@pactwise:~$</span>
                </div>
                <span className="text-ghost-600">{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                <div>
                  <span className="text-purple-400">pactwise@system</span>
                  <span className="text-ghost-500">:</span>
                  <span className="text-blue-400">~</span>
                  <span className="text-ghost-500">$ </span>
                  <span className="text-green-400">./analyze-contracts --batch=latest</span>
                </div>
                <div className="text-ghost-400">
                  [2025-01-04 14:32:18] Initializing contract analysis pipeline...
                </div>
                <div className="text-ghost-400">
                  [2025-01-04 14:32:19] Loading AI models... <span className="text-green-400">OK</span>
                </div>
                <div className="text-ghost-400">
                  [2025-01-04 14:32:20] Connecting to database...{' '}
                  <span className="text-green-400">OK</span>
                </div>
                <div className="text-ghost-400">
                  [2025-01-04 14:32:21] Found 247 contracts for analysis
                </div>
                <div className="text-ghost-400 ml-4">→ Processing batch 1/5...</div>
                <div className="text-green-400 ml-4">✓ CTR-2847 analyzed [95% confidence]</div>
                <div className="text-green-400 ml-4">✓ CTR-2846 analyzed [98% confidence]</div>
                <div className="text-green-400 ml-4">✓ CTR-2845 analyzed [87% confidence]</div>
                <div className="text-amber-400 ml-4">⚠ CTR-2844 flagged for manual review</div>
                <div className="text-green-400 ml-4">✓ CTR-2843 analyzed [92% confidence]</div>
                <div className="text-ghost-400 ml-4">→ Processing batch 2/5...</div>
                <div className="text-green-400 ml-4">✓ CTR-2842 analyzed [96% confidence]</div>
                <div className="text-green-400 ml-4">✓ CTR-2841 analyzed [94% confidence]</div>
                <div className="text-red-400 ml-4">✗ CTR-2840 failed - missing metadata</div>
                <div className="text-green-400 ml-4">✓ CTR-2839 analyzed [99% confidence]</div>
                <div className="text-ghost-400">[2025-01-04 14:32:45] Analysis complete</div>
                <div className="text-green-400">
                  → 242/247 contracts processed successfully (98.0%)
                </div>
                <div className="text-amber-400">→ 4 contracts flagged for review</div>
                <div className="text-red-400">→ 1 contract failed</div>
                <div className="mt-2">
                  <span className="text-purple-400">pactwise@system</span>
                  <span className="text-ghost-500">:</span>
                  <span className="text-blue-400">~</span>
                  <span className="text-ghost-500">$ </span>
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
          )}

          {/* Analytics View */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Time Series Chart */}
              <div className="border border-ghost-300 bg-white">
                <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                    CONTRACT PROCESSING VOLUME (7 DAYS)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button className="font-mono text-xs text-ghost-600 hover:text-purple-900">
                      DAILY
                    </button>
                    <span className="text-ghost-400">|</span>
                    <button className="font-mono text-xs text-purple-900 font-semibold">
                      WEEKLY
                    </button>
                    <span className="text-ghost-400">|</span>
                    <button className="font-mono text-xs text-ghost-600 hover:text-purple-900">
                      MONTHLY
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-48 flex items-end justify-between gap-2">
                    {[
                      { day: 'MON', value: 234, percentage: 78 },
                      { day: 'TUE', value: 289, percentage: 96 },
                      { day: 'WED', value: 267, percentage: 89 },
                      { day: 'THU', value: 301, percentage: 100 },
                      { day: 'FRI', value: 278, percentage: 92 },
                      { day: 'SAT', value: 145, percentage: 48 },
                      { day: 'SUN', value: 123, percentage: 41 },
                    ].map((data) => (
                      <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full group">
                          <div
                            className="w-full bg-purple-900 hover:bg-purple-800 transition-colors cursor-pointer"
                            style={{ height: `${data.percentage * 1.5}px` }}
                          />
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-purple-900 text-white px-2 py-1 font-mono text-xs whitespace-nowrap">
                              {data.value}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-ghost-600">{data.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="border border-ghost-300 bg-white">
                <div className="border-b border-ghost-300 px-4 py-3">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                    HOURLY ACTIVITY HEATMAP
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-1">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, dayIdx) => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="font-mono text-xs text-ghost-600 w-8">{day}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: 24 }).map((_, hourIdx) => {
                            const intensity = Math.random();
                            return (
                              <div
                                key={hourIdx}
                                className="h-4 w-4 cursor-pointer hover:border hover:border-purple-900"
                                style={{
                                  backgroundColor:
                                    intensity < 0.2
                                      ? '#f0eff4'
                                      : intensity < 0.4
                                      ? '#ead6e7'
                                      : intensity < 0.6
                                      ? '#c388bb'
                                      : intensity < 0.8
                                      ? '#9e829c'
                                      : '#291528',
                                }}
                                title={`${day} ${hourIdx}:00 - ${Math.round(intensity * 100)} events`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <span className="font-mono text-xs text-ghost-600">LESS</span>
                    {[0.2, 0.4, 0.6, 0.8, 1].map((val) => (
                      <div
                        key={val}
                        className="h-3 w-3"
                        style={{
                          backgroundColor:
                            val <= 0.2
                              ? '#f0eff4'
                              : val <= 0.4
                              ? '#ead6e7'
                              : val <= 0.6
                              ? '#c388bb'
                              : val <= 0.8
                              ? '#9e829c'
                              : '#291528',
                        }}
                      />
                    ))}
                    <span className="font-mono text-xs text-ghost-600">MORE</span>
                  </div>
                </div>
              </div>

              {/* Status Summary Grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: 'APPROVAL RATE',
                    value: '94.2%',
                    change: '+2.1',
                    status: 'success',
                  },
                  { label: 'AVG REVIEW TIME', value: '3.4h', change: '-12', status: 'success' },
                  { label: 'FLAGGED ITEMS', value: '23', change: '+5', status: 'warning' },
                ].map((stat) => (
                  <div key={stat.label} className="border border-ghost-300 bg-white p-4">
                    <div className="font-mono text-xs text-ghost-600 mb-2">{stat.label}</div>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold text-purple-900">{stat.value}</div>
                      <div
                        className={`font-mono text-xs ${
                          stat.status === 'success' ? 'text-green-600' : 'text-amber-600'
                        }`}
                      >
                        {stat.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Activity Log */}
        <div className="col-span-3 border-l border-ghost-300 bg-white h-[calc(100vh-57px)] overflow-y-auto">
          <div className="border-b border-ghost-300 px-4 py-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
              ACTIVITY LOG
            </h2>
          </div>
          <div className="divide-y divide-ghost-200">
            {[
              {
                time: '14:32:18',
                action: 'Contract analyzed',
                id: 'CTR-2847',
                status: 'success',
              },
              {
                time: '14:31:45',
                action: 'Vendor risk assessed',
                id: 'VND-1023',
                status: 'success',
              },
              {
                time: '14:30:22',
                action: 'Compliance check',
                id: 'CTR-2846',
                status: 'warning',
              },
              {
                time: '14:29:10',
                action: 'Document processed',
                id: 'DOC-5621',
                status: 'success',
              },
              {
                time: '14:28:33',
                action: 'Alert triggered',
                id: 'CTR-2845',
                status: 'error',
              },
              {
                time: '14:27:55',
                action: 'Contract analyzed',
                id: 'CTR-2844',
                status: 'success',
              },
              {
                time: '14:26:12',
                action: 'Vendor updated',
                id: 'VND-0892',
                status: 'success',
              },
              {
                time: '14:25:40',
                action: 'Risk score calculated',
                id: 'VND-1023',
                status: 'success',
              },
            ].map((log, idx) => (
              <div key={idx} className="px-4 py-3 hover:bg-ghost-50 transition-colors">
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      log.status === 'success'
                        ? 'bg-green-500'
                        : log.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-ghost-600 mb-1">{log.time}</div>
                    <div className="text-sm text-ghost-900 mb-1">{log.action}</div>
                    <div className="font-mono text-xs text-purple-900">{log.id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  change,
  trend,
  icon,
}: {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-ghost-300 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-ghost-600">{label}</span>
        <span className="text-ghost-400">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-purple-900 mb-1">{value}</div>
      <div className="flex items-center gap-1">
        {trend === 'up' ? (
          <ArrowUpRight className="h-3 w-3 text-green-600" />
        ) : (
          <ArrowDownRight className="h-3 w-3 text-red-600" />
        )}
        <span
          className={`font-mono text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
        >
          {Math.abs(change)}%
        </span>
      </div>
    </div>
  );
}
