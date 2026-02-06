/**
 * Comprehensive test suite for Manager Agent
 *
 * Tests input validation, configuration, error handling, request analysis,
 * orchestration planning, and execution modes.
 *
 * @module ManagerAgentComprehensiveTests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateManagerAgentInput,
  validateManagerContext,
  validateRequestType,
  validateExecutionMode,
  validatePriority,
  validateAgentType,
  validateUuid,
  sanitizeContent,
  detectInputConflicts,
  validateAndSanitizeManagerInput,
} from '../supabase/functions/local-agents/schemas/manager';
import {
  ManagerConfigSchema,
  DEFAULT_MANAGER_CONFIG,
  getDefaultManagerConfig,
  clearManagerConfigCache,
  calculatePriorityScore,
  getPriorityLevel,
  isCriticalPriority,
  assessComplexity,
  wouldExceedTaskRateLimit,
  wouldExceedWorkflowLimit,
  shouldEscalateOnFailure,
  shouldEscalateOnTimeout,
  getAgentDurationEstimate,
  estimateOrchestrationDuration,
  validateConfigOverride,
  validateConfigThresholds,
} from '../supabase/functions/local-agents/config/manager-config';
import {
  generateTestUuid,
  createMockSupabaseClient,
  generateMockOrchestrationPlan,
  generateMockMultiAgentPlan,
  generateMockWorkflowExecution,
  generateMockAgentResult,
  VALID_MANAGER_INPUTS,
  VALID_MANAGER_CONTEXT,
  INVALID_MANAGER_INPUTS,
  INVALID_MANAGER_CONTEXT,
  ERROR_SCENARIOS,
  EDGE_CASE_DATA,
  REQUEST_ANALYSIS_DATA,
} from './fixtures/manager-test-data';

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe('Manager Agent Input Validation', () => {
  describe('validateManagerAgentInput', () => {
    it('should accept valid simple content input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.simpleContent);
      expect(result.success).toBe(true);
      expect(result.data?.content).toContain('vendor performance');
    });

    it('should accept valid contract review input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.contractReview);
      expect(result.success).toBe(true);
      expect(result.data?.requestType).toBe('contract_review');
    });

    it('should accept valid vendor evaluation input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.vendorEvaluation);
      expect(result.success).toBe(true);
      expect(result.data?.requestType).toBe('vendor_evaluation');
    });

    it('should accept valid financial analysis input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.financialAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.requestType).toBe('financial_analysis');
    });

    it('should accept valid compliance check input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.complianceCheck);
      expect(result.success).toBe(true);
      expect(result.data?.requestType).toBe('compliance_check');
    });

    it('should accept valid document processing input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.documentProcessing);
      expect(result.success).toBe(true);
      expect(result.data?.requestType).toBe('document_processing');
    });

    it('should accept valid alert configuration input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.alertConfiguration);
      expect(result.success).toBe(true);
    });

    it('should accept valid performance review input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.performanceReview);
      expect(result.success).toBe(true);
    });

    it('should accept valid risk assessment input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.riskAssessment);
      expect(result.success).toBe(true);
    });

    it('should accept async execution mode input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.asyncExecution);
      expect(result.success).toBe(true);
      expect(result.data?.executionMode).toBe('asynchronous');
    });

    it('should accept input with entity references', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.withEntityRefs);
      expect(result.success).toBe(true);
      expect(result.data?.contractId).toBeDefined();
      expect(result.data?.vendorId).toBeDefined();
    });

    it('should accept input with required agents', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.withRequiredAgents);
      expect(result.success).toBe(true);
      expect(result.data?.requiredAgents).toHaveLength(2);
    });

    it('should accept input with workflow steps', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.withWorkflowSteps);
      expect(result.success).toBe(true);
      expect(result.data?.workflowSteps).toHaveLength(2);
    });

    it('should accept urgent request input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.urgentRequest);
      expect(result.success).toBe(true);
      expect(result.data?.urgent).toBe(true);
      expect(result.data?.priority).toBe('critical');
    });

    it('should accept text field as alternative to content', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.textField);
      expect(result.success).toBe(true);
      expect(result.data?.text).toContain('vendor performance');
    });

    it('should accept task field input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.taskField);
      expect(result.success).toBe(true);
      expect(result.data?.task).toContain('quarterly vendor report');
    });

    it('should accept action-based input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.withAction);
      expect(result.success).toBe(true);
      expect(result.data?.action).toBe('lifecycle');
    });

    it('should accept budget request input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.budgetRequest);
      expect(result.success).toBe(true);
      expect(result.data?.budgetRequest).toBe(true);
    });

    it('should accept invoice processing input', () => {
      const result = validateManagerAgentInput(VALID_MANAGER_INPUTS.invoiceProcessing);
      expect(result.success).toBe(true);
      expect(result.data?.invoiceId).toBe('INV-2025-001');
    });

    it('should reject empty input', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.emptyInput);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid request type', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.invalidRequestType);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.toLowerCase().includes('request type') || e.toLowerCase().includes('requesttype'))).toBe(true);
    });

    it('should reject invalid execution mode', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.invalidExecutionMode);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.toLowerCase().includes('execution mode') || e.toLowerCase().includes('executionmode'))).toBe(true);
    });

    it('should reject invalid priority', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.invalidPriority);
      expect(result.success).toBe(false);
    });

    it('should reject invalid agent type in requiredAgents', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.invalidAgentType);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for contractId', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.invalidUuidContractId);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('UUID'))).toBe(true);
    });

    it('should reject invalid maxConcurrency exceeding limit', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.invalidMaxConcurrency);
      expect(result.success).toBe(false);
    });

    it('should reject invalid timeout below minimum', () => {
      const result = validateManagerAgentInput(INVALID_MANAGER_INPUTS.invalidTimeoutMs);
      expect(result.success).toBe(false);
    });
  });

  describe('validateManagerContext', () => {
    it('should accept valid basic context', () => {
      const result = validateManagerContext(VALID_MANAGER_CONTEXT.basic);
      expect(result.success).toBe(true);
      expect(result.data?.enterpriseId).toBeDefined();
    });

    it('should accept context with request type', () => {
      const result = validateManagerContext(VALID_MANAGER_CONTEXT.withRequestType);
      expect(result.success).toBe(true);
      expect(result.data?.requestType).toBe('contract_review');
    });

    it('should accept context with async mode', () => {
      const result = validateManagerContext(VALID_MANAGER_CONTEXT.asyncMode);
      expect(result.success).toBe(true);
      expect(result.data?.executionMode).toBe('asynchronous');
    });

    it('should accept context with metadata', () => {
      const result = validateManagerContext(VALID_MANAGER_CONTEXT.withMetadata);
      expect(result.success).toBe(true);
      expect(result.data?.metadata).toBeDefined();
    });

    it('should accept empty context', () => {
      const result = validateManagerContext(VALID_MANAGER_CONTEXT.empty);
      expect(result.success).toBe(true);
    });

    it('should reject context with invalid enterprise ID', () => {
      const result = validateManagerContext(INVALID_MANAGER_CONTEXT.invalidEnterpriseId);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('UUID'))).toBe(true);
    });

    it('should reject context with invalid user ID', () => {
      const result = validateManagerContext(INVALID_MANAGER_CONTEXT.invalidUserId);
      expect(result.success).toBe(false);
    });

    it('should reject context with invalid request type', () => {
      const result = validateManagerContext(INVALID_MANAGER_CONTEXT.invalidRequestType);
      expect(result.success).toBe(false);
    });

    it('should reject context with invalid execution mode', () => {
      const result = validateManagerContext(INVALID_MANAGER_CONTEXT.invalidExecutionMode);
      expect(result.success).toBe(false);
    });
  });

  describe('validateRequestType', () => {
    it('should accept contract_review', () => {
      const result = validateRequestType('contract_review');
      expect(result.success).toBe(true);
      expect(result.value).toBe('contract_review');
    });

    it('should accept vendor_evaluation', () => {
      const result = validateRequestType('vendor_evaluation');
      expect(result.success).toBe(true);
    });

    it('should accept financial_analysis', () => {
      const result = validateRequestType('financial_analysis');
      expect(result.success).toBe(true);
    });

    it('should accept compliance_check', () => {
      const result = validateRequestType('compliance_check');
      expect(result.success).toBe(true);
    });

    it('should accept general_request', () => {
      const result = validateRequestType('general_request');
      expect(result.success).toBe(true);
    });

    it('should reject invalid request type', () => {
      const result = validateRequestType('invalid_type');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid request type');
    });
  });

  describe('validateExecutionMode', () => {
    it('should accept synchronous', () => {
      const result = validateExecutionMode('synchronous');
      expect(result.success).toBe(true);
      expect(result.value).toBe('synchronous');
    });

    it('should accept asynchronous', () => {
      const result = validateExecutionMode('asynchronous');
      expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
      const result = validateExecutionMode('parallel');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid execution mode');
    });
  });

  describe('validatePriority', () => {
    it('should accept low priority', () => {
      const result = validatePriority('low');
      expect(result.success).toBe(true);
    });

    it('should accept medium priority', () => {
      const result = validatePriority('medium');
      expect(result.success).toBe(true);
    });

    it('should accept high priority', () => {
      const result = validatePriority('high');
      expect(result.success).toBe(true);
    });

    it('should accept critical priority', () => {
      const result = validatePriority('critical');
      expect(result.success).toBe(true);
    });

    it('should reject invalid priority', () => {
      const result = validatePriority('urgent');
      expect(result.success).toBe(false);
    });
  });

  describe('validateAgentType', () => {
    const validAgents = ['secretary', 'financial', 'legal', 'analytics', 'vendor', 'notifications', 'workflow', 'compliance'];

    validAgents.forEach(agent => {
      it(`should accept ${agent} agent type`, () => {
        const result = validateAgentType(agent);
        expect(result.success).toBe(true);
        expect(result.value).toBe(agent);
      });
    });

    it('should reject invalid agent type', () => {
      const result = validateAgentType('nonexistent');
      expect(result.success).toBe(false);
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
});

// =============================================================================
// SANITIZATION TESTS
// =============================================================================

describe('Content Sanitization', () => {
  describe('sanitizeContent', () => {
    it('should remove null bytes', () => {
      const result = sanitizeContent('Hello\x00World');
      expect(result).toBe('HelloWorld');
    });

    it('should preserve newlines and tabs', () => {
      const result = sanitizeContent('Line 1\nLine 2\tTabbed');
      expect(result).toBe('Line 1\nLine 2\tTabbed');
    });

    it('should normalize line endings (CRLF to LF)', () => {
      const result = sanitizeContent('Line 1\r\nLine 2\rLine 3');
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should limit consecutive newlines to max 3', () => {
      const result = sanitizeContent('Para 1\n\n\n\n\n\nPara 2');
      expect(result).toBe('Para 1\n\n\nPara 2');
    });

    it('should trim whitespace', () => {
      const result = sanitizeContent('  \n\n  Content  \n\n  ');
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

  describe('detectInputConflicts', () => {
    it('should detect content/text conflict', () => {
      const warnings = detectInputConflicts(
        { content: 'Content A', text: 'Content B' } as any,
      );
      expect(warnings.some(w => w.includes('content and text'))).toBe(true);
    });

    it('should not warn when content and text are same', () => {
      const warnings = detectInputConflicts(
        { content: 'Same content', text: 'Same content' } as any,
      );
      expect(warnings.some(w => w.includes('content and text'))).toBe(false);
    });

    it('should detect requestType conflict between data and context', () => {
      const warnings = detectInputConflicts(
        { content: 'test', requestType: 'vendor_evaluation' } as any,
        { requestType: 'contract_review' } as any,
      );
      expect(warnings.some(w => w.includes('RequestType'))).toBe(true);
    });

    it('should detect executionMode conflict between data and context', () => {
      const warnings = detectInputConflicts(
        { content: 'test', executionMode: 'synchronous' } as any,
        { executionMode: 'asynchronous' } as any,
      );
      expect(warnings.some(w => w.includes('ExecutionMode'))).toBe(true);
    });

    it('should detect agent inclusion/exclusion overlap', () => {
      const warnings = detectInputConflicts(
        { content: 'test', requiredAgents: ['financial', 'legal'], excludeAgents: ['financial'] } as any,
      );
      expect(warnings.some(w => w.includes('required and excluded'))).toBe(true);
    });

    it('should warn about critical priority without urgent flag', () => {
      const warnings = detectInputConflicts(
        { content: 'test', priority: 'critical' } as any,
      );
      expect(warnings.some(w => w.includes('urgent'))).toBe(true);
    });

    it('should return empty array for clean input', () => {
      const warnings = detectInputConflicts(
        { content: 'Review contract terms' } as any,
      );
      expect(warnings).toHaveLength(0);
    });
  });

  describe('validateAndSanitizeManagerInput', () => {
    it('should validate and sanitize content with control characters', () => {
      const result = validateAndSanitizeManagerInput({
        content: 'Review\x00 contract\x1F terms',
      });
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Review contract terms');
    });

    it('should reject invalid input', () => {
      const result = validateAndSanitizeManagerInput({});
      expect(result.success).toBe(false);
    });

    it('should sanitize task field', () => {
      const result = validateAndSanitizeManagerInput({
        task: '  Review\x00 data  ',
      });
      expect(result.success).toBe(true);
      expect(result.data?.task).toBe('Review data');
    });
  });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe('Manager Agent Configuration', () => {
  describe('ManagerConfigSchema', () => {
    it('should parse default configuration successfully', () => {
      const config = ManagerConfigSchema.parse({});
      expect(config).toBeDefined();
      expect(config.maxConcurrentTasks).toBe(5);
      expect(config.maxRetryAttempts).toBe(3);
    });

    it('should accept valid custom configuration', () => {
      const config = ManagerConfigSchema.parse({
        maxConcurrentTasks: 10,
        maxRetryAttempts: 5,
        workflowTimeoutMs: 120000,
      });
      expect(config.maxConcurrentTasks).toBe(10);
      expect(config.maxRetryAttempts).toBe(5);
    });

    it('should reject invalid maxConcurrentTasks (exceeds max)', () => {
      expect(() => ManagerConfigSchema.parse({
        maxConcurrentTasks: 100,
      })).toThrow();
    });

    it('should reject invalid workflowTimeoutMs (below min)', () => {
      expect(() => ManagerConfigSchema.parse({
        workflowTimeoutMs: 100,
      })).toThrow();
    });

    it('should set correct defaults for all fields', () => {
      const config = ManagerConfigSchema.parse({});
      expect(config.agentSelectionConfidenceThreshold).toBe(0.7);
      expect(config.criticalPriorityThreshold).toBe(6);
      expect(config.highPriorityThreshold).toBe(4);
      expect(config.mediumPriorityThreshold).toBe(2);
      expect(config.enableParallelExecution).toBe(true);
      expect(config.enableAsyncOrchestration).toBe(true);
      expect(config.enableGracefulDegradation).toBe(true);
    });
  });

  describe('DEFAULT_MANAGER_CONFIG', () => {
    it('should be a valid configuration', () => {
      expect(DEFAULT_MANAGER_CONFIG).toBeDefined();
      expect(DEFAULT_MANAGER_CONFIG.maxConcurrentTasks).toBe(5);
    });

    it('should have all required fields', () => {
      expect(DEFAULT_MANAGER_CONFIG.agentSelectionConfidenceThreshold).toBeDefined();
      expect(DEFAULT_MANAGER_CONFIG.workflowTimeoutMs).toBeDefined();
      expect(DEFAULT_MANAGER_CONFIG.maxRetryAttempts).toBeDefined();
      expect(DEFAULT_MANAGER_CONFIG.enableParallelExecution).toBeDefined();
    });
  });

  describe('getDefaultManagerConfig', () => {
    it('should return a copy of default config', () => {
      const config = getDefaultManagerConfig();
      expect(config).toEqual(DEFAULT_MANAGER_CONFIG);
      // Ensure it's a copy, not the same reference
      expect(config).not.toBe(DEFAULT_MANAGER_CONFIG);
    });
  });

  describe('clearManagerConfigCache', () => {
    it('should not throw when clearing all cache', () => {
      expect(() => clearManagerConfigCache()).not.toThrow();
    });

    it('should not throw when clearing specific enterprise cache', () => {
      expect(() => clearManagerConfigCache(generateTestUuid())).not.toThrow();
    });
  });
});

// =============================================================================
// PRIORITY CALCULATION TESTS
// =============================================================================

describe('Priority Calculation', () => {
  const config = getDefaultManagerConfig();

  describe('calculatePriorityScore', () => {
    it('should return 0 for no flags set', () => {
      const score = calculatePriorityScore({
        hasUrgency: false,
        hasFinancialImpact: false,
        hasLegalImplications: false,
        hasComplianceRequirements: false,
        isHighComplexity: false,
      }, config);
      expect(score).toBe(0);
    });

    it('should add urgency bonus', () => {
      const score = calculatePriorityScore({
        hasUrgency: true,
        hasFinancialImpact: false,
        hasLegalImplications: false,
        hasComplianceRequirements: false,
        isHighComplexity: false,
      }, config);
      expect(score).toBe(config.urgencyPriorityBonus);
    });

    it('should add financial impact bonus', () => {
      const score = calculatePriorityScore({
        hasUrgency: false,
        hasFinancialImpact: true,
        hasLegalImplications: false,
        hasComplianceRequirements: false,
        isHighComplexity: false,
      }, config);
      expect(score).toBe(config.financialImpactPriorityBonus);
    });

    it('should accumulate all bonuses', () => {
      const score = calculatePriorityScore({
        hasUrgency: true,
        hasFinancialImpact: true,
        hasLegalImplications: true,
        hasComplianceRequirements: true,
        isHighComplexity: true,
      }, config);
      const expected = config.urgencyPriorityBonus +
        config.financialImpactPriorityBonus +
        config.legalImplicationsPriorityBonus +
        config.complianceRequirementsPriorityBonus +
        config.highComplexityPriorityBonus;
      expect(score).toBe(expected);
    });
  });

  describe('getPriorityLevel', () => {
    it('should return critical for high scores', () => {
      expect(getPriorityLevel(10, config)).toBe('critical');
    });

    it('should return high for scores at highPriorityThreshold', () => {
      expect(getPriorityLevel(config.highPriorityThreshold, config)).toBe('high');
    });

    it('should return medium for scores at mediumPriorityThreshold', () => {
      expect(getPriorityLevel(config.mediumPriorityThreshold, config)).toBe('medium');
    });

    it('should return low for scores below mediumPriorityThreshold', () => {
      expect(getPriorityLevel(0, config)).toBe('low');
    });
  });

  describe('isCriticalPriority', () => {
    it('should return true for scores at or above critical threshold', () => {
      expect(isCriticalPriority(config.criticalPriorityThreshold, config)).toBe(true);
      expect(isCriticalPriority(config.criticalPriorityThreshold + 1, config)).toBe(true);
    });

    it('should return false for scores below critical threshold', () => {
      expect(isCriticalPriority(config.criticalPriorityThreshold - 1, config)).toBe(false);
    });
  });
});

// =============================================================================
// COMPLEXITY ASSESSMENT TESTS
// =============================================================================

describe('Complexity Assessment', () => {
  const config = getDefaultManagerConfig();

  describe('assessComplexity', () => {
    it('should return low for short content with few aspects', () => {
      const result = assessComplexity(100, 0, config);
      expect(result).toBe('low');
    });

    it('should return medium for medium-length content with some aspects', () => {
      // 600 chars > mediumComplexityContentLength (500) => +1, plus 2 aspects = 3 total => medium
      const result = assessComplexity(600, 2, config);
      expect(result).toBe('medium');
    });

    it('should return high for long content with many aspects', () => {
      const result = assessComplexity(1500, 3, config);
      expect(result).toBe('high');
    });

    it('should factor in aspect count', () => {
      const lowAspects = assessComplexity(100, 0, config);
      const highAspects = assessComplexity(100, 5, config);
      // More aspects should increase complexity
      expect(['medium', 'high']).toContain(highAspects);
      expect(lowAspects).toBe('low');
    });
  });
});

// =============================================================================
// RATE LIMITING TESTS
// =============================================================================

describe('Rate Limiting Configuration', () => {
  const config = getDefaultManagerConfig();

  describe('wouldExceedTaskRateLimit', () => {
    it('should return true when at max', () => {
      expect(wouldExceedTaskRateLimit(config.maxTasksPerMinute, config)).toBe(true);
    });

    it('should return false when below max', () => {
      expect(wouldExceedTaskRateLimit(0, config)).toBe(false);
    });

    it('should return true when over max', () => {
      expect(wouldExceedTaskRateLimit(config.maxTasksPerMinute + 10, config)).toBe(true);
    });
  });

  describe('wouldExceedWorkflowLimit', () => {
    it('should return true when at max', () => {
      expect(wouldExceedWorkflowLimit(config.maxConcurrentWorkflows, config)).toBe(true);
    });

    it('should return false when below max', () => {
      expect(wouldExceedWorkflowLimit(0, config)).toBe(false);
    });
  });
});

// =============================================================================
// ESCALATION TESTS
// =============================================================================

describe('Escalation Rules', () => {
  const config = getDefaultManagerConfig();

  describe('shouldEscalateOnFailure', () => {
    it('should return true when failures exceed threshold', () => {
      expect(shouldEscalateOnFailure(config.failureEscalationThreshold, config)).toBe(true);
    });

    it('should return false when failures below threshold', () => {
      expect(shouldEscalateOnFailure(0, config)).toBe(false);
    });

    it('should return false when escalation is disabled', () => {
      const disabledConfig = { ...config, enableFailureEscalation: false };
      expect(shouldEscalateOnFailure(100, disabledConfig)).toBe(false);
    });
  });

  describe('shouldEscalateOnTimeout', () => {
    it('should return true when elapsed time exceeds threshold', () => {
      expect(shouldEscalateOnTimeout(config.escalationTimeoutMs, config)).toBe(true);
    });

    it('should return false when elapsed time is below threshold', () => {
      expect(shouldEscalateOnTimeout(0, config)).toBe(false);
    });

    it('should return false when timeout escalation is disabled', () => {
      const disabledConfig = { ...config, enableTimeoutEscalation: false };
      expect(shouldEscalateOnTimeout(999999, disabledConfig)).toBe(false);
    });
  });
});

// =============================================================================
// AGENT DURATION ESTIMATION TESTS
// =============================================================================

describe('Agent Duration Estimation', () => {
  const config = getDefaultManagerConfig();

  describe('getAgentDurationEstimate', () => {
    it('should return correct estimate for secretary', () => {
      expect(getAgentDurationEstimate('secretary', config)).toBe(config.secretaryDurationEstimate);
    });

    it('should return correct estimate for financial', () => {
      expect(getAgentDurationEstimate('financial', config)).toBe(config.financialDurationEstimate);
    });

    it('should return correct estimate for legal', () => {
      expect(getAgentDurationEstimate('legal', config)).toBe(config.legalDurationEstimate);
    });

    it('should return correct estimate for vendor', () => {
      expect(getAgentDurationEstimate('vendor', config)).toBe(config.vendorDurationEstimate);
    });

    it('should return correct estimate for analytics', () => {
      expect(getAgentDurationEstimate('analytics', config)).toBe(config.analyticsDurationEstimate);
    });

    it('should return correct estimate for notifications', () => {
      expect(getAgentDurationEstimate('notifications', config)).toBe(config.notificationsDurationEstimate);
    });

    it('should return default estimate for unknown agent type', () => {
      expect(getAgentDurationEstimate('unknown_agent', config)).toBe(config.defaultDurationEstimate);
    });
  });

  describe('estimateOrchestrationDuration', () => {
    it('should sum agent durations for low complexity', () => {
      const duration = estimateOrchestrationDuration(['secretary', 'financial'], 'low', config);
      expect(duration).toBe(config.secretaryDurationEstimate + config.financialDurationEstimate);
    });

    it('should apply 1.5x multiplier for medium complexity', () => {
      const duration = estimateOrchestrationDuration(['secretary'], 'medium', config);
      expect(duration).toBe(Math.round(config.secretaryDurationEstimate * 1.5));
    });

    it('should apply 2x multiplier for high complexity', () => {
      const duration = estimateOrchestrationDuration(['secretary'], 'high', config);
      expect(duration).toBe(Math.round(config.secretaryDurationEstimate * 2));
    });

    it('should handle empty agent list', () => {
      const duration = estimateOrchestrationDuration([], 'low', config);
      expect(duration).toBe(0);
    });

    it('should sum multiple agents correctly', () => {
      const agents = ['secretary', 'financial', 'legal', 'analytics'];
      const duration = estimateOrchestrationDuration(agents, 'low', config);
      const expected = config.secretaryDurationEstimate +
        config.financialDurationEstimate +
        config.legalDurationEstimate +
        config.analyticsDurationEstimate;
      expect(duration).toBe(expected);
    });
  });
});

// =============================================================================
// CONFIGURATION VALIDATION TESTS
// =============================================================================

describe('Configuration Validation', () => {
  describe('validateConfigOverride', () => {
    it('should accept valid partial override', () => {
      const result = validateConfigOverride({
        maxConcurrentTasks: 8,
        enableParallelExecution: false,
      });
      expect(result.valid).toBe(true);
      expect(result.config?.maxConcurrentTasks).toBe(8);
    });

    it('should accept empty override', () => {
      const result = validateConfigOverride({});
      expect(result.valid).toBe(true);
    });

    it('should reject invalid values in override', () => {
      const result = validateConfigOverride({
        maxConcurrentTasks: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateConfigThresholds', () => {
    it('should return empty array for valid default config', () => {
      const errors = validateConfigThresholds(DEFAULT_MANAGER_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('should detect inverted priority thresholds', () => {
      const badConfig = {
        ...DEFAULT_MANAGER_CONFIG,
        criticalPriorityThreshold: 2,
        highPriorityThreshold: 4,
      };
      const errors = validateConfigThresholds(badConfig);
      expect(errors.some(e => e.includes('criticalPriorityThreshold'))).toBe(true);
    });

    it('should detect step timeout exceeding workflow timeout', () => {
      const badConfig = {
        ...DEFAULT_MANAGER_CONFIG,
        stepTimeoutMs: 400000,
        workflowTimeoutMs: 300000,
      };
      const errors = validateConfigThresholds(badConfig);
      expect(errors.some(e => e.includes('stepTimeoutMs'))).toBe(true);
    });

    it('should detect inverted retry delays', () => {
      const badConfig = {
        ...DEFAULT_MANAGER_CONFIG,
        baseRetryDelayMs: 15000,
        maxRetryDelayMs: 10000,
      };
      const errors = validateConfigThresholds(badConfig);
      expect(errors.some(e => e.includes('baseRetryDelayMs'))).toBe(true);
    });

    it('should detect inverted complexity content thresholds', () => {
      const badConfig = {
        ...DEFAULT_MANAGER_CONFIG,
        highComplexityContentLength: 200,
        mediumComplexityContentLength: 500,
      };
      const errors = validateConfigThresholds(badConfig);
      expect(errors.some(e => e.includes('highComplexityContentLength'))).toBe(true);
    });

    it('should detect quality gate above consensus threshold', () => {
      const badConfig = {
        ...DEFAULT_MANAGER_CONFIG,
        qualityGateThreshold: 0.9,
        consensusThreshold: 0.5,
      };
      const errors = validateConfigThresholds(badConfig);
      expect(errors.some(e => e.includes('qualityGateThreshold'))).toBe(true);
    });
  });
});

// =============================================================================
// MOCK DATA GENERATOR TESTS
// =============================================================================

describe('Mock Data Generators', () => {
  describe('generateTestUuid', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateTestUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set(Array.from({ length: 100 }, () => generateTestUuid()));
      expect(uuids.size).toBe(100);
    });
  });

  describe('generateMockOrchestrationPlan', () => {
    it('should generate valid default plan', () => {
      const plan = generateMockOrchestrationPlan();
      expect(plan.orchestrationId).toBeDefined();
      expect(plan.type).toBe('single_agent');
      expect(plan.requiredAgents).toHaveLength(1);
      expect(plan.steps).toHaveLength(1);
    });

    it('should apply custom overrides', () => {
      const plan = generateMockOrchestrationPlan({
        type: 'multi_agent',
        complexity: 'high',
        priority: 'critical',
      });
      expect(plan.type).toBe('multi_agent');
      expect(plan.complexity).toBe('high');
      expect(plan.priority).toBe('critical');
    });
  });

  describe('generateMockMultiAgentPlan', () => {
    it('should generate multi-agent plan with dependencies', () => {
      const plan = generateMockMultiAgentPlan();
      expect(plan.type).toBe('multi_agent');
      expect(plan.requiredAgents.length).toBeGreaterThan(1);
      expect(plan.dependencies.length).toBeGreaterThan(0);
    });
  });

  describe('generateMockWorkflowExecution', () => {
    it('should generate completed workflow by default', () => {
      const execution = generateMockWorkflowExecution();
      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(2);
    });

    it('should allow custom overrides', () => {
      const execution = generateMockWorkflowExecution({
        status: 'failed',
        workflowName: 'Custom Workflow',
      });
      expect(execution.status).toBe('failed');
      expect(execution.workflowName).toBe('Custom Workflow');
    });
  });

  describe('generateMockAgentResult', () => {
    it('should generate successful result by default', () => {
      const result = generateMockAgentResult();
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.85);
    });

    it('should allow failure override', () => {
      const result = generateMockAgentResult({
        success: false,
        confidence: 0,
        error: 'Agent failed',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent failed');
    });
  });

  describe('createMockSupabaseClient', () => {
    it('should create a mock client with default data', () => {
      const client = createMockSupabaseClient();
      expect(client).toBeDefined();
      expect(client.from).toBeDefined();
    });

    it('should return agents data from agents table', async () => {
      const client = createMockSupabaseClient();
      const result = await (client.from('agents') as any).select('*').eq('type', 'secretary').single();
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should allow custom overrides', () => {
      const customAgents = [{ id: generateTestUuid(), type: 'custom_agent' }];
      const client = createMockSupabaseClient({ agents: customAgents });
      expect(client).toBeDefined();
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  describe('Very long content handling', () => {
    it('should handle very long content in validation', () => {
      const result = validateManagerAgentInput(EDGE_CASE_DATA.veryLongContent);
      expect(result.success).toBe(true);
    });
  });

  describe('Special character handling', () => {
    it('should handle content with HTML-like characters', () => {
      const result = validateManagerAgentInput(EDGE_CASE_DATA.specialCharacterContent);
      expect(result.success).toBe(true);
    });

    it('should sanitize special characters', () => {
      const sanitized = sanitizeContent('Hello\x00World\x01Test');
      expect(sanitized).not.toContain('\x00');
      expect(sanitized).not.toContain('\x01');
    });
  });

  describe('Unicode content handling', () => {
    it('should handle unicode content', () => {
      const result = validateManagerAgentInput(EDGE_CASE_DATA.unicodeContent);
      expect(result.success).toBe(true);
    });
  });

  describe('Maximum agents requested', () => {
    it('should accept all 8 agent types', () => {
      const result = validateManagerAgentInput(EDGE_CASE_DATA.maxAgents);
      expect(result.success).toBe(true);
      expect(result.data?.requiredAgents).toHaveLength(8);
    });
  });

  describe('Conflicting inputs', () => {
    it('should validate conflicting inputs without error', () => {
      const result = validateManagerAgentInput(EDGE_CASE_DATA.conflictingInputs);
      expect(result.success).toBe(true);
    });

    it('should detect conflicts in conflicting inputs', () => {
      const warnings = detectInputConflicts(
        EDGE_CASE_DATA.conflictingInputs as any,
      );
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Boundary value tests', () => {
    it('should accept maxConcurrency at boundary (1)', () => {
      const result = validateManagerAgentInput({
        content: 'test',
        maxConcurrency: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maxConcurrency at upper boundary (10)', () => {
      const result = validateManagerAgentInput({
        content: 'test',
        maxConcurrency: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should reject maxConcurrency above upper boundary', () => {
      const result = validateManagerAgentInput({
        content: 'test',
        maxConcurrency: 11,
      });
      expect(result.success).toBe(false);
    });

    it('should accept timeoutMs at minimum boundary (5000)', () => {
      const result = validateManagerAgentInput({
        content: 'test',
        timeoutMs: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept timeoutMs at maximum boundary (600000)', () => {
      const result = validateManagerAgentInput({
        content: 'test',
        timeoutMs: 600000,
      });
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// ERROR SCENARIO TESTS
// =============================================================================

describe('Error Scenarios', () => {
  describe('Error classification', () => {
    it('should have database error scenario', () => {
      expect(ERROR_SCENARIOS.databaseError.category).toBe('database');
      expect(ERROR_SCENARIOS.databaseError.isRetryable).toBe(true);
    });

    it('should have validation error scenario', () => {
      expect(ERROR_SCENARIOS.validationError.category).toBe('validation');
      expect(ERROR_SCENARIOS.validationError.isRetryable).toBe(false);
    });

    it('should have timeout error scenario', () => {
      expect(ERROR_SCENARIOS.timeoutError.category).toBe('timeout');
      expect(ERROR_SCENARIOS.timeoutError.isRetryable).toBe(true);
    });

    it('should have rate limit error scenario', () => {
      expect(ERROR_SCENARIOS.rateLimitError.category).toBe('rate_limit');
      expect(ERROR_SCENARIOS.rateLimitError.isRetryable).toBe(true);
    });

    it('should have permission error scenario', () => {
      expect(ERROR_SCENARIOS.permissionError.category).toBe('permission');
      expect(ERROR_SCENARIOS.permissionError.isRetryable).toBe(false);
    });

    it('should have network error scenario', () => {
      expect(ERROR_SCENARIOS.networkError.category).toBe('network');
      expect(ERROR_SCENARIOS.networkError.isRetryable).toBe(true);
    });

    it('should have internal error scenario', () => {
      expect(ERROR_SCENARIOS.internalError.category).toBe('internal');
      expect(ERROR_SCENARIOS.internalError.isRetryable).toBe(false);
    });
  });
});

// =============================================================================
// REQUEST ANALYSIS DATA TESTS
// =============================================================================

describe('Request Analysis Data', () => {
  describe('Keyword categorization', () => {
    it('should have contract keywords', () => {
      expect(REQUEST_ANALYSIS_DATA.contractKeywords.length).toBeGreaterThan(0);
      REQUEST_ANALYSIS_DATA.contractKeywords.forEach(kw => {
        expect(kw.toLowerCase()).toMatch(/contract|agreement|clause/);
      });
    });

    it('should have vendor keywords', () => {
      expect(REQUEST_ANALYSIS_DATA.vendorKeywords.length).toBeGreaterThan(0);
      REQUEST_ANALYSIS_DATA.vendorKeywords.forEach(kw => {
        expect(kw.toLowerCase()).toMatch(/vendor|supplier|onboard|evaluate/);
      });
    });

    it('should have financial keywords', () => {
      expect(REQUEST_ANALYSIS_DATA.financialKeywords.length).toBeGreaterThan(0);
      REQUEST_ANALYSIS_DATA.financialKeywords.forEach(kw => {
        expect(kw.toLowerCase()).toMatch(/cost|budget|expense|financial|payment/);
      });
    });

    it('should have compliance keywords', () => {
      expect(REQUEST_ANALYSIS_DATA.complianceKeywords.length).toBeGreaterThan(0);
      REQUEST_ANALYSIS_DATA.complianceKeywords.forEach(kw => {
        expect(kw.toLowerCase()).toMatch(/compliance|regulation|audit|gdpr|policy/);
      });
    });

    it('should have urgency keywords', () => {
      expect(REQUEST_ANALYSIS_DATA.urgencyKeywords.length).toBeGreaterThan(0);
      REQUEST_ANALYSIS_DATA.urgencyKeywords.forEach(kw => {
        expect(kw.toLowerCase()).toMatch(/urgent|critical|emergency|asap|deadline/);
      });
    });

    it('should have financial impact keywords', () => {
      expect(REQUEST_ANALYSIS_DATA.financialImpactKeywords.length).toBeGreaterThan(0);
      REQUEST_ANALYSIS_DATA.financialImpactKeywords.forEach(kw => {
        expect(kw.toLowerCase()).toMatch(/\$|cost|dollar|budget|invoice|payment/);
      });
    });
  });
});

// =============================================================================
// INTEGRATION-STYLE TESTS (Schema + Config together)
// =============================================================================

describe('Schema and Config Integration', () => {
  it('should validate input, then apply config-based priority', () => {
    const inputResult = validateManagerAgentInput(VALID_MANAGER_INPUTS.urgentRequest);
    expect(inputResult.success).toBe(true);

    const config = getDefaultManagerConfig();
    const score = calculatePriorityScore({
      hasUrgency: true,
      hasFinancialImpact: false,
      hasLegalImplications: false,
      hasComplianceRequirements: false,
      isHighComplexity: false,
    }, config);
    const level = getPriorityLevel(score, config);
    expect(['medium', 'high', 'critical']).toContain(level);
  });

  it('should validate complex input and assess high complexity', () => {
    const inputResult = validateManagerAgentInput(VALID_MANAGER_INPUTS.complexMultiAspect);
    expect(inputResult.success).toBe(true);

    const config = getDefaultManagerConfig();
    const content = VALID_MANAGER_INPUTS.complexMultiAspect.content;
    const aspects = ['financial', 'legal', 'compliance', 'vendor', 'contract'];
    const mentionedAspects = aspects.filter(a => content.toLowerCase().includes(a));

    const complexity = assessComplexity(content.length, mentionedAspects.length, config);
    expect(['medium', 'high']).toContain(complexity);
  });

  it('should validate all request types match config priority system', () => {
    const requestTypes = [
      'contract_review', 'vendor_evaluation', 'financial_analysis',
      'compliance_check', 'document_processing', 'alert_configuration',
      'performance_review', 'risk_assessment', 'general_request',
    ];

    requestTypes.forEach(type => {
      const result = validateRequestType(type);
      expect(result.success).toBe(true);
    });
  });

  it('should validate context and use for conflict detection', () => {
    const inputResult = validateManagerAgentInput({
      content: 'Review contract',
      requestType: 'contract_review',
    });
    expect(inputResult.success).toBe(true);

    const contextResult = validateManagerContext({
      requestType: 'vendor_evaluation',
    });
    expect(contextResult.success).toBe(true);

    const warnings = detectInputConflicts(inputResult.data!, contextResult.data);
    expect(warnings.some(w => w.includes('RequestType'))).toBe(true);
  });

  it('should estimate orchestration duration using config values', () => {
    const config = getDefaultManagerConfig();
    const agents = ['secretary', 'financial', 'legal'];
    const duration = estimateOrchestrationDuration(agents, 'high', config);

    const baseDuration = config.secretaryDurationEstimate +
      config.financialDurationEstimate +
      config.legalDurationEstimate;
    expect(duration).toBe(Math.round(baseDuration * 2));
  });
});
