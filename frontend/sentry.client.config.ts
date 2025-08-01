import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Disable Sentry in development for faster builds
if (dsn && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn,
  
  // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture 100% of the sessions for user session replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture 100% of the sessions with an error for replay
  replaysOnErrorSampleRate: 1.0,

  // You can remove this option if you're not planning to use the Sentry Webpack Plugin
  // See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
  debug: process.env.NODE_ENV === 'development',

  integrations: [
    new (Sentry as any).Replay({
      // Mask all text content, images, and user input, except for UI text
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
    new (Sentry as any).BrowserTracing({
      // Set up automatic route change tracking for Next.js App Router
      // routingInstrumentation: Sentry.nextRouterInstrumentation(),
    }),
  ],

  // Environment configuration
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

  // Performance monitoring
  beforeSend(event, hint) {
    // Filter out certain errors in production
    if (process.env.NODE_ENV === 'production') {
      // Filter out network errors that are likely user connectivity issues
      if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
        return null;
      }
      
      // Filter out cross-origin script errors
      if (event.message?.includes('Script error')) {
        return null;
      }
    }

    return event;
  },

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