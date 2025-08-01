"use client";

import React from 'react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { Card, CardContent } from '@/components/ui/card';
import { FileX, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataStateWrapperProps<T> {
  data: T | null | undefined;
  loading: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  loadingVariant?: 'inline' | 'full' | 'card' | 'skeleton';
  errorVariant?: 'inline' | 'full' | 'card';
  children: (data: NonNullable<T>) => React.ReactNode;
}

export function DataStateWrapper<T>({
  data,
  loading,
  error,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  emptyMessage = "No data found",
  emptyIcon,
  emptyAction,
  loadingVariant = 'inline',
  errorVariant = 'inline',
  children,
}: DataStateWrapperProps<T>) {
  // Loading state
  if (loading) {
    return loadingComponent || <LoadingState variant={loadingVariant} />;
  }

  // Error state
  if (error) {
    return errorComponent || (
      <ErrorState 
        error={error} 
        onRetry={onRetry} 
        variant={errorVariant} 
      />
    );
  }

  // Empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }

    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          {emptyIcon || <FileX className="h-12 w-12 text-muted-foreground mb-4" />}
          <p className="text-muted-foreground text-center mb-4">{emptyMessage}</p>
          {emptyAction && (
            <Button onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Data state
  return <>{children(data as NonNullable<T>)}</>;
}

// Specialized wrappers for common patterns
interface ListDataWrapperProps<T> {
  items: T[] | undefined;
  loading: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function ListDataWrapper<T>({
  items,
  loading,
  error,
  onRetry,
  emptyMessage = "No items found",
  emptyAction,
  renderItem,
  className,
}: ListDataWrapperProps<T>) {
  return (
    <DataStateWrapper
      data={items}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyMessage={emptyMessage}
      emptyAction={emptyAction}
      loadingVariant="skeleton"
    >
      {(data) => (
        <div className={className}>
          {data.map((item, index) => renderItem(item, index))}
        </div>
      )}
    </DataStateWrapper>
  );
}

interface GridDataWrapperProps<T> {
  items: T[] | undefined;
  loading: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function GridDataWrapper<T>({
  items,
  loading,
  error,
  onRetry,
  emptyMessage = "No items found",
  emptyAction,
  renderItem,
  columns = { default: 1, md: 2, lg: 3 },
}: GridDataWrapperProps<T>) {
  const gridClasses = `grid gap-4 ${
    columns.default ? `grid-cols-${columns.default}` : 'grid-cols-1'
  } ${columns.sm ? `sm:grid-cols-${columns.sm}` : ''} ${
    columns.md ? `md:grid-cols-${columns.md}` : ''
  } ${columns.lg ? `lg:grid-cols-${columns.lg}` : ''} ${
    columns.xl ? `xl:grid-cols-${columns.xl}` : ''
  }`;

  return (
    <DataStateWrapper
      data={items}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyMessage={emptyMessage}
      emptyAction={emptyAction}
      loadingComponent={
        <div className={gridClasses}>
          {Array.from({ length: columns.lg || 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    >
      {(data) => (
        <div className={gridClasses}>
          {data.map((item, index) => renderItem(item, index))}
        </div>
      )}
    </DataStateWrapper>
  );
}