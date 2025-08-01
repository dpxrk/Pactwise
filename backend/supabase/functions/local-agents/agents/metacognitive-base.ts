import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { MetacognitiveLayer, CognitiveState, ReasoningStrategy, CalibrationResult, MetacognitiveInsight } from './metacognitive.ts';
import { SupabaseClient } from '@supabase/supabase-js';

export interface MetacognitiveProcessingResult extends ProcessingResult {
  metacognitive?: {
    cognitiveState: CognitiveState;
    strategyUsed: ReasoningStrategy;
    calibration: CalibrationResult;
    insights: MetacognitiveInsight[];
    selfReflection?: any;
    processingMonitor?: any;
  };
}

export abstract class MetacognitiveBaseAgent extends BaseAgent {
  protected metacognition: MetacognitiveLayer;
  protected metacognitionEnabled: boolean = true;
  protected recentPerformance: number[] = [];
  protected availableStrategies: ReasoningStrategy[] = [];
  protected currentCognitiveState?: CognitiveState;
  protected config = { debugMode: false };

  constructor(supabase: SupabaseClient, enterpriseId: string, agentType: string) {
    super(supabase, enterpriseId);
    this.metacognition = new MetacognitiveLayer(supabase, enterpriseId, agentType);
    this.initializeStrategies();
  }

  // Initialize available reasoning strategies for this agent
  protected abstract initializeStrategies(): void;
  
  // Process without metacognition - must be implemented by subclasses
  protected abstract processWithoutMetacognition(data: any, context?: AgentContext): Promise<MetacognitiveProcessingResult>;

  // Enhanced process method with metacognitive monitoring
  async process(data: any, context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    if (!this.metacognitionEnabled) {
      // Fall back to standard processing
      return this.processWithoutMetacognition(data, context);
    }

    const processId = this.generateProcessId();
    const startTime = Date.now();
    const checkpoints: any[] = [];

    try {
      // Step 1: Introspect current cognitive state
      this.currentCognitiveState = await this.metacognition.introspectThinking(
        data,
        this.availableStrategies,
        this.recentPerformance,
      );

      // Log cognitive state
      this.logCognitiveState(processId, this.currentCognitiveState);

      // Step 2: Select optimal reasoning strategy
      const selectedStrategy = await this.metacognition.selectReasoningStrategy(
        data,
        this.availableStrategies,
        this.currentCognitiveState,
        context?.timeConstraint,
      );

      // Step 3: Assess initial confidence
      const initialConfidence = this.assessInitialConfidence(data, this.currentCognitiveState);

      // Step 4: Process with selected strategy and monitoring
      const result = await this.processWithStrategy(
        data,
        context,
        selectedStrategy,
        processId,
        checkpoints,
      );

      // Step 5: Calculate processing metrics
      const processingTime = Date.now() - startTime;
      const finalConfidence = result.confidence;

      // Step 6: Calibrate confidence
      const calibration = await this.metacognition.calibrateConfidence(
        result.result,
        data.expectedResult || null,
        initialConfidence,
        finalConfidence,
        processingTime,
      );

      // Step 7: Optimize learning process
      const learningOptimization = await this.metacognition.optimizeLearningProcess(
        this.getLearningHistory(),
        result.success ? 1 : 0,
      );

      // Step 8: Generate self-reflection
      const selfReflection = await this.metacognition.generateSelfReflection(
        this.getTaskHistory(),
        this.getPerformanceMetrics(),
      );

      // Step 9: Update performance tracking
      this.updatePerformanceTracking(result.success ? finalConfidence : 0);

      // Step 10: Monitor cognitive process results
      const monitoringResult = await this.metacognition.monitorCognitiveProcess(
        processId,
        checkpoints,
      );

      // Construct enhanced result with metacognitive data
      const enhancedResult: MetacognitiveProcessingResult = {
        ...result,
        metacognitive: {
          cognitiveState: this.currentCognitiveState,
          strategyUsed: selectedStrategy,
          calibration,
          insights: learningOptimization.metacognitiveInsights,
          selfReflection,
          processingMonitor: {
            ...monitoringResult,
            processingTime,
            checkpointCount: checkpoints.length,
          },
        },
      };

      // Apply learning optimizations
      await this.applyLearningOptimizations(learningOptimization);

      return enhancedResult;

    } catch (error) {
      // Metacognitive error handling
      const errorInsight = await this.handleErrorWithMetacognition(error, processId);

      return {
        success: false,
        data: null,
        result: null,
        insights: [errorInsight],
        rulesApplied: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
        metadata: { error: error instanceof Error ? error.message : String(error) },
        metacognitive: {
          cognitiveState: this.currentCognitiveState || await this.getDefaultCognitiveState(),
          strategyUsed: this.getDefaultStrategy(),
          calibration: {
            initialConfidence: 0.5,
            finalConfidence: 0,
            actualAccuracy: 0,
            calibrationError: 0.5,
            isWellCalibrated: false,
            adjustmentNeeded: -0.5,
          },
          insights: [{
            type: 'learning_opportunity',
            description: 'Error encountered during processing',
            impact: 0.9,
            recommendation: 'Analyze error patterns to improve robustness',
          }],
        },
      };
    }
  }

  // Process with specific strategy and monitoring
  protected async processWithStrategy(
    data: any,
    context: AgentContext | undefined,
    strategy: ReasoningStrategy,
    _processId: string,
    checkpoints: any[],
  ): Promise<ProcessingResult> {
    // Create checkpoint
    const createCheckpoint = (stage: string, score: number) => {
      checkpoints.push({
        stage,
        score,
        confidence: this.currentCognitiveState?.confidence || 0.5,
        timestamp: Date.now(),
        strategy: strategy.name,
      });
    };

    createCheckpoint('start', 0);

    // Apply strategy-specific processing
    let result: ProcessingResult;

    switch (strategy.type) {
      case 'analytical':
        result = await this.processAnalytically(data, context, createCheckpoint);
        break;

      case 'heuristic':
        result = await this.processHeuristically(data, context, createCheckpoint);
        break;

      case 'intuitive':
        result = await this.processIntuitively(data, context, createCheckpoint);
        break;

      case 'hybrid':
        result = await this.processHybrid(data, context, createCheckpoint);
        break;

      default:
        // Fall back to standard processing
        result = await this.processWithoutMetacognition(data, context);
    }

    createCheckpoint('complete', result.success ? 1 : 0);

    return result;
  }

  // Strategy-specific processing methods (to be overridden by subclasses)
  protected async processAnalytically(
    data: any,
    context: AgentContext | undefined,
    checkpoint: (stage: string, score: number) => void,
  ): Promise<ProcessingResult> {
    // Default analytical processing
    checkpoint('analysis_start', 0.2);

    // Decompose problem
    const components = this.decomposeAnalytically(data);
    checkpoint('decomposition_complete', 0.4);

    // Process each component
    const componentResults = await Promise.all(
      components.map(c => this.processComponent(c, context)),
    );
    checkpoint('components_processed', 0.7);

    // Synthesize results
    const synthesized = this.synthesizeResults(componentResults);
    checkpoint('synthesis_complete', 0.9);

    return synthesized;
  }

  protected async processHeuristically(
    data: any,
    context: AgentContext | undefined,
    checkpoint: (stage: string, score: number) => void,
  ): Promise<ProcessingResult> {
    // Default heuristic processing
    checkpoint('heuristic_start', 0.2);

    // Apply rules of thumb
    const heuristicResult = await this.applyHeuristics(data, context);
    checkpoint('heuristics_applied', 0.6);

    // Validate with quick checks
    const validated = this.validateHeuristic(heuristicResult);
    checkpoint('validation_complete', 0.9);

    return validated;
  }

  protected async processIntuitively(
    data: any,
    context: AgentContext | undefined,
    checkpoint: (stage: string, score: number) => void,
  ): Promise<ProcessingResult> {
    // Default intuitive processing
    checkpoint('intuition_start', 0.2);

    // Pattern matching
    const patterns = await this.matchPatterns(data, context);
    checkpoint('pattern_matching_complete', 0.5);

    // Quick assessment
    const assessment = this.intuitiveAssessment(patterns);
    checkpoint('assessment_complete', 0.9);

    return assessment;
  }

  protected async processHybrid(
    data: any,
    context: AgentContext | undefined,
    checkpoint: (stage: string, score: number) => void,
  ): Promise<ProcessingResult> {
    // Combine multiple strategies
    checkpoint('hybrid_start', 0.1);

    // Quick intuitive assessment
    const intuitive = await this.processIntuitively(data, context, () => {});
    checkpoint('intuitive_complete', 0.3);

    // If high confidence, return early
    if (intuitive.confidence > 0.9) {
      return intuitive;
    }

    // Otherwise, apply analytical approach
    const analytical = await this.processAnalytically(data, context, () => {});
    checkpoint('analytical_complete', 0.7);

    // Combine results
    const combined = this.combineResults(intuitive, analytical);
    checkpoint('combination_complete', 0.9);

    return combined;
  }

  // Helper methods for metacognitive processing
  protected assessInitialConfidence(data: any, cognitiveState: CognitiveState): number {
    // Base confidence on cognitive state and data complexity
    const complexityFactor = this.assessDataComplexity(data);
    const stateFactor = cognitiveState.confidence;
    const uncertaintyPenalty = cognitiveState.uncertainty * 0.3;

    const initialConfidence = (stateFactor * 0.7 + (1 - complexityFactor) * 0.3) - uncertaintyPenalty;

    return Math.max(0.1, Math.min(0.9, initialConfidence));
  }

  protected updatePerformanceTracking(performance: number): void {
    this.recentPerformance.push(performance);

    // Keep only recent performance (last 20)
    if (this.recentPerformance.length > 20) {
      this.recentPerformance.shift();
    }
  }

  protected async applyLearningOptimizations(optimization: any): Promise<void> {
    // Update strategy preferences
    for (const [strategyName, adjustment] of optimization.strategyUpdates) {
      const strategy = this.availableStrategies.find(s => s.name === strategyName);
      if (strategy) {
        strategy.expectedAccuracy = Math.max(0, Math.min(1,
          strategy.expectedAccuracy + adjustment,
        ));
      }
    }

    // Apply learning rate adjustment if significant
    if (Math.abs(optimization.learningRateAdjustment - 1) > 0.1) {
      await this.adjustLearningRate(optimization.learningRateAdjustment);
    }
  }

  protected async handleErrorWithMetacognition(error: any, processId: string): Promise<Insight> {
    // Analyze error for learning
    const errorAnalysis = this.analyzeError(error);

    // Create learning insight from error
    return this.createInsight(
      'error_learning',
      'high',
      'Processing Error Encountered',
      `Error during ${this.agentType} processing: ${error.message}`,
      undefined,
      {
        errorType: errorAnalysis.type,
        errorContext: errorAnalysis.context,
        recommendedStrategy: errorAnalysis.recommendedStrategy,
        processId,
      },
      false,
    );
  }

  // Utility methods
  protected generateProcessId(): string {
    return `${this.agentType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  protected logCognitiveState(processId: string, state: CognitiveState): void {
    if (this.config.debugMode) {
      console.log(`[${processId}] Cognitive State:`, {
        confidence: state.confidence.toFixed(2),
        uncertainty: state.uncertainty.toFixed(2),
        cognitiveLoad: state.cognitiveLoad.toFixed(2),
        activeStrategies: state.activeStrategies,
      });
    }
  }

  protected getLearningHistory(): any[] {
    // Override in subclasses to provide specific learning history
    return [];
  }

  protected getTaskHistory(): any[] {
    // Override in subclasses to provide specific task history
    return [];
  }

  protected getPerformanceMetrics(): any {
    return {
      recentPerformance: this.recentPerformance,
      averageConfidence: this.recentPerformance.reduce((a, b) => a + b, 0) /
        (this.recentPerformance.length || 1),
      successRate: this.recentPerformance.filter(p => p > 0.5).length /
        (this.recentPerformance.length || 1),
    };
  }

  protected async getDefaultCognitiveState(): Promise<CognitiveState> {
    return {
      confidence: 0.5,
      uncertainty: 0.5,
      cognitiveLoad: 0.5,
      strategyEffectiveness: 0.5,
      activeStrategies: [],
      performanceMetrics: {
        accuracy: 0.5,
        speed: 0.5,
        efficiency: 0.5,
      },
    };
  }

  protected getDefaultStrategy(): ReasoningStrategy {
    return this.availableStrategies[0] || {
      name: 'default',
      type: 'analytical',
      complexity: 0.5,
      expectedAccuracy: 0.7,
      expectedSpeed: 0.5,
      contextualFit: 0.5,
    };
  }

  // Abstract methods for subclasses to implement
  protected abstract decomposeAnalytically(data: any): any[];
  protected abstract processComponent(component: any, context?: AgentContext): Promise<any>;
  protected abstract synthesizeResults(results: any[]): ProcessingResult;
  protected abstract applyHeuristics(data: any, context?: AgentContext): Promise<ProcessingResult>;
  protected abstract validateHeuristic(result: ProcessingResult): ProcessingResult;
  protected abstract matchPatterns(data: any, context?: AgentContext): Promise<any[]>;
  protected abstract intuitiveAssessment(patterns: any[]): ProcessingResult;
  protected abstract combineResults(result1: ProcessingResult, result2: ProcessingResult): ProcessingResult;
  protected abstract assessDataComplexity(data: any): number;
  protected abstract adjustLearningRate(adjustment: number): Promise<void>;
  protected abstract analyzeError(error: any): any;
}