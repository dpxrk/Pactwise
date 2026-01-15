"use client";

import { Loader2, FileSearch, Database, Brain, Shield, TrendingUp } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

export type LoadingVariant = "spinner" | "dots" | "pulse" | "skeleton" | "page";
export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LoadingProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  text?: string;
  className?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  icon?: React.ReactNode;
}

const sizeClasses: Record<LoadingSize, string> = {
  xs: "w-4 h-4",
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const textSizeClasses: Record<LoadingSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export const UnifiedLoading: React.FC<LoadingProps> = ({
  variant = "spinner",
  size = "md",
  text,
  className,
  fullScreen = false,
  overlay = false,
  icon,
}) => {
  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-4",
    {
      "fixed inset-0 z-50 bg-white/80 backdrop-blur-sm": fullScreen,
      "absolute inset-0 z-40 bg-white/60 backdrop-blur-sm": overlay && !fullScreen,
    },
    className
  );

  const renderLoader = () => {
    switch (variant) {
      case "spinner":
        return (
          <Loader2 
            className={cn(
              "animate-spin text-gray-600",
              sizeClasses[size]
            )}
          />
        );
      
      case "dots":
        return (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full bg-gray-600 animate-pulse",
                  size === "xs" && "w-1 h-1",
                  size === "sm" && "w-1.5 h-1.5",
                  size === "md" && "w-2 h-2",
                  size === "lg" && "w-3 h-3",
                  size === "xl" && "w-4 h-4"
                )}
                style={{
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        );
      
      case "pulse":
        return (
          <div className={cn(
            "rounded-full bg-gray-200 animate-pulse",
            sizeClasses[size]
          )} />
        );
      
      case "skeleton":
        return (
          <div className="w-full max-w-md space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        );
      
      case "page":
        return (
          <div className="space-y-8">
            {icon || <Loader2 className={cn("animate-spin text-gray-600", sizeClasses[size])} />}
            {text && (
              <div className="text-center space-y-2">
                <p className={cn("font-medium text-gray-900", textSizeClasses[size])}>
                  {text}
                </p>
                <p className="text-sm text-gray-500">Please wait...</p>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={containerClasses}>
      {renderLoader()}
      {text && variant !== "page" && (
        <p className={cn("text-gray-600", textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showTitle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  lines = 3,
  showAvatar = false,
  showTitle = false,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {showAvatar && (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
          </div>
        </div>
      )}
      {showTitle && (
        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded animate-pulse"
            style={{
              width: `${100 - (i === lines - 1 ? 25 : 0)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-gray-200 rounded animate-pulse"
                style={{ width: `${100 / columns}%` }}
              />
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="p-4">
              <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ 
                      width: `${colIndex === 0 ? 30 : 100 / columns}%`,
                      animationDelay: `${(rowIndex + colIndex) * 50}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface CardSkeletonProps {
  className?: string;
  showImage?: boolean;
  showActions?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className,
  showImage = false,
  showActions = false,
}) => {
  return (
    <div className={cn("border border-gray-200 rounded-lg p-6", className)}>
      {showImage && (
        <div className="h-48 bg-gray-200 rounded-lg animate-pulse mb-4" />
      )}
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        </div>
        {showActions && (
          <div className="flex gap-2 pt-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
            <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
          </div>
        )}
      </div>
    </div>
  );
};

export const PageLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  const icons = [FileSearch, Database, Brain, Shield, TrendingUp];
  const RandomIcon = icons[Math.floor(Math.random() * icons.length)];
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full animate-ping opacity-20" />
          </div>
          <div className="relative flex items-center justify-center">
            <RandomIcon className="w-12 h-12 text-gray-600 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">{message}</h2>
          <p className="text-sm text-gray-500">This won&apos;t take long...</p>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLoading;