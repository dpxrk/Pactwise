/**
 * Comprehensive test suite for Vendor Agent
 *
 * Tests input validation, configuration, error handling, and analysis functions.
 * Covers specific vendor analysis, portfolio analysis, new vendor evaluation,
 * and general vendor assessment capabilities.
 *
 * @module VendorAgentComprehensiveTests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateVendorAgentInput,
  validateVendorContext,
  validateUuid,
  validateVendorCategory,
  validateAnalysisType,
  sanitizeContent,
  detectEncodingIssues,
  detectInputConflicts,
  sanitizeVendorName,
  validateAndSanitizeVendorInput,
} from '../supabase/functions/local-agents/schemas/vendor';
import {
  VendorConfigSchema,
  DEFAULT_VENDOR_CONFIG,
  getDefaultVendorConfig,
  clearVendorConfigCache,
  isExcellentPerformance,
  isGoodPerformance,
  isAveragePerformance,
  isPoorPerformance,
  getPerformanceRating,
  assessConcentrationRisk,
  isHighIssueFrequency,
  isMediumIssueFrequency,
  assessIssueFrequencyRisk,
  isSignificantPerformanceDecline,
  determineSpendLevel,
  isStrategicSpend,
  isSignificantSpend,
  isComplianceExpired,
  isComplianceExpiringSoon,
  getDaysUntilComplianceExpiration,
  hasRequiredCertifications,
  getMissingCertifications,
  isInsuranceCoverageAdequate,
  shouldApproveOnboarding,
  meetsReferenceCountRequirement,
  meetsReferenceRatingRequirement,
  validateOnboardingRequirements,
  isAboveMarketPricing,
  isBelowMarketPricing,
  assessPricingCompetitiveness,
  isPriceVolatile,
  calculateRelationshipScore,
  validateScoringWeights,
  validateConfigThresholds,
  validateConfigOverride,
} from '../supabase/functions/local-agents/config/vendor-config';
import {
  generateTestUuid,
  createMockSupabaseClient,
  generateMockVendor,
  generateMockVendors,
  generateMockPortfolio,
  generateMockNewVendorData,
  generateMockVendorAnalysis,
  generateMockPortfolioAnalysis,
  generateMockNewVendorEvaluation,
  VALID_VENDOR_INPUTS,
  VALID_VENDOR_CONTEXT,
  INVALID_VENDOR_INPUTS,
  INVALID_VENDOR_CONTEXT,
  ERROR_SCENARIOS,
  EDGE_CASE_DATA,
} from './fixtures/vendor-test-data';

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe('Vendor Agent Input Validation', () => {
  describe('validateVendorAgentInput', () => {
    it('should accept valid specific vendor analysis input', () => {
      const result = validateVendorAgentInput(VALID_VENDOR_INPUTS.specificVendorAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.vendorId).toBeDefined();
      expect(result.data?.analysisType).toBe('specific');
    });

    it('should accept valid portfolio analysis input with name identifier', () => {
      // Portfolio analysis needs at least one identifier (name, vendorId, content, etc.)
      const result = validateVendorAgentInput({
        ...VALID_VENDOR_INPUTS.portfolioAnalysis,
        name: 'Portfolio Analysis',
      });
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('portfolio');
    });

    it('should accept valid new vendor evaluation input', () => {
      // Onboarding requires documentation which has data, satisfying the "at least one identifier" requirement
      // Note: references must match ReferenceSchema which uses strict mode
      const result = validateVendorAgentInput({
        name: 'New Vendor',
        analysisType: 'onboarding',
        documentation: {
          businessLicense: true,
          insurance: true,
          taxId: true,
          bankDetails: true,
        },
        financial: {
          revenue: 5000000,
          profitMargin: 0.15,
          debtRatio: 0.3,
          creditScore: 720,
        },
        references: [
          { name: 'Reference Corp', rating: 4.5 },
          { name: 'Partner Inc', rating: 4.2 },
        ],
        requiredCapabilities: ['Cloud hosting', 'API integration'],
        vendorCapabilities: ['Cloud hosting', 'API integration', 'Mobile development'],
        pricing: {
          total: 75000,
          negotiable: true,
          volumeDiscounts: true,
        },
        marketBenchmark: { average: 80000 },
        vendorSize: 'medium',
        projectSize: 'large',
        vendorLocation: { country: 'US' },
        companyLocation: { country: 'US' },
      });
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('onboarding');
      expect(result.data?.documentation).toBeDefined();
      expect(result.data?.financial).toBeDefined();
      expect(result.data?.references).toBeDefined();
    });

    it('should accept valid general analysis input', () => {
      const result = validateVendorAgentInput(VALID_VENDOR_INPUTS.generalAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Vendor');
      expect(result.data?.category).toBe('technology');
    });

    it('should reject invalid analysis type', () => {
      const result = validateVendorAgentInput(INVALID_VENDOR_INPUTS.invalidAnalysisType);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('analysis'))).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const result = validateVendorAgentInput(INVALID_VENDOR_INPUTS.invalidUuid);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('UUID'))).toBe(true);
    });

    it('should reject invalid vendor category', () => {
      const result = validateVendorAgentInput(INVALID_VENDOR_INPUTS.invalidCategory);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('category'))).toBe(true);
    });

    it('should reject empty input when no identifiable data present', () => {
      const result = validateVendorAgentInput(INVALID_VENDOR_INPUTS.emptyInput);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid financial data with negative values', () => {
      const result = validateVendorAgentInput(INVALID_VENDOR_INPUTS.invalidFinancialData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid reference ratings', () => {
      const result = validateVendorAgentInput(INVALID_VENDOR_INPUTS.invalidReferences);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('rating'))).toBe(true);
    });

    it('should reject invalid pricing with negative values', () => {
      const result = validateVendorAgentInput(INVALID_VENDOR_INPUTS.invalidPricing);
      expect(result.success).toBe(false);
    });

    it('should accept valid vendor with all optional fields', () => {
      const fullInput = {
        vendorId: generateTestUuid(),
        name: 'Full Vendor',
        category: 'technology',
        description: 'A comprehensive technology vendor',
        services: ['Cloud hosting', 'API development', 'Support'],
        email: 'vendor@example.com',
        phone: '+15551234567',
        established: 2010,
        employees: 500,
        revenue: 10000000,
        analysisType: 'specific',
      };
      const result = validateVendorAgentInput(fullInput);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Full Vendor');
    });
  });

  describe('validateVendorContext', () => {
    it('should accept valid context for specific analysis', () => {
      const result = validateVendorContext(VALID_VENDOR_CONTEXT.specificAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.vendorId).toBeDefined();
      expect(result.data?.analysisType).toBe('specific');
    });

    it('should accept valid context for portfolio analysis', () => {
      const result = validateVendorContext(VALID_VENDOR_CONTEXT.portfolioAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('portfolio');
    });

    it('should accept valid context for onboarding analysis', () => {
      const result = validateVendorContext(VALID_VENDOR_CONTEXT.onboardingAnalysis);
      expect(result.success).toBe(true);
      expect(result.data?.analysisType).toBe('onboarding');
    });

    it('should accept empty context', () => {
      const result = validateVendorContext({});
      expect(result.success).toBe(true);
    });

    it('should reject context with invalid userId UUID', () => {
      const result = validateVendorContext(INVALID_VENDOR_CONTEXT.invalidUserId);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('UUID'))).toBe(true);
    });

    it('should reject context with extra unrecognized fields (strict mode)', () => {
      const result = validateVendorContext({
        ...VALID_VENDOR_CONTEXT.specificAnalysis,
        extraField: 'not allowed',
      });
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

  describe('validateVendorCategory', () => {
    it('should accept valid vendor category - technology', () => {
      const result = validateVendorCategory('technology');
      expect(result.success).toBe(true);
      expect(result.value).toBe('technology');
    });

    it('should accept valid vendor category - consulting', () => {
      const result = validateVendorCategory('consulting');
      expect(result.success).toBe(true);
    });

    it('should accept valid vendor category - other', () => {
      const result = validateVendorCategory('other');
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      const result = validateVendorCategory('invalid_category');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid vendor category');
    });
  });

  describe('validateAnalysisType', () => {
    it('should accept portfolio analysis type', () => {
      const result = validateAnalysisType('portfolio');
      expect(result.success).toBe(true);
      expect(result.value).toBe('portfolio');
    });

    it('should accept onboarding analysis type', () => {
      const result = validateAnalysisType('onboarding');
      expect(result.success).toBe(true);
    });

    it('should accept specific analysis type', () => {
      const result = validateAnalysisType('specific');
      expect(result.success).toBe(true);
    });

    it('should accept general analysis type', () => {
      const result = validateAnalysisType('general');
      expect(result.success).toBe(true);
    });

    it('should reject invalid analysis type', () => {
      const result = validateAnalysisType('unknown');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid analysis type');
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

  describe('sanitizeVendorName', () => {
    it('should remove control characters from vendor name', () => {
      // The sanitizeVendorName function removes control chars but doesn't add spaces
      const name = 'Vendor\x00Name\x1F';
      const result = sanitizeVendorName(name);
      expect(result).toBe('VendorName');
    });

    it('should remove HTML-like characters', () => {
      // The function only removes < and > characters
      const name = 'Vendor <script>alert(1)</script>';
      const result = sanitizeVendorName(name);
      expect(result).toBe('Vendor scriptalert(1)/script');
    });

    it('should normalize whitespace', () => {
      const name = '  Multiple    Spaces  ';
      const result = sanitizeVendorName(name);
      expect(result).toBe('Multiple Spaces');
    });

    it('should truncate to 255 characters', () => {
      const name = 'A'.repeat(300);
      const result = sanitizeVendorName(name);
      expect(result.length).toBe(255);
    });

    it('should handle empty name', () => {
      expect(sanitizeVendorName('')).toBe('');
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
        name: 'Vendor',
      });
      expect(conflicts).toContain('Both content and text provided with different values - using content');
    });

    it('should not warn when content and text are identical', () => {
      const conflicts = detectInputConflicts({
        content: 'Same content',
        text: 'Same content',
        name: 'Vendor',
      });
      expect(conflicts).not.toContain('Both content and text provided');
    });

    it('should detect vendorId mismatch between data and context', () => {
      const dataVendorId = generateTestUuid();
      const contextVendorId = generateTestUuid();
      const conflicts = detectInputConflicts(
        { vendorId: dataVendorId, name: 'Test' },
        { vendorId: contextVendorId },
      );
      expect(conflicts).toContain('VendorId differs between data and context - using data.vendorId');
    });

    it('should detect portfolio analysis with vendorId', () => {
      const vendorId = generateTestUuid();
      const conflicts = detectInputConflicts(
        { vendorId, name: 'Test' },
        { analysisType: 'portfolio' },
      );
      expect(conflicts).toContain('Portfolio analysis requested but vendorId provided - portfolio analysis is enterprise-wide');
    });

    it('should detect onboarding without required data', () => {
      const conflicts = detectInputConflicts(
        { name: 'Test Vendor' },
        { analysisType: 'onboarding' },
      );
      expect(conflicts).toContain('Onboarding analysis requested but no documentation, financial data, or references provided');
    });

    it('should detect pricing without market benchmark', () => {
      const conflicts = detectInputConflicts({
        name: 'Vendor',
        pricing: { total: 50000 },
      });
      expect(conflicts).toContain('Pricing data provided but market benchmark missing - competitiveness cannot be assessed');
    });

    it('should detect required capabilities without vendor capabilities', () => {
      const conflicts = detectInputConflicts({
        name: 'Vendor',
        requiredCapabilities: ['Cloud hosting', 'API'],
      });
      expect(conflicts).toContain('Required capabilities provided but vendor capabilities missing - capability matching will be incomplete');
    });

    it('should return empty array for clean input', () => {
      const conflicts = detectInputConflicts({
        vendorId: generateTestUuid(),
        analysisType: 'specific',
      });
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('validateAndSanitizeVendorInput', () => {
    it('should validate and sanitize valid input', () => {
      const result = validateAndSanitizeVendorInput({
        name: '  Test Vendor  ',
        content: 'Some\x00content',
        category: 'technology',
      });
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Vendor');
      expect(result.data?.content).toBe('Somecontent');
    });

    it('should return errors for invalid input', () => {
      const result = validateAndSanitizeVendorInput({
        vendorId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe('Vendor Agent Configuration', () => {
  describe('VendorConfigSchema', () => {
    it('should parse default configuration', () => {
      const config = VendorConfigSchema.parse({});
      expect(config).toBeDefined();
      expect(config.excellentPerformanceThreshold).toBe(0.9);
      expect(config.goodPerformanceThreshold).toBe(0.75);
    });

    it('should accept valid custom configuration', () => {
      const config = VendorConfigSchema.parse({
        excellentPerformanceThreshold: 0.95,
        poorPerformanceThreshold: 0.35,
        maxRetryAttempts: 5,
      });
      expect(config.excellentPerformanceThreshold).toBe(0.95);
      expect(config.poorPerformanceThreshold).toBe(0.35);
      expect(config.maxRetryAttempts).toBe(5);
    });

    it('should reject invalid threshold values (negative)', () => {
      expect(() => VendorConfigSchema.parse({
        excellentPerformanceThreshold: -0.1,
      })).toThrow();
    });

    it('should reject invalid threshold values (above 1 for normalized)', () => {
      expect(() => VendorConfigSchema.parse({
        excellentPerformanceThreshold: 1.5,
      })).toThrow();
    });

    it('should reject invalid timeout values (below minimum)', () => {
      expect(() => VendorConfigSchema.parse({
        analysisTimeoutMs: 1000, // Below 5000 minimum
      })).toThrow();
    });

    it('should reject invalid retry attempts (above max)', () => {
      expect(() => VendorConfigSchema.parse({
        maxRetryAttempts: 15, // Above 10 max
      })).toThrow();
    });

    it('should accept valid feature flags', () => {
      const config = VendorConfigSchema.parse({
        enablePerformanceTracking: false,
        enableRiskAssessment: true,
        enableGracefulDegradation: false,
      });
      expect(config.enablePerformanceTracking).toBe(false);
      expect(config.enableRiskAssessment).toBe(true);
      expect(config.enableGracefulDegradation).toBe(false);
    });

    it('should accept valid retry settings', () => {
      const config = VendorConfigSchema.parse({
        baseRetryDelayMs: 500,
        maxRetryDelayMs: 15000,
        maxRetryAttempts: 4,
      });
      expect(config.baseRetryDelayMs).toBe(500);
      expect(config.maxRetryDelayMs).toBe(15000);
    });
  });

  describe('getDefaultVendorConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultVendorConfig();
      expect(config).toEqual(DEFAULT_VENDOR_CONFIG);
    });

    it('should return a copy, not the original', () => {
      const config1 = getDefaultVendorConfig();
      const config2 = getDefaultVendorConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('validateConfigThresholds', () => {
    it('should return empty array for valid default config', () => {
      const errors = validateConfigThresholds(DEFAULT_VENDOR_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('should detect performance threshold inversion', () => {
      const config = {
        ...DEFAULT_VENDOR_CONFIG,
        excellentPerformanceThreshold: 0.5,
        goodPerformanceThreshold: 0.7,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('excellentPerformanceThreshold');
    });

    it('should detect spend threshold inversion', () => {
      const config = {
        ...DEFAULT_VENDOR_CONFIG,
        strategicSpendThreshold: 100000,
        significantSpendThreshold: 500000,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('strategicSpendThreshold'))).toBe(true);
    });

    it('should detect retry delay inversion', () => {
      const config = {
        ...DEFAULT_VENDOR_CONFIG,
        baseRetryDelayMs: 5000,
        maxRetryDelayMs: 1000,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('baseRetryDelayMs'))).toBe(true);
    });

    it('should detect invalid scoring weights that do not sum to 1', () => {
      const config = {
        ...DEFAULT_VENDOR_CONFIG,
        performanceWeight: 0.5,
        longevityWeight: 0.5,
        spendWeight: 0.5,
        issuesWeight: 0.5,
        complianceWeight: 0.5,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some(e => e.includes('scoring weights'))).toBe(true);
    });
  });

  describe('validateConfigOverride', () => {
    it('should accept valid partial override', () => {
      const result = validateConfigOverride({
        excellentPerformanceThreshold: 0.92,
        maxRetryAttempts: 4,
      });
      expect(result.valid).toBe(true);
      expect(result.config?.excellentPerformanceThreshold).toBe(0.92);
    });

    it('should reject invalid override values', () => {
      const result = validateConfigOverride({
        excellentPerformanceThreshold: 2.0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('clearVendorConfigCache', () => {
    it('should clear cache without error', () => {
      expect(() => clearVendorConfigCache()).not.toThrow();
    });

    it('should clear cache for specific enterprise', () => {
      expect(() => clearVendorConfigCache('enterprise-123')).not.toThrow();
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - PERFORMANCE
// =============================================================================

describe('Configuration Helper Functions - Performance', () => {
  const config = DEFAULT_VENDOR_CONFIG;

  describe('isExcellentPerformance', () => {
    it('should return true for score at threshold', () => {
      expect(isExcellentPerformance(0.9, config)).toBe(true);
    });

    it('should return true for score above threshold', () => {
      expect(isExcellentPerformance(0.95, config)).toBe(true);
    });

    it('should return false for score below threshold', () => {
      expect(isExcellentPerformance(0.85, config)).toBe(false);
    });
  });

  describe('isGoodPerformance', () => {
    it('should return true for score in good range', () => {
      expect(isGoodPerformance(0.80, config)).toBe(true);
    });

    it('should return false for excellent score', () => {
      expect(isGoodPerformance(0.95, config)).toBe(false);
    });

    it('should return false for average score', () => {
      expect(isGoodPerformance(0.65, config)).toBe(false);
    });
  });

  describe('isAveragePerformance', () => {
    it('should return true for score in average range', () => {
      expect(isAveragePerformance(0.65, config)).toBe(true);
    });

    it('should return false for good score', () => {
      expect(isAveragePerformance(0.80, config)).toBe(false);
    });
  });

  describe('isPoorPerformance', () => {
    it('should return true for poor performance', () => {
      expect(isPoorPerformance(0.35, config)).toBe(true);
    });

    it('should return false for average performance', () => {
      expect(isPoorPerformance(0.6, config)).toBe(false);
    });

    it('should return false at threshold boundary', () => {
      expect(isPoorPerformance(0.4, config)).toBe(false);
    });
  });

  describe('getPerformanceRating', () => {
    it('should return excellent for high scores', () => {
      expect(getPerformanceRating(0.95, config)).toBe('excellent');
    });

    it('should return good for good scores', () => {
      expect(getPerformanceRating(0.80, config)).toBe('good');
    });

    it('should return average for average scores', () => {
      expect(getPerformanceRating(0.65, config)).toBe('average');
    });

    it('should return poor for poor scores', () => {
      expect(getPerformanceRating(0.42, config)).toBe('poor');
    });

    it('should return critical for very low scores', () => {
      expect(getPerformanceRating(0.2, config)).toBe('critical');
    });
  });

  describe('isSignificantPerformanceDecline', () => {
    it('should return true for decline above threshold', () => {
      expect(isSignificantPerformanceDecline(0.15, config)).toBe(true);
    });

    it('should return false for decline below threshold', () => {
      expect(isSignificantPerformanceDecline(0.05, config)).toBe(false);
    });

    it('should return true at threshold', () => {
      expect(isSignificantPerformanceDecline(0.1, config)).toBe(true);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - RISK
// =============================================================================

describe('Configuration Helper Functions - Risk', () => {
  const config = DEFAULT_VENDOR_CONFIG;

  describe('assessConcentrationRisk', () => {
    it('should return high for high concentration', () => {
      expect(assessConcentrationRisk(0.4, config)).toBe('high');
    });

    it('should return medium for medium concentration', () => {
      expect(assessConcentrationRisk(0.2, config)).toBe('medium');
    });

    it('should return low for low concentration', () => {
      expect(assessConcentrationRisk(0.1, config)).toBe('low');
    });
  });

  describe('isHighIssueFrequency', () => {
    it('should return true for high issue count', () => {
      expect(isHighIssueFrequency(10, config)).toBe(true);
    });

    it('should return true at threshold', () => {
      expect(isHighIssueFrequency(5, config)).toBe(true);
    });

    it('should return false for low issue count', () => {
      expect(isHighIssueFrequency(2, config)).toBe(false);
    });
  });

  describe('isMediumIssueFrequency', () => {
    it('should return true for medium issue count', () => {
      expect(isMediumIssueFrequency(3, config)).toBe(true);
    });

    it('should return false for high issue count', () => {
      expect(isMediumIssueFrequency(10, config)).toBe(false);
    });

    it('should return false for low issue count', () => {
      expect(isMediumIssueFrequency(1, config)).toBe(false);
    });
  });

  describe('assessIssueFrequencyRisk', () => {
    it('should return high for high frequency', () => {
      expect(assessIssueFrequencyRisk(10, config)).toBe('high');
    });

    it('should return medium for medium frequency', () => {
      expect(assessIssueFrequencyRisk(3, config)).toBe('medium');
    });

    it('should return low for low frequency', () => {
      expect(assessIssueFrequencyRisk(1, config)).toBe('low');
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - SPEND
// =============================================================================

describe('Configuration Helper Functions - Spend', () => {
  const config = DEFAULT_VENDOR_CONFIG;

  describe('determineSpendLevel', () => {
    it('should return strategic for high spend', () => {
      expect(determineSpendLevel(2000000, config)).toBe('strategic');
    });

    it('should return significant for significant spend', () => {
      expect(determineSpendLevel(600000, config)).toBe('significant');
    });

    it('should return moderate for moderate spend', () => {
      expect(determineSpendLevel(200000, config)).toBe('moderate');
    });

    it('should return small for small spend', () => {
      expect(determineSpendLevel(50000, config)).toBe('small');
    });

    it('should return minimal for minimal spend', () => {
      expect(determineSpendLevel(5000, config)).toBe('minimal');
    });
  });

  describe('isStrategicSpend', () => {
    it('should return true for strategic level spend', () => {
      expect(isStrategicSpend(1500000, config)).toBe(true);
    });

    it('should return false for non-strategic spend', () => {
      expect(isStrategicSpend(500000, config)).toBe(false);
    });
  });

  describe('isSignificantSpend', () => {
    it('should return true for significant spend', () => {
      expect(isSignificantSpend(750000, config)).toBe(true);
    });

    it('should return false for small spend', () => {
      expect(isSignificantSpend(100000, config)).toBe(false);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - COMPLIANCE
// =============================================================================

describe('Configuration Helper Functions - Compliance', () => {
  const config = DEFAULT_VENDOR_CONFIG;

  describe('isComplianceExpired', () => {
    it('should return true for expired audit', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      expect(isComplianceExpired(oldDate, config)).toBe(true);
    });

    it('should return false for recent audit', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3);
      expect(isComplianceExpired(recentDate, config)).toBe(false);
    });
  });

  describe('isComplianceExpiringSoon', () => {
    it('should return true for audit expiring within warning period', () => {
      const date = new Date();
      // Set to 11 months ago (will expire in about 1 month, within 60-day warning)
      date.setMonth(date.getMonth() - 10);
      date.setDate(date.getDate() - 15);
      expect(isComplianceExpiringSoon(date, config)).toBe(true);
    });

    it('should return false for audit not near expiration', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3);
      expect(isComplianceExpiringSoon(recentDate, config)).toBe(false);
    });
  });

  describe('getDaysUntilComplianceExpiration', () => {
    it('should return positive days for future expiration', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 6);
      const days = getDaysUntilComplianceExpiration(recentDate, config);
      expect(days).toBeGreaterThan(0);
    });

    it('should return negative days for past expiration', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      const days = getDaysUntilComplianceExpiration(oldDate, config);
      expect(days).toBeLessThan(0);
    });
  });

  describe('hasRequiredCertifications', () => {
    it('should return true when all required certifications present', () => {
      expect(hasRequiredCertifications(['ISO9001', 'SOC2', 'ISO27001'], config)).toBe(true);
    });

    it('should return false when missing certifications', () => {
      expect(hasRequiredCertifications(['ISO9001'], config)).toBe(false);
    });
  });

  describe('getMissingCertifications', () => {
    it('should return empty array when all present', () => {
      expect(getMissingCertifications(['ISO9001', 'SOC2'], config)).toHaveLength(0);
    });

    it('should return missing certifications', () => {
      const missing = getMissingCertifications(['ISO9001'], config);
      expect(missing).toContain('SOC2');
    });
  });

  describe('isInsuranceCoverageAdequate', () => {
    it('should return true for adequate coverage', () => {
      expect(isInsuranceCoverageAdequate(2000000, config)).toBe(true);
    });

    it('should return false for inadequate coverage', () => {
      expect(isInsuranceCoverageAdequate(500000, config)).toBe(false);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - ONBOARDING
// =============================================================================

describe('Configuration Helper Functions - Onboarding', () => {
  const config = DEFAULT_VENDOR_CONFIG;

  describe('shouldApproveOnboarding', () => {
    it('should return approve for high score', () => {
      expect(shouldApproveOnboarding(0.85, config)).toBe('approve');
    });

    it('should return conditional for medium score', () => {
      expect(shouldApproveOnboarding(0.65, config)).toBe('conditional');
    });

    it('should return reject for low score', () => {
      expect(shouldApproveOnboarding(0.5, config)).toBe('reject');
    });
  });

  describe('meetsReferenceCountRequirement', () => {
    it('should return true when enough references', () => {
      expect(meetsReferenceCountRequirement(5, config)).toBe(true);
    });

    it('should return false when insufficient references', () => {
      expect(meetsReferenceCountRequirement(1, config)).toBe(false);
    });

    it('should return true at threshold', () => {
      expect(meetsReferenceCountRequirement(3, config)).toBe(true);
    });
  });

  describe('meetsReferenceRatingRequirement', () => {
    it('should return true for high rating', () => {
      expect(meetsReferenceRatingRequirement(4.5, config)).toBe(true);
    });

    it('should return false for low rating', () => {
      expect(meetsReferenceRatingRequirement(2.5, config)).toBe(false);
    });

    it('should return true at threshold', () => {
      expect(meetsReferenceRatingRequirement(3.5, config)).toBe(true);
    });
  });

  describe('validateOnboardingRequirements', () => {
    it('should return valid for vendor meeting all requirements', () => {
      const result = validateOnboardingRequirements({
        score: 0.85,
        referenceCount: 5,
        averageReferenceRating: 4.5,
        hasBackgroundCheck: true,
        certifications: ['ISO9001', 'SOC2'],
      }, config);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return invalid with issues for vendor missing requirements', () => {
      const result = validateOnboardingRequirements({
        score: 0.65,
        referenceCount: 1,
        averageReferenceRating: 2.5,
        hasBackgroundCheck: false,
        certifications: [],
      }, config);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - PRICING
// =============================================================================

describe('Configuration Helper Functions - Pricing', () => {
  const config = DEFAULT_VENDOR_CONFIG;

  describe('isAboveMarketPricing', () => {
    it('should return true for price above market threshold', () => {
      expect(isAboveMarketPricing(20, config)).toBe(true);
    });

    it('should return false for competitive price', () => {
      expect(isAboveMarketPricing(5, config)).toBe(false);
    });
  });

  describe('isBelowMarketPricing', () => {
    it('should return true for suspiciously low price', () => {
      expect(isBelowMarketPricing(-20, config)).toBe(true);
    });

    it('should return false for competitive price', () => {
      expect(isBelowMarketPricing(-5, config)).toBe(false);
    });
  });

  describe('assessPricingCompetitiveness', () => {
    it('should return above_market for high variance', () => {
      expect(assessPricingCompetitiveness(25, config)).toBe('above_market');
    });

    it('should return competitive for normal variance', () => {
      expect(assessPricingCompetitiveness(0, config)).toBe('competitive');
    });

    it('should return below_market for low variance', () => {
      expect(assessPricingCompetitiveness(-25, config)).toBe('below_market');
    });
  });

  describe('isPriceVolatile', () => {
    it('should return true for volatile pricing', () => {
      expect(isPriceVolatile(15, config)).toBe(true);
    });

    it('should return false for stable pricing', () => {
      expect(isPriceVolatile(5, config)).toBe(false);
    });
  });
});

// =============================================================================
// CONFIGURATION HELPER TESTS - RELATIONSHIP SCORING
// =============================================================================

describe('Configuration Helper Functions - Relationship Scoring', () => {
  const config = DEFAULT_VENDOR_CONFIG;

  describe('calculateRelationshipScore', () => {
    it('should calculate high score for excellent metrics', () => {
      const score = calculateRelationshipScore({
        performanceScore: 0.95,
        longevityMonths: 60,
        annualSpend: 1500000,
        totalSpend: 7500000,
        issueCount: 0,
        complianceScore: 1.0,
      }, config);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should calculate lower score for poor metrics', () => {
      const score = calculateRelationshipScore({
        performanceScore: 0.4,
        longevityMonths: 3,
        annualSpend: 10000,
        totalSpend: 30000,
        issueCount: 10,
        complianceScore: 0.5,
      }, config);
      expect(score).toBeLessThan(0.5);
    });

    it('should cap score at 1.0', () => {
      const score = calculateRelationshipScore({
        performanceScore: 1.5,
        longevityMonths: 200,
        annualSpend: 5000000,
        totalSpend: 25000000,
        issueCount: 0,
        complianceScore: 1.0,
      }, config);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should floor score at 0', () => {
      const score = calculateRelationshipScore({
        performanceScore: -0.5,
        longevityMonths: 0,
        annualSpend: 0,
        totalSpend: 0,
        issueCount: 100,
        complianceScore: -0.5,
      }, config);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateScoringWeights', () => {
    it('should return true for default config (weights sum to 1)', () => {
      expect(validateScoringWeights(config)).toBe(true);
    });

    it('should return false when weights do not sum to 1', () => {
      const badConfig = {
        ...config,
        performanceWeight: 0.5,
        longevityWeight: 0.5,
        spendWeight: 0.5,
        issuesWeight: 0.5,
        complianceWeight: 0.5,
      };
      expect(validateScoringWeights(badConfig)).toBe(false);
    });
  });
});

// =============================================================================
// MOCK SUPABASE CLIENT TESTS
// =============================================================================

describe('Mock Supabase Client', () => {
  it('should create chainable query for vendors', async () => {
    const client = createMockSupabaseClient();
    const result = await client
      .from('vendors')
      .select('*')
      .eq('enterprise_id', 'test');

    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('should return vendor analytics from RPC', async () => {
    const client = createMockSupabaseClient();
    const result = await client.rpc('get_vendor_analytics', {
      p_vendor_id: 'test-vendor-id',
    });

    expect(result.data).toBeDefined();
    expect(result.data.profile).toBeDefined();
    expect(result.data.performance).toBeDefined();
  });

  it('should return portfolio analysis from RPC', async () => {
    const client = createMockSupabaseClient();
    const result = await client.rpc('analyze_vendor_portfolio', {
      p_enterprise_id: 'test-enterprise',
    });

    expect(result.data).toBeDefined();
    expect(result.data.summary).toBeDefined();
  });

  it('should return new vendor evaluation from RPC', async () => {
    const client = createMockSupabaseClient();
    const result = await client.rpc('evaluate_new_vendor', {
      p_vendor_data: {},
    });

    expect(result.data).toBeDefined();
    expect(result.data.basicChecks).toBeDefined();
    expect(result.data.score).toBeDefined();
  });

  it('should allow custom data overrides', async () => {
    const customVendors = [
      generateMockVendor({
        name: 'Custom Vendor',
        category: 'technology',
      }),
    ];

    const client = createMockSupabaseClient({ vendors: customVendors });
    const result = await client.from('vendors').select('*');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Custom Vendor');
  });
});

// =============================================================================
// MOCK DATA GENERATOR TESTS
// =============================================================================

describe('Mock Data Generators', () => {
  describe('generateTestUuid', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateTestUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateTestUuid();
      const uuid2 = generateTestUuid();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('generateMockVendor', () => {
    it('should generate vendor with all required fields', () => {
      const vendor = generateMockVendor();
      expect(vendor.id).toBeDefined();
      expect(vendor.name).toBeDefined();
      expect(vendor.category).toBeDefined();
      expect(vendor.performanceHistory).toBeDefined();
      expect(vendor.deliveryMetrics).toBeDefined();
    });

    it('should allow overriding specific fields', () => {
      const vendor = generateMockVendor({
        name: 'Override Vendor',
        category: 'consulting',
      });
      expect(vendor.name).toBe('Override Vendor');
      expect(vendor.category).toBe('consulting');
    });
  });

  describe('generateMockVendors', () => {
    it('should generate specified number of vendors', () => {
      const vendors = generateMockVendors(5);
      expect(vendors).toHaveLength(5);
    });

    it('should distribute vendors across categories', () => {
      const vendors = generateMockVendors(10);
      const categories = [...new Set(vendors.map(v => v.category))];
      expect(categories.length).toBeGreaterThan(1);
    });
  });

  describe('generateMockPortfolio', () => {
    it('should generate portfolio with correct vendor count', () => {
      const portfolio = generateMockPortfolio(20);
      expect(portfolio.vendors).toHaveLength(20);
    });

    it('should calculate total spend correctly', () => {
      const portfolio = generateMockPortfolio(5);
      const calculatedTotal = portfolio.vendors.reduce((sum, v) => sum + v.spend, 0);
      expect(portfolio.totalSpend).toBe(calculatedTotal);
    });

    it('should include category breakdown', () => {
      const portfolio = generateMockPortfolio(10);
      expect(portfolio.categories).toBeDefined();
      expect(portfolio.categories.length).toBeGreaterThan(0);
    });
  });

  describe('generateMockNewVendorData', () => {
    it('should generate all sections of new vendor data', () => {
      const data = generateMockNewVendorData();
      expect(data.documentation).toBeDefined();
      expect(data.financial).toBeDefined();
      expect(data.references).toBeDefined();
      expect(data.pricing).toBeDefined();
      expect(data.requiredCapabilities).toBeDefined();
    });

    it('should allow overriding documentation', () => {
      const data = generateMockNewVendorData({
        documentation: {
          businessLicense: false,
          insurance: false,
          taxId: true,
          bankDetails: true,
        },
      });
      expect(data.documentation.businessLicense).toBe(false);
      expect(data.documentation.insurance).toBe(false);
    });
  });

  describe('generateMockVendorAnalysis', () => {
    it('should generate complete vendor analysis', () => {
      const analysis = generateMockVendorAnalysis();
      expect(analysis.profile).toBeDefined();
      expect(analysis.performance).toBeDefined();
      expect(analysis.relationshipScore).toBeDefined();
      expect(analysis.risks).toBeDefined();
      expect(analysis.opportunities).toBeDefined();
      expect(analysis.complianceStatus).toBeDefined();
    });
  });

  describe('generateMockPortfolioAnalysis', () => {
    it('should generate complete portfolio analysis', () => {
      const analysis = generateMockPortfolioAnalysis();
      expect(analysis.summary).toBeDefined();
      expect(analysis.categoryAnalysis).toBeDefined();
      expect(analysis.performanceDistribution).toBeDefined();
      expect(analysis.spendConcentration).toBeDefined();
      expect(analysis.optimizationOpportunities).toBeDefined();
    });
  });

  describe('generateMockNewVendorEvaluation', () => {
    it('should generate complete evaluation result', () => {
      const evaluation = generateMockNewVendorEvaluation();
      expect(evaluation.basicChecks).toBeDefined();
      expect(evaluation.financialStability).toBeDefined();
      expect(evaluation.references).toBeDefined();
      expect(evaluation.capabilities).toBeDefined();
      expect(evaluation.pricing).toBeDefined();
      expect(evaluation.score).toBeDefined();
      expect(evaluation.recommendation).toBeDefined();
    });
  });
});

// =============================================================================
// EDGE CASE DATA TESTS
// =============================================================================

describe('Edge Case Data', () => {
  describe('Empty Portfolio', () => {
    it('should have zero vendors', () => {
      expect(EDGE_CASE_DATA.emptyPortfolio.vendors).toHaveLength(0);
    });

    it('should have zero total spend', () => {
      expect(EDGE_CASE_DATA.emptyPortfolio.totalSpend).toBe(0);
    });

    it('should have empty categories', () => {
      expect(EDGE_CASE_DATA.emptyPortfolio.categories).toHaveLength(0);
    });
  });

  describe('Single Vendor Portfolio', () => {
    it('should have exactly one vendor', () => {
      expect(EDGE_CASE_DATA.singleVendorPortfolio.vendors).toHaveLength(1);
    });
  });

  describe('Large Portfolio', () => {
    it('should have 100 vendors', () => {
      expect(EDGE_CASE_DATA.largePortfolio.vendors).toHaveLength(100);
    });

    it('should have substantial total spend', () => {
      expect(EDGE_CASE_DATA.largePortfolio.totalSpend).toBeGreaterThan(0);
    });
  });

  describe('Vendor With No History', () => {
    it('should have empty performance history', () => {
      expect(EDGE_CASE_DATA.vendorWithNoHistory.performanceHistory).toHaveLength(0);
    });

    it('should have zero contracts', () => {
      expect(EDGE_CASE_DATA.vendorWithNoHistory.contractCount).toBe(0);
    });
  });

  describe('Vendor With Poor Performance', () => {
    it('should have low performance scores', () => {
      const { performanceHistory } = EDGE_CASE_DATA.vendorWithPoorPerformance;
      expect(performanceHistory[0].score).toBeLessThan(0.5);
    });

    it('should have high issue count', () => {
      expect(EDGE_CASE_DATA.vendorWithPoorPerformance.issues.length).toBeGreaterThan(10);
    });
  });

  describe('Vendor With Excellent Performance', () => {
    it('should have high performance scores', () => {
      const { performanceHistory } = EDGE_CASE_DATA.vendorWithExcellentPerformance;
      expect(performanceHistory[0].score).toBeGreaterThan(0.9);
    });

    it('should have no issues', () => {
      expect(EDGE_CASE_DATA.vendorWithExcellentPerformance.issues).toHaveLength(0);
    });

    it('should have comprehensive certifications', () => {
      expect(EDGE_CASE_DATA.vendorWithExcellentPerformance.compliance.certifications.length).toBeGreaterThan(2);
    });
  });

  describe('New Vendor With Missing Docs', () => {
    it('should have missing documentation items', () => {
      expect(EDGE_CASE_DATA.newVendorWithMissingDocs.documentation.insurance).toBe(false);
      expect(EDGE_CASE_DATA.newVendorWithMissingDocs.documentation.missing?.length).toBeGreaterThan(0);
    });
  });

  describe('New Vendor With Poor Financials', () => {
    it('should have negative profit margin', () => {
      expect(EDGE_CASE_DATA.newVendorWithPoorFinancials.financial.profitMargin).toBeLessThan(0);
    });

    it('should have high debt ratio', () => {
      expect(EDGE_CASE_DATA.newVendorWithPoorFinancials.financial.debtRatio).toBeGreaterThan(0.8);
    });

    it('should have low credit score', () => {
      expect(EDGE_CASE_DATA.newVendorWithPoorFinancials.financial.creditScore).toBeLessThan(600);
    });
  });

  describe('New Vendor With No References', () => {
    it('should have empty references array', () => {
      expect(EDGE_CASE_DATA.newVendorWithNoReferences.references).toHaveLength(0);
    });
  });

  describe('New Vendor With Capability Mismatch', () => {
    it('should have more required capabilities than vendor capabilities', () => {
      const { requiredCapabilities, vendorCapabilities } = EDGE_CASE_DATA.newVendorWithCapabilityMismatch;
      expect(requiredCapabilities.length).toBeGreaterThan(vendorCapabilities.length);
    });

    it('should have missing required capabilities', () => {
      const { requiredCapabilities, vendorCapabilities } = EDGE_CASE_DATA.newVendorWithCapabilityMismatch;
      const missing = requiredCapabilities.filter(c => !vendorCapabilities.includes(c));
      expect(missing.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// ERROR SCENARIOS TESTS
// =============================================================================

describe('Error Scenarios', () => {
  describe('Database Error', () => {
    it('should be categorized as database error', () => {
      expect(ERROR_SCENARIOS.databaseError.category).toBe('database');
    });

    it('should be retryable', () => {
      expect(ERROR_SCENARIOS.databaseError.isRetryable).toBe(true);
    });
  });

  describe('Validation Error', () => {
    it('should be categorized as validation error', () => {
      expect(ERROR_SCENARIOS.validationError.category).toBe('validation');
    });

    it('should not be retryable', () => {
      expect(ERROR_SCENARIOS.validationError.isRetryable).toBe(false);
    });
  });

  describe('Timeout Error', () => {
    it('should be categorized as timeout error', () => {
      expect(ERROR_SCENARIOS.timeoutError.category).toBe('timeout');
    });

    it('should be retryable', () => {
      expect(ERROR_SCENARIOS.timeoutError.isRetryable).toBe(true);
    });
  });

  describe('Rate Limit Error', () => {
    it('should be categorized as rate_limiting error', () => {
      expect(ERROR_SCENARIOS.rateLimitError.category).toBe('rate_limiting');
    });

    it('should be retryable', () => {
      expect(ERROR_SCENARIOS.rateLimitError.isRetryable).toBe(true);
    });
  });

  describe('External API Error', () => {
    it('should be categorized as external error', () => {
      expect(ERROR_SCENARIOS.externalApiError.category).toBe('external');
    });

    it('should be retryable', () => {
      expect(ERROR_SCENARIOS.externalApiError.isRetryable).toBe(true);
    });
  });

  describe('Calculation Error', () => {
    it('should be categorized as calculation error', () => {
      expect(ERROR_SCENARIOS.calculationError.category).toBe('calculation');
    });

    it('should not be retryable', () => {
      expect(ERROR_SCENARIOS.calculationError.isRetryable).toBe(false);
    });
  });
});
