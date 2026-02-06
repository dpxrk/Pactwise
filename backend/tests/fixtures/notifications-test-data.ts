/**
 * Test fixtures for Notifications Agent comprehensive tests
 *
 * Provides mock data generators, test inputs, and a mock Supabase client
 * for testing the Notifications Agent's various capabilities:
 * - Alert processing (8 alert types)
 * - Reminder processing (7 reminder types)
 * - Digest generation (3 formats)
 * - Notification routing and aggregation
 * - Escalation handling
 * - Alert fatigue detection
 */

import { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate a valid UUID for testing
 */
export function generateTestUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a mock alert
 */
export function generateMockAlert(options?: Partial<MockAlert>): MockAlert {
  const alertTypes: MockAlertType[] = [
    'contract_expiration',
    'budget_exceeded',
    'compliance_violation',
    'vendor_issue',
    'payment_due',
    'approval_required',
    'performance_alert',
    'general_alert',
  ];

  const severities: MockSeverity[] = ['critical', 'high', 'medium', 'low'];

  const defaultAlert: MockAlert = {
    id: generateTestUuid(),
    type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    title: `Test Alert ${Date.now()}`,
    description: 'Test alert description for unit testing',
    contractName: 'Test Contract',
    vendorName: 'Test Vendor',
    daysUntil: Math.floor(Math.random() * 30) + 1,
    value: Math.floor(Math.random() * 100000) + 1000,
    assignedTo: generateTestUuid(),
    createdAt: new Date().toISOString(),
    enterpriseId: generateTestUuid(),
  };

  return { ...defaultAlert, ...options };
}

/**
 * Generate a mock reminder
 */
export function generateMockReminder(options?: Partial<MockReminder>): MockReminder {
  const reminderTypes: MockReminderType[] = [
    'contract_renewal',
    'payment_reminder',
    'report_due',
    'review_scheduled',
    'training_due',
    'audit_preparation',
    'general_reminder',
  ];

  const now = new Date();
  const daysOffset = Math.floor(Math.random() * 60) - 10; // -10 to +50 days
  const dueDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);

  const defaultReminder: MockReminder = {
    id: generateTestUuid(),
    type: reminderTypes[Math.floor(Math.random() * reminderTypes.length)],
    title: `Test Reminder ${Date.now()}`,
    description: 'Test reminder description for unit testing',
    dueDate: dueDate.toISOString(),
    daysUntil: daysOffset,
    isOverdue: daysOffset < 0,
    daysOverdue: daysOffset < 0 ? Math.abs(daysOffset) : 0,
    contractName: 'Test Contract',
    vendorName: 'Test Vendor',
    amount: Math.floor(Math.random() * 50000) + 1000,
    assignedTo: generateTestUuid(),
    enterpriseId: generateTestUuid(),
  };

  return { ...defaultReminder, ...options };
}

/**
 * Generate mock digest data
 */
export function generateMockDigest(options?: Partial<MockDigestInput>): MockDigestInput {
  const defaultDigest: MockDigestInput = {
    period: 'daily',
    format: 'standard',
    role: 'manager',
    enterpriseId: generateTestUuid(),
    userId: generateTestUuid(),
    includeMetrics: true,
    includeTrends: true,
  };

  return { ...defaultDigest, ...options };
}

/**
 * Generate a mock notification user
 */
export function generateMockNotificationUser(options?: Partial<MockNotificationUser>): MockNotificationUser {
  const roles = ['executive', 'manager', 'analyst', 'compliance_officer', 'legal_team', 'finance_team'];

  const defaultUser: MockNotificationUser = {
    id: generateTestUuid(),
    name: `User ${Math.floor(Math.random() * 1000)}`,
    email: `user${Date.now()}@test.com`,
    role: roles[Math.floor(Math.random() * roles.length)],
    channels: ['email', 'in-app'],
    enterpriseId: generateTestUuid(),
    preferences: {
      digestFrequency: 'daily',
      quietHoursEnabled: true,
      quietHoursStart: 22,
      quietHoursEnd: 7,
    },
  };

  return { ...defaultUser, ...options };
}

/**
 * Generate a mock escalation chain
 */
export function generateMockEscalationChain(levels: number = 3): MockEscalationLevel[] {
  const roles = ['manager', 'director', 'executive', 'ceo', 'board'];

  return Array.from({ length: levels }, (_, i) => ({
    level: i + 1,
    role: roles[Math.min(i, roles.length - 1)],
    afterMinutes: 15 * Math.pow(2, i), // 15, 30, 60, 120, ...
    userId: i === 0 ? generateTestUuid() : undefined,
    channels: i === levels - 1 ? ['email', 'sms', 'phone'] : ['email', 'slack'],
  }));
}

/**
 * Generate mock routing rules
 */
export function generateMockRoutingRules(): MockRoutingRule[] {
  return [
    {
      name: 'Suppress low priority info',
      condition: { severity: 'low', type: 'info' },
      action: 'suppress',
      reason: 'Low priority informational',
    },
    {
      name: 'Aggregate vendor issues',
      condition: { type: 'vendor_issue', severity: ['low', 'medium'] },
      aggregate: true,
      aggregateKey: 'vendor_daily',
      channels: ['email'],
    },
    {
      name: 'Escalate critical',
      condition: { severity: 'critical' },
      recipients: [{ role: 'executive' }],
      channels: ['email', 'sms', 'phone'],
      priority: 'immediate',
    },
    {
      name: 'Route compliance to legal',
      condition: { type: 'compliance_violation' },
      recipients: [{ role: 'legal_team' }, { role: 'compliance_officer' }],
      priority: 'high',
    },
    {
      name: 'High severity to managers',
      condition: { severity: 'high' },
      recipients: [{ role: 'manager' }],
      channels: ['email', 'slack', 'push'],
      priority: 'high',
    },
  ];
}

// =============================================================================
// MOCK SUPABASE CLIENT
// =============================================================================

/**
 * Create a chainable mock Supabase client for testing
 */
export function createMockSupabaseClient(
  overrides?: Partial<MockSupabaseOverrides>,
): MockSupabaseClient {
  const defaultData = {
    users: [generateMockNotificationUser(), generateMockNotificationUser()],
    alerts: [generateMockAlert(), generateMockAlert(), generateMockAlert()],
    reminders: [generateMockReminder(), generateMockReminder()],
    routingRules: generateMockRoutingRules(),
    enterpriseSettings: { id: generateTestUuid(), name: 'Test Enterprise' },
    notificationPreferences: {
      digestFrequency: 'daily',
      quietHoursEnabled: true,
    },
  };

  const data = { ...defaultData, ...overrides };

  // Create a proxy-based chainable mock
  const createChainableQuery = (tableData: unknown[] | unknown) => {
    const state = {
      data: tableData,
      error: null as Error | null,
    };

    const chain: Record<string, (...args: unknown[]) => unknown> = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      like: () => chain,
      ilike: () => chain,
      is: () => chain,
      in: () => chain,
      contains: () => chain,
      containedBy: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: () => Promise.resolve({ data: Array.isArray(state.data) ? state.data[0] : state.data, error: state.error }),
      maybeSingle: () => Promise.resolve({ data: Array.isArray(state.data) ? state.data[0] : state.data, error: state.error }),
      insert: () => Promise.resolve({ data: state.data, error: state.error }),
      update: () => chain,
      delete: () => chain,
      then: (resolve: (value: { data: unknown; error: Error | null }) => void) =>
        Promise.resolve({ data: state.data, error: state.error }).then(resolve),
    };

    return chain;
  };

  const mockClient = {
    from: (table: string) => {
      switch (table) {
        case 'users':
        case 'profiles':
          return createChainableQuery(data.users);
        case 'alerts':
        case 'notifications':
          return createChainableQuery(data.alerts);
        case 'reminders':
          return createChainableQuery(data.reminders);
        case 'routing_rules':
        case 'notification_rules':
          return createChainableQuery(data.routingRules);
        case 'enterprise_settings':
          return createChainableQuery(data.enterpriseSettings);
        case 'notification_preferences':
          return createChainableQuery(data.notificationPreferences);
        case 'agent_tasks':
          return createChainableQuery([]);
        default:
          return createChainableQuery([]);
      }
    },
    rpc: (fnName: string, params?: Record<string, unknown>) => {
      switch (fnName) {
        case 'send_smart_notification':
          return Promise.resolve({
            data: {
              recipients_count: 3,
              severity: params?.p_event_data?.severity || 'medium',
              notifications_sent: 3,
              escalation_scheduled: params?.p_event_data?.severity === 'critical',
            },
            error: null,
          });
        case 'get_notification_recipients':
          return Promise.resolve({
            data: data.users,
            error: null,
          });
        case 'get_digest_data':
          return Promise.resolve({
            data: {
              alerts: { critical: 2, high: 5, medium: 12, low: 8 },
              reminders: { overdue: 3, dueSoon: 7, upcoming: 15 },
              insights: { generated: 10, actionable: 6 },
              metrics: { contractsProcessed: 15, vendorsOnboarded: 2 },
            },
            error: null,
          });
        case 'acknowledge_notification':
          return Promise.resolve({
            data: { acknowledged: true, acknowledgedAt: new Date().toISOString() },
            error: null,
          });
        case 'snooze_reminder':
          return Promise.resolve({
            data: { snoozed: true, snoozeUntil: new Date(Date.now() + 3600000).toISOString() },
            error: null,
          });
        default:
          return Promise.resolve({ data: null, error: null });
      }
    },
  } as unknown as MockSupabaseClient;

  return mockClient;
}

/**
 * Create a mock Supabase client that returns errors
 */
export function createErrorMockSupabaseClient(errorMessage: string): MockSupabaseClient {
  const createErrorChain = () => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      single: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
      maybeSingle: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
      insert: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
      update: () => chain,
      delete: () => chain,
      then: (resolve: (value: { data: unknown; error: Error | null }) => void) =>
        Promise.resolve({ data: null, error: new Error(errorMessage) }).then(resolve),
    };
    return chain;
  };

  return {
    from: () => createErrorChain(),
    rpc: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
  } as unknown as MockSupabaseClient;
}

// =============================================================================
// TYPES
// =============================================================================

export type MockAlertType =
  | 'contract_expiration'
  | 'budget_exceeded'
  | 'compliance_violation'
  | 'vendor_issue'
  | 'payment_due'
  | 'approval_required'
  | 'performance_alert'
  | 'general_alert';

export type MockReminderType =
  | 'contract_renewal'
  | 'payment_reminder'
  | 'report_due'
  | 'review_scheduled'
  | 'training_due'
  | 'audit_preparation'
  | 'general_reminder';

export type MockSeverity = 'critical' | 'high' | 'medium' | 'low';

export type MockChannel = 'email' | 'sms' | 'in-app' | 'slack' | 'push' | 'phone';

export interface MockAlert {
  id: string;
  type: MockAlertType;
  severity: MockSeverity;
  title: string;
  description: string;
  contractName?: string;
  contractId?: string;
  vendorName?: string;
  vendorId?: string;
  daysUntil?: number;
  value?: number;
  amount?: number;
  assignedTo?: string;
  createdAt: string;
  enterpriseId: string;
  category?: string;
  overagePercent?: number;
  currentSpend?: number;
  budget?: number;
  regulation?: string;
  issue?: string;
  performanceScore?: number;
  dueDate?: string;
  terms?: string;
  itemType?: string;
  itemName?: string;
  requester?: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  trend?: string;
}

export interface MockReminder {
  id: string;
  type: MockReminderType;
  title: string;
  description: string;
  dueDate: string;
  daysUntil: number;
  isOverdue: boolean;
  daysOverdue: number;
  contractName?: string;
  vendorName?: string;
  amount?: number;
  assignedTo?: string;
  enterpriseId: string;
  reportName?: string;
  reviewType?: string;
  trainingName?: string;
  auditType?: string;
}

export interface MockDigestInput {
  period: 'daily' | 'weekly' | 'monthly';
  format: 'standard' | 'executive' | 'visual' | 'detailed' | 'comprehensive';
  role?: string;
  enterpriseId: string;
  userId: string;
  includeMetrics?: boolean;
  includeTrends?: boolean;
}

export interface MockNotificationUser {
  id: string;
  name: string;
  email: string;
  role: string;
  channels: MockChannel[];
  enterpriseId: string;
  preferences: {
    digestFrequency: 'daily' | 'weekly' | 'monthly';
    quietHoursEnabled: boolean;
    quietHoursStart: number;
    quietHoursEnd: number;
  };
}

export interface MockEscalationLevel {
  level: number;
  role: string;
  afterMinutes: number;
  userId?: string;
  channels?: MockChannel[];
  message?: string;
}

export interface MockRoutingRule {
  name: string;
  condition: Record<string, unknown>;
  action?: string;
  reason?: string;
  aggregate?: boolean;
  aggregateKey?: string;
  recipients?: Array<{ role?: string; userId?: string }>;
  channels?: MockChannel[];
  priority?: string;
}

export interface MockSupabaseOverrides {
  users?: MockNotificationUser[];
  alerts?: MockAlert[];
  reminders?: MockReminder[];
  routingRules?: MockRoutingRule[];
  enterpriseSettings?: { id: string; name: string } | null;
  notificationPreferences?: Record<string, unknown>;
}

export type MockSupabaseClient = SupabaseClient;

// =============================================================================
// VALID INPUT TEST DATA - ALERTS
// =============================================================================

const testEnterpriseId = generateTestUuid();
const testUserId = generateTestUuid();
const testContractId = generateTestUuid();
const testVendorId = generateTestUuid();

export const VALID_ALERT_INPUTS = {
  contractExpiration: {
    type: 'alert' as const,
    alertType: 'contract_expiration' as const,
    severity: 'high' as const,
    contractName: 'Vendor Service Agreement',
    contractId: testContractId,
    daysUntil: 7,
    title: 'Contract Expiring Soon',
    description: 'Contract requires renewal action',
  },
  budgetExceeded: {
    type: 'alert' as const,
    alertType: 'budget_exceeded' as const,
    severity: 'critical' as const,
    category: 'Technology',
    overagePercent: 15,
    currentSpend: 115000,
    budget: 100000,
    title: 'Budget Exceeded',
    description: 'Technology budget has been exceeded',
  },
  complianceViolation: {
    type: 'alert' as const,
    alertType: 'compliance_violation' as const,
    severity: 'critical' as const,
    regulation: 'SOC2',
    complianceFramework: 'SOC2',
    description: 'Access control violation detected',
    riskLevel: 'high' as const,
  },
  vendorIssue: {
    type: 'alert' as const,
    alertType: 'vendor_issue' as const,
    severity: 'medium' as const,
    vendorName: 'Acme Corp',
    vendorId: testVendorId,
    issue: 'Delivery delays',
    performanceScore: 0.65,
  },
  paymentDue: {
    type: 'alert' as const,
    alertType: 'payment_due' as const,
    severity: 'medium' as const,
    vendorName: 'Cloud Services Inc',
    amount: 25000,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    terms: 'Net 30',
  },
  approvalRequired: {
    type: 'alert' as const,
    alertType: 'approval_required' as const,
    severity: 'high' as const,
    itemType: 'Contract',
    itemName: 'New Vendor Agreement',
    value: 75000,
    requester: 'John Smith',
    approverId: testUserId,
  },
  performanceAlert: {
    type: 'alert' as const,
    alertType: 'performance_alert' as const,
    severity: 'high' as const,
    metric: 'SLA Compliance',
    currentValue: 92,
    threshold: 95,
    trend: 'declining',
  },
  generalAlert: {
    type: 'alert' as const,
    alertType: 'general_alert' as const,
    severity: 'low' as const,
    title: 'System Maintenance',
    description: 'Scheduled maintenance window',
  },
};

// =============================================================================
// VALID INPUT TEST DATA - REMINDERS
// =============================================================================

export const VALID_REMINDER_INPUTS = {
  contractRenewal: {
    type: 'reminder' as const,
    reminderType: 'contract_renewal' as const,
    contractName: 'Annual Service Agreement',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: testUserId,
  },
  paymentReminder: {
    type: 'reminder' as const,
    reminderType: 'payment_reminder' as const,
    vendorName: 'Supplier Corp',
    amount: 12500,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  reportDue: {
    type: 'reminder' as const,
    reminderType: 'report_due' as const,
    reportName: 'Quarterly Compliance Report',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  reviewScheduled: {
    type: 'reminder' as const,
    reminderType: 'review_scheduled' as const,
    reviewType: 'Annual Vendor Review',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  trainingDue: {
    type: 'reminder' as const,
    reminderType: 'training_due' as const,
    trainingName: 'Compliance Certification',
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  auditPreparation: {
    type: 'reminder' as const,
    reminderType: 'audit_preparation' as const,
    auditType: 'SOC2 Type II',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// =============================================================================
// VALID INPUT TEST DATA - DIGESTS
// =============================================================================

export const VALID_DIGEST_INPUTS = {
  dailyStandard: {
    period: 'daily' as const,
    format: 'standard' as const,
  },
  weeklyExecutive: {
    period: 'weekly' as const,
    format: 'executive' as const,
    role: 'executive',
  },
  monthlyComprehensive: {
    period: 'monthly' as const,
    format: 'comprehensive' as const,
    role: 'analyst',
  },
  dailyDetailed: {
    period: 'daily' as const,
    format: 'detailed' as const,
    role: 'manager',
  },
  weeklyVisual: {
    period: 'weekly' as const,
    format: 'visual' as const,
  },
};

// =============================================================================
// VALID NOTIFICATION CONTEXT
// =============================================================================

export const VALID_NOTIFICATION_CONTEXT = {
  alertContext: {
    notificationType: 'alert' as const,
    eventType: 'contract_expiring',
    enterpriseId: testEnterpriseId,
    userId: testUserId,
  },
  reminderContext: {
    notificationType: 'reminder' as const,
    enterpriseId: testEnterpriseId,
    userId: testUserId,
  },
  digestContext: {
    notificationType: 'digest' as const,
    period: 'daily' as const,
    format: 'executive' as const,
    enterpriseId: testEnterpriseId,
    userId: testUserId,
  },
  routingContext: {
    enterpriseId: testEnterpriseId,
    userId: testUserId,
  },
};

// =============================================================================
// INVALID INPUT TEST DATA
// =============================================================================

export const INVALID_NOTIFICATION_INPUTS = {
  emptyObject: {},
  invalidNotificationType: {
    type: 'invalid_type',
  },
  invalidSeverity: {
    type: 'alert',
    severity: 'super_critical',
  },
  invalidAlertType: {
    type: 'alert',
    alertType: 'unknown_alert',
  },
  invalidReminderType: {
    type: 'reminder',
    reminderType: 'unknown_reminder',
  },
  invalidChannel: {
    type: 'alert',
    channels: ['telepathy'],
  },
  invalidUuid: {
    type: 'alert',
    contractId: 'not-a-uuid',
  },
  negativeAmount: {
    type: 'alert',
    amount: -1000,
  },
  futureNegativeDays: {
    type: 'reminder',
    daysUntil: -100,
    dueDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
  },
  invalidEmail: {
    recipients: [{ userId: testUserId, email: 'not-an-email' }],
  },
  invalidPhone: {
    recipients: [{ userId: testUserId, phone: '123' }],
  },
  invalidPriority: {
    recipients: [{ userId: testUserId, priority: 100 }],
  },
  invalidDigestPeriod: {
    period: 'hourly',
  },
  invalidDigestFormat: {
    format: 'minimal',
  },
  tooManyRecipients: {
    recipients: Array(101).fill({ userId: generateTestUuid() }),
  },
  tooManyActions: {
    actions: Array(11).fill({ action: 'test', label: 'Test' }),
  },
  tooManyEscalationLevels: {
    escalation: Array(11).fill({ level: 1, role: 'manager', afterMinutes: 15 }),
  },
};

export const INVALID_NOTIFICATION_CONTEXT = {
  invalidEnterpriseId: {
    enterpriseId: 'not-a-uuid',
    userId: testUserId,
  },
  invalidUserId: {
    enterpriseId: testEnterpriseId,
    userId: 'not-a-uuid',
  },
  invalidNotificationType: {
    notificationType: 'invalid',
    enterpriseId: testEnterpriseId,
  },
  invalidPeriod: {
    notificationType: 'digest',
    period: 'invalid',
  },
  invalidFormat: {
    notificationType: 'digest',
    format: 'invalid',
  },
  invalidPriorityOverride: {
    priorityOverride: 100,
  },
  invalidSeverityOverride: {
    severityOverride: 'super_critical',
  },
};

// =============================================================================
// ERROR SIMULATION DATA
// =============================================================================

export const ERROR_SCENARIOS = {
  databaseError: {
    error: new Error('Database connection failed: ECONNREFUSED'),
    category: 'database',
    isRetryable: true,
  },
  validationError: {
    error: new Error('Validation failed: Invalid notification type'),
    category: 'validation',
    isRetryable: false,
  },
  timeoutError: {
    error: new Error('Request timed out after 30000ms'),
    category: 'timeout',
    isRetryable: true,
  },
  deliveryError: {
    error: new Error('Notification delivery failed: SMTP connection refused'),
    category: 'delivery',
    isRetryable: true,
  },
  templateError: {
    error: new Error('Template rendering failed: Missing variable "contractName"'),
    category: 'template',
    isRetryable: false,
  },
  rateLimitError: {
    error: new Error('Rate limit exceeded: Too many requests (429)'),
    category: 'rate_limiting',
    isRetryable: true,
  },
  routingError: {
    error: new Error('Routing failed: No recipients found'),
    category: 'delivery',
    isRetryable: true,
  },
  escalationError: {
    error: new Error('Escalation failed: Invalid escalation chain'),
    category: 'validation',
    isRetryable: false,
  },
};

// =============================================================================
// EDGE CASE TEST DATA
// =============================================================================

export const EDGE_CASE_DATA = {
  // High volume scenarios
  highVolumeAlerts: Array.from({ length: 100 }, (_, i) =>
    generateMockAlert({ title: `High Volume Alert ${i}`, severity: i % 4 === 0 ? 'critical' : 'low' })
  ),
  highVolumeReminders: Array.from({ length: 50 }, (_, i) =>
    generateMockReminder({ title: `High Volume Reminder ${i}` })
  ),

  // Empty/minimal scenarios
  emptyNotificationList: [],
  singleNotification: [generateMockAlert()],
  noRecipients: {
    ...generateMockAlert(),
    assignedTo: undefined,
  },

  // Boundary conditions
  alertDueToday: generateMockAlert({ daysUntil: 0, severity: 'critical' }),
  alertDueTomorrow: generateMockAlert({ daysUntil: 1, severity: 'high' }),
  alertOverdue: generateMockAlert({ daysUntil: -5, severity: 'critical' }),
  reminderOverdue: generateMockReminder({
    daysUntil: -10,
    isOverdue: true,
    daysOverdue: 10,
  }),
  reminderUrgent: generateMockReminder({
    daysUntil: 1,
    isOverdue: false,
    daysOverdue: 0,
  }),
  reminderFarFuture: generateMockReminder({
    daysUntil: 90,
    isOverdue: false,
    daysOverdue: 0,
  }),

  // All severity levels
  allSeverities: [
    generateMockAlert({ severity: 'critical' }),
    generateMockAlert({ severity: 'high' }),
    generateMockAlert({ severity: 'medium' }),
    generateMockAlert({ severity: 'low' }),
  ],

  // All alert types
  allAlertTypes: [
    generateMockAlert({ type: 'contract_expiration' }),
    generateMockAlert({ type: 'budget_exceeded' }),
    generateMockAlert({ type: 'compliance_violation' }),
    generateMockAlert({ type: 'vendor_issue' }),
    generateMockAlert({ type: 'payment_due' }),
    generateMockAlert({ type: 'approval_required' }),
    generateMockAlert({ type: 'performance_alert' }),
    generateMockAlert({ type: 'general_alert' }),
  ],

  // All reminder types
  allReminderTypes: [
    generateMockReminder({ type: 'contract_renewal' }),
    generateMockReminder({ type: 'payment_reminder' }),
    generateMockReminder({ type: 'report_due' }),
    generateMockReminder({ type: 'review_scheduled' }),
    generateMockReminder({ type: 'training_due' }),
    generateMockReminder({ type: 'audit_preparation' }),
    generateMockReminder({ type: 'general_reminder' }),
  ],

  // Digest edge cases
  emptyDigestData: {
    alerts: { critical: 0, high: 0, medium: 0, low: 0, items: [] },
    reminders: { overdue: 0, dueSoon: 0, upcoming: 0, items: [] },
    insights: { generated: 0, actionable: 0, categories: [] },
    metrics: { contractsProcessed: 0, vendorsOnboarded: 0, savingsIdentified: 0, complianceScore: 0 },
  },
  criticalOnlyDigest: {
    alerts: { critical: 5, high: 0, medium: 0, low: 0, items: [{ type: 'compliance_violation', count: 5, severity: 'critical' }] },
    reminders: { overdue: 3, dueSoon: 0, upcoming: 0, items: [] },
    insights: { generated: 1, actionable: 1, categories: ['risk_mitigation'] },
    metrics: { contractsProcessed: 0, vendorsOnboarded: 0, savingsIdentified: 0, complianceScore: 0.5 },
  },

  // Escalation edge cases
  singleLevelEscalation: generateMockEscalationChain(1),
  maxLevelEscalation: generateMockEscalationChain(5),
  immediateEscalation: [{
    level: 1,
    role: 'executive',
    afterMinutes: 0,
    channels: ['email', 'sms', 'phone'],
  }],

  // Unicode and special characters
  unicodeContent: generateMockAlert({
    title: 'Contrato de Renovación 契約更新',
    description: 'Émojis: 🚨 ⚠️ ✅ 日本語テスト',
  }),
  specialCharacters: generateMockAlert({
    title: 'Alert: <script>test</script> & "quotes"',
    description: 'Contains HTML entities: &amp; &lt; &gt;',
  }),

  // Large values
  largeAmount: generateMockAlert({
    value: 999999999999,
    amount: 999999999999,
  }),
  longTitle: generateMockAlert({
    title: 'A'.repeat(255),
    description: 'B'.repeat(10000),
  }),
};

// =============================================================================
// CONFIGURATION TEST DATA
// =============================================================================

export const CONFIG_TEST_DATA = {
  defaultConfig: {
    criticalEscalationMinutes: 15,
    highEscalationMinutes: 60,
    mediumEscalationMinutes: 240,
    urgentReminderDays: 1,
    upcomingReminderDays: 7,
    advanceReminderDays: 30,
    dailyDigestHour: 8,
    weeklyDigestDay: 1,
    maxItemsPerDigest: 50,
    maxAlertsPerHour: 10,
    maxRemindersPerDay: 20,
    fatigueThresholdPerDay: 15,
    criticalChannels: ['email', 'sms', 'phone'],
    highChannels: ['email', 'slack', 'push'],
    defaultChannels: ['email', 'in-app'],
    deliveryTimeoutMs: 30000,
    maxRetryAttempts: 3,
    baseRetryDelayMs: 1000,
    maxRetryDelayMs: 10000,
    enableSmartRouting: true,
    enableFatigueDetection: true,
    enableGracefulDegradation: true,
    enableAggregation: true,
    enableAutoEscalation: true,
  },
  validOverrides: {
    criticalEscalationMinutes: 10,
    maxAlertsPerHour: 20,
    enableSmartRouting: false,
  },
  invalidOverrides: {
    criticalEscalationMinutes: -5,
    maxAlertsPerHour: 1000,
    enableSmartRouting: 'maybe',
  },
  thresholdViolations: {
    // urgentReminderDays > upcomingReminderDays
    urgentReminderDays: 10,
    upcomingReminderDays: 5,
    // criticalEscalationMinutes > highEscalationMinutes
    criticalEscalationMinutes: 120,
    highEscalationMinutes: 60,
    // baseRetryDelayMs > maxRetryDelayMs
    baseRetryDelayMs: 15000,
    maxRetryDelayMs: 10000,
  },
};
