/**
 * Comprehensive test suite for Analytics Agent
 *
 * Tests input validation, configuration, error handling, and analysis functions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateAnalyticsAgentInput,
  validateAgentContext,
  validateUuid,
  validateDateRange,
  sanitizeContent,
  detectEncodingIssues,
  detectInputConflicts,
  normalizeLookbackToDays,
} from '../supabase/functions/local-agents/schemas/analytics';
import {
  AnalyticsConfigSchema,
  DEFAULT_ANALYTICS_CONFIG,
  getDefaultAnalyticsConfig,
  isSignificantTrend,
  isHighSignificanceTrend,
  assessConcentrationRisk,
  isPoorPerformance,
  assessAnomalySeverity,
  isBudgetDepletionCritical,
  isCategoryGrowthSignificant,
  hasComplianceGap,
  isRapidGrowth,
  validateConfigThresholds,
} from '../supabase/functions/local-agents/config/analytics-config';
import {
  generateTestUuid,
  createMockSupabaseClient,
  VALID_ANALYTICS_INPUTS,
  VALID_CONTEXT,
  INVALID_ANALYTICS_INPUTS,
} from './fixtures/analytics-test-data';

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe('Analytics Agent Input Validation', () => {
  describe('validateAnalyticsAgentInput', () => {
    it('should accept valid contract analysis input', () => {
      const result = validateAnalyticsAgentInput(VALID_ANALYTICS_INPUTS.contractAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('contracts');
    });

    it('should accept valid vendor analysis input', () => {
      const result = validateAnalyticsAgentInput(VALID_ANALYTICS_INPUTS.vendorAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('vendors');
    });

    it('should accept valid budget analysis input', () => {
      const result = validateAnalyticsAgentInput(VALID_ANALYTICS_INPUTS.budgetAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('budgets');
    });

    it('should accept valid comprehensive analysis input', () => {
      const result = validateAnalyticsAgentInput(VALID_ANALYTICS_INPUTS.comprehensiveAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('comprehensive');
    });

    it('should accept empty object for default comprehensive analysis', () => {
      const result = validateAnalyticsAgentInput({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid analysis type', () => {
      const result = validateAnalyticsAgentInput(INVALID_ANALYTICS_INPUTS.invalidAnalysisType);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject negative lookback', () => {
      const result = validateAnalyticsAgentInput(INVALID_ANALYTICS_INPUTS.invalidLookback);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date range (end before start)', () => {
      const result = validateAnalyticsAgentInput(INVALID_ANALYTICS_INPUTS.invalidDateRange);
      expect(result.success).toBe(false);
    });

    it('should reject excessive monthsAhead', () => {
      const result = validateAnalyticsAgentInput(INVALID_ANALYTICS_INPUTS.invalidMonthsAhead);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for vendorId', () => {
      const result = validateAnalyticsAgentInput(INVALID_ANALYTICS_INPUTS.invalidUuid);
      expect(result.success).toBe(false);
    });
  });

  describe('validateAgentContext', () => {
    it('should accept valid context with all fields', () => {
      const result = validateAgentContext(VALID_CONTEXT);
      expect(result.success).toBe(true);
    });

    it('should accept empty context', () => {
      const result = validateAgentContext({});
      expect(result.success).toBe(true);
    });

    it('should reject context with extra fields (strict mode)', () => {
      const result = validateAgentContext({
        ...VALID_CONTEXT,
        extraField: 'not allowed',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in context', () => {
      const result = validateAgentContext({
        userId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateUuid', () => {
    it('should accept valid UUID', () => {
      const result = validateUuid(generateTestUuid());
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = validateUuid('not-a-uuid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid UUID format');
    });

    it('should reject non-string values', () => {
      const result = validateUuid(12345);
      expect(result.success).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('should accept valid date range', () => {
      const result = validateDateRange('2025-01-01', '2025-12-31');
      expect(result.valid).toBe(true);
    });

    it('should accept same start and end date', () => {
      const result = validateDateRange('2025-06-15', '2025-06-15');
      expect(result.valid).toBe(true);
    });

    it('should reject end before start', () => {
      const result = validateDateRange('2025-12-01', '2025-01-01');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });

    it('should reject invalid date format', () => {
      const result = validateDateRange('invalid', '2025-01-01');
      expect(result.valid).toBe(false);
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

    it('should normalize line endings', () => {
      const input = 'Line 1\r\nLine 2\rLine 3';
      const result = sanitizeContent(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should limit consecutive newlines', () => {
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

    it('should handle null/undefined', () => {
      expect(sanitizeContent(null as unknown as string)).toBe('');
      expect(sanitizeContent(undefined as unknown as string)).toBe('');
    });
  });

  describe('detectEncodingIssues', () => {
    it('should detect no issues in clean content', () => {
      const result = detectEncodingIssues('Clean ASCII content');
      expect(result.hasMojibake).toBe(false);
      expect(result.examples).toHaveLength(0);
    });

    it('should detect UTF-8 decoded as Latin-1 pattern', () => {
      const input = 'Caf\u00C3\u00A9'; // Cafe encoded incorrectly
      const result = detectEncodingIssues(input);
      expect(result.hasMojibake).toBe(true);
    });

    it('should handle empty content', () => {
      const result = detectEncodingIssues('');
      expect(result.hasMojibake).toBe(false);
    });
  });

  describe('detectInputConflicts', () => {
    it('should detect content and text mismatch', () => {
      const conflicts = detectInputConflicts({
        content: 'Content A',
        text: 'Content B',
      });
      expect(conflicts).toContain('Both content and text provided with different values - using content');
    });

    it('should not warn when content and text are identical', () => {
      const conflicts = detectInputConflicts({
        content: 'Same content',
        text: 'Same content',
      });
      expect(conflicts).not.toContain('Both content and text provided');
    });

    it('should detect date range with lookback conflict', () => {
      const conflicts = detectInputConflicts({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        lookback: 12,
      });
      expect(conflicts).toContain('Both date range and lookback provided - date range takes precedence');
    });

    it('should detect vendorId mismatch between data and context', () => {
      const dataVendorId = generateTestUuid();
      const contextVendorId = generateTestUuid();
      const conflicts = detectInputConflicts(
        { vendorId: dataVendorId },
        { vendorId: contextVendorId },
      );
      expect(conflicts).toContain('VendorId differs between data and context - using data.vendorId');
    });

    it('should return empty array for clean input', () => {
      const conflicts = detectInputConflicts({
        analysisType: 'contracts',
        period: 'month',
      });
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('normalizeLookbackToDays', () => {
    it('should convert months to days', () => {
      expect(normalizeLookbackToDays(3, 'month')).toBe(90);
    });

    it('should convert weeks to days', () => {
      expect(normalizeLookbackToDays(2, 'week')).toBe(14);
    });

    it('should convert quarters to days', () => {
      expect(normalizeLookbackToDays(1, 'quarter')).toBe(90);
    });

    it('should convert years to days', () => {
      expect(normalizeLookbackToDays(1, 'year')).toBe(365);
    });

    it('should default to months', () => {
      expect(normalizeLookbackToDays(2)).toBe(60);
    });
  });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe('Analytics Agent Configuration', () => {
  describe('AnalyticsConfigSchema', () => {
    it('should parse default configuration', () => {
      const config = AnalyticsConfigSchema.parse({});
      expect(config).toBeDefined();
      expect(config.significantTrendThreshold).toBe(0.1);
    });

    it('should accept valid custom configuration', () => {
      const config = AnalyticsConfigSchema.parse({
        significantTrendThreshold: 0.15,
        poorPerformanceThreshold: 0.5,
        maxRetryAttempts: 5,
      });
      expect(config.significantTrendThreshold).toBe(0.15);
      expect(config.poorPerformanceThreshold).toBe(0.5);
      expect(config.maxRetryAttempts).toBe(5);
    });

    it('should reject invalid threshold values', () => {
      expect(() => AnalyticsConfigSchema.parse({
        significantTrendThreshold: -0.1,
      })).toThrow();
    });

    it('should reject invalid timeout values', () => {
      expect(() => AnalyticsConfigSchema.parse({
        analysisTimeoutMs: 1000, // Below minimum
      })).toThrow();
    });
  });

  describe('getDefaultAnalyticsConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultAnalyticsConfig();
      expect(config).toEqual(DEFAULT_ANALYTICS_CONFIG);
    });

    it('should return a copy, not the original', () => {
      const config1 = getDefaultAnalyticsConfig();
      const config2 = getDefaultAnalyticsConfig();
      expect(config1).not.toBe(config2);
    });
  });

  describe('validateConfigThresholds', () => {
    it('should return empty array for valid default config', () => {
      const errors = validateConfigThresholds(DEFAULT_ANALYTICS_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('should detect concentration threshold inversion', () => {
      const config = {
        ...DEFAULT_ANALYTICS_CONFIG,
        highConcentrationRatioThreshold: 0.3,
        mediumConcentrationRatioThreshold: 0.5,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('highConcentrationRatioThreshold');
    });

    it('should detect retry delay inversion', () => {
      const config = {
        ...DEFAULT_ANALYTICS_CONFIG,
        baseRetryDelayMs: 5000,
        maxRetryDelayMs: 1000,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('baseRetryDelayMs'))).toBe(true);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS
// =============================================================================

describe('Configuration Helper Functions', () => {
  const config = DEFAULT_ANALYTICS_CONFIG;

  describe('isSignificantTrend', () => {
    it('should return true for significant positive trend', () => {
      expect(isSignificantTrend(0.15, config)).toBe(true);
    });

    it('should return true for significant negative trend', () => {
      expect(isSignificantTrend(-0.12, config)).toBe(true);
    });

    it('should return false for insignificant trend', () => {
      expect(isSignificantTrend(0.05, config)).toBe(false);
    });
  });

  describe('isHighSignificanceTrend', () => {
    it('should return true for high significance trend', () => {
      expect(isHighSignificanceTrend(0.25, config)).toBe(true);
    });

    it('should return false for medium significance trend', () => {
      expect(isHighSignificanceTrend(0.15, config)).toBe(false);
    });
  });

  describe('assessConcentrationRisk', () => {
    it('should return high for high concentration', () => {
      expect(assessConcentrationRisk(0.8, 0.3, config)).toBe('high');
    });

    it('should return medium for medium concentration', () => {
      expect(assessConcentrationRisk(0.6, 0.2, config)).toBe('medium');
    });

    it('should return low for low concentration', () => {
      expect(assessConcentrationRisk(0.3, 0.1, config)).toBe('low');
    });

    it('should prioritize HHI when higher than ratio', () => {
      expect(assessConcentrationRisk(0.3, 0.3, config)).toBe('high');
    });
  });

  describe('isPoorPerformance', () => {
    it('should return true for poor performance', () => {
      expect(isPoorPerformance(0.4, config)).toBe(true);
    });

    it('should return false for good performance', () => {
      expect(isPoorPerformance(0.8, config)).toBe(false);
    });

    it('should return false at threshold boundary', () => {
      expect(isPoorPerformance(0.6, config)).toBe(false);
    });
  });

  describe('assessAnomalySeverity', () => {
    it('should return high for high z-score', () => {
      expect(assessAnomalySeverity(5, config)).toBe('high');
    });

    it('should return medium for medium z-score', () => {
      expect(assessAnomalySeverity(3.5, config)).toBe('medium');
    });

    it('should return low for low z-score', () => {
      expect(assessAnomalySeverity(2, config)).toBe('low');
    });
  });

  describe('isBudgetDepletionCritical', () => {
    it('should return true when under threshold', () => {
      expect(isBudgetDepletionCritical(1, config)).toBe(true);
    });

    it('should return false when above threshold', () => {
      expect(isBudgetDepletionCritical(6, config)).toBe(false);
    });
  });

  describe('isCategoryGrowthSignificant', () => {
    it('should return true for high growth', () => {
      expect(isCategoryGrowthSignificant(25, config)).toBe(true);
    });

    it('should return false for normal growth', () => {
      expect(isCategoryGrowthSignificant(10, config)).toBe(false);
    });
  });

  describe('hasComplianceGap', () => {
    it('should return true when below threshold', () => {
      expect(hasComplianceGap(70, config)).toBe(true);
    });

    it('should return false when above threshold', () => {
      expect(hasComplianceGap(90, config)).toBe(false);
    });
  });

  describe('isRapidGrowth', () => {
    it('should return true for rapid growth', () => {
      expect(isRapidGrowth(25, config)).toBe(true);
    });

    it('should return false for normal growth', () => {
      expect(isRapidGrowth(15, config)).toBe(false);
    });
  });
});

// =============================================================================
// MOCK SUPABASE CLIENT TESTS
// =============================================================================

describe('Mock Supabase Client', () => {
  it('should create chainable query for contracts', async () => {
    const client = createMockSupabaseClient();
    const result = await client
      .from('contracts')
      .select('*')
      .eq('enterprise_id', 'test');

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('should return enterprise analytics from RPC', async () => {
    const client = createMockSupabaseClient();
    const result = await client.rpc('get_enterprise_analytics', {
      p_enterprise_id: 'test',
    });

    expect(result.data).toBeDefined();
    expect(result.data.current_snapshot).toBeDefined();
  });

  it('should allow custom data overrides', async () => {
    const customContracts = [
      {
        id: generateTestUuid(),
        title: 'Custom Contract',
        value: 999999,
        status: 'active',
        start_date: '2025-01-01',
        end_date: '2026-01-01',
        is_auto_renew: true,
        vendor: { id: generateTestUuid(), name: 'Custom Vendor', performance_score: 0.99 },
      },
    ];

    const client = createMockSupabaseClient({ contracts: customContracts });
    const result = await client.from('contracts').select('*');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Custom Contract');
  });
});
