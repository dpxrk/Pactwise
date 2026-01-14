import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.VERCEL_ENV === 'preview' || process.env.APP_ENV === 'staging';
const enableSentry = process.env.ENABLE_SENTRY === 'true';

// Enable Sentry when DSN is provided and either:
// - In production
// - In staging environment
// - Explicitly enabled via ENABLE_SENTRY=true
const shouldInitSentry = dsn && (isProduction || isStaging || enableSentry);

if (shouldInitSentry) {
  Sentry.init({
    dsn,

  // Adjust sample rates based on environment
  tracesSampleRate: isProduction ? 0.1 : 0.5,

  // Debug mode in non-production
  debug: !isProduction,

  // Environment configuration
  environment: isProduction ? 'production' : isStaging ? 'staging' : 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

  // Server-side error filtering
  beforeSend(event, hint) {
    const errorType = event.exception?.values?.[0]?.type;
    const errorMessage = event.message || '';

    // Filter AbortError (cancelled requests)
    if (errorType === 'AbortError') {
      return null;
    }

    // Filter common non-actionable server errors
    if (errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('socket hang up')) {
      // Still log these but at a lower rate in production
      if (isProduction && Math.random() > 0.1) {
        return null;
      }
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Common transient errors
    /ECONNRESET/,
    /EPIPE/,
    // Supabase connection timeouts (handled by retry logic)
    /Request timed out/,
  ],

  // Server context
  initialScope: {
    tags: {
      component: 'server',
    },
  },
  });
}

export default Sentry;