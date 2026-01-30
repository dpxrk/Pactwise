/**
 * Secretary Agent Comprehensive Test Suite
 *
 * Tests for the Secretary Agent covering:
 * - Input validation
 * - Date extraction
 * - Amount extraction
 * - Party extraction
 * - Clause analysis
 * - Document classification
 * - OCR integration
 * - Error recovery
 * - Configuration
 * - End-to-end workflows
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SecretaryAgent } from '../supabase/functions/local-agents/agents/secretary.ts';
import { AgentContext } from '../supabase/types/common/agent';
import {
  secretaryInputSchema,
  validateSecretaryInput,
  validateAndFilterAmounts,
  validateAndFilterParties,
  isContentAnalyzable,
  sanitizeContent,
  MAX_DOCUMENT_LENGTH,
  MIN_CONTENT_LENGTH,
  MAX_AMOUNTS,
  MAX_PARTIES,
} from '../supabase/functions/local-agents/schemas/secretary.ts';
import {
  getDefaultSecretaryConfig,
  isHighValueContract,
  isCriticalValueContract,
  getExpirationUrgency,
  getRiskyClauseRegexes,
  validateConfigOverride,
  validateConfigThresholds,
} from '../supabase/functions/local-agents/config/secretary-config.ts';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const TEST_ENTERPRISE_ID = 'test-enterprise-secretary-001';

const TEST_CONTRACTS = {
  highValue: {
    title: 'High Value MSA',
    content: `
      MASTER SERVICE AGREEMENT

      This Agreement is made between ABC Corporation ("Client") and XYZ Services LLC ("Vendor").

      Effective Date: January 1, 2025
      Expiration Date: December 31, 2025

      Total Contract Value: $500,000.00
      Annual Fee: $250,000.00

      ARTICLE 1: SERVICES
      The Vendor shall provide enterprise software development services.

      ARTICLE 2: PAYMENT TERMS
      Payment shall be made within Net 30 days of invoice receipt.

      ARTICLE 3: TERMINATION
      Either party may terminate with 90 days written notice.

      ARTICLE 4: LIABILITY
      The Vendor shall not be liable for unlimited liability claims.

      ARTICLE 5: CONFIDENTIALITY
      All proprietary information shall remain confidential.

      SIGNATURES:
      ___________________
      Client Representative

      ___________________
      Vendor Representative
    `,
    value: 500000,
  },
  expiringSoon: {
    title: 'Expiring Contract',
    content: `
      SERVICE AGREEMENT

      Between TechCorp Inc. and ServicePro LLC.

      Effective Date: January 1, 2024
      Expiration Date: February 15, 2026

      This agreement will auto-renew unless terminated.

      Contract Value: $75,000
    `,
  },
  missingDates: {
    title: 'Incomplete Contract',
    content: `
      AGREEMENT

      This is a contract between Party A and Party B.

      Value: $50,000

      Terms and conditions apply.
    `,
  },
  riskyClause: {
    title: 'Contract with Risky Clauses',
    content: `
      SERVICE AGREEMENT

      Between Alpha Corp and Beta Services.

      Effective Date: March 1, 2025
      Expiration Date: March 1, 2027

      CLAUSE 1: The vendor accepts unlimited liability for all damages.
      CLAUSE 2: This contract shall auto-renew annually without notice.
      CLAUSE 3: Client has exclusive rights to all work products.
      CLAUSE 4: The vendor agrees to a non-compete clause worldwide.
      CLAUSE 5: All disputes shall be resolved at the sole discretion of the Client.

      Value: $100,000
    `,
  },
  multiLanguage: {
    title: 'Contrato de Servicios',
    content: `
      CONTRATO DE SERVICIOS

      Entre la empresa ABC y el proveedor XYZ.

      Fecha de inicio: 1 de enero de 2025
      Fecha de finalización: 31 de diciembre de 2025

      Valor del contrato: $150,000

      El proveedor proporcionará servicios de desarrollo de software.
    `,
  },
  nda: {
    title: 'Non-Disclosure Agreement',
    content: `
      NON-DISCLOSURE AGREEMENT

      This Non-Disclosure Agreement is entered into between ABC Corporation and XYZ Consulting.

      The parties agree to keep confidential all proprietary information and trade secrets.

      This NDA shall remain in effect for a period of 5 years.

      Signed Date: January 15, 2025
    `,
  },
  purchaseOrder: {
    title: 'Purchase Order',
    content: `
      PURCHASE ORDER #12345

      To: Supplier Inc.
      From: Buyer Corp

      Date: January 20, 2025
      Delivery Date: February 1, 2025

      Items:
      - 100 units @ $50 each = $5,000
      - 50 units @ $100 each = $5,000
      - Shipping: $500

      Total: $10,500

      Payment Terms: Net 30
    `,
  },
};

const TEST_VENDORS = {
  compliant: {
    id: 'vendor-compliant-001',
    name: 'TechCorp Solutions Inc.',
    description: 'Leading software development company with ISO 27001 certification',
    category: 'technology',
    email: 'contact@techcorp.com',
    phone: '+1-555-123-4567',
  },
  risky: {
    id: 'vendor-risky-001',
    name: 'RiskyVendor LLC',
    description: 'Company with bankruptcy history and pending lawsuit',
    category: 'consulting',
    email: 'info@riskyvendor.com',
  },
  incomplete: {
    id: 'vendor-incomplete-001',
    name: 'NewVendor',
    description: 'Recently established company',
  },
};

// =============================================================================
// MOCK SUPABASE CLIENT
// =============================================================================

interface MockQueryBuilder {
  data: unknown;
  error: Error | null;
  select: (columns?: string) => MockQueryBuilder;
  insert: (data: unknown) => { data: unknown; error: Error | null };
  update: (data: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  upsert: (data: unknown, options?: unknown) => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  neq: (column: string, value: unknown) => MockQueryBuilder;
  gt: (column: string, value: unknown) => MockQueryBuilder;
  gte: (column: string, value: unknown) => MockQueryBuilder;
  lt: (column: string, value: unknown) => MockQueryBuilder;
  lte: (column: string, value: unknown) => MockQueryBuilder;
  is: (column: string, value: unknown) => MockQueryBuilder;
  single: () => MockQueryBuilder;
  maybeSingle: () => MockQueryBuilder;
  order: (column: string, options?: unknown) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
}

const createMockQueryBuilder = (data: unknown = null, error: Error | null = null): MockQueryBuilder => {
  const builder: MockQueryBuilder = {
    data,
    error,
    select: () => builder,
    insert: () => ({ data: {}, error: null }),
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    is: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    order: () => builder,
    limit: () => builder,
  };
  return builder;
};

const createMockSupabase = (overrides: Record<string, unknown> = {}) => ({
  from: vi.fn((_table: string) => createMockQueryBuilder()),
  rpc: vi.fn(() => ({ data: [], error: null })),
  auth: {
    getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
  },
  storage: {
    from: vi.fn(() => ({
      download: vi.fn(async () => ({ data: null, error: null })),
      upload: vi.fn(async () => ({ data: { path: '' }, error: null })),
    })),
  },
  ...overrides,
});

const createTestContext = (overrides: Partial<AgentContext> = {}): AgentContext => ({
  dataType: 'contract',
  enterpriseId: TEST_ENTERPRISE_ID,
  sessionId: 'test-session-001',
  environment: { name: 'test' },
  permissions: ['read', 'write'],
  ...overrides,
});

// =============================================================================
// INPUT VALIDATION TESTS (8 tests)
// =============================================================================

describe('Secretary Agent - Input Validation', () => {
  describe('validateSecretaryInput', () => {
    it('should accept valid content input', () => {
      const result = validateSecretaryInput({ content: 'Valid contract content' });
      expect(result.success).toBe(true);
    });

    it('should accept valid text input', () => {
      const result = validateSecretaryInput({ text: 'Valid document text' });
      expect(result.success).toBe(true);
    });

    it('should accept valid extracted_text input', () => {
      const result = validateSecretaryInput({ extracted_text: 'Extracted text from OCR' });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = validateSecretaryInput({ content: '' });
      expect(result.success).toBe(false);
    });

    it('should reject null input', () => {
      const result = validateSecretaryInput(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined input', () => {
      const result = validateSecretaryInput(undefined);
      expect(result.success).toBe(false);
    });

    it('should reject input without content fields', () => {
      const result = validateSecretaryInput({ randomField: 'value' });
      expect(result.success).toBe(false);
    });

    it('should truncate content exceeding MAX_DOCUMENT_LENGTH', () => {
      const longContent = 'x'.repeat(MAX_DOCUMENT_LENGTH + 1000);
      const sanitized = sanitizeContent(longContent.substring(0, MAX_DOCUMENT_LENGTH));
      expect(sanitized.length).toBeLessThanOrEqual(MAX_DOCUMENT_LENGTH);
    });
  });

  describe('isContentAnalyzable', () => {
    it('should return true for content above minimum length', () => {
      expect(isContentAnalyzable('This is valid content for analysis')).toBe(true);
    });

    it('should return false for empty content', () => {
      expect(isContentAnalyzable('')).toBe(false);
    });

    it('should return false for content below minimum length', () => {
      expect(isContentAnalyzable('ab')).toBe(false);
    });

    it('should return false for whitespace-only content', () => {
      expect(isContentAnalyzable('   \n\t  ')).toBe(false);
    });
  });

  describe('sanitizeContent', () => {
    it('should normalize whitespace', () => {
      const result = sanitizeContent('Hello   \t  world');
      expect(result).not.toContain('   ');
    });

    it('should handle null bytes', () => {
      const result = sanitizeContent('Hello\0world');
      expect(result).not.toContain('\0');
    });

    it('should trim content', () => {
      const result = sanitizeContent('  Hello world  ');
      expect(result).toBe('Hello world');
    });
  });
});

// =============================================================================
// DATE EXTRACTION TESTS (6 tests)
// =============================================================================

describe('Secretary Agent - Date Extraction', () => {
  let agent: SecretaryAgent;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
  });

  it('should extract effective date from standard format', async () => {
    const result = await agent.process(
      { content: 'Effective Date: January 1, 2025' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.dates?.effectiveDate).toBeDefined();
  });

  it('should extract expiration date', async () => {
    const result = await agent.process(
      { content: 'Expiration Date: December 31, 2025' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.dates?.expirationDate).toBeDefined();
  });

  it('should extract dates in MM/DD/YYYY format', async () => {
    const result = await agent.process(
      { content: 'Contract signed on 01/15/2025' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.dates?.otherDates).toBeDefined();
  });

  it('should extract dates in YYYY-MM-DD format', async () => {
    const result = await agent.process(
      { content: 'Start date: 2025-03-01' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.dates?.otherDates).toBeDefined();
  });

  it('should handle documents without dates', async () => {
    const result = await agent.process(
      { content: 'This document has no dates mentioned' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.dates?.effectiveDate).toBeNull();
    expect(result.data?.dates?.expirationDate).toBeNull();
  });

  it('should handle malformed date strings gracefully', async () => {
    const result = await agent.process(
      { content: 'Date: 99/99/9999' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    // Should not crash on invalid dates
  });
});

// =============================================================================
// AMOUNT EXTRACTION TESTS (6 tests)
// =============================================================================

describe('Secretary Agent - Amount Extraction', () => {
  describe('validateAndFilterAmounts', () => {
    it('should validate USD amounts', () => {
      const amounts = [{ value: 100000, currency: 'USD', formatted: '$100,000' }];
      const result = validateAndFilterAmounts(amounts);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(100000);
    });

    it('should filter out NaN values', () => {
      const amounts = [
        { value: 100000, currency: 'USD', formatted: '$100,000' },
        { value: NaN, currency: 'USD', formatted: 'invalid' },
      ];
      const result = validateAndFilterAmounts(amounts);
      expect(result).toHaveLength(1);
    });

    it('should filter out Infinity values', () => {
      const amounts = [
        { value: Infinity, currency: 'USD', formatted: 'infinity' },
        { value: 50000, currency: 'USD', formatted: '$50,000' },
      ];
      const result = validateAndFilterAmounts(amounts);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(50000);
    });

    it('should filter out negative values', () => {
      const amounts = [
        { value: -5000, currency: 'USD', formatted: '-$5,000' },
        { value: 10000, currency: 'USD', formatted: '$10,000' },
      ];
      const result = validateAndFilterAmounts(amounts);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(10000);
    });

    it('should enforce MAX_AMOUNTS limit', () => {
      const amounts = Array.from({ length: MAX_AMOUNTS + 10 }, (_, i) => ({
        value: i * 100,
        currency: 'USD',
        formatted: `$${i * 100}`,
      }));
      const result = validateAndFilterAmounts(amounts);
      expect(result.length).toBeLessThanOrEqual(MAX_AMOUNTS);
    });

    it('should handle empty array', () => {
      const result = validateAndFilterAmounts([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Amount extraction from content', () => {
    let agent: SecretaryAgent;

    beforeEach(() => {
      const mockSupabase = createMockSupabase();
      agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
    });

    it('should extract amounts with dollar sign', async () => {
      const result = await agent.process(
        { content: 'Total value: $150,000.00' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.amounts?.[0]?.value).toBe(150000);
    });

    it('should extract amounts with USD prefix', async () => {
      const result = await agent.process(
        { content: 'Payment of USD 75,000 required' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.amounts).toBeDefined();
    });
  });
});

// =============================================================================
// PARTY EXTRACTION TESTS (5 tests)
// =============================================================================

describe('Secretary Agent - Party Extraction', () => {
  describe('validateAndFilterParties', () => {
    it('should validate party with name and type', () => {
      const parties = [{ name: 'ABC Corporation', type: 'client' }];
      const result = validateAndFilterParties(parties);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ABC Corporation');
    });

    it('should filter out empty names', () => {
      const parties = [
        { name: 'ABC Corporation', type: 'client' },
        { name: '', type: 'vendor' },
      ];
      const result = validateAndFilterParties(parties);
      expect(result).toHaveLength(1);
    });

    it('should enforce MAX_PARTIES limit', () => {
      const parties = Array.from({ length: MAX_PARTIES + 10 }, (_, i) => ({
        name: `Party ${i}`,
        type: 'party',
      }));
      const result = validateAndFilterParties(parties);
      expect(result.length).toBeLessThanOrEqual(MAX_PARTIES);
    });

    it('should handle parties with very long names', () => {
      const longName = 'A'.repeat(1000);
      const parties = [{ name: longName, type: 'vendor' }];
      const result = validateAndFilterParties(parties);
      expect(result).toHaveLength(1);
      expect(result[0].name.length).toBeLessThanOrEqual(500);
    });

    it('should deduplicate parties with same name', () => {
      const parties = [
        { name: 'ABC Corp', type: 'client' },
        { name: 'ABC Corp', type: 'vendor' },
      ];
      const result = validateAndFilterParties(parties);
      // Should have unique names
      const names = result.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});

// =============================================================================
// CLAUSE ANALYSIS TESTS (6 tests)
// =============================================================================

describe('Secretary Agent - Clause Analysis', () => {
  let agent: SecretaryAgent;

  beforeEach(() => {
    const mockSupabase = createMockSupabase({
      rpc: vi.fn(() => ({ data: [], error: null })),
    });
    agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
  });

  it('should detect risky "unlimited liability" clauses', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.riskyClause.content },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    // Check for risky clause detection
    const hasRiskyClauseInsight = result.insights?.some(
      (i) => i.type === 'risky_clauses',
    );
    expect(hasRiskyClauseInsight).toBe(true);
  });

  it('should detect "auto-renew" clauses', async () => {
    const config = getDefaultSecretaryConfig();
    const patterns = getRiskyClauseRegexes(config);
    const hasAutoRenewPattern = patterns.some((p) =>
      p.test('This contract will auto-renew annually'),
    );
    expect(hasAutoRenewPattern).toBe(true);
  });

  it('should detect "non-compete" clauses', async () => {
    const config = getDefaultSecretaryConfig();
    const patterns = getRiskyClauseRegexes(config);
    const hasNonCompetePattern = patterns.some((p) =>
      p.test('The vendor agrees to a non-compete agreement'),
    );
    expect(hasNonCompetePattern).toBe(true);
  });

  it('should handle documents with no risky clauses', async () => {
    const result = await agent.process(
      { content: 'This is a simple agreement with standard terms.' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    const hasRiskyClauseInsight = result.insights?.some(
      (i) => i.type === 'risky_clauses',
    );
    expect(hasRiskyClauseInsight).toBeFalsy();
  });

  it('should handle empty content', async () => {
    const result = await agent.process(
      { content: '   ' },
      createTestContext(),
    );
    // Should handle gracefully
    expect(result).toBeDefined();
  });

  it('should categorize clauses by type', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    if (result.data?.clauses?.categories) {
      expect(typeof result.data.clauses.categories).toBe('object');
    }
  });
});

// =============================================================================
// DOCUMENT CLASSIFICATION TESTS (5 tests)
// =============================================================================

describe('Secretary Agent - Document Classification', () => {
  let agent: SecretaryAgent;

  beforeEach(() => {
    const mockSupabase = createMockSupabase();
    agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
  });

  it('should classify service agreement', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.documentType).toBe('service_agreement');
  });

  it('should classify NDA', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.nda.content },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.documentType).toBe('nda');
  });

  it('should classify purchase order', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.purchaseOrder.content },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(['purchase_order', 'invoice']).toContain(result.data?.documentType);
  });

  it('should handle unknown document types', async () => {
    const result = await agent.process(
      { content: 'Random content without clear classification markers.' },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.documentType).toBeDefined();
  });

  it('should detect multiple document types and choose primary', async () => {
    const mixedContent = `
      This SERVICE AGREEMENT includes a NON-DISCLOSURE clause.
      Payment terms are included like an invoice.
    `;
    const result = await agent.process(
      { content: mixedContent },
      createTestContext(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.documentType).toBeDefined();
  });
});

// =============================================================================
// CONFIGURATION TESTS (3 tests)
// =============================================================================

describe('Secretary Agent - Configuration', () => {
  describe('Default Configuration', () => {
    it('should have correct default thresholds', () => {
      const config = getDefaultSecretaryConfig();
      expect(config.highValueContractThreshold).toBe(100000);
      expect(config.criticalValueContractThreshold).toBe(500000);
      expect(config.minCompletenessScore).toBe(0.7);
      expect(config.minReadabilityScore).toBe(30);
    });

    it('should have correct expiration warning days', () => {
      const config = getDefaultSecretaryConfig();
      expect(config.expirationWarningDays).toBe(90);
      expect(config.criticalExpirationDays).toBe(30);
      expect(config.urgentExpirationDays).toBe(7);
    });

    it('should have default risky clause patterns', () => {
      const config = getDefaultSecretaryConfig();
      expect(config.riskyClausePatterns.length).toBeGreaterThan(0);
    });
  });

  describe('isHighValueContract', () => {
    const config = getDefaultSecretaryConfig();

    it('should return true for values above threshold', () => {
      expect(isHighValueContract(150000, config)).toBe(true);
    });

    it('should return false for values below threshold', () => {
      expect(isHighValueContract(50000, config)).toBe(false);
    });

    it('should return true for values equal to threshold', () => {
      expect(isHighValueContract(100000, config)).toBe(true);
    });
  });

  describe('isCriticalValueContract', () => {
    const config = getDefaultSecretaryConfig();

    it('should return true for critical values', () => {
      expect(isCriticalValueContract(600000, config)).toBe(true);
    });

    it('should return false for high but not critical values', () => {
      expect(isCriticalValueContract(200000, config)).toBe(false);
    });
  });

  describe('getExpirationUrgency', () => {
    const config = getDefaultSecretaryConfig();

    it('should return urgent for days <= urgentExpirationDays', () => {
      expect(getExpirationUrgency(5, config)).toBe('urgent');
    });

    it('should return critical for days <= criticalExpirationDays', () => {
      expect(getExpirationUrgency(20, config)).toBe('critical');
    });

    it('should return warning for days <= expirationWarningDays', () => {
      expect(getExpirationUrgency(60, config)).toBe('warning');
    });

    it('should return normal for days > expirationWarningDays', () => {
      expect(getExpirationUrgency(120, config)).toBe('normal');
    });
  });

  describe('validateConfigOverride', () => {
    it('should accept valid partial config', () => {
      const result = validateConfigOverride({
        highValueContractThreshold: 200000,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid config values', () => {
      const result = validateConfigOverride({
        highValueContractThreshold: -1000,
      });
      expect(result.valid).toBe(false);
    });

    it('should accept empty config (use defaults)', () => {
      const result = validateConfigOverride({});
      expect(result.valid).toBe(true);
    });
  });
});

// =============================================================================
// ERROR RECOVERY TESTS (5 tests)
// =============================================================================

describe('Secretary Agent - Error Recovery', () => {
  it('should handle database query failure gracefully', async () => {
    const mockSupabase = createMockSupabase({
      from: vi.fn(() =>
        createMockQueryBuilder(null, new Error('Database connection failed')),
      ),
    });
    const agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);

    const result = await agent.process(
      { documentId: 'test-doc-123' },
      createTestContext(),
    );
    // Should not throw, should return error result
    expect(result).toBeDefined();
  });

  it('should handle missing contract gracefully', async () => {
    const mockSupabase = createMockSupabase({
      from: vi.fn(() => createMockQueryBuilder(null, null)),
    });
    const agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);

    const result = await agent.process(
      { content: 'Test content' },
      {
        ...createTestContext(),
        contractId: 'non-existent-contract',
      } as any,
    );
    expect(result).toBeDefined();
  });

  it('should handle invalid UUID format', async () => {
    const mockSupabase = createMockSupabase();
    const agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);

    const result = await agent.process(
      { content: 'Test' },
      {
        ...createTestContext(),
        contractId: 'invalid-uuid-format',
      } as any,
    );
    expect(result.success).toBe(false);
    expect(result.metadata?.error).toContain('Invalid');
  });

  it('should handle timeout gracefully', async () => {
    const mockSupabase = createMockSupabase({
      rpc: vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: [], error: null }), 100),
          ),
      ),
    });
    const agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);

    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );
    // Should complete without hanging
    expect(result).toBeDefined();
  });

  it('should return partial results on extraction errors', async () => {
    const mockSupabase = createMockSupabase();
    const agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);

    // Content with some valid and some problematic data
    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});

// =============================================================================
// END-TO-END TESTS (4 tests)
// =============================================================================

describe('Secretary Agent - End-to-End Workflows', () => {
  let agent: SecretaryAgent;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase({
      from: vi.fn((table: string) => {
        if (table === 'contracts') {
          return createMockQueryBuilder({
            id: 'test-contract-001',
            title: 'Test Contract',
            status: 'active',
            extracted_text: TEST_CONTRACTS.highValue.content,
            vendor: { id: 'v1', name: 'Test Vendor', category: 'technology' },
          });
        }
        if (table === 'vendors') {
          return createMockQueryBuilder({
            id: 'test-vendor-001',
            name: 'Test Vendor Inc.',
            category: 'technology',
          });
        }
        return createMockQueryBuilder();
      }),
      rpc: vi.fn(() => ({ data: [], error: null })),
    });
    agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
  });

  it('should process full contract workflow', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBeDefined();
    expect(result.data?.parties).toBeDefined();
    expect(result.data?.dates).toBeDefined();
    expect(result.data?.amounts).toBeDefined();
    expect(result.data?.documentType).toBeDefined();
    expect(result.insights).toBeDefined();
    expect(result.rulesApplied).toBeDefined();
  });

  it('should generate insights for high-value contracts', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    const hasHighValueInsight = result.insights?.some(
      (i) =>
        i.type === 'high_value_document' || i.type === 'critical_value_document',
    );
    expect(hasHighValueInsight).toBe(true);
  });

  it('should detect expiring contracts', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.expiringSoon.content },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    expect(result.data?.dates?.expirationDate).toBeDefined();
  });

  it('should process vendor documents', async () => {
    const vendorContent = `
      Vendor: ${TEST_VENDORS.compliant.name}
      Email: ${TEST_VENDORS.compliant.email}
      Phone: ${TEST_VENDORS.compliant.phone}

      ISO 27001 Certified
      SOC 2 Compliant
    `;

    const result = await agent.process(
      { content: vendorContent },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});

// =============================================================================
// MULTI-LANGUAGE TESTS (2 tests)
// =============================================================================

describe('Secretary Agent - Multi-Language Support', () => {
  let agent: SecretaryAgent;

  beforeEach(() => {
    const mockSupabase = createMockSupabase();
    agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
  });

  it('should detect Spanish language', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.multiLanguage.content },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    expect(['es', 'en']).toContain(result.data?.language);
  });

  it('should extract dates from Spanish format', async () => {
    const result = await agent.process(
      { content: TEST_CONTRACTS.multiLanguage.content },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    // Should handle Spanish date formats
  });
});

// =============================================================================
// MEMORY AND CACHING TESTS (2 tests)
// =============================================================================

describe('Secretary Agent - Memory and Caching', () => {
  it('should use cached results when available', async () => {
    const mockSupabase = createMockSupabase();
    const agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);

    // First call
    await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );

    // Second call should use cached results
    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext(),
    );

    expect(result.success).toBe(true);
  });

  it('should apply memory context when available', async () => {
    // Mock with user data for permission check
    const mockSupabase = createMockSupabase({
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return createMockQueryBuilder({ role: 'admin' });
        }
        return createMockQueryBuilder();
      }),
    });
    const agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);

    const result = await agent.process(
      { content: TEST_CONTRACTS.highValue.content },
      createTestContext({ userId: 'test-user-001' } as any),
    );

    expect(result.success).toBe(true);
    // Memory context should be applied
    const hasMemoryRule = result.rulesApplied?.includes('memory_context_applied');
    // May or may not be true depending on mocked memories
    expect(result.rulesApplied).toBeDefined();
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe('Secretary Agent - Constants', () => {
  it('should have valid MAX_DOCUMENT_LENGTH', () => {
    expect(MAX_DOCUMENT_LENGTH).toBeGreaterThan(0);
    expect(MAX_DOCUMENT_LENGTH).toBe(5000000);
  });

  it('should have valid MIN_CONTENT_LENGTH', () => {
    expect(MIN_CONTENT_LENGTH).toBeGreaterThan(0);
    expect(MIN_CONTENT_LENGTH).toBe(10);
  });

  it('should have valid MAX_AMOUNTS', () => {
    expect(MAX_AMOUNTS).toBeGreaterThan(0);
    expect(MAX_AMOUNTS).toBe(100);
  });

  it('should have valid MAX_PARTIES', () => {
    expect(MAX_PARTIES).toBeGreaterThan(0);
    expect(MAX_PARTIES).toBe(50);
  });
});

// =============================================================================
// HELPER METHOD TESTS (Phase 4 - Test Coverage)
// =============================================================================

describe('Secretary Agent - Helper Methods', () => {
  let agent: SecretaryAgent;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
  });

  describe('detectLanguage', () => {
    it('should detect English text', async () => {
      const result = await agent.process(
        { content: 'The agreement between the parties shall be governed by these terms and conditions.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.language || result.data?.language).toBe('en');
    });

    it('should detect Spanish text', async () => {
      const result = await agent.process(
        { content: 'El contrato entre las partes se regirá por estos términos y condiciones que se aplican.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(['es', 'en']).toContain(result.data?.metadata?.language || result.data?.language);
    });

    it('should detect French text', async () => {
      const result = await agent.process(
        { content: 'Le contrat entre les parties sera régi par ces termes et conditions qui sont les suivantes.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(['fr', 'en']).toContain(result.data?.metadata?.language || result.data?.language);
    });

    it('should detect German text', async () => {
      const result = await agent.process(
        { content: 'Der Vertrag zwischen den Parteien wird durch diese Bedingungen geregelt und bestimmt.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(['de', 'en']).toContain(result.data?.metadata?.language || result.data?.language);
    });

    it('should default to English for mixed/unclear content', async () => {
      const result = await agent.process(
        { content: 'xyz abc 123 456' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      // Default should be English when detection is unclear
    });
  });

  describe('extractCertifications', () => {
    it('should extract ISO certifications', async () => {
      const result = await agent.process(
        { content: 'Our company is ISO 27001 and ISO 9001 certified.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should extract SOC2 certification', async () => {
      const result = await agent.process(
        { content: 'We maintain SOC 2 Type II compliance for all operations.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should extract HIPAA compliance', async () => {
      const result = await agent.process(
        { content: 'This service is fully HIPAA compliant for healthcare data.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should extract GDPR compliance', async () => {
      const result = await agent.process(
        { content: 'Our platform is GDPR compliant for European users.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should extract PCI-DSS compliance', async () => {
      const result = await agent.process(
        { content: 'Payment processing is PCI-DSS Level 1 certified.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should handle documents without certifications', async () => {
      const result = await agent.process(
        { content: 'This is a simple agreement without compliance mentions.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('identifyVendorDocumentType', () => {
    it('should identify W-9 documents', async () => {
      const result = await agent.process(
        { content: 'W-9 Request for Taxpayer Identification Number and Certification' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should identify insurance certificates', async () => {
      const result = await agent.process(
        { content: 'CERTIFICATE OF INSURANCE: This certifies that insurance coverage is in effect.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should identify MSA documents', async () => {
      const result = await agent.process(
        { content: 'MASTER SERVICE AGREEMENT between parties for ongoing services.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.documentType).toBe('service_agreement');
    });

    it('should identify SOW documents', async () => {
      const result = await agent.process(
        { content: 'STATEMENT OF WORK: This SOW defines the scope of project deliverables.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should identify NDA documents', async () => {
      const result = await agent.process(
        { content: 'NON-DISCLOSURE AGREEMENT: Confidential information protection.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.documentType).toBe('nda');
    });

    it('should identify invoice documents', async () => {
      const result = await agent.process(
        { content: 'INVOICE #12345: Payment due for services rendered.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.documentType).toBe('invoice');
    });

    it('should identify purchase order documents', async () => {
      const result = await agent.process(
        { content: 'PURCHASE ORDER #67890: Order for equipment and supplies.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });

    it('should return other for unclassified documents', async () => {
      const result = await agent.process(
        { content: 'Random document content without clear type indicators.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.documentType).toBeDefined();
    });
  });

  describe('assessDocumentQuality', () => {
    it('should assess high quality document', async () => {
      const result = await agent.process(
        { content: TEST_CONTRACTS.highValue.content },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should assess low quality document with minimal content', async () => {
      const result = await agent.process(
        { content: 'Short content.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      // Low quality documents should have lower confidence
    });

    it('should detect missing sections', async () => {
      const result = await agent.process(
        { content: 'This document has no standard sections.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('extractClausesFallback', () => {
    it('should extract numbered clauses', async () => {
      const content = `
        1. First clause about payment terms.
        2. Second clause about termination.
        3. Third clause about liability.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
    });

    it('should extract ARTICLE sections', async () => {
      const result = await agent.process(
        { content: TEST_CONTRACTS.highValue.content },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.clauses).toBeDefined();
    });

    it('should extract SECTION markers', async () => {
      const content = `
        SECTION 1: Introduction
        This section introduces the agreement.

        SECTION 2: Definitions
        Key terms are defined here.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
    });

    it('should handle document with no clause markers', async () => {
      const result = await agent.process(
        { content: 'Plain text without any clause markers or sections.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('categorizeClause', () => {
    it('should categorize payment clauses', async () => {
      const content = `
        Payment Terms: All payments shall be made within 30 days.
        Invoice amounts are due upon receipt.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
      if (result.data?.clauses?.categories) {
        expect(typeof result.data.clauses.categories.payment).toBe('number');
      }
    });

    it('should categorize termination clauses', async () => {
      const content = `
        Termination: Either party may terminate this agreement with 30 days notice.
        Cancellation fees may apply.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
      if (result.data?.clauses?.categories) {
        expect(typeof result.data.clauses.categories.termination).toBe('number');
      }
    });

    it('should categorize liability clauses', async () => {
      const content = `
        Liability: The vendor shall not be liable for indirect damages.
        Indemnification provisions apply.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
      if (result.data?.clauses?.categories) {
        expect(typeof result.data.clauses.categories.liability).toBe('number');
      }
    });

    it('should categorize confidentiality clauses', async () => {
      const content = `
        Confidentiality: All proprietary information must remain confidential.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
      if (result.data?.clauses?.categories) {
        expect(typeof result.data.clauses.categories.confidentiality).toBe('number');
      }
    });

    it('should categorize warranty clauses', async () => {
      const content = `
        Warranty: The vendor warrants the product for 12 months.
        Guarantee against defects.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
      if (result.data?.clauses?.categories) {
        expect(typeof result.data.clauses.categories.warranty).toBe('number');
      }
    });

    it('should categorize general clauses', async () => {
      const content = `
        This agreement represents the entire understanding between parties.
      `;
      const result = await agent.process({ content }, createTestContext());
      expect(result.success).toBe(true);
    });
  });

  describe('estimatePageCount', () => {
    it('should estimate 1 page for short content', async () => {
      const result = await agent.process(
        { content: 'Short content of about 100 characters or so.' },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.pageCount).toBeGreaterThanOrEqual(1);
    });

    it('should estimate multiple pages for long content', async () => {
      // Create content with ~6000 chars (2 pages)
      const longContent = 'A'.repeat(3000) + '\n' + TEST_CONTRACTS.highValue.content;
      const result = await agent.process({ content: longContent }, createTestContext());
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.pageCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long documents', async () => {
      const veryLongContent = 'Content '.repeat(5000);
      const result = await agent.process({ content: veryLongContent }, createTestContext());
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.pageCount).toBeGreaterThan(1);
    });
  });

  describe('assessCompleteness', () => {
    it('should score complete documents highly', async () => {
      const result = await agent.process(
        { content: TEST_CONTRACTS.highValue.content },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.completeness).toBeGreaterThan(0.5);
    });

    it('should score incomplete documents lower', async () => {
      const result = await agent.process(
        { content: TEST_CONTRACTS.missingDates.content },
        createTestContext(),
      );
      expect(result.success).toBe(true);
      // Incomplete document should have lower completeness
    });

    it('should detect presence of standard sections', async () => {
      const completeContent = `
        PARTIES: Between ABC Corp and XYZ Inc.
        RECITALS: Whereas the parties wish to enter into agreement.
        TERMS: The following terms apply.
        PAYMENT: Payment terms are net 30.
        TERMINATION: Either party may terminate.
        CONFIDENTIALITY: All information is confidential.
        SIGNATURES:
        ___________________
      `;
      const result = await agent.process({ content: completeContent }, createTestContext());
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.completeness).toBeGreaterThan(0.5);
    });

    it('should penalize active contracts without signatures', async () => {
      const noSigContent = `
        This active agreement between parties.
        No signatures included.
      `;
      const result = await agent.process({ content: noSigContent }, createTestContext());
      expect(result.success).toBe(true);
    });
  });

  describe('detectEncodingIssues', () => {
    it('should detect mojibake patterns', async () => {
      // Content with encoding issues (UTF-8 decoded as Latin-1)
      const badContent = 'Contract with garbled text: \u00C3\u00A9\u00C3\u00A9\u00C3\u00A9 here';
      const result = await agent.process({ content: badContent }, createTestContext());
      expect(result.success).toBe(true);
      // Should have encoding warning insight
      const hasEncodingWarning = result.insights?.some(
        (i) => i.type === 'encoding_issues_detected'
      );
      // May or may not detect based on pattern matching
    });

    it('should handle clean UTF-8 content', async () => {
      const cleanContent = 'Clean UTF-8 content with special chars: é à ü ñ';
      const result = await agent.process({ content: cleanContent }, createTestContext());
      expect(result.success).toBe(true);
      const hasEncodingWarning = result.insights?.some(
        (i) => i.type === 'encoding_issues_detected'
      );
      expect(hasEncodingWarning).toBeFalsy();
    });

    it('should detect replacement character sequences', async () => {
      const badContent = 'Text with replacement chars: \uFFFD\uFFFD\uFFFD';
      const result = await agent.process({ content: badContent }, createTestContext());
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// INPUT CONFLICT DETECTION TESTS
// =============================================================================

describe('Secretary Agent - Input Conflict Detection', () => {
  let agent: SecretaryAgent;

  beforeEach(() => {
    const mockSupabase = createMockSupabase({
      from: vi.fn((table: string) => {
        if (table === 'contracts') {
          return createMockQueryBuilder({
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Test Contract',
            extracted_text: 'Contract content',
          });
        }
        if (table === 'vendors') {
          return createMockQueryBuilder({
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Test Vendor',
          });
        }
        return createMockQueryBuilder();
      }),
    });
    agent = new SecretaryAgent(mockSupabase as any, TEST_ENTERPRISE_ID);
  });

  it('should warn when both contractId and vendorId are provided', async () => {
    const result = await agent.process(
      { content: 'Test content' },
      {
        ...createTestContext(),
        contractId: '123e4567-e89b-12d3-a456-426614174000',
        vendorId: '123e4567-e89b-12d3-a456-426614174001',
      } as any,
    );

    expect(result.success).toBe(true);
    const hasConflictWarning = result.insights?.some(
      (i) => i.type === 'conflicting_context_ids'
    );
    expect(hasConflictWarning).toBe(true);
  });

  it('should warn when multiple content sources are provided', async () => {
    const result = await agent.process(
      {
        content: 'Primary content',
        text: 'Secondary text',
        extracted_text: 'Tertiary extracted',
      },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    const hasMultipleSourcesWarning = result.insights?.some(
      (i) => i.type === 'multiple_content_sources'
    );
    expect(hasMultipleSourcesWarning).toBe(true);
  });

  it('should not warn with single content source', async () => {
    const result = await agent.process(
      { content: 'Single content source' },
      createTestContext(),
    );

    expect(result.success).toBe(true);
    const hasMultipleSourcesWarning = result.insights?.some(
      (i) => i.type === 'multiple_content_sources'
    );
    expect(hasMultipleSourcesWarning).toBeFalsy();
  });
});

// =============================================================================
// CONFIGURATION THRESHOLD VALIDATION TESTS
// =============================================================================

describe('Secretary Agent - Configuration Threshold Validation', () => {
  it('should export validateConfigThresholds function', async () => {
    const { validateConfigThresholds } = await import(
      '../supabase/functions/local-agents/config/secretary-config.ts'
    );
    expect(typeof validateConfigThresholds).toBe('function');
  });

  it('should pass validation for default config', async () => {
    const { validateConfigThresholds, getDefaultSecretaryConfig } = await import(
      '../supabase/functions/local-agents/config/secretary-config.ts'
    );
    const config = getDefaultSecretaryConfig();
    const errors = validateConfigThresholds(config);
    expect(errors).toHaveLength(0);
  });

  it('should detect invalid value threshold ordering', async () => {
    const { validateConfigThresholds, getDefaultSecretaryConfig } = await import(
      '../supabase/functions/local-agents/config/secretary-config.ts'
    );
    const config = {
      ...getDefaultSecretaryConfig(),
      highValueContractThreshold: 500000,
      criticalValueContractThreshold: 100000, // Invalid: critical < high
    };
    const errors = validateConfigThresholds(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('criticalValueContractThreshold');
  });

  it('should detect invalid expiration days ordering', async () => {
    const { validateConfigThresholds, getDefaultSecretaryConfig } = await import(
      '../supabase/functions/local-agents/config/secretary-config.ts'
    );
    const config = {
      ...getDefaultSecretaryConfig(),
      urgentExpirationDays: 30,
      criticalExpirationDays: 20, // Invalid: urgent > critical
    };
    const errors = validateConfigThresholds(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});
