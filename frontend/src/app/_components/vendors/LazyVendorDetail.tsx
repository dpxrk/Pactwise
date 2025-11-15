// @ts-nocheck
'use client';

import React, { lazy, Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { Id } from '@/types/id.types';

// Lazy load the vendor detail component
const VendorDetail = lazy(() => import('./VendorDetail').then(m => ({ default: m.VendorDetail })));

interface LazyVendorDetailProps {
  vendorId: Id<"vendors">;
  enterpriseId: Id<"enterprises">;
}

const VendorDetailSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Tabs skeleton */}
    <div className="bg-white rounded-lg shadow">
      <Skeleton className="h-12 w-full mb-4" />
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export const LazyVendorDetail: React.FC<LazyVendorDetailProps> = ({ vendorId, enterpriseId }) => {
  return (
    <Suspense fallback={<VendorDetailSkeleton />}>
      <VendorDetail vendorId={vendorId} enterpriseId={enterpriseId} />
    </Suspense>
  );
};

export default LazyVendorDetail;
