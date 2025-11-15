'use client';

import { motion } from 'framer-motion';
import React, { Suspense } from 'react';

import { Badge } from '@/components/ui/badge';

import { PricingCard } from './PricingCard';

const PricingLoader = () => (
  <div className="max-w-2xl mx-auto">
    <div className="animate-pulse">
      <div className="h-96 bg-gray-100 rounded border-2 border-gray-300"></div>
    </div>
  </div>
);

export const PricingSection = React.memo(() => {
  return (
    <section id="pricing" className="py-20 relative bg-white/95">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-white/90 text-[#3a3e3b] border-[#9e829c] px-6 py-2 text-sm">
            PRICING
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-[#291528]">Simple, Transparent Pricing</span>
          </h2>
          <p className="text-xl text-[#3a3e3b] max-w-3xl mx-auto">
            All features included. No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <Suspense fallback={<PricingLoader />}>
            <PricingCard />
          </Suspense>
        </div>
      </div>
    </section>
  );
});

PricingSection.displayName = 'PricingSection';