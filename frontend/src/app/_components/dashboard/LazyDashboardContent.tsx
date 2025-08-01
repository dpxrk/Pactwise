// Lazy-loaded wrapper for DashboardContent
'use client';

import React, { lazy, Suspense } from 'react';
import { PremiumLoader } from '@/components/premium/PremiumLoader';
// import { Id } from '@/convex/_generated/dataModel';

const DashboardContent = lazy(() => import('./DashboardContent'));

interface LazyDashboardContentProps {
  enterpriseId: Id<"enterprises">;
}

export default function LazyDashboardContent({ enterpriseId }: LazyDashboardContentProps) {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <PremiumLoader size="lg" text="Loading dashboard..." />
        </div>
      }
    >
      <DashboardContent enterpriseId={enterpriseId} />
    </Suspense>
  );
}