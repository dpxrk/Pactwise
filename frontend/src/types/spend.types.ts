// src/types/spend.types.ts
// Types for Spend Analytics and Vendor Scorecards

// ============================================================================
// SPEND CATEGORY TYPES
// ============================================================================

export interface SpendCategory {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  gl_account_code: string | null;
  budget_code: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  children?: SpendCategory[];
  parent?: SpendCategory;
}

export interface SpendCategoryHierarchy {
  id: string;
  name: string;
  level: number;
  path: string[];
  children: SpendCategoryHierarchy[];
  total_spend?: number;
  percentage?: number;
}

// ============================================================================
// SPEND RECORD TYPES
// ============================================================================

export type SpendType = 'actual' | 'committed' | 'forecast' | 'budget';
export type SpendStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface SpendRecord {
  id: string;
  enterprise_id: string;
  contract_id: string | null;
  vendor_id: string | null;
  category_id: string | null;
  spend_type: SpendType;
  amount: number;
  currency: string;
  spend_date: string;
  fiscal_year: number;
  fiscal_quarter: number;
  fiscal_month: number;
  description: string | null;
  reference_number: string | null;
  status: SpendStatus;
  metadata: SpendMetadata;
  created_at: string;
  updated_at: string;
  contract?: {
    id: string;
    title: string;
    contract_number: string;
  };
  vendor?: {
    id: string;
    name: string;
  };
  category?: SpendCategory;
}

export interface SpendMetadata {
  cost_center?: string;
  department?: string;
  project_code?: string;
  po_number?: string;
  invoice_number?: string;
  payment_method?: string;
  tags?: string[];
}

// ============================================================================
// SPEND AGGREGATION TYPES
// ============================================================================

export type AggregationPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AggregationDimension = 'category' | 'vendor' | 'contract' | 'department' | 'cost_center';

export interface SpendAggregation {
  id: string;
  enterprise_id: string;
  period: AggregationPeriod;
  period_start: string;
  period_end: string;
  dimension: AggregationDimension;
  dimension_value: string;
  total_amount: number;
  transaction_count: number;
  currency: string;
  breakdown: SpendBreakdown;
  created_at: string;
}

export interface SpendBreakdown {
  by_type: Record<SpendType, number>;
  by_status: Record<SpendStatus, number>;
  top_vendors?: { vendor_id: string; vendor_name: string; amount: number }[];
  top_categories?: { category_id: string; category_name: string; amount: number }[];
}

export interface SpendTimeSeries {
  period: AggregationPeriod;
  data_points: SpendDataPoint[];
  summary: SpendSummary;
}

export interface SpendDataPoint {
  period_start: string;
  period_end: string;
  actual: number;
  committed: number;
  forecast: number;
  budget: number;
  variance: number;
  variance_percentage: number;
}

export interface SpendSummary {
  total_actual: number;
  total_committed: number;
  total_forecast: number;
  total_budget: number;
  overall_variance: number;
  variance_percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// ============================================================================
// SPEND SAVINGS TYPES
// ============================================================================

export type SavingsType = 'negotiated' | 'avoided' | 'process' | 'consolidation' | 'other';
export type SavingsStatus = 'projected' | 'realized' | 'verified';

export interface SpendSavings {
  id: string;
  enterprise_id: string;
  contract_id: string | null;
  vendor_id: string | null;
  savings_type: SavingsType;
  amount: number;
  currency: string;
  baseline_amount: number;
  new_amount: number;
  savings_date: string;
  fiscal_year: number;
  status: SavingsStatus;
  description: string | null;
  documentation_path: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

// ============================================================================
// VENDOR SCORECARD TYPES
// ============================================================================

export type ScorecardStatus = 'draft' | 'active' | 'archived';
export type ScorecardPeriod = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface VendorScorecardTemplate {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  applies_to_categories: string[];
  period: ScorecardPeriod;
  is_default: boolean;
  status: ScorecardStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  dimensions?: ScorecardDimension[];
}

export interface ScorecardDimension {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  weight: number;
  display_order: number;
  created_at: string;
  metrics?: ScorecardMetric[];
}

export interface ScorecardMetric {
  id: string;
  dimension_id: string;
  name: string;
  description: string | null;
  measurement_type: 'percentage' | 'rating' | 'score' | 'yes_no' | 'numeric';
  target_value: number | null;
  min_value: number;
  max_value: number;
  weight: number;
  data_source: 'manual' | 'calculated' | 'integrated';
  calculation_formula: string | null;
  display_order: number;
  created_at: string;
}

// ============================================================================
// VENDOR SCORECARD INSTANCE TYPES
// ============================================================================

export interface VendorScorecard {
  id: string;
  enterprise_id: string;
  vendor_id: string;
  template_id: string;
  period_start: string;
  period_end: string;
  overall_score: number;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  completed_by: string | null;
  completed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor?: {
    id: string;
    name: string;
    category?: string;
  };
  template?: VendorScorecardTemplate;
  metric_values?: ScorecardMetricValue[];
  action_items?: ScorecardActionItem[];
}

export interface ScorecardMetricValue {
  id: string;
  scorecard_id: string;
  metric_id: string;
  value: number;
  weighted_score: number;
  notes: string | null;
  evidence_path: string | null;
  recorded_by: string;
  recorded_at: string;
  metric?: ScorecardMetric;
}

export interface ScorecardActionItem {
  id: string;
  scorecard_id: string;
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  assignee?: {
    id: string;
    full_name: string;
  };
}

// ============================================================================
// VENDOR PERFORMANCE HISTORY
// ============================================================================

export interface VendorPerformanceHistory {
  id: string;
  vendor_id: string;
  enterprise_id: string;
  metric_name: string;
  metric_value: number;
  period_start: string;
  period_end: string;
  source: 'scorecard' | 'system' | 'manual';
  source_id: string | null;
  created_at: string;
}

export interface VendorPerformanceTrend {
  vendor_id: string;
  vendor_name: string;
  metric_name: string;
  data_points: {
    period: string;
    value: number;
  }[];
  trend: 'improving' | 'declining' | 'stable';
  average_score: number;
}

// ============================================================================
// VENDOR BENCHMARK TYPES
// ============================================================================

export interface VendorBenchmark {
  id: string;
  enterprise_id: string;
  metric_name: string;
  category: string | null;
  benchmark_type: 'industry' | 'internal' | 'target';
  value: number;
  source: string | null;
  effective_date: string;
  expiry_date: string | null;
  created_at: string;
}

// ============================================================================
// LIST ITEM TYPES
// ============================================================================

export interface SpendRecordListItem {
  id: string;
  vendor_name: string | null;
  contract_title: string | null;
  category_name: string | null;
  spend_type: SpendType;
  amount: number;
  currency: string;
  spend_date: string;
  status: SpendStatus;
}

export interface VendorScorecardListItem {
  id: string;
  vendor_id: string;
  vendor_name: string;
  period_start: string;
  period_end: string;
  overall_score: number;
  status: VendorScorecard['status'];
  action_items_count: number;
  completed_at: string | null;
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateSpendRecordPayload {
  contract_id?: string;
  vendor_id?: string;
  category_id?: string;
  spend_type: SpendType;
  amount: number;
  currency?: string;
  spend_date: string;
  description?: string;
  reference_number?: string;
  metadata?: Partial<SpendMetadata>;
}

export interface UpdateSpendRecordPayload extends Partial<CreateSpendRecordPayload> {
  status?: SpendStatus;
}

export interface CreateScorecardTemplatePayload {
  name: string;
  description?: string;
  applies_to_categories?: string[];
  period: ScorecardPeriod;
  is_default?: boolean;
  dimensions?: {
    name: string;
    description?: string;
    weight: number;
    metrics?: {
      name: string;
      description?: string;
      measurement_type: ScorecardMetric['measurement_type'];
      target_value?: number;
      min_value?: number;
      max_value?: number;
      weight: number;
      data_source?: ScorecardMetric['data_source'];
      calculation_formula?: string;
    }[];
  }[];
}

export interface CreateVendorScorecardPayload {
  vendor_id: string;
  template_id: string;
  period_start: string;
  period_end: string;
  notes?: string;
}

export interface UpdateScorecardMetricPayload {
  scorecard_id: string;
  metric_id: string;
  value: number;
  notes?: string;
  evidence_path?: string;
}

export interface CreateSavingsPayload {
  contract_id?: string;
  vendor_id?: string;
  savings_type: SavingsType;
  amount: number;
  currency?: string;
  baseline_amount: number;
  new_amount: number;
  savings_date: string;
  description?: string;
  documentation_path?: string;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface SpendFilters {
  spend_type?: SpendType | SpendType[];
  status?: SpendStatus | SpendStatus[];
  vendor_id?: string;
  contract_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  fiscal_year?: number;
  fiscal_quarter?: number;
}

export interface ScorecardFilters {
  vendor_id?: string;
  template_id?: string;
  status?: VendorScorecard['status'] | VendorScorecard['status'][];
  period_from?: string;
  period_to?: string;
  score_min?: number;
  score_max?: number;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface SpendStats {
  total_spend_ytd: number;
  total_budget_ytd: number;
  variance_ytd: number;
  variance_percentage: number;
  total_savings_ytd: number;
  by_category: {
    category_id: string;
    category_name: string;
    amount: number;
    percentage: number;
  }[];
  by_vendor: {
    vendor_id: string;
    vendor_name: string;
    amount: number;
    percentage: number;
  }[];
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ScorecardStats {
  total_scorecards: number;
  average_score: number;
  by_status: Record<VendorScorecard['status'], number>;
  vendors_above_target: number;
  vendors_below_target: number;
  action_items_open: number;
  action_items_overdue: number;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const spendTypeLabels: Record<SpendType, string> = {
  actual: 'Actual',
  committed: 'Committed',
  forecast: 'Forecast',
  budget: 'Budget',
};

export const spendTypeColors: Record<SpendType, string> = {
  actual: 'bg-green-100 text-green-700',
  committed: 'bg-blue-100 text-blue-700',
  forecast: 'bg-purple-100 text-purple-700',
  budget: 'bg-gray-100 text-gray-700',
};

export const spendStatusLabels: Record<SpendStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const spendStatusColors: Record<SpendStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const savingsTypeLabels: Record<SavingsType, string> = {
  negotiated: 'Negotiated',
  avoided: 'Cost Avoided',
  process: 'Process Improvement',
  consolidation: 'Consolidation',
  other: 'Other',
};

export const scorecardPeriodLabels: Record<ScorecardPeriod, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

export const scorecardStatusLabels: Record<VendorScorecard['status'], string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  approved: 'Approved',
};

export const scorecardStatusColors: Record<VendorScorecard['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
};

// Score thresholds for display
export const scoreThresholds = {
  excellent: { min: 90, color: 'text-green-600', label: 'Excellent' },
  good: { min: 75, color: 'text-blue-600', label: 'Good' },
  average: { min: 60, color: 'text-amber-600', label: 'Average' },
  poor: { min: 40, color: 'text-orange-600', label: 'Below Average' },
  critical: { min: 0, color: 'text-red-600', label: 'Critical' },
} as const;

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 75) return { label: 'Good', color: 'text-blue-600' };
  if (score >= 60) return { label: 'Average', color: 'text-amber-600' };
  if (score >= 40) return { label: 'Below Average', color: 'text-orange-600' };
  return { label: 'Critical', color: 'text-red-600' };
}
