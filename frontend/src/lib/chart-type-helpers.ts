// Chart type helper functions for backward compatibility and type safety

import { ChartDataPoint, ChartSeries } from '@/types/three-charts.types';

// Legacy series interface for backward compatibility
export interface LegacySeries {
  dataKey?: string;
  name?: string;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  dot?: boolean;
  stackId?: string;
  fillOpacity?: number;
  [key: string]: unknown;
}

/**
 * Convert legacy series format to ChartSeries format
 */
export function convertLegacySeries(
  series: (ChartSeries | LegacySeries)[] | undefined,
  colors: string[]
): ChartSeries[] | undefined {
  if (!series || series.length === 0) return undefined;

  return series.map((s: ChartSeries | LegacySeries, index: number) => {
    // Check if it's already in the new format
    if ('key' in s && !('dataKey' in s)) {
      return s as ChartSeries;
    }
    
    // Convert from legacy format
    const legacySeries = s as LegacySeries;
    return {
      key: legacySeries.dataKey || `series-${index}`,
      name: legacySeries.name || legacySeries.dataKey || `Series ${index + 1}`,
      color: legacySeries.color || legacySeries.fill || colors[index % colors.length],
      visible: true,
    } as ChartSeries;
  });
}

/**
 * Ensure chart data has required 'name' and 'value' properties
 */
export function normalizeChartData(
  data: Array<Record<string, unknown>>,
  nameField?: string,
  valueField?: string
): ChartDataPoint[] {
  return data.map(item => {
    // If already has name and value, return as is
    if ('name' in item && 'value' in item) {
      return item as ChartDataPoint;
    }

    // Try to find name and value from different fields
    const name = item.name || 
                 (nameField && item[nameField]) || 
                 item.label || 
                 item.category || 
                 item.month || 
                 item.department || 
                 'Unknown';
                 
    const value = item.value || 
                  (valueField && item[valueField]) || 
                  item.count || 
                  item.total || 
                  item.amount || 
                  0;

    return {
      ...item,
      name,
      value
    } as ChartDataPoint;
  });
}

/**
 * Filter out undefined properties for exactOptionalPropertyTypes compliance
 */
export function filterUndefinedProps<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }
  
  return result;
}

/**
 * Create chart props with proper optional handling
 */
export function createChartProps<T extends Record<string, unknown>>(
  baseProps: T,
  optionalProps: Record<string, unknown>
): T {
  const result = { ...baseProps };
  
  for (const [key, value] of Object.entries(optionalProps)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  
  return result;
}