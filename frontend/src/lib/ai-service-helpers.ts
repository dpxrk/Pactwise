/**
 * AI Service integration helpers with best practices
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from './logger';
import { trackBusinessMetric } from './metrics';

interface AIServiceOptions {
  timeout?: number;
  maxRetries?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  priority?: 'high' | 'normal' | 'low';
}

interface AIServiceResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  progress: number;
  retry: () => Promise<void>;
  cancel: () => void;
}

/**
 * AI service request with progress tracking and retry logic
 */
export function useAIService<T>(
  serviceFn: (...args: unknown[]) => Promise<T>,
  options?: AIServiceOptions
): AIServiceResult<T> & { execute: (...args: unknown[]) => Promise<T | null> } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<unknown[]>([]);
  
  const maxRetries = options?.maxRetries || 3;
  const timeout = options?.timeout || 30000; // 30 seconds default
  
  // Simulate progress for long-running operations
  const startProgressSimulation = useCallback(() => {
    let currentProgress = 0;
    progressIntervalRef.current = setInterval(() => {
      currentProgress = Math.min(currentProgress + Math.random() * 10, 90);
      setProgress(currentProgress);
      if (options?.onProgress) {
        options.onProgress(currentProgress);
      }
    }, 500);
  }, [options]);
  
  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);
  
  const execute = useCallback(async (...args: unknown[]): Promise<T | null> => {
    lastArgsRef.current = args;
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    // Start progress simulation
    startProgressSimulation();
    
    // Create timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, timeout);
    
    const startTime = performance.now();
    
    try {
      // Add signal to args if the service function supports it
      const result = await serviceFn(...args, { signal });
      
      const duration = performance.now() - startTime;
      trackBusinessMetric.aiAgentExecution(
        serviceFn.name || 'ai-service',
        duration,
        true
      );
      
      setData(result);
      setProgress(100);
      setRetryCount(0);
      
      logger.info('AI service completed', {
        service: serviceFn.name,
        duration,
        priority: options?.priority,
      });
      
      return result;
    } catch (err) {
      const error = err as Error;
      
      if (error.name === 'AbortError') {
        logger.warn('AI service cancelled', { service: serviceFn.name });
      } else {
        logger.error('AI service failed', error, {
          service: serviceFn.name,
          retryCount,
          duration: performance.now() - startTime,
        });
        
        trackBusinessMetric.aiAgentExecution(
          serviceFn.name || 'ai-service',
          performance.now() - startTime,
          false
        );
      }
      
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
      
      return null;
    } finally {
      clearTimeout(timeoutId);
      stopProgressSimulation();
      setIsLoading(false);
      setProgress(100);
    }
  }, [serviceFn, timeout, retryCount, startProgressSimulation, stopProgressSimulation, options]);
  
  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      logger.warn('Max retries reached', {
        service: serviceFn.name,
        retryCount: maxRetries,
      });
      return;
    }
    
    setRetryCount(prev => prev + 1);
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return execute(...lastArgsRef.current);
  }, [retryCount, maxRetries, execute, serviceFn.name]);
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopProgressSimulation();
    setIsLoading(false);
    setProgress(0);
  }, [stopProgressSimulation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);
  
  return {
    data,
    isLoading,
    error,
    progress,
    retry,
    cancel,
    execute,
  };
}

/**
 * AI service queue for managing multiple requests
 */
export function useAIServiceQueue(options?: {
  maxConcurrent?: number;
  priority?: boolean;
}) {
  const maxConcurrent = options?.maxConcurrent || 2;
  const [queue, setQueue] = useState<Array<{
    id: string;
    fn: () => Promise<unknown>;
    priority: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }>>([]);
  const [processing, setProcessing] = useState(0);
  
  const processQueue = useCallback(async () => {
    if (processing >= maxConcurrent) return;
    
    const pendingTasks = queue
      .filter(task => task.status === 'pending')
      .sort((a, b) => b.priority - a.priority);
    
    if (pendingTasks.length === 0) return;
    
    const task = pendingTasks[0];
    
    setQueue(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'processing' } : t
    ));
    setProcessing(prev => prev + 1);
    
    try {
      await task.fn();
      setQueue(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'completed' } : t
      ));
    } catch (error) {
      setQueue(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'failed' } : t
      ));
    } finally {
      setProcessing(prev => prev - 1);
    }
  }, [queue, processing, maxConcurrent]);
  
  useEffect(() => {
    processQueue();
  }, [queue, processing, processQueue]);
  
  const addToQueue = useCallback((
    fn: () => Promise<unknown>,
    priority: number = 0
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    setQueue(prev => [...prev, {
      id,
      fn,
      priority,
      status: 'pending',
    }]);
    
    return id;
  }, []);
  
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(task => task.id !== id));
  }, []);
  
  return {
    queue,
    processing,
    addToQueue,
    removeFromQueue,
    clearQueue: () => setQueue([]),
  };
}

/**
 * AI result caching helper
 */
export function useAIResultCache<T>(
  cacheKey: string,
  ttl: number = 3600000 // 1 hour default
) {
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  
  const getCached = useCallback((key: string): T | null => {
    const cached = cacheRef.current.get(key);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > ttl;
    if (isExpired) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return cached.data;
  }, [ttl]);
  
  const setCached = useCallback((key: string, data: T) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
    });
    
    // Limit cache size
    if (cacheRef.current.size > 100) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
  }, []);
  
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);
  
  return {
    getCached,
    setCached,
    clearCache,
  };
}

/**
 * AI service health check
 */
export function useAIServiceHealth(
  healthCheckFn: () => Promise<boolean>,
  interval: number = 60000 // 1 minute
) {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthy = await healthCheckFn();
        setIsHealthy(healthy);
        setLastCheck(new Date());
        
        if (!healthy) {
          logger.warn('AI service unhealthy');
        }
      } catch (error) {
        setIsHealthy(false);
        logger.error('AI service health check failed', error as Error);
      }
    };
    
    checkHealth();
    const intervalId = setInterval(checkHealth, interval);
    
    return () => clearInterval(intervalId);
  }, [healthCheckFn, interval]);
  
  return {
    isHealthy,
    lastCheck,
  };
}

/**
 * Progressive enhancement for AI features
 */
export function useProgressiveAI<T>(
  fastFn: () => Promise<T>,
  enhancedFn: () => Promise<T>,
  options?: {
    enhancementDelay?: number;
    onFastResult?: (result: T) => void;
    onEnhancedResult?: (result: T) => void;
  }
) {
  const [fastResult, setFastResult] = useState<T | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<T | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const execute = useCallback(async () => {
    // Get fast result first
    try {
      const fast = await fastFn();
      setFastResult(fast);
      
      if (options?.onFastResult) {
        options.onFastResult(fast);
      }
    } catch (error) {
      logger.error('Fast AI service failed', error as Error);
    }
    
    // Delay before enhanced result
    if (options?.enhancementDelay) {
      await new Promise(resolve => setTimeout(resolve, options.enhancementDelay));
    }
    
    // Get enhanced result
    setIsEnhancing(true);
    try {
      const enhanced = await enhancedFn();
      setEnhancedResult(enhanced);
      
      if (options?.onEnhancedResult) {
        options.onEnhancedResult(enhanced);
      }
    } catch (error) {
      logger.error('Enhanced AI service failed', error as Error);
    } finally {
      setIsEnhancing(false);
    }
  }, [fastFn, enhancedFn, options]);
  
  return {
    fastResult,
    enhancedResult,
    isEnhancing,
    execute,
    currentResult: enhancedResult || fastResult,
  };
}