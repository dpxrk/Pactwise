"use client";

import React, { Suspense, lazy, useEffect, useState } from "react";
import NavigationPremium from "@/app/_components/homepage/NavigationPremium";
import HeroPremium from "@/app/_components/homepage/HeroPremium";
import { LoadingSpinner } from "@/app/_components/common/LoadingSpinner";
import "./landing-debug.css";

// Lazy load non-critical components
const ProcessPremium = lazy(() => import("@/app/_components/homepage/ProcessPremium"));
const FeaturesPremium = lazy(() => import("@/app/_components/homepage/FeaturesPremium"));
const PricingPremium = lazy(() => import("@/app/_components/homepage/PricingPremium"));
const BenefitsPremium = lazy(() => import("@/app/_components/homepage/BenefitsPremium"));
const FAQPremium = lazy(() => import("@/app/_components/homepage/FAQPremium"));
const FinalCTAPremium = lazy(() => import("@/app/_components/homepage/FinalCTAPremium"));
const FooterPremium = lazy(() => import("@/app/_components/homepage/FooterPremium"));
const PremiumBackground = lazy(() => import("@/app/_components/homepage/PremiumBackground"));
const CustomCursor = lazy(() => import("@/app/_components/common/CustomCursor"));
const ScrollProgress = lazy(() => import("@/app/_components/common/ScrollProgress"));

// Section loading component
const SectionLoader = () => (
  <div className="flex items-center justify-center py-20">
    <LoadingSpinner size="lg" />
  </div>
);

const OptimizedLandingPage = () => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [showNonCritical, setShowNonCritical] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    
    // Load non-critical components after initial render
    const timer = setTimeout(() => {
      setShowNonCritical(true);
    }, 100);

    // Cleanup animations
    const animationTimer = setTimeout(() => {
      document.querySelectorAll('[class*="animate-"]').forEach((el) => {
        (el as HTMLElement).style.opacity = '1';
        (el as HTMLElement).style.transform = 'none';
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      clearTimeout(animationTimer);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading..." />
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* Force all content to be visible */
        .opacity-0 { opacity: 1 !important; }
        [class*="animate-"] { 
          opacity: 1 !important; 
          transform: none !important;
          animation-play-state: paused !important;
        }
      `}</style>

      <div className="relative min-h-screen bg-black text-white">
        {/* Background loads after initial render */}
        {showNonCritical && (
          <Suspense fallback={null}>
            <PremiumBackground />
          </Suspense>
        )}
        
        {/* Critical components load immediately */}
        <NavigationPremium />

        <main className="relative">
          {/* Hero Section - Critical */}
          <section id="hero" className="relative border-b border-white/10">
            <HeroPremium />
          </section>

          {/* Non-critical sections lazy load */}
          {showNonCritical && (
            <>
              {/* Process Section */}
              <section id="process" className="relative bg-gray-900/20 border-b border-white/10">
                <div className="py-20">
                  <h2 className="text-4xl font-bold text-center mb-10">How It Works</h2>
                  <Suspense fallback={<SectionLoader />}>
                    <ProcessPremium />
                  </Suspense>
                </div>
              </section>

              {/* Features Section */}
              <section id="features" className="relative bg-gray-900/30 border-b border-white/10">
                <div className="py-20">
                  <h2 className="text-4xl font-bold text-center mb-10">Features</h2>
                  <Suspense fallback={<SectionLoader />}>
                    <FeaturesPremium />
                  </Suspense>
                </div>
              </section>

              {/* Pricing Section */}
              <section id="pricing" className="relative bg-gray-900/20 border-b border-white/10">
                <div className="py-20">
                  <h2 className="text-4xl font-bold text-center mb-10">Pricing</h2>
                  <Suspense fallback={<SectionLoader />}>
                    <PricingPremium />
                  </Suspense>
                </div>
              </section>

              {/* Benefits Section */}
              <section id="benefits" className="relative bg-gray-900/30 border-b border-white/10">
                <div className="py-20">
                  <h2 className="text-4xl font-bold text-center mb-10">Benefits</h2>
                  <Suspense fallback={<SectionLoader />}>
                    <BenefitsPremium />
                  </Suspense>
                </div>
              </section>

              {/* FAQ Section */}
              <section id="faq" className="relative bg-gray-900/20 border-b border-white/10">
                <div className="py-20">
                  <h2 className="text-4xl font-bold text-center mb-10">FAQ</h2>
                  <Suspense fallback={<SectionLoader />}>
                    <FAQPremium />
                  </Suspense>
                </div>
              </section>

              {/* Final CTA */}
              <section className="relative bg-gray-900/30">
                <Suspense fallback={<SectionLoader />}>
                  <FinalCTAPremium />
                </Suspense>
              </section>

              {/* Footer */}
              <Suspense fallback={null}>
                <FooterPremium />
              </Suspense>
            </>
          )}
        </main>

        {/* Non-critical UI enhancements */}
        {showNonCritical && (
          <>
            <Suspense fallback={null}>
              <CustomCursor />
            </Suspense>
            <Suspense fallback={null}>
              <ScrollProgress />
            </Suspense>
          </>
        )}
      </div>
    </>
  );
};

export default OptimizedLandingPage;