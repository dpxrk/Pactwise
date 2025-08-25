"use client";

import dynamic from "next/dynamic";
import React, { lazy, Suspense, useState, useCallback } from "react";

// Import core components directly (they're always needed)
import { Footer } from "./_components/landing/Footer";
import { HeroSection } from "./_components/landing/HeroSection";
import { Navigation } from "./_components/landing/Navigation";

// Lazy load sections that are below the fold
const AIAgentsSection = lazy(() =>
  import("./_components/landing/AIAgentsSection").then((mod) => ({
    default: mod.AIAgentsSection,
  }))
);
const DemoSection = lazy(() =>
  import("./_components/landing/DemoSection").then((mod) => ({
    default: mod.DemoSection,
  }))
);
const FeaturesSection = lazy(() =>
  import("./_components/landing/FeaturesSection").then((mod) => ({
    default: mod.FeaturesSection,
  }))
);
const TestimonialsSection = lazy(() =>
  import("./_components/landing/TestimonialsSection").then((mod) => ({
    default: mod.TestimonialsSection,
  }))
);
const PricingSection = lazy(() =>
  import("./_components/landing/PricingSection").then((mod) => ({
    default: mod.PricingSection,
  }))
);
const DashboardPreviewSection = lazy(() =>
  import("./_components/landing/DashboardPreviewSection").then((mod) => ({
    default: mod.DashboardPreviewSection,
  }))
);
const CTASection = lazy(() =>
  import("./_components/landing/CTASection").then((mod) => ({
    default: mod.CTASection,
  }))
);

// Lazy load demo modal (only loaded when needed)
const UnifiedDemoModal = dynamic(
  () => import("@/app/_components/demo/UnifiedDemoModal"),
  { ssr: false }
);

// Loading component for sections
const SectionLoader = () => (
  <div className="py-20">
    <div className="container mx-auto px-6">
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded w-1/3 mx-auto mb-6"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    </div>
  </div>
);

// Main Landing Page Component
export default function LandingPage() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleShowDemo = useCallback(() => {
    setShowDemoModal(true);
  }, []);

  const handleCloseDemo = useCallback(() => {
    setShowDemoModal(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden relative">
      {/* Minimalistic geometric pattern */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#000000"
                strokeWidth="0.5"
                opacity="0.05"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Navigation - Always visible */}
      <Navigation />

      {/* Hero Section - Always visible */}
      <HeroSection onShowDemo={handleShowDemo} />

      {/* AI Agents Showcase - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <AIAgentsSection />
      </Suspense>

      {/* Interactive Demos - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <DemoSection onShowModal={handleShowDemo} />
      </Suspense>

      {/* Features Section - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <FeaturesSection />
      </Suspense>

      {/* Testimonials Section - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <TestimonialsSection />
      </Suspense>

      {/* Pricing Section - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <PricingSection />
      </Suspense>

      {/* Interactive Dashboard Preview Section - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <DashboardPreviewSection />
      </Suspense>

      {/* Call to Action - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <CTASection />
      </Suspense>

      {/* Footer - Always visible */}
      <Footer />

      {/* Unified Demo Modal - Only loaded when needed */}
      {showDemoModal && (
        <Suspense fallback={null}>
          <UnifiedDemoModal isOpen={showDemoModal} onClose={handleCloseDemo} />
        </Suspense>
      )}
    </div>
  );
}
