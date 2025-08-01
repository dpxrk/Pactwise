'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner'; // Using Sonner for toast notifications
import { globalErrorHandler, AppError, ErrorSeverity } from '@/lib/error-handler';
import { AlertTriangle, X, Bug, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
  showToasts?: boolean;
  showErrorDialog?: boolean;
  maxToasts?: number;
  toastDuration?: number;
}

// Error notification component
const ErrorToast = ({ error, onDismiss, onViewDetails }: {
  error: AppError;
  onDismiss: () => void;
  onViewDetails?: () => void;
}) => {
  const severityIcons = {
    low: '🔵',
    medium: '🟡', 
    high: '🟠',
    critical: '🔴'
  };

  const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-900',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    high: 'bg-orange-50 border-orange-200 text-orange-900',
    critical: 'bg-red-50 border-red-200 text-red-900'
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 border rounded-lg shadow-lg max-w-md',
      severityColors[error.severity]
    )}>
      <span className="text-lg">{severityIcons[error.severity]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{error.category.toUpperCase()}</span>
          <Badge variant="outline" className="text-xs">
            {error.severity}
          </Badge>
        </div>
        <p className="text-sm mb-2">{error.userMessage || error.message}</p>
        <div className="flex items-center gap-2">
          {error.retryable && (
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {onViewDetails && (
            <Button size="sm" variant="ghost" onClick={onViewDetails} className="h-7 text-xs">
              Details
            </Button>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Error details dialog
const ErrorDetailsDialog = ({ error, isOpen, onClose }: {
  error: AppError | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!error) return null;

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString();
  };

  const copyErrorDetails = () => {
    const details = {
      id: error.id,
      message: error.message,
      code: error.code,
      category: error.category,
      severity: error.severity,
      timestamp: error.timestamp.toISOString(),
      stack: error.stack,
      metadata: error.metadata
    };

    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
      .then(() => {
        toast.success('Error details copied to clipboard');
      })
      .catch(() => {
        toast.error('Failed to copy error details');
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Details
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {/* Error Summary */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {error.category.toUpperCase()} Error - {error.severity.toUpperCase()}
              </AlertTitle>
              <AlertDescription className="mt-2">
                {error.userMessage || error.message}
              </AlertDescription>
            </Alert>

            {/* Error Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Error Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <code className="text-xs bg-muted px-1 rounded">{error.id}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span>{error.code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <Badge variant="outline">{error.category}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severity:</span>
                    <Badge variant="outline">{error.severity}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="text-xs">{formatTimestamp(error.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Error Flags</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Actionable:</span>
                    <Badge variant={error.actionable ? "default" : "secondary"}>
                      {error.actionable ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Retryable:</span>
                    <Badge variant={error.retryable ? "default" : "secondary"}>
                      {error.retryable ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div>
              <h4 className="font-medium text-sm mb-2">Technical Message</h4>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                {error.message}
              </pre>
            </div>

            {/* Stack Trace */}
            {error.stack && (
              <div>
                <h4 className="font-medium text-sm mb-2">Stack Trace</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </div>
            )}

            {/* Metadata */}
            {error.metadata && (
              <div>
                <h4 className="font-medium text-sm mb-2">Additional Data</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                  {JSON.stringify(error.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={copyErrorDetails}>
            Copy Details
          </Button>
          <div className="flex gap-2">
            {error.retryable && (
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Action
              </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main global error handler component
export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({
  children,
  showToasts = true,
  showErrorDialog = true,
  maxToasts = 5,
  toastDuration = 5000
}) => {
  const [activeToasts, setActiveToasts] = useState<AppError[]>([]);
  const [selectedError, setSelectedError] = useState<AppError | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!showToasts) return;

    // Subscribe to errors from the global error handler
    const handleNewError = (error: AppError) => {
      // Don't show toasts for low severity errors unless they're actionable
      if (error.severity === 'low' && !error.actionable) {
        return;
      }

      // Add to active toasts
      setActiveToasts(prev => {
        const newToasts = [error, ...prev].slice(0, maxToasts);
        return newToasts;
      });

      // Auto-dismiss toast after duration (except for critical errors)
      if (error.severity !== 'critical') {
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== error.id));
        }, toastDuration);
      }

      // Use sonner for simpler notifications for non-critical errors
      if (error.severity === 'low' || error.severity === 'medium') {
        const toastFn = error.severity === 'low' ? toast.info : toast.warning;
        toastFn(error.userMessage || error.message, {
          description: `${error.category} error`,
          duration: toastDuration,
        });
      }
    };

    // Since we can't directly subscribe to the global error handler,
    // we'll use a custom event system
    const handleGlobalError = (event: CustomEvent<AppError>) => {
      handleNewError(event.detail);
    };

    window.addEventListener('app-error', handleGlobalError as EventListener);

    return () => {
      window.removeEventListener('app-error', handleGlobalError as EventListener);
    };
  }, [showToasts, maxToasts, toastDuration]);

  const dismissToast = (errorId: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== errorId));
  };

  const viewErrorDetails = (error: AppError) => {
    setSelectedError(error);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedError(null);
  };

  return (
    <>
      {children}
      
      {/* Error Toasts */}
      {showToasts && activeToasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {activeToasts.map(error => {
            const toastProps: {
              key: string;
              error: AppError;
              onDismiss: () => void;
              onViewDetails?: () => void;
            } = {
              key: error.id,
              error: error,
              onDismiss: () => dismissToast(error.id),
            };
            if (showErrorDialog) {
              toastProps.onViewDetails = () => viewErrorDetails(error);
            }
            return <ErrorToast {...toastProps} />;
          })}
        </div>
      )}

      {/* Error Details Dialog */}
      {showErrorDialog && (
        <ErrorDetailsDialog
          error={selectedError}
          isOpen={isDialogOpen}
          onClose={closeDialog}
        />
      )}
    </>
  );
};

// HOC to wrap the entire app with error handling
export const withGlobalErrorHandler = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: Omit<GlobalErrorHandlerProps, 'children'>
) => {
  const WithGlobalErrorHandlerComponent = (props: P) => (
    <GlobalErrorHandler {...config}>
      <WrappedComponent {...props} />
    </GlobalErrorHandler>
  );

  WithGlobalErrorHandlerComponent.displayName = `withGlobalErrorHandler(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithGlobalErrorHandlerComponent;
};

// Utility function to trigger error events
export const triggerErrorEvent = (error: AppError) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-error', { detail: error }));
  }
};

// Enhanced error handler that also triggers events
export const handleErrorWithNotification = async (error: unknown, context?: ErrorContext) => {
  const appError = await globalErrorHandler.handleError(error, context);
  triggerErrorEvent(appError);
  
  // Also report to Sentry
  if (typeof window !== 'undefined') {
    try {
      const { reportError } = await import('@/lib/monitoring');
      await reportError(error, {
        contexts: {
          appError: {
            id: appError.id,
            category: appError.category,
            severity: appError.severity,
            actionable: appError.actionable,
            retryable: appError.retryable,
          },
        },
        tags: {
          category: appError.category,
          severity: appError.severity,
          source: 'global_error_handler',
        },
        level: appError.severity === 'critical' ? 'fatal' : 
               appError.severity === 'high' ? 'error' :
               appError.severity === 'medium' ? 'warning' : 'info',
        extra: {
          ...context,
          userMessage: appError.userMessage,
          metadata: appError.metadata,
        },
      });
    } catch (monitoringError) {
      console.error('Failed to report error to monitoring:', monitoringError);
    }
  }
  
  return appError;
};

export default GlobalErrorHandler;