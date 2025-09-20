'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Dot
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Zap, Download, Maximize2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useSpotlight, useParallax } from '@/hooks/usePremiumEffects';
import { cn } from '@/lib/utils';
import { pactwiseChartTheme, getChartColors } from './chartTheme';
import ChartControls, { SeriesConfig, ChartControlConfig } from './ChartControls';

export interface AreaChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface AreaChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  stackId?: string;
  type?: 'monotone' | 'linear' | 'step' | 'natural';
  animationDuration?: number;
  strokeWidth?: number;
  fillOpacity?: number;
  gradientId?: string;
}

interface PremiumAreaChartProps {
  data: AreaChartDataPoint[];
  series: AreaChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  enableSpotlight?: boolean;
  enableParallax?: boolean;
  enableGradientMesh?: boolean;
  smoothing?: number; // 0-1, controls curve smoothness
  fillMode?: 'gradient' | 'solid' | 'pattern';
  showPeaks?: boolean;
  showAnomalies?: boolean;
  anomalyThreshold?: number;
  onDataPointClick?: (data: any) => void;
  className?: string;
  enableExport?: boolean;
  enableFullscreen?: boolean;
  enableInlineControls?: boolean;
}

// Custom gradient definitions component
const ChartGradients: React.FC<{ series: AreaChartSeries[] }> = ({ series }) => {
  const chartColors = getChartColors('categorical');
  
  return (
    <defs>
      {/* Standard gradients for each series */}
      {series.map((s, i) => {
        const color = s.color || chartColors[i];
        return (
          <React.Fragment key={s.dataKey}>
            {/* Primary gradient */}
            <linearGradient id={s.gradientId || `area-gradient-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="50%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
            
            {/* Hover gradient */}
            <linearGradient id={`area-gradient-hover-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
            
            {/* Pattern fill */}
            <pattern id={`pattern-${s.dataKey}`} patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill={color} opacity="0.1" />
              <circle cx="2" cy="2" r="1" fill={color} opacity="0.3" />
            </pattern>
          </React.Fragment>
        );
      })}
      
      {/* Gradient mesh background */}
      <radialGradient id="gradient-mesh" cx="50%" cy="50%">
        <stop offset="0%" stopColor={pactwiseChartTheme.colors.brand.mountbattenPink} stopOpacity={0.05} />
        <stop offset="100%" stopColor={pactwiseChartTheme.colors.brand.darkPurple} stopOpacity={0.02} />
      </radialGradient>
      
      {/* Animated gradient */}
      <linearGradient id="animated-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={pactwiseChartTheme.colors.brand.mountbattenPink} stopOpacity={0.2}>
          <animate attributeName="offset" values="0;1;0" dur="8s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stopColor={pactwiseChartTheme.colors.brand.darkPurple} stopOpacity={0.3}>
          <animate attributeName="offset" values="0;1;0" dur="8s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor={pactwiseChartTheme.colors.brand.mountbattenPink} stopOpacity={0.2}>
          <animate attributeName="offset" values="0;1;0" dur="8s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
    </defs>
  );
};

// Custom animated dot for peaks
const PeakDot = (props: any) => {
  const { cx, cy, fill, payload, dataKey } = props;
  const [isAnimated, setIsAnimated] = useState(false);
  
  useEffect(() => {
    setIsAnimated(true);
  }, []);
  
  // Only show dot for peak values
  const allValues = Object.keys(payload)
    .filter(key => typeof payload[key] === 'number')
    .map(key => payload[key] as number);
  const maxValue = Math.max(...allValues);
  const isPeak = payload[dataKey] === maxValue;
  
  if (!isPeak) return null;
  
  return (
    <g>
      {/* Subtle ring on hover - removed pulsing animation */}
      {isPeak && (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="none"
          stroke={fill}
          strokeWidth={1}
          opacity={0.5}
        />
      )}
      
      {/* Main dot - using line color */}
      <circle cx={cx} cy={cy} r={3} fill={fill} stroke={fill} strokeWidth={1} opacity={0.9} />
      
      {/* Value label */}
      <motion.text
        x={cx}
        y={cy - 15}
        textAnchor="middle"
        fill={pactwiseChartTheme.colors.primary[0]}
        fontSize="10"
        fontWeight="bold"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {payload[dataKey].toLocaleString()}
      </motion.text>
    </g>
  );
};

// Custom tooltip with gradient background
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="premium-tooltip"
      style={{
        ...pactwiseChartTheme.tooltip,
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(41, 21, 40, 0.95) 100%)',
      }}
    >
      <p style={pactwiseChartTheme.tooltip.label}>{label}</p>
      <div className="space-y-2 mt-2">
        {payload.map((entry: any, index: number) => {
          const trend = index > 0 ? (entry.value - payload[0].value) : 0;
          return (
            <div key={index}>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <motion.div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-xs font-medium">{entry.name}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span style={pactwiseChartTheme.tooltip.value}>
                    {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                  </span>
                  {trend !== 0 && (
                    <span className={cn("text-xs", trend > 0 ? "text-green-400" : "text-red-400")}>
                      {trend > 0 ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
                    </span>
                  )}
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: entry.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(entry.value / Math.max(...payload.map((p: any) => p.value))) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Detect anomalies in data
const detectAnomalies = (data: AreaChartDataPoint[], series: AreaChartSeries[], threshold: number = 2) => {
  const anomalies: Array<{ index: number; series: string; value: number }> = [];
  
  series.forEach(s => {
    const values = data.map(d => d[s.dataKey] as number || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    
    values.forEach((value, index) => {
      if (Math.abs(value - mean) > threshold * stdDev) {
        anomalies.push({ index, series: s.dataKey, value });
      }
    });
  });
  
  return anomalies;
};

export const PremiumAreaChart: React.FC<PremiumAreaChartProps> = ({
  data,
  series,
  title,
  subtitle,
  height = 400,
  showGrid = true,
  showLegend = true,
  showBrush = false,
  enableSpotlight = true,
  enableParallax = false,
  enableGradientMesh = true,
  smoothing = 0.5,
  fillMode = 'gradient',
  showPeaks = true,
  showAnomalies = false,
  anomalyThreshold = 2,
  onDataPointClick,
  className,
  enableExport = true,
  enableFullscreen = false,
  enableInlineControls = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.map(s => s.dataKey))
  );
  const [chartConfig, setChartConfig] = useState<ChartControlConfig>({
    showGrid,
    showLabels: false,
    showLegend,
    enable3D: false
  });
  const chartRef = useRef<HTMLDivElement>(null);
  
  const { ref: spotlightRef, spotlightStyle } = useSpotlight();
  const { ref: parallaxRef, offset } = useParallax(0.2);
  
  const anomalies = useMemo(() => {
    if (showAnomalies) {
      return detectAnomalies(data, series, anomalyThreshold);
    }
    return [];
  }, [data, series, showAnomalies, anomalyThreshold]);
  
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
  
  // Filter visible series
  const visibleSeriesData = series.filter(s => visibleSeries.has(s.dataKey));
  
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
  
  const containerHeight = isFullscreen ? window.innerHeight - 150 : height;
  
  return (
    <Card
      ref={(el) => {
        if (el) {
          (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (enableSpotlight) (spotlightRef as React.MutableRefObject<HTMLElement | null>).current = el;
          if (enableParallax) (parallaxRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }
      }}
      className={cn(
        'premium-area-chart relative overflow-hidden',
        isFullscreen && 'fixed inset-4 z-50',
        className
      )}
      style={{ transform: enableParallax ? `translateY(${offset}px)` : undefined }}
    >
      {/* Gradient mesh background - reduced opacity and blur */}
      {enableGradientMesh && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: pactwiseChartTheme.colors.gradients.mesh,
            filter: 'blur(20px)'
          }}
        />
      )}
      
      {/* Spotlight effect */}
      {enableSpotlight && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={spotlightStyle}
        />
      )}
      
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-start justify-between">
          <div>
            {title && <CardTitle className="text-xl font-semibold">{title}</CardTitle>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            
            {/* Anomaly alerts */}
            {anomalies.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="destructive" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {anomalies.length} Anomal{anomalies.length === 1 ? 'y' : 'ies'} Detected
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Smoothing control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Smoothing</span>
              <Slider
                value={[smoothing]}
                max={1}
                step={0.1}
                className="w-20"
                onValueChange={([value]) => {
                  // This would typically update the smoothing prop
                  console.log('Smoothing:', value);
                }}
              />
            </div>
            
            {enableFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8"
              >
                <Maximize2 className="h-4 w-4" />
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
      </CardHeader>
      
      <CardContent className="relative z-10">
        <ResponsiveContainer width="100%" height={containerHeight}>
          <AreaChart
            data={data}
            margin={pactwiseChartTheme.responsive.desktop.margin}
            onClick={onDataPointClick}
          >
            <ChartGradients series={series} />
            
            {chartConfig.showGrid && (
              <CartesianGrid
                {...pactwiseChartTheme.grid}
                strokeDasharray="3 3"
                vertical={false}
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
            
            <Tooltip content={<CustomTooltip />} />
            
            {chartConfig.showLegend && (
              <Legend
                {...pactwiseChartTheme.legend}
                onMouseEnter={(e) => setHoveredSeries(e.dataKey)}
                onMouseLeave={() => setHoveredSeries(null)}
              />
            )}
            
            {/* Anomaly reference lines */}
            {anomalies.map((anomaly, i) => (
              <ReferenceLine
                key={i}
                x={data[anomaly.index]?.name}
                stroke={pactwiseChartTheme.colors.danger}
                strokeDasharray="5 5"
                label={{
                  value: "!",
                  fill: pactwiseChartTheme.colors.danger,
                  fontSize: 12
                }}
              />
            ))}
            
            {/* Render areas - only visible series */}
            {visibleSeriesData.map((s, i) => {
              const color = s.color || chartColors[i];
              const isHovered = hoveredSeries === s.dataKey;
              const fillId = fillMode === 'gradient' 
                ? (isHovered ? `area-gradient-hover-${s.dataKey}` : s.gradientId || `area-gradient-${s.dataKey}`)
                : fillMode === 'pattern'
                ? `pattern-${s.dataKey}`
                : color;
              
              return (
                <Area
                  key={s.dataKey}
                  type={s.type || 'monotone'}
                  dataKey={s.dataKey}
                  name={s.name}
                  stackId={s.stackId}
                  stroke={color}
                  strokeWidth={s.strokeWidth || (isHovered ? 3 : 2)}
                  fill={`url(#${fillId})`}
                  fillOpacity={s.fillOpacity || (isHovered ? 0.4 : 0.3)}
                  dot={showPeaks ? <PeakDot /> : false}
                  activeDot={{
                    r: 5,
                    stroke: color,
                    strokeWidth: 2,
                    fill: color // Use area color instead of white
                  }}
                  animationDuration={s.animationDuration || 800} // Faster animation
                  animationBegin={i * 50} // Less stagger delay
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
            
            {/* Brush for zooming */}
            {showBrush && (
              <Brush
                dataKey="name"
                height={30}
                stroke={pactwiseChartTheme.colors.primary[2]}
                fill={pactwiseChartTheme.colors.secondary[0]}
                onChange={(domain: any) => setBrushDomain(domain)}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Activity indicator */}
        <motion.div
          className="absolute top-2 right-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Activity className="h-4 w-4 text-green-500" />
        </motion.div>
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

export default PremiumAreaChart;