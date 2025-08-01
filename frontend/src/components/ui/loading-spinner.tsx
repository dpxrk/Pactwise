'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority";

const spinnerVariants = cva(
  "animate-spin rounded-full border-solid border-t-transparent",
  {
    variants: {
      variant: {
        default: "border-primary",
        secondary: "border-secondary",
        muted: "border-muted-foreground",
        white: "border-white",
      },
      size: {
        sm: "h-4 w-4 border-2",
        default: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-3",
        xl: "h-12 w-12 border-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface LoadingSpinnerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  text?: string;
  showText?: boolean;
}

export function LoadingSpinner({ 
  className, 
  variant, 
  size, 
  text = "Loading...", 
  showText = false,
  ...props 
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2", className)} {...props}>
      <div className={cn(spinnerVariants({ variant, size }))} />
      {showText && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}

// Skeleton loading components
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-6 space-y-4">
        <div className="h-4 bg-muted/50 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-muted/30 rounded"></div>
          <div className="h-3 bg-muted/30 rounded w-5/6"></div>
        </div>
        <div className="h-8 bg-muted/40 rounded w-1/4"></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="bg-muted/30 p-4 border-b border-border/30">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-3 bg-muted/50 rounded"></div>
            ))}
          </div>
        </div>
        
        {/* Rows */}
        <div className="divide-y divide-border/30">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="p-4">
              <div className="grid grid-cols-7 gap-4 items-center">
                {Array.from({ length: 7 }).map((_, colIndex) => (
                  <div key={colIndex} className="h-4 bg-muted/30 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          className="animate-pulse"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-6 space-y-3">
            <div className="h-3 bg-muted/40 rounded w-2/3"></div>
            <div className="h-8 bg-muted/50 rounded w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Pulse loader for inline loading states
export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="w-2 h-2 bg-primary rounded-full animate-pulse"
          style={{ animationDelay: `${index * 200}ms` }}
        />
      ))}
    </div>
  );
}

// Shimmer effect component
export function ShimmerEffect({ className }: { className?: string }) {
  return (
    <div className={cn(
      "relative overflow-hidden bg-muted/30 rounded",
      "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
      "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
      className
    )} />
  );
}