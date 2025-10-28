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

export interface DatabaseInsight {
  source: string;
  confidence: number;
  relatedContracts?: string[];
  historicalData?: {
    occurrences: number;
    avgRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    commonIssues: string[];
  };
  benchmarkData?: {
    industryStandard: boolean;
    commonPhrasing: string;
    preferredAlternative?: string;
  };
  metadata?: Record<string, string | number | boolean>;
}

export interface Clause {
  type: string;
  text: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
  databaseInsight?: DatabaseInsight;
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
  description?: string;
  resolution?: string;
  document?: string;
  regulation?: string;
  compliant?: boolean;
  issue?: string | null;
  remediation?: string;
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

export interface VendorComplianceAnalysisResult {
  vendorName: string;
  complianceScore: number;
  lastCheckDate?: string;
  regulations: RegulationCheck[];
  documentCompliance: DocumentCompliance;
  violations: ComplianceViolation[];
  missingDocuments: string[];
  certifications: VendorCertifications;
  recommendations: string[];
}

export interface DocumentCompliance {
  complete: boolean;
  missingTypes: string[];
  expiredDocuments: {
    type: string;
    expiredOn: string;
  }[];
  score: number;
}

export interface VendorCertifications {
  total: number;
  valid: { expiration_date?: string }[];
  expired: { expiration_date?: string }[];
  expiringSoon: { expiration_date?: string }[];
}

export interface ComplianceCheckResult {
  check_type: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  issues: number;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  checkedAt?: string;
  checkedBy?: string;
  relatedDocuments?: string[];
  recommendations?: string[];
}

export interface EnterpriseRiskAssessmentResult {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors: string[];
  mitigations: string[];
  assessedAt?: string;
  assessedBy?: string;
  validUntil?: string;
  categories?: {
    legal?: number;
    financial?: number;
    operational?: number;
    compliance?: number;
    reputational?: number;
  };
}

export interface EnterpriseComplianceAnalysisResult {
  checksPerformed: number;
  issuesFound: number;
  summary: ComplianceCheckResult[];
  riskAssessment: EnterpriseRiskAssessmentResult;
  regulations: RegulationCheck[];
  dataPrivacy: {
    compliant: boolean;
    issues: DataPrivacyCheck[];
    score: number;
  };
  industryStandards: IndustryStandardCheck[];
  violations: ComplianceViolation[];
  recommendations: string[];
}

export interface EnterpriseConfig {
  legal?: {
    requiredClauses?: { name: string; pattern: string; severity: string }[];
    prohibitedTerms?: { name: string; pattern: string }[];
    preferredJurisdiction?: string;
  };
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  contract_id?: string;
  vendor_id?: string;
  amount: number;
  allocated_date: string;
  fiscal_year: number;
  quarter?: number;
  month?: number;
  category?: string;
  department?: string;
  description?: string;
  status?: 'planned' | 'allocated' | 'spent' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by?: string;
  approved_by?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ExtractedKeyTerm {
  value: string;
  confidence: number;
  location?: {
    page?: number;
    section?: string;
    context?: string;
  };
  type?: 'date' | 'amount' | 'party' | 'term' | 'other';
  normalized?: string;
}

export interface ContractData {
  id: string;
  title: string;
  status: string;
  extracted_text?: string;
  document_id?: string;
  vendor_id?: string;
  vendor?: {
    performance_score: number;
  };
  approvals?: Approval[];
  documents?: VendorDocument[];
  allocations?: BudgetAllocation[];
  extracted_key_terms?: Record<string, ExtractedKeyTerm>;
}

export interface Approval {
  approval_type: string;
  status: string;
  approver_name: string;
  updated_at: string;
}

export interface VendorDocument {
  document_type: string;
  expiration_date?: string;
}

export interface DatabaseRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  // Add other properties as they are used in the code
}

export interface ComplianceCheckResult {
  check_type: string;
  issues: number;
  // Add other properties as they are used in the code
}

export interface EnterpriseRiskAssessmentResult {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  // Add other properties as they are used in the code
}