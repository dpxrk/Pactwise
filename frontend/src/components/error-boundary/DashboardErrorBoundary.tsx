'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDismissed: boolean;
}

/**
 * Dashboard Error Boundary Component
 *
 * Catches React errors in dashboard widgets and provides graceful fallback UI.
 * Allows retry without full page reload and preserves other widgets' functionality.
 *
 * Usage:
 * ```tsx
 * <DashboardErrorBoundary fallbackTitle="Contract Widget">
 *   <ContractWidget />
 * </DashboardErrorBoundary>
 * ```
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDismissed: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('Dashboard Error Boundary caught error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to monitoring service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleRetry = (): void => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDismissed: false,
    });
  };

  handleDismiss = (): void => {
    // Dismiss error and hide widget
    this.setState({
      isDismissed: true,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, isDismissed } = this.state;
    const { children, fallbackTitle, showDetails = false } = this.props;

    // If error was dismissed, don't render anything
    if (isDismissed) {
      return null;
    }

    // If no error, render children normally
    if (!hasError) {
      return children;
    }

    // Render error fallback UI
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="space-y-4">
          {/* Error Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">
                  {fallbackTitle ? `${fallbackTitle} Error` : 'Widget Error'}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>
            <button
              onClick={this.handleDismiss}
              className="p-1 rounded hover:bg-red-100 transition-colors text-red-700"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Error Details (Development Only) */}
          {showDetails && errorInfo && process.env.NODE_ENV === 'development' && (
            <details className="mt-3">
              <summary className="text-sm font-medium text-red-800 cursor-pointer hover:text-red-900">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-white border border-red-200 rounded text-xs font-mono text-red-900 overflow-auto max-h-48">
                <div className="mb-2">
                  <strong>Error:</strong> {error?.toString()}
                </div>
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={this.handleRetry}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-900 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              size="sm"
              className="text-red-700 hover:text-red-900 hover:bg-red-100"
            >
              Reload Page
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-red-600">
            If this error persists, please contact support or try refreshing the page.
          </p>
        </div>
      </Card>
    );
  }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackTitle?: string
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <DashboardErrorBoundary fallbackTitle={fallbackTitle}>
      <Component {...props} />
    </DashboardErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
