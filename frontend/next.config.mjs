import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Set the monorepo root for proper file tracing
  // This tells Next.js that the workspace root is one level up
  outputFileTracingRoot: dirname(__dirname),

  typescript: {
    // Type checking enabled for production builds
    // Run `npm run build` to see any TypeScript errors
    ignoreBuildErrors: false,
  },

  eslint: {
    // ESLint runs separately via `npm run lint`
    // Build should pass with warnings (actual errors already fixed)
    // This allows gradual cleanup of `no-explicit-any` warnings
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  turbopack: {
    resolveAlias: {
      '@/': './src/',
      '@': './src',
    },
  },
  
  experimental: {
    scrollRestoration: true,
    webpackMemoryOptimizations: true,
    optimizePackageImports: [
      '@radix-ui/*',
      'lucide-react',
      'dayjs',
      'framer-motion',
      '@sentry/nextjs',
      'recharts',
      '@supabase/supabase-js',
      '@supabase/ssr',
      'zod',
      'react-hook-form',
      '@hookform/resolvers',
      'clsx',
      'tailwind-merge',
    ],
  },
  

  // Note: Turbopack handles module resolution automatically
  // No webpack configuration needed when using --turbo flag

  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // Security headers
  async headers() {
    // Disable CSP in development to avoid issues with local Supabase
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const baseHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
      }
    ];
    
    // Only add strict security headers in production
    if (!isDevelopment) {
      baseHeaders.push(
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        }
      );
    }
    
    return [
      {
        source: '/:path*',
        headers: baseHeaders
      },
      // Additional headers for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'X-API-Version',
            value: '1.0.0'
          }
        ]
      },
      // Headers for static assets
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project from Sentry dashboard
  org: process.env.SENTRY_ORG || 'pactwise',
  project: process.env.SENTRY_PROJECT || 'frontend',

  // Auth token for source map uploads (server-side only)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress all logs in development
  silent: process.env.NODE_ENV !== 'production',

  // Upload source maps only in production
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',

  // Hide source maps from users
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Performance optimization: only upload changed source maps
  widenClientFileUpload: true,

  // Tunnel route for bypassing ad blockers (optional)
  // tunnelRoute: '/monitoring-tunnel',

  // Automatically instrument API routes
  automaticVercelMonitors: true,
};

// Apply bundle analyzer, then Sentry wrapper
const configWithAnalyzer = withBundleAnalyzer(nextConfig);

// Only wrap with Sentry if DSN is configured
const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithAnalyzer, sentryWebpackPluginOptions)
  : configWithAnalyzer;

export default finalConfig;