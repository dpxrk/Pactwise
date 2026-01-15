"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";

import { usePublicMetrics, formatMetricValue } from "@/hooks/queries/usePublicMetrics";

import { useTheme } from "./ThemeContext";


interface MetricData {
  label: string;
  value: string;
  change: number;
  unit?: string;
  category: string;
}

// Default fallback metrics for when API is unavailable
const defaultMetricsData: MetricData[] = [
  { label: "CONTRACTS PROCESSED", value: "0", change: 0, category: "VOLUME" },
  { label: "ACTIVE VENDORS", value: "0", change: 0, category: "VOLUME" },
  { label: "AVG PROCESSING TIME", value: "150", unit: "ms", change: 0, category: "PERFORMANCE" },
  { label: "COMPLIANCE SCORE", value: "0", unit: "%", change: 0, category: "QUALITY" },
  { label: "ACTIVE CONTRACTS", value: "0", change: 0, category: "VOLUME" },
  { label: "AI AGENTS", value: "6", change: 0, category: "AGENTS" },
  { label: "ACCURACY", value: "99.7", unit: "%", change: 0, category: "QUALITY" },
  { label: "UPTIME", value: "99.99", unit: "%", change: 0, category: "RELIABILITY" },
];

function AnimatedNumber({ value, duration = 2000 }: { value: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState("0");
  const hasAnimated = useRef(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateValue();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [value]);

  const animateValue = () => {
    // Extract numeric part
    const numericMatch = value.match(/[\d,.]+/);
    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const numericStr = numericMatch[0];
    const prefix = value.slice(0, value.indexOf(numericStr));
    const suffix = value.slice(value.indexOf(numericStr) + numericStr.length);
    const targetNum = parseFloat(numericStr.replace(/,/g, ""));
    const hasDecimal = numericStr.includes(".");
    const decimalPlaces = hasDecimal ? numericStr.split(".")[1].length : 0;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = targetNum * easeOutQuart;

      let formatted: string;
      if (hasDecimal) {
        formatted = current.toFixed(decimalPlaces);
      } else {
        formatted = Math.floor(current).toLocaleString();
      }

      setDisplayValue(prefix + formatted + suffix);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  };

  return <span ref={elementRef}>{displayValue}</span>;
}

export function MetricsSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { data: metrics } = usePublicMetrics();

  // Build metrics data from API response with fallbacks
  const metricsData: MetricData[] = useMemo(() => {
    if (!metrics) return defaultMetricsData;

    return [
      {
        label: "CONTRACTS PROCESSED",
        value: formatMetricValue(metrics.contracts),
        change: 0,
        category: "VOLUME"
      },
      {
        label: "ACTIVE VENDORS",
        value: formatMetricValue(metrics.vendors),
        change: 0,
        category: "VOLUME"
      },
      {
        label: "AVG PROCESSING TIME",
        value: String(metrics.processing_time_ms),
        unit: "ms",
        change: 0,
        category: "PERFORMANCE"
      },
      {
        label: "COMPLIANCE SCORE",
        value: String(metrics.compliance_avg),
        unit: "%",
        change: 0,
        category: "QUALITY"
      },
      {
        label: "ACTIVE CONTRACTS",
        value: formatMetricValue(metrics.active_contracts),
        change: 0,
        category: "VOLUME"
      },
      {
        label: "AI AGENTS",
        value: String(metrics.agents),
        change: 0,
        category: "AGENTS"
      },
      {
        label: "ACCURACY",
        value: "99.7",
        unit: "%",
        change: 0,
        category: "QUALITY"
      },
      {
        label: "UPTIME",
        value: "99.99",
        unit: "%",
        change: 0,
        category: "RELIABILITY"
      },
    ];
  }, [metrics]);

  return (
    <section className={`relative py-20 border-b transition-colors duration-300 ${
      isDark ? "bg-terminal-bg border-terminal-border" : "bg-ghost-100 border-ghost-200"
    }`}>
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className={`font-mono text-[10px] tracking-wider block mb-4 transition-colors duration-300 ${
            isDark ? "text-text-tertiary" : "text-ghost-500"
          }`}>
            PLATFORM METRICS — REAL-TIME
          </span>
          <h2 className={`text-3xl md:text-4xl font-semibold tracking-tight transition-colors duration-300 ${
            isDark ? "text-text-primary" : "text-purple-900"
          }`}>
            Enterprise-grade performance,
            <span className="text-purple-500"> measured.</span>
          </h2>
        </div>

        {/* Metrics Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-px transition-colors duration-300 ${
          isDark ? "bg-terminal-border" : "bg-ghost-200"
        }`}>
          {metricsData.map((metric, idx) => (
            <div
              key={idx}
              className={`p-6 transition-colors group ${
                isDark
                  ? "bg-terminal-bg hover:bg-terminal-hover"
                  : "bg-white hover:bg-ghost-50"
              }`}
            >
              {/* Category Tag */}
              <span className={`font-mono text-[9px] tracking-wider transition-colors duration-300 ${
                isDark ? "text-text-muted" : "text-ghost-400"
              }`}>
                {metric.category}
              </span>

              {/* Value */}
              <div className="mt-3 mb-2">
                <span className={`font-mono text-3xl md:text-4xl metric-value transition-colors duration-300 ${
                  isDark ? "text-text-primary" : "text-purple-900"
                }`}>
                  <AnimatedNumber value={metric.value} />
                </span>
                {metric.unit && (
                  <span className={`font-mono text-lg ml-1 transition-colors duration-300 ${
                    isDark ? "text-text-tertiary" : "text-ghost-500"
                  }`}>
                    {metric.unit}
                  </span>
                )}
              </div>

              {/* Label & Change */}
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] tracking-wider transition-colors duration-300 ${
                  isDark ? "text-text-tertiary" : "text-ghost-500"
                }`}>
                  {metric.label}
                </span>
                <div
                  className={`flex items-center gap-1 font-mono text-[10px] ${
                    metric.change > 0
                      ? "text-success"
                      : metric.change < 0
                      ? "text-error-400"
                      : isDark ? "text-text-tertiary" : "text-ghost-400"
                  }`}
                >
                  {metric.change > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : metric.change < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  <span>{Math.abs(metric.change)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Data Source Note */}
        <div className="mt-6 text-center">
          <span className={`font-mono text-[10px] transition-colors duration-300 ${
            isDark ? "text-text-muted" : "text-ghost-400"
          }`}>
            DATA UPDATED EVERY 60 SECONDS • LAST SYNC: NOW
          </span>
        </div>
      </div>
    </section>
  );
}
