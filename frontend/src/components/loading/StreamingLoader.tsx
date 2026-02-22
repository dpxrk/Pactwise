'use client';

import { cn } from '@/lib/utils';

interface StreamingLoaderProps {
  label?: string;
  className?: string;
}

export function StreamingLoader({
  label = 'AI is analyzing...',
  className,
}: StreamingLoaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 border border-purple-200 bg-purple-50',
        className
      )}
      role="status"
      aria-label={label}
    >
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-purple-900 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
      <span className="text-sm text-purple-900 font-medium">{label}</span>
    </div>
  );
}
