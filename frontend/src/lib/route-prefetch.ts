'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

// Priority levels for prefetching
export enum PrefetchPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Route configuration with prefetch priorities
const ROUTE_CONFIG: Record<string, {
  priority: PrefetchPriority;
  prefetch: string[];
  preload?: () => void;
}> = {
  '/dashboard': {
    priority: PrefetchPriority.HIGH,
    prefetch: ['/contracts', '/vendors', '/analytics'],
    preload: () => {
      // Preload critical dashboard data
      import('@/app/_components/dashboard/DashboardMetrics');
      import('@/app/_components/dashboard/RecentActivity');
    },
  },
  '/contracts': {
    priority: PrefetchPriority.HIGH,
    prefetch: ['/contracts/[id]', '/vendors'],
    preload: () => {
      import('@/app/_components/contracts/ContractList');
      import('@/app/_components/contracts/ContractModal');
    },
  },
  '/vendors': {
    priority: PrefetchPriority.HIGH,
    prefetch: ['/vendors/[id]', '/contracts'],
    preload: () => {
      import('@/app/_components/vendors/VendorList');
      import('@/app/_components/vendors/VendorModal');
    },
  },
  '/analytics': {
    priority: PrefetchPriority.MEDIUM,
    prefetch: ['/dashboard'],
    preload: () => {
      // Lazy load heavy chart libraries
      import('@/app/_components/three-charts');
      import('recharts');
    },
  },
  '/templates': {
    priority: PrefetchPriority.LOW,
    prefetch: ['/contracts'],
    preload: () => {
      import('@/app/_components/templates/TemplateList');
    },
  },
  '/settings': {
    priority: PrefetchPriority.LOW,
    prefetch: ['/dashboard'],
  },
};

// Prefetch manager class
class PrefetchManager {
  private prefetchQueue: Set<string> = new Set();
  private prefetchInProgress: Set<string> = new Set();
  private observer: IntersectionObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObserver();
      this.startIdlePrefetch();
    }
  }

  private initializeObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const href = entry.target.getAttribute('href');
            if (href) {
              this.prefetchRoute(href, PrefetchPriority.MEDIUM);
            }
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );
  }

  observeLink(element: HTMLAnchorElement) {
    if (this.observer && element.href) {
      this.observer.observe(element);
    }
  }

  unobserveLink(element: HTMLAnchorElement) {
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  prefetchRoute(route: string, priority: PrefetchPriority = PrefetchPriority.MEDIUM) {
    if (this.prefetchInProgress.has(route)) return;

    // Add to queue based on priority
    if (priority === PrefetchPriority.HIGH) {
      this.executePrefetch(route);
    } else {
      this.prefetchQueue.add(route);
    }
  }

  private async executePrefetch(route: string) {
    if (this.prefetchInProgress.has(route)) return;

    this.prefetchInProgress.add(route);

    try {
      // Next.js 13+ automatically prefetches routes via next/link
      // We'll focus on preloading components instead

      // Execute route-specific preloading
      const config = ROUTE_CONFIG[route];
      if (config?.preload) {
        config.preload();
      }

      // Prefetch related routes
      if (config?.prefetch) {
        config.prefetch.forEach((relatedRoute) => {
          this.prefetchQueue.add(relatedRoute);
        });
      }
    } catch (error) {
      console.error(`Failed to prefetch route: ${route}`, error);
    } finally {
      this.prefetchInProgress.delete(route);
      this.prefetchQueue.delete(route);
    }
  }

  private startIdlePrefetch() {
    if ('requestIdleCallback' in window) {
      const processPrefetchQueue = () => {
        const routes = Array.from(this.prefetchQueue);
        if (routes.length > 0) {
          const route = routes[0];
          if (route) {
            this.executePrefetch(route);
          }
        }

        requestIdleCallback(processPrefetchQueue, { timeout: 5000 });
      };

      requestIdleCallback(processPrefetchQueue);
    }
  }

  prefetchCurrentRoute(pathname: string) {
    const config = ROUTE_CONFIG[pathname];
    if (config) {
      // Prefetch related routes for current page
      config.prefetch.forEach((route) => {
        this.prefetchRoute(route, config.priority);
      });

      // Execute preload function
      if (config.preload) {
        requestIdleCallback(() => config.preload!());
      }
    }
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.prefetchQueue.clear();
    this.prefetchInProgress.clear();
  }
}

// Singleton instance
let prefetchManager: PrefetchManager | null = null;

export function getPrefetchManager(): PrefetchManager {
  if (!prefetchManager && typeof window !== 'undefined') {
    prefetchManager = new PrefetchManager();
  }
  return prefetchManager!;
}

// React hook for route prefetching
export function useRoutePrefetch() {
  const pathname = usePathname();

  useEffect(() => {
    const manager = getPrefetchManager();
    if (manager && pathname) {
      manager.prefetchCurrentRoute(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    const manager = getPrefetchManager();
    if (!manager) return;

    // Observe all links on the page
    const observeLinks = () => {
      const links = document.querySelectorAll('a[href^="/"]');
      links.forEach((link) => {
        if (link instanceof HTMLAnchorElement) {
          manager.observeLink(link);
        }
      });
    };

    // Initial observation
    observeLinks();

    // Re-observe on DOM changes
    const observer = new MutationObserver(observeLinks);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);
}

// Component prefetching utility
export function prefetchComponent(importFn: () => Promise<any>) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Silently fail prefetch attempts
      });
    });
  }
}

// Batch prefetching for multiple components
export function prefetchComponents(importFns: Array<() => Promise<any>>) {
  importFns.forEach(prefetchComponent);
}