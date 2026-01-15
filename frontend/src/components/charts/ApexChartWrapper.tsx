'use client';

import type { ApexOptions } from 'apexcharts';
import React, { useEffect, useRef, useState } from 'react';

interface ApexChartWrapperProps {
  options: ApexOptions;
  series: any[];
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  height: number;
  width?: string | number;
}

export const ApexChartWrapper: React.FC<ApexChartWrapperProps> = ({
  options,
  series,
  type,
  height,
  width = '100%',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !chartRef.current) return;

    let chart: any = null;

    const initChart = async () => {
      try {
        const ApexCharts = (await import('apexcharts')).default;
        
        if (chartRef.current) {
          chart = new ApexCharts(chartRef.current, {
            ...options,
            chart: {
              ...options.chart,
              type,
              height,
              width,
            },
            series,
          });

          chartInstanceRef.current = chart;
          await chart.render();
        }
      } catch (error) {
        console.error('Error initializing chart:', error);
      }
    };

    initChart();

    return () => {
      if (chart) {
        try {
          chart.destroy();
        } catch (_e) {
          // Silently ignore cleanup errors
        }
      }
      chartInstanceRef.current = null;
    };
  }, [isClient, options, series, type, height, width]);

  if (!isClient) {
    return (
      <div 
        style={{ 
          height: `${height}px`, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#94A3B8',
          fontSize: '14px'
        }}
      >
        Loading chart...
      </div>
    );
  }

  return <div ref={chartRef} style={{ width, height: `${height}px` }} />;
};

export default ApexChartWrapper;