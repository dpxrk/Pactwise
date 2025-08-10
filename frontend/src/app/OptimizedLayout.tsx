'use client';

import { Suspense } from 'react';
import { AuthProvider } from "./AuthProvider";
import { ErrorBoundary } from './_components/common/ErrorBoundary';
import { SessionWrapper } from './_components/auth/SessionWrapper';
import { LazyStripeProvider } from '@/lib/stripe/lazy-provider';
import { ToastProvider } from '@/components/premium/Toast';
import { fontVariables } from './fonts';

// Minimal provider wrapper for critical functionality
const CriticalProviders = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <ToastProvider>
      <AuthProvider>
        <SessionWrapper>
          <LazyStripeProvider>
            {children}
          </LazyStripeProvider>
        </SessionWrapper>
      </AuthProvider>
    </ToastProvider>
  </ErrorBoundary>
);

// Simplified non-critical providers
const NonCriticalProviders = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>
    {children}
  </Suspense>
);

export default function OptimizedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://clerk.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
//         <link rel="dns-prefetch" href="https://api.openai.com" />
      </head>
      <body className="font-sans">
        <CriticalProviders>
          <NonCriticalProviders>
            {children}
          </NonCriticalProviders>
        </CriticalProviders>
      </body>
    </html>
  );
}