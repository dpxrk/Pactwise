/**
 * Temporal Reasoning Agent
 *
 * Provides time-series analysis capabilities for contract lifecycle management:
 * - Lifecycle event analysis and trend detection
 * - Renewal prediction with confidence scoring
 * - Seasonal/cyclical pattern recognition
 * - Temporal anomaly detection
 * - Proactive alert generation
 */

import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface TemporalAnalysisData {
  enterpriseId: string;
  analysisType:
    | 'lifecycle_analysis'
    | 'trend_detection'
    | 'renewal_prediction'
    | 'anomaly_detection'
    | 'seasonal_pattern'
    | 'comprehensive';
  contractId?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  bucketType?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  metricCategory?: string;
}

export interface TemporalAnalysisResult {
  lifecycleEvents?: LifecycleEventAnalysis;
  trends?: TrendAnalysis[];
  renewalPredictions?: RenewalPrediction[];
  anomalies?: TemporalAnomaly[];
  seasonalPatterns?: SeasonalPattern[];
  alerts?: TemporalAlert[];
  summary?: TemporalSummary;
}

export interface LifecycleEventAnalysis {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByMonth: Record<string, number>;
  averageTimeInStatus: Record<string, number>;
  mostCommonTransitions: Array<{
    from: string;
    to: string;
    count: number;
    avgDuration: number;
  }>;
}

export interface TrendAnalysis {
  metricName: string;
  direction: 'up' | 'down' | 'stable' | 'volatile';
  strength: number;
  slope: number;
  rSquared: number;
  forecast: Array<{
    date: string;
    predictedValue: number;
    confidenceInterval: { lower: number; upper: number };
  }>;
}

export interface RenewalPrediction {
  contractId: string;
  contractTitle: string;
  endDate: string;
  daysUntilExpiration: number;
  renewalProbability: number;
  probabilityTier: 'high' | 'medium' | 'low' | 'unlikely';
  factors: Record<string, number>;
  recommendedActions: string[];
  predictedValue?: number;
}

export interface TemporalAnomaly {
  detectedAt: string;
  metricName: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  possibleCauses: string[];
}

export interface SeasonalPattern {
  patternName: string;
  metric: string;
  periodLength: string;
  amplitude: number;
  phase: number;
  confidence: number;
  description: string;
  nextPeak?: string;
  nextTrough?: string;
}

export interface TemporalAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  impactDate?: string;
  recommendedActions: string[];
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface TemporalSummary {
  analysisDate: string;
  totalContractsAnalyzed: number;
  upcomingRenewals: number;
  highRiskRenewals: number;
  detectedTrends: number;
  activeAlerts: number;
  keyInsights: string[];
}

// ============================================================================
// TEMPORAL REASONING AGENT
// ============================================================================

export class TemporalReasoningAgent extends BaseAgent {
  get agentType() {
    return 'temporal_reasoning';
  }

  get capabilities() {
    return [
      'lifecycle_analysis',
      'trend_detection',
      'renewal_prediction',
      'anomaly_detection',
      'seasonal_pattern_recognition',
      'temporal_alert_generation',
    ];
  }

  async process(
    data: TemporalAnalysisData,
    context?: AgentContext
  ): Promise<ProcessingResult<TemporalAnalysisResult>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      // Check permissions if userId provided
      if (context?.userId) {
        const hasPermission = await this.checkUserPermission(context.userId, 'user');
        if (!hasPermission) {
          throw new Error('Insufficient permissions for temporal analysis');
        }
      }

      const result: TemporalAnalysisResult = {};

      // Set default time range
      const timeRange = data.timeRange || {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      };

      // Execute analysis based on type
      switch (data.analysisType) {
        case 'lifecycle_analysis':
          result.lifecycleEvents = await this.analyzeLifecycleEvents(
            data.enterpriseId,
            data.contractId,
            timeRange
          );
          rulesApplied.push('lifecycle_event_analysis');
          break;

        case 'trend_detection':
          result.trends = await this.detectTrends(
            data.enterpriseId,
            data.bucketType || 'daily',
            timeRange
          );
          rulesApplied.push('trend_detection');
          break;

        case 'renewal_prediction':
          result.renewalPredictions = await this.predictRenewals(
            data.enterpriseId,
            data.contractId
          );
          rulesApplied.push('renewal_prediction');
          break;

        case 'anomaly_detection':
          result.anomalies = await this.detectAnomalies(
            data.enterpriseId,
            data.metricCategory,
            timeRange
          );
          rulesApplied.push('anomaly_detection');
          break;

        case 'seasonal_pattern':
          result.seasonalPatterns = await this.detectSeasonalPatterns(
            data.enterpriseId,
            timeRange
          );
          rulesApplied.push('seasonal_pattern_detection');
          break;

        case 'comprehensive':
        default:
          // Run all analyses
          result.lifecycleEvents = await this.analyzeLifecycleEvents(
            data.enterpriseId,
            data.contractId,
            timeRange
          );
          result.trends = await this.detectTrends(
            data.enterpriseId,
            data.bucketType || 'daily',
            timeRange
          );
          result.renewalPredictions = await this.predictRenewals(
            data.enterpriseId,
            data.contractId
          );
          result.anomalies = await this.detectAnomalies(
            data.enterpriseId,
            data.metricCategory,
            timeRange
          );
          result.alerts = await this.generateAlerts(data.enterpriseId, result);
          result.summary = this.generateSummary(result);

          rulesApplied.push(
            'lifecycle_event_analysis',
            'trend_detection',
            'renewal_prediction',
            'anomaly_detection',
            'alert_generation'
          );
      }

      // Generate insights
      insights.push(...this.generateInsights(result));

      return {
        success: true,
        data: result,
        rulesApplied,
        insights,
        processingTime: 0, // Will be set by wrapper
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Temporal analysis error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        rulesApplied,
        insights: [],
        processingTime: 0,
      };
    }
  }

  // ============================================================================
  // LIFECYCLE ANALYSIS
  // ============================================================================

  private async analyzeLifecycleEvents(
    enterpriseId: string,
    contractId: string | undefined,
    timeRange: { start: string; end: string }
  ): Promise<LifecycleEventAnalysis> {
    const supabase = this.getAdminClient();

    let query = supabase
      .from('contract_lifecycle_events')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .gte('event_at', timeRange.start)
      .lte('event_at', timeRange.end)
      .order('event_at', { ascending: true });

    if (contractId) {
      query = query.eq('contract_id', contractId);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Failed to fetch lifecycle events:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsByMonth: {},
        averageTimeInStatus: {},
        mostCommonTransitions: [],
      };
    }

    // Aggregate events by type
    const eventsByType: Record<string, number> = {};
    const eventsByMonth: Record<string, number> = {};
    const transitions: Record<string, { count: number; durations: number[] }> = {};

    for (const event of events || []) {
      // Count by type
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1;

      // Count by month
      const month = event.event_at.substring(0, 7);
      eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;

      // Track transitions
      if (event.previous_status && event.new_status) {
        const key = `${event.previous_status}→${event.new_status}`;
        if (!transitions[key]) {
          transitions[key] = { count: 0, durations: [] };
        }
        transitions[key].count++;
      }
    }

    // Calculate most common transitions
    const mostCommonTransitions = Object.entries(transitions)
      .map(([key, data]) => {
        const [from, to] = key.split('→');
        return {
          from,
          to,
          count: data.count,
          avgDuration: data.durations.length > 0
            ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
            : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: events?.length || 0,
      eventsByType,
      eventsByMonth,
      averageTimeInStatus: {}, // Would need additional processing
      mostCommonTransitions,
    };
  }

  // ============================================================================
  // TREND DETECTION
  // ============================================================================

  private async detectTrends(
    enterpriseId: string,
    bucketType: string,
    timeRange: { start: string; end: string }
  ): Promise<TrendAnalysis[]> {
    const supabase = this.getAdminClient();

    const { data: metrics, error } = await supabase
      .from('temporal_metrics')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('bucket_type', bucketType)
      .gte('time_bucket', timeRange.start)
      .lte('time_bucket', timeRange.end)
      .order('time_bucket', { ascending: true });

    if (error || !metrics || metrics.length < 3) {
      return [];
    }

    // Group by metric name
    const metricGroups: Record<string, typeof metrics> = {};
    for (const m of metrics) {
      const key = `${m.metric_category}:${m.metric_name}`;
      if (!metricGroups[key]) metricGroups[key] = [];
      metricGroups[key].push(m);
    }

    // Analyze each metric for trends
    const trends: TrendAnalysis[] = [];

    for (const [metricKey, data] of Object.entries(metricGroups)) {
      if (data.length < 3) continue;

      const values = data.map(d => d.value);
      const n = values.length;

      // Simple linear regression
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((a, b) => a + b, 0) / n;

      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (values[i] - yMean);
        denominator += (i - xMean) ** 2;
      }

      const slope = denominator !== 0 ? numerator / denominator : 0;
      const intercept = yMean - slope * xMean;

      // Calculate R-squared
      let ssRes = 0;
      let ssTot = 0;
      for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        ssRes += (values[i] - predicted) ** 2;
        ssTot += (values[i] - yMean) ** 2;
      }
      const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

      // Determine direction
      let direction: 'up' | 'down' | 'stable' | 'volatile';
      const volatility = Math.sqrt(values.reduce((sum, v) => sum + (v - yMean) ** 2, 0) / n) / (yMean || 1);

      if (volatility > 0.3) {
        direction = 'volatile';
      } else if (Math.abs(slope) < yMean * 0.01) {
        direction = 'stable';
      } else if (slope > 0) {
        direction = 'up';
      } else {
        direction = 'down';
      }

      // Generate forecast
      const forecast = [];
      for (let i = 0; i < 7; i++) {
        const futureIndex = n + i;
        const predicted = slope * futureIndex + intercept;
        const stderr = Math.sqrt(ssRes / (n - 2));

        forecast.push({
          date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          predictedValue: Math.max(0, predicted),
          confidenceInterval: {
            lower: Math.max(0, predicted - 1.96 * stderr),
            upper: predicted + 1.96 * stderr,
          },
        });
      }

      trends.push({
        metricName: metricKey,
        direction,
        strength: Math.abs(slope) / (yMean || 1),
        slope,
        rSquared: Math.max(0, Math.min(1, rSquared)),
        forecast,
      });
    }

    return trends.sort((a, b) => b.strength - a.strength);
  }

  // ============================================================================
  // RENEWAL PREDICTION
  // ============================================================================

  private async predictRenewals(
    enterpriseId: string,
    contractId?: string
  ): Promise<RenewalPrediction[]> {
    const supabase = this.getAdminClient();

    // Get contracts expiring in the next 90 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    let query = supabase
      .from('contracts')
      .select(`
        id, title, value, status, end_date, is_auto_renew,
        vendor:vendors(id, name, performance_score, risk_level)
      `)
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .lte('end_date', futureDate.toISOString())
      .gte('end_date', new Date().toISOString())
      .order('end_date', { ascending: true });

    if (contractId) {
      query = query.eq('id', contractId);
    }

    const { data: contracts, error } = await query;

    if (error || !contracts) {
      console.error('Failed to fetch contracts:', error);
      return [];
    }

    const predictions: RenewalPrediction[] = [];

    for (const contract of contracts) {
      // Calculate factors
      const vendorScore = (contract.vendor as { performance_score?: number })?.performance_score || 50;
      const vendorRelationshipScore = vendorScore / 100;

      const contractPerformanceScore = contract.status === 'active' ? 0.8 : 0.5;
      const budgetAvailabilityScore = 0.7; // Simplified
      const historicalRenewalRate = contract.is_auto_renew ? 0.9 : 0.6;
      const complianceStatusScore = 0.85; // Simplified

      // Calculate weighted probability
      const probability =
        vendorRelationshipScore * 0.25 +
        contractPerformanceScore * 0.25 +
        budgetAvailabilityScore * 0.15 +
        historicalRenewalRate * 0.20 +
        complianceStatusScore * 0.15;

      const daysUntilExpiration = Math.ceil(
        (new Date(contract.end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      // Generate recommended actions
      const recommendedActions: string[] = [];
      if (daysUntilExpiration <= 30) {
        recommendedActions.push('Schedule urgent renewal discussion');
      }
      if (probability < 0.5) {
        recommendedActions.push('Review vendor relationship');
        recommendedActions.push('Prepare alternative vendors');
      }
      if (probability >= 0.7) {
        recommendedActions.push('Begin renewal negotiation');
      }

      predictions.push({
        contractId: contract.id,
        contractTitle: contract.title,
        endDate: contract.end_date,
        daysUntilExpiration,
        renewalProbability: Math.round(probability * 100) / 100,
        probabilityTier:
          probability >= 0.8 ? 'high' :
          probability >= 0.5 ? 'medium' :
          probability >= 0.2 ? 'low' : 'unlikely',
        factors: {
          vendor_relationship_score: Math.round(vendorRelationshipScore * 1000) / 1000,
          contract_performance_score: Math.round(contractPerformanceScore * 1000) / 1000,
          budget_availability_score: Math.round(budgetAvailabilityScore * 1000) / 1000,
          historical_renewal_rate: Math.round(historicalRenewalRate * 1000) / 1000,
          compliance_status_score: Math.round(complianceStatusScore * 1000) / 1000,
        },
        recommendedActions,
        predictedValue: contract.value,
      });
    }

    // Sort by days until expiration (most urgent first)
    return predictions.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  private async detectAnomalies(
    enterpriseId: string,
    metricCategory: string | undefined,
    timeRange: { start: string; end: string }
  ): Promise<TemporalAnomaly[]> {
    const supabase = this.getAdminClient();

    let query = supabase
      .from('temporal_metrics')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('bucket_type', 'daily')
      .gte('time_bucket', timeRange.start)
      .lte('time_bucket', timeRange.end)
      .order('time_bucket', { ascending: true });

    if (metricCategory) {
      query = query.eq('metric_category', metricCategory);
    }

    const { data: metrics, error } = await query;

    if (error || !metrics || metrics.length < 10) {
      return [];
    }

    // Group by metric
    const metricGroups: Record<string, typeof metrics> = {};
    for (const m of metrics) {
      const key = `${m.metric_category}:${m.metric_name}`;
      if (!metricGroups[key]) metricGroups[key] = [];
      metricGroups[key].push(m);
    }

    const anomalies: TemporalAnomaly[] = [];

    for (const [metricKey, data] of Object.entries(metricGroups)) {
      if (data.length < 10) continue;

      const values = data.map(d => d.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
      );

      // Detect anomalies using z-score
      for (let i = 0; i < data.length; i++) {
        const zScore = stdDev !== 0 ? (values[i] - mean) / stdDev : 0;

        if (Math.abs(zScore) > 2.5) {
          const severity =
            Math.abs(zScore) > 4 ? 'critical' :
            Math.abs(zScore) > 3.5 ? 'high' :
            Math.abs(zScore) > 3 ? 'medium' : 'low';

          anomalies.push({
            detectedAt: data[i].time_bucket,
            metricName: metricKey,
            expectedValue: Math.round(mean * 100) / 100,
            actualValue: values[i],
            deviation: Math.round((values[i] - mean) * 100) / 100,
            zScore: Math.round(zScore * 100) / 100,
            severity,
            possibleCauses: this.generatePossibleCauses(metricKey, zScore > 0),
          });
        }
      }
    }

    return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)).slice(0, 20);
  }

  private generatePossibleCauses(metricName: string, isPositive: boolean): string[] {
    const causes: string[] = [];

    if (metricName.includes('contract')) {
      if (isPositive) {
        causes.push('Unusual contract activity', 'Bulk contract processing', 'End of period rush');
      } else {
        causes.push('Processing delays', 'System issues', 'Holiday period');
      }
    } else if (metricName.includes('vendor')) {
      if (isPositive) {
        causes.push('New vendor onboarding', 'Vendor consolidation activity');
      } else {
        causes.push('Vendor offboarding', 'Performance issues');
      }
    } else {
      causes.push('Seasonal variation', 'Business process change', 'Data quality issue');
    }

    return causes;
  }

  // ============================================================================
  // SEASONAL PATTERN DETECTION
  // ============================================================================

  private async detectSeasonalPatterns(
    enterpriseId: string,
    timeRange: { start: string; end: string }
  ): Promise<SeasonalPattern[]> {
    const supabase = this.getAdminClient();

    const { data: patterns, error } = await supabase
      .from('temporal_patterns')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('pattern_type', 'seasonal')
      .eq('is_active', true)
      .gte('detected_at', timeRange.start)
      .order('confidence_score', { ascending: false })
      .limit(10);

    if (error || !patterns) {
      return [];
    }

    return patterns.map(p => ({
      patternName: p.pattern_name,
      metric: `${p.metric_category}:${p.metric_name}`,
      periodLength: p.period_length || 'unknown',
      amplitude: p.amplitude || 0,
      phase: p.phase_shift || 0,
      confidence: p.confidence_score || 0,
      description: p.pattern_description || '',
    }));
  }

  // ============================================================================
  // ALERT GENERATION
  // ============================================================================

  private async generateAlerts(
    enterpriseId: string,
    result: TemporalAnalysisResult
  ): Promise<TemporalAlert[]> {
    const alerts: TemporalAlert[] = [];

    // Alerts from renewal predictions
    for (const prediction of result.renewalPredictions || []) {
      if (prediction.daysUntilExpiration <= 30 && prediction.renewalProbability < 0.5) {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'renewal_approaching',
          title: `High-risk renewal: ${prediction.contractTitle}`,
          description: `Contract expires in ${prediction.daysUntilExpiration} days with low renewal probability (${Math.round(prediction.renewalProbability * 100)}%)`,
          severity: 'critical',
          impactDate: prediction.endDate,
          recommendedActions: prediction.recommendedActions,
          relatedEntityId: prediction.contractId,
          relatedEntityType: 'contract',
        });
      } else if (prediction.daysUntilExpiration <= 60) {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'renewal_approaching',
          title: `Upcoming renewal: ${prediction.contractTitle}`,
          description: `Contract expires in ${prediction.daysUntilExpiration} days`,
          severity: prediction.renewalProbability < 0.5 ? 'warning' : 'info',
          impactDate: prediction.endDate,
          recommendedActions: prediction.recommendedActions,
          relatedEntityId: prediction.contractId,
          relatedEntityType: 'contract',
        });
      }
    }

    // Alerts from anomalies
    for (const anomaly of result.anomalies || []) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'anomaly_detected',
          title: `Anomaly in ${anomaly.metricName}`,
          description: `Value ${anomaly.actualValue} deviates ${anomaly.zScore.toFixed(1)} standard deviations from expected`,
          severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
          impactDate: anomaly.detectedAt,
          recommendedActions: ['Investigate cause', 'Verify data accuracy'],
        });
      }
    }

    // Alerts from trends
    for (const trend of result.trends || []) {
      if (trend.direction === 'down' && trend.strength > 0.2 && trend.rSquared > 0.7) {
        alerts.push({
          id: crypto.randomUUID(),
          type: 'trend_change',
          title: `Declining trend in ${trend.metricName}`,
          description: `Strong downward trend detected (${Math.round(trend.strength * 100)}% decline rate)`,
          severity: 'warning',
          recommendedActions: ['Analyze root cause', 'Review contributing factors'],
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ============================================================================
  // SUMMARY AND INSIGHTS
  // ============================================================================

  private generateSummary(result: TemporalAnalysisResult): TemporalSummary {
    const predictions = result.renewalPredictions || [];
    const upcomingRenewals = predictions.length;
    const highRiskRenewals = predictions.filter(p => p.renewalProbability < 0.5).length;

    const keyInsights: string[] = [];

    if (highRiskRenewals > 0) {
      keyInsights.push(`${highRiskRenewals} contracts have low renewal probability`);
    }

    if (result.anomalies && result.anomalies.length > 0) {
      keyInsights.push(`${result.anomalies.length} anomalies detected in metrics`);
    }

    const upwardTrends = (result.trends || []).filter(t => t.direction === 'up').length;
    const downwardTrends = (result.trends || []).filter(t => t.direction === 'down').length;

    if (upwardTrends > 0) {
      keyInsights.push(`${upwardTrends} metrics showing positive trends`);
    }
    if (downwardTrends > 0) {
      keyInsights.push(`${downwardTrends} metrics showing declining trends`);
    }

    return {
      analysisDate: new Date().toISOString(),
      totalContractsAnalyzed: predictions.length,
      upcomingRenewals,
      highRiskRenewals,
      detectedTrends: (result.trends || []).length,
      activeAlerts: (result.alerts || []).length,
      keyInsights,
    };
  }

  private generateInsights(result: TemporalAnalysisResult): Insight[] {
    const insights: Insight[] = [];

    // Renewal insights
    const predictions = result.renewalPredictions || [];
    if (predictions.length > 0) {
      const avgProbability = predictions.reduce((sum, p) => sum + p.renewalProbability, 0) / predictions.length;
      insights.push({
        type: 'info',
        message: `Average renewal probability across ${predictions.length} upcoming contracts: ${Math.round(avgProbability * 100)}%`,
        confidence: 0.8,
      });
    }

    // Anomaly insights
    const criticalAnomalies = (result.anomalies || []).filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      insights.push({
        type: 'warning',
        message: `${criticalAnomalies.length} critical anomalies require immediate attention`,
        confidence: 0.9,
      });
    }

    // Trend insights
    const strongTrends = (result.trends || []).filter(t => t.rSquared > 0.7);
    if (strongTrends.length > 0) {
      insights.push({
        type: 'info',
        message: `${strongTrends.length} strong trends identified with high confidence`,
        confidence: 0.85,
      });
    }

    return insights;
  }
}

// Export singleton factory
export function createTemporalReasoningAgent(): TemporalReasoningAgent {
  return new TemporalReasoningAgent();
}
