/**
 * Compression middleware configuration
 * Provides gzip/brotli compression for API responses
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Check if the request accepts gzip or brotli encoding
 */
function getAcceptedEncoding(request: NextRequest): string | null {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  if (acceptEncoding.includes('br')) {
    return 'br'; // Brotli (best compression)
  }
  if (acceptEncoding.includes('gzip')) {
    return 'gzip';
  }
  
  return null;
}

/**
 * Check if content type should be compressed
 */
function shouldCompress(contentType: string | null): boolean {
  if (!contentType) return false;
  
  // Compress text-based content
  const compressibleTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/xhtml+xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/x-font-',
    'font/',
    'image/svg+xml',
  ];
  
  return compressibleTypes.some(type => contentType.includes(type));
}

/**
 * Apply compression headers to the response
 */
export function applyCompression(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  // Check if compression is already applied
  if (response.headers.get('content-encoding')) {
    return response;
  }
  
  const contentType = response.headers.get('content-type');
  
  // Only compress if content type is compressible
  if (!shouldCompress(contentType)) {
    return response;
  }
  
  const encoding = getAcceptedEncoding(request);
  
  if (encoding) {
    // Set compression headers
    response.headers.set('content-encoding', encoding);
    response.headers.set('vary', 'accept-encoding');
    
    // Add cache headers for static content
    if (contentType && (contentType.includes('javascript') || contentType.includes('css'))) {
      response.headers.set('cache-control', 'public, max-age=31536000, immutable');
    }
  }
  
  return response;
}

/**
 * Compression configuration for Next.js
 * Note: Actual compression is handled by Next.js automatically
 * This is for custom API routes and middleware
 */
export const compressionConfig = {
  // Minimum size in bytes to compress (1KB)
  threshold: 1024,
  
  // Compression level (1-9, higher = better compression, slower)
  level: 6,
  
  // Memory level (1-9, higher = more memory, better compression)
  memLevel: 8,
  
  // Strategy (for specific data types)
  strategy: 0, // Z_DEFAULT_STRATEGY
  
  // Enable/disable Brotli compression
  brotli: {
    enabled: true,
    quality: 4, // 0-11, higher = better compression, slower
  },
  
  // Enable/disable Gzip compression
  gzip: {
    enabled: true,
    level: 6, // 0-9
  },
};

/**
 * Helper to compress JSON responses
 */
export function compressedJsonResponse(
  data: any,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  const jsonString = JSON.stringify(data);
  
  // Check if response is large enough to compress
  if (jsonString.length < compressionConfig.threshold) {
    return new Response(jsonString, {
      status,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
    });
  }
  
  // Return response with compression hints
  // Actual compression is handled by the CDN/server
  return new Response(jsonString, {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'private, no-cache, no-store, must-revalidate',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

/**
 * Middleware to add compression headers
 */
export function compressionMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  
  // Add compression hints for the CDN/server
  const acceptEncoding = request.headers.get('accept-encoding');
  if (acceptEncoding) {
    response.headers.set('vary', 'accept-encoding');
  }
  
  return response;
}