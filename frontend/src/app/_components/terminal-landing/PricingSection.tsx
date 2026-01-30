"use client";

import { Check, Zap } from "lucide-react";
import Link from "next/link";

import { useTheme } from "./ThemeContext";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    period: "/user/month",
    description: "Perfect for small teams getting started with contract management.",
    features: [
      "Up to 100 contracts",
      "Up to 10 users",
      "Basic AI analysis",
      "Email support",
      "14-day free trial",
    ],
    cta: "Start Free Trial",
    href: "/auth/sign-up?plan=starter",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/user/month",
    description: "For growing teams that need advanced AI and automation.",
    features: [
      "Up to 500 contracts",
      "Unlimited users",
      "Advanced AI analysis",
      "Custom workflows",
      "API access",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/auth/sign-up?plan=professional",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$149",
    period: "/user/month",
    description: "For organizations that need full control and customization.",
    features: [
      "Unlimited contracts",
      "Unlimited users",
      "Full AI suite",
      "Custom integrations",
      "Dedicated success manager",
      "Phone support",
    ],
    cta: "Start Free Trial",
    href: "/auth/sign-up?plan=business",
    highlighted: false,
  },
];

export function PricingSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section id="pricing" className={`relative py-20 transition-colors duration-300 ${
      isDark ? "bg-terminal-surface" : "bg-ghost-50"
    }`}>
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className={`font-mono text-[10px] tracking-wider block mb-4 transition-colors duration-300 ${
            isDark ? "text-text-tertiary" : "text-ghost-500"
          }`}>
            PRICING
          </span>
          <h2 className={`text-3xl md:text-4xl font-semibold tracking-tight mb-4 transition-colors duration-300 ${
            isDark ? "text-text-primary" : "text-purple-900"
          }`}>
            Simple, transparent pricing
          </h2>
          <p className={`transition-colors duration-300 ${
            isDark ? "text-text-secondary" : "text-ghost-600"
          }`}>
            Start free for 14 days. No credit card required. 20% off with annual billing.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`relative flex flex-col p-6 border transition-all ${
                tier.highlighted
                  ? "border-purple-500 shadow-lg shadow-purple-500/10"
                  : isDark
                    ? "border-terminal-border hover:border-purple-500/50"
                    : "border-ghost-200 hover:border-purple-500/50"
              } ${
                isDark ? "bg-terminal-bg" : "bg-white"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-purple-500 text-white text-xs font-mono">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                  isDark ? "text-text-primary" : "text-purple-900"
                }`}>
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold transition-colors duration-300 ${
                    isDark ? "text-text-primary" : "text-purple-900"
                  }`}>
                    {tier.price}
                  </span>
                  <span className={`text-sm transition-colors duration-300 ${
                    isDark ? "text-text-tertiary" : "text-ghost-500"
                  }`}>
                    {tier.period}
                  </span>
                </div>
                <p className={`mt-3 text-sm transition-colors duration-300 ${
                  isDark ? "text-text-secondary" : "text-ghost-600"
                }`}>
                  {tier.description}
                </p>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-3 mb-6">
                {tier.features.map((feature, featureIdx) => (
                  <li key={featureIdx} className="flex items-start gap-2">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      tier.highlighted ? "text-purple-500" : isDark ? "text-success" : "text-green-600"
                    }`} />
                    <span className={`text-sm transition-colors duration-300 ${
                      isDark ? "text-text-secondary" : "text-ghost-600"
                    }`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={tier.href}
                className={`w-full py-3 px-4 text-center font-mono text-sm transition-colors ${
                  tier.highlighted
                    ? "bg-purple-900 text-white hover:bg-purple-800"
                    : isDark
                      ? "border border-terminal-border text-text-primary hover:border-purple-500 hover:bg-terminal-hover"
                      : "border border-ghost-300 text-purple-900 hover:border-purple-500 hover:bg-purple-50"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  {tier.cta}
                </span>
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className={`mt-12 text-center p-8 border transition-colors duration-300 ${
          isDark ? "border-terminal-border bg-terminal-bg" : "border-ghost-200 bg-white"
        }`}>
          <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
            isDark ? "text-text-primary" : "text-purple-900"
          }`}>
            Enterprise
          </h3>
          <p className={`mb-4 transition-colors duration-300 ${
            isDark ? "text-text-secondary" : "text-ghost-600"
          }`}>
            Need custom deployment, SSO, or dedicated support? Let&apos;s talk.
          </p>
          <Link
            href="#contact"
            className={`inline-flex items-center gap-2 px-6 py-3 border font-mono text-sm transition-colors ${
              isDark
                ? "border-terminal-border text-text-primary hover:border-purple-500"
                : "border-ghost-300 text-purple-900 hover:border-purple-500"
            }`}
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </section>
  );
}
