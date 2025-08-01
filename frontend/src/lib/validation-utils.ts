import DOMPurify from 'dompurify';
import { z } from 'zod';

// HTML sanitization utility
export const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return html.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

// Input sanitization for user data
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .slice(0, 1000); // Limit length
};

// File validation schemas
export const fileValidationSchema = z.object({
  name: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9\-_. ]+$/, 'Invalid characters in file name'),
  type: z.enum([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]),
  size: z.number()
    .min(1, 'File cannot be empty')
    .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
});

// URL validation
export const urlValidationSchema = z.string()
  .url('Invalid URL format')
  .refine((url: string) => {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  }, 'Only HTTP and HTTPS URLs are allowed')
  .refine((url: string) => {
    const parsedUrl = new URL(url);
    return !parsedUrl.hostname.includes('localhost') && !parsedUrl.hostname.includes('127.0.0.1');
  }, 'Localhost URLs are not allowed');

// Email validation
export const emailValidationSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .refine((email: string) => {
    // Additional email validation
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [local, domain] = parts;
    return local && domain && local.length <= 64 && domain.length <= 253;
  }, 'Invalid email structure');

// Phone number validation
export const phoneValidationSchema = z.string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .min(10, 'Phone number too short')
  .max(17, 'Phone number too long');

// Contract validation schemas
export const contractValidationSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .transform(sanitizeInput),
  
  notes: z.string()
    .max(2000, 'Notes too long')
    .optional()
    .transform((val) => val ? sanitizeHtml(val) : undefined),
  
  value: z.number()
    .min(0, 'Value cannot be negative')
    .max(1000000000, 'Value too large')
    .optional(),
    
  startDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
    
  endDate: z.string()
    .datetime('Invalid end date format')
    .optional(),
});

// Vendor validation schema
export const vendorValidationSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .transform(sanitizeInput),
    
  contactEmail: emailValidationSchema.optional(),
  
  contactPhone: phoneValidationSchema.optional(),
  
  website: urlValidationSchema.optional(),
  
  address: z.string()
    .max(500, 'Address too long')
    .optional()
    .transform((val) => val ? sanitizeInput(val) : undefined),
    
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
    .transform((val) => val ? sanitizeHtml(val) : undefined),
});

// User input validation
export const userInputValidationSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Invalid characters in first name')
    .transform(sanitizeInput),
    
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Invalid characters in last name')
    .transform(sanitizeInput),
    
  title: z.string()
    .max(100, 'Title too long')
    .optional()
    .transform((val) => val ? sanitizeInput(val) : undefined),
    
  department: z.string()
    .max(100, 'Department too long')
    .optional()
    .transform((val) => val ? sanitizeInput(val) : undefined),
    
  phoneNumber: phoneValidationSchema.optional(),
});

// Search query validation
export const searchValidationSchema = z.string()
  .max(100, 'Search query too long')
  .regex(/^[a-zA-Z0-9\s\-_.@]+$/, 'Invalid characters in search query')
  .transform(sanitizeInput);

// Generic text validation
export const textValidationSchema = z.string()
  .max(1000, 'Text too long')
  .transform(sanitizeInput);

// Validate file upload
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  try {
    fileValidationSchema.parse({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    
    // Additional security checks
    if (file.name.includes('..')) {
      return { valid: false, error: 'Invalid file path' };
    }
    
    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.js', '.jar'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(fileExtension)) {
      return { valid: false, error: 'File type not allowed' };
    }
    
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { valid: false, error: 'File validation failed' };
  }
};

// Rate limiting helpers
export const createRateLimitKey = (identifier: string, action: string): string => {
  return `rate_limit:${sanitizeInput(identifier)}:${sanitizeInput(action)}`;
};

// CSRF token validation
export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  if (!token || !expectedToken) return false;
  return token === expectedToken;
};