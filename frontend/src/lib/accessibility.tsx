/**
 * Accessibility utilities and hooks for WCAG compliance
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keyboard navigation hook
 */
export function useKeyboardNavigation<T>(
  items: T[],
  options?: {
    horizontal?: boolean;
    wrap?: boolean;
    onSelect?: (index: number) => void;
    onEscape?: () => void;
  }
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { horizontal = false, wrap = true, onSelect, onEscape } = options || {};
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    const maxIndex = items.length - 1;
    
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (!horizontal && key === 'ArrowRight') return;
        if (horizontal && key === 'ArrowDown') return;
        
        e.preventDefault();
        setFocusedIndex(prev => {
          if (prev === maxIndex) return wrap ? 0 : prev;
          return prev + 1;
        });
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
        if (!horizontal && key === 'ArrowLeft') return;
        if (horizontal && key === 'ArrowUp') return;
        
        e.preventDefault();
        setFocusedIndex(prev => {
          if (prev <= 0) return wrap ? maxIndex : 0;
          return prev - 1;
        });
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && onSelect) {
          onSelect(focusedIndex);
        }
        break;
        
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
        
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
        
      case 'End':
        e.preventDefault();
        setFocusedIndex(maxIndex);
        break;
    }
  }, [items.length, focusedIndex, horizontal, wrap, onSelect, onEscape]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return {
    focusedIndex,
    setFocusedIndex,
    resetFocus: () => setFocusedIndex(-1),
  };
}

/**
 * Focus trap hook for modals and drawers
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;
    
    // Get all focusable elements
    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Focus the first element
    firstFocusable?.focus();
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleTabKey);
    
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore focus to the previously focused element
      previousActiveElement.current?.focus();
    };
  }, [isActive]);
  
  return containerRef;
}

/**
 * Announce to screen readers
 */
export function useAnnounce() {
  const [announcement, setAnnouncement] = useState('');
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('');
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
  }, []);
  
  return {
    announce,
    announceElement: (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    ),
  };
}

/**
 * Skip links component
 */
export function SkipLinks() {
  return (
    <div className="absolute -top-[9999px] -left-[9999px]">
      <a 
        href="#main-content" 
        className="focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:no-underline focus:border-2 focus:border-border focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>
      <a 
        href="#main-navigation" 
        className="focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:no-underline focus:border-2 focus:border-border focus:rounded focus:shadow-lg"
      >
        Skip to navigation
      </a>
      <a 
        href="#search" 
        className="focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:no-underline focus:border-2 focus:border-border focus:rounded focus:shadow-lg"
      >
        Skip to search
      </a>
    </div>
  );
}

/**
 * ARIA labels helper
 */
export const ariaLabels = {
  // Navigation
  mainNavigation: 'Main navigation',
  breadcrumb: 'Breadcrumb navigation',
  pagination: 'Pagination navigation',
  
  // Actions
  close: 'Close',
  open: 'Open',
  expand: 'Expand',
  collapse: 'Collapse',
  delete: 'Delete',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  
  // Status
  loading: 'Loading',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Information',
  
  // Forms
  required: 'Required field',
  optional: 'Optional field',
  
  // Tables
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  
  // Modals
  modal: 'Modal dialog',
  closeModal: 'Close modal dialog',
};

/**
 * Color contrast checker
 */
export function checkColorContrast(foreground: string, background: string): {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
} {
  // Convert hex to RGB
  const getRGB = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const fg = getRGB(foreground);
  const bg = getRGB(background);
  
  if (!fg || !bg) {
    return { ratio: 0, meetsAA: false, meetsAAA: false };
  }
  
  const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);
  
  const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) /
                (Math.min(fgLuminance, bgLuminance) + 0.05);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    meetsAA: ratio >= 4.5, // Normal text
    meetsAAA: ratio >= 7, // Enhanced contrast
  };
}

/**
 * Live region hook for dynamic content
 */
export function useLiveRegion(
  ariaLive: 'polite' | 'assertive' = 'polite',
  ariaRelevant: string = 'additions text'
) {
  const [content, setContent] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const announce = useCallback((message: string, delay = 100) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Clear first to ensure screen readers announce the change
    setContent('');
    
    timeoutRef.current = setTimeout(() => {
      setContent(message);
    }, delay);
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const liveRegion = (
    <div
      role="status"
      aria-live={ariaLive}
      aria-relevant={ariaRelevant}
      aria-atomic="true"
      className="sr-only"
    >
      {content}
    </div>
  );
  
  return { announce, liveRegion };
}

/**
 * Reduced motion hook
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
}