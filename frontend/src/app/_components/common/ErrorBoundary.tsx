'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showErrorDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only catches errors in this component tree
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  isExpanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    eventId: null,
    isExpanded: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      eventId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (e.g., Sentry, LogRocket)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      eventId: this.state.eventId,
    };

    // Send to Sentry
    if (typeof window !== 'undefined') {
      import('../../../lib/monitoring').then(({ reportError }) => {
        reportError(error, {
          contexts: { 
            react: errorInfo,
            errorBoundary: {
              eventId: this.state.eventId,
              isolate: this.props.isolate || false,
              componentStack: errorInfo.componentStack
            }
          },
          tags: {
            errorBoundary: 'true',
            component: 'ErrorBoundary',
            isolate: this.props.isolate ? 'true' : 'false'
          },
          extra: errorReport
        });
      }).catch(err => {
        console.error('Failed to report error to monitoring:', err);
      });
    }
    
    // For development, also log to console
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Report:', errorReport);
      console.groupEnd();
    }
  };

  private handleRetry = () => {
    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      isExpanded: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private copyErrorDetails = () => {
    const { error, errorInfo, eventId } = this.state;
    const errorDetails = {
      eventId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // You could show a toast here
        console.log('Error details copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy error details:', err);
      });
  };

  private getErrorSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
    const { error } = this.state;
    if (!error) return 'medium';

    // Classify errors by type/message
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading')) {
      return 'low'; // Network/loading issues
    }
    if (error.message.includes('TypeError') || error.message.includes('ReferenceError')) {
      return 'high'; // Code errors
    }
    if (error.message.includes('SecurityError') || error.message.includes('auth')) {
      return 'critical'; // Security issues
    }
    
    return 'medium'; // Default
  };

  private getErrorCategory = (): string => {
    const { error } = this.state;
    if (!error) return 'Unknown';

    if (error.message.includes('ChunkLoadError')) return 'Network';
    if (error.message.includes('TypeError')) return 'Code';
    if (error.message.includes('auth') || error.message.includes('permission')) return 'Authentication';
    if (error.message.includes('fetch') || error.message.includes('API')) return 'API';
    
    return 'Application';
  };

  public override render() {
    const { hasError, error, errorInfo, eventId, isExpanded } = this.state;
    const { children, fallback, showErrorDetails = true } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      const severity = this.getErrorSeverity();
      const category = this.getErrorCategory();

      const severityColors = {
        low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
        high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
        critical: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
      };

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl text-foreground">Something went wrong</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={severityColors[severity]}>
                      {severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{category}</Badge>
                    {eventId && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {eventId}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="mt-2">
                  {error?.message || 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'}
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleReload}>
                  Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Error Details (Collapsible) */}
              {showErrorDetails && (error || errorInfo) && (
                <>
                  <Separator />
                  <Collapsible open={isExpanded} onOpenChange={(expanded) => this.setState({ isExpanded: expanded })}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Bug className="h-4 w-4" />
                          Technical Details
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isExpanded ? 'Hide' : 'Show'}
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      {error && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Error Message:</h4>
                          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                            {error.message}
                          </pre>
                        </div>
                      )}

                      {error?.stack && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Stack Trace:</h4>
                          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                            {error.stack}
                          </pre>
                        </div>
                      )}

                      {errorInfo?.componentStack && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Component Stack:</h4>
                          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={this.copyErrorDetails}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-3 w-3" />
                          Copy Details
                        </Button>
                        {process.env.NODE_ENV === 'development' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => console.error('Error:', error, 'ErrorInfo:', errorInfo)}
                            className="flex items-center gap-2"
                          >
                            <Bug className="h-3 w-3" />
                            Log to Console
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {/* Help Text */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p className="font-medium mb-1">Need help?</p>
                <p>
                  If this error persists, please contact our support team with the error ID above.
                  We're here to help resolve any issues you encounter.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// HOC wrapper for functional components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

// Simple error boundary for specific use cases
export const SimpleErrorBoundary: React.FC<{ children: ReactNode; message?: string }> = ({ 
  children, 
  message = "Something went wrong with this component." 
}) => (
  <ErrorBoundary 
    fallback={
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    }
    showErrorDetails={false}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;