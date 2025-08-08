"use client";

import React from 'react';
import {
  LazyThreeBarChart,
  LazyThreeLineChart,
  LazyThreePieChart,
  LazyThreeAreaChart
} from '../three-charts/LazyThreeCharts';
import type { ChartDataPoint, ChartSeries } from '@/types/three-charts.types';
import { convertLegacySeries, createChartProps, type LegacySeries } from '@/lib/chart-type-helpers';

// Define available chart types (reduced to what Three.js supports)
type ChartType = 
  | 'line' 
  | 'bar' 
  | 'area' 
  | 'pie';

// Define available chart types (reduced to what Three.js supports)

interface DynamicChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  series?: ChartSeries[] | LegacySeries[];
  width?: number;
  height?: number;
  colors?: string[];
  // Three.js specific props
  showGrid?: boolean;
  showAxes?: boolean;
  animation?: boolean;
  // Legacy props for backward compatibility (will be ignored)
  xAxisKey?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  // Chart specific configs
  pieConfig?: {
    dataKey?: string; // Legacy - ignored
    nameKey?: string; // Legacy - ignored
    innerRadius?: number;
    outerRadius?: number;
    showLabels?: boolean;
    labelDistance?: number;
    paddingAngle?: number; // Legacy - ignored
  };
  barConfig?: {
    barWidth?: number;
    barDepth?: number;
    spacing?: number;
  };
  lineConfig?: {
    lineWidth?: number;
    pointSize?: number;
    showPoints?: boolean;
    smoothCurve?: boolean;
  };
  areaConfig?: {
    opacity?: number;
    showPoints?: boolean;
    smoothCurve?: boolean;
    stackedAreas?: boolean;
  };
  // Event handlers
  onClick?: (dataPoint: ChartDataPoint) => void;
  onHover?: (dataPoint: ChartDataPoint | null) => void;
  className?: string;
}

const DynamicChart: React.FC<DynamicChartProps> = ({
  type,
  data,
  series,
  width = 800,
  height = 600,
  colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"],
  showGrid = true,
  showAxes = false,
  pieConfig,
  barConfig,
  lineConfig,
  areaConfig,
  onClick,
  onHover,
  className
}) => {
  // Convert legacy series format to ChartSeries format
  const convertedSeries = convertLegacySeries(series, colors);

  // Base props that are always defined
  const baseProps = {
    data,
    width,
    height,
    theme: {
      accentColors: colors,
    },
  };

  // Optional props
  const optionalProps = {
    onClick,
    onHover,
    series: convertedSeries,
    className,
  };

  // Common props for all Three.js charts
  const commonProps = createChartProps(baseProps, optionalProps);

  // Validate data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Render the appropriate Three.js chart
  switch (type) {
    case 'line':
      return (
        <LazyThreeLineChart
          {...commonProps}
          lineWidth={lineConfig?.lineWidth || 0.05}
          pointSize={lineConfig?.pointSize || 0.08}
          showPoints={lineConfig?.showPoints ?? true}
          smoothCurve={lineConfig?.smoothCurve ?? true}
          showArea={false}
        />
      );

    case 'bar':
      return (
        <LazyThreeBarChart
          {...commonProps}
          barWidth={barConfig?.barWidth || 0.6}
          barDepth={barConfig?.barDepth || 0.6}
          spacing={barConfig?.spacing || 1.5}
          showGrid={showGrid}
          showAxes={showAxes}
        />
      );

    case 'area':
      return (
        <LazyThreeAreaChart
          {...commonProps}
          opacity={areaConfig?.opacity || 0.7}
          showPoints={areaConfig?.showPoints ?? false}
          smoothCurve={areaConfig?.smoothCurve ?? true}
          stackedAreas={areaConfig?.stackedAreas ?? false}
        />
      );

    case 'pie':
      return (
        <LazyThreePieChart
          {...commonProps}
          innerRadius={pieConfig?.innerRadius || 0}
          outerRadius={pieConfig?.outerRadius || 3}
          thickness={0.4}
          showLabels={pieConfig?.showLabels ?? true}
          labelDistance={pieConfig?.labelDistance || 1.2}
        />
      );

    default:
      return (
        <div className="flex items-center justify-center w-full h-full">
          <p className="text-gray-500">Unsupported chart type: {type}</p>
        </div>
      );
  }
};

export default DynamicChart;