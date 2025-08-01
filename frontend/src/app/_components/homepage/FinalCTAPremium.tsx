"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Clock, Shield, CheckCircle } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const FinalCTAPremium = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // Countdown timer for urgency
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 }; // Reset
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const guarantees = [
    { icon: Shield, text: "14-day money-back guarantee" },
    { icon: Clock, text: "Setup in under 5 minutes" },
    { icon: CheckCircle, text: "No credit card required" }
  ];

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Dynamic background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-black to-cyan-900/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/30 to-cyan-600/30 rounded-full blur-3xl animate-pulse" />
        </div>
      </div>

      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Urgency banner */}
        <div className={`
          inline-flex items-center gap-3 px-4 py-2 rounded-full glass border border-teal-500/30 mb-8
          ${inView ? 'animate-fade-in' : 'opacity-0'}
        `}>
          <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
          <span className="text-sm font-medium text-teal-300">
            Limited Time Offer - {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s left
          </span>
        </div>

        {/* Main headline */}
        <h2 className={`
          text-5xl md:text-7xl font-bold text-white mb-6
          ${inView ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}
        `}>
          Ready to Transform Your{" "}
          <span className="text-gradient block md:inline">Contract Management?</span>
        </h2>

        {/* Subheadline */}
        <p className={`
          text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8
          ${inView ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}
        `}>
          Join <span className="text-white font-semibold">10,000+</span> companies saving millions 
          with AI-powered contract intelligence.
        </p>

        {/* Value props */}
        <div className={`
          grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-12
          ${inView ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}
        `}>
          {[
            { value: "90%", label: "Faster Reviews" },
            { value: "30%", label: "Cost Reduction" },
            { value: "24/7", label: "AI Support" }
          ].map((stat, index) => (
            <div key={index} className="glass rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-gradient mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className={`
          flex flex-col sm:flex-row gap-4 justify-center mb-8
          ${inView ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}
        `}>
          <button 
            onClick={() => router.push(isSignedIn ? "/pricing" : "/sign-up")}
            className="group relative px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-glow hover:shadow-glow hover:scale-105 text-lg"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-xl" />
          </button>
          
          <button 
            onClick={() => router.push("/contact")}
            className="px-8 py-4 glass border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all duration-300 hover:bg-white/5 text-lg"
          >
            Schedule a Demo
          </button>
        </div>

        {/* Trust guarantees */}
        <div className={`
          flex flex-wrap justify-center gap-6 mb-12
          ${inView ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}
        `}>
          {guarantees.map((guarantee, index) => {
            const Icon = guarantee.icon;
            return (
              <div key={index} className="flex items-center gap-2 text-gray-400">
                <Icon className="w-4 h-4 text-teal-400" />
                <span className="text-sm">{guarantee.text}</span>
              </div>
            );
          })}
        </div>

        {/* Social proof */}
        <div className={`
          ${inView ? 'animate-fade-in animation-delay-600' : 'opacity-0'}
        `}>
          <p className="text-sm text-gray-500 mb-4">Trusted by industry leaders</p>
          <div className="flex items-center justify-center gap-8 opacity-40 hover:opacity-60 transition-opacity">
            {/* Replace with actual logos */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-28 h-10 bg-white/10 rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Floating elements for visual interest */}
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-teal-500/20 rounded-full blur-xl animate-float" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-xl animate-float animation-delay-2000" />
      </div>
    </section>
  );
};

export default FinalCTAPremium;