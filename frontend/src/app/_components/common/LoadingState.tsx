"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  variant?: 'inline' | 'full' | 'card' | 'skeleton';
  className?: string;
  rows?: number;
}

export function LoadingState({
  message = "Loading...",
  variant = 'inline',
  className,
  rows = 3,
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const loadingContent = (
    <div className="flex items-center justify-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );

  if (variant === 'full') {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px] p-8", className)}>
        {loadingContent}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          {loadingContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("py-8", className)}>
      {loadingContent}
    </div>
  );
}

// Specific loading state components
export function TableLoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" /> {/* Header */}
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function CardGridLoadingState({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FormLoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
      ))}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" /> {/* Button */}
        <Skeleton className="h-10 w-24" /> {/* Button */}
      </div>
    </div>
  );
}

export function DetailPageLoadingState() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      </Card>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}