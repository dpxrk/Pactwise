/**
 * Test fixtures for Vendor Agent comprehensive tests
 *
 * Provides mock data generators, test inputs, and a mock Supabase client
 * for testing the Vendor Agent's various analysis capabilities:
 * - Specific vendor analysis
 * - Portfolio analysis
 * - New vendor evaluation/onboarding
 * - General vendor assessment
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
 * Generate mock vendor data
 */
export function generateMockVendor(options?: Partial<MockVendor>): MockVendor {
  const categories = ['technology', 'consulting', 'facilities', 'marketing', 'legal', 'hr', 'finance'];
  const months = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

  const defaultVendor: MockVendor = {
    id: generateTestUuid(),
    name: `Vendor ${Math.floor(Math.random() * 1000)}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    contractCount: Math.floor(Math.random() * 20) + 1,
    totalSpend: Math.floor(Math.random() * 1000000) + 50000,
    activeContracts: Math.floor(Math.random() * 10) + 1,
    performanceHistory: months.map((month) => ({
      month,
      score: 0.6 + Math.random() * 0.4,
      issues: Math.floor(Math.random() * 5),
    })),
    deliveryMetrics: {
      onTimeRate: 0.7 + Math.random() * 0.3,
      qualityScore: 0.7 + Math.random() * 0.3,
      responsiveness: 0.6 + Math.random() * 0.4,
    },
    compliance: {
      insurance: Math.random() > 0.2,
      certifications: ['ISO 9001', 'SOC 2'].filter(() => Math.random() > 0.3),
      lastAudit: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    issues: Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
      date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: ['delivery', 'quality', 'communication', 'billing'][Math.floor(Math.random() * 4)],
      severity: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
    })),
  };

  return { ...defaultVendor, ...options };
}

/**
 * Generate multiple mock vendors
 */
export function generateMockVendors(count: number, options?: Partial<MockVendor>): MockVendor[] {
  const categories = ['technology', 'consulting', 'facilities', 'marketing', 'legal'];

  return Array.from({ length: count }, (_, i) => {
    const baseVendor = generateMockVendor({
      name: `Vendor ${i + 1}`,
      category: categories[i % categories.length],
      ...options,
    });
    return baseVendor;
  });
}

/**
 * Generate mock portfolio data
 */
export function generateMockPortfolio(vendorCount: number = 10): MockPortfolio {
  const categories = ['technology', 'consulting', 'facilities', 'marketing', 'legal'];
  const vendors: MockPortfolioVendor[] = [];
  let totalSpend = 0;

  for (let i = 0; i < vendorCount; i++) {
    const spend = Math.floor(Math.random() * 500000) + 20000;
    totalSpend += spend;
    vendors.push({
      id: generateTestUuid(),
      name: `Vendor ${i + 1}`,
      category: categories[i % categories.length],
      spend,
      performance: 0.5 + Math.random() * 0.5,
    });
  }

  const categorySpend: Record<string, { count: number; spend: number }> = {};
  vendors.forEach((v) => {
    if (!categorySpend[v.category]) {
      categorySpend[v.category] = { count: 0, spend: 0 };
    }
    categorySpend[v.category].count++;
    categorySpend[v.category].spend += v.spend;
  });

  const categoriesArray: MockVendorCategory[] = Object.entries(categorySpend).map(([name, data]) => ({
    name,
    count: data.count,
    spend: data.spend,
  }));

  return {
    vendors,
    totalSpend,
    categories: categoriesArray,
  };
}

/**
 * Generate mock new vendor evaluation data
 */
export function generateMockNewVendorData(options?: Partial<MockNewVendorData>): MockNewVendorData {
  const referenceRatings = [4.5, 4.2, 3.8, 4.0, 4.7];
  const concerns = ['Response time concerns', 'Minor quality issues', 'Limited scalability'];

  const defaultData: MockNewVendorData = {
    documentation: {
      businessLicense: true,
      insurance: true,
      taxId: true,
      bankDetails: true,
      certificates: ['ISO 9001', 'SOC 2 Type II'],
      missing: [],
    },
    financial: {
      revenue: 5000000 + Math.random() * 10000000,
      profitMargin: 0.1 + Math.random() * 0.2,
      debtRatio: 0.2 + Math.random() * 0.4,
      creditScore: 650 + Math.floor(Math.random() * 200),
    },
    references: referenceRatings.map((rating, i) => ({
      rating,
      concern: Math.random() > 0.7 ? concerns[i % concerns.length] : undefined,
      companyName: `Reference Company ${i + 1}`,
      verified: Math.random() > 0.2,
    })),
    requiredCapabilities: ['Cloud hosting', 'API integration', '24/7 support', 'Security compliance'],
    vendorCapabilities: ['Cloud hosting', 'API integration', '24/7 support', 'Mobile development'],
    pricing: {
      total: 50000 + Math.random() * 100000,
      breakdown: {
        basePrice: 40000,
        setupFee: 5000,
        monthlyFee: 2000,
      },
      negotiable: true,
      volumeDiscounts: true,
    },
    marketBenchmark: {
      average: 75000,
      range: { min: 50000, max: 100000 },
    },
    vendorSize: 'medium',
    projectSize: 'large',
    vendorLocation: { country: 'United States', city: 'San Francisco' },
    companyLocation: { country: 'United States', city: 'New York' },
  };

  return { ...defaultData, ...options };
}

/**
 * Generate mock vendor analysis result
 */
export function generateMockVendorAnalysis(): MockVendorAnalysis {
  return {
    profile: {
      name: 'TechCorp Solutions',
      category: 'technology',
      engagementLength: '3 years',
      spendLevel: 'high',
      contractComplexity: 'moderate',
      strategicImportance: 'critical',
    },
    performance: {
      overallScore: 0.82,
      trend: 'improving',
      trendRate: 0.05,
      deliveryScore: 0.85,
      qualityScore: 0.80,
      responsivenessScore: 0.78,
      issueFrequency: 'low',
      components: {
        delivery: 0.85,
        quality: 0.80,
        responsiveness: 0.78,
        issues: 0.90,
      },
    },
    relationshipScore: {
      score: 0.75,
      factors: {
        performance: 0.82,
        longevity: 0.80,
        spend: 0.70,
        issues: 0.85,
        compliance: 0.90,
      },
      strength: 'strong',
      recommendations: [
        'Consider expanding scope of engagement',
        'Explore strategic partnership opportunities',
      ],
    },
    risks: [
      {
        type: 'dependency',
        severity: 'medium',
        description: 'High dependency on single vendor for critical services',
        impact: 'Service disruption risk if vendor faces issues',
        mitigation: 'Develop backup vendor relationship',
      },
    ],
    opportunities: [
      {
        type: 'volume_discount',
        description: 'Potential for volume-based pricing reduction',
        potentialSaving: 15000,
        effort: 'low',
        timeline: '30 days',
      },
    ],
    recommendations: [
      'Maintain strong relationship',
      'Consider contract renewal with extended terms',
      'Explore additional service offerings',
    ],
    complianceStatus: {
      compliant: true,
      issues: [],
      lastChecked: new Date().toISOString().split('T')[0],
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  };
}

/**
 * Generate mock portfolio analysis result
 */
export function generateMockPortfolioAnalysis(): MockPortfolioAnalysis {
  return {
    summary: {
      totalVendors: 45,
      totalSpend: 5000000,
      avgSpendPerVendor: 111111,
      topCategory: 'technology',
      avgPerformance: 0.78,
    },
    categoryAnalysis: [
      {
        name: 'technology',
        vendorCount: 15,
        totalSpend: 2000000,
        avgPerformance: 0.82,
        riskLevel: 'medium',
        riskDescription: 'Moderate concentration in technology vendors',
        concentration: 0.40,
      },
      {
        name: 'consulting',
        vendorCount: 10,
        totalSpend: 1500000,
        avgPerformance: 0.75,
        riskLevel: 'low',
        riskDescription: 'Well-diversified consulting vendor base',
        concentration: 0.30,
      },
      {
        name: 'facilities',
        vendorCount: 8,
        totalSpend: 800000,
        avgPerformance: 0.80,
        riskLevel: 'low',
        riskDescription: 'Healthy facilities vendor distribution',
        concentration: 0.16,
      },
    ],
    performanceDistribution: {
      excellent: [{ id: generateTestUuid(), name: 'Top Vendor 1', category: 'technology', spend: 500000, performance: 0.95 }],
      good: [{ id: generateTestUuid(), name: 'Good Vendor 1', category: 'consulting', spend: 300000, performance: 0.82 }],
      average: [{ id: generateTestUuid(), name: 'Average Vendor 1', category: 'facilities', spend: 150000, performance: 0.70 }],
      poorPerformers: [{ id: generateTestUuid(), name: 'Poor Vendor 1', category: 'marketing', spend: 50000, performance: 0.55 }],
      summary: {
        excellentRate: 0.15,
        goodRate: 0.45,
        averageRate: 0.30,
        poorRate: 0.10,
      },
    },
    spendConcentration: {
      topVendor: 'TechCorp Solutions',
      topVendorSpend: 800000,
      topVendorShare: 0.16,
      top5Share: 0.45,
      herfindahlIndex: 0.08,
      concentrationLevel: 'low',
    },
    riskExposure: {
      components: {
        concentration: 'low',
        performance: 'low',
        diversity: 'medium',
      },
      overall: 'low',
      description: 'Portfolio is well-diversified with healthy vendor performance',
    },
    optimizationOpportunities: [
      {
        type: 'consolidation',
        category: 'consulting',
        description: 'Consolidate consulting vendors to reduce administrative overhead',
        potentialSaving: 50000,
        affectedSpend: 1500000,
        complexity: 'medium',
      },
      {
        type: 'performance_improvement',
        description: 'Work with underperforming vendors to improve quality metrics',
        potentialBenefit: 'Improved service quality and reduced issue resolution time',
        complexity: 'low',
      },
    ],
  };
}

/**
 * Generate mock new vendor evaluation result
 */
export function generateMockNewVendorEvaluation(): MockNewVendorEvaluation {
  return {
    basicChecks: {
      passed: true,
      missing: [],
      provided: ['Business License', 'Insurance', 'Tax ID', 'Bank Details'],
      completeness: 1.0,
    },
    financialStability: {
      riskLevel: 'low',
      description: 'Vendor demonstrates strong financial health with stable revenue and manageable debt',
      metrics: {
        revenue: 8500000,
        profitMargin: 0.18,
        debtRatio: 0.25,
        creditScore: 780,
      },
    },
    references: {
      averageRating: 4.3,
      count: 5,
      concerns: ['Minor response time concerns noted by one reference'],
      breakdown: {
        excellent: 2,
        good: 2,
        average: 1,
        poor: 0,
      },
    },
    capabilities: {
      matchRate: 0.85,
      matched: ['Cloud hosting', 'API integration', '24/7 support'],
      missing: ['Security compliance'],
      additionalCapabilities: ['Mobile development', 'Data analytics'],
    },
    pricing: {
      competitiveness: 'competitive',
      variance: -0.05,
      breakdown: {
        basePrice: 40000,
        setupFee: 5000,
        monthlyFee: 2000,
      },
      negotiable: true,
      volumeDiscounts: true,
    },
    risks: [
      {
        type: 'capability_gap',
        severity: 'medium',
        description: 'Missing required security compliance certification',
        mitigation: 'Request vendor to obtain certification within 90 days as contract condition',
      },
    ],
    score: 0.82,
    recommendation: 'Approve with conditions: Require security compliance certification within 90 days',
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
    vendors: generateMockVendors(10),
    contracts: generateMockContracts(15),
    agents: [{ id: generateTestUuid(), type: 'vendor' }],
    enterpriseSettings: { id: generateTestUuid(), name: 'Test Enterprise' },
    vendorAnalysis: generateMockVendorAnalysis(),
    portfolioAnalysis: generateMockPortfolioAnalysis(),
    newVendorEvaluation: generateMockNewVendorEvaluation(),
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
        case 'vendors':
          return createChainableQuery(data.vendors);
        case 'contracts':
          return createChainableQuery(data.contracts);
        case 'agents':
          return createChainableQuery(data.agents);
        case 'agent_tasks':
          return createChainableQuery([]);
        case 'enterprise_settings':
          return createChainableQuery(data.enterpriseSettings);
        case 'vendor_performance':
          return createChainableQuery(data.vendors.map(v => ({
            vendor_id: v.id,
            performance_score: 0.7 + Math.random() * 0.3,
            recorded_at: new Date().toISOString(),
          })));
        case 'vendor_contracts':
          return createChainableQuery(data.contracts);
        case 'vendor_compliance':
          return createChainableQuery(data.vendors.map(v => ({
            vendor_id: v.id,
            compliant: true,
            last_audit: new Date().toISOString().split('T')[0],
          })));
        default:
          return createChainableQuery([]);
      }
    },
    rpc: (fnName: string, _params?: Record<string, unknown>) => {
      switch (fnName) {
        case 'get_vendor_analytics':
          return Promise.resolve({ data: data.vendorAnalysis, error: null });
        case 'get_vendor_portfolio':
          return Promise.resolve({ data: generateMockPortfolio(15), error: null });
        case 'calculate_vendor_performance':
          return Promise.resolve({
            data: {
              overall_score: 0.82,
              delivery_score: 0.85,
              quality_score: 0.80,
              responsiveness_score: 0.78,
            },
            error: null,
          });
        case 'calculate_vendor_relationship_score':
          return Promise.resolve({
            data: {
              score: 0.75,
              factors: { performance: 0.82, longevity: 0.80, spend: 0.70, issues: 0.85, compliance: 0.90 },
              strength: 'strong',
            },
            error: null,
          });
        case 'assess_vendor_risk':
          return Promise.resolve({
            data: {
              risks: [{ type: 'dependency', severity: 'medium', description: 'High dependency' }],
              overall_risk: 'medium',
            },
            error: null,
          });
        case 'evaluate_new_vendor':
          return Promise.resolve({ data: data.newVendorEvaluation, error: null });
        case 'analyze_vendor_portfolio':
          return Promise.resolve({ data: data.portfolioAnalysis, error: null });
        case 'get_vendor_spend_history':
          return Promise.resolve({
            data: Array.from({ length: 12 }, (_, i) => ({
              month: `2025-${String(i + 1).padStart(2, '0')}`,
              spend: 20000 + Math.random() * 30000,
            })),
            error: null,
          });
        default:
          return Promise.resolve({ data: null, error: null });
      }
    },
  } as unknown as MockSupabaseClient;

  return mockClient;
}

/**
 * Helper function to generate mock contracts for vendor testing
 */
function generateMockContracts(count: number): MockContract[] {
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
    vendor_id: generateTestUuid(),
    vendor: {
      id: generateTestUuid(),
      name: vendors[i % vendors.length],
      performance_score: 0.5 + Math.random() * 0.5,
    },
  }));
}

// =============================================================================
// TYPES
// =============================================================================

export interface MockVendor {
  id: string;
  name: string;
  category: string;
  contractCount: number;
  totalSpend: number;
  activeContracts: number;
  performanceHistory: MockPerformanceHistoryItem[];
  deliveryMetrics: MockDeliveryMetrics;
  compliance: MockCompliance;
  issues: MockIssue[];
}

export interface MockPerformanceHistoryItem {
  month: string;
  score: number;
  issues: number;
}

export interface MockDeliveryMetrics {
  onTimeRate: number;
  qualityScore: number;
  responsiveness: number;
}

export interface MockCompliance {
  insurance: boolean;
  certifications: string[];
  lastAudit: string;
}

export interface MockIssue {
  date: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MockPortfolioVendor {
  id: string;
  name: string;
  category: string;
  spend: number;
  performance: number;
}

export interface MockVendorCategory {
  name: string;
  count: number;
  spend: number;
}

export interface MockPortfolio {
  vendors: MockPortfolioVendor[];
  totalSpend: number;
  categories: MockVendorCategory[];
}

export interface MockNewVendorData {
  documentation: {
    businessLicense: boolean;
    insurance: boolean;
    taxId: boolean;
    bankDetails: boolean;
    certificates?: string[];
    missing?: string[];
  };
  financial: {
    revenue: number;
    profitMargin: number;
    debtRatio: number;
    creditScore: number;
  };
  references: Array<{
    rating: number;
    concern?: string;
    companyName?: string;
    verified?: boolean;
  }>;
  requiredCapabilities: string[];
  vendorCapabilities: string[];
  pricing: {
    total: number;
    breakdown: {
      basePrice?: number;
      setupFee?: number;
      monthlyFee?: number;
    };
    negotiable: boolean;
    volumeDiscounts: boolean;
  };
  marketBenchmark: {
    average: number;
    range?: { min: number; max: number };
  };
  vendorSize: string;
  projectSize: string;
  vendorLocation: { country: string; city?: string };
  companyLocation: { country: string; city?: string };
}

export interface MockVendorAnalysis {
  profile: {
    name: string;
    category: string;
    engagementLength: string;
    spendLevel: string;
    contractComplexity: string;
    strategicImportance: string;
  };
  performance: {
    overallScore: number;
    trend: 'improving' | 'declining' | 'stable';
    trendRate: number;
    deliveryScore: number;
    qualityScore: number;
    responsivenessScore: number;
    issueFrequency: string;
    components: {
      delivery: number;
      quality: number;
      responsiveness: number;
      issues: number;
    };
  };
  relationshipScore: {
    score: number;
    factors: {
      performance: number;
      longevity: number;
      spend: number;
      issues: number;
      compliance: number;
    };
    strength: 'strong' | 'moderate' | 'weak';
    recommendations: string[];
  };
  risks: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    mitigation: string;
  }>;
  opportunities: Array<{
    type: string;
    description: string;
    potentialSaving?: number;
    potentialBenefit?: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }>;
  recommendations: string[];
  complianceStatus: {
    compliant: boolean;
    issues: string[];
    lastChecked: string;
    nextReviewDate: string;
  };
}

export interface MockPortfolioAnalysis {
  summary: {
    totalVendors: number;
    totalSpend: number;
    avgSpendPerVendor: number;
    topCategory: string;
    avgPerformance: number;
  };
  categoryAnalysis: Array<{
    name: string;
    vendorCount: number;
    totalSpend: number;
    avgPerformance: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskDescription: string;
    concentration: number;
  }>;
  performanceDistribution: {
    excellent: MockPortfolioVendor[];
    good: MockPortfolioVendor[];
    average: MockPortfolioVendor[];
    poorPerformers: MockPortfolioVendor[];
    summary: {
      excellentRate: number;
      goodRate: number;
      averageRate: number;
      poorRate: number;
    };
  };
  spendConcentration: {
    topVendor: string;
    topVendorSpend: number;
    topVendorShare: number;
    top5Share: number;
    herfindahlIndex: number;
    concentrationLevel: 'low' | 'medium' | 'high';
  };
  riskExposure: {
    components: {
      concentration: 'low' | 'medium' | 'high';
      performance: 'low' | 'medium' | 'high';
      diversity: 'low' | 'medium' | 'high';
    };
    overall: 'low' | 'medium' | 'high';
    description: string;
  };
  optimizationOpportunities: Array<{
    type: string;
    category?: string;
    description: string;
    potentialSaving?: number;
    potentialBenefit?: string;
    affectedSpend?: number;
    complexity: 'low' | 'medium' | 'high';
  }>;
}

export interface MockNewVendorEvaluation {
  basicChecks: {
    passed: boolean;
    missing: string[];
    provided: string[];
    completeness: number;
  };
  financialStability: {
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
    metrics: {
      revenue: number;
      profitMargin: number;
      debtRatio: number;
      creditScore: number;
    };
  };
  references: {
    averageRating: number;
    count: number;
    concerns: string[];
    breakdown?: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
    };
  };
  capabilities: {
    matchRate: number;
    matched: string[];
    missing: string[];
    additionalCapabilities: string[];
  };
  pricing: {
    competitiveness: 'competitive' | 'above_market' | 'below_market';
    variance: number;
    breakdown: {
      basePrice?: number;
      setupFee?: number;
      monthlyFee?: number;
    };
    negotiable: boolean;
    volumeDiscounts: boolean;
  };
  risks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }>;
  score: number;
  recommendation: string;
}

export interface MockContract {
  id: string;
  title: string;
  value: number;
  status: string;
  start_date: string;
  end_date: string;
  is_auto_renew: boolean;
  vendor_id: string;
  vendor: {
    id: string;
    name: string;
    performance_score: number;
  };
}

export interface MockSupabaseOverrides {
  vendors?: MockVendor[];
  contracts?: MockContract[];
  agents?: { id: string; type: string }[];
  enterpriseSettings?: { id: string; name: string } | null;
  vendorAnalysis?: MockVendorAnalysis;
  portfolioAnalysis?: MockPortfolioAnalysis;
  newVendorEvaluation?: MockNewVendorEvaluation;
}

export type MockSupabaseClient = SupabaseClient;

// =============================================================================
// VALID INPUT TEST DATA
// =============================================================================

const testVendorId = generateTestUuid();
const testUserId = generateTestUuid();

export const VALID_VENDOR_INPUTS = {
  specificVendorAnalysis: {
    vendorId: testVendorId,
    analysisType: 'specific' as const,
  },
  portfolioAnalysis: {
    analysisType: 'portfolio' as const,
  },
  newVendorEvaluation: {
    analysisType: 'onboarding' as const,
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
      { rating: 4.5, companyName: 'Reference Corp', verified: true },
      { rating: 4.2, companyName: 'Partner Inc', verified: true },
    ],
    requiredCapabilities: ['Cloud hosting', 'API integration'],
    vendorCapabilities: ['Cloud hosting', 'API integration', 'Mobile development'],
    pricing: {
      total: 75000,
      breakdown: { basePrice: 60000, setupFee: 10000, monthlyFee: 2500 },
      negotiable: true,
      volumeDiscounts: true,
    },
    marketBenchmark: { average: 80000 },
    vendorSize: 'medium',
    projectSize: 'large',
    vendorLocation: { country: 'United States' },
    companyLocation: { country: 'United States' },
  },
  generalAnalysis: {
    name: 'Test Vendor',
    category: 'technology',
    description: 'A technology services vendor',
    services: ['Cloud hosting', 'Development'],
    email: 'contact@testvendor.com',
    phone: '+1-555-123-4567',
  },
};

export const VALID_VENDOR_CONTEXT = {
  specificAnalysis: {
    vendorId: testVendorId,
    userId: testUserId,
    analysisType: 'specific' as const,
  },
  portfolioAnalysis: {
    userId: testUserId,
    analysisType: 'portfolio' as const,
  },
  onboardingAnalysis: {
    userId: testUserId,
    analysisType: 'onboarding' as const,
  },
  generalAnalysis: {
    userId: testUserId,
    analysisType: 'general' as const,
  },
};

// =============================================================================
// INVALID INPUT TEST DATA
// =============================================================================

export const INVALID_VENDOR_INPUTS = {
  invalidAnalysisType: {
    analysisType: 'invalid_analysis_type',
  },
  invalidUuid: {
    vendorId: 'not-a-valid-uuid',
    analysisType: 'specific',
  },
  emptyInput: {},
  invalidCategory: {
    name: 'Test Vendor',
    category: 'invalid_category_that_does_not_exist',
  },
  invalidPricing: {
    analysisType: 'onboarding',
    pricing: {
      total: -1000, // Negative price
      negotiable: true,
    },
  },
  invalidFinancialData: {
    analysisType: 'onboarding',
    financial: {
      revenue: -500000, // Negative revenue
      profitMargin: 2.5, // Invalid margin > 1
      debtRatio: -0.5, // Negative ratio
      creditScore: 1000, // Credit score too high
    },
  },
  invalidReferences: {
    analysisType: 'onboarding',
    references: [
      { rating: 6.0 }, // Rating > 5
      { rating: -1.0 }, // Negative rating
    ],
  },
  missingRequiredFields: {
    analysisType: 'onboarding',
    // Missing documentation, financial, references, etc.
  },
  invalidVendorSize: {
    analysisType: 'onboarding',
    vendorSize: 'gigantic', // Invalid size
  },
  invalidProjectSize: {
    analysisType: 'onboarding',
    projectSize: 'microscopic', // Invalid size
  },
  invalidDocumentation: {
    analysisType: 'onboarding',
    documentation: {
      businessLicense: 'yes', // Should be boolean
      insurance: 123, // Should be boolean
    },
  },
};

export const INVALID_VENDOR_CONTEXT = {
  invalidUserId: {
    userId: 'not-a-valid-uuid',
    analysisType: 'specific' as const,
  },
  invalidVendorId: {
    userId: testUserId,
    vendorId: 12345, // Should be string
    analysisType: 'specific' as const,
  },
  missingUserId: {
    analysisType: 'specific' as const,
    vendorId: testVendorId,
  },
  invalidAnalysisType: {
    userId: testUserId,
    analysisType: 'unknown' as const,
  },
  emptyContext: {},
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
    error: new Error('Validation failed: Invalid vendor ID format'),
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
    error: new Error('External API error: Failed to fetch vendor data'),
    category: 'external',
    isRetryable: true,
  },
  calculationError: {
    error: new Error('Calculation error: Division by zero in performance calculation'),
    category: 'calculation',
    isRetryable: false,
  },
};

// =============================================================================
// EDGE CASE TEST DATA
// =============================================================================

export const EDGE_CASE_DATA = {
  emptyPortfolio: {
    vendors: [],
    totalSpend: 0,
    categories: [],
  },
  singleVendorPortfolio: generateMockPortfolio(1),
  largePortfolio: generateMockPortfolio(100),
  vendorWithNoHistory: generateMockVendor({
    performanceHistory: [],
    issues: [],
    contractCount: 0,
    totalSpend: 0,
    activeContracts: 0,
  }),
  vendorWithPoorPerformance: generateMockVendor({
    performanceHistory: [
      { month: '2025-12', score: 0.3, issues: 10 },
      { month: '2025-11', score: 0.35, issues: 8 },
      { month: '2025-10', score: 0.4, issues: 7 },
    ],
    deliveryMetrics: {
      onTimeRate: 0.4,
      qualityScore: 0.35,
      responsiveness: 0.45,
    },
    issues: Array.from({ length: 20 }, (_, i) => ({
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: 'quality',
      severity: 'high' as const,
    })),
  }),
  vendorWithExcellentPerformance: generateMockVendor({
    performanceHistory: [
      { month: '2025-12', score: 0.98, issues: 0 },
      { month: '2025-11', score: 0.97, issues: 0 },
      { month: '2025-10', score: 0.96, issues: 0 },
    ],
    deliveryMetrics: {
      onTimeRate: 0.99,
      qualityScore: 0.98,
      responsiveness: 0.97,
    },
    issues: [],
    compliance: {
      insurance: true,
      certifications: ['ISO 9001', 'SOC 2 Type II', 'ISO 27001', 'HIPAA'],
      lastAudit: new Date().toISOString().split('T')[0],
    },
  }),
  newVendorWithMissingDocs: generateMockNewVendorData({
    documentation: {
      businessLicense: true,
      insurance: false,
      taxId: true,
      bankDetails: false,
      missing: ['Insurance Certificate', 'Bank Details'],
    },
  }),
  newVendorWithPoorFinancials: generateMockNewVendorData({
    financial: {
      revenue: 100000,
      profitMargin: -0.1,
      debtRatio: 0.9,
      creditScore: 520,
    },
  }),
  newVendorWithNoReferences: generateMockNewVendorData({
    references: [],
  }),
  newVendorWithCapabilityMismatch: generateMockNewVendorData({
    requiredCapabilities: ['Cloud hosting', 'API integration', '24/7 support', 'Security compliance', 'HIPAA'],
    vendorCapabilities: ['Cloud hosting', 'Mobile development'],
  }),
};
