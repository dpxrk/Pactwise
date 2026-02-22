'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FallbackError } from '@/components/errors';

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
      <FallbackError
        message={fallbackTitle ? `${fallbackTitle} Error` : 'Widget Error'}
        description={error?.message || 'An unexpected error occurred'}
        technicalDetails={
          showDetails && errorInfo
            ? `Error: ${error?.toString()}\n\nComponent Stack:${errorInfo.componentStack}`
            : undefined
        }
        actions={[
          {
            label: 'Retry',
            onClick: this.handleRetry,
            primary: true,
          },
          {
            label: 'Dismiss',
            onClick: this.handleDismiss,
          },
        ]}
      />
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
