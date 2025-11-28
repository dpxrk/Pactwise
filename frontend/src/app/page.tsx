"use client";

import { TerminalNav } from "./_components/terminal-landing/TerminalNav";
import { TerminalHero } from "./_components/terminal-landing/TerminalHero";
import { AgentsSection } from "./_components/terminal-landing/AgentsSection";
import { MetricsSection } from "./_components/terminal-landing/MetricsSection";
import { FeaturesSection } from "./_components/terminal-landing/FeaturesSection";
import { TerminalCTA } from "./_components/terminal-landing/TerminalCTA";
import { TerminalFooter } from "./_components/terminal-landing/TerminalFooter";
import { ThemeProvider, useTheme } from "./_components/terminal-landing/ThemeContext";

function LandingContent() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === "dark"
        ? "bg-terminal-bg text-text-primary"
        : "bg-ghost-100 text-ghost-700"
    } ${theme === "dark" ? "dark" : ""}`}>
      {/* Navigation */}
      <TerminalNav />

      {/* Hero Section with Terminal Animation */}
      <TerminalHero />

      {/* AI Agents Showcase */}
      <AgentsSection />

      {/* Platform Metrics */}
      <MetricsSection />

      {/* Features Grid */}
      <FeaturesSection />

      {/* Call to Action */}
      <TerminalCTA />

      {/* Footer */}
      <TerminalFooter />
    </div>
  );
}

export default function LandingPage() {
  return (
    <ThemeProvider>
      <LandingContent />
    </ThemeProvider>
  );
}
