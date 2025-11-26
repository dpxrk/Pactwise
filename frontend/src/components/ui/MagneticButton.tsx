"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  magnetStrength?: number;
  magnetRadius?: number;
  glowColor?: string;
  disabled?: boolean;
}

/**
 * MagneticButton - A button that attracts toward the cursor
 *
 * Features:
 * - Magnetic pull toward cursor within radius
 * - Glow intensifies on approach
 * - Particle burst on click
 * - Smooth spring animations
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  onClick,
  magnetStrength = 0.4,
  magnetRadius = 150,
  glowColor = 'rgba(158, 130, 156, 0.5)', // Mountbatten pink
  disabled = false,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number }>>([]);

  // Motion values for magnetic effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring configs for smooth movement
  const springConfig = { damping: 15, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Glow intensity based on proximity
  const glowIntensity = useMotionValue(0);
  const springGlow = useSpring(glowIntensity, { damping: 20, stiffness: 100 });

  // Transform glow to box shadow
  const boxShadow = useTransform(
    springGlow,
    [0, 1],
    [`0 0 0px ${glowColor}`, `0 0 30px ${glowColor}, 0 0 60px ${glowColor}`]
  );

  // Handle mouse move for magnetic effect
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!buttonRef.current || disabled) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (distance < magnetRadius) {
        // Within magnetic field
        const strength = (1 - distance / magnetRadius) * magnetStrength;
        x.set(distX * strength);
        y.set(distY * strength);
        glowIntensity.set(1 - distance / magnetRadius);
      } else {
        // Outside magnetic field
        x.set(0);
        y.set(0);
        glowIntensity.set(0);
      }
    },
    [magnetRadius, magnetStrength, x, y, glowIntensity, disabled]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    glowIntensity.set(0);
    setIsHovered(false);
  }, [x, y, glowIntensity]);

  // Create particle burst on click
  const createParticleBurst = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: rect.width / 2,
      y: rect.height / 2,
      angle: (i / 12) * 360,
    }));

    setParticles(newParticles);
    setIsClicked(true);

    // Clear particles after animation
    setTimeout(() => {
      setParticles([]);
      setIsClicked(false);
    }, 600);
  }, []);

  // Handle click
  const handleClick = useCallback(() => {
    if (disabled) return;
    createParticleBurst();
    onClick?.();
  }, [onClick, createParticleBurst, disabled]);

  // Set up global mouse tracking
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <motion.button
      ref={buttonRef}
      className={`relative overflow-visible ${className}`}
      style={{
        x: springX,
        y: springY,
        boxShadow,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.95 }}
      disabled={disabled}
    >
      {/* Inner content with scale effect */}
      <motion.span
        className="relative z-10 block"
        animate={{
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>

      {/* Particle burst effect */}
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute w-2 h-2 rounded-full bg-purple-400 pointer-events-none"
          initial={{
            x: particle.x - 4,
            y: particle.y - 4,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: particle.x + Math.cos((particle.angle * Math.PI) / 180) * 60 - 4,
            y: particle.y + Math.sin((particle.angle * Math.PI) / 180) * 60 - 4,
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 0.6,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Ripple effect on click */}
      {isClicked && (
        <motion.span
          className="absolute inset-0 rounded-full bg-white/20 pointer-events-none"
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );
};

export default MagneticButton;
