// Three.js Chart Types
import { Mesh, Group, Object3D, Vector3, Color } from 'three';

export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
  visible: boolean;
  type?: 'line' | 'bar' | 'area' | 'scatter';
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

export interface ChartCamera {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
  near?: number;
  far?: number;
}

export interface ChartLighting {
  ambient: {
    color: string;
    intensity: number;
  };
  directional: {
    color: string;
    intensity: number;
    position: [number, number, number];
  };
  point?: {
    color: string;
    intensity: number;
    position: [number, number, number];
  };
}

export interface ChartInteraction {
  hover: boolean;
  click: boolean;
  drag: boolean;
  zoom: boolean;
  rotate: boolean;
}

export interface ThreeChartProps {
  data: ChartDataPoint[];
  series?: ChartSeries[];
  width?: number;
  height?: number;
  theme?: Partial<ChartTheme>;
  animation?: Partial<ChartAnimation>;
  camera?: Partial<ChartCamera>;
  lighting?: Partial<ChartLighting>;
  interaction?: Partial<ChartInteraction>;
  margins?: Partial<ChartMargins>;
  onHover?: (data: ChartDataPoint | null) => void;
  onClick?: (data: ChartDataPoint) => void;
  onDrillDown?: (category: string, value: number | string) => void;
  className?: string;
}

export interface BarChartProps extends ThreeChartProps {
  barWidth?: number;
  barDepth?: number;
  spacing?: number;
  groupSpacing?: number;
  showGrid?: boolean;
  showAxes?: boolean;
  stackedBars?: boolean;
}

export interface LineChartProps extends ThreeChartProps {
  lineWidth?: number;
  pointSize?: number;
  showPoints?: boolean;
  smoothCurve?: boolean;
  showArea?: boolean;
  areaOpacity?: number;
}

export interface PieChartProps extends ThreeChartProps {
  innerRadius?: number;
  outerRadius?: number;
  thickness?: number;
  startAngle?: number;
  endAngle?: number;
  showLabels?: boolean;
  labelDistance?: number;
}

export interface AreaChartProps extends ThreeChartProps {
  opacity?: number;
  showPoints?: boolean;
  pointSize?: number;
  smoothCurve?: boolean;
  stackedAreas?: boolean;
}

// Utility types for Three.js objects
export interface ChartMesh extends Mesh {
  userData: {
    dataPoint: ChartDataPoint;
    originalColor: string;
    originalPosition: Vector3;
    isAnimating: boolean;
  };
}

export interface ChartGroup extends Group {
  userData: {
    chartType: string;
    isInteractive: boolean;
  };
}

// Animation types
export interface AnimationTarget {
  object: Object3D;
  property: string;
  from: number | Vector3 | Color;
  to: number | Vector3 | Color;
  duration: number;
  delay?: number;
  easing?: string;
}

// Tooltip types
export interface TooltipData {
  title: string;
  value: string | number;
  color: string;
  position: [number, number];
  visible: boolean;
}

// Legend types
export interface LegendItem {
  label: string;
  color: string;
  visible: boolean;
  value?: string | number;
}

export interface ChartLegend {
  items: LegendItem[];
  position: 'top' | 'bottom' | 'left' | 'right';
  alignment: 'start' | 'center' | 'end';
}