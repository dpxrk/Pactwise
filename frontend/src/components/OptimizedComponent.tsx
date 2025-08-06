'use client';

import React, { useEffect, useRef, useState, PropsWithChildren } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Define a type for the performance metric
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
}

// Extend window interface for performance monitoring
declare global {
  interface Window {
    performanceMonitor?: {
      recordMetric: (metric: PerformanceMetric) => void;
    };
  }
}

interface OptimizedComponentProps extends PropsWithChildren {
  // Lazy load the component when it's about to enter viewport
  lazyLoad?: boolean;
  // Root margin for intersection observer (default: 50px)
  rootMargin?: string;
  // Threshold for intersection observer (default: 0.1)
  threshold?: number | number[];
  // Placeholder height while loading
  placeholderHeight?: string | number;
  // Custom loading component
  loader?: React.ReactNode;
  // Whether to keep component mounted after first render
  keepMounted?: boolean;
  // Delay before rendering (useful for staggered animations)
  delay?: number;
  // Priority hint for resource loading
  priority?: 'high' | 'low' | 'auto';
  // Enable performance tracking
  trackPerformance?: boolean;
  componentName?: string;
}

export function OptimizedComponent({
  children,
  lazyLoad = true,
  rootMargin = '50px',
  threshold = 0.1,
  placeholderHeight = 200,
  loader,
  keepMounted = true,
  delay = 0,
  priority = 'auto',
  trackPerformance = false,
  componentName = 'OptimizedComponent',
}: OptimizedComponentProps) {
  const [shouldRender, setShouldRender] = useState(!lazyLoad);
  const [isDelayComplete, setIsDelayComplete] = useState(delay === 0);
  const renderStartTime = useRef<number>(0);

  // Use intersection observer for lazy loading
  const [setRef, isIntersecting] = useIntersectionObserver({
    rootMargin,
    threshold,
    freezeOnceVisible: true,
  });

  // Handle intersection and delay
  useEffect(() => {
    if (isIntersecting && !shouldRender) {
      if (delay > 0) {
        const timer = setTimeout(() => {
          setIsDelayComplete(true);
          setShouldRender(true);
        }, delay);
        return () => clearTimeout(timer);
      } else {
        setShouldRender(true);
      }
    }
  }, [isIntersecting, shouldRender, delay]);

  // Performance tracking
  useEffect(() => {
    if (trackPerformance && shouldRender && !renderStartTime.current) {
      renderStartTime.current = performance.now();
    }
  }, [shouldRender, trackPerformance]);

  useEffect(() => {
    if (trackPerformance && shouldRender && renderStartTime.current) {
      // Use requestIdleCallback to measure after render
      const measurePerformance = () => {
        const renderTime = performance.now() - renderStartTime.current;
        console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
        
        // Report to performance monitoring
        if (window.performanceMonitor) {
          window.performanceMonitor.recordMetric({
            name: 'component.render',
            value: renderTime,
            unit: 'millisecond',
            tags: {
              component: componentName,
              lazyLoaded: String(lazyLoad),
            },
          });
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(measurePerformance);
      } else {
        setTimeout(measurePerformance, 0);
      }
    }
  }, [shouldRender, trackPerformance, componentName, lazyLoad]);

  // Set resource priority hint
  useEffect(() => {
    if (priority !== 'auto') {
      // We'll apply priority hints after component is mounted
      const applyPriority = () => {
        const container = document.querySelector('.optimize-component-container');
        if (container) {
          const images = container.querySelectorAll('img');
          images.forEach((img: HTMLImageElement) => {
            if (priority === 'high') {
              img.loading = 'eager';
              img.fetchPriority = 'high';
            } else {
              img.loading = 'lazy';
              img.fetchPriority = 'low';
            }
          });
        }
      };
      
      if (shouldRender) {
        // Use RAF to ensure DOM is updated
        requestAnimationFrame(applyPriority);
      }
    }
  }, [priority, shouldRender]);

  // Render logic
  if (!shouldRender) {
    return (
      <div
        ref={setRef}
        style={{
          minHeight: placeholderHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="optimize-component-placeholder"
      >
        {loader || (
          <div className="animate-pulse bg-muted rounded-lg w-full h-full" />
        )}
      </div>
    );
  }

  // If keepMounted is false and component has left viewport, unmount it
  if (!keepMounted && !isIntersecting && shouldRender) {
    return (
      <div
        ref={setRef}
        style={{ minHeight: placeholderHeight }}
        className="optimize-component-placeholder"
      />
    );
  }

  return (
    <div ref={setRef} className="optimize-component-container">
      {isDelayComplete ? children : loader}
    </div>
  );
}

// HOC version for class components or existing components
export function withOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<OptimizedComponentProps, 'children'>
) {
  const Optimized = React.forwardRef<unknown, P>((props, ref) => (
    <OptimizedComponent {...options}>
      <Component {...props} ref={ref as React.Ref<unknown>} />
    </OptimizedComponent>
  ));
  Optimized.displayName = `withOptimization(${Component.displayName || Component.name || 'Component'})`;
  return Optimized;
}

// Preload helper for critical components
export function preloadComponent(importFn: () => Promise<unknown>) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Silently fail preload attempts
      });
    });
  }
}

// Batch component loading for better performance
export class ComponentLoader {
  private static queue: Array<() => Promise<unknown>> = [];
  private static isProcessing = false;

  static add(importFn: () => Promise<unknown>) {
    this.queue.push(importFn);
    this.process();
  }

  private static async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    // Process in batches of 3
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 3);
      await Promise.all(batch.map(fn => fn().catch(() => {})));
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessing = false;
  }
}
