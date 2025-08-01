'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Hook for entrance animations when component mounts
export function useEntranceAnimation(delay = 0) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  return isVisible;
}

// Hook for scroll-triggered animations
export function useScrollReveal(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          // Optionally keep observing for exit animations
          // observer.unobserve(entry.target);
        } else {
          setIsVisible(false);
        }
      },
      { threshold }
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return { elementRef, isVisible };
}

// Hook for staggered animations
export function useStaggeredAnimation(itemCount: number, delayBetweenItems = 50) {
  const [visibleItems, setVisibleItems] = useState(new Set<number>());
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    for (let i = 0; i < itemCount; i++) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, i]));
      }, i * delayBetweenItems);
      
      timers.push(timer);
    }
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [itemCount, delayBetweenItems]);
  
  return (index: number) => visibleItems.has(index);
}

// Hook for hover animations
export function useHoverAnimation() {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  
  return {
    isHovered,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

// Hook for focus animations
export function useFocusAnimation() {
  const [isFocused, setIsFocused] = useState(false);
  
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  
  return {
    isFocused,
    focusProps: {
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}

// Hook for loading state animations
export function useLoadingAnimation(isLoading: boolean, minDuration = 500) {
  const [showLoading, setShowLoading] = useState(isLoading);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      setShowLoading(true);
      setIsTransitioning(true);
    } else {
      // Ensure minimum loading duration for smooth UX
      const timer = setTimeout(() => {
        setShowLoading(false);
        setIsTransitioning(false);
      }, minDuration);
      
      return () => clearTimeout(timer);
    }
    // Add explicit return for the 'if' branch
    return undefined;
  }, [isLoading, minDuration]);
  
  return { showLoading, isTransitioning };
}

// Hook for page transition animations
export function usePageTransition() {
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  
  useEffect(() => {
    // Enter animation
    setIsEntering(true);
    const enterTimer = setTimeout(() => {
      setIsEntering(false);
    }, 100);
    
    return () => clearTimeout(enterTimer);
  }, []);
  
  const exitPage = useCallback((callback?: () => void) => {
    setIsExiting(true);
    setTimeout(() => {
      callback?.();
    }, 300);
  }, []);
  
  return { isExiting, isEntering, exitPage };
}

// Hook for micro-interactions (button press, etc.)
export function useMicroInteraction() {
  const [isActive, setIsActive] = useState(false);
  
  const triggerInteraction = useCallback(() => {
    setIsActive(true);
    setTimeout(() => setIsActive(false), 150);
  }, []);
  
  return { isActive, triggerInteraction };
}

// Hook for card animations
export function useCardAnimation() {
  const { isHovered, hoverProps } = useHoverAnimation();
  const { isVisible, elementRef } = useScrollReveal(0.2);
  
  return {
    elementRef,
    isVisible,
    isHovered,
    hoverProps,
    className: `
      ${isVisible ? 'animate-in fade-in zoom-in-95 duration-500 ease-out' : 'opacity-0'}
      ${isHovered ? 'transform hover:-translate-y-1 hover:shadow-xl' : ''}
      transition-all duration-300 ease-out
    `.trim(),
  };
}

// Hook for navigation item animations
export function useNavItemAnimation(isActive: boolean) {
  const { isHovered, hoverProps } = useHoverAnimation();
  
  return {
    hoverProps,
    className: `
      ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
      ${isHovered && !isActive ? 'bg-accent/50 text-accent-foreground' : ''}
      transition-all duration-200 ease-out
    `.trim(),
  };
}

// Hook for form field animations
export function useFormFieldAnimation(hasError?: boolean, hasValue?: boolean) {
  const { isFocused, focusProps } = useFocusAnimation();
  
  return {
    focusProps,
    className: `
      ${isFocused ? 'ring-2 ring-primary/20 border-primary' : 'border-border'}
      ${hasError ? 'border-destructive ring-destructive/20' : ''}
      ${hasValue ? 'border-success' : ''}
      transition-all duration-200 ease-out
    `.trim(),
  };
}

// Hook for table row animations
export function useTableRowAnimation(index: number) {
  const isVisible = useStaggeredAnimation(1, index * 25);
  const { isHovered, hoverProps } = useHoverAnimation();
  
  return {
    hoverProps,
    className: `
      ${isVisible(0) ? 'animate-in fade-in slide-in-from-left-2 duration-300 ease-out' : 'opacity-0'}
      ${isHovered ? 'bg-muted/50' : ''}
      transition-colors duration-200 ease-out
    `.trim(),
  };
}