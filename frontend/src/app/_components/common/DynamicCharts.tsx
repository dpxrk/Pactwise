"use client";

import React from 'react';

import { InteractiveChart, ChartDataPoint, ChartSeries } from '../analytics/InteractiveChart';

// Re-export chart types
export type { ChartDataPoint, ChartSeries };

// Define available chart types
type ChartType = 'line' | 'bar' | 'area' | 'pie';

interface DynamicChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  series?: ChartSeries[];
  width?: number;
  height?: number;
  colors?: string[];
  title?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  responsive?: boolean;
  aspectRatio?: number;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({
  type,
  data,
  series,
  height = 350,
  title = '',
  ...props
}) => {
  return (
    <InteractiveChart
      title={title}
      data={data}
      series={series}
      initialChartType={type}
      height={height}
      allowChartTypeChange={false}
      allowExport={false}
      allowFullscreen={false}
    />
  );
};

// Export as default and as DynamicCharts for compatibility
export default DynamicChart;
export const DynamicCharts = DynamicChart;