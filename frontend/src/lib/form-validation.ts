/**
 * Frontend Form Validation Utilities
 *
 * Common validation functions for forms to provide
 * immediate user feedback and prevent invalid submissions.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (max 128 characters)' };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter' };
  }

  return { isValid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: unknown, fieldName = 'This field'): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  minLength?: number,
  maxLength?: number,
  fieldName = 'This field'
): ValidationResult {
  if (typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} must be text` };
  }

  const length = value.trim().length;

  if (minLength !== undefined && length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (maxLength !== undefined && length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${maxLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number,
  min?: number,
  max?: number,
  fieldName = 'This field'
): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (min !== undefined && value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { isValid: false, error: `${fieldName} must be no more than ${max}` };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateURL(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'URL must use http or https protocol' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
}

/**
 * Validate phone number (basic international format)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check if it contains only digits and optional + prefix
  if (!/^\+?\d{10,15}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number (10-15 digits)',
    };
  }

  return { isValid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number
): ValidationResult {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): ValidationResult {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  const isAllowed = allowedTypes.some(
    type =>
      fileType === type.toLowerCase() ||
      fileName.endsWith(type.toLowerCase().replace('*', ''))
  );

  if (!isAllowed) {
    return {
      isValid: false,
      error: `File type must be one of: ${allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate date is in the future
 */
export function validateFutureDate(date: Date | string): ValidationResult {
  const inputDate = typeof date === 'string' ? new Date(date) : date;

  if (!(inputDate instanceof Date) || isNaN(inputDate.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }

  if (inputDate <= new Date()) {
    return { isValid: false, error: 'Date must be in the future' };
  }

  return { isValid: true };
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string
): ValidationResult {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (!(start instanceof Date) || isNaN(start.getTime())) {
    return { isValid: false, error: 'Please enter a valid start date' };
  }

  if (!(end instanceof Date) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Please enter a valid end date' };
  }

  if (start >= end) {
    return { isValid: false, error: 'End date must be after start date' };
  }

  return { isValid: true };
}

/**
 * Batch validate multiple fields
 */
export function validateFields(
  validators: Array<() => ValidationResult>
): ValidationResult {
  for (const validator of validators) {
    const result = validator();
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}
