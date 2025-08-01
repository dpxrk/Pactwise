"use client";

import React, { useState } from "react";
import { 
  Brain, Shield, Zap, BarChart3, Users, FileSearch, 
  Bot, TrendingUp, Bell, Lock, Sparkles, Globe
} from "lucide-react";
import { useInView } from "react-intersection-observer";

const FeaturesPremium = () => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const features = [
    {
      icon: Brain,
      title: "AI Contract Analysis",
      description: "Deep learning models extract and analyze every clause with superhuman accuracy",
      gradient: "from-teal-500 to-teal-600",
      stats: "99.9% Accuracy",
      category: "Intelligence"
    },
    {
      icon: Bot,
      title: "Multi-Agent System",
      description: "Specialized AI agents work together to handle complex contract workflows",
      gradient: "from-cyan-500 to-cyan-600",
      stats: "6 AI Agents",
      category: "Automation"
    },
    {
      icon: Shield,
      title: "Risk Detection",
      description: "Proactively identify compliance issues and contractual risks before they matter",
      gradient: "from-teal-600 to-teal-700",
      stats: "24/7 Monitoring",
      category: "Security"
    },
    {
      icon: TrendingUp,
      title: "Cost Optimization",
      description: "AI-powered insights help reduce contract spend by up to 30%",
      gradient: "from-green-500 to-green-600",
      stats: "30% Savings",
      category: "Finance"
    },
    {
      icon: Users,
      title: "Vendor Management",
      description: "Centralize vendor data, track performance, and automate renewals",
      gradient: "from-blue-500 to-blue-600",
      stats: "Unified View",
      category: "Operations"
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Get notified about important dates, changes, and opportunities",
      gradient: "from-yellow-500 to-yellow-600",
      stats: "Real-time",
      category: "Notifications"
    }
  ];

  const categories = ["All", "Intelligence", "Automation", "Security", "Finance", "Operations", "Notifications"];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredFeatures = selectedCategory === "All" 
    ? features 
    : features.filter(f => f.category === selectedCategory);

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-gray-400">Powerful Features</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Everything You Need to{" "}
            <span className="text-gradient">Scale</span>
          </h2>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            Enterprise-grade features that grow with your business
          </p>

          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${selectedCategory === category
                    ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-glow"
                    : "glass text-gray-400 hover:text-white hover:bg-white/5 border border-white/10"
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`
                  relative group
                  ${inView ? 'animate-scale-in' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 100}ms` }}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                {/* Glow effect */}
                <div 
                  className={`
                    absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} 
                    rounded-2xl blur opacity-0 group-hover:opacity-20 
                    transition duration-1000
                  `} 
                />
                
                {/* Card */}
                <div className="relative h-full glass rounded-2xl p-8 border border-white/10 group-hover:border-white/20 transition-all duration-300">
                  {/* Stats badge */}
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-semibold text-teal-400 bg-teal-400/10 px-2 py-1 rounded-full">
                      {feature.stats}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`
                      relative inline-flex p-3 rounded-2xl
                      bg-gradient-to-br ${feature.gradient}
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      <Icon className="w-6 h-6 text-white" />
                      
                      {/* Animated ring */}
                      <div className="absolute inset-0 rounded-2xl animate-ping">
                        <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-20`} />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Learn more link */}
                  <div className="flex items-center gap-2 text-teal-400 group-hover:text-teal-300 transition-colors">
                    <span className="text-sm font-medium">Learn more</span>
                    <svg 
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Agents showcase */}
        <div className="mt-24 glass rounded-3xl p-12 border border-white/10">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              Meet Your AI Team
            </h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Six specialized AI agents work 24/7 to manage your contracts
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "Legal Agent", icon: Shield, color: "teal" },
              { name: "Financial Agent", icon: TrendingUp, color: "green" },
              { name: "Manager Agent", icon: Users, color: "blue" },
              { name: "Analytics Agent", icon: BarChart3, color: "cyan" },
              { name: "Secretary Agent", icon: FileSearch, color: "teal" },
              { name: "Notification Agent", icon: Bell, color: "yellow" }
            ].map((agent, index) => {
              const AgentIcon = agent.icon;
              return (
                <div 
                  key={index}
                  className="text-center group cursor-pointer"
                >
                  <div className={`
                    relative mx-auto w-20 h-20 mb-3 rounded-2xl
                    bg-gradient-to-br from-${agent.color}-500/20 to-${agent.color}-600/20
                    group-hover:scale-110 transition-transform duration-300
                  `}>
                    <div className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <AgentIcon className={`w-8 h-8 text-${agent.color}-400`} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                    {agent.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesPremium;