'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Building, BarChart3, Search, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PremiumLoader, LiquidProgress } from '@/components/premium';
import { Skeleton } from '@/components/ui/skeleton';

// Loading spinner variants
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'spin' | 'bounce';
  color?: 'primary' | 'secondary' | 'muted';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className
}) => {
  // Map to premium loader variants
  const variantMap = {
    'default': 'spinner',
    'dots': 'dots',
    'pulse': 'liquid',
    'spin': 'spinner',
    'bounce': 'dots'
  } as const;

  return (
    <PremiumLoader
      size={size === 'xl' ? 'lg' : size}
      variant={variantMap[variant] || 'spinner'}
      className={className}
    />
  );
};

// Enhanced loading state with progress
export interface LoadingWithProgressProps {
  progress?: number;
  message?: string;
  subMessage?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
  className?: string;
}

export const LoadingWithProgress: React.FC<LoadingWithProgressProps> = ({
  progress = 0,
  message = 'Loading...',
  subMessage,
  showPercentage = true,
  variant = 'default',
  className
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <LoadingSpinner size="sm" />
        <span className="text-sm text-muted-foreground">{message}</span>
        {showPercentage && progress > 0 && (
          <Badge variant="outline" className="text-xs">
            {Math.round(displayProgress)}%
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className={cn('w-full max-w-md', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <LoadingSpinner />
            <div className="flex-1">
              <p className="font-medium text-sm">{message}</p>
              {subMessage && (
                <p className="text-xs text-muted-foreground mt-1">{subMessage}</p>
              )}
            </div>
            {showPercentage && progress > 0 && (
              <Badge variant="outline">
                {Math.round(displayProgress)}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <LiquidProgress value={displayProgress} variant="gradient" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <LoadingSpinner />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {subMessage && (
            <p className="text-xs text-muted-foreground">{subMessage}</p>
          )}
        </div>
        {showPercentage && progress > 0 && (
          <span className="text-sm text-muted-foreground">
            {Math.round(displayProgress)}%
          </span>
        )}
      </div>
      <LiquidProgress value={displayProgress} />
    </div>
  );
};

// Full page loading state
export interface FullPageLoadingProps {
  message?: string;
  subMessage?: string;
  showLogo?: boolean;
  variant?: 'default' | 'minimal' | 'branded';
  className?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = 'Loading...',
  subMessage,
  showLogo = true,
  variant = 'default',
  className
}) => {
  if (variant === 'minimal') {
    return (
      <div className={cn(
        'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50',
        className
      )}>
        <div className="text-center space-y-4">
          <LoadingSpinner size="xl" />
          <p className="text-lg font-medium">{message}</p>
          {subMessage && (
            <p className="text-sm text-muted-foreground">{subMessage}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'branded') {
    return (
      <div className={cn(
        'fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background to-muted/20 z-50',
        className
      )}>
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center space-y-6">
            {showLogo && (
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <LoadingSpinner size="lg" />
              <p className="text-lg font-medium">{message}</p>
              {subMessage && (
                <p className="text-sm text-muted-foreground">{subMessage}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50',
      className
    )}>
      <div className="text-center space-y-6 p-8">
        {showLogo && (
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
              <FileText className="h-10 w-10 text-primary" />
            </div>
          </div>
        )}
        <div className="space-y-3">
          <LoadingSpinner size="xl" />
          <p className="text-xl font-medium">{message}</p>
          {subMessage && (
            <p className="text-muted-foreground">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Skeleton loading states for specific components
export const ContractTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export const VendorTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full max-w-xs" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

// Contextual loading states
export const ContextualLoading: React.FC<{
  context: 'contracts' | 'vendors' | 'analytics' | 'search' | 'upload' | 'analysis';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ context, message, size = 'md', className }) => {
  const contextConfig = {
    contracts: {
      icon: FileText,
      defaultMessage: 'Loading contracts...',
      color: 'text-blue-600'
    },
    vendors: {
      icon: Building,
      defaultMessage: 'Loading vendors...',
      color: 'text-green-600'
    },
    analytics: {
      icon: BarChart3,
      defaultMessage: 'Generating analytics...',
      color: 'text-purple-600'
    },
    search: {
      icon: Search,
      defaultMessage: 'Searching...',
      color: 'text-orange-600'
    },
    upload: {
      icon: FileText,
      defaultMessage: 'Uploading document...',
      color: 'text-indigo-600'
    },
    analysis: {
      icon: Sparkles,
      defaultMessage: 'Analyzing document...',
      color: 'text-pink-600'
    }
  };

  const config = contextConfig[context];
  const IconComponent = config.icon;

  return (
    <div className={cn(
      'flex items-center gap-3',
      size === 'sm' ? 'py-2' : size === 'lg' ? 'py-6' : 'py-4',
      className
    )}>
      <div className="relative">
        <IconComponent className={cn(
          config.color,
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'
        )} />
        <LoadingSpinner 
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
          className="absolute -top-1 -right-1"
        />
      </div>
      <span className={cn(
        'text-muted-foreground',
        size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
      )}>
        {message || config.defaultMessage}
      </span>
    </div>
  );
};

export default LoadingSpinner;