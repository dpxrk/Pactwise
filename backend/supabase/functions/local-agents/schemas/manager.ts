import { z } from 'zod';

/**
 * Manager Agent Input Validation Schemas
 *
 * Provides comprehensive Zod schemas for validating all Manager Agent inputs.
 * Ensures type safety, input sanitization, and data integrity at runtime.
 *
 * @module ManagerAgentSchemas
 * @version 1.0.0
 *
 * ## Features
 * - UUID validation with custom error messages
 * - Manager-specific enum types (request types, execution modes, complexity levels)
 * - Comprehensive process data validation for orchestration requests
 * - Context validation with enterprise isolation
 * - Input sanitization and conflict detection
 *
 * @example
 * ```typescript
 * import { validateManagerAgentInput, validateManagerContext } from './schemas/manager.ts';
 *
 * const inputResult = validateManagerAgentInput(requestData);
 * if (!inputResult.success) {
 *   console.error('Validation errors:', inputResult.errors);
 * }
 *
 * const contextResult = validateManagerContext(requestContext);
 * if (contextResult.success) {
 *   const { requestType, executionMode } = contextResult.data;
 * }
 * ```
 */

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

/**
 * UUID validation schema with custom error message
 */
export const UuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Optional UUID schema that accepts null/undefined
 */
export const OptionalUuidSchema = z.string().uuid('Invalid UUID format').optional().nullable();

/**
 * Non-empty string schema with trimming
 */
export const NonEmptyStringSchema = z.string().min(1, 'String cannot be empty').transform(s => s.trim());

/**
 * Content string schema with reasonable limits (10MB max)
 */
export const ContentSchema = z.string()
  .min(1, 'Content cannot be empty')
  .max(10 * 1024 * 1024, 'Content exceeds 10MB limit');

/**
 * Optional content schema for text/content fields
 */
export const OptionalContentSchema = ContentSchema.optional();

// =============================================================================
// MANAGER-SPECIFIC SCHEMAS
// =============================================================================

/**
 * Request type schema for manager agent orchestration
 * - contract_review: Contract analysis and review workflows
 * - vendor_evaluation: Vendor assessment and onboarding
 * - financial_analysis: Financial impact and budget analysis
 * - compliance_check: Regulatory compliance auditing
 * - document_processing: Document extraction and processing
 * - alert_configuration: Notification and alert setup
 * - performance_review: Performance metrics and KPI analysis
 * - risk_assessment: Risk identification and evaluation
 * - general_request: Catch-all for unclassified requests
 */
export const RequestTypeSchema = z.enum([
  'contract_review',
  'vendor_evaluation',
  'financial_analysis',
  'compliance_check',
  'document_processing',
  'alert_configuration',
  'performance_review',
  'risk_assessment',
  'general_request',
], {
  errorMap: () => ({ message: 'Invalid request type. Must be: contract_review, vendor_evaluation, financial_analysis, compliance_check, document_processing, alert_configuration, performance_review, risk_assessment, or general_request' }),
});

/**
 * Execution mode schema for orchestration control
 * - synchronous: Execute all agents and return results immediately
 * - asynchronous: Queue tasks for background processing
 */
export const ExecutionModeSchema = z.enum([
  'synchronous',
  'asynchronous',
], {
  errorMap: () => ({ message: 'Invalid execution mode. Must be: synchronous or asynchronous' }),
});

/**
 * Complexity level schema for request assessment
 */
export const ComplexitySchema = z.enum([
  'low',
  'medium',
  'high',
], {
  errorMap: () => ({ message: 'Invalid complexity level. Must be: low, medium, or high' }),
});

/**
 * Priority level schema for task prioritization
 */
export const PrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
], {
  errorMap: () => ({ message: 'Invalid priority level. Must be: low, medium, high, or critical' }),
});

/**
 * Agent type schema for available agents
 */
export const AgentTypeSchema = z.enum([
  'secretary',
  'financial',
  'legal',
  'analytics',
  'vendor',
  'notifications',
  'workflow',
  'compliance',
], {
  errorMap: () => ({ message: 'Invalid agent type' }),
});

/**
 * Orchestration type schema for plan classification
 */
export const OrchestrationTypeSchema = z.enum([
  'single_agent',
  'multi_agent',
  'workflow',
], {
  errorMap: () => ({ message: 'Invalid orchestration type. Must be: single_agent, multi_agent, or workflow' }),
});

/**
 * Workflow type schema for predefined workflow patterns
 */
export const WorkflowTypeSchema = z.enum([
  'contract_lifecycle',
  'vendor_onboarding',
  'budget_planning',
  'compliance_audit',
  'invoice_processing',
  'custom',
], {
  errorMap: () => ({ message: 'Invalid workflow type' }),
});

/**
 * Step status schema for tracking execution step progress
 */
export const StepStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'skipped',
], {
  errorMap: () => ({ message: 'Invalid step status' }),
});

// =============================================================================
// COMPLEX TYPE SCHEMAS
// =============================================================================

/**
 * Agent reference schema for specifying agents in orchestration plans
 */
export const AgentReferenceSchema = z.object({
  /** Agent type identifier */
  type: AgentTypeSchema,
  /** Specific task type for the agent */
  taskType: z.string().max(255).optional(),
  /** Reason for including this agent */
  reason: z.string().max(1000).optional(),
  /** Agent capabilities required */
  capabilities: z.array(z.string().max(255)).max(20).optional(),
  /** Priority ranking (1 = highest) */
  priority: z.number().int().min(1).max(10),
  /** Agent name/identifier */
  agent: z.string().max(255).optional(),
  /** Current status */
  status: z.string().max(50).optional(),
});

/**
 * Dependency info schema for agent execution ordering
 */
export const DependencyInfoSchema = z.object({
  /** Agent that has the dependency */
  agent: z.string().min(1).max(100),
  /** Agent(s) it depends on */
  dependsOn: z.union([
    z.string().min(1).max(100),
    z.array(z.string().min(1).max(100)),
  ]),
  /** Reason for the dependency */
  reason: z.string().max(500),
});

/**
 * Execution step schema for orchestration plan steps
 */
export const ExecutionStepSchema = z.object({
  /** Unique step identifier */
  stepId: z.string().min(1).max(255),
  /** Agent to execute (alternative to agentType) */
  agent: z.string().max(100).optional(),
  /** Agent type identifier */
  agentType: z.string().max(100).optional(),
  /** Action to perform */
  action: z.string().max(255).optional(),
  /** Task description */
  task: z.string().max(500).optional(),
  /** Task type identifier */
  taskType: z.string().max(255).optional(),
  /** Step dependencies (step IDs) */
  dependencies: z.array(z.string().max(255)),
  /** Estimated duration in seconds */
  estimatedDuration: z.number().nonnegative(),
  /** Whether this step can run in parallel */
  canParallelize: z.boolean().optional(),
  /** Execution status */
  status: StepStatusSchema.optional(),
  /** Actual duration in milliseconds */
  duration: z.number().nonnegative().optional(),
  /** Error message if failed */
  error: z.string().max(5000).optional(),
  /** Whether this step is critical (workflow halts on failure) */
  critical: z.boolean().optional(),
});

/**
 * Workflow step schema for predefined workflow definitions
 */
export const WorkflowStepSchema = z.object({
  /** Agent to handle the step */
  agent: z.string().min(1).max(100),
  /** Task to perform */
  task: z.string().min(1).max(500),
  /** Whether the step is critical */
  critical: z.boolean().optional(),
});

/**
 * Workflow info schema for workflow definitions
 */
export const WorkflowInfoSchema = z.object({
  /** Optional workflow ID */
  workflowId: z.string().max(255).optional(),
  /** Workflow name */
  name: z.string().min(1).max(255),
  /** Steps in the workflow */
  steps: z.array(WorkflowStepSchema).min(1).max(50),
  /** Workflow description */
  description: z.string().max(2000).optional(),
});

/**
 * Workflow summary schema for execution results
 */
export const WorkflowSummarySchema = z.object({
  /** Optional orchestration ID */
  orchestrationId: z.string().optional(),
  /** Completion status label */
  completionStatus: z.string().optional(),
  /** Number of steps completed */
  stepsCompleted: z.number().int().nonnegative(),
  /** Completed steps (duplicate for compatibility) */
  completedSteps: z.number().int().nonnegative().optional(),
  /** Total steps in the workflow */
  totalSteps: z.number().int().nonnegative(),
  /** Number of failed steps */
  failedSteps: z.number().int().nonnegative().optional(),
  /** Total execution duration in milliseconds */
  totalDuration: z.number().nonnegative(),
  /** Whether the workflow completed successfully */
  success: z.boolean(),
  /** Key findings from the workflow */
  keyFindings: z.array(z.string().max(1000)),
  /** Recommended next steps */
  nextSteps: z.array(z.string().max(1000)),
  /** Additional recommendations */
  recommendations: z.array(z.string().max(1000)).optional(),
});

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Main input schema for ManagerAgent.process() method
 * Validates all possible input combinations for orchestration requests
 */
export const ManagerAgentProcessDataSchema = z.object({
  // === Content Fields ===
  /** Raw content/request text for analysis */
  content: OptionalContentSchema,
  /** Alternative text field */
  text: OptionalContentSchema,

  // === Request Configuration ===
  /** Explicit request type override */
  requestType: RequestTypeSchema.optional(),
  /** Execution mode (sync/async) */
  executionMode: ExecutionModeSchema.optional(),
  /** Explicit workflow type for workflow orchestration */
  workflowType: WorkflowTypeSchema.optional(),

  // === Task Details ===
  /** Task description */
  task: z.string().max(5000).optional(),
  /** Task priority override */
  priority: PrioritySchema.optional(),
  /** Urgency flag */
  urgent: z.boolean().optional(),

  // === Entity References ===
  /** Contract ID for contract-related requests */
  contractId: OptionalUuidSchema,
  /** Vendor ID for vendor-related requests */
  vendorId: OptionalUuidSchema,
  /** Document ID for document processing */
  documentId: OptionalUuidSchema,

  // === Agent Selection ===
  /** Specific agents to include */
  requiredAgents: z.array(AgentTypeSchema).max(8).optional(),
  /** Agents to exclude from orchestration */
  excludeAgents: z.array(AgentTypeSchema).max(8).optional(),

  // === Workflow Configuration ===
  /** Custom workflow steps */
  workflowSteps: z.array(WorkflowStepSchema).max(50).optional(),
  /** Maximum concurrent agents */
  maxConcurrency: z.number().int().min(1).max(10).optional(),
  /** Timeout in milliseconds */
  timeoutMs: z.number().int().min(5000).max(600000).optional(),

  // === Data Payload ===
  /** Additional data to pass to agents */
  data: z.unknown().optional(),
  /** Action identifier */
  action: z.string().max(255).optional(),

  // === Financial Context ===
  /** Budget request flag */
  budgetRequest: z.boolean().optional(),
  /** Invoice ID for invoice processing */
  invoiceId: z.string().max(255).optional(),
  /** Audit type for compliance */
  auditType: z.string().max(255).optional(),
}).refine(
  data => {
    const hasContent = data.content || data.text || data.task;
    const hasEntityRef = data.contractId || data.vendorId || data.documentId;
    const hasRequestType = data.requestType;
    const hasWorkflow = data.workflowSteps && data.workflowSteps.length > 0;
    const hasAgents = data.requiredAgents && data.requiredAgents.length > 0;
    const hasAction = data.action;
    const hasData = data.data !== undefined;

    return hasContent || hasEntityRef || hasRequestType || hasWorkflow || hasAgents || hasAction || hasData;
  },
  'At least one of: content, text, task, contractId, vendorId, documentId, requestType, workflowSteps, requiredAgents, action, or data must be provided',
);

/**
 * Context validation schema for manager agent operations
 */
export const ManagerContextSchema = z.object({
  /** Enterprise ID for data isolation (security critical) */
  enterpriseId: OptionalUuidSchema,
  /** Session ID for tracking */
  sessionId: z.string().max(255).optional(),
  /** User ID performing the request */
  userId: OptionalUuidSchema,
  /** Task ID if part of a larger workflow */
  taskId: OptionalUuidSchema,
  /** Contract ID for contract-related operations */
  contractId: OptionalUuidSchema,
  /** Vendor ID for vendor-related operations */
  vendorId: OptionalUuidSchema,
  /** Request type override */
  requestType: RequestTypeSchema.optional(),
  /** Execution mode override */
  executionMode: ExecutionModeSchema.optional(),
  /** User priority level */
  priority: z.number().int().min(1).max(10).optional(),
  /** User permissions */
  permissions: z.array(z.string().max(100)).optional(),
  /** Environment configuration */
  environment: z.record(z.unknown()).optional(),
  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate manager agent process data input
 *
 * @param data - Raw input data to validate
 * @returns Validation result with success flag, validated data or errors
 *
 * @example
 * ```typescript
 * const result = validateManagerAgentInput({
 *   content: 'Review contract terms and check compliance',
 *   requestType: 'contract_review',
 * });
 *
 * if (result.success) {
 *   console.log(result.data.requestType);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateManagerAgentInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof ManagerAgentProcessDataSchema>;
  errors?: string[];
} {
  try {
    const validated = ManagerAgentProcessDataSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate manager agent context
 *
 * @param context - Raw context object to validate
 * @returns Validation result with success flag, validated context or errors
 *
 * @example
 * ```typescript
 * const result = validateManagerContext({
 *   enterpriseId: '123e4567-e89b-12d3-a456-426614174000',
 *   requestType: 'contract_review',
 *   executionMode: 'synchronous',
 * });
 * ```
 */
export function validateManagerContext(context: unknown): {
  success: boolean;
  data?: z.infer<typeof ManagerContextSchema>;
  errors?: string[];
} {
  try {
    const validated = ManagerContextSchema.parse(context);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate a request type value
 *
 * @param value - Request type string to validate
 * @returns Validation result
 */
export function validateRequestType(value: unknown): {
  success: boolean;
  value?: z.infer<typeof RequestTypeSchema>;
  error?: string;
} {
  try {
    const validated = RequestTypeSchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid request type. Must be: contract_review, vendor_evaluation, financial_analysis, compliance_check, document_processing, alert_configuration, performance_review, risk_assessment, or general_request',
    };
  }
}

/**
 * Validate an execution mode value
 *
 * @param value - Execution mode string to validate
 * @returns Validation result
 */
export function validateExecutionMode(value: unknown): {
  success: boolean;
  value?: z.infer<typeof ExecutionModeSchema>;
  error?: string;
} {
  try {
    const validated = ExecutionModeSchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid execution mode. Must be: synchronous or asynchronous',
    };
  }
}

/**
 * Validate a priority level value
 *
 * @param value - Priority string to validate
 * @returns Validation result
 */
export function validatePriority(value: unknown): {
  success: boolean;
  value?: z.infer<typeof PrioritySchema>;
  error?: string;
} {
  try {
    const validated = PrioritySchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid priority level. Must be: low, medium, high, or critical',
    };
  }
}

/**
 * Validate an agent type value
 *
 * @param value - Agent type string to validate
 * @returns Validation result
 */
export function validateAgentType(value: unknown): {
  success: boolean;
  value?: z.infer<typeof AgentTypeSchema>;
  error?: string;
} {
  try {
    const validated = AgentTypeSchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid agent type',
    };
  }
}

/**
 * Validate a single UUID value
 *
 * @param value - Value to validate as UUID
 * @returns Validation result
 */
export function validateUuid(value: unknown): {
  success: boolean;
  value?: string;
  error?: string;
} {
  try {
    const validated = UuidSchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return { success: false, error: 'Invalid UUID format' };
  }
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize content string - removes control characters and normalizes whitespace
 *
 * @param content - Raw content string to sanitize
 * @returns Sanitized content string
 *
 * @example
 * ```typescript
 * const clean = sanitizeContent('Hello\x00World\r\n\r\n\r\n\r\nTest');
 * // Result: 'HelloWorld\n\n\nTest'
 * ```
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove null bytes and other control characters (except newlines/tabs)
  let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize line endings (CRLF -> LF, CR -> LF)
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive whitespace (more than 3 consecutive newlines)
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Detect conflicting inputs between data and context
 * Returns warnings for any conflicts found that may affect processing
 *
 * @param data - Validated process data
 * @param context - Validated context (optional)
 * @returns Array of warning messages describing conflicts
 *
 * @example
 * ```typescript
 * const warnings = detectInputConflicts(
 *   { content: 'Review contract', requestType: 'vendor_evaluation' },
 *   { requestType: 'contract_review' }
 * );
 * // warnings: ['RequestType differs between data and context - using context.requestType']
 * ```
 */
export function detectInputConflicts(
  data: z.infer<typeof ManagerAgentProcessDataSchema>,
  context?: z.infer<typeof ManagerContextSchema>,
): string[] {
  const warnings: string[] = [];

  // Check for both content and text provided with different values
  if (data.content && data.text) {
    if (data.content !== data.text) {
      warnings.push('Both content and text provided with different values - using content');
    }
  }

  // Check for requestType in both data and context with different values
  if (data.requestType && context?.requestType && data.requestType !== context.requestType) {
    warnings.push('RequestType differs between data and context - using context.requestType');
  }

  // Check for executionMode in both data and context with different values
  if (data.executionMode && context?.executionMode && data.executionMode !== context.executionMode) {
    warnings.push('ExecutionMode differs between data and context - using context.executionMode');
  }

  // Check for conflicting agent inclusion/exclusion
  if (data.requiredAgents && data.excludeAgents) {
    const overlap = data.requiredAgents.filter(a => data.excludeAgents?.includes(a));
    if (overlap.length > 0) {
      warnings.push(`Agent(s) ${overlap.join(', ')} are both required and excluded - requiredAgents takes precedence`);
    }
  }

  // Check for async mode with custom workflow steps
  const effectiveMode = context?.executionMode || data.executionMode;
  if (effectiveMode === 'asynchronous' && data.workflowSteps && data.workflowSteps.length > 0) {
    warnings.push('Custom workflow steps provided with asynchronous mode - workflow dependencies may not be preserved');
  }

  // Check for priority override without urgency content
  if (data.priority === 'critical' && !data.urgent) {
    warnings.push('Critical priority set but urgent flag is not set');
  }

  // Check for maxConcurrency with single agent request
  if (data.maxConcurrency && data.requiredAgents && data.requiredAgents.length <= 1) {
    warnings.push('maxConcurrency set but only one agent requested');
  }

  return warnings;
}

/**
 * Validate and sanitize a complete manager input object
 * Combines validation with sanitization for production use
 *
 * @param data - Raw input data
 * @returns Validation result with sanitized data or errors
 */
export function validateAndSanitizeManagerInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof ManagerAgentProcessDataSchema>;
  errors?: string[];
  warnings?: string[];
} {
  // First validate
  const validationResult = validateManagerAgentInput(data);

  if (!validationResult.success) {
    return validationResult;
  }

  const validatedData = validationResult.data!;
  const warnings: string[] = [];

  // Sanitize content fields
  if (validatedData.content) {
    validatedData.content = sanitizeContent(validatedData.content);
  }

  if (validatedData.text) {
    validatedData.text = sanitizeContent(validatedData.text);
  }

  if (validatedData.task) {
    validatedData.task = sanitizeContent(validatedData.task);
  }

  return {
    success: true,
    data: validatedData,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Validated manager agent input type */
export type ValidatedManagerAgentInput = z.infer<typeof ManagerAgentProcessDataSchema>;

/** Validated manager context type */
export type ValidatedManagerContext = z.infer<typeof ManagerContextSchema>;

/** Request type enum */
export type RequestType = z.infer<typeof RequestTypeSchema>;

/** Execution mode enum */
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;

/** Complexity level enum */
export type Complexity = z.infer<typeof ComplexitySchema>;

/** Priority level enum */
export type Priority = z.infer<typeof PrioritySchema>;

/** Agent type enum */
export type AgentType = z.infer<typeof AgentTypeSchema>;

/** Orchestration type enum */
export type OrchestrationType = z.infer<typeof OrchestrationTypeSchema>;

/** Workflow type enum */
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

/** Step status enum */
export type StepStatus = z.infer<typeof StepStatusSchema>;

/** Agent reference type */
export type AgentReference = z.infer<typeof AgentReferenceSchema>;

/** Dependency info type */
export type DependencyInfo = z.infer<typeof DependencyInfoSchema>;

/** Execution step type */
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

/** Workflow step type */
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

/** Workflow info type */
export type WorkflowInfo = z.infer<typeof WorkflowInfoSchema>;

/** Workflow summary type */
export type WorkflowSummary = z.infer<typeof WorkflowSummarySchema>;
