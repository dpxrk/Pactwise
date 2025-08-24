'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  perspective?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 15,
  scale = 1.05,
  perspective = 1000,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]));
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]));

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{ scale: isHovered ? scale : 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  strength = 0.3,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useSpring(0, { stiffness: 150, damping: 20 });
  const y = useSpring(0, { stiffness: 150, damping: 20 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = (event.clientX - centerX) * strength;
    const distanceY = (event.clientY - centerY) * strength;

    x.set(distanceX);
    y.set(distanceY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
    >
      {children}
    </motion.div>
  );
};

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowOpacity?: number;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(0, 0, 0, 0.1)',
  glowOpacity = 0.6,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMousePosition({ x, y });
  };

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: glowOpacity }}
          exit={{ opacity: 0 }}
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent 40%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
}

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  className = '',
  shimmerColor = 'rgba(255, 255, 255, 0.1)',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isHovered && (
        <motion.div
          className="absolute inset-0 -top-2"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 0.5 }}
          style={{
            background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
          }}
        />
      )}
      {children}
    </motion.button>
  );
};

interface BorderTrailProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  borderColor?: string;
}

export const BorderTrail: React.FC<BorderTrailProps> = ({
  children,
  className = '',
  duration = 3,
  borderColor = '#111827',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <motion.div
            className="absolute top-0 left-0 h-[2px]"
            initial={{ width: 0, backgroundColor: borderColor }}
            animate={{ width: '100%' }}
            transition={{ duration: duration / 4 }}
          />
          <motion.div
            className="absolute top-0 right-0 w-[2px]"
            initial={{ height: 0, backgroundColor: borderColor }}
            animate={{ height: '100%' }}
            transition={{ duration: duration / 4, delay: duration / 4 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-[2px]"
            initial={{ width: 0, backgroundColor: borderColor }}
            animate={{ width: '100%' }}
            transition={{ duration: duration / 4, delay: duration / 2 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[2px]"
            initial={{ height: 0, backgroundColor: borderColor }}
            animate={{ height: '100%' }}
            transition={{ duration: duration / 4, delay: (duration * 3) / 4 }}
          />
        </>
      )}
      {children}
    </div>
  );
};