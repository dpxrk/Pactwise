'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { Badge } from '@/components/ui/badge';

const TestimonialsCarousel = dynamic(
  () =>
    import('@/components/premium/TestimonialsCarousel').then((mod) => ({
      default: mod.TestimonialsCarousel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    ),
  }
);

const AnimatedSection = dynamic(
  () =>
    import('@/components/premium/AnimatedSection').then((mod) => ({
      default: mod.AnimatedSection,
    })),
  { ssr: false }
);

export const TestimonialsSection = React.memo(() => {
  return (
    <section className="py-20 relative bg-[#f0eff4]">
      <div className="container mx-auto px-6">
        <AnimatedSection className="text-center mb-20">
          <Badge className="mb-6 bg-white/90 text-[#3a3e3b] border-[#9e829c] px-6 py-2 text-sm">
            SUCCESS STORIES
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-[#291528]">Trusted by Industry Leaders</span>
          </h2>
          <p className="text-xl text-[#3a3e3b] max-w-3xl mx-auto">
            See how forward-thinking companies are transforming their contract
            operations
          </p>
        </AnimatedSection>

        <TestimonialsCarousel className="max-w-4xl mx-auto" />
      </div>
    </section>
  );
});

TestimonialsSection.displayName = 'TestimonialsSection';