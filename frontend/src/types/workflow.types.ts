/**
 * Workflow and approval types to replace 'any' usage
 */

import type { Id } from '@/types/id.types';

import { Id } from './id.types';

// Workflow Types
export interface WorkflowDefinition {
  _id: string;
  name: string;
  description?: string;
  type: 'approval' | 'review' | 'signature' | 'custom';
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  conditions: WorkflowCondition[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'review' | 'notification' | 'action';
  assigneeType: 'user' | 'role' | 'group' | 'dynamic';
  assignees?: Id<"users">[];
  assigneeRoles?: string[];
  assigneeExpression?: string;
  dueInDays?: number;
  actions: WorkflowAction[];
  conditions?: WorkflowCondition[];
  onComplete?: string; // Next step ID
  onReject?: string; // Next step ID
}

export interface WorkflowAction {
  type: 'email' | 'notification' | 'webhook' | 'update_field' | 'create_task';
  config: WorkflowActionConfig;
}

export interface WorkflowActionConfig {
  // Email action
  emailTemplate?: string;
  emailRecipients?: string[];
  
  // Notification action
  notificationTitle?: string;
  notificationMessage?: string;
  
  // Webhook action
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT';
  webhookHeaders?: Record<string, string>;
  webhookBody?: Record<string, unknown>;
  
  // Update field action
  fieldName?: string;
  fieldValue?: unknown;
  
  // Create task action
  taskType?: string;
  taskAssignee?: Id<"users">;
  taskData?: Record<string, unknown>;
}

export interface WorkflowTrigger {
  type: 'manual' | 'automatic' | 'scheduled' | 'event';
  event?: string;
  schedule?: string; // Cron expression
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

// Workflow Instance Types
export interface WorkflowInstance {
  _id: string; // Changed from Id<"workflowInstances">
  workflowId: string;
  entityType: 'contract' | 'vendor' | 'document' | 'custom';
  entityId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  currentStepId: string;
  startedAt: string;
  completedAt?: string;
  startedBy: Id<"users">;
  metadata?: WorkflowMetadata;
}

export interface WorkflowMetadata {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  customFields?: Record<string, unknown>;
}

// Approval Types
export interface ApprovalRequest {
  _id: string; // Changed from Id<"approvalRequests">
  workflowInstanceId: string; // Changed from Id<"workflowInstances">
  stepId: string;
  title: string;
  description?: string;
  requestedBy: Id<"users">;
  approvers: ApproverInfo[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: ApprovalMetadata;
}

export interface ApproverInfo {
  userId: Id<"users">;
  status: 'pending' | 'approved' | 'rejected' | 'abstained';
  respondedAt?: string;
  comments?: string;
  delegatedTo?: Id<"users">;
}

export interface ApprovalMetadata {
  contractId?: Id<"contracts">;
  vendorId?: Id<"vendors">;
  documentId?: Id<"collaborativeDocuments">;
  amount?: number;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  attachments?: string[];
  relatedApprovals?: string[]; // Changed from Id<"approvalRequests">[]
}

// Task Types
export interface WorkflowTask {
  _id: string; // Changed from Id<"workflowTasks">
  workflowInstanceId: string; // Changed from Id<"workflowInstances">
  stepId: string;
  type: 'approval' | 'review' | 'action' | 'notification';
  title: string;
  description?: string;
  assignedTo: Id<"users">;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  output?: WorkflowTaskOutput;
}

export interface WorkflowTaskOutput {
  decision?: 'approve' | 'reject' | 'delegate';
  comments?: string;
  data?: Record<string, unknown>;
  nextStepOverride?: string;
}

// Notification Types for Workflows
export interface WorkflowNotification {
  type: 'task_assigned' | 'approval_required' | 'task_completed' | 'workflow_completed' | 'reminder' | 'escalation';
  recipientId: Id<"users">;
  workflowInstanceId: string; // Changed from Id<"workflowInstances">
  taskId?: string; // Changed from Id<"workflowTasks">
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expiresAt?: string;
}

// History and Audit Types
export interface WorkflowHistory {
  _id: string;
  workflowInstanceId: string; // Changed from Id<"workflowInstances">
  action: 'started' | 'step_completed' | 'approved' | 'rejected' | 'cancelled' | 'reassigned' | 'escalated';
  stepId?: string;
  actor: Id<"users">;
  timestamp: string;
  details?: WorkflowHistoryDetails;
}

export interface WorkflowHistoryDetails {
  previousStatus?: string;
  newStatus?: string;
  comments?: string;
  reason?: string;
  delegatedFrom?: Id<"users">;
  delegatedTo?: Id<"users">;
  data?: Record<string, unknown>;
}

// Dashboard Types
export interface WorkflowMetrics {
  totalActive: number;
  completedToday: number;
  pendingApprovals: number;
  overdueItems: number;
  averageCompletionTime: number; // in hours
  approvalRate: number; // percentage
}

export interface WorkflowQueueItem {
  id: string;
  type: 'approval' | 'task' | 'review';
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  assignedDate: string;
  workflowName: string;
  currentStep: string;
  metadata?: Record<string, unknown>;
}

// Type Guards
export function isWorkflowAction(action: unknown): action is WorkflowAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    'config' in action
  );
}

export function isApprovalRequest(data: unknown): data is ApprovalRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'workflowInstanceId' in data &&
    'approvers' in data &&
    'status' in data
  );
}