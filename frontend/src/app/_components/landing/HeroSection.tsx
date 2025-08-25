'use client';

import React, { Suspense } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Bot, Play, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ANIMATED_METRICS } from './constants';

const MetricsGrid = dynamic(
  () =>
    import('@/components/premium/MetricsCounter').then((mod) => ({
      default: mod.MetricsGrid,
    })),
  { 
    ssr: false,
    loading: () => <div className="h-20 animate-pulse bg-gray-100 rounded" />
  }
);

interface HeroSectionProps {
  onShowDemo: () => void;
}

export const HeroSection = React.memo<HeroSectionProps>(({ onShowDemo }) => {
  const heroRef = React.useRef(null);
  const { scrollY } = useScroll();
  const isHeroInView = useInView(heroRef, { once: true });
  
  const y1 = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative flex items-center justify-center pt-32 pb-20"
    >
      <motion.div
        style={{ y: y1, opacity }}
        className="container mx-auto px-6 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 mb-6 text-xs"
          >
            <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
            <span className="text-gray-700">AI Systems Active</span>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-gray-900">Intelligent Systems</span>
            <br />
            <span className="relative">
              <span className="text-gray-900">That Transform Contracts</span>
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gray-900"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Harness intelligent automation for your entire contract lifecycle.
            Analyze, negotiate, comply, and optimize—
            <span className="text-gray-900 font-semibold">
              {' '}
              with unprecedented precision.
            </span>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-none border border-gray-900 transition-all duration-200"
              onClick={() => (window.location.href = '/auth/sign-up')}
            >
              <Bot className="mr-2 w-4 h-4" />
              Start Automating
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-900 text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-none"
              onClick={onShowDemo}
            >
              <Play className="mr-2 w-4 h-4" />
              View Demo
            </Button>
          </motion.div>

          {/* Live metrics */}
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Suspense fallback={<div className="h-20 animate-pulse bg-gray-100 rounded" />}>
              <MetricsGrid metrics={ANIMATED_METRICS} variant="compact" />
            </Suspense>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Minimal scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
      >
        <ChevronRight className="w-6 h-6 text-gray-600 animate-bounce" />
      </motion.div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';