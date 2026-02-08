// src/types/agents.types.ts
import type { Id } from '@/types/id.types';

// ============================================================================
// CORE AGENT ENUMS AND CONSTANTS
// (Derived from your agent-schema.ts and discussion)
// ============================================================================

/** Agent system status options */
export const agentSystemStatusOptions = [
  "stopped", "starting", "running", "paused", "error"
] as const;
export type AgentSystemStatus = typeof agentSystemStatusOptions[number];

/** Individual agent status options */
export const agentStatusOptions = [
  "inactive", "active", "busy", "error", "disabled"
] as const;
export type AgentStatus = typeof agentStatusOptions[number];

/** Agent types/roles in the system - **MATCHES Supabase backend agents** */
export const agentTypeOptions = [
  // Core Orchestration Agents
  "manager",                  // System coordination and workflow orchestration
  "theory_of_mind_manager",   // Advanced manager with cognitive reasoning
  "workflow",                 // Multi-step workflow execution and automation

  // Document Processing Agents
  "secretary",                // Document extraction and metadata generation
  "continual_secretary",      // Self-improving document processing
  "metacognitive_secretary",  // Document processing with metacognitive capabilities

  // Legal & Compliance Agents
  "legal",                    // Contract analysis and legal risk assessment
  "compliance",               // Regulatory compliance and audit management
  "risk_assessment",          // Comprehensive risk evaluation and mitigation

  // Financial Agents
  "financial",                // Financial risk assessment and reporting
  "causal_financial",         // Advanced financial analysis with causal reasoning
  "quantum_financial",        // Quantum-inspired financial optimization

  // Vendor & Analytics Agents
  "vendor",                   // Vendor lifecycle and performance tracking
  "analytics",                // Data analysis and trend identification

  // System Support Agents
  "notifications",            // Communication and alert management
  "data-quality",             // Data validation and quality assurance
  "integration",              // External system integration and data sync
] as const;
export type AgentType = typeof agentTypeOptions[number];

/** Insight/analysis types - **Ensure this matches agent-schema.ts** */
export const insightTypeOptions = [
  "contract_analysis",    // Contract content analysis
  "financial_risk",       // Financial risk assessment
  "expiration_warning",   // Contract expiration alerts
  "legal_review",         // Legal compliance issues
  "compliance_alert",     // Regulatory compliance warnings
  "performance_metric",   // Performance and KPI insights
  "cost_optimization",    // Cost-saving opportunities
  "vendor_risk",          // Vendor risk assessment
  "renewal_opportunity",  // Contract renewal suggestions
  "negotiation_insight",  // Contract negotiation recommendations
  "audit_finding",        // Audit-related discoveries
  "anomaly_detection",    // Unusual patterns or outliers
  "trend_analysis",       // Historical trend insights
  "recommendation",       // General recommendations
  "alert",                // General system alerts
  "report",               // Automated reports
] as const;
export type InsightType = typeof insightTypeOptions[number];

/** Task status for agent task queue - **Ensure this matches agent-schema.ts** */
export const taskStatusOptions = [
  "pending", "in_progress", "completed", "failed", "cancelled", "timeout"
] as const;
export type TaskStatus = typeof taskStatusOptions[number];

/** Task priority levels - **Ensure this matches agent-schema.ts** */
export const taskPriorityOptions = [
  "low", "medium", "high", "critical"
] as const;
export type TaskPriority = typeof taskPriorityOptions[number];

/** Log levels - **Ensure this matches agent-schema.ts** */
export const logLevelOptions = [
  "debug", "info", "warn", "error", "critical"
] as const;
export type LogLevel = typeof logLevelOptions[number];

/** Agent complexity levels for UI differentiation */
export const agentComplexityLevelOptions = [
  "standard",   // Basic agents for everyday use
  "advanced",   // Agents with advanced capabilities requiring more expertise
  "expert"      // Highly specialized agents for complex scenarios
] as const;
export type AgentComplexityLevel = typeof agentComplexityLevelOptions[number];

/** Agent category for dashboard grouping */
export const agentCategoryOptions = [
  "core",           // Essential system agents
  "orchestration",  // Workflow and coordination agents
  "document",       // Document processing agents
  "legal",          // Legal and compliance agents
  "financial",      // Financial analysis agents
  "management",     // Vendor and contract management
  "analytics",      // Data analysis and insights
  "system",         // System support agents
  "advanced"        // Advanced and experimental agents
] as const;
export type AgentCategory = typeof agentCategoryOptions[number];

// ============================================================================
// CORE AGENT SYSTEM TYPES
// ============================================================================

/** Configuration settings for the agent system. */
export interface AgentSystemConfig {
  maxConcurrentTasks: number;
  taskTimeoutMinutes: number;
  logRetentionDays: number;
  insightRetentionDays?: number;
  healthCheckIntervalMinutes?: number;
  autoRestartOnFailure?: boolean;
  maxRetryAttempts?: number;
  enabledFeatures?: string[];
  notifications?: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    webhookEnabled: boolean;
  };
}

/** Metrics related to the overall agent system performance. */
export interface AgentSystemMetrics {
  totalTasksProcessed: number;
  totalInsightsGenerated: number;
  systemUptime: number; // Duration in seconds
  averageTaskDuration?: number; // Duration in milliseconds
  errorRate?: number; // Percentage (0-1)
  lastHealthCheck?: string; // ISO 8601 date-time string
  performanceScore?: number; // Abstract score, e.g., 0-100
}

/** Represents the overall state and configuration of the agent system. */
export interface AgentSystem {
  _id: Id<"agentSystem">;
  isRunning: boolean;
  status: AgentSystemStatus;
  lastStarted?: string; // ISO 8601 date-time string
  lastStopped?: string; // ISO 8601 date-time string
  errorMessage?: string;
  config?: AgentSystemConfig; // Reflects the more detailed structure
  metrics?: AgentSystemMetrics; // Reflects the more detailed structure
}


// ============================================================================
// INDIVIDUAL AGENT TYPES
// ============================================================================

/** Base agent configuration, intended to be extended by specific agent types. */
export interface AgentConfig {
  runIntervalMinutes?: number;
  retryAttempts?: number;
  timeoutMinutes?: number;
  enabled?: boolean;
  priority?: TaskPriority;
  dependencies?: Id<"agents">[];
  triggers?: AgentTrigger[];
  /** Allows for agent-specific configuration fields not explicitly defined. */
  customSettings?: Record<string, unknown>;
}

/** Base agent metrics, intended to be extended by specific agent types. */
export interface AgentMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageRunTime: number; // Duration in milliseconds
  lastRunDuration?: number; // Duration in milliseconds
  dataProcessed?: number; // e.g., number of items, bytes
  insightsGenerated?: number;
  /** Allows for agent-specific metric fields not explicitly defined. */
  customMetrics?: Record<string, unknown>;
}

/** Represents an individual agent within the system. */
export interface Agent {
  _id: Id<"agents">;
  name: string;
  type: AgentType;
  status: AgentStatus;
  description?: string;
  isEnabled: boolean;
  lastRun?: string; // ISO 8601 date-time string
  lastSuccess?: string; // ISO 8601 date-time string
  runCount: number;
  errorCount: number;
  lastError?: string;
  config?: AgentConfig; // Reflects the more detailed base structure
  metrics?: AgentMetrics; // Reflects the more detailed base structure
  createdAt: string; // ISO 8601 date-time string, as per your schema
  updatedAt?: string; // ISO 8601 date-time string, as per your schema
}

/** Defines conditions that can trigger an agent's operation. */
export interface AgentTrigger {
  type: "schedule" | "event" | "condition" | "manual";
  schedule?: string; // Cron expression for 'schedule' type
  event?: string;    // Event name for 'event' type
  condition?: string; // Condition expression for 'condition' type
  enabled: boolean;
}


// ============================================================================
// SPECIFIC AGENT TYPE CONFIGURATIONS (Extending AgentConfig)
// ============================================================================

/** Configuration specific to Manager Agents. */
export interface ManagerAgentConfig extends AgentConfig {
  healthCheckIntervalMinutes: number;
  taskCleanupHours: number;
  logCleanupDays: number;
  agentRestartThreshold: number;
  systemMetricsCollectionInterval: number;
}

/** Configuration specific to Financial Agents. */
export interface FinancialAgentConfig extends AgentConfig {
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  currencyConversion: boolean;
  costAnalysisDepth: "basic" | "detailed" | "comprehensive";
  reportingFrequency: "daily" | "weekly" | "monthly";
}

/** Configuration specific to Legal Agents. */
export interface LegalAgentConfig extends AgentConfig {
  jurisdictions: string[];
  complianceFrameworks: string[];
  riskAssessmentCriteria: string[];
  autoReviewEnabled: boolean;
  flaggedTerms: string[];
}

/** Configuration specific to Notification Agents. */
export interface NotificationAgentConfig extends AgentConfig {
  channels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    inApp: boolean;
  };
  urgencyLevels: {
    [key in TaskPriority]: {
      delay: number;
      retries: number;
      escalation: boolean;
    };
  };
}

/** Configuration specific to Analytics Agents. */
export interface AnalyticsAgentConfig extends AgentConfig {
  reportTypes: string[]; // e.g., ["monthly_summary", "performance_dashboard"]
  dataRetentionDays: number;
  aggregationLevels: string[]; // e.g., ["daily", "weekly", "monthly"]
  realTimeAnalysis: boolean;
  machineLearningEnabled: boolean;
}

// ============================================================================
// PROCUREMENT-SPECIFIC AGENT CONFIGURATIONS
// ============================================================================

/** Configuration specific to Sourcing Agents. */
export interface SourcingAgentConfig extends AgentConfig {
  marketplaces: string[]; // e.g., ["Alibaba", "ThomasNet", "IndiaMART"]
  webScrapingEnabled: boolean;
  aiMatchingEnabled: boolean;
  matchScoreThreshold: number; // Minimum score (0-1) for supplier matches
  maxSuppliersPerRequest: number;
  riskAssessmentEnabled: boolean;
  autoRFQEnabled: boolean;
}

/** Configuration specific to RFQ/RFP Agents. */
export interface RFQRFPAgentConfig extends AgentConfig {
  autoVendorIdentification: boolean;
  minVendorsForRFP: number;
  maxVendorsForRFP: number;
  qaPeriodDays: number;
  bidEvaluationCriteria: string[];
  nlpProposalAnalysis: boolean;
  autoScoring: boolean;
}

/** Configuration specific to Savings Tracker Agents. */
export interface SavingsTrackerAgentConfig extends AgentConfig {
  trackingCategories: string[];
  baselineMethod: "historical" | "market" | "budget";
  roiCalculationMethod: "simple" | "detailed" | "comprehensive";
  reportingPeriods: string[]; // e.g., ["monthly", "quarterly", "yearly"]
  excelImportEnabled: boolean;
  autoPerformanceTracking: boolean;
}

/** Configuration specific to Procurement Intelligence Agents. */
export interface ProcurementIntelligenceAgentConfig extends AgentConfig {
  marketAnalysisEnabled: boolean;
  predictiveAnalytics: boolean;
  strategicRecommendations: boolean;
  industryBenchmarking: boolean;
  dataSources: string[];
  aiInsightsEnabled: boolean;
}

/** Configuration specific to Contract Management Agents. */
export interface ContractManagementAgentConfig extends AgentConfig {
  lifecycleTracking: boolean;
  renewalReminderDays: number[]; // e.g., [90, 60, 30, 7]
  obligationMonitoring: boolean;
  amendmentTracking: boolean;
  autoRenewalSuggestions: boolean;
  expirationAlerts: boolean;
}

/** Configuration specific to Spend Analytics Agents. */
export interface SpendAnalyticsAgentConfig extends AgentConfig {
  categoryClassification: "manual" | "ai" | "hybrid";
  trendAnalysisDepth: "basic" | "detailed" | "advanced";
  maverickSpendDetection: boolean;
  savingsIdentification: boolean;
  predictiveModeling: boolean;
  dashboardTypes: string[];
}

// ============================================================================
// AGENT INSIGHTS AND ANALYSIS
// ============================================================================

/** Represents an insight or piece of analysis generated by an agent. */
export interface AgentInsight {
  _id: Id<"agentInsights">;
  agentId: Id<"agents">;
  type: InsightType;
  title: string;
  description: string;
  priority: TaskPriority;
  contractId?: Id<"contracts">; // Assuming 'contracts' table exists
  vendorId?: Id<"vendors">;   // Assuming 'vendors' table exists
  data?: InsightData;
  actionRequired: boolean;
  actionTaken: boolean;
  actionDetails?: string;
  isRead: boolean;
  expiresAt?: string; // ISO 8601 date-time string
  createdAt: string;  // ISO 8601 date-time string, as per your schema
  readAt?: string;    // ISO 8601 date-time string
  tags?: string[];    // Added field
  confidence?: number; // Added field (0-1 score)
}

/** Structured data payload for an AgentInsight, varying by insight type. */
export interface InsightData {
  contractRisk?: {
    score: number;
    factors: string[];
    recommendations: string[];
  };
  financialImpact?: {
    amount: number;
    currency: string;
    type: "cost" | "saving" | "risk";
    timeframe: string;
  };
  complianceIssues?: {
    framework: string;
    violations: string[];
    severity: "low" | "medium" | "high" | "critical";
    remediation: string[];
  };
  performanceData?: {
    metric: string;
    current: number;
    target: number;
    trend: "improving" | "declining" | "stable";
  };
  trendData?: {
    period: string;
    dataPoints: Array<{ date: string; value: number; }>;
    pattern: string;
    forecast?: number;
  };
  /** Allows for other types of structured insight data. */
  additionalData?: Record<string, unknown>;
}

// ============================================================================
// AGENT TASK MANAGEMENT
// ============================================================================

/** Represents a task to be performed by an agent. */
export interface AgentTask {
  _id: Id<"agentTasks">;
  assignedAgentId: Id<"agents">;
  createdByAgentId?: Id<"agents">;
  taskType: string; // Consider a union type if a finite set of task types exists
  status: TaskStatus;
  priority: TaskPriority;
  title: string;
  description?: string;
  contractId?: Id<"contracts">;
  vendorId?: Id<"vendors">;
  data?: TaskData;
  result?: TaskResult;
  errorMessage?: string;
  scheduledFor?: string; // ISO 8601 date-time string
  startedAt?: string;    // ISO 8601 date-time string
  completedAt?: string;  // ISO 8601 date-time string
  createdAt: string;     // ISO 8601 date-time string, as per your schema
  dependencies?: Id<"agentTasks">[]; // Added field
  retryCount?: number;              // Added field
  maxRetries?: number;              // Added field
}

/** Data payload for an AgentTask. */
export interface TaskData {
  input?: unknown;
  parameters?: Record<string, unknown>;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Result payload from an AgentTask execution. */
export interface TaskResult {
  success: boolean;
  output?: unknown;
  metrics?: Record<string, number>;
  artifacts?: string[]; // URLs or IDs of generated files
  nextActions?: string[];
  warnings?: string[];
}

// ============================================================================
// AGENT LOGGING
// ============================================================================

/** Represents a log entry generated by an agent or the agent system. */
export interface AgentLog {
  _id: Id<"agentLogs">;
  agentId: Id<"agents">; // Or a system identifier if not from a specific agent
  level: LogLevel;
  message: string;
  data?: LogData;
  taskId?: Id<"agentTasks">;
  timestamp: string; // ISO 8601 date-time string of when the event occurred
  category?: string; // Added field (e.g., "task_execution", "system_health")
  source?: string;   // Added field (e.g., "FinancialAgent", "APIService")
  userId?: string;   // Added field (ID of user whose action might have initiated this)
}

/** Structured data for an AgentLog. */
export interface LogData {
  error?: Error | string;
  duration?: number; // Duration of an operation in milliseconds
  context?: Record<string, unknown>;
  stackTrace?: string;
  requestId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT COMMUNICATION AND EVENTS
// ============================================================================

/** Represents an event within the agent system. */
export interface AgentEvent {
  type: string; // Consider a union type for known event types
  source: Id<"agents"> | "system";
  target?: Id<"agents"> | "system";
  data?: unknown;
  timestamp: string; // ISO 8601 date-time string
  priority: TaskPriority;
}

/** Represents a message passed between agents or system components. */
export interface AgentMessage {
  from: Id<"agents"> | "system";
  to: Id<"agents"> | "system";
  type: "request" | "response" | "notification" | "alert";
  payload: unknown;
  correlationId?: string;
  timestamp: string; // ISO 8601 date-time string
}

// ============================================================================
// ============================================================================

/** Defines a workflow consisting of multiple steps executed by agents. */
export interface AgentWorkflow {
  id: string; // User-defined unique identifier
  name: string;
  description?: string;
  steps: WorkflowStep[];
  triggers: AgentTrigger[];
  enabled: boolean;
  version: number;
  createdAt: string; // ISO 8601 date-time string, application-managed
  updatedAt?: string; // ISO 8601 date-time string, application-managed
}

/** A single step within an AgentWorkflow. */
export interface WorkflowStep {
  id: string; // Unique identifier for the step within the workflow
  agentId: Id<"agents">;
  action: string; // Specific action for the agent
  inputs?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  onSuccess?: string; // Next step ID
  onFailure?: string; // Next step ID
  timeout?: number;   // In seconds
  retries?: number;
}

/** A condition that can be evaluated within a workflow. */
export interface WorkflowCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: string | number | boolean | string[];
}

// ============================================================================
// AGENT PERFORMANCE AND MONITORING
// ============================================================================

/** Report detailing the performance of a specific agent over a period. */
export interface AgentPerformanceReport {
  agentId: Id<"agents">;
  period: {
    start: string; // ISO 8601 date-time string
    end: string;   // ISO 8601 date-time string
  };
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageCompletionTime: number; // In milliseconds
    successRate: number; // 0-1
    errorRate: number;   // 0-1
    throughput: number;  // Tasks per hour
  };
  insights: {
    performance: "excellent" | "good" | "fair" | "poor";
    recommendations: string[];
    trends: string[];
  };
  generatedAt: string; // ISO 8601 date-time string
}

/** Overall health status of the agent system and its components. */
export interface SystemHealthStatus {
  overall: "healthy" | "warning" | "critical";
  agents: Array<{
    id: Id<"agents">;
    name: string;
    status: AgentStatus;
    health: "healthy" | "warning" | "critical";
    lastCheck: string; // ISO 8601 date-time string
  }>;
  resources: {
    cpuUsage: number;     // Percentage
    memoryUsage: number;  // Percentage
    storageAvailable: number; // Percentage or GB
    networkThroughput: number; // Mbps or similar
  };
  alerts: Array<{
    level: "info" | "warning" | "error" | "critical"; // Use LogLevel?
    message: string;
    timestamp: string; // ISO 8601 date-time string
    source?: string;
  }>;
}

// ============================================================================
// UTILITY TYPES AND INTERFACES (For UI or enriched data)
// ============================================================================

/** Enriched AgentInsight with denormalized agent and related entity information. */
export interface EnrichedAgentInsight extends AgentInsight {
  agentName: string;
  agentType?: AgentType; // Can be undefined if agent is not found
  relatedContractTitle?: string;
  relatedVendorName?: string;
}

/** Enriched AgentLog with denormalized agent and task information. */
export interface EnrichedAgentLog extends AgentLog {
  agentName: string;
  agentType?: AgentType; // Can be undefined if agent is not found
  taskTitle?: string;
}

/** Enriched AgentTask with denormalized agent and related entity information. */
export interface EnrichedAgentTask extends AgentTask {
  agentName: string;
  agentType?: AgentType; // Can be undefined if agent is not found
  creatorName?: string;
  relatedContractTitle?: string;
  relatedVendorName?: string;
}

// Form data types for creating/updating agents
export interface CreateAgentData {
  name: string;
  type: AgentType;
  description?: string;
  config?: AgentConfig;
  isEnabled?: boolean;
  // createdAt will be set by backend logic
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  config?: Partial<AgentConfig>; // Allow partial updates
  isEnabled?: boolean;
  type?: AgentType; // Usually not changed, but possible
  status?: AgentStatus;
  // updatedAt will be set by backend logic
}

// API response types
export interface AgentSystemStatusResponse {
  system: AgentSystem | null;
  agents: Agent[];
  stats: {
    totalAgents: number;
    activeAgents: number;
    recentInsights: number;
    pendingTasks: number;
    activeTasks: number;
  };
}

export interface AgentOperationResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

// ============================================================================
// SWARM ORCHESTRATION TYPES
// ============================================================================

/**
 * Swarm orchestration configuration
 * Matches backend SwarmConfig interface from config/swarm-defaults.ts
 */
export interface SwarmConfig {
  agentSelectionEnabled: boolean;
  workflowOptimizationEnabled: boolean;
  consensusEnabled: boolean;
  patternLearningEnabled: boolean;
  algorithm: 'pso' | 'aco';
  optimizationTimeout: number;
  consensusThreshold: number;
}

/**
 * Partial swarm configuration for API method parameters
 * Used when passing custom swarm overrides to agent API calls
 */
export type PartialSwarmConfig = Partial<SwarmConfig>;

/**
 * Extended agent context with swarm metadata
 * Used to pass swarmMode configuration through API calls
 */
export interface AgentContextWithSwarm {
  page?: string;
  contractId?: string;
  vendorId?: string;
  userId: string;
  enterpriseId: string;
  currentAction?: string;
  metadata?: {
    swarmMode?: boolean;
    swarmConfig?: Partial<SwarmConfig>;
    [key: string]: unknown;
  };
}

// ============================================================================
// CONSTANTS AND MAPPINGS
// ============================================================================

/**
 * ⚠️ DEPRECATION NOTICE
 *
 * Large constant mappings have been moved for better bundle optimization:
 *
 * **For new code, use dynamic imports (recommended):**
 * ```ts
 * import { getAgentTypeLabel, getPriorityColor } from '@/lib/agent-constants';
 * const label = await getAgentTypeLabel('manager');
 * ```
 *
 * **For backward compatibility (temporary):**
 * ```ts
 * import { AGENT_TYPE_LABELS, PRIORITY_COLORS } from '@/lib/agent-constants-sync';
 * ```
 *
 * The synchronous exports will be removed in a future version.
 */

// Re-export constants for backward compatibility
export {
  AGENT_TYPE_LABELS,
  INSIGHT_TYPE_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  LOG_LEVEL_COLORS,
  TASK_STATUS_COLORS,
} from '@/lib/agent-constants-sync';