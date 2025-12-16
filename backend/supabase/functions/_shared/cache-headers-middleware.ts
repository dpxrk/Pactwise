/**
 * HTTP Cache Headers Middleware
 *
 * Provides utilities for:
 * - Generating ETags (content-hash, timestamp, version strategies)
 * - Building Cache-Control headers
 * - Handling conditional requests (If-None-Match)
 * - Adding cache headers to responses
 * - Building enterprise-isolated cache keys
 */

import type { CachePolicy } from './cache-config.ts';

/**
 * Context for ETag generation
 */
export interface ETagContext {
  content?: string;
  timestamp?: string;
  version?: string;
}

/**
 * Cached response structure for Redis storage
 */
export interface CachedResponse {
  body: string;
  etag: string;
  status: number;
  contentType: string;
  cachedAt: string;
}

/**
 * Generate a SHA-256 hash of content (truncated to 16 chars)
 */
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
}

/**
 * Generate timestamp-based ETag
 */
function generateTimestampETag(timestamp?: string): string {
  return timestamp || new Date().toISOString();
}

/**
 * Generate version-based ETag
 */
function generateVersionETag(version: string): string {
  return version;
}

/**
 * Generate ETag based on the configured strategy
 *
 * @param policy Cache policy with ETag strategy
 * @param context ETag context (content, timestamp, or version)
 * @returns ETag string with proper formatting
 */
export async function generateETag(
  policy: CachePolicy,
  context: ETagContext
): Promise<string> {
  if (!policy.enableETag) {
    return '';
  }

  let value: string;

  switch (policy.etagStrategy) {
    case 'content-hash':
      if (!context.content) return '';
      value = await generateContentHash(context.content);
      // Use weak ETag (W/) for content-hash since it's semantically equivalent
      return `W/"${value}"`;

    case 'timestamp':
      value = generateTimestampETag(context.timestamp);
      return `"${value}"`;

    case 'version':
      value = generateVersionETag(context.version || '1');
      return `"${value}"`;

    default:
      return '';
  }
}

/**
 * Build Cache-Control header value from policy
 *
 * @param policy Cache policy
 * @returns Cache-Control header value
 */
export function buildCacheControlHeader(policy: CachePolicy): string {
  const directives: string[] = [];

  // Handle no-store case
  if (policy.scope === 'no-store') {
    return 'no-store, no-cache, must-revalidate';
  }

  // Scope directive
  directives.push(policy.scope);

  // Max age
  if (policy.maxAge >= 0) {
    directives.push(`max-age=${policy.maxAge}`);
  }

  // Stale-while-revalidate (RFC 5861)
  if (policy.staleWhileRevalidate && policy.staleWhileRevalidate > 0) {
    directives.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`);
  }

  // Stale-if-error (RFC 5861)
  if (policy.staleIfError && policy.staleIfError > 0) {
    directives.push(`stale-if-error=${policy.staleIfError}`);
  }

  // For private caches with maxAge 0, add no-cache for validation
  if (policy.scope === 'private' && policy.maxAge === 0) {
    directives.push('no-cache');
    directives.push('must-revalidate');
  }

  return directives.join(', ');
}

/**
 * Build Vary header value from policy
 *
 * @param policy Cache policy
 * @returns Vary header value or empty string
 */
export function buildVaryHeader(policy: CachePolicy): string {
  if (!policy.varyHeaders || policy.varyHeaders.length === 0) {
    return '';
  }
  return policy.varyHeaders.join(', ');
}

/**
 * Check if request has matching ETag (conditional request)
 *
 * @param request Incoming request
 * @param etag Server's current ETag
 * @returns true if ETags match (304 should be returned)
 */
export function checkIfNoneMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (!ifNoneMatch || !etag) return false;

  // Handle comma-separated ETags
  const clientETags = ifNoneMatch.split(',').map((e) => e.trim());

  return clientETags.some((clientETag) => {
    // Handle wildcard
    if (clientETag === '*') return true;

    // Normalize both ETags (remove W/ prefix for weak comparison)
    const normalizedClient = clientETag.replace(/^W\//, '');
    const normalizedServer = etag.replace(/^W\//, '');

    return normalizedClient === normalizedServer;
  });
}

/**
 * Add cache headers to a response
 *
 * @param response Original response
 * @param policy Cache policy
 * @param etag Optional ETag to include
 * @returns New response with cache headers
 */
export function addCacheHeaders(
  response: Response,
  policy: CachePolicy,
  etag?: string
): Response {
  // Clone headers to modify
  const newHeaders = new Headers(response.headers);

  // Cache-Control
  newHeaders.set('Cache-Control', buildCacheControlHeader(policy));

  // Vary
  const varyValue = buildVaryHeader(policy);
  if (varyValue) {
    newHeaders.set('Vary', varyValue);
  }

  // ETag
  if (etag && policy.enableETag) {
    newHeaders.set('ETag', etag);
  }

  // Last-Modified (useful for CDNs and caching proxies)
  if (!newHeaders.has('Last-Modified')) {
    newHeaders.set('Last-Modified', new Date().toUTCString());
  }

  // X-Cache header for debugging
  if (!newHeaders.has('X-Cache')) {
    newHeaders.set('X-Cache', 'MISS');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Create 304 Not Modified response
 *
 * @param etag Current ETag
 * @param policy Cache policy
 * @param originalHeaders Optional headers from original response to preserve
 * @returns 304 Not Modified response
 */
export function createNotModifiedResponse(
  etag: string,
  policy: CachePolicy,
  originalHeaders?: Headers
): Response {
  const headers = new Headers();

  // Preserve certain headers from original response
  if (originalHeaders) {
    const preserveHeaders = [
      'Cache-Control',
      'Vary',
      'ETag',
      'Content-Type',
      'Content-Language',
      'Expires',
      'Last-Modified',
    ];
    preserveHeaders.forEach((h) => {
      const value = originalHeaders.get(h);
      if (value) headers.set(h, value);
    });
  }

  // Always set fresh cache headers
  headers.set('ETag', etag);
  headers.set('Cache-Control', buildCacheControlHeader(policy));

  const varyValue = buildVaryHeader(policy);
  if (varyValue) {
    headers.set('Vary', varyValue);
  }

  // X-Cache header
  headers.set('X-Cache', 'REVALIDATED');

  return new Response(null, {
    status: 304,
    statusText: 'Not Modified',
    headers,
  });
}

/**
 * Build a response cache key for Redis storage
 * Keys are structured for easy pattern-based invalidation
 *
 * @param method HTTP method
 * @param pathname URL pathname
 * @param enterpriseId Enterprise ID for isolation
 * @param userId Optional user ID for user-specific caching
 * @param queryParams Optional query parameters
 * @returns Cache key string
 */
export function buildResponseCacheKey(
  method: string,
  pathname: string,
  enterpriseId?: string,
  userId?: string,
  queryParams?: URLSearchParams
): string {
  const parts = ['http:response', method.toUpperCase()];

  // Normalize pathname (remove leading/trailing slashes, replace multiple slashes)
  const normalizedPath = pathname
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, ':');
  parts.push(normalizedPath);

  // Enterprise isolation
  if (enterpriseId) {
    parts.push(`ent:${enterpriseId}`);
  }

  // User-specific caching for endpoints that vary by user
  if (
    userId &&
    (pathname.includes('/me') ||
      pathname.includes('/notifications') ||
      pathname.includes('/preferences'))
  ) {
    parts.push(`user:${userId}`);
  }

  // Include sorted query params for consistent cache keys
  if (queryParams && queryParams.toString()) {
    // Sort params for consistent ordering
    const sortedParams = new URLSearchParams(
      [...queryParams.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    );
    // Hash the params for shorter key
    const paramsHash = sortedParams.toString().substring(0, 32);
    parts.push(`q:${paramsHash}`);
  }

  return parts.join(':');
}

/**
 * Create a cached response object for Redis storage
 *
 * @param body Response body string
 * @param etag ETag value
 * @param status HTTP status code
 * @param contentType Content-Type header
 * @returns CachedResponse object
 */
export function createCachedResponse(
  body: string,
  etag: string,
  status: number,
  contentType: string
): CachedResponse {
  return {
    body,
    etag,
    status,
    contentType,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Restore a Response from cached data
 *
 * @param cached Cached response data
 * @param policy Cache policy
 * @returns Response object
 */
export function restoreCachedResponse(
  cached: CachedResponse,
  policy: CachePolicy
): Response {
  const headers = new Headers();
  headers.set('Content-Type', cached.contentType);
  headers.set('X-Cache', 'HIT');
  headers.set('X-Cached-At', cached.cachedAt);

  const response = new Response(cached.body, {
    status: cached.status,
    headers,
  });

  return addCacheHeaders(response, policy, cached.etag);
}
