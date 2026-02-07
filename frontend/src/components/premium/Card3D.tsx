"use client";

import React from 'react';

import { use3DTilt, useSpotlight } from '@/hooks/usePremiumEffects';
import { cn } from '@/lib/utils';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'neon' | 'holographic';
  intensity?: number;
  withSpotlight?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className,
  variant = 'glass',
  intensity = 15,
  withSpotlight = true,
}) => {
  const { ref: tiltRef, transform } = use3DTilt(intensity);
  const { ref: spotlightRef, spotlightStyle } = useSpotlight();

  const variants = {
    glass: 'glass-card bg-white',  // Ensure white background
    neon: 'glass-card bg-white border-[#9e829c]/50',
    holographic: 'glass-card bg-white overflow-hidden',
  };

  return (
    <div
      ref={(el) => {
        (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (withSpotlight) {
          (spotlightRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      }}
      className={cn(
        'card-3d relative',
        variants[variant],
        className
      )}
      style={{ transform }}
    >
      {/* Spotlight overlay */}
      {withSpotlight && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={spotlightStyle}
        />
      )}

      {/* Holographic overlay */}
      {variant === 'holographic' && (
        <div className="absolute inset-0 holographic opacity-30 pointer-events-none" />
      )}

      {/* Neon glow lines */}
      {variant === 'neon' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#291528] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9e829c] to-transparent" />
        </>
      )}

      <div className="relative z-10 card-3d-inner">
        {children}
      </div>
    </div>
  );
};