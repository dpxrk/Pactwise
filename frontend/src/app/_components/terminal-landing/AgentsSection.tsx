"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Users,
  Scale,
  TrendingUp,
  Bell,
  Shield,
  Activity,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import {
  usePublicAgentStats,
  getAgentDisplayMetrics,
  type AgentStats,
  type ActivityLogEntry,
} from "@/hooks/queries/usePublicAgentStats";

// Agent type to icon mapping
const agentIcons: Record<string, typeof FileText> = {
  secretary: FileText,
  continual_secretary: FileText,
  metacognitive_secretary: FileText,
  legal: Scale,
  vendor: Users,
  financial: TrendingUp,
  causal_financial: TrendingUp,
  quantum_financial: TrendingUp,
  compliance: Shield,
  notifications: Bell,
};

// Agent type to color mapping
const agentColors: Record<string, string> = {
  secretary: "text-purple-400",
  continual_secretary: "text-purple-400",
  metacognitive_secretary: "text-purple-400",
  legal: "text-purple-500",
  vendor: "text-purple-300",
  financial: "text-success",
  causal_financial: "text-success",
  quantum_financial: "text-success",
  compliance: "text-warning-400",
  notifications: "text-purple-400",
};

// Fallback static agents data for when API is unavailable
const fallbackAgents: Array<{
  id: string;
  type: string;
  name: string;
  status: string;
  description: string;
  metrics: Record<string, string>;
}> = [
  {
    id: "secretary",
    type: "secretary",
    name: "Secretary Agent",
    status: "ACTIVE",
    description: "Document ingestion, OCR processing, and metadata extraction",
    metrics: { processed: "0", accuracy: "0%", latency: "150ms" },
  },
  {
    id: "legal",
    type: "legal",
    name: "Legal Agent",
    status: "ACTIVE",
    description: "Clause analysis, risk identification, and compliance mapping",
    metrics: { reviewed: "0", flagged: "0", latency: "150ms" },
  },
  {
    id: "vendor",
    type: "vendor",
    name: "Vendor Agent",
    status: "ACTIVE",
    description: "Vendor scoring, relationship tracking, and performance monitoring",
    metrics: { vendors: "0", score: "0", alerts: "0" },
  },
  {
    id: "financial",
    type: "financial",
    name: "Financial Agent",
    status: "ACTIVE",
    description: "Cost analysis, budget tracking, and financial risk assessment",
    metrics: { value: "$0", savings: "$0", latency: "150ms" },
  },
  {
    id: "compliance",
    type: "compliance",
    name: "Compliance Agent",
    status: "ACTIVE",
    description: "Regulatory monitoring, audit trails, and policy enforcement",
    metrics: { rules: "0", score: "0%", alerts: "0" },
  },
  {
    id: "notifications",
    type: "notifications",
    name: "Notifications Agent",
    status: "ACTIVE",
    description: "Deadline tracking, renewal alerts, and stakeholder updates",
    metrics: { sent: "0", pending: "0", latency: "150ms" },
  },
];

// Fallback activity logs
const fallbackActivity = [
  { timestamp: "--:--:--", message: "Waiting for agent activity...", agent_type: "system", log_type: "info" },
];

interface DisplayAgent {
  id: string;
  type: string;
  name: string;
  status: string;
  description: string;
  metrics: Record<string, string>;
  icon: typeof FileText;
  color: string;
}

export function AgentsSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fetch real agent data from API
  const { data: agentStats, isLoading, isError } = usePublicAgentStats();

  // Transform API data into display format
  const displayAgents: DisplayAgent[] = useMemo(() => {
    if (!agentStats?.agents || agentStats.agents.length === 0) {
      return fallbackAgents.map((agent): DisplayAgent => ({
        id: agent.id,
        type: agent.type,
        name: agent.name,
        status: agent.status,
        description: agent.description,
        metrics: agent.metrics,
        icon: agentIcons[agent.type] || FileText,
        color: agentColors[agent.type] || "text-purple-400",
      }));
    }

    // Filter to only show the 6 main agents on landing page
    const mainAgentTypes = ["secretary", "legal", "vendor", "financial", "compliance", "notifications"];

    return agentStats.agents
      .filter((agent: AgentStats) => mainAgentTypes.includes(agent.type))
      .map((agent: AgentStats): DisplayAgent => ({
        id: agent.type,
        type: agent.type,
        name: agent.name || `${agent.type.charAt(0).toUpperCase()}${agent.type.slice(1)} Agent`,
        status: agent.status || "ACTIVE",
        description: agent.description || "",
        metrics: getAgentDisplayMetrics(agent),
        icon: agentIcons[agent.type] || FileText,
        color: agentColors[agent.type] || "text-purple-400",
      }));
  }, [agentStats]);

  // Get activity logs
  const activityLogs = useMemo(() => {
    if (!agentStats?.recent_activity || agentStats.recent_activity.length === 0) {
      return fallbackActivity;
    }
    return agentStats.recent_activity.slice(0, 4);
  }, [agentStats]);

  const [selectedAgent, setSelectedAgent] = useState<DisplayAgent | null>(null);

  // Update selected agent when data loads
  const currentSelectedAgent = useMemo(() => {
    if (selectedAgent) {
      // Try to find the selected agent in the new data
      const found = displayAgents.find((a) => a.id === selectedAgent.id);
      if (found) return found;
    }
    // Default to first agent
    return displayAgents[0] || null;
  }, [displayAgents, selectedAgent]);

  // Handle agent selection
  const handleSelectAgent = (agent: DisplayAgent) => {
    setSelectedAgent(agent);
  };

  if (!currentSelectedAgent) {
    return null;
  }

  const SelectedIcon = currentSelectedAgent.icon;

  return (
    <section className={`relative py-20 border-y transition-colors duration-300 ${
      isDark
        ? "bg-terminal-surface border-terminal-border"
        : "bg-white border-ghost-200"
    }`}>
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-4 h-4 text-success" />
              <span className={`font-mono text-[10px] tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-tertiary" : "text-ghost-500"
              }`}>
                AUTONOMOUS AGENT NETWORK — LIVE DATA
              </span>
              {isLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
              )}
            </div>
            <h2 className={`text-3xl md:text-4xl font-semibold tracking-tight transition-colors duration-300 ${
              isDark ? "text-text-primary" : "text-purple-900"
            }`}>
              Six specialized agents.
              <span className="text-purple-500"> Zero manual work.</span>
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-success/30 bg-success/10">
            <div className={`w-2 h-2 rounded-full ${isError ? "bg-warning-400" : "bg-success"} animate-pulse`} />
            <span className={`font-mono text-[10px] ${isError ? "text-warning-400" : "text-success"}`}>
              {isError ? "USING CACHED DATA" : "ALL SYSTEMS OPERATIONAL"}
            </span>
          </div>
        </div>

        {/* Agents Grid */}
        <div className={`grid lg:grid-cols-3 gap-px transition-colors duration-300 ${
          isDark ? "bg-terminal-border" : "bg-ghost-200"
        }`}>
          {/* Agent List */}
          <div className={`lg:col-span-1 transition-colors duration-300 ${
            isDark ? "bg-terminal-bg" : "bg-ghost-100"
          }`}>
            <div className={`divide-y transition-colors duration-300 ${
              isDark ? "divide-terminal-border" : "divide-ghost-200"
            }`}>
              {displayAgents.map((agent) => {
                const AgentIcon = agent.icon;
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className={`w-full p-4 text-left transition-colors ${
                      currentSelectedAgent.id === agent.id
                        ? isDark
                          ? "bg-terminal-hover border-l-2 border-purple-500"
                          : "bg-purple-50 border-l-2 border-purple-500"
                        : isDark
                          ? "hover:bg-terminal-hover border-l-2 border-transparent"
                          : "hover:bg-ghost-100 border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AgentIcon className={`w-4 h-4 ${agent.color}`} />
                        <span className={`font-mono text-sm transition-colors duration-300 ${
                          isDark ? "text-text-primary" : "text-purple-900"
                        }`}>
                          {agent.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-success">
                          {agent.status}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isDark ? "text-text-tertiary" : "text-ghost-400"
                          } ${currentSelectedAgent.id === agent.id ? "rotate-90" : ""}`}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agent Details */}
          <div className={`lg:col-span-2 p-8 transition-colors duration-300 ${
            isDark ? "bg-terminal-bg" : "bg-ghost-100"
          }`}>
            <div className="space-y-8">
              {/* Agent Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 border transition-colors duration-300 ${
                    isDark
                      ? "bg-terminal-surface border-terminal-border"
                      : "bg-white border-ghost-200"
                  }`}>
                    <SelectedIcon
                      className={`w-6 h-6 ${currentSelectedAgent.color}`}
                    />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                      isDark ? "text-text-primary" : "text-purple-900"
                    }`}>
                      {currentSelectedAgent.name}
                    </h3>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${
                      isDark ? "text-text-secondary" : "text-ghost-600"
                    }`}>
                      {currentSelectedAgent.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/20">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="font-mono text-[10px] text-success">
                    RUNNING
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(currentSelectedAgent.metrics).map(([key, value]) => (
                  <div
                    key={key}
                    className={`p-4 border transition-colors duration-300 ${
                      isDark
                        ? "bg-terminal-surface border-terminal-border"
                        : "bg-white border-ghost-200"
                    }`}
                  >
                    <span className={`font-mono text-[10px] tracking-wider block mb-2 transition-colors duration-300 ${
                      isDark ? "text-text-tertiary" : "text-ghost-500"
                    }`}>
                      {key.toUpperCase()}
                    </span>
                    <span className={`font-mono text-2xl metric-value transition-colors duration-300 ${
                      isDark ? "text-text-primary" : "text-purple-900"
                    }`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Activity Log */}
              <div className={`border transition-colors duration-300 ${
                isDark ? "border-terminal-border" : "border-ghost-200"
              }`}>
                <div className={`px-4 py-2 border-b transition-colors duration-300 ${
                  isDark
                    ? "bg-terminal-surface border-terminal-border"
                    : "bg-ghost-100 border-ghost-200"
                }`}>
                  <span className={`font-mono text-[10px] tracking-wider transition-colors duration-300 ${
                    isDark ? "text-text-tertiary" : "text-ghost-500"
                  }`}>
                    RECENT ACTIVITY — REAL-TIME DATA FEED
                  </span>
                </div>
                <div className={`p-4 font-mono text-xs space-y-2 transition-colors duration-300 ${
                  isDark ? "bg-terminal-bg" : "bg-white"
                }`}>
                  {activityLogs.map((log: ActivityLogEntry, idx: number) => (
                    <div key={idx} className="flex items-start gap-4">
                      <span className={isDark ? "text-text-tertiary" : "text-ghost-400"}>
                        {log.timestamp}
                      </span>
                      <span className={isDark ? "text-text-secondary" : "text-ghost-600"}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  {activityLogs.length === 0 && (
                    <div className={`text-center py-4 ${isDark ? "text-text-tertiary" : "text-ghost-400"}`}>
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Source Note */}
        <div className="mt-6 text-center">
          <span className={`font-mono text-[10px] transition-colors duration-300 ${
            isDark ? "text-text-muted" : "text-ghost-400"
          }`}>
            AGENT METRICS UPDATED EVERY 60 SECONDS • SOURCE: PLATFORM DATABASE
          </span>
        </div>
      </div>
    </section>
  );
}
