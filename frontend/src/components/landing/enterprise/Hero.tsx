"use client";

import { motion } from 'framer-motion';
import { ArrowRight, Play, Shield, CheckCircle } from 'lucide-react';
import React from 'react';

interface HeroProps {
  onScheduleDemo?: () => void;
  onWatchVideo?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onScheduleDemo,
  onWatchVideo,
}) => {
  return (
    <section className="relative min-h-screen flex items-center">
      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Trust badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 border border-purple-200 rounded-full mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Shield className="w-4 h-4 text-purple-700" />
              <span className="text-sm font-medium text-purple-800">
                Trusted by 50+ Enterprise Legal Teams
              </span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Transform Contract Chaos Into{' '}
              <span className="text-purple-700">Strategic Clarity</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
              AI-powered contract intelligence that helps legal teams review faster,
              reduce risk, and unlock insights from every agreement.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button
                onClick={onScheduleDemo}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-900 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors"
              >
                Schedule a Demo
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onWatchVideo}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-purple-300 hover:text-purple-700 transition-colors"
              >
                <Play className="w-5 h-5" />
                Watch Overview
              </button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-200">
              {[
                { label: 'SOC2 Type II', icon: CheckCircle },
                { label: 'GDPR Compliant', icon: CheckCircle },
                { label: '99.9% Uptime', icon: CheckCircle },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <item.icon className="w-4 h-4 text-green-600" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right side - Visual placeholder for 3D */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* This area is for the 3D canvas to show through */}
            <div className="aspect-square max-w-lg mx-auto">
              {/* Decorative elements that complement the 3D */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-pink-100/30 rounded-3xl" />
              <div className="absolute inset-4 border border-purple-200/50 rounded-2xl" />

              {/* Stats overlay */}
              <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-900">87%</div>
                    <div className="text-xs text-gray-500 mt-1">Time Saved</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-900">10K+</div>
                    <div className="text-xs text-gray-500 mt-1">Contracts/Hour</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-900">99.7%</div>
                    <div className="text-xs text-gray-500 mt-1">Accuracy</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
