/**
 * Metrics tracking utility for Pactwise
 * Provides performance monitoring and business metrics tracking
 */

import { logger } from './logger';

type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';

interface MetricData {
  name: string;
  value: number;
  type: MetricType;
  tags?: Record<string, string>;
  timestamp: number;
}

interface PerformanceMetrics {
  start: () => void;
  end: () => number;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: MetricData[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 100;
  private readonly flushIntervalMs = 30000; // 30 seconds

  private constructor() {
    // Start periodic flush in production
    if (process.env.NODE_ENV === 'production') {
      this.startPeriodicFlush();
    }
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  private async flush() {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      // In production, send to metrics service
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_METRICS_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: metricsToSend }),
        });
      } else {
        // In development, log to console
        logger.debug('Metrics batch', { metrics: metricsToSend });
      }
    } catch (error) {
      logger.error('Failed to send metrics', error as Error);
    }
  }

  private record(metric: MetricData) {
    this.metrics.push(metric);

    // Flush if batch size exceeded
    if (this.metrics.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  // Counter: Incremental metric (e.g., number of contracts created)
  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    this.record({
      name,
      value,
      type: 'counter',
      tags: tags || undefined,
      timestamp: Date.now(),
    });
  }

  // Gauge: Point-in-time value (e.g., active users)
  gauge(name: string, value: number, tags?: Record<string, string>) {
    this.record({
      name,
      value,
      type: 'gauge',
      tags: tags || undefined,
      timestamp: Date.now(),
    });
  }

  // Histogram: Distribution of values (e.g., response times)
  histogram(name: string, value: number, tags?: Record<string, string>) {
    this.record({
      name,
      value,
      type: 'histogram',
      tags: tags || undefined,
      timestamp: Date.now(),
    });
  }

  // Timing: Convenience method for measuring durations
  timing(name: string, duration: number, tags?: Record<string, string>) {
    this.record({
      name,
      value: duration,
      type: 'timing',
      tags: tags || undefined,
      timestamp: Date.now(),
    });
  }

  // Performance helper
  startTimer(name: string, tags?: Record<string, string>): PerformanceMetrics {
    const startTime = performance.now();
    
    return {
      start: () => {
        // Timer already started
      },
      end: () => {
        const duration = performance.now() - startTime;
        this.timing(name, duration, tags);
        return duration;
      },
    };
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Export singleton instance
export const metrics = MetricsCollector.getInstance();

// Common business metrics helpers
export const trackBusinessMetric = {
  contractCreated: (contractType: string) => {
    metrics.increment('contracts.created', 1, { type: contractType });
  },
  
  contractAnalyzed: (duration: number, status: 'success' | 'failure') => {
    metrics.timing('contracts.analysis.duration', duration, { status });
    metrics.increment('contracts.analyzed', 1, { status });
  },
  
  vendorCreated: (category: string) => {
    metrics.increment('vendors.created', 1, { category });
  },
  
  aiAgentExecution: (agentName: string, duration: number, success: boolean) => {
    metrics.timing('ai.agent.execution', duration, { 
      agent: agentName, 
      status: success ? 'success' : 'failure' 
    });
  },
  
  userAction: (action: string, category: string) => {
    metrics.increment('user.actions', 1, { action, category });
  },
  
  apiCall: (endpoint: string, method: string, statusCode: number, duration: number) => {
    metrics.timing('api.request.duration', duration, { 
      endpoint, 
      method, 
      status: statusCode.toString() 
    });
    metrics.increment('api.requests', 1, { 
      endpoint, 
      method, 
      status: statusCode.toString() 
    });
  },
};

// Performance monitoring wrapper
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  tags?: Record<string, string>
): T | Promise<T> {
  const timer = metrics.startTimer(name, tags);
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => timer.end());
    }
    
    timer.end();
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    metrics.destroy();
  });
}