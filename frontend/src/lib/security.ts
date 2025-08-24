import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Security utilities for input validation, sanitization, and protection
 */

// Input sanitization
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function sanitizeInput(input: string): string {
  // Remove any potential script tags or malicious content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// SQL injection prevention (for any raw queries if needed)
export function escapeSQLString(str: string): string {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%':
        return '\\' + char;
      default:
        return char;
    }
  });
}

// Path traversal prevention
export function sanitizePath(path: string): string {
  // Remove any path traversal attempts
  return path
    .replace(/\.\.\//g, '')
    .replace(/\.\.%2F/gi, '')
    .replace(/\.\.%2f/gi, '')
    .replace(/\.\.%5C/gi, '')
    .replace(/\.\.%5c/gi, '')
    .replace(/\.\.\\/g, '');
}

// XSS prevention for user-generated content
export function escapeXSS(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  const reg = /[&<>"'/]/gi;
  return str.replace(reg, (match) => map[match]);
}

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email address too long')
  .toLowerCase();

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Username validation
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// File upload validation
export function validateFileUpload(file: File, options?: {
  maxSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = options?.allowedTypes || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check for suspicious file names
  const suspiciousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.scr', '.vbs', '.js'];
  const fileName = file.name.toLowerCase();
  
  for (const ext of suspiciousExtensions) {
    if (fileName.endsWith(ext)) {
      return { valid: false, error: 'Suspicious file type detected' };
    }
  }

  return { valid: true };
}

// CSRF token generation and validation
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Session validation
export function validateSession(sessionData: any): boolean {
  if (!sessionData) return false;
  
  // Check for required session fields
  if (!sessionData.user || !sessionData.access_token) {
    return false;
  }
  
  // Check if session has expired
  if (sessionData.expires_at) {
    const expiresAt = new Date(sessionData.expires_at);
    if (expiresAt < new Date()) {
      return false;
    }
  }
  
  return true;
}

// Rate limiting helper for client-side
class ClientRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const clientRateLimiter = new ClientRateLimiter();

// Content Security Policy helper
export function getCSPHeader(): string {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://*.supabase.co'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
    'media-src': ["'self'", 'https://*.supabase.co'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'block-all-mixed-content': [],
    'upgrade-insecure-requests': [],
  };
  
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// Secure cookie options
export const secureCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7, // 1 week
  path: '/',
};

// API request validation schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  filters: z.record(z.string()).optional(),
});

// Audit logging helper
export function logSecurityEvent(event: {
  type: 'auth_failure' | 'suspicious_activity' | 'rate_limit' | 'validation_error';
  message: string;
  userId?: string;
  ip?: string;
  metadata?: Record<string, any>;
}): void {
  // In production, this would send to a logging service
  console.warn('[SECURITY EVENT]', {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// Export all schemas for easy access
export const securitySchemas = {
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  pagination: paginationSchema,
  search: searchSchema,
};