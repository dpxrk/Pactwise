"use client";

import React from "react";
import { 
  TrendingUp, Shield, Clock, Users, 
  Zap, Brain, CheckCircle, ArrowRight 
} from "lucide-react";
import { useInView } from "react-intersection-observer";

const BenefitsPremium = () => {
  const { ref: statsRef, inView: statsInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const { ref: benefitsRef, inView: benefitsInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const stats = [
    { value: "90%", label: "Time Saved", suffix: "+" },
    { value: "30%", label: "Cost Reduction", suffix: "+" },
    { value: "99.9%", label: "Accuracy", suffix: "%" },
    { value: "24/7", label: "Monitoring", suffix: "" }
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: "Increase Revenue",
      description: "Identify upsell opportunities and optimize contract terms automatically",
      metric: "+25% revenue growth"
    },
    {
      icon: Shield,
      title: "Reduce Risk",
      description: "AI-powered compliance monitoring catches issues before they become problems",
      metric: "80% fewer violations"
    },
    {
      icon: Clock,
      title: "Save Time",
      description: "Automate contract workflows and eliminate manual review processes",
      metric: "10 hours/week saved"
    },
    {
      icon: Users,
      title: "Improve Collaboration",
      description: "Real-time updates and smart notifications keep everyone aligned",
      metric: "3x faster approvals"
    }
  ];

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats section */}
        <div ref={statsRef} className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              The Numbers Speak for{" "}
              <span className="text-gradient">Themselves</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`
                  text-center group
                  ${statsInView ? 'animate-scale-in' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative inline-block">
                  <div className="text-6xl md:text-7xl font-bold text-gradient mb-2">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <p className="text-gray-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits grid */}
        <div ref={benefitsRef}>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-6">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-gray-400">Proven Results</span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Why Teams Choose{" "}
              <span className="text-gradient">Pactwise</span>
            </h2>
            
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Transform your contract management from a cost center to a profit driver
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className={`
                    group relative
                    ${benefitsInView ? 'animate-fade-in-up' : 'opacity-0'}
                  `}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Card */}
                  <div className="relative h-full glass rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-3xl" />
                    </div>

                    <div className="relative z-10">
                      {/* Icon and metric */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-6 h-6 text-teal-400" />
                        </div>
                        <span className="text-sm font-semibold text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                          {benefit.metric}
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className="text-2xl font-bold text-white mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed mb-6">
                        {benefit.description}
                      </p>

                      {/* CTA */}
                      <button className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors group">
                        <span className="font-medium">Learn more</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROI Calculator CTA */}
        <div className="mt-24 glass rounded-3xl p-12 border border-white/10 text-center">
          <Brain className="w-16 h-16 text-teal-400 mx-auto mb-6" />
          <h3 className="text-3xl font-bold text-white mb-4">
            Calculate Your ROI
          </h3>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            See how much time and money you could save with Pactwise's AI-powered contract management
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-glow hover:shadow-glow hover:scale-105">
            <Zap className="w-5 h-5" />
            <span>Calculate Savings</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default BenefitsPremium;