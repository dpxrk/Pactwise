
export interface AnalyticsAgentProcessData {
  analysisType?: 'contracts' | 'vendors' | 'budgets' | 'spending' | 'comprehensive';
  contractId?: string;
  vendorId?: string;
  budgetId?: string;
  period?: string;
  lookback?: number;
  startDate?: string;
  endDate?: string;
  monthsAhead?: number;
  optimizationTarget?: string;
}

export interface ContractMetricsData {
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

export interface ProcessedContractMetrics {
  total: number;
  active: number;
  totalValue: number;
  avgValue: number;
  expiringSoon: ContractMetricsData[];
  autoRenewCount: number;
  byVendor: {
    vendorId: string;
    vendorName: string;
    contracts: ContractMetricsData[];
    totalValue: number;
  }[];
  byStatus: Record<string, number>;
  monthlyTrend: { new: number; expired: number }[];
}

export interface ContractSummary {
  totalActive: number;
  totalValue: number;
  avgValue: number;
  utilizationRate: number;
  avgMonthlyValue: number;
  renewalRate: number;
  expiringCount: number;
  topCategory: string;
}

export interface ContractTrend {
  name: string;
  type: string;
  direction: 'positive' | 'negative';
  rate: number;
  significance: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string | null;
}

export interface ContractOpportunity {
  type: string;
  title: string;
  description: string;
  potential: number;
  effort: string;
  action: string;
  category?: string;
}

export interface ContractRisk {
  type: string;
  title: string;
  description: string;
  probability: number;
  impact: 'low' | 'medium' | 'high';
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  contracts?: ContractMetricsData[];
}

export interface ContractPrediction {
  nextPeriod: {
    expectedContracts: number;
    expectedValue: number;
  };
  trend: 'growth' | 'decline';
  trendRate: number;
  confidence: number;
  message?: string;
}

export interface VendorMetricsData {
  id: string;
  name: string;
  is_active: boolean;
  performance_score: number;
  contracts: { count: number }[];
  total_spend: { sum: number }[];
  category: string;
}

export interface ProcessedVendorMetrics {
  total: number;
  active: number;
  byCategory: {
    category: string;
    count: number;
    vendors: string[];
    totalSpend: number;
  }[];
  byPerformance: {
    id: string;
    name: string;
    score: number;
    contractCount: number;
    totalSpend: number;
  }[];
  concentrationMetrics: VendorConcentrationMetrics;
}

export interface VendorPerformance {
  id: string;
  name: string;
  score: number;
  contractCount: number;
  totalSpend: number;
  rating: string;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface VendorConcentrationMetrics {
  totalSpend: number;
  top5VendorsSpend: number;
  concentrationRatio: number;
  herfindahlIndex: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string | null;
}

export interface VendorRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  vendors?: string[];
  impact?: number;
  hhi?: number;
}

export interface VendorOptimization {
  type: string;
  title: string;
  description: string;
  savingsPotential: number;
  action: string;
  category: string;
}

export interface VendorBenchmark {
  vendorCount: {
    current: number;
    benchmark: number;
    status: 'above' | 'at';
  };
  avgSpendPerVendor: {
    current: number;
    benchmark: number;
    status: 'normal';
  };
}

export interface SpendingAllocation {
  allocated_amount: number;
  created_at: string;
  enterprise_id: string;
  budget?: { budget_type: string };
  contract?: { contract_id: string; title: string }; // Refined type
}

export interface SpendingData {
  monthlySpend: { month: string; total: number; count: number; allocations: SpendingAllocation[] }[];
  categorySpend: { category: string; total: number; count: number }[];
  totalSpend: number;
  avgTransaction: number;
  unusualTransactions: SpendingAllocation[];
}

export interface SpendingPattern {
  type: string;
  description: string;
  details?: {
    detected: boolean;
    variation?: number;
    pattern?: string | null;
  };
  rate?: number;
}

export interface SpendingAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  transaction: SpendingAllocation;
  zscore: number;
}

export interface SpendingForecast {
  projectedMonthlyAvg: number;
  annualProjection: number;
  annualBudget: number;
  projectedOverrun: number;
  trend: 'increasing' | 'decreasing';
  trendRate: number;
  confidence: number;
}

export interface CategorySpendAnalysis {
  name: string;
  ytdSpend: number;
  growthRate: number;
  budgetVariance: number;
  status: 'over' | 'under' | 'on-track';
}

export interface EnterpriseAnalyticsData {
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
    contracts: {
      contract_value: number;
      contracts_created: number;
    }[];
  };
}

export interface EnterpriseRiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  overall_risk_score: number;
  mitigation_actions: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    category: string;
  }[];
}

export interface StrategicOpportunity {
  type: string;
  area: string;
  potential: number;
  description: string;
  effort: string;
  timeline: string;
  confidence: number;
}

export interface ExecutiveSummary {
  totalContractValue: number;
  activeContracts: number;
  totalVendors: number;
  complianceRate: number;
  contractGrowth: number;
  vendorPerformanceTrend: number;
  keyHighlight: string;
}

export interface CurrentSnapshot {
  totalContractValue: number;
  activeContracts: number;
  totalVendors: number;
  complianceRate: number;
  aiUtilization?: {
    aiTasksProcessed: number;
    avgConfidenceScore: number;
  };
  riskScore?: number;
  opportunityCount?: number;
}

export interface CurrentBudgetAllocations {
  budgetId: string;
  budgetName: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  allocations: SpendingAllocation[];
}

export interface KeyMetrics {
  contractMetrics?: {
    totalValue: number;
    activeCount: number;
    averageValue: number;
    expiringCount: number;
    renewalRate: number;
  };
  vendorMetrics?: {
    totalVendors: number;
    activeVendors: number;
    averagePerformanceScore: number;
    concentrationRisk: number;
  };
  budgetMetrics?: {
    totalBudget: number;
    totalAllocated: number;
    totalSpent: number;
    utilizationRate: number;
    remainingBudget: number;
  };
  spendingMetrics?: {
    totalSpend: number;
    monthlyAverage: number;
    categoryCount: number;
    anomalyCount: number;
  };
}

export interface TimeSeriesDataPoint {
  period: string;
  date: string;
  contractValue?: number;
  contractsCreated?: number;
  contractsExpired?: number;
  vendorCount?: number;
  spendAmount?: number;
  budgetUtilization?: number;
  performanceScore?: number;
}

export interface TimeSeries {
  contracts?: TimeSeriesDataPoint[];
  vendors?: TimeSeriesDataPoint[];
  spending?: TimeSeriesDataPoint[];
  budgets?: TimeSeriesDataPoint[];
  performance?: TimeSeriesDataPoint[];
}

export interface AnalyticsAnalysis {
  // Contract Analysis
  summary?: ContractSummary;
  trends?: ContractTrend[];
  risks?: ContractRisk[] | VendorRisk[] | EnterpriseRiskAssessment;
  opportunities?: ContractOpportunity[] | StrategicOpportunity[];
  predictions?: ContractPrediction;
  currentSnapshot?: CurrentSnapshot;

  // Vendor Analysis
  vendorId?: string;
  analytics?: VendorAnalyticsData;
  relationshipScore?: VendorRelationshipScore;
  performance?: VendorPerformance[];
  concentration?: VendorConcentrationMetrics;
  benchmarks?: VendorBenchmark;

  // Budget Analysis
  budgetId?: string;
  forecast?: BudgetForecast;
  optimization?: BudgetOptimization;
  currentAllocations?: CurrentBudgetAllocations;

  // Spending Analysis
  patterns?: SpendingPattern[];
  anomalies?: SpendingAnomaly[];
  categoryAnalysis?: CategorySpendAnalysis[];

  // Comprehensive Analysis
  executiveSummary?: ExecutiveSummary;
  keyMetrics?: KeyMetrics;
  timeSeries?: TimeSeries;

  recommendations: string[];
}

export interface VendorAnalyticsData {
  // Define properties based on the return of 'calculate_vendor_analytics'
  // Example:
  vendor_id: string;
  total_spend: number;
  average_contract_value: number;
  // ... other properties
}

export interface VendorRelationshipScore {
  // Define properties based on the return of 'calculate_vendor_relationship_score'
  // Example:
  overall_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations?: { action: string }[];
  // ... other properties
}

export interface BudgetForecast {
  forecast?: {
    months_until_depletion: number;
    // Add other properties as they are used in the code
  };
  recommendations?: string[];
  budget?: {
    utilization_percentage: number;
  };
  // Add other properties as they are used in the code
}

export interface BudgetAllocationItem {
  allocationId: string;
  budgetId: string;
  budgetName: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  contractId?: string;
  contractTitle?: string;
  category?: string;
  createdAt: string;
}

export interface BudgetOptimization {
  current_allocations: BudgetAllocationItem[];
  recommendations?: {
    action: string;
    amount: number;
    budget_name: string;
    reason: string;
  }[];
  totalOptimizationPotential?: number;
  inefficientAllocations?: BudgetAllocationItem[];
}
