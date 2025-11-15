// @ts-nocheck
'use client';

import React, { lazy, Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { Id } from '@/types/id.types';

// Lazy load the vendor analytics component
const VendorAnalytics = lazy(() => import('./VendorAnalytics').then(m => ({ default: m.VendorAnalytics })));

interface LazyVendorAnalyticsProps {
  enterpriseId: Id<"enterprises">;
}

const VendorAnalyticsSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div>
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-96" />
    </div>
    
    {/* Charts skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-6 border rounded-lg">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      ))}
    </div>
    
    {/* Table skeleton */}
    <div className="border rounded-lg p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export const LazyVendorAnalytics: React.FC<LazyVendorAnalyticsProps> = ({ enterpriseId }) => {
  return (
    <Suspense fallback={<VendorAnalyticsSkeleton />}>
      <VendorAnalytics enterpriseId={enterpriseId} />
    </Suspense>
  );
};

export default LazyVendorAnalytics;
