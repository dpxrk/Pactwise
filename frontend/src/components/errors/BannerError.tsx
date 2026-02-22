'use client';

import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Severity = 'error' | 'warning' | 'info';

interface BannerErrorProps {
  severity?: Severity;
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const severityConfig: Record<Severity, {
  icon: typeof AlertCircle;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
}> = {
  error: {
    icon: AlertCircle,
    bg: 'bg-error-50',
    border: 'border-error/30',
    text: 'text-error-700',
    iconColor: 'text-error',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning-50',
    border: 'border-warning/30',
    text: 'text-warning-700',
    iconColor: 'text-warning',
  },
  info: {
    icon: Info,
    bg: 'bg-purple-50',
    border: 'border-purple-300/30',
    text: 'text-purple-700',
    iconColor: 'text-purple-600',
  },
};

export function BannerError({
  severity = 'error',
  message,
  description,
  action,
  dismissible = false,
  onDismiss,
  className,
}: BannerErrorProps) {
  const [dismissed, setDismissed] = useState(false);
  const config = severityConfig[severity];
  const Icon = config.icon;

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 border',
        config.bg,
        config.border,
        className
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconColor)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', config.text)}>{message}</p>
        {description && (
          <p className="text-sm text-ghost-600 mt-1">{description}</p>
        )}
        {action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className={cn('mt-2 h-7 px-2 text-xs font-medium', config.text)}
          >
            {action.label}
          </Button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={cn('p-1 hover:bg-black/5 shrink-0', config.text)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
