import * as Sentry from '@sentry/nextjs';
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
import React from 'react';

// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  // Critical operations that always get traced
  criticalOperations: [
    'contract.create',
    'contract.analyze',
    'vendor.performance.calculate',
    'dashboard.load',
    'search.execute',
    'ai.query',
  ],
  
  // Custom sampling rates for different operations
  samplingRates: {
    'api.query': 0.5,
    'api.mutation': 1.0,
    'page.load': 0.3,
    'interaction.click': 0.1,
    'database.query': 0.5,
  },
  
  // Performance thresholds (in ms)
  thresholds: {
    'api.response': 1000,
    'page.load': 3000,
    'interaction.response': 300,
    'database.query': 500,
  },
};

// Custom performance metrics
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, Primitive>;
}

// Web Vitals type definitions
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
}

interface LongTaskEntry extends PerformanceEntry {
  attribution?: Array<{
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
  }>;
}

// Browser-specific API type definitions
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface NetworkInformation {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
  
  interface Navigator {
    connection?: NetworkInformation;
  }
}

// Performance monitoring class
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private activeSpans: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start a performance transaction
  startTransaction(name: string, op: string, data?: Record<string, any>) {
    const samplingRate = PERFORMANCE_CONFIG.samplingRates[op] || 0.1;
    const shouldSample = Math.random() <= samplingRate || PERFORMANCE_CONFIG.criticalOperations.includes(name);
    
    return Sentry.startSpan({
      name,
      op,
      attributes: data,
      forceTransaction: true,
    }, (span) => {
      // Store the span for later reference
      this.activeSpans.set(name, span);
      return span;
    });
  }

  // End a performance transaction
  endTransaction(name: string, status?: string) {
    const span = this.activeSpans.get(name);
    if (span) {
      if (status) {
        span.setStatus({ code: status === 'ok' ? 1 : 2, message: status });
      }
      this.activeSpans.delete(name);
    }
  }

  // Measure a specific operation
  async measureOperation<T>(
    name: string,
    operation: () => Promise<T> | T,
    options?: {
      op?: string;
      description?: string;
      data?: Record<string, any>;
      tags?: Record<string, Primitive>;
    }
  ): Promise<T> {
    return Sentry.startSpan({
      name: options?.description || name,
      op: options?.op || 'function',
      attributes: {
        ...options?.data,
        ...options?.tags,
      },
    }, async () => {
      const startTime = performance.now();

      try {
        const result = await operation();
        
        // Check performance thresholds
        const duration = performance.now() - startTime;
        const threshold = PERFORMANCE_CONFIG.thresholds[options?.op || ''];
        if (threshold && duration > threshold) {
          console.warn(`Performance warning: ${name} took ${duration}ms (threshold: ${threshold}ms)`);
        }

        return result;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    });
  }

  // Measure database query performance
  measureDatabaseQuery(queryName: string, database: string = 'default') {
    const startTime = performance.now();
    
    return {
      end: (metadata?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        
        this.recordMetric({
          name: 'database.query',
          value: duration,
          unit: 'millisecond',
          tags: {
            query: queryName,
            database,
            ...metadata,
          },
        });

        // Check threshold
        const threshold = PERFORMANCE_CONFIG.thresholds['database.query'];
        if (threshold && duration > threshold) {
          console.warn(`Database query performance warning: ${queryName} took ${duration}ms (threshold: ${threshold}ms)`);
        }
      }
    };
  }

  // Record a custom metric
  recordMetric(metric: PerformanceMetric) {
    // For edge runtime, we'll use custom tags and context
    Sentry.setContext('metric', {
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
    });
    
    if (metric.tags) {
      Object.entries(metric.tags).forEach(([key, value]) => {
        Sentry.setTag(`metric.${key}`, value);
      });
    }
    
    // Log as a breadcrumb for tracking
    Sentry.addBreadcrumb({
      category: 'metric',
      message: metric.name,
      level: 'info',
      data: {
        value: metric.value,
        unit: metric.unit,
        ...metric.tags,
      },
    });
  }

  // Measure Web Vitals
  measureWebVitals() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals
    this.measureLCP();
    this.measureFID();
    this.measureCLS();
    
    // Additional metrics
    this.measureTTFB();
    this.measureFCP();
  }

  private measureLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.recordMetric({
        name: 'web.vitals.lcp',
        value: lastEntry.startTime,
        unit: 'millisecond',
        tags: {
          page: window.location.pathname,
        },
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }

  private measureFID() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0] as FirstInputEntry;
      
      this.recordMetric({
        name: 'web.vitals.fid',
        value: firstEntry.processingStart - firstEntry.startTime,
        unit: 'millisecond',
        tags: {
          page: window.location.pathname,
        },
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
  }

  private measureCLS() {
    let clsValue = 0;
    let clsEntries: LayoutShiftEntry[] = [];
    let sessionValue = 0;
    let sessionEntries: LayoutShiftEntry[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (sessionValue && entry.startTime - lastSessionEntry.startTime < 1000 && entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = sessionEntries;
          }
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // Report CLS after page is hidden
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.recordMetric({
          name: 'web.vitals.cls',
          value: clsValue,
          unit: 'score',
          tags: {
            page: window.location.pathname,
          },
        });
      }
    }, { once: true });
  }

  private measureTTFB() {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationEntry) {
      this.recordMetric({
        name: 'web.vitals.ttfb',
        value: navigationEntry.responseStart - navigationEntry.fetchStart,
        unit: 'millisecond',
        tags: {
          page: window.location.pathname,
        },
      });
    }
  }

  private measureFCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        this.recordMetric({
          name: 'web.vitals.fcp',
          value: fcpEntry.startTime,
          unit: 'millisecond',
          tags: {
            page: window.location.pathname,
          },
        });
      }
    });

    observer.observe({ entryTypes: ['paint'] });
  }

  // Measure resource loading performance
  measureResourceTiming(pattern?: RegExp) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    resources.forEach(resource => {
      if (!pattern || pattern.test(resource.name)) {
        this.recordMetric({
          name: 'resource.load.duration',
          value: resource.duration,
          unit: 'millisecond',
          tags: {
            resource_type: resource.initiatorType,
            resource_name: resource.name.substring(0, 100), // Truncate long URLs
          },
        });
      }
    });
  }

  // Create a performance observer for long tasks
  observeLongTasks() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as LongTaskEntry[]) {
          this.recordMetric({
            name: 'browser.long_task',
            value: entry.duration,
            unit: 'millisecond',
            tags: {
              attribution: entry.attribution?.[0]?.name || 'unknown',
            },
          });
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Long task observer not supported
    }
  }

  // Memory monitoring (if available)
  measureMemory() {
    if (typeof window !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      
      this.recordMetric({
        name: 'browser.memory.used',
        value: memory.usedJSHeapSize,
        unit: 'byte',
        tags: {
          heap_limit: memory.jsHeapSizeLimit.toString(),
        },
      });
    }
  }

  // Navigation timing
  measureNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      // DNS lookup
      this.recordMetric({
        name: 'navigation.dns',
        value: navigation.domainLookupEnd - navigation.domainLookupStart,
        unit: 'millisecond',
      });

      // TCP connection
      this.recordMetric({
        name: 'navigation.tcp',
        value: navigation.connectEnd - navigation.connectStart,
        unit: 'millisecond',
      });

      // Request/Response
      this.recordMetric({
        name: 'navigation.request',
        value: navigation.responseEnd - navigation.requestStart,
        unit: 'millisecond',
      });

      // DOM processing
      this.recordMetric({
        name: 'navigation.dom_processing',
        value: navigation.domComplete - navigation.domInteractive,
        unit: 'millisecond',
      });

      // Page load
      this.recordMetric({
        name: 'navigation.load_complete',
        value: navigation.loadEventEnd - navigation.fetchStart,
        unit: 'millisecond',
      });
    }
  }

  // Custom user timing API
  mark(name: string) {
    performance.mark(name);
  }

  measure(name: string, startMark: string, endMark: string) {
    try {
      performance.measure(name, startMark, endMark);
      const measures = performance.getEntriesByName(name, 'measure');
      const measure = measures[measures.length - 1];
      
      if (measure) {
        this.recordMetric({
          name: `custom.measure.${name}`,
          value: measure.duration,
          unit: 'millisecond',
        });
      }
    } catch (error) {
      console.error('Performance measurement error:', error);
    }
  }

  // Intersection Observer for element visibility tracking
  observeElementVisibility(element: Element, callback: (isVisible: boolean) => void) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          callback(entry.isIntersecting);
          
          if (entry.isIntersecting) {
            this.recordMetric({
              name: 'element.became_visible',
              value: performance.now(),
              unit: 'millisecond',
              tags: {
                element_id: element.id || 'unknown',
                element_class: element.className || 'unknown',
              },
            });
          }
        });
      },
      {
        threshold: 0.5, // 50% visible
      }
    );

    observer.observe(element);
    
    return () => observer.disconnect();
  }

  // Performance budget checking
  checkPerformanceBudget(budgets: Record<string, number>) {
    const violations: string[] = [];
    
    Object.entries(budgets).forEach(([metric, budget]) => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      let value: number | undefined;
      
      switch (metric) {
        case 'fcp':
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
          value = fcpEntry?.startTime;
          break;
        case 'domReady':
          value = navEntry?.domContentLoadedEventEnd - navEntry?.fetchStart;
          break;
        case 'load':
          value = navEntry?.loadEventEnd - navEntry?.fetchStart;
          break;
        case 'jsHeap':
          // @ts-ignore
          value = performance.memory?.usedJSHeapSize;
          break;
      }
      
      if (value && value > budget) {
        violations.push(`${metric}: ${value}ms exceeds budget of ${budget}ms`);
        
        // Report budget violation
        this.recordMetric({
          name: 'performance.budget.violation',
          value: value - budget,
          unit: 'millisecond',
          tags: {
            metric,
            budget: budget.toString(),
            actual: value.toString(),
          },
        });
      }
    });
    
    return violations;
  }

  // Network information monitoring
  monitorNetworkInfo() {
    if (typeof window !== 'undefined' && navigator.connection) {
      const connection = navigator.connection;
      
      this.recordMetric({
        name: 'network.effective_type',
        value: 1,
        unit: 'none',
        tags: {
          effective_type: connection.effectiveType,
          downlink: connection.downlink?.toString() || 'unknown',
          rtt: connection.rtt?.toString() || 'unknown',
          save_data: connection.saveData?.toString() || 'false',
        },
      });

      // Monitor connection changes
      connection.addEventListener('change', () => {
        this.recordMetric({
          name: 'network.type_changed',
          value: 1,
          unit: 'none',
          tags: {
            new_type: connection.effectiveType,
          },
        });
      });
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return performanceMonitor;
}

// HOC for measuring component render performance
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return (props: P) => {
    const renderStart = performance.now();
    
    React.useEffect(() => {
      const renderDuration = performance.now() - renderStart;
      
      performanceMonitor.recordMetric({
        name: 'component.render.duration',
        value: renderDuration,
        unit: 'millisecond',
        tags: {
          component: componentName,
          page: window.location.pathname,
        },
      });
    }, []);

    return <Component {...props} />;
  };
}