// Common type definitions to replace any usage

import { Id } from './id.types';

// Error types
export type AppError = Error & {
  code?: string;
  statusCode?: number;
  details?: unknown;
};

// Generic data types
export type DataRecord = Record<string, unknown>;

// Table data types
export interface TableRow {
  id: string;
  [key: string]: unknown;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

// Theme types
export interface ChartTheme {
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  accentColor?: string;
  fontFamily?: string;
  [key: string]: unknown;
}

// Event handler types
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

// Filter types
export interface FilterParams {
  search?: string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}

// Sort types
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Form types
export interface FormState<T = DataRecord> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Export types
export interface ExportData {
  headers: string[];
  rows: unknown[][];
  filename: string;
  format: 'csv' | 'json' | 'pdf';
}

// Notification types
export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}