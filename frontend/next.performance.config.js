/**
 * Performance optimization configuration for Next.js
 */

module.exports = {
  // Bundle size thresholds
  bundleSizeThresholds: {
    maxJavaScriptSize: 300000, // 300KB
    maxCSSSize: 100000, // 100KB
    maxPageSize: 500000, // 500KB total
    warningThreshold: 0.9, // Warn at 90% of max
  },

  // Performance budgets
  performanceBudgets: {
    // Lighthouse metrics targets
    lighthouse: {
      performance: 90,
      accessibility: 95,
      bestPractices: 95,
      seo: 100,
    },
    // Core Web Vitals targets
    webVitals: {
      LCP: 2500, // Largest Contentful Paint (ms)
      FID: 100,  // First Input Delay (ms)
      CLS: 0.1,  // Cumulative Layout Shift
      TTFB: 600, // Time to First Byte (ms)
      FCP: 1800, // First Contentful Paint (ms)
    },
  },

  // Code splitting configuration
  codeSplitting: {
    // Components to always lazy load
    lazyComponents: [
      'UnifiedDemoModal',
      'DocumentViewer',
      'ExportOptions',
      'NotificationCenter',
    ],
    // Routes to prefetch
    prefetchRoutes: [
      '/dashboard',
      '/contracts',
      '/vendors',
    ],
    // Maximum chunk size (KB)
    maxChunkSize: 244,
  },

  // Image optimization
  images: {
    domains: ['localhost', 'pactwise.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Caching strategies
  caching: {
    // Static assets
    staticAssets: {
      maxAge: 31536000, // 1 year
      immutable: true,
    },
    // API responses
    apiResponses: {
      contracts: 300, // 5 minutes
      vendors: 300,
      users: 600, // 10 minutes
      notifications: 60, // 1 minute
    },
    // Pages
    pages: {
      static: 86400, // 24 hours
      dynamic: 0, // No cache
      revalidate: 60, // ISR revalidation (seconds)
    },
  },

  // Optimization features
  optimizations: {
    removeConsole: true, // Remove console.log in production
    removeComments: true, // Remove comments in production
    mangleProps: false, // Don't mangle property names
    inlineCSS: true, // Inline critical CSS
    preconnect: [
      'https://fonts.googleapis.com',
      'https://api.pactwise.com',
    ],
    dnsPrefetch: [
      'https://cdn.pactwise.com',
    ],
  },

  // Monitoring and alerts
  monitoring: {
    enabled: true,
    providers: ['sentry', 'vercel-analytics'],
    alertThresholds: {
      errorRate: 0.01, // 1% error rate
      p95ResponseTime: 3000, // 3 seconds
      bundleSizeIncrease: 0.1, // 10% increase
    },
  },
};