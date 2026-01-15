// src/types/intake.types.ts
// Types for Contract Intake Forms and Submissions

// ============================================================================
// INTAKE FORM TYPES
// ============================================================================

export type IntakeFormStatus = 'draft' | 'active' | 'archived';

export type IntakeFormType =
  | 'new_contract'
  | 'contract_renewal'
  | 'contract_amendment'
  | 'vendor_onboarding'
  | 'nda_request'
  | 'procurement_request'
  | 'general';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'email'
  | 'phone'
  | 'url'
  | 'user_select'
  | 'vendor_select'
  | 'department_select'
  | 'contract_type_select'
  | 'rich_text'
  | 'signature'
  | 'hidden';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  placeholder?: string;
  help_text?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  accept?: string; // File types
  currency?: string;
  default_value?: unknown;
}

export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  custom_message?: string;
}

export interface ConditionalLogic {
  show_when?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: unknown;
  };
}

export interface IntakeFormField {
  id: string;
  form_id: string;
  field_name: string;
  field_label: string;
  field_type: FieldType;
  field_config: FieldConfig;
  validation_rules: ValidationRules;
  is_required: boolean;
  display_order: number;
  conditional_logic: ConditionalLogic | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeFormSettings {
  require_approval?: boolean;
  auto_assign_owner?: boolean;
  default_contract_type?: string;
  notification_emails?: string[];
}

export interface IntakeForm {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  form_type: IntakeFormType;
  settings: IntakeFormSettings;
  status: IntakeFormStatus;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  fields?: IntakeFormField[];
  _count?: {
    submissions: number;
  };
}

// ============================================================================
// SUBMISSION TYPES
// ============================================================================

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'converted';

export type SubmissionPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface IntakeAttachment {
  id: string;
  submission_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface IntakeComment {
  id: string;
  submission_id: string;
  user_id: string;
  comment_text: string;
  comment_type: 'general' | 'question' | 'clarification' | 'review';
  created_at: string;
  user?: {
    id: string;
    full_name: string;
  };
}

export interface IntakeSubmission {
  id: string;
  enterprise_id: string;
  form_id: string;
  submission_number: string;
  form_data: Record<string, unknown>;
  status: SubmissionStatus;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  requester_department: string | null;
  priority: SubmissionPriority;
  target_date: string | null;
  contract_id: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  assigned_owner_id: string | null;
  created_at: string;
  updated_at: string;
  form?: IntakeForm;
  reviewer?: {
    id: string;
    full_name: string;
    email: string;
  };
  requester?: {
    id: string;
    full_name: string;
    email: string;
  };
  attachments?: IntakeAttachment[];
  comments?: IntakeComment[];
}

// ============================================================================
// FORM DATA TYPES (for creating/updating)
// ============================================================================

export interface CreateIntakeFormData {
  name: string;
  description?: string;
  form_type: IntakeFormType;
  settings?: IntakeFormSettings;
}

export interface UpdateIntakeFormData extends Partial<CreateIntakeFormData> {
  status?: IntakeFormStatus;
}

export interface CreateIntakeFieldData {
  field_name: string;
  field_label: string;
  field_type: FieldType;
  field_config?: FieldConfig;
  validation_rules?: ValidationRules;
  is_required?: boolean;
  display_order?: number;
  conditional_logic?: ConditionalLogic | null;
}

export type UpdateIntakeFieldData = Partial<CreateIntakeFieldData>;

export interface SubmitIntakeData {
  form_id: string;
  form_data: Record<string, unknown>;
  requester_name: string;
  requester_email: string;
  requester_department?: string;
  priority?: SubmissionPriority;
  target_date?: string;
  attachments?: {
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  }[];
}

export interface ReviewSubmissionData {
  decision: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  assigned_to?: string;
}

export interface ConvertSubmissionData {
  title: string;
  contract_type?: string;
  vendor_id?: string;
  owner_id?: string;
  additional_data?: Record<string, unknown>;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface IntakeStats {
  submissions: {
    total: number;
    by_status: Record<SubmissionStatus, number>;
    by_priority: Record<SubmissionPriority, number>;
    pending_review: number;
    last_30_days: number;
  };
  forms: {
    total_forms: number;
    active_forms: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export const formTypeLabels: Record<IntakeFormType, string> = {
  new_contract: 'New Contract',
  contract_renewal: 'Contract Renewal',
  contract_amendment: 'Contract Amendment',
  vendor_onboarding: 'Vendor Onboarding',
  nda_request: 'NDA Request',
  procurement_request: 'Procurement Request',
  general: 'General Request',
};

export const fieldTypeLabels: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Text Area',
  number: 'Number',
  currency: 'Currency',
  date: 'Date',
  datetime: 'Date & Time',
  select: 'Dropdown',
  multiselect: 'Multi-Select',
  radio: 'Radio Buttons',
  checkbox: 'Checkbox',
  file: 'File Upload',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  user_select: 'User Select',
  vendor_select: 'Vendor Select',
  department_select: 'Department Select',
  contract_type_select: 'Contract Type Select',
  rich_text: 'Rich Text',
  signature: 'Signature',
  hidden: 'Hidden',
};

export const submissionStatusLabels: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted',
};

export const priorityLabels: Record<SubmissionPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const priorityColors: Record<SubmissionPriority, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-amber-500',
  urgent: 'text-red-500',
};

export const statusColors: Record<SubmissionStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-purple-100 text-purple-700',
};
