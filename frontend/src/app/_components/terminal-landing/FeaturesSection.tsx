"use client";

import {
  Upload,
  Search,
  AlertTriangle,
  Calendar,
  BarChart3,
  Lock,
  Workflow,
  Sparkles,
} from "lucide-react";

import { useTheme } from "./ThemeContext";

const features = [
  {
    icon: Upload,
    title: "Instant Ingestion",
    description:
      "Drop any contract format. OCR, parsing, and metadata extraction in under 150ms.",
    tag: "PROCESSING",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description:
      "Natural language queries across your entire contract repository. Find anything instantly.",
    tag: "DISCOVERY",
  },
  {
    icon: AlertTriangle,
    title: "Risk Detection",
    description:
      "AI-powered clause analysis identifies liability, compliance gaps, and unfavorable terms.",
    tag: "RISK",
  },
  {
    icon: Calendar,
    title: "Deadline Tracking",
    description:
      "Never miss renewals, terminations, or key dates. Automated alerts to stakeholders.",
    tag: "CALENDAR",
  },
  {
    icon: BarChart3,
    title: "Spend Analytics",
    description:
      "Real-time visibility into contract values, vendor costs, and budget utilization.",
    tag: "FINANCIAL",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description:
      "End-to-end encryption. Role-based access control. Multi-tenant isolation.",
    tag: "SECURITY",
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    description:
      "Custom approval flows, routing rules, and integration with your existing tools.",
    tag: "AUTOMATION",
  },
  {
    icon: Sparkles,
    title: "AI Summaries",
    description:
      "Get instant executive summaries, key terms extraction, and obligation lists.",
    tag: "AI",
  },
];

export function FeaturesSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`relative py-20 transition-colors duration-300 ${
      isDark ? "bg-terminal-bg" : "bg-white"
    }`}>
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <span className={`font-mono text-[10px] tracking-wider block mb-4 transition-colors duration-300 ${
            isDark ? "text-text-tertiary" : "text-ghost-500"
          }`}>
            PLATFORM CAPABILITIES
          </span>
          <h2 className={`text-3xl md:text-4xl font-semibold tracking-tight mb-4 transition-colors duration-300 ${
            isDark ? "text-text-primary" : "text-purple-900"
          }`}>
            Everything you need to manage contracts
            <span className="text-purple-500"> intelligently.</span>
          </h2>
          <p className={`transition-colors duration-300 ${
            isDark ? "text-text-secondary" : "text-ghost-600"
          }`}>
            Built for legal, procurement, and finance teams who demand precision
            and efficiency.
          </p>
        </div>

        {/* Features Grid */}
        <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-px transition-colors duration-300 ${
          isDark ? "bg-terminal-border" : "bg-ghost-200"
        }`}>
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`p-6 transition-colors group ${
                isDark
                  ? "bg-terminal-bg hover:bg-terminal-hover"
                  : "bg-white hover:bg-ghost-50"
              }`}
            >
              {/* Tag */}
              <span className="font-mono text-[9px] text-purple-500 tracking-wider">
                {feature.tag}
              </span>

              {/* Icon */}
              <div className="mt-4 mb-4">
                <div className={`inline-flex p-2.5 border transition-colors ${
                  isDark
                    ? "bg-terminal-surface border-terminal-border group-hover:border-purple-500/30"
                    : "bg-ghost-100 border-ghost-200 group-hover:border-purple-500/30"
                }`}>
                  <feature.icon className={`w-5 h-5 transition-colors ${
                    isDark
                      ? "text-text-secondary group-hover:text-purple-400"
                      : "text-ghost-500 group-hover:text-purple-500"
                  }`} />
                </div>
              </div>

              {/* Content */}
              <h3 className={`font-semibold mb-2 transition-colors duration-300 ${
                isDark ? "text-text-primary" : "text-purple-900"
              }`}>
                {feature.title}
              </h3>
              <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                isDark ? "text-text-tertiary" : "text-ghost-500"
              }`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
