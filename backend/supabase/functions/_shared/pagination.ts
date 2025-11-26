/// <reference path="../../types/global.d.ts" />

import { z } from './validation.ts';

/**
 * Enterprise Pagination Utilities
 * Provides standardized pagination, sorting, and filtering for all API endpoints.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface PaginatedQueryParams extends PaginationParams, SortParams {
  filters: FilterParams;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction: 'forward' | 'backward';
}

export interface CursorPaginatedResult<T> {
  data: T[];
  cursors: {
    next: string | null;
    prev: string | null;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

/**
 * Parse pagination parameters from request URL
 */
export function parsePaginationParams(url: URL): PaginationParams {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Parse sort parameters from request URL
 */
export function parseSortParams(
  url: URL,
  allowedFields: string[],
  defaultField = 'created_at',
  defaultOrder: 'asc' | 'desc' = 'desc'
): SortParams {
  const sortBy = url.searchParams.get('sortBy') || defaultField;
  const sortOrder = (url.searchParams.get('sortOrder')?.toLowerCase() === 'asc' ? 'asc' : defaultOrder) as 'asc' | 'desc';

  // Validate sortBy field
  const validSortBy = allowedFields.includes(sortBy) ? sortBy : defaultField;

  return { sortBy: validSortBy, sortOrder };
}

/**
 * Parse filter parameters from request URL
 */
export function parseFilterParams(
  url: URL,
  allowedFilters: string[]
): FilterParams {
  const filters: FilterParams = {};

  for (const filter of allowedFilters) {
    const value = url.searchParams.get(filter);
    if (value !== null) {
      // Handle array filters (comma-separated)
      if (value.includes(',')) {
        filters[filter] = value.split(',').map(v => v.trim());
      } else if (value === 'true' || value === 'false') {
        filters[filter] = value === 'true';
      } else if (!isNaN(Number(value))) {
        filters[filter] = Number(value);
      } else {
        filters[filter] = value;
      }
    }
  }

  return filters;
}

/**
 * Parse all query parameters from request URL
 */
export function parseQueryParams(
  url: URL,
  allowedSortFields: string[],
  allowedFilters: string[],
  defaultSortField = 'created_at'
): PaginatedQueryParams {
  return {
    ...parsePaginationParams(url),
    ...parseSortParams(url, allowedSortFields, defaultSortField),
    filters: parseFilterParams(url, allowedFilters),
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
  };
}

/**
 * Create a paginated result object
 */
export function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResult<T> {
  return {
    data,
    pagination: calculatePaginationMeta(page, limit, total),
  };
}

// ============================================================================
// CURSOR PAGINATION HELPERS
// ============================================================================

/**
 * Encode a cursor from an object
 */
export function encodeCursor(data: Record<string, unknown>): string {
  return btoa(JSON.stringify(data));
}

/**
 * Decode a cursor to an object
 */
export function decodeCursor<T = Record<string, unknown>>(cursor: string): T | null {
  try {
    return JSON.parse(atob(cursor)) as T;
  } catch {
    return null;
  }
}

/**
 * Parse cursor pagination parameters from request URL
 */
export function parseCursorParams(url: URL): CursorPaginationParams {
  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const direction = (url.searchParams.get('direction') === 'backward' ? 'backward' : 'forward') as 'forward' | 'backward';

  return { cursor, limit, direction };
}

/**
 * Create a cursor-paginated result
 */
export function createCursorPaginatedResult<T>(
  data: T[],
  limit: number,
  getCursorValue: (item: T) => Record<string, unknown>,
  hasMoreItems: boolean
): CursorPaginatedResult<T> {
  const hasNext = data.length > 0 && hasMoreItems;
  const hasPrev = data.length > 0; // Simplified - actual implementation depends on context

  return {
    data,
    cursors: {
      next: hasNext && data.length > 0 ? encodeCursor(getCursorValue(data[data.length - 1])) : null,
      prev: hasPrev && data.length > 0 ? encodeCursor(getCursorValue(data[0])) : null,
      hasNext,
      hasPrev,
    },
  };
}

// ============================================================================
// SUPABASE QUERY HELPERS
// ============================================================================

/**
 * Apply pagination to a Supabase query builder
 */
export function applyPagination<T>(
  query: T & { range: (from: number, to: number) => T },
  params: PaginationParams
): T {
  const { offset, limit } = params;
  return query.range(offset, offset + limit - 1);
}

/**
 * Apply sorting to a Supabase query builder
 */
export function applySort<T>(
  query: T & { order: (column: string, options: { ascending: boolean }) => T },
  params: SortParams
): T {
  return query.order(params.sortBy, { ascending: params.sortOrder === 'asc' });
}

/**
 * Build a count query for total results
 * Returns query that only fetches count, not data
 */
export function buildCountQuery<T>(
  baseQuery: T & { select: (columns: string, options?: { count: string; head: boolean }) => T }
): T {
  return baseQuery.select('*', { count: 'exact', head: true });
}

// ============================================================================
// SEARCH HELPERS
// ============================================================================

export interface SearchParams {
  query: string;
  fields: string[];
}

/**
 * Parse search parameters from request URL
 */
export function parseSearchParams(url: URL, searchableFields: string[]): SearchParams | null {
  const query = url.searchParams.get('q') || url.searchParams.get('search');

  if (!query || query.trim().length < 2) {
    return null;
  }

  return {
    query: query.trim(),
    fields: searchableFields,
  };
}

/**
 * Build a full-text search query condition
 * Returns an OR condition for searching across multiple fields
 */
export function buildSearchCondition(
  searchParams: SearchParams
): string {
  const escapedQuery = searchParams.query.replace(/[%_]/g, '\\$&');
  const conditions = searchParams.fields.map(
    field => `${field}.ilike.%${escapedQuery}%`
  );
  return conditions.join(',');
}

// ============================================================================
// DATE RANGE HELPERS
// ============================================================================

export interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Parse date range parameters from request URL
 */
export function parseDateRangeParams(url: URL): DateRangeParams {
  const startDateStr = url.searchParams.get('startDate') || url.searchParams.get('from');
  const endDateStr = url.searchParams.get('endDate') || url.searchParams.get('to');

  return {
    startDate: startDateStr ? new Date(startDateStr) : undefined,
    endDate: endDateStr ? new Date(endDateStr) : undefined,
  };
}

/**
 * Validate date range (start must be before end)
 */
export function validateDateRange(params: DateRangeParams): boolean {
  if (params.startDate && params.endDate) {
    return params.startDate <= params.endDate;
  }
  return true;
}

// ============================================================================
// URL BUILDER HELPERS
// ============================================================================

/**
 * Build pagination query string
 */
export function buildPaginationQueryString(params: PaginationParams): string {
  return `page=${params.page}&limit=${params.limit}`;
}

/**
 * Build a complete query string from all params
 */
export function buildQueryString(params: PaginatedQueryParams): string {
  const parts: string[] = [
    `page=${params.page}`,
    `limit=${params.limit}`,
    `sortBy=${params.sortBy}`,
    `sortOrder=${params.sortOrder}`,
  ];

  for (const [key, value] of Object.entries(params.filters)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        parts.push(`${key}=${value.join(',')}`);
      } else {
        parts.push(`${key}=${value}`);
      }
    }
  }

  return parts.join('&');
}

/**
 * Build next/prev page URLs
 */
export function buildPageUrls(
  baseUrl: string,
  pagination: PaginationMeta,
  currentParams: PaginatedQueryParams
): { next: string | null; prev: string | null } {
  const buildUrl = (page: number): string => {
    const params = { ...currentParams, page };
    return `${baseUrl}?${buildQueryString(params)}`;
  };

  return {
    next: pagination.nextPage ? buildUrl(pagination.nextPage) : null,
    prev: pagination.prevPage ? buildUrl(pagination.prevPage) : null,
  };
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create a standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  additionalMeta?: Record<string, unknown>
): {
  success: boolean;
  data: T[];
  meta: {
    pagination: PaginationMeta;
    [key: string]: unknown;
  };
} {
  return {
    success: true,
    data,
    meta: {
      pagination,
      ...additionalMeta,
    },
  };
}
