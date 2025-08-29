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

interface LandingWrapperProps {
  demoSection: React.ReactNode;
}

export function LandingWrapper({ demoSection }: LandingWrapperProps) {
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleShowDemo = useCallback(() => {
    setShowDemoModal(true);
  }, []);

  const handleCloseDemo = useCallback(() => {
    setShowDemoModal(false);
  }, []);

  return (
    <>
      {/* Hero Section with demo handler */}
      <HeroSection onShowDemo={handleShowDemo} />

      {/* Demo Section with modal handler */}
      {React.isValidElement(demoSection) && 
        React.cloneElement(demoSection as React.ReactElement<any>, {
          onShowModal: handleShowDemo
        })
      }

      {/* Unified Demo Modal - Only loaded when needed */}
      {showDemoModal && (
        <UnifiedDemoModal isOpen={showDemoModal} onClose={handleCloseDemo} />
      )}
    </>
  );
}