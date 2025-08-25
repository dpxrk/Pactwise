import { useState, useEffect, useCallback } from 'react';

interface UseDataFetchOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
  reset: () => void;
}

export function useDataFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: React.DependencyList = [],
  options: UseDataFetchOptions = {}
): UseDataFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const {
    onSuccess,
    onError,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFn();
      
      setData(result);
      setLoading(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      
      setError(error);
      setLoading(false);
      
      if (onError) {
        onError(error);
      }
      
      // Auto-retry logic
      if (retryAttempt < retryCount) {
        setTimeout(() => {
          setRetryAttempt(prev => prev + 1);
        }, retryDelay * (retryAttempt + 1));
      }
    }
  }, [fetchFn, onSuccess, onError, retryAttempt, retryCount, retryDelay]);

  useEffect(() => {
    fetchData();
  }, [...dependencies, retryAttempt]);

  const retry = useCallback(() => {
    setRetryAttempt(0);
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setRetryAttempt(0);
  }, []);

  return {
    data,
    loading,
    error,
    retry,
    reset,
  };
}