// Global Error Handler for centralized error management
import { AppErrorContext, ErrorDetails } from '@/types/core-entities';

// Error types and categories
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'auth' | 'validation' | 'permission' | 'api' | 'system' | 'user';

export interface AppError {
  id: string;
  message: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  stack?: string;
  metadata?: Record<string, any>;
  userMessage?: string; // User-friendly message
  actionable?: boolean; // Can the user do something about it?
  retryable?: boolean; // Can this operation be retried?
}

export interface ErrorContext {
  userId?: string;
  enterpriseId?: string;
  route?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, any>;
}

// Error reporting interface
export interface ErrorReporter {
  reportError(error: AppError, context?: ErrorContext): Promise<void>;
}

// Console error reporter (development)
class ConsoleErrorReporter implements ErrorReporter {
  async reportError(error: AppError, context?: ErrorContext): Promise<void> {
    console.group(`🚨 [${error.severity.toUpperCase()}] ${error.category} Error`);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Time:', error.timestamp.toISOString());
    if (context) console.error('Context:', context);
    if (error.stack) console.error('Stack:', error.stack);
    if (error.metadata) console.error('Metadata:', error.metadata);
    console.groupEnd();
  }
}

// Production error reporter (would integrate with services like Sentry, LogRocket, etc.)
class ProductionErrorReporter implements ErrorReporter {
  async reportError(error: AppError, context?: ErrorContext): Promise<void> {
    // In production, send to error tracking service
    try {
      // Example integration with error tracking service
      // await sendToErrorService({
      //   errorId: error.id,
      //   message: error.message,
      //   severity: error.severity,
      //   category: error.category,
      //   context,
      //   timestamp: error.timestamp,
      //   stack: error.stack,
      //   metadata: error.metadata,
      // });

      // For now, still log to console in production for debugging
      if (error.severity === 'critical' || error.severity === 'high') {
        console.error(`[${error.severity}] ${error.message}`, { error, context });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }
}

// Global error handler class
class GlobalErrorHandler {
  private reporters: ErrorReporter[] = [];
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.setupReporters();
    this.setupGlobalHandlers();
  }

  private setupReporters() {
    if (process.env.NODE_ENV === 'development') {
      this.reporters.push(new ConsoleErrorReporter());
    } else {
      this.reporters.push(new ProductionErrorReporter());
    }
  }

  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          action: 'unhandled_promise_rejection',
          metadata: { url: window.location.href }
        });
      });

      // Handle global JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(new Error(event.message), {
          action: 'global_error',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            url: window.location.href
          }
        });
      });
    }
  }

  // Convert various error types to AppError
  private normalizeError(error: unknown, context?: ErrorContext): AppError {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    // Handle API errors (placeholder for Supabase errors)
    if (error instanceof Error && error.name === 'APIError') {
      return {
        id: errorId,
        message: error.message,
        code: 'API_ERROR',
        category: this.categorizeAPIError(error),
        severity: this.getSeverityForAPIError(error),
        timestamp,
        userMessage: this.getUserFriendlyMessage(error),
        actionable: true,
        retryable: this.isRetryableAPIError(error),
        metadata: { originalError: error }
      };
    }

    // Handle network errors
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        id: errorId,
        message: error.message,
        code: 'NETWORK_ERROR',
        category: 'network',
        severity: 'medium',
        timestamp,
        stack: error.stack || undefined,
        userMessage: 'Network connection error. Please check your internet connection.',
        actionable: true,
        retryable: true,
        metadata: { url: context?.metadata?.url }
      };
    }

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('auth') || error.message.includes('unauthorized'))) {
      return {
        id: errorId,
        message: error.message,
        code: 'AUTH_ERROR',
        category: 'auth',
        severity: 'high',
        timestamp,
        stack: error.stack || undefined,
        userMessage: 'Authentication error. Please log in again.',
        actionable: true,
        retryable: false,
      };
    }

    // Handle validation errors
    if (error instanceof Error && (error.name === 'ValidationError' || error.message.includes('validation'))) {
      return {
        id: errorId,
        message: error.message,
        code: 'VALIDATION_ERROR',
        category: 'validation',
        severity: 'medium',
        timestamp,
        userMessage: 'Please check your input and try again.',
        actionable: true,
        retryable: false,
        metadata: (error as { details?: unknown; errors?: unknown }).details || (error as { details?: unknown; errors?: unknown }).errors || {} as Record<string, any>
      };
    }

    // Default error handling
    return {
      id: errorId,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: (error as { code?: string }).code || 'UNKNOWN_ERROR',
      category: 'system',
      severity: 'medium',
      timestamp,
      stack: error instanceof Error ? (error.stack || undefined) : undefined,
      userMessage: 'Something went wrong. Please try again.',
      actionable: true,
      retryable: true,
      metadata: { originalError: error }
    };
  }

  private categorizeAPIError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    if (message.includes('auth') || message.includes('unauthorized')) return 'auth';
    if (message.includes('permission') || message.includes('access')) return 'permission';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';
    if (message.includes('network') || message.includes('timeout')) return 'network';
    return 'api';
  }

  private getSeverityForAPIError(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    if (message.includes('critical') || message.includes('security')) return 'critical';
    if (message.includes('auth') || message.includes('permission')) return 'high';
    if (message.includes('validation') || message.includes('not found')) return 'medium';
    return 'low';
  }

  private isRetryableAPIError(error: Error): boolean {
    const message = error.message.toLowerCase();
    // Don't retry auth, permission, or validation errors
    if (message.includes('auth') || message.includes('permission') || message.includes('validation')) {
      return false;
    }
    return true;
  }

  private getUserFriendlyMessage(error: unknown): string {
    const message = error instanceof Error ? error.message?.toLowerCase() : '';
    
    if (message.includes('not found')) {
      return 'The requested item could not be found.';
    }
    if (message.includes('unauthorized') || message.includes('auth')) {
      return 'You are not authorized to perform this action.';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and try again.';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network connection error. Please try again.';
    }
    if (message.includes('duplicate') || message.includes('already exists')) {
      return 'This item already exists. Please use a different name.';
    }
    
    return 'Something went wrong. Please try again or contact support if the problem persists.';
  }

  // Main error handling method
  public async handleError(error: Error | unknown, context?: ErrorContext): Promise<AppError> {
    const appError = this.normalizeError(error, context);

    // Add to history
    this.addToHistory(appError);

    // Report to all configured reporters
    await Promise.all(
      this.reporters.map(reporter => 
        reporter.reportError(appError, context).catch(reportError => 
          console.error('Error reporter failed:', reportError)
        )
      )
    );

    return appError;
  }

  // Convenience methods for specific error types
  public async handleApiError(error: Error | unknown, endpoint?: string, operation?: string): Promise<AppError> {
    return this.handleError(error, {
      action: 'api_call',
      metadata: { endpoint, operation }
    });
  }

  public async handleUserError(error: Error | unknown, userId?: string, action?: string): Promise<AppError> {
    const context: ErrorContext = {};
    if (userId) context.userId = userId;
    if (action) context.action = action;
    
    return this.handleError(error, context);
  }

  public async handleComponentError(error: Error | unknown, component: string, props?: Record<string, unknown>): Promise<AppError> {
    return this.handleError(error, {
      component,
      action: 'component_render',
      metadata: { props }
    });
  }

  // Error history management
  private addToHistory(error: AppError) {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  public getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  public getRecentErrors(count = 10): AppError[] {
    return this.errorHistory.slice(0, count);
  }

  public getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errorHistory.filter(error => error.category === category);
  }

  public getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorHistory.filter(error => error.severity === severity);
  }

  public clearHistory(): void {
    this.errorHistory = [];
  }

  // Error statistics
  public getErrorStats() {
    const total = this.errorHistory.length;
    const byCategory = this.errorHistory.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const bySeverity = this.errorHistory.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recentErrors = this.errorHistory.filter(
      error => error.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      total,
      recentErrors,
      byCategory,
      bySeverity,
    };
  }
}

// Create global instance
export const globalErrorHandler = new GlobalErrorHandler();

// Export convenience functions
export const handleError = (error: unknown, context?: ErrorContext) => 
  globalErrorHandler.handleError(error, context);

export const handleApiError = (error: unknown, endpoint?: string, operation?: string) =>
  globalErrorHandler.handleApiError(error, endpoint, operation);

export const handleUserError = (error: unknown, userId?: string, action?: string) =>
  globalErrorHandler.handleUserError(error, userId, action);

export const handleComponentError = (error: unknown, component: string, props?: Record<string, unknown>) =>
  globalErrorHandler.handleComponentError(error, component, props);

// React hook for error handling
export const useErrorHandler = () => {
  return {
    handleError,
    handleApiError,
    handleUserError,
    handleComponentError,
    getErrorHistory: () => globalErrorHandler.getErrorHistory(),
    getErrorStats: () => globalErrorHandler.getErrorStats(),
  };
};

export default globalErrorHandler;