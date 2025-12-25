// src/types/temporal.types.ts
// Types for Temporal Analysis System

// ============================================================================
// TEMPORAL TYPES
// ============================================================================

export type BucketType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'volatile';

export type PatternType =
  | 'seasonal'
  | 'cyclical'
  | 'trend'
  | 'anomaly'
  | 'recurring'
  | 'one_time';

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low';

export type PredictionTier = 'high' | 'medium' | 'low' | 'unlikely';

export type AlertType =
  | 'renewal_upcoming'
  | 'expiration_warning'
  | 'anomaly_detected'
  | 'trend_change'
  | 'prediction_update'
  | 'milestone_approaching';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

// ============================================================================
// LIFECYCLE EVENT TYPES
// ============================================================================

export type LifecycleEventType =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'activated'
  | 'amended'
  | 'renewed'
  | 'expired'
  | 'terminated'
  | 'archived'
  | 'status_change'
  | 'value_change'
  | 'owner_change';

export interface ContractLifecycleEvent {
  id: string;
  contract_id: string;
  event_type: LifecycleEventType;
  event_data: LifecycleEventData;
  triggered_by: string | null;
  created_at: string;
  contract?: {
    id: string;
    title: string;
    contract_number: string;
  };
  user?: {
    id: string;
    full_name: string;
  };
}

export interface LifecycleEventData {
  previous_status?: string;
  new_status?: string;
  previous_value?: number;
  new_value?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// TEMPORAL METRICS TYPES
// ============================================================================

export type MetricCategory =
  | 'contract_volume'
  | 'contract_value'
  | 'processing_time'
  | 'renewal_rate'
  | 'compliance_score'
  | 'risk_score'
  | 'vendor_performance';

export interface TemporalMetric {
  id: string;
  enterprise_id: string;
  metric_category: MetricCategory;
  bucket_type: BucketType;
  bucket_start: string;
  bucket_end: string;
  aggregations: MetricAggregations;
  dimensions: Record<string, string>;
  created_at: string;
}

export interface MetricAggregations {
  count?: number;
  sum?: number;
  average?: number;
  min?: number;
  max?: number;
  median?: number;
  percentile_90?: number;
  percentile_95?: number;
  variance?: number;
  std_dev?: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesData {
  metric_category: MetricCategory;
  bucket_type: BucketType;
  data_points: TimeSeriesDataPoint[];
  summary: TimeSeriesSummary;
}

export interface TimeSeriesSummary {
  total_points: number;
  min_value: number;
  max_value: number;
  average_value: number;
  trend: TrendDirection;
  change_percentage: number;
}

// ============================================================================
// PATTERN DETECTION TYPES
// ============================================================================

export interface TemporalPattern {
  id: string;
  enterprise_id: string;
  pattern_type: PatternType;
  metric_category: MetricCategory;
  description: string;
  pattern_data: PatternData;
  confidence_score: number;
  detected_at: string;
  valid_until: string | null;
  is_active: boolean;
}

export interface PatternData {
  period?: number; // For seasonal/cyclical patterns (in days)
  peak_times?: string[]; // For seasonal patterns
  trend_slope?: number; // For trend patterns
  anomaly_threshold?: number; // For anomaly detection
  recurring_interval?: number; // For recurring patterns
  historical_occurrences?: string[];
}

export interface AnomalyDetection {
  id: string;
  enterprise_id: string;
  metric_category: MetricCategory;
  anomaly_type: 'spike' | 'drop' | 'deviation' | 'missing';
  severity: AnomalySeverity;
  expected_value: number;
  actual_value: number;
  deviation_percentage: number;
  detected_at: string;
  context: AnomalyContext;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
}

export interface AnomalyContext {
  period_start: string;
  period_end: string;
  related_contracts?: string[];
  possible_causes?: string[];
  historical_comparison?: {
    same_period_last_year: number;
    average_for_period: number;
  };
}

// ============================================================================
// RENEWAL PREDICTION TYPES
// ============================================================================

export interface RenewalPrediction {
  id: string;
  contract_id: string;
  prediction_tier: PredictionTier;
  probability: number;
  predicted_date: string | null;
  predicted_value: number | null;
  factors: PredictionFactor[];
  confidence_score: number;
  created_at: string;
  updated_at: string;
  contract?: {
    id: string;
    title: string;
    contract_number: string;
    current_value: number;
    end_date: string;
    vendor_name?: string;
  };
}

export interface PredictionFactor {
  factor_name: string;
  weight: number;
  score: number;
  description: string;
}

export interface RenewalForecast {
  period: string; // e.g., "2025-Q1"
  predicted_renewals: number;
  predicted_value: number;
  high_confidence_count: number;
  medium_confidence_count: number;
  low_confidence_count: number;
  contracts: RenewalPrediction[];
}

// ============================================================================
// TEMPORAL ALERT TYPES
// ============================================================================

export interface TemporalAlert {
  id: string;
  enterprise_id: string;
  contract_id: string | null;
  alert_type: AlertType;
  severity: AnomalySeverity;
  title: string;
  message: string;
  alert_data: AlertData;
  status: AlertStatus;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  contract?: {
    id: string;
    title: string;
  };
}

export interface AlertData {
  threshold?: number;
  current_value?: number;
  reference_date?: string;
  days_until?: number;
  related_entity_type?: string;
  related_entity_id?: string;
  action_required?: string;
  suggested_actions?: string[];
}

// ============================================================================
// TREND ANALYSIS TYPES
// ============================================================================

export interface TrendAnalysis {
  metric_category: MetricCategory;
  period: {
    start: string;
    end: string;
  };
  trend_direction: TrendDirection;
  change_percentage: number;
  confidence: number;
  data_points: TimeSeriesDataPoint[];
  comparison: TrendComparison;
  forecast: TrendForecast;
}

export interface TrendComparison {
  previous_period: {
    start: string;
    end: string;
    value: number;
  };
  year_over_year?: {
    value: number;
    change_percentage: number;
  };
}

export interface TrendForecast {
  next_period_value: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  assumptions: string[];
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface TemporalDashboardData {
  summary: TemporalSummary;
  charts: TemporalChartData[];
  alerts: TemporalAlert[];
  predictions: RenewalPrediction[];
  anomalies: AnomalyDetection[];
}

export interface TemporalSummary {
  contracts_expiring_30_days: number;
  contracts_expiring_90_days: number;
  renewals_predicted_high: number;
  active_alerts: number;
  anomalies_detected: number;
  trend_score: number;
}

export interface TemporalChartData {
  chart_id: string;
  title: string;
  metric_category: MetricCategory;
  chart_type: 'line' | 'bar' | 'area' | 'donut';
  data: TimeSeriesData;
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface GetTemporalMetricsPayload {
  metric_category: MetricCategory;
  bucket_type: BucketType;
  start_date: string;
  end_date: string;
  dimensions?: Record<string, string>;
}

export interface GetTrendAnalysisPayload {
  metric_category: MetricCategory;
  start_date: string;
  end_date: string;
  include_forecast?: boolean;
  include_comparison?: boolean;
}

export interface GetRenewalPredictionsPayload {
  contract_ids?: string[];
  min_probability?: number;
  prediction_tier?: PredictionTier | PredictionTier[];
  expiring_within_days?: number;
}

export interface AcknowledgeAlertPayload {
  alert_id: string;
  notes?: string;
}

export interface ResolveAlertPayload {
  alert_id: string;
  resolution_notes?: string;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface TemporalMetricFilters {
  metric_category?: MetricCategory | MetricCategory[];
  bucket_type?: BucketType;
  start_date?: string;
  end_date?: string;
}

export interface AlertFilters {
  alert_type?: AlertType | AlertType[];
  severity?: AnomalySeverity | AnomalySeverity[];
  status?: AlertStatus | AlertStatus[];
  contract_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PredictionFilters {
  prediction_tier?: PredictionTier | PredictionTier[];
  min_probability?: number;
  contract_id?: string;
  expiring_before?: string;
  expiring_after?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface TemporalStats {
  total_events_tracked: number;
  active_patterns: number;
  active_alerts: number;
  predictions_generated: number;
  anomalies_this_month: number;
  accuracy_metrics: AccuracyMetrics;
}

export interface AccuracyMetrics {
  prediction_accuracy: number;
  anomaly_detection_rate: number;
  false_positive_rate: number;
  last_calibration: string;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const bucketTypeLabels: Record<BucketType, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export const metricCategoryLabels: Record<MetricCategory, string> = {
  contract_volume: 'Contract Volume',
  contract_value: 'Contract Value',
  processing_time: 'Processing Time',
  renewal_rate: 'Renewal Rate',
  compliance_score: 'Compliance Score',
  risk_score: 'Risk Score',
  vendor_performance: 'Vendor Performance',
};

export const trendDirectionLabels: Record<TrendDirection, string> = {
  increasing: 'Increasing',
  decreasing: 'Decreasing',
  stable: 'Stable',
  volatile: 'Volatile',
};

export const trendDirectionColors: Record<TrendDirection, string> = {
  increasing: 'text-green-600',
  decreasing: 'text-red-600',
  stable: 'text-gray-600',
  volatile: 'text-amber-600',
};

export const predictionTierLabels: Record<PredictionTier, string> = {
  high: 'High Probability',
  medium: 'Medium Probability',
  low: 'Low Probability',
  unlikely: 'Unlikely',
};

export const predictionTierColors: Record<PredictionTier, string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-orange-100 text-orange-700',
  unlikely: 'bg-gray-100 text-gray-500',
};

export const alertTypeLabels: Record<AlertType, string> = {
  renewal_upcoming: 'Renewal Upcoming',
  expiration_warning: 'Expiration Warning',
  anomaly_detected: 'Anomaly Detected',
  trend_change: 'Trend Change',
  prediction_update: 'Prediction Update',
  milestone_approaching: 'Milestone Approaching',
};

export const alertStatusLabels: Record<AlertStatus, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export const alertStatusColors: Record<AlertStatus, string> = {
  active: 'bg-red-100 text-red-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
};

export const anomalySeverityLabels: Record<AnomalySeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const anomalySeverityColors: Record<AnomalySeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

export const lifecycleEventLabels: Record<LifecycleEventType, string> = {
  created: 'Created',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  activated: 'Activated',
  amended: 'Amended',
  renewed: 'Renewed',
  expired: 'Expired',
  terminated: 'Terminated',
  archived: 'Archived',
  status_change: 'Status Changed',
  value_change: 'Value Changed',
  owner_change: 'Owner Changed',
};
