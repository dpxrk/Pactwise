'use client'

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChartType = "area" | "bar" | "line" | "pie";

export interface ChartDataPoint {
  label?: string;
  value: number;
  name?: string;
  [key: string]: any;
}

export interface ChartSeries {
  name: string;
  data?: ChartDataPoint[];
  color?: string;
  key?: string;
  dataKey?: string;
  visible?: boolean;
}

export interface InteractiveChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  series?: ChartSeries[];
  type?: ChartType;
  initialChartType?: ChartType;
  trend?: number;
  trendLabel?: string;
  allowChartTypeChange?: boolean;
  allowExport?: boolean;
  allowFullscreen?: boolean;
  height?: number;
  className?: string;
  showTypeSelector?: boolean;
  showExport?: boolean;
  onDataPointClick?: (point: ChartDataPoint) => void;
  onDrillDown?: (category: string) => void;
  customActions?: React.ReactNode;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function InteractiveChart({
  title,
  subtitle,
  data,
  series,
  type,
  initialChartType = "line",
  trend,
  trendLabel,
  allowChartTypeChange = true,
  allowExport = true,
  allowFullscreen = true,
  showTypeSelector,
  showExport,
  height = 350,
  className,
  onDataPointClick,
  onDrillDown,
  customActions,
}: InteractiveChartProps) {
  const [chartType, setChartType] = useState<ChartType>(type || initialChartType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const visibleSeries = useMemo(() => {
    if (!series) return null;
    return series.filter((s) => !hiddenSeries.has(s.name));
  }, [series, hiddenSeries]);

  const chartData = useMemo(() => {
    if (series && series.length > 0) {
      // Combine series data for multi-series charts
      const combinedData: any[] = [];
      const labels = new Set<string>();
      
      series.forEach(s => {
        s.data.forEach(d => {
          labels.add(d.label || d.name || '');
        });
      });
      
      Array.from(labels).forEach(label => {
        const point: any = { name: label };
        series.forEach(s => {
          const dataPoint = s.data.find(d => (d.label || d.name) === label);
          point[s.name] = dataPoint?.value || 0;
        });
        combinedData.push(point);
      });
      
      return combinedData;
    }
    return data.map(d => ({
      ...d,
      name: d.label || d.name || '',
      value: d.value
    }));
  }, [data, series]);

  const toggleSeries = (seriesName: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  };

  const handleExport = () => {
    // Simple CSV export
    const csvData = chartData.map(row => 
      Object.values(row).join(',')
    ).join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_data.csv`;
    a.click();
  };

  const renderChart = () => {
    const chartHeight = isFullscreen ? window.innerHeight - 200 : height;
    
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {series ? (
                visibleSeries?.map((s, i) => (
                  <Bar 
                    key={s.name} 
                    dataKey={s.name} 
                    fill={s.color || COLORS[i % COLORS.length]} 
                  />
                ))
              ) : (
                <Bar dataKey="value" fill={COLORS[0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "area":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {series ? (
                visibleSeries?.map((s, i) => (
                  <Area 
                    key={s.name}
                    type="monotone" 
                    dataKey={s.name} 
                    stroke={s.color || COLORS[i % COLORS.length]}
                    fill={s.color || COLORS[i % COLORS.length]} 
                    fillOpacity={0.6}
                  />
                ))
              ) : (
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={COLORS[0]} 
                  fill={COLORS[0]}
                  fillOpacity={0.6}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case "line":
      default:
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {series ? (
                visibleSeries?.map((s, i) => (
                  <Line 
                    key={s.name}
                    type="monotone" 
                    dataKey={s.name} 
                    stroke={s.color || COLORS[i % COLORS.length]}
                    strokeWidth={2}
                  />
                ))
              ) : (
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={COLORS[0]}
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={cn("relative", isFullscreen && "fixed inset-4 z-50", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={trend >= 0 ? "default" : "destructive"}
                  className="gap-1"
                >
                  {trend >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(trend)}%
                </Badge>
                {trendLabel && (
                  <span className="text-xs text-muted-foreground">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {allowChartTypeChange && (
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChartIcon className="h-4 w-4" />
                      Line Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Bar Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center gap-2">
                      <AreaChartIcon className="h-4 w-4" />
                      Area Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Pie Chart
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {series?.map((s) => (
                  <DropdownMenuItem
                    key={s.name}
                    onClick={() => toggleSeries(s.name)}
                  >
                    {hiddenSeries.has(s.name) ? (
                      <EyeOff className="h-4 w-4 mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {allowExport && (
              <Button variant="ghost" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {allowFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            
            {customActions}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}

export default InteractiveChart;