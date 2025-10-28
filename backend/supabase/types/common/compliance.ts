// Compliance and audit type definitions
import { TimePeriod } from './analytics';

/**
 * Represents a value that can be compared in compliance conditions.
 * Supports primitives, arrays for 'in'/'notIn' operators, and null checks.
 */
export type ConditionValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | Date;

export interface ConditionConfig {
  type: 'and' | 'or' | 'not';
  conditions?: ConditionConfig[];
  field?: string;
  operator?: 'equals' | 'contains' | 'greater' | 'less' | 'in' | 'notIn';
  value?: ConditionValue;
}

export interface ComplianceCheck {
  id: string;
  type: ComplianceType;
  entityType: 'vendor' | 'contract' | 'process' | 'system';
  entityId: string;
  status: ComplianceStatus;
  results: ComplianceResult[];
  performedAt: string;
  performedBy: string;
  nextCheckDate?: string;
  metadata?: Record<string, unknown>;
}

export type ComplianceType = 
  | 'regulatory'
  | 'security'
  | 'financial'
  | 'operational'
  | 'contractual'
  | 'policy';

export type ComplianceStatus = 
  | 'compliant'
  | 'non_compliant'
  | 'partially_compliant'
  | 'pending_review'
  | 'expired';

export interface ComplianceResult {
  requirement: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  evidence?: Evidence[];
  findings?: string;
  recommendations?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Evidence {
  type: 'document' | 'screenshot' | 'log' | 'attestation';
  description: string;
  url?: string;
  collectedAt: string;
  collectedBy: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  acronym?: string;
  version: string;
  description?: string;
  requirements: ComplianceRequirement[];
  categories: ComplianceCategory[];
  applicability?: ApplicabilityRule[];
}

export interface ComplianceRequirement {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  controlType: 'preventive' | 'detective' | 'corrective';
  priority: 'low' | 'medium' | 'high' | 'critical';
  testProcedure?: string;
  frequency?: CheckFrequency;
  automation?: AutomationConfig;
}

export interface ComplianceCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface ApplicabilityRule {
  condition: ConditionConfig;
  requirements: string[]; // requirement ids
}

export interface CheckFrequency {
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'continuous';
  customDays?: number;
}

export interface AutomationConfig {
  enabled: boolean;
  script?: string;
  integration?: string;
  schedule?: string; // cron expression
}

export interface AuditTrail {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  timestamp: string;
  details: AuditDetails;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'execute';

export interface AuditDetails {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: FieldChange[];
  metadata?: Record<string, unknown>;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface RiskProfile {
  id: string;
  entityType: string;
  entityId: string;
  overallRisk: RiskLevel;
  categories: RiskCategory[];
  factors: RiskFactor[];
  mitigations: RiskMitigation[];
  lastAssessedAt: string;
  nextAssessmentDate?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskCategory {
  name: string;
  level: RiskLevel;
  score: number;
  weight: number;
  factors: string[]; // factor ids
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  category: string;
  impact: number; // 1-5
  likelihood: number; // 1-5
  score: number; // impact * likelihood
  evidence?: string[];
  controls?: string[];
}

export interface RiskMitigation {
  id: string;
  riskFactorId: string;
  title: string;
  description: string;
  type: 'prevent' | 'detect' | 'respond' | 'recover';
  status: 'proposed' | 'approved' | 'implemented' | 'verified';
  effectiveness: number; // 0-100%
  implementationDate?: string;
  owner?: string;
  cost?: number;
}

export interface ComplianceReport {
  id: string;
  type: 'summary' | 'detailed' | 'executive' | 'regulatory';
  period: TimePeriod;
  frameworks: string[];
  scope: ComplianceScope;
  summary: ComplianceSummary;
  findings: ComplianceFinding[];
  recommendations: string[];
  generatedAt: string;
  generatedBy: string;
}

export interface ComplianceScope {
  entities: ScopeEntity[];
  requirements?: string[];
  excludedItems?: string[];
}

export interface ScopeEntity {
  type: string;
  id: string;
  name: string;
}

export interface ComplianceSummary {
  totalRequirements: number;
  compliant: number;
  nonCompliant: number;
  partiallyCompliant: number;
  notApplicable: number;
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ComplianceFinding {
  requirementId: string;
  requirementName: string;
  status: ComplianceStatus;
  gap?: string;
  impact?: string;
  recommendation?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
}