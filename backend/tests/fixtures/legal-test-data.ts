/**
 * Test fixtures for Legal Agent comprehensive tests
 *
 * Provides mock data generators, test inputs, and a mock Supabase client
 * for testing the Legal Agent's various analysis capabilities:
 * - Contract clause extraction and classification
 * - Risk assessment and scoring
 * - Compliance checking (GDPR, CCPA, HIPAA)
 * - Document type detection (NDA, MSA, SOW, license, employment)
 * - Obligation identification and deduplication
 * - Protection identification
 * - Red flag detection
 * - Approval workflow processing
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
 * Generate mock contract data for database-enriched analysis
 */
export function generateMockContract(options?: Partial<MockContract>): MockContract {
  const statuses = ['active', 'pending', 'expired', 'draft', 'under_review'];
  const types = ['nda', 'msa', 'sow', 'license', 'employment', 'lease', 'amendment'];

  const defaultContract: MockContract = {
    id: generateTestUuid(),
    enterprise_id: generateTestUuid(),
    title: `Contract ${Math.floor(Math.random() * 1000)}`,
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    value: Math.floor(Math.random() * 1000000) + 10000,
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString(),
    vendor_id: generateTestUuid(),
    vendor: {
      id: generateTestUuid(),
      name: `Vendor Corp ${Math.floor(Math.random() * 100)}`,
      performance_score: 0.5 + Math.random() * 0.5,
    },
    extracted_key_terms: {
      payment_terms: 'Net 30',
      renewal: 'annual',
      termination_notice: '30 days',
    },
    approvals: [],
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...defaultContract, ...options };
}

/**
 * Generate multiple mock contracts
 */
export function generateMockContracts(count: number, options?: Partial<MockContract>): MockContract[] {
  const types = ['nda', 'msa', 'sow', 'license', 'employment'];

  return Array.from({ length: count }, (_, i) => {
    const baseContract = generateMockContract({
      title: `Contract ${i + 1}`,
      type: types[i % types.length],
      ...options,
    });
    return baseContract;
  });
}

/**
 * Generate mock clause data
 */
export function generateMockClause(options?: Partial<MockClause>): MockClause {
  const clauseTypes = [
    'limitation_of_liability',
    'indemnification',
    'termination',
    'confidentiality',
    'warranty',
    'force_majeure',
    'governing_law',
    'dispute_resolution',
  ];
  const riskLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

  const defaultClause: MockClause = {
    type: clauseTypes[Math.floor(Math.random() * clauseTypes.length)],
    text: 'This is a sample clause text for testing purposes.',
    risk: riskLevels[Math.floor(Math.random() * riskLevels.length)],
    startIndex: 0,
    endIndex: 100,
    confidence: 0.7 + Math.random() * 0.3,
  };

  return { ...defaultClause, ...options };
}

/**
 * Generate mock clauses for a specific contract type
 */
export function generateMockClausesForType(contractType: string): MockClause[] {
  const clauseMap: Record<string, Array<{ type: string; risk: 'low' | 'medium' | 'high' }>> = {
    nda: [
      { type: 'confidentiality', risk: 'medium' },
      { type: 'termination', risk: 'low' },
      { type: 'limitation_of_liability', risk: 'medium' },
      { type: 'governing_law', risk: 'low' },
      { type: 'dispute_resolution', risk: 'low' },
    ],
    msa: [
      { type: 'confidentiality', risk: 'medium' },
      { type: 'indemnification', risk: 'high' },
      { type: 'limitation_of_liability', risk: 'high' },
      { type: 'termination', risk: 'medium' },
      { type: 'warranty', risk: 'medium' },
      { type: 'force_majeure', risk: 'low' },
      { type: 'governing_law', risk: 'low' },
      { type: 'dispute_resolution', risk: 'low' },
    ],
    sow: [
      { type: 'termination', risk: 'low' },
    ],
    license: [
      { type: 'warranty', risk: 'medium' },
      { type: 'limitation_of_liability', risk: 'high' },
      { type: 'confidentiality', risk: 'medium' },
      { type: 'termination', risk: 'medium' },
      { type: 'governing_law', risk: 'low' },
    ],
    employment: [
      { type: 'confidentiality', risk: 'medium' },
      { type: 'termination', risk: 'medium' },
      { type: 'governing_law', risk: 'low' },
    ],
  };

  const templates = clauseMap[contractType] || clauseMap.msa;

  return templates.map((template, i) => generateMockClause({
    type: template.type,
    risk: template.risk,
    startIndex: i * 200,
    endIndex: (i + 1) * 200,
    text: `Sample ${template.type} clause text for ${contractType}.`,
  }));
}

/**
 * Generate mock compliance data
 */
export function generateMockComplianceData(options?: Partial<MockComplianceData>): MockComplianceData {
  const defaultData: MockComplianceData = {
    regulations: [
      {
        regulation: 'GDPR',
        applicable: true,
        compliant: true,
        issues: [],
        recommendations: ['Ensure data processing agreements are in place'],
      },
      {
        regulation: 'CCPA',
        applicable: true,
        compliant: false,
        issues: ['Missing California consumer rights disclosure'],
        recommendations: ['Add CCPA-specific consumer rights section'],
      },
      {
        regulation: 'HIPAA',
        applicable: false,
        compliant: true,
        issues: [],
        recommendations: [],
      },
    ],
    dataPrivacy: {
      issues: [
        { issue: 'Broad data collection without purpose limitation', severity: 'medium' },
        { issue: 'Missing data retention policy', severity: 'high' },
      ],
      score: 0.6,
    },
    industryStandards: [
      { standard: 'SOC 2', required: true, compliant: false, gap: 'No audit report referenced' },
      { standard: 'ISO 27001', required: false, compliant: false, gap: 'Not mentioned in agreement' },
      { standard: 'PCI DSS', required: false, compliant: true, gap: '' },
    ],
  };

  return { ...defaultData, ...options };
}

/**
 * Generate mock risk assessment result
 */
export function generateMockRiskAssessment(options?: Partial<MockRiskAssessment>): MockRiskAssessment {
  const defaultAssessment: MockRiskAssessment = {
    overallRisk: 'medium',
    riskScore: 5,
    riskFactors: [
      {
        factor: 'Broad indemnification clause',
        severity: 'high',
        impact: 'Potential uncapped financial exposure',
        mitigation: 'Negotiate mutual indemnification with caps',
      },
      {
        factor: 'Auto-renewal without notice period',
        severity: 'medium',
        impact: 'Unintended contract continuation',
        mitigation: 'Add 30-day renewal notice requirement',
      },
      {
        factor: 'Unclear IP ownership',
        severity: 'medium',
        impact: 'Disputed ownership of deliverables',
        mitigation: 'Add explicit IP assignment clause',
      },
    ],
    recommendations: [
      'Negotiate liability cap at 2x annual contract value',
      'Add right to terminate for convenience with 30 days notice',
      'Clarify intellectual property ownership for all deliverables',
    ],
    confidenceScore: 0.82,
  };

  return { ...defaultAssessment, ...options };
}

/**
 * Generate mock approval workflow data
 */
export function generateMockApprovalData(options?: Partial<MockApprovalData>): MockApprovalData {
  const defaultData: MockApprovalData = {
    contractId: generateTestUuid(),
    userId: generateTestUuid(),
    action: 'approve',
    approvalType: 'legal_review',
    comments: 'Reviewed and approved with minor conditions',
    conditions: ['Add force majeure clause', 'Update payment terms to Net 45'],
    requiredApprovals: [
      { role: 'legal_counsel', status: 'approved', approvedBy: generateTestUuid() },
      { role: 'finance_director', status: 'pending', approvedBy: null },
    ],
  };

  return { ...defaultData, ...options };
}

/**
 * Generate mock legal analysis result
 */
export function generateMockLegalAnalysisResult(): MockLegalAnalysisResult {
  return {
    documentType: 'msa',
    clauses: generateMockClausesForType('msa'),
    risks: [
      { type: 'one_sided_indemnification', severity: 'high', description: 'One-sided indemnification favoring vendor' },
      { type: 'auto_renewal', severity: 'medium', description: 'Auto-renewal without adequate notice period' },
    ],
    obligations: [
      { party: 'customer', obligation: 'Pay monthly service fees within 30 days of invoice', deadline: 'monthly' },
      { party: 'vendor', obligation: 'Maintain SOC 2 Type II certification', deadline: 'annual' },
      { party: 'vendor', obligation: 'Provide quarterly performance reports', deadline: 'quarterly' },
    ],
    protections: {
      limitationOfLiability: true,
      capOnDamages: true,
      rightToTerminate: true,
      disputeResolution: true,
      warrantyDisclaimer: false,
      intellectualPropertyRights: true,
      confidentialityProtection: true,
      dataProtection: true,
    },
    missingClauses: [
      { type: 'force_majeure', importance: 'high', recommendation: 'Add force majeure clause to address unforeseeable events' },
    ],
    redFlags: [
      { flag: 'Broad indemnification', severity: 'high' },
    ],
    recommendations: [
      'Add force majeure clause',
      'Negotiate mutual indemnification',
      'Add data processing agreement as exhibit',
    ],
  };
}

// =============================================================================
// MOCK SUPABASE CLIENT
// =============================================================================

/**
 * Create a chainable mock Supabase client for legal agent testing
 */
export function createMockSupabaseClient(
  overrides?: Partial<MockSupabaseOverrides>,
): MockSupabaseClient {
  const defaultData = {
    contracts: generateMockContracts(10),
    vendors: Array.from({ length: 5 }, () => ({
      id: generateTestUuid(),
      name: `Vendor ${Math.floor(Math.random() * 100)}`,
      performance_score: 0.7 + Math.random() * 0.3,
    })),
    agents: [{ id: generateTestUuid(), type: 'legal' }],
    enterpriseSettings: { id: generateTestUuid(), name: 'Test Enterprise', legal_config: {} },
    complianceData: generateMockComplianceData(),
    riskAssessment: generateMockRiskAssessment(),
    approvalData: generateMockApprovalData(),
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
        case 'contracts':
          return createChainableQuery(data.contracts);
        case 'vendors':
          return createChainableQuery(data.vendors);
        case 'agents':
          return createChainableQuery(data.agents);
        case 'agent_tasks':
          return createChainableQuery([]);
        case 'enterprise_settings':
          return createChainableQuery(data.enterpriseSettings);
        case 'contract_approvals':
          return createChainableQuery(data.approvalData.requiredApprovals || []);
        case 'contract_clauses':
          return createChainableQuery(generateMockClausesForType('msa'));
        case 'legal_risks':
          return createChainableQuery(data.riskAssessment.riskFactors || []);
        case 'compliance_checks':
          return createChainableQuery(data.complianceData.regulations || []);
        case 'notifications':
          return createChainableQuery([]);
        default:
          return createChainableQuery([]);
      }
    },
    rpc: (fnName: string, _params?: Record<string, unknown>) => {
      switch (fnName) {
        case 'analyze_contract_legal_risks':
          return Promise.resolve({
            data: {
              overall_risk: data.riskAssessment.overallRisk,
              risk_factors: data.riskAssessment.riskFactors,
              recommendations: data.riskAssessment.recommendations,
            },
            error: null,
          });
        case 'route_contract_for_approval':
          return Promise.resolve({
            data: {
              required_approvals: data.approvalData.requiredApprovals,
            },
            error: null,
          });
        case 'run_compliance_checks':
          return Promise.resolve({
            data: {
              checks_performed: data.complianceData.regulations.length,
              issues_found: data.complianceData.regulations.filter(r => !r.compliant).length,
              summary: data.complianceData.regulations,
            },
            error: null,
          });
        case 'assess_enterprise_risk':
          return Promise.resolve({
            data: {
              risk_level: data.riskAssessment.overallRisk,
              risk_score: data.riskAssessment.riskScore,
            },
            error: null,
          });
        case 'process_contract_approval':
          return Promise.resolve({
            data: {
              approved: data.approvalData.action === 'approve',
              approval_id: generateTestUuid(),
            },
            error: null,
          });
        case 'get_vendor_compliance':
          return Promise.resolve({
            data: {
              compliant: true,
              issues: [],
              last_audit: new Date().toISOString().split('T')[0],
            },
            error: null,
          });
        default:
          return Promise.resolve({ data: null, error: null });
      }
    },
  } as unknown as MockSupabaseClient;

  return mockClient;
}

// =============================================================================
// TYPES
// =============================================================================

export interface MockContract {
  id: string;
  enterprise_id: string;
  title: string;
  type: string;
  status: string;
  value: number;
  start_date: string;
  end_date: string;
  vendor_id: string;
  vendor: {
    id: string;
    name: string;
    performance_score: number;
  };
  extracted_key_terms: Record<string, string>;
  approvals: MockApprovalEntry[];
  created_at: string;
  updated_at: string;
}

export interface MockApprovalEntry {
  role: string;
  status: 'approved' | 'pending' | 'rejected';
  approvedBy: string | null;
}

export interface MockClause {
  type: string;
  text: string;
  risk: 'low' | 'medium' | 'high';
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface MockComplianceData {
  regulations: Array<{
    regulation: string;
    applicable: boolean;
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }>;
  dataPrivacy: {
    issues: Array<{ issue: string; severity: string }>;
    score: number;
  };
  industryStandards: Array<{
    standard: string;
    required: boolean;
    compliant: boolean;
    gap: string;
  }>;
}

export interface MockRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    mitigation: string;
  }>;
  recommendations: string[];
  confidenceScore: number;
}

export interface MockApprovalData {
  contractId: string;
  userId: string;
  action: 'approve' | 'reject' | 'escalate';
  approvalType: string;
  comments: string;
  conditions: string[];
  requiredApprovals: MockApprovalEntry[];
}

export interface MockLegalAnalysisResult {
  documentType: string;
  clauses: MockClause[];
  risks: Array<{ type: string; severity: string; description: string }>;
  obligations: Array<{ party: string; obligation: string; deadline: string }>;
  protections: Record<string, boolean>;
  missingClauses: Array<{ type: string; importance: string; recommendation: string }>;
  redFlags: Array<{ flag: string; severity: string }>;
  recommendations: string[];
}

export interface MockSupabaseOverrides {
  contracts?: MockContract[];
  vendors?: Array<{ id: string; name: string; performance_score: number }>;
  agents?: Array<{ id: string; type: string }>;
  enterpriseSettings?: { id: string; name: string; legal_config: Record<string, unknown> } | null;
  complianceData?: MockComplianceData;
  riskAssessment?: MockRiskAssessment;
  approvalData?: MockApprovalData;
}

export type MockSupabaseClient = SupabaseClient;

// =============================================================================
// VALID INPUT TEST DATA
// =============================================================================

const testContractId = generateTestUuid();
const testUserId = generateTestUuid();
const testVendorId = generateTestUuid();
const testEnterpriseId = generateTestUuid();

export const VALID_LEGAL_INPUTS = {
  /** Standard contract analysis with content */
  contractAnalysis: {
    content: `MASTER SERVICE AGREEMENT
      This agreement includes limitation of liability, indemnification,
      termination rights, and confidentiality provisions.
      Governing law is the State of Delaware.
      Disputes shall be resolved through binding arbitration.`,
  },

  /** NDA-specific analysis */
  ndaAnalysis: {
    content: `NON-DISCLOSURE AGREEMENT
      Both parties agree to maintain the confidentiality of all
      proprietary information. This mutual NDA shall remain in
      effect for three (3) years from the Effective Date.`,
  },

  /** Compliance check with content */
  complianceCheck: {
    content: `This agreement involves processing of personal data of EU residents.
      The vendor agrees to comply with GDPR and all applicable data protection laws.
      California consumer rights are also addressed under CCPA provisions.`,
    checkType: 'compliance',
  },

  /** Contract approval action */
  approvalAction: {
    action: 'approve' as const,
    comments: 'Reviewed and approved - all terms are acceptable',
    conditions: ['Add force majeure clause'],
  },

  /** Rejection action */
  rejectionAction: {
    action: 'reject' as const,
    comments: 'Unacceptable liability terms - requires renegotiation',
  },

  /** Escalation action */
  escalationAction: {
    action: 'escalate' as const,
    comments: 'Complex terms require senior legal review',
  },

  /** Content using text field instead of content */
  textFieldAnalysis: {
    text: `SOFTWARE LICENSE AGREEMENT
      This license grants a non-exclusive, non-transferable right to use
      the software. Warranty is limited to 90 days.
      The software is provided "AS IS" after the warranty period.`,
  },

  /** Content with compliance flag */
  complianceAnalysis: {
    content: `This vendor agreement covers cloud hosting services.
      The vendor will process protected health information (PHI)
      and must comply with HIPAA requirements.`,
    complianceCheck: true,
  },

  /** Minimal valid content */
  minimalContent: {
    content: 'This is a valid contract agreement between parties for services.',
  },
};

export const VALID_LEGAL_CONTEXT = {
  /** Standard context with enterprise and session */
  standard: {
    enterpriseId: testEnterpriseId,
    sessionId: 'test-session-001',
    environment: {},
    permissions: [],
  },

  /** Context with contract ID for DB-enriched analysis */
  withContractId: {
    enterpriseId: testEnterpriseId,
    sessionId: 'test-session-002',
    environment: {},
    permissions: [],
    contractId: testContractId,
    userId: testUserId,
  },

  /** Context with vendor ID */
  withVendorId: {
    enterpriseId: testEnterpriseId,
    sessionId: 'test-session-003',
    environment: {},
    permissions: [],
    vendorId: testVendorId,
    userId: testUserId,
  },

  /** Context with both contract and vendor */
  withBothIds: {
    enterpriseId: testEnterpriseId,
    sessionId: 'test-session-004',
    environment: {},
    permissions: [],
    contractId: testContractId,
    vendorId: testVendorId,
    userId: testUserId,
  },

  /** Context for approval workflow */
  approvalContext: {
    enterpriseId: testEnterpriseId,
    sessionId: 'test-session-005',
    environment: {},
    permissions: ['legal_review', 'contract_approval'],
    contractId: testContractId,
    userId: testUserId,
  },
};

// =============================================================================
// INVALID INPUT TEST DATA
// =============================================================================

export const INVALID_LEGAL_INPUTS = {
  /** Content that is too short */
  tooShortContent: {
    content: 'short',
  },

  /** Non-string content type */
  nonStringContent: {
    content: 12345,
  },

  /** Empty content string */
  emptyContent: {
    content: '',
  },

  /** Null content */
  nullContent: {
    content: null,
  },

  /** Whitespace-only content */
  whitespaceContent: {
    content: '   \n\t   ',
  },

  /** Invalid action value */
  invalidAction: {
    action: 'unknown_action',
  },

  /** Invalid approval type */
  invalidApprovalType: {
    action: 'approve',
    approvalType: '', // Empty string
  },

  /** Comments exceeding maximum length */
  oversizedComments: {
    action: 'approve',
    comments: 'x'.repeat(5001),
  },

  /** Too many conditions */
  tooManyConditions: {
    action: 'approve',
    conditions: Array.from({ length: 21 }, (_, i) => `Condition ${i + 1}`),
  },

  /** Invalid check type */
  invalidCheckType: {
    content: 'Valid content for testing purposes.',
    checkType: '', // Empty string
  },

  /** Array content (wrong type) */
  arrayContent: {
    content: ['not', 'a', 'string'],
  },

  /** Object content (wrong type) */
  objectContent: {
    content: { text: 'wrapped in object' },
  },

  /** Content exceeding maximum size */
  oversizedContent: {
    content: 'x'.repeat(10 * 1024 * 1024 + 1), // > 10MB
  },

  /** No content, text, or action provided */
  missingAllFields: {},
};

export const INVALID_LEGAL_CONTEXT = {
  /** Invalid UUID for contract ID */
  invalidContractId: {
    contractId: 'not-a-valid-uuid',
    userId: testUserId,
  },

  /** Invalid UUID for user ID */
  invalidUserId: {
    contractId: testContractId,
    userId: 'not-a-valid-uuid',
  },

  /** Invalid UUID for vendor ID */
  invalidVendorId: {
    vendorId: 'not-a-valid-uuid',
  },

  /** Numeric ID instead of string UUID */
  numericContractId: {
    contractId: 12345,
    userId: testUserId,
  },

  /** Empty context */
  emptyContext: {},

  /** Null contract ID */
  nullContractId: {
    contractId: null,
    userId: testUserId,
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
    error: new Error('Validation failed: Invalid contract content format'),
    category: 'validation',
    isRetryable: false,
  },
  timeoutError: {
    error: new Error('Request timed out after 30000ms'),
    category: 'timeout',
    isRetryable: true,
  },
  rateLimitError: {
    error: new Error('Rate limit exceeded: Too many requests (429)'),
    category: 'rate_limiting',
    isRetryable: true,
  },
  externalApiError: {
    error: new Error('External API error: Failed to fetch compliance data'),
    category: 'external',
    isRetryable: true,
  },
  malformedDataError: {
    error: new Error('Malformed data: Contract content contains invalid encoding'),
    category: 'malformed_data',
    isRetryable: false,
  },
  permissionError: {
    error: new Error('Permission denied: User lacks legal_review permission'),
    category: 'authorization',
    isRetryable: false,
  },
};

// =============================================================================
// EDGE CASE TEST DATA
// =============================================================================

export const EDGE_CASE_DATA = {
  /** Content with mojibake/encoding issues */
  mojibakeContent: `This agreement is between Company \u00C3\u00A1 and Client \u00C3\u00A9
    with terms lasting for one (1) year. Both parties shall maintain confidentiality.`,

  /** Content with replacement characters */
  replacementCharContent: `Text with \uFFFD\uFFFD\uFFFD unknown characters in a
    legal agreement for services.`,

  /** Content with both content and text fields (conflict) */
  conflictingInputs: {
    content: 'This is content field with sufficient length for analysis.',
    text: 'This is text field with different content for analysis testing.',
  },

  /** Contract at exact minimum content length boundary */
  minLengthContent: '0123456789', // Exactly 10 chars

  /** Content with excessive whitespace between sections */
  excessiveWhitespace: `
    SECTION 1


    LIMITATION OF LIABILITY


    Clause text here.


    SECTION 2


    INDEMNIFICATION


    More clause text.
  `,

  /** Content with mixed case patterns */
  mixedCaseContent: `
    LIMITATION OF LIABILITY: The parties agree that
    Limitation Of Liability shall be mutual.
    limitation of liability is important.
  `,

  /** Content with special characters */
  specialCharContent: `
    CONTRACT #ABC-123 \u00A9 2024
    This Agreement ("Agreement") is entered into as of 1/1/2024.
    \u00A7 1. DEFINITIONS
    "Services" means: (a) consulting; (b) development; (c) support.
    \u00A7 2. TERMS
    Duration: 12-months (renewable)
    Value: $100,000.00 USD
    Limitation of liability applies.
  `,

  /** Content with repeated similar obligations (deduplication test) */
  duplicateObligations: `
    The vendor shall provide monthly reports.
    The vendor must provide monthly reports.
    The vendor will provide monthly reports.
    The vendor agrees to provide monthly reports.
  `,

  /** High-risk content with many red flags */
  highRiskContent: `
    UNLIMITED LIABILITY: No cap on damages whatsoever.
    ONE-SIDED INDEMNIFICATION: Client indemnifies vendor for everything.
    NO TERMINATION: Agreement cannot be terminated.
    PERPETUAL OBLIGATIONS: All duties continue forever.
    WAIVE JURY TRIAL: All jury rights are waived.
    NON-COMPETE: Broad non-compete for 5 years.
    LIQUIDATED DAMAGES: $1,000,000 payable on any breach.
    ASSIGNMENT WITHOUT CONSENT: Either party may freely assign.
  `,

  /** Low-risk content with comprehensive protections */
  lowRiskContent: `
    LIMITATION OF LIABILITY: Capped at contract value.
    MUTUAL INDEMNIFICATION: Both parties indemnify equally.
    TERMINATION: Either party may terminate with 30 days notice.
    CONFIDENTIALITY: 3 year term after termination.
    GOVERNING LAW: Laws of Delaware apply.
    DISPUTE RESOLUTION: Mediation first, then arbitration.
    FORCE MAJEURE: Neither party liable for force majeure events.
    WARRANTY: Services will be performed in a professional manner.
    DATA PROTECTION: Vendor complies with GDPR and CCPA.
  `,

  /** Content triggering GDPR compliance check */
  gdprTriggerContent: `
    This agreement involves processing of personal data of EU residents.
    Customer information including names, email addresses, and browsing
    history will be collected and stored.
  `,

  /** Content triggering HIPAA compliance check */
  hipaaTriggerContent: `
    The vendor will process protected health information (PHI) and
    patient medical records on behalf of the healthcare provider.
    Electronic health records will be maintained per BAA requirements.
  `,

  /** Content triggering PCI DSS check */
  pciDssTriggerContent: `
    This payment processing agreement covers credit card transactions
    and financial data handling. Cardholder data will be processed
    and stored in accordance with applicable standards.
  `,

  /** Contract with no recognizable clauses */
  noClausesContent: `
    This is a simple agreement between two parties.
    No specific terms or conditions apply.
    The parties agree to cooperate in good faith.
  `,

  /** Very long document with repeated sections */
  veryLongContent: `MASTER SERVICE AGREEMENT\n${Array(500).fill(`
Section X: Standard Terms
This is a standard section that contains typical contract language.
The vendor shall provide services in accordance with industry standards.
Limitation of liability applies to both parties under this agreement.
Confidentiality obligations apply to all proprietary information.
`).join('')}`,

  /** Multi-party consortium contract */
  multiPartyContent: `
    CONSORTIUM AGREEMENT
    This Agreement is entered into by and among:
    Party A: Alpha Corporation
    Party B: Beta Industries LLC
    Party C: Gamma Holdings Inc.
    Party D: Delta Services Ltd.
    Joint and several liability applies to all parties.
    Each party may withdraw with 90 days notice.
  `,

  /** Contract with malformed content */
  malformedContent: `
    {{{BROKEN JSON}}}
    This is not properly formatted content
    <xml>also broken</xml>
    null undefined NaN
    [object Object]
  `,

  /** Unicode/international content */
  unicodeContent: `
    VERTRAG (Vereinbarung)
    Limitation of liability applies to both parties.
    Either party may terminate with 30 days notice.
    Alle vertraulichen Informationen sind zu sch\u00FCtzen.
  `,

  /** Approval data without contract context */
  approvalWithoutContract: {
    action: 'approve' as const,
    comments: 'Approved without contract reference',
  },

  /** Conditions with non-approve action (should warn) */
  conditionsWithReject: {
    action: 'reject' as const,
    conditions: ['Condition that should be ignored'],
    comments: 'Rejected with irrelevant conditions',
  },
};

// =============================================================================
// CONTRACT CONTENT SAMPLES BY TYPE
// =============================================================================

export const CONTRACT_SAMPLES = {
  /** Standard NDA with common clauses */
  nda: `NON-DISCLOSURE AGREEMENT
    This Non-Disclosure Agreement is entered into as of January 1, 2024.
    1. DEFINITION OF CONFIDENTIAL INFORMATION
    "Confidential Information" means any non-public information disclosed.
    2. OBLIGATIONS
    The Receiving Party shall hold Confidential Information in strict confidence.
    3. TERM
    This Agreement shall remain in effect for three (3) years.
    4. LIMITATION OF LIABILITY
    Maximum liability is capped at $100,000.
    5. GOVERNING LAW
    This Agreement shall be governed by the laws of California.
    6. DISPUTE RESOLUTION
    Any disputes shall be resolved through binding arbitration.`,

  /** Standard MSA with comprehensive clauses */
  msa: `MASTER SERVICE AGREEMENT
    ARTICLE 1: DEFINITIONS
    "Services" means the software development and consulting services.
    ARTICLE 2: FEES AND PAYMENT
    Payment Terms: Net 30 from invoice date.
    ARTICLE 3: INTELLECTUAL PROPERTY
    All intellectual property created shall be owned by Customer.
    ARTICLE 4: CONFIDENTIALITY
    Both parties shall maintain confidentiality of proprietary information.
    ARTICLE 5: INDEMNIFICATION
    Each party shall indemnify the other from claims arising from breach.
    ARTICLE 6: LIMITATION OF LIABILITY
    NEITHER PARTY SHALL BE LIABLE FOR INDIRECT DAMAGES.
    Maximum liability shall not exceed the total fees paid in prior 12 months.
    ARTICLE 7: TERMINATION
    Either party may terminate with 30 days written notice.
    ARTICLE 8: GOVERNING LAW
    This Agreement shall be governed by the laws of Delaware.
    ARTICLE 9: DISPUTE RESOLUTION
    Disputes shall be resolved through mediation, then binding arbitration.
    ARTICLE 10: DATA PROTECTION
    Provider shall comply with GDPR, CCPA, and applicable data protection laws.
    ARTICLE 11: FORCE MAJEURE
    Neither party liable for failure due to acts of God or force majeure.`,

  /** Statement of Work referencing parent MSA */
  sow: `STATEMENT OF WORK #001
    This SOW is executed pursuant to the Master Service Agreement.
    PROJECT: Enterprise Software Development
    1. SCOPE OF WORK
    Provider shall develop a custom web application.
    2. DELIVERABLES AND MILESTONES
    Milestone 1: Requirements and Design (Week 1-2)
    Milestone 2: Development Phase 1 (Week 3-6)
    3. FEES
    Total Project Fee: $150,000
    Payment Schedule: 25% per milestone`,

  /** Software License Agreement */
  license: `SOFTWARE LICENSE AGREEMENT
    1. GRANT OF LICENSE
    A non-exclusive, non-transferable license to use the Software.
    License Scope: Up to 500 concurrent users, worldwide.
    2. LICENSE FEE
    Annual License Fee: $250,000
    3. INTELLECTUAL PROPERTY
    Licensor retains all intellectual property rights.
    4. WARRANTY
    Software will perform substantially in accordance with documentation for 90 days.
    WARRANTY DISCLAIMER: SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY.
    5. LIMITATION OF LIABILITY
    IN NO EVENT SHALL LICENSOR BE LIABLE FOR INDIRECT DAMAGES.
    TOTAL LIABILITY SHALL NOT EXCEED LICENSE FEES PAID IN PRECEDING 12 MONTHS.
    6. CONFIDENTIALITY
    Both parties shall maintain confidentiality.
    7. TERMINATION
    Either party may terminate for material breach with 30 days notice.
    8. GOVERNING LAW
    Governed by the laws of the State of New York.`,

  /** Employment Agreement */
  employment: `EMPLOYMENT AGREEMENT
    1. POSITION AND DUTIES
    Employer employs Employee as Senior Software Engineer.
    2. COMPENSATION
    Base Salary: $180,000 per annum
    3. TERM
    Employment shall be at-will.
    4. CONFIDENTIALITY
    Employee shall maintain strict confidentiality of proprietary information.
    Confidentiality obligations survive termination indefinitely.
    5. INTELLECTUAL PROPERTY
    All work product belongs to Employer.
    6. NON-COMPETE
    Employee agrees not to compete for 12 months after termination.
    7. NON-SOLICITATION
    Employee shall not solicit employees or customers for 12 months.
    8. GOVERNING LAW
    Governed by the laws of the State of Texas.`,
};

// =============================================================================
// CONFIGURATION TEST DATA
// =============================================================================

export const CONFIG_TEST_DATA = {
  /** Valid configuration override */
  validOverride: {
    highRiskScoreThreshold: 8,
    criticalRiskScoreThreshold: 12,
    maxClauses: 200,
  },

  /** Invalid configuration - score out of range */
  invalidScoreOverride: {
    highRiskScoreThreshold: 100,
  },

  /** Inconsistent threshold configuration */
  inconsistentThresholds: {
    highRiskScoreThreshold: 8,
    criticalRiskScoreThreshold: 5, // Should be >= highRiskScoreThreshold
  },

  /** Inconsistent content length configuration */
  inconsistentContentLengths: {
    minContentLength: 5000,
    maxContentLength: 2000, // Should be > minContentLength
  },

  /** Risk score test values */
  riskScoreTestValues: {
    belowHighRisk: 5,
    atHighRisk: 6,
    aboveHighRisk: 7,
    belowCriticalRisk: 9,
    atCriticalRisk: 10,
  },
};

// =============================================================================
// HELPER EXPORTS
// =============================================================================

export {
  testContractId,
  testUserId,
  testVendorId,
  testEnterpriseId,
};
