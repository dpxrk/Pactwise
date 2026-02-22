'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && (
        <div className="mb-4 p-4 bg-ghost-100 border border-ghost-300">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ghost-700 mb-1">{title}</h3>
      <p className="text-sm text-ghost-500 max-w-sm mb-6">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} size="sm">
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
