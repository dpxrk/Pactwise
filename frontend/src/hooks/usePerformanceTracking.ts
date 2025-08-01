import { useCallback } from 'react';
import { performanceMonitor } from '@/lib/performance-monitoring';

export function usePerformanceTracking() {
  const trackInteraction = useCallback((
    interactionType: string,
    target: string,
    callback: () => void | Promise<void>
  ) => {
    return async () => {
      const measure = performanceMonitor.measureInteraction(interactionType, target);
      
      try {
        await callback();
      } finally {
        measure.end();
      }
    };
  }, []);

  const trackOperation = useCallback(async <T,>(
    operationName: string,
    operation: () => Promise<T> | T,
    options?: {
      op?: string;
      description?: string;
      data?: Record<string, any>;
      tags?: Record<string, string | number>;
    }
  ): Promise<T> => {
    return performanceMonitor.measureOperation(operationName, operation, options);
  }, []);

  return {
    trackInteraction,
    trackOperation,
  };
}

// Hook to track component performance
export function useComponentPerformance(componentName: string) {
  const renderStart = performance.now();

  const trackMount = useCallback(() => {
    const mountDuration = performance.now() - renderStart;
    
    performanceMonitor.recordMetric({
      name: 'component.mount.duration',
      value: mountDuration,
      unit: 'millisecond',
      tags: {
        component: componentName,
        page: window.location.pathname,
      },
    });
  }, [componentName, renderStart]);

  const trackUpdate = useCallback((updateReason?: string) => {
    performanceMonitor.recordMetric({
      name: 'component.update.count',
      value: 1,
      unit: 'count',
      tags: {
        component: componentName,
        reason: updateReason || 'unknown',
        page: window.location.pathname,
      },
    });
  }, [componentName]);

  return {
    trackMount,
    trackUpdate,
  };
}