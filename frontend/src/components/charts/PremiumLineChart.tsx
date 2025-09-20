'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceLine,
  ReferenceArea,
  Dot,
  LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, Info, ZoomIn, Download } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSpotlight, use3DTilt, useCountAnimation } from '@/hooks/usePremiumEffects';
import { cn } from '@/lib/utils';
import { pactwiseChartTheme, getChartColors } from './chartTheme';
import ChartControls, { SeriesConfig, ChartControlConfig } from './ChartControls';
import InteractiveLegend, { LegendItem } from './InteractiveLegend';

export interface LineChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface LineChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  showArea?: boolean;
  showDots?: boolean;
  dotDisplay?: 'always' | 'hover' | 'none';
  animationDuration?: number;
  gradient?: boolean;
}

export interface TrendLine {
  type: 'linear' | 'polynomial' | 'exponential';
  color?: string;
  strokeDasharray?: string;
  showConfidenceBand?: boolean;
}

export interface Annotation {
  x: string | number;
  y?: number;
  label: string;
  color?: string;
}

interface PremiumLineChartProps {
  data: LineChartDataPoint[];
  series: LineChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  gridStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  showLegend?: boolean;
  showTooltip?: boolean;
  enableZoom?: boolean;
  enable3D?: boolean;
  enableSpotlight?: boolean;
  showTrendLine?: boolean;
  trendLineConfig?: TrendLine;
  annotations?: Annotation[];
  thresholds?: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  onDataPointClick?: (data: any) => void;
  className?: string;
  showInsights?: boolean;
  enableExport?: boolean;
  animateOnScroll?: boolean;
  enableInlineControls?: boolean;
  showInteractiveLegend?: boolean;
}

// Custom animated dot component
const AnimatedDot = (props: any) => {
  const { cx, cy, fill, payload } = props;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <motion.circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fill}
        initial={{ r: 0 }}
        animate={{ r: isHovered ? 8 : 4 }}
        transition={{ duration: 0.2 }}
        style={{
          filter: isHovered ? `drop-shadow(0 0 8px ${fill})` : 'none',
          cursor: 'pointer'
        }}
      />
      {isHovered && (
        <motion.text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          fill={pactwiseChartTheme.colors.primary[0]}
          fontSize="12"
          fontWeight="600"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {payload.value}
        </motion.text>
      )}
    </g>
  );
};

// Custom tooltip with mini chart
const CustomTooltip = ({ active, payload, label, data }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const historicalData = data.slice(Math.max(0, data.findIndex((d: any) => d.name === label) - 5), data.findIndex((d: any) => d.name === label) + 1);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-tooltip"
      style={{
        ...pactwiseChartTheme.tooltip,
        minWidth: '200px'
      }}
    >
      <p style={pactwiseChartTheme.tooltip.label}>{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs">{entry.name}</span>
            </span>
            <span style={pactwiseChartTheme.tooltip.value}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
      
      {/* Mini trend chart */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Recent Trend</p>
        <div className="h-8 flex items-end gap-1">
          {historicalData.map((d: any, i: number) => (
            <div
              key={i}
              className="flex-1 bg-gray-600 rounded-t"
              style={{
                height: `${(d[payload[0].dataKey] / Math.max(...historicalData.map((h: any) => h[payload[0].dataKey]))) * 100}%`,
                backgroundColor: i === historicalData.length - 1 ? payload[0].color : '#6B7280'
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Calculate trend line
const calculateTrendLine = (data: LineChartDataPoint[], series: LineChartSeries[], type: 'linear' | 'polynomial' | 'exponential' = 'linear') => {
  if (!data.length || !series.length) return [];
  
  const mainSeries = series[0];
  const values = data.map(d => d[mainSeries.dataKey] as number);
  
  // Simple linear regression for demo
  const n = values.length;
  const sumX = values.reduce((acc, _, i) => acc + i, 0);
  const sumY = values.reduce((acc, val) => acc + val, 0);
  const sumXY = values.reduce((acc, val, i) => acc + i * val, 0);
  const sumX2 = values.reduce((acc, _, i) => acc + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((d, i) => ({
    ...d,
    trend: intercept + slope * i,
    upperBound: (intercept + slope * i) * 1.1,
    lowerBound: (intercept + slope * i) * 0.9
  }));
};

// Generate insights
const generateInsights = (data: LineChartDataPoint[], series: LineChartSeries[]) => {
  if (!data.length || !series.length) return [];
  
  const insights = [];
  const mainSeries = series[0];
  const values = data.map(d => d[mainSeries.dataKey] as number);
  
  // Calculate trend
  const trend = values[values.length - 1] - values[0];
  const trendPercentage = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  
  insights.push({
    type: trend > 0 ? 'positive' : 'negative',
    icon: trend > 0 ? TrendingUp : TrendingDown,
    text: `${Math.abs(trendPercentage).toFixed(1)}% ${trend > 0 ? 'increase' : 'decrease'} over period`
  });
  
  // Find anomalies
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
  const anomalies = values.filter(v => Math.abs(v - mean) > 2 * stdDev);
  
  if (anomalies.length > 0) {
    insights.push({
      type: 'warning',
      icon: AlertCircle,
      text: `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected`
    });
  }
  
  return insights;
};

export const PremiumLineChart: React.FC<PremiumLineChartProps> = ({
  data,
  series,
  title,
  subtitle,
  height = 400,
  showGrid = true,
  gridStyle = 'dashed',
  showLegend = true,
  showTooltip = true,
  enableZoom = false,
  enable3D = true,
  enableSpotlight = true,
  showTrendLine = false,
  trendLineConfig,
  annotations = [],
  thresholds = [],
  onDataPointClick,
  className,
  showInsights = true,
  enableExport = true,
  animateOnScroll = true,
  enableInlineControls = true,
  showInteractiveLegend = false
}) => {
  const [selectedRange, setSelectedRange] = useState<{ start: number | null; end: number | null }>({ start: null, end: null });
  const [zoomDomain, setZoomDomain] = useState<{ x: [number, number] | null }>({ x: null });
  const [isVisible, setIsVisible] = useState(!animateOnScroll);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.map(s => s.dataKey))
  );
  const [chartConfig, setChartConfig] = useState<ChartControlConfig>({
    showGrid,
    showLabels: false,
    showLegend,
    enable3D
  });
  const chartRef = useRef<HTMLDivElement>(null);
  
  const { ref: tiltRef, transform } = use3DTilt(enable3D ? 5 : 0);
  const { ref: spotlightRef, spotlightStyle } = useSpotlight();
  
  // Intersection observer for scroll animation
  useEffect(() => {
    if (!animateOnScroll) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    
    if (chartRef.current) {
      observer.observe(chartRef.current);
    }
    
    return () => observer.disconnect();
  }, [animateOnScroll]);
  
  const processedData = useMemo(() => {
    if (showTrendLine) {
      return calculateTrendLine(data, series, trendLineConfig?.type);
    }
    return data;
  }, [data, series, showTrendLine, trendLineConfig]);
  
  const insights = useMemo(() => {
    if (showInsights) {
      return generateInsights(data, series);
    }
    return [];
  }, [data, series, showInsights]);
  
  const handleExport = () => {
    // Export as SVG
    const svg = chartRef.current?.querySelector('svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'chart'}.svg`;
      link.click();
    }
  };
  
  const chartColors = getChartColors('categorical');
  
  // Handle series visibility toggle
  const handleSeriesToggle = (key: string, visible: boolean) => {
    setVisibleSeries(prev => {
      const newSet = new Set(prev);
      if (visible) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });
  };
  
  // Handle config changes
  const handleConfigChange = (newConfig: Partial<ChartControlConfig>) => {
    setChartConfig(prev => ({ ...prev, ...newConfig }));
  };
  
  // Prepare series config for controls
  const seriesConfig: SeriesConfig[] = series.map((s, i) => ({
    key: s.dataKey,
    name: s.name,
    color: s.color || chartColors[i],
    visible: visibleSeries.has(s.dataKey)
  }));
  
  // Prepare legend items
  const legendItems: LegendItem[] = series.map((s, i) => ({
    key: s.dataKey,
    name: s.name,
    color: s.color || chartColors[i],
    visible: visibleSeries.has(s.dataKey)
  }));
  
  // Filter visible series
  const visibleSeriesData = series.filter(s => visibleSeries.has(s.dataKey));
  
  return (
    <Card 
      ref={(el) => {
        if (el) {
          (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (enable3D) (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (enableSpotlight) (spotlightRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      }}
      className={cn('premium-line-chart relative overflow-hidden', className)}
      style={{ transform: chartConfig.enable3D ? transform : undefined }}
    >
      {/* Spotlight effect */}
      {enableSpotlight && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={spotlightStyle}
        />
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            {title && <CardTitle className="text-xl font-semibold">{title}</CardTitle>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {enableZoom && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomDomain({ x: null })}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            )}
            {enableExport && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExport}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Insights */}
        {insights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {insights.map((insight, i) => (
              <Badge
                key={i}
                variant={insight.type === 'positive' ? 'default' : insight.type === 'negative' ? 'destructive' : 'secondary'}
                className="gap-1"
              >
                <insight.icon className="h-3 w-3" />
                {insight.text}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ResponsiveContainer width="100%" height={height}>
                <LineChart
                  data={processedData}
                  margin={pactwiseChartTheme.responsive.desktop.margin}
                >
                  <defs>
                    {series.map((s, i) => (
                      <linearGradient key={s.dataKey} id={`gradient-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color || chartColors[i]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={s.color || chartColors[i]} stopOpacity={0.1} />
                      </linearGradient>
                    ))}
                  </defs>
                  
                  {chartConfig.showGrid && (
                    <CartesianGrid
                      {...pactwiseChartTheme.grid}
                      {...pactwiseChartTheme.grid.styles[gridStyle]}
                    />
                  )}
                  
                  <XAxis
                    dataKey="name"
                    stroke={pactwiseChartTheme.axis.stroke}
                    tick={{ fill: pactwiseChartTheme.axis.color, fontSize: pactwiseChartTheme.axis.fontSize }}
                    axisLine={{ strokeWidth: pactwiseChartTheme.axis.strokeWidth }}
                  />
                  
                  <YAxis
                    stroke={pactwiseChartTheme.axis.stroke}
                    tick={{ fill: pactwiseChartTheme.axis.color, fontSize: pactwiseChartTheme.axis.fontSize }}
                    axisLine={{ strokeWidth: pactwiseChartTheme.axis.strokeWidth }}
                  />
                  
                  {showTooltip && (
                    <Tooltip content={<CustomTooltip data={data} />} />
                  )}
                  
                  {chartConfig.showLegend && (
                    <Legend
                      verticalAlign={pactwiseChartTheme.legend.verticalAlign}
                      wrapperStyle={{
                        fontSize: pactwiseChartTheme.legend.fontSize,
                        color: pactwiseChartTheme.legend.color
                      }}
                    />
                  )}
                  
                  {/* Threshold lines */}
                  {thresholds.map((threshold, i) => (
                    <ReferenceLine
                      key={i}
                      y={threshold.value}
                      stroke={threshold.color}
                      strokeDasharray="3 3"
                      label={{ value: threshold.label, fill: threshold.color, fontSize: 10 }}
                    />
                  ))}
                  
                  {/* Annotations */}
                  {annotations.map((annotation, i) => (
                    <ReferenceLine
                      key={i}
                      x={annotation.x}
                      stroke={annotation.color || pactwiseChartTheme.colors.primary[2]}
                      strokeDasharray="5 5"
                      label={{ value: annotation.label, fill: annotation.color || pactwiseChartTheme.colors.primary[0], fontSize: 10 }}
                    />
                  ))}
                  
                  {/* Trend line confidence band */}
                  {showTrendLine && trendLineConfig?.showConfidenceBand && (
                    <Area
                      type="monotone"
                      dataKey="upperBound"
                      stroke="transparent"
                      fill={pactwiseChartTheme.colors.primary[2]}
                      fillOpacity={0.1}
                      animationDuration={1500}
                    />
                  )}
                  
                  {/* Main data lines - only show visible series */}
                  {visibleSeriesData.map((s, i) => {
                    const lineColor = s.color || chartColors[i];
                    // Smart dot display: show dots only if data points are few
                    const dotDisplay = s.dotDisplay || (processedData.length <= 15 ? 'always' : 'none');
                    const showDot = s.showDots !== false && dotDisplay !== 'none';
                    
                    return (
                      <Line
                        key={s.dataKey}
                        type="monotone"
                        dataKey={s.dataKey}
                        name={s.name}
                        stroke={lineColor}
                        strokeWidth={s.strokeWidth || pactwiseChartTheme.line.strokeWidth}
                        strokeDasharray={s.strokeDasharray}
                        dot={showDot ? 
                          (props: any) => <AnimatedDot {...props} fill={lineColor} dataKey={s.dataKey} /> : 
                          false
                        }
                        activeDot={dotDisplay !== 'none' ? {
                          r: 4,
                          stroke: lineColor,
                          strokeWidth: 2,
                          fill: lineColor // Use line color instead of white
                        } : false}
                        animationDuration={s.animationDuration || 1000}
                        animationBegin={i * 100}
                        onClick={onDataPointClick}
                      />
                    );
                  })}
                  
                  {/* Area fills - only show visible series */}
                  {visibleSeriesData.filter(s => s.showArea).map((s, i) => (
                    <Area
                      key={`area-${s.dataKey}`}
                      type="monotone"
                      dataKey={s.dataKey}
                      stroke="transparent"
                      fill={s.gradient ? `url(#gradient-${s.dataKey})` : s.color || chartColors[i]}
                      fillOpacity={pactwiseChartTheme.area.fillOpacity}
                      animationDuration={s.animationDuration || 1000}
                      animationBegin={i * 100}
                    />
                  ))}
                  
                  {/* Trend line */}
                  {showTrendLine && (
                    <Line
                      type="monotone"
                      dataKey="trend"
                      stroke={trendLineConfig?.color || pactwiseChartTheme.colors.brand.mountbattenPink}
                      strokeWidth={2}
                      strokeDasharray={trendLineConfig?.strokeDasharray || "5 5"}
                      dot={false}
                      animationDuration={1500}
                      animationBegin={500}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      
      {/* Inline Controls */}
      {enableInlineControls && (
        <ChartControls
          series={seriesConfig}
          onSeriesToggle={handleSeriesToggle}
          config={chartConfig}
          onConfigChange={handleConfigChange}
          onExport={handleExport}
          position="top-right"
        />
      )}
    </Card>
  );
};

export default PremiumLineChart;