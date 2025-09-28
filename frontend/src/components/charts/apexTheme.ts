import { ApexOptions } from 'apexcharts';

export const pactwiseApexTheme: ApexOptions = {
  chart: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    foreColor: '#64748B',
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
      animateGradually: {
        enabled: true,
        delay: 80,
      },
      dynamicAnimation: {
        enabled: true,
        speed: 350,
      },
    },
  },
  colors: [
    '#0F172A', // Deep Slate - primary data
    '#10B981', // Success Green - positive metrics
    '#8B5CF6', // Premium Violet - secondary highlight
    '#F59E0B', // Attention Amber - warnings/alerts
    '#EC4899', // Strategic Pink - special emphasis
    '#06B6D4', // Clarity Cyan - supplementary
    '#6366F1', // Insight Indigo - additional series
    '#14B8A6', // Teal - balance
  ],
  grid: {
    borderColor: '#E2E8F0',
    strokeDashArray: 4,
    xaxis: {
      lines: {
        show: false,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
    padding: {
      top: 0,
      right: 20,
      bottom: 0,
      left: 20,
    },
  },
  dataLabels: {
    enabled: false,
    style: {
      fontSize: '11px',
      fontWeight: 600,
      colors: ['#0F172A'],
    },
  },
  stroke: {
    curve: 'smooth',
    width: 2.5,
    lineCap: 'round',
  },
  xaxis: {
    axisBorder: {
      show: true,
      color: '#CBD5E1',
      height: 1,
    },
    axisTicks: {
      show: true,
      color: '#CBD5E1',
      height: 4,
    },
    labels: {
      style: {
        colors: '#64748B',
        fontSize: '11px',
        fontWeight: 500,
      },
      offsetY: 0,
    },
    tooltip: {
      enabled: false,
    },
  },
  yaxis: {
    axisBorder: {
      show: true,
      color: '#CBD5E1',
    },
    axisTicks: {
      show: true,
      color: '#CBD5E1',
    },
    labels: {
      style: {
        colors: '#64748B',
        fontSize: '11px',
        fontWeight: 500,
      },
      offsetX: -10,
    },
  },
  tooltip: {
    enabled: true,
    shared: true,
    intersect: false,
    followCursor: false,
    theme: 'light',
    style: {
      fontSize: '13px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    },
    custom: undefined, // Will be overridden per chart
    x: {
      show: true,
      format: undefined,
      formatter: undefined,
    },
    y: {
      formatter: (value: number) => {
        return typeof value === 'number' ? value.toLocaleString() : value;
      },
      title: {
        formatter: (seriesName: string) => seriesName,
      },
    },
    marker: {
      show: true,
    },
    fixed: {
      enabled: false,
      position: 'topRight',
    },
  },
  legend: {
    show: true,
    position: 'bottom',
    horizontalAlign: 'center',
    fontSize: '11px',
    fontWeight: 600,
    labels: {
      colors: '#475569',
    },
    markers: {
      width: 10,
      height: 10,
      radius: 10,
      offsetX: -3,
      offsetY: 0,
    },
    itemMargin: {
      horizontal: 16,
      vertical: 8,
    },
    onItemClick: {
      toggleDataSeries: true,
    },
    onItemHover: {
      highlightDataSeries: true,
    },
  },
  markers: {
    size: 0,
    strokeWidth: 2.5,
    strokeColors: '#FFFFFF',
    hover: {
      size: 5,
      sizeOffset: 0,
    },
  },
  fill: {
    opacity: 1,
    type: 'solid',
  },
  states: {
    hover: {
      filter: {
        type: 'darken',
        value: 0.1,
      },
    },
    active: {
      filter: {
        type: 'none',
      },
    },
  },
  plotOptions: {
    bar: {
      borderRadius: 6,
      borderRadiusApplication: 'end',
      borderRadiusWhenStacked: 'last',
      columnWidth: '60%',
      barHeight: '70%',
      distributed: false,
      rangeBarOverlap: true,
      dataLabels: {
        position: 'top',
      },
    },
    pie: {
      expandOnClick: false,
      donut: {
        size: '65%',
        labels: {
          show: true,
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
            formatter: (val: string) => val,
          },
          total: {
            show: true,
            showAlways: true,
            label: 'Total',
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748B',
            formatter: (w: any) => {
              return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString();
            },
          },
        },
      },
    },
    radialBar: {
      hollow: {
        size: '65%',
      },
      track: {
        background: '#F1F5F9',
        strokeWidth: '100%',
      },
      dataLabels: {
        name: {
          fontSize: '14px',
          fontWeight: 600,
          color: '#0F172A',
        },
        value: {
          fontSize: '24px',
          fontWeight: 700,
          color: '#0F172A',
        },
      },
    },
  },
  responsive: [
    {
      breakpoint: 768,
      options: {
        chart: {
          height: 300,
        },
        legend: {
          position: 'bottom',
        },
        xaxis: {
          labels: {
            style: {
              fontSize: '10px',
            },
          },
        },
        yaxis: {
          labels: {
            style: {
              fontSize: '10px',
            },
          },
        },
      },
    },
  ],
};

// Custom tooltip generator for executive-style tooltips
export const createPremiumTooltip = (options?: {
  showTrend?: boolean;
  prefix?: string;
  suffix?: string;
}) => {
  return function ({ series, seriesIndex, dataPointIndex, w }: any) {
    const data = w.globals.initialSeries[seriesIndex];
    const value = series[seriesIndex][dataPointIndex];
    const label = w.globals.labels[dataPointIndex];
    const seriesName = w.globals.seriesNames[seriesIndex];
    const color = w.globals.colors[seriesIndex];
    
    const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
    const displayValue = `${options?.prefix || ''}${formattedValue}${options?.suffix || ''}`;
    
    return `
      <div style="
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 16px;
        min-width: 200px;
        box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(20px);
      ">
        <div style="
          font-size: 10px;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        ">
          ${label}
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <div style="
              width: 10px;
              height: 10px;
              background: ${color};
              border-radius: 50%;
              box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            "></div>
            <span style="
              font-size: 12px;
              font-weight: 500;
              color: #64748B;
            ">${seriesName}</span>
          </div>
          <div style="
            font-size: 18px;
            font-weight: 700;
            color: #0F172A;
            letter-spacing: -0.01em;
          ">
            ${displayValue}
          </div>
        </div>
      </div>
    `;
  };
};

// Gradient fill options
export const createGradientFill = (color: string): any => {
  return {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.1,
      gradientToColors: [color],
      inverseColors: false,
      opacityFrom: 0.6,
      opacityTo: 0.05,
      stops: [0, 100],
    },
  };
};

export default pactwiseApexTheme;