import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { globalCache } from '../../../functions-utils/cache.ts';
import { getFeatureFlag } from '../config/index.ts';

export interface DonnaInsight {
  type: string;
  confidence: number;
  recommendation: string;
  applicableScenarios: string[];
  sourcePatternCount: number;
  metadata?: Record<string, any>;
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
  context: Record<string, any>;
  type: string;
  industry?: string;
  companySize?: string;
  useCase?: string;
}

export class DonnaAI {
  private supabase: SupabaseClient;
  private cache: typeof globalCache;
  // private _knowledgeCache: Map<string, any> = new Map();
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly PATTERN_FREQUENCY_THRESHOLD = 3;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.cache = globalCache;
  }

  // Main analysis method that provides cross-enterprise insights
  async analyze(
    queryType: string,
    queryContext: Record<string, any>,
    enterpriseId?: string,
  ): Promise<{
    insights: DonnaInsight[];
    recommendations: string[];
    bestPractices: any[];
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
    outcome?: {
      success: boolean;
      metrics?: Record<string, any>;
    },
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

  // Get relevant patterns across all enterprises
  private async getRelevantPatterns(
    queryType: string,
    queryContext: Record<string, any>,
  ): Promise<any[]> {
    const cacheKey = `donna_patterns_${queryType}_${JSON.stringify(queryContext)}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {return cached as any[];}

    const { data: patterns } = await this.supabase
      .from('donna_patterns')
      .select('*')
      .or(`pattern_type.eq.${queryType},pattern_type.like.%${queryType}%`)
      .gte('confidence', this.CONFIDENCE_THRESHOLD)
      .gte('frequency', this.PATTERN_FREQUENCY_THRESHOLD)
      .order('confidence', { ascending: false })
      .limit(50);

    const relevantPatterns = this.filterRelevantPatterns(patterns || [], queryContext);

    this.cache.set(cacheKey, relevantPatterns, 300); // 5 min cache
    return relevantPatterns;
  }

  // Get best practices for a scenario
  private async getBestPractices(
    queryType: string,
    queryContext: Record<string, any>,
  ): Promise<any[]> {
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
    patterns: any[],
    queryContext: Record<string, any>,
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
    patterns: any[],
    _context: Record<string, any>,
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
    queryContext: Record<string, any>,
    patterns: any[],
    bestPractices: any[],
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
  private extractPatterns(data: AnonymizedData): any[] {
    const patterns: any[] = [];

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
    pattern: any,
    dataType: string,
    sourceData: AnonymizedData,
  ): Promise<void> {
    const patternSignature = this.generatePatternSignature(pattern);

    // Check if pattern exists
    const { data: existing } = await this.supabase
      .from('donna_patterns')
      .select('id, frequency, confidence')
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
    outcome: { success: boolean; metrics?: Record<string, any> },
  ): Promise<void> {
    const stateHash = this.generateStateHash(dataType, data.context);
    const action = data.context.action || 'default';
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
    metrics: Record<string, any>,
  ): Promise<void> {
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
    } else if (metrics.performance_score && metrics.performance_score > 0.8) {
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
  private filterRelevantPatterns(patterns: any[], context: Record<string, any>): any[] {
    return patterns.filter(pattern => {
      const patternContext = pattern.pattern_data?.context || {};

      // Check industry match if specified
      if (context.industry && patternContext.industries) {
        if (!patternContext.industries.includes(context.industry)) {
          return false;
        }
      }

      // Check company size match if specified
      if (context.companySize && patternContext.company_sizes) {
        if (!patternContext.company_sizes.includes(context.companySize)) {
          return false;
        }
      }

      return true;
    });
  }

  private filterByContext(items: any[], context: Record<string, any>): any[] {
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

  private groupPatterns(patterns: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const pattern of patterns) {
      const key = pattern.pattern_type || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(pattern);
    }

    return groups;
  }

  private extractCommonKeywords(patterns: any[]): string[] {
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
    patterns: any[],
    keywords: string[],
  ): string {
    const frequency = patterns.reduce((sum, p) => sum + p.frequency, 0);

    return `Based on ${frequency} similar cases across multiple organizations, ` +
           `consider implementing ${groupKey} strategies that focus on: ${keywords.join(', ')}. ` +
           'This approach has shown consistent success in similar scenarios.';
  }

  private identifyScenarios(patterns: any[]): string[] {
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

  private extractIndustries(patterns: any[]): string[] {
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

  private isPracticeApplicable(practice: any, context: Record<string, any>): boolean {
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

  private evaluateCondition(condition: any, context: Record<string, any>): boolean {
    // Simple condition evaluation
    if (typeof condition === 'object' && condition.field && condition.value) {
      return context[condition.field] === condition.value;
    }
    return true;
  }

  private formatPracticeRecommendation(practice: any): string {
    return `${practice.title}: ${practice.description} ` +
           `(${Math.round(practice.success_rate * 100)}% success rate across ${practice.usage_count} implementations)`;
  }

  private generatePatternRecommendations(patterns: any[], context: Record<string, any>): string[] {
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

  private createPatternRecommendation(pattern: any, _context: Record<string, any>): string | null {
    const data = pattern.pattern_data;
    if (!data) {return null;}

    return `Pattern analysis suggests: ${data.recommendation || 'Consider applying this pattern'} ` +
           `(observed ${pattern.frequency} times with ${Math.round(pattern.confidence * 100)}% confidence)`;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);

    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 20);
  }

  private extractStructuralPatterns(data: AnonymizedData): any[] {
    const patterns: any[] = [];

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

  private generatePatternSignature(pattern: any): string {
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

  private updateIndustryDistribution(existing: any, industry?: string): any {
    const distribution = existing.pattern_data?.industry_distribution || {};

    if (industry) {
      distribution[industry] = (distribution[industry] || 0) + 1;
    }

    return distribution;
  }

  private generateStateHash(dataType: string, context: Record<string, any>): string {
    const relevantKeys = ['action', 'category', 'type', 'value_range'];
    const state: Record<string, any> = { dataType };

    for (const key of relevantKeys) {
      if (context[key]) {
        state[key] = context[key];
      }
    }

    return this.generatePatternSignature({ type: 'state', data: state });
  }

  private calculateReward(outcome: { success: boolean; metrics?: Record<string, any> }): number {
    let reward = outcome.success ? 1 : -1;

    if (outcome.metrics) {
      // Adjust reward based on metrics
      if (outcome.metrics.performance_score) {
        reward *= outcome.metrics.performance_score;
      }

      if (outcome.metrics.time_saved) {
        reward += outcome.metrics.time_saved / 100; // Bonus for time saved
      }

      if (outcome.metrics.cost_reduction) {
        reward += outcome.metrics.cost_reduction / 1000; // Bonus for cost reduction
      }
    }

    return Math.max(-1, Math.min(1, reward)); // Clamp between -1 and 1
  }

  private extractConditions(context: Record<string, any>): any[] {
    const conditions: any[] = [];

    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        conditions.push({ field: key, value });
      }
    }

    return conditions;
  }

  private extractActions(context: Record<string, any>): any[] {
    const actions: any[] = [];

    if (context.action) {
      actions.push({ type: 'primary', value: context.action });
    }

    if (context.actions && Array.isArray(context.actions)) {
      actions.push(...context.actions.map(a => ({ type: 'secondary', value: a })));
    }

    return actions;
  }

  private generatePracticeDescription(data: AnonymizedData, metrics: Record<string, any>): string {
    const parts: string[] = [];

    if (data.type) {
      parts.push(`For ${data.type} scenarios`);
    }

    if (metrics.performance_score) {
      parts.push(`achieving ${Math.round(metrics.performance_score * 100)}% performance`);
    }

    if (data.context.key_factors) {
      parts.push(`focusing on ${data.context.key_factors.join(', ')}`);
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

  private calculateConfidence(patterns: any[], insights: DonnaInsight[]): number {
    if (patterns.length === 0 || insights.length === 0) {return 0;}

    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    const avgInsightConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;

    // Weight pattern confidence more heavily
    return avgPatternConfidence * 0.7 + avgInsightConfidence * 0.3;
  }

  private async logAnalysis(
    queryType: string,
    queryContext: Record<string, any>,
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