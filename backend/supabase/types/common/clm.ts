// Contract Lifecycle Management (CLM) Type Definitions
// Phase 1: Clause Library, Negotiation Playbooks, Contract Obligations

// ============================================
// CLAUSE LIBRARY TYPES
// ============================================

export type ClauseType =
  | 'indemnification'
  | 'liability'
  | 'limitation_of_liability'
  | 'ip_ownership'
  | 'confidentiality'
  | 'data_protection'
  | 'termination'
  | 'termination_for_convenience'
  | 'force_majeure'
  | 'payment'
  | 'pricing'
  | 'warranty'
  | 'insurance'
  | 'dispute_resolution'
  | 'governing_law'
  | 'assignment'
  | 'notice'
  | 'audit_rights'
  | 'compliance'
  | 'sla'
  | 'non_compete'
  | 'non_solicitation'
  | 'entire_agreement'
  | 'amendment'
  | 'severability'
  | 'waiver'
  | 'definitions'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ClauseStatus = 'draft' | 'pending_approval' | 'active' | 'deprecated' | 'archived';

export interface ClauseVariable {
  name: string;
  description?: string;
  default_value?: string;
}

export interface ClauseCategory {
  id: string;
  enterprise_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ClauseLibraryEntry {
  id: string;
  enterprise_id: string;
  title: string;
  slug: string;
  clause_type: ClauseType;
  category_id?: string;
  content: string;
  content_html?: string;
  variables: ClauseVariable[];
  risk_level: RiskLevel;
  jurisdictions: string[];
  languages: string[];
  status: ClauseStatus;
  is_standard: boolean;
  requires_approval_if_modified: boolean;
  effective_date?: string;
  expiration_date?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Relations
  category?: ClauseCategory;
  versions?: ClauseVersion[];
  alternatives?: ClauseAlternative[];
}

export interface ClauseVersion {
  id: string;
  clause_id: string;
  version_number: number;
  version_label?: string;
  content: string;
  content_html?: string;
  variables: ClauseVariable[];
  change_summary?: string;
  change_type?: 'major' | 'minor' | 'patch';
  is_current: boolean;
  created_by?: string;
  created_at: string;
}

export interface ClauseAlternative {
  id: string;
  clause_id: string;
  position_order: number;
  position_label: string;
  content: string;
  content_html?: string;
  description?: string;
  risk_delta: number;
  requires_approval: boolean;
  created_by?: string;
  created_at: string;
}

// ============================================
// NEGOTIATION PLAYBOOK TYPES
// ============================================

export type PlaybookStatus = 'draft' | 'pending_approval' | 'active' | 'deprecated';

export type ContractTypeEnum =
  | 'nda'
  | 'msa'
  | 'sow'
  | 'saas'
  | 'lease'
  | 'employment'
  | 'partnership'
  | 'procurement'
  | 'license'
  | 'service'
  | 'other';

export interface FallbackPosition {
  order: number;
  text: string;
  clause_id?: string;
  description?: string;
}

export interface RedLine {
  term: string;
  description?: string;
  consequence?: string;
}

export interface EscalationTrigger {
  trigger: string;
  action: string;
}

export interface CommonPushback {
  pushback: string;
  response: string;
}

export interface NegotiationPlaybook {
  id: string;
  enterprise_id: string;
  name: string;
  description?: string;
  contract_types: ContractTypeEnum[];
  status: PlaybookStatus;
  version: number;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Relations
  rules?: PlaybookRule[];
}

export interface PlaybookRule {
  id: string;
  playbook_id: string;
  clause_type: ClauseType;
  priority: number; // 1-10, 1 = highest priority
  standard_clause_id?: string;
  standard_position_text?: string;
  fallback_positions: FallbackPosition[];
  red_lines: RedLine[];
  guidance_notes?: string;
  talking_points: string[];
  common_pushback: CommonPushback[];
  escalation_triggers: EscalationTrigger[];
  authority_level?: string;
  created_at: string;
  updated_at: string;
  // Relations
  standard_clause?: ClauseLibraryEntry;
}

export type NegotiationOutcome = 'won' | 'compromised' | 'lost';
export type OverallOutcome = 'favorable' | 'neutral' | 'unfavorable';

export interface PlaybookDeviation {
  clause_type: string;
  rule_id?: string;
  deviation_type: 'used_fallback' | 'custom' | 'accepted_theirs';
  position_used?: number;
  custom_text?: string;
  reason?: string;
}

export interface PlaybookEscalation {
  clause_type: string;
  escalated_to: string;
  escalated_at: string;
  outcome?: 'approved' | 'rejected' | 'modified';
  notes?: string;
}

export interface PlaybookUsage {
  id: string;
  contract_id: string;
  playbook_id: string;
  deviations: PlaybookDeviation[];
  escalations: PlaybookEscalation[];
  outcomes: Record<string, NegotiationOutcome>;
  overall_outcome?: OverallOutcome;
  lessons_learned?: string;
  total_clauses_negotiated: number;
  clauses_won: number;
  clauses_compromised: number;
  clauses_lost: number;
  red_lines_triggered: number;
  escalations_count: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONTRACT OBLIGATION TYPES
// ============================================

export type ObligationType =
  | 'delivery'
  | 'payment'
  | 'reporting'
  | 'compliance'
  | 'renewal'
  | 'notice'
  | 'audit'
  | 'insurance'
  | 'certification'
  | 'milestone'
  | 'sla'
  | 'data_protection'
  | 'confidentiality'
  | 'performance'
  | 'other';

export type PartyResponsible = 'us' | 'them' | 'both';

export type ObligationFrequency =
  | 'one_time'
  | 'daily'
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annually'
  | 'annually'
  | 'on_demand'
  | 'as_needed'
  | 'custom';

export type ObligationStatus =
  | 'pending'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'waived'
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface RecurringConfig {
  type?: string;
  day_of_month?: number;
  months?: number[];
  business_days_only?: boolean;
  skip_weekends?: boolean;
}

export interface ContractObligation {
  id: string;
  enterprise_id: string;
  contract_id: string;
  title: string;
  description?: string;
  obligation_type: ObligationType;
  party_responsible: PartyResponsible;
  frequency: ObligationFrequency;
  start_date?: string;
  end_date?: string;
  due_date?: string;
  next_due_date?: string;
  recurring_day?: number;
  recurring_config: RecurringConfig;
  reminder_days: number[];
  escalation_days: number[];
  extracted_by?: 'ai' | 'manual';
  extraction_confidence?: number;
  source_text?: string;
  source_page?: number;
  source_section?: string;
  status: ObligationStatus;
  priority: Priority;
  risk_if_missed?: string;
  financial_impact?: number;
  risk_score: number;
  depends_on_obligation_id?: string;
  triggers_obligation_id?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  contract?: {
    id: string;
    title: string;
    vendor?: { id: string; name: string };
  };
  assignments?: ObligationAssignment[];
  completions?: ObligationCompletion[];
  reminders?: ObligationReminder[];
  depends_on?: ContractObligation;
  triggers?: ContractObligation;
}

export type AssignmentRole = 'primary' | 'backup' | 'reviewer' | 'approver';

export interface ObligationAssignment {
  id: string;
  obligation_id: string;
  user_id?: string;
  team_id?: string;
  role: AssignmentRole;
  assigned_by?: string;
  assigned_at: string;
  accepted?: boolean;
  accepted_at?: string;
  declined_reason?: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export type EvidenceType =
  | 'document'
  | 'email'
  | 'screenshot'
  | 'attestation'
  | 'external_link'
  | 'system_generated'
  | 'report'
  | 'other';

export interface ObligationCompletion {
  id: string;
  obligation_id: string;
  completion_date: string;
  period_start?: string;
  period_end?: string;
  completed_by?: string;
  evidence_type?: EvidenceType;
  evidence_url?: string;
  evidence_file_id?: string;
  evidence_description?: string;
  notes?: string;
  requires_verification: boolean;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  rejection_reason?: string;
  was_on_time?: boolean;
  days_early_late?: number;
  created_at: string;
  // Relations
  completed_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  verified_by_user?: {
    id: string;
    full_name: string;
  };
}

export type ReminderType = 'upcoming' | 'due' | 'overdue' | 'escalation';

export interface ObligationReminder {
  id: string;
  obligation_id: string;
  reminder_type: ReminderType;
  days_offset: number;
  notification_channels: string[];
  recipients: string[];
  scheduled_for: string;
  sent_at?: string;
  sent_by?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface ClauseSearchParams {
  query?: string;
  clause_type?: ClauseType;
  risk_level?: RiskLevel;
  status?: ClauseStatus;
  category_id?: string;
  is_standard?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ObligationCalendarParams {
  start_date: string;
  end_date: string;
  user_id?: string;
  contract_id?: string;
}

export interface ObligationStats {
  active: number;
  overdue: number;
  pending: number;
  completed: number;
  due_this_week: number;
  due_this_month: number;
  critical_pending: number;
}

export interface PlaybookSuggestion {
  playbook_id: string;
  playbook_name: string;
  match_score: number;
  usage_count: number;
  success_rate: number;
}

export interface PlaybookEffectiveness {
  clause_type: string;
  total_negotiations: number;
  won_count: number;
  compromised_count: number;
  lost_count: number;
  win_rate: number;
  avg_position_used: number;
}

// ============================================
// BULK OPERATION TYPES
// ============================================

export interface BulkCreateObligationsRequest {
  contract_id: string;
  obligations: Omit<ContractObligation, 'id' | 'enterprise_id' | 'contract_id' | 'created_by' | 'created_at' | 'updated_at'>[];
}

export interface BulkCreateObligationsResponse {
  created_count: number;
  obligations: ContractObligation[];
}
