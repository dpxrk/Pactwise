/// <reference path="../../types/global.d.ts" />

/**
 * Retry utility with exponential backoff and jitter
 * Provides resilient operations for network calls and external APIs
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  exponentialBase?: number;
  jitter?: boolean;
  retryOn?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  timeout?: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDurationMs: number;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryOn' | 'onRetry' | 'timeout'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBase: 2,
  jitter: true,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  exponentialBase: number,
  jitter: boolean,
): number {
  // Exponential backoff: base * (exponentialBase ^ attempt)
  let delay = baseDelay * Math.pow(exponentialBase, attempt);

  // Apply max delay cap
  delay = Math.min(delay, maxDelay);

  // Add jitter (random value between 0 and delay/2)
  if (jitter) {
    const jitterAmount = Math.random() * delay * 0.5;
    delay = delay + jitterAmount;
  }

  return Math.round(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
function defaultRetryCondition(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Retry on network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('socket hang up') ||
    message.includes('fetch failed')
  ) {
    return true;
  }

  // Retry on rate limiting
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return true;
  }

  // Retry on server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true;
  }

  // Don't retry on client errors (4xx except 429)
  if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
    return false;
  }

  // Default: don't retry unknown errors
  return false;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Execute a function with retry logic
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise with result including success status, data, and attempt info
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    exponentialBase,
    jitter,
  } = { ...DEFAULT_OPTIONS, ...options };

  const retryOn = options.retryOn || defaultRetryCondition;
  const onRetry = options.onRetry;
  const timeout = options.timeout;

  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wrap with timeout if specified
      let result: T;
      if (timeout) {
        result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
          ),
        ]);
      } else {
        result = await fn();
      }

      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = attempt < maxRetries && retryOn(lastError, attempt);

      if (!shouldRetry) {
        break;
      }

      // Calculate delay
      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs, exponentialBase, jitter);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(lastError, attempt, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: Math.min(maxRetries + 1, maxRetries + 1),
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * Execute a function with retry, throwing on failure
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise with the result
 * @throws Error if all retries fail
 */
export async function retryOrThrow<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const result = await withRetry(fn, options);

  if (!result.success) {
    const error = result.error || new Error('All retry attempts failed');
    (error as Error & { attempts: number }).attempts = result.attempts;
    throw error;
  }

  return result.data!;
}

/**
 * Create a retryable version of a function
 * @param fn - Function to wrap with retry logic
 * @param options - Retry configuration options
 * @returns Wrapped function with retry behavior
 */
export function createRetryable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {},
): (...args: Parameters<T>) => Promise<RetryResult<Awaited<ReturnType<T>>>> {
  return async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args) as Promise<Awaited<ReturnType<T>>>, options);
  };
}

// ============================================================================
// SPECIALIZED RETRY FUNCTIONS
// ============================================================================

/**
 * Retry specifically for fetch requests
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const defaultFetchOptions: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    timeout: 30000,
    retryOn: (error) => {
      // Check for network errors
      if (defaultRetryCondition(error)) {
        return true;
      }
      return false;
    },
  };

  return retryOrThrow(
    async () => {
      const response = await fetch(url, init);

      // Throw on certain status codes to trigger retry
      if (response.status === 429 || response.status >= 500) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body}`);
      }

      return response;
    },
    { ...defaultFetchOptions, ...options },
  );
}

/**
 * Retry for database operations
 */
export async function dbOperationWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const dbRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    retryOn: (error) => {
      const message = error.message.toLowerCase();
      // Retry on connection issues
      if (
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('deadlock') ||
        message.includes('serialization failure')
      ) {
        return true;
      }
      return false;
    },
    ...options,
  };

  return retryOrThrow(operation, dbRetryOptions);
}

/**
 * Retry for external API calls
 */
export async function externalApiWithRetry<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const apiRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    jitter: true,
    retryOn: (error) => {
      const message = error.message.toLowerCase();
      // Don't retry on auth errors
      if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('invalid api key')) {
        return false;
      }
      // Retry on rate limits with longer delay
      if (message.includes('rate limit') || message.includes('429')) {
        return true;
      }
      return defaultRetryCondition(error);
    },
    ...options,
  };

  return withRetry(apiCall, apiRetryOptions);
}

// ============================================================================
// CIRCUIT BREAKER INTEGRATION
// ============================================================================

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Execute with circuit breaker pattern
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options: {
    failureThreshold?: number;
    resetTimeout?: number;
    retryOptions?: RetryOptions;
  } = {},
): Promise<RetryResult<T>> {
  const { failureThreshold = 5, resetTimeout = 60000, retryOptions = {} } = options;

  // Get or create circuit state
  let state = circuitBreakers.get(name);
  if (!state) {
    state = { failures: 0, lastFailure: 0, state: 'closed' };
    circuitBreakers.set(name, state);
  }

  // Check circuit state
  if (state.state === 'open') {
    const timeSinceFailure = Date.now() - state.lastFailure;
    if (timeSinceFailure >= resetTimeout) {
      // Move to half-open
      state.state = 'half-open';
    } else {
      // Circuit is open, fail fast
      return {
        success: false,
        error: new Error(`Circuit breaker '${name}' is open`),
        attempts: 0,
        totalDurationMs: 0,
      };
    }
  }

  // Execute with retry
  const result = await withRetry(fn, retryOptions);

  if (result.success) {
    // Reset on success
    state.failures = 0;
    state.state = 'closed';
  } else {
    // Track failure
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= failureThreshold) {
      state.state = 'open';
    }
  }

  return result;
}
