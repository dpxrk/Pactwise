"use client";

import { Check, Sparkles, Zap, Building2, Crown, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

import { CheckoutButton } from "@/components/stripe/CheckoutButton";
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from "@/utils/supabase/client";

const PricingPremium = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // Fetch user's enterprise ID when authenticated
  useEffect(() => {
    async function fetchEnterpriseId() {
      if (!user) {
        setEnterpriseId(null);
        return;
      }

      const supabase = createClient();
      const { data: profile } = await supabase
        .from("users")
        .select("enterprise_id")
        .eq("auth_id", user.id)
        .single();

      if (profile?.enterprise_id) {
        setEnterpriseId(profile.enterprise_id);
      }
    }

    fetchEnterpriseId();
  }, [user]);

  const plans = [
    {
      name: "Starter",
      tier: "starter" as const,
      price: billingPeriod === "monthly" ? 49 : 39,
      originalPrice: billingPeriod === "monthly" ? null : 49,
      period: "/user/month",
      description: "Perfect for small teams getting started",
      icon: Zap,
      features: [
        "Up to 100 contracts",
        "10 team members",
        "50 vendors",
        "1 integration",
        "Email support",
        "14-day free trial"
      ],
      cta: "Start Free Trial",
      popular: false,
      gradient: "from-purple-600 to-purple-700",
      delay: 0
    },
    {
      name: "Professional",
      tier: "professional" as const,
      price: billingPeriod === "monthly" ? 99 : 79,
      originalPrice: billingPeriod === "monthly" ? null : 99,
      period: "/user/month",
      description: "Advanced features for growing teams",
      icon: Sparkles,
      features: [
        "Up to 500 contracts",
        "25 team members",
        "Unlimited vendors",
        "5 integrations",
        "AI contract analysis",
        "Compliance tracking",
        "Priority support",
        "14-day free trial"
      ],
      cta: "Start Free Trial",
      popular: true,
      gradient: "from-purple-500 to-pink-500",
      delay: 100
    },
    {
      name: "Business",
      tier: "business" as const,
      price: billingPeriod === "monthly" ? 149 : 119,
      originalPrice: billingPeriod === "monthly" ? null : 149,
      period: "/user/month",
      description: "Full-featured solution for enterprises",
      icon: Crown,
      features: [
        "Unlimited contracts",
        "100 team members",
        "Unlimited vendors",
        "Unlimited integrations",
        "AI contract analysis",
        "Compliance tracking",
        "Custom workflows",
        "Advanced analytics",
        "Dedicated support",
        "14-day free trial"
      ],
      cta: "Start Free Trial",
      popular: false,
      gradient: "from-purple-700 to-purple-900",
      delay: 200
    },
    {
      name: "Enterprise",
      tier: "enterprise" as const,
      price: "Custom",
      period: "",
      description: "Tailored for large organizations",
      icon: Building2,
      features: [
        "Everything in Business",
        "Unlimited team members",
        "Custom AI training",
        "On-premise option",
        "SSO/SAML",
        "Audit logs",
        "SLA guarantees",
        "Custom contracts"
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-gray-600 to-gray-700",
      delay: 300
    }
  ];

  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-400">Transparent Pricing</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Choose Your{" "}
            <span className="text-gradient bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Plan</span>
          </h2>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            Start with a 14-day free trial. Upgrade when you need. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 p-1 glass border border-white/10">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`
                px-6 py-2 text-sm font-medium transition-all duration-200
                ${billingPeriod === "monthly"
                  ? "bg-white text-black"
                  : "text-gray-400 hover:text-white"
                }
              `}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`
                px-6 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2
                ${billingPeriod === "annual"
                  ? "bg-white text-black"
                  : "text-gray-400 hover:text-white"
                }
              `}
            >
              Annual
              <span className="text-xs bg-success-500 text-white px-2 py-0.5">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isEnterprise = plan.tier === "enterprise";

            return (
              <div
                key={index}
                className={`
                  relative
                  ${plan.popular ? "lg:-mt-4 lg:mb-4" : ""}
                  ${inView ? 'animate-fade-in-up' : 'opacity-0'}
                `}
                style={{ animationDelay: `${plan.delay}ms` }}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold px-4 py-1">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Card */}
                <div className={`
                  relative h-full group
                  ${plan.popular ? "scale-[1.02]" : ""}
                `}>
                  {/* Glow effect */}
                  <div
                    className={`
                      absolute -inset-0.5 bg-gradient-to-r ${plan.gradient}
                      blur opacity-20
                      ${plan.popular ? "opacity-30" : "group-hover:opacity-30"}
                      transition duration-500
                    `}
                  />

                  {/* Card content */}
                  <div className={`
                    relative h-full glass p-6
                    ${plan.popular
                      ? "border-2 border-purple-500/50"
                      : "border border-white/10 hover:border-white/20"
                    }
                    transition-all duration-300
                  `}>
                    {/* Plan header */}
                    <div className="mb-6">
                      <div className={`
                        inline-flex p-3 mb-4
                        bg-gradient-to-br ${plan.gradient}
                      `}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                      <p className="text-gray-400 text-sm">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        {plan.originalPrice && (
                          <span className="text-lg text-gray-500 line-through">
                            ${plan.originalPrice}
                          </span>
                        )}
                        <span className="text-4xl font-bold text-white">
                          {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                        </span>
                        <span className="text-gray-400 text-sm">{plan.period}</span>
                      </div>
                      {billingPeriod === "annual" && typeof plan.price === 'number' && (
                        <p className="text-sm text-success-400 mt-1">
                          ${plan.price * 12} billed annually
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <div className="mt-0.5">
                            <Check className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isEnterprise ? (
                      <button
                        onClick={() => router.push("/contact")}
                        className={`
                          w-full py-3 px-6 font-semibold
                          flex items-center justify-center gap-2
                          transition-all duration-300 group
                          glass text-white hover:bg-white/10 border border-white/10 hover:border-white/20
                        `}
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : isAuthenticated && enterpriseId ? (
                      <CheckoutButton
                        plan={plan.tier}
                        billingPeriod={billingPeriod}
                        className={`
                          w-full py-3 px-6 font-semibold
                          flex items-center justify-center gap-2
                          transition-all duration-300 group
                          ${plan.popular
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                            : "glass text-white hover:bg-white/10 border border-white/10 hover:border-white/20"
                          }
                        `}
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </CheckoutButton>
                    ) : (
                      <button
                        onClick={() => router.push("/auth/sign-up")}
                        className={`
                          w-full py-3 px-6 font-semibold
                          flex items-center justify-center gap-2
                          transition-all duration-300 group
                          ${plan.popular
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                            : "glass text-white hover:bg-white/10 border border-white/10 hover:border-white/20"
                          }
                        `}
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add-ons */}
        <div className="mt-24 glass p-8 border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Power-ups & Add-ons
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Extra Users",
                price: "Same rate",
                unit: "per additional user",
                icon: Zap
              },
              {
                title: "Extended Retention",
                price: "$20",
                unit: "per year extra",
                icon: Building2
              },
              {
                title: "Premium Support",
                price: "$50",
                unit: "per month",
                icon: Sparkles
              }
            ].map((addon, index) => (
              <div key={index} className="text-center p-6 bg-white/5 hover:bg-white/10 transition-colors">
                <addon.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">{addon.title}</h4>
                <p className="text-2xl font-bold text-white">{addon.price}</p>
                <p className="text-sm text-gray-400">{addon.unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-400">
            All plans include SSL encryption, GDPR compliance, and 99.9% uptime SLA
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingPremium;
