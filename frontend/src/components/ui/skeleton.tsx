"use client"

import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "rounded-md relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-ghost-200 animate-pulse",
        shimmer: "bg-gradient-to-r from-ghost-200 via-ghost-300 to-ghost-200 bg-[length:200%_100%] animate-shimmer",
        premium: "bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 bg-[length:200%_100%] animate-shimmer shadow-luxury",
        terminal: "bg-terminal-surface border border-terminal-border animate-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({
  className,
  variant,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
}

// Pre-built skeleton patterns for common use cases
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-6 border border-ghost-300 rounded-lg bg-white", className)}>
      <Skeleton variant="shimmer" className="h-6 w-3/4" />
      <Skeleton variant="shimmer" className="h-4 w-full" />
      <Skeleton variant="shimmer" className="h-4 w-5/6" />
      <div className="flex gap-2 pt-4">
        <Skeleton variant="shimmer" className="h-8 w-20" />
        <Skeleton variant="shimmer" className="h-8 w-24" />
      </div>
    </div>
  )
}

function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton variant="shimmer" className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="shimmer" className="h-16 w-full" />
      ))}
    </div>
  )
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="shimmer"
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonText, skeletonVariants }