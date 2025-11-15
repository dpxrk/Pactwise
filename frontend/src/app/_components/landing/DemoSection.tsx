'use client';

import { motion } from 'framer-motion';
import { Sparkles, CheckCircle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { DEMO_SCENARIOS } from './constants';

interface DemoType {
  title: string;
  steps: readonly string[];
}

const InteractiveDemo = React.memo<{ demo: DemoType; onRunDemo: () => void }>(
  ({ demo, onRunDemo }) => {
    const [isActive, setIsActive] = useState(false);
    const [demoProgress, setDemoProgress] = useState(0);

    useEffect(() => {
      if (isActive) {
        const interval = setInterval(() => {
          setDemoProgress((prev) => {
            if (prev >= 100) {
              setIsActive(false);
              return 0;
            }
            return prev + 2;
          });
        }, 50);
        return () => clearInterval(interval);
      }
      return undefined;
    }, [isActive]);

    return (
      <div className="relative p-8 bg-white/95 border-2 border-[#291528] overflow-hidden shadow-lg">
        <div
          className="absolute top-0 left-0 h-[1px] bg-[#291528]"
          style={{
            width: `${demoProgress}%`,
            transition: 'width 0.05s linear',
          }}
        />

        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-[#291528]">{demo.title}</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsActive(true);
              setDemoProgress(0);
              onRunDemo();
            }}
            disabled={isActive}
            className="text-xs"
          >
            {isActive ? 'Running...' : 'Run Demo'}
          </Button>
        </div>

        <div className="space-y-3">
          {demo.steps.map((step, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-3"
              initial={{ opacity: 0.5 }}
              animate={{
                opacity: isActive && demoProgress > (i * 100 / demo.steps.length) ? 1 : 0.5,
                x: isActive && demoProgress > (i * 100 / demo.steps.length) ? 5 : 0,
              }}
            >
              <div
                className={`w-1 h-1 ${
                  isActive && demoProgress > (i * 100 / demo.steps.length)
                    ? 'bg-[#291528]'
                    : 'bg-[#9e829c]'
                }`}
              />
              <span className="text-sm text-[#3a3e3b]">{step}</span>
            </motion.div>
          ))}
        </div>

        {isActive && demoProgress === 100 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-[#f0eff4] border border-[#9e829c]"
          >
            <p className="text-sm text-[#3a3e3b] flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
            </p>
          </motion.div>
        )}
      </div>
    );
  }
);

InteractiveDemo.displayName = 'InteractiveDemo';

interface DemoSectionProps {
  onShowModal: () => void;
}

export const DemoSection = React.memo<DemoSectionProps>(({ onShowModal }) => {
  const handleRunDemo = useCallback(() => {
    onShowModal();
  }, [onShowModal]);

  return (
    <section className="py-20 relative bg-[#f0eff4]">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-white/90 text-[#3a3e3b] border-[#9e829c] px-6 py-2 text-sm">
            DEMONSTRATIONS
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-[#291528]">Experience the Platform</span>
          </h2>
          <p className="text-xl text-[#3a3e3b] max-w-3xl mx-auto mb-6">
            Experience real-time operations with interactive demonstrations
          </p>
          <Button
            onClick={onShowModal}
            className="bg-[#291528] hover:bg-[#000000] text-[#f0eff4] px-8 py-4"
          >
            <Sparkles className="mr-2 w-4 h-4" />
            Launch Live Demo
          </Button>
        </motion.div>

        <div className="max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <InteractiveDemo demo={DEMO_SCENARIOS[0]} onRunDemo={handleRunDemo} />
          </motion.div>
        </div>
      </div>
    </section>
  );
});

DemoSection.displayName = 'DemoSection';