"use client";

import { Zap, Shield, Brain, Activity, Terminal } from "lucide-react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import React, { Suspense, useState, useEffect, useMemo } from "react";

// Dynamic imports for heavy components
const TerminalSignInForm = dynamic(() => import("@/components/auth/TerminalSignInForm").then(mod => ({ default: mod.TerminalSignInForm })), {
  loading: () => (
    <div className="w-full max-w-md terminal-panel">
      <div className="bg-terminal-surface border-terminal-border px-4 py-3 border-b flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-error-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-warning-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
      </div>
      <div className="bg-terminal-bg p-6 min-h-[400px] flex items-center justify-center">
        <div className="inline-block animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent" />
      </div>
    </div>
  ),
  ssr: false
});

const TYPING_SPEED = 35;
const COMMAND_DELAY = 600;

const terminalLines = [
  { type: "command", text: "pactwise status --agents" },
  { type: "success", text: "✓ 6 agents operational" },
  { type: "command", text: "pactwise contracts --summary" },
  { type: "output", text: "Processing 2.5M+ contracts..." },
  { type: "success", text: "✓ 99.7% analysis accuracy" },
  { type: "success", text: "✓ < 150ms avg response" },
];

export default function SignInPage() {
  const [displayedLines, setDisplayedLines] = useState<typeof terminalLines>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const heroStats = useMemo(() => [
    { icon: Zap, label: "Processing", value: "< 150ms" },
    { icon: Shield, label: "Accuracy", value: "99.7%" },
    { icon: Brain, label: "AI Agents", value: "6" },
  ], []);

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
    <div className="min-h-screen flex bg-terminal-bg">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-30 grid-bg" />

      {/* Left Panel - Terminal Display (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-xl mx-auto p-12 flex flex-col justify-center">
          {/* Logo */}
          <Link href="/" className="inline-block mb-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <span className="text-2xl font-semibold text-text-primary tracking-tight">
                Pactwise
              </span>
            </div>
          </Link>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border border-terminal-border bg-terminal-surface w-fit">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            <span className="font-mono text-[10px] tracking-wider text-text-secondary">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight tracking-tight mb-4 text-text-primary">
            Contracts managed by
            <span className="block text-purple-500">intelligent agents</span>
          </h1>

          {/* Subhead */}
          <p className="text-base max-w-lg mb-8 leading-relaxed text-text-secondary">
            Pactwise deploys specialized AI agents that monitor, analyze, and
            optimize your entire contract portfolio. Zero manual review.
          </p>

          {/* Terminal Window */}
          <div className="terminal-panel mb-8">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-terminal-surface border-terminal-border">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-error-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
              </div>
              <span className="font-mono text-[10px] text-text-tertiary">
                pactwise-cli
              </span>
              <div className="w-12" />
            </div>

            {/* Terminal Body */}
            <div className="p-4 min-h-[160px] font-mono text-xs bg-terminal-panel">
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

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-text-tertiary">
                  <stat.icon className="w-3 h-3" />
                  <span className="font-mono text-[10px] tracking-wider">
                    {stat.label.toUpperCase()}
                  </span>
                </div>
                <p className="font-mono text-lg text-text-primary metric-value">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-terminal-border">
          <div className="max-w-xl mx-auto px-12 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4 overflow-hidden">
              {["CONTRACTS: 2.5M+", "VENDORS: 10K+", "AGENTS: 6"].map((item, idx) => (
                <span key={idx} className="font-mono text-[10px] whitespace-nowrap text-text-tertiary">
                  {item}
                </span>
              ))}
            </div>
            <div className="font-mono text-[10px] text-text-muted">
              LIVE DATA
            </div>
          </div>
        </div>

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-purple-900/10 pointer-events-none" />
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-600 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xl font-semibold text-text-primary tracking-tight">
              Pactwise
            </span>
          </Link>
        </div>

        {/* Mobile status badge */}
        <div className="lg:hidden absolute top-6 right-6">
          <div className="flex items-center gap-2 px-2 py-1 border border-terminal-border bg-terminal-surface">
            <Activity className="w-3 h-3 text-success" />
            <span className="font-mono text-[9px] text-success">LIVE</span>
          </div>
        </div>

        {/* Form container */}
        <div className="w-full max-w-md mt-16 lg:mt-0">
          <Suspense fallback={
            <div className="w-full max-w-md terminal-panel">
              <div className="bg-terminal-surface border-terminal-border px-4 py-3 border-b flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-error-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-success-400" />
              </div>
              <div className="bg-terminal-bg p-6 min-h-[400px] flex items-center justify-center">
                <div className="inline-block animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent" />
              </div>
            </div>
          }>
            <TerminalSignInForm isDark={true} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
