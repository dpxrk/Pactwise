import { useState, useEffect, useCallback, useRef } from "react";

import { createClient } from "@/utils/supabase/client";

export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface APIOptions<T = unknown> {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  cache?: RequestCache;
  revalidate?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

interface APIState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  isValidating: boolean;
}

interface UseAPIReturn<T> extends APIState<T> {
  execute: (options?: Partial<APIOptions<T>>) => Promise<T | null>;
  reset: () => void;
  mutate: (data: T | ((current: T | null) => T | null)) => void;
}

export function useAPI<T = unknown>(
  url: string | null,
  options: APIOptions<T> = {}
): UseAPIReturn<T> {
  const [state, setState] = useState<APIState<T>>({
    data: null,
    error: null,
    loading: false,
    isValidating: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(
    async (executeOptions?: Partial<APIOptions<T>>): Promise<T | null> => {
      if (!url) return null;

      const mergedOptions = { ...options, ...executeOptions };
      const {
        method = "GET",
        body,
        headers = {},
        params,
        cache = "default",
        onSuccess,
        onError,
        retryCount = 0,
        retryDelay = 1000,
        timeout = 30000,
      } = mergedOptions;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        loading: !prev.data,
        isValidating: !!prev.data,
        error: null,
      }));

      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, timeout);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        const finalHeaders: HeadersInit = {
          "Content-Type": "application/json",
          ...headers,
        };

        if (session?.access_token) {
          finalHeaders["Authorization"] = `Bearer ${session.access_token}`;
        }

        let finalUrl = url;
        if (params) {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            searchParams.append(key, String(value));
          });
          finalUrl = `${url}?${searchParams.toString()}`;
        }

        const makeRequest = async (attempt: number): Promise<Response> => {
          try {
            const response = await fetch(finalUrl, {
              method,
              headers: finalHeaders,
              body: body ? JSON.stringify(body) : undefined,
              signal: abortControllerRef.current?.signal,
              cache,
            });

            if (!response.ok) {
              if (response.status >= 500 && attempt < retryCount) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                return makeRequest(attempt + 1);
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
          } catch (error) {
            if ((error as Error).name === "AbortError") {
              throw new Error("Request timeout");
            }
            if (attempt < retryCount) {
              await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
              return makeRequest(attempt + 1);
            }
            throw error;
          }
        };

        const response = await makeRequest(0);
        const data = await response.json();

        clearTimeout(timeoutId);

        if (mountedRef.current) {
          setState({
            data: data as T,
            error: null,
            loading: false,
            isValidating: false,
          });
          onSuccess?.(data as T);
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (mountedRef.current && (error as Error).name !== "AbortError") {
          const apiError = error as Error;
          setState({
            data: null,
            error: apiError,
            loading: false,
            isValidating: false,
          });
          onError?.(apiError);
        }

        return null;
      }
    },
    [url, options]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false,
      isValidating: false,
    });
  }, []);

  const mutate = useCallback((data: T | ((current: T | null) => T | null)) => {
    setState((prev) => ({
      ...prev,
      data: typeof data === "function" ? (data as (current: T | null) => T | null)(prev.data) : data,
    }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (url && options.method === undefined) {
      execute();
    }
  }, [url]);

  return {
    ...state,
    execute,
    reset,
    mutate,
  };
}

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface UsePaginatedAPIOptions<T> extends Omit<APIOptions<PaginatedData<T>>, "params"> {
  pageSize?: number;
  initialPage?: number;
}

export function usePaginatedAPI<T = unknown>(
  url: string | null,
  options: UsePaginatedAPIOptions<T> = {}
) {
  const [page, setPage] = useState(options.initialPage || 1);
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, loading, error, execute } = useAPI<PaginatedData<T>>(url, {
    ...options,
    params: {
      page,
      pageSize: options.pageSize || 20,
    },
  });

  useEffect(() => {
    if (data) {
      if (page === 1) {
        setItems(data.items);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }
      setHasMore(data.hasMore);
    }
  }, [data, page]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    setItems([]);
    execute();
  }, [execute]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    page,
    total: data?.total || 0,
  };
}

interface MutationOptions<TData = unknown, TVariables = unknown> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
}

export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {}
) {
  const [state, setState] = useState<{
    data: TData | null;
    error: Error | null;
    loading: boolean;
  }>({
    data: null,
    error: null,
    loading: false,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState({ data: null, error: null, loading: true });

      try {
        const data = await mutationFn(variables);
        setState({ data, error: null, loading: false });
        options.onSuccess?.(data, variables);
        options.onSettled?.(data, null, variables);
        return data;
      } catch (error) {
        const apiError = error as Error;
        setState({ data: null, error: apiError, loading: false });
        options.onError?.(apiError, variables);
        options.onSettled?.(null, apiError, variables);
        throw error;
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    ...state,
    reset,
  };
}

export function useSupabaseQuery<T = unknown>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  deps: React.DependencyList = []
) {
  const [state, setState] = useState<APIState<T>>({
    data: null,
    error: null,
    loading: true,
    isValidating: false,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: !prev.data,
      isValidating: !!prev.data,
    }));

    try {
      const { data, error } = await queryFn();
      
      if (error) throw error;
      
      setState({
        data,
        error: null,
        loading: false,
        isValidating: false,
      });
      
      return data;
    } catch (error) {
      setState({
        data: null,
        error: error as Error,
        loading: false,
        isValidating: false,
      });
      return null;
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    ...state,
    refetch: execute,
  };
}

export default {
  useAPI,
  usePaginatedAPI,
  useMutation,
  useSupabaseQuery,
};