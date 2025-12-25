// src/types/risk.types.ts
// Types for Risk Assessment and Clause Conflict Detection

// ============================================================================
// CLAUSE TYPES
// ============================================================================

export type ClauseCategory =
  | 'indemnification'
  | 'limitation_of_liability'
  | 'termination'
  | 'intellectual_property'
  | 'confidentiality'
  | 'data_protection'
  | 'warranties'
  | 'payment_terms'
  | 'governing_law'
  | 'dispute_resolution'
  | 'force_majeure'
  | 'assignment'
  | 'insurance'
  | 'audit_rights'
  | 'compliance'
  | 'other';

export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ConflictStatus = 'detected' | 'reviewing' | 'resolved' | 'accepted';

// ============================================================================
// CLAUSE DEFINITION TYPES
// ============================================================================

export interface ClauseCategoryDefinition {
  id: string;
  enterprise_id: string | null;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  is_system: boolean;
  display_order: number;
  created_at: string;
}

export interface ClauseDefinition {
  id: string;
  enterprise_id: string | null;
  category_id: string;
  name: string;
  description: string | null;
  standard_text: string | null;
  detection_patterns: string[];
  keywords: string[];
  risk_indicators: RiskIndicator[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
  category?: ClauseCategoryDefinition;
}

export interface RiskIndicator {
  pattern: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

// ============================================================================
// CONFLICT RULE TYPES
// ============================================================================

export interface ClauseConflictRule {
  id: string;
  enterprise_id: string | null;
  clause_a_id: string;
  clause_b_id: string;
  conflict_type: 'incompatible' | 'requires_review' | 'redundant' | 'supersedes';
  severity: ConflictSeverity;
  description: string;
  resolution_guidance: string | null;
  is_active: boolean;
  created_at: string;
  clause_a?: ClauseDefinition;
  clause_b?: ClauseDefinition;
}

export interface ClauseCompatibilityMatrix {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  contract_types: string[];
  compatibility_rules: CompatibilityRule[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompatibilityRule {
  clause_ids: string[];
  is_required_together: boolean;
  is_mutually_exclusive: boolean;
  notes?: string;
}

// ============================================================================
// DETECTED CONFLICT TYPES
// ============================================================================

export interface DetectedClauseConflict {
  id: string;
  contract_id: string;
  conflict_rule_id: string | null;
  clause_a_location: ClauseLocation;
  clause_b_location: ClauseLocation;
  severity: ConflictSeverity;
  description: string;
  status: ConflictStatus;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  conflict_rule?: ClauseConflictRule;
}

export interface ClauseLocation {
  section?: string;
  page?: number;
  paragraph?: number;
  start_position: number;
  end_position: number;
  text_excerpt: string;
}

export interface ConflictResolutionHistory {
  id: string;
  conflict_id: string;
  action: 'reviewed' | 'resolved' | 'accepted' | 'reopened';
  performed_by: string;
  notes: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
  };
}

// ============================================================================
// RISK FACTOR TYPES
// ============================================================================

export type RiskFactorCategory =
  | 'financial'
  | 'legal'
  | 'operational'
  | 'compliance'
  | 'reputational'
  | 'strategic';

export interface RiskFactorDefinition {
  id: string;
  enterprise_id: string | null;
  name: string;
  description: string;
  category: RiskFactorCategory;
  weight: number;
  scoring_criteria: ScoringCriteria[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoringCriteria {
  condition: string;
  score: number;
  description: string;
}

// ============================================================================
// RISK ASSESSMENT TYPES
// ============================================================================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

export interface ContractRiskAssessment {
  id: string;
  contract_id: string;
  overall_score: number;
  risk_level: RiskLevel;
  assessment_date: string;
  assessed_by: string | null;
  assessment_type: 'manual' | 'automated' | 'ai_assisted';
  notes: string | null;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
  contract?: {
    id: string;
    title: string;
    contract_number: string;
  };
  factors?: RiskAssessmentFactor[];
  mitigations?: RiskMitigationAction[];
}

export interface RiskAssessmentFactor {
  id: string;
  assessment_id: string;
  factor_id: string;
  score: number;
  weighted_score: number;
  rationale: string | null;
  evidence: string | null;
  created_at: string;
  factor?: RiskFactorDefinition;
}

// ============================================================================
// RISK MITIGATION TYPES
// ============================================================================

export type MitigationStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';

export interface RiskMitigationAction {
  id: string;
  assessment_id: string;
  factor_id: string | null;
  title: string;
  description: string;
  status: MitigationStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  effectiveness_score: number | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// RISK HISTORY TYPES
// ============================================================================

export interface RiskScoreHistory {
  id: string;
  contract_id: string;
  overall_score: number;
  risk_level: RiskLevel;
  recorded_at: string;
  change_reason: string | null;
  recorded_by: string | null;
}

export interface RiskTrend {
  date: string;
  score: number;
  risk_level: RiskLevel;
  contracts_assessed: number;
}

// ============================================================================
// RISK THRESHOLD TYPES
// ============================================================================

export interface RiskThresholdConfig {
  id: string;
  enterprise_id: string;
  threshold_type: 'overall' | 'factor' | 'category';
  reference_id: string | null;
  warning_threshold: number;
  critical_threshold: number;
  auto_escalate: boolean;
  escalate_to: string | null;
  notification_emails: string[];
  is_active: boolean;
  created_at: string;
}

export interface RiskAlert {
  id: string;
  enterprise_id: string;
  contract_id: string;
  threshold_config_id: string;
  alert_type: 'warning' | 'critical';
  current_score: number;
  threshold_score: number;
  message: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  contract?: {
    id: string;
    title: string;
  };
}

// ============================================================================
// LIST ITEM TYPES
// ============================================================================

export interface RiskAssessmentListItem {
  id: string;
  contract_id: string;
  contract_title: string;
  overall_score: number;
  risk_level: RiskLevel;
  assessment_date: string;
  mitigations_pending: number;
  conflicts_detected: number;
}

export interface ConflictListItem {
  id: string;
  contract_id: string;
  contract_title: string;
  severity: ConflictSeverity;
  description: string;
  status: ConflictStatus;
  detected_at: string;
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateRiskAssessmentPayload {
  contract_id: string;
  assessment_type?: 'manual' | 'automated' | 'ai_assisted';
  notes?: string;
  factor_scores?: {
    factor_id: string;
    score: number;
    rationale?: string;
    evidence?: string;
  }[];
}

export interface UpdateRiskAssessmentPayload {
  notes?: string;
  next_review_date?: string;
}

export interface CreateMitigationPayload {
  assessment_id: string;
  factor_id?: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigned_to?: string;
  due_date?: string;
}

export interface UpdateMitigationPayload {
  status?: MitigationStatus;
  assigned_to?: string;
  due_date?: string;
  effectiveness_score?: number;
}

export interface ResolveConflictPayload {
  conflict_id: string;
  action: 'resolve' | 'accept';
  notes?: string;
}

export interface CreateConflictRulePayload {
  clause_a_id: string;
  clause_b_id: string;
  conflict_type: 'incompatible' | 'requires_review' | 'redundant' | 'supersedes';
  severity: ConflictSeverity;
  description: string;
  resolution_guidance?: string;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface RiskAssessmentFilters {
  risk_level?: RiskLevel | RiskLevel[];
  score_min?: number;
  score_max?: number;
  contract_id?: string;
  assessment_type?: 'manual' | 'automated' | 'ai_assisted';
  date_from?: string;
  date_to?: string;
}

export interface ConflictFilters {
  severity?: ConflictSeverity | ConflictSeverity[];
  status?: ConflictStatus | ConflictStatus[];
  contract_id?: string;
  detected_from?: string;
  detected_to?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface RiskStats {
  total_assessments: number;
  average_score: number;
  by_risk_level: Record<RiskLevel, number>;
  contracts_at_risk: number;
  mitigations_pending: number;
  mitigations_overdue: number;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface ConflictStats {
  total_conflicts: number;
  by_severity: Record<ConflictSeverity, number>;
  by_status: Record<ConflictStatus, number>;
  resolution_rate: number;
  average_resolution_days: number;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const clauseCategoryLabels: Record<ClauseCategory, string> = {
  indemnification: 'Indemnification',
  limitation_of_liability: 'Limitation of Liability',
  termination: 'Termination',
  intellectual_property: 'Intellectual Property',
  confidentiality: 'Confidentiality',
  data_protection: 'Data Protection',
  warranties: 'Warranties',
  payment_terms: 'Payment Terms',
  governing_law: 'Governing Law',
  dispute_resolution: 'Dispute Resolution',
  force_majeure: 'Force Majeure',
  assignment: 'Assignment',
  insurance: 'Insurance',
  audit_rights: 'Audit Rights',
  compliance: 'Compliance',
  other: 'Other',
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  minimal: 'Minimal',
};

export const riskLevelColors: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
  minimal: 'bg-green-100 text-green-700',
};

export const conflictSeverityLabels: Record<ConflictSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const conflictSeverityColors: Record<ConflictSeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

export const conflictStatusLabels: Record<ConflictStatus, string> = {
  detected: 'Detected',
  reviewing: 'Under Review',
  resolved: 'Resolved',
  accepted: 'Accepted',
};

export const conflictStatusColors: Record<ConflictStatus, string> = {
  detected: 'bg-red-100 text-red-700',
  reviewing: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  accepted: 'bg-gray-100 text-gray-700',
};

export const mitigationStatusLabels: Record<MitigationStatus, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
};

export const mitigationStatusColors: Record<MitigationStatus, string> = {
  proposed: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export const riskFactorCategoryLabels: Record<RiskFactorCategory, string> = {
  financial: 'Financial',
  legal: 'Legal',
  operational: 'Operational',
  compliance: 'Compliance',
  reputational: 'Reputational',
  strategic: 'Strategic',
};

// Risk score thresholds
export const riskScoreThresholds = {
  minimal: { min: 0, max: 20 },
  low: { min: 21, max: 40 },
  medium: { min: 41, max: 60 },
  high: { min: 61, max: 80 },
  critical: { min: 81, max: 100 },
} as const;

export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score <= 20) return 'minimal';
  if (score <= 40) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}
