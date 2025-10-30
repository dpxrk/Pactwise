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
      fontSize: '10px',
      fontWeight: 600,
      colors: ['#291528'], // Dark purple for data labels
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
      width: 8,
      height: 8,
      radius: 0, // Square markers for Bloomberg Terminal style
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
      borderRadius: 0, // No rounded corners - Bloomberg Terminal style
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
    const data = w.globals.initialSeries[seriesIndex];
    const value = series[seriesIndex][dataPointIndex];
    const label = w.globals.labels[dataPointIndex];
    const seriesName = w.globals.seriesNames[seriesIndex];
    const color = w.globals.colors[seriesIndex];

    const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
    const displayValue = `${options?.prefix || ''}${formattedValue}${options?.suffix || ''}`;

    return `
      <div style="
        background: #ffffff;
        border: 1px solid #d2d1de;
        border-radius: 0;
        padding: 12px;
        min-width: 180px;
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
      ">
        <div style="
          font-size: 9px;
          font-weight: 600;
          color: #80808c;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        ">
          ${label}
        </div>

        <div style="margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
            <div style="
              width: 8px;
              height: 8px;
              background: ${color};
              border-radius: 0;
            "></div>
            <span style="
              font-size: 10px;
              font-weight: 500;
              color: #80808c;
            ">${seriesName}</span>
          </div>
          <div style="
            font-size: 16px;
            font-weight: 700;
            color: #291528;
            letter-spacing: 0;
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