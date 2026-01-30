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

export interface CrossReference {
  reference: string;
  section: string;
  context: string;
}

export interface AmendmentInfo {
  type: string;
  text: string;
  context: string;
}

export interface AmendmentAnalysis {
  hasAmendments: boolean;
  amendmentCount: number;
  amendments: AmendmentInfo[];
  supersessionLanguage: boolean;
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
  // New fields for enhanced analysis
  crossReferences?: CrossReference[];
  amendments?: AmendmentAnalysis;
  analysisMetadata?: {
    isNonEnglish: boolean;
    contentLength: number;
    clauseCount: number;
    obligationCount: number;
    contextWindowUsed: number;
  };
  // Graceful degradation fields
  degraded?: boolean;
  degradationReason?: 'validation' | 'database' | 'timeout' | 'external' | 'rate_limiting' | 'malformed_data' | 'unknown';
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
  enterprise_id?: string;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  auto_renewal?: boolean;
  contract_type?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  department?: string;
  description?: string;
  payment_terms?: string;
  currency?: string;
  metadata?: Record<string, string | number | boolean>;
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
  approver_name?: string;
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
  id?: string;
  title?: string;
  status?: string;
  value?: number;
  vendor_id?: string;
  vendor?: {
    performance_score?: number;
    name?: string;
    id?: string;
  };
  approvals: Approval[];
  documents?: VendorDocument[];
  allocations?: BudgetAllocation[];
  extracted_text?: string;
  document_id?: string;
  extracted_key_terms?: Record<string, ExtractedKeyTerm>;
  enterprise_id?: string;
  start_date?: string;
  end_date?: string;
  renewal_date?: string;
  auto_renewal?: boolean;
  contract_type?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  department?: string;
  description?: string;
  payment_terms?: string;
  currency?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  compliance_status?: 'compliant' | 'non-compliant' | 'partial' | 'pending';
  tags?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface VendorDocument {
  id: string;
  name?: string;
  type?: string;
  document_type?: string;
  content?: string;
  url?: string;
  expiration_date?: string;
  status?: string;
}

export interface EnterpriseConfig {
  required_clauses?: string[];
  prohibited_terms?: string[];
  approval_thresholds?: Record<string, number>;
  legal?: {
    requiredClauses?: Array<{
      name: string;
      pattern: string;
      severity?: string;
    }>;
    prohibitedTerms?: Array<{
      name: string;
      pattern: string;
    }>;
    preferredJurisdiction?: string;
  };
}

export interface ComplianceIssue {
  id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedArea: string;
  detectedDate: string;
  status: 'open' | 'in-progress' | 'resolved' | 'acknowledged';
  resolution?: string;
  resolvedDate?: string;
  assignedTo?: string;
  dueDate?: string;
  relatedDocuments?: string[];
  regulatoryReference?: string;
  remediationSteps?: string[];
  impact?: string;
  likelihood?: 'low' | 'medium' | 'high';
  metadata?: Record<string, string | number | boolean>;
}

export interface VendorComplianceAnalysisResult {
  vendorId?: string;
  vendorName: string;
  complianceStatus?: 'compliant' | 'non-compliant' | 'partial';
  complianceScore?: number;
  lastCheckDate?: string;
  regulations?: RegulationCheck[];
  documentCompliance?: DocumentCompliance | DocumentCompliance[];
  violations?: ComplianceViolation[];
  missingDocuments?: string[];
  certifications: VendorCertifications;
  documents?: DocumentCompliance[];
  overallScore?: number;
  risks?: ComplianceViolation[];
  recommendations: string[];
  compliant?: boolean;
  issues?: ComplianceIssue[];
}

export interface DocumentCompliance {
  documentId?: string;
  documentType?: string;
  status?: 'valid' | 'expired' | 'missing';
  expiryDate?: string;
  issues?: string[];
  complete?: boolean;
  missingTypes?: string[];
  expiredDocuments?: Array<{
    type: string;
    expiredOn?: string;
  }>;
  score?: number;
}

export interface VendorCertifications {
  iso9001?: boolean;
  iso27001?: boolean;
  soc2?: boolean;
  gdpr?: boolean;
  hipaa?: boolean;
  other?: string[];
  total?: number;
  valid?: Array<{ expiration_date?: string }>;
  expired?: Array<{ expiration_date?: string }>;
  expiringSoon?: Array<{ expiration_date?: string }>;
}

export interface ComplianceSummaryItem {
  area: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'pending';
  score: number;
  checksPerformed: number;
  issuesFound: number;
  criticalIssues: number;
  lastReviewed: string;
  nextReview?: string;
  trend?: 'improving' | 'declining' | 'stable';
  details?: string;
  affectedEntities?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: number;
    likelihood: number;
    description: string;
    mitigation?: string;
  }>;
  riskCategories: {
    legal: number;
    financial: number;
    operational: number;
    reputational: number;
    compliance: number;
    strategic: number;
  };
  mitigationStrategies: Array<{
    strategy: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeline: string;
    owner?: string;
    status?: 'planned' | 'in-progress' | 'completed';
    effectiveness?: number;
  }>;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  lastAssessmentDate: string;
  nextAssessmentDate?: string;
  assessor?: string;
  notes?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface EnterpriseComplianceAnalysisResult {
  enterpriseId?: string;
  complianceScore?: number;
  areasReviewed?: string[];
  violations?: ComplianceViolation[];
  recommendations: string[];
  nextReviewDate?: string;
  checksPerformed?: number;
  issuesFound?: number;
  summary?: ComplianceSummaryItem[];
  riskAssessment?: RiskAssessment;
  regulations?: RegulationCheck[];
  dataPrivacy?: {
    compliant: boolean;
    issues: DataPrivacyCheck[];
    score: number;
  };
  industryStandards?: IndustryStandardCheck[];
}