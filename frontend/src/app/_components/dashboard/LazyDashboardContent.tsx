// Lazy-loaded wrapper for DashboardContent
'use client';

import React, { lazy, Suspense } from 'react';

import { PremiumLoader } from '@/components/premium/PremiumLoader';
import type { Id } from '@/types/id.types';

const DashboardContent = lazy(() => import('./DashboardContent'));

interface LazyDashboardContentProps {
  enterpriseId: Id<"enterprises">;
}

export default function LazyDashboardContent({ enterpriseId }: LazyDashboardContentProps) {
  return (
    <Suspense 
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <PremiumLoader size="lg" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      }
    >
      <DashboardContent enterpriseId={enterpriseId} />
    </Suspense>
  );
}
