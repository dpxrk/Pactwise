// Type declarations for monitoring module

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface UserEvent {
  event: string;
  timestamp: number;
  url: string;
  userId?: string;
  properties?: Record<string, any>;
  sessionId: string;
}

export interface ErrorReport {
  error: Error;
  errorInfo?: unknown;
  context?: Record<string, unknown>;
  timestamp: number;
  url: string;
  userId?: string;
  sessionId: string;
  userAgent: string;
}

export declare const performanceTracker: {
  subscribe(callback: (metric: WebVitalsMetric) => void): () => void;
  getMetrics(): Map<string, WebVitalsMetric>;
  getMetric(name: string): WebVitalsMetric | undefined;
};

export declare const userAnalytics: {
  track(event: string, properties?: Record<string, any>, userId?: string): void;
  flush(): void;
  getSessionId(): string;
  getEvents(): UserEvent[];
};

export declare const errorTracker: {
  captureError(error: Error, context?: Record<string, any>, userId?: string): void;
  getErrors(): ErrorReport[];
};

export declare const healthMonitor: {
  getHealthStatus(): Record<string, boolean>;
  isHealthy(): boolean;
  destroy(): void;
};

export declare const measurePerformance: {
  measureRender(componentName: string, renderFn: () => void): void;
  measureAsync<T>(operationName: string, operation: () => Promise<T>): Promise<T>;
  measureConvexCall<T>(functionName: string, operation: () => Promise<T>): Promise<T>;
};

export declare function reportError(
  error: Error | string,
  context?: {
    contexts?: Record<string, any>;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: { id?: string; email?: string; username?: string };
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    fingerprint?: string[];
  }
): Promise<void>;

export declare function reportPerformance(
  metric: {
    name: string;
    value: number;
    unit?: string;
    tags?: Record<string, string>;
  }
): Promise<void>;