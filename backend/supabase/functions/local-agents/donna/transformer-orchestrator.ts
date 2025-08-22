import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { DonnaAI } from './base.ts';
import { TransformerService, TransformerRequest } from './transformer-integration.ts';
import { EmbeddingService } from './embedding-service.ts';
import { AdvancedLearningEngine } from './advanced-learning.ts';

/**
 * Transformer Orchestrator for Donna AI
 * Coordinates multiple transformer models and agents for optimal results
 * Implements Mixture of Experts (MoE) pattern for efficient routing
 */

export interface OrchestratorRequest {
  query: string;
  type: 'contract_analysis' | 'risk_assessment' | 'compliance_check' | 
        'vendor_evaluation' | 'financial_analysis' | 'general';
  context?: {
    enterpriseId?: string;
    userId?: string;
    domain?: string;
    urgency?: 'low' | 'medium' | 'high';
    [key: string]: any;
  };
  requiresLLM?: boolean;
}

export interface OrchestratorResponse {
  result: any;
  insights: any[];
  recommendations: string[];
  confidence: number;
  models_used: string[];
  total_cost: number;
  processing_time: number;
  cache_hits: number;
}

export interface ExpertModel {
  name: string;
  domain: string[];
  capabilities: string[];
  cost_per_call: number;
  average_latency: number;
  confidence_threshold: number;
}

export class TransformerOrchestrator {
  private supabase: SupabaseClient;
  private donnaAI: DonnaAI;
  private transformerService: TransformerService;
  private embeddingService: EmbeddingService;
  private learningEngine: AdvancedLearningEngine;
  
  // Expert models configuration
  private experts: Map<string, ExpertModel> = new Map([
    ['legal_expert', {
      name: 'legal-bert',
      domain: ['contract', 'compliance', 'legal'],
      capabilities: ['clause_extraction', 'risk_identification', 'compliance_check'],
      cost_per_call: 0,
      average_latency: 500,
      confidence_threshold: 0.75,
    }],
    ['financial_expert', {
      name: 'finbert',
      domain: ['financial', 'budget', 'cost'],
      capabilities: ['sentiment_analysis', 'risk_scoring', 'financial_metrics'],
      cost_per_call: 0,
      average_latency: 400,
      confidence_threshold: 0.70,
    }],
    ['general_expert', {
      name: 'all-MiniLM',
      domain: ['general', 'search', 'similarity'],
      capabilities: ['embedding', 'classification', 'similarity_matching'],
      cost_per_call: 0,
      average_latency: 300,
      confidence_threshold: 0.65,
    }],
  ]);

  // Routing table learned from usage patterns
  private routingTable: Map<string, string[]> = new Map();
  private performanceMetrics: Map<string, any> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.donnaAI = new DonnaAI(supabase);
    this.transformerService = new TransformerService(supabase);
    this.embeddingService = new EmbeddingService(supabase);
    this.learningEngine = new AdvancedLearningEngine(supabase);
    
    this.initializeRoutingTable();
  }

  /**
   * Main orchestration method
   */
  async process(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const modelsUsed: string[] = [];
    let totalCost = 0;
    let cacheHits = 0;

    try {
      // Step 1: Route to appropriate experts
      const selectedExperts = await this.selectExperts(request);
      
      // Step 2: Generate embeddings for semantic understanding
      const embedding = await this.embeddingService.embed(request.query, {
        provider: 'auto',
      });
      
      if (embedding.cached) cacheHits++;
      totalCost += embedding.cost;

      // Step 3: Search for similar patterns in knowledge base
      const similarPatterns = await this.embeddingService.semanticSearch(
        request.query,
        { topK: 5, threshold: 0.7 }
      );
      
      // Step 4: Process through selected expert models
      const expertResults = await this.processWithExperts(
        request,
        selectedExperts,
        embedding.embedding
      );
      
      modelsUsed.push(...expertResults.models);
      totalCost += expertResults.cost;
      if (expertResults.cached) cacheHits++;

      // Step 5: Get insights from Donna's cross-enterprise learning
      const donnaAnalysis = await this.donnaAI.analyze(
        request.type,
        {
          ...request.context,
          query: request.query,
          expertResults: expertResults.results,
          similarPatterns,
        },
        request.context?.enterpriseId
      );

      // Step 6: Apply advanced learning algorithms for optimization
      const optimizedResult = await this.optimizeWithLearning(
        expertResults.results,
        donnaAnalysis,
        request.context || {}
      );

      // Step 7: Generate final recommendations
      const recommendations = await this.generateRecommendations(
        request,
        expertResults.results,
        donnaAnalysis,
        optimizedResult
      );

      // Step 8: Learn from this interaction
      await this.learnFromInteraction(request, expertResults, donnaAnalysis);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(
        expertResults.confidence,
        donnaAnalysis.confidence,
        similarPatterns.length
      );

      return {
        result: optimizedResult,
        insights: donnaAnalysis.insights,
        recommendations,
        confidence,
        models_used: modelsUsed,
        total_cost: totalCost,
        processing_time: Date.now() - startTime,
        cache_hits: cacheHits,
      };
    } catch (error) {
      console.error('Orchestrator error:', error);
      
      // Fallback to basic processing
      return this.fallbackProcessing(request, Date.now() - startTime);
    }
  }

  /**
   * Select expert models based on request type and context
   */
  private async selectExperts(request: OrchestratorRequest): Promise<ExpertModel[]> {
    const selected: ExpertModel[] = [];
    
    // Use learned routing if available
    const learnedRoute = this.routingTable.get(request.type);
    if (learnedRoute) {
      for (const expertName of learnedRoute) {
        const expert = this.experts.get(expertName);
        if (expert) selected.push(expert);
      }
    }

    // Add domain-specific experts
    for (const [name, expert] of this.experts) {
      if (expert.domain.includes(request.type) || 
          expert.domain.includes(request.context?.domain || '')) {
        if (!selected.find(e => e.name === expert.name)) {
          selected.push(expert);
        }
      }
    }

    // Always include general expert as fallback
    const generalExpert = this.experts.get('general_expert');
    if (generalExpert && !selected.find(e => e.name === generalExpert.name)) {
      selected.push(generalExpert);
    }

    // Use multi-armed bandit for exploration vs exploitation
    if (Math.random() < 0.1) { // 10% exploration
      const randomExpert = Array.from(this.experts.values())[
        Math.floor(Math.random() * this.experts.size)
      ];
      if (!selected.find(e => e.name === randomExpert.name)) {
        selected.push(randomExpert);
      }
    }

    return selected;
  }

  /**
   * Process request through expert models
   */
  private async processWithExperts(
    request: OrchestratorRequest,
    experts: ExpertModel[],
    queryEmbedding: number[]
  ): Promise<{
    results: any[];
    models: string[];
    cost: number;
    confidence: number;
    cached: boolean;
  }> {
    const results: any[] = [];
    const models: string[] = [];
    let totalCost = 0;
    let totalConfidence = 0;
    let cached = false;

    // Process through each expert in parallel
    const expertPromises = experts.map(async (expert) => {
      try {
        const result = await this.transformerService.process({
          text: request.query,
          task: this.mapTypeToTask(request.type),
          model: expert.name,
          context: {
            ...request.context,
            expert: expert.name,
            capabilities: expert.capabilities,
          },
        });

        return {
          expert: expert.name,
          result: result.result,
          cost: result.cost,
          confidence: expert.confidence_threshold,
          cached: result.cached,
        };
      } catch (error) {
        console.warn(`Expert ${expert.name} failed:`, error);
        return null;
      }
    });

    const expertResults = await Promise.all(expertPromises);

    for (const expertResult of expertResults) {
      if (expertResult) {
        results.push(expertResult);
        models.push(expertResult.expert);
        totalCost += expertResult.cost;
        totalConfidence += expertResult.confidence;
        if (expertResult.cached) cached = true;
      }
    }

    return {
      results,
      models,
      cost: totalCost,
      confidence: totalConfidence / results.length,
      cached,
    };
  }

  /**
   * Apply advanced learning algorithms for optimization
   */
  private async optimizeWithLearning(
    expertResults: any[],
    donnaAnalysis: any,
    context: Record<string, any>
  ): Promise<any> {
    // Use ensemble learning to combine expert predictions
    const ensembleResult = await this.learningEngine.ensemblePrediction(
      context,
      expertResults.map(r => r.expert)
    );

    // Apply contextual bandit for personalization
    const personalizedResult = await this.learningEngine.contextualBandit(
      context,
      { role: context.userRole, experience: context.userExperience }
    );

    // Combine results using weighted voting
    const weights = this.calculateWeights(expertResults, donnaAnalysis);
    const combinedResult = this.weightedCombination(
      expertResults,
      weights,
      ensembleResult,
      personalizedResult
    );

    return combinedResult;
  }

  /**
   * Generate intelligent recommendations
   */
  private async generateRecommendations(
    request: OrchestratorRequest,
    expertResults: any[],
    donnaAnalysis: any,
    optimizedResult: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Add Donna's recommendations
    recommendations.push(...donnaAnalysis.recommendations);

    // Add expert-specific recommendations
    for (const expert of expertResults) {
      if (expert.result.recommendations) {
        recommendations.push(...expert.result.recommendations);
      }
    }

    // Generate context-aware recommendations
    if (request.type === 'contract_analysis') {
      recommendations.push(
        'Consider reviewing similar contracts in your industry for benchmarking',
        'Ensure all critical clauses are present and properly defined'
      );
    } else if (request.type === 'risk_assessment') {
      recommendations.push(
        'Regularly update risk thresholds based on market conditions',
        'Implement continuous monitoring for identified risk factors'
      );
    }

    // Remove duplicates and limit to top 5
    return [...new Set(recommendations)].slice(0, 5);
  }

  /**
   * Learn from interaction for continuous improvement
   */
  private async learnFromInteraction(
    request: OrchestratorRequest,
    expertResults: any,
    donnaAnalysis: any
  ): Promise<void> {
    // Update routing table based on performance
    const bestExpert = expertResults.results.reduce((best: any, current: any) =>
      current.confidence > best.confidence ? current : best
    );

    if (bestExpert) {
      const currentRoute = this.routingTable.get(request.type) || [];
      if (!currentRoute.includes(bestExpert.expert)) {
        currentRoute.unshift(bestExpert.expert);
        this.routingTable.set(request.type, currentRoute.slice(0, 3));
      }
    }

    // Update performance metrics
    for (const expert of expertResults.results) {
      const metrics = this.performanceMetrics.get(expert.expert) || {
        totalCalls: 0,
        totalConfidence: 0,
        averageLatency: 0,
      };

      metrics.totalCalls++;
      metrics.totalConfidence += expert.confidence;
      metrics.averageConfidence = metrics.totalConfidence / metrics.totalCalls;

      this.performanceMetrics.set(expert.expert, metrics);
    }

    // Let Donna learn from the anonymized data
    await this.donnaAI.learn(
      request.type,
      {
        content: request.query,
        context: { type: request.type, domain: request.context?.domain },
        type: request.type,
      },
      {
        success: donnaAnalysis.confidence > 0.7,
        metrics: { confidence: donnaAnalysis.confidence },
      }
    );
  }

  /**
   * Fallback processing when main pipeline fails
   */
  private async fallbackProcessing(
    request: OrchestratorRequest,
    elapsedTime: number
  ): Promise<OrchestratorResponse> {
    // Use the most reliable expert
    const generalExpert = this.experts.get('general_expert')!;
    
    try {
      const result = await this.transformerService.process({
        text: request.query,
        task: 'classification',
        model: generalExpert.name,
      });

      return {
        result: result.result,
        insights: [],
        recommendations: ['Please refine your query for better results'],
        confidence: 0.5,
        models_used: [generalExpert.name],
        total_cost: result.cost,
        processing_time: elapsedTime,
        cache_hits: result.cached ? 1 : 0,
      };
    } catch (error) {
      return {
        result: { error: 'Processing failed', message: error.message },
        insights: [],
        recommendations: ['Please try again later'],
        confidence: 0,
        models_used: [],
        total_cost: 0,
        processing_time: elapsedTime,
        cache_hits: 0,
      };
    }
  }

  // Helper methods

  private initializeRoutingTable(): void {
    // Initialize with default routing based on domain expertise
    this.routingTable.set('contract_analysis', ['legal_expert', 'general_expert']);
    this.routingTable.set('risk_assessment', ['financial_expert', 'general_expert']);
    this.routingTable.set('compliance_check', ['legal_expert']);
    this.routingTable.set('vendor_evaluation', ['general_expert']);
    this.routingTable.set('financial_analysis', ['financial_expert']);
    this.routingTable.set('general', ['general_expert']);
  }

  private mapTypeToTask(type: string): 'classification' | 'embedding' | 'completion' | 'summarization' {
    switch (type) {
      case 'contract_analysis':
      case 'compliance_check':
        return 'classification';
      case 'risk_assessment':
      case 'vendor_evaluation':
        return 'classification';
      case 'financial_analysis':
        return 'summarization';
      default:
        return 'embedding';
    }
  }

  private calculateWeights(
    expertResults: any[],
    donnaAnalysis: any
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const totalConfidence = expertResults.reduce((sum, r) => sum + r.confidence, 0) + 
                          donnaAnalysis.confidence;

    for (const result of expertResults) {
      weights.set(result.expert, result.confidence / totalConfidence);
    }

    weights.set('donna', donnaAnalysis.confidence / totalConfidence);

    return weights;
  }

  private weightedCombination(
    expertResults: any[],
    weights: Map<string, number>,
    ensembleResult: any,
    personalizedResult: any
  ): any {
    // Combine results based on weights
    const combined: any = {
      consensus: [],
      confidence_scores: {},
      primary_result: null,
    };

    // Find the highest weighted result
    let maxWeight = 0;
    for (const result of expertResults) {
      const weight = weights.get(result.expert) || 0;
      if (weight > maxWeight) {
        maxWeight = weight;
        combined.primary_result = result.result;
      }
      combined.confidence_scores[result.expert] = weight;
    }

    // Add ensemble and personalized results
    combined.ensemble_prediction = ensembleResult.prediction;
    combined.personalized_recommendation = personalizedResult.recommendation;

    return combined;
  }

  private calculateConfidence(
    expertConfidence: number,
    donnaConfidence: number,
    patternMatches: number
  ): number {
    // Weighted confidence calculation
    const baseConfidence = expertConfidence * 0.4 + donnaConfidence * 0.4;
    const patternBoost = Math.min(patternMatches * 0.04, 0.2); // Max 20% boost
    
    return Math.min(baseConfidence + patternBoost, 1.0);
  }
}

/**
 * Factory function to create transformer orchestrator
 */
export function createTransformerOrchestrator(supabase: SupabaseClient): TransformerOrchestrator {
  return new TransformerOrchestrator(supabase);
}