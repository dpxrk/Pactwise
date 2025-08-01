import { useEffect, useRef, useState, useCallback } from 'react';

type WorkerMessage = {
  type: string;
  data?: any;
  error?: string;
};

type WorkerOptions = {
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
  timeout?: number;
};

/**
 * Hook for using Web Workers with TypeScript support
 */
export function useWebWorker<TInput = any, TOutput = any>(
  workerPath: string,
  options: WorkerOptions = {}
) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(workerPath);

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [workerPath]);

  const postMessage = useCallback(
    async (type: string, data: TInput): Promise<TOutput> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        setIsProcessing(true);
        setError(null);
        setProgress(0);

        // Set timeout if specified
        if (options.timeout) {
          timeoutRef.current = setTimeout(() => {
            workerRef.current?.terminate();
            workerRef.current = new Worker(workerPath);
            setIsProcessing(false);
            setError('Operation timed out');
            reject(new Error('Operation timed out'));
          }, options.timeout);
        }

        // Handle messages
        const handleMessage = (event: MessageEvent<WorkerMessage>) => {
          const { type: responseType, data: responseData, error: responseError } = event.data;

          if (responseType === 'PROGRESS') {
            setProgress(responseData.percentage);
            options.onProgress?.(responseData);
            return;
          }

          if (responseType === 'ERROR' || responseError) {
            setIsProcessing(false);
            setError(responseError || 'Unknown error');
            reject(new Error(responseError || 'Unknown error'));
            cleanup();
            return;
          }

          if (responseType === `${type}_RESULT`) {
            setIsProcessing(false);
            resolve(responseData);
            cleanup();
          }
        };

        const handleError = (error: ErrorEvent) => {
          setIsProcessing(false);
          setError(error.message);
          reject(error);
          cleanup();
        };

        const cleanup = () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          workerRef.current?.removeEventListener('message', handleMessage);
          workerRef.current?.removeEventListener('error', handleError);
        };

        workerRef.current.addEventListener('message', handleMessage);
        workerRef.current.addEventListener('error', handleError);

        // Send message to worker
        workerRef.current.postMessage({ type, data });
      });
    },
    [workerPath, options]
  );

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = new Worker(workerPath);
    setIsProcessing(false);
    setError(null);
    setProgress(0);
  }, [workerPath]);

  return {
    postMessage,
    terminate,
    isProcessing,
    error,
    progress,
  };
}

/**
 * Analytics-specific Web Worker hook
 */
export function useAnalyticsWorker() {
  const worker = useWebWorker('/workers/analytics.worker.js', {
    timeout: 30000, // 30 second timeout
  });

  const calculateStats = useCallback(
    async (contracts: any[]) => {
      return worker.postMessage('CALCULATE_STATS', { contracts });
    },
    [worker]
  );

  const analyzeSpending = useCallback(
    async (contracts: any[], vendors: any[]) => {
      return worker.postMessage('ANALYZE_SPEND', { contracts, vendors });
    },
    [worker]
  );

  const calculateRisk = useCallback(
    async (contracts: any[], vendors: any[]) => {
      return worker.postMessage('CALCULATE_RISK', { contracts, vendors });
    },
    [worker]
  );

  const generateForecast = useCallback(
    async (historicalData: any) => {
      return worker.postMessage('GENERATE_FORECAST', { historicalData });
    },
    [worker]
  );

  const processBulkData = useCallback(
    async (items: any[], operation: string, onProgress?: (progress: any) => void) => {
      const workerWithProgress = useWebWorker('/workers/analytics.worker.js', {
        timeout: 60000, // 60 second timeout for bulk operations
        onProgress,
      });
      return workerWithProgress.postMessage('PROCESS_BULK_DATA', { items, operation });
    },
    []
  );

  return {
    calculateStats,
    analyzeSpending,
    calculateRisk,
    generateForecast,
    processBulkData,
    isProcessing: worker.isProcessing,
    error: worker.error,
    progress: worker.progress,
  };
}

/**
 * Contract analysis Web Worker hook
 */
export function useContractAnalysisWorker() {
  const [result, setResult] = useState<any>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create a dedicated worker for contract analysis
    workerRef.current = new Worker('/workers/contract-analysis.worker.js');

    workerRef.current.onmessage = (event) => {
      setResult(event.data);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const analyzeContract = useCallback((contractText: string, options?: any) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'ANALYZE_CONTRACT',
        data: { text: contractText, options },
      });
    }
  }, []);

  return { analyzeContract, result };
}

/**
 * Generic computation offloader
 */
export function useOffloadComputation<T = any>() {
  const workerCode = `
    self.addEventListener('message', async (event) => {
      const { id, fn, args } = event.data;
      try {
        const func = new Function('return ' + fn)();
        const result = await func(...args);
        self.postMessage({ id, result });
      } catch (error) {
        self.postMessage({ id, error: error.message });
      }
    });
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const pendingRequests = useRef(new Map<number, { resolve: Function; reject: Function }>());

  useEffect(() => {
    workerRef.current = new Worker(workerUrl);

    workerRef.current.onmessage = (event) => {
      const { id, result, error } = event.data;
      const pending = pendingRequests.current.get(id);
      
      if (pending) {
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
        pendingRequests.current.delete(id);
      }
    };

    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, [workerUrl]);

  const offload = useCallback(
    <Args extends any[], Return>(
      fn: (...args: Args) => Return,
      ...args: Args
    ): Promise<Return> => {
      return new Promise((resolve, reject) => {
        const id = requestId.current++;
        pendingRequests.current.set(id, { resolve, reject });

        if (workerRef.current) {
          workerRef.current.postMessage({
            id,
            fn: fn.toString(),
            args,
          });
        } else {
          reject(new Error('Worker not initialized'));
        }
      });
    },
    []
  );

  return { offload };
}