"use client";

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { use3DTilt, useStaggerReveal } from '@/hooks/usePremiumEffects';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'aurora' | 'constellation' | 'holographic';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'default',
  className,
}) => {
  const { ref: tiltRef, transform } = use3DTilt(15);
  const { ref: staggerRef, isVisible, visibleItems } = useStaggerReveal(150);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Constellation effect
  useEffect(() => {
    if (variant !== 'constellation' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 300;

    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      opacity: Math.random(),
    }));

    const connections: Array<[number, number]> = [];
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 80 && Math.random() > 0.8) {
          connections.push([i, j]);
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      connections.forEach(([i, j]) => {
        const star1 = stars[i];
        const star2 = stars[j];
        
        ctx.beginPath();
        ctx.moveTo(star1.x, star1.y);
        ctx.lineTo(star2.x, star2.y);
        ctx.strokeStyle = `rgba(20, 184, 166, ${0.2 * Math.min(star1.opacity, star2.opacity)})`;
        ctx.stroke();
      });

      // Draw stars
      stars.forEach(star => {
        star.opacity = 0.5 + Math.sin(Date.now() * 0.001 + star.x) * 0.5;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(20, 184, 166, ${star.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, [variant]);

  return (
    <div
      ref={staggerRef as React.Ref<HTMLDivElement>}
      className={cn(
        'relative flex flex-col items-center justify-center p-12 text-center',
        className
      )}
    >
      {/* Background effects */}
      {variant === 'aurora' && (
        <div className="aurora absolute inset-0 opacity-30" />
      )}
      
      {variant === 'constellation' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 opacity-50"
          style={{ filter: 'blur(0.5px)' }}
        />
      )}

      {/* Content */}
      <div
        ref={tiltRef as React.Ref<HTMLDivElement>}
        className="relative z-10 card-3d"
        style={{ transform }}
      >
        {/* Icon */}
        {icon && (
          <div
            className={cn(
              'mb-6 mx-auto w-24 h-24 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-teal-500/20 to-cyan-500/20',
              'border border-teal-500/30',
              variant === 'holographic' && 'holographic',
              visibleItems.includes(0) && 'stagger-item'
            )}
          >
            <div className="text-teal-400">
              {icon}
            </div>
          </div>
        )}

        {/* Title */}
        <h3
          className={cn(
            'text-2xl font-bold mb-2',
            variant === 'holographic' ? 'holographic-text' : 'text-gray-200',
            visibleItems.includes(1) && 'stagger-item'
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-gray-500 max-w-md mb-6',
              visibleItems.includes(2) && 'stagger-item'
            )}
          >
            {description}
          </p>
        )}

        {/* Action */}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'btn-premium px-6 py-3 rounded-lg font-medium',
              'transform hover:scale-105 transition-all duration-300',
              visibleItems.includes(3) && 'stagger-item'
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};