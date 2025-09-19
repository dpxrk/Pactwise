'use client';

import dynamic from 'next/dynamic';
import React, { useState, useCallback } from 'react';
import { HeroSection } from './HeroSection';

// Lazy load demo modal (only loaded when needed)
const UnifiedDemoModal = dynamic(
  () => import('@/app/_components/demo/UnifiedDemoModal'),
  { 
    ssr: false,
    loading: () => null 
  }
);

export function LandingWrapper() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleShowDemo = useCallback(() => {
    setShowDemoModal(true);
  }, []);

  const handleCloseDemo = useCallback(() => {
    setShowDemoModal(false);
  }, []);

  // Export the demo handler for use in other components
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).launchDemo = handleShowDemo;
    }
  }, [handleShowDemo]);

  return (
    <>
      {/* Hero Section */}
      <HeroSection />

      {/* Unified Demo Modal - Only loaded when needed */}
      {showDemoModal && (
        <UnifiedDemoModal isOpen={showDemoModal} onClose={handleCloseDemo} />
      )}
    </>
  );
}