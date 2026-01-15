'use client';

import { ApexOptions } from 'apexcharts';
import { motion } from 'framer-motion';
import { PieChart as PieChartIcon } from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { ApexChartWrapper } from './ApexChartWrapper';
import pactwiseApexTheme from './apexTheme';

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

interface ApexPieChartProps {
  data: PieChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  donut?: boolean;
  showLegend?: boolean;
  showTotal?: boolean;
  enableExport?: boolean;
  className?: string;
  centerContent?: React.ReactNode;
}

export const ApexPieChart: React.FC<ApexPieChartProps> = ({
  data,
  title,
  subtitle,
  height = 400,
  donut = false,
  showLegend = true,
  showTotal = true,
  enableExport: _enableExport = true,
  className,
  centerContent,
}) => {
  
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);
  
  const chartOptions: ApexOptions = useMemo(() => {
    return {
      ...pactwiseApexTheme,
      chart: {
        ...pactwiseApexTheme.chart,
        type: donut ? 'donut' : 'pie',
        height,
        toolbar: {
          show: false,
        },
      },
      labels: data.map(d => d.name),
      colors: data.map((d, i) => d.color || pactwiseApexTheme.colors![i]),
      legend: {
        ...pactwiseApexTheme.legend,
        show: showLegend,
        position: 'bottom',
        fontSize: '11px',
        fontWeight: 600,
        markers: {
          size: 10,
          shape: 'circle' as const,
        },
      },
      plotOptions: {
        pie: {
          ...pactwiseApexTheme.plotOptions?.pie,
          expandOnClick: true,
          donut: {
            size: donut ? '65%' : '0%',
            labels: {
              show: donut && !centerContent,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                color: '#0F172A',
              },
              value: {
                show: true,
                fontSize: '24px',
                fontWeight: 700,
                color: '#0F172A',
                formatter: (val: string) => parseFloat(val).toLocaleString(),
              },
              total: {
                show: showTotal,
                showAlways: true,
                label: 'Total',
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                formatter: () => total.toLocaleString(),
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          return `${val.toFixed(1)}%`;
        },
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: ['#FFFFFF'],
        },
        dropShadow: {
          enabled: false,
        },
      },
      tooltip: {
        ...pactwiseApexTheme.tooltip,
        y: {
          formatter: (val: number) => {
            const percentage = ((val / total) * 100).toFixed(1);
            return `${val.toLocaleString()} (${percentage}%)`;
          },
        },
      },
      states: {
        hover: {
          filter: {
            type: 'lighten',
            value: 0.1,
          },
        },
        active: {
          filter: {
            type: 'none',
          },
        },
      },
    };
  }, [data, height, donut, showLegend, showTotal, total, centerContent]);
  
  const chartSeries = useMemo(() => {
    return data.map(d => d.value);
  }, [data]);
  
  
  return (
    <Card 
      className={cn(
        'premium-pie-chart relative overflow-hidden',
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
              <CardTitle className="text-lg font-semibold text-slate-900 tracking-tight mb-1 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-violet-600" />
                {title}
              </CardTitle>
            )}
            {subtitle && (
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {subtitle}
              </p>
            )}
            
            {showTotal && (
              <div className="mt-3">
                <Badge variant="secondary" className="text-base px-3 py-1.5 font-semibold border shadow-sm">
                  Total: {total.toLocaleString()}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <ApexChartWrapper
            options={chartOptions}
            series={chartSeries}
            type={donut ? 'donut' : 'pie'}
            height={height}
          />
          
          {donut && centerContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {centerContent}
              </div>
            </div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ApexPieChart;