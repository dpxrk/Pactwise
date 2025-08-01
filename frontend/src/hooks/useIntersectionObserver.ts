import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
  initialIsIntersecting?: boolean;
  onChange?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;
}

/**
 * Hook to observe element intersection with viewport
 * Useful for lazy loading, infinite scroll, and animations
 */
export function useIntersectionObserver<T extends Element = Element>({
  threshold = 0,
  root = null,
  rootMargin = '0%',
  freezeOnceVisible = false,
  initialIsIntersecting = false,
  onChange,
}: UseIntersectionObserverOptions = {}): [
  (node: T | null) => void,
  boolean,
  IntersectionObserverEntry | undefined
] {
  const [ref, setRef] = useState<T | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(initialIsIntersecting);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const frozen = useRef(false);

  const updateEntry = useCallback(
    ([entry]: IntersectionObserverEntry[]): void => {
      const isIntersectingNow = entry.isIntersecting;
      setIsIntersecting(isIntersectingNow);
      setEntry(entry);

      if (onChange) {
        onChange(isIntersectingNow, entry);
      }

      if (isIntersectingNow && freezeOnceVisible) {
        frozen.current = true;
      }
    },
    [freezeOnceVisible, onChange]
  );

  useEffect(() => {
    if (!ref) return;
    if (frozen.current) return;

    const observer = new IntersectionObserver(updateEntry, {
      threshold,
      root,
      rootMargin,
    });

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, root, rootMargin, updateEntry]);

  const setRefCallback = useCallback((node: T | null) => {
    setRef(node);
  }, []);

  return [setRefCallback, isIntersecting, entry];
}

/**
 * Hook for lazy loading images with intersection observer
 */
export function useLazyLoadImage(
  src: string,
  placeholder?: string,
  options?: UseIntersectionObserverOptions
): {
  imgRef: (node: HTMLImageElement | null) => void;
  imgSrc: string;
  isLoaded: boolean;
  isIntersecting: boolean;
} {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgRef, isIntersecting] = useIntersectionObserver<HTMLImageElement>({
    ...options,
    freezeOnceVisible: true,
  });

  const imgSrc = isIntersecting ? src : placeholder || '';

  useEffect(() => {
    if (isIntersecting && imgRef) {
      const img = new Image();
      img.src = src;
      img.onload = () => setIsLoaded(true);
    }
  }, [isIntersecting, src, imgRef]);

  return { imgRef, imgSrc, isLoaded, isIntersecting };
}

/**
 * Hook for infinite scroll with intersection observer
 */
export function useInfiniteScroll(
  callback: () => void,
  options?: UseIntersectionObserverOptions & { isLoading?: boolean; hasMore?: boolean }
): (node: Element | null) => void {
  const { isLoading = false, hasMore = true, ...observerOptions } = options || {};
  
  const [ref, isIntersecting] = useIntersectionObserver({
    ...observerOptions,
    onChange: (isIntersecting) => {
      if (isIntersecting && !isLoading && hasMore) {
        callback();
      }
    },
  });

  return ref;
}

/**
 * Hook for viewport-based animations
 */
export function useAnimateOnScroll<T extends Element = Element>(
  options?: UseIntersectionObserverOptions & {
    animationClass?: string;
    once?: boolean;
  }
): [
  (node: T | null) => void,
  boolean,
  { addAnimation: () => void; removeAnimation: () => void }
] {
  const { animationClass = 'animate-in', once = true, ...observerOptions } = options || {};
  const [ref, isIntersecting] = useIntersectionObserver<T>({
    ...observerOptions,
    freezeOnceVisible: once,
  });
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (elementRef.current) {
      if (isIntersecting) {
        elementRef.current.classList.add(animationClass);
      } else if (!once) {
        elementRef.current.classList.remove(animationClass);
      }
    }
  }, [isIntersecting, animationClass, once]);

  const setRefCallback = useCallback((node: T | null) => {
    elementRef.current = node;
    ref(node);
  }, [ref]);

  const controls = {
    addAnimation: () => elementRef.current?.classList.add(animationClass),
    removeAnimation: () => elementRef.current?.classList.remove(animationClass),
  };

  return [setRefCallback, isIntersecting, controls];
}

/**
 * Hook for progressive content loading
 */
export function useProgressiveLoad<T>(
  items: T[],
  batchSize: number = 10,
  delay: number = 100
): {
  visibleItems: T[];
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  reset: () => void;
} {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoading, setIsLoading] = useState(false);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + batchSize, items.length));
      setIsLoading(false);
    }, delay);
  }, [isLoading, hasMore, batchSize, items.length, delay]);

  const reset = useCallback(() => {
    setVisibleCount(batchSize);
    setIsLoading(false);
  }, [batchSize]);

  return { visibleItems, loadMore, hasMore, isLoading, reset };
}