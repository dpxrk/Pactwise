import { MetacognitiveBaseAgent, MetacognitiveProcessingResult } from './metacognitive-base';
import { AgentContext } from './base';
import {
  CausalReasoningEngine,
  CausalGraph,
  CausalQuery,
  CausalEffect,
  CounterfactualResult,
  CausalInsight,
  StructuralCausalModel,
} from '../causal/causal-engine';
import {
  InterventionResult,
  CausalQuestion,
} from '../causal/types';
import { SupabaseClient } from '@supabase/supabase-js';

export interface CausalAnalysisData {
  effects: CausalEffect[];
  insights: CausalInsight[];
  graph: CausalGraph | null;
}

export interface CausalProcessingResult extends MetacognitiveProcessingResult {
  causal?: {
    insights: CausalInsight[];
    effects: CausalEffect[];
    counterfactuals: CounterfactualResult[];
    interventions: InterventionResult[];
    causalGraph?: CausalGraph;
    explanations: string[];
  };
}

export abstract class CausalBaseAgent extends MetacognitiveBaseAgent {
  protected causalEngine: CausalReasoningEngine;
  protected domainSCM?: StructuralCausalModel;
  protected causalHistory: CausalEffect[] = [];
  protected discoveredGraphs: Map<string, CausalGraph> = new Map();

  constructor(supabase: SupabaseClient, enterpriseId: string, _userId?: string) {
    super(supabase, enterpriseId, 'causal_agent');
    this.causalEngine = new CausalReasoningEngine();
    this.initializeCausalModel();
  }

  // Initialize domain-specific causal model
  protected abstract initializeCausalModel(): void;

  // Enhanced process method with causal reasoning
  async process(data: unknown, context?: AgentContext): Promise<CausalProcessingResult> {
    // First, use metacognitive processing
    const metacognitiveResult = await super.process(data, context);

    // If causal reasoning is not needed, return early
    if (!this.requiresCausalReasoning(data, context)) {
      return metacognitiveResult;
    }

    try {
      // Perform causal analysis
      const causalAnalysis = await this.performCausalAnalysis(data, context, metacognitiveResult);

      // Generate causal insights
      const causalInsights = await this.generateCausalInsights(data, causalAnalysis);

      // Check for intervention opportunities
      const interventions = await this.identifyInterventions(data, context, causalAnalysis);

      // Generate counterfactuals if relevant
      const counterfactuals = await this.generateCounterfactuals(data, context, causalAnalysis);

      // Combine results
      const enhancedResult: CausalProcessingResult = {
        ...metacognitiveResult,
        causal: {
          insights: causalInsights,
          effects: causalAnalysis.effects || [],
          counterfactuals,
          interventions,
          ...(causalAnalysis.graph && { causalGraph: causalAnalysis.graph }),
          explanations: this.generateCausalExplanations(causalInsights, causalAnalysis),
        },
      };

      // Update causal history
      this.updateCausalHistory(causalAnalysis.effects || []);

      return enhancedResult;

    } catch (error) {
      console.error('Causal reasoning error:', error);
      return metacognitiveResult;
    }
  }

  // Determine if causal reasoning is needed
  protected requiresCausalReasoning(data: unknown, context?: AgentContext): boolean {
    // Check for causal keywords or questions
    const causalKeywords = ['cause', 'effect', 'why', 'because', 'if', 'then', 'impact', 'influence', 'result'];
    const dataStr = JSON.stringify(data).toLowerCase();

    if (causalKeywords.some(keyword => dataStr.includes(keyword))) {
      return true;
    }

    // Check if context requests causal analysis
    if (context?.requestCausalAnalysis) {
      return true;
    }

    // Check if dealing with interventions or counterfactuals
    const dataObj = data as Record<string, unknown>;
    if (dataObj.intervention || dataObj.counterfactual || dataObj.whatIf) {
      return true;
    }

    return false;
  }

  // Perform causal analysis
  protected async performCausalAnalysis(
    data: unknown,
    context: AgentContext | undefined,
    _previousResult: MetacognitiveProcessingResult,
  ): Promise<CausalAnalysisData> {
    const analysis: CausalAnalysisData = {
      effects: [],
      insights: [],
      graph: null,
    };

    // Extract causal questions from data
    const causalQuestions = this.extractCausalQuestions(data, context);

    for (const question of causalQuestions) {
      const query = this.translateToCausalQuery(question);

      // Use domain SCM if available, otherwise discover structure
      if (!this.domainSCM) {
        const observationalData = await this.gatherObservationalData(question, context);
        if (observationalData.size > 0) {
          analysis.graph = await this.causalEngine.discoverCausalStructure(observationalData);
          this.discoveredGraphs.set(this.generateGraphKey(question), analysis.graph);
        }
      }

      // Perform causal inference
      const effect = await this.causalEngine.performCausalInference(query);
      analysis.effects.push(effect);

      // Generate insights specific to this query
      if (analysis.graph || this.domainSCM?.graph) {
        const queryInsights = await this.causalEngine.generateCausalInsights(
          analysis.graph || this.domainSCM!.graph,
          Array.isArray(query.target) ? query.target[0] : query.target,
        );
        analysis.insights.push(...queryInsights);
      }
    }

    return analysis;
  }

  // Extract causal questions from input
  protected extractCausalQuestions(data: unknown, _context?: AgentContext): CausalQuestion[] {
    const questions: CausalQuestion[] = [];
    const dataObj = data as Record<string, unknown>;

    // Check for explicit causal questions
    if (dataObj.causalQuestion) {
      questions.push(this.parseCausalQuestion(dataObj.causalQuestion as string));
    }

    // Check for implicit causal relationships
    if (dataObj.variables && dataObj.relationships) {
      const relationships = dataObj.relationships as Array<{
        type: string;
        from: string;
        to: string;
      }>;
      for (const rel of relationships) {
        if (rel.type === 'causal' || rel.type === 'influences') {
          questions.push({
            natural: `What is the effect of ${rel.from} on ${rel.to}?`,
            formal: {
              type: 'interventional',
              target: rel.to,
              intervention: new Map([[rel.from, 'unit_change']]),
            },
            answerType: 'effect',
          });
        }
      }
    }

    // Check for what-if scenarios
    if (dataObj.whatIf) {
      questions.push(this.parseWhatIfScenario(dataObj.whatIf as string));
    }

    return questions;
  }

  // Parse natural language causal question
  protected parseCausalQuestion(question: string): CausalQuestion {
    const lower = question.toLowerCase();

    // Intervention questions
    if (lower.includes('what if') || lower.includes('if we')) {
      const intervention = this.extractIntervention(question);
      const target = this.extractTarget(question);

      return {
        natural: question,
        formal: {
          type: 'interventional',
          target,
          intervention,
        },
        answerType: 'effect',
      };
    }

    // Counterfactual questions
    if (lower.includes('would have') || lower.includes('had been')) {
      return {
        natural: question,
        formal: {
          type: 'counterfactual',
          target: this.extractTarget(question),
          intervention: this.extractIntervention(question),
          evidence: new Map(), // Would be populated from context
        },
        answerType: 'value',
      };
    }

    // Default observational question
    const given = this.extractConditioning(question);
    return {
      natural: question,
      formal: {
        type: 'observational' as const,
        target: this.extractTarget(question),
        ...(given !== undefined && { given }),
      },
      answerType: 'probability' as const,
    };
  }

  // Translate to formal causal query
  protected translateToCausalQuery(question: CausalQuestion): CausalQuery {
    return question.formal;
  }

  // Generate causal insights
  protected async generateCausalInsights(
    data: any,
    analysis: any,
  ): Promise<CausalInsight[]> {
    const insights: CausalInsight[] = [];

    // Add insights from analysis
    if (analysis.insights) {
      insights.push(...analysis.insights);
    }

    // Generate additional domain-specific insights
    const domainInsights = await this.generateDomainCausalInsights(data, analysis);
    insights.push(...domainInsights);

    // Filter and rank insights by relevance
    return this.rankCausalInsights(insights, data);
  }

  // Identify possible interventions
  protected async identifyInterventions(
    data: any,
    context: AgentContext | undefined,
    analysis: any,
  ): Promise<InterventionResult[]> {
    const interventions: InterventionResult[] = [];

    // Check if user is seeking intervention recommendations
    if (!data.seekingInterventions && !context?.recommendInterventions) {
      return interventions;
    }

    // Identify controllable variables
    const controllableVars = this.identifyControllableVariables(analysis.graph || this.domainSCM?.graph);

    // For each target outcome, find optimal interventions
    const targetOutcomes = this.extractTargetOutcomes(data);

    for (const outcome of targetOutcomes) {
      const optimalIntervention = await this.findOptimalIntervention(
        outcome,
        controllableVars,
        analysis,
      );

      if (optimalIntervention) {
        interventions.push(optimalIntervention);
      }
    }

    return interventions;
  }

  // Generate counterfactual explanations
  protected async generateCounterfactuals(
    data: any,
    context: AgentContext | undefined,
    _analysis: any,
  ): Promise<CounterfactualResult[]> {
    const counterfactuals: CounterfactualResult[] = [];

    // Check if counterfactuals are relevant
    if (!data.explainDecision && !data.whatIf && !context?.generateCounterfactuals) {
      return counterfactuals;
    }

    // Get current state
    const currentState = this.extractCurrentState(data, context);

    // Define desired outcomes
    const desiredOutcomes = this.extractDesiredOutcomes(data);

    for (const desired of desiredOutcomes) {
      const counterfactual = await this.causalEngine.generateCounterfactual(
        currentState,
        desired.outcomes,
        desired.constraints,
      );

      counterfactuals.push(counterfactual);
    }

    return counterfactuals;
  }

  // Generate human-readable causal explanations
  protected generateCausalExplanations(
    insights: CausalInsight[],
    analysis: any,
  ): string[] {
    const explanations: string[] = [];

    // Explain main causal relationships
    for (const insight of insights.slice(0, 3)) { // Top 3 insights
      let explanation = '';

      switch (insight.type) {
        case 'direct_cause':
          explanation = `${insight.source} directly causes ${insight.target} with strength ${insight.strength.toFixed(2)}. ${insight.implications[0]}`;
          break;

        case 'indirect_cause':
          explanation = `${insight.source} indirectly affects ${insight.target}. ${insight.description}`;
          break;

        case 'confounder':
          explanation = `${insight.source} is a confounding variable that affects both the treatment and outcome. ${insight.implications[0]}`;
          break;

        case 'mediator':
          explanation = `The effect is mediated through ${insight.source}. ${insight.description}`;
          break;
      }

      if (explanation) {
        explanations.push(explanation);
      }
    }

    // Explain identifiability
    for (const effect of analysis.effects || []) {
      if (!effect.identifiable) {
        explanations.push(effect.explanation || 'This causal effect cannot be uniquely determined from available data.');
      }
    }

    return explanations;
  }

  // Update causal history for learning
  protected updateCausalHistory(effects: CausalEffect[]): void {
    this.causalHistory.push(...effects);

    // Keep only recent history (last 100 effects)
    if (this.causalHistory.length > 100) {
      this.causalHistory = this.causalHistory.slice(-100);
    }
  }

  // Helper methods
  protected generateGraphKey(question: CausalQuestion): string {
    const target = Array.isArray(question.formal.target)
      ? question.formal.target.join(',')
      : question.formal.target;
    return `${this.agentType}_${target}`;
  }

  protected async gatherObservationalData(
    _question: CausalQuestion,
    _context?: AgentContext,
  ): Promise<Map<string, any[]>> {
    // Override in subclasses to gather domain-specific data
    return new Map();
  }

  protected extractIntervention(text: string): Map<string, any> {
    // Simple extraction - override for domain-specific parsing
    const intervention = new Map<string, any>();

    // Look for patterns like "if X = value" or "set X to value"
    const patterns = [
      /if (\w+)\s*=\s*(\w+)/gi,
      /set (\w+) to (\w+)/gi,
      /(\w+) becomes (\w+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        intervention.set(match[1], match[2]);
      }
    }

    return intervention;
  }

  protected extractTarget(text: string): string | string[] {
    // Simple extraction - override for domain-specific parsing
    const patterns = [
      /effect on (\w+)/i,
      /impact on (\w+)/i,
      /(\w+) would be/i,
      /how would (\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'outcome'; // Default
  }

  protected extractConditioning(text: string): Map<string, any> | undefined {
    // Simple extraction - override for domain-specific parsing
    const conditioning = new Map<string, any>();

    const patterns = [
      /given (\w+)\s*=\s*(\w+)/gi,
      /when (\w+) is (\w+)/gi,
      /if (\w+) equals (\w+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        conditioning.set(match[1], match[2]);
      }
    }

    return conditioning.size > 0 ? conditioning : undefined;
  }

  protected parseWhatIfScenario(whatIf: any): CausalQuestion {
    return {
      natural: whatIf.question || 'What if scenario',
      formal: {
        type: 'counterfactual',
        target: whatIf.target || 'outcome',
        intervention: new Map(Object.entries(whatIf.changes || {})),
        evidence: new Map(Object.entries(whatIf.current || {})),
      },
      answerType: 'value',
    };
  }

  protected identifyControllableVariables(graph?: CausalGraph): string[] {
    if (!graph) {return [];}

    // Variables with no parents are typically controllable
    const controllable: string[] = [];

    for (const [nodeId, node] of graph.nodes) {
      if (node.parents.length === 0 || node.type === 'intervention') {
        controllable.push(nodeId);
      }
    }

    return controllable;
  }

  protected extractTargetOutcomes(data: any): any[] {
    const outcomes = [];

    if (data.goals) {
      for (const goal of data.goals) {
        outcomes.push({
          variable: goal.variable,
          desiredValue: goal.value,
          priority: goal.priority || 1,
        });
      }
    }

    if (data.optimize) {
      outcomes.push({
        variable: data.optimize.variable,
        direction: data.optimize.direction || 'maximize',
        constraints: data.optimize.constraints,
      });
    }

    return outcomes;
  }

  protected async findOptimalIntervention(
    outcome: any,
    controllableVars: string[],
    _analysis: any,
  ): Promise<InterventionResult | null> {
    // Use causal effect estimation to find best intervention
    let bestIntervention: Map<string, any> | null = null;
    let bestEffect = -Infinity;

    // Try different intervention values
    for (const variable of controllableVars) {
      const interventionValues = this.generateInterventionValues(variable);

      for (const value of interventionValues) {
        const intervention = new Map([[variable, value]]);

        const query: CausalQuery = {
          type: 'interventional',
          target: outcome.variable,
          intervention,
        };

        const effect = await this.causalEngine.performCausalInference(query);

        const effectValue = typeof effect.effect === 'number'
          ? effect.effect
          : effect.effect.get(outcome.variable) || 0;

        if (effectValue > bestEffect) {
          bestEffect = effectValue;
          bestIntervention = intervention;
        }
      }
    }

    if (!bestIntervention) {return null;}

    return {
      intervention: bestIntervention,
      outcomes: new Map([[outcome.variable, bestEffect]]),
      causalEffects: new Map([[outcome.variable, bestEffect]]),
      sideEffects: new Map(), // Would compute side effects
      confidence: 0.8,
    };
  }

  protected extractCurrentState(data: any, context?: AgentContext): Map<string, any> {
    const state = new Map<string, any>();

    if (data.currentState) {
      for (const [key, value] of Object.entries(data.currentState)) {
        state.set(key, value);
      }
    }

    if (context?.systemState) {
      for (const [key, value] of Object.entries(context.systemState)) {
        state.set(key, value);
      }
    }

    return state;
  }

  protected extractDesiredOutcomes(data: any): any[] {
    const outcomes = [];

    if (data.desiredState) {
      outcomes.push({
        outcomes: new Map(Object.entries(data.desiredState)),
        constraints: data.constraints ? new Map(Object.entries(data.constraints)) : undefined,
      });
    }

    if (data.goals) {
      for (const goal of data.goals) {
        outcomes.push({
          outcomes: new Map([[goal.variable, goal.value]]),
          constraints: goal.constraints ? new Map(Object.entries(goal.constraints)) : undefined,
        });
      }
    }

    return outcomes;
  }

  protected rankCausalInsights(insights: CausalInsight[], data: any): CausalInsight[] {
    // Rank by relevance to the query
    const relevantVariables = new Set([
      ...this.extractRelevantVariables(data),
      ...(data.focusVariables || []),
    ]);

    return insights
      .map(insight => ({
        ...insight,
        relevanceScore: this.calculateRelevanceScore(insight, relevantVariables),
      }))
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .map(({ relevanceScore, ...insight }) => insight);
  }

  protected calculateRelevanceScore(insight: CausalInsight, relevantVars: Set<string>): number {
    let score = insight.confidence * insight.strength;

    if (relevantVars.has(insight.source) || relevantVars.has(insight.target)) {
      score *= 2;
    }

    // Prioritize direct causes
    if (insight.type === 'direct_cause') {
      score *= 1.5;
    }

    return score;
  }

  protected extractRelevantVariables(data: any): string[] {
    const variables: string[] = [];

    if (data.variables) {
      variables.push(...data.variables);
    }

    if (data.causalQuestion) {
      // Extract variables mentioned in the question
      const words = data.causalQuestion.split(/\s+/);
      variables.push(...words.filter((w: string) => w.length > 2 && !this.isStopWord(w)));
    }

    return variables;
  }

  protected isStopWord(word: string): boolean {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'what', 'how', 'why']);
    return stopWords.has(word.toLowerCase());
  }

  protected generateInterventionValues(_variable: string): any[] {
    // Generate reasonable intervention values
    // Override in domain-specific implementations
    return [0, 0.5, 1, 'low', 'medium', 'high'];
  }

  // Abstract methods for domain-specific implementations
  protected abstract generateDomainCausalInsights(data: any, analysis: any): Promise<CausalInsight[]>;
}