'use client';

import React, { useMemo } from 'react';
import { ApexOptions } from 'apexcharts';
import { motion } from 'framer-motion';
import { TrendingUp, Download } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import pactwiseApexTheme, { createPremiumTooltip } from './apexTheme';
import { ApexChartWrapper } from './ApexChartWrapper';

export interface BarChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface BarChartSeries {
  name: string;
  data: number[];
  color?: string;
}

interface ApexBarChartProps {
  data: BarChartDataPoint[];
  series?: BarChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
  showTrend?: boolean;
  enableExport?: boolean;
  className?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  distributed?: boolean;
}

export const ApexBarChart: React.FC<ApexBarChartProps> = ({
  data,
  series,
  title,
  subtitle,
  height = 400,
  orientation = 'vertical',
  showGrid = true,
  showLegend = true,
  showValues = false,
  showTrend = true,
  enableExport = true,
  className,
  valuePrefix,
  valueSuffix,
  distributed = false,
}) => {
  
  const trend = useMemo(() => {
    if (!showTrend || !series || series.length === 0) return null;
    
    const total = series[0].data.reduce((sum, val) => sum + val, 0);
    const average = total / series[0].data.length;
    const max = Math.max(...series[0].data);
    const min = Math.min(...series[0].data);
    
    return { total, average, max, min };
  }, [series, showTrend]);
  
  const chartOptions: ApexOptions = useMemo(() => {
    const categories = data.map(d => d.name);
    
    return {
      ...pactwiseApexTheme,
      chart: {
        ...pactwiseApexTheme.chart,
        type: 'bar',
        height,
        toolbar: {
          show: enableExport,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false,
          },
        },
      },
      plotOptions: {
        ...pactwiseApexTheme.plotOptions,
        bar: {
          ...pactwiseApexTheme.plotOptions?.bar,
          horizontal: orientation === 'horizontal',
          borderRadius: 6,
          borderRadiusApplication: 'end',
          columnWidth: distributed ? '75%' : '60%',
          barHeight: '70%',
          distributed,
          dataLabels: {
            position: orientation === 'vertical' ? 'top' : 'center',
          },
        },
      },
      xaxis: {
        ...pactwiseApexTheme.xaxis,
        categories,
        labels: {
          ...pactwiseApexTheme.xaxis?.labels,
          rotate: categories.length > 8 ? -45 : 0,
        },
      },
      yaxis: {
        ...pactwiseApexTheme.yaxis,
        labels: {
          ...pactwiseApexTheme.yaxis?.labels,
          formatter: (val: number) => {
            return `${valuePrefix || ''}${val.toLocaleString()}${valueSuffix || ''}`;
          },
        },
      },
      grid: {
        ...pactwiseApexTheme.grid,
        show: showGrid,
      },
      legend: {
        ...pactwiseApexTheme.legend,
        show: showLegend && series && series.length > 1,
      },
      dataLabels: {
        ...pactwiseApexTheme.dataLabels,
        enabled: showValues,
        formatter: (val: number) => {
          return `${valuePrefix || ''}${val.toLocaleString()}${valueSuffix || ''}`;
        },
      },
      tooltip: {
        ...pactwiseApexTheme.tooltip,
        custom: createPremiumTooltip({ prefix: valuePrefix, suffix: valueSuffix }),
      },
      colors: series && series.length > 0 
        ? series.map((s, i) => s.color || pactwiseApexTheme.colors![i])
        : pactwiseApexTheme.colors,
    };
  }, [data, series, height, orientation, showGrid, showLegend, showValues, enableExport, valuePrefix, valueSuffix, distributed]);
  
  const chartSeries = useMemo(() => {
    if (series && series.length > 0) {
      return series.map(s => ({
        name: s.name,
        data: s.data,
      }));
    }
    
    return [{
      name: 'Value',
      data: data.map(d => d.value),
    }];
  }, [data, series]);
  
  
  return (
    <Card 
      className={cn(
        'premium-bar-chart relative overflow-hidden',
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
            
            {trend && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-semibold border shadow-sm">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Avg: {trend.average.toFixed(0)}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold border shadow-sm">
                  Total: {trend.total.toLocaleString()}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold border shadow-sm">
                  Range: {trend.min} - {trend.max}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2" />
        </div>
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
            type="bar"
            height={height}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ApexBarChart;