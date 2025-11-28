"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  Scale,
  TrendingUp,
  Bell,
  Shield,
  Activity,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "./ThemeContext";

const agents = [
  {
    id: "secretary",
    name: "Secretary Agent",
    status: "ACTIVE",
    description: "Document ingestion, OCR processing, and metadata extraction",
    metrics: {
      processed: "124.5K",
      accuracy: "99.8%",
      latency: "89ms",
    },
    icon: FileText,
    color: "text-purple-400",
  },
  {
    id: "legal",
    name: "Legal Agent",
    status: "ACTIVE",
    description: "Clause analysis, risk identification, and compliance mapping",
    metrics: {
      reviewed: "47.2K",
      flagged: "2.1K",
      latency: "142ms",
    },
    icon: Scale,
    color: "text-purple-500",
  },
  {
    id: "vendor",
    name: "Vendor Agent",
    status: "ACTIVE",
    description: "Vendor scoring, relationship tracking, and performance monitoring",
    metrics: {
      vendors: "8.4K",
      score: "94.2",
      alerts: "127",
    },
    icon: Users,
    color: "text-purple-300",
  },
  {
    id: "financial",
    name: "Financial Agent",
    status: "ACTIVE",
    description: "Cost analysis, budget tracking, and financial risk assessment",
    metrics: {
      value: "$2.4B",
      savings: "$18M",
      latency: "156ms",
    },
    icon: TrendingUp,
    color: "text-success",
  },
  {
    id: "compliance",
    name: "Compliance Agent",
    status: "ACTIVE",
    description: "Regulatory monitoring, audit trails, and policy enforcement",
    metrics: {
      rules: "1.2K",
      score: "98.7%",
      alerts: "42",
    },
    icon: Shield,
    color: "text-warning-400",
  },
  {
    id: "notifications",
    name: "Notifications Agent",
    status: "ACTIVE",
    description: "Deadline tracking, renewal alerts, and stakeholder updates",
    metrics: {
      sent: "45.2K",
      pending: "127",
      latency: "12ms",
    },
    icon: Bell,
    color: "text-purple-400",
  },
];

export function AgentsSection() {
  const { theme } = useTheme();
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const isDark = theme === "dark";

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
                AUTONOMOUS AGENT NETWORK
              </span>
            </div>
            <h2 className={`text-3xl md:text-4xl font-semibold tracking-tight transition-colors duration-300 ${
              isDark ? "text-text-primary" : "text-purple-900"
            }`}>
              Six specialized agents.
              <span className="text-purple-500"> Zero manual work.</span>
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-success/30 bg-success/10">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-success">
              ALL SYSTEMS OPERATIONAL
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
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedAgent.id === agent.id
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
                      <agent.icon className={`w-4 h-4 ${agent.color}`} />
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
                        } ${selectedAgent.id === agent.id ? "rotate-90" : ""}`}
                      />
                    </div>
                  </div>
                </button>
              ))}
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
                    <selectedAgent.icon
                      className={`w-6 h-6 ${selectedAgent.color}`}
                    />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                      isDark ? "text-text-primary" : "text-purple-900"
                    }`}>
                      {selectedAgent.name}
                    </h3>
                    <p className={`text-sm mt-1 transition-colors duration-300 ${
                      isDark ? "text-text-secondary" : "text-ghost-600"
                    }`}>
                      {selectedAgent.description}
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
                {Object.entries(selectedAgent.metrics).map(([key, value]) => (
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
                    RECENT ACTIVITY
                  </span>
                </div>
                <div className={`p-4 font-mono text-xs space-y-2 transition-colors duration-300 ${
                  isDark ? "bg-terminal-bg" : "bg-white"
                }`}>
                  {[
                    { time: "00:12:34", msg: "Processing vendor-contract-847.pdf" },
                    { time: "00:12:31", msg: "Completed analysis: 12 clauses flagged" },
                    { time: "00:12:28", msg: "Risk score updated: LOW → MEDIUM" },
                    { time: "00:12:22", msg: "Notification sent to legal@company.com" },
                  ].map((log, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <span className={isDark ? "text-text-tertiary" : "text-ghost-400"}>{log.time}</span>
                      <span className={isDark ? "text-text-secondary" : "text-ghost-600"}>{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
