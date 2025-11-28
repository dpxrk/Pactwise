"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowRight, Zap, Shield, Brain } from "lucide-react";
import Link from "next/link";
import { useTheme } from "./ThemeContext";
import { usePublicMetrics, formatMetricValue } from "@/hooks/queries/usePublicMetrics";

const TYPING_SPEED = 40;
const COMMAND_DELAY = 800;

const terminalLines = [
  { type: "command", text: "pactwise analyze --contract vendor-agreement-2024.pdf" },
  { type: "output", text: "Analyzing contract structure..." },
  { type: "success", text: "✓ 47 clauses identified" },
  { type: "success", text: "✓ 3 risk factors flagged" },
  { type: "success", text: "✓ Compliance score: 94.2%" },
  { type: "output", text: "" },
  { type: "command", text: "pactwise agent --deploy legal-review" },
  { type: "success", text: "✓ Legal Agent deployed. Monitoring active." },
];

export function TerminalHero() {
  const { theme } = useTheme();
  const [displayedLines, setDisplayedLines] = useState<typeof terminalLines>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const { data: metrics } = usePublicMetrics();

  const isDark = theme === "dark";

  // Build stats dynamically from API data with fallbacks
  const heroStats = useMemo(() => [
    { icon: Zap, label: "Processing", value: `< ${metrics?.processing_time_ms ?? 150}ms` },
    { icon: Shield, label: "Accuracy", value: "99.7%" },
    { icon: Brain, label: "AI Agents", value: String(metrics?.agents ?? 6) },
  ], [metrics]);

  useEffect(() => {
    if (currentLineIndex >= terminalLines.length) {
      setIsTyping(false);
      return;
    }

    const currentLine = terminalLines[currentLineIndex];

    if (currentCharIndex < currentLine.text.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines((prev) => {
          const newLines = [...prev];
          if (!newLines[currentLineIndex]) {
            newLines[currentLineIndex] = { ...currentLine, text: "" };
          }
          newLines[currentLineIndex] = {
            ...currentLine,
            text: currentLine.text.slice(0, currentCharIndex + 1),
          };
          return newLines;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
        setCurrentCharIndex(0);
      }, COMMAND_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex]);

  return (
    <section className={`relative pt-14 transition-colors duration-300 ${
      isDark ? "bg-terminal-bg" : "bg-ghost-100"
    }`}>
      {/* Subtle grid background */}
      <div className={`absolute inset-0 opacity-30 ${
        isDark ? "grid-bg" : ""
      }`} style={!isDark ? {
        backgroundImage: "linear-gradient(#d2d1de 1px, transparent 1px), linear-gradient(90deg, #d2d1de 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      } : undefined} />

      {/* Content */}
      <div className="relative max-w-[1400px] mx-auto px-6 pt-12 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: Copy */}
          <div>
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 mb-5 border transition-colors duration-300 ${
              isDark
                ? "border-terminal-border bg-terminal-surface"
                : "border-ghost-300 bg-white"
            }`}>
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              <span className={`font-mono text-[10px] tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-secondary" : "text-ghost-600"
              }`}>
                AI AGENTS OPERATIONAL
              </span>
            </div>

            {/* Headline */}
            <h1 className={`text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight mb-4 transition-colors duration-300 ${
              isDark ? "text-text-primary" : "text-purple-900"
            }`}>
              Contracts managed by
              <span className="block text-purple-500">intelligent agents</span>
            </h1>

            {/* Subhead */}
            <p className={`text-base max-w-lg mb-6 leading-relaxed transition-colors duration-300 ${
              isDark ? "text-text-secondary" : "text-ghost-600"
            }`}>
              Pactwise deploys specialized AI agents that monitor, analyze, and
              optimize your entire contract portfolio. Zero manual review.
              Complete visibility.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-8">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-900 text-white font-mono text-sm hover:bg-purple-800 transition-colors"
              >
                Deploy Agents
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#demo"
                className={`inline-flex items-center gap-2 px-6 py-3 border font-mono text-sm transition-colors ${
                  isDark
                    ? "border-terminal-border text-text-primary hover:border-purple-500 hover:bg-terminal-hover"
                    : "border-ghost-300 text-purple-900 hover:border-purple-500 hover:bg-purple-50"
                }`}
              >
                View Demo
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              {heroStats.map((stat) => (
                <div key={stat.label} className="space-y-0.5">
                  <div className={`flex items-center gap-1.5 transition-colors duration-300 ${
                    isDark ? "text-text-tertiary" : "text-ghost-500"
                  }`}>
                    <stat.icon className="w-3 h-3" />
                    <span className="font-mono text-[10px] tracking-wider">
                      {stat.label.toUpperCase()}
                    </span>
                  </div>
                  <p className={`font-mono text-lg metric-value transition-colors duration-300 ${
                    isDark ? "text-text-primary" : "text-purple-900"
                  }`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Terminal Window */}
          <div className="relative">
            <div className={`rounded-none overflow-hidden transition-colors duration-300 ${
              isDark
                ? "terminal-panel"
                : "bg-white border border-ghost-300 shadow-lg"
            }`}>
              {/* Terminal Header */}
              <div className={`flex items-center justify-between px-3 py-2 border-b transition-colors duration-300 ${
                isDark
                  ? "bg-terminal-surface border-terminal-border"
                  : "bg-ghost-100 border-ghost-200"
              }`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
                </div>
                <span className={`font-mono text-[10px] transition-colors duration-300 ${
                  isDark ? "text-text-tertiary" : "text-ghost-500"
                }`}>
                  pactwise-cli — agents
                </span>
                <div className="w-12" />
              </div>

              {/* Terminal Body */}
              <div className={`p-3 min-h-[240px] font-mono text-xs transition-colors duration-300 ${
                isDark ? "bg-terminal-panel" : "bg-purple-950"
              }`}>
                {displayedLines.filter(Boolean).map((line, idx) => (
                  <div key={idx} className="mb-1">
                    {line.type === "command" && (
                      <div className="flex items-start gap-2">
                        <span className="text-purple-400">$</span>
                        <span className="text-ghost-100">{line.text}</span>
                      </div>
                    )}
                    {line.type === "output" && (
                      <span className="text-ghost-400 pl-4">{line.text}</span>
                    )}
                    {line.type === "success" && (
                      <span className="text-success pl-4">{line.text}</span>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                )}
              </div>
            </div>

            {/* Decorative glow */}
            <div className={`absolute -inset-px -z-10 blur-xl transition-opacity duration-300 ${
              isDark
                ? "bg-gradient-to-r from-purple-900/20 via-transparent to-purple-500/20"
                : "bg-gradient-to-r from-purple-200/40 via-transparent to-purple-300/40"
            }`} />
          </div>
        </div>
      </div>

      {/* Bottom Divider with data ticker effect */}
      <div className={`border-t mt-8 transition-colors duration-300 ${
        isDark ? "border-terminal-border" : "border-ghost-300"
      }`}>
        <div className="max-w-[1400px] mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6 overflow-hidden">
            {[
              `CONTRACTS: ${formatMetricValue(metrics?.contracts ?? 0)}`,
              `VENDORS: ${formatMetricValue(metrics?.vendors ?? 0)}`,
              `ACTIVE: ${formatMetricValue(metrics?.active_contracts ?? 0)}`,
              `COMPLIANCE: ${metrics?.compliance_avg?.toFixed(1) ?? "0"}%`,
            ].map((item, idx) => (
              <span
                key={idx}
                className={`font-mono text-[10px] whitespace-nowrap transition-colors duration-300 ${
                  isDark ? "text-text-tertiary" : "text-ghost-500"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
          <div className={`font-mono text-[10px] transition-colors duration-300 ${
            isDark ? "text-text-muted" : "text-ghost-400"
          }`}>
            REAL-TIME DATA FEED
          </div>
        </div>
      </div>
    </section>
  );
}
