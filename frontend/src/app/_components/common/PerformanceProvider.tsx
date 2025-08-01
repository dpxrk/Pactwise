'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { performanceMonitor } from '@/lib/performance-monitoring';
import * as Sentry from '@sentry/nextjs';

interface PerformanceProviderProps {
  children: ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const pathname = usePathname();

  // Initialize Web Vitals monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      performanceMonitor.measureWebVitals();
    }
  }, []);

  // Track page navigation performance
  useEffect(() => {
    const transaction = performanceMonitor.startTransaction(
      `Page ${pathname}`,
      'page.load',
      {
        pathname,
        timestamp: Date.now(),
      }
    );

    // Measure page load time
    if (typeof window !== 'undefined' && window.performance) {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigationEntry) {
        performanceMonitor.recordMetric({
          name: 'page.load.time',
          value: navigationEntry.loadEventEnd - navigationEntry.fetchStart,
          unit: 'millisecond',
          tags: {
            page: pathname,
          },
        });

        // Record specific navigation timings
        performanceMonitor.recordMetric({
          name: 'page.dns.lookup',
          value: navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
          unit: 'millisecond',
          tags: { page: pathname },
        });

        performanceMonitor.recordMetric({
          name: 'page.tcp.connect',
          value: navigationEntry.connectEnd - navigationEntry.connectStart,
          unit: 'millisecond',
          tags: { page: pathname },
        });

        performanceMonitor.recordMetric({
          name: 'page.dom.interactive',
          value: navigationEntry.domInteractive - navigationEntry.fetchStart,
          unit: 'millisecond',
          tags: { page: pathname },
        });
      }
    }

    // End transaction after a delay to capture all initial loads
    const timer = setTimeout(() => {
      performanceMonitor.endTransaction(`Page ${pathname}`, 'ok');
    }, 3000);

    return () => {
      clearTimeout(timer);
      performanceMonitor.endTransaction(`Page ${pathname}`, 'cancelled');
    };
  }, [pathname]);

  // Monitor long tasks
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Report tasks longer than 50ms
          if (entry.duration > 50) {
            performanceMonitor.recordMetric({
              name: 'long.task.duration',
              value: entry.duration,
              unit: 'millisecond',
              tags: {
                page: pathname,
                taskName: entry.name,
              },
            });

            // Report very long tasks to Sentry
            if (entry.duration > 200) {
              Sentry.captureMessage(`Long task detected: ${entry.name}`, 'warning', {
                tags: {
                  duration: entry.duration.toString(),
                  page: pathname,
                },
                extra: {
                  startTime: entry.startTime,
                  duration: entry.duration,
                },
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });

      return () => observer.disconnect();
    } catch (e) {
      // Some browsers don't support longtask observer
      console.debug('Long task observer not supported');
    }
  }, [pathname]);

  // Monitor resource timing
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        // Track slow resources
        if (resourceEntry.duration > 1000) {
          performanceMonitor.recordMetric({
            name: 'resource.slow.load',
            value: resourceEntry.duration,
            unit: 'millisecond',
            tags: {
              page: pathname,
              resourceType: resourceEntry.initiatorType,
              resourceName: resourceEntry.name.split('/').pop() || 'unknown',
            },
          });
        }

        // Track resource types
        if (resourceEntry.initiatorType) {
          performanceMonitor.recordMetric({
            name: `resource.${resourceEntry.initiatorType}.duration`,
            value: resourceEntry.duration,
            unit: 'millisecond',
            tags: {
              page: pathname,
            },
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => observer.disconnect();
  }, [pathname]);

  // Monitor memory usage (if available)
  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window) || !('memory' in performance)) {
      return;
    }

    const measureMemory = () => {
      const memory = (performance as any).memory;
      
      performanceMonitor.recordMetric({
        name: 'memory.used',
        value: memory.usedJSHeapSize / 1048576, // Convert to MB
        unit: 'megabyte',
        tags: {
          page: pathname,
        },
      });

      performanceMonitor.recordMetric({
        name: 'memory.total',
        value: memory.totalJSHeapSize / 1048576, // Convert to MB
        unit: 'megabyte',
        tags: {
          page: pathname,
        },
      });

      // Alert on high memory usage
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercent > 90) {
        Sentry.captureMessage('High memory usage detected', 'warning', {
          tags: {
            page: pathname,
            usagePercent: usagePercent.toFixed(2),
          },
          extra: {
            usedMB: (memory.usedJSHeapSize / 1048576).toFixed(2),
            totalMB: (memory.totalJSHeapSize / 1048576).toFixed(2),
            limitMB: (memory.jsHeapSizeLimit / 1048576).toFixed(2),
          },
        });
      }
    };

    // Measure memory every 30 seconds
    const interval = setInterval(measureMemory, 30000);
    
    // Initial measurement
    measureMemory();

    return () => clearInterval(interval);
  }, [pathname]);

  return <>{children}</>;
}