/// <reference path="../../../types/global.d.ts" />

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCache, getCacheSync, UnifiedCache, initializeCache } from '../../../functions-utils/cache-factory.ts';
import { DonnaAI, AnonymizedData } from './base.ts';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PriceBenchmark {
  taxonomy_code: string;
  taxonomy_name: string;
  current_market_price: {
    avg: number;
    median: number;
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    min: number;
    max: number;
  };
  your_price?: number;
  percentile_rank?: number;
  comparison: 'below_market' | 'at_market' | 'above_market';
  potential_savings?: number;
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    change_pct: number;
    period: string;
  };
  confidence: number;
  sample_size: number;
  last_updated: string;
}

export interface PriceAnomaly {
  id: string;
  line_item_id?: string;
  contract_id?: string;
  vendor_id?: string;
  taxonomy_code: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_price: number;
  expected_price: number;
  market_avg_price: number;
  deviation_pct: number;
  percentile_rank: number;
  description: string;
  recommendation: string;
  potential_savings: number;
  confidence: number;
}

export interface MarketTrend {
  taxonomy_code: string;
  taxonomy_name?: string;
  trend_type: string;
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  change_pct: number;
  description: string;
  drivers: string[];
  prediction: string;
  confidence: number;
  period: string;
  start_date: string;
  end_date: string;
}

export interface VendorPriceComparison {
  vendor_id: string;
  vendor_name: string;
  overall_comparison: 'competitive' | 'above_market' | 'below_market';
  avg_deviation_pct: number;
  category_comparisons: CategoryComparison[];
  recommendation: string;
  total_potential_savings: number;
}

export interface CategoryComparison {
  taxonomy_code: string;
  category_name: string;
  vendor_avg_price: number;
  market_avg_price: number;
  market_median_price: number;
  deviation_pct: number;
  comparison: 'below_market' | 'at_market' | 'above_market';
  sample_count: number;
}

export interface TaxonomyMatch {
  code: string;
  name: string;
  confidence: number;
  match_method: 'exact' | 'synonym' | 'embedding' | 'fuzzy';
  description?: string;
}

// ============================================================================
// DONNA MARKET INTELLIGENCE CLASS
// ============================================================================

export class DonnaMarketIntelligence {
  private supabase: SupabaseClient;
  private donnaAI: DonnaAI;
  private enterpriseId: string;
  private syncCache = getCacheSync();
  private asyncCache: UnifiedCache | null = null;
  private cacheInitialized = false;

  // Anomaly detection thresholds (percentage deviation from market median)
  private readonly ANOMALY_THRESHOLDS = {
    critical: 50,  // >50% deviation
    high: 30,      // >30% deviation
    medium: 15,    // >15% deviation
    low: 5,        // >5% deviation
  };

  // Minimum confidence for taxonomy matching
  private readonly MIN_TAXONOMY_CONFIDENCE = 0.50;

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.donnaAI = new DonnaAI(supabase);
    this.initCacheAsync();
  }

  /**
   * Initialize the async cache (Redis-backed if available)
   */
  private async initCacheAsync(): Promise<void> {
    try {
      await initializeCache();
      this.asyncCache = await getCache();
      this.cacheInitialized = true;
    } catch (error) {
      console.error('DonnaMarketIntelligence: Failed to initialize async cache:', error);
      this.cacheInitialized = true;
    }
  }

  /**
   * Ensure async cache is ready before use
   */
  private async ensureCacheReady(): Promise<UnifiedCache> {
    if (!this.cacheInitialized) {
      await this.initCacheAsync();
    }
    return this.asyncCache || await getCache();
  }

  // ============================================================================
  // PRICE BENCHMARKING
  // ============================================================================

  /**
   * Get market price benchmark for a taxonomy code (uses async cache with Redis support)
   */
  async getPriceBenchmark(
    taxonomyCode: string,
    options: {
      industry?: string;
      region?: string;
      companySize?: string;
      yourPrice?: number;
    } = {}
  ): Promise<PriceBenchmark> {
    const cacheKey = `price_benchmark_${taxonomyCode}_${options.industry || ''}_${options.region || ''}_${options.companySize || ''}`;

    // Try async cache first
    try {
      const cache = await this.ensureCacheReady();
      const cached = await cache.get<PriceBenchmark>(cacheKey);
      if (cached) return cached;
    } catch {
      // Try sync cache as fallback
      const syncCached = this.syncCache.get(cacheKey);
      if (syncCached) return syncCached as PriceBenchmark;
    }

    // Get benchmark from database function
    const { data: benchmark, error } = await this.supabase.rpc('get_market_benchmark', {
      p_taxonomy_code: taxonomyCode,
      p_industry: options.industry || null,
      p_region: options.region || null,
      p_company_size: options.companySize || null,
    });

    if (error || !benchmark || benchmark.length === 0) {
      // Fall back to direct price history calculation
      return await this.calculateBenchmarkFromHistory(taxonomyCode, options);
    }

    const b = benchmark[0];

    // Compare price if provided
    let comparison: 'below_market' | 'at_market' | 'above_market' = 'at_market';
    let percentileRank: number | undefined;
    let potentialSavings: number | undefined;

    if (options.yourPrice !== undefined && b.median_price) {
      const comparisonResult = await this.comparePriceToMarket(
        taxonomyCode,
        options.yourPrice,
        options.industry,
        options.region
      );
      comparison = comparisonResult.comparison;
      percentileRank = comparisonResult.percentile_rank;
      potentialSavings = comparisonResult.potential_savings;
    }

    // Get taxonomy name
    const { data: taxonomy } = await this.supabase
      .from('product_service_taxonomy')
      .select('name')
      .eq('code', taxonomyCode)
      .single();

    const result: PriceBenchmark = {
      taxonomy_code: taxonomyCode,
      taxonomy_name: taxonomy?.name || b.taxonomy_name || taxonomyCode,
      current_market_price: {
        avg: b.avg_price || 0,
        median: b.median_price || 0,
        p10: b.p10_price || 0,
        p25: b.p25_price || 0,
        p75: b.p75_price || 0,
        p90: b.p90_price || 0,
        min: 0,
        max: 0,
      },
      your_price: options.yourPrice,
      percentile_rank: percentileRank,
      comparison,
      potential_savings: potentialSavings,
      trend: {
        direction: (b.trend_direction || 'stable') as PriceBenchmark['trend']['direction'],
        change_pct: b.price_change_pct || 0,
        period: 'month-over-month',
      },
      confidence: b.confidence || 0.8,
      sample_size: b.sample_count || 0,
      last_updated: b.as_of_date || new Date().toISOString(),
    };

    // Store in cache
    try {
      const cache = await this.ensureCacheReady();
      await cache.set(cacheKey, result, 3600); // 1 hour cache
    } catch {
      this.syncCache.set(cacheKey, result, 3600);
    }

    return result;
  }

  /**
   * Compare a price against market benchmark using database function
   */
  private async comparePriceToMarket(
    taxonomyCode: string,
    unitPrice: number,
    industry?: string,
    region?: string
  ): Promise<{
    comparison: 'below_market' | 'at_market' | 'above_market';
    percentile_rank: number;
    potential_savings: number;
  }> {
    const { data, error } = await this.supabase.rpc('compare_price_to_market', {
      p_taxonomy_code: taxonomyCode,
      p_unit_price: unitPrice,
      p_industry: industry || null,
      p_region: region || null,
    });

    if (error || !data || data.length === 0) {
      return {
        comparison: 'at_market',
        percentile_rank: 50,
        potential_savings: 0,
      };
    }

    const result = data[0];
    return {
      comparison: result.comparison as 'below_market' | 'at_market' | 'above_market',
      percentile_rank: result.percentile_rank || 50,
      potential_savings: result.potential_savings || 0,
    };
  }

  /**
   * Calculate benchmark from raw price history when indices not available
   */
  private async calculateBenchmarkFromHistory(
    taxonomyCode: string,
    options: { yourPrice?: number; industry?: string; region?: string }
  ): Promise<PriceBenchmark> {
    const { data: history } = await this.supabase
      .from('market_price_history')
      .select('unit_price')
      .eq('taxonomy_code', taxonomyCode)
      .eq('is_outlier', false)
      .order('effective_date', { ascending: false })
      .limit(100);

    const { data: taxonomy } = await this.supabase
      .from('product_service_taxonomy')
      .select('name')
      .eq('code', taxonomyCode)
      .single();

    if (!history || history.length < 3) {
      throw new Error(`Insufficient price data for taxonomy code: ${taxonomyCode}`);
    }

    const prices = history.map(h => h.unit_price).sort((a, b) => a - b);
    const n = prices.length;

    const avg = prices.reduce((a, b) => a + b, 0) / n;
    const median = prices[Math.floor(n / 2)];
    const p10 = prices[Math.floor(n * 0.1)];
    const p25 = prices[Math.floor(n * 0.25)];
    const p75 = prices[Math.floor(n * 0.75)];
    const p90 = prices[Math.floor(n * 0.9)];

    let comparison: 'below_market' | 'at_market' | 'above_market' = 'at_market';
    let percentileRank: number | undefined;
    let potentialSavings: number | undefined;

    if (options.yourPrice !== undefined) {
      const below = prices.filter(p => p < options.yourPrice!).length;
      percentileRank = (below / n) * 100;
      comparison = percentileRank < 25 ? 'below_market' :
                   percentileRank > 75 ? 'above_market' : 'at_market';
      potentialSavings = options.yourPrice > median ? options.yourPrice - median : 0;
    }

    return {
      taxonomy_code: taxonomyCode,
      taxonomy_name: taxonomy?.name || taxonomyCode,
      current_market_price: {
        avg,
        median,
        p10,
        p25,
        p75,
        p90,
        min: prices[0],
        max: prices[n - 1],
      },
      your_price: options.yourPrice,
      percentile_rank: percentileRank,
      comparison,
      potential_savings: potentialSavings,
      trend: { direction: 'stable', change_pct: 0, period: 'insufficient data' },
      confidence: Math.min(0.8, n / 50),
      sample_size: n,
      last_updated: new Date().toISOString(),
    };
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  /**
   * Detect price anomalies for a contract or specific line item
   */
  async detectAnomalies(
    contractIdOrLineItemId: string,
    isLineItem = false
  ): Promise<PriceAnomaly[]> {
    const anomalies: PriceAnomaly[] = [];

    // Get line items
    let lineItems: Array<{
      id: string;
      contract_id: string;
      taxonomy_code: string | null;
      item_name: string;
      unit_price: number;
      quantity: number;
    }>;

    if (isLineItem) {
      const { data } = await this.supabase
        .from('contract_line_items')
        .select('id, contract_id, taxonomy_code, item_name, unit_price, quantity')
        .eq('id', contractIdOrLineItemId)
        .eq('enterprise_id', this.enterpriseId)
        .single();
      lineItems = data ? [data] : [];
    } else {
      const { data } = await this.supabase
        .from('contract_line_items')
        .select('id, contract_id, taxonomy_code, item_name, unit_price, quantity')
        .eq('contract_id', contractIdOrLineItemId)
        .eq('enterprise_id', this.enterpriseId);
      lineItems = data || [];
    }

    // Check each line item
    for (const item of lineItems) {
      if (!item.taxonomy_code) continue;

      try {
        const benchmark = await this.getPriceBenchmark(item.taxonomy_code, {
          yourPrice: item.unit_price,
        });

        if (!benchmark.current_market_price.median) continue;

        const deviationPct = ((item.unit_price - benchmark.current_market_price.median) /
          benchmark.current_market_price.median) * 100;

        if (Math.abs(deviationPct) >= this.ANOMALY_THRESHOLDS.low) {
          const severity = this.calculateSeverity(Math.abs(deviationPct));
          const isAboveMarket = deviationPct > 0;

          const anomaly: PriceAnomaly = {
            id: crypto.randomUUID(),
            line_item_id: item.id,
            contract_id: item.contract_id,
            taxonomy_code: item.taxonomy_code,
            type: isAboveMarket ? 'above_market' : 'below_market',
            severity,
            detected_price: item.unit_price,
            expected_price: benchmark.current_market_price.median,
            market_avg_price: benchmark.current_market_price.avg,
            deviation_pct: deviationPct,
            percentile_rank: benchmark.percentile_rank || 50,
            description: this.generateAnomalyDescription(
              item.item_name,
              deviationPct,
              benchmark
            ),
            recommendation: this.generateAnomalyRecommendation(severity, isAboveMarket, deviationPct),
            potential_savings: isAboveMarket
              ? (item.unit_price - benchmark.current_market_price.median) * item.quantity
              : 0,
            confidence: benchmark.confidence,
          };

          anomalies.push(anomaly);

          // Store anomaly in database
          await this.storeAnomaly(anomaly);
        }
      } catch (error) {
        console.error(`Error checking anomaly for line item ${item.id}:`, error);
      }
    }

    return anomalies;
  }

  /**
   * Calculate severity based on deviation percentage
   */
  private calculateSeverity(deviationPct: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviationPct >= this.ANOMALY_THRESHOLDS.critical) return 'critical';
    if (deviationPct >= this.ANOMALY_THRESHOLDS.high) return 'high';
    if (deviationPct >= this.ANOMALY_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  /**
   * Generate human-readable anomaly description
   */
  private generateAnomalyDescription(
    itemName: string,
    deviationPct: number,
    benchmark: PriceBenchmark
  ): string {
    const direction = deviationPct > 0 ? 'above' : 'below';
    return `"${itemName}" is priced ${Math.abs(deviationPct).toFixed(1)}% ${direction} the market median of $${benchmark.current_market_price.median.toFixed(2)}. Based on ${benchmark.sample_size} comparable transactions.`;
  }

  /**
   * Generate actionable recommendation for anomaly
   */
  private generateAnomalyRecommendation(
    severity: string,
    isAboveMarket: boolean,
    deviationPct: number
  ): string {
    if (!isAboveMarket) {
      return 'Price is competitive. Verify that quality and service levels meet your requirements.';
    }

    switch (severity) {
      case 'critical':
        return `Significant overpayment detected (${deviationPct.toFixed(1)}% above market). Strongly recommend renegotiating terms or seeking alternative vendors immediately.`;
      case 'high':
        return `Notable premium being paid (${deviationPct.toFixed(1)}% above market). Review vendor justification for pricing or request competitive quotes before renewal.`;
      case 'medium':
        return `Moderately above market average (${deviationPct.toFixed(1)}%). Consider negotiating during next renewal cycle or when contract allows.`;
      default:
        return `Minor variance from market (${deviationPct.toFixed(1)}%). Monitor for trends but no immediate action required.`;
    }
  }

  /**
   * Store anomaly in database
   */
  private async storeAnomaly(anomaly: PriceAnomaly): Promise<void> {
    await this.supabase.from('donna_price_anomalies').insert({
      enterprise_id: this.enterpriseId,
      line_item_id: anomaly.line_item_id,
      contract_id: anomaly.contract_id,
      taxonomy_code: anomaly.taxonomy_code,
      anomaly_type: anomaly.type,
      severity: anomaly.severity,
      detected_price: anomaly.detected_price,
      expected_price: anomaly.expected_price,
      market_avg_price: anomaly.market_avg_price,
      deviation_pct: anomaly.deviation_pct,
      percentile_rank: anomaly.percentile_rank,
      description: anomaly.description,
      recommendation: anomaly.recommendation,
      potential_savings: anomaly.potential_savings,
      confidence: anomaly.confidence,
      comparison_basis: 'market_median',
    });
  }

  // ============================================================================
  // MARKET TRENDS
  // ============================================================================

  /**
   * Get market trends for a taxonomy code or industry
   */
  async getTrends(
    taxonomyCode?: string,
    options: {
      industry?: string;
      region?: string;
      period?: string;
    } = {}
  ): Promise<MarketTrend[]> {
    // Try to get existing trends from database
    const query = this.supabase
      .from('donna_market_trends')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('confidence', { ascending: false })
      .limit(10);

    if (taxonomyCode) {
      query.eq('taxonomy_code', taxonomyCode);
    }
    if (options.industry) {
      query.eq('industry', options.industry);
    }
    if (options.region) {
      query.eq('region', options.region);
    }

    const { data: trends } = await query;

    if (trends && trends.length > 0) {
      return trends.map(t => ({
        taxonomy_code: t.taxonomy_code,
        trend_type: t.trend_type,
        strength: t.trend_strength as MarketTrend['strength'],
        change_pct: t.change_pct,
        description: t.description,
        drivers: t.drivers || [],
        prediction: t.prediction_next_period?.description || 'Insufficient data for prediction',
        confidence: t.confidence,
        period: t.trend_period,
        start_date: t.start_date,
        end_date: t.end_date,
      }));
    }

    // Generate trends from price history if none exist
    return await this.generateTrendsFromHistory(taxonomyCode, options);
  }

  /**
   * Generate trends by analyzing price history
   */
  private async generateTrendsFromHistory(
    taxonomyCode?: string,
    options: { industry?: string; region?: string } = {}
  ): Promise<MarketTrend[]> {
    const query = this.supabase
      .from('market_price_history')
      .select('taxonomy_code, unit_price, effective_date, industry')
      .eq('is_outlier', false)
      .gte('effective_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('effective_date', { ascending: true });

    if (taxonomyCode) {
      query.eq('taxonomy_code', taxonomyCode);
    }
    if (options.industry) {
      query.eq('industry', options.industry);
    }

    const { data: history } = await query;

    if (!history || history.length < 10) {
      return [];
    }

    // Group by taxonomy and calculate trends
    const trendsByCode = new Map<string, number[]>();
    for (const record of history) {
      if (!trendsByCode.has(record.taxonomy_code)) {
        trendsByCode.set(record.taxonomy_code, []);
      }
      trendsByCode.get(record.taxonomy_code)!.push(record.unit_price);
    }

    const trends: MarketTrend[] = [];
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    for (const [code, prices] of trendsByCode) {
      if (prices.length < 5) continue;

      const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
      const secondHalf = prices.slice(Math.floor(prices.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const changePct = ((secondAvg - firstAvg) / firstAvg) * 100;

      if (Math.abs(changePct) >= 3) {
        // Get taxonomy name
        const { data: taxonomy } = await this.supabase
          .from('product_service_taxonomy')
          .select('name')
          .eq('code', code)
          .single();

        trends.push({
          taxonomy_code: code,
          taxonomy_name: taxonomy?.name,
          trend_type: changePct > 0 ? 'price_increase' : 'price_decrease',
          strength: this.calculateTrendStrength(Math.abs(changePct)),
          change_pct: changePct,
          description: `${changePct > 0 ? 'Increasing' : 'Decreasing'} price trend of ${Math.abs(changePct).toFixed(1)}% over the past 90 days`,
          drivers: ['Market dynamics', 'Supply and demand changes'],
          prediction: `Expected to ${changePct > 0 ? 'continue increasing' : 'stabilize'} in the next quarter`,
          confidence: Math.min(0.9, prices.length / 50),
          period: 'quarterly',
          start_date: ninetyDaysAgo.toISOString().split('T')[0],
          end_date: now.toISOString().split('T')[0],
        });
      }
    }

    return trends.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
  }

  /**
   * Calculate trend strength based on change percentage
   */
  private calculateTrendStrength(changePct: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (changePct >= 20) return 'very_strong';
    if (changePct >= 15) return 'strong';
    if (changePct >= 7) return 'moderate';
    return 'weak';
  }

  // ============================================================================
  // VENDOR PRICE COMPARISON
  // ============================================================================

  /**
   * Compare vendor pricing against market benchmarks
   */
  async compareVendorPricing(
    vendorId: string,
    taxonomyCode?: string
  ): Promise<VendorPriceComparison> {
    // Get vendor details
    const { data: vendor } = await this.supabase
      .from('vendors')
      .select('name')
      .eq('id', vendorId)
      .single();

    // Get line items from contracts with this vendor
    let query = this.supabase
      .from('contract_line_items')
      .select(`
        taxonomy_code,
        unit_price,
        contracts!inner(vendor_id)
      `)
      .eq('contracts.vendor_id', vendorId)
      .eq('enterprise_id', this.enterpriseId)
      .not('taxonomy_code', 'is', null);

    if (taxonomyCode) {
      query = query.eq('taxonomy_code', taxonomyCode);
    }

    const { data: lineItems } = await query;

    // Group by taxonomy code
    const comparisons = new Map<string, number[]>();

    for (const item of lineItems || []) {
      const typedItem = item as { taxonomy_code: string; unit_price: number };
      if (!typedItem.taxonomy_code) continue;

      if (!comparisons.has(typedItem.taxonomy_code)) {
        comparisons.set(typedItem.taxonomy_code, []);
      }
      comparisons.get(typedItem.taxonomy_code)!.push(typedItem.unit_price);
    }

    const categoryComparisons: CategoryComparison[] = [];
    let totalDeviation = 0;
    let comparisonCount = 0;
    let totalPotentialSavings = 0;

    for (const [code, prices] of comparisons) {
      try {
        const benchmark = await this.getPriceBenchmark(code);
        const vendorAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const deviationPct = ((vendorAvg - benchmark.current_market_price.median) /
          benchmark.current_market_price.median) * 100;

        // Get category name
        const { data: taxonomy } = await this.supabase
          .from('product_service_taxonomy')
          .select('name')
          .eq('code', code)
          .single();

        categoryComparisons.push({
          taxonomy_code: code,
          category_name: taxonomy?.name || code,
          vendor_avg_price: vendorAvg,
          market_avg_price: benchmark.current_market_price.avg,
          market_median_price: benchmark.current_market_price.median,
          deviation_pct: deviationPct,
          comparison: deviationPct > 10 ? 'above_market' :
                     deviationPct < -10 ? 'below_market' : 'at_market',
          sample_count: prices.length,
        });

        totalDeviation += deviationPct;
        comparisonCount++;

        if (deviationPct > 0) {
          totalPotentialSavings += (vendorAvg - benchmark.current_market_price.median) * prices.length;
        }
      } catch (error) {
        console.error(`Error comparing vendor pricing for ${code}:`, error);
      }
    }

    const avgDeviation = comparisonCount > 0 ? totalDeviation / comparisonCount : 0;

    return {
      vendor_id: vendorId,
      vendor_name: vendor?.name || 'Unknown Vendor',
      overall_comparison: avgDeviation > 10 ? 'above_market' :
                         avgDeviation < -10 ? 'below_market' : 'competitive',
      avg_deviation_pct: avgDeviation,
      category_comparisons: categoryComparisons.sort((a, b) => b.deviation_pct - a.deviation_pct),
      recommendation: this.generateVendorRecommendation(avgDeviation, comparisonCount),
      total_potential_savings: totalPotentialSavings,
    };
  }

  /**
   * Generate recommendation for vendor pricing
   */
  private generateVendorRecommendation(avgDeviation: number, categoryCount: number): string {
    if (categoryCount === 0) {
      return 'Insufficient data for comparison. Need line items with taxonomy codes assigned.';
    }

    if (avgDeviation > 20) {
      return 'Vendor pricing is significantly above market (>20%). Strongly recommend competitive bidding for next renewal or seeking alternative vendors.';
    } else if (avgDeviation > 10) {
      return 'Vendor pricing is moderately above market (10-20%). Consider renegotiation using market data as leverage.';
    } else if (avgDeviation < -10) {
      return 'Vendor offers competitive pricing below market rates. Verify service quality meets requirements and consider extending relationship.';
    } else {
      return 'Vendor pricing is aligned with market rates. Maintain relationship with periodic market checks.';
    }
  }

  // ============================================================================
  // TAXONOMY MATCHING
  // ============================================================================

  /**
   * Match an item name to taxonomy codes
   */
  async matchTaxonomy(
    itemName: string,
    itemDescription?: string,
    limit = 5
  ): Promise<TaxonomyMatch[]> {
    const matches: TaxonomyMatch[] = [];

    // 1. Try exact/partial text match
    const { data: textMatches } = await this.supabase.rpc('search_taxonomy', {
      p_query: itemName,
      p_level: null,
      p_limit: limit,
    });

    if (textMatches) {
      for (const match of textMatches) {
        const m = match as { code: string; name: string; relevance: number; description?: string };
        matches.push({
          code: m.code,
          name: m.name,
          confidence: Math.min(0.95, m.relevance),
          match_method: m.relevance > 0.9 ? 'exact' : 'fuzzy',
          description: m.description,
        });
      }
    }

    // 2. If we have embeddings service, try semantic matching
    // This would require the embedding service integration
    // For now, return text matches sorted by confidence

    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Queue item for human review if confidence is low
   */
  async queueForReview(
    lineItemId: string,
    suggestions: TaxonomyMatch[]
  ): Promise<string | null> {
    if (suggestions.length === 0 || suggestions[0].confidence >= this.MIN_TAXONOMY_CONFIDENCE) {
      return null; // No need for review
    }

    const { data, error } = await this.supabase.rpc('queue_for_taxonomy_review', {
      p_line_item_id: lineItemId,
      p_suggestions: suggestions.map(s => ({
        code: s.code,
        name: s.name,
        confidence: s.confidence,
        reason: s.match_method,
      })),
      p_best_confidence: suggestions[0]?.confidence || 0,
    });

    if (error) {
      console.error('Error queueing for review:', error);
      return null;
    }

    return data;
  }

  // ============================================================================
  // PRICE DATA CONTRIBUTION
  // ============================================================================

  /**
   * Contribute anonymized price data to the market intelligence pool
   */
  async contributePriceData(lineItemId: string): Promise<boolean> {
    // Get line item with contract context
    const { data: lineItem } = await this.supabase
      .from('contract_line_items')
      .select(`
        *,
        contracts:contract_id (
          created_at,
          status
        )
      `)
      .eq('id', lineItemId)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (!lineItem || !lineItem.taxonomy_code) {
      return false;
    }

    // Get enterprise context for anonymization
    const { data: enterprise } = await this.supabase
      .from('enterprises')
      .select('industry, employee_count')
      .eq('id', this.enterpriseId)
      .single();

    // Use database function to contribute anonymized data
    const { error } = await this.supabase.rpc('contribute_price_data', {
      p_taxonomy_code: lineItem.taxonomy_code,
      p_unit_price: lineItem.unit_price,
      p_enterprise_id: this.enterpriseId,
      p_industry: enterprise?.industry || 'unknown',
      p_company_size: this.categorizeCompanySize(enterprise?.employee_count),
      p_region: null, // Could derive from enterprise address
      p_quantity_range: this.categorizeQuantity(lineItem.quantity),
      p_currency: lineItem.currency || 'USD',
      p_pricing_model: lineItem.pricing_model || 'fixed',
      p_pricing_frequency: lineItem.pricing_frequency,
      p_line_item_id: lineItemId,
    });

    if (error) {
      console.error('Error contributing price data:', error);
      return false;
    }

    // Learn from this data point
    await this.donnaAI.learn('pricing', {
      content: `Price data for ${lineItem.taxonomy_code}`,
      context: {
        unit_price: lineItem.unit_price,
        quantity: lineItem.quantity,
        pricing_model: lineItem.pricing_model,
      },
      type: 'price_contribution',
      industry: enterprise?.industry,
      companySize: this.categorizeCompanySize(enterprise?.employee_count),
    });

    return true;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private categorizeCompanySize(employeeCount?: number): string {
    if (!employeeCount) return 'unknown';
    if (employeeCount < 10) return 'micro';
    if (employeeCount < 50) return 'small';
    if (employeeCount < 250) return 'medium';
    if (employeeCount < 1000) return 'large';
    return 'enterprise';
  }

  private categorizeQuantity(quantity: number): string {
    if (quantity <= 1) return 'single';
    if (quantity <= 10) return '2-10';
    if (quantity <= 50) return '11-50';
    if (quantity <= 100) return '51-100';
    return '100+';
  }

  // ============================================================================
  // DASHBOARD SUMMARIES
  // ============================================================================

  /**
   * Get anomaly summary for enterprise dashboard
   */
  async getAnomalySummary(): Promise<{
    total_anomalies: number;
    open_anomalies: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    total_potential_savings: number;
    avg_deviation_pct: number;
  }> {
    const { data } = await this.supabase.rpc('get_price_anomaly_summary', {
      p_enterprise_id: this.enterpriseId,
    });

    if (!data || data.length === 0) {
      return {
        total_anomalies: 0,
        open_anomalies: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        total_potential_savings: 0,
        avg_deviation_pct: 0,
      };
    }

    return data[0];
  }

  /**
   * Get review queue summary
   */
  async getReviewQueueSummary(): Promise<{
    total_pending: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    avg_confidence: number;
    oldest_pending_days: number;
  }> {
    const { data } = await this.supabase.rpc('get_review_queue_summary', {
      p_enterprise_id: this.enterpriseId,
    });

    if (!data || data.length === 0) {
      return {
        total_pending: 0,
        high_priority: 0,
        medium_priority: 0,
        low_priority: 0,
        avg_confidence: 0,
        oldest_pending_days: 0,
      };
    }

    return data[0];
  }
}
