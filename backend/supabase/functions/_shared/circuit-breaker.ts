/// <reference path="../../types/global.d.ts" />

import { getLogger } from './logger.ts';

/**
 * Enterprise Circuit Breaker
 * Protects external service calls from cascading failures.
 * Implements the circuit breaker pattern with configurable thresholds.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  // Service identification
  name: string;

  // Failure thresholds
  failureThreshold?: number;      // Number of failures before opening (default: 5)
  successThreshold?: number;      // Number of successes in half-open before closing (default: 2)

  // Timing
  timeout?: number;               // Request timeout in ms (default: 10000)
  resetTimeout?: number;          // Time in ms before attempting reset (default: 30000)

  // Monitoring
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  onFailure?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface CircuitStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  openedAt?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

// ============================================================================
// CIRCUIT BREAKER CLASS
// ============================================================================

export class CircuitBreaker {
  private readonly name: string;
  private state: CircuitState = 'closed';

  // Thresholds
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  // Counters
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private openedAt?: Date;

  // Statistics
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  // Callbacks
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;
  private readonly onFailure?: (error: Error) => void;
  private readonly onSuccess?: () => void;

  // Logger
  private readonly logger = getLogger();

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 10000;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.onStateChange = options.onStateChange;
    this.onFailure = options.onFailure;
    this.onSuccess = options.onSuccess;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitOpenError(
          `Circuit breaker "${this.name}" is open. Service unavailable.`,
          this.name
        );
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.handleSuccess();
      return result;
    } catch (error) {
      this.handleFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Request timeout after ${this.timeout}ms`, this.name));
      }, this.timeout);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful execution
   */
  private handleSuccess(): void {
    this.successes++;
    this.totalSuccesses++;
    this.lastSuccess = new Date();
    this.failures = 0;

    this.onSuccess?.();

    if (this.state === 'half-open' && this.successes >= this.successThreshold) {
      this.transitionTo('closed');
    }

    this.logger.debug(`Circuit "${this.name}" success`, {
      state: this.state,
      successes: this.successes,
    });
  }

  /**
   * Handle failed execution
   */
  private handleFailure(error: Error): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailure = new Date();
    this.successes = 0;

    this.onFailure?.(error);

    this.logger.warn(`Circuit "${this.name}" failure`, {
      state: this.state,
      failures: this.failures,
      error: error.message,
    });

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.state === 'closed' && this.failures >= this.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'open') {
      this.openedAt = new Date();
    }

    if (newState === 'closed') {
      this.failures = 0;
      this.successes = 0;
      this.openedAt = undefined;
    }

    if (newState === 'half-open') {
      this.successes = 0;
    }

    this.logger.info(`Circuit "${this.name}" state change`, {
      from: oldState,
      to: newState,
    });

    this.onStateChange?.(oldState, newState);
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return true;
    return Date.now() - this.openedAt.getTime() >= this.resetTimeout;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitStats {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      openedAt: this.openedAt,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('closed');
    this.logger.info(`Circuit "${this.name}" manually reset`);
  }

  /**
   * Check if circuit is healthy (closed or half-open)
   */
  isHealthy(): boolean {
    return this.state !== 'open';
  }

  /**
   * Get the error rate as a percentage
   */
  getErrorRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.totalFailures / this.totalRequests) * 100;
  }
}

// ============================================================================
// CIRCUIT BREAKER ERRORS
// ============================================================================

export class CircuitOpenError extends Error {
  public readonly serviceName: string;
  public readonly isCircuitOpen = true;

  constructor(message: string, serviceName: string) {
    super(message);
    this.name = 'CircuitOpenError';
    this.serviceName = serviceName;
  }
}

export class TimeoutError extends Error {
  public readonly serviceName: string;
  public readonly isTimeout = true;

  constructor(message: string, serviceName: string) {
    super(message);
    this.name = 'TimeoutError';
    this.serviceName = serviceName;
  }
}

// ============================================================================
// CIRCUIT BREAKER REGISTRY
// ============================================================================

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service
 */
export function getCircuitBreaker(
  name: string,
  options?: Omit<CircuitBreakerOptions, 'name'>
): CircuitBreaker {
  let breaker = circuitBreakers.get(name);

  if (!breaker) {
    breaker = new CircuitBreaker({ name, ...options });
    circuitBreakers.set(name, breaker);
  }

  return breaker;
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitStats(): CircuitStats[] {
  return Array.from(circuitBreakers.values()).map(cb => cb.getStats());
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuits(): void {
  circuitBreakers.forEach(cb => cb.reset());
}

// ============================================================================
// PRE-CONFIGURED CIRCUIT BREAKERS FOR COMMON SERVICES
// ============================================================================

/**
 * Circuit breaker for OpenAI API calls
 */
export function getOpenAICircuitBreaker(): CircuitBreaker {
  return getCircuitBreaker('openai', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,      // AI calls can be slow
    resetTimeout: 60000, // Wait 1 minute before retry
  });
}

/**
 * Circuit breaker for Stripe API calls
 */
export function getStripeCircuitBreaker(): CircuitBreaker {
  return getCircuitBreaker('stripe', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 15000,
    resetTimeout: 30000,
  });
}

/**
 * Circuit breaker for email service (Resend)
 */
export function getEmailCircuitBreaker(): CircuitBreaker {
  return getCircuitBreaker('email', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 60000,
  });
}

/**
 * Circuit breaker for Redis cache
 */
export function getRedisCircuitBreaker(): CircuitBreaker {
  return getCircuitBreaker('redis', {
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 5000,
    resetTimeout: 15000,
  });
}

/**
 * Circuit breaker for webhook deliveries
 */
export function getWebhookCircuitBreaker(webhookUrl: string): CircuitBreaker {
  const name = `webhook:${new URL(webhookUrl).hostname}`;
  return getCircuitBreaker(name, {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 10000,
    resetTimeout: 300000, // Wait 5 minutes for webhook endpoints
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute a function with a specific circuit breaker
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options?: Omit<CircuitBreakerOptions, 'name'>
): Promise<T> {
  const breaker = getCircuitBreaker(name, options);
  return breaker.execute(fn);
}

/**
 * Create a protected version of an async function
 */
export function protectFunction<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: Omit<CircuitBreakerOptions, 'name'>
): (...args: TArgs) => Promise<TReturn> {
  const breaker = getCircuitBreaker(name, options);

  return async (...args: TArgs): Promise<TReturn> => {
    return breaker.execute(() => fn(...args));
  };
}

/**
 * Health check for all circuit breakers
 */
export function circuitBreakerHealthCheck(): {
  healthy: boolean;
  circuits: Array<{ name: string; state: CircuitState; healthy: boolean }>;
} {
  const circuits = getAllCircuitStats().map(stats => ({
    name: stats.name,
    state: stats.state,
    healthy: stats.state !== 'open',
  }));

  return {
    healthy: circuits.every(c => c.healthy),
    circuits,
  };
}
