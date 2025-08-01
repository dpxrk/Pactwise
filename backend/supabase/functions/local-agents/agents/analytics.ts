import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import {
  AnalyticsAgentProcessData,
  AnalyticsAnalysis,
  ContractMetricsData,
  ProcessedContractMetrics,
  ContractSummary,
  ContractTrend,
  ContractOpportunity,
  VendorMetricsData,
  ProcessedVendorMetrics,
  VendorPerformance,
  VendorConcentrationMetrics,
  SpendingData,
  SpendingPattern,
  SpendingAnomaly,
  SpendingForecast,
  CategorySpendAnalysis,
  EnterpriseAnalyticsData,
  TimeSeriesData,
  EnterpriseRiskAssessment,
  StrategicOpportunity,
  VendorAnalyticsData,
  VendorRelationshipScore,
  BudgetForecast,
  BudgetOptimization,
  VendorBenchmark,
  VendorOptimization,
  SpendingAllocation,
  SpendingOptimization,
  ContractPrediction,
  VendorRisk,
  ExecutiveSummary,
} from '../../types/common/analytics';
import { ContractRisk } from '../../types/common/contract';

export class AnalyticsAgent extends BaseAgent {
  get agentType() {
    return 'analytics';
  }

  get capabilities() {
    return ['trend_analysis', 'insights_generation', 'predictions', 'recommendations', 'reporting', 'dashboard_analytics'];
  }

  async process(data: AnalyticsAgentProcessData, context?: AgentContext): Promise<ProcessingResult<AnalyticsAnalysis>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      // Check permissions if userId provided
      if (context?.userId) {
        const hasPermission = await this.checkUserPermission(context.userId, 'user');
        if (!hasPermission) {
          throw new Error('Insufficient permissions for analytics');
        }
      }

      // Create audit log
      await this.createAuditLog(
        'analytics_request',
        'analytics',
        data.analysisType || 'comprehensive',
        { agentType: this.agentType },
      );

      // Determine analysis type with context
      if (data.analysisType === 'contracts' || context?.contractId) {
        return await this.analyzeContractMetricsWithDB(data, context, rulesApplied, insights);
      } else if (data.analysisType === 'vendors' || context?.vendorId) {
        return await this.analyzeVendorMetricsWithDB(data, context, rulesApplied, insights);
      } else if (data.analysisType === 'budgets' || data.budgetId) {
        return await this.analyzeBudgetMetricsWithDB(data, context, rulesApplied, insights);
      } else if (data.analysisType === 'spending') {
        return await this.analyzeSpendingPatternsWithDB(data, context, rulesApplied, insights);
      }

      // Default comprehensive analysis
      return await this.performEnterpriseAnalytics(data, context, rulesApplied, insights);

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

  private async analyzeContractMetricsWithDB(
    data: { analysisType?: string; period?: string; lookback?: number },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<AnalyticsAnalysis>> {
    rulesApplied.push('contract_analytics_with_db');

    // Use database analytics function
    const analytics = await this.callDatabaseFunction('get_enterprise_analytics', {
      p_enterprise_id: this.enterpriseId,
      p_period: data.period || 'month',
      p_lookback: data.lookback || 12,
    });

    // Get contract-specific metrics
    const contractMetrics: ProcessedContractMetrics = await this.getCachedOrFetch(`contract_metrics_${this.enterpriseId}`, async () => {
      const { data: metrics } = await this.supabase
        .from('contracts')
        .select(`
          id,
          title,
          value,
          status,
          start_date,
          end_date,
          is_auto_renew,
          vendor:vendors!vendor_id(id, name, performance_score)
        `)
        .eq('enterprise_id', this.enterpriseId);

      return this.processContractMetrics(metrics || []);
    }, 300); // 5 min cache

    const analysis: AnalyticsAnalysis = {
      summary: this.generateContractSummary(contractMetrics),
      trends: this.identifyContractTrends(analytics.time_series?.contracts || []),
      risks: await this.identifyContractRisksWithDB(contractMetrics),
      opportunities: this.identifyContractOpportunities(contractMetrics),
      predictions: await this.predictContractMetricsWithDB(analytics),
      currentSnapshot: analytics.current_snapshot,
      recommendations: [],
    };

    // Generate insights from trends
    for (const trend of analysis.trends!) {
      if (trend.significance === 'high') {
        insights.push(this.createInsight(
          'contract_trend',
          trend.direction === 'negative' ? 'high' : 'medium',
          `${trend.name} Trend Detected`,
          trend.description,
          trend.recommendation,
          { trend },
        ));
        rulesApplied.push(`${trend.type}_trend_analysis`);
      }
    }

    // Risk insights
    for (const risk of analysis.risks! as ContractRisk[]) {
      if (risk.probability > 0.7) {
        insights.push(this.createInsight(
          'contract_risk',
          risk.severity,
          risk.title,
          risk.description,
          risk.mitigation,
          { risk },
        ));
      }
    }

    // Opportunity insights
    for (const opportunity of analysis.opportunities!) {
      if (opportunity.potential > 50000) {
        insights.push(this.createInsight(
          'cost_saving_opportunity',
          'medium',
          opportunity.title,
          `Potential savings of ${opportunity.potential.toLocaleString()}`,
          opportunity.action,
          { opportunity },
          true,
        ));
      }
    }

    // Contract expiration insights
    const expiringContracts = contractMetrics.expiringSoon || [];
    if (expiringContracts.length > 5) {
      insights.push(this.createInsight(
        'mass_expiration',
        'high',
        'Multiple Contracts Expiring',
        `${expiringContracts.length} contracts expire within 30 days`,
        'Begin renewal negotiations immediately',
        { contracts: expiringContracts.slice(0, 10) },
      ));
    }

    analysis.recommendations = this.generateContractRecommendations(analysis);

    // Store insights
    if (insights.length > 0) {
      await this.storeInsights(insights, undefined, undefined);
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.9,
    );
  }

  private async analyzeVendorMetricsWithDB(
    data: { analysisType?: string; vendorId?: string; startDate?: string; endDate?: string },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<AnalyticsAnalysis>> {
    rulesApplied.push('vendor_analytics_with_db');

    const vendorId = _context?.vendorId || data.vendorId;

    // If analyzing specific vendor
    if (vendorId) {
      const vendorAnalytics = await this.callDatabaseFunction('calculate_vendor_analytics', {
        p_vendor_id: vendorId,
        p_start_date: data.startDate,
        p_end_date: data.endDate,
      });

      const vendorScore = await this.callDatabaseFunction('calculate_vendor_relationship_score', {
        p_vendor_id: vendorId,
      });

      const analysis: AnalyticsAnalysis = {
        vendorId,
        analytics: vendorAnalytics as VendorAnalyticsData,
        relationshipScore: vendorScore as VendorRelationshipScore,
        recommendations: vendorScore.recommendations || [],
      };

      // Generate insights based on vendor score
      if (vendorScore.risk_level === 'high' || vendorScore.risk_level === 'critical') {
        insights.push(this.createInsight(
          'vendor_risk',
          vendorScore.risk_level,
          'High-Risk Vendor',
          `Vendor relationship score: ${vendorScore.overall_score}/1.0`,
          vendorScore.recommendations?.[0]?.action || 'Review vendor relationship',
          vendorScore,
        ));
      }

      return this.createResult(
        true,
        analysis,
        insights,
        rulesApplied,
        0.95,
      );
    }

    // Enterprise-wide vendor analytics
    const vendorMetrics: ProcessedVendorMetrics = await this.getCachedOrFetch(`vendor_metrics_${this.enterpriseId}`, async () => {
      const { data: vendors } = await this.supabase
        .from('vendors')
        .select(`
          *,
          contracts:contracts!vendor_id(count),
          total_spend:contracts!vendor_id(value.sum())
        `)
        .eq('enterprise_id', this.enterpriseId);

      return this.processVendorMetrics(vendors || []);
    }, 300);

    const analysis: AnalyticsAnalysis = {
      performance: await this.analyzeVendorPerformanceWithDB(vendorMetrics),
      concentration: this.analyzeVendorConcentration(vendorMetrics),
      risks: await this.assessVendorRisksWithDB(vendorMetrics),
      optimization: await this.identifyVendorOptimizationsWithDB(vendorMetrics),
      benchmarks: this.compareVendorBenchmarks(vendorMetrics),
    };

    // Performance insights
    const poorPerformers = analysis.performance!.filter((v: VendorPerformance) => v.score < 0.6);
    if (poorPerformers.length > 0) {
      insights.push(this.createInsight(
        'poor_vendor_performance',
        'high',
        'Underperforming Vendors Identified',
        `${poorPerformers.length} vendors are performing below acceptable thresholds`,
        'Review vendor relationships and consider alternatives',
        { vendors: poorPerformers },
      ));
      rulesApplied.push('performance_analysis');

      // Queue tasks for vendor review
      for (const vendor of poorPerformers.slice(0, 3)) {
        await this.queueVendorReviewTask(vendor.id);
      }
    }

    // Concentration risk
    if (analysis.concentration!.riskLevel === 'high') {
      insights.push(this.createInsight(
        'vendor_concentration_risk',
        'high',
        'High Vendor Concentration Risk',
        analysis.concentration!.description,
        'Diversify vendor base to reduce dependency',
        analysis.concentration!,
      ));
      rulesApplied.push('concentration_analysis');
    }

    // Optimization opportunities
    for (const opt of analysis.optimization!) {
      if (opt.savingsPotential > 25000) {
        insights.push(this.createInsight(
          'vendor_optimization',
          'medium',
          opt.title,
          opt.description,
          opt.action,
          { optimization: opt },
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

  private async analyzeBudgetMetricsWithDB(
    data: { budgetId?: string; monthsAhead?: number; optimizationTarget?: string },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<AnalyticsAnalysis>> {
    rulesApplied.push('budget_analytics_with_db');

    const { budgetId } = data;

    if (budgetId) {
      // Analyze specific budget
      const forecast = await this.callDatabaseFunction('forecast_budget_usage', {
        p_budget_id: budgetId,
        p_months_ahead: data.monthsAhead || 3,
      });

      const analysis: AnalyticsAnalysis = {
        budgetId,
        forecast: forecast as BudgetForecast,
        recommendations: this.generateBudgetRecommendations(forecast),
      };

      // Budget depletion warning
      if (forecast.forecast?.months_until_depletion && forecast.forecast.months_until_depletion < 2) {
        insights.push(this.createInsight(
          'budget_depletion',
          'critical',
          'Budget Depletion Imminent',
          `Budget will be depleted in ${forecast.forecast.months_until_depletion} months at current rate`,
          forecast.recommendations?.[0] || 'Reduce spending immediately',
          forecast,
        ));
      }

      return this.createResult(
        true,
        analysis,
        insights,
        rulesApplied,
        0.9,
      );
    }

    // Enterprise-wide budget optimization
    const optimization = await this.callDatabaseFunction('optimize_budget_allocation', {
      p_enterprise_id: this.enterpriseId,
      p_optimization_target: data.optimizationTarget || 'efficiency',
    });

    const analysis: AnalyticsAnalysis = {
      optimization: optimization as BudgetOptimization,
      currentAllocations: optimization.current_allocations,
      recommendations: optimization.recommendations || [],
    };

    // Process optimization recommendations
    for (const rec of optimization.recommendations || []) {
      if (rec.action === 'increase_allocation' && rec.amount > 50000) {
        insights.push(this.createInsight(
          'budget_reallocation',
          'medium',
          'Budget Reallocation Opportunity',
          `Increase ${rec.budget_name} allocation by ${rec.amount.toLocaleString()}`,
          rec.reason,
          rec,
        ));
      } else if (rec.action === 'reduce_allocation') {
        insights.push(this.createInsight(
          'budget_reduction',
          'medium',
          'Budget Reduction Recommended',
          `Reduce ${rec.budget_name} allocation by ${rec.amount.toLocaleString()}`,
          rec.reason,
          rec,
        ));
      }
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.88,
    );
  }

  private async analyzeSpendingPatternsWithDB(
    _data: {},
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<AnalyticsAnalysis>> {
    rulesApplied.push('spending_analytics_with_db');

    // Get spending data from budget allocations and contracts
    const spendData: SpendingData = await this.getCachedOrFetch(`spending_${this.enterpriseId}`, async () => {
      const { data: allocations } = await this.supabase
        .from('contract_budget_allocations')
        .select(`
          *,
          contract:contracts!contract_id(*),
          budget:budgets!budget_id(*)
        `)
        .eq('enterprise_id', this.enterpriseId)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      return this.processSpendingData(allocations || []);
    }, 300);

    const analysis: AnalyticsAnalysis = {
      patterns: this.identifySpendingPatterns(spendData),
      anomalies: await this.detectSpendingAnomaliesWithDB(spendData),
      forecast: await this.forecastSpendingWithDB(spendData),
      optimization: this.identifySpendingOptimizations(spendData),
      categoryAnalysis: this.analyzeCategorySpend(spendData),
    };

    // Anomaly detection
    for (const anomaly of analysis.anomalies!) {
      if (anomaly.severity === 'high') {
        insights.push(this.createInsight(
          'spending_anomaly',
          'high',
          `Unusual Spending Pattern: ${anomaly.type}`,
          anomaly.description,
          'Investigate and verify legitimacy',
          { anomaly },
        ));
        rulesApplied.push('anomaly_detection');
      }
    }

    // Forecast insights
    if (analysis.forecast!.projectedOverrun > 0) {
      insights.push(this.createInsight(
        'budget_overrun_forecast',
        'critical',
        'Budget Overrun Projected',
        `Current trends project ${analysis.forecast!.projectedOverrun}% budget overrun`,
        'Implement immediate cost controls',
        analysis.forecast!,
      ));
      rulesApplied.push('predictive_analytics');
    }

    // Category insights
    for (const category of analysis.categoryAnalysis!) {
      if (category.growthRate > 20) {
        insights.push(this.createInsight(
          'rapid_category_growth',
          'medium',
          `Rapid Growth in ${category.name}`,
          `Spending increased ${category.growthRate}% year-over-year`,
          'Review category spend for optimization',
          { category },
        ));
      }
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.88,
    );
  }

  private async performEnterpriseAnalytics(
    data: { period?: string; lookback?: number },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<AnalyticsAnalysis>> {
    rulesApplied.push('enterprise_analytics_with_db');

    // Get comprehensive enterprise analytics
    const analytics: EnterpriseAnalyticsData = await this.callDatabaseFunction('get_enterprise_analytics', {
      p_enterprise_id: this.enterpriseId,
      p_period: data.period || 'month',
      p_lookback: data.lookback || 12,
    });

    // Get enterprise risk assessment
    const riskAssessment: EnterpriseRiskAssessment = await this.callDatabaseFunction('assess_enterprise_risk', {
      p_enterprise_id: this.enterpriseId,
      p_risk_categories: ['financial', 'compliance', 'operational', 'vendor', 'contractual'],
    });

    const analysis: AnalyticsAnalysis = {
      executiveSummary: this.generateExecutiveSummaryWithDB(analytics),
      keyMetrics: analytics.current_snapshot,
      trends: analytics.trends,
      risks: riskAssessment,
      opportunities: await this.identifyStrategicOpportunitiesWithDB(analytics),
      recommendations: this.generateStrategicRecommendations(analytics),
      timeSeries: analytics.time_series,
    };

    // Risk insights
    if (riskAssessment.risk_level === 'critical' || riskAssessment.risk_level === 'high') {
      insights.push(this.createInsight(
        'enterprise_risk',
        riskAssessment.risk_level,
        'High Enterprise Risk Level',
        `Overall risk score: ${riskAssessment.overall_risk_score}`,
        'Review and address risk factors immediately',
        riskAssessment,
      ));

      // Create mitigation tasks
      for (const action of riskAssessment.mitigation_actions || []) {
        if (action.priority === 'critical' || action.priority === 'high') {
          await this.queueMitigationTask(action);
        }
      }
    }

    // Growth insights
    if (analytics.trends?.contract_growth > 20) {
      insights.push(this.createInsight(
        'rapid_growth',
        'medium',
        'Rapid Contract Growth',
        `Contract volume growing at ${analytics.trends.contract_growth}%`,
        'Ensure systems and processes can scale',
        { growth: analytics.trends.contract_growth },
      ));
    }

    // AI utilization insights
    if (analytics.current_snapshot?.ai_utilization) {
      const aiMetrics = analytics.current_snapshot.ai_utilization;
      if (aiMetrics.ai_tasks_processed > 1000) {
        insights.push(this.createInsight(
          'ai_efficiency',
          'low',
          'High AI System Utilization',
          `Processed ${aiMetrics.ai_tasks_processed} AI tasks with ${(aiMetrics.avg_confidence_score * 100).toFixed(0)}% average confidence`,
          'Continue leveraging AI for efficiency gains',
          aiMetrics,
          false,
        ));
      }
    }

    // Top insights from analysis
    const topInsights = await this.prioritizeInsightsWithDB(analytics, riskAssessment);
    for (const insight of topInsights.slice(0, 3)) {
      insights.push(insight);
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.92,
    );
  }

  // Analytics query methods (simulate database queries)
  // @ts-ignore - Unused method kept for future implementation
  private async executeContractQueries(): Promise<{
    totalContracts: number;
    activeContracts: number;
    totalValue: number;
    avgContractValue: number;
    expiringNext30Days: number;
    highValueContracts: number;
    contractsByType: { type: string; count: number; value: number }[];
    monthlyTrend: { month: string; new: number; expired: number; value: number }[];
  }> {
    // @ts-ignore - Method kept for future implementation
    // In real implementation, these would be actual database queries
    return {
      totalContracts: 150,
      activeContracts: 120,
      totalValue: 5000000,
      avgContractValue: 41667,
      expiringNext30Days: 15,
      highValueContracts: 12,
      contractsByType: [
        { type: 'service_agreement', count: 60, value: 2500000 },
        { type: 'software_license', count: 30, value: 1500000 },
        { type: 'consulting', count: 20, value: 800000 },
        { type: 'other', count: 40, value: 200000 },
      ],
      monthlyTrend: [
        { month: '2024-01', new: 10, expired: 5, value: 400000 },
        { month: '2024-02', new: 12, expired: 3, value: 500000 },
        { month: '2024-03', new: 15, expired: 8, value: 600000 },
        { month: '2024-04', new: 8, expired: 10, value: 350000 },
        { month: '2024-05', new: 20, expired: 5, value: 800000 },
        { month: '2024-06', new: 18, expired: 7, value: 750000 },
      ],
    };
  }

  // @ts-ignore - Unused method kept for future implementation
  private async executeVendorQueries(): Promise<{
    totalVendors: number;
    activeVendors: number;
    vendorsByCategory: { category: string; count: number; spend: number }[];
    vendorPerformance: { vendorId: string; name: string; score: number; spend: number; issues: number }[];
    concentrationMetrics: {
      top5VendorsSpend: number;
      totalSpend: number;
      herfindahlIndex: number;
    };
  }> {
    return {
      totalVendors: 75,
      activeVendors: 60,
      vendorsByCategory: [
        { category: 'technology', count: 25, spend: 2000000 },
        { category: 'consulting', count: 15, spend: 1200000 },
        { category: 'facilities', count: 10, spend: 500000 },
        { category: 'marketing', count: 8, spend: 400000 },
        { category: 'other', count: 17, spend: 900000 },
      ],
      vendorPerformance: [
        { vendorId: 'v1', name: 'TechCorp', score: 0.85, spend: 500000, issues: 2 },
        { vendorId: 'v2', name: 'ConsultPro', score: 0.45, spend: 300000, issues: 8 },
        { vendorId: 'v3', name: 'CloudServices', score: 0.92, spend: 800000, issues: 0 },
        { vendorId: 'v4', name: 'MarketingInc', score: 0.55, spend: 200000, issues: 5 },
      ],
      concentrationMetrics: {
        top5VendorsSpend: 3000000,
        totalSpend: 5000000,
        herfindahlIndex: 0.28,
      },
    };
  }

  // @ts-ignore - Unused method kept for future implementation
  private async executeSpendingQueries(): Promise<SpendingData> {
    return {
      monthlySpend: [
        { month: '2024-01', actual: 380000, budget: 400000 },
        { month: '2024-02', actual: 420000, budget: 400000 },
        { month: '2024-03', actual: 450000, budget: 400000 },
        { month: '2024-04', actual: 390000, budget: 400000 },
        { month: '2024-05', actual: 480000, budget: 400000 },
        { month: '2024-06', actual: 520000, budget: 400000 },
      ],
      categorySpend: [
        { category: 'Software', ytd: 1200000, lastYear: 900000, budget: 1100000 },
        { category: 'Consulting', ytd: 800000, lastYear: 700000, budget: 850000 },
        { category: 'Hardware', ytd: 300000, lastYear: 250000, budget: 280000 },
        { category: 'Marketing', ytd: 400000, lastYear: 300000, budget: 350000 },
        { category: 'Facilities', ytd: 500000, lastYear: 480000, budget: 520000 },
      ],
      unusualTransactions: [
        { date: '2024-05-15', amount: 150000, vendor: 'NewVendor', category: 'Software', zscore: 3.2 },
        { date: '2024-06-02', amount: 80000, vendor: 'ConsultPro', category: 'Consulting', zscore: 2.8 },
      ],
    };
  }

  // NOTE: Removed unused method gatherAllMetrics - can be restored if needed

  // Analysis methods
  private generateContractSummary(metrics: ProcessedContractMetrics): ContractSummary {
    const utilizationRate = metrics.active / metrics.total;
    const avgMonthlyValue = metrics.totalValue / 12;
    const renewalRate = this.calculateRenewalRate(metrics.monthlyTrend);

    return {
      totalActive: metrics.active,
      totalValue: metrics.totalValue,
      avgValue: metrics.avgValue,
      utilizationRate,
      avgMonthlyValue,
      renewalRate,
      expiringCount: metrics.expiringSoon.length,
      topCategory: Object.keys(metrics.byStatus).reduce((a, b) => metrics.byStatus[a] > metrics.byStatus[b] ? a : b),
    };
  }

  private identifyContractTrends(monthlyData: { month: string; new: number; expired: number; value: number }[]): ContractTrend[] {
    const trends: ContractTrend[] = [];

    // Volume trend
    const volumeTrend = this.calculateTrend(monthlyData.map((m: { new: number }) => m.new));
    if (Math.abs(volumeTrend) > 0.1) {
      trends.push({
        name: 'Contract Volume',
        type: 'volume',
        direction: volumeTrend > 0 ? 'positive' : 'negative',
        rate: Math.abs(volumeTrend),
        significance: Math.abs(volumeTrend) > 0.2 ? 'high' : 'medium',
        description: `Contract volume is ${volumeTrend > 0 ? 'increasing' : 'decreasing'} at ${(Math.abs(volumeTrend) * 100).toFixed(1)}% per month`,
        recommendation: volumeTrend < -0.2 ? 'Investigate causes of declining contract volume' : null,
      });
    }

    // Value trend
    const valueTrend = this.calculateTrend(monthlyData.map((m: { value: number }) => m.value));
    if (Math.abs(valueTrend) > 0.1) {
      trends.push({
        name: 'Contract Value',
        type: 'value',
        direction: valueTrend > 0 ? 'positive' : 'negative',
        rate: Math.abs(valueTrend),
        significance: Math.abs(valueTrend) > 0.15 ? 'high' : 'medium',
        description: `Average contract value is ${valueTrend > 0 ? 'increasing' : 'decreasing'} at ${(Math.abs(valueTrend) * 100).toFixed(1)}% per month`,
        recommendation: valueTrend > 0.3 ? 'Review budget allocation and spending controls' : null,
      });
    }

    return trends;
  }

  // NOTE: Removed unused method identifyContractRisks - can be restored if needed

  private identifyContractOpportunities(metrics: ProcessedContractMetrics): ContractOpportunity[] {
    const opportunities: ContractOpportunity[] = [];

    // Consolidation opportunity
    const categoryData = metrics.byStatus;
    for (const category in categoryData) {
      if (categoryData[category] > 20) {
        const potentialSaving = (metrics.totalValue / metrics.total) * categoryData[category] * 0.1; // Assume 10% saving from consolidation
        opportunities.push({
          type: 'consolidation',
          title: `Consolidate ${category} contracts`,
          description: `${categoryData[category]} separate ${category} contracts could be consolidated`,
          potential: potentialSaving,
          effort: 'medium',
          action: `Review all ${category} contracts for consolidation opportunities`,
        });
      }
    }

    return opportunities;
  }

  // NOTE: Removed unused method predictContractMetrics - can be restored if needed

  private generateContractRecommendations(analysis: AnalyticsAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.summary!.expiringCount > 10) {
      recommendations.push('Create automated renewal tracking system');
    }

    if (analysis.trends!.some((t: ContractTrend) => t.type === 'value' && t.direction === 'negative')) {
      recommendations.push('Investigate declining contract values and adjust pricing strategy');
    }

    if (analysis.risks!.some((r: ContractRisk) => r.type === 'value_concentration')) {
      recommendations.push('Implement contract value limits and approval workflows');
    }

    if (analysis.opportunities!.length > 0) {
      recommendations.push('Prioritize contract consolidation initiatives');
    }

    return recommendations;
  }

  // Vendor analysis methods
  // NOTE: Removed unused method analyzeVendorPerformance - can be restored if needed

  private analyzeVendorConcentration(_metrics: ProcessedVendorMetrics): VendorConcentrationMetrics {
    const concentrationRatio = _metrics.concentrationMetrics.top5VendorsSpend / _metrics.concentrationMetrics.totalSpend;
    const hhi = _metrics.concentrationMetrics.herfindahlIndex;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (concentrationRatio > 0.7 || hhi > 0.25) {riskLevel = 'high';}
    else if (concentrationRatio > 0.5 || hhi > 0.15) {riskLevel = 'medium';}

    return {
      concentrationRatio,
      herfindahlIndex: hhi,
      riskLevel,
      description: `Top 5 vendors account for ${(concentrationRatio * 100).toFixed(1)}% of total spend`,
      recommendation: riskLevel === 'high' ? 'Diversify vendor base to reduce concentration risk' : null,
      totalSpend: _metrics.concentrationMetrics.totalSpend,
      top5VendorsSpend: _metrics.concentrationMetrics.top5VendorsSpend,
    };
  }

  // NOTE: Removed unused method assessVendorRisks - can be restored if needed

  // NOTE: Removed unused method identifyVendorOptimizations - can be restored if needed

  private compareVendorBenchmarks(_metrics: ProcessedVendorMetrics): VendorBenchmark {
    // Simple benchmark comparison
    return {
      vendorCount: {
        current: _metrics.total,
        benchmark: 50,
        status: _metrics.total > 50 ? 'above' : 'at',
      },
      avgSpendPerVendor: {
        current: _metrics.concentrationMetrics.totalSpend / _metrics.active,
        benchmark: 100000,
        status: 'normal',
      },
    };
  }

  // Spending analysis methods
  private identifySpendingPatterns(_spendData: SpendingData): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];

    // Seasonal pattern
    const monthlyAmounts = (_spendData.monthlySpend || []).map((m) => m.actual);
    const seasonality = this.detectSeasonality(monthlyAmounts);
    if (seasonality.detected) {
      patterns.push({
        type: 'seasonal',
        description: 'Spending shows seasonal variation',
        details: seasonality,
      });
    }

    // Growth pattern
    const growthRate = this.calculateTrend(monthlyAmounts);
    patterns.push({
      type: 'growth',
      description: `Spending is ${growthRate > 0 ? 'increasing' : 'decreasing'} at ${Math.abs(growthRate * 100).toFixed(1)}% monthly`,
      rate: growthRate,
    });

    return patterns;
  }

  // NOTE: Removed unused method detectSpendingAnomalies - can be restored if needed

  // @ts-ignore - Unused method kept for future implementation
  private forecastSpending(_spendData: SpendingData): SpendingForecast {
    const monthlyAmounts = (_spendData.monthlySpend || []).map((m) => m.actual);
    const trend = this.calculateTrend(monthlyAmounts);
    const avgMonthly = monthlyAmounts.reduce((a: number, b: number) => a + b, 0) / monthlyAmounts.length;

    const remainingMonths = 6;
    const projectedTotal = avgMonthly * (1 + trend) * remainingMonths;
    const budgetTotal = 400000 * remainingMonths; // Assuming consistent budget

    const projectedOverrun = ((projectedTotal - budgetTotal) / budgetTotal) * 100;

    return {
      projectedMonthlyAvg: avgMonthly * (1 + trend),
      projectedTotal,
      budgetTotal,
      projectedOverrun,
      confidence: 0.7,
      trend: trend > 0 ? 'increasing' : 'decreasing',
      trendRate: Math.abs(trend * 100),
    };
  }

  private identifySpendingOptimizations(_spendData: SpendingData): SpendingOptimization[] {
    const optimizations: SpendingOptimization[] = [];

    // Category optimization
    for (const category of _spendData.categorySpend) {
      const growthRate = (category.ytd - category.lastYear) / category.lastYear;
      if (growthRate > 0.2) {
        optimizations.push({
          type: 'category_growth',
          category: category.category,
          description: `${category.category} spending increased ${(growthRate * 100).toFixed(1)}%`,
          action: `Review ${category.category} contracts for cost reduction`,
          potential: category.ytd * 0.1,
        });
      }
    }

    return optimizations;
  }

  private analyzeCategorySpend(_spendData: SpendingData): CategorySpendAnalysis[] {
    return (_spendData.categorySpend || []).map((category) => {
      const growthRate = ((category.ytd - category.lastYear) / category.lastYear) * 100;
      const budgetVariance = ((category.ytd - category.budget) / category.budget) * 100;

      return {
        name: category.category,
        ytdSpend: category.ytd,
        growthRate,
        budgetVariance,
        status: budgetVariance > 10 ? 'over' : budgetVariance < -10 ? 'under' : 'on-track',
      };
    });
  }

  // Comprehensive analysis methods
  // NOTE: Removed unused method generateExecutiveSummary - can be restored if needed

  // NOTE: Removed unused method calculateKeyMetrics - can be restored if needed

  // NOTE: Removed unused method identifyGlobalTrends - can be restored if needed

  // NOTE: Removed unused method assessOverallRisks - can be restored if needed

  // NOTE: Removed unused method identifyStrategicOpportunities - can be restored if needed

  private generateStrategicRecommendations(_analytics: EnterpriseAnalyticsData): string[] {
    const recommendations: string[] = [];

    recommendations.push('Implement vendor performance scorecards');
    recommendations.push('Establish category-specific spending limits');
    recommendations.push('Create automated contract renewal alerts');
    recommendations.push('Develop vendor consolidation roadmap');

    return recommendations;
  }

  // NOTE: Removed unused method prioritizeInsights - can be restored if needed

  // Utility methods
  private calculateTrend(values: number[]): number {
    if (values.length < 2) {return 0;}

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    return avgY > 0 ? slope / avgY : 0;
  }

  private calculateRenewalRate(monthlyTrend: { new: number; expired: number }[]): number {
    let totalExpired = 0;
    let totalRenewed = 0;

    for (let i = 1; i < monthlyTrend.length; i++) {
      totalExpired += monthlyTrend[i - 1].expired;
      // Assume some portion of new contracts are renewals
      totalRenewed += Math.min(monthlyTrend[i].new, monthlyTrend[i - 1].expired) * 0.7;
    }

    return totalExpired > 0 ? totalRenewed / totalExpired : 0;
  }

  private detectSeasonality(values: number[]): { detected: boolean; variation?: number; pattern?: string | null } {
    // Simple seasonality detection
    if (values.length < 4) {return { detected: false };}

    const quarters = [];
    for (let i = 0; i < values.length - 2; i += 3) {
      quarters.push((values[i] + values[i + 1] + values[i + 2]) / 3);
    }

    const variation = Math.max(...quarters) / Math.min(...quarters);

    return {
      detected: variation > 1.2,
      variation,
      pattern: variation > 1.2 ? 'quarterly' : null,
    };
  }

  private calculateVendorRating(vendor: { score: number }): string {
    if (vendor.score >= 0.8) {return 'A';}
    if (vendor.score >= 0.7) {return 'B';}
    if (vendor.score >= 0.6) {return 'C';}
    if (vendor.score >= 0.5) {return 'D';}
    return 'F';
  }

  private getVendorRecommendations(vendor: { score: number; issues: number }): string[] {
    const recommendations: string[] = [];

    if (vendor.score < 0.6) {
      recommendations.push('Schedule performance review meeting');
      recommendations.push('Develop improvement plan');
    }

    if (vendor.issues > 5) {
      recommendations.push('Implement corrective action plan');
    }

    return recommendations;
  }

  // @ts-ignore - Unused method kept for future implementation
  private calculateVendorEfficiency(_vendorMetrics: ProcessedVendorMetrics): number {
    const avgSpendPerVendor = _vendorMetrics.concentrationMetrics.totalSpend / _vendorMetrics.active;
    const benchmark = 100000;

    return Math.min(1, benchmark / avgSpendPerVendor);
  }

  private calculateBudgetAdherence(_spendingMetrics: SpendingData): number {
    let totalActual = 0;
    let totalBudget = 0;

    for (const month of _spendingMetrics.monthlySpend) {
      totalActual += month.actual;
      totalBudget += month.budget;
    }

    const variance = Math.abs(totalActual - totalBudget) / totalBudget;
    return Math.max(0, 1 - variance);
  }

  // @ts-ignore - Unused method kept for future implementation
  private summarizeRisks(_metrics: { vendors: ProcessedVendorMetrics; spending: SpendingData }): string[] {
    const risks: string[] = [];

    if (_metrics.vendors.concentrationMetrics.herfindahlIndex > 0.25) {
      risks.push('High vendor concentration');
    }

    const budgetVariance = this.calculateBudgetAdherence(_metrics.spending);
    if (budgetVariance < 0.8) {
      risks.push('Poor budget adherence');
    }

    return risks;
  }

  // @ts-ignore - Unused method kept for future implementation
  private summarizeOpportunities(_metrics: { contracts: ProcessedContractMetrics; vendors: ProcessedVendorMetrics }): string[] {
    const opportunities: string[] = [];

    if (_metrics.contracts.byStatus && Object.values(_metrics.contracts.byStatus).some((count) => (count as number) > 20)) {
      opportunities.push('Contract consolidation potential');
    }

    if (_metrics.vendors.byCategory && _metrics.vendors.byCategory.some((c: { count: number }) => c.count > 5)) {
      opportunities.push('Vendor rationalization opportunity');
    }

    return opportunities;
  }

  // New database-integrated methods
  private processContractMetrics(contracts: ContractMetricsData[]): ProcessedContractMetrics {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const metrics = {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'active').length,
      totalValue: contracts.reduce((sum, c) => sum + (c.value || 0), 0),
      avgValue: contracts.length > 0 ? contracts.reduce((sum, c) => sum + (c.value || 0), 0) / contracts.length : 0,
      expiringSoon: contracts.filter(c => {
        const endDate = new Date(c.end_date);
        return endDate > now && endDate <= thirtyDaysFromNow;
      }),
      autoRenewCount: contracts.filter(c => c.is_auto_renew).length,
      byVendor: this.groupByVendor(contracts),
      byStatus: this.groupByStatus(contracts),
      monthlyTrend: [], // This needs to be populated from actual data or removed if not used
    };

    return metrics;
  }

  private processVendorMetrics(vendors: VendorMetricsData[]): ProcessedVendorMetrics {
    const metrics = {
      total: vendors.length,
      active: vendors.filter(v => v.is_active).length,
      byCategory: this.groupByCategory(vendors),
      byPerformance: vendors.map(v => ({
        id: v.id,
        name: v.name,
        score: v.performance_score || 0,
        contractCount: v.contracts?.[0]?.count || 0,
        totalSpend: v.total_spend?.[0]?.sum || 0,
      })),
      concentrationMetrics: this.calculateConcentrationMetrics(vendors),
    };

    return metrics;
  }

  private processSpendingData(allocations: SpendingAllocation[]): SpendingData {
    const monthlySpend = this.aggregateByMonth(allocations);
    const categorySpend = this.aggregateByCategory(allocations);

    return {
      monthlySpend,
      categorySpend,
      totalSpend: allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0),
      avgTransaction: allocations.length > 0 ?
        allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0) / allocations.length : 0,
      unusualTransactions: allocations.filter(a => a.allocated_amount > 50000),
    };
  }

  private async identifyContractRisksWithDB(metrics: ProcessedContractMetrics): Promise<ContractRisk[]> {
    const risks: ContractRisk[] = [];

    // Expiration concentration risk
    const expirationRate = metrics.expiringSoon.length / metrics.active;
    if (expirationRate > 0.1) {
      risks.push({
        type: 'expiration_concentration',
        title: 'High Contract Expiration Rate',
        description: `${(expirationRate * 100).toFixed(1)}% of contracts expire within 30 days`,
        probability: 0.9,
        impact: 'high',
        severity: 'high',
        mitigation: 'Begin renewal negotiations immediately for critical contracts',
        contracts: metrics.expiringSoon.slice(0, 5),
      });
    }

    // Auto-renewal risk
    const autoRenewRate = metrics.autoRenewCount / metrics.total;
    if (autoRenewRate > 0.3) {
      risks.push({
        type: 'auto_renewal',
        title: 'High Auto-Renewal Exposure',
        description: `${(autoRenewRate * 100).toFixed(1)}% of contracts have auto-renewal`,
        probability: 0.8,
        impact: 'medium',
        severity: 'medium',
        mitigation: 'Review auto-renewal terms and set calendar reminders',
      });
    }

    return risks;
  }

  private async predictContractMetricsWithDB(analytics: EnterpriseAnalyticsData): Promise<ContractPrediction> {
    const timeSeries = analytics.time_series?.contracts || [];
    if (timeSeries.length < 3) {
      return { confidence: 0.5, message: 'Insufficient data for prediction' };
    }

    // Simple trend projection
    const trend = this.calculateTrend(timeSeries.map((t: TimeSeriesData) => t.contract_value || 0));
    const lastPeriod = timeSeries[timeSeries.length - 1];

    return {
      nextPeriod: {
        expectedContracts: Math.round(lastPeriod.contracts_created * (1 + trend)),
        expectedValue: lastPeriod.contract_value * (1 + trend),
      },
      trend: trend > 0 ? 'growth' : 'decline',
      trendRate: Math.abs(trend * 100),
      confidence: 0.75,
    };
  }

  private async analyzeVendorPerformanceWithDB(metrics: ProcessedVendorMetrics): Promise<VendorPerformance[]> {
    const performance = metrics.byPerformance || [];

    return performance.map((vendor: {id: string; name: string; score: number; totalSpend: number}) => ({
      ...vendor,
      rating: this.calculateVendorRating(vendor),
      recommendations: this.getVendorRecommendations(vendor),
      riskLevel: vendor.score < 0.5 ? 'high' : vendor.score < 0.7 ? 'medium' : 'low',
    }));
  }

  private async assessVendorRisksWithDB(metrics: ProcessedVendorMetrics): Promise<VendorRisk[]> {
    const risks: VendorRisk[] = [];

    // Performance risk
    const poorPerformers = metrics.byPerformance.filter((v) => v.score < 0.6);
    if (poorPerformers.length > 0) {
      risks.push({
        type: 'performance',
        severity: 'medium',
        vendors: poorPerformers.map((v) => v.name),
        impact: poorPerformers.reduce((sum: number, v) => sum + v.totalSpend, 0),
        description: `${poorPerformers.length} vendors performing below threshold`,
      });
    }

    // Concentration risk
    if (metrics.concentrationMetrics.herfindahlIndex > 0.25) {
      risks.push({
        type: 'concentration',
        severity: 'high',
        description: 'High vendor concentration detected',
        hhi: metrics.concentrationMetrics.herfindahlIndex,
      });
    }

    return risks;
  }

  private async identifyVendorOptimizationsWithDB(metrics: ProcessedVendorMetrics): Promise<VendorOptimization[]> {
    const optimizations: VendorOptimization[] = [];

    // Category consolidation
    for (const category of metrics.byCategory || []) {
      if (category.count > 5) {
        const potentialSaving = category.totalSpend * 0.15;
        optimizations.push({
          type: 'consolidation',
          title: `Consolidate ${category.category} vendors`,
          description: `Reduce ${category.count} vendors to 2-3 preferred partners`,
          savingsPotential: potentialSaving,
          action: 'Conduct vendor rationalization exercise',
          category: category.category,
        });
      }
    }

    return optimizations;
  }

  private async detectSpendingAnomaliesWithDB(spendData: SpendingData): Promise<SpendingAnomaly[]> {
    const anomalies: SpendingAnomaly[] = [];

    // Large transaction anomalies
    const { avgTransaction } = spendData;
    const threshold = avgTransaction * 3; // 3x average

    for (const transaction of spendData.unusualTransactions) {
      if (transaction.amount > threshold) {
        const zscore = (transaction.amount - avgTransaction) / (avgTransaction * 0.5);
        anomalies.push({
          type: 'large_transaction',
          severity: zscore > 4 ? 'high' : 'medium',
          description: `Unusually large allocation: ${transaction.amount.toLocaleString()}`,
          transaction,
          zscore,
        });
      }
    }

    return anomalies;
  }

  private async forecastSpendingWithDB(spendData: SpendingData): Promise<SpendingForecast> {
    const monthlyAmounts = (spendData.monthlySpend || []).map((m) => (m as {total: number}).total || m.actual || 0);
    const trend = this.calculateTrend(monthlyAmounts);
    const avgMonthly = monthlyAmounts.reduce((a: number, b: number) => a + b, 0) / monthlyAmounts.length;

    const projectedMonthly = avgMonthly * (1 + trend);
    const annualProjection = projectedMonthly * 12;

    // Assume we have budget data
    const annualBudget = avgMonthly * 12 * 1.1; // 10% above historical average
    const projectedOverrun = ((annualProjection - annualBudget) / annualBudget) * 100;

    return {
      projectedMonthlyAvg: projectedMonthly,
      annualProjection,
      annualBudget,
      projectedOverrun,
      trend: trend > 0 ? 'increasing' : 'decreasing',
      trendRate: Math.abs(trend * 100),
      confidence: 0.7,
    };
  }

  private generateExecutiveSummaryWithDB(analytics: EnterpriseAnalyticsData): ExecutiveSummary {
    const snapshot = analytics.current_snapshot || {};
    const trends = analytics.trends || {};

    return {
      totalContractValue: snapshot.total_contract_value || 0,
      activeContracts: snapshot.active_contracts || 0,
      totalVendors: snapshot.total_vendors || 0,
      complianceRate: snapshot.compliance_rate || 0,
      contractGrowth: trends.contract_growth || 0,
      vendorPerformanceTrend: trends.vendor_performance_trend || 0,
      keyHighlight: this.generateKeyHighlight(analytics),
    };
  }

  private async identifyStrategicOpportunitiesWithDB(analytics: EnterpriseAnalyticsData): Promise<StrategicOpportunity[]> {
    const opportunities: StrategicOpportunity[] = [];

    // Contract consolidation opportunity
    if (analytics.current_snapshot?.active_contracts > 100) {
      opportunities.push({
        type: 'consolidation',
        area: 'contracts',
        potential: analytics.current_snapshot.total_contract_value * 0.1,
        description: 'Consolidate similar contracts across vendors',
        effort: 'high',
        timeline: '6 months',
        confidence: 0.8,
      });
    }

    // Vendor optimization
    if (analytics.current_snapshot?.total_vendors > 50) {
      opportunities.push({
        type: 'vendor_optimization',
        area: 'vendors',
        potential: analytics.current_snapshot.total_contract_value * 0.15,
        description: 'Optimize vendor portfolio through strategic partnerships',
        effort: 'medium',
        timeline: '3 months',
        confidence: 0.75,
      });
    }

    return opportunities;
  }

  private async prioritizeInsightsWithDB(analytics: EnterpriseAnalyticsData, _riskAssessment: EnterpriseRiskAssessment): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Budget risk
    if (analytics.trends?.contract_growth > 30) {
      insights.push(this.createInsight(
        'rapid_spend_growth',
        'high',
        'Rapid Spending Growth',
        `Spending growing at ${analytics.trends.contract_growth}% rate`,
        'Review spending controls and approval limits',
        { growth: analytics.trends.contract_growth },
      ));
    }

    // Compliance risk
    if (analytics.current_snapshot?.compliance_rate < 80) {
      insights.push(this.createInsight(
        'compliance_gap',
        'critical',
        'Compliance Gap Detected',
        `Only ${analytics.current_snapshot.compliance_rate}% compliance rate`,
        'Immediate compliance review required',
        { complianceRate: analytics.current_snapshot.compliance_rate },
      ));
    }

    return insights.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private async queueVendorReviewTask(vendorId: string): Promise<void> {
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('type', 'vendor')
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (agent) {
      await this.supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'vendor_review',
          priority: 7,
          payload: {
            vendorId,
            reason: 'poor_performance',
          },
          vendor_id: vendorId,
          enterprise_id: this.enterpriseId,
        });
    }
  }

  private async queueMitigationTask(action: { priority: string; category: string }): Promise<void> {
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('type', 'manager')
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (agent) {
      await this.supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'risk_mitigation',
          priority: action.priority === 'critical' ? 10 : 8,
          payload: {
            action,
            category: action.category,
          },
          enterprise_id: this.enterpriseId,
        });
    }
  }

  private generateBudgetRecommendations(forecast: BudgetForecast): string[] {
    const recommendations: string[] = [];

    if (forecast.recommendations) {
      recommendations.push(...forecast.recommendations);
    }

    if (forecast.forecast?.months_until_depletion < 3) {
      recommendations.push('Consider budget increase or spending freeze');
    }

    if (forecast.budget?.utilization_percentage > 90) {
      recommendations.push('Budget nearly exhausted - careful monitoring required');
    }

    return recommendations;
  }

  private generateKeyHighlight(analytics: EnterpriseAnalyticsData): string {
    const snapshot = analytics.current_snapshot || {};

    if (snapshot.compliance_rate < 80) {
      return `Compliance rate at ${snapshot.compliance_rate}% - immediate attention required`;
    }

    if (analytics.trends?.contract_growth > 50) {
      return `Contract volume growing rapidly at ${analytics.trends.contract_growth}%`;
    }

    if (snapshot.total_contract_value > 10000000) {
      return `Managing over ${(snapshot.total_contract_value / 1000000).toFixed(1)}M in contracts`;
    }

    return 'All systems operating normally';
  }

  // Utility grouping methods
  private groupByVendor(contracts: ContractMetricsData[]): { vendorId: string; vendorName: string; contracts: ContractMetricsData[]; totalValue: number }[] {
    const groups: Record<string, { vendorId: string; vendorName: string; contracts: ContractMetricsData[]; totalValue: number }> = {};

    for (const contract of contracts) {
      const vendorId = contract.vendor?.id || 'unknown';
      if (!groups[vendorId]) {
        groups[vendorId] = {
          vendorId,
          vendorName: contract.vendor?.name || 'Unknown',
          contracts: [],
          totalValue: 0,
        };
      }
      groups[vendorId].contracts.push(contract);
      groups[vendorId].totalValue += contract.value || 0;
    }

    return Object.values(groups);
  }

  private groupByStatus(contracts: ContractMetricsData[]): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const contract of contracts) {
      const status = contract.status || 'unknown';
      groups[status] = (groups[status] || 0) + 1;
    }

    return groups;
  }

  private groupByCategory(vendors: VendorMetricsData[]): { category: string; count: number; vendors: string[]; totalSpend: number }[] {
    const groups: Record<string, { category: string; count: number; vendors: string[]; totalSpend: number }> = {};

    for (const vendor of vendors) {
      const category = vendor.category || 'other';
      if (!groups[category]) {
        groups[category] = {
          category,
          count: 0,
          vendors: [],
          totalSpend: 0,
        };
      }
      groups[category].count++;
      groups[category].vendors.push(vendor.name);
      groups[category].totalSpend += vendor.total_spend?.[0]?.sum || 0;
    }

    return Object.values(groups);
  }

  private calculateConcentrationMetrics(vendors: VendorMetricsData[]): VendorConcentrationMetrics {
    const vendorSpends = vendors
      .map(v => v.total_spend?.[0]?.sum || 0)
      .sort((a, b) => b - a);

    const totalSpend = vendorSpends.reduce((sum, spend) => sum + spend, 0);
    const top5Spend = vendorSpends.slice(0, 5).reduce((sum, spend) => sum + spend, 0);

    // Calculate Herfindahl Index
    let hhi = 0;
    for (const spend of vendorSpends) {
      const marketShare = spend / totalSpend;
      hhi += marketShare * marketShare;
    }

    return {
      totalSpend,
      top5VendorsSpend: top5Spend,
      concentrationRatio: totalSpend > 0 ? top5Spend / totalSpend : 0,
      herfindahlIndex: hhi,
      riskLevel: 'low', // Default, will be set by analyzeVendorConcentration
      description: '', // Default, will be set by analyzeVendorConcentration
      recommendation: null, // Default, will be set by analyzeVendorConcentration
    };
  }

  private aggregateByMonth(allocations: SpendingAllocation[]): { month: string; total: number; count: number; allocations: SpendingAllocation[] }[] {
    const groups: Record<string, { month: string; total: number; count: number; allocations: SpendingAllocation[] }> = {};

    for (const allocation of allocations) {
      const month = new Date(allocation.created_at).toISOString().substring(0, 7);
      if (!groups[month]) {
        groups[month] = {
          month,
          total: 0,
          count: 0,
          allocations: [],
        };
      }
      groups[month].total += allocation.allocated_amount || 0;
      groups[month].count++;
      groups[month].allocations.push(allocation);
    }

    return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
  }

  private aggregateByCategory(allocations: SpendingAllocation[]): { category: string; total: number; count: number }[] {
    const groups: Record<string, { category: string; total: number; count: number }> = {};

    for (const allocation of allocations) {
      const category = allocation.budget?.budget_type || 'other';
      if (!groups[category]) {
        groups[category] = {
          category,
          total: 0,
          count: 0,
        };
      }
      groups[category].total += allocation.allocated_amount || 0;
      groups[category].count++;
    }

    return Object.values(groups);
  }
}