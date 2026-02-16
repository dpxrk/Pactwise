/**
 * Input Sanitization Utilities
 *
 * Common sanitization functions to prevent XSS, injection attacks,
 * and other security vulnerabilities from user input.
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * Prevents XSS attacks in text fields
 */
export function sanitizeString(input: string, maxLength = 10000): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove inline event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/data:text\/html/gi, ''); // Remove data URLs
}

/**
 * Sanitize HTML content - removes dangerous tags while preserving safe formatting
 * For rich text editors or HTML content
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // List of allowed tags
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'];

  // Remove all tags except allowed ones
  let sanitized = input;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gis, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional security: check for suspicious patterns
  if (trimmed.includes('..') || trimmed.includes('--')) {
    return null;
  }

  return trimmed;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize object keys and values recursively
 * Useful for JSON payloads
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  maxDepth = 10,
  currentDepth = 0
): Record<string, unknown> {
  if (currentDepth >= maxDepth) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const sanitizedKey = sanitizeString(key, 100);

    // Sanitize value based on type
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (value === null || value === undefined) {
      sanitized[sanitizedKey] = null;
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>, maxDepth, currentDepth + 1)
          : typeof item === 'string'
          ? sanitizeString(item)
          : item
      );
    } else if (typeof value === 'object') {
      sanitized[sanitizedKey] = sanitizeObject(
        value as Record<string, unknown>,
        maxDepth,
        currentDepth + 1
      );
    }
  }

  return sanitized;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize file name to prevent path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    return 'file';
  }

  return fileName
    .trim()
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .slice(0, 255); // Limit length
}

/**
 * Rate limit key sanitization - ensures consistent cache keys
 */
export function sanitizeRateLimitKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 200);
}
