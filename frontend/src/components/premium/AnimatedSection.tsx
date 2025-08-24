'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  parallax?: boolean;
  parallaxOffset?: number;
  stagger?: boolean;
  staggerDelay?: number;
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.8,
  direction = 'up',
  parallax = false,
  parallaxOffset = 50,
  stagger = false,
  staggerDelay = 0.1,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  
  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], parallax ? [parallaxOffset, -parallaxOffset] : [0, 0]),
    springConfig
  );

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: 40, x: 0 };
      case 'down': return { y: -40, x: 0 };
      case 'left': return { y: 0, x: 40 };
      case 'right': return { y: 0, x: -40 };
      default: return { y: 40, x: 0 };
    }
  };

  const initialPos = getInitialPosition();

  return (
    <motion.div
      ref={ref}
      style={parallax ? { y } : {}}
      initial={{ opacity: 0, ...initialPos }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {stagger && React.Children.count(children) > 1 ? (
        React.Children.map(children, (child, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.5,
              delay: delay + index * staggerDelay,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {child}
          </motion.div>
        ))
      ) : (
        children
      )}
    </motion.div>
  );
};

export const FadeInWhenVisible: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}> = ({ children, delay = 0, duration = 0.6, className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const ScaleInWhenVisible: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}> = ({ children, delay = 0, duration = 0.6, className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const TextReveal: React.FC<{
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}> = ({ text, className = '', delay = 0, staggerDelay = 0.03 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.span ref={ref} className={className}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.5,
            delay: delay + index * staggerDelay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

export const ParallaxText: React.FC<{
  children: React.ReactNode;
  baseVelocity?: number;
  className?: string;
}> = ({ children, baseVelocity = 100, className = '' }) => {
  const baseX = useSpring(0, { stiffness: 100, damping: 30 });
  const { scrollY } = useScroll();
  const scrollVelocity = useSpring(scrollY, { stiffness: 100, damping: 30 });
  const velocityFactor = useTransform(scrollVelocity, [0, 1000], [0, 5], { clamp: false });
  
  const x = useTransform(baseX, (v) => `${v}%`);

  React.useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const timeDelta = currentTime - lastTime;
      lastTime = currentTime;

      const velocity = velocityFactor.get() * baseVelocity;
      const currentX = baseX.get();
      
      let newX = currentX + velocity * (timeDelta / 1000);
      
      if (newX < -100) newX += 200;
      if (newX > 100) newX -= 200;
      
      baseX.set(newX);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [baseX, baseVelocity, velocityFactor]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div style={{ x }} className="flex whitespace-nowrap">
        {children}
        {children}
      </motion.div>
    </div>
  );
};