/// <reference path="../../types/global.d.ts" />

/**
 * Enterprise Structured Logger
 * Provides consistent, structured logging with log levels, context, and metadata.
 * Designed for production observability and debugging.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  // Request context
  request_id?: string;
  trace_id?: string;
  span_id?: string;

  // User context
  user_id?: string;
  enterprise_id?: string;

  // Service context
  service?: string;
  function_name?: string;
  version?: string;
  environment?: string;

  // Custom context
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration_ms?: number;
}

export interface LoggerOptions {
  level?: LogLevel;
  service?: string;
  version?: string;
  pretty?: boolean;
  contextDefaults?: Partial<LogContext>;
}

// ============================================================================
// LOG LEVEL UTILITIES
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

function shouldLog(currentLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[currentLevel];
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

export class Logger {
  private level: LogLevel;
  private service: string;
  private version: string;
  private pretty: boolean;
  private contextDefaults: Partial<LogContext>;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || (Deno.env.get('LOG_LEVEL') as LogLevel) || 'info';
    this.service = options.service || Deno.env.get('SERVICE_NAME') || 'pactwise-api';
    this.version = options.version || Deno.env.get('VERSION') || '1.0.0';
    this.pretty = options.pretty ?? Deno.env.get('LOG_PRETTY') === 'true';
    this.contextDefaults = options.contextDefaults || {};
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): Logger {
    const childLogger = new Logger({
      level: this.level,
      service: this.service,
      version: this.version,
      pretty: this.pretty,
      contextDefaults: { ...this.contextDefaults, ...context },
    });
    return childLogger;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Debug level log
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, undefined, metadata);
  }

  /**
   * Info level log
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, undefined, metadata);
  }

  /**
   * Warning level log
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, undefined, metadata);
  }

  /**
   * Error level log
   */
  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    this.log('error', message, error, metadata);
  }

  /**
   * Fatal level log
   */
  fatal(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    this.log('fatal', message, error, metadata);
  }

  /**
   * Log with timing information
   */
  timed<T>(
    message: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>
  ): T | Promise<T> {
    const startTime = performance.now();

    const logCompletion = (result: T, error?: Error) => {
      const duration_ms = Math.round((performance.now() - startTime) * 100) / 100;

      if (error) {
        this.log('error', `${message} - failed`, error, { ...metadata, duration_ms });
      } else {
        this.log('info', `${message} - completed`, undefined, { ...metadata, duration_ms });
      }

      return result;
    };

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result
          .then((r) => logCompletion(r))
          .catch((err) => {
            logCompletion(undefined as T, err);
            throw err;
          });
      }

      return logCompletion(result);
    } catch (error) {
      logCompletion(undefined as T, error as Error);
      throw error;
    }
  }

  /**
   * Log a request start
   */
  logRequestStart(req: Request, requestId: string): void {
    const url = new URL(req.url);

    this.info('Request started', {
      request_id: requestId,
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      user_agent: req.headers.get('user-agent'),
      content_type: req.headers.get('content-type'),
    });
  }

  /**
   * Log a request completion
   */
  logRequestEnd(
    requestId: string,
    statusCode: number,
    durationMs: number,
    metadata?: Record<string, unknown>
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.log(level, 'Request completed', undefined, {
      request_id: requestId,
      status_code: statusCode,
      duration_ms: durationMs,
      ...metadata,
    });
  }

  /**
   * Log a database query
   */
  logQuery(
    operation: string,
    table: string,
    durationMs: number,
    rowCount?: number,
    error?: Error
  ): void {
    const level = error ? 'error' : durationMs > 1000 ? 'warn' : 'debug';

    this.log(level, `Database ${operation}`, error, {
      table,
      duration_ms: durationMs,
      row_count: rowCount,
      slow_query: durationMs > 1000,
    });
  }

  /**
   * Log an external API call
   */
  logExternalCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    durationMs: number,
    error?: Error
  ): void {
    const level = error || statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.log(level, `External call to ${service}`, error, {
      external_service: service,
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: durationMs,
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>
  ): void {
    if (!shouldLog(this.level, level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        service: this.service,
        version: this.version,
        environment: Deno.env.get('ENVIRONMENT') || 'development',
        ...this.contextDefaults,
      },
    };

    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        entry.error = {
          name: 'UnknownError',
          message: String(error),
        };
      }
    }

    this.output(entry);
  }

  /**
   * Output the log entry
   */
  private output(entry: LogEntry): void {
    const output = this.pretty
      ? this.formatPretty(entry)
      : JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  /**
   * Format entry for human-readable output
   */
  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const dim = '\x1b[2m';

    const timestamp = dim + entry.timestamp + reset;
    const level = levelColors[entry.level] + entry.level.toUpperCase().padEnd(5) + reset;
    const message = entry.message;

    let output = `${timestamp} ${level} ${message}`;

    if (entry.metadata) {
      const metaStr = Object.entries(entry.metadata)
        .map(([k, v]) => `${dim}${k}=${reset}${JSON.stringify(v)}`)
        .join(' ');
      output += ` ${metaStr}`;
    }

    if (entry.error) {
      output += `\n${levelColors.error}Error: ${entry.error.name}: ${entry.error.message}${reset}`;
      if (entry.error.stack) {
        output += `\n${dim}${entry.error.stack}${reset}`;
      }
    }

    return output;
  }
}

// ============================================================================
// SINGLETON & CONVENIENCE FUNCTIONS
// ============================================================================

let defaultLogger: Logger | null = null;

/**
 * Get or create the default logger instance
 */
export function getLogger(options?: LoggerOptions): Logger {
  if (!defaultLogger || options) {
    defaultLogger = new Logger(options);
  }
  return defaultLogger;
}

/**
 * Create a logger for a specific function
 */
export function createFunctionLogger(functionName: string): Logger {
  return new Logger({
    contextDefaults: {
      function_name: functionName,
    },
  });
}

/**
 * Create a logger with request context
 */
export function createRequestLogger(req: Request): Logger {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const url = new URL(req.url);

  return new Logger({
    contextDefaults: {
      request_id: requestId,
      trace_id: req.headers.get('x-trace-id') || undefined,
      function_name: url.pathname.split('/').filter(Boolean).pop(),
    },
  });
}

/**
 * Convenience logging functions using default logger
 */
export const log = {
  debug: (message: string, metadata?: Record<string, unknown>) =>
    getLogger().debug(message, metadata),

  info: (message: string, metadata?: Record<string, unknown>) =>
    getLogger().info(message, metadata),

  warn: (message: string, metadata?: Record<string, unknown>) =>
    getLogger().warn(message, metadata),

  error: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) =>
    getLogger().error(message, error, metadata),

  fatal: (message: string, error?: Error | unknown, metadata?: Record<string, unknown>) =>
    getLogger().fatal(message, error, metadata),
};

/**
 * Performance timing helper
 */
export function createTimer(label: string): { end: (metadata?: Record<string, unknown>) => number } {
  const startTime = performance.now();

  return {
    end: (metadata?: Record<string, unknown>): number => {
      const duration = Math.round((performance.now() - startTime) * 100) / 100;
      getLogger().info(`${label} completed`, { ...metadata, duration_ms: duration });
      return duration;
    },
  };
}
