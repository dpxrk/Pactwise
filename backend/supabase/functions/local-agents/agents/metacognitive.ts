import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { SupabaseClient } from '@supabase/supabase-js';

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
  private performanceHistory: Map<string, number[]> = new Map();
  private strategyPerformance: Map<string, { successes: number; failures: number }> = new Map();
  private confidenceCalibrationHistory: CalibrationResult[] = [];

  constructor(supabase: SupabaseClient, enterpriseId: string, agentType: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.agentType = agentType;
  }

  // Assess the current cognitive state
  async introspectThinking(
    currentTask: any,
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
    problem: any,
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
    prediction: any,
    actual: any,
    initialConfidence: number,
    finalConfidence: number,
    processingTime: number,
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
    learningHistory: any[],
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
    processId: string,
    checkpoints: any[],
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
      recommendedAdjustment,
      confidenceTrajectory,
    };
  }

  // Generate self-reflection report
  async generateSelfReflection(
    taskHistory: any[],
    performanceMetrics: any,
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

  private async assessUncertainty(task: any): Promise<number> {
    // Check if similar task has been seen before
    const similarity = await this.findTaskSimilarity(task);

    // Calculate task complexity
    const complexity = this.calculateTaskComplexity(task);

    // Uncertainty is high for novel, complex tasks
    const novelty = 1 - similarity;
    const uncertainty = (novelty * 0.6 + complexity * 0.4);

    return Math.max(0, Math.min(1, uncertainty));
  }

  private calculateCognitiveLoad(task: any, strategies: ReasoningStrategy[]): number {
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
    task: any,
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

  private analyzeProblem(problem: any): any {
    return {
      complexity: this.calculateTaskComplexity(problem),
      type: this.classifyProblemType(problem),
      constraints: this.extractConstraints(problem),
      requiredPrecision: this.assessRequiredPrecision(problem),
    };
  }

  private scoreStrategy(
    strategy: ReasoningStrategy,
    problemCharacteristics: any,
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

  private calculateAccuracy(prediction: any, actual: any): number {
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

  private analyzeLearningTrajectory(history: any[]): any {
    const performances = history.map(h => h.performance || 0);

    return {
      trend: this.calculateTrend(performances),
      volatility: this.calculateVolatility(performances),
      plateauDetected: this.detectPlateau(performances),
      improvementRate: this.calculateImprovementRate(performances),
    };
  }

  private identifyLearningPatterns(history: any[]): any[] {
    const patterns = [];

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

  private calculateLearningRateAdjustment(trajectory: any, currentPerformance: number): number {
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

  private updateStrategyPreferences(history: any[]): Map<string, number> {
    const updates = new Map<string, number>();

    for (const entry of history) {
      if (entry.strategy && entry.performance !== undefined) {
        const current = updates.get(entry.strategy) || 0;
        const adjustment = entry.performance > 0.7 ? 0.1 : -0.05;
        updates.set(entry.strategy, current + adjustment);
      }
    }

    return updates;
  }

  private generateMetacognitiveInsights(
    patterns: any[],
    trajectory: any,
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

  private async persistLearningOptimizations(optimizations: any): Promise<void> {
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

  private async findTaskSimilarity(task: any): Promise<number> {
    // Implement task similarity search using embeddings or other methods
    // For now, return a default value
    return 0.5;
  }

  private calculateTaskComplexity(task: any): number {
    // Implement based on your task structure
    // Consider factors like: number of steps, data volume, constraints, etc.
    let complexity = 0.5;

    if (task.steps && task.steps.length > 5) {complexity += 0.2;}
    if (task.constraints && task.constraints.length > 3) {complexity += 0.1;}
    if (task.dataVolume && task.dataVolume > 1000) {complexity += 0.2;}

    return Math.min(1, complexity);
  }

  private classifyProblemType(problem: any): string {
    // Implement problem classification logic
    if (problem.type) {return problem.type;}

    // Default classification based on problem structure
    if (problem.targetValue !== undefined) {return 'optimization';}
    if (problem.categories !== undefined) {return 'classification';}
    if (problem.sequence !== undefined) {return 'sequential';}

    return 'general';
  }

  private extractConstraints(problem: any): any[] {
    return problem.constraints || [];
  }

  private assessRequiredPrecision(problem: any): number {
    return problem.requiredPrecision || 0.8;
  }

  private analyzeProgression(checkpoints: any[]): any {
    const scores = checkpoints.map(cp => cp.score || 0);

    return {
      momentum: this.calculateTrend(scores),
      efficiency: this.calculateEfficiency(checkpoints),
      consistency: 1 - this.calculateVolatility(scores),
    };
  }

  private detectIfStuck(progression: any): boolean {
    return progression.momentum < 0.01 && progression.efficiency < 0.3;
  }

  private detectIfDiverging(progression: any): boolean {
    return progression.momentum < -0.05 || progression.consistency < 0.3;
  }

  private calculateCheckpointConfidence(checkpoint: any): number {
    return checkpoint.confidence || 0.5;
  }

  private recommendStrategyAdjustment(
    progression: any,
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

  private calculateEfficiency(checkpoints: any[]): number {
    if (checkpoints.length < 2) {return 0.5;}

    const improvements = [];
    for (let i = 1; i < checkpoints.length; i++) {
      const improvement = (checkpoints[i].score || 0) - (checkpoints[i - 1].score || 0);
      const timeSpent = (checkpoints[i].timestamp - checkpoints[i - 1].timestamp) || 1;
      improvements.push(improvement / timeSpent);
    }

    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    return Math.max(0, Math.min(1, avgImprovement + 0.5));
  }

  private analyzePerformancePatterns(taskHistory: any[]): any {
    const byType = new Map<string, number[]>();

    for (const task of taskHistory) {
      const type = task.type || 'general';
      const performance = task.performance || 0;

      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(performance);
    }

    const patterns: any = {};
    for (const [type, performances] of byType) {
      patterns[type] = {
        average: performances.reduce((a, b) => a + b, 0) / performances.length,
        trend: this.calculateTrend(performances),
        consistency: 1 - this.calculateVolatility(performances),
      };
    }

    return patterns;
  }

  private identifyStrengths(patterns: any): string[] {
    const strengths = [];

    for (const [type, stats] of Object.entries(patterns)) {
      const s = stats as any;
      if (s.average > 0.8) {
        strengths.push(`Excellent performance in ${type} tasks (${(s.average * 100).toFixed(0)}% accuracy)`);
      }
      if (s.consistency > 0.9) {
        strengths.push(`Highly consistent in ${type} tasks`);
      }
      if (s.trend > 0.05) {
        strengths.push(`Rapidly improving in ${type} tasks`);
      }
    }

    return strengths;
  }

  private identifyWeaknesses(patterns: any): string[] {
    const weaknesses = [];

    for (const [type, stats] of Object.entries(patterns)) {
      const s = stats as any;
      if (s.average < 0.5) {
        weaknesses.push(`Struggling with ${type} tasks (${(s.average * 100).toFixed(0)}% accuracy)`);
      }
      if (s.consistency < 0.5) {
        weaknesses.push(`Inconsistent performance in ${type} tasks`);
      }
      if (s.trend < -0.02) {
        weaknesses.push(`Declining performance in ${type} tasks`);
      }
    }

    return weaknesses;
  }

  private determineImprovementAreas(
    strengths: string[],
    weaknesses: string[],
    metrics: any,
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
    if (metrics.efficiency < 0.7) {
      improvements.push('Optimize processing efficiency to reduce time per task');
    }

    return improvements;
  }

  private extractLearningInsights(taskHistory: any[]): string[] {
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

  private detectFastStart(history: any[]): boolean {
    if (history.length < 5) {return false;}

    const early = history.slice(0, 5).map(h => h.performance || 0);
    const earlyImprovement = early[early.length - 1] - early[0];

    return earlyImprovement > 0.3;
  }

  private detectSteadyImprovement(history: any[]): boolean {
    if (history.length < 10) {return false;}

    const performances = history.map(h => h.performance || 0);
    const trend = this.calculateTrend(performances);
    const volatility = this.calculateVolatility(performances);

    return trend > 0.01 && volatility < 0.1;
  }

  private detectBreakthroughs(history: any[]): number[] {
    const breakthroughs = [];

    for (let i = 1; i < history.length; i++) {
      const improvement = (history[i].performance || 0) - (history[i - 1].performance || 0);
      if (improvement > 0.15) {
        breakthroughs.push(i);
      }
    }

    return breakthroughs;
  }

  private calculateLearningVelocity(history: any[]): number {
    if (history.length < 2) {return 0;}

    const performances = history.map(h => h.performance || 0);
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