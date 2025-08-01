import { useState, useEffect, useCallback, useRef } from 'react';

export interface InfiniteScrollConfig {
  threshold?: number;
  hasMore?: boolean;
  isLoading?: boolean;
  rootMargin?: string;
}

export interface InfiniteScrollResult {
  lastElementRef: (node: HTMLElement | null) => void;
  isLoading: boolean;
  hasMore: boolean;
}

/**
 * Custom hook for infinite scrolling with Intersection Observer
 * @param fetchMore - Function to call when more data is needed
 * @param config - Configuration options
 */
export function useInfiniteScroll(
  fetchMore: () => void | Promise<void>,
  {
    threshold = 1.0,
    hasMore = true,
    isLoading = false,
    rootMargin = '100px',
  }: InfiniteScrollConfig = {}
): InfiniteScrollResult {
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isLoading || isFetching) return;
      
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !isLoading && !isFetching) {
            setIsFetching(true);
            
            const result = fetchMore();
            
            if (result instanceof Promise) {
              result.finally(() => setIsFetching(false));
            } else {
              setIsFetching(false);
            }
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [isLoading, isFetching, hasMore, fetchMore, threshold, rootMargin]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    lastElementRef,
    isLoading: isLoading || isFetching,
    hasMore,
  };
}

export default useInfiniteScroll;