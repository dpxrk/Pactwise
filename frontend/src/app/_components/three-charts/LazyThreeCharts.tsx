import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/premium';
import type { BaseThreeChartProps } from '@/types/three-charts.types';

/**
 * Lazy loading wrapper for Three.js charts
 * Only loads Three.js when the component is visible in viewport
 */

// Dynamically import Three.js components
const ThreeLineChart = dynamic(
  () => import('./ThreeLineChart'),
  {
    loading: () => <ChartSkeleton type="line" />,
    ssr: false, // Three.js doesn't work with SSR
  }
);

const ThreeBarChart = dynamic(
  () => import('./ThreeBarChart'),
  {
    loading: () => <ChartSkeleton type="bar" />,
    ssr: false,
  }
);

const ThreeAreaChart = dynamic(
    () => import('./ThreeAreaChart'),
    {
      loading: () => <ChartSkeleton type="area" />,
      ssr: false,
    }
  );

const ThreePieChart = dynamic(
    () => import('./ThreePieChart'),
    {
      loading: () => <ChartSkeleton type="pie" />,
      ssr: false,
    }
  );

const ThreeScatterChart = dynamic(
  () => import('./ThreeScatterChart'),
  {
    loading: () => <ChartSkeleton type="scatter" />,
    ssr: false,
  }
);

// Chart skeleton component
const ChartSkeleton = ({ type }: { type: string }) => (
  <div className="w-full h-[400px] flex flex-col gap-4">
    <Skeleton className="h-8 w-48" /> {/* Title */}
    <Skeleton className="flex-1 w-full" /> {/* Chart area */}
    <div className="flex gap-2 justify-center">
      {/* Legend items */}
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-4 w-20" />
      ))}
    </div>
  </div>
);

interface LazyThreeChartProps extends BaseThreeChartProps {
  type: 'line' | 'bar' | 'scatter' | 'area' | 'pie';
  preload?: boolean; // Option to preload the component
}

/**
 * Lazy Three.js chart that loads on viewport intersection
 */
export const LazyThreeChart: React.FC<LazyThreeChartProps> = ({
  type,
  preload = false,
  ...chartProps
}) => {
  const [isVisible, setIsVisible] = useState(preload);
  const [hasBeenVisible, setHasBeenVisible] = useState(preload);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preload || hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1, // Load when 10% visible
        rootMargin: '50px', // Start loading 50px before visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [preload, hasBeenVisible]);

  // Keep component mounted once loaded to preserve state
  const shouldRenderChart = isVisible || hasBeenVisible;

  return (
    <div ref={containerRef} className="min-h-[400px]">
      {shouldRenderChart ? (
        <div style={{ display: isVisible ? 'block' : 'none' }}>
          {type === 'line' && <ThreeLineChart {...chartProps} />}
          {type === 'bar' && <ThreeBarChart {...chartProps} />}
          {type === 'scatter' && <ThreeScatterChart {...chartProps} />}
          {type === 'area' && <ThreeAreaChart {...chartProps} />}
          {type === 'pie' && <ThreePieChart {...chartProps} />}
        </div>
      ) : (
        <ChartSkeleton type={type} />
      )}
    </div>
  );
};

/**
 * Batch loading optimization for multiple charts
 */
export const LazyThreeChartGroup: React.FC<{
  children: React.ReactNode;
  loadStrategy?: 'sequential' | 'parallel';
}> = ({ children, loadStrategy = 'parallel' }) => {
  const [loadIndex, setLoadIndex] = useState(0);

  useEffect(() => {
    if (loadStrategy === 'sequential') {
      // Load charts one by one to reduce memory spike
      const timer = setTimeout(() => {
        setLoadIndex((prev) => prev + 1);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loadIndex, loadStrategy]);

  return (
    <div className="space-y-8">
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        if (loadStrategy === 'sequential') {
          return React.cloneElement(child as any, {
            preload: index <= loadIndex,
          });
        }

        return child;
      })}
    </div>
  );
};

// Export convenience wrappers
export const LazyThreeLineChart = (props: Omit<LazyThreeChartProps, 'type'>) => (
  <LazyThreeChart {...props} type="line" />
);

export const LazyThreeBarChart = (props: Omit<LazyThreeChartProps, 'type'>) => (
  <LazyThreeChart {...props} type="bar" />
);

export const LazyThreeScatterChart = (props: Omit<LazyThreeChartProps, 'type'>) => (
  <LazyThreeChart {...props} type="scatter" />
);

export const LazyThreeAreaChart = (props: Omit<LazyThreeChartProps, 'type'>) => (
  <LazyThreeChart {...props} type="area" />
);

export const LazyThreePieChart = (props: Omit<LazyThreeChartProps, 'type'>) => (
  <LazyThreeChart {...props} type="pie" />
);