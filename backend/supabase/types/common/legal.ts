export interface LegalAgentProcessData {
  action?: 'approve' | 'reject' | 'escalate';
  approvalType?: string;
  comments?: string;
  conditions?: string[];
  checkType?: string;
  complianceCheck?: boolean;
  content?: string;
  text?: string;
}

export interface Clause {
  type: string;
  text: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  databaseInsight?: any; // To be refined
}

export interface LegalRisk {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  found: boolean;
}

export interface Obligation {
  text: string;
  type: string;
  party: string;
}

export interface Protection {
  limitationOfLiability: boolean;
  capOnDamages: boolean;
  rightToTerminate: boolean;
  disputeResolution: boolean;
  warrantyDisclaimer: boolean;
  intellectualPropertyRights: boolean;
  confidentialityProtection: boolean;
  dataProtection: boolean;
}

export interface MissingClause {
  name: string;
  type: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface RedFlag {
  flag: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RegulationCheck {
  regulation: string;
  compliant: boolean;
  issue: string | null;
  remediation: string;
}

export interface DataPrivacyCheck {
  check: string;
  issue: string;
}

export interface IndustryStandardCheck {
  industry: string;
  standard: string;
  mentioned: boolean;
  required: boolean;
}

export interface DatabaseRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  clause?: string;
  mitigation?: string;
}

export interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution?: string;
}

export interface LegalAnalysisResult {
  clauses: Clause[];
  risks: LegalRisk[];
  obligations: Obligation[];
  protections: Protection;
  missingClauses: MissingClause[];
  redFlags: RedFlag[];
  approvalStatus?: Approval[]; 
  vendorRisk?: number | null;
  databaseRisks?: DatabaseRisk[]; 
  recommendations: string[];
  documentType?: string;
  legalTerms?: LegalTerm[];
  jurisdictions?: Jurisdiction[];
  disputeResolution?: DisputeResolution;
  intellectualProperty?: IPClauses;
  enterpriseCompliance?: EnterpriseSpecificRequirementCheck;
  approvalId?: string;
  contractStatus?: string;
  decision?: string;
  timestamp?: string;
  contractData?: {
    id: string;
    title: string;
    status: string;
    approvalsSummary: ApprovalSummary;
  };
  nextSteps?: string[];
}

export interface OverallLegalRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
  mitigations: string[];
}

export interface LegalTerm {
  term: string;
  concern: 'low' | 'medium' | 'high';
  found: boolean;
}

export interface Jurisdiction {
  type: string;
  location: string;
  context: string;
}

export interface DisputeResolution {
  hasArbitration: boolean;
  hasMediation: boolean;
  hasLitigation: boolean;
  bindingArbitration: boolean;
  classActionWaiver: boolean;
  juryTrialWaiver: boolean;
  escalation: boolean;
  attorneysFees: boolean;
}

export interface IPClauses {
  hasIPProvisions: boolean;
  ownershipClear: boolean;
  workForHire: boolean;
  licenseGrant: boolean;
  retainRights: boolean;
  assignments: boolean;
}

export interface NDAAnalysisResult {
  isMutual: boolean;
  concerns: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
  hasResidualKnowledge: boolean;
  hasReturnProvision: boolean;
}

export interface EnterpriseSpecificRequirementCheck {
  requirements: {
    clause?: string;
    required?: boolean;
    found: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    term?: string;
    prohibited?: boolean;
  }[];
  compliant: boolean;
}

export interface ContractApprovalData {
  action: 'approve' | 'reject' | 'escalate';
  approvalType?: string;
  comments?: string;
  conditions?: string[];
}

export interface ContractApprovalResult {
  approvalId: string;
  contractStatus: string;
  decision: string;
  timestamp: string;
  contractData: {
    id: string;
    title: string;
    status: string;
    approvalsSummary: ApprovalSummary;
  };
  nextSteps: string[];
}

export interface ApprovalSummary {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  escalated: number;
  byType: Record<string, {
    status: string;
    approver: string;
    date: string;
  }>;
}

export interface ContractDetails {
  id?: string;
  title?: string;
  status?: string;
  value?: number;
  vendor_id?: string;
  [key: string]: any;
}

export interface Approval {
  id: string;
  contract_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  approval_type: string;
  created_at: string;
  updated_at: string;
  comments?: string;
  conditions?: string[];
}

export interface ContractData {
  contract: ContractDetails;
  approvals: Approval[];
}

export interface VendorDocument {
  id: string;
  name: string;
  type: string;
  content?: string;
  url?: string;
}

export interface EnterpriseConfig {
  required_clauses?: string[];
  prohibited_terms?: string[];
  approval_thresholds?: Record<string, number>;
}