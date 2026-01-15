/**
 * Sentry Error Tracking for Edge Functions
 *
 * Provides error tracking and monitoring for Supabase Edge Functions.
 * Falls back to console logging if Sentry DSN is not configured.
 */

// Sentry configuration
const SENTRY_DSN = Deno.env.get('SENTRY_DSN') || '';
const SENTRY_ENABLED = Boolean(SENTRY_DSN);
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development';
const RELEASE = Deno.env.get('APP_VERSION') || 'unknown';

// Severity levels matching Sentry's types
type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

// Breadcrumb type for tracking user actions
interface Breadcrumb {
  type: string;
  category: string;
  message: string;
  level?: SeverityLevel;
  timestamp?: number;
  data?: Record<string, unknown>;
}

// Context for error reports
interface ErrorContext {
  user?: {
    id: string;
    email?: string;
    enterprise_id?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
}

// In-memory breadcrumb storage (per-request scope)
const breadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 100;

/**
 * Add a breadcrumb for tracking user actions
 */
export function addBreadcrumb(crumb: Breadcrumb): void {
  breadcrumbs.push({
    ...crumb,
    timestamp: crumb.timestamp || Date.now(),
  });

  // Limit breadcrumb count
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/**
 * Clear all breadcrumbs (call at request start)
 */
export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

/**
 * Capture an exception and send to Sentry
 */
export async function captureException(
  error: Error | unknown,
  context?: ErrorContext
): Promise<string | null> {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Always log to console for debugging
  console.error('[Sentry] Capturing exception:', errorObj.message);
  if (context) {
    console.error('[Sentry] Context:', JSON.stringify(context, null, 2));
  }

  if (!SENTRY_ENABLED) {
    console.warn('[Sentry] DSN not configured, error not sent to Sentry');
    return null;
  }

  try {
    // Build the Sentry event payload
    const event = buildErrorEvent(errorObj, context);

    // Send to Sentry via HTTP API
    const eventId = await sendToSentry(event);
    console.log(`[Sentry] Error captured with ID: ${eventId}`);
    return eventId;
  } catch (sendError) {
    console.error('[Sentry] Failed to send error to Sentry:', sendError);
    return null;
  }
}

/**
 * Capture a message (non-error) to Sentry
 */
export async function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: ErrorContext
): Promise<string | null> {
  console.log(`[Sentry] Capturing message (${level}): ${message}`);

  if (!SENTRY_ENABLED) {
    return null;
  }

  try {
    const event = buildMessageEvent(message, level, context);
    const eventId = await sendToSentry(event);
    console.log(`[Sentry] Message captured with ID: ${eventId}`);
    return eventId;
  } catch (sendError) {
    console.error('[Sentry] Failed to send message to Sentry:', sendError);
    return null;
  }
}

/**
 * Set user context for all subsequent events
 */
export function setUser(user: ErrorContext['user']): void {
  if (user) {
    console.log(`[Sentry] Setting user context: ${user.id}`);
  }
}

/**
 * Create a scoped error context from a Request
 */
export function createContextFromRequest(
  req: Request,
  user?: ErrorContext['user']
): ErrorContext {
  const url = new URL(req.url);

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    // Don't include sensitive headers
    if (!['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  return {
    user,
    request: {
      url: url.pathname + url.search,
      method: req.method,
      headers,
    },
    tags: {
      runtime: 'deno',
      platform: 'supabase-edge',
    },
    extra: {
      origin: url.origin,
    },
  };
}

/**
 * Build Sentry error event payload
 */
function buildErrorEvent(
  error: Error,
  context?: ErrorContext
): Record<string, unknown> {
  return {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    environment: ENVIRONMENT,
    release: RELEASE,
    sdk: {
      name: 'pactwise-edge-sentry',
      version: '1.0.0',
    },
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: error.stack
            ? {
                frames: parseStackTrace(error.stack),
              }
            : undefined,
        },
      ],
    },
    user: context?.user,
    tags: {
      ...context?.tags,
      runtime: 'deno',
      platform: 'supabase-edge',
    },
    extra: context?.extra,
    request: context?.request,
    breadcrumbs: breadcrumbs.slice(-50), // Include last 50 breadcrumbs
  };
}

/**
 * Build Sentry message event payload
 */
function buildMessageEvent(
  message: string,
  level: SeverityLevel,
  context?: ErrorContext
): Record<string, unknown> {
  return {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level,
    environment: ENVIRONMENT,
    release: RELEASE,
    sdk: {
      name: 'pactwise-edge-sentry',
      version: '1.0.0',
    },
    message: {
      formatted: message,
    },
    user: context?.user,
    tags: {
      ...context?.tags,
      runtime: 'deno',
      platform: 'supabase-edge',
    },
    extra: context?.extra,
    request: context?.request,
    breadcrumbs: breadcrumbs.slice(-50),
  };
}

/**
 * Parse stack trace into Sentry frame format
 */
function parseStackTrace(stack: string): Array<Record<string, unknown>> {
  const lines = stack.split('\n').slice(1); // Skip first line (error message)
  const frames: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    // Match stack trace lines like "    at functionName (file:line:column)"
    const match = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
    if (match) {
      frames.push({
        function: match[1] || '<anonymous>',
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
        in_app: !match[2].includes('node_modules') && !match[2].includes('deno.land'),
      });
    }
  }

  // Sentry expects frames in reverse order (bottom of stack first)
  return frames.reverse();
}

/**
 * Send event to Sentry via HTTP API
 */
async function sendToSentry(event: Record<string, unknown>): Promise<string> {
  // Parse DSN to get project details
  // Format: https://<key>@<host>/<project_id>
  const dsnMatch = SENTRY_DSN.match(/^https?:\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!dsnMatch) {
    throw new Error('Invalid Sentry DSN format');
  }

  const [, publicKey, host, projectId] = dsnMatch;
  const endpoint = `https://${host}/api/${projectId}/store/`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': [
        'Sentry sentry_version=7',
        `sentry_client=pactwise-edge-sentry/1.0.0`,
        `sentry_key=${publicKey}`,
      ].join(', '),
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sentry API error: ${response.status} - ${text}`);
  }

  const result = await response.json();
  return (result as { id?: string }).id || event.event_id as string;
}

/**
 * Wrapper to capture errors in async functions
 */
export function withSentry<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      await captureException(error, context);
      throw error;
    }
  }) as T;
}

// Export a helper for checking if Sentry is enabled
export const isSentryEnabled = (): boolean => SENTRY_ENABLED;
