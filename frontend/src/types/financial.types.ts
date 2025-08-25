/**
 * Financial types to replace 'any' usage in financial-related components
 */

import { Id } from './id.types';
import type { Id } from '@/types/id.types';

// Financial Analysis Types
export interface FinancialSummary {
  totalValue?: number;
  valueCategory?: 'low' | 'medium' | 'high' | 'enterprise';
  paymentStructure?: PaymentStructure;
  currency?: string;
  annualizedValue?: number;
  totalCostOfOwnership?: number;
}

export interface PaymentStructure {
  type: 'one-time' | 'recurring' | 'milestone' | 'subscription';
  frequency?: 'monthly' | 'quarterly' | 'annual' | 'one-time';
  terms: string;
  hasUnfavorableTerms?: boolean;
  concern?: string;
}

export interface FinancialRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigationStrategy?: string;
  financialImpact?: number;
}

export interface FinancialOpportunity {
  type: string;
  description: string;
  potentialSavings?: number;
  timeframe?: string;
  confidence?: number;
}

export interface FinancialMetrics {
  costPerUnit?: number;
  roi?: number;
  paybackPeriod?: number;
  internalRateOfReturn?: number;
  netPresentValue?: number;
}

export interface FinancialAnalysis {
  financialSummary: FinancialSummary;
  risks: FinancialRisk[];
  opportunities: FinancialOpportunity[];
  metrics: FinancialMetrics;
}

// Contract Financial Data
export interface ContractFinancialData {
  contractId: Id<"contracts">;
  value: number;
  currency: string;
  paymentSchedule?: string;
  pricing?: string;
  startDate?: string;
  endDate?: string;
  renewalTerms?: string;
}

// Vendor Financial Data
export interface VendorFinancialData {
  vendorId: Id<"vendors">;
  totalSpend: number;
  activeContracts: number;
  averageContractValue: number;
  paymentHistory?: PaymentRecord[];
}

export interface PaymentRecord {
  date: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'overdue';
  contractId?: Id<"contracts">;
  invoiceNumber?: string;
}

// Financial Task Data
export interface FinancialTaskData {
  analysisType: 'contract_value' | 'cost_optimization' | 'risk_assessment' | 'payment_verification';
  contractId?: Id<"contracts">;
  vendorId?: Id<"vendors">;
  parameters?: FinancialTaskParameters;
}

export interface FinancialTaskParameters {
  includeHistoricalData?: boolean;
  comparisonPeriod?: string;
  thresholds?: {
    risk?: number;
    value?: number;
    savings?: number;
  };
}

// Financial Insight Data
export interface FinancialInsightData {
  insightType: 'cost_saving' | 'risk_alert' | 'optimization' | 'anomaly';
  contractId?: Id<"contracts">;
  vendorId?: Id<"vendors">;
  amount?: number;
  percentage?: number;
  timeframe?: string;
  recommendations: string[];
}

// Financial Report Types
export interface FinancialReport {
  reportType: 'summary' | 'detailed' | 'executive';
  period: {
    start: string;
    end: string;
  };
  totalSpend: number;
  contractCount: number;
  vendorCount: number;
  insights: FinancialInsightData[];
  trends: TrendData[];
}

export interface TrendData {
  metric: string;
  dataPoints: Array<{
    date: string;
    value: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage?: number;
}

// Cost Analysis Types
export interface CostAnalysis {
  directCosts: number;
  indirectCosts: number;
  hiddenCosts: number;
  totalCosts: number;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  description?: string;
}

// Comparison Types
export interface ContractComparison {
  baseContract: ContractFinancialData;
  comparisonContracts: ContractFinancialData[];
  metrics: ComparisonMetrics;
}

export interface ComparisonMetrics {
  valueComparison: {
    average: number;
    median: number;
    percentile: number;
  };
  termComparison: {
    averageDuration: number;
    commonTerms: string[];
  };
}

// Type Guards
export function isFinancialTaskData(data: unknown): data is FinancialTaskData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'analysisType' in data
  );
}

export function isFinancialInsightData(data: unknown): data is FinancialInsightData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'insightType' in data &&
    'recommendations' in data
  );
}