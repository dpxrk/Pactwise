/**
 * Swarm Analytics Agent
 *
 * Distributed analytics through collective data processing
 * and pattern recognition across the swarm.
 */

import {
  SwarmBaseAgent,
} from './swarm-base.ts';

import {
  AgentConfig,
  AgentType,
  Message,
  ProcessedMessage,
  Task,
  AgentContext,
  Experience,
  LearningResult,
  AgentCapability,
  Pattern,
  Improvement,
} from '../types.ts';

import {
  SwarmAgentType,
  Formation,
} from '../swarm/types.ts';

/**
 * Analytics-focused swarm agent
 */
export class SwarmAnalyticsAgent extends SwarmBaseAgent {
  // Analytics-specific state
  private dataStreams: Map<string, DataStream> = new Map();
  private metricsAggregator: MetricsAggregator;
  private anomalyDetector: AnomalyDetector;
  private trendAnalyzer: TrendAnalyzer;
  private distributedComputations: Map<string, DistributedComputation> = new Map();

  // Swarm analytics state
  private sharedMetrics: Map<string, SwarmMetric> = new Map();
  private consensusThresholds: Map<string, number> = new Map();
  private analyticsFormations: Formation[] = [];

  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.ANALYTICS,
    });

    // Initialize analytics components
    this.metricsAggregator = new MetricsAggregator();
    this.anomalyDetector = new AnomalyDetector();
    this.trendAnalyzer = new TrendAnalyzer();

    // Add analytics capabilities
    this.capabilities.push(
      AgentCapability.DATA_ANALYSIS,
      AgentCapability.PATTERN_RECOGNITION,
    );
  }

  /**
   * Map to swarm agent type
   */
  protected mapToSwarmType(): SwarmAgentType {
    return 'aggregator';
  }

  /**
   * Process message with analytics focus
   */
  async processMessage(message: Message): Promise<ProcessedMessage> {
    const baseResult = await super.processMessage(message);

    // Extract numeric data
    const dataPoints = this.extractDataPoints(message);

    // Detect analytics patterns
    const analyticsPatterns = this.detectAnalyticsPatterns(message, dataPoints);

    // Check for anomalies
    const anomalies = await this.checkForAnomalies(dataPoints);

    // Enhance with analytics insights
    if (dataPoints.length > 0) {
      const insights = await this.generateAnalyticsInsights(
        dataPoints,
        analyticsPatterns,
        anomalies,
      );

      baseResult.suggestedActions.push(...insights);
    }

    // Adjust confidence based on data quality
    const dataQuality = this.assessDataQuality(dataPoints);
    baseResult.confidence *= dataQuality;

    return baseResult;
  }

  /**
   * Execute analytics task
   */
  async executeTask(task: Task, context: AgentContext): Promise<any> {
    if (task.type === 'analytics' || task.description.includes('analyze')) {
      return this.executeAnalyticsTask(task, context);
    }

    return super.executeTask(task, context);
  }

  /**
   * Execute distributed analytics task
   */
  private async executeAnalyticsTask(
    task: Task,
    _context: AgentContext,
  ): Promise<AnalyticsResult> {
    // Create data stream for task
    const stream: DataStream = {
      id: `stream-${Date.now()}`,
      name: task.description,
      data: [],
      metadata: {
        taskId: task.id,
        startTime: Date.now(),
      },
      active: true,
    };

    this.dataStreams.set(stream.id, stream);

    // Phase 1: Distributed data collection
    const collectedData = await this.collectDistributedData(task);

    // Phase 2: Parallel processing through swarm
    const processedChunks = await this.processDataInSwarm(collectedData);

    // Phase 3: Aggregate results
    const aggregatedMetrics = await this.aggregateSwarmResults(processedChunks);

    // Phase 4: Pattern detection
    const patterns = await this.detectDistributedPatterns(
      aggregatedMetrics,
      processedChunks,
    );

    // Phase 5: Generate insights
    const insights = await this.generateSwarmInsights(
      aggregatedMetrics,
      patterns,
    );

    // Create analytics result
    const result: AnalyticsResult = {
      streamId: stream.id,
      metrics: aggregatedMetrics,
      patterns,
      insights,
      anomalies: this.anomalyDetector.getRecentAnomalies(),
      confidence: this.calculateAnalyticsConfidence(aggregatedMetrics),
      contributors: this.getContributingAgents(),
    };

    return result;
  }

  /**
   * Collect data from distributed sources
   */
  private async collectDistributedData(task: Task): Promise<DataPoint[]> {
    const data: DataPoint[] = [];

    // Generate sample data based on task
    const dimensions = this.extractDimensions(task.description);

    // Deposit data request pheromone
    if (this.swarmId) {
      this.depositPheromone(
        this.stigmergicEnv,
        this.swarmId,
        'attraction',
        0.7,
        {
          dataRequest: dimensions,
          taskId: task.id,
        },
      );
    }

    // Collect from local sources
    for (let i = 0; i < 100; i++) {
      data.push({
        id: `dp-${Date.now()}-${i}`,
        timestamp: Date.now() - i * 1000,
        dimensions: dimensions.reduce((acc, dim) => {
          acc[dim] = Math.random() * 100;
          return acc;
        }, {} as Record<string, number>),
        source: this.id,
        quality: 0.8 + Math.random() * 0.2,
      });
    }

    // Collect from neighbors if in swarm
    if (this.neighbors.size > 0) {
      const neighborData = await this.collectFromNeighbors(dimensions);
      data.push(...neighborData);
    }

    return data;
  }

  /**
   * Process data chunks in parallel through swarm
   */
  private async processDataInSwarm(
    data: DataPoint[],
  ): Promise<ProcessedChunk[]> {
    const chunks = this.splitIntoChunks(data, Math.max(1, this.neighbors.size + 1));
    const processed: ProcessedChunk[] = [];

    // Process own chunk
    const myChunk = chunks[0];
    const myProcessed = await this.processChunk(myChunk);
    processed.push(myProcessed);

    // Distribute remaining chunks to neighbors
    if (this.neighbors.size > 0 && chunks.length > 1) {
      const neighborResults = await this.distributeProcessing(
        chunks.slice(1),
      );
      processed.push(...neighborResults);
    }

    return processed;
  }

  /**
   * Process a data chunk
   */
  private async processChunk(chunk: DataPoint[]): Promise<ProcessedChunk> {
    const metrics = this.metricsAggregator.aggregate(chunk);
    const trends = this.trendAnalyzer.analyze(chunk);
    const anomalies = this.anomalyDetector.detect(chunk);

    return {
      id: `chunk-${Date.now()}`,
      processedBy: this.id,
      dataPoints: chunk.length,
      metrics,
      trends,
      anomalies,
      confidence: this.calculateChunkConfidence(chunk),
    };
  }

  /**
   * Aggregate results from swarm processing
   */
  private async aggregateSwarmResults(
    chunks: ProcessedChunk[],
  ): Promise<AggregatedMetrics> {
    const aggregated: AggregatedMetrics = {
      totalDataPoints: 0,
      metrics: {},
      trends: [],
      anomalyCount: 0,
      processingNodes: chunks.map(c => c.processedBy),
    };

    // Aggregate metrics
    for (const chunk of chunks) {
      aggregated.totalDataPoints += chunk.dataPoints;
      aggregated.anomalyCount += chunk.anomalies.length;

      // Merge metrics
      for (const [key, value] of Object.entries(chunk.metrics)) {
        if (!aggregated.metrics[key]) {
          aggregated.metrics[key] = {
            sum: 0,
            count: 0,
            min: Infinity,
            max: -Infinity,
            average: 0,
            variance: 0,
            values: [],
          };
        }

        const metric = aggregated.metrics[key];
        metric.sum += value.sum;
        metric.count += value.count;
        metric.min = Math.min(metric.min, value.min);
        metric.max = Math.max(metric.max, value.max);
        metric.values.push(...value.values);
      }

      // Merge trends
      aggregated.trends.push(...chunk.trends);
    }

    // Calculate averages
    for (const metric of Object.values(aggregated.metrics)) {
      metric.average = metric.sum / metric.count;
      metric.variance = this.calculateVariance(metric.values, metric.average);
    }

    return aggregated;
  }

  /**
   * Detect patterns across distributed data
   */
  private async detectDistributedPatterns(
    metrics: AggregatedMetrics,
    chunks: ProcessedChunk[],
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Detect metric patterns
    for (const [key, metric] of Object.entries(metrics.metrics)) {
      // High variance pattern
      if (metric.variance > metric.average * 0.5) {
        patterns.push({
          id: `pattern-highvar-${key}`,
          description: `High variance in ${key}`,
          frequency: 1,
          reliability: 0.8,
          conditions: [`variance: ${metric.variance.toFixed(2)}`],
          outcomes: ['Potential instability'],
        });
      }

      // Outlier pattern
      const outliers = metric.values.filter(
        v => Math.abs(v - metric.average) > 2 * Math.sqrt(metric.variance),
      );

      if (outliers.length > metric.count * 0.05) {
        patterns.push({
          id: `pattern-outliers-${key}`,
          description: `Frequent outliers in ${key}`,
          frequency: outliers.length / metric.count,
          reliability: 0.7,
          conditions: [`outlier_rate: ${(outliers.length / metric.count).toFixed(2)}`],
          outcomes: ['Data quality issues or significant events'],
        });
      }
    }

    // Detect trend patterns
    const trendGroups = this.groupTrends(metrics.trends);
    for (const [type, trends] of trendGroups) {
      if (trends.length >= 3) {
        patterns.push({
          id: `pattern-trend-${type}`,
          description: `Consistent ${type} trend across nodes`,
          frequency: trends.length / chunks.length,
          reliability: 0.9,
          conditions: [`nodes: ${trends.length}`],
          outcomes: [`${type} market conditions`],
        });
      }
    }

    // Detect swarm consensus patterns
    const consensusPatterns = await this.detectConsensusPatterns(chunks);
    patterns.push(...consensusPatterns);

    return patterns;
  }

  /**
   * Generate insights from swarm analytics
   */
  private async generateSwarmInsights(
    metrics: AggregatedMetrics,
    patterns: Pattern[],
  ): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Metric-based insights
    for (const [key, metric] of Object.entries(metrics.metrics)) {
      if (metric.average > 0) {
        const coefficientOfVariation = Math.sqrt(metric.variance) / metric.average;

        if (coefficientOfVariation < 0.1) {
          insights.push({
            id: `insight-stable-${key}`,
            type: 'stability',
            description: `${key} shows high stability across the swarm`,
            confidence: 0.9,
            impact: 'low',
            recommendations: [`Monitor ${key} for sudden changes`],
          });
        } else if (coefficientOfVariation > 0.5) {
          insights.push({
            id: `insight-volatile-${key}`,
            type: 'volatility',
            description: `${key} exhibits high volatility`,
            confidence: 0.8,
            impact: 'high',
            recommendations: [
              `Investigate root causes of ${key} volatility`,
              'Consider implementing stabilization measures',
            ],
          });
        }
      }
    }

    // Pattern-based insights
    for (const pattern of patterns) {
      if (pattern.reliability > 0.8) {
        insights.push({
          id: `insight-pattern-${pattern.id}`,
          type: 'pattern',
          description: pattern.description,
          confidence: pattern.reliability,
          impact: pattern.frequency > 0.5 ? 'high' : 'medium',
          recommendations: this.generatePatternRecommendations(pattern),
        });
      }
    }

    // Swarm efficiency insight
    if (metrics.processingNodes.length > 1) {
      const efficiency = metrics.totalDataPoints /
                        (metrics.processingNodes.length * 100); // Assuming 100 per node

      insights.push({
        id: 'insight-swarm-efficiency',
        type: 'performance',
        description: `Swarm processing efficiency: ${(efficiency * 100).toFixed(1)}%`,
        confidence: 0.95,
        impact: efficiency < 0.8 ? 'medium' : 'low',
        recommendations: efficiency < 0.8 ?
          ['Optimize data distribution', 'Balance workload across nodes'] :
          ['Maintain current efficiency'],
      });
    }

    return insights;
  }

  /**
   * Learn from analytics experience
   */
  async learn(experience: Experience): Promise<LearningResult> {
    const patterns: Pattern[] = [];
    const improvements: Improvement[] = [];

    if (experience.success) {
      // Learn successful analytics approach
      patterns.push({
        id: `learned-analytics-${Date.now()}`,
        description: `Effective analytics: ${experience.action}`,
        frequency: 1,
        reliability: 0.8,
        conditions: [experience.situation],
        outcomes: [experience.outcome],
      });

      // Suggest improvements based on learnings
      if (experience.learnings.includes('distributed processing helped')) {
        improvements.push({
          area: 'processing',
          current: 0.6,
          suggested: 0.9,
          reasoning: 'Increase use of distributed processing',
        });
      }
    }

    // Update analytics strategies
    this.updateAnalyticsStrategies(experience);

    return {
      patterns,
      insights: experience.learnings,
      improvements,
      confidence: 0.75,
    };
  }

  /**
   * Make analytics-oriented decisions
   */
  async decide(options: unknown[], _context: AgentContext): Promise<unknown> {
    // Evaluate options based on data availability and quality
    let bestOption = options[0];
    let bestScore = 0;

    for (const option of options) {
      const score = this.evaluateAnalyticsOption(option);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }

    return bestOption;
  }

  /**
   * Helper methods
   */

  private extractDataPoints(message: Message): DataPoint[] {
    const points: DataPoint[] = [];

    // Extract numbers from message
    const numbers = message.content.match(/\d+\.?\d*/g) || [];

    for (const num of numbers) {
      points.push({
        id: `extracted-${Date.now()}`,
        timestamp: Date.now(),
        dimensions: { value: parseFloat(num) },
        source: message.sender,
        quality: 0.7,
      });
    }

    return points;
  }

  private detectAnalyticsPatterns(
    message: Message,
    _dataPoints: DataPoint[],
  ): Pattern[] {
    const patterns: Pattern[] = [];

    // Pattern: Time series request
    if (message.content.includes('trend') ||
        message.content.includes('over time')) {
      patterns.push({
        id: `timeseries-${Date.now()}`,
        description: 'Time series analysis required',
        frequency: 1,
        reliability: 0.9,
      });
    }

    // Pattern: Comparison request
    if (message.content.includes('compare') ||
        message.content.includes('difference')) {
      patterns.push({
        id: `comparison-${Date.now()}`,
        description: 'Comparative analysis required',
        frequency: 1,
        reliability: 0.8,
      });
    }

    // Pattern: Aggregation request
    if (message.content.includes('total') ||
        message.content.includes('average') ||
        message.content.includes('sum')) {
      patterns.push({
        id: `aggregation-${Date.now()}`,
        description: 'Aggregation analysis required',
        frequency: 1,
        reliability: 0.9,
      });
    }

    return patterns;
  }

  private async checkForAnomalies(dataPoints: DataPoint[]): Promise<Anomaly[]> {
    return this.anomalyDetector.detect(dataPoints);
  }

  private async generateAnalyticsInsights(
    dataPoints: DataPoint[],
    patterns: Pattern[],
    anomalies: Anomaly[],
  ): Promise<string[]> {
    const insights: string[] = [];

    if (dataPoints.length > 0) {
      insights.push(`Analyze ${dataPoints.length} data points with swarm`);
    }

    if (patterns.some(p => p.description.includes('Time series'))) {
      insights.push('Deploy distributed time series analysis');
    }

    if (patterns.some(p => p.description.includes('Comparative'))) {
      insights.push('Initiate swarm comparative analytics');
    }

    if (anomalies.length > 0) {
      insights.push(`Investigate ${anomalies.length} anomalies collaboratively`);
    }

    return insights;
  }

  private assessDataQuality(dataPoints: DataPoint[]): number {
    if (dataPoints.length === 0) {return 0.5;}

    const avgQuality = dataPoints.reduce((sum, dp) => sum + dp.quality, 0) /
                      dataPoints.length;

    return avgQuality;
  }

  private extractDimensions(description: string): string[] {
    // Extract potential metric dimensions from description
    const commonMetrics = [
      'revenue', 'cost', 'profit', 'users', 'sessions',
      'conversion', 'rate', 'volume', 'price', 'quantity',
    ];

    const dimensions: string[] = [];
    const words = description.toLowerCase().split(/\s+/);

    for (const metric of commonMetrics) {
      if (words.includes(metric)) {
        dimensions.push(metric);
      }
    }

    return dimensions.length > 0 ? dimensions : ['value'];
  }

  private async collectFromNeighbors(dimensions: string[]): Promise<DataPoint[]> {
    // Simulate collecting data from neighbors
    const data: DataPoint[] = [];

    for (const [id, neighbor] of this.neighbors) {
      for (let i = 0; i < 50; i++) {
        data.push({
          id: `neighbor-${id}-${i}`,
          timestamp: Date.now() - i * 1000,
          dimensions: dimensions.reduce((acc, dim) => {
            acc[dim] = Math.random() * 100 * neighbor.fitness;
            return acc;
          }, {} as Record<string, number>),
          source: id,
          quality: neighbor.fitness,
        });
      }
    }

    return data;
  }

  private splitIntoChunks(data: DataPoint[], numChunks: number): DataPoint[][] {
    const chunks: DataPoint[][] = [];
    const chunkSize = Math.ceil(data.length / numChunks);

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    return chunks;
  }

  private async distributeProcessing(
    chunks: DataPoint[][],
  ): Promise<ProcessedChunk[]> {
    // Simulate distributed processing
    const results: ProcessedChunk[] = [];

    let i = 0;
    for (const [id, neighbor] of this.neighbors) {
      if (i >= chunks.length) {break;}

      // Simulate neighbor processing
      const processed: ProcessedChunk = {
        id: `chunk-neighbor-${id}`,
        processedBy: id,
        dataPoints: chunks[i].length,
        metrics: this.metricsAggregator.aggregate(chunks[i]),
        trends: [],
        anomalies: [],
        confidence: neighbor.fitness,
      };

      results.push(processed);
      i++;
    }

    return results;
  }

  private calculateChunkConfidence(chunk: DataPoint[]): number {
    const avgQuality = chunk.reduce((sum, dp) => sum + dp.quality, 0) / chunk.length;
    const sizeConfidence = Math.min(1, chunk.length / 100);

    return avgQuality * 0.7 + sizeConfidence * 0.3;
  }

  private calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) {return 0;}

    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, sd) => sum + sd, 0) / values.length;
  }

  private groupTrends(trends: Trend[]): Map<string, Trend[]> {
    const groups = new Map<string, Trend[]>();

    for (const trend of trends) {
      if (!groups.has(trend.type)) {
        groups.set(trend.type, []);
      }
      groups.get(trend.type)!.push(trend);
    }

    return groups;
  }

  private async detectConsensusPatterns(
    chunks: ProcessedChunk[],
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Check for metric consensus
    const metricAgreement = this.checkMetricAgreement(chunks);

    if (metricAgreement > 0.8) {
      patterns.push({
        id: 'pattern-consensus-high',
        description: 'High consensus across swarm nodes',
        frequency: metricAgreement,
        reliability: 0.9,
        conditions: [`agreement: ${metricAgreement.toFixed(2)}`],
        outcomes: ['Reliable analytics results'],
      });
    }

    return patterns;
  }

  private checkMetricAgreement(chunks: ProcessedChunk[]): number {
    if (chunks.length < 2) {return 1;}

    let agreements = 0;
    let comparisons = 0;

    // Compare metrics between chunks
    for (let i = 0; i < chunks.length - 1; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const metrics1 = chunks[i].metrics;
        const metrics2 = chunks[j].metrics;

        for (const key of Object.keys(metrics1)) {
          if (metrics2[key]) {
            comparisons++;
            const diff = Math.abs(metrics1[key].average - metrics2[key].average);
            const avg = (metrics1[key].average + metrics2[key].average) / 2;

            if (avg > 0 && diff / avg < 0.1) {
              agreements++;
            }
          }
        }
      }
    }

    return comparisons > 0 ? agreements / comparisons : 0;
  }

  private generatePatternRecommendations(pattern: Pattern): string[] {
    const recommendations: string[] = [];

    if (pattern.description.includes('High variance')) {
      recommendations.push(
        'Implement variance reduction strategies',
        'Investigate sources of instability',
      );
    } else if (pattern.description.includes('outliers')) {
      recommendations.push(
        'Review data collection process',
        'Implement outlier detection and handling',
      );
    } else if (pattern.description.includes('trend')) {
      recommendations.push(
        'Monitor trend continuation',
        'Prepare for trend-based scenarios',
      );
    }

    return recommendations;
  }

  private updateAnalyticsStrategies(experience: Experience): void {
    // Update internal strategies based on experience
    if (experience.success && experience.action.includes('distributed')) {
      // Increase preference for distributed processing
      this.consensusThresholds.set('distributed_preference', 0.8);
    }
  }

  private evaluateAnalyticsOption(option: unknown): number {
    const optionStr = JSON.stringify(option);
    let score = 0;

    // Higher score for data-rich options
    const numbers = optionStr.match(/\d+\.?\d*/g) || [];
    score += Math.min(0.3, numbers.length * 0.05);

    // Higher score for analytics keywords
    const keywords = ['analyze', 'metrics', 'data', 'trend', 'pattern'];
    for (const keyword of keywords) {
      if (optionStr.includes(keyword)) {
        score += 0.15;
      }
    }

    return Math.min(1, score);
  }

  private calculateAnalyticsConfidence(metrics: AggregatedMetrics): number {
    let confidence = 0.5;

    // More data points increase confidence
    confidence += Math.min(0.2, metrics.totalDataPoints / 1000);

    // More processing nodes increase confidence
    confidence += Math.min(0.2, metrics.processingNodes.length / 10);

    // Low anomaly rate increases confidence
    const anomalyRate = metrics.anomalyCount / metrics.totalDataPoints;
    confidence += Math.max(0, 0.1 - anomalyRate);

    return Math.min(1, confidence);
  }

  private getContributingAgents(): string[] {
    return [this.id, ...Array.from(this.neighbors.keys())];
  }

  /**
   * Get analytics statistics
   */
  getAnalyticsStats(): AnalyticsStatistics {
    const activeStreams = Array.from(this.dataStreams.values())
      .filter(s => s.active).length;

    const totalProcessed = Array.from(this.distributedComputations.values())
      .reduce((sum, comp) => sum + comp.dataProcessed, 0);

    const recentAnomalies = this.anomalyDetector.getRecentAnomalies().length;

    return {
      activeStreams,
      totalDataProcessed: totalProcessed,
      recentAnomalies,
      swarmNodes: this.neighbors.size + 1,
      sharedMetrics: this.sharedMetrics.size,
      analyticsFormations: this.analyticsFormations.length,
    };
  }
}

// Component classes
class MetricsAggregator {
  aggregate(data: DataPoint[]): Record<string, MetricSummary> {
    const metrics: Record<string, MetricSummary> = {};

    if (data.length === 0) {return metrics;}

    // Aggregate each dimension
    const allDimensions = new Set<string>();
    data.forEach(dp => Object.keys(dp.dimensions).forEach(k => allDimensions.add(k)));

    for (const dim of allDimensions) {
      const values = data
        .map(dp => dp.dimensions[dim])
        .filter(v => v !== undefined);

      if (values.length > 0) {
        metrics[dim] = {
          sum: values.reduce((sum, v) => sum + v, 0),
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          average: 0,
          variance: 0,
          values,
        };

        metrics[dim].average = metrics[dim].sum / metrics[dim].count;
      }
    }

    return metrics;
  }
}

class AnomalyDetector {
  private recentAnomalies: Anomaly[] = [];

  detect(data: DataPoint[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (data.length < 10) {return anomalies;}

    // Simple outlier detection
    for (const [dim, values] of Object.entries(this.groupByDimension(data))) {
      const numbers = values.map(v => v.value);
      const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
      const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      for (const item of values) {
        if (Math.abs(item.value - mean) > 2 * stdDev) {
          const anomaly: Anomaly = {
            id: `anomaly-${Date.now()}`,
            dataPointId: item.dataPointId,
            dimension: dim,
            value: item.value,
            expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
            severity: Math.abs(item.value - mean) / stdDev,
            timestamp: Date.now(),
          };

          anomalies.push(anomaly);
          this.recentAnomalies.push(anomaly);
        }
      }
    }

    // Keep only recent anomalies
    const cutoff = Date.now() - 3600000; // 1 hour
    this.recentAnomalies = this.recentAnomalies.filter(a => a.timestamp > cutoff);

    return anomalies;
  }

  getRecentAnomalies(): Anomaly[] {
    return this.recentAnomalies;
  }

  private groupByDimension(data: DataPoint[]): Record<string, Array<{ dataPointId: string; value: number }>> {
    const groups: Record<string, Array<{ dataPointId: string; value: number }>> = {};

    for (const dp of data) {
      for (const [dim, value] of Object.entries(dp.dimensions)) {
        if (!groups[dim]) {groups[dim] = [];}
        groups[dim].push({ dataPointId: dp.id, value });
      }
    }

    return groups;
  }
}

class TrendAnalyzer {
  analyze(data: DataPoint[]): Trend[] {
    const trends: Trend[] = [];

    if (data.length < 5) {return trends;}

    // Sort by timestamp
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Analyze each dimension
    const dimensions = new Set<string>();
    data.forEach(dp => Object.keys(dp.dimensions).forEach(k => dimensions.add(k)));

    for (const dim of dimensions) {
      const values = sorted
        .map(dp => ({ time: dp.timestamp, value: dp.dimensions[dim] }))
        .filter(v => v.value !== undefined);

      if (values.length >= 5) {
        const trend = this.detectTrend(values);
        if (trend) {
          trends.push({
            ...trend,
            dimension: dim,
          });
        }
      }
    }

    return trends;
  }

  private detectTrend(values: Array<{ time: number; value: number }>): Trend | null {
    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _v, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v.value, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v.value, 0);
    const sumX2 = values.reduce((sum, _v, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Determine trend type
    if (Math.abs(slope) < 0.01) {
      return {
        id: `trend-stable-${Date.now()}`,
        type: 'stable',
        dimension: '',
        slope: 0,
        strength: 0.8,
        confidence: 0.7,
      };
    } else if (slope > 0) {
      return {
        id: `trend-increasing-${Date.now()}`,
        type: 'increasing',
        dimension: '',
        slope,
        strength: Math.min(1, Math.abs(slope)),
        confidence: 0.8,
      };
    }
      return {
        id: `trend-decreasing-${Date.now()}`,
        type: 'decreasing',
        dimension: '',
        slope,
        strength: Math.min(1, Math.abs(slope)),
        confidence: 0.8,
      };

  }
}

// Type definitions
interface DataStream {
  id: string;
  name: string;
  data: DataPoint[];
  metadata: Record<string, unknown>;
  active: boolean;
}

interface DataPoint {
  id: string;
  timestamp: number;
  dimensions: Record<string, number>;
  source: string;
  quality: number;
}

interface ProcessedChunk {
  id: string;
  processedBy: string;
  dataPoints: number;
  metrics: Record<string, MetricSummary>;
  trends: Trend[];
  anomalies: Anomaly[];
  confidence: number;
}

interface MetricSummary {
  sum: number;
  count: number;
  min: number;
  max: number;
  average: number;
  variance: number;
  values: number[];
}

interface AggregatedMetrics {
  totalDataPoints: number;
  metrics: Record<string, MetricSummary>;
  trends: Trend[];
  anomalyCount: number;
  processingNodes: string[];
}

interface Trend {
  id: string;
  type: 'increasing' | 'decreasing' | 'stable' | 'cyclic';
  dimension: string;
  slope: number;
  strength: number;
  confidence: number;
}

interface Anomaly {
  id: string;
  dataPointId: string;
  dimension: string;
  value: number;
  expectedRange: [number, number];
  severity: number;
  timestamp: number;
}

interface AnalyticsInsight {
  id: string;
  type: 'stability' | 'volatility' | 'pattern' | 'performance';
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface AnalyticsResult {
  streamId: string;
  metrics: AggregatedMetrics;
  patterns: Pattern[];
  insights: AnalyticsInsight[];
  anomalies: Anomaly[];
  confidence: number;
  contributors: string[];
}

interface DistributedComputation {
  id: string;
  type: string;
  dataProcessed: number;
  startTime: number;
  endTime?: number;
  participants: string[];
}

interface SwarmMetric {
  name: string;
  value: number;
  contributors: string[];
  consensus: number;
  lastUpdate: number;
}

interface AnalyticsStatistics {
  activeStreams: number;
  totalDataProcessed: number;
  recentAnomalies: number;
  swarmNodes: number;
  sharedMetrics: number;
  analyticsFormations: number;
}