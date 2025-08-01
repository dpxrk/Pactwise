"use client";

import React, { useRef } from "react";
import { Upload, Brain, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { useInView } from "react-intersection-observer";

const ProcessPremium = () => {
  const steps = [
    {
      number: "01",
      title: "Upload",
      subtitle: "Your Contracts",
      description: "Drag, drop, done. Our AI instantly begins processing your entire contract library.",
      icon: Upload,
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
      delay: 0
    },
    {
      number: "02", 
      title: "AI Analysis",
      subtitle: "Deep Learning",
      description: "Multi-agent AI extracts every clause, identifies risks, and categorizes with 99.9% accuracy.",
      icon: Brain,
      color: "pink",
      gradient: "from-pink-500 to-pink-600",
      delay: 100
    },
    {
      number: "03",
      title: "Monitor",
      subtitle: "Real-time Alerts",
      description: "Get instant notifications for renewals, compliance issues, and optimization opportunities.",
      icon: Shield,
      color: "teal",
      gradient: "from-teal-500 to-teal-600",
      delay: 200
    },
    {
      number: "04",
      title: "Optimize",
      subtitle: "Save 30%+",
      description: "AI-powered insights help negotiate better terms and consolidate vendors automatically.",
      icon: TrendingUp,
      color: "teal",
      gradient: "from-teal-500 to-cyan-600",
      delay: 300
    }
  ];

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-gray-400">Simple 4-Step Process</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            How It{" "}
            <span className="text-gradient">Works</span>
          </h2>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            From upload to insights in minutes. No training required.
          </p>
        </div>

        {/* Process steps */}
        <div ref={ref} className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent transform -translate-y-1/2" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`
                    relative group
                    ${inView ? 'animate-fade-in-up' : 'opacity-0'}
                  `}
                  style={{ animationDelay: `${step.delay}ms` }}
                >
                  {/* Card */}
                  <div className="relative h-full">
                    {/* Glow effect on hover */}
                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${step.gradient} rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-1000`} />
                    
                    {/* Card content */}
                    <div className="relative h-full glass rounded-2xl p-8 border border-white/10 group-hover:border-white/20 transition-all duration-300">
                      {/* Step number */}
                      <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                        <span className="text-xs font-bold text-white">{step.number}</span>
                      </div>
                      
                      {/* Icon */}
                      <div className="mb-6">
                        <div className={`
                          relative w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} p-0.5
                          group-hover:scale-110 transition-transform duration-300
                        `}>
                          <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm font-medium text-teal-400 mb-4">
                        {step.subtitle}
                      </p>
                      <p className="text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Arrow (except for last item) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <div className="relative">
                        <ArrowRight className="w-8 h-8 text-teal-500/30" />
                        <div className="absolute inset-0 animate-pulse">
                          <ArrowRight className="w-8 h-8 text-teal-400/20" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <p className="text-gray-400 mb-8">
            Join <span className="text-white font-semibold">10,000+</span> companies already using Pactwise
          </p>
          
          <button className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-glow hover:shadow-glow hover:scale-105">
            <span>See It In Action</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-xl" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProcessPremium;