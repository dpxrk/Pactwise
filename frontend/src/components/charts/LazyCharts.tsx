import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Chart loading skeleton
const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="w-full" style={{ height }}>
    <Skeleton className="w-full h-full" />
  </div>
);

// Lazy load Recharts components
export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyAreaChart = dynamic(
  () => import('recharts').then(mod => mod.AreaChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyComposedChart = dynamic(
  () => import('recharts').then(mod => mod.ComposedChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyRadarChart = dynamic(
  () => import('recharts').then(mod => mod.RadarChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyRadialBarChart = dynamic(
  () => import('recharts').then(mod => mod.RadialBarChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyScatterChart = dynamic(
  () => import('recharts').then(mod => mod.ScatterChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export const LazyTreemap = dynamic(
  () => import('recharts').then(mod => mod.Treemap),
  { loading: () => <ChartSkeleton />, ssr: false }
);

// Export other necessary Recharts components that don't need lazy loading
export {
  Line,
  Bar,
  Pie,
  Area,
  Scatter,
  Radar,
  RadialBar,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
  ReferenceArea,
  Brush,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

// Wrapper component for easy chart loading with error boundary
interface LazyChartWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: number;
}

export const LazyChartWrapper: React.FC<LazyChartWrapperProps> = ({ 
  children, 
  fallback,
  height = 300 
}) => {
  return (
    <div className="w-full" style={{ minHeight: height }}>
      {children}
    </div>
  );
};