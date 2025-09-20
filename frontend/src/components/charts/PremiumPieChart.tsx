'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChartIcon, Download, Layers, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { use3DTilt, useCountAnimation } from '@/hooks/usePremiumEffects';
import { cn } from '@/lib/utils';
import { pactwiseChartTheme, getChartColors } from './chartTheme';
import ChartControls, { SeriesConfig, ChartControlConfig } from './ChartControls';

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

interface PremiumPieChartProps {
  data: PieChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  enable3D?: boolean;
  enableNested?: boolean;
  nestedData?: PieChartDataPoint[];
  showLabels?: boolean;
  labelType?: 'percentage' | 'value' | 'name';
  showLegend?: boolean;
  legendPosition?: 'right' | 'bottom';
  enableAnimation?: boolean;
  animationDuration?: number;
  onSliceClick?: (data: PieChartDataPoint) => void;
  className?: string;
  enableExport?: boolean;
  showTotal?: boolean;
  centerContent?: React.ReactNode;
  enableInlineControls?: boolean;
}

// Custom 3D pie slice with extrusion effect
const renderActiveShape = (props: any) => {
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;
  
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 15;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';
  
  // 3D extrusion depth
  const depth = 10;
  
  return (
    <g>
      {/* Shadow layer for 3D effect */}
      <Sector
        cx={cx + 2}
        cy={cy + 2}
        innerRadius={innerRadius}
        outerRadius={outerRadius + depth}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.2}
      />
      
      {/* Side face of 3D slice */}
      <Sector
        cx={cx + 1}
        cy={cy + 1}
        innerRadius={innerRadius}
        outerRadius={outerRadius + depth / 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
      
      {/* Main slice */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      
      {/* Inner highlight */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill="white"
        opacity={0.1}
      />
      
      {/* Connector line */}
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      
      {/* Labels */}
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill={pactwiseChartTheme.colors.primary[0]} className="font-semibold text-sm">
        {payload.name}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={16} textAnchor={textAnchor} fill={pactwiseChartTheme.colors.primary[2]} className="text-xs">
        {value.toLocaleString()} ({(percent * 100).toFixed(1)}%)
      </text>
    </g>
  );
};

// Custom animated label with improved visibility
const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, value, name, labelType, fill } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Don't show labels for very small slices
  if (percent < 0.03) return null;
  
  // For small slices (< 5%), position labels outside
  const isSmallSlice = percent < 0.05;
  const labelRadius = isSmallSlice ? outerRadius + 20 : radius;
  const labelX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const labelY = cy + labelRadius * Math.sin(-midAngle * RADIAN);
  
  let displayText = '';
  switch (labelType) {
    case 'percentage':
      displayText = `${(percent * 100).toFixed(0)}%`;
      break;
    case 'value':
      displayText = value.toLocaleString();
      break;
    case 'name':
      displayText = name;
      break;
    default:
      displayText = `${(percent * 100).toFixed(0)}%`;
  }
  
  // Determine text color based on background
  const isLightColor = (color: string) => {
    // Simple heuristic - you could make this more sophisticated
    return color.includes('F') || color.includes('E') || color.includes('D');
  };
  const textColor = isSmallSlice ? pactwiseChartTheme.colors.primary[0] : 
                    (isLightColor(fill) ? pactwiseChartTheme.colors.primary[0] : 'white');
  
  return (
    <g>
      {/* Background for better contrast */}
      {isSmallSlice && (
        <rect
          x={labelX - 20}
          y={labelY - 8}
          width={40}
          height={16}
          fill="white"
          opacity={0.9}
          rx={2}
        />
      )}
      
      {/* Leader line for external labels */}
      {isSmallSlice && (
        <line
          x1={cx + (outerRadius - 5) * Math.cos(-midAngle * RADIAN)}
          y1={cy + (outerRadius - 5) * Math.sin(-midAngle * RADIAN)}
          x2={labelX}
          y2={labelY}
          stroke={fill}
          strokeWidth={1}
          opacity={0.5}
        />
      )}
      
      <motion.text
        x={labelX}
        y={labelY}
        fill={textColor}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-semibold"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: props.index * 0.05 }}
        style={{
          filter: isSmallSlice ? 'none' : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8))',
          pointerEvents: 'none'
        }}
      >
        {displayText}
      </motion.text>
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0];
  const percentage = ((data.value / data.payload.totalValue) * 100).toFixed(1);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-tooltip"
      style={{
        ...pactwiseChartTheme.tooltip,
        minWidth: '180px'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.payload.fill }}
        />
        <p style={pactwiseChartTheme.tooltip.label}>{data.name}</p>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Value</span>
          <span style={pactwiseChartTheme.tooltip.value}>
            {data.value.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Percentage</span>
          <span className="text-sm font-semibold">{percentage}%</span>
        </div>
      </div>
      
      {/* Visual percentage bar */}
      <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: data.payload.fill }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      {/* Metadata if available */}
      {data.payload.metadata && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          {Object.entries(data.payload.metadata).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-gray-400 capitalize">{key}</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export const PremiumPieChart: React.FC<PremiumPieChartProps> = ({
  data,
  title,
  subtitle,
  height = 400,
  innerRadius = 0,
  outerRadius = '80%',
  enable3D = true,
  enableNested = false,
  nestedData,
  showLabels = true,
  labelType = 'percentage',
  showLegend = true,
  legendPosition = 'right',
  enableAnimation = true,
  animationDuration = 1000,
  onSliceClick,
  className,
  enableExport = true,
  showTotal = true,
  centerContent,
  enableInlineControls = false
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [visibleSlices, setVisibleSlices] = useState<Set<string>>(
    new Set(data.map(d => d.name))
  );
  const [chartConfig, setChartConfig] = useState<ChartControlConfig>({
    showGrid: false,
    showLabels,
    showLegend,
    enable3D
  });
  const chartRef = useRef<HTMLDivElement>(null);
  const { ref: tiltRef, transform } = use3DTilt(chartConfig.enable3D ? 5 : 0);
  
  const chartColors = getChartColors('categorical');
  
  // Handle slice visibility toggle
  const handleSliceToggle = (name: string, visible: boolean) => {
    setVisibleSlices(prev => {
      const newSet = new Set(prev);
      if (visible) {
        newSet.add(name);
      } else {
        newSet.delete(name);
      }
      return newSet;
    });
  };
  
  // Handle config changes
  const handleConfigChange = (newConfig: Partial<ChartControlConfig>) => {
    setChartConfig(prev => ({ ...prev, ...newConfig }));
  };
  
  // Filter visible data
  const visibleData = data.filter(d => visibleSlices.has(d.name));
  
  // Add total value to each data point for percentage calculation
  const totalValue = visibleData.reduce((sum, item) => sum + item.value, 0);
  const enrichedData = visibleData.map((item, index) => ({
    ...item,
    fill: item.color || chartColors[index % chartColors.length],
    totalValue
  }));
  
  // Prepare series config for controls (treating slices as series)
  const seriesConfig: SeriesConfig[] = data.map((item, i) => ({
    key: item.name,
    name: item.name,
    color: item.color || chartColors[i % chartColors.length],
    visible: visibleSlices.has(item.name)
  }));
  
  const animatedTotal = useCountAnimation(totalValue, animationDuration);
  
  useEffect(() => {
    if (enableAnimation) {
      const timer = setTimeout(() => setIsAnimating(false), animationDuration);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [enableAnimation, animationDuration]);
  
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
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };
  
  return (
    <Card
      ref={(el) => {
        if (el) {
          (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (enable3D) (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      }}
      className={cn('premium-pie-chart relative overflow-hidden', className)}
      style={{ transform: chartConfig.enable3D ? transform : undefined }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            {title && <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {title}
            </CardTitle>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            
            {showTotal && (
              <div className="mt-3">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  Total: {isAnimating ? animatedTotal.toLocaleString() : totalValue.toLocaleString()}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {enableNested && (
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
        <div className={cn(
          "flex",
          legendPosition === 'right' ? "flex-row" : "flex-col"
        )}>
          <div className="relative flex-1">
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <defs>
                  {enrichedData.map((entry, index) => (
                    <radialGradient key={`gradient-${index}`} id={`pieGradient-${index}`}>
                      <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.fill} stopOpacity={0.8} />
                    </radialGradient>
                  ))}
                </defs>
                
                <Pie
                  data={enrichedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={chartConfig.showLabels ? (props) => renderCustomLabel({ ...props, labelType, fill: props.fill }) : false}
                  outerRadius={outerRadius}
                  innerRadius={innerRadius}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={animationDuration}
                  isAnimationActive={enableAnimation}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={onSliceClick}
                  activeIndex={activeIndex}
                  activeShape={chartConfig.enable3D ? renderActiveShape : undefined}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {enrichedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={`url(#pieGradient-${index})`}
                      stroke={activeIndex === index ? entry.fill : 'none'}
                      strokeWidth={activeIndex === index ? 2 : 0}
                      style={{
                        filter: activeIndex === index ? `drop-shadow(0 0 10px ${entry.fill})` : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </Pie>
                
                {/* Nested pie chart */}
                {enableNested && nestedData && (
                  <Pie
                    data={nestedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={typeof outerRadius === 'number' ? outerRadius + 10 : '85%'}
                    outerRadius={typeof outerRadius === 'number' ? outerRadius + 30 : '95%'}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={animationDuration}
                    isAnimationActive={enableAnimation}
                  >
                    {nestedData.map((entry, index) => (
                      <Cell 
                        key={`nested-cell-${index}`}
                        fill={entry.color || chartColors[(index + data.length) % chartColors.length]}
                        opacity={0.6}
                      />
                    ))}
                  </Pie>
                )}
                
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center content (for donut charts) */}
            {centerContent && innerRadius !== 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  {centerContent}
                </div>
              </div>
            )}
          </div>
          
          {/* Custom legend */}
          {chartConfig.showLegend && (
            <div className={cn(
              "space-y-2",
              legendPosition === 'right' ? "ml-6 w-48" : "mt-4 w-full"
            )}>
              {enrichedData.map((entry, index) => {
                const percentage = ((entry.value / totalValue) * 100).toFixed(1);
                const isActive = activeIndex === index;
                
                return (
                  <motion.div
                    key={entry.name}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all",
                      isActive ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-900"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={() => onSliceClick?.(entry)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.fill }}
                        animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                      />
                      <span className={cn(
                        "text-sm",
                        isActive ? "font-semibold" : "font-normal"
                      )}>
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {percentage}%
                      </span>
                      {isActive && <ChevronRight className="h-3 w-3" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Inline Controls */}
      {enableInlineControls && (
        <ChartControls
          series={seriesConfig}
          onSeriesToggle={handleSliceToggle}
          config={chartConfig}
          onConfigChange={handleConfigChange}
          onExport={handleExport}
          position="top-right"
        />
      )}
    </Card>
  );
};

export default PremiumPieChart;