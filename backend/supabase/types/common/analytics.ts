// Analytics and reporting type definitions
import { ContractRisk } from './contract';

export interface AnalyticsData {
  metrics: MetricsData;
  trends: TrendData[];
  insights: AnalyticsInsight[];
  period: TimePeriod;
  generatedAt: string;
}

export interface MetricsData {
  [key: string]: MetricValue;
}

export interface MetricValue {
  value: number;
  unit?: string;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
  target?: number;
  status?: 'good' | 'warning' | 'critical';
}

export interface TrendData {
  metric: string;
  dataPoints: DataPoint[];
  trendLine?: TrendLine;
  forecast?: Forecast;
}

export interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface TrendLine {
  slope: number;
  intercept: number;
  r2: number;
  direction: 'increasing' | 'decreasing' | 'stable';
}

export interface Forecast {
  values: ForecastPoint[];
  confidence: number;
  method: string;
}

export interface ForecastPoint {
  timestamp: string;
  value: number;
  upperBound: number;
  lowerBound: number;
}

export interface AnalyticsInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: string;
  metrics: string[];
  recommendation?: string;
  actions?: InsightAction[];
  data?: unknown;
}

export type InsightType = 
  | 'anomaly'
  | 'trend'
  | 'threshold'
  | 'pattern'
  | 'prediction'
  | 'comparison'
  | 'correlation';

export interface InsightAction {
  id: string;
  label: string;
  type: 'investigate' | 'optimize' | 'alert' | 'report';
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, unknown>;
}

export interface TimePeriod {
  start: string;
  end: string;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  timezone?: string;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  filters: FilterConfig[];
  refreshInterval?: number;
  layout?: LayoutConfig;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  position: WidgetPosition;
  size: WidgetSize;
  options?: Record<string, unknown>;
}

export type WidgetType = 
  | 'metric'
  | 'chart'
  | 'table'
  | 'list'
  | 'map'
  | 'custom';

export interface DataSource {
  type: 'query' | 'api' | 'static';
  query?: string;
  endpoint?: string;
  data?: unknown;
  refreshInterval?: number;
}

export interface VisualizationConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'table';
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  colors?: string[];
  legend?: LegendConfig;
}

export interface AxisConfig {
  field: string;
  label?: string;
  type?: 'linear' | 'logarithmic' | 'category' | 'time';
  format?: string;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface LayoutConfig {
  type: 'grid' | 'flex';
  columns?: number;
  gap?: number;
}

export interface FilterConfig {
  id: string;
  field: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'search';
  options?: FilterOption[];
  defaultValue?: unknown;
}

export interface FilterOption {
  value: string | number;
  label: string;
}

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  schedule?: ReportSchedule;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  data: ReportData;
  generatedAt: string;
}

export type ReportType = 
  | 'vendor_performance'
  | 'contract_summary'
  | 'spend_analysis'
  | 'compliance'
  | 'risk_assessment'
  | 'custom';

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string; // HH:mm format
  timezone: string;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
}

export interface ReportData {
  summary: Record<string, unknown>;
  details: Record<string, unknown>[];
  charts?: ChartData[];
  tables?: TableData[];
}

// Analytics Agent specific types
export interface AnalyticsAgentProcessData {
  analysisType?: string;
  contractData?: ContractMetricsData;
  vendorData?: VendorMetricsData;
  spendingData?: SpendingData;
  enterpriseData?: EnterpriseAnalyticsData;
  [key: string]: unknown;
}

export interface AnalyticsAnalysis {
  contractMetrics?: ProcessedContractMetrics;
  vendorMetrics?: ProcessedVendorMetrics;
  spendingAnalysis?: {
    patterns: SpendingPattern[];
    anomalies: SpendingAnomaly[];
    forecast: SpendingForecast;
    byCategory: CategorySpendAnalysis[];
  };
  enterpriseInsights?: {
    riskAssessment: EnterpriseRiskAssessment;
    opportunities: StrategicOpportunity[];
  };
  performance?: VendorPerformance[];
  concentration?: VendorConcentrationMetrics;
  risks?: VendorRisk[];
  optimization?: VendorOptimization[];
  benchmarks?: VendorBenchmark[];
}

export interface ContractMetricsData {
  contracts: Array<{
    id: string;
    value: number;
    startDate: string;
    endDate: string;
    status: string;
    vendor?: string;
    category?: string;
  }>;
  timeframe?: TimePeriod;
}

export interface ProcessedContractMetrics {
  summary: ContractSummary;
  trends: ContractTrend[];
  risks: ContractRisk[];
  opportunities: ContractOpportunity[];
  byStatus?: Record<string, number>;
  monthlyExpiring?: Array<{
    month: string;
    count: number;
  }>;
  expiring?: Array<{
    id: string;
    name: string;
    value: number;
    endDate: string;
  }>;
}

export interface ContractSummary {
  totalContracts: number;
  totalValue: number;
  activeContracts: number;
  expiringContracts: number;
  avgContractValue: number;
  growthRate: number;
}

export interface ContractTrend {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ContractOpportunity {
  type: string;
  description: string;
  potentialSavings?: number;
  contracts: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface VendorMetricsData {
  vendors: Array<{
    id: string;
    name: string;
    spend: number;
    performance?: number;
    contracts?: number;
    category?: string;
  }>;
  timeframe?: TimePeriod;
}

export interface ProcessedVendorMetrics {
  summary: {
    totalVendors: number;
    totalSpend: number;
    avgPerformance: number;
    topVendor: string;
  };
  performance: VendorPerformance[];
  concentration: VendorConcentrationMetrics;
  analytics: VendorAnalyticsData;
  byCategory?: Array<{
    category: string;
    count: number;
    spend: number;
  }>;
  byPerformance?: Array<{
    id: string;
    name: string;
    score: number;
    totalSpend: number;
  }>;
}

export interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  score: number;
  trend: 'improving' | 'declining' | 'stable';
  metrics: {
    quality: number;
    delivery: number;
    responsiveness: number;
  };
}

export interface VendorConcentrationMetrics {
  herfindahlIndex: number;
  topVendorShare: number;
  top5Share: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface VendorAnalyticsData {
  relationshipScores: VendorRelationshipScore[];
  benchmarks: VendorBenchmark[];
  optimizations: VendorOptimization[];
  risks: VendorRisk[];
}

export interface VendorRelationshipScore {
  vendorId: string;
  score: number;
  factors: {
    tenure: number;
    volume: number;
    performance: number;
    strategic: number;
  };
}

export interface VendorBenchmark {
  metric: string;
  vendorValue: number;
  industryAvg: number;
  percentile: number;
  recommendation?: string;
}

export interface VendorOptimization {
  type: string;
  description: string;
  vendorIds: string[];
  potentialSavings: number;
  implementation: string;
}

export interface VendorRisk {
  vendorId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

export interface SpendingData {
  transactions: Array<{
    amount: number;
    date: string;
    vendor?: string;
    category?: string;
    department?: string;
  }>;
  budgets?: Array<{
    category: string;
    allocated: number;
    spent: number;
  }>;
  monthlySpend?: Array<{
    month: string;
    actual: number;
    budget?: number;
  }>;
  categorySpend?: Array<{
    category: string;
    ytd: number;
    lastYear: number;
    budget: number;
  }>;
  departmentSpend?: Array<{
    department: string;
    amount: number;
    headcount?: number;
  }>;
}

export interface SpendingPattern {
  type: string;
  description: string;
  frequency: 'recurring' | 'seasonal' | 'one-time';
  amount: number;
  categories: string[];
}

export interface SpendingAnomaly {
  type: string;
  description: string;
  amount: number;
  deviation: number;
  date: string;
  vendor?: string;
  category?: string;
}

export interface SpendingForecast {
  nextPeriod: number;
  confidence: number;
  drivers: string[];
  risks: string[];
}

export interface CategorySpendAnalysis {
  category: string;
  spend: number;
  budget?: number;
  variance?: number;
  trend: 'up' | 'down' | 'stable';
  vendors: number;
}

export interface TimeSeriesData {
  period: string;
  contract_value?: number;
  vendor_count?: number;
  spend?: number;
  [key: string]: unknown;
}

export interface EnterpriseAnalyticsData {
  contracts: ContractMetricsData;
  vendors: VendorMetricsData;
  spending: SpendingData;
  compliance?: {
    score: number;
    issues: number;
  };
  time_series?: {
    contracts?: TimeSeriesData[];
    vendors?: TimeSeriesData[];
    spending?: TimeSeriesData[];
  };
}

export interface EnterpriseRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  categories: Array<{
    type: string;
    level: 'low' | 'medium' | 'high';
    factors: string[];
  }>;
  mitigation: string[];
}

export interface StrategicOpportunity {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  potentialValue?: number;
  timeline?: string;
}

export interface BudgetForecast {
  period: string;
  amount: number;
  confidence: number;
  assumptions: string[];
  risks: string[];
}

export interface BudgetOptimization {
  category: string;
  currentSpend: number;
  recommendedSpend: number;
  savings: number;
  actions: string[];
}

export interface SpendingAllocation {
  category: string;
  amount: number;
  percentage: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

export interface SpendingOptimization {
  type: string;
  category?: string;
  description: string;
  action: string;
  potential: number;
}

export interface ContractPrediction {
  contractId: string;
  prediction: string;
  probability: number;
  factors: string[];
  recommendedAction?: string;
}

export interface ExecutiveSummary {
  period: TimePeriod;
  keyMetrics: Record<string, MetricValue>;
  highlights: string[];
  risks: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  opportunities: Array<{
    description: string;
    value?: number;
  }>;
  recommendations: string[];
}

export interface ChartData {
  type: string;
  title: string;
  data: unknown[];
  options?: Record<string, unknown>;
}

export interface TableData {
  title: string;
  columns: Array<{
    key: string;
    label: string;
    type?: string;
  }>;
  rows: Record<string, unknown>[];
}