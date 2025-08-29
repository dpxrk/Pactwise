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
    <section id="pricing" className="py-20 relative bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
            LIMITED OFFER
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-900">$500/month</span>
            <br />
            <span className="text-3xl md:text-4xl text-gray-600">
              First 500 users: 90% off for 24 months
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join now and pay only $50/month for your first 2 years. No hidden
            fees, all features included.
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