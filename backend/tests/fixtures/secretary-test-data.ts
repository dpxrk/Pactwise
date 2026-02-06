/**
 * Test fixtures for Secretary Agent comprehensive tests
 *
 * Provides mock data generators, test inputs, and a mock Supabase client
 * for testing the Secretary Agent's various document processing capabilities:
 * - Contract document analysis
 * - Vendor document processing
 * - Stored document retrieval and analysis
 * - General document analysis
 * - Input validation
 * - Configuration helpers
 */

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate a valid UUID for testing
 */
export function generateTestUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// DOCUMENT CONTENT GENERATORS
// =============================================================================

/**
 * Generate a realistic contract document text
 */
export function generateContractContent(options?: Partial<ContractContentOptions>): string {
  const defaults: ContractContentOptions = {
    partyA: 'ABC Corporation',
    partyB: 'XYZ Services LLC',
    effectiveDate: '2025-01-01',
    expirationDate: '2025-12-31',
    totalValue: 250000,
    annualFee: 125000,
    hasSignatures: true,
    includeRiskyClauses: false,
    includeConfidentiality: true,
    documentType: 'service_agreement',
  };

  const opts = { ...defaults, ...options };

  let content = `
    MASTER SERVICE AGREEMENT

    This Agreement is made between ${opts.partyA} ("Client") and ${opts.partyB} ("Vendor").

    Effective Date: ${opts.effectiveDate}
    Expiration Date: ${opts.expirationDate}

    Total Contract Value: $${opts.totalValue!.toLocaleString()}.00
    Annual Fee: $${opts.annualFee!.toLocaleString()}.00

    ARTICLE 1: SERVICES
    The Vendor shall provide enterprise software development services.

    ARTICLE 2: PAYMENT TERMS
    Payment shall be made within Net 30 days of invoice receipt.

    ARTICLE 3: TERMINATION
    Either party may terminate with 90 days written notice.
  `;

  if (opts.includeRiskyClauses) {
    content += `
    ARTICLE 4: LIABILITY
    The Vendor shall accept unlimited liability for all damages.
    This contract shall auto-renew annually without notice.
    Client has exclusive rights to all work products.
    The vendor agrees to a non-compete clause worldwide.
    All disputes shall be resolved at the sole discretion of the Client.
    `;
  }

  if (opts.includeConfidentiality) {
    content += `
    ARTICLE 5: CONFIDENTIALITY
    All proprietary information shall remain confidential.
    `;
  }

  if (opts.hasSignatures) {
    content += `
    SIGNATURES:
    ___________________
    Client Representative

    ___________________
    Vendor Representative
    `;
  }

  return content;
}

/**
 * Generate invoice document content
 */
export function generateInvoiceContent(options?: Partial<InvoiceContentOptions>): string {
  const defaults: InvoiceContentOptions = {
    invoiceNumber: 'INV-2025-001',
    vendor: 'TechServices Inc.',
    client: 'Enterprise Corp',
    date: '2025-01-15',
    dueDate: '2025-02-14',
    items: [
      { description: 'Software Development', quantity: 160, unitPrice: 150, total: 24000 },
      { description: 'Project Management', quantity: 40, unitPrice: 200, total: 8000 },
    ],
    subtotal: 32000,
    tax: 2560,
    total: 34560,
  };

  const opts = { ...defaults, ...options };

  return `
    INVOICE ${opts.invoiceNumber}

    From: ${opts.vendor}
    To: ${opts.client}

    Invoice Date: ${opts.date}
    Due Date: ${opts.dueDate}

    Items:
    ${opts.items!.map((item) => `- ${item.description}: ${item.quantity} x $${item.unitPrice} = $${item.total.toLocaleString()}`).join('\n    ')}

    Subtotal: $${opts.subtotal!.toLocaleString()}
    Tax (8%): $${opts.tax!.toLocaleString()}
    Total: $${opts.total!.toLocaleString()}

    Payment Terms: Net 30
    Contact: billing@techservices.com | +1-555-987-6543
  `;
}

/**
 * Generate NDA document content
 */
export function generateNdaContent(partyA: string = 'ABC Corporation', partyB: string = 'XYZ Consulting'): string {
  return `
    NON-DISCLOSURE AGREEMENT

    This Non-Disclosure Agreement is entered into between ${partyA} and ${partyB}.

    Effective Date: January 15, 2025

    The parties agree to keep confidential all proprietary information and trade secrets
    shared during the course of their business relationship.

    This NDA shall remain in effect for a period of 5 years from the effective date.

    Signed Date: January 15, 2025

    ___________________
    ${partyA} Representative

    ___________________
    ${partyB} Representative
  `;
}

/**
 * Generate purchase order document content
 */
export function generatePurchaseOrderContent(): string {
  return `
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
    Contact: orders@supplier.com
  `;
}

/**
 * Generate vendor W9 document content
 */
export function generateW9Content(vendorName: string = 'TechCorp Solutions Inc.'): string {
  return `
    REQUEST FOR TAXPAYER IDENTIFICATION NUMBER AND CERTIFICATION (W-9)

    Name: ${vendorName}
    Business name: ${vendorName}
    Federal tax classification: LLC
    Tax Identification Number (TIN): 12-3456789

    Address: 100 Technology Drive, Suite 200
    City: San Francisco, State: CA, ZIP: 94105

    DUNS Number: 123456789
    Registration Number: REG-2024-0001

    Certification: Under penalties of perjury, I certify that the information
    provided on this form is correct.

    Signature: ___________________
    Date: January 10, 2025
  `;
}

/**
 * Generate insurance certificate content
 */
export function generateInsuranceCertContent(vendorName: string = 'TechCorp Solutions Inc.'): string {
  return `
    CERTIFICATE OF LIABILITY INSURANCE

    This certifies that ${vendorName} maintains the following insurance coverage:

    General Liability: $2,000,000 per occurrence
    Professional Liability: $5,000,000 aggregate
    Workers Compensation: Statutory Limits

    Policy Number: POL-2025-00123
    Effective Date: January 1, 2025
    Expiration Date: December 31, 2025

    Insurance Company: National Insurance Co.
    Agent: broker@nationalins.com | +1-555-111-2222

    Certificate Holder:
    Enterprise Corp
    200 Business Parkway
    New York, NY 10001
  `;
}

/**
 * Generate a memo document content
 */
export function generateMemoContent(): string {
  return `
    MEMORANDUM

    TO: All Department Heads
    FROM: Chief Operating Officer
    DATE: February 1, 2025
    RE: Q1 2025 Vendor Review Process

    This memo outlines the quarterly vendor review process for Q1 2025.
    All active vendors with contracts exceeding $50,000 must undergo
    performance evaluation by March 15, 2025.

    Key metrics to be evaluated:
    - Delivery timeliness
    - Quality of deliverables
    - Responsiveness to communications
    - Compliance with contract terms

    Please coordinate with the procurement team to schedule reviews.
  `;
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
  const defaultOverrides: MockSupabaseOverrides = {
    contractData: {
      id: generateTestUuid(),
      title: 'Test Contract',
      status: 'active',
      extracted_text: generateContractContent(),
      vendor: {
        id: generateTestUuid(),
        name: 'TechCorp Solutions',
        category: 'technology',
      },
      documents: [],
    },
    vendorData: {
      id: generateTestUuid(),
      name: 'TechCorp Solutions Inc.',
      description: 'Leading technology services provider',
      category: 'technology',
      vendor_id: 'V-001',
      insurance_cert: true,
      contracts: [{ count: 5 }],
      documents: [
        { document_type: 'w9', uploaded_at: '2025-01-01', expiration_date: null },
        { document_type: 'insurance_certificate', uploaded_at: '2025-01-01', expiration_date: '2025-12-31' },
      ],
    },
    documentData: {
      id: generateTestUuid(),
      extracted_text: 'Sample document text for testing purposes.',
      file_type: 'pdf',
      file_path: '/documents/test.pdf',
      file_size: 1024000,
      created_at: '2025-01-01T00:00:00Z',
      metadata: { pages: 5, author: 'Test Author' },
      status: 'processed',
    },
    enterpriseSettings: null,
    workflowData: null,
    error: null,
  };

  const data = { ...defaultOverrides, ...overrides };

  const createChainableQuery = (tableData: unknown) => {
    const state = {
      data: tableData,
      error: data.error,
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
      single: () =>
        Promise.resolve({
          data: Array.isArray(state.data) ? state.data[0] : state.data,
          error: state.error,
        }),
      maybeSingle: () =>
        Promise.resolve({
          data: Array.isArray(state.data) ? state.data[0] : state.data,
          error: state.error,
        }),
      insert: () =>
        Promise.resolve({
          data: state.data,
          error: state.error,
        }),
      update: () => chain,
      upsert: () => chain,
      delete: () => chain,
      then: (resolve: (value: { data: unknown; error: unknown }) => void) =>
        Promise.resolve({ data: state.data, error: state.error }).then(resolve),
    };

    return chain;
  };

  const mockClient = {
    from: (table: string) => {
      switch (table) {
        case 'contracts':
          return createChainableQuery(data.contractData);
        case 'vendors':
          return createChainableQuery(data.vendorData);
        case 'documents':
          return createChainableQuery(data.documentData);
        case 'enterprise_settings':
          return createChainableQuery(data.enterpriseSettings);
        case 'agent_tasks':
          return createChainableQuery([]);
        case 'agent_insights':
          return createChainableQuery([]);
        case 'contract_documents':
          return createChainableQuery([]);
        case 'vendor_documents':
          return createChainableQuery(data.vendorData?.documents || []);
        case 'audit_logs':
          return createChainableQuery([]);
        case 'user_roles':
          return createChainableQuery({ role: 'admin', enterprise_id: 'test-enterprise' });
        default:
          return createChainableQuery([]);
      }
    },
    rpc: (fnName: string, _params?: Record<string, unknown>) => {
      switch (fnName) {
        case 'extract_contract_metadata':
          return Promise.resolve({
            data: {
              title: 'Extracted Title',
              parties: [],
              dates: { effectiveDate: null, expirationDate: null, signedDate: null, otherDates: [] },
              amounts: [],
            },
            error: null,
          });
        case 'check_user_permission':
          return Promise.resolve({ data: true, error: null });
        default:
          return Promise.resolve({ data: null, error: null });
      }
    },
    storage: {
      from: () => ({
        download: () => Promise.resolve({ data: null, error: null }),
        upload: () => Promise.resolve({ data: { path: '' }, error: null }),
      }),
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  } as unknown as MockSupabaseClient;

  return mockClient;
}

// =============================================================================
// VALID INPUT TEST DATA
// =============================================================================

const testContractId = generateTestUuid();
const testVendorId = generateTestUuid();
const testDocumentId = generateTestUuid();
const testUserId = generateTestUuid();
const testTaskId = generateTestUuid();

export const VALID_SECRETARY_INPUTS = {
  contentOnly: {
    content: generateContractContent(),
  },
  textOnly: {
    text: 'This is a valid document text for analysis.',
  },
  extractedTextOnly: {
    extracted_text: 'Extracted text from OCR processing of a scanned document.',
  },
  documentIdOnly: {
    documentId: testDocumentId,
  },
  contentWithWorkflow: {
    content: generateContractContent(),
    useWorkflow: true,
    workflowType: 'document_processing' as const,
  },
  contractContent: {
    content: generateContractContent({
      partyA: 'Global Industries Inc.',
      partyB: 'CloudTech Solutions',
      totalValue: 750000,
      annualFee: 375000,
      includeRiskyClauses: true,
    }),
  },
  vendorDocument: {
    content: generateW9Content('Acme Corp'),
  },
  invoiceDocument: {
    content: generateInvoiceContent(),
  },
  ndaDocument: {
    content: generateNdaContent(),
  },
  purchaseOrderDocument: {
    content: generatePurchaseOrderContent(),
  },
  minimalContent: {
    content: 'Short text.',
  },
  multipleContentSources: {
    content: 'Primary content source.',
    text: 'Secondary text source.',
    extracted_text: 'Tertiary extracted text source.',
  },
};

export const VALID_SECRETARY_CONTEXT = {
  contractContext: {
    contractId: testContractId,
    userId: testUserId,
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: { name: 'test' },
    permissions: ['read', 'write'],
  },
  vendorContext: {
    vendorId: testVendorId,
    userId: testUserId,
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: { name: 'test' },
    permissions: ['read', 'write'],
  },
  documentContext: {
    userId: testUserId,
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: { name: 'test' },
    permissions: ['read', 'write'],
  },
  minimalContext: {
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: {},
    permissions: [],
  },
  fullContext: {
    contractId: testContractId,
    vendorId: testVendorId,
    userId: testUserId,
    taskId: testTaskId,
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: { name: 'test' },
    permissions: ['read', 'write', 'delete'],
  },
};

// =============================================================================
// INVALID INPUT TEST DATA
// =============================================================================

export const INVALID_SECRETARY_INPUTS = {
  emptyObject: {},
  nullInput: null,
  undefinedInput: undefined,
  emptyContent: {
    content: '',
  },
  tooShortContent: {
    content: 'ab',
  },
  noContentFields: {
    randomField: 'value',
    anotherField: 123,
  },
  invalidDocumentId: {
    documentId: 'not-a-valid-uuid',
  },
  invalidWorkflowType: {
    content: 'Valid content',
    useWorkflow: true,
    workflowType: 'invalid_type',
  },
  contentExceedingMax: {
    content: 'x'.repeat(5_000_001),
  },
  numberAsContent: {
    content: 12345 as unknown as string,
  },
  arrayAsContent: {
    content: ['not', 'a', 'string'] as unknown as string,
  },
};

export const INVALID_SECRETARY_CONTEXT = {
  invalidContractId: {
    contractId: 'not-a-uuid',
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: {},
    permissions: [],
  },
  invalidVendorId: {
    vendorId: 'not-a-uuid',
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: {},
    permissions: [],
  },
  numericContractId: {
    contractId: 12345 as unknown as string,
    enterpriseId: 'test-enterprise-001',
    sessionId: 'test-session-001',
    environment: {},
    permissions: [],
  },
};

// =============================================================================
// AMOUNT TEST DATA
// =============================================================================

export const AMOUNT_TEST_DATA = {
  validAmounts: [
    { value: 100000, currency: 'USD', formatted: '$100,000', context: 'Total contract value', type: 'total' as const },
    { value: 50000, currency: 'USD', formatted: '$50,000', context: 'Annual fee', type: 'annual' as const },
    { value: 5000, currency: 'USD', formatted: '$5,000', context: 'Monthly payment', type: 'monthly' as const },
    { value: 250, currency: 'EUR', formatted: '250 EUR', context: 'Service fee', type: 'fee' as const },
    { value: 10000, currency: 'GBP', formatted: '10,000 GBP', context: 'Deposit', type: 'deposit' as const },
  ],
  invalidAmounts: [
    { value: -100, currency: 'USD', formatted: '-$100', context: 'Negative amount' },
    { value: NaN, currency: 'USD', formatted: 'NaN', context: 'NaN amount' },
    { value: Infinity, currency: 'USD', formatted: 'Infinity', context: 'Infinite amount' },
    { value: 0, currency: 'USD', formatted: '$0', context: 'Zero amount' },
    { currency: 'USD', formatted: '$0', context: 'Missing value' },
    { value: 100, formatted: '$100', context: 'Missing currency is ok' },
    { value: 'not a number', currency: 'USD', formatted: 'bad', context: 'String value' },
  ],
  amountAtLimit: Array.from({ length: 101 }, (_, i) => ({
    value: (i + 1) * 100,
    currency: 'USD',
    formatted: `$${(i + 1) * 100}`,
    type: 'payment' as const,
  })),
};

// =============================================================================
// PARTY TEST DATA
// =============================================================================

export const PARTY_TEST_DATA = {
  validParties: [
    { name: 'ABC Corporation', role: 'Client', type: 'client' as const },
    { name: 'XYZ Services LLC', role: 'Vendor', type: 'vendor' as const },
    { name: 'John Smith', role: 'Contractor', type: 'contractor' as const },
    { name: 'Global Industries', type: 'primary' as const },
    { name: 'SubContractor Inc.', type: 'secondary' as const },
  ],
  invalidParties: [
    { name: '', role: 'Client' },
    { name: '   ', role: 'Vendor' },
    { role: 'Missing name' },
    { name: 123 as unknown as string, role: 'Number name' },
    { name: null as unknown as string, role: 'Null name' },
  ],
  duplicateParties: [
    { name: 'ABC Corporation', role: 'Client', type: 'client' as const },
    { name: 'abc corporation', role: 'Vendor', type: 'vendor' as const },
    { name: 'ABC Corporation', role: 'Party', type: 'party' as const },
    { name: 'Different Corp', role: 'Secondary', type: 'secondary' as const },
  ],
  longNameParty: {
    name: 'A'.repeat(600),
    role: 'Client',
    type: 'client' as const,
  },
  partiesAtLimit: Array.from({ length: 51 }, (_, i) => ({
    name: `Party ${i + 1}`,
    role: 'Party',
    type: 'party' as const,
  })),
};

// =============================================================================
// DATE TEST DATA
// =============================================================================

export const DATE_TEST_DATA = {
  validDates: {
    effectiveDate: '2025-01-01',
    expirationDate: '2025-12-31',
    signedDate: '2024-12-15',
    otherDates: ['2025-03-15', '2025-06-30'],
  },
  nullDates: {
    effectiveDate: null,
    expirationDate: null,
    signedDate: null,
    otherDates: [],
  },
  invalidDates: {
    effectiveDate: 'not-a-date',
    expirationDate: '2025/12/31',
    signedDate: '99-99-9999',
    otherDates: ['invalid'],
  },
  futureDates: {
    effectiveDate: '2030-01-01',
    expirationDate: '2035-12-31',
    signedDate: null,
    otherDates: [],
  },
};

// =============================================================================
// CLAUSE TEST DATA
// =============================================================================

export const CLAUSE_TEST_DATA = {
  standardClauses: [
    { type: 'payment', text: 'Payment shall be made within Net 30 days of invoice receipt.', section: 'Payment Terms' },
    { type: 'termination', text: 'Either party may terminate with 90 days written notice.', section: 'Termination' },
    { type: 'confidentiality', text: 'All proprietary information shall remain confidential.', section: 'Confidentiality' },
  ],
  riskyClauses: [
    { type: 'liability', text: 'The vendor accepts unlimited liability for all damages.', risk_reason: 'Unlimited liability is risky', section: 'Liability' },
    { type: 'termination', text: 'This contract shall auto-renew annually without notice.', risk_reason: 'Auto-renewal without notice', section: 'Renewal' },
    { type: 'general', text: 'All disputes resolved at sole discretion of the Client.', risk_reason: 'Sole discretion clause', section: 'Disputes' },
  ],
  validClauseAnalysis: {
    total: 6,
    risky: [
      { type: 'liability', text: 'Unlimited liability clause text', risk_reason: 'Unlimited liability' },
    ],
    riskyClausesCount: 1,
    standard: [
      { type: 'payment', text: 'Standard payment terms' },
      { type: 'termination', text: 'Standard termination clause' },
    ],
  },
  invalidClauseAnalysis: {
    total: 5,
    risky: [
      { type: 'liability', text: 'Risky clause' },
    ],
    riskyClausesCount: 3,
    standard: [],
  },
};

// =============================================================================
// ERROR SIMULATION DATA
// =============================================================================

export const ERROR_SCENARIOS = {
  databaseError: {
    error: new Error('Database connection failed: ECONNREFUSED'),
    category: 'database' as const,
    recoverable: true,
  },
  validationError: {
    error: new Error('Validation failed: Invalid contract ID format'),
    category: 'validation' as const,
    recoverable: false,
  },
  timeoutError: {
    error: new Error('Operation timed out after 30000ms'),
    category: 'timeout' as const,
    recoverable: true,
  },
  permissionError: {
    error: new Error('Permission denied: Insufficient access for document processing'),
    category: 'permission' as const,
    recoverable: false,
  },
  externalServiceError: {
    error: new Error('External API service unavailable'),
    category: 'external' as const,
    recoverable: true,
  },
  rateLimitError: {
    error: new Error('Rate limit exceeded: Too many requests (429)'),
    category: 'rate_limiting' as const,
    recoverable: true,
  },
  malformedDataError: {
    error: new Error('JSON parse error: Unexpected token at position 0'),
    category: 'malformed_data' as const,
    recoverable: false,
  },
  unknownError: {
    error: new Error('Something completely unexpected happened'),
    category: 'unknown' as const,
    recoverable: false,
  },
};

// =============================================================================
// EDGE CASE TEST DATA
// =============================================================================

export const EDGE_CASE_DATA = {
  emptyDocument: {
    content: '',
  },
  whitespaceOnlyDocument: {
    content: '   \n\t\r\n   ',
  },
  singleCharDocument: {
    content: 'x',
  },
  minimumLengthContent: {
    content: 'Exactly 10',
  },
  unicodeContent: {
    content: 'Contract between Caf\u00e9 du Monde and B\u00fccher GmbH. Value: \u00a5500,000. Term: 2025-01-01 to 2025-12-31.',
  },
  nullBytesContent: {
    content: 'Contract\x00between\x00parties\x00with\x00null\x00bytes',
  },
  mixedEncodingContent: {
    content: 'Normal text followed by \uFFFD\uFFFD\uFFFD replacement characters',
  },
  htmlContent: {
    content: '<p>This is an <b>HTML</b> document with <a href="http://example.com">links</a></p>',
  },
  veryLongDocument: {
    content: generateContractContent({ totalValue: 1000000 }).repeat(50),
  },
  documentWithOnlyNumbers: {
    content: '100000 250000 50000 75000 12500 99999',
  },
  documentWithOnlyDates: {
    content: '2025-01-01 2025-06-30 2025-12-31 2024-01-15 2026-03-01',
  },
  documentWithSpecialCharacters: {
    content: 'Contract #123-A: Value = $100,000.00 (USD) @ 5% interest; parties: A & B / C',
  },
  tabDelimitedContent: {
    content: 'Party A\tParty B\tValue\tDate\nABC Corp\tXYZ Inc\t$100,000\t2025-01-01',
  },
};

// =============================================================================
// DOCUMENT TYPE CLASSIFICATION DATA
// =============================================================================

export const DOCUMENT_CLASSIFICATION_DATA = {
  serviceAgreement: generateContractContent({ documentType: 'service_agreement' }),
  nda: generateNdaContent(),
  purchaseOrder: generatePurchaseOrderContent(),
  invoice: generateInvoiceContent(),
  w9Form: generateW9Content(),
  insuranceCert: generateInsuranceCertContent(),
  memo: generateMemoContent(),
  genericLetter: `
    Dear Mr. Johnson,

    We are writing to confirm our agreement regarding the software licensing terms
    discussed on January 5, 2025. The total annual license fee will be $45,000.

    Please find enclosed the formal agreement for your review and signature.

    Sincerely,
    Jane Smith
    VP of Sales
  `,
};

// =============================================================================
// CONFIG OVERRIDE TEST DATA
// =============================================================================

export const CONFIG_OVERRIDE_DATA = {
  validOverride: {
    highValueContractThreshold: 200000,
    criticalValueContractThreshold: 1000000,
    expirationWarningDays: 120,
    criticalExpirationDays: 45,
    urgentExpirationDays: 14,
    enableOcr: false,
    minCompletenessScore: 0.8,
  },
  invalidOverride: {
    highValueContractThreshold: -1000,
    minCompletenessScore: 2.0,
    maxDocumentLength: 'not a number',
  },
  partialOverride: {
    enableOcr: true,
    minOcrConfidence: 0.7,
  },
  inconsistentThresholds: {
    highValueContractThreshold: 500000,
    criticalValueContractThreshold: 100000,
    urgentExpirationDays: 90,
    criticalExpirationDays: 30,
    expirationWarningDays: 7,
  },
  emptyOverride: {},
};

// =============================================================================
// TYPES
// =============================================================================

export interface ContractContentOptions {
  partyA?: string;
  partyB?: string;
  effectiveDate?: string;
  expirationDate?: string;
  totalValue?: number;
  annualFee?: number;
  hasSignatures?: boolean;
  includeRiskyClauses?: boolean;
  includeConfidentiality?: boolean;
  documentType?: string;
}

export interface InvoiceContentOptions {
  invoiceNumber?: string;
  vendor?: string;
  client?: string;
  date?: string;
  dueDate?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
}

export interface MockSupabaseOverrides {
  contractData?: Record<string, unknown> | null;
  vendorData?: Record<string, unknown> | null;
  documentData?: Record<string, unknown> | null;
  enterpriseSettings?: Record<string, unknown> | null;
  workflowData?: Record<string, unknown> | null;
  error?: Error | null;
}

export type MockSupabaseClient = Record<string, unknown>;
