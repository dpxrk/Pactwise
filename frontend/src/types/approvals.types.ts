// src/types/approvals.types.ts
// Types for Approval Matrix System

// ============================================================================
// APPROVAL MATRIX TYPES
// ============================================================================

export type AppliesTo =
  | 'contracts'
  | 'intake_submissions'
  | 'purchase_orders'
  | 'vendor_onboarding'
  | 'amendments'
  | 'renewals'
  | 'all';

export type ApprovalAction =
  | 'require_approval'
  | 'auto_approve'
  | 'escalate'
  | 'notify_only';

export type ApproverType =
  | 'user'
  | 'role'
  | 'department'
  | 'manager_of'
  | 'dynamic';

export type ApprovalMode =
  | 'any'
  | 'all'
  | 'sequential'
  | 'percentage';

export type RoutingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'skipped';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equals'
  | 'less_than'
  | 'less_than_or_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'between';

export type MatrixStatus = 'active' | 'inactive' | 'draft';

// ============================================================================
// CONDITION TYPES
// ============================================================================

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  value2?: unknown; // For 'between' operator
}

export interface ConditionGroup {
  logic: 'and' | 'or';
  conditions: (RuleCondition | ConditionGroup)[];
}

// ============================================================================
// APPROVER TYPES
// ============================================================================

export interface Approver {
  type: ApproverType;
  value: string; // user_id, role_name, department_id, or dynamic field
  order?: number; // For sequential approval
  is_required?: boolean;
  fallback_approver?: Approver;
}

export interface ApproverWithDetails extends Approver {
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  department?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// APPROVAL RULE TYPES
// ============================================================================

export interface ApprovalMatrixRule {
  id: string;
  matrix_id: string;
  name: string;
  description: string | null;
  priority: number;
  conditions: ConditionGroup;
  action: ApprovalAction;
  approvers: Approver[];
  approval_mode: ApprovalMode;
  approval_percentage?: number; // For percentage mode
  escalation_rules: EscalationRule | null;
  sla_hours: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EscalationRule {
  escalate_after_hours: number;
  escalate_to: Approver[];
  max_escalations: number;
  notify_on_escalation: boolean;
}

// ============================================================================
// APPROVAL MATRIX TYPES
// ============================================================================

export interface ApprovalMatrix {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  applies_to: AppliesTo;
  status: MatrixStatus;
  is_default: boolean;
  priority: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  rules?: ApprovalMatrixRule[];
  creator?: {
    id: string;
    full_name: string;
  };
}

export interface ApprovalMatrixListItem {
  id: string;
  name: string;
  description: string | null;
  applies_to: AppliesTo;
  status: MatrixStatus;
  is_default: boolean;
  rules_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// APPROVAL ROUTING TYPES
// ============================================================================

export interface ApprovalRoutingHistory {
  id: string;
  matrix_id: string;
  rule_id: string;
  entity_type: AppliesTo;
  entity_id: string;
  approver_id: string;
  approver_type: ApproverType;
  status: RoutingStatus;
  comments: string | null;
  decision_at: string | null;
  escalation_level: number;
  due_at: string | null;
  created_at: string;
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
  entity?: {
    id: string;
    title: string;
    type: string;
  };
}

export interface PendingApproval {
  id: string;
  entity_type: AppliesTo;
  entity_id: string;
  entity_title: string;
  matrix_name: string;
  rule_name: string;
  requested_at: string;
  due_at: string | null;
  is_overdue: boolean;
  requester: {
    id: string;
    full_name: string;
    email: string;
  };
  current_approvers: ApproverWithDetails[];
  approval_progress: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

// ============================================================================
// DELEGATION TYPES
// ============================================================================

export interface ApprovalDelegation {
  id: string;
  enterprise_id: string;
  delegator_id: string;
  delegate_id: string;
  applies_to: AppliesTo | 'all';
  start_date: string;
  end_date: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  delegator?: {
    id: string;
    full_name: string;
    email: string;
  };
  delegate?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateApprovalMatrixPayload {
  name: string;
  description?: string;
  applies_to: AppliesTo;
  is_default?: boolean;
  priority?: number;
}

export interface UpdateApprovalMatrixPayload extends Partial<CreateApprovalMatrixPayload> {
  status?: MatrixStatus;
}

export interface CreateApprovalRulePayload {
  matrix_id: string;
  name: string;
  description?: string;
  priority?: number;
  conditions: ConditionGroup;
  action: ApprovalAction;
  approvers: Approver[];
  approval_mode: ApprovalMode;
  approval_percentage?: number;
  escalation_rules?: EscalationRule;
  sla_hours?: number;
}

export interface UpdateApprovalRulePayload extends Partial<Omit<CreateApprovalRulePayload, 'matrix_id'>> {
  is_active?: boolean;
}

export interface CreateDelegationPayload {
  delegate_id: string;
  applies_to: AppliesTo | 'all';
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface ApprovalDecisionPayload {
  routing_id: string;
  decision: 'approve' | 'reject';
  comments?: string;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface ApprovalMatrixFilters {
  applies_to?: AppliesTo;
  status?: MatrixStatus;
  search?: string;
  is_default?: boolean;
}

export interface RoutingHistoryFilters {
  entity_type?: AppliesTo;
  entity_id?: string;
  status?: RoutingStatus | RoutingStatus[];
  approver_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PendingApprovalFilters {
  entity_type?: AppliesTo;
  is_overdue?: boolean;
  search?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface ApprovalStats {
  pending: number;
  approved_today: number;
  rejected_today: number;
  overdue: number;
  average_approval_time_hours: number;
  by_entity_type: Record<AppliesTo, {
    pending: number;
    approved: number;
    rejected: number;
  }>;
}

export interface ApproverStats {
  total_decisions: number;
  approved: number;
  rejected: number;
  average_response_time_hours: number;
  pending: number;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const appliesToLabels: Record<AppliesTo, string> = {
  contracts: 'Contracts',
  intake_submissions: 'Intake Submissions',
  purchase_orders: 'Purchase Orders',
  vendor_onboarding: 'Vendor Onboarding',
  amendments: 'Amendments',
  renewals: 'Renewals',
  all: 'All Types',
};

export const approvalActionLabels: Record<ApprovalAction, string> = {
  require_approval: 'Require Approval',
  auto_approve: 'Auto Approve',
  escalate: 'Escalate',
  notify_only: 'Notify Only',
};

export const approverTypeLabels: Record<ApproverType, string> = {
  user: 'Specific User',
  role: 'Role',
  department: 'Department Head',
  manager_of: 'Manager Of',
  dynamic: 'Dynamic Field',
};

export const approvalModeLabels: Record<ApprovalMode, string> = {
  any: 'Any One Approver',
  all: 'All Approvers',
  sequential: 'Sequential',
  percentage: 'Percentage',
};

export const routingStatusLabels: Record<RoutingStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  escalated: 'Escalated',
  skipped: 'Skipped',
};

export const routingStatusColors: Record<RoutingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  escalated: 'bg-orange-100 text-orange-700',
  skipped: 'bg-gray-100 text-gray-500',
};

export const conditionOperatorLabels: Record<ConditionOperator, string> = {
  equals: 'Equals',
  not_equals: 'Does Not Equal',
  greater_than: 'Greater Than',
  greater_than_or_equals: 'Greater Than or Equals',
  less_than: 'Less Than',
  less_than_or_equals: 'Less Than or Equals',
  contains: 'Contains',
  not_contains: 'Does Not Contain',
  starts_with: 'Starts With',
  ends_with: 'Ends With',
  in: 'Is One Of',
  not_in: 'Is Not One Of',
  between: 'Is Between',
};

// Common fields for conditions
export const commonConditionFields = [
  { value: 'contract_value', label: 'Contract Value', type: 'currency' },
  { value: 'contract_type', label: 'Contract Type', type: 'select' },
  { value: 'vendor_id', label: 'Vendor', type: 'select' },
  { value: 'department', label: 'Department', type: 'select' },
  { value: 'duration_months', label: 'Duration (Months)', type: 'number' },
  { value: 'risk_level', label: 'Risk Level', type: 'select' },
  { value: 'requester_role', label: 'Requester Role', type: 'select' },
  { value: 'auto_renewal', label: 'Auto Renewal', type: 'boolean' },
] as const;
