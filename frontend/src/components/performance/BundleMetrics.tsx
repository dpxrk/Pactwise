import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface BundleInfo {
  name: string;
  size: number;
  sizeLimit: number;
  loadTime?: number;
}

interface PerformanceMetrics {
  bundles: BundleInfo[];
  totalSize: number;
  totalSizeLimit: number;
  loadTime: number;
  cacheHitRate: number;
  renderTime: number;
}

/**
 * Bundle metrics component for development
 * Shows real-time bundle size and performance metrics
 */
export const BundleMetrics: React.FC<{ show?: boolean }> = ({ show = true }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (!isVisible || process.env.NODE_ENV !== 'development') return;

    // Collect performance metrics
    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      // Group resources by type
      const scripts = resources.filter(r => r.name.endsWith('.js'));
      const chunks = scripts.filter(s => s.name.includes('chunks'));

      // Calculate bundle sizes (using transferSize when available)
      const bundles: BundleInfo[] = [
        {
          name: 'Framework',
          size: chunks
            .filter(c => c.name.includes('framework'))
            .reduce((sum, c) => sum + (c.transferSize || 0), 0) / 1024,
          sizeLimit: 200,
        },
        {
          name: 'Vendor',
          size: chunks
            .filter(c => c.name.includes('vendor'))
            .reduce((sum, c) => sum + (c.transferSize || 0), 0) / 1024,
          sizeLimit: 500,
        },
        {
          name: 'Main',
          size: chunks
            .filter(c => c.name.includes('main'))
            .reduce((sum, c) => sum + (c.transferSize || 0), 0) / 1024,
          sizeLimit: 100,
        },
        {
          name: 'Pages',
          size: chunks
            .filter(c => c.name.includes('pages'))
            .reduce((sum, c) => sum + (c.transferSize || 0), 0) / 1024,
          sizeLimit: 200,
        },
      ];

      const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);

      setMetrics({
        bundles,
        totalSize,
        totalSizeLimit: 1000,
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        cacheHitRate: calculateCacheHitRate(resources),
        renderTime: navigation.domComplete - navigation.domInteractive,
      });
    };

    // Initial collection
    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
    }

    // Update periodically
    const interval = setInterval(collectMetrics, 5000);

    return () => {
      window.removeEventListener('load', collectMetrics);
      clearInterval(interval);
    };
  }, [isVisible]);

  if (!isVisible || !metrics || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-background/95 backdrop-blur shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Bundle Metrics
            </CardTitle>
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Size */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Total Bundle Size</span>
              <span className={cn(
                "font-medium",
                metrics.totalSize > metrics.totalSizeLimit ? "text-red-600" : "text-green-600"
              )}>
                {metrics.totalSize.toFixed(0)}KB / {metrics.totalSizeLimit}KB
              </span>
            </div>
            <Progress 
              value={(metrics.totalSize / metrics.totalSizeLimit) * 100} 
              className={cn(
                "h-2",
                metrics.totalSize > metrics.totalSizeLimit && "[&>div]:bg-red-600"
              )}
            />
          </div>

          {/* Individual Bundles */}
          <div className="space-y-2">
            {metrics.bundles.map((bundle) => (
              <div key={bundle.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{bundle.name}</span>
                  <span className={cn(
                    bundle.size > bundle.sizeLimit ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {bundle.size.toFixed(0)}KB
                  </span>
                </div>
                <Progress 
                  value={(bundle.size / bundle.sizeLimit) * 100} 
                  className="h-1"
                />
              </div>
            ))}
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Load Time</div>
              <div className="text-sm font-medium">{metrics.loadTime.toFixed(0)}ms</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Cache Hit</div>
              <div className="text-sm font-medium">{metrics.cacheHitRate.toFixed(0)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Render</div>
              <div className="text-sm font-medium">{metrics.renderTime.toFixed(0)}ms</div>
            </div>
          </div>

          {/* Warnings */}
          {metrics.totalSize > metrics.totalSizeLimit * 0.9 && (
            <div className="flex items-center gap-2 text-xs text-yellow-600 pt-2 border-t">
              <AlertTriangle className="h-3 w-3" />
              <span>Bundle size approaching limit</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Calculate cache hit rate from resource timings
 */
function calculateCacheHitRate(resources: PerformanceResourceTiming[]): number {
  if (resources.length === 0) return 0;
  
  const cached = resources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0);
  return (cached.length / resources.length) * 100;
}

/**
 * Development-only performance panel
 */
export const DevelopmentPerformancePanel: React.FC = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <BundleMetrics show={true} />;
};