/**
 * Comprehensive test suite for Notifications Agent
 *
 * Tests input validation, configuration, error handling, and agent processing.
 * Covers alert processing, reminder processing, digest generation,
 * notification routing, escalation handling, and fatigue detection.
 *
 * @module NotificationsAgentComprehensiveTests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateNotificationInput,
  validateNotificationContext,
  validateRecipient,
  validateEscalation,
  validateNotificationMessage,
  validateUuid,
  validateSeverity,
  validateChannel,
  sanitizeContent,
  sanitizeNotificationSubject,
  detectInputConflicts,
  normalizeChannels,
  detectEncodingIssues,
  validateAndSanitizeNotificationInput,
  inferNotificationType,
  computeUrgency,
} from '../supabase/functions/local-agents/schemas/notifications';
import {
  NotificationsConfigSchema,
  DEFAULT_NOTIFICATIONS_CONFIG,
  getDefaultNotificationsConfig,
  clearNotificationsConfigCache,
  validateConfigOverride,
  validateConfigThresholds,
  isUrgent,
  isUpcoming,
  isAdvanceNotice,
  getReminderCategory,
  shouldEscalate,
  getEscalationTimeline,
  assessFatigue,
  getChannelsForSeverity,
  isQuietHours,
  canBypassQuietHours,
  isRateLimitExceeded,
  getRemainingQuota,
  shouldAggregate,
  getAggregationWindowMs,
  calculateRetryDelay,
  canRetry,
  validateAndLogConfigWarnings,
} from '../supabase/functions/local-agents/config/notifications-config';
import {
  generateTestUuid,
  createMockSupabaseClient,
  createErrorMockSupabaseClient,
  generateMockAlert,
  generateMockReminder,
  generateMockDigest,
  generateMockNotificationUser,
  generateMockEscalationChain,
  generateMockRoutingRules,
  VALID_ALERT_INPUTS,
  VALID_REMINDER_INPUTS,
  VALID_DIGEST_INPUTS,
  VALID_NOTIFICATION_CONTEXT,
  INVALID_NOTIFICATION_INPUTS,
  INVALID_NOTIFICATION_CONTEXT,
  ERROR_SCENARIOS,
  EDGE_CASE_DATA,
  CONFIG_TEST_DATA,
} from './fixtures/notifications-test-data';

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe('Notifications Agent Input Validation', () => {
  describe('validateNotificationInput', () => {
    it('should accept valid contract expiration alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.contractExpiration);
      expect(result.success).toBe(true);
      expect(result.data?.alertType).toBe('contract_expiration');
      expect(result.data?.contractName).toBe('Vendor Service Agreement');
    });

    it('should accept valid budget exceeded alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.budgetExceeded);
      expect(result.success).toBe(true);
      expect(result.data?.alertType).toBe('budget_exceeded');
      expect(result.data?.severity).toBe('critical');
    });

    it('should accept valid compliance violation alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.complianceViolation);
      expect(result.success).toBe(true);
      expect(result.data?.alertType).toBe('compliance_violation');
    });

    it('should accept valid vendor issue alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.vendorIssue);
      expect(result.success).toBe(true);
      expect(result.data?.vendorName).toBe('Acme Corp');
    });

    it('should accept valid payment due alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.paymentDue);
      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(25000);
    });

    it('should accept valid approval required alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.approvalRequired);
      expect(result.success).toBe(true);
      expect(result.data?.value).toBe(75000);
    });

    it('should accept valid performance alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.performanceAlert);
      expect(result.success).toBe(true);
      expect(result.data?.metric).toBe('SLA Compliance');
      expect(result.data?.threshold).toBe(95);
    });

    it('should accept valid general alert input', () => {
      const result = validateNotificationInput(VALID_ALERT_INPUTS.generalAlert);
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('System Maintenance');
    });

    it('should accept valid contract renewal reminder input', () => {
      const result = validateNotificationInput(VALID_REMINDER_INPUTS.contractRenewal);
      expect(result.success).toBe(true);
      expect(result.data?.contractName).toBe('Annual Service Agreement');
    });

    it('should accept valid payment reminder input', () => {
      const result = validateNotificationInput(VALID_REMINDER_INPUTS.paymentReminder);
      expect(result.success).toBe(true);
      expect(result.data?.vendorName).toBe('Supplier Corp');
    });

    it('should accept valid report due reminder input', () => {
      const result = validateNotificationInput(VALID_REMINDER_INPUTS.reportDue);
      expect(result.success).toBe(true);
    });

    it('should accept valid review scheduled reminder input', () => {
      const result = validateNotificationInput(VALID_REMINDER_INPUTS.reviewScheduled);
      expect(result.success).toBe(true);
    });

    it('should accept valid training due reminder input', () => {
      const result = validateNotificationInput(VALID_REMINDER_INPUTS.trainingDue);
      expect(result.success).toBe(true);
    });

    it('should accept valid audit preparation reminder input', () => {
      const result = validateNotificationInput(VALID_REMINDER_INPUTS.auditPreparation);
      expect(result.success).toBe(true);
    });

    it('should reject empty object', () => {
      const result = validateNotificationInput(INVALID_NOTIFICATION_INPUTS.emptyObject);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject input with negative amount', () => {
      const result = validateNotificationInput(INVALID_NOTIFICATION_INPUTS.negativeAmount);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should accept input with all optional fields', () => {
      const fullInput = {
        type: 'alert' as const,
        alertType: 'contract_expiration' as const,
        severity: 'high' as const,
        contractName: 'Full Alert',
        daysUntil: 7,
        amount: 50000,
        title: 'Full Alert Test',
        description: 'Testing all fields',
        channels: ['email' as const, 'sms' as const],
        tags: ['urgent', 'contract'],
      };
      const result = validateNotificationInput(fullInput);
      expect(result.success).toBe(true);
      expect(result.data?.tags).toEqual(['urgent', 'contract']);
    });
  });

  describe('validateNotificationContext', () => {
    it('should accept valid alert context', () => {
      const result = validateNotificationContext(VALID_NOTIFICATION_CONTEXT.alertContext);
      expect(result.success).toBe(true);
      expect(result.data?.notificationType).toBe('alert');
      expect(result.data?.eventType).toBe('contract_expiring');
    });

    it('should accept valid reminder context', () => {
      const result = validateNotificationContext(VALID_NOTIFICATION_CONTEXT.reminderContext);
      expect(result.success).toBe(true);
      expect(result.data?.notificationType).toBe('reminder');
    });

    it('should accept valid digest context', () => {
      const result = validateNotificationContext(VALID_NOTIFICATION_CONTEXT.digestContext);
      expect(result.success).toBe(true);
      expect(result.data?.notificationType).toBe('digest');
      expect(result.data?.format).toBe('executive');
    });

    it('should accept empty context', () => {
      const result = validateNotificationContext({});
      expect(result.success).toBe(true);
    });

    it('should accept routing context without notification type', () => {
      const result = validateNotificationContext(VALID_NOTIFICATION_CONTEXT.routingContext);
      expect(result.success).toBe(true);
    });

    it('should reject context with extra unrecognized fields (strict mode)', () => {
      const result = validateNotificationContext({
        ...VALID_NOTIFICATION_CONTEXT.alertContext,
        extraField: 'not allowed',
      });
      expect(result.success).toBe(false);
    });

    it('should accept context with dryRun flag', () => {
      const result = validateNotificationContext({
        notificationType: 'alert',
        dryRun: true,
      });
      expect(result.success).toBe(true);
      expect(result.data?.dryRun).toBe(true);
    });

    it('should accept context with severity override', () => {
      const result = validateNotificationContext({
        notificationType: 'alert',
        severityOverride: 'critical',
      });
      expect(result.success).toBe(true);
      expect(result.data?.severityOverride).toBe('critical');
    });
  });

  describe('validateUuid', () => {
    it('should accept valid UUID', () => {
      const result = validateUuid(generateTestUuid());
      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
    });

    it('should reject invalid UUID format', () => {
      const result = validateUuid('not-a-valid-uuid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid UUID format');
    });

    it('should reject non-string values', () => {
      const result = validateUuid(12345);
      expect(result.success).toBe(false);
    });

    it('should reject null values', () => {
      const result = validateUuid(null);
      expect(result.success).toBe(false);
    });
  });

  describe('validateSeverity', () => {
    it('should accept critical severity', () => {
      const result = validateSeverity('critical');
      expect(result.success).toBe(true);
      expect(result.value).toBe('critical');
    });

    it('should accept high severity', () => {
      const result = validateSeverity('high');
      expect(result.success).toBe(true);
    });

    it('should accept medium severity', () => {
      const result = validateSeverity('medium');
      expect(result.success).toBe(true);
    });

    it('should accept low severity', () => {
      const result = validateSeverity('low');
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const result = validateSeverity('super_critical');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid severity');
    });
  });

  describe('validateChannel', () => {
    it('should accept email channel', () => {
      const result = validateChannel('email');
      expect(result.success).toBe(true);
      expect(result.value).toBe('email');
    });

    it('should accept sms channel', () => {
      const result = validateChannel('sms');
      expect(result.success).toBe(true);
    });

    it('should accept in-app channel', () => {
      const result = validateChannel('in-app');
      expect(result.success).toBe(true);
    });

    it('should accept slack channel', () => {
      const result = validateChannel('slack');
      expect(result.success).toBe(true);
    });

    it('should accept push channel', () => {
      const result = validateChannel('push');
      expect(result.success).toBe(true);
    });

    it('should accept phone channel', () => {
      const result = validateChannel('phone');
      expect(result.success).toBe(true);
    });

    it('should reject invalid channel', () => {
      const result = validateChannel('telepathy');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid channel');
    });
  });

  describe('validateRecipient', () => {
    it('should accept valid recipient with all fields', () => {
      const result = validateRecipient({
        userId: generateTestUuid(),
        name: 'John Doe',
        email: 'john@example.com',
        role: 'manager',
        channels: ['email', 'in-app'],
        priority: 5,
      });
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('John Doe');
    });

    it('should accept valid recipient with minimal fields', () => {
      const result = validateRecipient({
        userId: generateTestUuid(),
      });
      expect(result.success).toBe(true);
    });

    it('should reject recipient without userId', () => {
      const result = validateRecipient({
        name: 'No ID',
        email: 'noid@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('should reject recipient with invalid email', () => {
      const result = validateRecipient({
        userId: generateTestUuid(),
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('should reject recipient with invalid phone', () => {
      const result = validateRecipient({
        userId: generateTestUuid(),
        phone: '0123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateEscalation', () => {
    it('should accept valid escalation level', () => {
      const result = validateEscalation({
        level: 1,
        role: 'manager',
        afterMinutes: 30,
      });
      expect(result.success).toBe(true);
      expect(result.data?.level).toBe(1);
    });

    it('should accept escalation with optional fields', () => {
      const result = validateEscalation({
        level: 2,
        role: 'director',
        afterMinutes: 60,
        userId: generateTestUuid(),
        channels: ['email', 'sms'],
        message: 'Please review urgently',
      });
      expect(result.success).toBe(true);
    });

    it('should reject escalation without required fields', () => {
      const result = validateEscalation({
        level: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject escalation with negative afterMinutes', () => {
      const result = validateEscalation({
        level: 1,
        role: 'manager',
        afterMinutes: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateNotificationMessage', () => {
    it('should accept valid message with required fields', () => {
      const result = validateNotificationMessage({
        subject: 'Test Alert',
        body: 'This is a test alert body.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject message without subject', () => {
      const result = validateNotificationMessage({
        body: 'Body without subject',
      });
      expect(result.success).toBe(false);
    });

    it('should reject message without body', () => {
      const result = validateNotificationMessage({
        subject: 'Subject without body',
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// SANITIZATION TESTS
// =============================================================================

describe('Content Sanitization', () => {
  describe('sanitizeContent', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      const result = sanitizeContent(input);
      expect(result).toBe('HelloWorld');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'Line 1\nLine 2\tTabbed';
      const result = sanitizeContent(input);
      expect(result).toBe('Line 1\nLine 2\tTabbed');
    });

    it('should normalize line endings (CRLF to LF)', () => {
      const input = 'Line 1\r\nLine 2\rLine 3';
      const result = sanitizeContent(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should limit consecutive newlines to max 3', () => {
      const input = 'Para 1\n\n\n\n\n\nPara 2';
      const result = sanitizeContent(input);
      expect(result).toBe('Para 1\n\n\nPara 2');
    });

    it('should trim whitespace', () => {
      const input = '  \n\n  Content  \n\n  ';
      const result = sanitizeContent(input);
      expect(result).toBe('Content');
    });

    it('should handle empty string', () => {
      expect(sanitizeContent('')).toBe('');
    });

    it('should handle null/undefined as empty string', () => {
      expect(sanitizeContent(null as unknown as string)).toBe('');
      expect(sanitizeContent(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeNotificationSubject', () => {
    it('should remove newlines from subject', () => {
      const subject = 'Alert:\nContract Expiring';
      const result = sanitizeNotificationSubject(subject);
      expect(result).not.toContain('\n');
    });

    it('should remove HTML angle brackets', () => {
      const subject = 'Alert: <script>bad</script>';
      const result = sanitizeNotificationSubject(subject);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should normalize whitespace', () => {
      const subject = '  Multiple    Spaces  ';
      const result = sanitizeNotificationSubject(subject);
      expect(result).toBe('Multiple Spaces');
    });

    it('should truncate to 255 characters', () => {
      const subject = 'A'.repeat(300);
      const result = sanitizeNotificationSubject(subject);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should handle empty subject', () => {
      expect(sanitizeNotificationSubject('')).toBe('');
    });

    it('should handle null/undefined as empty string', () => {
      expect(sanitizeNotificationSubject(null as unknown as string)).toBe('');
    });
  });

  describe('detectEncodingIssues', () => {
    it('should detect no issues in clean content', () => {
      const result = detectEncodingIssues('Clean ASCII content');
      expect(result.hasMojibake).toBe(false);
      expect(result.examples).toHaveLength(0);
    });

    it('should detect UTF-8 decoded as Latin-1 pattern', () => {
      const input = 'Caf\u00C3\u00A9';
      const result = detectEncodingIssues(input);
      expect(result.hasMojibake).toBe(true);
    });

    it('should handle empty content', () => {
      const result = detectEncodingIssues('');
      expect(result.hasMojibake).toBe(false);
    });
  });

  describe('normalizeChannels', () => {
    it('should remove duplicates', () => {
      const result = normalizeChannels(['email', 'email', 'sms']);
      expect(result).toHaveLength(2);
      expect(result).toContain('email');
      expect(result).toContain('sms');
    });

    it('should normalize case', () => {
      const result = normalizeChannels(['EMAIL', 'SMS']);
      expect(result).toContain('email');
      expect(result).toContain('sms');
    });

    it('should filter out invalid channels', () => {
      const result = normalizeChannels(['email', 'invalid', 'sms']);
      expect(result).toHaveLength(2);
      expect(result).not.toContain('invalid');
    });

    it('should return empty array for null input', () => {
      const result = normalizeChannels(null as unknown as string[]);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const result = normalizeChannels([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('detectInputConflicts', () => {
    it('should detect content and text mismatch', () => {
      const conflicts = detectInputConflicts({
        content: 'Content A',
        text: 'Content B',
        title: 'Test',
      });
      expect(conflicts).toContain('Both content and text provided with different values - using content');
    });

    it('should not warn when content and text are identical', () => {
      const conflicts = detectInputConflicts({
        content: 'Same content',
        text: 'Same content',
        title: 'Test',
      });
      expect(conflicts).not.toContain('Both content and text provided with different values - using content');
    });

    it('should detect notification type mismatch', () => {
      const conflicts = detectInputConflicts(
        { type: 'alert', title: 'Test' },
        { notificationType: 'digest' },
      );
      expect(conflicts).toContain('Notification type differs between data and context - using context.notificationType');
    });

    it('should detect alert type without alert notification type', () => {
      const conflicts = detectInputConflicts({
        alertType: 'contract_expiration',
        type: 'reminder',
        title: 'Test',
      });
      expect(conflicts).toContain('AlertType provided but notification type is not "alert" - alertType may be ignored');
    });

    it('should detect escalation without high severity', () => {
      const conflicts = detectInputConflicts({
        escalation: [{ level: 1, role: 'manager', afterMinutes: 30 }],
        severity: 'low',
        title: 'Test',
      });
      expect(conflicts).toContain('Escalation defined but severity is not critical/high - escalation may not trigger appropriately');
    });

    it('should detect phone channel for non-critical severity', () => {
      const conflicts = detectInputConflicts({
        channels: ['phone'],
        severity: 'medium',
        title: 'Test',
      });
      expect(conflicts).toContain('Phone channel selected for non-critical notification - phone notifications are typically reserved for critical alerts');
    });

    it('should detect vendor issue without vendor reference', () => {
      const conflicts = detectInputConflicts({
        alertType: 'vendor_issue',
        type: 'alert',
        title: 'Test',
      });
      expect(conflicts).toContain('Vendor issue alert without vendor reference - notification may lack context');
    });

    it('should return empty array for clean input', () => {
      const conflicts = detectInputConflicts({
        type: 'alert',
        severity: 'high',
        title: 'Clean Alert',
      });
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('validateAndSanitizeNotificationInput', () => {
    it('should validate and sanitize valid input', () => {
      const result = validateAndSanitizeNotificationInput({
        title: '  Test Alert  ',
        content: 'Some\x00content',
        type: 'alert',
      });
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Somecontent');
    });

    it('should return errors for invalid input', () => {
      const result = validateAndSanitizeNotificationInput({});
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should warn about encoding issues', () => {
      const result = validateAndSanitizeNotificationInput({
        title: 'Test',
        content: 'Caf\u00C3\u00A9 content',
      });
      expect(result.success).toBe(true);
      if (result.warnings) {
        expect(result.warnings.some(w => w.includes('encoding'))).toBe(true);
      }
    });
  });

  describe('inferNotificationType', () => {
    it('should return explicit type when provided', () => {
      expect(inferNotificationType({ type: 'alert', title: 'Test' } as any)).toBe('alert');
    });

    it('should infer alert from alertType', () => {
      expect(inferNotificationType({ alertType: 'contract_expiration', title: 'Test' } as any)).toBe('alert');
    });

    it('should infer reminder from reminderType', () => {
      expect(inferNotificationType({ reminderType: 'payment_reminder', title: 'Test' } as any)).toBe('reminder');
    });

    it('should infer digest from digestPeriod', () => {
      expect(inferNotificationType({ digestPeriod: 'daily', title: 'Test' } as any)).toBe('digest');
    });

    it('should infer digest from digestFormat', () => {
      expect(inferNotificationType({ digestFormat: 'executive', title: 'Test' } as any)).toBe('digest');
    });

    it('should return undefined when type cannot be inferred', () => {
      expect(inferNotificationType({ title: 'Test' } as any)).toBeUndefined();
    });
  });

  describe('computeUrgency', () => {
    it('should return overdue when daysOverdue is positive', () => {
      expect(computeUrgency({ daysOverdue: 5, title: 'Test' } as any)).toBe('overdue');
    });

    it('should return immediate for critical severity', () => {
      expect(computeUrgency({ severity: 'critical', title: 'Test' } as any)).toBe('immediate');
    });

    it('should return overdue when daysUntil is 0', () => {
      expect(computeUrgency({ daysUntil: 0, title: 'Test' } as any)).toBe('overdue');
    });

    it('should return immediate when daysUntil is 1', () => {
      expect(computeUrgency({ daysUntil: 1, title: 'Test' } as any)).toBe('immediate');
    });

    it('should return urgent when daysUntil is 3', () => {
      expect(computeUrgency({ daysUntil: 3, title: 'Test' } as any)).toBe('urgent');
    });

    it('should return upcoming when daysUntil is 7', () => {
      expect(computeUrgency({ daysUntil: 7, title: 'Test' } as any)).toBe('upcoming');
    });

    it('should return urgent for high severity', () => {
      expect(computeUrgency({ severity: 'high', title: 'Test' } as any)).toBe('urgent');
    });

    it('should return standard when no urgency indicators', () => {
      expect(computeUrgency({ title: 'Test' } as any)).toBe('standard');
    });
  });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe('Notifications Agent Configuration', () => {
  describe('NotificationsConfigSchema', () => {
    it('should parse default configuration', () => {
      const config = NotificationsConfigSchema.parse({});
      expect(config).toBeDefined();
      expect(config.criticalEscalationMinutes).toBe(15);
      expect(config.highEscalationMinutes).toBe(60);
      expect(config.maxAlertsPerHour).toBe(10);
    });

    it('should accept valid custom configuration', () => {
      const config = NotificationsConfigSchema.parse({
        criticalEscalationMinutes: 10,
        maxAlertsPerHour: 20,
        enableSmartRouting: false,
      });
      expect(config.criticalEscalationMinutes).toBe(10);
      expect(config.maxAlertsPerHour).toBe(20);
      expect(config.enableSmartRouting).toBe(false);
    });

    it('should reject invalid escalation minutes (negative)', () => {
      expect(() => NotificationsConfigSchema.parse({
        criticalEscalationMinutes: -5,
      })).toThrow();
    });

    it('should reject invalid escalation minutes (too high)', () => {
      expect(() => NotificationsConfigSchema.parse({
        criticalEscalationMinutes: 5000,
      })).toThrow();
    });

    it('should reject invalid maxAlertsPerHour (above max)', () => {
      expect(() => NotificationsConfigSchema.parse({
        maxAlertsPerHour: 500,
      })).toThrow();
    });

    it('should reject invalid retry attempts (above max)', () => {
      expect(() => NotificationsConfigSchema.parse({
        maxRetryAttempts: 15,
      })).toThrow();
    });

    it('should accept valid feature flags', () => {
      const config = NotificationsConfigSchema.parse({
        enableSmartRouting: false,
        enableFatigueDetection: false,
        enableGracefulDegradation: false,
      });
      expect(config.enableSmartRouting).toBe(false);
      expect(config.enableFatigueDetection).toBe(false);
      expect(config.enableGracefulDegradation).toBe(false);
    });

    it('should accept valid channel arrays', () => {
      const config = NotificationsConfigSchema.parse({
        criticalChannels: ['email', 'sms'],
        highChannels: ['email', 'push'],
        defaultChannels: ['in-app'],
      });
      expect(config.criticalChannels).toEqual(['email', 'sms']);
      expect(config.highChannels).toEqual(['email', 'push']);
      expect(config.defaultChannels).toEqual(['in-app']);
    });

    it('should reject empty channel array for critical', () => {
      expect(() => NotificationsConfigSchema.parse({
        criticalChannels: [],
      })).toThrow();
    });

    it('should accept valid quiet hours settings', () => {
      const config = NotificationsConfigSchema.parse({
        quietHoursStart: 20,
        quietHoursEnd: 8,
        quietHoursBypassSeverity: 'high',
      });
      expect(config.quietHoursStart).toBe(20);
      expect(config.quietHoursEnd).toBe(8);
      expect(config.quietHoursBypassSeverity).toBe('high');
    });

    it('should accept valid aggregation settings', () => {
      const config = NotificationsConfigSchema.parse({
        aggregationMinCount: 5,
        aggregationWindowMinutes: 120,
        maxItemsPerAggregation: 20,
      });
      expect(config.aggregationMinCount).toBe(5);
      expect(config.aggregationWindowMinutes).toBe(120);
    });
  });

  describe('getDefaultNotificationsConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultNotificationsConfig();
      expect(config).toEqual(DEFAULT_NOTIFICATIONS_CONFIG);
    });

    it('should return a copy, not the original', () => {
      const config1 = getDefaultNotificationsConfig();
      const config2 = getDefaultNotificationsConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('clearNotificationsConfigCache', () => {
    it('should clear cache without error', () => {
      expect(() => clearNotificationsConfigCache()).not.toThrow();
    });

    it('should clear cache for specific enterprise', () => {
      expect(() => clearNotificationsConfigCache('enterprise-123')).not.toThrow();
    });
  });

  describe('validateConfigOverride', () => {
    it('should accept valid partial override', () => {
      const result = validateConfigOverride({
        criticalEscalationMinutes: 10,
        maxAlertsPerHour: 20,
      });
      expect(result.valid).toBe(true);
      expect(result.config?.criticalEscalationMinutes).toBe(10);
    });

    it('should reject invalid override values', () => {
      const result = validateConfigOverride({
        criticalEscalationMinutes: -5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should accept empty override', () => {
      const result = validateConfigOverride({});
      expect(result.valid).toBe(true);
    });
  });

  describe('validateConfigThresholds', () => {
    it('should return empty array for valid default config', () => {
      const errors = validateConfigThresholds(DEFAULT_NOTIFICATIONS_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('should detect urgent > upcoming reminder threshold inversion', () => {
      const config = {
        ...DEFAULT_NOTIFICATIONS_CONFIG,
        urgentReminderDays: 10,
        upcomingReminderDays: 5,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('urgentReminderDays'))).toBe(true);
    });

    it('should detect critical > high escalation inversion', () => {
      const config = {
        ...DEFAULT_NOTIFICATIONS_CONFIG,
        criticalEscalationMinutes: 120,
        highEscalationMinutes: 60,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('criticalEscalationMinutes'))).toBe(true);
    });

    it('should detect retry delay inversion', () => {
      const config = {
        ...DEFAULT_NOTIFICATIONS_CONFIG,
        baseRetryDelayMs: 15000,
        maxRetryDelayMs: 10000,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('baseRetryDelayMs'))).toBe(true);
    });

    it('should detect quiet hours same value', () => {
      const config = {
        ...DEFAULT_NOTIFICATIONS_CONFIG,
        quietHoursStart: 22,
        quietHoursEnd: 22,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('quietHoursStart'))).toBe(true);
    });

    it('should detect upcoming >= advance reminder threshold inversion', () => {
      const config = {
        ...DEFAULT_NOTIFICATIONS_CONFIG,
        upcomingReminderDays: 30,
        advanceReminderDays: 30,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('upcomingReminderDays'))).toBe(true);
    });
  });

  describe('validateAndLogConfigWarnings', () => {
    it('should return config unchanged for valid config', () => {
      const result = validateAndLogConfigWarnings(DEFAULT_NOTIFICATIONS_CONFIG);
      expect(result).toEqual(DEFAULT_NOTIFICATIONS_CONFIG);
    });

    it('should return config even with warnings', () => {
      const badConfig = {
        ...DEFAULT_NOTIFICATIONS_CONFIG,
        criticalEscalationMinutes: 120,
        highEscalationMinutes: 60,
      };
      const result = validateAndLogConfigWarnings(badConfig);
      expect(result).toEqual(badConfig);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - URGENCY
// =============================================================================

describe('Configuration Helper Functions - Urgency', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('isUrgent', () => {
    it('should return true for due today', () => {
      expect(isUrgent(0, config)).toBe(true);
    });

    it('should return true for due within urgent period', () => {
      expect(isUrgent(1, config)).toBe(true);
    });

    it('should return false for items due beyond urgent period', () => {
      expect(isUrgent(5, config)).toBe(false);
    });

    it('should return false for negative days', () => {
      expect(isUrgent(-1, config)).toBe(false);
    });
  });

  describe('isUpcoming', () => {
    it('should return true for items in upcoming window', () => {
      expect(isUpcoming(3, config)).toBe(true);
    });

    it('should return false for urgent items', () => {
      expect(isUpcoming(0, config)).toBe(false);
    });

    it('should return false for items beyond upcoming window', () => {
      expect(isUpcoming(15, config)).toBe(false);
    });
  });

  describe('isAdvanceNotice', () => {
    it('should return true for items in advance window', () => {
      expect(isAdvanceNotice(15, config)).toBe(true);
    });

    it('should return false for upcoming items', () => {
      expect(isAdvanceNotice(3, config)).toBe(false);
    });

    it('should return false for far future items', () => {
      expect(isAdvanceNotice(60, config)).toBe(false);
    });
  });

  describe('getReminderCategory', () => {
    it('should return overdue for negative days', () => {
      expect(getReminderCategory(-5, config)).toBe('overdue');
    });

    it('should return urgent for 0 days', () => {
      expect(getReminderCategory(0, config)).toBe('urgent');
    });

    it('should return upcoming for items in upcoming window', () => {
      expect(getReminderCategory(3, config)).toBe('upcoming');
    });

    it('should return advance for items in advance window', () => {
      expect(getReminderCategory(15, config)).toBe('advance');
    });

    it('should return future for items far in the future', () => {
      expect(getReminderCategory(60, config)).toBe('future');
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - ESCALATION
// =============================================================================

describe('Configuration Helper Functions - Escalation', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('shouldEscalate', () => {
    it('should return true for critical alert past escalation time', () => {
      expect(shouldEscalate('critical', 20, config)).toBe(true);
    });

    it('should return false for critical alert before escalation time', () => {
      expect(shouldEscalate('critical', 10, config)).toBe(false);
    });

    it('should return true for high alert past escalation time', () => {
      expect(shouldEscalate('high', 70, config)).toBe(true);
    });

    it('should return false for high alert before escalation time', () => {
      expect(shouldEscalate('high', 30, config)).toBe(false);
    });

    it('should return true for medium alert past escalation time', () => {
      expect(shouldEscalate('medium', 250, config)).toBe(true);
    });

    it('should return false for low severity alerts', () => {
      expect(shouldEscalate('low', 9999, config)).toBe(false);
    });

    it('should return false when auto-escalation is disabled', () => {
      const disabledConfig = { ...config, enableAutoEscalation: false };
      expect(shouldEscalate('critical', 999, disabledConfig)).toBe(false);
    });
  });

  describe('getEscalationTimeline', () => {
    it('should return multi-level timeline for critical', () => {
      const timeline = getEscalationTimeline('critical', config);
      expect(timeline.length).toBe(config.criticalEscalationLevels);
      expect(timeline[0].level).toBe(1);
      expect(timeline[0].role).toBe('manager');
    });

    it('should return timeline for high severity', () => {
      const timeline = getEscalationTimeline('high', config);
      expect(timeline.length).toBe(config.highEscalationLevels);
    });

    it('should return single-level timeline for medium', () => {
      const timeline = getEscalationTimeline('medium', config);
      expect(timeline.length).toBe(1);
    });

    it('should return empty timeline for low severity', () => {
      const timeline = getEscalationTimeline('low', config);
      expect(timeline).toHaveLength(0);
    });

    it('should have increasing afterMinutes', () => {
      const timeline = getEscalationTimeline('critical', config);
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].afterMinutes).toBeGreaterThan(timeline[i - 1].afterMinutes);
      }
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - FATIGUE ASSESSMENT
// =============================================================================

describe('Configuration Helper Functions - Fatigue Assessment', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('assessFatigue', () => {
    it('should return low fatigue for manageable volume', () => {
      const result = assessFatigue({
        totalVolume: 5,
        criticalCount: 2,
        suppressedCount: 0,
      }, config);
      expect(result.level).toBe('low');
    });

    it('should return medium fatigue for moderate volume', () => {
      const result = assessFatigue({
        totalVolume: config.fatigueThresholdPerDay + 1,
        criticalCount: 3,
        suppressedCount: 1,
        timeWindowHours: 24,
      }, config);
      expect(result.level).toBe('medium');
    });

    it('should return high fatigue for very high volume', () => {
      const result = assessFatigue({
        totalVolume: config.fatigueThresholdPerDay * 3,
        criticalCount: 1,
        suppressedCount: 0,
        timeWindowHours: 24,
      }, config);
      expect(result.level).toBe('high');
    });

    it('should return high fatigue when critical ratio is too low', () => {
      const result = assessFatigue({
        totalVolume: 100,
        criticalCount: 1,
        suppressedCount: 5,
        timeWindowHours: 24,
      }, config);
      expect(result.level).toBe('high');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should return low when fatigue detection is disabled', () => {
      const disabledConfig = { ...config, enableFatigueDetection: false };
      const result = assessFatigue({
        totalVolume: 1000,
        criticalCount: 0,
        suppressedCount: 0,
      }, disabledConfig);
      expect(result.level).toBe('low');
      expect(result.description).toBe('Fatigue detection disabled');
    });

    it('should provide suppression recommendation when ratio is low', () => {
      const result = assessFatigue({
        totalVolume: config.fatigueThresholdPerDay + 5,
        criticalCount: 3,
        suppressedCount: 0,
        timeWindowHours: 24,
      }, config);
      expect(result.recommendations.some(r => r.includes('suppressing'))).toBe(true);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - CHANNEL SELECTION
// =============================================================================

describe('Configuration Helper Functions - Channel Selection', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('getChannelsForSeverity', () => {
    it('should return critical channels for critical severity', () => {
      const channels = getChannelsForSeverity('critical', config);
      expect(channels).toEqual(config.criticalChannels);
    });

    it('should return high channels for high severity', () => {
      const channels = getChannelsForSeverity('high', config);
      expect(channels).toEqual(config.highChannels);
    });

    it('should return default channels for medium severity', () => {
      const channels = getChannelsForSeverity('medium', config);
      expect(channels).toEqual(config.defaultChannels);
    });

    it('should return default channels for low severity', () => {
      const channels = getChannelsForSeverity('low', config);
      expect(channels).toEqual(config.defaultChannels);
    });

    it('should return a new array (not the original reference)', () => {
      const channels = getChannelsForSeverity('critical', config);
      channels.push('test' as any);
      expect(config.criticalChannels).not.toContain('test');
    });
  });

  describe('isQuietHours', () => {
    it('should return true during quiet hours (overnight)', () => {
      expect(isQuietHours(23, config)).toBe(true);
      expect(isQuietHours(3, config)).toBe(true);
    });

    it('should return false outside quiet hours', () => {
      expect(isQuietHours(12, config)).toBe(false);
      expect(isQuietHours(8, config)).toBe(false);
    });

    it('should return false when quiet hours are disabled', () => {
      const disabledConfig = { ...config, enableQuietHours: false };
      expect(isQuietHours(23, disabledConfig)).toBe(false);
    });

    it('should handle same-day quiet hours', () => {
      const dayConfig = { ...config, quietHoursStart: 12, quietHoursEnd: 14 };
      expect(isQuietHours(13, dayConfig)).toBe(true);
      expect(isQuietHours(10, dayConfig)).toBe(false);
    });
  });

  describe('canBypassQuietHours', () => {
    it('should allow critical to bypass by default', () => {
      expect(canBypassQuietHours('critical', config)).toBe(true);
    });

    it('should not allow high to bypass by default (bypass=critical)', () => {
      expect(canBypassQuietHours('high', config)).toBe(false);
    });

    it('should not allow medium to bypass by default', () => {
      expect(canBypassQuietHours('medium', config)).toBe(false);
    });

    it('should not allow low to bypass by default', () => {
      expect(canBypassQuietHours('low', config)).toBe(false);
    });

    it('should allow high to bypass when bypass severity is high', () => {
      const highBypassConfig = { ...config, quietHoursBypassSeverity: 'high' as const };
      expect(canBypassQuietHours('high', highBypassConfig)).toBe(true);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - RATE LIMITING
// =============================================================================

describe('Configuration Helper Functions - Rate Limiting', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('isRateLimitExceeded', () => {
    it('should return true when alert limit exceeded', () => {
      expect(isRateLimitExceeded('alert', config.maxAlertsPerHour, config)).toBe(true);
    });

    it('should return false when alert limit not exceeded', () => {
      expect(isRateLimitExceeded('alert', config.maxAlertsPerHour - 1, config)).toBe(false);
    });

    it('should return true when reminder limit exceeded', () => {
      expect(isRateLimitExceeded('reminder', config.maxRemindersPerDay, config)).toBe(true);
    });

    it('should return false when reminder limit not exceeded', () => {
      expect(isRateLimitExceeded('reminder', 0, config)).toBe(false);
    });
  });

  describe('getRemainingQuota', () => {
    it('should return remaining quota for alerts', () => {
      const quota = getRemainingQuota('alert', 3, config);
      expect(quota.remaining).toBe(config.maxAlertsPerHour - 3);
      expect(quota.limit).toBe(config.maxAlertsPerHour);
      expect(quota.exceeded).toBe(false);
    });

    it('should return 0 remaining when exceeded', () => {
      const quota = getRemainingQuota('alert', config.maxAlertsPerHour + 5, config);
      expect(quota.remaining).toBe(0);
      expect(quota.exceeded).toBe(true);
    });

    it('should return full quota when count is 0', () => {
      const quota = getRemainingQuota('reminder', 0, config);
      expect(quota.remaining).toBe(config.maxRemindersPerDay);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - AGGREGATION
// =============================================================================

describe('Configuration Helper Functions - Aggregation', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('shouldAggregate', () => {
    it('should return true when count exceeds minimum', () => {
      expect(shouldAggregate(config.aggregationMinCount, config)).toBe(true);
    });

    it('should return false when count is below minimum', () => {
      expect(shouldAggregate(1, config)).toBe(false);
    });

    it('should return false when aggregation is disabled', () => {
      const disabledConfig = { ...config, enableAggregation: false };
      expect(shouldAggregate(100, disabledConfig)).toBe(false);
    });
  });

  describe('getAggregationWindowMs', () => {
    it('should return correct milliseconds', () => {
      expect(getAggregationWindowMs(config)).toBe(config.aggregationWindowMinutes * 60 * 1000);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - RETRY LOGIC
// =============================================================================

describe('Configuration Helper Functions - Retry Logic', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('calculateRetryDelay', () => {
    it('should return base delay for first attempt (without jitter)', () => {
      const noJitterConfig = { ...config, retryJitterFactor: 0 };
      const delay = calculateRetryDelay(0, noJitterConfig);
      expect(delay).toBe(config.baseRetryDelayMs);
    });

    it('should return exponentially increasing delays', () => {
      const noJitterConfig = { ...config, retryJitterFactor: 0 };
      const delay0 = calculateRetryDelay(0, noJitterConfig);
      const delay1 = calculateRetryDelay(1, noJitterConfig);
      const delay2 = calculateRetryDelay(2, noJitterConfig);
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should not exceed max delay (without jitter)', () => {
      const noJitterConfig = { ...config, retryJitterFactor: 0 };
      const delay = calculateRetryDelay(10, noJitterConfig);
      expect(delay).toBeLessThanOrEqual(config.maxRetryDelayMs);
    });

    it('should add jitter when factor > 0', () => {
      const delay = calculateRetryDelay(0, config);
      expect(delay).toBeGreaterThanOrEqual(config.baseRetryDelayMs);
      expect(delay).toBeLessThanOrEqual(config.baseRetryDelayMs * (1 + config.retryJitterFactor));
    });
  });

  describe('canRetry', () => {
    it('should return true for attempt within max', () => {
      expect(canRetry(0, config)).toBe(true);
      expect(canRetry(config.maxRetryAttempts - 1, config)).toBe(true);
    });

    it('should return false for attempt at or beyond max', () => {
      expect(canRetry(config.maxRetryAttempts, config)).toBe(false);
      expect(canRetry(config.maxRetryAttempts + 1, config)).toBe(false);
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  const config = DEFAULT_NOTIFICATIONS_CONFIG;

  describe('Boundary Values', () => {
    it('should handle zero daysUntilDue', () => {
      expect(getReminderCategory(0, config)).toBe('urgent');
    });

    it('should handle exactly at urgentReminderDays boundary', () => {
      expect(isUrgent(config.urgentReminderDays, config)).toBe(true);
    });

    it('should handle exactly at upcomingReminderDays boundary', () => {
      expect(isUpcoming(config.upcomingReminderDays, config)).toBe(true);
    });

    it('should handle exactly at advanceReminderDays boundary', () => {
      expect(isAdvanceNotice(config.advanceReminderDays, config)).toBe(true);
    });

    it('should handle escalation at exact threshold', () => {
      expect(shouldEscalate('critical', config.criticalEscalationMinutes, config)).toBe(true);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle unicode content in sanitization', () => {
      const result = sanitizeContent('Contrato de Renovacion -- 日本語テスト');
      expect(result).toBe('Contrato de Renovacion -- 日本語テスト');
    });

    it('should strip HTML-like characters from subjects', () => {
      const result = sanitizeNotificationSubject('<script>alert("xss")</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('Large Values', () => {
    it('should handle long subject truncation', () => {
      const longSubject = 'A'.repeat(300);
      const result = sanitizeNotificationSubject(longSubject);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should handle large retry attempt numbers gracefully', () => {
      const noJitterConfig = { ...config, retryJitterFactor: 0 };
      const delay = calculateRetryDelay(100, noJitterConfig);
      expect(delay).toBeLessThanOrEqual(config.maxRetryDelayMs);
    });
  });

  describe('Empty and Missing Data', () => {
    it('should handle empty channels normalization', () => {
      expect(normalizeChannels([])).toEqual([]);
    });

    it('should handle getRemainingQuota with zero count', () => {
      const quota = getRemainingQuota('alert', 0, config);
      expect(quota.remaining).toBe(config.maxAlertsPerHour);
      expect(quota.exceeded).toBe(false);
    });

    it('should handle assessFatigue with zero total volume', () => {
      const result = assessFatigue({
        totalVolume: 0,
        criticalCount: 0,
        suppressedCount: 0,
      }, config);
      expect(result.level).toBe('low');
    });

    it('should handle empty escalation timeline for low severity', () => {
      const timeline = getEscalationTimeline('low', config);
      expect(timeline).toEqual([]);
    });
  });
});

// =============================================================================
// FIXTURE GENERATOR TESTS
// =============================================================================

describe('Test Fixtures', () => {
  describe('Mock Data Generators', () => {
    it('should generate valid mock alerts', () => {
      const alert = generateMockAlert();
      expect(alert.id).toBeDefined();
      expect(alert.type).toBeDefined();
      expect(alert.severity).toBeDefined();
      expect(alert.createdAt).toBeDefined();
    });

    it('should generate mock alerts with overrides', () => {
      const alert = generateMockAlert({
        type: 'contract_expiration',
        severity: 'critical',
      });
      expect(alert.type).toBe('contract_expiration');
      expect(alert.severity).toBe('critical');
    });

    it('should generate valid mock reminders', () => {
      const reminder = generateMockReminder();
      expect(reminder.id).toBeDefined();
      expect(reminder.dueDate).toBeDefined();
      expect(reminder.type).toBeDefined();
    });

    it('should generate mock reminders with overrides', () => {
      const reminder = generateMockReminder({
        type: 'payment_reminder',
        amount: 10000,
      });
      expect(reminder.type).toBe('payment_reminder');
      expect(reminder.amount).toBe(10000);
    });

    it('should generate valid mock digests', () => {
      const digest = generateMockDigest();
      expect(digest.period).toBeDefined();
      expect(digest.format).toBeDefined();
    });

    it('should generate valid mock notification users', () => {
      const user = generateMockNotificationUser();
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
    });

    it('should generate escalation chains with correct levels', () => {
      const chain = generateMockEscalationChain(3);
      expect(chain).toHaveLength(3);
      expect(chain[0].level).toBe(1);
      expect(chain[1].level).toBe(2);
      expect(chain[2].level).toBe(3);
    });

    it('should generate routing rules', () => {
      const rules = generateMockRoutingRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].name).toBeDefined();
      expect(rules[0].condition).toBeDefined();
    });

    it('should generate valid UUIDs', () => {
      const uuid = generateTestUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique UUIDs each time', () => {
      const uuid1 = generateTestUuid();
      const uuid2 = generateTestUuid();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('Mock Supabase Client', () => {
    it('should create a functioning mock client', () => {
      const client = createMockSupabaseClient();
      expect(client.from).toBeDefined();
      expect(client.rpc).toBeDefined();
    });

    it('should return data from chainable query for users', async () => {
      const client = createMockSupabaseClient();
      const result = await client
        .from('users')
        .select('*')
        .eq('enterprise_id', 'test');
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should return data from RPC for send_smart_notification', async () => {
      const client = createMockSupabaseClient();
      const result = await client.rpc('send_smart_notification', {
        p_event_type: 'test',
        p_event_data: { severity: 'critical' },
      });
      expect(result.data).toBeDefined();
      expect(result.data.recipients_count).toBe(3);
      expect(result.data.escalation_scheduled).toBe(true);
    });

    it('should create an error mock client', () => {
      const client = createErrorMockSupabaseClient('Test error');
      expect(client.from).toBeDefined();
      expect(client.rpc).toBeDefined();
    });

    it('should return errors from error mock client', async () => {
      const client = createErrorMockSupabaseClient('Test error');
      const result = await client.rpc('send_smart_notification', {});
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
    });
  });

  describe('Predefined Test Data', () => {
    it('should have valid alert inputs for all alert types', () => {
      expect(Object.keys(VALID_ALERT_INPUTS).length).toBeGreaterThanOrEqual(7);
    });

    it('should have valid reminder inputs for all reminder types', () => {
      expect(Object.keys(VALID_REMINDER_INPUTS).length).toBeGreaterThanOrEqual(6);
    });

    it('should have valid digest inputs for multiple formats', () => {
      expect(Object.keys(VALID_DIGEST_INPUTS).length).toBeGreaterThanOrEqual(4);
    });

    it('should have invalid input scenarios', () => {
      expect(Object.keys(INVALID_NOTIFICATION_INPUTS).length).toBeGreaterThan(0);
    });

    it('should have error scenarios with all categories', () => {
      expect(ERROR_SCENARIOS.databaseError.category).toBe('database');
      expect(ERROR_SCENARIOS.validationError.category).toBe('validation');
      expect(ERROR_SCENARIOS.timeoutError.category).toBe('timeout');
      expect(ERROR_SCENARIOS.deliveryError.category).toBe('delivery');
      expect(ERROR_SCENARIOS.templateError.category).toBe('template');
      expect(ERROR_SCENARIOS.rateLimitError.category).toBe('rate_limiting');
    });

    it('should have retryable error categories flagged correctly', () => {
      expect(ERROR_SCENARIOS.databaseError.isRetryable).toBe(true);
      expect(ERROR_SCENARIOS.timeoutError.isRetryable).toBe(true);
      expect(ERROR_SCENARIOS.deliveryError.isRetryable).toBe(true);
      expect(ERROR_SCENARIOS.rateLimitError.isRetryable).toBe(true);
      expect(ERROR_SCENARIOS.validationError.isRetryable).toBe(false);
      expect(ERROR_SCENARIOS.templateError.isRetryable).toBe(false);
    });

    it('should have edge case data for high volume scenarios', () => {
      expect(EDGE_CASE_DATA.highVolumeAlerts.length).toBe(100);
      expect(EDGE_CASE_DATA.highVolumeReminders.length).toBe(50);
    });

    it('should have edge case data for all severity levels', () => {
      expect(EDGE_CASE_DATA.allSeverities).toHaveLength(4);
    });

    it('should have edge case data for all alert types', () => {
      expect(EDGE_CASE_DATA.allAlertTypes).toHaveLength(8);
    });

    it('should have edge case data for all reminder types', () => {
      expect(EDGE_CASE_DATA.allReminderTypes).toHaveLength(7);
    });

    it('should have configuration test data', () => {
      expect(CONFIG_TEST_DATA.defaultConfig).toBeDefined();
      expect(CONFIG_TEST_DATA.validOverrides).toBeDefined();
      expect(CONFIG_TEST_DATA.invalidOverrides).toBeDefined();
      expect(CONFIG_TEST_DATA.thresholdViolations).toBeDefined();
    });
  });
});
