import { z } from 'zod';

/**
 * Notifications Agent Input Validation Schemas
 *
 * Provides comprehensive Zod schemas for validating all Notifications Agent inputs.
 * Ensures type safety, input sanitization, and data integrity at runtime.
 *
 * @module NotificationsAgentSchemas
 * @version 1.0.0
 *
 * ## Features
 * - UUID validation with custom error messages
 * - Notification-specific enum types (alert types, severity, channels)
 * - Comprehensive process data validation
 * - Context validation with enterprise isolation
 * - Input sanitization and conflict detection
 * - Recipient and escalation validation
 *
 * @example
 * ```typescript
 * import { validateNotificationInput, validateNotificationContext } from './schemas/notifications.ts';
 *
 * const inputResult = validateNotificationInput(requestData);
 * if (!inputResult.success) {
 *   console.error('Validation errors:', inputResult.errors);
 * }
 *
 * const contextResult = validateNotificationContext(requestContext);
 * if (contextResult.success) {
 *   // Proceed with validated data
 *   const { notificationType, severity } = contextResult.data;
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
// NOTIFICATION-SPECIFIC ENUMS
// =============================================================================

/**
 * Notification type schema for categorizing notification types
 * - alert: Immediate attention required, triggered by system events
 * - reminder: Scheduled notifications for upcoming events
 * - digest: Aggregated notifications for periodic summaries
 */
export const NotificationTypeSchema = z.enum([
  'alert',
  'reminder',
  'digest',
], {
  errorMap: () => ({ message: 'Invalid notification type. Must be: alert, reminder, or digest' }),
});

/**
 * Alert type schema for specific alert categorization
 * Used when notification type is 'alert'
 */
export const AlertTypeSchema = z.enum([
  'contract_expiration',
  'budget_exceeded',
  'compliance_violation',
  'vendor_issue',
  'payment_due',
  'approval_required',
  'performance_alert',
  'general_alert',
], {
  errorMap: () => ({ message: 'Invalid alert type. Must be: contract_expiration, budget_exceeded, compliance_violation, vendor_issue, payment_due, approval_required, performance_alert, or general_alert' }),
});

/**
 * Reminder type schema for specific reminder categorization
 * Used when notification type is 'reminder'
 */
export const ReminderTypeSchema = z.enum([
  'contract_renewal',
  'payment_reminder',
  'report_due',
  'review_scheduled',
  'training_due',
  'audit_preparation',
  'general_reminder',
], {
  errorMap: () => ({ message: 'Invalid reminder type. Must be: contract_renewal, payment_reminder, report_due, review_scheduled, training_due, audit_preparation, or general_reminder' }),
});

/**
 * Severity level schema for notification priority classification
 * - critical: Immediate action required, possible system/business impact
 * - high: Urgent attention needed within hours
 * - medium: Should be addressed within 24-48 hours
 * - low: Informational, can be addressed at convenience
 */
export const SeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
], {
  errorMap: () => ({ message: 'Invalid severity level. Must be: critical, high, medium, or low' }),
});

/**
 * Channel schema for notification delivery methods
 * - email: Standard email notification
 * - sms: SMS/text message
 * - in-app: In-application notification
 * - slack: Slack integration notification
 * - push: Push notification (mobile/desktop)
 * - phone: Voice call notification (critical only)
 */
export const ChannelSchema = z.enum([
  'email',
  'sms',
  'in-app',
  'slack',
  'push',
  'phone',
], {
  errorMap: () => ({ message: 'Invalid channel. Must be: email, sms, in-app, slack, push, or phone' }),
});

/**
 * Digest period schema for periodic notification summaries
 * - daily: Daily digest sent once per day
 * - weekly: Weekly digest sent once per week
 * - monthly: Monthly digest sent once per month
 */
export const DigestPeriodSchema = z.enum([
  'daily',
  'weekly',
  'monthly',
], {
  errorMap: () => ({ message: 'Invalid digest period. Must be: daily, weekly, or monthly' }),
});

/**
 * Digest format schema for notification summary formatting
 * - standard: Basic summary with key metrics
 * - executive: High-level summary for executives
 * - visual: Chart and graph-heavy format
 * - detailed: Comprehensive with all details
 * - comprehensive: Full audit trail included
 */
export const DigestFormatSchema = z.enum([
  'standard',
  'executive',
  'visual',
  'detailed',
  'comprehensive',
], {
  errorMap: () => ({ message: 'Invalid digest format. Must be: standard, executive, visual, detailed, or comprehensive' }),
});

/**
 * Urgency schema for time-sensitivity classification
 * - immediate: Must be sent right now
 * - overdue: Already past due date
 * - urgent: Within 24 hours
 * - upcoming: Within the next few days
 * - standard: Normal priority
 */
export const UrgencySchema = z.enum([
  'immediate',
  'overdue',
  'urgent',
  'upcoming',
  'standard',
], {
  errorMap: () => ({ message: 'Invalid urgency level. Must be: immediate, overdue, urgent, upcoming, or standard' }),
});

/**
 * Action item type schema for notification actions
 */
export const ActionItemTypeSchema = z.enum([
  'button',
  'link',
  'form',
  'approval',
  'acknowledgment',
], {
  errorMap: () => ({ message: 'Invalid action item type' }),
});

// =============================================================================
// COMPLEX TYPE SCHEMAS
// =============================================================================

/**
 * Recipient schema for notification targets
 * Contains all information needed to deliver a notification to a user
 */
export const RecipientSchema = z.object({
  /** User ID of the recipient */
  userId: UuidSchema,
  /** Display name of the recipient */
  name: z.string().min(1).max(255).optional(),
  /** Email address for email notifications */
  email: z.string().email('Invalid email format').optional(),
  /** User's role in the organization */
  role: z.string().max(100).optional(),
  /** Preferred notification channels for this recipient */
  channels: z.array(ChannelSchema).min(1).max(6).optional(),
  /** Priority level for this recipient (1-10, higher = more important) */
  priority: z.number().int().min(1).max(10).default(5).optional(),
  /** Reason this recipient is included */
  reason: z.string().max(500).optional(),
  /** Phone number for SMS/phone notifications */
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional(),
  /** Slack user ID for Slack notifications */
  slackUserId: z.string().max(100).optional(),
}).strict();

/**
 * Escalation level schema for defining escalation chains
 * Used when notifications need to escalate to higher authority
 */
export const EscalationLevelSchema = z.object({
  /** Escalation level number (1 = first escalation, 2 = second, etc.) */
  level: z.number().int().min(1).max(10),
  /** Role to escalate to at this level */
  role: z.string().min(1).max(100),
  /** Minutes after initial notification before escalating to this level */
  afterMinutes: z.number().int().min(1).max(43200), // Max 30 days in minutes
  /** Optional specific user ID to escalate to */
  userId: OptionalUuidSchema,
  /** Additional channels to use for this escalation level */
  channels: z.array(ChannelSchema).max(6).optional(),
  /** Message override for this escalation level */
  message: z.string().max(1000).optional(),
}).strict();

/**
 * Action item schema for notification interactive elements
 * Defines actions the recipient can take on the notification
 */
export const ActionItemSchema = z.object({
  /** Action identifier */
  action: z.string().min(1).max(100),
  /** Deadline for the action (ISO datetime) */
  deadline: z.string().datetime().optional().nullable(),
  /** User assigned to this action */
  assignee: OptionalUuidSchema,
  /** Priority of the action (1-10) */
  priority: z.number().int().min(1).max(10).default(5).optional(),
  /** Display label for the action */
  label: z.string().min(1).max(100),
  /** Type of action (button, link, form, etc.) */
  type: ActionItemTypeSchema.default('button').optional(),
  /** Additional options for the action */
  options: z.record(z.string(), z.unknown()).optional(),
  /** URL for link-type actions */
  url: z.string().url().optional(),
  /** Whether action has been completed */
  completed: z.boolean().default(false).optional(),
  /** Timestamp when action was completed */
  completedAt: z.string().datetime().optional().nullable(),
}).strict();

/**
 * Notification message schema for the notification content
 * Contains the actual message to be delivered
 */
export const NotificationMessageSchema = z.object({
  /** Subject line of the notification */
  subject: z.string().min(1).max(255),
  /** Body content of the notification */
  body: z.string().min(1).max(50000), // Allow longer body content
  /** Priority level (1-10) */
  priority: z.number().int().min(1).max(10).default(5).optional(),
  /** Additional metadata for the notification */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Primary action for the notification */
  action: ActionItemSchema.optional(),
  /** Urgency classification */
  urgency: UrgencySchema.default('standard').optional(),
  /** Template ID if using a predefined template */
  templateId: z.string().max(100).optional(),
  /** Template variables for substitution */
  templateVars: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  /** HTML body for rich content notifications */
  htmlBody: z.string().max(100000).optional(),
}).strict();

/**
 * Schedule schema for scheduled notifications
 */
export const ScheduleSchema = z.object({
  /** Scheduled send time (ISO datetime) */
  sendAt: z.string().datetime(),
  /** Timezone for the schedule */
  timezone: z.string().max(50).default('UTC'),
  /** Whether to respect user's notification preferences */
  respectQuietHours: z.boolean().default(true),
  /** Cron expression for recurring notifications */
  cron: z.string().regex(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
    'Invalid cron expression',
  ).optional(),
  /** End date for recurring notifications */
  endDate: z.string().datetime().optional(),
}).strict();

/**
 * Filter criteria schema for notification targeting
 */
export const FilterCriteriaSchema = z.object({
  /** Filter by roles */
  roles: z.array(z.string().max(100)).max(20).optional(),
  /** Filter by departments */
  departments: z.array(z.string().max(100)).max(20).optional(),
  /** Filter by user IDs */
  userIds: z.array(UuidSchema).max(100).optional(),
  /** Exclude specific user IDs */
  excludeUserIds: z.array(UuidSchema).max(100).optional(),
  /** Filter by notification preference */
  hasChannel: ChannelSchema.optional(),
  /** Custom filter expression */
  customFilter: z.record(z.string(), z.unknown()).optional(),
}).strict();

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Main input schema for NotificationsAgent.process() method
 * Validates all possible input combinations for notification operations
 */
export const NotificationAgentProcessDataSchema = z.object({
  // === Type Classification ===
  /** Primary notification type */
  type: NotificationTypeSchema.optional(),
  /** Severity level of the notification */
  severity: SeveritySchema.optional(),
  /** Specific alert type (when type is 'alert') */
  alertType: AlertTypeSchema.optional(),
  /** Specific reminder type (when type is 'reminder') */
  reminderType: ReminderTypeSchema.optional(),

  // === Entity References ===
  /** Contract name for contract-related notifications */
  contractName: z.string().min(1).max(255).optional(),
  /** Contract ID for linking to contract */
  contractId: OptionalUuidSchema,
  /** Vendor name for vendor-related notifications */
  vendorName: z.string().min(1).max(255).optional(),
  /** Vendor ID for linking to vendor */
  vendorId: OptionalUuidSchema,

  // === Time-Related Fields ===
  /** Due date for the notification event */
  dueDate: z.string().datetime().optional().nullable(),
  /** Number of days until the event */
  daysUntil: z.number().int().optional(),
  /** Days overdue (negative means future) */
  daysOverdue: z.number().int().optional(),

  // === Financial Fields ===
  /** Amount associated with the notification */
  amount: z.number().nonnegative().optional(),
  /** Value for the notification (alias for amount) */
  value: z.number().nonnegative().optional(),
  /** Currency code (ISO 4217) */
  currency: z.string().length(3).default('USD').optional(),
  /** Budget identifier */
  budgetId: OptionalUuidSchema,
  /** Budget name */
  budgetName: z.string().max(255).optional(),
  /** Budget limit that was exceeded */
  budgetLimit: z.number().nonnegative().optional(),
  /** Current budget usage */
  currentUsage: z.number().nonnegative().optional(),

  // === Assignment Fields ===
  /** User ID assigned to handle this notification */
  assignedTo: OptionalUuidSchema,
  /** User name assigned to handle this notification */
  assignedToName: z.string().max(255).optional(),
  /** Approver ID for approval-related notifications */
  approverId: OptionalUuidSchema,
  /** List of recipients */
  recipients: z.array(RecipientSchema).max(100).optional(),

  // === Description Fields ===
  /** Description of the notification event */
  description: z.string().max(10000).optional(),
  /** Title of the notification */
  title: z.string().min(1).max(255).optional(),
  /** Subject line (alias for title) */
  subject: z.string().min(1).max(255).optional(),

  // === Performance/Metric Fields ===
  /** Category of the notification */
  category: z.string().max(100).optional(),
  /** Metric being tracked */
  metric: z.string().max(100).optional(),
  /** Threshold that was crossed */
  threshold: z.number().optional(),
  /** Current metric value */
  currentValue: z.number().optional(),
  /** Target metric value */
  targetValue: z.number().optional(),
  /** KPI identifier */
  kpiId: OptionalUuidSchema,
  /** SLA identifier */
  slaId: OptionalUuidSchema,

  // === Compliance Fields ===
  /** Compliance requirement violated */
  complianceRequirement: z.string().max(500).optional(),
  /** Compliance framework (SOC2, GDPR, etc.) */
  complianceFramework: z.string().max(100).optional(),
  /** Risk level of the compliance violation */
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),

  // === Content Fields ===
  /** Raw content for processing */
  content: OptionalContentSchema,
  /** Alternative text field (alias for content) */
  text: OptionalContentSchema,
  /** Message body */
  message: z.string().max(50000).optional(),
  /** HTML content */
  htmlContent: z.string().max(100000).optional(),

  // === Action Fields ===
  /** Action items for the notification */
  actions: z.array(ActionItemSchema).max(10).optional(),
  /** Primary action URL */
  actionUrl: z.string().url().optional(),
  /** Primary action label */
  actionLabel: z.string().max(100).optional(),

  // === Escalation Fields ===
  /** Escalation configuration */
  escalation: z.array(EscalationLevelSchema).max(10).optional(),
  /** Whether to enable auto-escalation */
  autoEscalate: z.boolean().default(false).optional(),

  // === Scheduling Fields ===
  /** Schedule configuration for the notification */
  schedule: ScheduleSchema.optional(),

  // === Digest Fields ===
  /** Digest period for aggregation */
  digestPeriod: DigestPeriodSchema.optional(),
  /** Digest format */
  digestFormat: DigestFormatSchema.optional(),
  /** Number of items to include in digest */
  digestItemCount: z.number().int().min(1).max(100).optional(),

  // === Channel Fields ===
  /** Channels to use for delivery */
  channels: z.array(ChannelSchema).min(1).max(6).optional(),
  /** Whether to respect user channel preferences */
  respectPreferences: z.boolean().default(true).optional(),

  // === Additional Metadata ===
  /** Source system of the notification */
  source: z.string().max(100).optional(),
  /** Correlation ID for tracking related notifications */
  correlationId: z.string().max(100).optional(),
  /** Parent notification ID for threading */
  parentNotificationId: OptionalUuidSchema,
  /** Tags for categorization */
  tags: z.array(z.string().max(50)).max(20).optional(),
  /** Additional metadata */
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(
  data => {
    // At least one meaningful field must be provided
    const hasType = data.type || data.alertType || data.reminderType;
    const hasContent = data.content || data.text || data.message || data.title || data.description;
    const hasReference = data.contractName || data.contractId || data.vendorName || data.vendorId;
    const hasMetric = data.metric || data.threshold;

    return hasType || hasContent || hasReference || hasMetric;
  },
  'At least one of: type, alertType, reminderType, content, text, message, title, description, contractName, contractId, vendorName, vendorId, metric, or threshold must be provided',
);

/**
 * Context validation schema for notifications agent operations
 * Validates the context passed alongside process data
 */
export const NotificationContextSchema = z.object({
  /** Type of notification to generate */
  notificationType: NotificationTypeSchema.optional(),
  /** Event type that triggered the notification */
  eventType: z.string().max(100).optional(),
  /** Period for digest notifications */
  period: DigestPeriodSchema.optional(),
  /** Format for digest notifications */
  format: DigestFormatSchema.optional(),
  /** Role context for targeting */
  role: z.string().max(100).optional(),
  /** Enterprise ID for data isolation (security critical) */
  enterpriseId: OptionalUuidSchema,
  /** User ID performing the request */
  userId: OptionalUuidSchema,
  /** Task ID if part of a larger workflow */
  taskId: OptionalUuidSchema,
  /** Request ID for tracing */
  requestId: z.string().max(100).optional(),
  /** Whether this is a test/preview notification */
  isTest: z.boolean().default(false).optional(),
  /** Whether to actually send the notification or just generate it */
  dryRun: z.boolean().default(false).optional(),
  /** Priority override */
  priorityOverride: z.number().int().min(1).max(10).optional(),
  /** Severity override */
  severityOverride: SeveritySchema.optional(),
  /** Urgency override */
  urgencyOverride: UrgencySchema.optional(),
  /** Additional metadata */
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate notification agent process data input
 *
 * @param data - Raw input data to validate
 * @returns Validation result with success flag, validated data or errors
 *
 * @example
 * ```typescript
 * const result = validateNotificationInput({
 *   type: 'alert',
 *   alertType: 'contract_expiration',
 *   contractName: 'Service Agreement',
 *   daysUntil: 30,
 *   severity: 'medium',
 * });
 *
 * if (result.success) {
 *   // result.data is fully typed and validated
 *   console.log(result.data.contractName);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateNotificationInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof NotificationAgentProcessDataSchema>;
  errors?: string[];
} {
  try {
    const validated = NotificationAgentProcessDataSchema.parse(data);
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
 * Validate notification agent context
 *
 * @param context - Raw context object to validate
 * @returns Validation result with success flag, validated context or errors
 *
 * @example
 * ```typescript
 * const result = validateNotificationContext({
 *   notificationType: 'digest',
 *   period: 'weekly',
 *   format: 'executive',
 *   enterpriseId: '123e4567-e89b-12d3-a456-426614174000',
 * });
 * ```
 */
export function validateNotificationContext(context: unknown): {
  success: boolean;
  data?: z.infer<typeof NotificationContextSchema>;
  errors?: string[];
} {
  try {
    const validated = NotificationContextSchema.parse(context);
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
 * Validate a recipient object
 *
 * @param recipient - Recipient data to validate
 * @returns Validation result with validated recipient or error
 *
 * @example
 * ```typescript
 * const result = validateRecipient({
 *   userId: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   channels: ['email', 'in-app'],
 * });
 * ```
 */
export function validateRecipient(recipient: unknown): {
  success: boolean;
  data?: z.infer<typeof RecipientSchema>;
  errors?: string[];
} {
  try {
    const validated = RecipientSchema.parse(recipient);
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
 * Validate an escalation configuration
 *
 * @param escalation - Escalation level data to validate
 * @returns Validation result with validated escalation or error
 *
 * @example
 * ```typescript
 * const result = validateEscalation({
 *   level: 1,
 *   role: 'manager',
 *   afterMinutes: 30,
 * });
 * ```
 */
export function validateEscalation(escalation: unknown): {
  success: boolean;
  data?: z.infer<typeof EscalationLevelSchema>;
  errors?: string[];
} {
  try {
    const validated = EscalationLevelSchema.parse(escalation);
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
 * Validate a notification message
 *
 * @param message - Notification message data to validate
 * @returns Validation result with validated message or error
 */
export function validateNotificationMessage(message: unknown): {
  success: boolean;
  data?: z.infer<typeof NotificationMessageSchema>;
  errors?: string[];
} {
  try {
    const validated = NotificationMessageSchema.parse(message);
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
 * Validate a single UUID value
 *
 * @param value - Value to validate as UUID
 * @returns Validation result with value or error message
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

/**
 * Validate severity value
 *
 * @param value - Severity string to validate
 * @returns Validation result
 */
export function validateSeverity(value: unknown): {
  success: boolean;
  value?: z.infer<typeof SeveritySchema>;
  error?: string;
} {
  try {
    const validated = SeveritySchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid severity level. Must be: critical, high, medium, or low',
    };
  }
}

/**
 * Validate channel value
 *
 * @param value - Channel string to validate
 * @returns Validation result
 */
export function validateChannel(value: unknown): {
  success: boolean;
  value?: z.infer<typeof ChannelSchema>;
  error?: string;
} {
  try {
    const validated = ChannelSchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid channel. Must be: email, sms, in-app, slack, push, or phone',
    };
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
 * Sanitize notification subject line
 * Removes control characters, newlines, and limits length
 *
 * @param subject - Raw subject string to sanitize
 * @returns Sanitized subject string
 *
 * @example
 * ```typescript
 * const clean = sanitizeNotificationSubject('Alert:\nContract Expiring Soon!');
 * // Result: 'Alert: Contract Expiring Soon!'
 * ```
 */
export function sanitizeNotificationSubject(subject: string): string {
  if (!subject || typeof subject !== 'string') {
    return '';
  }

  // Remove all control characters including newlines for subject lines
  let sanitized = subject.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Remove potentially dangerous characters for display
  sanitized = sanitized.replace(/[<>]/g, '');

  // Normalize whitespace (collapse multiple spaces)
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Limit length (email subjects should be under 100 chars for best display)
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 252) + '...';
  }

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
 *   { type: 'alert', severity: 'high', content: 'text' },
 *   { notificationType: 'digest', severityOverride: 'low' }
 * );
 * // warnings: ['Notification type differs between data and context - using context.notificationType', ...]
 * ```
 */
export function detectInputConflicts(
  data: z.infer<typeof NotificationAgentProcessDataSchema>,
  context?: z.infer<typeof NotificationContextSchema>,
): string[] {
  const warnings: string[] = [];

  // Check for both content and text provided with different values
  if (data.content && data.text) {
    if (data.content !== data.text) {
      warnings.push('Both content and text provided with different values - using content');
    }
  }

  // Check for notification type mismatch
  if (data.type && context?.notificationType && data.type !== context.notificationType) {
    warnings.push('Notification type differs between data and context - using context.notificationType');
  }

  // Check for severity override conflict
  if (data.severity && context?.severityOverride && data.severity !== context.severityOverride) {
    warnings.push(`Severity override (${context.severityOverride}) will replace data severity (${data.severity})`);
  }

  // Check for alert type without alert notification type
  if (data.alertType && data.type && data.type !== 'alert') {
    warnings.push('AlertType provided but notification type is not "alert" - alertType may be ignored');
  }

  // Check for reminder type without reminder notification type
  if (data.reminderType && data.type && data.type !== 'reminder') {
    warnings.push('ReminderType provided but notification type is not "reminder" - reminderType may be ignored');
  }

  // Check for digest fields without digest type
  if ((data.digestPeriod || data.digestFormat) && data.type && data.type !== 'digest') {
    warnings.push('Digest fields provided but notification type is not "digest" - digest settings may be ignored');
  }

  // Check for escalation without high severity
  if (data.escalation?.length && data.severity && !['critical', 'high'].includes(data.severity)) {
    warnings.push('Escalation defined but severity is not critical/high - escalation may not trigger appropriately');
  }

  // Check for missing recipients with specific channels
  if (data.channels?.length && !data.recipients?.length && !data.assignedTo) {
    warnings.push('Channels specified but no recipients or assignedTo provided - notification may not be delivered');
  }

  // Check for phone channel without critical severity
  if (data.channels?.includes('phone') && data.severity && data.severity !== 'critical') {
    warnings.push('Phone channel selected for non-critical notification - phone notifications are typically reserved for critical alerts');
  }

  // Check for both title and subject
  if (data.title && data.subject && data.title !== data.subject) {
    warnings.push('Both title and subject provided with different values - using title');
  }

  // Check for both amount and value
  if (data.amount !== undefined && data.value !== undefined && data.amount !== data.value) {
    warnings.push('Both amount and value provided with different values - using amount');
  }

  // Check for contract notification without contract reference
  if (data.alertType?.includes('contract') && !data.contractName && !data.contractId) {
    warnings.push('Contract-related alert type without contract reference - notification may lack context');
  }

  // Check for vendor notification without vendor reference
  if (data.alertType === 'vendor_issue' && !data.vendorName && !data.vendorId) {
    warnings.push('Vendor issue alert without vendor reference - notification may lack context');
  }

  // Check for budget notification without budget reference
  if (data.alertType === 'budget_exceeded' && !data.budgetName && !data.budgetId) {
    warnings.push('Budget exceeded alert without budget reference - notification may lack context');
  }

  return warnings;
}

/**
 * Normalize channel list - removes duplicates and validates
 *
 * @param channels - Array of channel strings to normalize
 * @returns Normalized array of valid channels
 *
 * @example
 * ```typescript
 * const normalized = normalizeChannels(['email', 'EMAIL', 'sms', 'email', 'invalid']);
 * // Result: ['email', 'sms']
 * ```
 */
export function normalizeChannels(channels: string[]): z.infer<typeof ChannelSchema>[] {
  if (!channels || !Array.isArray(channels)) {
    return [];
  }

  const validChannels: z.infer<typeof ChannelSchema>[] = [];
  const seen = new Set<string>();

  for (const channel of channels) {
    if (typeof channel !== 'string') continue;

    const normalized = channel.toLowerCase().trim();

    // Skip if already seen
    if (seen.has(normalized)) continue;

    // Validate the channel
    const result = validateChannel(normalized);
    if (result.success && result.value) {
      validChannels.push(result.value);
      seen.add(normalized);
    }
  }

  return validChannels;
}

/**
 * Detect encoding issues (mojibake) in content
 * Mojibake occurs when text is decoded using the wrong character encoding
 *
 * @param content - Content to check for encoding issues
 * @returns Detection result with examples of problematic patterns
 */
export function detectEncodingIssues(content: string): {
  hasMojibake: boolean;
  examples: string[];
} {
  if (!content) {
    return { hasMojibake: false, examples: [] };
  }

  // Common mojibake patterns
  const mojibakePatterns = [
    /[\u00C3][\u00A0-\u00BF]/g, // UTF-8 decoded as Latin-1
    /\uFFFD{2,}/g,              // Multiple replacement characters
    /[\u00E2][\u00C2]/g,        // Double-encoded UTF-8
  ];

  const examples: string[] = [];
  let hasMojibake = false;

  for (const pattern of mojibakePatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      hasMojibake = true;
      examples.push(...matches.slice(0, 3));
    }
  }

  return {
    hasMojibake,
    examples: [...new Set(examples)].slice(0, 10),
  };
}

/**
 * Validate and sanitize a complete notification input object
 * Combines validation with sanitization for production use
 *
 * @param data - Raw input data
 * @returns Validation result with sanitized data or errors
 */
export function validateAndSanitizeNotificationInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof NotificationAgentProcessDataSchema>;
  errors?: string[];
  warnings?: string[];
} {
  // First validate
  const validationResult = validateNotificationInput(data);

  if (!validationResult.success) {
    return validationResult;
  }

  const validatedData = validationResult.data!;
  const warnings: string[] = [];

  // Sanitize content fields
  if (validatedData.content) {
    const encodingCheck = detectEncodingIssues(validatedData.content);
    if (encodingCheck.hasMojibake) {
      warnings.push(`Potential encoding issues detected in content: ${encodingCheck.examples.join(', ')}`);
    }
    validatedData.content = sanitizeContent(validatedData.content);
  }

  if (validatedData.text) {
    const encodingCheck = detectEncodingIssues(validatedData.text);
    if (encodingCheck.hasMojibake) {
      warnings.push(`Potential encoding issues detected in text: ${encodingCheck.examples.join(', ')}`);
    }
    validatedData.text = sanitizeContent(validatedData.text);
  }

  if (validatedData.message) {
    validatedData.message = sanitizeContent(validatedData.message);
  }

  // Sanitize title/subject
  if (validatedData.title) {
    validatedData.title = sanitizeNotificationSubject(validatedData.title);
  }
  if (validatedData.subject) {
    validatedData.subject = sanitizeNotificationSubject(validatedData.subject);
  }

  // Normalize channels if provided
  if (validatedData.channels) {
    const normalizedChannels = normalizeChannels(validatedData.channels);
    if (normalizedChannels.length !== validatedData.channels.length) {
      warnings.push('Some channels were normalized or removed as invalid');
    }
    validatedData.channels = normalizedChannels;
  }

  return {
    success: true,
    data: validatedData,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Infer notification type from alert/reminder type if not explicitly provided
 *
 * @param data - Validated notification input data
 * @returns Inferred notification type
 */
export function inferNotificationType(
  data: z.infer<typeof NotificationAgentProcessDataSchema>,
): z.infer<typeof NotificationTypeSchema> | undefined {
  if (data.type) {
    return data.type;
  }

  if (data.alertType) {
    return 'alert';
  }

  if (data.reminderType) {
    return 'reminder';
  }

  if (data.digestPeriod || data.digestFormat) {
    return 'digest';
  }

  return undefined;
}

/**
 * Determine urgency from severity and dates
 *
 * @param data - Validated notification input data
 * @returns Computed urgency level
 */
export function computeUrgency(
  data: z.infer<typeof NotificationAgentProcessDataSchema>,
): z.infer<typeof UrgencySchema> {
  // If daysOverdue is provided and positive, it's overdue
  if (data.daysOverdue !== undefined && data.daysOverdue > 0) {
    return 'overdue';
  }

  // Critical severity = immediate
  if (data.severity === 'critical') {
    return 'immediate';
  }

  // Check daysUntil for upcoming deadlines
  if (data.daysUntil !== undefined) {
    if (data.daysUntil <= 0) return 'overdue';
    if (data.daysUntil <= 1) return 'immediate';
    if (data.daysUntil <= 3) return 'urgent';
    if (data.daysUntil <= 7) return 'upcoming';
  }

  // High severity = urgent
  if (data.severity === 'high') {
    return 'urgent';
  }

  return 'standard';
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Validated notification agent input type */
export type ValidatedNotificationInput = z.infer<typeof NotificationAgentProcessDataSchema>;

/** Validated notification context type */
export type ValidatedNotificationContext = z.infer<typeof NotificationContextSchema>;

/** Notification type enum */
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/** Alert type enum */
export type AlertType = z.infer<typeof AlertTypeSchema>;

/** Reminder type enum */
export type ReminderType = z.infer<typeof ReminderTypeSchema>;

/** Severity level enum */
export type Severity = z.infer<typeof SeveritySchema>;

/** Channel enum */
export type Channel = z.infer<typeof ChannelSchema>;

/** Digest period enum */
export type DigestPeriod = z.infer<typeof DigestPeriodSchema>;

/** Digest format enum */
export type DigestFormat = z.infer<typeof DigestFormatSchema>;

/** Urgency level enum */
export type Urgency = z.infer<typeof UrgencySchema>;

/** Action item type enum */
export type ActionItemType = z.infer<typeof ActionItemTypeSchema>;

/** Recipient type */
export type Recipient = z.infer<typeof RecipientSchema>;

/** Escalation level type */
export type EscalationLevel = z.infer<typeof EscalationLevelSchema>;

/** Action item type */
export type ActionItem = z.infer<typeof ActionItemSchema>;

/** Notification message type */
export type NotificationMessage = z.infer<typeof NotificationMessageSchema>;

/** Schedule type */
export type Schedule = z.infer<typeof ScheduleSchema>;

/** Filter criteria type */
export type FilterCriteria = z.infer<typeof FilterCriteriaSchema>;
