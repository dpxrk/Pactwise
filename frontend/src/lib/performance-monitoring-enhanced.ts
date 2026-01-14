import { performanceMonitor } from './performance-monitoring';

// Enhanced performance monitoring with React-specific metrics
class EnhancedPerformanceMonitor {
  private renderCounts = new Map<string, number>();
  private renderDurations = new Map<string, number[]>();
  private stateUpdateCounts = new Map<string, number>();
  
  // Track component render
  trackRender(componentName: string, duration: number) {
    const count = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, count + 1);
    
    const durations = this.renderDurations.get(componentName) || [];
    durations.push(duration);
    this.renderDurations.set(componentName, durations);
    
    // Send to base performance monitor
    performanceMonitor.recordMetric({
      name: 'component.render',
      value: duration,
      unit: 'millisecond',
      tags: {
        component: componentName,
        renderCount: count + 1,
      },
    });
  }
  
  // Track state updates
  trackStateUpdate(storeName: string, action: string, duration: number) {
    const key = `${storeName}.${action}`;
    const count = this.stateUpdateCounts.get(key) || 0;
    this.stateUpdateCounts.set(key, count + 1);
    
    performanceMonitor.recordMetric({
      name: 'state.update',
      value: duration,
      unit: 'millisecond',
      tags: {
        store: storeName,
        action,
        updateCount: count + 1,
      },
    });
  }
  
  // Track React Query cache hits/misses
  trackQueryCacheAccess(queryKey: string, hit: boolean, duration: number) {
    performanceMonitor.recordMetric({
      name: 'query.cache',
      value: duration,
      unit: 'millisecond',
      tags: {
        queryKey,
        cacheHit: hit ? 'hit' : 'miss',
      },
    });
  }
  
  // Track virtualized list performance
  trackVirtualizedList(listName: string, visibleItems: number, totalItems: number) {
    performanceMonitor.recordMetric({
      name: 'virtualized.list',
      value: visibleItems,
      unit: 'count',
      tags: {
        listName,
        totalItems,
        efficiency: ((totalItems - visibleItems) / totalItems * 100).toFixed(2),
      },
    });
  }
  
  // Get performance report
  getPerformanceReport() {
    const report: any = {
      components: {},
      stores: {},
      summary: {
        totalRenders: 0,
        averageRenderTime: 0,
        totalStateUpdates: 0,
      },
    };
    
    // Component metrics
    this.renderCounts.forEach((count, component) => {
      const durations = this.renderDurations.get(component) || [];
      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;
      
      report.components[component] = {
        renderCount: count,
        averageDuration: avgDuration.toFixed(2),
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
      };
      
      report.summary.totalRenders += count;
    });
    
    // Store metrics
    this.stateUpdateCounts.forEach((count, key) => {
      const [store, action] = key.split('.');
      if (!report.stores[store]) {
        report.stores[store] = {};
      }
      report.stores[store][action] = count;
      report.summary.totalStateUpdates += count;
    });
    
    // Calculate average render time
    const allDurations = Array.from(this.renderDurations.values()).flat();
    report.summary.averageRenderTime = allDurations.length > 0
      ? (allDurations.reduce((a, b) => a + b, 0) / allDurations.length).toFixed(2)
      : 0;
    
    return report;
  }
  
  // Clear metrics
  reset() {
    this.renderCounts.clear();
    this.renderDurations.clear();
    this.stateUpdateCounts.clear();
  }
}

export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();

// React DevTools Performance Profiler Integration
export function setupReactProfiler() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Track React renders
    const originalCreateElement = (window as any).React?.createElement;
    if (originalCreateElement) {
      (window as any).React.createElement = function(...args: any[]) {
        const start = performance.now();
        const result = originalCreateElement.apply(this, args);
        const duration = performance.now() - start;
        
        if (duration > 10 && typeof args[0] === 'function' && args[0].name) {
          enhancedPerformanceMonitor.trackRender(args[0].name, duration);
        }
        
        return result;
      };
    }
  }
}

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window !== 'undefined') {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        performanceMonitor.recordMetric({
          name: 'web.vitals.lcp',
          value: (entry as any).renderTime || (entry as any).loadTime,
          unit: 'millisecond',
        });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        performanceMonitor.recordMetric({
          name: 'web.vitals.fid',
          value: (entry as any).processingStart - entry.startTime,
          unit: 'millisecond',
        });
      }
    }).observe({ type: 'first-input', buffered: true });
    
    // Cumulative Layout Shift
    let clsScore = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsScore += (entry as any).value;
          performanceMonitor.recordMetric({
            name: 'web.vitals.cls',
            value: clsScore,
            unit: 'score',
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }
}

// Bundle size tracking
export function trackBundleSize() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (perfData) {
      performanceMonitor.recordMetric({
        name: 'bundle.size.total',
        value: perfData.transferSize || 0,
        unit: 'bytes',
      });
      
      performanceMonitor.recordMetric({
        name: 'bundle.load.time',
        value: perfData.loadEventEnd - perfData.fetchStart,
        unit: 'millisecond',
      });
    }
  }
}

// Memory usage tracking
export function trackMemoryUsage() {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    
    performanceMonitor.recordMetric({
      name: 'memory.heap.used',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
    });
    
    performanceMonitor.recordMetric({
      name: 'memory.heap.limit',
      value: memory.jsHeapSizeLimit,
      unit: 'bytes',
    });
    
    const heapUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    performanceMonitor.recordMetric({
      name: 'memory.heap.usage',
      value: heapUsagePercent,
      unit: 'percent',
    });
  }
}

// Initialize all tracking on app load
export function initializePerformanceTracking() {
  if (typeof window !== 'undefined') {
    setupReactProfiler();
    trackWebVitals();
    trackBundleSize();
    
    // Track memory usage every 30 seconds
    setInterval(trackMemoryUsage, 30000);
    
  }
}