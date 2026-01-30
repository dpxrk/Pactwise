/**
 * Financial Agent Test Fixtures
 *
 * Provides test data for Financial Agent unit and integration tests.
 */

// =============================================================================
// MOCK CONTRACT DATA
// =============================================================================

/**
 * Mock contract with high value
 */
export const mockHighValueContract = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  vendor_id: '550e8400-e29b-41d4-a716-446655440002',
  value: 250000,
  payment_terms: 'Net 30',
  category: 'software',
  status: 'active',
  content: `
    SOFTWARE LICENSE AGREEMENT

    Total Contract Value: $250,000

    Payment Terms:
    - License Fee: $150,000 (one-time)
    - Annual Maintenance: $50,000 (recurring)
    - Implementation: $50,000 (one-time)

    Payment Schedule:
    - 50% upon signing ($125,000)
    - 25% upon completion of Phase 1 ($62,500)
    - 25% upon final acceptance ($62,500)

    Payment shall be due Net 30 from invoice date.
    Late payments incur a 1.5% monthly fee.

    Contract includes auto-renewal clause.
    Early termination requires 90-day notice and $25,000 fee.
  `,
  created_at: '2024-01-15T00:00:00Z',
};

/**
 * Mock contract with critical value
 */
export const mockCriticalValueContract = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  vendor_id: '550e8400-e29b-41d4-a716-446655440004',
  value: 750000,
  payment_terms: 'Milestone',
  category: 'consulting',
  status: 'draft',
  content: `
    PROFESSIONAL SERVICES AGREEMENT

    Estimated Total: $750,000

    Payment Structure:
    - Phase 1 (Discovery): $100,000
    - Phase 2 (Development): $350,000
    - Phase 3 (Deployment): $200,000
    - Phase 4 (Support): $100,000

    ROI Projection:
    - Expected savings: $1,500,000 annually
    - Payback period: 6 months

    Payment due upon milestone completion and approval.
  `,
  created_at: '2024-02-01T00:00:00Z',
};

/**
 * Mock contract with upfront payment
 */
export const mockUpfrontPaymentContract = {
  id: '550e8400-e29b-41d4-a716-446655440005',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  vendor_id: '550e8400-e29b-41d4-a716-446655440006',
  value: 75000,
  payment_terms: 'Upfront',
  category: 'hardware',
  status: 'active',
  content: `
    HARDWARE PURCHASE AGREEMENT

    Total Price: $75,000 USD

    Payment Terms:
    Full payment required upfront before delivery.

    Includes:
    - Server hardware: $50,000
    - Installation services: $15,000
    - 1-year warranty: $10,000
  `,
  created_at: '2024-01-20T00:00:00Z',
};

/**
 * Mock contract with negative ROI signals
 */
export const mockNegativeROIContract = {
  id: '550e8400-e29b-41d4-a716-446655440007',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  vendor_id: '550e8400-e29b-41d4-a716-446655440008',
  value: 200000,
  payment_terms: 'Net 60',
  category: 'marketing',
  status: 'draft',
  content: `
    MARKETING SERVICES AGREEMENT

    Contract Value: $200,000

    Scope of Work:
    - Brand refresh campaign
    - Digital marketing support

    Note: No guaranteed ROI or revenue increase.
    Costs are fixed regardless of campaign performance.
  `,
  created_at: '2024-03-01T00:00:00Z',
};

/**
 * Mock low-value contract
 */
export const mockLowValueContract = {
  id: '550e8400-e29b-41d4-a716-446655440009',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  vendor_id: '550e8400-e29b-41d4-a716-446655440010',
  value: 5000,
  payment_terms: 'Net 30',
  category: 'supplies',
  status: 'active',
  content: `
    SUPPLIES ORDER

    Order Total: $5,000

    Items:
    - Office supplies: $3,000
    - Shipping: $200
    - Handling: $100
    - Rush fee: $1,700

    Payment: Net 30
  `,
  created_at: '2024-02-15T00:00:00Z',
};

// =============================================================================
// MOCK VENDOR DATA
// =============================================================================

/**
 * Mock vendor with high concentration
 */
export const mockHighConcentrationVendor = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Major Vendor Corp',
  category: 'software',
  created_at: '2023-01-01T00:00:00Z',
};

/**
 * Mock vendor spend metrics
 */
export const mockVendorSpendMetrics = {
  total: 500000,
  average: 100000,
  history: [
    { month: '2024-01', amount: 40000 },
    { month: '2024-02', amount: 45000 },
    { month: '2024-03', amount: 50000 },
    { month: '2024-04', amount: 55000 },
    { month: '2024-05', amount: 60000 },
    { month: '2024-06', amount: 65000 },
  ],
  activeContracts: 3,
  contractCount: 5,
};

/**
 * Mock payment performance data
 */
export const mockPaymentPerformance = {
  totalPayments: 20,
  latePayments: 3,
  latePaymentRate: 0.15,
  averageDaysLate: 7,
};

/**
 * Mock vendor payments
 */
export const mockVendorPayments = [
  { due_date: '2024-01-15', paid_date: '2024-01-14', amount: 10000 },
  { due_date: '2024-02-15', paid_date: '2024-02-20', amount: 10000 },
  { due_date: '2024-03-15', paid_date: '2024-03-25', amount: 10000 },
  { due_date: '2024-04-15', paid_date: '2024-04-15', amount: 10000 },
  { due_date: '2024-05-15', paid_date: '2024-05-14', amount: 10000 },
];

// =============================================================================
// MOCK BUDGET DATA
// =============================================================================

/**
 * Mock budget with high utilization
 */
export const mockHighUtilizationBudget = {
  id: '550e8400-e29b-41d4-a716-446655440020',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  category: 'software',
  amount: 500000,
  fiscal_year: 2024,
  utilization: [
    { total_spent: 400000, total_committed: 50000 },
  ],
};

/**
 * Mock budget with projected overrun
 */
export const mockOverrunBudget = {
  id: '550e8400-e29b-41d4-a716-446655440021',
  enterprise_id: '550e8400-e29b-41d4-a716-446655440000',
  category: 'consulting',
  amount: 300000,
  fiscal_year: 2024,
  utilization: [
    { total_spent: 200000, total_committed: 50000 },
  ],
};

/**
 * Mock budget variance data
 */
export const mockBudgetVariances = [
  {
    category: 'software',
    budgeted_amount: 100000,
    actual_amount: 130000,
    variance_amount: 30000,
    variance_percentage: 30,
  },
  {
    category: 'hardware',
    budgeted_amount: 80000,
    actual_amount: 60000,
    variance_amount: -20000,
    variance_percentage: -25,
  },
  {
    category: 'consulting',
    budgeted_amount: 150000,
    actual_amount: 155000,
    variance_amount: 5000,
    variance_percentage: 3.3,
  },
];

// =============================================================================
// MOCK FINANCIAL DATA INPUTS
// =============================================================================

/**
 * Mock general financial data for analysis
 */
export const mockGeneralFinancialData = {
  content: `
    Q4 Financial Summary

    Total Expenditure: $1,250,000
    Budget Allocated: $1,500,000
    Remaining: $250,000

    Major expenses:
    - Software licenses: $300,000
    - Cloud services: $200,000
    - Hardware refresh: $450,000
    - Professional services: $300,000

    Payment terms used:
    - Net 30: 60% of contracts
    - Net 60: 30% of contracts
    - Upfront: 10% of contracts
  `,
};

/**
 * Mock data with multiple value fields
 */
export const mockMultiValueData = {
  value: 100000,
  contractValue: 150000,
  totalValue: 200000,
  amount: 50000,
  payment_terms: 'Net 30',
};

/**
 * Mock data with encoding issues
 */
export const mockEncodingIssuesData = {
  content: 'Contract Value: $50,000\n\nTerms: Ã¢â‚¬Å"Net 30Ã¢â‚¬ days\nÃÂ Ã‚Â¡Special CharactersÃÂ¿',
};

/**
 * Mock empty data
 */
export const mockEmptyData = {};

/**
 * Mock data with only text field
 */
export const mockTextOnlyData = {
  text: 'Simple contract worth $25,000 due on receipt.',
};

// =============================================================================
// VALIDATION TEST DATA
// =============================================================================

/**
 * Valid financial input for validation tests
 */
export const validFinancialInput = {
  content: 'Contract for software services worth $100,000',
  value: 100000,
  currency: 'USD',
  payment_terms: 'Net 30',
  category: 'software',
};

/**
 * Invalid financial input for validation tests
 */
export const invalidFinancialInput = {
  value: -5000, // Negative value
  currency: 'INVALID', // Invalid currency code
};

/**
 * Valid agent context
 */
export const validAgentContext = {
  contractId: '550e8400-e29b-41d4-a716-446655440001',
  userId: '550e8400-e29b-41d4-a716-446655440100',
};

/**
 * Invalid agent context
 */
export const invalidAgentContext = {
  contractId: 'not-a-uuid',
  userId: 'also-not-valid',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a deeply chainable mock that returns itself for any method call
 */
function createChainableMock(finalResult: unknown = { data: null, error: null }) {
  const mock: Record<string, unknown> = {};
  const handler = {
    get: (_target: unknown, prop: string) => {
      if (prop === 'then') return undefined; // Don't make it thenable by default
      if (['single', 'maybeSingle'].includes(prop)) {
        return vi.fn().mockResolvedValue(finalResult);
      }
      if (prop === 'limit') {
        return vi.fn().mockReturnValue({
          then: vi.fn().mockImplementation((cb: (arg: unknown) => unknown) => Promise.resolve(cb(finalResult))),
        });
      }
      // Return a new proxy for continued chaining
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy(mock, handler);
}

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const chainable = createChainableMock();

  const mock = {
    from: vi.fn().mockReturnValue(chainable),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };

  return mock;
}

/**
 * Import vi from vitest for mock functions
 */
import { vi } from 'vitest';

/**
 * Create contract fixture with custom overrides
 */
export function createContractFixture(overrides: Partial<typeof mockHighValueContract> = {}) {
  return {
    ...mockHighValueContract,
    ...overrides,
  };
}

/**
 * Create budget fixture with custom overrides
 */
export function createBudgetFixture(overrides: Partial<typeof mockHighUtilizationBudget> = {}) {
  return {
    ...mockHighUtilizationBudget,
    ...overrides,
  };
}

/**
 * Create vendor fixture with custom overrides
 */
export function createVendorFixture(overrides: Partial<typeof mockHighConcentrationVendor> = {}) {
  return {
    ...mockHighConcentrationVendor,
    ...overrides,
  };
}
