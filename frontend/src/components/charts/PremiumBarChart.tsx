'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Layers, Download, Filter, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { use3DTilt, useMagnetic, useStaggerReveal } from '@/hooks/usePremiumEffects';
import { cn } from '@/lib/utils';
import { pactwiseChartTheme, getChartColors } from './chartTheme';
import ChartControls, { SeriesConfig, ChartControlConfig } from './ChartControls';

export interface BarChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface BarChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  stackId?: string;
  gradient?: boolean;
}

interface PremiumBarChartProps {
  data: BarChartDataPoint[];
  series?: BarChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  barSize?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
  enable3D?: boolean;
  enableStagger?: boolean;
  enableDrillDown?: boolean;
  groupBy?: string;
  sortBy?: 'name' | 'value' | 'none';
  sortOrder?: 'asc' | 'desc';
  showComparison?: boolean;
  comparisonData?: BarChartDataPoint[];
  thresholds?: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  onBarClick?: (data: any) => void;
  className?: string;
  showTrend?: boolean;
  enableExport?: boolean;
  enableInlineControls?: boolean;
}

// Custom 3D bar shape - simplified for better rendering
const Bar3D = (props: any) => {
  const { fill, x, y, width, height, index } = props;
  const depth = 3;
  const [isHovered, setIsHovered] = useState(false);
  
  // Ensure coordinates are valid
  if (!x || !y || !width || !height || width <= 0 || height <= 0) {
    return null;
  }
  
  return (
    <g 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Simple 3D effect with offset rectangles */}
      {/* Back layer for depth */}
      <rect
        x={x + depth}
        y={y - depth}
        width={width}
        height={height + depth}
        fill={fill}
        opacity={0.2}
      />
      
      {/* Middle layer */}
      <rect
        x={x + depth/2}
        y={y - depth/2}
        width={width}
        height={height + depth/2}
        fill={fill}
        opacity={0.3}
      />
      
      {/* Main bar */}
      <motion.rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        initial={{ scaleY: 0, transformOrigin: 'bottom' }}
        animate={{ 
          scaleY: 1,
          filter: isHovered ? `brightness(1.15)` : 'brightness(1)'
        }}
        transition={{ 
          duration: 0.6,
          delay: index * 0.03,
          ease: 'easeOut'
        }}
      />
      
      {/* Top edge highlight for 3D effect */}
      <rect
        x={x}
        y={y}
        width={width}
        height={2}
        fill="white"
        opacity={0.2}
      />
      
      {/* Hover highlight */}
      {isHovered && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="white"
          opacity={0.08}
        />
      )}
    </g>
  );
};

// Custom animated label
const AnimatedLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.text
          x={x + width / 2}
          y={y - 5}
          fill={pactwiseChartTheme.colors.primary[0]}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </motion.text>
      )}
    </AnimatePresence>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-tooltip"
      style={pactwiseChartTheme.tooltip}
    >
      <p style={pactwiseChartTheme.tooltip.label}>{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => {
          const percentage = ((entry.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs">{entry.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <span style={pactwiseChartTheme.tooltip.value}>
                  {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </span>
                {payload.length > 1 && (
                  <span className="text-xs text-gray-400">({percentage}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {payload.length > 1 && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex justify-between">
            <span className="text-xs text-gray-400">Total</span>
            <span className="font-bold">{total.toLocaleString()}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const PremiumBarChart: React.FC<PremiumBarChartProps> = ({
  data,
  series,
  title,
  subtitle,
  height = 400,
  orientation = 'vertical',
  barSize,
  showGrid = true,
  showLegend = true,
  showValues = true,
  enable3D = true,
  enableStagger = true,
  enableDrillDown = false,
  groupBy,
  sortBy = 'none',
  sortOrder = 'desc',
  showComparison = false,
  comparisonData,
  thresholds = [],
  onBarClick,
  className,
  showTrend = true,
  enableExport = true,
  enableInlineControls = false
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [animationComplete, setAnimationComplete] = useState(false);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series?.map(s => s.dataKey) || ['value'])
  );
  const [chartConfig, setChartConfig] = useState<ChartControlConfig>({
    showGrid,
    showLabels: showValues,
    showLegend,
    enable3D
  });
  const chartRef = useRef<HTMLDivElement>(null);
  const { ref: tiltRef, transform } = use3DTilt(chartConfig.enable3D ? 2 : 0); // Reduced tilt for stability
  const { ref: staggerRef, visibleItems } = useStaggerReveal(50);
  
  // Process and sort data
  const processedData = useMemo(() => {
    let processed = [...data];
    
    // Apply grouping filter
    if (groupBy && selectedGroup !== 'all') {
      processed = processed.filter(d => d[groupBy] === selectedGroup);
    }
    
    // Apply sorting
    if (sortBy !== 'none') {
      processed.sort((a, b) => {
        const aVal = sortBy === 'name' ? a.name : a.value;
        const bVal = sortBy === 'name' ? b.name : b.value;
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }
    
    // Add comparison data if provided
    if (showComparison && comparisonData) {
      processed = processed.map((d, i) => ({
        ...d,
        comparison: comparisonData[i]?.value || 0
      }));
    }
    
    return processed;
  }, [data, groupBy, selectedGroup, sortBy, sortOrder, showComparison, comparisonData]);
  
  // Calculate trends
  const trend = useMemo(() => {
    if (!showTrend || !series || series.length === 0) return null;
    
    const total = processedData.reduce((sum, d) => sum + (d[series[0].dataKey] as number || 0), 0);
    const average = total / processedData.length;
    const max = Math.max(...processedData.map(d => d[series[0].dataKey] as number || 0));
    const min = Math.min(...processedData.map(d => d[series[0].dataKey] as number || 0));
    
    return { total, average, max, min };
  }, [processedData, series, showTrend]);
  
  // Get unique groups for filtering
  const groups = useMemo(() => {
    if (!groupBy) return [];
    return Array.from(new Set(data.map(d => d[groupBy] as string)));
  }, [data, groupBy]);
  
  const handleExport = () => {
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
  const defaultSeries = series && series.length > 0 ? series : [{ dataKey: 'value', name: 'Value' }];
  
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
  const seriesConfig: SeriesConfig[] = defaultSeries.map((s, i) => ({
    key: s.dataKey,
    name: s.name,
    color: s.color || chartColors[i],
    visible: visibleSeries.has(s.dataKey)
  }));
  
  // Filter visible series
  const visibleSeriesData = defaultSeries.filter(s => visibleSeries.has(s.dataKey));
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1500);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Card
      ref={(el) => {
        if (el) {
          (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (enable3D) (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (enableStagger) (staggerRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }
      }}
      className={cn('premium-bar-chart relative overflow-hidden', className)}
      style={{ transform: chartConfig.enable3D ? transform : undefined }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            {title && <CardTitle className="text-xl font-semibold">{title}</CardTitle>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            
            {/* Trend badges */}
            {showTrend && trend && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Avg: {trend.average.toFixed(0)}
                </Badge>
                <Badge variant="secondary">
                  Total: {trend.total.toLocaleString()}
                </Badge>
                <Badge variant="secondary">
                  Range: {trend.min} - {trend.max}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Group filter */}
            {groupBy && groups.length > 0 && (
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {enableDrillDown && (
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Layers className="h-4 w-4" />
              </Button>
            )}
            
            {enableExport && (
              <Button variant="ghost" size="icon" onClick={handleExport} className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {orientation === 'horizontal' ? (
            // Horizontal bar chart
            <BarChart
              data={processedData}
              layout="horizontal"
              margin={pactwiseChartTheme.responsive.desktop.margin}
            >
              <defs>
                {visibleSeriesData.map((s, i) => (
                  <linearGradient key={s.dataKey} id={`bar-gradient-${s.dataKey}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={s.color || chartColors[i]} stopOpacity={1} />
                    <stop offset="100%" stopColor={s.color || chartColors[i]} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              
              {chartConfig.showGrid && (
                <CartesianGrid {...pactwiseChartTheme.grid} />
              )}
              
              <XAxis
                type="number"
                stroke={pactwiseChartTheme.axis.stroke}
                tick={{ fill: pactwiseChartTheme.axis.color, fontSize: pactwiseChartTheme.axis.fontSize }}
              />
              
              <YAxis
                dataKey="name"
                type="category"
                stroke={pactwiseChartTheme.axis.stroke}
                tick={{ fill: pactwiseChartTheme.axis.color, fontSize: pactwiseChartTheme.axis.fontSize }}
                width={100}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {chartConfig.showLegend && defaultSeries.length > 1 && (
                <Legend {...pactwiseChartTheme.legend} />
              )}
              
              {thresholds.map((threshold, i) => (
                <ReferenceLine
                  key={i}
                  x={threshold.value}
                  stroke={threshold.color}
                  strokeDasharray="3 3"
                  label={{ value: threshold.label, fill: threshold.color }}
                />
              ))}
              
              {visibleSeriesData.map((s, i) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name}
                  fill={s.gradient ? `url(#bar-gradient-${s.dataKey})` : s.color || chartColors[i]}
                  stackId={s.stackId}
                  maxBarSize={barSize || pactwiseChartTheme.bar.maxBarSize}
                  onClick={onBarClick}
                  animationDuration={1000}
                  animationBegin={i * 100}
                >
                  {chartConfig.showLabels && <LabelList dataKey={s.dataKey} position="right" content={<AnimatedLabel />} />}
                </Bar>
              ))}
              
              {showComparison && (
                <Bar
                  dataKey="comparison"
                  name="Previous Period"
                  fill={pactwiseChartTheme.colors.secondary[3]}
                  opacity={0.5}
                  maxBarSize={barSize || pactwiseChartTheme.bar.maxBarSize}
                />
              )}
            </BarChart>
          ) : (
            // Vertical bar chart
            <BarChart
              data={processedData}
              margin={pactwiseChartTheme.responsive.desktop.margin}
            >
              <defs>
                {visibleSeriesData.map((s, i) => (
                  <linearGradient key={s.dataKey} id={`bar-gradient-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color || chartColors[i]} stopOpacity={1} />
                    <stop offset="100%" stopColor={s.color || chartColors[i]} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              
              {chartConfig.showGrid && (
                <CartesianGrid {...pactwiseChartTheme.grid} />
              )}
              
              <XAxis
                dataKey="name"
                stroke={pactwiseChartTheme.axis.stroke}
                tick={{ fill: pactwiseChartTheme.axis.color, fontSize: pactwiseChartTheme.axis.fontSize }}
                angle={processedData.length > 10 ? -45 : 0}
                textAnchor={processedData.length > 10 ? "end" : "middle"}
                height={processedData.length > 10 ? 80 : undefined}
              />
              
              <YAxis
                stroke={pactwiseChartTheme.axis.stroke}
                tick={{ fill: pactwiseChartTheme.axis.color, fontSize: pactwiseChartTheme.axis.fontSize }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {chartConfig.showLegend && defaultSeries.length > 1 && (
                <Legend {...pactwiseChartTheme.legend} />
              )}
              
              {thresholds.map((threshold, i) => (
                <ReferenceLine
                  key={i}
                  y={threshold.value}
                  stroke={threshold.color}
                  strokeDasharray="3 3"
                  label={{ value: threshold.label, fill: threshold.color }}
                />
              ))}
              
              {visibleSeriesData.map((s, i) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name}
                  fill={s.gradient ? `url(#bar-gradient-${s.dataKey})` : s.color || chartColors[i]}
                  stackId={s.stackId}
                  maxBarSize={barSize || pactwiseChartTheme.bar.maxBarSize}
                  shape={chartConfig.enable3D ? Bar3D : undefined}
                  onClick={onBarClick}
                  animationDuration={1000}
                  animationBegin={i * 100}
                  radius={chartConfig.enable3D ? undefined : pactwiseChartTheme.bar.radius}
                >
                  {chartConfig.showLabels && !chartConfig.enable3D && (
                    <LabelList dataKey={s.dataKey} position="top" content={<AnimatedLabel />} />
                  )}
                  
                  {/* Custom colors per bar */}
                  {processedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.value < 0
                          ? pactwiseChartTheme.colors.danger
                          : s.color || chartColors[i % chartColors.length]
                      }
                    />
                  ))}
                </Bar>
              ))}
              
              {showComparison && (
                <Bar
                  dataKey="comparison"
                  name="Previous Period"
                  fill={pactwiseChartTheme.colors.secondary[3]}
                  opacity={0.5}
                  maxBarSize={(barSize || pactwiseChartTheme.bar.maxBarSize) * 0.8}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
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

export default PremiumBarChart;