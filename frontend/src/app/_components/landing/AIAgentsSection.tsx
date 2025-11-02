'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useRef, Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { AI_AGENTS } from './constants';

const TiltCard = dynamic(
  () =>
    import('@/components/premium/HoverEffects').then((mod) => ({
      default: mod.TiltCard,
    })),
  {
    ssr: false,
    loading: () => <div className="h-full" />
  }
);

type AIAgentType = (typeof AI_AGENTS)[number];

const AIAgentCard = React.memo<{ agent: AIAgentType; index: number }>(
  ({ agent, index }) => {
    const cardRef = useRef(null);

    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        className="relative h-full"
      >
        <Suspense fallback={<div className="h-full bg-gray-100 animate-pulse rounded" />}>
          <TiltCard maxTilt={10} scale={1.02}>
            <Card className="relative overflow-hidden border border-[#9e829c] bg-white/95 p-8 h-full group hover:border-[#291528] transition-all duration-200">
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 border border-[#9e829c] bg-white">
                    <agent.icon className="w-6 h-6 text-[#291528]" />
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-white border-[#9e829c] text-[#3a3e3b] text-xs"
                  >
                    {agent.status}
                  </Badge>
                </div>

                <h3 className="text-xl font-semibold text-[#291528] mb-3">
                  {agent.name}
                </h3>
                <p className="text-[#3a3e3b] text-sm mb-6 leading-relaxed">
                  {agent.description}
                </p>

                <div className="space-y-3 mb-6">
                  {agent.capabilities.map((capability, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-1 h-4 bg-[#291528]" />
                      <span className="text-sm text-[#3a3e3b]">{capability}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#9e829c]/30">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[#9e829c]">Active</span>
                    <span className="text-xs text-[#9e829c]">
                      {agent.performance}% Accuracy
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9e829c]" />
                </div>
              </div>
            </Card>
          </TiltCard>
        </Suspense>
      </motion.div>
    );
  }
);

AIAgentCard.displayName = 'AIAgentCard';

interface AIAgentsSectionProps {
  onShowDemo?: () => void;
}

export const AIAgentsSection = React.memo<AIAgentsSectionProps>(({ onShowDemo }) => {
  return (
    <section id="agents" className="py-20 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-white/90 text-[#3a3e3b] border-[#9e829c] px-6 py-2 text-sm">
            INTELLIGENT AUTOMATION
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-[#291528]">
              Your Intelligent Contract Suite
            </span>
          </h2>
          <p className="text-xl text-[#3a3e3b] max-w-3xl mx-auto mb-8">
            Specialized intelligent systems with distinct capabilities,
            working together to transform how you manage contracts and vendors
          </p>
          <Button
            onClick={onShowDemo}
            className="bg-[#291528] hover:bg-[#000000] text-[#f0eff4] px-8 py-4"
            size="lg"
          >
            <Sparkles className="mr-2 w-4 h-4" />
            Launch Live Demo
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {AI_AGENTS.map((agent, index) => (
            <AIAgentCard 
              key={index} 
              agent={agent as unknown as AIAgentType} 
              index={index} 
            />
          ))}
        </div>

        {/* AI Network Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative"
        >
          <Card className="bg-white/95 p-12 border border-[#9e829c]">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-semibold mb-4 text-[#291528]">
                Unified Intelligence Platform
              </h3>
              <p className="text-[#3a3e3b] max-w-2xl mx-auto">
                Our systems work in harmony—forming an integrated network of
                intelligence, sharing insights and collaborating to deliver
                exceptional results
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#291528] mb-2">
                  99.7%
                </div>
                <p className="text-[#3a3e3b]">Accuracy Rate</p>
                <p className="text-xs text-[#9e829c] mt-2">
                  Industry-leading precision
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#291528] mb-2">
                  150ms
                </div>
                <p className="text-[#3a3e3b]">Response Time</p>
                <p className="text-xs text-[#9e829c] mt-2">
                  Real-time processing
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#291528] mb-2">
                  24/7
                </div>
                <p className="text-[#3a3e3b]">Continuous Operation</p>
                <p className="text-xs text-[#9e829c] mt-2">Always active</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
});

AIAgentsSection.displayName = 'AIAgentsSection';