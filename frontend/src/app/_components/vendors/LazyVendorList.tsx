'use client';

import React, { lazy, Suspense } from 'react';
// import { Id } from '../../../../convex/_generated/dataModel';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the vendor list component
const VendorList = lazy(() => import('./VendorList').then(m => ({ default: m.VendorList })));

interface LazyVendorListProps {
  enterpriseId: Id<"enterprises">;
}

const VendorListSkeleton = () => (
  <div className="space-y-6">
    {/* Stats skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
    
    {/* Search and filters skeleton */}
    <div className="flex gap-4">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Vendor cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const LazyVendorList: React.FC<LazyVendorListProps> = ({ enterpriseId }) => {
  return (
    <Suspense fallback={<VendorListSkeleton />}>
      <VendorList enterpriseId={enterpriseId} />
    </Suspense>
  );
};

export default LazyVendorList;