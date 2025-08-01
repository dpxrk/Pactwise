/**
 * Production-ready logger utility for Pactwise
 * Provides structured logging with different log levels and context
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty print for development
      const { timestamp, level, message, context, error } = entry;
      let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      if (context) {
        log += `\nContext: ${JSON.stringify(context, null, 2)}`;
      }
      if (error) {
        log += `\nError: ${error.message}\nStack: ${error.stack}`;
      }
      return log;
    }
    // JSON format for production
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || undefined,
      error: error || undefined,
    };

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case 'debug':
        console.debug(formattedLog);
        break;
      case 'info':
        console.log(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'error':
        console.error(formattedLog);
        // In production, send errors to monitoring service
        if (!this.isDevelopment && typeof window !== 'undefined' && window.Sentry) {
          window.Sentry.captureException(error || new Error(message), {
            extra: context,
          });
        }
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, context, error);
  }

  // Performance logging
  time(label: string) {
    if (this.shouldLog('debug')) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports for common use cases
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context);

// Extend window interface for Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: Record<string, unknown>) => void;
    };
  }
}