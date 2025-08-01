// Financial and risk assessment type definitions

export interface FinancialData {
  revenue?: number;
  assets?: number;
  liabilities?: number;
  cashFlow?: number;
  profitMargin?: number;
  debtToEquityRatio?: number;
  currentRatio?: number;
  quickRatio?: number;
  lastReportDate?: string;
}

export interface FinancialMetrics {
  revenue: number;
  profitability: number;
  liquidity: number;
  leverage: number;
}

export interface FinancialStability {
  hasFinancialData: boolean;
  metrics: FinancialMetrics;
  stability: 'excellent' | 'good' | 'average' | 'poor';
  concerns: string[];
}

export interface RiskAssessment {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  mitigation: string;
  score?: number;
}

export interface OpportunityAssessment {
  type: string;
  description: string;
  potentialSaving?: number;
  potentialBenefit?: string;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PerformanceData {
  score: number;
  date: string;
  month?: string;
  metrics?: {
    onTimeDelivery?: number;
    qualityScore?: number;
    responsiveness?: number;
    compliance?: number;
  };
}

export interface PaymentData {
  due_date: string;
  paid_date: string;
  amount: number;
  status?: 'paid' | 'pending' | 'overdue';
}

export interface SpendAnalysis {
  totalSpend: number;
  monthlyAverage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  byCategory: CategorySpend[];
  concentration: SpendConcentration;
}

export interface CategorySpend {
  category: string;
  spend: number;
  percentage: number;
  vendorCount: number;
}

export interface SpendConcentration {
  topVendor: string;
  topVendorSpend: number;
  topVendorShare: number;
  top5Share: number;
  herfindahlIndex: number;
  concentrationLevel: 'low' | 'medium' | 'high';
}

export interface BudgetData {
  allocated: number;
  spent: number;
  remaining: number;
  projectedOverage?: number;
  period: string;
}

export interface FinancialProjection {
  period: string;
  projected: number;
  actual?: number;
  variance?: number;
  confidence: number;
}