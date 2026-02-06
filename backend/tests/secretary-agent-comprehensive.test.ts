/**
 * Comprehensive test suite for Secretary Agent
 *
 * Tests input validation, configuration, error handling, schema validation,
 * content sanitization, and document analysis helper functions.
 * Covers contract analysis, vendor document processing, stored document handling,
 * general document analysis, and edge cases.
 *
 * @module SecretaryAgentComprehensiveTests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateSecretaryInput,
  validateAndFilterAmounts,
  validateAndFilterParties,
  validateAndFilterDates,
  isContentAnalyzable,
  sanitizeContent,
  secretaryInputSchema,
  secretaryContextSchema,
  contractDocumentInputSchema,
  vendorDocumentInputSchema,
  storedDocumentInputSchema,
  generalDocumentInputSchema,
  extractedPartySchema,
  extractedAmountSchema,
  extractedDatesSchema,
  clauseAnalysisSchema,
  documentMetadataSchema,
  contactInfoSchema,
  vendorIdentifiersSchema,
  complianceStatusSchema,
  sentimentAnalysisSchema,
  documentQualitySchema,
  isoDateSchema,
  contentSchema,
  nonNegativeNumberSchema,
  positiveNumberSchema,
  MAX_DOCUMENT_LENGTH,
  MIN_CONTENT_LENGTH,
  MAX_AMOUNTS,
  MAX_PARTIES,
  MAX_PARTY_NAME_LENGTH,
  MAX_CLAUSES,
  MAX_DATES,
  CONTRACT_TYPES,
  DOCUMENT_TYPES,
  VENDOR_DOCUMENT_TYPES,
  WORKFLOW_TYPES,
  COMPLEXITY_LEVELS,
  PARTY_TYPES,
  AMOUNT_TYPES,
  CURRENCIES,
  CLAUSE_CATEGORIES,
} from '../supabase/functions/local-agents/schemas/secretary';
import {
  SecretaryConfigSchema,
  DEFAULT_SECRETARY_CONFIG,
  getDefaultSecretaryConfig,
  clearSecretaryConfigCache,
  isHighValueContract,
  isCriticalValueContract,
  getExpirationUrgency,
  meetsMinimumContentRequirements,
  getRiskyClauseRegexes,
  getHighRiskVendorRegexes,
  validateConfigOverride,
  validateConfigThresholds,
  validateAndLogConfigWarnings,
} from '../supabase/functions/local-agents/config/secretary-config';
import {
  generateTestUuid,
  generateContractContent,
  generateInvoiceContent,
  generateNdaContent,
  generatePurchaseOrderContent,
  generateW9Content,
  generateInsuranceCertContent,
  generateMemoContent,
  createMockSupabaseClient,
  VALID_SECRETARY_INPUTS,
  VALID_SECRETARY_CONTEXT,
  INVALID_SECRETARY_INPUTS,
  INVALID_SECRETARY_CONTEXT,
  AMOUNT_TEST_DATA,
  PARTY_TEST_DATA,
  DATE_TEST_DATA,
  CLAUSE_TEST_DATA,
  ERROR_SCENARIOS,
  EDGE_CASE_DATA,
  DOCUMENT_CLASSIFICATION_DATA,
  CONFIG_OVERRIDE_DATA,
} from './fixtures/secretary-test-data';

// =============================================================================
// CONSTANTS & ENUMS TESTS
// =============================================================================

describe('Secretary Agent Constants and Enums', () => {
  it('should have correct MAX_DOCUMENT_LENGTH', () => {
    expect(MAX_DOCUMENT_LENGTH).toBe(5_000_000);
  });

  it('should have correct MIN_CONTENT_LENGTH', () => {
    expect(MIN_CONTENT_LENGTH).toBe(10);
  });

  it('should have correct MAX_AMOUNTS', () => {
    expect(MAX_AMOUNTS).toBe(100);
  });

  it('should have correct MAX_PARTIES', () => {
    expect(MAX_PARTIES).toBe(50);
  });

  it('should have correct MAX_PARTY_NAME_LENGTH', () => {
    expect(MAX_PARTY_NAME_LENGTH).toBe(500);
  });

  it('should have correct MAX_CLAUSES', () => {
    expect(MAX_CLAUSES).toBe(500);
  });

  it('should have correct MAX_DATES', () => {
    expect(MAX_DATES).toBe(100);
  });

  it('should define all expected contract types', () => {
    expect(CONTRACT_TYPES).toContain('service_agreement');
    expect(CONTRACT_TYPES).toContain('nda');
    expect(CONTRACT_TYPES).toContain('purchase_order');
    expect(CONTRACT_TYPES).toContain('lease');
    expect(CONTRACT_TYPES).toContain('msa');
    expect(CONTRACT_TYPES).toContain('sow');
    expect(CONTRACT_TYPES).toContain('other');
    expect(CONTRACT_TYPES.length).toBeGreaterThanOrEqual(10);
  });

  it('should define all expected document types', () => {
    expect(DOCUMENT_TYPES).toContain('contract');
    expect(DOCUMENT_TYPES).toContain('invoice');
    expect(DOCUMENT_TYPES).toContain('proposal');
    expect(DOCUMENT_TYPES).toContain('w9');
    expect(DOCUMENT_TYPES).toContain('insurance_certificate');
    expect(DOCUMENT_TYPES).toContain('other');
  });

  it('should define all expected vendor document types', () => {
    expect(VENDOR_DOCUMENT_TYPES).toContain('w9');
    expect(VENDOR_DOCUMENT_TYPES).toContain('insurance_certificate');
    expect(VENDOR_DOCUMENT_TYPES).toContain('msa');
    expect(VENDOR_DOCUMENT_TYPES).toContain('invoice');
  });

  it('should define workflow types', () => {
    expect(WORKFLOW_TYPES).toContain('contract_onboarding');
    expect(WORKFLOW_TYPES).toContain('vendor_verification');
    expect(WORKFLOW_TYPES).toContain('document_processing');
    expect(WORKFLOW_TYPES).toContain('compliance_check');
  });

  it('should define complexity levels', () => {
    expect(COMPLEXITY_LEVELS).toContain('low');
    expect(COMPLEXITY_LEVELS).toContain('medium');
    expect(COMPLEXITY_LEVELS).toContain('high');
  });

  it('should define party types', () => {
    expect(PARTY_TYPES).toContain('vendor');
    expect(PARTY_TYPES).toContain('client');
    expect(PARTY_TYPES).toContain('contractor');
  });

  it('should define amount types', () => {
    expect(AMOUNT_TYPES).toContain('total');
    expect(AMOUNT_TYPES).toContain('payment');
    expect(AMOUNT_TYPES).toContain('fee');
    expect(AMOUNT_TYPES).toContain('penalty');
  });

  it('should define supported currencies', () => {
    expect(CURRENCIES).toContain('USD');
    expect(CURRENCIES).toContain('EUR');
    expect(CURRENCIES).toContain('GBP');
  });

  it('should define clause categories', () => {
    expect(CLAUSE_CATEGORIES).toContain('payment');
    expect(CLAUSE_CATEGORIES).toContain('termination');
    expect(CLAUSE_CATEGORIES).toContain('liability');
    expect(CLAUSE_CATEGORIES).toContain('confidentiality');
  });
});

// =============================================================================
// SCHEMA VALIDATION TESTS - Input Schemas
// =============================================================================

describe('Secretary Agent Input Validation', () => {
  describe('validateSecretaryInput', () => {
    it('should accept valid content input', () => {
      const result = validateSecretaryInput(VALID_SECRETARY_INPUTS.contentOnly);
      expect(result.success).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('should accept valid text input', () => {
      const result = validateSecretaryInput(VALID_SECRETARY_INPUTS.textOnly);
      expect(result.success).toBe(true);
    });

    it('should accept valid extracted_text input', () => {
      const result = validateSecretaryInput(VALID_SECRETARY_INPUTS.extractedTextOnly);
      expect(result.success).toBe(true);
    });

    it('should accept input with documentId', () => {
      const result = validateSecretaryInput(VALID_SECRETARY_INPUTS.documentIdOnly);
      expect(result.success).toBe(true);
    });

    it('should accept input with workflow options', () => {
      const result = validateSecretaryInput(VALID_SECRETARY_INPUTS.contentWithWorkflow);
      expect(result.success).toBe(true);
      expect(result.data?.useWorkflow).toBe(true);
      expect(result.data?.workflowType).toBe('document_processing');
    });

    it('should accept input with multiple content sources', () => {
      const result = validateSecretaryInput(VALID_SECRETARY_INPUTS.multipleContentSources);
      expect(result.success).toBe(true);
    });

    it('should reject empty object (no content or documentId)', () => {
      const result = validateSecretaryInput(INVALID_SECRETARY_INPUTS.emptyObject);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject null input', () => {
      const result = validateSecretaryInput(INVALID_SECRETARY_INPUTS.nullInput);
      expect(result.success).toBe(false);
    });

    it('should reject undefined input', () => {
      const result = validateSecretaryInput(INVALID_SECRETARY_INPUTS.undefinedInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty content string', () => {
      const result = validateSecretaryInput(INVALID_SECRETARY_INPUTS.emptyContent);
      expect(result.success).toBe(false);
    });

    it('should reject input without any content or documentId fields', () => {
      const result = validateSecretaryInput(INVALID_SECRETARY_INPUTS.noContentFields);
      expect(result.success).toBe(false);
    });

    it('should default useWorkflow to false when not provided', () => {
      const result = validateSecretaryInput({ content: 'Valid content text' });
      expect(result.success).toBe(true);
      expect(result.data?.useWorkflow).toBe(false);
    });
  });

  describe('secretaryContextSchema', () => {
    it('should accept context with contractId', () => {
      const result = secretaryContextSchema.safeParse({ contractId: generateTestUuid() });
      expect(result.success).toBe(true);
    });

    it('should accept context with vendorId', () => {
      const result = secretaryContextSchema.safeParse({ vendorId: generateTestUuid() });
      expect(result.success).toBe(true);
    });

    it('should accept context with userId', () => {
      const result = secretaryContextSchema.safeParse({ userId: generateTestUuid() });
      expect(result.success).toBe(true);
    });

    it('should accept context with taskId', () => {
      const result = secretaryContextSchema.safeParse({ taskId: generateTestUuid() });
      expect(result.success).toBe(true);
    });

    it('should accept context with all IDs', () => {
      const result = secretaryContextSchema.safeParse({
        contractId: generateTestUuid(),
        vendorId: generateTestUuid(),
        userId: generateTestUuid(),
        taskId: generateTestUuid(),
      });
      expect(result.success).toBe(true);
    });

    it('should accept undefined context (optional)', () => {
      const result = secretaryContextSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('contractDocumentInputSchema', () => {
    it('should accept valid contract document input', () => {
      const result = contractDocumentInputSchema.safeParse({
        contractId: generateTestUuid(),
        content: 'Valid contract content text',
      });
      expect(result.success).toBe(true);
    });

    it('should reject without content fields', () => {
      const result = contractDocumentInputSchema.safeParse({
        contractId: generateTestUuid(),
      });
      expect(result.success).toBe(false);
    });

    it('should reject without contractId', () => {
      const result = contractDocumentInputSchema.safeParse({
        content: 'Valid content',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('vendorDocumentInputSchema', () => {
    it('should accept valid vendor document input', () => {
      const result = vendorDocumentInputSchema.safeParse({
        vendorId: generateTestUuid(),
        content: 'Vendor document content',
      });
      expect(result.success).toBe(true);
    });

    it('should accept vendor document without content (content optional)', () => {
      const result = vendorDocumentInputSchema.safeParse({
        vendorId: generateTestUuid(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('storedDocumentInputSchema', () => {
    it('should accept valid document ID', () => {
      const result = storedDocumentInputSchema.safeParse({
        documentId: generateTestUuid(),
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid document ID', () => {
      const result = storedDocumentInputSchema.safeParse({
        documentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('generalDocumentInputSchema', () => {
    it('should accept valid general document input', () => {
      const result = generalDocumentInputSchema.safeParse({
        content: 'General document content for analysis',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with workflow options', () => {
      const result = generalDocumentInputSchema.safeParse({
        content: 'Document content',
        useWorkflow: true,
        workflowType: 'document_processing',
      });
      expect(result.success).toBe(true);
    });

    it('should reject without any content', () => {
      const result = generalDocumentInputSchema.safeParse({
        documentId: generateTestUuid(),
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// SCHEMA VALIDATION TESTS - Extraction Schemas
// =============================================================================

describe('Secretary Agent Extraction Schemas', () => {
  describe('extractedPartySchema', () => {
    it('should accept valid party with all fields', () => {
      const result = extractedPartySchema.safeParse(PARTY_TEST_DATA.validParties[0]);
      expect(result.success).toBe(true);
    });

    it('should accept party with only name', () => {
      const result = extractedPartySchema.safeParse({ name: 'ABC Corporation' });
      expect(result.success).toBe(true);
    });

    it('should reject party with empty name', () => {
      const result = extractedPartySchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject party with whitespace-only name', () => {
      const result = extractedPartySchema.safeParse({ name: '   ' });
      expect(result.success).toBe(false);
    });
  });

  describe('extractedAmountSchema', () => {
    it('should accept valid amount with all fields', () => {
      const result = extractedAmountSchema.safeParse(AMOUNT_TEST_DATA.validAmounts[0]);
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = extractedAmountSchema.safeParse({
        value: -100,
        formatted: '-$100',
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = extractedAmountSchema.safeParse({
        value: 0,
        formatted: '$0',
      });
      expect(result.success).toBe(false);
    });

    it('should reject NaN amount', () => {
      const result = extractedAmountSchema.safeParse({
        value: NaN,
        formatted: 'NaN',
      });
      expect(result.success).toBe(false);
    });

    it('should reject Infinity amount', () => {
      const result = extractedAmountSchema.safeParse({
        value: Infinity,
        formatted: 'Infinity',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('extractedDatesSchema', () => {
    it('should accept valid dates', () => {
      const result = extractedDatesSchema.safeParse(DATE_TEST_DATA.validDates);
      expect(result.success).toBe(true);
    });

    it('should accept all null dates', () => {
      const result = extractedDatesSchema.safeParse(DATE_TEST_DATA.nullDates);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const result = extractedDatesSchema.safeParse({
        effectiveDate: '2025/01/01',
        expirationDate: null,
        signedDate: null,
        otherDates: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('isoDateSchema', () => {
    it('should accept valid ISO date (YYYY-MM-DD)', () => {
      const result = isoDateSchema.safeParse('2025-01-15');
      expect(result.success).toBe(true);
    });

    it('should reject invalid ISO date format', () => {
      const result = isoDateSchema.safeParse('01/15/2025');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = isoDateSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject invalid date values', () => {
      const result = isoDateSchema.safeParse('2025-99-99');
      expect(result.success).toBe(false);
    });
  });

  describe('clauseAnalysisSchema', () => {
    it('should accept valid clause analysis', () => {
      const result = clauseAnalysisSchema.safeParse(CLAUSE_TEST_DATA.validClauseAnalysis);
      expect(result.success).toBe(true);
    });

    it('should reject when riskyClausesCount does not match risky array length', () => {
      const result = clauseAnalysisSchema.safeParse(CLAUSE_TEST_DATA.invalidClauseAnalysis);
      expect(result.success).toBe(false);
    });

    it('should reject negative total', () => {
      const result = clauseAnalysisSchema.safeParse({
        total: -1,
        risky: [],
        riskyClausesCount: 0,
        standard: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documentMetadataSchema', () => {
    it('should accept valid document metadata', () => {
      const result = documentMetadataSchema.safeParse({
        wordCount: 5000,
        pageCount: 10,
        hasSignatures: true,
        language: 'en',
        complexity: 'medium',
        completeness: 85,
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero page count', () => {
      const result = documentMetadataSchema.safeParse({
        wordCount: 5000,
        pageCount: 0,
        hasSignatures: false,
        language: 'en',
        complexity: 'low',
        completeness: 50,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid language code length', () => {
      const result = documentMetadataSchema.safeParse({
        wordCount: 1000,
        pageCount: 1,
        hasSignatures: false,
        language: 'english',
        complexity: 'low',
        completeness: 50,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid complexity level', () => {
      const result = documentMetadataSchema.safeParse({
        wordCount: 1000,
        pageCount: 1,
        hasSignatures: false,
        language: 'en',
        complexity: 'extreme',
        completeness: 50,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('contactInfoSchema', () => {
    it('should accept valid contact info', () => {
      const result = contactInfoSchema.safeParse({
        email: 'test@example.com',
        phone: '+1-555-123-4567',
        address: '100 Main St, City, State 12345',
        website: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all null contact info', () => {
      const result = contactInfoSchema.safeParse({
        email: null,
        phone: null,
        address: null,
        website: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = contactInfoSchema.safeParse({
        email: 'not-an-email',
        phone: null,
        address: null,
        website: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('vendorIdentifiersSchema', () => {
    it('should accept valid vendor identifiers', () => {
      const result = vendorIdentifiersSchema.safeParse({
        taxId: '12-3456789',
        duns: '123456789',
        vendorId: 'V-001',
        registrationNumber: 'REG-2024-0001',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all null identifiers', () => {
      const result = vendorIdentifiersSchema.safeParse({
        taxId: null,
        duns: null,
        vendorId: null,
        registrationNumber: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid tax ID format', () => {
      const result = vendorIdentifiersSchema.safeParse({
        taxId: '123456789',
        duns: null,
        vendorId: null,
        registrationNumber: null,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid DUNS format', () => {
      const result = vendorIdentifiersSchema.safeParse({
        taxId: null,
        duns: '12345',
        vendorId: null,
        registrationNumber: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('complianceStatusSchema', () => {
    it('should accept valid compliance status', () => {
      const result = complianceStatusSchema.safeParse({
        isCompliant: true,
        missingDocuments: [],
        expiredDocuments: [],
        complianceScore: 95,
      });
      expect(result.success).toBe(true);
    });

    it('should accept non-compliant status with missing docs', () => {
      const result = complianceStatusSchema.safeParse({
        isCompliant: false,
        missingDocuments: ['w9', 'insurance_certificate'],
        expiredDocuments: ['nda'],
        complianceScore: 40,
      });
      expect(result.success).toBe(true);
    });

    it('should reject compliance score over 100', () => {
      const result = complianceStatusSchema.safeParse({
        isCompliant: true,
        missingDocuments: [],
        expiredDocuments: [],
        complianceScore: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative compliance score', () => {
      const result = complianceStatusSchema.safeParse({
        isCompliant: false,
        missingDocuments: [],
        expiredDocuments: [],
        complianceScore: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sentimentAnalysisSchema', () => {
    it('should accept valid sentiment analysis', () => {
      const result = sentimentAnalysisSchema.safeParse({
        score: 0.5,
        label: 'positive',
        positive: 10,
        negative: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should accept neutral sentiment', () => {
      const result = sentimentAnalysisSchema.safeParse({
        score: 0,
        label: 'neutral',
        positive: 5,
        negative: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should accept negative sentiment', () => {
      const result = sentimentAnalysisSchema.safeParse({
        score: -0.8,
        label: 'negative',
        positive: 1,
        negative: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should reject score out of range', () => {
      const result = sentimentAnalysisSchema.safeParse({
        score: 2.0,
        label: 'positive',
        positive: 5,
        negative: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid label', () => {
      const result = sentimentAnalysisSchema.safeParse({
        score: 0.5,
        label: 'very_positive',
        positive: 10,
        negative: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documentQualitySchema', () => {
    it('should accept valid quality assessment', () => {
      const result = documentQualitySchema.safeParse({
        score: 0.85,
        issues: ['Minor formatting inconsistencies'],
        completeness: 0.95,
      });
      expect(result.success).toBe(true);
    });

    it('should reject score above 1', () => {
      const result = documentQualitySchema.safeParse({
        score: 1.5,
        issues: [],
        completeness: 0.9,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative completeness', () => {
      const result = documentQualitySchema.safeParse({
        score: 0.5,
        issues: [],
        completeness: -0.1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('contentSchema', () => {
    it('should accept valid content', () => {
      const result = contentSchema.safeParse('This is valid content for analysis.');
      expect(result.success).toBe(true);
    });

    it('should reject content below minimum length', () => {
      const result = contentSchema.safeParse('short');
      expect(result.success).toBe(false);
    });

    it('should trim content', () => {
      const result = contentSchema.safeParse('  padded content  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('padded content');
      }
    });
  });

  describe('nonNegativeNumberSchema', () => {
    it('should accept zero', () => {
      const result = nonNegativeNumberSchema.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should accept positive numbers', () => {
      const result = nonNegativeNumberSchema.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should reject negative numbers', () => {
      const result = nonNegativeNumberSchema.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should reject NaN', () => {
      const result = nonNegativeNumberSchema.safeParse(NaN);
      expect(result.success).toBe(false);
    });

    it('should reject Infinity', () => {
      const result = nonNegativeNumberSchema.safeParse(Infinity);
      expect(result.success).toBe(false);
    });
  });

  describe('positiveNumberSchema', () => {
    it('should accept positive numbers', () => {
      const result = positiveNumberSchema.safeParse(1);
      expect(result.success).toBe(true);
    });

    it('should reject zero', () => {
      const result = positiveNumberSchema.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('should reject negative numbers', () => {
      const result = positiveNumberSchema.safeParse(-1);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// VALIDATION HELPER FUNCTION TESTS
// =============================================================================

describe('Secretary Agent Validation Helpers', () => {
  describe('validateAndFilterAmounts', () => {
    it('should validate and return valid amounts', () => {
      const result = validateAndFilterAmounts(AMOUNT_TEST_DATA.validAmounts);
      expect(result.length).toBe(AMOUNT_TEST_DATA.validAmounts.length);
      result.forEach((amt) => {
        expect(amt.value).toBeGreaterThan(0);
        expect(amt.formatted).toBeDefined();
      });
    });

    it('should filter out invalid amounts', () => {
      const result = validateAndFilterAmounts(AMOUNT_TEST_DATA.invalidAmounts);
      // Only amounts with positive numeric value and formatted string pass
      expect(result.length).toBeLessThan(AMOUNT_TEST_DATA.invalidAmounts.length);
      result.forEach((amt) => {
        expect(amt.value).toBeGreaterThan(0);
        expect(isFinite(amt.value)).toBe(true);
      });
    });

    it('should enforce MAX_AMOUNTS limit', () => {
      const result = validateAndFilterAmounts(AMOUNT_TEST_DATA.amountAtLimit);
      expect(result.length).toBeLessThanOrEqual(MAX_AMOUNTS);
    });

    it('should handle empty array', () => {
      const result = validateAndFilterAmounts([]);
      expect(result).toEqual([]);
    });

    it('should handle array of non-objects', () => {
      const result = validateAndFilterAmounts([1, 'two', null, undefined, true]);
      expect(result).toEqual([]);
    });
  });

  describe('validateAndFilterParties', () => {
    it('should validate and return valid parties', () => {
      const result = validateAndFilterParties(PARTY_TEST_DATA.validParties);
      expect(result.length).toBe(PARTY_TEST_DATA.validParties.length);
      result.forEach((party) => {
        expect(party.name).toBeDefined();
        expect(party.name.length).toBeGreaterThan(0);
      });
    });

    it('should filter out invalid parties', () => {
      const result = validateAndFilterParties(PARTY_TEST_DATA.invalidParties);
      expect(result.length).toBeLessThan(PARTY_TEST_DATA.invalidParties.length);
    });

    it('should deduplicate parties by name (case-insensitive)', () => {
      const result = validateAndFilterParties(PARTY_TEST_DATA.duplicateParties);
      const names = result.map((p) => p.name.toLowerCase().trim());
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    it('should truncate long party names', () => {
      const result = validateAndFilterParties([PARTY_TEST_DATA.longNameParty]);
      expect(result.length).toBe(1);
      expect(result[0].name.length).toBeLessThanOrEqual(MAX_PARTY_NAME_LENGTH);
    });

    it('should enforce MAX_PARTIES limit', () => {
      const result = validateAndFilterParties(PARTY_TEST_DATA.partiesAtLimit);
      expect(result.length).toBeLessThanOrEqual(MAX_PARTIES);
    });

    it('should handle empty array', () => {
      const result = validateAndFilterParties([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateAndFilterDates', () => {
    it('should validate and return valid dates', () => {
      const result = validateAndFilterDates(DATE_TEST_DATA.validDates);
      expect(result).toBeDefined();
      expect(result?.effectiveDate).toBe('2025-01-01');
      expect(result?.expirationDate).toBe('2025-12-31');
    });

    it('should return default structure for null dates', () => {
      const result = validateAndFilterDates(DATE_TEST_DATA.nullDates);
      expect(result).toBeDefined();
      expect(result?.effectiveDate).toBeNull();
      expect(result?.expirationDate).toBeNull();
      expect(result?.otherDates).toEqual([]);
    });

    it('should return default structure for invalid dates', () => {
      const result = validateAndFilterDates(DATE_TEST_DATA.invalidDates);
      expect(result).toBeDefined();
      // Should return defaults on validation failure
      expect(result?.effectiveDate).toBeNull();
      expect(result?.expirationDate).toBeNull();
    });

    it('should handle null input', () => {
      const result = validateAndFilterDates(null);
      expect(result).toBeDefined();
      expect(result?.effectiveDate).toBeNull();
    });
  });

  describe('isContentAnalyzable', () => {
    it('should return true for content above minimum length', () => {
      expect(isContentAnalyzable('This is valid content for analysis')).toBe(true);
    });

    it('should return true for content at exact minimum length', () => {
      expect(isContentAnalyzable('1234567890')).toBe(true);
    });

    it('should return false for content below minimum length', () => {
      expect(isContentAnalyzable('short')).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(isContentAnalyzable('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isContentAnalyzable(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isContentAnalyzable(undefined)).toBe(false);
    });

    it('should return false for whitespace-only content below minimum', () => {
      expect(isContentAnalyzable('    ')).toBe(false);
    });
  });

  describe('sanitizeContent', () => {
    it('should trim whitespace', () => {
      expect(sanitizeContent('  Hello world  ')).toBe('Hello world');
    });

    it('should remove null bytes', () => {
      const result = sanitizeContent('Hello\x00world');
      expect(result).not.toContain('\x00');
    });

    it('should normalize line endings', () => {
      const result = sanitizeContent('Line1\r\nLine2\rLine3');
      expect(result).toContain('\n');
      expect(result).not.toContain('\r');
    });

    it('should normalize multiple spaces', () => {
      const result = sanitizeContent('Hello    world');
      expect(result).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(sanitizeContent('')).toBe('');
    });

    it('should normalize unicode characters (NFC)', () => {
      const result = sanitizeContent('caf\u0065\u0301');
      expect(result).toBeDefined();
    });

    it('should handle content with tabs', () => {
      const result = sanitizeContent('Col1\tCol2\tCol3');
      // Tabs are normalized to spaces
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// CONFIGURATION SYSTEM TESTS
// =============================================================================

describe('Secretary Agent Configuration', () => {
  describe('SecretaryConfigSchema', () => {
    it('should parse default configuration', () => {
      const result = SecretaryConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.highValueContractThreshold).toBe(100000);
        expect(result.data.criticalValueContractThreshold).toBe(500000);
        expect(result.data.minCompletenessScore).toBe(0.7);
        expect(result.data.expirationWarningDays).toBe(90);
        expect(result.data.enableOcr).toBe(true);
      }
    });

    it('should accept valid overrides', () => {
      const result = SecretaryConfigSchema.safeParse(CONFIG_OVERRIDE_DATA.validOverride);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.highValueContractThreshold).toBe(200000);
        expect(result.data.enableOcr).toBe(false);
      }
    });

    it('should reject invalid minCompletenessScore above 1', () => {
      const result = SecretaryConfigSchema.safeParse({
        minCompletenessScore: 2.0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative highValueContractThreshold', () => {
      const result = SecretaryConfigSchema.safeParse({
        highValueContractThreshold: -1000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject maxDocumentLength below minimum', () => {
      const result = SecretaryConfigSchema.safeParse({
        maxDocumentLength: 500,
      });
      expect(result.success).toBe(false);
    });

    it('should have valid default config structure', () => {
      expect(DEFAULT_SECRETARY_CONFIG).toBeDefined();
      expect(DEFAULT_SECRETARY_CONFIG.highValueContractThreshold).toBe(100000);
      expect(DEFAULT_SECRETARY_CONFIG.criticalValueContractThreshold).toBe(500000);
      expect(DEFAULT_SECRETARY_CONFIG.expirationWarningDays).toBe(90);
      expect(DEFAULT_SECRETARY_CONFIG.criticalExpirationDays).toBe(30);
      expect(DEFAULT_SECRETARY_CONFIG.urgentExpirationDays).toBe(7);
    });
  });

  describe('getDefaultSecretaryConfig', () => {
    it('should return a copy of the default config', () => {
      const config1 = getDefaultSecretaryConfig();
      const config2 = getDefaultSecretaryConfig();
      expect(config1).toEqual(config2);
      // Should be different object references
      expect(config1).not.toBe(config2);
    });

    it('should have all required fields', () => {
      const config = getDefaultSecretaryConfig();
      expect(config.highValueContractThreshold).toBeDefined();
      expect(config.criticalValueContractThreshold).toBeDefined();
      expect(config.minCompletenessScore).toBeDefined();
      expect(config.minReadabilityScore).toBeDefined();
      expect(config.minExtractionConfidence).toBeDefined();
      expect(config.maxDocumentLength).toBeDefined();
      expect(config.minContentLength).toBeDefined();
      expect(config.expirationWarningDays).toBeDefined();
      expect(config.criticalExpirationDays).toBeDefined();
      expect(config.urgentExpirationDays).toBeDefined();
      expect(config.enableOcr).toBeDefined();
      expect(config.enableMemoryContext).toBeDefined();
      expect(config.enableWorkflowAutomation).toBeDefined();
      expect(config.enableNer).toBeDefined();
      expect(config.enableSentimentAnalysis).toBeDefined();
      expect(config.riskyClausePatterns).toBeDefined();
      expect(config.highRiskVendorPatterns).toBeDefined();
      expect(config.complianceKeywords).toBeDefined();
      expect(config.requiredVendorDocuments).toBeDefined();
    });
  });

  describe('clearSecretaryConfigCache', () => {
    it('should clear cache without error', () => {
      expect(() => clearSecretaryConfigCache()).not.toThrow();
    });

    it('should clear cache for specific enterprise without error', () => {
      expect(() => clearSecretaryConfigCache('test-enterprise')).not.toThrow();
    });
  });

  describe('isHighValueContract', () => {
    const config = getDefaultSecretaryConfig();

    it('should return true for amount above threshold', () => {
      expect(isHighValueContract(150000, config)).toBe(true);
    });

    it('should return true for amount at threshold', () => {
      expect(isHighValueContract(100000, config)).toBe(true);
    });

    it('should return false for amount below threshold', () => {
      expect(isHighValueContract(50000, config)).toBe(false);
    });

    it('should return false for zero', () => {
      expect(isHighValueContract(0, config)).toBe(false);
    });
  });

  describe('isCriticalValueContract', () => {
    const config = getDefaultSecretaryConfig();

    it('should return true for amount above critical threshold', () => {
      expect(isCriticalValueContract(750000, config)).toBe(true);
    });

    it('should return true for amount at critical threshold', () => {
      expect(isCriticalValueContract(500000, config)).toBe(true);
    });

    it('should return false for amount below critical threshold', () => {
      expect(isCriticalValueContract(200000, config)).toBe(false);
    });
  });

  describe('getExpirationUrgency', () => {
    const config = getDefaultSecretaryConfig();

    it('should return urgent for days within urgent threshold', () => {
      expect(getExpirationUrgency(3, config)).toBe('urgent');
    });

    it('should return urgent for exactly urgent days', () => {
      expect(getExpirationUrgency(7, config)).toBe('urgent');
    });

    it('should return critical for days within critical threshold', () => {
      expect(getExpirationUrgency(15, config)).toBe('critical');
    });

    it('should return critical for exactly critical days', () => {
      expect(getExpirationUrgency(30, config)).toBe('critical');
    });

    it('should return warning for days within warning threshold', () => {
      expect(getExpirationUrgency(60, config)).toBe('warning');
    });

    it('should return warning for exactly warning days', () => {
      expect(getExpirationUrgency(90, config)).toBe('warning');
    });

    it('should return normal for days beyond warning threshold', () => {
      expect(getExpirationUrgency(120, config)).toBe('normal');
    });

    it('should return urgent for zero days', () => {
      expect(getExpirationUrgency(0, config)).toBe('urgent');
    });

    it('should return urgent for negative days (expired)', () => {
      expect(getExpirationUrgency(-5, config)).toBe('urgent');
    });
  });

  describe('meetsMinimumContentRequirements', () => {
    const config = getDefaultSecretaryConfig();

    it('should return true for content at minimum', () => {
      expect(meetsMinimumContentRequirements('1234567890', config)).toBe(true);
    });

    it('should return true for content above minimum', () => {
      expect(meetsMinimumContentRequirements('This is a longer content string', config)).toBe(true);
    });

    it('should return false for content below minimum', () => {
      expect(meetsMinimumContentRequirements('short', config)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(meetsMinimumContentRequirements('', config)).toBe(false);
    });
  });

  describe('getRiskyClauseRegexes', () => {
    const config = getDefaultSecretaryConfig();

    it('should return array of RegExp objects', () => {
      const regexes = getRiskyClauseRegexes(config);
      expect(Array.isArray(regexes)).toBe(true);
      regexes.forEach((r) => {
        expect(r).toBeInstanceOf(RegExp);
      });
    });

    it('should have at least one regex pattern', () => {
      const regexes = getRiskyClauseRegexes(config);
      expect(regexes.length).toBeGreaterThan(0);
    });

    it('should match unlimited liability', () => {
      const regexes = getRiskyClauseRegexes(config);
      const text = 'The vendor accepts unlimited liability';
      const matched = regexes.some((r) => r.test(text));
      expect(matched).toBe(true);
    });

    it('should match auto-renew clauses', () => {
      const regexes = getRiskyClauseRegexes(config);
      const text = 'This contract shall auto-renew annually';
      const matched = regexes.some((r) => r.test(text));
      expect(matched).toBe(true);
    });

    it('should not match standard payment terms', () => {
      const regexes = getRiskyClauseRegexes(config);
      const text = 'Payment shall be made within Net 30 days';
      const matched = regexes.some((r) => {
        r.lastIndex = 0;
        return r.test(text);
      });
      expect(matched).toBe(false);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const customConfig = {
        ...config,
        riskyClausePatterns: ['valid_pattern', '[invalid(', 'another_valid'],
      };
      const regexes = getRiskyClauseRegexes(customConfig);
      // Should filter out invalid patterns
      expect(regexes.length).toBeLessThanOrEqual(3);
      regexes.forEach((r) => expect(r).toBeInstanceOf(RegExp));
    });
  });

  describe('getHighRiskVendorRegexes', () => {
    const config = getDefaultSecretaryConfig();

    it('should return array of RegExp objects', () => {
      const regexes = getHighRiskVendorRegexes(config);
      expect(Array.isArray(regexes)).toBe(true);
      expect(regexes.length).toBeGreaterThan(0);
    });

    it('should match bankruptcy terms', () => {
      const regexes = getHighRiskVendorRegexes(config);
      const text = 'Company filed for bankruptcy in 2024';
      const matched = regexes.some((r) => r.test(text));
      expect(matched).toBe(true);
    });

    it('should match litigation terms', () => {
      const regexes = getHighRiskVendorRegexes(config);
      const text = 'Pending litigation against the vendor';
      const matched = regexes.some((r) => r.test(text));
      expect(matched).toBe(true);
    });
  });

  describe('validateConfigOverride', () => {
    it('should accept valid partial override', () => {
      const result = validateConfigOverride(CONFIG_OVERRIDE_DATA.partialOverride);
      expect(result.valid).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should accept empty override', () => {
      const result = validateConfigOverride(CONFIG_OVERRIDE_DATA.emptyOverride);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid override values', () => {
      const result = validateConfigOverride({
        minCompletenessScore: 'not a number',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateConfigThresholds', () => {
    it('should return no errors for valid default config', () => {
      const config = getDefaultSecretaryConfig();
      const errors = validateConfigThresholds(config);
      expect(errors).toEqual([]);
    });

    it('should detect critical < high value threshold', () => {
      const config = {
        ...getDefaultSecretaryConfig(),
        highValueContractThreshold: 500000,
        criticalValueContractThreshold: 100000,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some((e) => e.includes('criticalValueContractThreshold'))).toBe(true);
    });

    it('should detect urgent >= critical expiration days', () => {
      const config = {
        ...getDefaultSecretaryConfig(),
        urgentExpirationDays: 90,
        criticalExpirationDays: 30,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some((e) => e.includes('urgentExpirationDays'))).toBe(true);
    });

    it('should detect critical >= warning expiration days', () => {
      const config = {
        ...getDefaultSecretaryConfig(),
        criticalExpirationDays: 100,
        expirationWarningDays: 90,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some((e) => e.includes('criticalExpirationDays'))).toBe(true);
    });

    it('should detect minContentLength >= maxDocumentLength', () => {
      const config = {
        ...getDefaultSecretaryConfig(),
        minContentLength: 5000000,
        maxDocumentLength: 5000000,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some((e) => e.includes('minContentLength'))).toBe(true);
    });

    it('should detect OCR confidence > extraction confidence', () => {
      const config = {
        ...getDefaultSecretaryConfig(),
        minOcrConfidence: 0.9,
        minExtractionConfidence: 0.5,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some((e) => e.includes('minOcrConfidence'))).toBe(true);
    });

    it('should detect configLoadTimeout >= extractionTimeout', () => {
      const config = {
        ...getDefaultSecretaryConfig(),
        configLoadTimeoutMs: 30000,
        extractionTimeoutMs: 30000,
      };
      const errors = validateConfigThresholds(config);
      expect(errors.some((e) => e.includes('configLoadTimeoutMs'))).toBe(true);
    });
  });

  describe('validateAndLogConfigWarnings', () => {
    it('should return the config unchanged', () => {
      const config = getDefaultSecretaryConfig();
      const result = validateAndLogConfigWarnings(config);
      expect(result).toEqual(config);
    });

    it('should not throw for invalid threshold relationships', () => {
      const config = {
        ...getDefaultSecretaryConfig(),
        highValueContractThreshold: 500000,
        criticalValueContractThreshold: 100000,
      };
      expect(() => validateAndLogConfigWarnings(config)).not.toThrow();
    });
  });
});

// =============================================================================
// MOCK DATA GENERATOR TESTS
// =============================================================================

describe('Secretary Agent Test Fixture Generators', () => {
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

  describe('generateContractContent', () => {
    it('should generate content with default parties', () => {
      const content = generateContractContent();
      expect(content).toContain('ABC Corporation');
      expect(content).toContain('XYZ Services LLC');
    });

    it('should generate content with custom parties', () => {
      const content = generateContractContent({ partyA: 'Custom Client', partyB: 'Custom Vendor' });
      expect(content).toContain('Custom Client');
      expect(content).toContain('Custom Vendor');
    });

    it('should include dates', () => {
      const content = generateContractContent({ effectiveDate: '2025-06-01', expirationDate: '2026-05-31' });
      expect(content).toContain('2025-06-01');
      expect(content).toContain('2026-05-31');
    });

    it('should include amounts', () => {
      const content = generateContractContent({ totalValue: 500000, annualFee: 250000 });
      expect(content).toContain('500,000');
      expect(content).toContain('250,000');
    });

    it('should include risky clauses when specified', () => {
      const content = generateContractContent({ includeRiskyClauses: true });
      expect(content).toContain('unlimited liability');
      expect(content).toContain('auto-renew');
    });

    it('should exclude risky clauses by default', () => {
      const content = generateContractContent();
      expect(content).not.toContain('unlimited liability');
    });

    it('should include signatures when specified', () => {
      const content = generateContractContent({ hasSignatures: true });
      expect(content).toContain('SIGNATURES');
    });
  });

  describe('generateInvoiceContent', () => {
    it('should generate valid invoice content', () => {
      const content = generateInvoiceContent();
      expect(content).toContain('INVOICE');
      expect(content).toContain('Total');
      expect(content).toContain('Payment Terms');
    });

    it('should include custom invoice number', () => {
      const content = generateInvoiceContent({ invoiceNumber: 'INV-CUSTOM-999' });
      expect(content).toContain('INV-CUSTOM-999');
    });
  });

  describe('generateNdaContent', () => {
    it('should generate NDA content', () => {
      const content = generateNdaContent();
      expect(content).toContain('NON-DISCLOSURE AGREEMENT');
      expect(content).toContain('confidential');
    });

    it('should include custom parties', () => {
      const content = generateNdaContent('Party One', 'Party Two');
      expect(content).toContain('Party One');
      expect(content).toContain('Party Two');
    });
  });

  describe('generatePurchaseOrderContent', () => {
    it('should generate PO content with items', () => {
      const content = generatePurchaseOrderContent();
      expect(content).toContain('PURCHASE ORDER');
      expect(content).toContain('Total');
    });
  });

  describe('generateW9Content', () => {
    it('should generate W9 content with identifiers', () => {
      const content = generateW9Content();
      expect(content).toContain('W-9');
      expect(content).toContain('Tax Identification Number');
      expect(content).toContain('DUNS Number');
    });

    it('should include custom vendor name', () => {
      const content = generateW9Content('Custom Vendor Inc.');
      expect(content).toContain('Custom Vendor Inc.');
    });
  });

  describe('generateInsuranceCertContent', () => {
    it('should generate insurance certificate content', () => {
      const content = generateInsuranceCertContent();
      expect(content).toContain('CERTIFICATE OF LIABILITY INSURANCE');
      expect(content).toContain('General Liability');
      expect(content).toContain('Policy Number');
    });
  });

  describe('generateMemoContent', () => {
    it('should generate memo content', () => {
      const content = generateMemoContent();
      expect(content).toContain('MEMORANDUM');
      expect(content).toContain('TO:');
      expect(content).toContain('FROM:');
    });
  });

  describe('createMockSupabaseClient', () => {
    it('should create a mock client with from method', () => {
      const client = createMockSupabaseClient();
      expect(client).toBeDefined();
      expect((client as Record<string, unknown>).from).toBeDefined();
    });

    it('should create a mock client with rpc method', () => {
      const client = createMockSupabaseClient();
      expect((client as Record<string, unknown>).rpc).toBeDefined();
    });

    it('should return chainable queries for contracts table', async () => {
      const client = createMockSupabaseClient() as Record<string, (...args: unknown[]) => unknown>;
      const query = client.from('contracts') as Record<string, (...args: unknown[]) => unknown>;
      expect(query.select).toBeDefined();
      expect(query.eq).toBeDefined();
    });

    it('should resolve single query with contract data', async () => {
      const client = createMockSupabaseClient() as Record<string, (...args: unknown[]) => unknown>;
      const query = client.from('contracts') as Record<string, (...args: unknown[]) => unknown>;
      const chained = query.select('*') as Record<string, (...args: unknown[]) => unknown>;
      const filtered = chained.eq('id', 'test') as Record<string, (...args: unknown[]) => unknown>;
      const resolved = await (filtered.single as () => Promise<{ data: unknown; error: unknown }>)();
      expect(resolved.data).toBeDefined();
      expect(resolved.error).toBeNull();
    });

    it('should accept override data', () => {
      const client = createMockSupabaseClient({
        contractData: null,
        error: new Error('Custom error'),
      });
      expect(client).toBeDefined();
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Secretary Agent Edge Cases', () => {
  describe('Empty and minimal inputs', () => {
    it('should reject empty document content', () => {
      const result = validateSecretaryInput(EDGE_CASE_DATA.emptyDocument);
      expect(result.success).toBe(false);
    });

    it('should handle null bytes in content via sanitizeContent', () => {
      const result = sanitizeContent(EDGE_CASE_DATA.nullBytesContent.content);
      expect(result).not.toContain('\x00');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unicode content', () => {
      const result = sanitizeContent(EDGE_CASE_DATA.unicodeContent.content);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle content with special characters', () => {
      const result = sanitizeContent(EDGE_CASE_DATA.documentWithSpecialCharacters.content);
      expect(result).toBeDefined();
      expect(result).toContain('$100,000.00');
    });

    it('should handle tab-delimited content', () => {
      const result = sanitizeContent(EDGE_CASE_DATA.tabDelimitedContent.content);
      expect(result).toBeDefined();
    });
  });

  describe('Boundary value testing', () => {
    it('should handle content at exact MIN_CONTENT_LENGTH', () => {
      const content = 'x'.repeat(MIN_CONTENT_LENGTH);
      expect(isContentAnalyzable(content)).toBe(true);
    });

    it('should handle content at MIN_CONTENT_LENGTH - 1', () => {
      const content = 'x'.repeat(MIN_CONTENT_LENGTH - 1);
      expect(isContentAnalyzable(content)).toBe(false);
    });

    it('should handle amounts at exactly MAX_AMOUNTS', () => {
      const amounts = Array.from({ length: MAX_AMOUNTS }, (_, i) => ({
        value: (i + 1) * 10,
        currency: 'USD',
        formatted: `$${(i + 1) * 10}`,
        type: 'payment' as const,
      }));
      const result = validateAndFilterAmounts(amounts);
      expect(result.length).toBe(MAX_AMOUNTS);
    });

    it('should handle parties at exactly MAX_PARTIES', () => {
      const parties = Array.from({ length: MAX_PARTIES }, (_, i) => ({
        name: `Party ${i + 1}`,
        type: 'party' as const,
      }));
      const result = validateAndFilterParties(parties);
      expect(result.length).toBe(MAX_PARTIES);
    });

    it('should handle high-value at exact threshold', () => {
      const config = getDefaultSecretaryConfig();
      expect(isHighValueContract(config.highValueContractThreshold, config)).toBe(true);
      expect(isHighValueContract(config.highValueContractThreshold - 1, config)).toBe(false);
    });

    it('should handle critical-value at exact threshold', () => {
      const config = getDefaultSecretaryConfig();
      expect(isCriticalValueContract(config.criticalValueContractThreshold, config)).toBe(true);
      expect(isCriticalValueContract(config.criticalValueContractThreshold - 1, config)).toBe(false);
    });

    it('should handle expiration at exact boundary between urgent and critical', () => {
      const config = getDefaultSecretaryConfig();
      expect(getExpirationUrgency(config.urgentExpirationDays, config)).toBe('urgent');
      expect(getExpirationUrgency(config.urgentExpirationDays + 1, config)).toBe('critical');
    });

    it('should handle expiration at exact boundary between critical and warning', () => {
      const config = getDefaultSecretaryConfig();
      expect(getExpirationUrgency(config.criticalExpirationDays, config)).toBe('critical');
      expect(getExpirationUrgency(config.criticalExpirationDays + 1, config)).toBe('warning');
    });

    it('should handle expiration at exact boundary between warning and normal', () => {
      const config = getDefaultSecretaryConfig();
      expect(getExpirationUrgency(config.expirationWarningDays, config)).toBe('warning');
      expect(getExpirationUrgency(config.expirationWarningDays + 1, config)).toBe('normal');
    });
  });

  describe('Document content variety', () => {
    it('should handle content with only numbers', () => {
      const result = isContentAnalyzable(EDGE_CASE_DATA.documentWithOnlyNumbers.content);
      expect(result).toBe(true);
    });

    it('should handle content with only dates', () => {
      const result = isContentAnalyzable(EDGE_CASE_DATA.documentWithOnlyDates.content);
      expect(result).toBe(true);
    });

    it('should handle HTML content', () => {
      const result = sanitizeContent(EDGE_CASE_DATA.htmlContent.content);
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// ERROR SCENARIO TESTS
// =============================================================================

describe('Secretary Agent Error Scenarios', () => {
  describe('Error classification categories', () => {
    it('should have database error scenario', () => {
      expect(ERROR_SCENARIOS.databaseError.category).toBe('database');
      expect(ERROR_SCENARIOS.databaseError.recoverable).toBe(true);
    });

    it('should have validation error scenario', () => {
      expect(ERROR_SCENARIOS.validationError.category).toBe('validation');
      expect(ERROR_SCENARIOS.validationError.recoverable).toBe(false);
    });

    it('should have timeout error scenario', () => {
      expect(ERROR_SCENARIOS.timeoutError.category).toBe('timeout');
      expect(ERROR_SCENARIOS.timeoutError.recoverable).toBe(true);
    });

    it('should have permission error scenario', () => {
      expect(ERROR_SCENARIOS.permissionError.category).toBe('permission');
      expect(ERROR_SCENARIOS.permissionError.recoverable).toBe(false);
    });

    it('should have external service error scenario', () => {
      expect(ERROR_SCENARIOS.externalServiceError.category).toBe('external');
      expect(ERROR_SCENARIOS.externalServiceError.recoverable).toBe(true);
    });

    it('should have rate limit error scenario', () => {
      expect(ERROR_SCENARIOS.rateLimitError.category).toBe('rate_limiting');
      expect(ERROR_SCENARIOS.rateLimitError.recoverable).toBe(true);
    });

    it('should have malformed data error scenario', () => {
      expect(ERROR_SCENARIOS.malformedDataError.category).toBe('malformed_data');
      expect(ERROR_SCENARIOS.malformedDataError.recoverable).toBe(false);
    });

    it('should have unknown error scenario', () => {
      expect(ERROR_SCENARIOS.unknownError.category).toBe('unknown');
      expect(ERROR_SCENARIOS.unknownError.recoverable).toBe(false);
    });
  });

  describe('Recoverable vs non-recoverable errors', () => {
    it('should mark database, timeout, external, rate_limiting as recoverable', () => {
      const recoverableCategories = ['database', 'timeout', 'external', 'rate_limiting'];
      Object.values(ERROR_SCENARIOS).forEach((scenario) => {
        if (recoverableCategories.includes(scenario.category)) {
          expect(scenario.recoverable).toBe(true);
        }
      });
    });

    it('should mark validation, permission, malformed_data, unknown as non-recoverable', () => {
      const nonRecoverableCategories = ['validation', 'permission', 'malformed_data', 'unknown'];
      Object.values(ERROR_SCENARIOS).forEach((scenario) => {
        if (nonRecoverableCategories.includes(scenario.category)) {
          expect(scenario.recoverable).toBe(false);
        }
      });
    });
  });
});

// =============================================================================
// DOCUMENT CLASSIFICATION TEST DATA
// =============================================================================

describe('Secretary Agent Document Classification Data', () => {
  it('should have service agreement content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.serviceAgreement).toContain('MASTER SERVICE AGREEMENT');
  });

  it('should have NDA content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.nda).toContain('NON-DISCLOSURE AGREEMENT');
  });

  it('should have purchase order content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.purchaseOrder).toContain('PURCHASE ORDER');
  });

  it('should have invoice content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.invoice).toContain('INVOICE');
  });

  it('should have W9 form content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.w9Form).toContain('W-9');
  });

  it('should have insurance certificate content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.insuranceCert).toContain('CERTIFICATE OF LIABILITY INSURANCE');
  });

  it('should have memo content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.memo).toContain('MEMORANDUM');
  });

  it('should have generic letter content', () => {
    expect(DOCUMENT_CLASSIFICATION_DATA.genericLetter).toContain('Dear');
  });
});

// =============================================================================
// INTEGRATION-STYLE TESTS (schema + config combined)
// =============================================================================

describe('Secretary Agent Integration Patterns', () => {
  describe('Config-driven validation thresholds', () => {
    it('should use config thresholds for value classification', () => {
      const config = getDefaultSecretaryConfig();
      const amounts = [
        { value: 50000, expected: { high: false, critical: false } },
        { value: 100000, expected: { high: true, critical: false } },
        { value: 500000, expected: { high: true, critical: true } },
        { value: 1000000, expected: { high: true, critical: true } },
      ];

      amounts.forEach(({ value, expected }) => {
        expect(isHighValueContract(value, config)).toBe(expected.high);
        expect(isCriticalValueContract(value, config)).toBe(expected.critical);
      });
    });

    it('should use config thresholds for expiration classification', () => {
      const config = getDefaultSecretaryConfig();
      const scenarios = [
        { days: 1, expected: 'urgent' },
        { days: 7, expected: 'urgent' },
        { days: 15, expected: 'critical' },
        { days: 30, expected: 'critical' },
        { days: 60, expected: 'warning' },
        { days: 90, expected: 'warning' },
        { days: 180, expected: 'normal' },
        { days: 365, expected: 'normal' },
      ];

      scenarios.forEach(({ days, expected }) => {
        expect(getExpirationUrgency(days, config)).toBe(expected);
      });
    });
  });

  describe('Content validation pipeline', () => {
    it('should sanitize then validate content', () => {
      const rawContent = '  Contract\x00between\r\n   ABC Corp   and  XYZ Inc.  ';
      const sanitized = sanitizeContent(rawContent);
      const analyzable = isContentAnalyzable(sanitized);
      expect(analyzable).toBe(true);
      expect(sanitized).not.toContain('\x00');
      expect(sanitized).not.toContain('\r');
    });

    it('should handle validation of extracted amounts from realistic content', () => {
      const realisticAmounts = [
        { value: 250000, currency: 'USD', formatted: '$250,000.00', context: 'Total contract value', type: 'total' as const },
        { value: 50000, currency: 'USD', formatted: '$50,000.00', context: 'Monthly payment', type: 'monthly' as const },
        { value: 5000, currency: 'USD', formatted: '$5,000.00', context: 'Late fee', type: 'penalty' as const },
      ];
      const validated = validateAndFilterAmounts(realisticAmounts);
      expect(validated.length).toBe(3);
      const totalValue = validated.reduce((sum, a) => sum + a.value, 0);
      expect(totalValue).toBe(305000);
    });

    it('should handle validation of extracted parties from realistic content', () => {
      const realisticParties = [
        { name: 'ABC Corporation', role: 'Client', type: 'client' as const },
        { name: 'XYZ Services LLC', role: 'Vendor', type: 'vendor' as const },
        { name: 'John Smith', role: 'Signatory' },
      ];
      const validated = validateAndFilterParties(realisticParties);
      expect(validated.length).toBe(3);
    });
  });

  describe('Config with custom thresholds', () => {
    it('should apply custom high-value threshold', () => {
      const config = SecretaryConfigSchema.parse({
        highValueContractThreshold: 50000,
      });
      expect(isHighValueContract(75000, config)).toBe(true);
      expect(isHighValueContract(25000, config)).toBe(false);
    });

    it('should apply custom expiration thresholds', () => {
      const config = SecretaryConfigSchema.parse({
        urgentExpirationDays: 3,
        criticalExpirationDays: 14,
        expirationWarningDays: 60,
      });
      expect(getExpirationUrgency(2, config)).toBe('urgent');
      expect(getExpirationUrgency(10, config)).toBe('critical');
      expect(getExpirationUrgency(45, config)).toBe('warning');
      expect(getExpirationUrgency(90, config)).toBe('normal');
    });

    it('should apply custom risky clause patterns', () => {
      const config = SecretaryConfigSchema.parse({
        riskyClausePatterns: ['force\\s+majeure', 'arbitration'],
      });
      const regexes = getRiskyClauseRegexes(config);
      expect(regexes.length).toBe(2);
      expect(regexes.some((r) => r.test('force majeure clause'))).toBe(true);
      expect(regexes.some((r) => r.test('arbitration required'))).toBe(true);
    });
  });
});
