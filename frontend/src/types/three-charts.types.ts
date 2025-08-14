// Chart Types (previously for Three.js, now for Recharts)

export interface ChartDataPoint {
  name?: string;
  label?: string;
  value: number;
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
  [key: string]: any;
}

export interface ChartSeries {
  key?: string;
  name: string;
  data: ChartDataPoint[];
  color?: string;
  visible?: boolean;
  type?: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
}

export interface ChartTheme {
  background: string;
  gridColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColors: string[];
}

export interface ChartDimensions {
  width: number;
  height: number;
  depth?: number;
}

export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartAnimation {
  duration: number;
  easing: string;
  delay?: number;
  stagger?: number;
}

// Base props for charts
export interface BaseThreeChartProps {
  data: ChartDataPoint[];
  series?: ChartSeries[];
  width?: number;
  height?: number;
  theme?: Partial<ChartTheme>;
  margins?: Partial<ChartMargins>;
  animation?: Partial<ChartAnimation>;
  interactive?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  onDataPointClick?: (point: ChartDataPoint) => void;
  onSeriesToggle?: (series: ChartSeries) => void;
  className?: string;
}

export interface ThreeChartProps extends BaseThreeChartProps {
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter';
}

export interface BarChartProps extends BaseThreeChartProps {
  horizontal?: boolean;
  stacked?: boolean;
  grouping?: 'grouped' | 'stacked';
  barWidth?: number;
  barGap?: number;
}

export interface LineChartProps extends BaseThreeChartProps {
  smooth?: boolean;
  showPoints?: boolean;
  strokeWidth?: number;
  fillArea?: boolean;
}

export interface PieChartProps extends BaseThreeChartProps {
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  donut?: boolean;
}

export interface AreaChartProps extends BaseThreeChartProps {
  smooth?: boolean;
  stacked?: boolean;
  fillOpacity?: number;
}

// Legacy mesh type for compatibility
export interface ChartMesh {
  userData?: any;
}