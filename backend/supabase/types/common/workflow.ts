// Workflow and process automation type definitions

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables?: WorkflowVariable[];
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export type WorkflowType = 
  | 'approval'
  | 'notification'
  | 'data_processing'
  | 'integration'
  | 'scheduled_task'
  | 'conditional';

export interface WorkflowTrigger {
  type: TriggerType;
  config: TriggerConfig;
}

export type TriggerType = 
  | 'manual'
  | 'schedule'
  | 'event'
  | 'webhook'
  | 'condition';

export interface TriggerConfig {
  schedule?: string; // cron expression
  event?: string;
  webhook?: WebhookConfig;
  condition?: ConditionConfig;
  [key: string]: unknown;
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  authentication?: AuthConfig;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'api_key';
  credentials?: Record<string, string>;
}

export interface ConditionConfig {
  field: string;
  operator: ComparisonOperator;
  value: unknown;
  combinator?: 'AND' | 'OR';
  conditions?: ConditionConfig[];
}

export type ComparisonOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in';

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  config: StepConfig;
  conditions?: ConditionConfig[];
  onSuccess?: string; // next step id
  onFailure?: string; // next step id or 'end'
  retryPolicy?: RetryPolicy;
}

export type StepType = 
  | 'action'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'approval'
  | 'notification'
  | 'transform'
  | 'integration';

export interface StepConfig {
  action?: ActionConfig;
  condition?: ConditionConfig;
  loop?: LoopConfig;
  parallel?: ParallelConfig;
  approval?: ApprovalConfig;
  notification?: NotificationConfig;
  transform?: TransformConfig;
  integration?: IntegrationConfig;
  [key: string]: unknown;
}

export interface ActionConfig {
  type: string;
  params: Record<string, unknown>;
}

export interface LoopConfig {
  source: string; // variable name or expression
  variable: string;
  steps: WorkflowStep[];
  maxIterations?: number;
}

export interface ParallelConfig {
  branches: WorkflowBranch[];
  waitForAll: boolean;
}

export interface WorkflowBranch {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export interface ApprovalConfig {
  approvers: Approver[];
  strategy: 'any' | 'all' | 'threshold';
  threshold?: number;
  timeout?: number; // in hours
  escalation?: EscalationConfig;
}

export interface Approver {
  type: 'user' | 'role' | 'group';
  id: string;
  name?: string;
}

export interface EscalationConfig {
  delay: number; // in hours
  to: Approver[];
}

export interface NotificationConfig {
  template: string;
  recipients: Recipient[];
  channels: ('email' | 'sms' | 'slack' | 'in_app')[];
}

export interface Recipient {
  type: 'user' | 'role' | 'email' | 'variable';
  value: string;
}

export interface TransformConfig {
  input: string; // variable name
  output: string; // variable name
  operations: TransformOperation[];
}

export interface TransformOperation {
  type: 'map' | 'filter' | 'reduce' | 'format' | 'parse';
  config: Record<string, unknown>;
}

export interface IntegrationConfig {
  system: string;
  action: string;
  params: Record<string, unknown>;
  mapping?: FieldMapping[];
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: string; // expression
}

export interface RetryPolicy {
  maxAttempts: number;
  delay: number; // in seconds
  backoffMultiplier?: number;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  defaultValue?: unknown;
  required: boolean;
  description?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  currentStep?: string;
  variables: Record<string, unknown>;
  history: ExecutionHistory[];
  error?: ExecutionError;
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionHistory {
  stepId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: ExecutionError;
}

export interface ExecutionError {
  code: string;
  message: string;
  stepId?: string;
  details?: unknown;
}