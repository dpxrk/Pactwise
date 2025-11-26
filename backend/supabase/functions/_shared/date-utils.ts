/// <reference path="../../types/global.d.ts" />

/**
 * Date/Time Utilities
 * Provides timezone handling, business days, relative dates, and formatting
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BusinessDaysOptions {
  holidays?: Date[];
  workingDays?: number[]; // 0 = Sunday, 6 = Saturday
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

// US Federal Holidays (dates that fall on specific dates)
const FIXED_HOLIDAYS = [
  { month: 1, day: 1 }, // New Year's Day
  { month: 7, day: 4 }, // Independence Day
  { month: 11, day: 11 }, // Veterans Day
  { month: 12, day: 25 }, // Christmas Day
];

// ============================================================================
// PARSING & VALIDATION
// ============================================================================

/**
 * Parse a date string into a Date object
 * Supports ISO 8601, common US/EU formats
 */
export function parseDate(input: string | Date | number): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    // Unix timestamp (seconds or milliseconds)
    const timestamp = input > 9999999999 ? input : input * 1000;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  // Try ISO format first
  let date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common formats
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY
    /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
  ];

  for (const regex of formats) {
    const match = input.match(regex);
    if (match) {
      // Determine year, month, day based on format
      let year, month, day;
      if (match[3]?.length === 4) {
        // MM/DD/YYYY or MM-DD-YYYY
        year = parseInt(match[3]);
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
      } else {
        // YYYY/MM/DD
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      }

      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Check if a value is a valid date
 */
export function isValidDate(input: unknown): boolean {
  if (input === null || input === undefined) {
    return false;
  }

  const date = parseDate(input as string | Date | number);
  return date !== null;
}

// ============================================================================
// TIMEZONE HANDLING
// ============================================================================

/**
 * Convert a date to a specific timezone
 */
export function toTimezone(date: Date, timezone: string): Date {
  const formatted = date.toLocaleString('en-US', { timeZone: timezone });
  return new Date(formatted);
}

/**
 * Get the timezone offset in hours for a specific timezone
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / MS_PER_HOUR;
}

/**
 * Common timezone abbreviations to IANA names
 */
export const TIMEZONE_MAP: Record<string, string> = {
  EST: 'America/New_York',
  EDT: 'America/New_York',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  UTC: 'UTC',
  GMT: 'UTC',
};

// ============================================================================
// BUSINESS DAYS
// ============================================================================

/**
 * Check if a date is a business day
 */
export function isBusinessDay(
  date: Date,
  options: BusinessDaysOptions = {},
): boolean {
  const workingDays = options.workingDays || DEFAULT_WORKING_DAYS;
  const holidays = options.holidays || [];

  // Check if it's a working day
  if (!workingDays.includes(date.getDay())) {
    return false;
  }

  // Check if it's a holiday
  const dateStr = date.toISOString().split('T')[0];
  for (const holiday of holidays) {
    if (holiday.toISOString().split('T')[0] === dateStr) {
      return false;
    }
  }

  return true;
}

/**
 * Add business days to a date
 */
export function addBusinessDays(
  date: Date,
  days: number,
  options: BusinessDaysOptions = {},
): Date {
  const result = new Date(date);
  const direction = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    if (isBusinessDay(result, options)) {
      remaining--;
    }
  }

  return result;
}

/**
 * Get number of business days between two dates
 */
export function getBusinessDaysBetween(
  startDate: Date,
  endDate: Date,
  options: BusinessDaysOptions = {},
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return -getBusinessDaysBetween(end, start, options);
  }

  let count = 0;
  const current = new Date(start);

  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current, options)) {
      count++;
    }
  }

  return count;
}

/**
 * Get the next business day
 */
export function getNextBusinessDay(
  date: Date,
  options: BusinessDaysOptions = {},
): Date {
  return addBusinessDays(date, 1, options);
}

/**
 * Get the previous business day
 */
export function getPreviousBusinessDay(
  date: Date,
  options: BusinessDaysOptions = {},
): Date {
  return addBusinessDays(date, -1, options);
}

// ============================================================================
// RELATIVE DATES
// ============================================================================

/**
 * Get a relative date description (e.g., "2 days ago", "in 3 weeks")
 */
export function getRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const diffMs = date.getTime() - baseDate.getTime();
  const isPast = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const minutes = Math.floor(absDiff / MS_PER_MINUTE);
  const hours = Math.floor(absDiff / MS_PER_HOUR);
  const days = Math.floor(absDiff / MS_PER_DAY);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let value: number;
  let unit: string;

  if (minutes < 1) {
    return 'just now';
  } else if (minutes < 60) {
    value = minutes;
    unit = 'minute';
  } else if (hours < 24) {
    value = hours;
    unit = 'hour';
  } else if (days < 7) {
    value = days;
    unit = 'day';
  } else if (weeks < 4) {
    value = weeks;
    unit = 'week';
  } else if (months < 12) {
    value = months;
    unit = 'month';
  } else {
    value = years;
    unit = 'year';
  }

  const plural = value !== 1 ? 's' : '';
  return isPast
    ? `${value} ${unit}${plural} ago`
    : `in ${value} ${unit}${plural}`;
}

/**
 * Parse relative date expressions
 * Examples: "today", "yesterday", "tomorrow", "next week", "2 days ago"
 */
export function parseRelativeDate(expression: string, baseDate: Date = new Date()): Date | null {
  const expr = expression.toLowerCase().trim();

  // Handle exact keywords
  switch (expr) {
    case 'today':
      return startOfDay(baseDate);
    case 'tomorrow':
      return startOfDay(addDays(baseDate, 1));
    case 'yesterday':
      return startOfDay(addDays(baseDate, -1));
    case 'now':
      return new Date(baseDate);
  }

  // Handle "next/last" patterns
  const nextLastMatch = expr.match(/^(next|last)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (nextLastMatch) {
    const direction = nextLastMatch[1] === 'next' ? 1 : -1;
    const unit = nextLastMatch[2];

    if (unit === 'week') {
      return addDays(baseDate, direction * 7);
    } else if (unit === 'month') {
      return addMonths(baseDate, direction);
    } else if (unit === 'year') {
      return addYears(baseDate, direction);
    } else {
      // Day of week
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };
      const targetDay = dayMap[unit];
      const currentDay = baseDate.getDay();
      let diff = targetDay - currentDay;
      if (direction > 0 && diff <= 0) diff += 7;
      if (direction < 0 && diff >= 0) diff -= 7;
      return addDays(baseDate, diff);
    }
  }

  // Handle "N units ago/from now"
  const agoMatch = expr.match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/);
  if (agoMatch) {
    const amount = parseInt(agoMatch[1]);
    const unit = agoMatch[2];
    return addTimeUnit(baseDate, -amount, unit);
  }

  const fromNowMatch = expr.match(/^in\s+(\d+)\s+(minute|hour|day|week|month|year)s?$/);
  if (fromNowMatch) {
    const amount = parseInt(fromNowMatch[1]);
    const unit = fromNowMatch[2];
    return addTimeUnit(baseDate, amount, unit);
  }

  return null;
}

// ============================================================================
// DATE MANIPULATION
// ============================================================================

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Add years to a date
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Add any time unit to a date
 */
export function addTimeUnit(date: Date, amount: number, unit: string): Date {
  switch (unit) {
    case 'minute':
      return new Date(date.getTime() + amount * MS_PER_MINUTE);
    case 'hour':
      return new Date(date.getTime() + amount * MS_PER_HOUR);
    case 'day':
      return addDays(date, amount);
    case 'week':
      return addDays(date, amount * 7);
    case 'month':
      return addMonths(date, amount);
    case 'year':
      return addYears(date, amount);
    default:
      return date;
  }
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of week (Monday)
 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of quarter
 */
export function startOfQuarter(date: Date): Date {
  const result = new Date(date);
  const quarter = Math.floor(result.getMonth() / 3);
  result.setMonth(quarter * 3, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get start of year
 */
export function startOfYear(date: Date): Date {
  const result = new Date(date);
  result.setMonth(0, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

// ============================================================================
// DATE RANGES
// ============================================================================

/**
 * Get common date ranges
 */
export function getDateRange(rangeType: string, baseDate: Date = new Date()): DateRange {
  switch (rangeType) {
    case 'today':
      return { start: startOfDay(baseDate), end: endOfDay(baseDate) };
    case 'yesterday':
      const yesterday = addDays(baseDate, -1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'this_week':
      return { start: startOfWeek(baseDate), end: endOfDay(baseDate) };
    case 'last_week':
      const lastWeekStart = addDays(startOfWeek(baseDate), -7);
      return { start: lastWeekStart, end: addDays(lastWeekStart, 6) };
    case 'this_month':
      return { start: startOfMonth(baseDate), end: endOfDay(baseDate) };
    case 'last_month':
      const lastMonth = addMonths(baseDate, -1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'this_quarter':
      return { start: startOfQuarter(baseDate), end: endOfDay(baseDate) };
    case 'this_year':
      return { start: startOfYear(baseDate), end: endOfDay(baseDate) };
    case 'last_7_days':
      return { start: startOfDay(addDays(baseDate, -6)), end: endOfDay(baseDate) };
    case 'last_30_days':
      return { start: startOfDay(addDays(baseDate, -29)), end: endOfDay(baseDate) };
    case 'last_90_days':
      return { start: startOfDay(addDays(baseDate, -89)), end: endOfDay(baseDate) };
    default:
      return { start: startOfDay(baseDate), end: endOfDay(baseDate) };
  }
}

/**
 * Check if a date is within a range
 */
export function isWithinRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format a date as ISO string (date only)
 */
export function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a date for display
 */
export function formatDisplayDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale: string = 'en-US',
): string {
  return date.toLocaleDateString(locale, options);
}

/**
 * Format a date with time for display
 */
export function formatDisplayDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  locale: string = 'en-US',
): string {
  return date.toLocaleString(locale, options);
}

/**
 * Get days until a date
 */
export function getDaysUntil(targetDate: Date, fromDate: Date = new Date()): number {
  const diffTime = targetDate.getTime() - fromDate.getTime();
  return Math.ceil(diffTime / MS_PER_DAY);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return date > new Date();
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
