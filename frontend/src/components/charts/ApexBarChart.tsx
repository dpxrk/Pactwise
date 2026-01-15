'use client';

import { ApexOptions } from 'apexcharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { ApexChartWrapper } from './ApexChartWrapper';
import pactwiseApexTheme, { createPremiumTooltip } from './apexTheme';

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

    // Extract colors from data or use series colors
    const barColors = distributed && data.length > 0 && data[0].color
      ? data.map(d => (d as any).color || pactwiseApexTheme.colors![0])
      : (series && series.length > 0
          ? series.map((s, i) => s.color || pactwiseApexTheme.colors![i])
          : pactwiseApexTheme.colors);

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
        background: 'transparent',
      },
      plotOptions: {
        ...pactwiseApexTheme.plotOptions,
        bar: {
          ...pactwiseApexTheme.plotOptions?.bar,
          horizontal: orientation === 'horizontal',
          borderRadius: 0, // No rounded corners - Bloomberg Terminal style
          borderRadiusApplication: 'end',
          columnWidth: distributed ? '78%' : '68%',
          barHeight: '75%',
          distributed,
          dataLabels: {
            position: orientation === 'vertical' ? 'top' : 'center',
            orientation: 'vertical',
          },
          colors: {
            ranges: [],
            backgroundBarColors: ['rgba(240, 239, 244, 0.25)'],
            backgroundBarOpacity: 1,
            backgroundBarRadius: 0,
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
        fillSeriesColor: false,
      },
      colors: barColors,
      fill: {
        opacity: 1,
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.15,
          gradientToColors: barColors,
          inverseColors: false,
          opacityFrom: 0.95,
          opacityTo: 0.85,
          stops: [0, 100],
        },
      },
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
  

  // Simplified render when no title/subtitle (for embedded use in dashboards)
  const chartElement = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative premium-chart-container"
    >
      {/* Custom styles for ApexCharts SVG enhancements */}
      <style jsx>{`
        .premium-chart-container :global(.apexcharts-bar-area) {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .premium-chart-container :global(.apexcharts-bar-area:hover) {
          filter: brightness(1.1) saturate(1.15);
          transform: translateY(-1px);
        }

        .premium-chart-container :global(.apexcharts-gridline) {
          stroke: #d2d1de;
          stroke-opacity: 0.4;
        }

        .premium-chart-container :global(.apexcharts-xaxis-label),
        .premium-chart-container :global(.apexcharts-yaxis-label) {
          font-weight: 600;
          fill: #80808c;
        }

        .premium-chart-container :global(.apexcharts-legend-text) {
          font-weight: 700 !important;
          letter-spacing: 0.02em;
        }

        .premium-chart-container :global(.apexcharts-tooltip) {
          backdrop-filter: blur(12px);
        }

        .premium-chart-container :global(.apexcharts-datalabel) {
          font-weight: 700;
          font-size: 11px;
        }
      `}</style>

      {/* Background pattern for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(158, 130, 156, 0.05) 25%, rgba(158, 130, 156, 0.05) 26%, transparent 27%, transparent 74%, rgba(158, 130, 156, 0.05) 75%, rgba(158, 130, 156, 0.05) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(158, 130, 156, 0.05) 25%, rgba(158, 130, 156, 0.05) 26%, transparent 27%, transparent 74%, rgba(158, 130, 156, 0.05) 75%, rgba(158, 130, 156, 0.05) 76%, transparent 77%, transparent)`,
          backgroundSize: '50px 50px',
        }}
      />
      <ApexChartWrapper
        options={chartOptions}
        series={chartSeries}
        type="bar"
        height={height}
      />
    </motion.div>
  );

  // If no title or subtitle, render without Card wrapper (already wrapped by parent)
  if (!title && !subtitle) {
    return <div className={className}>{chartElement}</div>;
  }

  // Full card with header when title/subtitle provided
  return (
    <Card
      className={cn(
        'premium-bar-chart relative overflow-hidden group',
        'bg-white',
        'border border-ghost-300',
        'transition-all duration-300',
        'hover:border-purple-900/20',
        className
      )}
    >
      {/* Subtle hover gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="pb-4 border-b border-ghost-300 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {title && (
              <CardTitle className="font-mono text-xs text-purple-900 uppercase font-semibold tracking-tight mb-1 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-purple-900" />
                {title}
              </CardTitle>
            )}
            {subtitle && (
              <p className="font-mono text-[10px] text-ghost-600 uppercase tracking-wider ml-3.5">
                {subtitle}
              </p>
            )}

            {trend && (
              <div className="flex flex-wrap gap-2 mt-3 ml-3.5">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold border border-ghost-300 bg-white text-purple-900 hover:bg-purple-900 hover:text-white transition-all duration-200">
                  <TrendingUp className="h-3 w-3" />
                  AVG: {trend.average.toFixed(0)}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 font-mono text-[10px] font-bold border border-ghost-300 bg-white text-purple-900 hover:bg-purple-900 hover:text-white transition-all duration-200">
                  TOTAL: {trend.total.toLocaleString()}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5 font-mono text-[10px] font-bold border border-ghost-300 bg-white text-ghost-700 hover:bg-ghost-700 hover:text-white transition-all duration-200">
                  RANGE: {trend.min} - {trend.max}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-6 relative z-10">
        {chartElement}
      </CardContent>
    </Card>
  );
};

export default ApexBarChart;