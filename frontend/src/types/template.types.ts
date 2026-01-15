// src/types/template.types.ts
// Types for Contract Templates System

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export type TemplateType =
  | 'master_services_agreement'
  | 'statement_of_work'
  | 'nda'
  | 'mutual_nda'
  | 'employment_agreement'
  | 'independent_contractor'
  | 'consulting_agreement'
  | 'license_agreement'
  | 'saas_agreement'
  | 'data_processing_agreement'
  | 'service_level_agreement'
  | 'vendor_agreement'
  | 'purchase_order'
  | 'lease_agreement'
  | 'amendment'
  | 'addendum'
  | 'letter_of_intent'
  | 'memorandum_of_understanding'
  | 'partnership_agreement'
  | 'joint_venture'
  | 'distribution_agreement'
  | 'franchise_agreement'
  | 'intellectual_property'
  | 'settlement_agreement'
  | 'other';

export type TemplateStatus =
  | 'draft'
  | 'pending_review'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'deprecated'
  | 'archived';

export type VariableType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'party'
  | 'address'
  | 'email'
  | 'phone'
  | 'boolean'
  | 'duration'
  | 'percentage'
  | 'computed';

export type NumberingStyle =
  | 'numeric'
  | 'alpha'
  | 'roman'
  | 'none';

// ============================================================================
// TEMPLATE SECTION TYPES
// ============================================================================

export interface TemplateSection {
  id: string;
  template_id: string;
  parent_section_id: string | null;
  title: string;
  content: string;
  section_order: number;
  numbering_style: NumberingStyle;
  is_optional: boolean;
  conditional_logic: SectionConditionalLogic | null;
  metadata: SectionMetadata;
  created_at: string;
  updated_at: string;
  clauses?: TemplateClauseMapping[];
  children?: TemplateSection[];
}

export interface SectionConditionalLogic {
  show_when?: {
    variable: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: unknown;
  };
  hide_when?: {
    variable: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: unknown;
  };
}

export interface SectionMetadata {
  is_editable?: boolean;
  requires_approval?: boolean;
  legal_review_required?: boolean;
  risk_level?: 'low' | 'medium' | 'high';
  notes?: string;
}

// ============================================================================
// TEMPLATE CLAUSE TYPES
// ============================================================================

export interface TemplateClauseMapping {
  id: string;
  template_id: string;
  section_id: string;
  clause_id: string;
  position_in_section: number;
  is_required: boolean;
  alternative_clause_ids: string[];
  created_at: string;
  clause?: {
    id: string;
    name: string;
    category: string;
    content: string;
  };
}

// ============================================================================
// TEMPLATE VARIABLE TYPES
// ============================================================================

export interface TemplateVariable {
  id: string;
  template_id: string;
  variable_name: string;
  variable_label: string;
  variable_type: VariableType;
  default_value: unknown | null;
  is_required: boolean;
  validation_rules: VariableValidation;
  options: VariableOption[] | null;
  description: string | null;
  display_order: number;
  group_name: string | null;
  computed_formula: string | null;
  created_at: string;
  updated_at: string;
}

export interface VariableValidation {
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  custom_message?: string;
}

export interface VariableOption {
  value: string;
  label: string;
}

// ============================================================================
// TEMPLATE VERSION TYPES
// ============================================================================

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  content_snapshot: TemplateContentSnapshot;
  change_summary: string | null;
  created_by: string;
  created_at: string;
  is_published: boolean;
  published_at: string | null;
  published_by: string | null;
  creator?: {
    id: string;
    full_name: string;
  };
}

export interface TemplateContentSnapshot {
  sections: TemplateSection[];
  variables: TemplateVariable[];
  clauses: TemplateClauseMapping[];
  metadata: ContractTemplate['metadata'];
}

// ============================================================================
// TEMPLATE INHERITANCE TYPES
// ============================================================================

export interface TemplateInheritance {
  id: string;
  child_template_id: string;
  parent_template_id: string;
  inherited_sections: string[];
  overridden_sections: string[];
  created_at: string;
  parent_template?: {
    id: string;
    name: string;
    template_type: TemplateType;
  };
}

// ============================================================================
// TEMPLATE USAGE ANALYTICS
// ============================================================================

export interface TemplateUsageAnalytics {
  id: string;
  template_id: string;
  contract_id: string;
  created_by: string;
  variables_used: Record<string, unknown>;
  sections_included: string[];
  sections_excluded: string[];
  customizations_made: TemplateCustomization[];
  created_at: string;
}

export interface TemplateCustomization {
  type: 'section_added' | 'section_removed' | 'section_modified' | 'variable_changed';
  target_id: string;
  original_value?: unknown;
  new_value?: unknown;
}

// ============================================================================
// MAIN CONTRACT TEMPLATE TYPE
// ============================================================================

export interface ContractTemplate {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  template_type: TemplateType;
  category: string | null;
  status: TemplateStatus;
  version: number;
  is_default: boolean;
  jurisdiction: string | null;
  language: string;
  metadata: TemplateMetadata;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  sections?: TemplateSection[];
  variables?: TemplateVariable[];
  versions?: TemplateVersion[];
  inheritance?: TemplateInheritance[];
  usage_count?: number;
  creator?: {
    id: string;
    full_name: string;
  };
  approver?: {
    id: string;
    full_name: string;
  };
}

export interface TemplateMetadata {
  tags?: string[];
  industry?: string;
  department?: string;
  legal_review_required?: boolean;
  approval_workflow?: string;
  retention_period_days?: number;
  auto_renewal_default?: boolean;
  typical_duration_days?: number;
}

// ============================================================================
// LIST ITEM TYPE (for tables)
// ============================================================================

export interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  template_type: TemplateType;
  category: string | null;
  status: TemplateStatus;
  version: number;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    full_name: string;
  };
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  template_type: TemplateType;
  category?: string;
  jurisdiction?: string;
  language?: string;
  metadata?: Partial<TemplateMetadata>;
  is_default?: boolean;
}

export interface UpdateTemplatePayload extends Partial<CreateTemplatePayload> {
  status?: TemplateStatus;
}

export interface CreateSectionPayload {
  template_id: string;
  parent_section_id?: string;
  title: string;
  content: string;
  section_order?: number;
  numbering_style?: NumberingStyle;
  is_optional?: boolean;
  conditional_logic?: SectionConditionalLogic;
  metadata?: SectionMetadata;
}

export type UpdateSectionPayload = Partial<Omit<CreateSectionPayload, 'template_id'>>;

export interface CreateVariablePayload {
  template_id: string;
  variable_name: string;
  variable_label: string;
  variable_type: VariableType;
  default_value?: unknown;
  is_required?: boolean;
  validation_rules?: VariableValidation;
  options?: VariableOption[];
  description?: string;
  display_order?: number;
  group_name?: string;
  computed_formula?: string;
}

export type UpdateVariablePayload = Partial<Omit<CreateVariablePayload, 'template_id'>>;

export interface RenderTemplatePayload {
  template_id: string;
  variables: Record<string, unknown>;
  include_sections?: string[];
  exclude_sections?: string[];
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface TemplateFilters {
  status?: TemplateStatus | TemplateStatus[];
  template_type?: TemplateType | TemplateType[];
  category?: string;
  search?: string;
  is_default?: boolean;
  created_by?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface TemplateStats {
  total: number;
  by_status: Record<TemplateStatus, number>;
  by_type: Record<TemplateType, number>;
  most_used: {
    template_id: string;
    template_name: string;
    usage_count: number;
  }[];
  recently_updated: TemplateListItem[];
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const templateTypeLabels: Record<TemplateType, string> = {
  master_services_agreement: 'Master Services Agreement',
  statement_of_work: 'Statement of Work',
  nda: 'Non-Disclosure Agreement',
  mutual_nda: 'Mutual NDA',
  employment_agreement: 'Employment Agreement',
  independent_contractor: 'Independent Contractor',
  consulting_agreement: 'Consulting Agreement',
  license_agreement: 'License Agreement',
  saas_agreement: 'SaaS Agreement',
  data_processing_agreement: 'Data Processing Agreement',
  service_level_agreement: 'Service Level Agreement',
  vendor_agreement: 'Vendor Agreement',
  purchase_order: 'Purchase Order',
  lease_agreement: 'Lease Agreement',
  amendment: 'Amendment',
  addendum: 'Addendum',
  letter_of_intent: 'Letter of Intent',
  memorandum_of_understanding: 'Memorandum of Understanding',
  partnership_agreement: 'Partnership Agreement',
  joint_venture: 'Joint Venture',
  distribution_agreement: 'Distribution Agreement',
  franchise_agreement: 'Franchise Agreement',
  intellectual_property: 'Intellectual Property',
  settlement_agreement: 'Settlement Agreement',
  other: 'Other',
};

export const templateStatusLabels: Record<TemplateStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
  deprecated: 'Deprecated',
  archived: 'Archived',
};

export const templateStatusColors: Record<TemplateStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-purple-100 text-purple-700',
  deprecated: 'bg-orange-100 text-orange-700',
  archived: 'bg-gray-100 text-gray-500',
};

export const variableTypeLabels: Record<VariableType, string> = {
  text: 'Text',
  number: 'Number',
  currency: 'Currency',
  date: 'Date',
  select: 'Dropdown',
  party: 'Party/Entity',
  address: 'Address',
  email: 'Email',
  phone: 'Phone',
  boolean: 'Yes/No',
  duration: 'Duration',
  percentage: 'Percentage',
  computed: 'Computed',
};
