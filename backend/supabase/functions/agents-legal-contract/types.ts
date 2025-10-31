/**
 * Type definitions for Legal Contract Agent
 */

// ==================== Request/Response Types ====================

export interface UserData {
  id: string;
  enterprise_id: string;
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
}

export interface AnalyzeContractRequest {
  contractId?: string;
  contractText?: string;
  contractType?: string;
}

export interface ExtractClausesRequest {
  contractId?: string;
  contractText?: string;
  clauseTypes?: string[];
}

export interface AssessRiskRequest {
  contractId?: string;
  contractText?: string;
  riskAreas?: string[];
}

export interface ComplianceCheckRequest {
  contractId?: string;
  contractText?: string;
  jurisdiction?: string;
  regulations?: string[];
}

export interface GenerateRecommendationsRequest {
  contractId: string;
  focusAreas?: string[];
}

export interface CompareContractsRequest {
  contractId1: string;
  contractId2: string;
  comparisonType?: 'full' | 'terms' | 'clauses' | 'pricing';
}

// ==================== Analysis Result Types ====================

export interface ClauseScore {
  completeness: number;
  risk_coverage: number;
  legal_compliance: number;
  clarity: number;
  commercial_protection: number;
}

export interface ExtractedClause {
  clause_type: string;
  content: string;
  location: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  recommendations?: string[];
  is_standard?: boolean;
  requires_attention?: boolean;
}

export interface ContractInsight {
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: 'risk' | 'compliance' | 'opportunity' | 'recommendation';
  actionable: boolean;
  recommendations?: string[];
}

export interface AnalysisResult {
  summary: string;
  scores: ClauseScore;
  clauses?: ExtractedClause[];
  insights?: ContractInsight[];
  risks?: RiskAssessment[];
  opportunities?: string[];
  recommendations?: string[];
  compliance_issues?: ComplianceIssue[];
}

export interface RiskAssessment {
  risk_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  likelihood: 'low' | 'medium' | 'high';
  mitigation: string[];
  affected_clauses?: string[];
}

export interface ComplianceIssue {
  regulation: string;
  issue: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  recommendation: string;
  affected_sections?: string[];
}

export interface NegotiationRecommendation {
  clause: string;
  current_terms: string;
  recommended_changes: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
  expected_benefit: string;
}

export interface ContractComparison {
  contract1_id: string;
  contract2_id: string;
  differences: ContractDifference[];
  summary: string;
  recommendations: string[];
}

export interface ContractDifference {
  category: string;
  field: string;
  contract1_value: string;
  contract2_value: string;
  significance: 'low' | 'medium' | 'high';
  analysis: string;
}

// ==================== Response Types ====================

export interface AnalysisResponse {
  success: boolean;
  task_id: string;
  analysis: {
    overall_score: number;
    grade: string;
    summary: string;
    scores: ClauseScore;
    clauses_count: number;
    insights_count: number;
    risks_count: number;
  };
  insights?: ContractInsight[];
  recommendations?: string[];
}

export interface ClausesResponse {
  success: boolean;
  clauses: ExtractedClause[];
  total_count: number;
  by_type: Record<string, number>;
  requires_attention: number;
}

export interface RiskAnalysis {
  overall_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_categories: {
    liability: { score: number; issues: string[] };
    termination: { score: number; issues: string[] };
    payment: { score: number; issues: string[] };
    intellectual_property: { score: number; issues: string[] };
    compliance: { score: number; issues: string[] };
  };
  critical_issues: string[];
  recommendations: string[];
}

export interface RiskAssessmentResponse {
  success: boolean;
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risks: RiskAssessment[];
  summary: string;
  mitigation_plan: string[];
}

export interface ComplianceReport {
  is_compliant: boolean;
  compliance_score: number;
  checks: {
    jurisdiction_compliance: { passed: boolean; issues: string[] };
    industry_compliance: { passed: boolean; issues: string[] };
    data_protection: { passed: boolean; issues: string[] };
    required_clauses: { passed: boolean; missing: string[] };
  };
  recommendations: string[];
}

export interface ComplianceCheckResponse {
  success: boolean;
  compliant: boolean;
  compliance_score: number;
  issues: ComplianceIssue[];
  summary: string;
  recommendations: string[];
}

export interface RecommendationsResponse {
  success: boolean;
  recommendations: NegotiationRecommendation[];
  summary: string;
  priority_items: number;
  estimated_value: string;
}

export interface ComparisonResponse {
  success: boolean;
  comparison: ContractComparison;
}

// ==================== Helper Types ====================

export interface Contract {
  id: string;
  title: string;
  file_content: string | null;
  contract_type: string | null;
  enterprise_id: string;
  vendor_id: string | null;
  overall_score: number | null;
  grade: string | null;
  completeness_score: number | null;
  risk_coverage_score: number | null;
  legal_compliance_score: number | null;
  clarity_score: number | null;
  commercial_protection_score: number | null;
  ai_analysis_completed: boolean;
  ai_analysis_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTask {
  id: string;
  agent_id: string | null;
  task_type: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  contract_id: string | null;
  vendor_id: string | null;
  enterprise_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ==================== Utility Types ====================

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface ScoreThresholds {
  'A+': number;
  'A': number;
  'A-': number;
  'B+': number;
  'B': number;
  'B-': number;
  'C+': number;
  'C': number;
  'C-': number;
  'D': number;
  'F': number;
}
