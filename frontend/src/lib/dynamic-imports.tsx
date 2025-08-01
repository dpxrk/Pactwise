import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component with better UX
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="text-center p-4 text-red-500">
    <p>Failed to load component</p>
    <details className="text-sm mt-2">
      <summary>Error details</summary>
      <pre className="text-left mt-2 p-2 bg-red-50 rounded text-xs overflow-auto">
        {error.message}
      </pre>
    </details>
  </div>
);

// Helper to create dynamic imports with consistent loading/error states
export function createDynamicImport<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || LoadingSpinner,
    ssr: options?.ssr ?? true,
  });
}

// Pre-configured dynamic imports for heavy components
export const DynamicImports = {
  // Three.js Charts
  ThreeBarChart: createDynamicImport(
    () => import('@/app/_components/three-charts/ThreeBarChart'),
    { ssr: false }
  ),
  ThreeLineChart: createDynamicImport(
    () => import('@/app/_components/three-charts/ThreeLineChart'),
    { ssr: false }
  ),
  ThreePieChart: createDynamicImport(
    () => import('@/app/_components/three-charts/ThreePieChart'),
    { ssr: false }
  ),
  ThreeAreaChart: createDynamicImport(
    () => import('@/app/_components/three-charts/ThreeAreaChart'),
    { ssr: false }
  ),
  ThreeScatterChart: createDynamicImport(
    () => import('@/app/_components/three-charts/ThreeScatterChart'),
    { ssr: false }
  ),
  
  // Analytics Components
  AnalyticsDashboard: createDynamicImport(
    () => import('@/app/_components/analytics/AnalyticsDashboard')
  ),
  VendorPerformanceMetrics: createDynamicImport(
    () => import('@/app/_components/analytics/VendorPerformanceMetrics')
  ),
  
  // Heavy UI Components
  
  // Modals (often not needed immediately)
  
  // Premium Features
  
  // AI Components
  ChatInterface: createDynamicImport(
    () => import('@/app/_components/ai/ChatInterface'),
    { ssr: false }
  ),
  AIInsights: createDynamicImport(
    () => import('@/app/_components/ai/AIInsights')
  ),
};

// Route-based code splitting helpers
export const RouteComponents = {
  // Dashboard routes
  Dashboard: createDynamicImport(
    () => import('@/app/dashboard/page')
  ),
  Contracts: createDynamicImport(
    () => import('@/app/dashboard/contracts/page')
  ),
  Vendors: createDynamicImport(
    () => import('@/app/dashboard/vendors/page')
  ),
  Analytics: createDynamicImport(
    () => import('@/app/dashboard/analytics/page')
  ),
  Templates: createDynamicImport(
    () => import('@/app/dashboard/contracts/templates/page')
  ),
  Settings: createDynamicImport(
    () => import('@/app/dashboard/settings/page')
  ),
};

// Utility function to preload components
export function preloadComponent(componentKey: keyof typeof DynamicImports) {
  const component = DynamicImports[componentKey];
  if (component && typeof component.preload === 'function') {
    component.preload();
  }
}

// Hook to preload components on hover/focus
export function usePreloadOnInteraction(componentKey: keyof typeof DynamicImports) {
  return {
    onMouseEnter: () => preloadComponent(componentKey),
    onFocus: () => preloadComponent(componentKey),
  };
}