import { BaseAgent, ProcessingResult, Insight } from './base.ts';
import { Vendor, VendorPortfolio, NewVendorEvaluation, VendorProfile, PerformanceMetrics, RelationshipScore, VendorRisk, Opportunity, ComplianceStatus, VendorAnalysis, PortfolioSummary, CategoryAnalysis, PerformanceDistribution, SpendConcentration, PortfolioRisk, PortfolioOptimization, VendorInfo, InitialAssessment } from '../../../types/common/vendor.ts';

export class VendorAgent extends BaseAgent {
  get agentType() {
    return 'vendor';
  }

  get capabilities() {
    return ['vendor_analysis', 'performance_tracking', 'relationship_scoring', 'risk_assessment'];
  }

  async process(data: Partial<Vendor>, context?: AgentContext): Promise<ProcessingResult<VendorAnalysis>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      // Determine processing type
      if (context?.vendorId || data.vendorId) {
        return await this.analyzeSpecificVendor(data, context, rulesApplied, insights);
      } else if (context?.analysisType === 'portfolio') {
        return await this.analyzeVendorPortfolio(data, context, rulesApplied, insights);
      } else if (context?.analysisType === 'onboarding') {
        return await this.evaluateNewVendor(data, context, rulesApplied, insights);
      }

      // Default vendor analysis
      return await this.performGeneralVendorAnalysis(data, context, rulesApplied, insights);

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

  private async analyzeSpecificVendor(
    data: Partial<Vendor>,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<VendorAnalysis>> {
    rulesApplied.push('vendor_specific_analysis');

    const vendorId = context?.vendorId || data.vendorId;

    // Get vendor data and metrics
    const vendorData = await this.getVendorData(vendorId);
    const performanceMetrics = await this.calculatePerformanceMetrics(vendorData);

    const analysis = {
      profile: this.buildVendorProfile(vendorData),
      performance: performanceMetrics,
      relationshipScore: this.calculateRelationshipScore(vendorData, performanceMetrics),
      risks: this.assessVendorRisks(vendorData, performanceMetrics),
      opportunities: this.identifyOpportunities(vendorData, performanceMetrics),
      recommendations: [] as string[],
      complianceStatus: this.checkVendorCompliance(vendorData),
    };

    // Performance insights
    if (analysis.performance.overallScore < 0.6) {
      insights.push(this.createInsight(
        'poor_vendor_performance',
        'high',
        'Poor Vendor Performance',
        `Vendor is performing at ${(analysis.performance.overallScore * 100).toFixed(1)}% of expected levels`,
        'Schedule performance review and consider alternatives',
        { performance: analysis.performance },
      ));
      rulesApplied.push('performance_threshold_check');
    }

    // Relationship insights
    if (analysis.relationshipScore.score < 0.5) {
      insights.push(this.createInsight(
        'weak_vendor_relationship',
        'medium',
        'Weak Vendor Relationship',
        `Relationship score of ${(analysis.relationshipScore.score * 100).toFixed(1)}% indicates issues`,
        'Improve communication and address outstanding issues',
        { relationship: analysis.relationshipScore },
      ));
      rulesApplied.push('relationship_assessment');
    }

    // Risk insights
    for (const risk of analysis.risks) {
      if (risk.severity === 'high' || risk.severity === 'critical') {
        insights.push(this.createInsight(
          'vendor_risk',
          risk.severity,
          `Vendor Risk: ${risk.type}`,
          risk.description,
          risk.mitigation,
          { risk },
        ));
      }
    }

    // Compliance insights
    if (!analysis.complianceStatus.compliant) {
      insights.push(this.createInsight(
        'vendor_compliance_issue',
        'critical',
        'Vendor Compliance Issues',
        `Vendor is non-compliant in ${analysis.complianceStatus.issues.length} areas`,
        'Address compliance issues before continuing engagement',
        { compliance: analysis.complianceStatus },
      ));
      rulesApplied.push('compliance_check');
    }

    // Generate recommendations
    analysis.recommendations = this.generateVendorRecommendations(analysis);

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      confidence,
    );
  }

  private async analyzeVendorPortfolio(
    data: Partial<VendorPortfolio>,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<VendorAnalysis>> {
    rulesApplied.push('portfolio_analysis');

    const portfolioData = await this.getPortfolioData();

    const analysis = {
      summary: this.generatePortfolioSummary(portfolioData),
      categoryAnalysis: this.analyzeByCategory(portfolioData),
      performanceDistribution: this.analyzePerformanceDistribution(portfolioData),
      spendConcentration: this.analyzeSpendConcentration(portfolioData),
      riskExposure: this.assessPortfolioRisk(portfolioData),
      optimizationOpportunities: this.identifyPortfolioOptimizations(portfolioData),
    };

    // Concentration risk
    if (analysis.spendConcentration.topVendorShare > 0.3) {
      insights.push(this.createInsight(
        'vendor_concentration',
        'high',
        'High Vendor Concentration',
        `Top vendor represents ${(analysis.spendConcentration.topVendorShare * 100).toFixed(1)}% of total spend`,
        'Diversify vendor base to reduce dependency risk',
        { concentration: analysis.spendConcentration },
      ));
      rulesApplied.push('concentration_analysis');
    }

    // Performance distribution
    const { poorPerformers } = analysis.performanceDistribution;
    if (poorPerformers.length > portfolioData.vendors.length * 0.2) {
      insights.push(this.createInsight(
        'widespread_performance_issues',
        'high',
        'Widespread Vendor Performance Issues',
        `${poorPerformers.length} vendors (${((poorPerformers.length / portfolioData.vendors.length) * 100).toFixed(1)}%) are underperforming`,
        'Review vendor management processes and selection criteria',
        { poorPerformers },
      ));
    }

    // Category risks
    for (const category of analysis.categoryAnalysis) {
      if (category.riskLevel === 'high') {
        insights.push(this.createInsight(
          'category_risk',
          'medium',
          `High Risk in ${category.name} Category`,
          category.riskDescription,
          'Implement category-specific risk mitigation strategies',
          { category },
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

  private async evaluateNewVendor(
    data: NewVendorEvaluationData,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<NewVendorEvaluation>> {
    rulesApplied.push('vendor_onboarding_evaluation');

    const evaluation = {
      basicChecks: this.performBasicVendorChecks(data),
      financialStability: this.assessFinancialStability(data),
      references: this.evaluateReferences(data),
      capabilities: this.assessCapabilities(data),
      pricing: this.evaluatePricing(data),
      risks: this.assessNewVendorRisks(data),
      score: 0,
      recommendation: '',
    };

    // Calculate overall score
    evaluation.score = this.calculateOnboardingScore(evaluation);

    // Basic checks
    if (!evaluation.basicChecks.passed) {
      insights.push(this.createInsight(
        'failed_basic_checks',
        'critical',
        'Vendor Failed Basic Requirements',
        `Missing: ${evaluation.basicChecks.missing.join(', ')}`,
        'Obtain missing documentation before proceeding',
        { checks: evaluation.basicChecks },
      ));
      rulesApplied.push('basic_requirements_check');
    }

    // Financial stability
    if (evaluation.financialStability.riskLevel === 'high') {
      insights.push(this.createInsight(
        'financial_stability_concern',
        'high',
        'Vendor Financial Stability Concerns',
        evaluation.financialStability.description,
        'Request financial guarantees or consider alternatives',
        { financial: evaluation.financialStability },
      ));
      rulesApplied.push('financial_assessment');
    }

    // References
    if (evaluation.references.averageRating < 3.5) {
      insights.push(this.createInsight(
        'poor_references',
        'medium',
        'Below Average Vendor References',
        `Average reference rating: ${evaluation.references.averageRating.toFixed(1)}/5`,
        'Investigate concerns raised by references',
        { references: evaluation.references },
      ));
    }

    // Pricing
    if (evaluation.pricing.competitiveness === 'above_market') {
      insights.push(this.createInsight(
        'high_pricing',
        'medium',
        'Above Market Pricing',
        `Pricing is ${evaluation.pricing.variance}% above market average`,
        'Negotiate pricing or justify premium with added value',
        { pricing: evaluation.pricing },
      ));
      rulesApplied.push('pricing_benchmark');
    }

    // Overall recommendation
    if (evaluation.score < 0.6) {
      evaluation.recommendation = 'Do not onboard - significant concerns';
    } else if (evaluation.score < 0.75) {
      evaluation.recommendation = 'Onboard with conditions and close monitoring';
    } else {
      evaluation.recommendation = 'Approve for onboarding';
    }

    return this.createResult(
      true,
      evaluation,
      insights,
      rulesApplied,
      0.8,
    );
  }

  private async performGeneralVendorAnalysis(
    data: Partial<Vendor>,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<VendorAnalysis>> {
    rulesApplied.push('general_vendor_analysis');

    const analysis = {
      vendorInfo: this.extractVendorInfo(data),
      category: this.categorizeVendor(data),
      initialAssessment: this.performInitialAssessment(data),
    };

    // Add insights based on initial assessment
    if (analysis.initialAssessment.hasRedFlags) {
      insights.push(this.createInsight(
        'vendor_red_flags',
        'high',
        'Vendor Red Flags Detected',
        `Found ${analysis.initialAssessment.redFlags.length} concerning indicators`,
        'Perform thorough due diligence before engagement',
        { redFlags: analysis.initialAssessment.redFlags },
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

  // Vendor data methods
  private async getVendorData(vendorId: string): Promise<Vendor> {
    // Simulate vendor data retrieval
    return {
      id: vendorId,
      name: 'Sample Vendor',
      category: 'technology',
      contractCount: 5,
      totalSpend: 500000,
      activeContracts: 3,
      performanceHistory: [
        { month: '2024-01', score: 0.85, issues: 1 },
        { month: '2024-02', score: 0.82, issues: 2 },
        { month: '2024-03', score: 0.78, issues: 3 },
        { month: '2024-04', score: 0.75, issues: 2 },
        { month: '2024-05', score: 0.70, issues: 4 },
        { month: '2024-06', score: 0.65, issues: 5 },
      ],
      deliveryMetrics: {
        onTimeRate: 0.75,
        qualityScore: 0.8,
        responsiveness: 0.7,
      },
      compliance: {
        insurance: true,
        certifications: ['ISO9001', 'SOC2'],
        lastAudit: '2024-01-15',
      },
      issues: [
        { date: '2024-05-15', type: 'delivery_delay', severity: 'medium' },
        { date: '2024-06-01', type: 'quality_issue', severity: 'high' },
      ],
    };
  }

  private async getPortfolioData(): Promise<VendorPortfolio> {
    // Simulate portfolio data
    return {
      vendors: [
        { id: 'v1', name: 'TechCorp', category: 'technology', spend: 800000, performance: 0.85 },
        { id: 'v2', name: 'ConsultPro', category: 'consulting', spend: 500000, performance: 0.55 },
        { id: 'v3', name: 'CloudServ', category: 'technology', spend: 600000, performance: 0.90 },
        { id: 'v4', name: 'MarketingCo', category: 'marketing', spend: 300000, performance: 0.70 },
        { id: 'v5', name: 'FacilitiesMgmt', category: 'facilities', spend: 200000, performance: 0.80 },
      ],
      totalSpend: 2400000,
      categories: [
        { name: 'technology', count: 2, spend: 1400000 },
        { name: 'consulting', count: 1, spend: 500000 },
        { name: 'marketing', count: 1, spend: 300000 },
        { name: 'facilities', count: 1, spend: 200000 },
      ],
    };
  }

  // Analysis methods
  private buildVendorProfile(vendorData: Vendor): VendorProfile {
    return {
      name: vendorData.name,
      category: vendorData.category,
      engagementLength: this.calculateEngagementLength(vendorData),
      spendLevel: this.categorizeSpendLevel(vendorData.totalSpend),
      contractComplexity: this.assessContractComplexity(vendorData),
      strategicImportance: this.assessStrategicImportance(vendorData),
    };
  }

  private async calculatePerformanceMetrics(vendorData: Vendor): Promise<PerformanceMetrics> {
    const recentPerformance = vendorData.performanceHistory.slice(-3);
    const avgRecentScore = recentPerformance.reduce((sum: number, p: PerformanceHistoryItem) => sum + p.score, 0) / recentPerformance.length;

    const trend = this.calculatePerformanceTrend(vendorData.performanceHistory);

    return {
      overallScore: avgRecentScore,
      trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      trendRate: Math.abs(trend),
      deliveryScore: vendorData.deliveryMetrics.onTimeRate,
      qualityScore: vendorData.deliveryMetrics.qualityScore,
      responsivenessScore: vendorData.deliveryMetrics.responsiveness,
      issueFrequency: this.calculateIssueFrequency(vendorData.issues),
      components: {
        delivery: vendorData.deliveryMetrics.onTimeRate * 0.3,
        quality: vendorData.deliveryMetrics.qualityScore * 0.3,
        responsiveness: vendorData.deliveryMetrics.responsiveness * 0.2,
        issues: Math.max(0, 1 - (vendorData.issues.length * 0.1)) * 0.2,
      },
    };
  }

  private calculateRelationshipScore(vendorData: Vendor, performance: PerformanceMetrics): RelationshipScore {
    const factors = {
      performance: performance.overallScore * 0.3,
      longevity: Math.min(1, vendorData.contractCount / 10) * 0.2,
      spend: Math.min(1, vendorData.totalSpend / 1000000) * 0.2,
      issues: Math.max(0, 1 - (vendorData.issues.length * 0.05)) * 0.15,
      compliance: vendorData.compliance.insurance ? 0.15 : 0,
    };

    const score = Object.values(factors).reduce((sum, val) => sum + val, 0);

    return {
      score,
      factors,
      strength: score > 0.8 ? 'strong' : score > 0.6 ? 'moderate' : 'weak',
      recommendations: this.getRelationshipRecommendations(score, factors),
    };
  }

  private assessVendorRisks(vendorData: Vendor, performance: PerformanceMetrics): VendorRisk[] {
    const risks: VendorRisk[] = [];

    // Performance risk
    if (performance.trend === 'declining' && performance.trendRate > 0.1) {
      risks.push({
        type: 'performance_decline',
        severity: 'high',
        description: `Performance declining at ${(performance.trendRate * 100).toFixed(1)}% per month`,
        impact: 'Service quality and delivery issues',
        mitigation: 'Implement performance improvement plan',
      });
    }

    // Dependency risk
    if (vendorData.totalSpend > 500000) {
      risks.push({
        type: 'high_dependency',
        severity: 'medium',
        description: 'High financial dependency on vendor',
        impact: 'Difficult to replace if issues arise',
        mitigation: 'Identify alternative vendors',
      });
    }

    // Compliance risk
    const daysSinceAudit = this.daysSince(vendorData.compliance.lastAudit);
    if (daysSinceAudit > 365) {
      risks.push({
        type: 'outdated_compliance',
        severity: 'medium',
        description: 'Compliance audit is over 1 year old',
        impact: 'Potential compliance violations',
        mitigation: 'Request updated compliance documentation',
      });
    }

    // Issue frequency risk
    if (vendorData.issues.length > 5) {
      risks.push({
        type: 'frequent_issues',
        severity: 'high',
        description: `${vendorData.issues.length} issues in recent months`,
        impact: 'Operational disruptions',
        mitigation: 'Address root causes of recurring issues',
      });
    }

    return risks;
  }

  private identifyOpportunities(vendorData: Vendor, performance: PerformanceMetrics): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Volume discount opportunity
    if (vendorData.totalSpend > 100000 && vendorData.contractCount > 3) {
      opportunities.push({
        type: 'volume_discount',
        description: 'Consolidate contracts for volume pricing',
        potentialSaving: vendorData.totalSpend * 0.1,
        effort: 'medium',
        timeline: '3 months',
      });
    }

    // Performance incentive opportunity
    if (performance.overallScore > 0.8) {
      opportunities.push({
        type: 'performance_incentive',
        description: 'Implement performance-based pricing',
        potentialBenefit: 'Improved service levels',
        effort: 'low',
        timeline: '1 month',
      });
    }

    // Strategic partnership opportunity
    if (vendorData.totalSpend > 500000 && performance.overallScore > 0.75) {
      opportunities.push({
        type: 'strategic_partnership',
        description: 'Elevate to strategic partner status',
        potentialBenefit: 'Preferential pricing and priority service',
        effort: 'high',
        timeline: '6 months',
      });
    }

    return opportunities;
  }

  private checkVendorCompliance(vendorData: Vendor): ComplianceStatus {
    const issues: string[] = [];

    if (!vendorData.compliance.insurance) {
      issues.push('Missing insurance certificate');
    }

    const requiredCerts = ['ISO9001', 'SOC2'];
    const missingCerts = requiredCerts.filter(cert =>
      !vendorData.compliance.certifications.includes(cert),
    );

    if (missingCerts.length > 0) {
      issues.push(`Missing certifications: ${missingCerts.join(', ')}`);
    }

    const daysSinceAudit = this.daysSince(vendorData.compliance.lastAudit);
    if (daysSinceAudit > 365) {
      issues.push('Audit documentation is outdated');
    }

    return {
      compliant: issues.length === 0,
      issues,
      lastChecked: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private generateVendorRecommendations(analysis: VendorAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.performance.overallScore < 0.7) {
      recommendations.push('Schedule quarterly business reviews');
      recommendations.push('Implement performance improvement plan');
    }

    if (analysis.relationshipScore.score < 0.6) {
      recommendations.push('Increase engagement frequency');
      recommendations.push('Establish dedicated account management');
    }

    if (analysis.risks.some((r: any) => r.severity === 'high')) {
      recommendations.push('Develop risk mitigation strategies');
      recommendations.push('Identify backup vendors');
    }

    if (!analysis.complianceStatus.compliant) {
      recommendations.push('Update all compliance documentation');
      recommendations.push('Schedule compliance audit');
    }

    return recommendations;
  }

  // Portfolio analysis methods
  private generatePortfolioSummary(portfolioData: VendorPortfolio): PortfolioSummary {
    return {
      totalVendors: portfolioData.vendors.length,
      totalSpend: portfolioData.totalSpend,
      avgSpendPerVendor: portfolioData.totalSpend / portfolioData.vendors.length,
      topCategory: portfolioData.categories.sort((a: any, b: any) => b.spend - a.spend)[0].name,
      avgPerformance: portfolioData.vendors.reduce((sum: number, v: any) => sum + v.performance, 0) / portfolioData.vendors.length,
    };
  }

  private analyzeByCategory(portfolioData: VendorPortfolio): CategoryAnalysis[] {
    return portfolioData.categories.map((category: any) => {
      const categoryVendors = portfolioData.vendors.filter((v: any) => v.category === category.name);
      const avgPerformance = categoryVendors.reduce((sum: number, v: any) => sum + v.performance, 0) / categoryVendors.length;

      let riskLevel = 'low';
      let riskDescription = '';

      if (categoryVendors.length === 1) {
        riskLevel = 'high';
        riskDescription = 'Single vendor dependency';
      } else if (avgPerformance < 0.7) {
        riskLevel = 'medium';
        riskDescription = 'Below average category performance';
      }

      return {
        name: category.name,
        vendorCount: category.count,
        totalSpend: category.spend,
        avgPerformance,
        riskLevel,
        riskDescription,
        concentration: category.spend / portfolioData.totalSpend,
      };
    });
  }

  private analyzePerformanceDistribution(portfolioData: VendorPortfolio): PerformanceDistribution {
    const distribution = {
      excellent: portfolioData.vendors.filter((v: any) => v.performance >= 0.9),
      good: portfolioData.vendors.filter((v: any) => v.performance >= 0.75 && v.performance < 0.9),
      average: portfolioData.vendors.filter((v: any) => v.performance >= 0.6 && v.performance < 0.75),
      poorPerformers: portfolioData.vendors.filter((v: any) => v.performance < 0.6),
    };

    return {
      ...distribution,
      summary: {
        excellentRate: distribution.excellent.length / portfolioData.vendors.length,
        goodRate: distribution.good.length / portfolioData.vendors.length,
        averageRate: distribution.average.length / portfolioData.vendors.length,
        poorRate: distribution.poorPerformers.length / portfolioData.vendors.length,
      },
    };
  }

  private analyzeSpendConcentration(portfolioData: VendorPortfolio): SpendConcentration {
    const sortedVendors = [...portfolioData.vendors].sort((a, b) => b.spend - a.spend);
    const top5Spend = sortedVendors.slice(0, 5).reduce((sum, v) => sum + v.spend, 0);
    const topVendor = sortedVendors[0];

    // Calculate Herfindahl-Hirschman Index
    const hhi = portfolioData.vendors.reduce((sum: number, vendor: any) => {
      const share = vendor.spend / portfolioData.totalSpend;
      return sum + (share * share);
    }, 0);

    return {
      topVendor: topVendor.name,
      topVendorSpend: topVendor.spend,
      topVendorShare: topVendor.spend / portfolioData.totalSpend,
      top5Share: top5Spend / portfolioData.totalSpend,
      herfindahlIndex: hhi,
      concentrationLevel: hhi > 0.25 ? 'high' : hhi > 0.15 ? 'medium' : 'low',
    };
  }

  private assessPortfolioRisk(portfolioData: VendorPortfolio): PortfolioRisk {
    const risks = {
      concentration: this.analyzeSpendConcentration(portfolioData).concentrationLevel,
      performance: this.analyzePerformanceDistribution(portfolioData).summary.poorRate > 0.2 ? 'high' : 'low',
      diversity: portfolioData.categories.length < 4 ? 'medium' : 'low',
    };

    const overallRisk = Object.values(risks).filter(r => r === 'high').length > 1 ? 'high' :
                       Object.values(risks).filter(r => r === 'medium').length > 1 ? 'medium' : 'low';

    return {
      components: risks,
      overall: overallRisk,
      description: this.describePortfolioRisk(risks),
    };
  }

  private identifyPortfolioOptimizations(portfolioData: VendorPortfolio): PortfolioOptimization[] {
    const optimizations: any[] = [];

    // Vendor consolidation
    const categories = portfolioData.categories.filter((c: any) => c.count > 3);
    for (const category of categories) {
      optimizations.push({
        type: 'consolidation',
        category: category.name,
        description: `Consolidate ${category.count} vendors to 2-3 preferred partners`,
        potentialSaving: category.spend * 0.15,
        complexity: 'medium',
      });
    }

    // Performance improvement
    const poorPerformers = portfolioData.vendors.filter((v: any) => v.performance < 0.6);
    if (poorPerformers.length > 0) {
      const totalPoorSpend = poorPerformers.reduce((sum: number, v: any) => sum + v.spend, 0);
      optimizations.push({
        type: 'performance_improvement',
        description: `Replace or improve ${poorPerformers.length} underperforming vendors`,
        potentialBenefit: 'Improved service quality and efficiency',
        affectedSpend: totalPoorSpend,
        complexity: 'high',
      });
    }

    return optimizations;
  }

  // New vendor evaluation methods
  private performBasicVendorChecks(data: NewVendorEvaluationData): BasicChecks {
    const required = ['businessLicense', 'insurance', 'taxId', 'bankDetails'];
    const provided = Object.keys(data.documentation || {});
    const missing = required.filter(doc => !provided.includes(doc));

    return {
      passed: missing.length === 0,
      missing,
      provided,
      completeness: provided.length / required.length,
    };
  }

  private assessFinancialStability(data: NewVendorEvaluationData): FinancialStability {
    // Simulate financial assessment
    const financial = data.financial || {};
    let riskLevel = 'low';
    let description = 'Financially stable';

    if (financial.revenue < 1000000) {
      riskLevel = 'medium';
      description = 'Small vendor with limited financial capacity';
    }

    if (financial.profitMargin < 0) {
      riskLevel = 'high';
      description = 'Vendor is currently unprofitable';
    }

    if (financial.debtRatio > 0.7) {
      riskLevel = 'high';
      description = 'High debt levels may impact stability';
    }

    return {
      riskLevel,
      description,
      metrics: {
        revenue: financial.revenue || 0,
        profitMargin: financial.profitMargin || 0,
        debtRatio: financial.debtRatio || 0,
        creditScore: financial.creditScore || 0,
      },
    };
  }

  private evaluateReferences(data: NewVendorEvaluationData): References {
    const references = data.references || [];

    if (references.length === 0) {
      return {
        averageRating: 0,
        count: 0,
        concerns: ['No references provided'],
      };
    }

    const avgRating = references.reduce((sum: number, ref: any) => sum + ref.rating, 0) / references.length;
    const concerns = references
      .filter((ref: any) => ref.rating < 4)
      .map((ref: any) => ref.concern);

    return {
      averageRating: avgRating,
      count: references.length,
      concerns,
      breakdown: {
        excellent: references.filter((r: any) => r.rating === 5).length,
        good: references.filter((r: any) => r.rating === 4).length,
        average: references.filter((r: any) => r.rating === 3).length,
        poor: references.filter((r: any) => r.rating < 3).length,
      },
    };
  }

  private assessCapabilities(data: CapabilitiesData): Capabilities {
    const required = data.requiredCapabilities || [];
    const vendor = data.vendorCapabilities || [];

    const matched = required.filter((cap: string) => vendor.includes(cap));
    const missing = required.filter((cap: string) => !vendor.includes(cap));

    return {
      matchRate: required.length > 0 ? matched.length / required.length : 1,
      matched,
      missing,
      additionalCapabilities: vendor.filter((cap: string) => !required.includes(cap)),
    };
  }

  private evaluatePricing(data: PricingData): Pricing {
    const vendorPricing = data.pricing || {};
    const marketBenchmark = data.marketBenchmark || {};

    let competitiveness = 'competitive';
    let variance = 0;

    if (vendorPricing.total && marketBenchmark.average) {
      variance = ((vendorPricing.total - marketBenchmark.average) / marketBenchmark.average) * 100;

      if (variance > 15) {competitiveness = 'above_market';}
      else if (variance < -15) {competitiveness = 'below_market';}
    }

    return {
      competitiveness,
      variance,
      breakdown: vendorPricing.breakdown || {},
      negotiable: vendorPricing.negotiable || false,
      volumeDiscounts: vendorPricing.volumeDiscounts || false,
    };
  }

  private assessNewVendorRisks(data: NewVendorRiskData): NewVendorRisk[] {
    const risks: any[] = [];

    // New vendor risk
    risks.push({
      type: 'new_vendor',
      severity: 'medium',
      description: 'No prior relationship history',
      mitigation: 'Start with small pilot project',
    });

    // Size mismatch risk
    if (data.vendorSize === 'small' && data.projectSize === 'large') {
      risks.push({
        type: 'capacity_mismatch',
        severity: 'high',
        description: 'Vendor may lack capacity for large projects',
        mitigation: 'Verify scalability and resource availability',
      });
    }

    // Geographic risk
    if (data.vendorLocation?.country !== data.companyLocation?.country) {
      risks.push({
        type: 'geographic',
        severity: 'medium',
        description: 'Cross-border engagement complexities',
        mitigation: 'Address tax, legal, and operational considerations',
      });
    }

    return risks;
  }

  private calculateOnboardingScore(evaluation: NewVendorEvaluation): number {
    let score = 0;

    // Basic checks (30%)
    score += evaluation.basicChecks.completeness * 0.3;

    // Financial stability (20%)
    const financialScore = evaluation.financialStability.riskLevel === 'low' ? 1 :
                          evaluation.financialStability.riskLevel === 'medium' ? 0.5 : 0;
    score += financialScore * 0.2;

    // References (20%)
    score += (evaluation.references.averageRating / 5) * 0.2;

    // Capabilities (20%)
    score += evaluation.capabilities.matchRate * 0.2;

    // Pricing (10%)
    const pricingScore = evaluation.pricing.competitiveness === 'competitive' ? 1 :
                        evaluation.pricing.competitiveness === 'below_market' ? 0.8 : 0.5;
    score += pricingScore * 0.1;

    return score;
  }

  // Utility methods
  private categorizeVendor(data: Partial<Vendor>): string {
    const name = (data.name || '').toLowerCase();
    const description = (data.description || '').toLowerCase();
    const services = (data.services || []).join(' ').toLowerCase();

    const combined = `${name} ${description} ${services}`;

    const categories = {
      'technology': ['software', 'hardware', 'it', 'cloud', 'saas', 'tech'],
      'consulting': ['consult', 'advisory', 'strategy', 'professional services'],
      'marketing': ['marketing', 'advertising', 'pr', 'digital', 'creative'],
      'facilities': ['facilities', 'maintenance', 'cleaning', 'security'],
      'logistics': ['shipping', 'freight', 'logistics', 'transport'],
      'legal': ['law', 'legal', 'attorney', 'compliance'],
      'financial': ['accounting', 'audit', 'tax', 'financial'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  private extractVendorInfo(data: Partial<Vendor>): VendorInfo {
    return {
      name: data.name || 'Unknown Vendor',
      category: this.categorizeVendor(data),
      contactInfo: {
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
      },
      size: this.estimateVendorSize(data),
      established: data.established || null,
    };
  }

  private performInitialAssessment(data: Partial<Vendor>): InitialAssessment {
    const redFlags: string[] = [];

    if (!data.insurance) {
      redFlags.push('No insurance information provided');
    }

    if (!data.references || data.references.length === 0) {
      redFlags.push('No references provided');
    }

    if (data.complaints && data.complaints > 0) {
      redFlags.push(`${data.complaints} complaints on record`);
    }

    if (data.litigation) {
      redFlags.push('Active or recent litigation');
    }

    return {
      hasRedFlags: redFlags.length > 0,
      redFlags,
      initialScore: Math.max(0, 1 - (redFlags.length * 0.2)),
    };
  }

  private calculateEngagementLength(vendorData: Vendor): string {
    // Estimate based on contract count and history
    if (vendorData.contractCount > 10) {return 'long-term (>3 years)';}
    if (vendorData.contractCount > 5) {return 'established (1-3 years)';}
    if (vendorData.contractCount > 1) {return 'developing (<1 year)';}
    return 'new';
  }

  private categorizeSpendLevel(spend: number): string {
    if (spend > 1000000) {return 'strategic';}
    if (spend > 500000) {return 'significant';}
    if (spend > 100000) {return 'moderate';}
    if (spend > 10000) {return 'small';}
    return 'minimal';
  }

  private assessContractComplexity(vendorData: Vendor): string {
    // Simple assessment based on contract count and value
    if (vendorData.contractCount > 5 || vendorData.totalSpend > 500000) {
      return 'complex';
    }
    if (vendorData.contractCount > 2 || vendorData.totalSpend > 100000) {
      return 'moderate';
    }
    return 'simple';
  }

  private assessStrategicImportance(vendorData: Vendor): string {
    const factors = {
      highSpend: vendorData.totalSpend > 500000,
      criticalCategory: ['technology', 'manufacturing'].includes(vendorData.category),
      longTerm: vendorData.contractCount > 5,
      fewAlternatives: vendorData.category === 'specialized',
    };

    const importanceScore = Object.values(factors).filter(f => f).length;

    if (importanceScore >= 3) {return 'critical';}
    if (importanceScore >= 2) {return 'important';}
    if (importanceScore >= 1) {return 'moderate';}
    return 'low';
  }

  private calculatePerformanceTrend(history: PerformanceHistoryItem[]): number {
    if (history.length < 2) {return 0;}

    const scores = history.map(h => h.score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }

  private calculateIssueFrequency(issues: Issue[]): string {
    const monthsActive = 6; // Assume 6 months for this example
    const issuesPerMonth = issues.length / monthsActive;

    if (issuesPerMonth > 1) {return 'high';}
    if (issuesPerMonth > 0.5) {return 'medium';}
    return 'low';
  }

  private getRelationshipRecommendations(score: number, factors: RelationshipScore['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.performance < 0.2) {
      recommendations.push('Address performance issues urgently');
    }

    if (factors.longevity < 0.1) {
      recommendations.push('Establish longer-term contracts');
    }

    if (factors.issues < 0.1) {
      recommendations.push('Implement issue prevention measures');
    }

    return recommendations;
  }

  private daysSince(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private describePortfolioRisk(risks: PortfolioRisk['components']): string {
    const highRisks = Object.entries(risks)
      .filter(([_, level]) => level === 'high')
      .map(([type]) => type);

    if (highRisks.length === 0) {
      return 'Portfolio risk is well-managed';
    }

    return `High risk in: ${highRisks.join(', ')}`;
  }

  private estimateVendorSize(data: EstimateVendorSizeData): string {
    const revenue = data.revenue || data.financial?.revenue || 0;
    const employees = data.employees || 0;

    if (revenue > 50000000 || employees > 500) {return 'large';}
    if (revenue > 10000000 || employees > 100) {return 'medium';}
    if (revenue > 1000000 || employees > 10) {return 'small';}
    return 'micro';
  }
}