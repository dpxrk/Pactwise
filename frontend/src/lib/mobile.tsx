/**
 * Mobile responsiveness utilities and hooks
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * Responsive breakpoints
 */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
}

/**
 * Breakpoint hooks
 */
export function useBreakpoint() {
  const isXs = useMediaQuery(`(min-width: ${breakpoints.xs}px)`);
  const isSm = useMediaQuery(`(min-width: ${breakpoints.sm}px)`);
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md}px)`);
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
  const isXl = useMediaQuery(`(min-width: ${breakpoints.xl}px)`);
  const is2xl = useMediaQuery(`(min-width: ${breakpoints['2xl']}px)`);
  
  const currentBreakpoint = is2xl ? '2xl' : 
                           isXl ? 'xl' : 
                           isLg ? 'lg' : 
                           isMd ? 'md' : 
                           isSm ? 'sm' : 'xs';
  
  return {
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    isMobile: !isMd,
    isTablet: isMd && !isLg,
    isDesktop: isLg,
    currentBreakpoint,
  };
}

/**
 * Touch detection hook
 */
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    
    checkTouch();
    
    window.addEventListener('touchstart', () => setIsTouchDevice(true), { once: true });
    window.addEventListener('mousemove', () => setIsTouchDevice(false), { once: true });
  }, []);
  
  return isTouchDevice;
}

/**
 * Swipe gesture hook
 */
export function useSwipeGesture(options?: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}) {
  const { threshold = 50 } = options || {};
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0]!.clientX,
      y: e.touches[0]!.clientY,
    });
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = {
      x: e.changedTouches[0]!.clientX,
      y: e.changedTouches[0]!.clientY,
    };
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (absX > absY && absX > threshold) {
      if (deltaX > 0) {
        options?.onSwipeRight?.();
      } else {
        options?.onSwipeLeft?.();
      }
    } else if (absY > absX && absY > threshold) {
      if (deltaY > 0) {
        options?.onSwipeDown?.();
      } else {
        options?.onSwipeUp?.();
      }
    }
    
    setTouchStart(null);
  }, [touchStart, threshold, options]);
  
  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Viewport size hook
 */
export function useViewportSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  
  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return size;
}

/**
 * Responsive table wrapper component
 */
export function ResponsiveTable({ children }: { children: React.ReactNode }) {
  const { isMobile } = useBreakpoint();
  
  if (isMobile) {
    return (
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            {children}
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

/**
 * Mobile-optimized font sizes
 */
export const fontSizes = {
  mobile: {
    xs: 'text-xs',     // 12px
    sm: 'text-sm',     // 14px
    base: 'text-base', // 16px
    lg: 'text-lg',     // 18px
    xl: 'text-xl',     // 20px
    '2xl': 'text-2xl', // 24px
    '3xl': 'text-3xl', // 30px
  },
  desktop: {
    xs: 'sm:text-xs',
    sm: 'sm:text-sm',
    base: 'sm:text-base',
    lg: 'sm:text-lg',
    xl: 'sm:text-xl',
    '2xl': 'sm:text-2xl',
    '3xl': 'sm:text-3xl',
  },
};

/**
 * Touch-friendly sizes for interactive elements
 */
export const touchTargetSizes = {
  sm: 'min-h-[36px] min-w-[36px]',
  md: 'min-h-[44px] min-w-[44px]', // Recommended minimum
  lg: 'min-h-[48px] min-w-[48px]',
};

/**
 * Mobile-first responsive spacing
 */
export const spacing = {
  page: {
    mobile: 'px-4',
    tablet: 'sm:px-6',
    desktop: 'lg:px-8',
  },
  section: {
    mobile: 'py-4',
    tablet: 'sm:py-6',
    desktop: 'lg:py-8',
  },
  stack: {
    mobile: 'space-y-4',
    tablet: 'sm:space-y-6',
    desktop: 'lg:space-y-8',
  },
};

/**
 * Orientation detection hook
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };
    
    updateOrientation();
    
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);
    
    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);
  
  return orientation;
}

/**
 * Safe area insets for devices with notches
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  
  useEffect(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    
    setInsets({
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
      right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
      left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
    });
  }, []);
  
  return insets;
}

/**
 * Mobile modal styles
 */
export const mobileModalStyles = {
  overlay: 'fixed inset-0 bg-black/50 z-50',
  container: 'fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center',
  content: 'bg-background rounded-t-xl sm:rounded-xl max-h-[90vh] overflow-auto sm:max-w-lg sm:w-full sm:m-4',
  handle: 'w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-2 mb-4 sm:hidden',
};