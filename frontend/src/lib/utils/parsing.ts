/**
 * Shared utility functions for parsing and formatting data
 * Consolidates duplicate implementations across the codebase
 */

/**
 * Parse contract value from string, handling various formats
 */
export function parseContractValue(value: string | number | undefined | null): number {
  if (!value || value === '') return 0;
  
  // If already a number, validate and return
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value !== 'string') return 0;
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '').trim();
  
  // Handle empty string after cleaning
  if (!cleaned) return 0;
  
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number as currency (USD)
 */
export function formatCurrency(value: number | string | undefined | null): string {
  const numValue = typeof value === 'string' ? parseContractValue(value) : (value || 0);
  
  if (isNaN(numValue) || typeof numValue !== 'number') return '$0';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
}

/**
 * Format currency with abbreviated units (K, M, B)
 */
export function formatCurrencyCompact(value: number | string | undefined | null): string {
  const numValue = typeof value === 'string' ? parseContractValue(value) : (value || 0);
  
  if (isNaN(numValue) || typeof numValue !== 'number') return '$0';
  
  if (numValue >= 1_000_000_000) {
    return `$${(numValue / 1_000_000_000).toFixed(1)}B`;
  } else if (numValue >= 1_000_000) {
    return `$${(numValue / 1_000_000).toFixed(1)}M`;
  } else if (numValue >= 1_000) {
    return `$${(numValue / 1_000).toFixed(0)}K`;
  }
  
  return formatCurrency(numValue);
}

/**
 * Format number with units and style
 */
export function formatValue(value: number, format?: string, unit?: string): string {
  if (isNaN(value) || typeof value !== 'number') return '0';
  
  let formatted = '';
  
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      formatted = `${value.toFixed(1)}%`;
      break;
    case 'compact':
      if (value >= 1_000_000) {
        formatted = `${(value / 1_000_000).toFixed(1)}M`;
      } else if (value >= 1_000) {
        formatted = `${(value / 1_000).toFixed(0)}K`;
      } else {
        formatted = value.toLocaleString();
      }
      break;
    default:
      formatted = value.toLocaleString();
  }
  
  if (unit && format !== 'currency' && format !== 'percentage') {
    formatted += ` ${unit}`;
  }
  
  return formatted;
}

/**
 * Format date string with consistent format
 */
export function formatDate(dateString?: string | number | Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  if (!dateString) return 'N/A';
  
  try {
    let date: Date;
    
    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      // Handle string dates
      date = new Date(isNaN(Number(dateString)) ? dateString : Number(dateString));
    }
    
    if (isNaN(date.getTime())) return 'N/A';
    
    switch (format) {
      case 'long':
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'iso':
        return date.toISOString().split('T')[0]!;
      case 'short':
      default:
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
    }
  } catch (error) {
    // Error formatting date
    return typeof dateString === 'string' ? dateString : 'N/A';
  }
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString?: string | number | Date): string {
  if (!dateString) return 'N/A';
  
  try {
    let date: Date;
    
    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      date = new Date(isNaN(Number(dateString)) ? dateString : Number(dateString));
    }
    
    if (isNaN(date.getTime())) return 'N/A';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 7) {
      return formatDate(date, 'short');
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  } catch (error) {
    // Error formatting relative time
    return 'N/A';
  }
}

/**
 * Format file size in human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (isNaN(bytes) || bytes < 0) return 'Invalid Size';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format status labels (replace underscores, capitalize)
 */
export function formatStatusLabel(status?: string): string {
  if (!status) return 'N/A';
  
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Parse percentage from string
 */
export function parsePercentage(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  
  const cleaned = value.replace(/%/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  if (isNaN(value) || typeof value !== 'number') return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Parse phone number and format consistently
 */
export function formatPhoneNumber(phone?: string): string {
  if (!phone) return 'N/A';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return as-is for international or non-standard formats
  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Calculate contract value range for analytics
 */
export function getContractValueRange(value: number): string {
  if (value < 10_000) return '0-10K';
  if (value < 50_000) return '10K-50K';
  if (value < 100_000) return '50K-100K';
  if (value < 500_000) return '100K-500K';
  if (value < 1_000_000) return '500K-1M';
  return '1M+';
}

/**
 * Extract pricing from contract text using various patterns
 */
export function extractPricingFromText(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Common pricing patterns
  const patterns = [
    /\$([0-9,]+(?:\.[0-9]{2})?)/g,          // $1,000.00
    /USD\s*([0-9,]+(?:\.[0-9]{2})?)/gi,     // USD 1,000.00
    /([0-9,]+(?:\.[0-9]{2})?)\s*dollars?/gi, // 1,000.00 dollars
    /total.*?([0-9,]+(?:\.[0-9]{2})?)/gi,   // total: 1,000.00
    /amount.*?([0-9,]+(?:\.[0-9]{2})?)/gi,  // amount: 1,000.00
  ];
  
  let maxValue = 0;
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const value = parseContractValue(match[1]);
      if (value > maxValue) {
        maxValue = value;
      }
    }
  }
  
  return maxValue;
}