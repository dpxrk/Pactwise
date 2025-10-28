// Contract-related type definitions

export interface Contract {
  id: string;
  enterprise_id: string;
  vendor_id?: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  status: ContractStatus;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  renewal_notice_days?: number;
  payment_terms?: string;
  termination_clause?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  metadata?: ContractMetadata;
}

export type ContractStatus = 
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'renewed';

export interface ContractMetadata {
  tags?: string[];
  category?: string;
  department?: string;
  owner?: string;
  attachments?: ContractAttachment[];
  customFields?: Record<string, unknown>;
}

export interface ContractAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ContractAnalysis {
  contractId: string;
  risks: ContractRisk[];
  opportunities: ContractOpportunity[];
  clauses: ContractClause[];
  compliance: ContractCompliance;
  financialImpact: FinancialImpact;
  recommendations: string[];
}

export interface ContractRisk {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact?: 'low' | 'medium' | 'high' | 'critical';
  contracts?: string[];
  clause?: string;
  mitigation?: string;
  probability?: number;
  title?: string;
}

export interface ContractOpportunity {
  type: string;
  description: string;
  potentialValue?: number;
  implementation?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ContractClause {
  type: string;
  text: string;
  risk?: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface ContractCompliance {
  isCompliant: boolean;
  issues: ComplianceIssue[];
  certifications: string[];
  lastReviewDate?: string;
}

export interface ComplianceIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution?: string;
}

export interface FinancialImpact {
  totalValue: number;
  monthlyBurn: number;
  remainingValue: number;
  projectedOverage?: number;
  savingsOpportunity?: number;
}

export interface ContractEvent {
  id: string;
  contractId: string;
  type: 'created' | 'updated' | 'status_changed' | 'renewed' | 'terminated';
  timestamp: string;
  userId: string;
  details: Record<string, unknown>;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  clauses: TemplateClause[];
  metadata?: Record<string, unknown>;
}

export interface TemplateClause {
  id: string;
  title: string;
  text: string;
  isRequired: boolean;
  category: string;
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  defaultValue?: unknown;
  required: boolean;
}