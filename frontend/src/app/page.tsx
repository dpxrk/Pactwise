"use client";

import { AgentsSection } from "./_components/terminal-landing/AgentsSection";
import { FeaturesSection } from "./_components/terminal-landing/FeaturesSection";
import { MetricsSection } from "./_components/terminal-landing/MetricsSection";
import { PricingSection } from "./_components/terminal-landing/PricingSection";
import { TerminalCTA } from "./_components/terminal-landing/TerminalCTA";
import { TerminalFooter } from "./_components/terminal-landing/TerminalFooter";
import { TerminalHero } from "./_components/terminal-landing/TerminalHero";
import { TerminalNav } from "./_components/terminal-landing/TerminalNav";
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

      <main>
        {/* Hero Section with Terminal Animation */}
        <TerminalHero />

        {/* AI Agents Showcase */}
        <AgentsSection />

        {/* Platform Metrics */}
        <MetricsSection />

        {/* Features Grid */}
        <FeaturesSection />

        {/* Pricing */}
        <PricingSection />

        {/* Call to Action */}
        <TerminalCTA />
      </main>

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
