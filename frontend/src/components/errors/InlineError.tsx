'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineErrorProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InlineError({ message, action, className }: InlineErrorProps) {
  return (
    <div
      className={cn('flex items-center gap-2 text-sm', className)}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 text-error shrink-0" aria-hidden="true" />
      <span className="text-error">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-purple-900 underline hover:no-underline text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
