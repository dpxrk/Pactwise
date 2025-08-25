"use client";

import React, { useState } from "react";
import { Check, Sparkles, Zap, Building2, ArrowRight } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutButton } from "@/components/stripe/CheckoutButton";

const PricingPremium = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  
  // Get user's enterprise if signed in
  // TODO: Replace with actual enterprise lookup from userProfile
  const enterpriseId = "temp-enterprise-id";

  const plans = [
    {
      name: "Starter",
      price: billingPeriod === "monthly" ? 49 : 39,
      originalPrice: billingPeriod === "monthly" ? null : 49,
      period: "/month",
      description: "Perfect for small teams getting started",
      icon: Zap,
      features: [
        "Up to 10 users",
        "10,000 API calls/month",
        "Unlimited dashboards",
        "6-month data retention",
        "Email support",
        "Basic integrations",
        "Standard analytics"
      ],
      cta: "Start Free Trial",
      popular: false,
      gradient: "from-gray-600 to-gray-700",
      delay: 0
    },
    {
      name: "Professional",
      price: billingPeriod === "monthly" ? 149 : 119,
      originalPrice: billingPeriod === "monthly" ? null : 149,
      period: "/month",
      description: "For growing teams that need more",
      icon: Sparkles,
      features: [
        "Up to 50 users",
        "100,000 API calls/month",
        "Advanced analytics",
        "2-year data retention",
        "Priority support",
        "All integrations",
        "Custom branding",
        "AI-powered insights"
      ],
      cta: "Start Free Trial",
      popular: true,
      gradient: "from-teal-600 to-cyan-600",
      delay: 100
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored for large organizations",
      icon: Building2,
      features: [
        "Unlimited users",
        "Custom API limits",
        "Unlimited retention",
        "Dedicated support",
        "SSO/SAML",
        "Custom contracts",
        "SLA guarantees",
        "On-premise option"
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-teal-600 to-teal-700",
      delay: 200
    }
  ];

  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-gray-400">Transparent Pricing</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Choose Your{" "}
            <span className="text-gradient">Plan</span>
          </h2>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            Start free. Upgrade when you need. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 p-1 glass rounded-full border border-white/10">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`
                px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
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
                px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
                ${billingPeriod === "annual" 
                  ? "bg-white text-black" 
                  : "text-gray-400 hover:text-white"
                }
              `}
            >
              Annual
              {billingPeriod === "annual" && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={index}
                className={`
                  relative
                  ${plan.popular ? "md:-mt-8" : ""}
                  ${inView ? 'animate-fade-in-up' : 'opacity-0'}
                `}
                style={{ animationDelay: `${plan.delay}ms` }}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-semibold px-4 py-1 rounded-full shadow-glow">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Card */}
                <div className={`
                  relative h-full group
                  ${plan.popular ? "scale-105" : ""}
                `}>
                  {/* Glow effect */}
                  <div 
                    className={`
                      absolute -inset-0.5 bg-gradient-to-r ${plan.gradient} 
                      rounded-3xl blur opacity-20 
                      ${plan.popular ? "opacity-30" : "group-hover:opacity-30"}
                      transition duration-1000
                    `} 
                  />
                  
                  {/* Card content */}
                  <div className={`
                    relative h-full glass rounded-3xl p-8 
                    ${plan.popular 
                      ? "border-2 border-teal-500/50" 
                      : "border border-white/10 hover:border-white/20"
                    }
                    transition-all duration-300
                  `}>
                    {/* Plan header */}
                    <div className="mb-8">
                      <div className={`
                        inline-flex p-3 rounded-2xl mb-4
                        bg-gradient-to-br ${plan.gradient}
                      `}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-gray-400">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        {plan.originalPrice && (
                          <span className="text-2xl text-gray-500 line-through">
                            ${plan.originalPrice}
                          </span>
                        )}
                        <span className="text-5xl font-bold text-white">
                          {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                        </span>
                        <span className="text-gray-400">{plan.period}</span>
                      </div>
                      {billingPeriod === "annual" && typeof plan.price === 'number' && (
                        <p className="text-sm text-green-400 mt-2">
                          ${plan.price * 12} billed annually
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <Check className="w-5 h-5 text-teal-400" />
                          </div>
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {plan.name === "Enterprise" ? (
                      <button 
                        onClick={() => router.push("/contact")}
                        className={`
                          w-full py-3 px-6 rounded-xl font-semibold
                          flex items-center justify-center gap-2
                          transition-all duration-300 group
                          glass text-white hover:bg-white/10 border border-white/10 hover:border-white/20
                        `}
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : enterpriseId ? (
                      <CheckoutButton
                        plan={plan.name.toLowerCase() as "starter" | "professional"}
                        billingPeriod={billingPeriod}
                        enterpriseId={enterpriseId}
                        className={`
                          w-full py-3 px-6 rounded-xl font-semibold
                          flex items-center justify-center gap-2
                          transition-all duration-300 group
                          ${plan.popular
                            ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-glow"
                            : "glass text-white hover:bg-white/10 border border-white/10 hover:border-white/20"
                          }
                        `}
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </CheckoutButton>
                    ) : (
                      <button 
                        onClick={() => router.push("/sign-up")}
                        className={`
                          w-full py-3 px-6 rounded-xl font-semibold
                          flex items-center justify-center gap-2
                          transition-all duration-300 group
                          ${plan.popular
                            ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-glow"
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
        <div className="mt-24 glass rounded-3xl p-8 border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Power-ups & Add-ons
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Extra API Calls",
                price: "$10",
                unit: "per 10k calls",
                icon: Zap
              },
              {
                title: "Extended Retention",
                price: "$20",
                unit: "per year",
                icon: Building2
              },
              {
                title: "Premium Support",
                price: "$50",
                unit: "per month",
                icon: Sparkles
              }
            ].map((addon, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <addon.icon className="w-8 h-8 text-teal-400 mx-auto mb-3" />
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