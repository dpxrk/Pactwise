/**
 * Validates and sanitizes redirect URLs to prevent open redirect vulnerabilities.
 *
 * Only allows:
 * - Relative paths starting with '/' (but not '//')
 * - Same-origin absolute URLs
 *
 * @param redirectUrl - The redirect URL to validate
 * @param fallbackUrl - The URL to return if validation fails (default: '/dashboard')
 * @returns A safe redirect URL
 */
export function validateRedirectUrl(
  redirectUrl: string | null | undefined,
  fallbackUrl: string = '/dashboard'
): string {
  // If no redirect provided, use fallback
  if (!redirectUrl || typeof redirectUrl !== 'string' || redirectUrl.trim() === '') {
    return fallbackUrl;
  }

  const url = redirectUrl.trim();

  // Check for relative path (must start with '/' but not '//')
  // This prevents protocol-relative URLs like '//evil.com'
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  // Check for same-origin absolute URLs
  try {
    const parsedUrl = new URL(url, window.location.origin);

    // Only allow same origin
    if (parsedUrl.origin === window.location.origin) {
      // Return the pathname + search + hash (strip origin for consistency)
      return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
    }
  } catch {
    // Invalid URL format, fall through to fallback
  }

  // If validation fails, log warning and use fallback
  console.warn(
    `[Security] Invalid redirect URL blocked: "${redirectUrl}". Using fallback: "${fallbackUrl}"`
  );

  return fallbackUrl;
}

/**
 * Safely redirects to a validated URL using window.location.href
 *
 * @param redirectUrl - The redirect URL to validate and navigate to
 * @param fallbackUrl - The URL to use if validation fails (default: '/dashboard')
 */
export function safeRedirect(
  redirectUrl: string | null | undefined,
  fallbackUrl: string = '/dashboard'
): void {
  const safeUrl = validateRedirectUrl(redirectUrl, fallbackUrl);
  window.location.href = safeUrl;
}
