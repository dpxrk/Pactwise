"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface LiquidProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'neon';
  showLabel?: boolean;
  className?: string;
}

export const LiquidProgress: React.FC<LiquidProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = true,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };

  const variants = {
    default: 'from-teal-400 to-cyan-400',
    gradient: 'from-teal-400 via-cyan-400 to-purple-400',
    neon: 'from-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(20,184,166,0.5)]',
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'liquid-progress w-full',
          sizes[size],
          variant === 'neon' && 'shadow-[inset_0_0_10px_rgba(20,184,166,0.2)]'
        )}
      >
        <div
          className={cn(
            'liquid-progress-fill bg-gradient-to-r',
            variants[variant],
            'relative overflow-hidden'
          )}
          style={{ width: `${percentage}%` }}
        >
          {/* Liquid wave effect */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255, 255, 255, 0.1) 10px,
                rgba(255, 255, 255, 0.1) 20px
              )`,
              animation: 'slide 1s linear infinite',
            }}
          />
        </div>
      </div>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white mix-blend-difference">
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Add slide animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slide {
    from { transform: translateX(-20px); }
    to { transform: translateX(0); }
  }
`;
document.head.appendChild(style);