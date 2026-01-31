/**
 * Test fixtures for Analytics Agent comprehensive tests
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
 * Generate mock contract data
 */
export function generateMockContracts(count: number): MockContract[] {
  const statuses = ['active', 'pending', 'expired', 'draft'];
  const vendors = ['TechCorp', 'CloudServices', 'ConsultPro', 'DataInc', 'ServiceHub'];

  return Array.from({ length: count }, (_, i) => ({
    id: generateTestUuid(),
    title: `Contract ${i + 1}`,
    value: Math.floor(Math.random() * 500000) + 10000,
    status: statuses[i % statuses.length],
    start_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + (i * 30 - 60) * 24 * 60 * 60 * 1000).toISOString(),
    is_auto_renew: i % 3 === 0,
    vendor: {
      id: generateTestUuid(),
      name: vendors[i % vendors.length],
      performance_score: 0.5 + Math.random() * 0.5,
    },
  }));
}

/**
 * Generate mock vendor data
 */
export function generateMockVendors(count: number): MockVendor[] {
  const categories = ['technology', 'consulting', 'facilities', 'marketing', 'legal'];

  return Array.from({ length: count }, (_, i) => ({
    id: generateTestUuid(),
    name: `Vendor ${i + 1}`,
    is_active: i % 5 !== 0,
    performance_score: 0.4 + Math.random() * 0.6,
    category: categories[i % categories.length],
    contracts: [{ count: Math.floor(Math.random() * 10) + 1 }],
    total_spend: [{ sum: Math.floor(Math.random() * 1000000) + 50000 }],
  }));
}

/**
 * Generate mock budget allocation data
 */
export function generateMockAllocations(count: number): MockAllocation[] {
  const types = ['technology', 'operations', 'marketing', 'hr', 'legal'];

  return Array.from({ length: count }, (_, i) => ({
    id: generateTestUuid(),
    allocated_amount: Math.floor(Math.random() * 100000) + 10000,
    created_at: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
    vendor: `Vendor ${i % 10}`,
    category: types[i % types.length],
    budget: {
      allocated: 500000,
      budget_type: types[i % types.length],
    },
  }));
}

/**
 * Generate mock enterprise analytics data
 */
export function generateMockEnterpriseAnalytics(): MockEnterpriseAnalytics {
  return {
    current_snapshot: {
      total_contract_value: 5000000,
      active_contracts: 120,
      total_vendors: 45,
      compliance_rate: 85,
      ai_utilization: {
        ai_tasks_processed: 1500,
        avg_confidence_score: 0.87,
      },
    },
    trends: {
      contract_growth: 15,
      vendor_performance_trend: 0.05,
    },
    time_series: {
      contracts: [
        { month: '2025-01', contracts_created: 10, contract_value: 400000 },
        { month: '2025-02', contracts_created: 12, contract_value: 500000 },
        { month: '2025-03', contracts_created: 15, contract_value: 600000 },
      ],
    },
  };
}

/**
 * Generate mock risk assessment data
 */
export function generateMockRiskAssessment(): MockRiskAssessment {
  return {
    risk_level: 'medium',
    overall_risk_score: 0.45,
    risk_factors: ['vendor_concentration', 'contract_expiration'],
    mitigation_actions: ['Diversify vendor base', 'Accelerate renewal negotiations'],
  };
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
    contracts: generateMockContracts(10),
    vendors: generateMockVendors(10),
    allocations: generateMockAllocations(10),
    agents: [{ id: generateTestUuid(), type: 'analytics' }],
    enterpriseAnalytics: generateMockEnterpriseAnalytics(),
    riskAssessment: generateMockRiskAssessment(),
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
        case 'contract_budget_allocations':
          return createChainableQuery(data.allocations);
        case 'agents':
          return createChainableQuery(data.agents);
        case 'agent_tasks':
          return createChainableQuery([]);
        case 'enterprise_settings':
          return createChainableQuery(null);
        default:
          return createChainableQuery([]);
      }
    },
    rpc: (fnName: string, _params?: Record<string, unknown>) => {
      switch (fnName) {
        case 'get_enterprise_analytics':
          return Promise.resolve({ data: data.enterpriseAnalytics, error: null });
        case 'assess_enterprise_risk':
          return Promise.resolve({ data: data.riskAssessment, error: null });
        case 'calculate_vendor_analytics':
          return Promise.resolve({ data: { performance: 0.8, spend: 500000 }, error: null });
        case 'calculate_vendor_relationship_score':
          return Promise.resolve({ data: { overall_score: 0.75, risk_level: 'low' }, error: null });
        case 'forecast_budget_usage':
          return Promise.resolve({
            data: {
              forecast: { months_until_depletion: 6 },
              recommendations: ['Monitor spending'],
            },
            error: null,
          });
        case 'optimize_budget_allocation':
          return Promise.resolve({
            data: {
              current_allocations: [],
              recommendations: [],
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
  title: string;
  value: number;
  status: string;
  start_date: string;
  end_date: string;
  is_auto_renew: boolean;
  vendor: {
    id: string;
    name: string;
    performance_score: number;
  };
}

export interface MockVendor {
  id: string;
  name: string;
  is_active: boolean;
  performance_score: number;
  category: string;
  contracts: { count: number }[];
  total_spend: { sum: number }[];
}

export interface MockAllocation {
  id: string;
  allocated_amount: number;
  created_at: string;
  vendor: string;
  category: string;
  budget: {
    allocated: number;
    budget_type: string;
  };
}

export interface MockEnterpriseAnalytics {
  current_snapshot: {
    total_contract_value: number;
    active_contracts: number;
    total_vendors: number;
    compliance_rate: number;
    ai_utilization: {
      ai_tasks_processed: number;
      avg_confidence_score: number;
    };
  };
  trends: {
    contract_growth: number;
    vendor_performance_trend: number;
  };
  time_series: {
    contracts: Array<{
      month: string;
      contracts_created: number;
      contract_value: number;
    }>;
  };
}

export interface MockRiskAssessment {
  risk_level: string;
  overall_risk_score: number;
  risk_factors: string[];
  mitigation_actions: string[];
}

export interface MockSupabaseOverrides {
  contracts?: MockContract[];
  vendors?: MockVendor[];
  allocations?: MockAllocation[];
  agents?: { id: string; type: string }[];
  enterpriseAnalytics?: MockEnterpriseAnalytics;
  riskAssessment?: MockRiskAssessment;
}

export type MockSupabaseClient = SupabaseClient;

// =============================================================================
// VALID INPUT TEST DATA
// =============================================================================

export const VALID_ANALYTICS_INPUTS = {
  contractAnalysis: {
    analysisType: 'contracts' as const,
    period: 'month' as const,
    lookback: 12,
  },
  vendorAnalysis: {
    analysisType: 'vendors' as const,
    vendorId: generateTestUuid(),
  },
  budgetAnalysis: {
    analysisType: 'budgets' as const,
    budgetId: generateTestUuid(),
    monthsAhead: 3,
  },
  spendingAnalysis: {
    analysisType: 'spending' as const,
  },
  comprehensiveAnalysis: {
    analysisType: 'comprehensive' as const,
    period: 'quarter' as const,
    lookback: 4,
  },
};

export const VALID_CONTEXT = {
  userId: generateTestUuid(),
  contractId: generateTestUuid(),
  vendorId: generateTestUuid(),
};

// =============================================================================
// INVALID INPUT TEST DATA
// =============================================================================

export const INVALID_ANALYTICS_INPUTS = {
  invalidAnalysisType: {
    analysisType: 'invalid_type',
  },
  invalidLookback: {
    analysisType: 'contracts',
    lookback: -1,
  },
  invalidDateRange: {
    analysisType: 'vendors',
    startDate: '2025-12-01',
    endDate: '2025-01-01', // End before start
  },
  invalidMonthsAhead: {
    analysisType: 'budgets',
    monthsAhead: 100, // Exceeds max
  },
  invalidUuid: {
    analysisType: 'vendors',
    vendorId: 'not-a-uuid',
  },
};

export const INVALID_CONTEXT = {
  invalidUserId: {
    userId: 'not-a-uuid',
  },
  invalidContractId: {
    contractId: 12345, // Should be string
  },
};
