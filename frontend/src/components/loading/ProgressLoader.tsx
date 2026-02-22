'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface ProgressLoaderProps {
  value: number;
  label?: string;
  description?: string;
  cancelable?: boolean;
  onCancel?: () => void;
  className?: string;
}

export function ProgressLoader({
  value,
  label,
  description,
  cancelable = false,
  onCancel,
  className,
}: ProgressLoaderProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn('space-y-2', className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Loading progress'}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-sm font-medium text-ghost-700 truncate">{label}</p>
          )}
          {description && (
            <p className="text-xs text-ghost-500 truncate">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-xs font-mono text-ghost-500">
            {Math.round(clampedValue)}%
          </span>
          {cancelable && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-6 w-6 p-0"
              aria-label="Cancel"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <Progress value={clampedValue} className="h-2" />
    </div>
  );
}
