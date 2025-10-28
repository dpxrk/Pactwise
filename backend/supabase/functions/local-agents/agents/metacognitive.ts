import type { SupabaseClient } from '@supabase/supabase-js';

// Helper interfaces for task and problem structures
interface TaskStructure {
  type?: string;
  steps?: unknown[];
  constraints?: unknown[];
  dataVolume?: number;
  performance?: number;
  strategy?: string;
  requiredPrecision?: number;
  targetValue?: unknown;
  categories?: unknown;
  sequence?: unknown;
}

interface CheckpointStructure {
  score?: number;
  confidence?: number;
  timestamp?: number;
}

interface HistoryEntry {
  performance?: number;
  strategy?: string;
  type?: string;
}

interface PerformanceMetrics {
  efficiency?: number;
}

interface ProblemCharacteristics {
  complexity: number;
  type: string;
  constraints: unknown;
  requiredPrecision: number;
}

interface LearningTrajectory {
  trend: number;
  stability: number;
  recentImprovement: number;
  volatility: number;
  plateauDetected: boolean;
  improvementRate: number;
}

interface LearningPattern {
  type: string;
  frequency?: number;
  impact?: number;
  description?: string;
  breakthroughs?: number[];
}

interface Progression {
  momentum: number;
  efficiency: number;
  consistency: number;
}

interface PerformancePattern {
  average: number;
  trend: number;
  consistency: number;
}

export interface CognitiveState {
  confidence: number;
  uncertainty: number;
  cognitiveLoad: number;
  strategyEffectiveness: number;
  activeStrategies: string[];
  performanceMetrics: {
    accuracy: number;
    speed: number;
    efficiency: number;
  };
}

export interface ReasoningStrategy {
  name: string;
  type: 'analytical' | 'heuristic' | 'intuitive' | 'hybrid';
  complexity: number;
  expectedAccuracy: number;
  expectedSpeed: number;
  contextualFit: number;
}

export interface CalibrationResult {
  initialConfidence: number;
  finalConfidence: number;
  actualAccuracy: number;
  calibrationError: number;
  isWellCalibrated: boolean;
  adjustmentNeeded: number;
}

export interface MetacognitiveInsight {
  type: 'confidence_adjustment' | 'strategy_recommendation' | 'performance_prediction' | 'learning_opportunity';
  description: string;
  impact: number;
  recommendation: string;
}

export class MetacognitiveLayer {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private agentType: string;
  // Removed unused property _performanceHistory
  private strategyPerformance: Map<string, { successes: number; failures: number }> = new Map();
  private confidenceCalibrationHistory: CalibrationResult[] = [];

  constructor(supabase: SupabaseClient, enterpriseId: string, agentType: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.agentType = agentType;
  }

  // Assess the current cognitive state
  async introspectThinking(
    currentTask: unknown,
    availableStrategies: ReasoningStrategy[],
    recentPerformance: number[],
  ): Promise<CognitiveState> {
    // Calculate current confidence based on recent performance
    const confidence = this.calculateConfidence(recentPerformance);

    // Assess uncertainty based on task complexity and novelty
    const uncertainty = await this.assessUncertainty(currentTask);

    // Calculate cognitive load
    const cognitiveLoad = this.calculateCognitiveLoad(currentTask, availableStrategies);

    // Evaluate current strategy effectiveness
    const strategyEffectiveness = this.evaluateStrategyEffectiveness(availableStrategies);

    // Select active strategies based on current state
    const activeStrategies = this.selectActiveStrategies(
      availableStrategies,
      currentTask,
      cognitiveLoad,
    );

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(recentPerformance);

    return {
      confidence,
      uncertainty,
      cognitiveLoad,
      strategyEffectiveness,
      activeStrategies: activeStrategies.map(s => s.name),
      performanceMetrics,
    };
  }

  // Select the best reasoning strategy based on metacognitive analysis
  async selectReasoningStrategy(
    problem: unknown,
    availableStrategies: ReasoningStrategy[],
    cognitiveState: CognitiveState,
    timeConstraint?: number,
  ): Promise<ReasoningStrategy> {
    // Analyze problem characteristics
    const problemCharacteristics = this.analyzeProblem(problem);

    // Score each strategy based on current context
    const scoredStrategies = availableStrategies.map(strategy => {
      const score = this.scoreStrategy(
        strategy,
        problemCharacteristics,
        cognitiveState,
        timeConstraint,
      );
      return { strategy, score };
    });

    // Sort by score and select best
    scoredStrategies.sort((a, b) => b.score - a.score);

    // Consider exploration vs exploitation
    const shouldExplore = Math.random() < this.calculateExplorationRate(cognitiveState);

    if (shouldExplore && scoredStrategies.length > 1) {
      // Occasionally try second-best strategy for learning
      return scoredStrategies[1].strategy;
    }

    return scoredStrategies[0].strategy;
  }

  // Calibrate confidence based on actual vs expected performance
  async calibrateConfidence(
    prediction: unknown,
    actual: unknown,
    initialConfidence: number,
    finalConfidence: number,
    _processingTime: number,
  ): Promise<CalibrationResult> {
    // Calculate actual accuracy
    const actualAccuracy = this.calculateAccuracy(prediction, actual);

    // Determine calibration error
    const calibrationError = Math.abs(finalConfidence - actualAccuracy);

    // Check if well-calibrated (within threshold)
    const calibrationThreshold = 0.1;
    const isWellCalibrated = calibrationError < calibrationThreshold;

    // Calculate adjustment needed
    const adjustmentNeeded = actualAccuracy - finalConfidence;

    const result: CalibrationResult = {
      initialConfidence,
      finalConfidence,
      actualAccuracy,
      calibrationError,
      isWellCalibrated,
      adjustmentNeeded,
    };

    // Store calibration history
    this.confidenceCalibrationHistory.push(result);

    // Update calibration model if needed
    if (!isWellCalibrated) {
      await this.updateCalibrationModel(result);
    }

    return result;
  }

  // Learn how to learn better - meta-learning optimization
  async optimizeLearningProcess(
    learningHistory: unknown[],
    currentPerformance: number,
  ): Promise<{
    learningRateAdjustment: number;
    strategyUpdates: Map<string, number>;
    metacognitiveInsights: MetacognitiveInsight[];
  }> {
    // Analyze learning trajectory
    const learningTrajectory = this.analyzeLearningTrajectory(learningHistory);

    // Identify learning patterns
    const learningPatterns = this.identifyLearningPatterns(learningHistory);

    // Calculate optimal learning rate adjustment
    const learningRateAdjustment = this.calculateLearningRateAdjustment(
      learningTrajectory,
      currentPerformance,
    );

    // Update strategy preferences based on performance
    const strategyUpdates = this.updateStrategyPreferences(learningHistory);

    // Generate metacognitive insights
    const metacognitiveInsights = this.generateMetacognitiveInsights(
      learningPatterns,
      learningTrajectory,
      currentPerformance,
    );

    // Persist learning optimizations
    await this.persistLearningOptimizations({
      learningRateAdjustment,
      strategyUpdates,
      insights: metacognitiveInsights,
    });

    return {
      learningRateAdjustment,
      strategyUpdates,
      metacognitiveInsights,
    };
  }

  // Monitor and evaluate ongoing cognitive processes
  async monitorCognitiveProcess(
    _processId: string,
    checkpoints: unknown[],
  ): Promise<{
    shouldContinue: boolean;
    shouldAdjustStrategy: boolean;
    recommendedAdjustment?: string;
    confidenceTrajectory: number[];
  }> {
    // Analyze checkpoint progression
    const progression = this.analyzeProgression(checkpoints);

    // Detect if stuck or diverging
    const isStuck = this.detectIfStuck(progression);
    const isDiverging = this.detectIfDiverging(progression);

    // Calculate confidence trajectory
    const confidenceTrajectory = checkpoints.map(cp =>
      this.calculateCheckpointConfidence(cp),
    );

    // Determine if should continue or adjust
    const shouldContinue = !isStuck && !isDiverging && progression.momentum > 0;
    const shouldAdjustStrategy = isStuck || isDiverging || progression.efficiency < 0.5;

    let recommendedAdjustment;
    if (shouldAdjustStrategy) {
      recommendedAdjustment = this.recommendStrategyAdjustment(
        progression,
        isStuck,
        isDiverging,
      );
    }

    return {
      shouldContinue,
      shouldAdjustStrategy,
      ...(recommendedAdjustment !== undefined && { recommendedAdjustment }),
      confidenceTrajectory,
    };
  }

  // Generate self-reflection report
  async generateSelfReflection(
    taskHistory: unknown[],
    performanceMetrics: unknown,
  ): Promise<{
    strengths: string[];
    weaknesses: string[];
    improvementAreas: string[];
    learningInsights: string[];
    confidenceAssessment: string;
  }> {
    // Analyze task performance patterns
    const performancePatterns = this.analyzePerformancePatterns(taskHistory);

    // Identify strengths
    const strengths = this.identifyStrengths(performancePatterns);

    // Identify weaknesses
    const weaknesses = this.identifyWeaknesses(performancePatterns);

    // Determine improvement areas
    const improvementAreas = this.determineImprovementAreas(
      strengths,
      weaknesses,
      performanceMetrics,
    );

    // Extract learning insights
    const learningInsights = this.extractLearningInsights(taskHistory);

    // Assess confidence calibration
    const confidenceAssessment = this.assessConfidenceCalibration();

    return {
      strengths,
      weaknesses,
      improvementAreas,
      learningInsights,
      confidenceAssessment,
    };
  }

  // Private helper methods
  private calculateConfidence(recentPerformance: number[]): number {
    if (recentPerformance.length === 0) {return 0.5;}

    const avg = recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;
    const variance = recentPerformance.reduce((sum, val) =>
      sum + Math.pow(val - avg, 2), 0,
    ) / recentPerformance.length;

    // Higher average and lower variance = higher confidence
    const confidence = avg * (1 - Math.min(variance, 0.5));
    return Math.max(0, Math.min(1, confidence));
  }

  private async assessUncertainty(task: unknown): Promise<number> {
    // Check if similar task has been seen before
    const similarity = await this.findTaskSimilarity(task);

    // Calculate task complexity
    const complexity = this.calculateTaskComplexity(task);

    // Uncertainty is high for novel, complex tasks
    const novelty = 1 - similarity;
    const uncertainty = (novelty * 0.6 + complexity * 0.4);

    return Math.max(0, Math.min(1, uncertainty));
  }

  private calculateCognitiveLoad(task: unknown, strategies: ReasoningStrategy[]): number {
    const taskComplexity = this.calculateTaskComplexity(task);
    const strategyComplexity = Math.max(...strategies.map(s => s.complexity));

    return (taskComplexity + strategyComplexity) / 2;
  }

  private evaluateStrategyEffectiveness(strategies: ReasoningStrategy[]): number {
    let totalScore = 0;

    for (const strategy of strategies) {
      const performance = this.strategyPerformance.get(strategy.name);
      if (performance) {
        const successRate = performance.successes /
          (performance.successes + performance.failures + 1);
        totalScore += successRate * strategy.expectedAccuracy;
      } else {
        totalScore += strategy.expectedAccuracy * 0.5; // Default for new strategies
      }
    }

    return strategies.length > 0 ? totalScore / strategies.length : 0;
  }

  private selectActiveStrategies(
    available: ReasoningStrategy[],
    _task: unknown,
    cognitiveLoad: number,
  ): ReasoningStrategy[] {
    // Filter strategies based on cognitive load
    const maxComplexity = 1 - cognitiveLoad * 0.5;
    const suitable = available.filter(s => s.complexity <= maxComplexity);

    // Sort by contextual fit and expected accuracy
    suitable.sort((a, b) =>
      (b.contextualFit * b.expectedAccuracy) - (a.contextualFit * a.expectedAccuracy),
    );

    // Select top strategies (max 3 for parallel processing)
    return suitable.slice(0, 3);
  }

  private calculatePerformanceMetrics(recentPerformance: number[]): {
    accuracy: number;
    speed: number;
    efficiency: number;
  } {
    if (recentPerformance.length === 0) {
      return { accuracy: 0.5, speed: 0.5, efficiency: 0.5 };
    }

    const accuracy = recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;

    // Speed based on performance trend (improving = faster)
    const trend = this.calculateTrend(recentPerformance);
    const speed = Math.max(0, Math.min(1, 0.5 + trend));

    // Efficiency combines accuracy and speed
    const efficiency = (accuracy * 0.7 + speed * 0.3);

    return { accuracy, speed, efficiency };
  }

  private analyzeProblem(problem: unknown): ProblemCharacteristics {
    return {
      complexity: this.calculateTaskComplexity(problem),
      type: this.classifyProblemType(problem),
      constraints: this.extractConstraints(problem),
      requiredPrecision: this.assessRequiredPrecision(problem),
    };
  }

  private scoreStrategy(
    strategy: ReasoningStrategy,
    _problemCharacteristics: ProblemCharacteristics,
    cognitiveState: CognitiveState,
    timeConstraint?: number,
  ): number {
    let score = 0;

    // Match strategy to problem type
    score += strategy.contextualFit * 0.3;

    // Consider expected accuracy
    score += strategy.expectedAccuracy * 0.3;

    // Factor in cognitive load
    const loadPenalty = Math.max(0, cognitiveState.cognitiveLoad - 0.7) * 0.5;
    score -= loadPenalty;

    // Time constraint consideration
    if (timeConstraint) {
      const speedScore = strategy.expectedSpeed / (timeConstraint / 1000);
      score += Math.min(speedScore, 1) * 0.2;
    }

    // Historical performance
    const historical = this.strategyPerformance.get(strategy.name);
    if (historical) {
      const successRate = historical.successes / (historical.successes + historical.failures + 1);
      score += successRate * 0.2;
    }

    return score;
  }

  private calculateExplorationRate(cognitiveState: CognitiveState): number {
    // Higher uncertainty = more exploration
    const uncertaintyFactor = cognitiveState.uncertainty * 0.3;

    // Lower confidence = more exploration
    const confidenceFactor = (1 - cognitiveState.confidence) * 0.2;

    // Base exploration rate
    const baseRate = 0.1;

    return Math.min(0.3, baseRate + uncertaintyFactor + confidenceFactor);
  }

  private calculateAccuracy(prediction: unknown, actual: unknown): number {
    // Simplified accuracy calculation - implement based on your needs
    if (typeof prediction === 'boolean' && typeof actual === 'boolean') {
      return prediction === actual ? 1 : 0;
    }

    if (typeof prediction === 'number' && typeof actual === 'number') {
      const error = Math.abs(prediction - actual);
      const maxError = Math.max(Math.abs(prediction), Math.abs(actual));
      return maxError > 0 ? 1 - (error / maxError) : 1;
    }

    // Default for complex objects
    return 0.5;
  }

  private async updateCalibrationModel(result: CalibrationResult): Promise<void> {
    await this.supabase.from('metacognitive_calibration').insert({
      agent_type: this.agentType,
      enterprise_id: this.enterpriseId,
      calibration_result: result,
      timestamp: new Date().toISOString(),
    });
  }

  private analyzeLearningTrajectory(history: unknown[]): LearningTrajectory {
    const performances = history.map((h) => {
      const entry = h as HistoryEntry;
      return entry.performance || 0;
    });

    const trend = this.calculateTrend(performances);
    const volatility = this.calculateVolatility(performances);
    const plateauDetected = this.detectPlateau(performances);
    const improvementRate = this.calculateImprovementRate(performances);

    return {
      trend,
      volatility,
      plateauDetected,
      improvementRate,
      stability: 1 - volatility,
      recentImprovement: performances.length > 0 ? performances[performances.length - 1] - performances[0] : 0,
    };
  }

  private identifyLearningPatterns(history: unknown[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // Fast initial learning followed by plateau
    if (this.detectFastStart(history)) {
      patterns.push({
        type: 'fast_start_plateau',
        description: 'Quick initial learning followed by performance plateau',
      });
    }

    // Slow steady improvement
    if (this.detectSteadyImprovement(history)) {
      patterns.push({
        type: 'steady_improvement',
        description: 'Consistent gradual performance improvement',
      });
    }

    // Breakthrough moments
    const breakthroughs = this.detectBreakthroughs(history);
    if (breakthroughs.length > 0) {
      patterns.push({
        type: 'breakthrough_learning',
        description: 'Sudden performance jumps at specific points',
        breakthroughs,
      });
    }

    return patterns;
  }

  private calculateLearningRateAdjustment(trajectory: LearningTrajectory, currentPerformance: number): number {
    if (trajectory.plateauDetected && currentPerformance > 0.8) {
      // Reduce learning rate if plateaued at high performance
      return 0.5;
    }

    if (trajectory.volatility > 0.3) {
      // Reduce learning rate if too volatile
      return 0.7;
    }

    if (trajectory.improvementRate < 0.01) {
      // Increase learning rate if improvement too slow
      return 1.5;
    }

    return 1.0; // No adjustment
  }

  private updateStrategyPreferences(history: unknown[]): Map<string, number> {
    const updates = new Map<string, number>();

    for (const item of history) {
      const entry = item as HistoryEntry;
      if (entry.strategy && entry.performance !== undefined) {
        const current = updates.get(entry.strategy) || 0;
        const adjustment = entry.performance > 0.7 ? 0.1 : -0.05;
        updates.set(entry.strategy, current + adjustment);
      }
    }

    return updates;
  }

  private generateMetacognitiveInsights(
    patterns: LearningPattern[],
    trajectory: LearningTrajectory,
    currentPerformance: number,
  ): MetacognitiveInsight[] {
    const insights: MetacognitiveInsight[] = [];

    // Confidence calibration insight
    if (this.confidenceCalibrationHistory.length > 10) {
      const avgCalibrationError = this.confidenceCalibrationHistory
        .slice(-10)
        .reduce((sum, r) => sum + r.calibrationError, 0) / 10;

      if (avgCalibrationError > 0.15) {
        insights.push({
          type: 'confidence_adjustment',
          description: 'Confidence levels consistently misaligned with actual performance',
          impact: 0.8,
          recommendation: `Adjust confidence by ${-avgCalibrationError.toFixed(2)} to improve calibration`,
        });
      }
    }

    // Strategy recommendation insight
    if (trajectory.plateauDetected && currentPerformance < 0.8) {
      insights.push({
        type: 'strategy_recommendation',
        description: 'Performance plateau detected below optimal level',
        impact: 0.9,
        recommendation: 'Try alternative reasoning strategies or increase exploration rate',
      });
    }

    // Learning opportunity insight
    for (const pattern of patterns) {
      if (pattern.type === 'breakthrough_learning') {
        insights.push({
          type: 'learning_opportunity',
          description: 'Breakthrough pattern detected in learning history',
          impact: 0.7,
          recommendation: 'Analyze conditions that led to breakthroughs and replicate',
        });
      }
    }

    return insights;
  }

  private async persistLearningOptimizations(optimizations: unknown): Promise<void> {
    await this.supabase.from('metacognitive_optimizations').insert({
      agent_type: this.agentType,
      enterprise_id: this.enterpriseId,
      optimizations,
      timestamp: new Date().toISOString(),
    });
  }

  // Utility methods
  private calculateTrend(values: number[]): number {
    if (values.length < 2) {return 0;}

    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) {return 0;}

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0,
    ) / values.length;

    return Math.sqrt(variance);
  }

  private detectPlateau(values: number[], windowSize = 5): boolean {
    if (values.length < windowSize * 2) {return false;}

    const recentValues = values.slice(-windowSize);
    const recentTrend = this.calculateTrend(recentValues);
    const recentVolatility = this.calculateVolatility(recentValues);

    return Math.abs(recentTrend) < 0.01 && recentVolatility < 0.05;
  }

  private calculateImprovementRate(values: number[]): number {
    if (values.length < 2) {return 0;}

    const first = values[0];
    const last = values[values.length - 1];
    const improvement = last - first;

    return improvement / values.length;
  }

  private async findTaskSimilarity(_task: unknown): Promise<number> {
    // Implement task similarity search using embeddings or other methods
    // For now, return a default value
    return 0.5;
  }

  private calculateTaskComplexity(task: unknown): number {
    // Implement based on your task structure
    // Consider factors like: number of steps, data volume, constraints, etc.
    let complexity = 0.5;

    const taskStruct = task as TaskStructure;
    if (taskStruct.steps && taskStruct.steps.length > 5) {complexity += 0.2;}
    if (taskStruct.constraints && taskStruct.constraints.length > 3) {complexity += 0.1;}
    if (taskStruct.dataVolume && taskStruct.dataVolume > 1000) {complexity += 0.2;}

    return Math.min(1, complexity);
  }

  private classifyProblemType(problem: unknown): string {
    // Implement problem classification logic
    const problemStruct = problem as TaskStructure;
    if (problemStruct.type) {return problemStruct.type;}

    // Default classification based on problem structure
    if (problemStruct.targetValue !== undefined) {return 'optimization';}
    if (problemStruct.categories !== undefined) {return 'classification';}
    if (problemStruct.sequence !== undefined) {return 'sequential';}

    return 'general';
  }

  private extractConstraints(problem: unknown): unknown[] {
    const problemStruct = problem as TaskStructure;
    return problemStruct.constraints || [];
  }

  private assessRequiredPrecision(problem: unknown): number {
    const problemStruct = problem as TaskStructure;
    return problemStruct.requiredPrecision || 0.8;
  }

  private analyzeProgression(checkpoints: unknown[]): Progression {
    const scores = checkpoints.map((cp) => {
      const checkpoint = cp as CheckpointStructure;
      return checkpoint.score || 0;
    });

    return {
      momentum: this.calculateTrend(scores),
      efficiency: this.calculateEfficiency(checkpoints),
      consistency: 1 - this.calculateVolatility(scores),
    };
  }

  private detectIfStuck(progression: Progression): boolean {
    return progression.momentum < 0.01 && progression.efficiency < 0.3;
  }

  private detectIfDiverging(progression: Progression): boolean {
    return progression.momentum < -0.05 || progression.consistency < 0.3;
  }

  private calculateCheckpointConfidence(checkpoint: unknown): number {
    const cp = checkpoint as CheckpointStructure;
    return cp.confidence || 0.5;
  }

  private recommendStrategyAdjustment(
    progression: Progression,
    isStuck: boolean,
    isDiverging: boolean,
  ): string {
    if (isStuck) {
      return 'Switch to more exploratory strategy or increase search breadth';
    }

    if (isDiverging) {
      return 'Return to more conservative strategy or add constraints';
    }

    if (progression.efficiency < 0.5) {
      return 'Optimize current strategy parameters or try hybrid approach';
    }

    return 'Continue with current strategy';
  }

  private calculateEfficiency(checkpoints: unknown[]): number {
    if (checkpoints.length < 2) {return 0.5;}

    const improvements = [];
    for (let i = 1; i < checkpoints.length; i++) {
      const current = checkpoints[i] as CheckpointStructure;
      const previous = checkpoints[i - 1] as CheckpointStructure;
      const improvement = (current.score || 0) - (previous.score || 0);
      const timeSpent = ((current.timestamp || 0) - (previous.timestamp || 0)) || 1;
      improvements.push(improvement / timeSpent);
    }

    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    return Math.max(0, Math.min(1, avgImprovement + 0.5));
  }

  private analyzePerformancePatterns(taskHistory: unknown[]): Record<string, PerformancePattern> {
    const byType = new Map<string, number[]>();

    for (const item of taskHistory) {
      const task = item as HistoryEntry;
      const type = task.type || 'general';
      const performance = task.performance || 0;

      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(performance);
    }

    const patterns: Record<string, PerformancePattern> = {};
    for (const [type, performances] of byType) {
      patterns[type] = {
        average: performances.reduce((a, b) => a + b, 0) / performances.length,
        trend: this.calculateTrend(performances),
        consistency: 1 - this.calculateVolatility(performances),
      };
    }

    return patterns;
  }

  private identifyStrengths(patterns: Record<string, PerformancePattern>): string[] {
    const strengths = [];

    for (const [type, stats] of Object.entries(patterns)) {
      // stats is already properly typed as PerformancePattern
      if (stats.average > 0.8) {
        strengths.push(`Excellent performance in ${type} tasks (${(stats.average * 100).toFixed(0)}% accuracy)`);
      }
      if (stats.consistency > 0.9) {
        strengths.push(`Highly consistent in ${type} tasks`);
      }
      if (stats.trend > 0.05) {
        strengths.push(`Rapidly improving in ${type} tasks`);
      }
    }

    return strengths;
  }

  private identifyWeaknesses(patterns: Record<string, PerformancePattern>): string[] {
    const weaknesses = [];

    for (const [type, stats] of Object.entries(patterns)) {
      // stats is already properly typed as PerformancePattern
      if (stats.average < 0.5) {
        weaknesses.push(`Struggling with ${type} tasks (${(stats.average * 100).toFixed(0)}% accuracy)`);
      }
      if (stats.consistency < 0.5) {
        weaknesses.push(`Inconsistent performance in ${type} tasks`);
      }
      if (stats.trend < -0.02) {
        weaknesses.push(`Declining performance in ${type} tasks`);
      }
    }

    return weaknesses;
  }

  private determineImprovementAreas(
    strengths: string[],
    weaknesses: string[],
    metrics: unknown,
  ): string[] {
    const improvements = [];

    // Address weaknesses
    if (weaknesses.some(w => w.includes('Struggling'))) {
      improvements.push('Focus on improving accuracy in challenging task types');
    }

    if (weaknesses.some(w => w.includes('Inconsistent'))) {
      improvements.push('Develop more robust strategies for consistent performance');
    }

    // Build on strengths
    if (strengths.some(s => s.includes('Rapidly improving'))) {
      improvements.push('Maintain learning momentum in improving areas');
    }

    // General improvements
    const performanceMetrics = metrics as PerformanceMetrics;
    if (performanceMetrics.efficiency !== undefined && performanceMetrics.efficiency < 0.7) {
      improvements.push('Optimize processing efficiency to reduce time per task');
    }

    return improvements;
  }

  private extractLearningInsights(taskHistory: unknown[]): string[] {
    const insights = [];

    // Analyze learning velocity
    const learningVelocity = this.calculateLearningVelocity(taskHistory);
    if (learningVelocity > 0.1) {
      insights.push('Learning velocity is high - current strategies are effective');
    } else if (learningVelocity < 0.01) {
      insights.push('Learning has plateaued - consider new approaches');
    }

    // Identify breakthrough moments
    const breakthroughs = this.detectBreakthroughs(taskHistory);
    if (breakthroughs.length > 0) {
      insights.push(`${breakthroughs.length} breakthrough moments identified - analyze for patterns`);
    }

    // Strategy effectiveness
    const strategyInsights = this.analyzeStrategyEffectiveness();
    insights.push(...strategyInsights);

    return insights;
  }

  private assessConfidenceCalibration(): string {
    if (this.confidenceCalibrationHistory.length < 5) {
      return 'Insufficient data for confidence calibration assessment';
    }

    const recent = this.confidenceCalibrationHistory.slice(-20);
    const avgError = recent.reduce((sum, r) => sum + r.calibrationError, 0) / recent.length;
    const wellCalibrated = recent.filter(r => r.isWellCalibrated).length / recent.length;

    if (wellCalibrated > 0.8) {
      return `Excellent confidence calibration (${(wellCalibrated * 100).toFixed(0)}% well-calibrated)`;
    } else if (wellCalibrated > 0.6) {
      return `Good confidence calibration with room for improvement (avg error: ${avgError.toFixed(2)})`;
    }
      return `Poor confidence calibration - tends to be ${avgError > 0 ? 'overconfident' : 'underconfident'}`;

  }

  private detectFastStart(history: unknown[]): boolean {
    if (history.length < 5) {return false;}

    const early = history.slice(0, 5).map((h) => {
      const entry = h as HistoryEntry;
      return entry.performance || 0;
    });
    const earlyImprovement = early[early.length - 1] - early[0];

    return earlyImprovement > 0.3;
  }

  private detectSteadyImprovement(history: unknown[]): boolean {
    if (history.length < 10) {return false;}

    const performances = history.map((h) => {
      const entry = h as HistoryEntry;
      return entry.performance || 0;
    });
    const trend = this.calculateTrend(performances);
    const volatility = this.calculateVolatility(performances);

    return trend > 0.01 && volatility < 0.1;
  }

  private detectBreakthroughs(history: unknown[]): number[] {
    const breakthroughs = [];

    for (let i = 1; i < history.length; i++) {
      const current = history[i] as HistoryEntry;
      const previous = history[i - 1] as HistoryEntry;
      const improvement = (current.performance || 0) - (previous.performance || 0);
      if (improvement > 0.15) {
        breakthroughs.push(i);
      }
    }

    return breakthroughs;
  }

  private calculateLearningVelocity(history: unknown[]): number {
    if (history.length < 2) {return 0;}

    const performances = history.map((h) => {
      const entry = h as HistoryEntry;
      return entry.performance || 0;
    });
    return this.calculateTrend(performances);
  }

  private analyzeStrategyEffectiveness(): string[] {
    const insights = [];

    for (const [strategy, performance] of this.strategyPerformance) {
      const total = performance.successes + performance.failures;
      if (total > 10) {
        const successRate = performance.successes / total;
        if (successRate > 0.8) {
          insights.push(`${strategy} strategy is highly effective (${(successRate * 100).toFixed(0)}% success)`);
        } else if (successRate < 0.4) {
          insights.push(`${strategy} strategy needs improvement (${(successRate * 100).toFixed(0)}% success)`);
        }
      }
    }

    return insights;
  }
}