import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Disable Sentry in development for faster builds
if (dsn && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV !== 'production',

  // Environment configuration
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

  // Server-specific integrations
  integrations: [    
    // Server integrations are handled automatically by @sentry/nextjs
  ],

  // Performance monitoring for server-side
  beforeSend(event, hint) {
    // Server-side error filtering
    if (process.env.NODE_ENV === 'production') {
      // Filter out certain server errors
      if (event.exception?.values?.[0]?.type === 'AbortError') {
        return null;
      }
    }

    return event;
  },

  // Additional server context
  initialScope: {
    tags: {
      component: 'server',
    },
  },
  });
}

export default Sentry;