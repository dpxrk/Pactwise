import type { TraceContext } from './tracing';
import type { MemorySearchResult } from './memory';
import type {
  CausalQuestion,
  CausalAnalysisResult,
  InterventionGoal,
  InterventionRecommendation,
  CounterfactualScenario,
  CounterfactualResult,
} from './causal';

/**
 * Base agent context with all common properties
 * This interface defines the complete set of properties that can be used across all agents
 */
export interface AgentContext {
  // Required core properties
  enterpriseId: string;
  sessionId: string;
  environment: Record<string, unknown>;
  permissions: string[];

  // Optional common properties
  taskId?: string;
  userId?: string;
  contractId?: string;
  vendorId?: string;
  budgetId?: string;
  documentId?: string;
  priority?: number;
  metadata?: Record<string, unknown>;

  // Tracing and observability
  traceContext?: TraceContext;
  taskType?: string;

  // Memory system
  memory?: MemorySearchResult[];

  // Agent collaboration
  otherAgents?: string[];

  // Causal reasoning capabilities
  requestCausalAnalysis?: (question: CausalQuestion) => Promise<CausalAnalysisResult>;
  recommendInterventions?: (goal: InterventionGoal) => Promise<InterventionRecommendation[]>;
  generateCounterfactuals?: (scenario: CounterfactualScenario) => Promise<CounterfactualResult[]>;
  systemState?: Record<string, unknown>;

  // Metacognitive properties
  timeConstraint?: number;
}

/**
 * Secretary agent context for document processing tasks
 */
export interface SecretaryAgentContext extends AgentContext {
  dataType: 'contract' | 'vendor' | 'document';
  documentId?: string;
}

/**
 * Financial agent context for financial analysis tasks
 */
export interface FinancialAgentContext extends AgentContext {
  analysisType: 'contract' | 'budget';
  contractId?: string;
  vendorId?: string;
  budgetId?: string;
}

/**
 * Legal agent context for legal compliance tasks
 */
export interface LegalAgentContext extends AgentContext {
  documentType?: 'contract';
  checkType?: 'compliance';
  contractId?: string;
  vendorId?: string;
}

/**
 * Notifications agent context for alert management
 */
export interface NotificationsAgentContext extends AgentContext {
  notificationType: 'alert' | 'reminder' | 'digest';
  userId: string; // Required for notifications
}

/**
 * Manager agent context for workflow orchestration
 */
export interface ManagerAgentContext extends AgentContext {
  workflowId?: string;
  stepId?: string;
  orchestrationMode?: 'sequential' | 'parallel' | 'adaptive';
}

/**
 * Analytics agent context for data analysis tasks
 */
export interface AnalyticsAgentContext extends AgentContext {
  reportType?: 'contract' | 'vendor' | 'financial' | 'compliance';
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Vendor agent context for vendor management tasks
 */
export interface VendorAgentContext extends AgentContext {
  vendorId: string; // Required for vendor operations
  assessmentType?: 'performance' | 'compliance' | 'risk';
}
