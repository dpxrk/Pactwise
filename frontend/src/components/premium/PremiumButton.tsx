"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useRipple, useMagnetic, useSoundEffects } from '@/hooks/usePremiumEffects';

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'holographic';
  size?: 'sm' | 'md' | 'lg';
  withSound?: boolean;
  magneticStrength?: number;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  withSound = true,
  magneticStrength = 0.3,
  onClick,
  ...props
}) => {
  const { ripples, createRipple } = useRipple();
  const { ref: magneticRef, position } = useMagnetic(magneticStrength);
  const { playSound } = useSoundEffects();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    if (withSound) playSound('click');
    onClick?.(e);
  };

  const variants = {
    primary: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow hover:shadow-glow-lg',
    secondary: 'glass border border-white/10 text-white hover:bg-white/10',
    ghost: 'hover:bg-white/5 text-gray-400 hover:text-white',
    holographic: 'holographic text-white font-bold',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      ref={magneticRef as React.Ref<HTMLButtonElement>}
      className={cn(
        'relative overflow-hidden rounded-lg font-medium transition-all duration-300',
        'transform-gpu will-change-transform',
        variants[variant],
        sizes[size],
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onClick={handleClick}
      onMouseEnter={() => withSound && playSound('hover')}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple-effect"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            marginLeft: -10,
            marginTop: -10,
          }}
        />
      ))}
      
      {/* Shimmer effect for primary variant */}
      {variant === 'primary' && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}
    </button>
  );
};