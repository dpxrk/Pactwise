'use client';

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FallbackErrorAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface FallbackErrorProps {
  message?: string;
  description?: string;
  technicalDetails?: string;
  actions?: FallbackErrorAction[];
  className?: string;
}

export function FallbackError({
  message = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again or contact support if the issue persists.',
  technicalDetails,
  actions,
  className,
}: FallbackErrorProps) {
  const defaultActions: FallbackErrorAction[] = actions || [
    {
      label: 'Reload page',
      onClick: () => window.location.reload(),
      primary: true,
    },
    {
      label: 'Go back',
      onClick: () => window.history.back(),
    },
  ];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
      role="alert"
    >
      <div className="p-4 bg-error-50 border border-error/20 mb-6">
        <AlertTriangle className="h-8 w-8 text-error" aria-hidden="true" />
      </div>

      <h2 className="text-lg font-semibold text-ghost-700 mb-2">{message}</h2>
      <p className="text-sm text-ghost-500 max-w-md mb-6">{description}</p>

      {technicalDetails && process.env.NODE_ENV === 'development' && (
        <details className="mb-6 w-full max-w-md text-left">
          <summary className="text-xs font-medium text-ghost-500 cursor-pointer hover:text-ghost-700">
            Technical details
          </summary>
          <pre className="mt-2 p-3 bg-ghost-100 border border-ghost-300 text-xs font-mono text-ghost-700 overflow-auto max-h-32">
            {technicalDetails}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-3">
        {defaultActions.map((action, i) => (
          <Button
            key={i}
            variant={action.primary ? 'default' : 'outline'}
            size="sm"
            onClick={action.onClick}
          >
            {action.primary && <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />}
            {!action.primary && i === defaultActions.length - 1 && (
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
