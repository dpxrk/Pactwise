"use client";

import React from 'react';

import { useCountAnimation } from '@/hooks/usePremiumEffects';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  format?: (value: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  format,
}) => {
  const count = useCountAnimation(value, duration);
  
  const displayValue = format 
    ? format(count) 
    : count.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span className={cn('tabular-nums font-mono', className)}>
      {prefix}
      <span className="inline-block min-w-[2ch] text-right">
        {displayValue}
      </span>
      {suffix}
    </span>
  );
};