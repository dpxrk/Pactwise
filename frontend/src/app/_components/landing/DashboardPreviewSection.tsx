'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';

const AnimatedSection = dynamic(
  () =>
    import('@/components/premium/AnimatedSection').then((mod) => ({
      default: mod.AnimatedSection,
    })),
  { ssr: false }
);

const MouseParallax = dynamic(
  () =>
    import('@/components/premium/ParallaxSection').then((mod) => ({
      default: mod.MouseParallax,
    })),
  { ssr: false }
);

const InteractiveDashboardPreview = dynamic(
  () =>
    import('@/components/premium/DashboardPreview').then((mod) => ({
      default: mod.InteractiveDashboardPreview,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-100 rounded"></div>
        </div>
      </div>
    ),
  }
);

export const DashboardPreviewSection = React.memo(() => {
  return (
    <section className="py-20 relative bg-gray-50">
      <div className="container mx-auto px-6">
        <AnimatedSection className="text-center mb-20">
          <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
            LIVE PREVIEW
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-900">See It In Action</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the power of our platform with this interactive
            dashboard preview
          </p>
        </AnimatedSection>

        <MouseParallax strength={15}>
          <InteractiveDashboardPreview className="max-w-6xl mx-auto" />
        </MouseParallax>
      </div>
    </section>
  );
});

DashboardPreviewSection.displayName = 'DashboardPreviewSection';