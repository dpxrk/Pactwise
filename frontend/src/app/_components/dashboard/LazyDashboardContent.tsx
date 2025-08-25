// Lazy-loaded wrapper for DashboardContent
'use client';

import React, { lazy, Suspense } from 'react';
import type { Id } from '@/types/id.types';
import { PremiumLoader } from '@/components/premium/PremiumLoader';

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
