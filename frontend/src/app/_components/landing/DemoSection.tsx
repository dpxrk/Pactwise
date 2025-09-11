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
    }, [isActive]);

    return (
      <div className="relative p-6 bg-white border border-gray-300 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-[1px] bg-gray-900"
          style={{
            width: `${demoProgress}%`,
            transition: 'width 0.05s linear',
          }}
        />

        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">{demo.title}</h4>
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
                opacity: isActive && demoProgress > i * 25 ? 1 : 0.5,
                x: isActive && demoProgress > i * 25 ? 5 : 0,
              }}
            >
              <div
                className={`w-1 h-1 ${
                  isActive && demoProgress > i * 25
                    ? 'bg-gray-900'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-gray-600">{step}</span>
            </motion.div>
          ))}
        </div>

        {isActive && demoProgress === 100 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-gray-50 border border-gray-300"
          >
            <p className="text-sm text-gray-700 flex items-center gap-2">
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
    <section className="py-20 relative bg-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
            DEMONSTRATIONS
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-900">Experience the Platform</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            Experience real-time operations with interactive demonstrations
          </p>
          <Button
            onClick={onShowModal}
            className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4"
          >
            <Sparkles className="mr-2 w-4 h-4" />
            Launch Live Demo
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {DEMO_SCENARIOS.map((demo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <InteractiveDemo demo={demo} onRunDemo={handleRunDemo} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

DemoSection.displayName = 'DemoSection';