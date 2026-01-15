import { ApexOptions } from 'apexcharts';

export const pactwiseApexTheme: ApexOptions = {
  chart: {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    foreColor: '#3a3e3b', // Black Olive for text
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
    animations: {
      enabled: true,
      speed: 900,
      animateGradually: {
        enabled: true,
        delay: 100,
      },
      dynamicAnimation: {
        enabled: true,
        speed: 400,
      },
    },
    dropShadow: {
      enabled: false,
    },
  },
  colors: [
    '#291528', // chart-1: purple-900 - Dark Purple - Primary data series
    '#9e829c', // chart-2: purple-500 - Mountbatten Pink - Secondary data series
    '#dab5d5', // chart-3: purple-300 - Light Purple - Tertiary data series
    '#7d5c7b', // chart-4: purple-600 - Medium Purple - Quaternary data series
    '#644862', // chart-5: purple-700 - Purple variant - Quinary data series
    '#c388bb', // purple-400 - Light pink variant
    '#533e52', // purple-800 - Dark purple variant
    '#3a3e3b', // Black Olive - Additional series
  ],
  grid: {
    borderColor: '#d2d1de', // ghost-300 for grid lines
    strokeDashArray: 0, // Solid lines for Bloomberg Terminal style
    xaxis: {
      lines: {
        show: true, // Show x-axis grid lines for better data reading
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
    row: {
      colors: undefined,
      opacity: 0.03,
    },
    column: {
      colors: undefined,
      opacity: 0.02,
    },
    padding: {
      top: 10,
      right: 25,
      bottom: 10,
      left: 15,
    },
  },
  dataLabels: {
    enabled: false,
    style: {
      fontSize: '11px',
      fontWeight: 700,
      colors: ['#291528'], // Dark purple for data labels
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    background: {
      enabled: true,
      foreColor: '#ffffff',
      padding: 6,
      borderRadius: 0,
      borderWidth: 1,
      borderColor: '#d2d1de',
      opacity: 0.95,
    },
    offsetY: -8,
    dropShadow: {
      enabled: false,
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
      color: '#d2d1de', // ghost-300
      height: 1,
    },
    axisTicks: {
      show: true,
      color: '#d2d1de', // ghost-300
      height: 4,
    },
    labels: {
      style: {
        colors: '#80808c', // ghost-500 for labels
        fontSize: '10px',
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
      color: '#d2d1de', // ghost-300
    },
    axisTicks: {
      show: true,
      color: '#d2d1de', // ghost-300
    },
    labels: {
      style: {
        colors: '#80808c', // ghost-500 for labels
        fontSize: '10px',
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
      fontSize: '11px',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
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
    fontSize: '10px',
    fontWeight: 600,
    labels: {
      colors: '#80808c', // ghost-500
    },
    markers: {
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
      },
    },
    active: {
      allowMultipleDataPointsSelection: false,
      filter: {
        type: 'darken',
      },
    },
  },
  plotOptions: {
    bar: {
      borderRadius: 0, // No rounded corners - Bloomberg Terminal style
      borderRadiusApplication: 'end',
      borderRadiusWhenStacked: 'last',
      columnWidth: '68%', // Wider bars for more presence
      barHeight: '75%',
      distributed: false,
      rangeBarOverlap: true,
      dataLabels: {
        position: 'top',
        orientation: 'vertical',
      },
      colors: {
        backgroundBarColors: ['rgba(242, 241, 246, 0.3)'], // Subtle background bars
        backgroundBarOpacity: 1,
        backgroundBarRadius: 0,
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
            fontSize: '12px',
            fontWeight: 600,
            color: '#291528', // Dark purple
          },
          value: {
            show: true,
            fontSize: '22px',
            fontWeight: 700,
            color: '#291528', // Dark purple
            formatter: (val: string) => val,
          },
          total: {
            show: true,
            showAlways: true,
            label: 'TOTAL',
            fontSize: '10px',
            fontWeight: 600,
            color: '#80808c', // ghost-500
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
        background: '#e1e0e9', // ghost-200
        strokeWidth: '100%',
      },
      dataLabels: {
        name: {
          fontSize: '12px',
          fontWeight: 600,
          color: '#291528', // Dark purple
        },
        value: {
          fontSize: '22px',
          fontWeight: 700,
          color: '#291528', // Dark purple
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

// Custom tooltip generator for Bloomberg Terminal-style tooltips
export const createPremiumTooltip = (options?: {
  showTrend?: boolean;
  prefix?: string;
  suffix?: string;
}) => {
  return function ({ series, seriesIndex, dataPointIndex, w }: any) {
    const _data = w.globals.initialSeries[seriesIndex];
    const value = series[seriesIndex][dataPointIndex];
    const label = w.globals.labels[dataPointIndex];
    const seriesName = w.globals.seriesNames[seriesIndex];
    const color = w.globals.colors[seriesIndex];

    const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
    const displayValue = `${options?.prefix || ''}${formattedValue}${options?.suffix || ''}`;

    // Calculate percentage if total is available
    const total = series[seriesIndex]?.reduce((sum: number, val: number) => sum + val, 0);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : null;

    return `
      <div style="
        background: linear-gradient(135deg, #ffffff 0%, #f9f8fc 100%);
        border: 2px solid ${color};
        border-radius: 0;
        padding: 14px 16px;
        min-width: 200px;
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
        box-shadow: 0 8px 24px rgba(41, 21, 40, 0.12), 0 2px 8px rgba(41, 21, 40, 0.08);
      ">
        <!-- Category Label -->
        <div style="
          font-size: 10px;
          font-weight: 700;
          color: #80808c;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 10px;
          border-bottom: 1px solid #e1e0e9;
          padding-bottom: 6px;
        ">
          ${label}
        </div>

        <!-- Value Section -->
        <div style="margin-bottom: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="
              width: 10px;
              height: 10px;
              background: ${color};
              border-radius: 0;
              border: 1px solid rgba(255,255,255,0.3);
            "></div>
            <span style="
              font-size: 9px;
              font-weight: 600;
              color: #80808c;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            ">${seriesName}</span>
          </div>
          <div style="
            font-size: 22px;
            font-weight: 800;
            color: ${color};
            letter-spacing: -0.02em;
            line-height: 1;
            margin-bottom: 4px;
          ">
            ${displayValue}
          </div>
          ${percentage ? `
            <div style="
              font-size: 10px;
              font-weight: 600;
              color: #9e829c;
              letter-spacing: 0.02em;
            ">
              ${percentage}% OF TOTAL
            </div>
          ` : ''}
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