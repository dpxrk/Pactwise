/**
 * @deprecated This file is kept for backward compatibility.
 * Import from '@/lib/schemas' instead for better code splitting.
 *
 * Schemas are now split by domain for improved bundle size:
 * - @/lib/schemas/base - Base schemas (id, timestamp, email, etc.)
 * - @/lib/schemas/user - User and enterprise schemas
 * - @/lib/schemas/vendor - Vendor schemas
 * - @/lib/schemas/contract - Contract schemas
 * - @/lib/schemas/agent - Agent task schemas
 * - @/lib/schemas/notification - Notification schemas
 * - @/lib/schemas/search - Search schemas
 * - @/lib/schemas/analytics - Analytics schemas
 * - @/lib/schemas/error - Error and API response schemas
 * - @/lib/schemas/form - Form validation schemas
 * - @/lib/schemas/query - Query parameter schemas
 */

// Re-export everything from the new schemas directory
export * from './schemas';
export { default } from './schemas';