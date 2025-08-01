"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'liquid' | 'glitch';
  className?: string;
}

export const PremiumLoader: React.FC<PremiumLoaderProps> = ({
  size = 'md',
  variant = 'spinner',
  className,
}) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  if (variant === 'spinner') {
    return (
      <div className={cn('relative', sizes[size], className)}>
        <div className="absolute inset-0 rounded-full border-2 border-teal-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-400 animate-spin" />
        <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin animation-delay-200" style={{ animationDirection: 'reverse' }} />
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex gap-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-gradient-to-r from-teal-400 to-cyan-400',
              size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3',
              'animate-pulse'
            )}
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'liquid') {
    return (
      <div className={cn('relative', sizes[size], className)}>
        <div className="absolute inset-0 liquid-morph bg-gradient-to-r from-teal-400 to-cyan-400 opacity-80" />
        <div className="absolute inset-2 liquid-morph bg-gradient-to-r from-cyan-400 to-teal-400 animation-delay-1000" />
      </div>
    );
  }

  if (variant === 'glitch') {
    return (
      <div className={cn('relative', className)}>
        <div className="glitch" data-text="LOADING">
          <span className="holographic-text font-bold text-2xl">LOADING</span>
        </div>
      </div>
    );
  }

  return null;
};