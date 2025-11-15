'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Bot, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ui/button';

export const HeroSection = React.memo(() => {
  const router = useRouter();
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 border border-[#9e829c] mb-6 text-xs"
          >
            <div className="w-1.5 h-1.5 bg-[#291528] rounded-full" />
            <span className="text-[#3a3e3b]">AI Systems Active</span>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[#291528]">Intelligent Systems</span>
            <br />
            <span className="relative">
              <span className="text-[#291528]">That Transform Contracts</span>
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-[1px] bg-[#291528]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-[#3a3e3b] mb-8 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Harness intelligent automation for your entire contract lifecycle.
            Analyze, negotiate, comply, and optimize—
            <span className="text-[#291528] font-semibold">
              {' '}
              with unprecedented precision.
            </span>
          </motion.p>

          <motion.div
            className="flex items-center justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              size="lg"
              className="bg-[#291528] hover:bg-[#000000] text-[#f0eff4] px-8 py-4 rounded-none border border-[#291528] transition-all duration-200"
              onClick={() => router.push('/auth/sign-up')}
            >
              <Bot className="mr-2 w-4 h-4" />
              Start Automating
            </Button>
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
        <ChevronRight className="w-6 h-6 text-[#9e829c] animate-bounce" />
      </motion.div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';