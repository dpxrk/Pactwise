/**
 * Performance optimization utilities for React components
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
  };
}

/**
 * Debounced value hook
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Optimistic update hook
 */
export function useOptimisticUpdate<T>(
  initialValue: T,
  updateFn: (newValue: T) => Promise<void>
) {
  const [value, setValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousValue = useRef(initialValue);
  
  const optimisticUpdate = useCallback(async (newValue: T) => {
    previousValue.current = value;
    setValue(newValue);
    setIsUpdating(true);
    setError(null);
    
    try {
      await updateFn(newValue);
    } catch (err) {
      // Rollback on error
      setValue(previousValue.current);
      setError(err as Error);
    } finally {
      setIsUpdating(false);
    }
  }, [value, updateFn]);
  
  return {
    value,
    optimisticUpdate,
    isUpdating,
    error,
  };
}

/**
 * Lazy load hook with intersection observer
 */
export function useLazyLoad(options?: IntersectionObserverInit) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    ...options,
  });
  
  return { ref, isVisible: inView };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderStartTime = useRef<number | undefined>();
  
  useEffect(() => {
    renderCount.current += 1;
    
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      
      if (renderTime > 16.67) { // More than one frame (60fps)
        console.warn(
          `[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
        );
      }
    }
    
    renderStartTime.current = performance.now();
  });
  
  return {
    renderCount: renderCount.current,
  };
}

/**
 * Memoization helpers
 */
export const memoizeOne = <T extends (...args: unknown[]) => unknown>(fn: T): T => {
  let lastArgs: unknown[] | undefined;
  let lastResult: unknown;
  
  return ((...args: unknown[]) => {
    if (!lastArgs || args.some((arg, i) => arg !== lastArgs![i])) {
      lastArgs = args;
      lastResult = fn(...args);
    }
    return lastResult;
  }) as T;
};

/**
 * Image optimization hook
 */
export function useOptimizedImage(src: string, options?: {
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);
  
  const handleError = useCallback((e: Error) => {
    setError(e);
  }, []);
  
  return {
    src,
    isLoaded,
    error,
    onLoad: handleLoad,
    onError: handleError,
    ...options,
  };
}

/**
 * Code splitting helper
 */
export const lazyWithRetry = <T extends React.ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => {
  return React.lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
};