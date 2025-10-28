import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';

// Helper type for unknown data with common financial properties
interface FinancialData extends Record<string, unknown> {
  value?: number;
  contractValue?: number;
  totalValue?: number;
  amount?: number;
  payment_terms?: string;
  content?: string;
  text?: string;
  extracted_text?: string;
  category?: string;
  currency?: string;
  budgetData?: Record<string, unknown>;
  budgetId?: string;
  extracted_cost_breakdown?: unknown;
  extracted_financial_terms?: unknown;
  extracted_roi?: unknown;
  dueDate?: string;
}

// Financial analysis types
interface BudgetImpact {
  affected?: boolean;
  utilization?: number;
  remaining?: number;
  exceeded?: boolean;
  sufficient?: boolean;
  available?: number;
  required?: number;
  shortfall?: number;
  budgetData?: {
    total: number;
    used: number;
    committed: number;
  };
}

interface FinancialVariance {
  category: string;
  variance: number;
  type?: 'over' | 'under';
  budgeted?: number;
  actual?: number;
  percentage?: number;
}

interface FinancialOptimization {
  area: string;
  potential: number;
  recommendation: string;
}

interface PaymentSchedule {
  totalAmount?: number;
  installments: Array<{
    amount: number;
    due_date: string;
    description?: string;
  }>;
  frequency?: string;
  type?: string;
  terms?: string | null;
}

interface CostBreakdown {
  total?: number;
  categories?: Record<string, number> | Array<{ name: string; amount: number; type: string }>;
  percentages?: Record<string, number>;
  oneTime?: number;
  recurring?: number;
}

interface FinancialTerms {
  payment_terms?: string;
  paymentTerms?: string | null;
  late_payment_fee?: number;
  discount_available?: number;
  currency?: string;
  lateFees?: { rate: number; type: string } | null;
  discounts?: Array<unknown>;
  escalation?: unknown;
}

interface CashFlowImpact {
  monthly_impact?: number;
  quarterly_impact?: number;
  annual_impact?: number;
  timing?: string;
  monthlyImpact?: number;
  severity?: string;
  type?: string;
  totalImpact?: number;
}

interface ROIAnalysis {
  roi_percentage?: number;
  payback_period?: number;
  npv?: number;
  assessment?: string;
  estimated?: number;
  benefit?: number;
  cost?: number;
  paybackPeriod?: number | null;
}

interface FinancialRiskAssessment {
  level?: 'low' | 'medium' | 'high';
  factors?: string[];
  score?: number;
  risks?: Array<{ type: string; severity: string; description: string }>;
  overallRisk?: string;
}

interface SpendTrend {
  trend?: 'increasing' | 'decreasing' | 'stable';
  change_percentage?: number;
  average_monthly?: number;
  direction?: 'increasing' | 'decreasing' | 'stable';
  rate?: number;
}

interface CostEfficiency {
  efficiency_score?: number;
  comparison?: string;
  recommendations?: string[];
  score?: number;
  factors?: string[];
}

interface BudgetUtilization {
  percentage?: number;
  amount_used?: number;
  amount_remaining?: number;
  status?: string;
  used?: number;
  committed?: number;
  available?: number;
  total?: number;
}

interface BurnRate {
  monthly?: number;
  projected_depletion?: string;
  alert_needed?: boolean;
  projectedTotal?: number;
  projectedOverrun?: boolean;
  projectedOverage?: number;
  monthsRemaining?: number;
}

interface BudgetForecast {
  projected_end_date?: string;
  confidence?: number;
  factors?: string[];
  endOfYear?: number;
  nextQuarter?: number;
  recommendations?: string[];
}

interface FinancialMetrics {
  average: number;
  median: number;
  total: number;
  count: number;
}

// Additional helper interfaces
interface VendorSpendMetrics {
  total: number;
  average: number;
  history: Array<{ month: string; amount: number }>;
  activeContracts: number;
  contractCount: number;
}

interface PaymentPerformance {
  totalPayments: number;
  latePayments: number;
  latePaymentRate: number;
  averageDaysLate: number;
}

interface VendorConcentration {
  percentage: number;
  level: 'low' | 'medium' | 'high' | 'unknown';
  vendorSpend?: number;
  categorySpend?: number;
  category?: string;
}

interface ContractData extends Record<string, unknown> {
  value?: number;
  payment_terms?: string;
  category?: string;
  content?: string;
  text?: string;
  extracted_text?: string;
}

interface BudgetData extends Record<string, unknown> {
  id: string;
  amount: number;
  utilization?: Array<{ total_spent: number; total_committed: number }>;
}

interface PaymentRecord {
  due_date: string;
  paid_date: string;
  amount: number;
}

export class FinancialAgent extends BaseAgent {
  get agentType() {
    return 'financial';
  }

  get capabilities() {
    return ['cost_analysis', 'payment_terms', 'budget_impact', 'financial_risk', 'spend_analytics'];
  }

  async process(data: unknown, context?: AgentContext): Promise<ProcessingResult> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      // Check permissions if userId provided
      if (context?.userId) {
        const hasPermission = await this.checkUserPermission(context.userId, 'user');
        if (!hasPermission) {
          throw new Error('Insufficient permissions for financial analysis');
        }
      }

      // Create audit log
      if (context?.contractId || context?.vendorId) {
        await this.createAuditLog(
          'financial_analysis',
          context.contractId ? 'contract' : 'vendor',
          context.contractId || context.vendorId!,
          { agentType: this.agentType },
        );
      }

      // Type assertion for data
      const typedData = data as FinancialData;

      // Determine processing type
      if (context?.contractId) {
        return await this.analyzeContractFinancials(context.contractId, context, rulesApplied, insights);
      } else if (context?.vendorId) {
        return await this.analyzeVendorFinancials(context.vendorId, context, rulesApplied, insights);
      } else if (typedData.budgetData || typedData.budgetId) {
        return await this.analyzeBudget(data, context, rulesApplied, insights);
      }

      // Default financial analysis
      return await this.performGeneralAnalysis(data, context, rulesApplied, insights);

    } catch (error) {
      return this.createResult(
        false,
        null,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  private async analyzeContractFinancials(
    contractId: string,
    context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('contract_financial_analysis');

    // Use cached contract data
    const cacheKey = `contract_financials_${contractId}`;
    const contractData = await this.getCachedOrFetch(cacheKey, async () => {
      // Get contract with vendor data
      const { data: contract } = await this.supabase
        .from('contracts')
        .select(`
          *,
          vendor:vendors!vendor_id(
            id,
            name,
            category
          ),
          approvals:contract_approvals(
            approval_type,
            status
          )
        `)
        .eq('id', contractId)
        .eq('enterprise_id', this.enterpriseId)
        .single();

      return contract;
    }, 300); // 5 min cache

    if (!contractData) {
      throw new Error('Contract not found');
    }

    // Use database function for routing analysis
    const routingAnalysis = await this.callDatabaseFunction('route_contract_for_approval', {
      p_contract_id: contractId,
    });

    const analysis = {
      totalValue: contractData.value || this.calculateTotalValue(contractData),
      paymentSchedule: this.extractPaymentSchedule(contractData),
      costBreakdown: this.analyzeCostBreakdown(contractData),
      financialTerms: this.extractFinancialTerms(contractData),
      cashFlowImpact: this.assessCashFlowImpact(contractData),
      roi: this.calculateROI(contractData),
      riskAssessment: this.assessFinancialRisk(contractData),
      approvalRouting: routingAnalysis,
      budgetImpact: await this.checkBudgetImpact(contractData),
    };

    // Generate financial insights

    // High-value contract check
    if (analysis.totalValue > 100000) {
      insights.push(this.createInsight(
        'high_value_contract',
        'high',
        'High-Value Contract',
        `Contract value of $${analysis.totalValue.toLocaleString()} exceeds $100,000 threshold`,
        'Ensure proper approval from finance leadership and consider payment terms negotiation',
        { value: analysis.totalValue },
      ));
      rulesApplied.push('high_value_threshold');
    }

    // Payment terms analysis
    if (analysis.paymentSchedule.type === 'upfront' && analysis.totalValue > 50000) {
      insights.push(this.createInsight(
        'large_upfront_payment',
        'medium',
        'Large Upfront Payment Required',
        `Contract requires upfront payment of $${analysis.totalValue.toLocaleString()}`,
        'Consider negotiating for milestone-based or net terms payment',
        { paymentType: 'upfront', amount: analysis.totalValue },
      ));
      rulesApplied.push('payment_terms_check');
    }

    // Cash flow impact
    if (analysis.cashFlowImpact.severity === 'high') {
      const monthlyImpact = analysis.cashFlowImpact.monthlyImpact ?? 0;
      insights.push(this.createInsight(
        'cash_flow_impact',
        'high',
        'Significant Cash Flow Impact',
        `This contract will impact cash flow by $${monthlyImpact.toLocaleString()}/month`,
        'Review cash reserves and consider impact on other planned expenditures',
        analysis.cashFlowImpact,
      ));
      rulesApplied.push('cash_flow_analysis');
    }

    // ROI assessment
    const roiEstimated = analysis.roi.estimated ?? 0;
    if (roiEstimated < 0) {
      insights.push(this.createInsight(
        'negative_roi',
        'critical',
        'Negative ROI Projected',
        'Financial analysis indicates this contract may result in a net loss',
        'Reconsider contract terms or ensure non-financial benefits justify the cost',
        { roi: analysis.roi },
      ));
      rulesApplied.push('roi_calculation');
    } else if (roiEstimated > 2) {
      insights.push(this.createInsight(
        'high_roi',
        'low',
        'High ROI Opportunity',
        `Projected ROI of ${(roiEstimated * 100).toFixed(1)}%`,
        'Consider expediting approval process to capture value',
        { roi: analysis.roi },
        false,
      ));
    }

    // Budget impact check
    if (analysis.budgetImpact && !analysis.budgetImpact.sufficient) {
      const available = analysis.budgetImpact.available ?? 0;
      insights.push(this.createInsight(
        'insufficient_budget',
        'critical',
        'Insufficient Budget',
        `Current budget has only $${available.toLocaleString()} available, need $${analysis.totalValue.toLocaleString()}`,
        'Request budget increase or defer to next fiscal period',
        analysis.budgetImpact,
      ));
      rulesApplied.push('budget_check');
    }

    // Store insights
    if (insights.length > 0 && context?.taskId) {
      await this.storeInsights(insights, contractId, 'contract');
    }

    const confidence = this.calculateFinancialConfidence(analysis);

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      confidence,
      {
        requiresApproval: analysis.totalValue > 50000,
        approvalLevel: this.determineApprovalLevel(analysis.totalValue),
        contractId,
      },
    );
  }

  private async analyzeVendorFinancials(
    vendorId: string,
    context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('vendor_financial_analysis');

    // Get vendor spend history using database query
    const vendorSpend = await this.getVendorSpendMetrics(vendorId);

    const analysis = {
      totalHistoricalSpend: vendorSpend.total,
      averageContractValue: vendorSpend.average,
      spendTrend: this.analyzeSpendTrend(vendorSpend.history),
      paymentPerformance: await this.getVendorPaymentPerformance(vendorId),
      costEfficiency: this.assessCostEfficiency(vendorSpend),
      concentrationRisk: await this.assessVendorConcentration(vendorId),
      activeContracts: vendorSpend.activeContracts,
    };

    // Vendor concentration risk
    if (analysis.concentrationRisk.level === 'high') {
      insights.push(this.createInsight(
        'vendor_concentration_risk',
        'high',
        'High Vendor Concentration Risk',
        `${analysis.concentrationRisk.percentage.toFixed(1)}% of category spend is with this vendor`,
        'Consider diversifying vendor base to reduce dependency',
        analysis.concentrationRisk,
      ));
      rulesApplied.push('concentration_analysis');
    }

    // Spend trend analysis
    const spendRate = analysis.spendTrend.rate ?? 0;
    if (analysis.spendTrend.direction === 'increasing' && spendRate > 20) {
      insights.push(this.createInsight(
        'rapid_spend_increase',
        'medium',
        'Rapid Spend Increase',
        `Vendor spend has increased ${spendRate.toFixed(1)}% over the last year`,
        'Review contracts for cost optimization opportunities',
        { trend: analysis.spendTrend },
      ));
      rulesApplied.push('trend_analysis');
    }

    // Payment performance
    if (analysis.paymentPerformance.latePaymentRate > 0.1) {
      insights.push(this.createInsight(
        'payment_delays',
        'medium',
        'Payment Performance Issues',
        `${(analysis.paymentPerformance.latePaymentRate * 100).toFixed(1)}% of payments to this vendor are late`,
        'Review payment processes and consider automation',
        analysis.paymentPerformance,
      ));
      rulesApplied.push('payment_analysis');
    }

    // Store insights
    if (insights.length > 0 && context?.taskId) {
      await this.storeInsights(insights, vendorId, 'vendor');
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.85,
      { vendorId },
    );
  }

  private async analyzeBudget(
    data: unknown,
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('budget_analysis');

    // Get budget data from database
    const typedData = data as FinancialData;
    const budgetId = (typedData.budgetId as string | undefined) || (typedData.budgetData as { id?: string } | undefined)?.id;
    const budgetData = await this.getBudgetData(budgetId);

    const analysis = {
      budgetUtilization: await this.calculateBudgetUtilization(budgetData),
      burnRate: this.calculateBurnRate(budgetData),
      forecast: this.forecastBudget(budgetData),
      variances: await this.analyzeVariances(budgetData),
      optimizationOpportunities: await this.identifyOptimizations(budgetData),
    };

    // Budget utilization alerts
    const utilizationPercentage = analysis.budgetUtilization.percentage ?? 0;
    if (utilizationPercentage > 90) {
      insights.push(this.createInsight(
        'high_budget_utilization',
        'high',
        'High Budget Utilization',
        `${utilizationPercentage.toFixed(1)}% of budget has been utilized`,
        'Review remaining commitments and consider budget increase if needed',
        analysis.budgetUtilization,
      ));
      rulesApplied.push('utilization_check');
    }

    // Burn rate analysis
    if (analysis.burnRate.projectedOverrun) {
      const projectedOverage = analysis.burnRate.projectedOverage ?? 0;
      insights.push(this.createInsight(
        'budget_overrun_risk',
        'critical',
        'Budget Overrun Risk',
        `Current burn rate projects ${projectedOverage.toFixed(1)}% overrun`,
        'Implement spending controls and review all new commitments',
        analysis.burnRate,
      ));
      rulesApplied.push('burn_rate_analysis');
    }

    // Variance analysis
    for (const variance of analysis.variances) {
      const variancePercentage = variance.percentage ?? 0;
      if (Math.abs(variancePercentage) > 20) {
        insights.push(this.createInsight(
          'significant_variance',
          variancePercentage > 0 ? 'medium' : 'high',
          `Significant ${variancePercentage > 0 ? 'Over' : 'Under'} Spend in ${variance.category}`,
          `${variance.category} is ${Math.abs(variancePercentage).toFixed(1)}% ${variancePercentage > 0 ? 'over' : 'under'} budget`,
          variancePercentage > 0
            ? 'Review spending in this category for reduction opportunities'
            : 'Consider reallocating unused budget to other needs',
          variance,
        ));
      }
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.9,
    );
  }

  private async performGeneralAnalysis(
    data: unknown,
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('general_financial_analysis');

    const amounts = this.extractAllAmounts(data);
    const analysis = {
      totalIdentifiedSpend: amounts.reduce((sum, amt) => sum + amt.value, 0),
      largestAmount: amounts[0] || null,
      paymentTerms: this.identifyPaymentTerms(data),
      financialMetrics: this.calculateBasicMetrics(amounts),
    };

    if (analysis.totalIdentifiedSpend > 0) {
      insights.push(this.createInsight(
        'spend_summary',
        'low',
        'Financial Summary',
        `Total identified spend: $${analysis.totalIdentifiedSpend.toLocaleString()}`,
        'Review for budget alignment',
        analysis,
        false,
      ));
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.7,
    );
  }

  // Database-integrated methods
  private async getVendorSpendMetrics(vendorId: string): Promise<VendorSpendMetrics> {
    const cacheKey = `vendor_spend_${vendorId}_${this.enterpriseId}`;

    return this.getCachedOrFetch(cacheKey, async () => {
      // Get spend history
      const { data: contracts } = await this.supabase
        .from('contracts')
        .select('value, created_at, status')
        .eq('vendor_id', vendorId)
        .eq('enterprise_id', this.enterpriseId)
        .order('created_at', { ascending: false });

      const total = contracts?.reduce((sum: number, c: { value: number | null }) => sum + (c.value || 0), 0) || 0;
      const activeContracts = contracts?.filter((c: { status: string }) => c.status === 'active').length || 0;

      // Get monthly spend trend
      const { data: monthlySpend } = await this.supabase
        .from('monthly_spend_view')
        .select('month, amount')
        .eq('vendor_id', vendorId)
        .eq('enterprise_id', this.enterpriseId)
        .order('month', { ascending: false })
        .limit(12);

      return {
        total,
        average: contracts && contracts.length > 0 ? total / contracts.length : 0,
        history: monthlySpend || [],
        activeContracts,
        contractCount: contracts?.length || 0,
      };
    }, 600); // 10 min cache
  }

  private async getVendorPaymentPerformance(vendorId: string): Promise<PaymentPerformance> {
    const { data: payments } = await this.supabase
      .from('payments')
      .select('due_date, paid_date, amount')
      .eq('vendor_id', vendorId)
      .eq('enterprise_id', this.enterpriseId)
      .not('paid_date', 'is', null);

    const total = payments?.length || 0;
    const late = payments?.filter((p: PaymentRecord) =>
      new Date(p.paid_date) > new Date(p.due_date),
    ).length || 0;

    return {
      totalPayments: total,
      latePayments: late,
      latePaymentRate: total > 0 ? late / total : 0,
      averageDaysLate: this.calculateAverageDaysLate(payments || []),
    };
  }

  private async assessVendorConcentration(vendorId: string): Promise<VendorConcentration> {
    // Get vendor category
    const { data: vendor } = await this.supabase
      .from('vendors')
      .select('category')
      .eq('id', vendorId)
      .single();

    if (!vendor?.category) {
      return { level: 'unknown', percentage: 0 };
    }

    // Get total category spend
    const { data: categorySpend } = await this.supabase
      .from('contracts')
      .select('value')
      .eq('enterprise_id', this.enterpriseId)
      .eq('vendors.category', vendor.category)
      .not('value', 'is', null);

    const categoryTotal = categorySpend?.reduce((sum: number, c: { value: number }) => sum + c.value, 0) || 0;

    // Get vendor spend
    const { data: vendorContracts } = await this.supabase
      .from('contracts')
      .select('value')
      .eq('vendor_id', vendorId)
      .eq('enterprise_id', this.enterpriseId)
      .not('value', 'is', null);

    const vendorTotal = vendorContracts?.reduce((sum: number, c: { value: number }) => sum + c.value, 0) || 0;

    const percentage = categoryTotal > 0 ? (vendorTotal / categoryTotal) * 100 : 0;

    return {
      percentage,
      level: percentage > 30 ? 'high' : percentage > 15 ? 'medium' : 'low',
      vendorSpend: vendorTotal,
      categorySpend: categoryTotal,
      category: vendor.category,
    };
  }

  private async checkBudgetImpact(contractData: unknown): Promise<BudgetImpact | null> {
    // Get budget for contract category
    const typedData = contractData as ContractData;
    const category = typedData.category || 'general';

    const { data: budget } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .eq('category', category)
      .eq('fiscal_year', new Date().getFullYear())
      .single();

    if (!budget) {
      return null;
    }

    // Calculate available budget
    const { data: spent } = await this.supabase
      .from('budget_utilization_view')
      .select('total_spent, total_committed')
      .eq('budget_id', budget.id)
      .single();

    const available = budget.amount - (spent?.total_spent || 0) - (spent?.total_committed || 0);
    const contractValue = typedData.value || 0;

    return {
      sufficient: available >= contractValue,
      available,
      required: contractValue,
      shortfall: contractValue > available ? contractValue - available : 0,
      budgetData: {
        total: budget.amount,
        used: spent?.total_spent || 0,
        committed: spent?.total_committed || 0,
      },
    };
  }

  private async getBudgetData(budgetId?: string): Promise<BudgetData | null> {
    if (budgetId) {
      const { data } = await this.supabase
        .from('budgets')
        .select(`
          *,
          utilization:budget_utilization_view(
            total_spent,
            total_committed
          )
        `)
        .eq('id', budgetId)
        .eq('enterprise_id', this.enterpriseId)
        .single();

      return data;
    }

    // Get current fiscal year budget
    const { data } = await this.supabase
      .from('budgets')
      .select(`
        *,
        utilization:budget_utilization_view(
          total_spent,
          total_committed
        )
      `)
      .eq('enterprise_id', this.enterpriseId)
      .eq('fiscal_year', new Date().getFullYear());

    return data?.[0];
  }

  private async analyzeVariances(budgetData: unknown): Promise<FinancialVariance[]> {
    const typedBudget = budgetData as BudgetData;
    const { data: variances } = await this.supabase
      .from('budget_variance_analysis')
      .select('*')
      .eq('budget_id', typedBudget.id)
      .order('variance_amount', { ascending: false });

    return variances?.map((v: {
      category: string;
      budgeted_amount: number;
      actual_amount: number;
      variance_amount: number;
      variance_percentage: number;
    }) => ({
      category: v.category,
      budgeted: v.budgeted_amount,
      actual: v.actual_amount,
      variance: v.variance_amount,
      percentage: v.variance_percentage,
    })) || [];
  }

  private async identifyOptimizations(budgetData: unknown): Promise<FinancialOptimization[]> {
    // Use database function to identify optimization opportunities
    const typedBudget = budgetData as BudgetData;
    const optimizations = await this.callDatabaseFunction('identify_cost_optimization_opportunities', {
      p_budget_id: typedBudget.id,
    });

    return optimizations || [];
  }

  // Financial calculation methods
  private calculateTotalValue(data: unknown): number {
    // Extract from various possible fields
    const typedData = data as FinancialData;
    if (typedData.value) {return typedData.value;}
    if (typedData.contractValue) {return typedData.contractValue;}
    if (typedData.totalValue) {return typedData.totalValue;}
    if (typedData.amount) {return typedData.amount;}

    // Try to extract from text
    if (typedData.content || typedData.text || typedData.extracted_text) {
      const amounts = this.extractAllAmounts(data);
      return amounts.reduce((sum, amt) => sum + amt.value, 0);
    }

    return 0;
  }

  private extractPaymentSchedule(data: unknown): PaymentSchedule {
    const typedData = data as FinancialData;
    const schedule: PaymentSchedule = {
      type: 'unknown',
      installments: [],
      terms: typedData.payment_terms || null,
    };

    const text = (typedData.content || typedData.text || typedData.extracted_text || '').toLowerCase();

    // Identify payment type
    if (typedData.payment_terms) {
      if (typedData.payment_terms.includes('Net')) {
        schedule.type = 'net_terms';
        schedule.terms = typedData.payment_terms;
      } else if (typedData.payment_terms.toLowerCase().includes('upfront')) {
        schedule.type = 'upfront';
      }
    } else if (text.includes('net 30') || text.includes('net 60')) {
      schedule.type = 'net_terms';
      schedule.terms = text.match(/net\s*(\d+)/)?.[0] || 'net 30';
    } else if (text.includes('upfront') || text.includes('advance')) {
      schedule.type = 'upfront';
    } else if (text.includes('milestone') || text.includes('deliverable')) {
      schedule.type = 'milestone';
    } else if (text.includes('monthly') || text.includes('installment')) {
      schedule.type = 'installment';
    }

    return schedule;
  }

  private analyzeCostBreakdown(data: unknown): CostBreakdown {
    const typedData = data as FinancialData;
    const breakdown: CostBreakdown = {
      categories: [],
      oneTime: 0,
      recurring: 0,
      total: typedData.value || 0,
    };

    // Use extracted data if available
    if (typedData.extracted_cost_breakdown) {
      return typedData.extracted_cost_breakdown as CostBreakdown;
    }

    const text = (typedData.content || typedData.text || typedData.extracted_text || '').toLowerCase();

    // Common cost categories
    const categories = [
      { name: 'license', pattern: /licens(?:e|ing)\s*(?:fee|cost)?\s*:?\s*\$?([\d,]+)/gi },
      { name: 'implementation', pattern: /implementation\s*(?:fee|cost)?\s*:?\s*\$?([\d,]+)/gi },
      { name: 'maintenance', pattern: /maintenance\s*(?:fee|cost)?\s*:?\s*\$?([\d,]+)/gi },
      { name: 'support', pattern: /support\s*(?:fee|cost)?\s*:?\s*\$?([\d,]+)/gi },
      { name: 'training', pattern: /training\s*(?:fee|cost)?\s*:?\s*\$?([\d,]+)/gi },
    ];

    for (const category of categories) {
      const matches = [...text.matchAll(category.pattern)];
      if (matches.length > 0) {
        const amount = parseFloat(matches[0][1].replace(/,/g, ''));
        const categoryItem = {
          name: category.name,
          amount,
          type: ['maintenance', 'support'].includes(category.name) ? 'recurring' : 'one-time',
        };

        // Safely push to categories array
        if (Array.isArray(breakdown.categories)) {
          breakdown.categories.push(categoryItem);
        }

        if (['maintenance', 'support'].includes(category.name)) {
          breakdown.recurring = (breakdown.recurring || 0) + amount;
        } else {
          breakdown.oneTime = (breakdown.oneTime || 0) + amount;
        }
      }
    }

    return breakdown;
  }

  private extractFinancialTerms(data: unknown): FinancialTerms {
    const typedData = data as FinancialData;
    const terms: FinancialTerms = {
      paymentTerms: typedData.payment_terms || null,
      lateFees: null,
      discounts: [],
      escalation: null,
      currency: typedData.currency || 'USD',
    };

    // Use extracted terms if available
    if (typedData.extracted_financial_terms) {
      return { ...terms, ...(typedData.extracted_financial_terms as Partial<FinancialTerms>) };
    }

    const text = (typedData.content || typedData.text || typedData.extracted_text || '');

    // Payment terms
    if (!terms.paymentTerms) {
      const paymentMatch = text.match(/payment.*?(?:due|terms).*?(\d+)\s*days?/i);
      if (paymentMatch) {
        terms.paymentTerms = `Net ${paymentMatch[1]}`;
      }
    }

    // Late fees
    const lateFeeMatch = text.match(/late.*?fee.*?(\d+(?:\.\d+)?)\s*%/i);
    if (lateFeeMatch) {
      terms.lateFees = {
        rate: parseFloat(lateFeeMatch[1]),
        type: 'percentage',
      };
    }

    return terms;
  }

  private assessCashFlowImpact(data: unknown): CashFlowImpact {
    const typedData = data as FinancialData;
    const totalValue = typedData.value || this.calculateTotalValue(data);
    const schedule = this.extractPaymentSchedule(data);

    let monthlyImpact = 0;
    let severity = 'low';

    if (schedule.type === 'upfront') {
      monthlyImpact = totalValue; // Full impact in first month
      severity = totalValue > 50000 ? 'high' : 'medium';
    } else if (schedule.type === 'installment' && schedule.installments.length > 0) {
      monthlyImpact = totalValue / schedule.installments.length;
      severity = monthlyImpact > 10000 ? 'medium' : 'low';
    } else if (schedule.type === 'net_terms') {
      monthlyImpact = totalValue; // Assume monthly billing
      severity = totalValue > 25000 ? 'medium' : 'low';
    }

    const impact: CashFlowImpact = {
      monthlyImpact,
      severity,
      totalImpact: totalValue,
    };

    if (schedule.type) {
      impact.type = schedule.type;
    }

    return impact;
  }

  private calculateROI(data: unknown): ROIAnalysis {
    const typedData = data as FinancialData;
    const cost = typedData.value || this.calculateTotalValue(data);

    // Use AI-extracted ROI data if available
    if (typedData.extracted_roi) {
      return typedData.extracted_roi as ROIAnalysis;
    }

    // Try to extract benefit/value information
    const text = (typedData.content || typedData.text || typedData.extracted_text || '').toLowerCase();
    let estimatedBenefit = 0;

    // Look for savings patterns
    const savingsPatterns = [
      /(?:save|savings|reduction).*?\$?([\d,]+)/gi,
      /(?:increase|improvement|gain).*?(\d+)\s*%/gi,
      /(?:revenue|income).*?\$?([\d,]+)/gi,
    ];

    for (const pattern of savingsPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) {
          estimatedBenefit += value;
        }
      }
    }

    const roi = cost > 0 ? (estimatedBenefit - cost) / cost : 0;

    return {
      estimated: roi,
      benefit: estimatedBenefit,
      cost,
      paybackPeriod: estimatedBenefit > 0 ? cost / (estimatedBenefit / 12) : null,
    };
  }

  private assessFinancialRisk(data: unknown): FinancialRiskAssessment {
    const risks: Array<{ type: string; severity: string; description: string }> = [];
    const typedData = data as FinancialData;
    const totalValue = typedData.value || this.calculateTotalValue(data);
    const text = (typedData.content || typedData.text || typedData.extracted_text || '').toLowerCase();

    // Contract value risk
    if (totalValue > 100000) {
      risks.push({
        type: 'high_value',
        severity: 'high',
        description: 'High contract value increases financial exposure',
      });
    }

    // Payment terms risk
    if (typedData.payment_terms?.toLowerCase().includes('upfront') || text.includes('advance')) {
      risks.push({
        type: 'upfront_payment',
        severity: 'medium',
        description: 'Upfront payment increases delivery risk',
      });
    }

    // No termination clause
    if (!text.includes('terminat') && !text.includes('cancel')) {
      risks.push({
        type: 'no_exit_clause',
        severity: 'medium',
        description: 'No clear termination or cancellation terms',
      });
    }

    // Auto-renewal
    if (text.includes('auto') && text.includes('renew')) {
      risks.push({
        type: 'auto_renewal',
        severity: 'low',
        description: 'Contract includes auto-renewal clause',
      });
    }

    return {
      risks,
      overallRisk: this.calculateOverallRisk(risks),
    };
  }

  // Utility methods
  private analyzeSpendTrend(history: Array<{ month: string; amount: number }>): SpendTrend {
    if (history.length < 2) {
      return { direction: 'stable', rate: 0 };
    }

    const amounts = history.map((h: { amount: number }) => h.amount);
    const firstAmount = amounts[0];
    const lastAmount = amounts[amounts.length - 1];
    const changeRate = ((lastAmount - firstAmount) / firstAmount) * 100;

    return {
      direction: changeRate > 5 ? 'increasing' : changeRate < -5 ? 'decreasing' : 'stable',
      rate: Math.abs(changeRate),
    };
  }

  private assessCostEfficiency(vendorSpend: VendorSpendMetrics): CostEfficiency {
    // Simple efficiency calculation
    const efficiency: CostEfficiency = {
      score: 0.75, // Base score
      factors: [],
    };

    if (vendorSpend.average < 20000) {
      efficiency.factors = efficiency.factors || [];
      efficiency.factors.push('Low average transaction value');
      efficiency.score = (efficiency.score || 0) + 0.1;
    }

    if (vendorSpend.contractCount > 3) {
      efficiency.factors = efficiency.factors || [];
      efficiency.factors.push('Long-term relationship');
      efficiency.score = (efficiency.score || 0) + 0.05;
    }

    if (vendorSpend.activeContracts > 0) {
      efficiency.factors = efficiency.factors || [];
      efficiency.factors.push('Active engagement');
      efficiency.score = (efficiency.score || 0) + 0.1;
    }

    return efficiency;
  }

  private async calculateBudgetUtilization(budgetData: unknown): Promise<BudgetUtilization> {
    const typedBudget = budgetData as BudgetData;
    const utilization = typedBudget.utilization?.[0] || { total_spent: 0, total_committed: 0 };
    const total = typedBudget.amount || 0;
    const used = utilization.total_spent || 0;
    const committed = utilization.total_committed || 0;

    const utilized = used + committed;
    const percentage = total > 0 ? (utilized / total) * 100 : 0;

    return {
      percentage,
      used,
      committed,
      available: total - utilized,
      total,
    };
  }

  private calculateBurnRate(budgetData: unknown): BurnRate {
    const now = new Date();
    const monthsElapsed = now.getMonth() + 1;
    const monthsRemaining = 12 - monthsElapsed;

    const typedBudget = budgetData as BudgetData;
    const utilization = typedBudget.utilization?.[0] || { total_spent: 0, total_committed: 0 };
    const spent = utilization.total_spent || 0;
    const total = typedBudget.amount || 0;

    const currentBurnRate = monthsElapsed > 0 ? spent / monthsElapsed : 0;
    const projectedTotal = currentBurnRate * 12;
    const projectedOverrun = projectedTotal > total;

    return {
      monthly: currentBurnRate,
      projectedTotal,
      projectedOverrun,
      projectedOverage: total > 0 ? ((projectedTotal - total) / total) * 100 : 0,
      monthsRemaining,
    };
  }

  private forecastBudget(budgetData: unknown): BudgetForecast {
    const burnRate = this.calculateBurnRate(budgetData);
    const monthly = burnRate.monthly ?? 0;

    const forecast: BudgetForecast = {
      nextQuarter: monthly * 3,
      recommendations: burnRate.projectedOverrun
        ? ['Reduce spending', 'Defer non-critical purchases', 'Request budget increase']
        : ['Maintain current spending'],
    };

    if (burnRate.projectedTotal !== undefined) {
      forecast.endOfYear = burnRate.projectedTotal;
    }

    return forecast;
  }

  private calculateAverageDaysLate(payments: PaymentRecord[]): number {
    if (!payments || payments.length === 0) {return 0;}

    const latePayments = payments.filter((p: PaymentRecord) =>
      new Date(p.paid_date) > new Date(p.due_date),
    );

    if (latePayments.length === 0) {return 0;}

    const totalDaysLate = latePayments.reduce((sum, p) => {
      const daysLate = Math.floor(
        (new Date(p.paid_date).getTime() - new Date(p.due_date).getTime()) /
        (1000 * 60 * 60 * 24),
      );
      return sum + daysLate;
    }, 0);

    return totalDaysLate / latePayments.length;
  }

  private extractAllAmounts(data: unknown): Array<{ value: number; currency?: string }> {
    const text = JSON.stringify(data);
    const amounts: Array<{ value: number; text?: string }> = [];

    const patterns = [
      /\$\s*([0-9,]+(?:\.[0-9]{2})?)/g,
      /([0-9,]+(?:\.[0-9]{2})?)\s*(?:USD|dollars?)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          amounts.push({ value, text: match[0] });
        }
      }
    }

    return amounts.sort((a, b) => b.value - a.value);
  }

  private identifyPaymentTerms(data: unknown): string {
    const typedData = data as FinancialData;
    if (typedData.payment_terms) {return typedData.payment_terms;}

    const text = (typedData.content || typedData.text || typedData.extracted_text || '').toLowerCase();

    if (text.includes('net 30')) {return 'Net 30';}
    if (text.includes('net 60')) {return 'Net 60';}
    if (text.includes('net 90')) {return 'Net 90';}
    if (text.includes('due on receipt')) {return 'Due on receipt';}
    if (text.includes('upfront')) {return 'Upfront';}

    return 'Standard terms';
  }

  private calculateBasicMetrics(amounts: Array<{ value: number }>): FinancialMetrics {
    if (amounts.length === 0) {
      return { count: 0, total: 0, average: 0, median: 0 };
    }

    const total = amounts.reduce((sum, amt) => sum + amt.value, 0);
    const average = total / amounts.length;
    const sorted = [...amounts].sort((a, b) => a.value - b.value);
    const median = sorted[Math.floor(sorted.length / 2)]?.value || 0;

    return { count: amounts.length, total, average, median };
  }

  private calculateFinancialConfidence(analysis: Record<string, unknown>): number {
    let confidence = 0.5;

    const totalValue = analysis.totalValue as number | undefined;
    const paymentSchedule = analysis.paymentSchedule as PaymentSchedule | undefined;
    const costBreakdown = analysis.costBreakdown as CostBreakdown | undefined;
    const financialTerms = analysis.financialTerms as FinancialTerms | undefined;
    const roi = analysis.roi as ROIAnalysis | undefined;

    if (totalValue && totalValue > 0) {confidence += 0.1;}
    if (paymentSchedule?.type && paymentSchedule.type !== 'unknown') {confidence += 0.1;}
    if (costBreakdown?.categories && Array.isArray(costBreakdown.categories) && costBreakdown.categories.length > 0) {confidence += 0.1;}
    if (financialTerms?.paymentTerms) {confidence += 0.1;}
    if (roi?.estimated !== undefined && roi.estimated !== 0) {confidence += 0.1;}

    return Math.min(1, confidence);
  }

  private determineApprovalLevel(value: number): string {
    if (value > 500000) {return 'C-suite';}
    if (value > 100000) {return 'VP';}
    if (value > 50000) {return 'Director';}
    if (value > 10000) {return 'Manager';}
    return 'Standard';
  }

  private calculateOverallRisk(risks: Array<{ type: string; severity: string; description: string }>): string {
    const highRisks = risks.filter((r: { severity: string }) => r.severity === 'high').length;
    const mediumRisks = risks.filter((r: { severity: string }) => r.severity === 'medium').length;

    if (highRisks > 1 || (highRisks === 1 && mediumRisks > 1)) {return 'high';}
    if (highRisks === 1 || mediumRisks > 2) {return 'medium';}
    return 'low';
  }
}