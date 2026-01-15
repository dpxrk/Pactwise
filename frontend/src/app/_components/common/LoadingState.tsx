'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { LoadingSpinner } from './LoadingSpinner';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className
}) => {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <LoadingSpinner size="lg" text={message} />
    </div>
  );
};

interface CardGridLoadingStateProps {
  count?: number;
  className?: string;
}

export const CardGridLoadingState: React.FC<CardGridLoadingStateProps> = ({
  count = 6,
  className
}) => {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border rounded-lg p-6 animate-pulse"
        >
          <div className="h-4 bg-muted rounded w-3/4 mb-4" />
          <div className="h-3 bg-muted rounded w-1/2 mb-2" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );
};
