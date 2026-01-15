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
  const renderStartTime = useRef<number | undefined>(undefined);
  
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

/**
 * Web Vitals monitoring
 */
export interface PerformanceMetrics {
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
  TTFB?: number;
  INP?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    this.observePaintTiming();
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeTTFB();
  }

  private observePaintTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.FCP = Math.round(entry.startTime);
              this.notifyObservers();
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (_e) {
        console.debug('Paint timing observer not supported');
      }
    }
  }

  private observeLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.LCP = Math.round(lastEntry.startTime);
          this.notifyObservers();
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (_e) {
        console.debug('LCP observer not supported');
      }
    }
  }

  private observeFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ('processingStart' in entry) {
              const firstInputDelay = (entry as any).processingStart - entry.startTime;
              this.metrics.FID = Math.round(firstInputDelay);
              this.notifyObservers();
              observer.disconnect();
            }
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (_e) {
        console.debug('FID observer not supported');
      }
    }
  }

  private observeCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries: PerformanceEntry[] = [];

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

              if (
                sessionValue &&
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000
              ) {
                sessionValue += (entry as any).value;
                sessionEntries.push(entry);
              } else {
                sessionValue = (entry as any).value;
                sessionEntries = [entry];
              }

              if (sessionValue > clsValue) {
                clsValue = sessionValue;
                this.metrics.CLS = Math.round(clsValue * 1000) / 1000;
                this.notifyObservers();
              }
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (_e) {
        console.debug('CLS observer not supported');
      }
    }
  }

  private observeTTFB() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const navigation = navigationEntries[0];
        this.metrics.TTFB = Math.round(navigation.responseStart - navigation.requestStart);
        this.notifyObservers();
      }
    }
  }

  private notifyObservers() {
    this.observers.forEach((callback) => callback(this.metrics));
  }

  public subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.add(callback);
    if (Object.keys(this.metrics).length > 0) {
      callback(this.metrics);
    }
    return () => this.observers.delete(callback);
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null;