'use client';

import { Suspense, lazy } from 'react';
import { AuthProvider } from "./AuthProvider";
import { ErrorBoundary } from './_components/common/ErrorBoundary';
import { SessionWrapper } from './_components/auth/SessionWrapper';
import { LazyStripeProvider } from '@/lib/stripe/lazy-provider';
import { ToastProvider } from '@/components/premium/Toast';
import { fontVariables } from './fonts';

// Lazy load heavy providers
const MonitoringProvider = lazy(() => import('./_components/common/MonitoringProvider').then(m => ({ default: m.MonitoringProvider })));
const HealthIndicator = lazy(() => import('./_components/common/MonitoringProvider').then(m => ({ default: m.HealthIndicator })));
const PerformanceProvider = lazy(() => import('./_components/common/PerformanceProvider').then(m => ({ default: m.PerformanceProvider })));
const AIChatProvider = lazy(() => import('@/components/ai/AIChatProvider').then(m => ({ default: m.AIChatProvider })));
const ServiceWorkerProvider = lazy(() => import('@/components/performance/ServiceWorkerProvider').then(m => ({ default: m.ServiceWorkerProvider })));

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

// Non-critical providers that can be lazy loaded
const NonCriticalProviders = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>
    <ServiceWorkerProvider>
      <MonitoringProvider>
        <PerformanceProvider>
          <AIChatProvider>
            {children}
            <HealthIndicator />
          </AIChatProvider>
        </PerformanceProvider>
      </MonitoringProvider>
    </ServiceWorkerProvider>
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
        <link rel="dns-prefetch" href="https://api.openai.com" />
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