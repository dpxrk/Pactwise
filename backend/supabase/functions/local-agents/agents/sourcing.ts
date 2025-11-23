import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';

// Sourcing-specific types
interface SupplierSearchCriteria {
  category?: string;
  capabilities?: string[];
  location?: string[];
  certifications?: string[];
  minRating?: number;
  maxBudget?: number;
}

interface Supplier {
  id: string;
  name: string;
  category: string;
  capabilities: string[];
  location: string;
  certifications: string[];
  rating: number;
  yearsInBusiness: number;
  annualRevenue?: number;
  employeeCount?: number;
  references?: string[];
}

interface SupplierEvaluation {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  capabilityMatch: number;
  financialStability: number;
  experienceLevel: number;
  certificationCompliance: number;
  locationFit: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'conditional' | 'not_recommended';
  reasoning: string;
}

interface MarketResearch {
  category: string;
  marketSize: string;
  averagePricing: {
    low: number;
    median: number;
    high: number;
  };
  topSuppliers: string[];
  trends: string[];
  riskFactors: string[];
  opportunities: string[];
  recommendedApproach: string;
}

interface RFQDocument {
  title: string;
  description: string;
  requirements: string[];
  specifications: Record<string, string>;
  evaluationCriteria: string[];
  timeline: {
    issueDate: string;
    responseDeadline: string;
    expectedAwardDate: string;
  };
  terms: string[];
}

interface QuoteAnalysis {
  quoteId: string;
  supplierName: string;
  totalCost: number;
  competitiveness: 'excellent' | 'good' | 'fair' | 'poor';
  valueScore: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  concerns: string[];
  recommendation: string;
}

interface SourcingAgentContext extends AgentContext {
  sourcingType?: 'find_suppliers' | 'evaluate_supplier' | 'market_research' | 'prepare_rfq' | 'analyze_quotes';
  criteria?: SupplierSearchCriteria;
  supplierId?: string;
  category?: string;
  rfqDetails?: Record<string, unknown>;
  quotes?: unknown[];
}

type SourcingResult = Supplier[] | SupplierEvaluation | MarketResearch | RFQDocument | QuoteAnalysis[];

export class SourcingAgent extends BaseAgent {
  get agentType() {
    return 'sourcing';
  }

  get capabilities() {
    return [
      'supplier_discovery',
      'supplier_evaluation',
      'market_research',
      'rfq_preparation',
      'quote_analysis',
      'vendor_comparison',
    ];
  }

  async process(data: unknown, context?: SourcingAgentContext): Promise<ProcessingResult<SourcingResult>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      const sourcingType = context?.sourcingType || this.determineSourcingType(data);

      switch (sourcingType) {
        case 'find_suppliers':
          return await this.findSuppliers(data as SupplierSearchCriteria, context!, rulesApplied, insights);
        case 'evaluate_supplier':
          return await this.evaluateSupplier(data, context!, rulesApplied, insights);
        case 'market_research':
          return await this.conductMarketResearch(data, context!, rulesApplied, insights);
        case 'prepare_rfq':
          return await this.prepareRFQ(data, context!, rulesApplied, insights);
        case 'analyze_quotes':
          return await this.analyzeQuotes(data, context!, rulesApplied, insights);
        default:
          return await this.findSuppliers(data as SupplierSearchCriteria, context!, rulesApplied, insights);
      }
    } catch (error) {
      return this.createResult(
        false,
        [] as SourcingResult,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private determineSourcingType(data: unknown): string {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.supplierId) return 'evaluate_supplier';
      if (obj.quotes) return 'analyze_quotes';
      if (obj.rfqDetails || obj.requirements) return 'prepare_rfq';
      if (obj.category && !obj.capabilities) return 'market_research';
    }
    return 'find_suppliers';
  }

  private async findSuppliers(
    criteria: SupplierSearchCriteria,
    context: SourcingAgentContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<ProcessingResult<Supplier[]>> {
    rulesApplied.push('supplier_search');

    // Query vendors table based on criteria
    let query = this.supabase
      .from('vendors')
      .select('*')
      .eq('enterprise_id', this.enterpriseId);

    if (criteria.category) {
      query = query.eq('category', criteria.category);
    }

    if (criteria.minRating) {
      query = query.gte('rating', criteria.minRating);
    }

    const { data: vendors, error } = await query;

    if (error) {
      throw new Error(`Failed to search suppliers: ${error.message}`);
    }

    // Transform to Supplier format
    const suppliers: Supplier[] = (vendors || []).map((v: Record<string, unknown>) => ({
      id: v.id as string,
      name: v.name as string,
      category: v.category as string || 'general',
      capabilities: (v.capabilities as string[]) || [],
      location: (v.location as string) || 'unknown',
      certifications: (v.certifications as string[]) || [],
      rating: (v.rating as number) || 0,
      yearsInBusiness: this.calculateYearsInBusiness(v.created_at as string),
      annualRevenue: v.annual_revenue as number,
      employeeCount: v.employee_count as number,
      references: (v.references as string[]) || [],
    }));

    // Add insight if limited results
    if (suppliers.length === 0) {
      insights.push(this.createInsight(
        'no_suppliers_found',
        'medium',
        'No Suppliers Found',
        'No suppliers match your criteria. Consider broadening your search parameters.',
        { criteria }
      ));
    } else if (suppliers.length < 3) {
      insights.push(this.createInsight(
        'limited_suppliers',
        'low',
        'Limited Supplier Options',
        `Only ${suppliers.length} supplier(s) found. Consider expanding search criteria for better options.`,
        { count: suppliers.length }
      ));
    }

    return this.createResult(true, suppliers, insights, rulesApplied);
  }

  private async evaluateSupplier(
    data: unknown,
    context: SourcingAgentContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<ProcessingResult<SupplierEvaluation>> {
    rulesApplied.push('supplier_evaluation');

    const supplierId = context.supplierId || (data as Record<string, unknown>).supplierId as string;

    if (!supplierId) {
      throw new Error('Supplier ID is required for evaluation');
    }

    // Get supplier data
    const { data: supplier, error } = await this.supabase
      .from('vendors')
      .select('*')
      .eq('id', supplierId)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (error || !supplier) {
      throw new Error(`Supplier not found: ${error?.message || 'Unknown error'}`);
    }

    // Calculate evaluation scores
    const evaluation: SupplierEvaluation = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      overallScore: 0,
      capabilityMatch: this.scoreCapabilities(supplier),
      financialStability: this.scoreFinancialStability(supplier),
      experienceLevel: this.scoreExperience(supplier),
      certificationCompliance: this.scoreCertifications(supplier),
      locationFit: this.scoreLocation(supplier),
      strengths: [],
      weaknesses: [],
      recommendation: 'not_recommended',
      reasoning: '',
    };

    // Calculate overall score (weighted average)
    evaluation.overallScore = (
      evaluation.capabilityMatch * 0.3 +
      evaluation.financialStability * 0.25 +
      evaluation.experienceLevel * 0.20 +
      evaluation.certificationCompliance * 0.15 +
      evaluation.locationFit * 0.10
    );

    // Determine recommendation
    if (evaluation.overallScore >= 0.85) {
      evaluation.recommendation = 'highly_recommended';
      evaluation.reasoning = 'Excellent match across all evaluation criteria';
    } else if (evaluation.overallScore >= 0.70) {
      evaluation.recommendation = 'recommended';
      evaluation.reasoning = 'Strong overall performance with minor areas for improvement';
    } else if (evaluation.overallScore >= 0.55) {
      evaluation.recommendation = 'conditional';
      evaluation.reasoning = 'Acceptable but requires careful monitoring and improvement plans';
    } else {
      evaluation.recommendation = 'not_recommended';
      evaluation.reasoning = 'Significant gaps in key evaluation areas';
    }

    // Identify strengths and weaknesses
    if (evaluation.capabilityMatch >= 0.8) evaluation.strengths.push('Strong capability match');
    else if (evaluation.capabilityMatch < 0.6) evaluation.weaknesses.push('Limited capability alignment');

    if (evaluation.financialStability >= 0.8) evaluation.strengths.push('Financially stable');
    else if (evaluation.financialStability < 0.6) evaluation.weaknesses.push('Financial stability concerns');

    if (evaluation.experienceLevel >= 0.8) evaluation.strengths.push('Highly experienced');
    else if (evaluation.experienceLevel < 0.6) evaluation.weaknesses.push('Limited experience');

    // Add insights
    if (evaluation.recommendation === 'highly_recommended') {
      insights.push(this.createInsight(
        'excellent_supplier',
        'high',
        'Excellent Supplier Match',
        `${evaluation.supplierName} scores ${(evaluation.overallScore * 100).toFixed(1)}% - highly recommended for engagement`,
        { evaluation }
      ));
    } else if (evaluation.recommendation === 'not_recommended') {
      insights.push(this.createInsight(
        'poor_supplier_fit',
        'high',
        'Poor Supplier Fit',
        `${evaluation.supplierName} scores only ${(evaluation.overallScore * 100).toFixed(1)}% - not recommended`,
        { evaluation }
      ));
    }

    return this.createResult(true, evaluation, insights, rulesApplied);
  }

  private async conductMarketResearch(
    data: unknown,
    context: SourcingAgentContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<ProcessingResult<MarketResearch>> {
    rulesApplied.push('market_research');

    const category = context.category || (data as Record<string, unknown>).category as string;

    if (!category) {
      throw new Error('Category is required for market research');
    }

    // Get vendors in category
    const { data: vendors, error } = await this.supabase
      .from('vendors')
      .select('*')
      .eq('category', category);

    if (error) {
      throw new Error(`Failed to conduct market research: ${error.message}`);
    }

    const vendorCount = vendors?.length || 0;
    const avgRatings = vendors?.map((v: Record<string, unknown>) => v.rating as number || 0) || [];
    const revenues = vendors?.filter((v: Record<string, unknown>) => v.annual_revenue).map((v: Record<string, unknown>) => v.annual_revenue as number) || [];

    const research: MarketResearch = {
      category,
      marketSize: this.determineMarketSize(vendorCount),
      averagePricing: {
        low: revenues.length > 0 ? Math.min(...revenues) : 0,
        median: revenues.length > 0 ? this.median(revenues) : 0,
        high: revenues.length > 0 ? Math.max(...revenues) : 0,
      },
      topSuppliers: vendors
        ?.sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.rating as number || 0) - (a.rating as number || 0))
        .slice(0, 5)
        .map((v: Record<string, unknown>) => v.name as string) || [],
      trends: this.identifyMarketTrends(category, vendors || []),
      riskFactors: this.identifyRiskFactors(category, vendors || []),
      opportunities: this.identifyOpportunities(category, vendors || []),
      recommendedApproach: this.recommendApproach(category, vendorCount, avgRatings),
    };

    insights.push(this.createInsight(
      'market_research_complete',
      'medium',
      'Market Research Complete',
      `Found ${vendorCount} suppliers in ${category} category. Average rating: ${this.average(avgRatings).toFixed(2)}`,
      { research }
    ));

    return this.createResult(true, research, insights, rulesApplied);
  }

  private async prepareRFQ(
    data: unknown,
    context: SourcingAgentContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<ProcessingResult<RFQDocument>> {
    rulesApplied.push('rfq_preparation');

    const rfqData = (data as Record<string, unknown>).rfqDetails || data;
    const details = rfqData as Record<string, unknown>;

    const rfq: RFQDocument = {
      title: (details.title as string) || 'Request for Quotation',
      description: (details.description as string) || '',
      requirements: (details.requirements as string[]) || [],
      specifications: (details.specifications as Record<string, string>) || {},
      evaluationCriteria: [
        'Price competitiveness',
        'Quality of proposed solution',
        'Delivery timeline',
        'Vendor experience and references',
        'Compliance with requirements',
      ],
      timeline: {
        issueDate: new Date().toISOString(),
        responseDeadline: this.addDays(new Date(), 14).toISOString(),
        expectedAwardDate: this.addDays(new Date(), 30).toISOString(),
      },
      terms: [
        'Responses must be submitted by the deadline',
        'All requirements must be addressed',
        'Pricing must be valid for 90 days',
        'References must be provided',
      ],
    };

    insights.push(this.createInsight(
      'rfq_prepared',
      'low',
      'RFQ Document Prepared',
      `RFQ prepared with ${rfq.requirements.length} requirements and standard evaluation criteria`,
      { rfq }
    ));

    return this.createResult(true, rfq, insights, rulesApplied);
  }

  private async analyzeQuotes(
    data: unknown,
    context: SourcingAgentContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<ProcessingResult<QuoteAnalysis[]>> {
    rulesApplied.push('quote_analysis');

    const quotes = (data as Record<string, unknown>).quotes as unknown[] || [];

    if (quotes.length === 0) {
      throw new Error('No quotes provided for analysis');
    }

    const analyses: QuoteAnalysis[] = quotes.map((quote: unknown, index: number) => {
      const q = quote as Record<string, unknown>;
      const cost = q.totalCost as number || 0;

      const analysis: QuoteAnalysis = {
        quoteId: (q.id as string) || `quote-${index}`,
        supplierName: (q.supplierName as string) || 'Unknown',
        totalCost: cost,
        competitiveness: 'fair',
        valueScore: 0,
        complianceScore: 0,
        riskLevel: 'medium',
        strengths: [],
        concerns: [],
        recommendation: '',
      };

      // Calculate scores (simplified logic)
      analysis.valueScore = this.calculateValueScore(q);
      analysis.complianceScore = this.calculateComplianceScore(q);

      // Determine competitiveness
      const avgCost = quotes.reduce((sum: number, qt: unknown) => sum + ((qt as Record<string, unknown>).totalCost as number || 0), 0) / quotes.length;
      if (cost <= avgCost * 0.85) analysis.competitiveness = 'excellent';
      else if (cost <= avgCost * 0.95) analysis.competitiveness = 'good';
      else if (cost <= avgCost * 1.1) analysis.competitiveness = 'fair';
      else analysis.competitiveness = 'poor';

      // Build recommendation
      if (analysis.valueScore >= 0.8 && analysis.complianceScore >= 0.9) {
        analysis.recommendation = 'Highly recommended - excellent value and compliance';
      } else if (analysis.valueScore >= 0.6 && analysis.complianceScore >= 0.7) {
        analysis.recommendation = 'Recommended - good overall proposal';
      } else {
        analysis.recommendation = 'Review required - concerns identified';
      }

      return analysis;
    });

    // Add comparative insights
    const bestQuote = analyses.reduce((best, current) =>
      current.valueScore > best.valueScore ? current : best
    );

    insights.push(this.createInsight(
      'quote_analysis_complete',
      'high',
      'Quote Analysis Complete',
      `Analyzed ${analyses.length} quotes. Best value: ${bestQuote.supplierName} with ${(bestQuote.valueScore * 100).toFixed(1)}% value score`,
      { analyses }
    ));

    return this.createResult(true, analyses, insights, rulesApplied);
  }

  // Helper methods
  private calculateYearsInBusiness(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  private scoreCapabilities(supplier: Record<string, unknown>): number {
    const capabilities = (supplier.capabilities as string[]) || [];
    return Math.min(capabilities.length / 10, 1); // Normalize to 0-1
  }

  private scoreFinancialStability(supplier: Record<string, unknown>): number {
    const revenue = supplier.annual_revenue as number || 0;
    if (revenue > 10000000) return 1.0;
    if (revenue > 5000000) return 0.8;
    if (revenue > 1000000) return 0.6;
    if (revenue > 100000) return 0.4;
    return 0.2;
  }

  private scoreExperience(supplier: Record<string, unknown>): number {
    const years = this.calculateYearsInBusiness(supplier.created_at as string);
    return Math.min(years / 10, 1); // 10+ years = 1.0
  }

  private scoreCertifications(supplier: Record<string, unknown>): number {
    const certs = (supplier.certifications as string[]) || [];
    return Math.min(certs.length / 5, 1); // 5+ certs = 1.0
  }

  private scoreLocation(supplier: Record<string, unknown>): number {
    // Simple implementation - could be enhanced with actual location matching
    return supplier.location ? 0.8 : 0.5;
  }

  private determineMarketSize(vendorCount: number): string {
    if (vendorCount > 50) return 'Large';
    if (vendorCount > 20) return 'Medium';
    if (vendorCount > 5) return 'Small';
    return 'Very Small';
  }

  private median(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }

  private identifyMarketTrends(category: string, vendors: unknown[]): string[] {
    const trends: string[] = [];
    const vendorCount = vendors.length;

    if (vendorCount > 30) trends.push('Highly competitive market');
    if (vendorCount < 5) trends.push('Limited competition');

    return trends.length > 0 ? trends : ['Stable market conditions'];
  }

  private identifyRiskFactors(category: string, vendors: unknown[]): string[] {
    const risks: string[] = [];
    const vendorCount = vendors.length;

    if (vendorCount < 3) risks.push('Limited supplier availability');
    if (vendorCount > 50) risks.push('High fragmentation may complicate selection');

    return risks.length > 0 ? risks : ['No significant risk factors identified'];
  }

  private identifyOpportunities(category: string, vendors: unknown[]): string[] {
    const opportunities: string[] = [];
    const vendorCount = vendors.length;

    if (vendorCount > 10) opportunities.push('Multiple options for competitive bidding');
    if (vendorCount > 20) opportunities.push('Potential for volume discounts');

    return opportunities.length > 0 ? opportunities : ['Consider strategic partnerships'];
  }

  private recommendApproach(category: string, vendorCount: number, ratings: number[]): string {
    if (vendorCount === 0) return 'Expand search criteria or consider alternative categories';
    if (vendorCount < 3) return 'Limited options - prioritize relationship building';
    if (vendorCount > 20) return 'Competitive RFQ process recommended';
    return 'Selective bidding with top-rated vendors';
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private calculateValueScore(quote: Record<string, unknown>): number {
    // Simplified value scoring
    const hasGoodPrice = quote.totalCost && (quote.totalCost as number) > 0;
    const hasDeliveryPlan = quote.deliveryTimeline !== undefined;
    const hasWarranty = quote.warranty !== undefined;

    let score = 0.5; // Base score
    if (hasGoodPrice) score += 0.2;
    if (hasDeliveryPlan) score += 0.15;
    if (hasWarranty) score += 0.15;

    return Math.min(score, 1.0);
  }

  private calculateComplianceScore(quote: Record<string, unknown>): number {
    // Simplified compliance scoring
    const hasRequiredFields = quote.supplierName && quote.totalCost;
    const hasDocumentation = quote.documentation !== undefined;
    const hasCertifications = quote.certifications !== undefined;

    let score = hasRequiredFields ? 0.6 : 0.2;
    if (hasDocumentation) score += 0.2;
    if (hasCertifications) score += 0.2;

    return Math.min(score, 1.0);
  }
}
