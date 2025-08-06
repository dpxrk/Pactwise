'use client'

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Download,
  Maximize2,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LazyThreeBarChart,
  LazyThreeLineChart,
  LazyThreePieChart,
  LazyThreeAreaChart
} from '../three-charts/LazyThreeCharts';
import type { ChartDataPoint, ChartSeries } from '@/types/three-charts.types';

export type ChartType = "area" | "bar" | "line" | "pie";

// Use types from three-charts
export type { ChartDataPoint, ChartSeries };

interface InteractiveChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  type?: ChartType;
  series?: ChartSeries[];
  height?: number;
  showExport?: boolean;
  showTypeSelector?: boolean;
  showSeriesToggle?: boolean;
  onDataPointClick?: (dataPoint: ChartDataPoint) => void;
  onDrillDown?: (category: string, value: unknown) => void;
  className?: string;
  loading?: boolean;
}

const CHART_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00",
  "#0088fe", "#00c49f", "#ffbb28", "#ff8042", "#8dd1e1"
];



export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  title,
  subtitle,
  data,
  type = "area",
  series: seriesProp,
  height = 300,
  showExport = true,
  showTypeSelector = true,
  showSeriesToggle = true,
  onDataPointClick,
  onDrillDown,
  className,
  loading = false,
}) => {
  const series = seriesProp || [];
  const [chartType, setChartType] = useState<ChartType>(type);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.map(s => s.key))
  );

  // Process data based on visible series
  const processedData = useMemo(() => {
  }, [data, series, visibleSeries]);

  // Calculate trend
  const trend = useMemo(() => {
    if (processedData.length < 2) return null;
    
    const firstValue = processedData[0]?.value || 0;
    const lastValue = processedData[processedData.length - 1]?.value || 0;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: change >= 0 ? 'up' : 'down',
      percentage: Math.abs(change).toFixed(1),
    };
  }, [processedData]);

  const toggleSeries = (seriesKey: string) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesKey)) {
        newSet.delete(seriesKey);
      } else {
        newSet.add(seriesKey);
      }
      return newSet;
    });
  };

  const handleExport = () => {
    // Export functionality - could integrate with CSV export, PDF, etc.
    const dataStr = JSON.stringify(processedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDataPointClick = (data: ChartDataPoint) => {
    if (!data) return;
    
    if (onDataPointClick) {
      onDataPointClick(data);
    }
    
    // Auto drill-down if category and value are available
    if (onDrillDown && data?.category) {
      onDrillDown(data.category, data.value);
    }
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!processedData || processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No data available
        </div>
      );
    }

    // Convert color arrays to theme
    const threeJsTheme = {
      accentColors: CHART_COLORS,
    };

    // Filter visible series
    const visibleSeriesData = series.filter(s => visibleSeries.has(s.key));

    const commonProps = {
      data: processedData,
      width: 600,
      height,
      onClick: handleDataPointClick,
      onHover: () => {
        // Handle hover events if needed
      },
      theme: threeJsTheme,
      ...(visibleSeriesData.length > 0 && { series: visibleSeriesData }),
      className: "w-full",
    };

    switch (chartType) {
      case "area":
        return (
          <LazyThreeAreaChart
            {...commonProps}
            opacity={0.7}
            showPoints={false}
            smoothCurve={true}
            stackedAreas={series.length > 1}
          />
        );

      case "bar":
        return (
          <LazyThreeBarChart
            {...commonProps}
            barWidth={0.6}
            barDepth={0.6}
            spacing={1.5}
            showGrid={true}
            showAxes={false}
          />
        );

      case "line":
        return (
          <LazyThreeLineChart
            {...commonProps}
            lineWidth={0.05}
            pointSize={0.08}
            showPoints={true}
            smoothCurve={true}
            showArea={false}
          />
        );

      case "pie":
        return (
          <LazyThreePieChart
            {...commonProps}
            innerRadius={series.length > 3 ? 1 : 0}
            outerRadius={3}
            thickness={0.4}
            showLabels={true}
            labelDistance={1.2}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center space-x-2">
              <span>{title}</span>
              {trend && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  {trend.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {trend.percentage}%
                  </span>
                </Badge>
              )}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {showSeriesToggle && series.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {series.map((s) => (
                    <DropdownMenuItem
                      key={s.key}
                      onClick={() => toggleSeries(s.key)}
                      className="flex items-center space-x-2"
                    >
                      {visibleSeries.has(s.key) ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span>{s.name}</span>
                      <div
                        className="w-3 h-3 rounded-full ml-auto"
                        style={{ backgroundColor: s.color }}
                      />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {showTypeSelector && (
              <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">
                    <div className="flex items-center space-x-2">
                      <AreaChartIcon className="h-4 w-4" />
                      <span>Area</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Bar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center space-x-2">
                      <LineChartIcon className="h-4 w-4" />
                      <span>Line</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center space-x-2">
                      <PieChartIcon className="h-4 w-4" />
                      <span>Pie</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {showExport && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}

            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default InteractiveChart;