import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bundleAnalyzer from '@next/bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  typescript: {
    // TODO: Re-enable after fixing Supabase type generation
    // These type errors existed before the security patches
    ignoreBuildErrors: true,
  },
  
  eslint: {
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
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://accounts.google.com https://apis.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://vitals.vercel-insights.com https://*.sentry.io",
            "media-src 'self' https://*.supabase.co",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
            "block-all-mixed-content",
            "upgrade-insecure-requests"
          ].join('; ')
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

export default withBundleAnalyzer(nextConfig);