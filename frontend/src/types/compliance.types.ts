// src/types/compliance.types.ts
// Types for Compliance Rules Engine

// ============================================================================
// REGULATORY FRAMEWORK TYPES
// ============================================================================

export type FrameworkType =
  | 'regulatory'
  | 'industry_standard'
  | 'internal_policy'
  | 'best_practice';

export type FrameworkStatus = 'active' | 'inactive' | 'draft' | 'deprecated';

export interface RegulatoryFramework {
  id: string;
  code: string;
  name: string;
  description: string | null;
  framework_type: FrameworkType;
  jurisdiction: string | null;
  issuing_body: string | null;
  effective_date: string | null;
  version: string | null;
  documentation_url: string | null;
  is_system: boolean;
  status: FrameworkStatus;
  created_at: string;
  updated_at: string;
  requirements_count?: number;
}

export interface EnterpriseComplianceFramework {
  id: string;
  enterprise_id: string;
  framework_id: string;
  is_mandatory: boolean;
  applies_to: FrameworkAppliesTo;
  customizations: FrameworkCustomizations;
  enabled_at: string;
  enabled_by: string;
  framework?: RegulatoryFramework;
}

export interface FrameworkAppliesTo {
  contract_types?: string[];
  vendor_categories?: string[];
  departments?: string[];
  all?: boolean;
}

export interface FrameworkCustomizations {
  additional_requirements?: string[];
  excluded_requirements?: string[];
  modified_thresholds?: Record<string, unknown>;
}

// ============================================================================
// COMPLIANCE REQUIREMENT TYPES
// ============================================================================

export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
export type RequirementCategory =
  | 'data_protection'
  | 'financial'
  | 'operational'
  | 'legal'
  | 'security'
  | 'environmental'
  | 'labor'
  | 'reporting'
  | 'other';

export interface ComplianceRequirement {
  id: string;
  framework_id: string;
  requirement_code: string;
  title: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  verification_method: string | null;
  evidence_required: string[];
  penalty_for_breach: string | null;
  references: RequirementReference[];
  created_at: string;
  updated_at: string;
}

export interface RequirementReference {
  type: 'section' | 'article' | 'clause' | 'url';
  reference: string;
  description?: string;
}

// ============================================================================
// COMPLIANCE RULE TYPES
// ============================================================================

export type RuleType =
  | 'clause_presence'
  | 'clause_content'
  | 'value_threshold'
  | 'date_constraint'
  | 'party_requirement'
  | 'document_requirement'
  | 'custom';

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RuleStatus = 'active' | 'inactive' | 'draft' | 'deprecated';

export interface ComplianceRule {
  id: string;
  enterprise_id: string;
  requirement_id: string | null;
  group_id: string | null;
  name: string;
  description: string | null;
  rule_type: RuleType;
  rule_definition: RuleDefinition;
  severity: RuleSeverity;
  status: RuleStatus;
  auto_remediation: AutoRemediation | null;
  applies_to: RuleAppliesTo;
  created_by: string;
  created_at: string;
  updated_at: string;
  requirement?: ComplianceRequirement;
  group?: ComplianceRuleGroup;
}

export interface RuleDefinition {
  condition: RuleCondition;
  expected_value?: unknown;
  threshold?: number;
  clause_patterns?: string[];
  date_constraints?: DateConstraint;
  custom_logic?: string;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
  logic?: 'and' | 'or';
  children?: RuleCondition[];
}

export interface DateConstraint {
  type: 'before' | 'after' | 'within' | 'not_within';
  reference: 'contract_start' | 'contract_end' | 'today' | 'custom';
  offset_days?: number;
  custom_date?: string;
}

export interface AutoRemediation {
  action: 'flag' | 'suggest' | 'auto_fix' | 'escalate';
  suggestion?: string;
  fix_template?: string;
  escalate_to?: string;
}

export interface RuleAppliesTo {
  contract_types?: string[];
  contract_values?: { min?: number; max?: number };
  vendor_categories?: string[];
  frameworks?: string[];
}

// ============================================================================
// RULE GROUP TYPES
// ============================================================================

export interface ComplianceRuleGroup {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  parent_group_id: string | null;
  display_order: number;
  created_at: string;
  rules_count?: number;
  children?: ComplianceRuleGroup[];
}

// ============================================================================
// COMPLIANCE CHECK TYPES
// ============================================================================

export type CheckStatus = 'passed' | 'failed' | 'warning' | 'skipped' | 'pending';
export type CheckResultStatus = 'pass' | 'fail' | 'warning' | 'error' | 'skipped';

export interface ContractComplianceCheck {
  id: string;
  contract_id: string;
  framework_id: string | null;
  check_type: 'manual' | 'automated' | 'scheduled';
  overall_status: CheckStatus;
  score: number;
  findings_summary: FindingsSummary;
  checked_by: string | null;
  checked_at: string;
  next_check_due: string | null;
  contract?: {
    id: string;
    title: string;
    contract_number: string;
  };
  results?: ComplianceCheckResult[];
}

export interface FindingsSummary {
  total_rules: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  critical_failures: number;
}

export interface ComplianceCheckResult {
  id: string;
  check_id: string;
  rule_id: string;
  status: CheckResultStatus;
  details: CheckResultDetails;
  evidence_location: string | null;
  remediation_applied: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  rule?: ComplianceRule;
}

export interface CheckResultDetails {
  message: string;
  expected?: unknown;
  actual?: unknown;
  location?: {
    section?: string;
    clause?: string;
    page?: number;
  };
  suggestions?: string[];
}

// ============================================================================
// COMPLIANCE ISSUE TYPES
// ============================================================================

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'accepted' | 'waived';
export type IssuePriority = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceIssue {
  id: string;
  enterprise_id: string;
  contract_id: string | null;
  check_result_id: string | null;
  rule_id: string | null;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigned_to: string | null;
  due_date: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  contract?: {
    id: string;
    title: string;
  };
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
  comments?: ComplianceIssueComment[];
}

export interface ComplianceIssueComment {
  id: string;
  issue_id: string;
  user_id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
  };
}

// ============================================================================
// CERTIFICATION TYPES
// ============================================================================

export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired' | 'revoked' | 'pending';

export interface ComplianceCertification {
  id: string;
  enterprise_id: string;
  framework_id: string;
  certification_number: string | null;
  certifying_body: string;
  issue_date: string;
  expiry_date: string;
  scope: string | null;
  status: CertificationStatus;
  documentation_path: string | null;
  created_at: string;
  updated_at: string;
  framework?: RegulatoryFramework;
  renewals?: CertificationRenewal[];
}

export interface CertificationRenewal {
  id: string;
  certification_id: string;
  renewal_date: string;
  new_expiry_date: string;
  renewed_by: string;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// LIST ITEM TYPES
// ============================================================================

export interface ComplianceCheckListItem {
  id: string;
  contract_id: string;
  contract_title: string;
  framework_name: string | null;
  overall_status: CheckStatus;
  score: number;
  critical_failures: number;
  checked_at: string;
  next_check_due: string | null;
}

export interface ComplianceIssueListItem {
  id: string;
  title: string;
  contract_title: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigned_to_name: string | null;
  due_date: string | null;
  created_at: string;
  is_overdue: boolean;
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateComplianceRulePayload {
  requirement_id?: string;
  group_id?: string;
  name: string;
  description?: string;
  rule_type: RuleType;
  rule_definition: RuleDefinition;
  severity: RuleSeverity;
  auto_remediation?: AutoRemediation;
  applies_to?: RuleAppliesTo;
}

export interface UpdateComplianceRulePayload extends Partial<CreateComplianceRulePayload> {
  status?: RuleStatus;
}

export interface RunComplianceCheckPayload {
  contract_id: string;
  framework_id?: string;
  rule_ids?: string[];
}

export interface CreateComplianceIssuePayload {
  contract_id?: string;
  check_result_id?: string;
  rule_id?: string;
  title: string;
  description: string;
  priority: IssuePriority;
  assigned_to?: string;
  due_date?: string;
}

export interface UpdateComplianceIssuePayload {
  status?: IssueStatus;
  priority?: IssuePriority;
  assigned_to?: string;
  due_date?: string;
  resolution_notes?: string;
}

export interface EnableFrameworkPayload {
  framework_id: string;
  is_mandatory?: boolean;
  applies_to?: FrameworkAppliesTo;
  customizations?: FrameworkCustomizations;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface ComplianceCheckFilters {
  contract_id?: string;
  framework_id?: string;
  status?: CheckStatus | CheckStatus[];
  score_min?: number;
  score_max?: number;
  date_from?: string;
  date_to?: string;
}

export interface ComplianceIssueFilters {
  status?: IssueStatus | IssueStatus[];
  priority?: IssuePriority | IssuePriority[];
  contract_id?: string;
  assigned_to?: string;
  is_overdue?: boolean;
  search?: string;
}

export interface ComplianceRuleFilters {
  rule_type?: RuleType | RuleType[];
  severity?: RuleSeverity | RuleSeverity[];
  status?: RuleStatus;
  framework_id?: string;
  group_id?: string;
  search?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface ComplianceStats {
  overall_score: number;
  contracts_checked: number;
  total_checks: number;
  by_status: Record<CheckStatus, number>;
  critical_issues: number;
  open_issues: number;
  certifications_expiring: number;
  frameworks_enabled: number;
}

export interface ComplianceTrend {
  date: string;
  score: number;
  checks_run: number;
  issues_opened: number;
  issues_resolved: number;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const frameworkTypeLabels: Record<FrameworkType, string> = {
  regulatory: 'Regulatory',
  industry_standard: 'Industry Standard',
  internal_policy: 'Internal Policy',
  best_practice: 'Best Practice',
};

export const checkStatusLabels: Record<CheckStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  warning: 'Warning',
  skipped: 'Skipped',
  pending: 'Pending',
};

export const checkStatusColors: Record<CheckStatus, string> = {
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  skipped: 'bg-gray-100 text-gray-500',
  pending: 'bg-blue-100 text-blue-700',
};

export const issueStatusLabels: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  accepted: 'Accepted',
  waived: 'Waived',
};

export const issueStatusColors: Record<IssueStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  accepted: 'bg-gray-100 text-gray-700',
  waived: 'bg-amber-100 text-amber-700',
};

export const ruleSeverityLabels: Record<RuleSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export const ruleSeverityColors: Record<RuleSeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
  info: 'bg-gray-100 text-gray-700',
};

export const requirementCategoryLabels: Record<RequirementCategory, string> = {
  data_protection: 'Data Protection',
  financial: 'Financial',
  operational: 'Operational',
  legal: 'Legal',
  security: 'Security',
  environmental: 'Environmental',
  labor: 'Labor',
  reporting: 'Reporting',
  other: 'Other',
};

export const ruleTypeLabels: Record<RuleType, string> = {
  clause_presence: 'Clause Presence',
  clause_content: 'Clause Content',
  value_threshold: 'Value Threshold',
  date_constraint: 'Date Constraint',
  party_requirement: 'Party Requirement',
  document_requirement: 'Document Requirement',
  custom: 'Custom',
};

export const certificationStatusLabels: Record<CertificationStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  revoked: 'Revoked',
  pending: 'Pending',
};

export const certificationStatusColors: Record<CertificationStatus, string> = {
  valid: 'bg-green-100 text-green-700',
  expiring_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  revoked: 'bg-gray-100 text-gray-500',
  pending: 'bg-blue-100 text-blue-700',
};

// Common regulatory frameworks
export const commonFrameworks = [
  { code: 'GDPR', name: 'General Data Protection Regulation' },
  { code: 'SOX', name: 'Sarbanes-Oxley Act' },
  { code: 'HIPAA', name: 'Health Insurance Portability and Accountability Act' },
  { code: 'PCI-DSS', name: 'Payment Card Industry Data Security Standard' },
  { code: 'SOC2', name: 'SOC 2 Type II' },
  { code: 'ISO27001', name: 'ISO 27001' },
  { code: 'CCPA', name: 'California Consumer Privacy Act' },
  { code: 'FCPA', name: 'Foreign Corrupt Practices Act' },
] as const;
