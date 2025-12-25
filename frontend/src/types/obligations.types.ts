// src/types/obligations.types.ts
// Types for Obligation Management System

// ============================================================================
// OBLIGATION TYPES
// ============================================================================

export type ObligationType =
  | 'payment'
  | 'delivery'
  | 'reporting'
  | 'compliance'
  | 'renewal'
  | 'notice'
  | 'performance'
  | 'audit'
  | 'insurance'
  | 'confidentiality'
  | 'other';

export type ObligationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'waived'
  | 'cancelled';

export type ObligationPriority = 'critical' | 'high' | 'medium' | 'low';

export type ObligationFrequency =
  | 'one_time'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'custom';

export type EvidenceType =
  | 'document'
  | 'email'
  | 'screenshot'
  | 'attestation'
  | 'external_link'
  | 'system_generated'
  | 'report'
  | 'other';

export type EscalationLevel = 1 | 2 | 3 | 4 | 5;

// ============================================================================
// CORE OBLIGATION TYPES
// ============================================================================

export interface Obligation {
  id: string;
  enterprise_id: string;
  contract_id: string;
  title: string;
  description: string;
  obligation_type: ObligationType;
  status: ObligationStatus;
  priority: ObligationPriority;
  due_date: string;
  start_date: string | null;
  end_date: string | null;
  frequency: ObligationFrequency;
  recurrence_rule: RecurrenceRule | null;
  responsible_party: 'internal' | 'external' | 'both';
  clause_reference: string | null;
  source_text: string | null;
  metadata: ObligationMetadata;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  contract?: {
    id: string;
    title: string;
    contract_number: string;
    vendor_name?: string;
  };
  assignees?: ObligationAssignee[];
  dependencies?: ObligationDependency[];
  performance?: ObligationPerformance;
}

export interface RecurrenceRule {
  frequency: ObligationFrequency;
  interval: number;
  day_of_week?: number[];
  day_of_month?: number;
  month_of_year?: number;
  end_after_occurrences?: number;
  end_date?: string;
}

export interface ObligationMetadata {
  value?: number;
  currency?: string;
  category?: string;
  tags?: string[];
  external_reference?: string;
  compliance_framework?: string;
  regulatory_requirement?: boolean;
  auto_generated?: boolean;
}

// ============================================================================
// ASSIGNEE TYPES
// ============================================================================

export interface ObligationAssignee {
  id: string;
  obligation_id: string;
  user_id: string;
  role: 'primary' | 'backup' | 'reviewer' | 'approver';
  assigned_at: string;
  assigned_by: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

// ============================================================================
// DEPENDENCY TYPES
// ============================================================================

export interface ObligationDependency {
  id: string;
  obligation_id: string;
  depends_on_id: string;
  dependency_type: 'blocks' | 'requires' | 'related';
  cascade_on_delay: boolean;
  created_at: string;
  depends_on?: {
    id: string;
    title: string;
    status: ObligationStatus;
    due_date: string;
  };
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  title: string;
  status: ObligationStatus;
  due_date: string;
  priority: ObligationPriority;
  depth: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'blocks' | 'requires' | 'related';
}

// ============================================================================
// PERFORMANCE TRACKING TYPES
// ============================================================================

export interface ObligationPerformance {
  id: string;
  obligation_id: string;
  expected_date: string;
  actual_date: string | null;
  expected_value: number | null;
  actual_value: number | null;
  variance_days: number | null;
  variance_value: number | null;
  performance_score: number;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
}

export interface PerformanceMetrics {
  on_time_rate: number;
  average_delay_days: number;
  completion_rate: number;
  overdue_count: number;
  upcoming_count: number;
  health_score: number;
  trend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// RISK ASSESSMENT TYPES
// ============================================================================

export interface ObligationRiskAssessment {
  id: string;
  obligation_id: string;
  risk_score: number;
  risk_factors: RiskFactor[];
  impact_analysis: ImpactAnalysis;
  mitigation_suggestions: string[];
  assessed_at: string;
  assessed_by: string | null;
}

export interface RiskFactor {
  factor: string;
  score: number;
  weight: number;
  description: string;
}

export interface ImpactAnalysis {
  financial_impact: number | null;
  operational_impact: 'low' | 'medium' | 'high' | 'critical';
  reputational_impact: 'low' | 'medium' | 'high' | 'critical';
  cascade_risk: boolean;
  affected_obligations: string[];
}

// ============================================================================
// ESCALATION TYPES
// ============================================================================

export interface ObligationEscalation {
  id: string;
  obligation_id: string;
  escalation_level: EscalationLevel;
  escalated_to: string;
  escalated_by: string | null;
  reason: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  escalated_to_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// COMPLETION EVIDENCE TYPES
// ============================================================================

export interface CompletionEvidence {
  id: string;
  obligation_id: string;
  evidence_type: EvidenceType;
  title: string;
  description: string | null;
  file_path: string | null;
  external_url: string | null;
  metadata: Record<string, unknown>;
  uploaded_by: string;
  uploaded_at: string;
  verified_by: string | null;
  verified_at: string | null;
  uploader?: {
    id: string;
    full_name: string;
  };
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface ObligationAuditEntry {
  id: string;
  obligation_id: string;
  action: string;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  performed_by: string;
  performed_at: string;
  ip_address: string | null;
  user?: {
    id: string;
    full_name: string;
  };
}

// ============================================================================
// LIST ITEM TYPE
// ============================================================================

export interface ObligationListItem {
  id: string;
  title: string;
  obligation_type: ObligationType;
  status: ObligationStatus;
  priority: ObligationPriority;
  due_date: string;
  contract_title: string;
  contract_id: string;
  assignee_count: number;
  is_overdue: boolean;
  days_until_due: number;
  health_score?: number;
}

// ============================================================================
// CALENDAR VIEW TYPES
// ============================================================================

export interface CalendarObligation {
  id: string;
  title: string;
  date: string;
  status: ObligationStatus;
  priority: ObligationPriority;
  obligation_type: ObligationType;
  contract_title: string;
  is_recurring: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  obligations: CalendarObligation[];
  summary: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateObligationPayload {
  contract_id: string;
  title: string;
  description: string;
  obligation_type: ObligationType;
  priority: ObligationPriority;
  due_date: string;
  start_date?: string;
  end_date?: string;
  frequency?: ObligationFrequency;
  recurrence_rule?: RecurrenceRule;
  responsible_party?: 'internal' | 'external' | 'both';
  clause_reference?: string;
  source_text?: string;
  metadata?: Partial<ObligationMetadata>;
  assignee_ids?: string[];
}

export interface UpdateObligationPayload extends Partial<CreateObligationPayload> {
  status?: ObligationStatus;
}

export interface CompleteObligationPayload {
  completion_date?: string;
  actual_value?: number;
  notes?: string;
  evidence?: {
    evidence_type: EvidenceType;
    title: string;
    description?: string;
    file_path?: string;
    external_url?: string;
  }[];
}

export interface EscalateObligationPayload {
  escalate_to_user_id: string;
  reason: string;
}

export interface AddDependencyPayload {
  depends_on_id: string;
  dependency_type: 'blocks' | 'requires' | 'related';
  cascade_on_delay?: boolean;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface ObligationFilters {
  status?: ObligationStatus | ObligationStatus[];
  priority?: ObligationPriority | ObligationPriority[];
  obligation_type?: ObligationType | ObligationType[];
  contract_id?: string;
  assignee_id?: string;
  due_from?: string;
  due_to?: string;
  is_overdue?: boolean;
  search?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface ObligationStats {
  total: number;
  by_status: Record<ObligationStatus, number>;
  by_priority: Record<ObligationPriority, number>;
  by_type: Record<ObligationType, number>;
  overdue: number;
  due_this_week: number;
  due_this_month: number;
  health_score: number;
  performance_metrics: PerformanceMetrics;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const obligationTypeLabels: Record<ObligationType, string> = {
  payment: 'Payment',
  delivery: 'Delivery',
  reporting: 'Reporting',
  compliance: 'Compliance',
  renewal: 'Renewal',
  notice: 'Notice',
  performance: 'Performance',
  audit: 'Audit',
  insurance: 'Insurance',
  confidentiality: 'Confidentiality',
  other: 'Other',
};

export const obligationStatusLabels: Record<ObligationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
  waived: 'Waived',
  cancelled: 'Cancelled',
};

export const obligationStatusColors: Record<ObligationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const obligationPriorityLabels: Record<ObligationPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const obligationPriorityColors: Record<ObligationPriority, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-700',
};

export const frequencyLabels: Record<ObligationFrequency, string> = {
  one_time: 'One Time',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  custom: 'Custom',
};

export const evidenceTypeLabels: Record<EvidenceType, string> = {
  document: 'Document',
  email: 'Email',
  screenshot: 'Screenshot',
  attestation: 'Attestation',
  external_link: 'External Link',
  system_generated: 'System Generated',
  report: 'Report',
  other: 'Other',
};
