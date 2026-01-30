"use client";

import { ArrowRight, Terminal, Zap } from "lucide-react";
import Link from "next/link";

import { useTheme } from "./ThemeContext";

export function TerminalCTA() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`relative py-20 border-y transition-colors duration-300 ${
      isDark
        ? "bg-terminal-surface border-terminal-border"
        : "bg-ghost-100 border-ghost-200"
    }`}>
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Terminal Prompt */}
          <div className={`inline-flex items-center gap-3 px-4 py-2 mb-8 border font-mono text-sm transition-colors duration-300 ${
            isDark
              ? "bg-terminal-bg border-terminal-border"
              : "bg-white border-ghost-300"
          }`}>
            <span className="text-purple-500">$</span>
            <span className={isDark ? "text-text-secondary" : "text-ghost-600"}>pactwise deploy --production</span>
            <span className="w-2 h-4 bg-purple-500 animate-pulse" />
          </div>

          {/* Headline */}
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-6 transition-colors duration-300 ${
            isDark ? "text-text-primary" : "text-purple-900"
          }`}>
            Ready to automate your
            <span className="text-purple-500"> contract operations?</span>
          </h2>

          {/* Subhead */}
          <p className={`text-lg max-w-xl mx-auto mb-10 transition-colors duration-300 ${
            isDark ? "text-text-secondary" : "text-ghost-600"
          }`}>
            Deploy intelligent agents in minutes. No complex setup. No long
            implementation cycles. Just results.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 bg-purple-900 text-white font-mono text-sm hover:bg-purple-800 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#contact"
              className={`inline-flex items-center gap-2 px-8 py-4 border font-mono text-sm transition-colors ${
                isDark
                  ? "border-terminal-border text-text-primary hover:border-purple-500 hover:bg-terminal-hover"
                  : "border-ghost-300 text-purple-900 hover:border-purple-500 hover:bg-purple-50"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Schedule Demo
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className={`flex flex-wrap justify-center items-center gap-8 transition-colors duration-300 ${
            isDark ? "text-text-tertiary" : "text-ghost-500"
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span className="font-mono text-xs">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span className="font-mono text-xs">14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full" />
              <span className="font-mono text-xs">Enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
