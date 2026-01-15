/**
 * Next.js Instrumentation
 *
 * This file is required for Next.js 15 App Router to properly initialize
 * monitoring tools like Sentry on both server and client.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Dynamically import Sentry configs based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    await import('./sentry.server.config');
  }
}

// Client-side initialization handled by sentry.client.config.ts
// which is automatically loaded by @sentry/nextjs
