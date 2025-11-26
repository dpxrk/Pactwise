import { SupabaseClient } from '@supabase/supabase-js';
import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import {
  DonnaMarketIntelligence,
  PriceBenchmark,
  PriceAnomaly,
  MarketTrend,
  VendorPriceComparison,
  TaxonomyMatch,
} from '../donna/market-intelligence.ts';

// ============================================================================
// INTERFACES
// ============================================================================

interface MarketIntelligenceContext extends AgentContext {
  analysisType?: 'benchmark' | 'anomaly_detection' | 'trend_analysis' | 'vendor_comparison' | 'taxonomy_match';
  taxonomyCode?: string;
  lineItemId?: string;
  industry?: string;
  region?: string;
}

interface MarketIntelligenceData {
  contract_id?: string;
  vendor_id?: string;
  line_item_id?: string;
  taxonomy_code?: string;
  item_name?: string;
  item_description?: string;
  unit_price?: number;
  quantity?: number;
  contracts?: Array<{
    id: string;
    value?: number;
    vendor_id?: string;
    title?: string;
  }>;
  vendors?: Array<{
    id: string;
    name?: string;
  }>;
}

interface BenchmarkResult {
  benchmark: PriceBenchmark;
  insights: Insight[];
}

interface AnomalyResult {
  anomalies: PriceAnomaly[];
  summary: {
    total_anomalies: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_potential_savings: number;
  };
}

interface TrendResult {
  trends: MarketTrend[];
  summary: {
    total_trends: number;
    strong: number;
    moderate: number;
    weak: number;
  };
}

// ============================================================================
// MARKET INTELLIGENCE AGENT
// ============================================================================

export class MarketIntelligenceAgent extends BaseAgent {
  private marketIntelligence: DonnaMarketIntelligence;

  constructor(supabase: SupabaseClient, enterpriseId: string, userId?: string) {
    super(supabase, enterpriseId, userId);
    this.marketIntelligence = new DonnaMarketIntelligence(supabase, enterpriseId);
  }

  get agentType(): string {
    return 'market_intelligence';
  }

  get capabilities(): string[] {
    return [
      'price_benchmarking',
      'anomaly_detection',
      'market_trend_analysis',
      'vendor_price_comparison',
      'taxonomy_matching',
      'price_contribution',
      'review_queue_management',
    ];
  }

  /**
   * Main processing method
   */
  async process(
    data: unknown,
    context?: MarketIntelligenceContext
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      const analysisType = context?.analysisType || this.inferAnalysisType(data as MarketIntelligenceData);

      let result: unknown;
      let confidence = 0.8;

      switch (analysisType) {
        case 'benchmark':
          const benchmarkResult = await this.performBenchmarkAnalysis(data as MarketIntelligenceData, context!, rulesApplied, insights);
          result = benchmarkResult;
          confidence = (benchmarkResult as BenchmarkResult).benchmark?.confidence || 0.8;
          break;

        case 'anomaly_detection':
          const anomalyResult = await this.performAnomalyDetection(data as MarketIntelligenceData, context!, rulesApplied, insights);
          result = anomalyResult;
          confidence = this.calculateAnomalyConfidence(anomalyResult);
          break;

        case 'trend_analysis':
          const trendResult = await this.performTrendAnalysis(data as MarketIntelligenceData, context!, rulesApplied, insights);
          result = trendResult;
          confidence = this.calculateTrendConfidence(trendResult);
          break;

        case 'vendor_comparison':
          const vendorResult = await this.performVendorComparison(data as MarketIntelligenceData, context!, rulesApplied, insights);
          result = vendorResult;
          confidence = 0.85;
          break;

        case 'taxonomy_match':
          const taxonomyResult = await this.performTaxonomyMatch(data as MarketIntelligenceData, context!, rulesApplied, insights);
          result = taxonomyResult;
          confidence = (taxonomyResult as TaxonomyMatch[])[0]?.confidence || 0.5;
          break;

        default:
          // Perform comprehensive analysis
          result = await this.performComprehensiveAnalysis(data as MarketIntelligenceData, context!, rulesApplied, insights);
          confidence = 0.75;
      }

      return this.createResult(
        true,
        result,
        insights,
        rulesApplied,
        confidence,
        { analysis_type: analysisType },
        startTime
      );

    } catch (error) {
      console.error(`[MarketIntelligenceAgent] Error:`, error);
      return this.createResult(
        false,
        null,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) },
        startTime
      );
    }
  }

  // ============================================================================
  // ANALYSIS METHODS
  // ============================================================================

  /**
   * Perform price benchmark analysis
   */
  private async performBenchmarkAnalysis(
    data: MarketIntelligenceData,
    context: MarketIntelligenceContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<BenchmarkResult> {
    rulesApplied.push('price_benchmark_analysis');

    const taxonomyCode = context.taxonomyCode || data.taxonomy_code;
    const unitPrice = data.unit_price;

    if (!taxonomyCode) {
      throw new Error('Taxonomy code is required for benchmarking');
    }

    const benchmark = await this.marketIntelligence.getPriceBenchmark(taxonomyCode, {
      industry: context.industry,
      region: context.region,
      yourPrice: unitPrice,
    });

    // Generate insights based on benchmark
    if (benchmark.comparison === 'above_market' && benchmark.percentile_rank && benchmark.percentile_rank > 75) {
      insights.push(this.createInsight(
        'above_market_pricing',
        benchmark.percentile_rank > 90 ? 'high' : 'medium',
        'Above Market Pricing Detected',
        `Your price is at the ${benchmark.percentile_rank.toFixed(0)}th percentile of market prices`,
        `Consider renegotiating. Potential savings: $${benchmark.potential_savings?.toFixed(2) || 'N/A'}`,
        benchmark,
        true
      ));
    }

    if (benchmark.comparison === 'below_market' && benchmark.percentile_rank && benchmark.percentile_rank < 25) {
      insights.push(this.createInsight(
        'competitive_pricing',
        'low',
        'Competitive Pricing',
        `Your price is at the ${benchmark.percentile_rank.toFixed(0)}th percentile - below market average`,
        'Verify that service quality meets requirements at this price point',
        benchmark,
        false
      ));
    }

    if (benchmark.trend.direction === 'increasing' && benchmark.trend.change_pct > 5) {
      insights.push(this.createInsight(
        'rising_market_prices',
        'medium',
        'Rising Market Prices',
        `Market prices have increased ${benchmark.trend.change_pct.toFixed(1)}% ${benchmark.trend.period}`,
        'Consider locking in current rates with longer-term contracts',
        benchmark.trend,
        true
      ));
    }

    if (benchmark.trend.direction === 'decreasing' && benchmark.trend.change_pct < -5) {
      insights.push(this.createInsight(
        'falling_market_prices',
        'medium',
        'Falling Market Prices',
        `Market prices have decreased ${Math.abs(benchmark.trend.change_pct).toFixed(1)}% ${benchmark.trend.period}`,
        'May be opportunity to renegotiate existing contracts at lower rates',
        benchmark.trend,
        true
      ));
    }

    return { benchmark, insights };
  }

  /**
   * Perform anomaly detection
   */
  private async performAnomalyDetection(
    data: MarketIntelligenceData,
    context: MarketIntelligenceContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<AnomalyResult> {
    rulesApplied.push('price_anomaly_detection');

    const contractId = context.contractId || data.contract_id;
    const lineItemId = context.lineItemId || data.line_item_id;

    if (!contractId && !lineItemId) {
      throw new Error('Contract ID or Line Item ID is required for anomaly detection');
    }

    const anomalies = await this.marketIntelligence.detectAnomalies(
      lineItemId || contractId!,
      !!lineItemId
    );

    // Generate insights for significant anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');

    for (const anomaly of criticalAnomalies.slice(0, 3)) {
      insights.push(this.createInsight(
        `price_anomaly_${anomaly.type}`,
        anomaly.severity,
        `Price Anomaly: ${this.formatAnomalyType(anomaly.type)}`,
        anomaly.description,
        anomaly.recommendation,
        {
          deviation_pct: anomaly.deviation_pct,
          potential_savings: anomaly.potential_savings,
          taxonomy_code: anomaly.taxonomy_code,
        },
        true
      ));
    }

    const totalPotentialSavings = anomalies
      .filter(a => a.type === 'above_market')
      .reduce((sum, a) => sum + a.potential_savings, 0);

    if (totalPotentialSavings > 0) {
      insights.push(this.createInsight(
        'total_savings_opportunity',
        totalPotentialSavings > 10000 ? 'high' : 'medium',
        'Total Savings Opportunity',
        `Total potential savings identified: $${totalPotentialSavings.toFixed(2)}`,
        'Review all flagged line items for renegotiation opportunities',
        { total_savings: totalPotentialSavings },
        true
      ));
    }

    return {
      anomalies,
      summary: {
        total_anomalies: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length,
        total_potential_savings: totalPotentialSavings,
      },
    };
  }

  /**
   * Perform trend analysis
   */
  private async performTrendAnalysis(
    data: MarketIntelligenceData,
    context: MarketIntelligenceContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<TrendResult> {
    rulesApplied.push('market_trend_analysis');

    const taxonomyCode = context.taxonomyCode || data.taxonomy_code;

    const trends = await this.marketIntelligence.getTrends(taxonomyCode, {
      industry: context.industry,
      region: context.region,
    });

    // Generate insights for strong trends
    for (const trend of trends.filter(t => t.strength === 'strong' || t.strength === 'very_strong')) {
      insights.push(this.createInsight(
        `strong_market_trend_${trend.trend_type}`,
        trend.strength === 'very_strong' ? 'high' : 'medium',
        `Strong ${this.formatTrendType(trend.trend_type)}`,
        trend.description,
        trend.prediction,
        {
          drivers: trend.drivers,
          change_pct: trend.change_pct,
          taxonomy_code: trend.taxonomy_code,
        },
        true
      ));
    }

    // Alert on significant price increases
    const priceIncreases = trends.filter(t => t.trend_type === 'price_increase' && t.change_pct > 10);
    if (priceIncreases.length > 0) {
      insights.push(this.createInsight(
        'multiple_price_increases',
        'high',
        'Multiple Categories Experiencing Price Increases',
        `${priceIncreases.length} categories showing >10% price increases`,
        'Review contracts in affected categories for renewal timing and budget impact',
        { affected_categories: priceIncreases.length },
        true
      ));
    }

    return {
      trends,
      summary: {
        total_trends: trends.length,
        strong: trends.filter(t => t.strength === 'strong' || t.strength === 'very_strong').length,
        moderate: trends.filter(t => t.strength === 'moderate').length,
        weak: trends.filter(t => t.strength === 'weak').length,
      },
    };
  }

  /**
   * Perform vendor price comparison
   */
  private async performVendorComparison(
    data: MarketIntelligenceData,
    context: MarketIntelligenceContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<VendorPriceComparison> {
    rulesApplied.push('vendor_price_comparison');

    const vendorId = context.vendorId || data.vendor_id;
    const taxonomyCode = context.taxonomyCode || data.taxonomy_code;

    if (!vendorId) {
      throw new Error('Vendor ID is required for vendor comparison');
    }

    const comparison = await this.marketIntelligence.compareVendorPricing(vendorId, taxonomyCode);

    // Generate insights
    if (comparison.overall_comparison === 'above_market') {
      insights.push(this.createInsight(
        'vendor_above_market',
        comparison.avg_deviation_pct > 20 ? 'high' : 'medium',
        `Vendor Pricing ${comparison.avg_deviation_pct.toFixed(1)}% Above Market`,
        `${comparison.vendor_name} pricing is above market average across ${comparison.category_comparisons.length} categories`,
        comparison.recommendation,
        {
          avg_deviation: comparison.avg_deviation_pct,
          potential_savings: comparison.total_potential_savings,
        },
        true
      ));
    }

    if (comparison.overall_comparison === 'below_market') {
      insights.push(this.createInsight(
        'vendor_competitive_pricing',
        'low',
        'Vendor Offers Competitive Pricing',
        `${comparison.vendor_name} pricing is ${Math.abs(comparison.avg_deviation_pct).toFixed(1)}% below market average`,
        comparison.recommendation,
        { avg_deviation: comparison.avg_deviation_pct },
        false
      ));
    }

    // Highlight categories with highest deviation
    for (const cat of comparison.category_comparisons.filter(c => c.deviation_pct > 20).slice(0, 3)) {
      insights.push(this.createInsight(
        'category_pricing_issue',
        cat.deviation_pct > 30 ? 'high' : 'medium',
        `High Pricing in ${cat.category_name}`,
        `${cat.deviation_pct.toFixed(1)}% above market ($${cat.vendor_avg_price.toFixed(2)} vs $${cat.market_median_price.toFixed(2)} median)`,
        'Consider competitive bidding for this category',
        cat,
        true
      ));
    }

    return comparison;
  }

  /**
   * Perform taxonomy matching
   */
  private async performTaxonomyMatch(
    data: MarketIntelligenceData,
    context: MarketIntelligenceContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<TaxonomyMatch[]> {
    rulesApplied.push('taxonomy_matching');

    const itemName = data.item_name;
    const itemDescription = data.item_description;

    if (!itemName) {
      throw new Error('Item name is required for taxonomy matching');
    }

    const matches = await this.marketIntelligence.matchTaxonomy(itemName, itemDescription);

    if (matches.length === 0) {
      insights.push(this.createInsight(
        'no_taxonomy_match',
        'medium',
        'No Taxonomy Match Found',
        `Could not find matching taxonomy for "${itemName}"`,
        'Item may require manual categorization or new taxonomy code request',
        { item_name: itemName },
        true
      ));
    } else if (matches[0].confidence < 0.5) {
      insights.push(this.createInsight(
        'low_confidence_match',
        'low',
        'Low Confidence Taxonomy Match',
        `Best match "${matches[0].name}" has ${(matches[0].confidence * 100).toFixed(0)}% confidence`,
        'Consider manual review to confirm or correct categorization',
        matches[0],
        true
      ));

      // Queue for review if line item ID provided
      if (data.line_item_id) {
        await this.marketIntelligence.queueForReview(data.line_item_id, matches);
        insights.push(this.createInsight(
          'queued_for_review',
          'low',
          'Queued for Human Review',
          'Item has been added to the taxonomy review queue',
          'A reviewer will verify the correct categorization',
          { line_item_id: data.line_item_id },
          false
        ));
      }
    }

    return matches;
  }

  /**
   * Perform comprehensive analysis when type not specified
   */
  private async performComprehensiveAnalysis(
    data: MarketIntelligenceData,
    context: MarketIntelligenceContext,
    rulesApplied: string[],
    insights: Insight[]
  ): Promise<{
    benchmark?: BenchmarkResult;
    anomalies?: AnomalyResult;
    trends?: TrendResult;
    vendor_comparison?: VendorPriceComparison;
  }> {
    rulesApplied.push('comprehensive_market_analysis');

    const result: {
      benchmark?: BenchmarkResult;
      anomalies?: AnomalyResult;
      trends?: TrendResult;
      vendor_comparison?: VendorPriceComparison;
    } = {};

    // Benchmark if taxonomy code provided
    if (data.taxonomy_code || context.taxonomyCode) {
      try {
        result.benchmark = await this.performBenchmarkAnalysis(data, context, rulesApplied, insights);
      } catch (e) {
        console.warn('Benchmark analysis failed:', e);
      }
    }

    // Anomaly detection if contract ID provided
    if (data.contract_id || context.contractId) {
      try {
        result.anomalies = await this.performAnomalyDetection(data, context, rulesApplied, insights);
      } catch (e) {
        console.warn('Anomaly detection failed:', e);
      }
    }

    // Trends analysis
    try {
      result.trends = await this.performTrendAnalysis(data, context, rulesApplied, insights);
    } catch (e) {
      console.warn('Trend analysis failed:', e);
    }

    // Vendor comparison if vendor ID provided
    if (data.vendor_id || context.vendorId) {
      try {
        result.vendor_comparison = await this.performVendorComparison(data, context, rulesApplied, insights);
      } catch (e) {
        console.warn('Vendor comparison failed:', e);
      }
    }

    return result;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Infer analysis type from data
   */
  private inferAnalysisType(data: MarketIntelligenceData): string {
    if (data.item_name && !data.taxonomy_code) {
      return 'taxonomy_match';
    }
    if (data.vendor_id) {
      return 'vendor_comparison';
    }
    if (data.contract_id || data.line_item_id) {
      return 'anomaly_detection';
    }
    if (data.taxonomy_code) {
      return 'benchmark';
    }
    return 'trend_analysis';
  }

  /**
   * Create standardized insight
   */
  private createInsight<T>(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    recommendation: string,
    data?: T,
    isActionable = true
  ): Insight<T> {
    return {
      type,
      severity,
      title,
      description,
      recommendation,
      data,
      isActionable,
    };
  }

  /**
   * Create processing result
   */
  private createResult(
    success: boolean,
    data: unknown,
    insights: Insight[],
    rulesApplied: string[],
    confidence: number,
    metadata?: Record<string, unknown>,
    startTime?: number
  ): ProcessingResult {
    return {
      success,
      data,
      insights,
      rulesApplied,
      confidence,
      processingTime: startTime ? Date.now() - startTime : 0,
      metadata,
      result: data,
    };
  }

  /**
   * Calculate confidence from anomaly results
   */
  private calculateAnomalyConfidence(result: AnomalyResult): number {
    if (result.anomalies.length === 0) return 0.5;
    const avgConfidence = result.anomalies.reduce((sum, a) => sum + a.confidence, 0) / result.anomalies.length;
    return avgConfidence;
  }

  /**
   * Calculate confidence from trend results
   */
  private calculateTrendConfidence(result: TrendResult): number {
    if (result.trends.length === 0) return 0.5;
    const avgConfidence = result.trends.reduce((sum, t) => sum + t.confidence, 0) / result.trends.length;
    return avgConfidence;
  }

  /**
   * Format anomaly type for display
   */
  private formatAnomalyType(type: string): string {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  /**
   * Format trend type for display
   */
  private formatTrendType(type: string): string {
    const typeMap: Record<string, string> = {
      'price_increase': 'Price Increase Trend',
      'price_decrease': 'Price Decrease Trend',
      'demand_surge': 'Demand Surge',
      'supply_shortage': 'Supply Shortage',
      'market_consolidation': 'Market Consolidation',
      'new_entrants': 'New Market Entrants',
    };
    return typeMap[type] || this.formatAnomalyType(type);
  }

  // ============================================================================
  // DASHBOARD METHODS
  // ============================================================================

  /**
   * Get market intelligence dashboard summary
   */
  async getDashboardSummary(): Promise<{
    anomaly_summary: Awaited<ReturnType<DonnaMarketIntelligence['getAnomalySummary']>>;
    review_queue_summary: Awaited<ReturnType<DonnaMarketIntelligence['getReviewQueueSummary']>>;
    active_trends: number;
    high_priority_actions: number;
  }> {
    const [anomalySummary, reviewQueueSummary] = await Promise.all([
      this.marketIntelligence.getAnomalySummary(),
      this.marketIntelligence.getReviewQueueSummary(),
    ]);

    // Get active trends count
    const { count: activeTrends } = await this.supabase
      .from('donna_market_trends')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString().split('T')[0]);

    // Calculate high priority actions
    const highPriorityActions =
      anomalySummary.critical_count +
      anomalySummary.high_count +
      reviewQueueSummary.high_priority;

    return {
      anomaly_summary: anomalySummary,
      review_queue_summary: reviewQueueSummary,
      active_trends: activeTrends || 0,
      high_priority_actions: highPriorityActions,
    };
  }
}

export default MarketIntelligenceAgent;
