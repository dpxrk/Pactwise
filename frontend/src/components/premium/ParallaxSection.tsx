'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';

interface ParallaxLayerProps {
  children: React.ReactNode;
  speed?: number;
  offset?: number;
  className?: string;
  type?: 'vertical' | 'horizontal' | 'rotate' | 'scale' | 'opacity';
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  speed = 0.5,
  offset = 0,
  className = '',
  type = 'vertical',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };

  // Call all hooks at the top level (React rules of hooks)
  const horizontalTransform = useTransform(scrollYProgress, [0, 1], [-100 * speed + offset, 100 * speed + offset]);
  const horizontalSpring = useSpring(horizontalTransform, springConfig);

  const rotateTransform = useTransform(scrollYProgress, [0, 1], [-180 * speed + offset, 180 * speed + offset]);
  const rotateSpring = useSpring(rotateTransform, springConfig);

  const scaleTransform = useTransform(scrollYProgress, [0, 1], [1 - speed * 0.5, 1 + speed * 0.5]);
  const scaleSpring = useSpring(scaleTransform, springConfig);

  const opacityTransform = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const opacitySpring = useSpring(opacityTransform, springConfig);

  const verticalTransform = useTransform(scrollYProgress, [0, 1], [-100 * speed + offset, 100 * speed + offset]);
  const verticalSpring = useSpring(verticalTransform, springConfig);

  // Select the appropriate transform and style based on type
  const getStyle = () => {
    switch (type) {
      case 'horizontal':
        return { x: horizontalSpring };
      case 'rotate':
        return { rotate: rotateSpring };
      case 'scale':
        return { scale: scaleSpring };
      case 'opacity':
        return { opacity: opacitySpring };
      default:
        return { y: verticalSpring };
    }
  };

  return (
    <motion.div ref={ref} style={getStyle()} className={className}>
      {children}
    </motion.div>
  );
};

interface MultiLayerParallaxProps {
  children: React.ReactNode;
  className?: string;
  layers?: Array<{
    speed: number;
    children: React.ReactNode;
    className?: string;
  }>;
}

export const MultiLayerParallax: React.FC<MultiLayerParallaxProps> = ({
  children,
  className = '',
  layers = [],
}) => {
  return (
    <div className={`relative ${className}`}>
      {layers.map((layer, index) => (
        <ParallaxLayer
          key={index}
          speed={layer.speed}
          className={`absolute inset-0 ${layer.className || ''}`}
        >
          {layer.children}
        </ParallaxLayer>
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

interface MouseParallaxProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  inverted?: boolean;
}

export const MouseParallax: React.FC<MouseParallaxProps> = ({
  children,
  className = '',
  strength = 20,
  inverted = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const springConfig = { stiffness: 150, damping: 20 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current || !isHovered) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceX = (e.clientX - centerX) / rect.width;
      const distanceY = (e.clientY - centerY) / rect.height;

      const moveX = distanceX * strength * (inverted ? -1 : 1);
      const moveY = distanceY * strength * (inverted ? -1 : 1);

      x.set(moveX);
      y.set(moveY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovered, strength, inverted, x, y]);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
    >
      {children}
    </motion.div>
  );
};

interface StickyParallaxProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export const StickyParallax: React.FC<StickyParallaxProps> = ({
  children,
  className = '',
  threshold = 0.5,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, threshold, 1], [1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, threshold, 1], [1, 1, 0.8]);
  const y = useTransform(scrollYProgress, [0, threshold, 1], [0, 0, -100]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, scale, y }}
      className={`sticky top-0 ${className}`}
    >
      {children}
    </motion.div>
  );
};

interface ParallaxTextProps {
  text: string;
  className?: string;
  speed?: number;
  direction?: 'left' | 'right';
}

export const ParallaxText: React.FC<ParallaxTextProps> = ({
  text,
  className = '',
  speed = 1,
  direction = 'left',
}) => {
  const baseVelocity = direction === 'left' ? -speed : speed;
  const { scrollY } = useScroll();
  const scrollVelocity = useSpring(scrollY, { stiffness: 100, damping: 30 });
  
  const velocityFactor = useTransform(scrollVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  const x = useTransform(velocityFactor, (v) => `${v * baseVelocity}%`);

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div className="flex" style={{ x }}>
        <span className="block mr-8">{text}</span>
        <span className="block mr-8">{text}</span>
        <span className="block mr-8">{text}</span>
        <span className="block">{text}</span>
      </motion.div>
    </div>
  );
};

interface DepthCardProps {
  children: React.ReactNode;
  className?: string;
  depth?: number;
}

export const DepthCard: React.FC<DepthCardProps> = ({
  children,
  className = '',
  depth = 3,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setRotateX((y - 0.5) * 20);
    setRotateY((x - 0.5) * -20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={ref}
      className={`relative preserve-3d ${className}`}
      style={{ perspective: '1000px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
        {Array.from({ length: depth }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-gray-900/5 border border-gray-300"
            style={{
              transform: `translateZ(-${(i + 1) * 10}px)`,
              opacity: 1 - (i + 1) * 0.3,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};