/// <reference path="../../types/global.d.ts" />

/**
 * CSV Export Utility
 * Provides robust CSV generation with proper escaping, formatting, and streaming support
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CsvOptions {
  delimiter?: string;
  lineBreak?: string;
  includeHeaders?: boolean;
  headers?: string[];
  columnMapping?: Record<string, string>;
  dateFormat?: 'iso' | 'locale' | 'unix';
  nullValue?: string;
  booleanFormat?: { true: string; false: string };
  numberFormat?: { decimals?: number; thousandsSeparator?: string };
  quoteAll?: boolean;
}

export interface CsvColumn {
  key: string;
  header: string;
  formatter?: (value: unknown) => string;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: Required<CsvOptions> = {
  delimiter: ',',
  lineBreak: '\n',
  includeHeaders: true,
  headers: [],
  columnMapping: {},
  dateFormat: 'iso',
  nullValue: '',
  booleanFormat: { true: 'true', false: 'false' },
  numberFormat: { decimals: 2, thousandsSeparator: '' },
  quoteAll: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Escape a CSV value according to RFC 4180
 */
function escapeValue(value: string, delimiter: string, quoteAll: boolean): string {
  // Check if quoting is needed
  const needsQuoting =
    quoteAll ||
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');

  if (!needsQuoting) {
    return value;
  }

  // Escape double quotes by doubling them
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Format a date value
 */
function formatDate(value: Date | string, format: 'iso' | 'locale' | 'unix'): string {
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return '';
  }

  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'locale':
      return date.toLocaleDateString();
    case 'unix':
      return Math.floor(date.getTime() / 1000).toString();
    default:
      return date.toISOString();
  }
}

/**
 * Format a number value
 */
function formatNumber(
  value: number,
  decimals: number,
  thousandsSeparator: string,
): string {
  if (isNaN(value) || !isFinite(value)) {
    return '';
  }

  let formatted = value.toFixed(decimals);

  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    formatted = parts.join('.');
  }

  return formatted;
}

/**
 * Convert a value to string for CSV
 */
function valueToString(
  value: unknown,
  options: Required<CsvOptions>,
): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return options.nullValue;
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? options.booleanFormat.true : options.booleanFormat.false;
  }

  // Handle number
  if (typeof value === 'number') {
    return formatNumber(value, options.numberFormat.decimals!, options.numberFormat.thousandsSeparator!);
  }

  // Handle Date
  if (value instanceof Date) {
    return formatDate(value, options.dateFormat);
  }

  // Handle string that looks like a date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return formatDate(date, options.dateFormat);
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(v => valueToString(v, options)).join('; ');
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Default: convert to string
  return String(value);
}

/**
 * Get value from nested object path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate CSV string from array of objects
 */
export function generateCsv<T extends Record<string, unknown>>(
  data: T[],
  options: CsvOptions = {},
): string {
  const opts: Required<CsvOptions> = { ...DEFAULT_OPTIONS, ...options };
  const rows: string[] = [];

  if (data.length === 0) {
    return '';
  }

  // Determine columns
  let columns: CsvColumn[];
  if (opts.headers.length > 0) {
    // Use provided headers
    columns = opts.headers.map(header => ({
      key: Object.entries(opts.columnMapping).find(([, v]) => v === header)?.[0] || header,
      header,
    }));
  } else {
    // Auto-detect from first row
    const firstRow = data[0];
    columns = Object.keys(firstRow).map(key => ({
      key,
      header: opts.columnMapping[key] || key,
    }));
  }

  // Add header row
  if (opts.includeHeaders) {
    const headerRow = columns
      .map(col => escapeValue(col.header, opts.delimiter, opts.quoteAll))
      .join(opts.delimiter);
    rows.push(headerRow);
  }

  // Add data rows
  for (const item of data) {
    const rowValues = columns.map(col => {
      const value = getNestedValue(item, col.key);
      const stringValue = col.formatter
        ? col.formatter(value)
        : valueToString(value, opts);
      return escapeValue(stringValue, opts.delimiter, opts.quoteAll);
    });
    rows.push(rowValues.join(opts.delimiter));
  }

  return rows.join(opts.lineBreak);
}

/**
 * Generate CSV with custom column definitions
 */
export function generateCsvWithColumns<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn[],
  options: CsvOptions = {},
): string {
  const opts: Required<CsvOptions> = { ...DEFAULT_OPTIONS, ...options };
  const rows: string[] = [];

  if (data.length === 0) {
    if (opts.includeHeaders && columns.length > 0) {
      const headerRow = columns
        .map(col => escapeValue(col.header, opts.delimiter, opts.quoteAll))
        .join(opts.delimiter);
      return headerRow;
    }
    return '';
  }

  // Add header row
  if (opts.includeHeaders) {
    const headerRow = columns
      .map(col => escapeValue(col.header, opts.delimiter, opts.quoteAll))
      .join(opts.delimiter);
    rows.push(headerRow);
  }

  // Add data rows
  for (const item of data) {
    const rowValues = columns.map(col => {
      const value = getNestedValue(item, col.key);
      const stringValue = col.formatter
        ? col.formatter(value)
        : valueToString(value, opts);
      return escapeValue(stringValue, opts.delimiter, opts.quoteAll);
    });
    rows.push(rowValues.join(opts.delimiter));
  }

  return rows.join(opts.lineBreak);
}

/**
 * Create a CSV Response for direct download
 */
export function createCsvResponse(
  csvContent: string,
  filename: string,
  corsHeaders: Record<string, string> = {},
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache',
    ...corsHeaders,
  };

  // Add BOM for Excel compatibility
  const bom = '\ufeff';
  const contentWithBom = bom + csvContent;

  return new Response(contentWithBom, {
    status: 200,
    headers,
  });
}

// ============================================================================
// PREDEFINED COLUMN CONFIGURATIONS
// ============================================================================

/**
 * Standard contract export columns
 */
export const CONTRACT_COLUMNS: CsvColumn[] = [
  { key: 'id', header: 'Contract ID' },
  { key: 'title', header: 'Title' },
  { key: 'status', header: 'Status' },
  { key: 'contract_type', header: 'Type' },
  { key: 'value', header: 'Value', formatter: (v) => v ? `$${Number(v).toFixed(2)}` : '' },
  { key: 'start_date', header: 'Start Date' },
  { key: 'end_date', header: 'End Date' },
  { key: 'vendor.name', header: 'Vendor' },
  { key: 'owner.full_name', header: 'Owner' },
  { key: 'is_auto_renew', header: 'Auto Renew' },
  { key: 'created_at', header: 'Created' },
  { key: 'updated_at', header: 'Last Updated' },
];

/**
 * Standard vendor export columns
 */
export const VENDOR_COLUMNS: CsvColumn[] = [
  { key: 'id', header: 'Vendor ID' },
  { key: 'name', header: 'Name' },
  { key: 'category', header: 'Category' },
  { key: 'status', header: 'Status' },
  { key: 'contact_name', header: 'Contact Name' },
  { key: 'contact_email', header: 'Contact Email' },
  { key: 'contact_phone', header: 'Contact Phone' },
  { key: 'website', header: 'Website' },
  { key: 'performance_score', header: 'Performance Score' },
  { key: 'risk_score', header: 'Risk Score' },
  { key: 'created_at', header: 'Created' },
  { key: 'updated_at', header: 'Last Updated' },
];

/**
 * Standard budget export columns
 */
export const BUDGET_COLUMNS: CsvColumn[] = [
  { key: 'id', header: 'Budget ID' },
  { key: 'name', header: 'Name' },
  { key: 'budget_type', header: 'Type' },
  { key: 'total_budget', header: 'Total Budget', formatter: (v) => v ? `$${Number(v).toFixed(2)}` : '' },
  { key: 'spent_amount', header: 'Spent', formatter: (v) => v ? `$${Number(v).toFixed(2)}` : '' },
  { key: 'start_date', header: 'Start Date' },
  { key: 'end_date', header: 'End Date' },
  { key: 'department', header: 'Department' },
  { key: 'owner.full_name', header: 'Owner' },
  { key: 'created_at', header: 'Created' },
];

// ============================================================================
// STREAMING SUPPORT
// ============================================================================

/**
 * Create a streaming CSV generator for large datasets
 */
export function* streamCsvRows<T extends Record<string, unknown>>(
  data: Iterable<T>,
  columns: CsvColumn[],
  options: CsvOptions = {},
): Generator<string, void, unknown> {
  const opts: Required<CsvOptions> = { ...DEFAULT_OPTIONS, ...options };

  // Yield header row
  if (opts.includeHeaders) {
    const headerRow = columns
      .map(col => escapeValue(col.header, opts.delimiter, opts.quoteAll))
      .join(opts.delimiter);
    yield headerRow + opts.lineBreak;
  }

  // Yield data rows
  for (const item of data) {
    const rowValues = columns.map(col => {
      const value = getNestedValue(item, col.key);
      const stringValue = col.formatter
        ? col.formatter(value)
        : valueToString(value, opts);
      return escapeValue(stringValue, opts.delimiter, opts.quoteAll);
    });
    yield rowValues.join(opts.delimiter) + opts.lineBreak;
  }
}

/**
 * Create a streaming Response for large CSV exports
 */
export function createStreamingCsvResponse(
  generator: Generator<string, void, unknown>,
  filename: string,
  corsHeaders: Record<string, string> = {},
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Add BOM for Excel
      controller.enqueue(encoder.encode('\ufeff'));
    },
    pull(controller) {
      const { value, done } = generator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(value));
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      ...corsHeaders,
    },
  });
}
