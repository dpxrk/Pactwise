'use client';

import { ApexOptions } from 'apexcharts';
import { motion } from 'framer-motion';
import { Activity, Zap } from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { ApexChartWrapper } from './ApexChartWrapper';
import pactwiseApexTheme, { createPremiumTooltip } from './apexTheme';

export interface AreaChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface AreaChartSeries {
  name: string;
  data: number[];
  color?: string;
}

interface ApexAreaChartProps {
  data: AreaChartDataPoint[];
  series: AreaChartSeries[];
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  showAnomalies?: boolean;
  anomalyThreshold?: number;
  enableExport?: boolean;
  className?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const detectAnomalies = (series: AreaChartSeries[], threshold: number = 2) => {
  const anomalies: Array<{ seriesIndex: number; dataIndex: number; value: number }> = [];
  
  series.forEach((s, seriesIndex) => {
    const values = s.data;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    
    values.forEach((value, dataIndex) => {
      if (Math.abs(value - mean) > threshold * stdDev) {
        anomalies.push({ seriesIndex, dataIndex, value });
      }
    });
  });
  
  return anomalies;
};

export const ApexAreaChart: React.FC<ApexAreaChartProps> = ({
  data,
  series,
  title,
  subtitle,
  height = 400,
  showGrid = true,
  showLegend = true,
  stacked = false,
  showAnomalies = false,
  anomalyThreshold = 2,
  enableExport = true,
  className,
  valuePrefix,
  valueSuffix,
}) => {
  
  const anomalies = useMemo(() => {
    if (showAnomalies) {
      return detectAnomalies(series, anomalyThreshold);
    }
    return [];
  }, [series, showAnomalies, anomalyThreshold]);
  
  const chartOptions: ApexOptions = useMemo(() => {
    const categories = data.map(d => d.name);
    
    return {
      ...pactwiseApexTheme,
      chart: {
        ...pactwiseApexTheme.chart,
        type: 'area',
        height,
        stacked,
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
      xaxis: {
        ...pactwiseApexTheme.xaxis,
        categories,
      },
      yaxis: {
        ...pactwiseApexTheme.yaxis,
        labels: {
          ...(Array.isArray(pactwiseApexTheme.yaxis) ? {} : pactwiseApexTheme.yaxis?.labels),
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
        show: showLegend,
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.1,
          opacityFrom: 0.5,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      tooltip: {
        ...pactwiseApexTheme.tooltip,
        custom: createPremiumTooltip({ prefix: valuePrefix, suffix: valueSuffix }),
      },
      colors: series.map((s, i) => s.color || pactwiseApexTheme.colors![i]),
      annotations: showAnomalies && anomalies.length > 0 ? {
        points: anomalies.map((anomaly) => ({
          x: categories[anomaly.dataIndex],
          y: anomaly.value,
          marker: {
            size: 6,
            fillColor: '#EF4444',
            strokeColor: '#FFFFFF',
            strokeWidth: 2,
          },
          label: {
            text: '!',
            style: {
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 700,
            },
          },
        })),
      } : undefined,
    };
  }, [data, series, height, showGrid, showLegend, stacked, enableExport, valuePrefix, valueSuffix, showAnomalies, anomalies]);
  
  const chartSeries = useMemo(() => {
    return series.map(s => ({
      name: s.name,
      data: s.data,
    }));
  }, [series]);
  
  
  return (
    <Card 
      className={cn(
        'premium-area-chart relative overflow-hidden',
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
            
            {anomalies.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="error" className="gap-1.5 px-3 py-1.5 text-xs font-semibold border shadow-sm">
                  <Zap className="h-3.5 w-3.5" />
                  {anomalies.length} Anomal{anomalies.length === 1 ? 'y' : 'ies'} Detected
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
            type="area"
            height={height}
          />
        </motion.div>
        
        <motion.div
          className="absolute top-6 right-6"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Activity className="h-4 w-4 text-green-500" />
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ApexAreaChart;