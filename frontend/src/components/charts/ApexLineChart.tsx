'use client';

import React, { useMemo } from 'react';
import { ApexOptions } from 'apexcharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, Download, Settings } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import pactwiseApexTheme, { createPremiumTooltip, createGradientFill } from './apexTheme';
import { ApexChartWrapper } from './ApexChartWrapper';

export interface LineChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface LineChartSeries {
  name: string;
  data: number[];
  color?: string;
  showArea?: boolean;
  strokeDashArray?: number;
}

interface ApexLineChartProps {
  data: LineChartDataPoint[];
  series: LineChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  enableZoom?: boolean;
  showInsights?: boolean;
  enableExport?: boolean;
  className?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const generateInsights = (series: LineChartSeries[]) => {
  if (!series.length || !series[0].data.length) return [];
  
  const insights = [];
  const mainSeries = series[0];
  const values = mainSeries.data;
  
  const trend = values[values.length - 1] - values[0];
  const trendPercentage = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  
  insights.push({
    type: trend > 0 ? 'positive' : 'negative',
    icon: trend > 0 ? TrendingUp : TrendingDown,
    text: `${Math.abs(trendPercentage).toFixed(1)}% ${trend > 0 ? 'increase' : 'decrease'} over period`
  });
  
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

export const ApexLineChart: React.FC<ApexLineChartProps> = ({
  data,
  series,
  title,
  subtitle,
  height = 400,
  showGrid = true,
  showLegend = true,
  enableZoom = false,
  showInsights = true,
  enableExport = true,
  className,
  valuePrefix,
  valueSuffix,
}) => {
  
  const insights = useMemo(() => {
    if (showInsights) {
      return generateInsights(series);
    }
    return [];
  }, [series, showInsights]);
  
  const chartOptions: ApexOptions = useMemo(() => {
    const categories = data.map(d => d.name);
    
    return {
      ...pactwiseApexTheme,
      chart: {
        ...pactwiseApexTheme.chart,
        type: 'line',
        height,
        zoom: {
          enabled: enableZoom,
        },
        toolbar: {
          show: enableExport,
          tools: {
            download: true,
            selection: false,
            zoom: enableZoom,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false,
          },
        },
      },
      xaxis: {
        ...pactwiseApexTheme.xaxis,
        categories,
      },
      grid: {
        ...pactwiseApexTheme.grid,
        show: showGrid,
      },
      legend: {
        ...pactwiseApexTheme.legend,
        show: showLegend,
      },
      stroke: {
        ...pactwiseApexTheme.stroke,
        curve: 'smooth',
        width: series.map(s => 2.5),
        dashArray: series.map(s => s.strokeDashArray || 0),
      },
      fill: {
        type: series.map(s => s.showArea ? 'gradient' : 'solid'),
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      tooltip: {
        ...pactwiseApexTheme.tooltip,
        custom: createPremiumTooltip({ prefix: valuePrefix, suffix: valueSuffix }),
      },
      colors: series.map((s, i) => s.color || pactwiseApexTheme.colors![i]),
    };
  }, [data, series, height, showGrid, showLegend, enableZoom, enableExport, valuePrefix, valueSuffix]);
  
  const chartSeries = useMemo(() => {
    return series.map(s => ({
      name: s.name,
      data: s.data,
    }));
  }, [series]);
  
  
  return (
    <Card 
      className={cn(
        'premium-line-chart relative overflow-hidden',
        'bg-gradient-to-br from-white to-slate-50',
        'border border-slate-200/60',
        'shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        'hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]',
        'transition-all duration-300',
        className
      )}
    >
      <CardHeader className="pb-4 border-b border-slate-200/50">
        <div className="flex items-start justify-between">
          <div>
            {title && (
              <CardTitle className="text-lg font-semibold text-slate-900 tracking-tight mb-1">
                {title}
              </CardTitle>
            )}
            {subtitle && (
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2" />
        </div>
        
        {insights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {insights.map((insight, i) => (
              <Badge
                key={i}
                className={cn(
                  'gap-1.5 px-3 py-1.5 text-xs font-semibold border shadow-sm',
                  insight.type === 'positive' && 'bg-emerald-50 border-emerald-200 text-emerald-700',
                  insight.type === 'negative' && 'bg-red-50 border-red-200 text-red-700',
                  insight.type === 'warning' && 'bg-amber-50 border-amber-200 text-amber-700'
                )}
              >
                <insight.icon className="h-3.5 w-3.5" />
                {insight.text}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ApexChartWrapper
            options={chartOptions}
            series={chartSeries}
            type="line"
            height={height}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ApexLineChart;