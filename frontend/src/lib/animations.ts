// Animation utilities and configurations for modern UI interactions

import * as React from 'react';

export const animations = {
  // Duration constants
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Easing functions
  easing: {
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Scale animations
  scale: {
    enter: 'animate-in zoom-in-95 duration-200 ease-out',
    exit: 'animate-out zoom-out-95 duration-150 ease-in',
    hover: 'hover:scale-105 transition-transform duration-200 ease-out',
    tap: 'active:scale-95 transition-transform duration-75 ease-out',
  },
  
  // Slide animations
  slide: {
    up: 'animate-in slide-in-from-bottom-3 duration-300 ease-out',
    down: 'animate-in slide-in-from-top-3 duration-300 ease-out',
    left: 'animate-in slide-in-from-right-3 duration-300 ease-out',
    right: 'animate-in slide-in-from-left-3 duration-300 ease-out',
    exitUp: 'animate-out slide-out-to-top-3 duration-200 ease-in',
    exitDown: 'animate-out slide-out-to-bottom-3 duration-200 ease-in',
    exitLeft: 'animate-out slide-out-to-left-3 duration-200 ease-in',
    exitRight: 'animate-out slide-out-to-right-3 duration-200 ease-in',
  },
  
  // Fade animations
  fade: {
    in: 'animate-in fade-in duration-300 ease-out',
    out: 'animate-out fade-out duration-200 ease-in',
    inUp: 'animate-in fade-in slide-in-from-bottom-3 duration-400 ease-out',
    inDown: 'animate-in fade-in slide-in-from-top-3 duration-400 ease-out',
  },
  
  // Loading animations
  loading: {
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    ping: 'animate-ping',
  },
  
  // Hover effects
  hover: {
    lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200 ease-out',
    glow: 'hover:shadow-glow transition-shadow duration-300 ease-out',
    scale: 'hover:scale-105 transition-transform duration-200 ease-out',
    brightness: 'hover:brightness-110 transition-all duration-200 ease-out',
  },
  
  // Stagger animations for lists
  stagger: {
    container: 'space-y-2',
    item: (index: number) => ({
      style: {
        animationDelay: `${index * 50}ms`,
      },
      className: 'animate-in fade-in slide-in-from-left-3 duration-400 ease-out',
    }),
  },
  
  // Page transitions
  page: {
    enter: 'animate-in fade-in slide-in-from-right-4 duration-400 ease-out',
    exit: 'animate-out fade-out slide-out-to-left-4 duration-300 ease-in',
  },
  
  // Card animations
  card: {
    hover: 'hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ease-out',
    tap: 'active:scale-98 transition-transform duration-75 ease-out',
    entry: 'animate-in fade-in zoom-in-95 duration-400 ease-out',
  },
  
  // Button animations
  button: {
    primary: 'hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out',
    secondary: 'hover:bg-accent hover:shadow-md transition-all duration-200 ease-out',
    ghost: 'hover:bg-accent/80 transition-colors duration-200 ease-out',
  },
  
  // Navigation animations
  nav: {
    item: 'hover:bg-accent/50 active:bg-accent/70 transition-colors duration-200 ease-out',
    expand: 'transition-all duration-300 ease-out overflow-hidden',
    chevron: 'transition-transform duration-200 ease-out',
  },
};

// Animation classes for specific components
export const animationClasses = {
  // Dashboard animations
  dashboard: {
    container: 'animate-in fade-in duration-500 ease-out',
    section: 'animate-in fade-in slide-in-from-bottom-4 duration-600 ease-out',
    card: 'animate-in fade-in zoom-in-95 duration-400 ease-out group',
  },
  
  // Modal animations
  modal: {
    overlay: 'animate-in fade-in duration-300 ease-out',
    content: 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-400 ease-out',
    exit: 'animate-out fade-out zoom-out-95 slide-out-to-bottom-4 duration-300 ease-in',
  },
  
  // Table animations
  table: {
    row: 'hover:bg-muted/50 transition-colors duration-200 ease-out',
    cell: 'transition-all duration-200 ease-out',
  },
  
  // Form animations
  form: {
    field: 'focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 ease-out',
    error: 'animate-in slide-in-from-top-1 duration-200 ease-out text-destructive',
    success: 'animate-in slide-in-from-top-1 duration-200 ease-out text-green-600',
  },
};

// Custom animation keyframes (to be added to tailwind.config.js)
export const customKeyframes = {
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'fade-out': {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  'zoom-in-95': {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  'zoom-out-95': {
    '0%': { opacity: '1', transform: 'scale(1)' },
    '100%': { opacity: '0', transform: 'scale(0.95)' },
  },
  'slide-in-from-bottom-3': {
    '0%': { transform: 'translateY(12px)' },
    '100%': { transform: 'translateY(0)' },
  },
  'slide-in-from-top-3': {
    '0%': { transform: 'translateY(-12px)' },
    '100%': { transform: 'translateY(0)' },
  },
  'slide-in-from-left-3': {
    '0%': { transform: 'translateX(-12px)' },
    '100%': { transform: 'translateX(0)' },
  },
  'slide-in-from-right-3': {
    '0%': { transform: 'translateX(12px)' },
    '100%': { transform: 'translateX(0)' },
  },
  'glow': {
    '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
    '50%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' },
  },
};

// Intersection Observer hook for scroll-triggered animations
export function useScrollAnimation() {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return { elementRef, isVisible };
}