"use client";

import { Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { useTheme } from "./ThemeContext";

export function TerminalNav() {
  const [time, setTime] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isDark = theme === "dark";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? isDark
            ? "bg-terminal-bg/95 backdrop-blur-sm border-b border-terminal-border"
            : "bg-ghost-100/95 backdrop-blur-sm border-b border-ghost-300"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className={`font-mono text-sm font-medium tracking-tight transition-colors duration-300 ${
              isDark ? "text-text-primary" : "text-purple-900"
            }`}>
              PACTWISE
            </span>
            <span className={`font-mono text-[10px] tracking-wider transition-colors duration-300 ${
              isDark ? "text-text-tertiary" : "text-ghost-500"
            }`}>
              v2.4.1
            </span>
          </Link>

          {/* Center Nav */}
          <div className="hidden md:flex items-center gap-1">
            {["PLATFORM", "AGENTS", "DOCS", "PRICING"].map((item) => (
              <button
                key={item}
                className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                  isDark
                    ? "text-text-secondary hover:text-text-primary hover:bg-terminal-hover"
                    : "text-ghost-600 hover:text-purple-900 hover:bg-ghost-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex items-center gap-2 font-mono text-[10px] transition-colors duration-300 ${
              isDark ? "text-text-tertiary" : "text-ghost-500"
            }`}>
              <span className="text-success">LIVE</span>
              <span className={isDark ? "text-text-muted" : "text-ghost-400"}>|</span>
              <span>{time}</span>
              <span className={isDark ? "text-text-muted" : "text-ghost-400"}>UTC</span>
            </div>
            <div className={`h-4 w-px hidden sm:block transition-colors duration-300 ${
              isDark ? "bg-terminal-border" : "bg-ghost-300"
            }`} />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-sm transition-colors ${
                isDark ? "hover:bg-terminal-hover" : "hover:bg-ghost-200"
              }`}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-text-secondary hover:text-warning-400 transition-colors" />
              ) : (
                <Moon className="w-4 h-4 text-ghost-600 hover:text-purple-900 transition-colors" />
              )}
            </button>

            <Link
              href="/auth/sign-in"
              className={`font-mono text-xs transition-colors ${
                isDark
                  ? "text-text-secondary hover:text-text-primary"
                  : "text-ghost-600 hover:text-purple-900"
              }`}
            >
              SIGN IN
            </Link>
            <Link
              href="/auth/sign-up"
              className="font-mono text-xs px-4 py-1.5 bg-purple-900 text-white hover:bg-purple-800 transition-colors"
            >
              START FREE
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
