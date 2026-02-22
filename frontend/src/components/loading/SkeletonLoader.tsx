'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonLoaderProps {
  variant: 'contract-list' | 'vendor-list' | 'table' | 'form' | 'card' | 'stats' | 'detail';
  count?: number;
  className?: string;
}

export function SkeletonLoader({ variant, count = 1, className }: SkeletonLoaderProps) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {variant === 'contract-list' && <ContractListSkeleton />}
          {variant === 'vendor-list' && <VendorListSkeleton />}
          {variant === 'table' && <TableRowSkeleton />}
          {variant === 'form' && <FormSkeleton />}
          {variant === 'card' && <CardSkeleton />}
          {variant === 'stats' && <StatsSkeleton />}
          {variant === 'detail' && <DetailSkeleton />}
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function ContractListSkeleton() {
  return (
    <div className="border border-ghost-300 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-5 w-2/5" />
        <Skeleton variant="shimmer" className="h-5 w-16" />
      </div>
      <Skeleton variant="shimmer" className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton variant="shimmer" className="h-6 w-20" />
        <Skeleton variant="shimmer" className="h-6 w-24" />
        <Skeleton variant="shimmer" className="h-6 w-16" />
      </div>
    </div>
  );
}

function VendorListSkeleton() {
  return (
    <div className="border border-ghost-300 bg-white p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="shimmer" className="h-10 w-10 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="shimmer" className="h-5 w-1/3" />
          <Skeleton variant="shimmer" className="h-4 w-1/2" />
        </div>
        <Skeleton variant="shimmer" className="h-8 w-20" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="border border-ghost-300 bg-white p-3">
      <div className="grid grid-cols-6 gap-4 items-center">
        <Skeleton variant="shimmer" className="h-4 col-span-2" />
        <Skeleton variant="shimmer" className="h-4" />
        <Skeleton variant="shimmer" className="h-4" />
        <Skeleton variant="shimmer" className="h-4" />
        <Skeleton variant="shimmer" className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="border border-ghost-300 bg-white p-6 space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="shimmer" className="h-4 w-24" />
          <Skeleton variant="shimmer" className="h-10 w-full" />
        </div>
      ))}
      <Skeleton variant="shimmer" className="h-10 w-32" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="border border-ghost-300 bg-white p-6 space-y-4">
      <Skeleton variant="shimmer" className="h-6 w-3/4" />
      <Skeleton variant="shimmer" className="h-4 w-full" />
      <Skeleton variant="shimmer" className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="shimmer" className="h-8 w-20" />
        <Skeleton variant="shimmer" className="h-8 w-24" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-ghost-300 bg-white p-4 space-y-2">
          <Skeleton variant="shimmer" className="h-3 w-2/3" />
          <Skeleton variant="shimmer" className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="border border-ghost-300 bg-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-7 w-2/5" />
        <div className="flex gap-2">
          <Skeleton variant="shimmer" className="h-9 w-20" />
          <Skeleton variant="shimmer" className="h-9 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton variant="shimmer" className="h-3 w-20" />
            <Skeleton variant="shimmer" className="h-5 w-full" />
          </div>
        ))}
      </div>
      <Skeleton variant="shimmer" className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-4 w-full" />
        <Skeleton variant="shimmer" className="h-4 w-full" />
        <Skeleton variant="shimmer" className="h-4 w-3/4" />
      </div>
    </div>
  );
}
