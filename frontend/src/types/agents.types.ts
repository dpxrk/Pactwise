// src/types/agents.types.ts
import { Id } from "./id.types";

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

/** Agent types/roles in the system - **Ensure this matches agent-schema.ts** */
export const agentTypeOptions = [
  "manager",        // System coordination and management
  "secretary",      // Administrative tasks and notifications
  "financial",      // Financial analysis and reporting
  "notifications",  // Communication and alerts
  "legal",          // Legal compliance and risk assessment
  "analytics",      // Data analysis and insights
  "workflow",       // Process automation and orchestration
  "compliance",     // Regulatory compliance monitoring
  "risk",           // Risk assessment and management
  "audit",          // Audit trail and reporting
  "integration",    // Third-party system integrations
  "scheduler",      // Task scheduling and timing
  "backup",         // Data backup and recovery
  "monitor",        // System health and performance monitoring
  "vendor",         // Vendor management and analysis
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
  _creationTime: number; // Convex automatic field (Unix timestamp ms)
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
  // _creationTime: number; // Convex automatic field. Use 'createdAt' string as primary if that's the app logic.
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
// AGENT INSIGHTS AND ANALYSIS
// ============================================================================

/** Represents an insight or piece of analysis generated by an agent. */
export interface AgentInsight {
  _id: Id<"agentInsights">;
  // _creationTime: number; // Convex automatic. Use 'createdAt' string as primary if that's app logic.
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
  // _creationTime: number; // Convex automatic. Use 'createdAt' string as primary if that's app logic.
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
  // _creationTime: number; // Convex automatic. 'timestamp' string is the primary event time.
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
// AGENT WORKFLOW AND ORCHESTRATION (Managed outside Convex tables per discussion)
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
// CONSTANTS AND MAPPINGS (Ensure these use the updated ...Options arrays)
// ============================================================================

/** Human-readable labels for AgentType enum values. */
export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  manager: "System Manager",
  secretary: "Administrative Assistant",
  financial: "Financial Analyst",
  notifications: "Notification Manager",
  legal: "Legal Compliance",
  analytics: "Data Analytics",
  workflow: "Workflow Orchestrator",
  compliance: "Compliance Monitor",
  risk: "Risk Assessor",
  audit: "Audit Manager",
  integration: "Integration Handler",
  scheduler: "Task Scheduler",
  backup: "Backup Manager",
  monitor: "System Monitor",
  vendor: "Vendor Manager",
};

/** Human-readable labels for InsightType enum values. */
export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  contract_analysis: "Contract Analysis",
  financial_risk: "Financial Risk",
  expiration_warning: "Expiration Warning",
  legal_review: "Legal Review",
  compliance_alert: "Compliance Alert",
  performance_metric: "Performance Metric",
  cost_optimization: "Cost Optimization",
  vendor_risk: "Vendor Risk",
  renewal_opportunity: "Renewal Opportunity",
  negotiation_insight: "Negotiation Insight",
  audit_finding: "Audit Finding",
  anomaly_detection: "Anomaly Detection",
  trend_analysis: "Trend Analysis",
  recommendation: "Recommendation",
  alert: "Alert",
  report: "Report",
};

/** Color mappings for TaskPriority (e.g., for Tailwind CSS classes). */
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", // Or bg-amber-100 etc.
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/** Color mappings for AgentStatus (e.g., for Tailwind CSS classes). */
export const STATUS_COLORS: Record<AgentStatus, string> = {
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  busy: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  disabled: "bg-neutral-200 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300",
};

/** Color mappings for LogLevel (e.g., for Tailwind CSS classes). */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
    debug: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    info: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200", // Or blue
    warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    critical: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200", // Or a more intense red
};

/** Color mappings for TaskStatus (e.g., for Tailwind CSS classes). */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
    pending: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    cancelled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    timeout: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};