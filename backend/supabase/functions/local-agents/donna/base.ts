/// <reference path="../../../types/global.d.ts" />

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCache, getCacheSync, UnifiedCache, initializeCache } from '../../../functions-utils/cache-factory.ts';
import { getFeatureFlag } from '../config/index.ts';
import {
  chiSquaredTest,
  extractKeywords as nlpExtractKeywords,
  extractBigrams,
  TfIdf,
} from '../utils/nlp.ts';

export interface DonnaInsight {
  type: string;
  confidence: number;
  recommendation: string;
  applicableScenarios: string[];
  sourcePatternCount: number;
  metadata?: {
    totalFrequency: number;
    commonKeywords: string[];
    industries: string[];
  };
}

export interface DonnaLearning {
  patternId: string;
  patternType: string;
  confidence: number;
  frequency: number;
  lastSeen: string;
  insights: DonnaInsight[];
}

export interface AnonymizedData {
  content: string;
  context: Record<string, unknown>;
  type: string;
  industry?: string;
  companySize?: string;
  useCase?: string;
}

// Database table type interfaces
export interface DonnaPattern {
  id: string;
  pattern_type: string;
  pattern_signature: string;
  pattern_data: {
    type?: string;
    data?: unknown;
    context?: {
      industries?: string[];
      company_sizes?: string[];
      use_cases?: string[];
    };
    common_keywords?: string[];
    recommendation?: string;
    industry_distribution?: Record<string, number>;
  };
  frequency: number;
  confidence: number;
  last_seen: string;
  context: {
    industries?: string[];
    company_sizes?: string[];
    use_cases?: string[];
  };
  enterprise_id: string | null;
  created_at: string;
}

export interface DonnaBestPractice {
  id: string;
  practice_type: string;
  title: string;
  description: string;
  conditions: Array<{ field: string; value: unknown }>;
  actions: Array<{ type: string; value: unknown }>;
  success_rate: number;
  usage_count: number;
  industry: string | null;
  company_size: string | null;
  tags: string[];
  enterprise_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonnaQValue {
  id: string;
  state_hash: string;
  action: string;
  q_value: number;
  visits: number;
  last_update: string;
  context_type: string | null;
  enterprise_id: string | null;
}

export interface ExtractedPattern {
  type: string;
  data: unknown;
  context: Record<string, unknown>;
}

export interface Outcome {
  success: boolean;
  metrics?: {
    performance_score?: number;
    time_saved?: number;
    cost_reduction?: number;
    [key: string]: unknown;
  };
}

export interface Condition {
  field: string;
  value: unknown;
}

export class DonnaAI {
  private supabase: SupabaseClient;
  private syncCache = getCacheSync();
  private asyncCache: UnifiedCache | null = null;
  private cacheInitialized = false;
  // private _knowledgeCache: Map<string, any> = new Map();
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly PATTERN_FREQUENCY_THRESHOLD = 3;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
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
      console.error('DonnaAI: Failed to initialize async cache:', error);
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

  // Main analysis method that provides cross-enterprise insights
  async analyze(
    queryType: string,
    queryContext: Record<string, unknown>,
    enterpriseId?: string,
  ): Promise<{
    insights: DonnaInsight[];
    recommendations: string[];
    bestPractices: unknown[];
    confidence: number;
  }> {
    try {
      // Get relevant patterns from all enterprises
      const patterns = await this.getRelevantPatterns(queryType, queryContext);

      // Get best practices
      const bestPractices = await this.getBestPractices(queryType, queryContext);

      // Generate insights based on cross-enterprise learning
      const insights = this.generateInsights(patterns, queryContext);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        queryType,
        queryContext,
        patterns,
        bestPractices,
      );

      // Calculate overall confidence
      const confidence = this.calculateConfidence(patterns, insights);

      // Log the analysis for learning
      await this.logAnalysis(queryType, queryContext, insights, enterpriseId);

      return {
        insights,
        recommendations,
        bestPractices: bestPractices.slice(0, 5), // Top 5 best practices
        confidence,
      };
    } catch (error) {
      console.error('Donna AI analysis error:', error);
      return {
        insights: [],
        recommendations: [],
        bestPractices: [],
        confidence: 0,
      };
    }
  }

  // Learn from new data (anonymized)
  async learn(
    dataType: string,
    anonymizedData: AnonymizedData,
    outcome?: Outcome,
  ): Promise<void> {
    try {
      // Extract patterns from the data
      const patterns = this.extractPatterns(anonymizedData);

      // Store patterns in the knowledge base
      for (const pattern of patterns) {
        await this.storePattern(pattern, dataType, anonymizedData);
      }

      // Update Q-learning values if outcome provided
      if (outcome) {
        await this.updateQLearning(dataType, anonymizedData, outcome);
      }

      // Update best practices if successful outcome
      if (outcome?.success && outcome.metrics) {
        await this.updateBestPractices(dataType, anonymizedData, outcome.metrics);
      }
    } catch (error) {
      console.error('Donna AI learning error:', error);
    }
  }

  // Get relevant patterns across all enterprises (uses async cache with Redis support)
  private async getRelevantPatterns(
    queryType: string,
    queryContext: Record<string, unknown>,
  ): Promise<DonnaPattern[]> {
    const cacheKey = `donna_patterns_${queryType}_${JSON.stringify(queryContext)}`;

    // Try async cache first
    try {
      const cache = await this.ensureCacheReady();
      const cached = await cache.get<DonnaPattern[]>(cacheKey);
      if (cached) {return cached;}
    } catch {
      // Try sync cache as fallback
      const syncCached = this.syncCache.get(cacheKey);
      if (syncCached) {return syncCached as DonnaPattern[];}
    }

    const { data: patterns } = await this.supabase
      .from('donna_patterns')
      .select('*')
      .or(`pattern_type.eq.${queryType},pattern_type.like.%${queryType}%`)
      .gte('confidence', this.CONFIDENCE_THRESHOLD)
      .gte('frequency', this.PATTERN_FREQUENCY_THRESHOLD)
      .order('confidence', { ascending: false })
      .limit(50);

    const relevantPatterns = this.filterRelevantPatterns(patterns || [], queryContext);

    // Store in cache
    try {
      const cache = await this.ensureCacheReady();
      await cache.set(cacheKey, relevantPatterns, 300); // 5 min cache
    } catch {
      this.syncCache.set(cacheKey, relevantPatterns, 300);
    }

    return relevantPatterns;
  }

  // Get best practices for a scenario
  private async getBestPractices(
    queryType: string,
    queryContext: Record<string, unknown>,
  ): Promise<DonnaBestPractice[]> {
    const { data: practices } = await this.supabase
      .from('donna_best_practices')
      .select('*')
      .eq('practice_type', queryType)
      .gte('success_rate', 0.7)
      .order('success_rate', { ascending: false })
      .order('usage_count', { ascending: false })
      .limit(10);

    return this.filterByContext(practices || [], queryContext);
  }

  // Generate insights from patterns
  private generateInsights(
    patterns: DonnaPattern[],
    queryContext: Record<string, unknown>,
  ): DonnaInsight[] {
    const insights: DonnaInsight[] = [];
    const patternGroups = this.groupPatterns(patterns);

    for (const [groupKey, groupPatterns] of patternGroups) {
      if (groupPatterns.length >= 2) {
        const insight = this.createInsightFromPatterns(groupKey, groupPatterns, queryContext);
        if (insight) {
          insights.push(insight);
        }
      }
    }

    // Sort by confidence
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  // Create insight from pattern group
  private createInsightFromPatterns(
    groupKey: string,
    patterns: DonnaPattern[],
    _context: Record<string, unknown>,
  ): DonnaInsight | null {
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);

    if (avgConfidence < this.CONFIDENCE_THRESHOLD) {return null;}

    const commonKeywords = this.extractCommonKeywords(patterns);
    const recommendation = this.generateRecommendationText(groupKey, patterns, commonKeywords);

    return {
      type: groupKey,
      confidence: avgConfidence,
      recommendation,
      applicableScenarios: this.identifyScenarios(patterns),
      sourcePatternCount: patterns.length,
      metadata: {
        totalFrequency,
        commonKeywords,
        industries: this.extractIndustries(patterns),
      },
    };
  }

  // Generate recommendations
  private async generateRecommendations(
    _queryType: string,
    queryContext: Record<string, unknown>,
    patterns: DonnaPattern[],
    bestPractices: DonnaBestPractice[],
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Recommendations from best practices
    for (const practice of bestPractices.slice(0, 3)) {
      if (this.isPracticeApplicable(practice, queryContext)) {
        recommendations.push(this.formatPracticeRecommendation(practice));
      }
    }

    // Recommendations from patterns
    const patternRecommendations = this.generatePatternRecommendations(patterns, queryContext);
    recommendations.push(...patternRecommendations);

    // Remove duplicates and limit
    return [...new Set(recommendations)].slice(0, 5);
  }

  // Extract patterns from anonymized data
  private extractPatterns(data: AnonymizedData): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    // Extract keyword patterns
    const keywords = this.extractKeywords(data.content);
    if (keywords.length > 0) {
      patterns.push({
        type: 'keyword_pattern',
        data: keywords,
        context: data.context,
      });
    }

    // Extract structural patterns
    const structural = this.extractStructuralPatterns(data);
    patterns.push(...structural);

    // Extract behavioral patterns
    if (data.context.action_sequence) {
      patterns.push({
        type: 'behavioral_pattern',
        data: data.context.action_sequence,
        context: { type: data.type },
      });
    }

    return patterns;
  }

  // Store pattern in knowledge base
  private async storePattern(
    pattern: ExtractedPattern,
    dataType: string,
    sourceData: AnonymizedData,
  ): Promise<void> {
    const patternSignature = this.generatePatternSignature(pattern);

    // Check if pattern exists
    const { data: existing } = await this.supabase
      .from('donna_patterns')
      .select('id, frequency, confidence, pattern_data')
      .eq('pattern_signature', patternSignature)
      .single();

    if (existing) {
      // Update existing pattern
      await this.supabase
        .from('donna_patterns')
        .update({
          frequency: existing.frequency + 1,
          confidence: Math.min(1, existing.confidence * 1.05), // Increase confidence
          last_seen: new Date().toISOString(),
          pattern_data: {
            ...pattern,
            industry_distribution: this.updateIndustryDistribution(
              existing,
              sourceData.industry,
            ),
          },
        })
        .eq('id', existing.id);
    } else {
      // Create new pattern
      await this.supabase
        .from('donna_patterns')
        .insert({
          pattern_type: dataType,
          pattern_signature: patternSignature,
          pattern_data: pattern,
          frequency: 1,
          confidence: 0.5,
          context: {
            industries: sourceData.industry ? [sourceData.industry] : [],
            company_sizes: sourceData.companySize ? [sourceData.companySize] : [],
            use_cases: sourceData.useCase ? [sourceData.useCase] : [],
          },
        });
    }
  }

  // Update Q-learning values
  private async updateQLearning(
    dataType: string,
    data: AnonymizedData,
    outcome: Outcome,
  ): Promise<void> {
    const stateHash = this.generateStateHash(dataType, data.context);
    const action = (data.context.action as string) || 'default';
    const reward = this.calculateReward(outcome);

    // Get current Q-value
    const { data: qValue } = await this.supabase
      .from('donna_q_values')
      .select('q_value, visits')
      .eq('state_hash', stateHash)
      .eq('action', action)
      .single();

    if (qValue) {
      // Update Q-value using Q-learning formula
      const learningRate = 0.1;
      const newQValue = qValue.q_value + learningRate * (reward - qValue.q_value);

      await this.supabase
        .from('donna_q_values')
        .update({
          q_value: newQValue,
          visits: qValue.visits + 1,
          last_update: new Date().toISOString(),
        })
        .eq('state_hash', stateHash)
        .eq('action', action);
    } else {
      // Insert new Q-value
      await this.supabase
        .from('donna_q_values')
        .insert({
          state_hash: stateHash,
          action,
          q_value: reward,
          visits: 1,
          context_type: dataType,
        });
    }
  }

  // Update best practices
  private async updateBestPractices(
    dataType: string,
    data: AnonymizedData,
    metrics: Outcome['metrics'],
  ): Promise<void> {
    if (!metrics) {return;}

    const practiceType = dataType;
    const conditions = this.extractConditions(data.context);
    const actions = this.extractActions(data.context);

    // Check if similar practice exists
    const { data: existing } = await this.supabase
      .from('donna_best_practices')
      .select('*')
      .eq('practice_type', practiceType)
      .single();

    if (existing) {
      // Update success rate
      const newSuccessRate = (existing.success_rate * existing.usage_count + 1) /
                           (existing.usage_count + 1);

      await this.supabase
        .from('donna_best_practices')
        .update({
          success_rate: newSuccessRate,
          usage_count: existing.usage_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else if (
      typeof metrics.performance_score === 'number' &&
      metrics.performance_score > 0.8
    ) {
      // Only create new best practice if performance is good
      await this.supabase
        .from('donna_best_practices')
        .insert({
          practice_type: practiceType,
          title: `Best practice for ${practiceType}`,
          description: this.generatePracticeDescription(data, metrics),
          conditions,
          actions,
          success_rate: metrics.performance_score,
          usage_count: 1,
          industry: data.industry,
          company_size: data.companySize,
          tags: this.extractTags(data),
        });
    }
  }

  // Helper methods
  private filterRelevantPatterns(patterns: DonnaPattern[], context: Record<string, unknown>): DonnaPattern[] {
    return patterns.filter(pattern => {
      const patternContext = pattern.pattern_data?.context || {};

      // Check industry match if specified
      if (context.industry && patternContext.industries) {
        if (!patternContext.industries.includes(context.industry as string)) {
          return false;
        }
      }

      // Check company size match if specified
      if (context.companySize && patternContext.company_sizes) {
        if (!patternContext.company_sizes.includes(context.companySize as string)) {
          return false;
        }
      }

      return true;
    });
  }

  private filterByContext(items: DonnaBestPractice[], context: Record<string, unknown>): DonnaBestPractice[] {
    return items.filter(item => {
      // Apply context-based filtering
      if (context.industry && item.industry && item.industry !== context.industry) {
        return false;
      }

      if (context.companySize && item.company_size && item.company_size !== context.companySize) {
        return false;
      }

      return true;
    });
  }

  private groupPatterns(patterns: DonnaPattern[]): Map<string, DonnaPattern[]> {
    const groups = new Map<string, DonnaPattern[]>();

    for (const pattern of patterns) {
      const key = pattern.pattern_type || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(pattern);
    }

    return groups;
  }

  private extractCommonKeywords(patterns: DonnaPattern[]): string[] {
    const keywordCounts = new Map<string, number>();

    for (const pattern of patterns) {
      const keywords = pattern.pattern_data?.common_keywords || [];
      for (const keyword of keywords) {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      }
    }

    // Return keywords that appear in at least half of the patterns
    const threshold = patterns.length / 2;
    return Array.from(keywordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([keyword]) => keyword)
      .slice(0, 10);
  }

  private generateRecommendationText(
    groupKey: string,
    patterns: DonnaPattern[],
    keywords: string[],
  ): string {
    const frequency = patterns.reduce((sum, p) => sum + p.frequency, 0);

    return `Based on ${frequency} similar cases across multiple organizations, ` +
           `consider implementing ${groupKey} strategies that focus on: ${keywords.join(', ')}. ` +
           'This approach has shown consistent success in similar scenarios.';
  }

  private identifyScenarios(patterns: DonnaPattern[]): string[] {
    const scenarios = new Set<string>();

    for (const pattern of patterns) {
      const context = pattern.pattern_data?.context || {};
      if (context.use_cases) {
        for (const useCase of context.use_cases) {
          scenarios.add(useCase);
        }
      }
    }

    return Array.from(scenarios);
  }

  private extractIndustries(patterns: DonnaPattern[]): string[] {
    const industries = new Set<string>();

    for (const pattern of patterns) {
      const context = pattern.pattern_data?.context || {};
      if (context.industries) {
        for (const industry of context.industries) {
          industries.add(industry);
        }
      }
    }

    return Array.from(industries);
  }

  private isPracticeApplicable(practice: DonnaBestPractice, context: Record<string, unknown>): boolean {
    // Check conditions
    if (practice.conditions && Array.isArray(practice.conditions)) {
      for (const condition of practice.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateCondition(condition: Condition, context: Record<string, unknown>): boolean {
    // Simple condition evaluation
    return context[condition.field] === condition.value;
  }

  private formatPracticeRecommendation(practice: DonnaBestPractice): string {
    return `${practice.title}: ${practice.description} ` +
           `(${Math.round(practice.success_rate * 100)}% success rate across ${practice.usage_count} implementations)`;
  }

  private generatePatternRecommendations(patterns: DonnaPattern[], context: Record<string, unknown>): string[] {
    const recommendations: string[] = [];
    const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.8);

    for (const pattern of highConfidencePatterns.slice(0, 3)) {
      const recommendation = this.createPatternRecommendation(pattern, context);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private createPatternRecommendation(pattern: DonnaPattern, _context: Record<string, unknown>): string | null {
    const data = pattern.pattern_data;
    if (!data) {return null;}

    return `Pattern analysis suggests: ${data.recommendation || 'Consider applying this pattern'} ` +
           `(observed ${pattern.frequency} times with ${Math.round(pattern.confidence * 100)}% confidence)`;
  }

  private extractKeywords(text: string): string[] {
    // Use enhanced NLP keyword extraction with TF-IDF-like scoring
    // Also extract meaningful bigrams for phrase-level patterns
    const keywords = nlpExtractKeywords(text, 15);

    // Add top bigrams for phrase-level analysis
    const bigrams = extractBigrams(text, { removeStopwords: true, minCount: 1 })
      .slice(0, 5)
      .map(b => b.ngram);

    return [...keywords, ...bigrams].slice(0, 20);
  }

  private extractStructuralPatterns(data: AnonymizedData): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    // Extract value range patterns
    if (data.context.value_range) {
      patterns.push({
        type: 'value_pattern',
        data: { range: data.context.value_range },
        context: { type: data.type },
      });
    }

    // Extract temporal patterns
    if (data.context.time_of_day || data.context.day_of_week) {
      patterns.push({
        type: 'temporal_pattern',
        data: {
          time_of_day: data.context.time_of_day,
          day_of_week: data.context.day_of_week,
        },
        context: { type: data.type },
      });
    }

    return patterns;
  }

  private generatePatternSignature(pattern: ExtractedPattern): string {
    const type = pattern.type || 'unknown';
    const data = JSON.stringify(pattern.data || {});

    // Create a simple hash
    let hash = 0;
    const str = `${type}_${data}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `${type}_${Math.abs(hash)}`;
  }

  private updateIndustryDistribution(
    existing: { pattern_data: DonnaPattern['pattern_data'] },
    industry?: string,
  ): Record<string, number> {
    const distribution = existing.pattern_data?.industry_distribution || {};

    if (industry) {
      distribution[industry] = (distribution[industry] || 0) + 1;
    }

    return distribution;
  }

  private generateStateHash(dataType: string, context: Record<string, unknown>): string {
    const relevantKeys = ['action', 'category', 'type', 'value_range'];
    const state: Record<string, unknown> = { dataType };

    for (const key of relevantKeys) {
      if (context[key]) {
        state[key] = context[key];
      }
    }

    return this.generatePatternSignature({ type: 'state', data: state, context: {} });
  }

  private calculateReward(outcome: Outcome): number {
    let reward = outcome.success ? 1 : -1;

    if (outcome.metrics) {
      // Adjust reward based on metrics
      if (typeof outcome.metrics.performance_score === 'number') {
        reward *= outcome.metrics.performance_score;
      }

      if (typeof outcome.metrics.time_saved === 'number') {
        reward += outcome.metrics.time_saved / 100; // Bonus for time saved
      }

      if (typeof outcome.metrics.cost_reduction === 'number') {
        reward += outcome.metrics.cost_reduction / 1000; // Bonus for cost reduction
      }
    }

    return Math.max(-1, Math.min(1, reward)); // Clamp between -1 and 1
  }

  private extractConditions(context: Record<string, unknown>): Array<{ field: string; value: unknown }> {
    const conditions: Array<{ field: string; value: unknown }> = [];

    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        conditions.push({ field: key, value });
      }
    }

    return conditions;
  }

  private extractActions(context: Record<string, unknown>): Array<{ type: string; value: unknown }> {
    const actions: Array<{ type: string; value: unknown }> = [];

    if (context.action) {
      actions.push({ type: 'primary', value: context.action });
    }

    if (context.actions && Array.isArray(context.actions)) {
      actions.push(...context.actions.map((a: unknown) => ({ type: 'secondary', value: a })));
    }

    return actions;
  }

  private generatePracticeDescription(data: AnonymizedData, metrics: Outcome['metrics']): string {
    const parts: string[] = [];

    if (data.type) {
      parts.push(`For ${data.type} scenarios`);
    }

    if (metrics && typeof metrics.performance_score === 'number') {
      parts.push(`achieving ${Math.round(metrics.performance_score * 100)}% performance`);
    }

    if (data.context.key_factors && Array.isArray(data.context.key_factors)) {
      const keyFactors = data.context.key_factors as string[];
      parts.push(`focusing on ${keyFactors.join(', ')}`);
    }

    return parts.join(', ') || 'Proven approach based on successful implementations';
  }

  private extractTags(data: AnonymizedData): string[] {
    const tags: string[] = [];

    if (data.type) {tags.push(data.type);}
    if (data.industry) {tags.push(data.industry);}
    if (data.companySize) {tags.push(data.companySize);}
    if (data.useCase) {tags.push(data.useCase);}

    return tags;
  }

  private calculateConfidence(patterns: DonnaPattern[], insights: DonnaInsight[]): number {
    if (patterns.length === 0 || insights.length === 0) {return 0;}

    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const avgInsightConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;

    // Apply chi-squared statistical validation for pattern significance
    // This ensures patterns with sufficient frequency have validated confidence
    let statisticalBoost = 0;
    if (patterns.length >= 2) {
      const observed = patterns.map(p => p.frequency);
      const totalFreq = observed.reduce((a, b) => a + b, 0);
      const expected = patterns.map(() => totalFreq / patterns.length);

      try {
        const chiResult = chiSquaredTest(observed, expected);
        // If patterns are statistically significant (non-uniform), boost confidence
        if (chiResult.significant && chiResult.pValue < 0.05) {
          statisticalBoost = 0.05; // 5% boost for statistically validated patterns
        }
      } catch {
        // Skip statistical validation if it fails
      }
    }

    // Weight pattern confidence more heavily, add statistical validation boost
    return Math.min(1, avgPatternConfidence * 0.7 + avgInsightConfidence * 0.3 + statisticalBoost);
  }

  private async logAnalysis(
    queryType: string,
    queryContext: Record<string, unknown>,
    insights: DonnaInsight[],
    enterpriseId?: string,
  ): Promise<void> {
    if (!getFeatureFlag('ENABLE_METRICS')) {return;}

    try {
      await this.supabase
        .from('donna_analysis_logs')
        .insert({
          query_type: queryType,
          query_context: queryContext,
          insights_generated: insights.length,
          confidence: this.calculateConfidence([], insights),
          enterprise_id: enterpriseId,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error logging Donna analysis:', error);
    }
  }

  // Get Donna's current knowledge stats
  async getKnowledgeStats(): Promise<{
    totalPatterns: number;
    totalBestPractices: number;
    industries: string[];
    avgConfidence: number;
    topPatternTypes: Array<{ type: string; count: number }>;
  }> {
    const [patterns, practices] = await Promise.all([
      this.supabase
        .from('donna_patterns')
        .select('pattern_type, confidence, context'),
      this.supabase
        .from('donna_best_practices')
        .select('industry, success_rate'),
    ]);

    const stats = {
      totalPatterns: patterns.data?.length || 0,
      totalBestPractices: practices.data?.length || 0,
      industries: new Set<string>(),
      avgConfidence: 0,
      topPatternTypes: new Map<string, number>(),
    };

    // Process patterns
    if (patterns.data) {
      let totalConfidence = 0;

      for (const pattern of patterns.data) {
        totalConfidence += pattern.confidence;

        // Count pattern types
        const type = pattern.pattern_type;
        stats.topPatternTypes.set(type, (stats.topPatternTypes.get(type) || 0) + 1);

        // Extract industries
        const industries = pattern.context?.industries || [];
        for (const industry of industries) {
          stats.industries.add(industry);
        }
      }

      stats.avgConfidence = patterns.data.length > 0 ? totalConfidence / patterns.data.length : 0;
    }

    // Extract industries from practices
    if (practices.data) {
      for (const practice of practices.data) {
        if (practice.industry) {
          stats.industries.add(practice.industry);
        }
      }
    }

    return {
      totalPatterns: stats.totalPatterns,
      totalBestPractices: stats.totalBestPractices,
      industries: Array.from(stats.industries),
      avgConfidence: stats.avgConfidence,
      topPatternTypes: Array.from(stats.topPatternTypes.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }
}