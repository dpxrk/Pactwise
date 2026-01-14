import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_APP_ENV === 'staging';
const enableSentry = process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true';

// Enable Sentry when DSN is provided and either:
// - In production
// - In staging environment
// - Explicitly enabled via NEXT_PUBLIC_ENABLE_SENTRY=true
const shouldInitSentry = dsn && (isProduction || isStaging || enableSentry);

if (shouldInitSentry) {
  Sentry.init({
    dsn,

  // Adjust sample rates based on environment
  // Production: Lower rates for cost efficiency
  // Staging/Dev: Higher rates for debugging
  tracesSampleRate: isProduction ? 0.1 : 0.5,

  // Session replay sample rates
  replaysSessionSampleRate: isProduction ? 0.1 : 0.5,
  replaysOnErrorSampleRate: 1.0, // Always capture sessions with errors

  // Debug mode in non-production
  debug: !isProduction,

  integrations: [
    Sentry.replayIntegration({
      // Privacy-focused defaults for enterprise compliance
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Environment configuration
  environment: isProduction ? 'production' : isStaging ? 'staging' : 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

  // Error filtering
  beforeSend(event, hint) {
    // Filter out common non-actionable errors
    const errorType = event.exception?.values?.[0]?.type;
    const errorMessage = event.message || '';

    // Filter chunk load errors (user connectivity/caching issues)
    if (errorType === 'ChunkLoadError') {
      return null;
    }

    // Filter cross-origin script errors
    if (errorMessage.includes('Script error')) {
      return null;
    }

    // Filter ResizeObserver loop errors (browser quirk, not actionable)
    if (errorMessage.includes('ResizeObserver loop')) {
      return null;
    }

    // Filter cancelled navigation errors
    if (errorType === 'AbortError' || errorMessage.includes('navigation was aborted')) {
      return null;
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extension errors
    /^chrome-extension:/,
    /^moz-extension:/,
    // Common third-party script errors
    /gtm\.js/,
    /analytics/,
    // Network errors
    /Failed to fetch/,
    /NetworkError/,
    /Load failed/,
  ],

  // User context
  initialScope: {
    tags: {
      component: 'client',
    },
  },
  });
}

// Global error handler enhancement
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason, {
      tags: {
        source: 'unhandledrejection',
      },
    });
  });
}

export default Sentry;