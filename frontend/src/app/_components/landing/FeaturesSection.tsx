'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PLATFORM_FEATURES } from './constants';

interface FeatureType {
  icon: React.ElementType;
  title: string;
  description: string;
  stats?: {
    value: string;
    label: string;
  };
}

const FeatureCard = React.memo<{ feature: FeatureType; index: number }>(
  ({ feature, index }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.05 }}
        className="group"
      >
        <Card className="relative bg-white border border-gray-300 p-8 h-full overflow-hidden hover:border-gray-900 transition-all duration-200">
          <div className="relative z-10">
            <div className="p-3 border border-gray-300 inline-block mb-6">
              <feature.icon className="w-6 h-6 text-gray-900" />
            </div>

            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              {feature.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {feature.description}
            </p>

            {feature.stats && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-semibold text-gray-900">
                    {feature.stats.value}
                  </span>
                  <span className="text-xs text-gray-600">
                    {feature.stats.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';

export const FeaturesSection = React.memo(() => {
  return (
    <section id="features" className="py-20 relative bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
            TECHNOLOGY
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-900">Built for Enterprise Scale</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powered by advanced automation, machine learning, and distributed
            computing
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PLATFORM_FEATURES.map((feature, index) => (
            <FeatureCard 
              key={index} 
              feature={feature as unknown as FeatureType} 
              index={index} 
            />
          ))}
        </div>
      </div>
    </section>
  );
});

FeaturesSection.displayName = 'FeaturesSection';