/**
 * Core agent type definitions to replace 'any' types
 */

import { Database } from '../database';

// Agent-related database types
type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type AgentTaskRow = Tables['agent_tasks']['Row'];
export type AgentTaskInsert = Tables['agent_tasks']['Insert'];
export type AgentTaskUpdate = Tables['agent_tasks']['Update'];

// Agent context types
export interface AgentContext {
  enterpriseId: string;
  userId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
  sessionId?: string;
  timestamp?: Date;
}

// Agent task types
export interface Task {
  id: string;
  type: string;
  priority: number;
  data: TaskData;
  context: AgentContext;
  status: TaskStatus;
  retryCount?: number;
  maxRetries?: number;
  createdAt: Date;
  updatedAt?: Date;
  scheduledAt?: Date;
  completedAt?: Date;
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface TaskData {
  action?: string;
  entityId?: string;
  entityType?: 'contract' | 'vendor' | 'budget' | 'document' | 'workflow';
  payload: Record<string, unknown>;
  options?: TaskOptions;
}

export interface TaskOptions {
  timeout?: number;
  retryStrategy?: 'exponential' | 'linear' | 'fixed';
  notifyOnComplete?: boolean;
  callbackUrl?: string;
}

// Agent execution result types
export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metadata?: AgentResultMetadata;
}

export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  recoverable: boolean;
}

export interface AgentResultMetadata {
  executionTime: number;
  timestamp: Date;
  agentType: string;
  agentVersion?: string;
  metricsCollected?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  cpuTime?: number;
  memoryUsed?: number;
  queryCount?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

// Agent memory types
export interface MemoryEntry {
  id: string;
  enterpriseId: string;
  userId?: string;
  agentType: string;
  content: MemoryContent;
  importance: number;
  decay: number;
  accessCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt?: Date;
  tags?: string[];
}

export interface MemoryContent {
  type: 'fact' | 'pattern' | 'preference' | 'insight' | 'decision';
  data: Record<string, unknown>;
  source?: string;
  confidence?: number;
  relationships?: MemoryRelationship[];
}

export interface MemoryRelationship {
  targetId: string;
  relationshipType: 'caused_by' | 'related_to' | 'derived_from' | 'conflicts_with';
  strength: number;
}

// Agent configuration types
export interface AgentConfig {
  agentType: string;
  enterpriseId: string;
  settings: AgentSettings;
  capabilities: AgentCapability[];
  constraints?: AgentConstraints;
}

export interface AgentSettings {
  enabled: boolean;
  priority: number;
  maxConcurrency?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  customParams?: Record<string, unknown>;
}

export interface AgentCapability {
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface AgentConstraints {
  maxMemoryMB?: number;
  maxExecutionTime?: number;
  allowedActions?: string[];
  deniedActions?: string[];
  requiresApproval?: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  strategy: 'exponential' | 'linear' | 'fixed';
  initialDelay: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

// Supabase client type for agents
export interface SupabaseClient {
  from: <T = unknown>(table: string) => QueryBuilder<T>;
  rpc: <T = unknown>(fn: string, params?: Record<string, unknown>) => Promise<{ data: T | null; error: Error | null }>;
  auth: {
    getUser: () => Promise<{ data: { user: AuthUser | null }; error: Error | null }>;
  };
  storage: {
    from: (bucket: string) => StorageBucket;
  };
}

export interface QueryBuilder<T> {
  select: (columns?: string) => QueryBuilder<T>;
  insert: (data: Partial<T> | Partial<T>[]) => QueryBuilder<T>;
  update: (data: Partial<T>) => QueryBuilder<T>;
  delete: () => QueryBuilder<T>;
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  neq: (column: string, value: unknown) => QueryBuilder<T>;
  gt: (column: string, value: unknown) => QueryBuilder<T>;
  gte: (column: string, value: unknown) => QueryBuilder<T>;
  lt: (column: string, value: unknown) => QueryBuilder<T>;
  lte: (column: string, value: unknown) => QueryBuilder<T>;
  in: (column: string, values: unknown[]) => QueryBuilder<T>;
  is: (column: string, value: null | boolean) => QueryBuilder<T>;
  like: (column: string, pattern: string) => QueryBuilder<T>;
  ilike: (column: string, pattern: string) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  range: (from: number, to: number) => QueryBuilder<T>;
  single: () => Promise<{ data: T | null; error: Error | null }>;
  maybeSingle: () => Promise<{ data: T | null; error: Error | null }>;
}

export interface StorageBucket {
  upload: (path: string, file: File | Blob, options?: { contentType?: string }) => Promise<{ data: { path: string } | null; error: Error | null }>;
  download: (path: string) => Promise<{ data: Blob | null; error: Error | null }>;
  remove: (paths: string[]) => Promise<{ data: unknown | null; error: Error | null }>;
  list: (path?: string) => Promise<{ data: FileObject[] | null; error: Error | null }>;
}

export interface FileObject {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, string>;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

// Agent health types
export interface AgentHealthStatus {
  agentType: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastCheckAt: Date;
  metrics: AgentHealthMetrics;
  issues?: HealthIssue[];
}

export interface AgentHealthMetrics {
  successRate: number;
  averageExecutionTime: number;
  pendingTasks: number;
  failedTasks: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  code: string;
  detectedAt: Date;
  resolved: boolean;
}

// Agent communication types
export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  messageType: 'request' | 'response' | 'notification' | 'broadcast';
  payload: Record<string, unknown>;
  priority: number;
  timestamp: Date;
  correlationId?: string;
}

export interface AgentResponse<T = unknown> {
  messageId: string;
  success: boolean;
  data?: T;
  error?: AgentError;
  processingTime: number;
  timestamp: Date;
}

// Workflow types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentType: string;
  action: string;
  input: WorkflowStepInput;
  conditions?: WorkflowCondition[];
  onSuccess?: WorkflowTransition;
  onFailure?: WorkflowTransition;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowStepInput {
  static?: Record<string, unknown>;
  dynamic?: DynamicInput[];
  fromPreviousStep?: string;
}

export interface DynamicInput {
  key: string;
  source: 'context' | 'previous_step' | 'database' | 'api';
  path: string;
  transform?: string;
}

export interface WorkflowCondition {
  type: 'and' | 'or' | 'not';
  conditions?: WorkflowCondition[];
  field?: string;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value?: unknown;
}

export interface WorkflowTransition {
  nextStep?: string;
  action?: 'complete' | 'fail' | 'retry' | 'wait' | 'branch';
  params?: Record<string, unknown>;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'webhook' | 'manual';
  config: WorkflowTriggerConfig;
}

export interface WorkflowTriggerConfig {
  cronSchedule?: string;
  eventType?: string;
  webhookUrl?: string;
  conditions?: WorkflowCondition[];
}

export interface WorkflowSettings {
  timeout?: number;
  maxRetries?: number;
  notifyOnComplete?: boolean;
  notifyOnFailure?: boolean;
  persistLogs?: boolean;
}

// Batch processing types
export interface BatchJob<T = unknown> {
  id: string;
  type: string;
  items: T[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  progress: BatchProgress;
  results: BatchResult<T>[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface BatchProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentComplete: number;
}

export interface BatchResult<T = unknown> {
  item: T;
  success: boolean;
  result?: unknown;
  error?: AgentError;
  processingTime: number;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  enterpriseId: string;
  agentType?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'create' | 'update' | 'delete';
}
