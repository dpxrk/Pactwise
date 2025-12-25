// src/types/donna-feedback.types.ts
// Types for Donna AI Feedback Loop System

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

export type RecommendationType =
  | 'pattern'
  | 'best_practice'
  | 'q_learning'
  | 'bandit'
  | 'insight'
  | 'market_intelligence';

export type UserResponse =
  | 'accepted'
  | 'rejected'
  | 'modified'
  | 'ignored'
  | 'deferred';

export type ImplementationStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'abandoned'
  | 'partial';

export type OutcomeStatus =
  | 'success'
  | 'partial_success'
  | 'failure'
  | 'neutral'
  | 'unknown';

export type FeedbackCategory =
  | 'contract_analysis'
  | 'risk_assessment'
  | 'vendor_management'
  | 'compliance'
  | 'negotiation'
  | 'workflow'
  | 'general';

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

export interface DonnaRecommendation {
  id: string;
  enterprise_id: string;
  recommendation_type: RecommendationType;
  category: FeedbackCategory;
  title: string;
  description: string;
  confidence_score: number;
  context: RecommendationContext;
  suggested_actions: SuggestedAction[];
  related_entity_type: string | null;
  related_entity_id: string | null;
  expires_at: string | null;
  created_at: string;
  feedback?: DonnaFeedback;
}

export interface RecommendationContext {
  trigger: string;
  data_points: DataPoint[];
  similar_cases?: number;
  source_patterns?: string[];
  confidence_factors?: ConfidenceFactor[];
}

export interface DataPoint {
  label: string;
  value: string | number;
  type: 'metric' | 'text' | 'date' | 'currency';
}

export interface ConfidenceFactor {
  factor: string;
  weight: number;
  contribution: number;
}

export interface SuggestedAction {
  id: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  estimated_impact: string;
  effort_level: 'low' | 'medium' | 'high';
}

// ============================================================================
// FEEDBACK TYPES
// ============================================================================

export interface DonnaFeedback {
  id: string;
  enterprise_id: string;
  recommendation_id: string;
  user_id: string;
  user_response: UserResponse;
  response_reason: string | null;
  modified_action: string | null;
  implementation_status: ImplementationStatus;
  implementation_notes: string | null;
  outcome_status: OutcomeStatus | null;
  outcome_details: OutcomeDetails | null;
  outcome_recorded_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
  };
  recommendation?: DonnaRecommendation;
}

export interface OutcomeDetails {
  impact_description: string;
  metrics_affected?: MetricImpact[];
  time_saved_hours?: number;
  cost_impact?: number;
  quality_improvement?: number;
  user_satisfaction?: number;
}

export interface MetricImpact {
  metric_name: string;
  before_value: number;
  after_value: number;
  change_percentage: number;
}

// ============================================================================
// LEARNING METRICS TYPES
// ============================================================================

export interface DonnaLearningMetrics {
  enterprise_id: string;
  period_start: string;
  period_end: string;
  total_recommendations: number;
  acceptance_rate: number;
  implementation_rate: number;
  success_rate: number;
  by_category: CategoryMetrics[];
  by_type: TypeMetrics[];
  confidence_calibration: ConfidenceCalibration;
  improvement_areas: ImprovementArea[];
}

export interface CategoryMetrics {
  category: FeedbackCategory;
  total: number;
  accepted: number;
  implemented: number;
  successful: number;
  acceptance_rate: number;
  success_rate: number;
}

export interface TypeMetrics {
  type: RecommendationType;
  total: number;
  accepted: number;
  implemented: number;
  successful: number;
  average_confidence: number;
  accuracy: number;
}

export interface ConfidenceCalibration {
  buckets: ConfidenceBucket[];
  calibration_score: number;
  is_well_calibrated: boolean;
}

export interface ConfidenceBucket {
  confidence_range: { min: number; max: number };
  total_predictions: number;
  actual_success_rate: number;
  expected_success_rate: number;
  calibration_error: number;
}

export interface ImprovementArea {
  area: string;
  current_performance: number;
  target_performance: number;
  suggestions: string[];
}

// ============================================================================
// QUALITY DASHBOARD TYPES
// ============================================================================

export interface DonnaQualityDashboard {
  summary: QualitySummary;
  trends: QualityTrend[];
  recent_feedback: DonnaFeedback[];
  top_recommendations: DonnaRecommendation[];
  user_engagement: UserEngagement;
}

export interface QualitySummary {
  total_recommendations_30d: number;
  acceptance_rate_30d: number;
  implementation_rate_30d: number;
  success_rate_30d: number;
  average_confidence: number;
  user_satisfaction_score: number;
  value_generated: number;
}

export interface QualityTrend {
  date: string;
  recommendations_count: number;
  acceptance_rate: number;
  success_rate: number;
  average_confidence: number;
}

export interface UserEngagement {
  active_users_30d: number;
  feedback_provided: number;
  average_response_time_hours: number;
  most_engaged_users: {
    user_id: string;
    user_name: string;
    feedback_count: number;
    acceptance_rate: number;
  }[];
}

// ============================================================================
// FEEDBACK HISTORY TYPES
// ============================================================================

export interface FeedbackHistoryItem {
  id: string;
  recommendation_title: string;
  recommendation_type: RecommendationType;
  category: FeedbackCategory;
  user_response: UserResponse;
  implementation_status: ImplementationStatus;
  outcome_status: OutcomeStatus | null;
  confidence_score: number;
  created_at: string;
  user_name: string;
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface SubmitFeedbackPayload {
  recommendation_id: string;
  user_response: UserResponse;
  response_reason?: string;
  modified_action?: string;
}

export interface UpdateImplementationPayload {
  feedback_id: string;
  implementation_status: ImplementationStatus;
  implementation_notes?: string;
}

export interface RecordOutcomePayload {
  feedback_id: string;
  outcome_status: OutcomeStatus;
  outcome_details?: Partial<OutcomeDetails>;
}

export interface DismissRecommendationPayload {
  recommendation_id: string;
  reason?: string;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface RecommendationFilters {
  recommendation_type?: RecommendationType | RecommendationType[];
  category?: FeedbackCategory | FeedbackCategory[];
  min_confidence?: number;
  max_confidence?: number;
  has_feedback?: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_from?: string;
  created_to?: string;
}

export interface FeedbackFilters {
  user_response?: UserResponse | UserResponse[];
  implementation_status?: ImplementationStatus | ImplementationStatus[];
  outcome_status?: OutcomeStatus | OutcomeStatus[];
  category?: FeedbackCategory | FeedbackCategory[];
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface MetricsFilters {
  period_start: string;
  period_end: string;
  category?: FeedbackCategory;
  recommendation_type?: RecommendationType;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface DonnaStats {
  recommendations_generated: number;
  feedback_collected: number;
  acceptance_rate: number;
  implementation_rate: number;
  success_rate: number;
  average_confidence: number;
  value_generated_estimate: number;
  learning_improvement: number;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const recommendationTypeLabels: Record<RecommendationType, string> = {
  pattern: 'Pattern Recognition',
  best_practice: 'Best Practice',
  q_learning: 'Adaptive Learning',
  bandit: 'Optimization',
  insight: 'Insight',
  market_intelligence: 'Market Intelligence',
};

export const recommendationTypeColors: Record<RecommendationType, string> = {
  pattern: 'bg-purple-100 text-purple-700',
  best_practice: 'bg-blue-100 text-blue-700',
  q_learning: 'bg-green-100 text-green-700',
  bandit: 'bg-amber-100 text-amber-700',
  insight: 'bg-indigo-100 text-indigo-700',
  market_intelligence: 'bg-cyan-100 text-cyan-700',
};

export const userResponseLabels: Record<UserResponse, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  modified: 'Modified',
  ignored: 'Ignored',
  deferred: 'Deferred',
};

export const userResponseColors: Record<UserResponse, string> = {
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  modified: 'bg-amber-100 text-amber-700',
  ignored: 'bg-gray-100 text-gray-500',
  deferred: 'bg-blue-100 text-blue-700',
};

export const implementationStatusLabels: Record<ImplementationStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  abandoned: 'Abandoned',
  partial: 'Partial',
};

export const implementationStatusColors: Record<ImplementationStatus, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  abandoned: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
};

export const outcomeStatusLabels: Record<OutcomeStatus, string> = {
  success: 'Success',
  partial_success: 'Partial Success',
  failure: 'Failure',
  neutral: 'Neutral',
  unknown: 'Unknown',
};

export const outcomeStatusColors: Record<OutcomeStatus, string> = {
  success: 'bg-green-100 text-green-700',
  partial_success: 'bg-amber-100 text-amber-700',
  failure: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-700',
  unknown: 'bg-gray-100 text-gray-500',
};

export const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  contract_analysis: 'Contract Analysis',
  risk_assessment: 'Risk Assessment',
  vendor_management: 'Vendor Management',
  compliance: 'Compliance',
  negotiation: 'Negotiation',
  workflow: 'Workflow',
  general: 'General',
};

export const feedbackCategoryColors: Record<FeedbackCategory, string> = {
  contract_analysis: 'bg-purple-100 text-purple-700',
  risk_assessment: 'bg-orange-100 text-orange-700',
  vendor_management: 'bg-blue-100 text-blue-700',
  compliance: 'bg-green-100 text-green-700',
  negotiation: 'bg-amber-100 text-amber-700',
  workflow: 'bg-indigo-100 text-indigo-700',
  general: 'bg-gray-100 text-gray-700',
};

// Confidence level helpers
export function getConfidenceLevel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 0.9) return { label: 'Very High', color: 'text-green-600' };
  if (score >= 0.75) return { label: 'High', color: 'text-blue-600' };
  if (score >= 0.6) return { label: 'Medium', color: 'text-amber-600' };
  if (score >= 0.4) return { label: 'Low', color: 'text-orange-600' };
  return { label: 'Very Low', color: 'text-red-600' };
}

export function formatConfidencePercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}
