'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
// import { useMutation, useQuery } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
import { 
  performanceTracker, 
  userAnalytics, 
  errorTracker, 
  healthMonitor,
  measurePerformance 
} from '@/lib/monitoring';

interface MonitoringContextType {
  trackEvent: (event: string, properties?: Record<string, unknown>) => void;
  captureError: (error: Error, context?: Record<string, unknown>) => void;
  measureRender: (componentName: string, renderFn: () => void) => void;
  healthStatus: Record<string, boolean>;
  isHealthy: boolean;
}

const MonitoringContext = createContext<MonitoringContextType | null>(null);

interface MonitoringProviderProps {
  children: ReactNode;
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({ children }) => {
  const { userId } = useAuth();
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});
  const [isHealthy, setIsHealthy] = useState(true);

  // TODO: Replace with Supabase implementation
  const logAnalyticsEvent = async (data: Record<string, unknown>) => {
    // Stub for Supabase implementation
    console.log('Analytics event:', data);
  };
  const logAnalyticsEventBatch = async (data: { events: Record<string, unknown>[] }) => {
    // Stub for Supabase implementation
    console.log('Analytics batch:', data);
  };
  const reportError = async (data: Record<string, unknown>) => {
    // Stub for Supabase implementation
    console.log('Error report:', data);
  };
  const healthQuery = null;

  // Set up global analytics bridge
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & { convexAnalytics?: unknown }).convexAnalytics = {
        logEvent: async (event: string, properties: Record<string, unknown> = {}) => {
          try {
            await logAnalyticsEvent({
              event,
              timestamp: Date.now(),
              url: window.location.href,
              userId: userId || undefined,
              properties,
              sessionId: userAnalytics.getSessionId(),
              userAgent: navigator.userAgent,
            });
          } catch (error) {
            // Failed to log analytics event
          }
        },
        
        logEventBatch: async (events: Array<{
          event: string;
          timestamp: number;
          url: string;
          userId?: string;
          properties?: Record<string, unknown>;
          sessionId: string;
          userAgent?: string;
        }>) => {
          try {
            const formattedEvents = events.map(event => ({
              event: event.event,
              timestamp: event.timestamp,
              url: event.url,
              userId: event.userId,
              properties: event.properties,
              sessionId: event.sessionId,
              userAgent: navigator.userAgent,
            }));
            await logAnalyticsEventBatch({ events: formattedEvents });
          } catch (error) {
            // Failed to log analytics batch
          }
        },
        
        reportError: async (errorData: {
          message: string;
          stack?: string;
          timestamp: number;
          url: string;
          userId?: string;
          sessionId: string;
          userAgent?: string;
          context?: Record<string, unknown>;
        }) => {
          try {
            await reportError({
              message: errorData.message,
              stack: errorData.stack,
              timestamp: errorData.timestamp,
              url: errorData.url,
              userId: errorData.userId,
              sessionId: errorData.sessionId,
              userAgent: errorData.userAgent,
              context: errorData.context,
            });
          } catch (error) {
            // Failed to report error
          }
        },
        
        getHealthStatus: () => healthQuery,
      };
    }
  }, [logAnalyticsEvent, logAnalyticsEventBatch, reportError, healthQuery, userId]);

  useEffect(() => {
    // Update health status periodically
    const updateHealthStatus = () => {
      const status = healthMonitor.getHealthStatus();
      const healthy = healthMonitor.isHealthy();
      
      // TODO: Include Supabase health status
      // Temporarily set to true until Supabase implementation
      status.database = true;
      
      setHealthStatus(status);
      setIsHealthy(Object.values(status).every(Boolean));
    };

    // Initial check
    updateHealthStatus();

    // Set up periodic health checks
    const interval = setInterval(updateHealthStatus, 60000); // Every minute

    return () => {
      clearInterval(interval);
    };
  }, [healthQuery]);

  const trackEvent = (event: string, properties?: Record<string, unknown>) => {
    userAnalytics.track(event, properties, userId || undefined);
  };

  const captureError = (error: Error, context?: Record<string, unknown>) => {
    errorTracker.captureError(error, context, userId || undefined);
  };

  const measureRender = (componentName: string, renderFn: () => void) => {
    measurePerformance.measureRender(componentName, renderFn);
  };

  const contextValue: MonitoringContextType = {
    trackEvent,
    captureError,
    measureRender,
    healthStatus,
    isHealthy,
  };

  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = (): MonitoringContextType => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};

// HOC for automatic component performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const WithPerformanceTrackingComponent = (props: P) => {
    const { measureRender } = useMonitoring();
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';

    useEffect(() => {
      measureRender(name, () => {
        // Component rendered
      });
    });

    return <WrappedComponent {...props} />;
  };

  WithPerformanceTrackingComponent.displayName = `withPerformanceTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;

  return WithPerformanceTrackingComponent;
}

// Hook for tracking user interactions
export const useUserTracking = () => {
  const { trackEvent } = useMonitoring();

  const trackClick = (element: string, properties?: Record<string, unknown>) => {
    trackEvent('user_click', { element, ...properties });
  };

  const trackView = (page: string, properties?: Record<string, unknown>) => {
    trackEvent('page_view', { page, ...properties });
  };

  const trackSearch = (query: string, results: number, properties?: Record<string, unknown>) => {
    trackEvent('search', { query, results, ...properties });
  };

  const trackFormSubmit = (formName: string, properties?: Record<string, unknown>) => {
    trackEvent('form_submit', { form: formName, ...properties });
  };

  const trackFeatureUsage = (feature: string, properties?: Record<string, unknown>) => {
    trackEvent('feature_usage', { feature, ...properties });
  };

  return {
    trackClick,
    trackView,
    trackSearch,
    trackFormSubmit,
    trackFeatureUsage,
  };
};

// Health status indicator component
export const HealthIndicator: React.FC = () => {
  const { healthStatus, isHealthy } = useMonitoring();

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className={`fixed bottom-4 right-4 p-2 rounded-md text-xs ${
      isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <div className="font-medium">System Health</div>
      {Object.entries(healthStatus).map(([check, healthy]) => (
        <div key={check} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} />
          {check}
        </div>
      ))}
    </div>
  );
};

export default MonitoringProvider;
