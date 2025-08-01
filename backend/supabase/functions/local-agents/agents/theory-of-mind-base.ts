import { CausalBaseAgent, CausalProcessingResult } from './causal-base.ts';
import { AgentContext } from './base.ts';
import {
  TheoryOfMindEngine,
  MentalState,
  ObservedBehavior,
  IntentionHypothesis,
  Message,
  Action,
  PerspectiveTaking,
  CoordinationPlan,
  EmpathyModel,
  TrustModel,
  Belief,
  Desire,
  SharedBelief,
  RecursiveBelief,
} from '../theory-of-mind/theory-of-mind-engine.ts';
import { SupabaseClient } from '@supabase/supabase-js';

export interface TheoryOfMindProcessingResult extends CausalProcessingResult {
  theoryOfMind?: {
    otherAgentStates: Map<string, MentalState>;
    recognizedIntentions: Map<string, IntentionHypothesis[]>;
    perspectiveTaking?: PerspectiveTaking;
    empathyModel?: EmpathyModel;
    coordinationPlan?: CoordinationPlan;
    trustUpdates: Map<string, TrustModel>;
    sharedBeliefs: SharedBelief[];
    insights: ToMInsight[];
  };
}

export interface ToMInsight {
  type: 'belief_attribution' | 'intention_recognition' | 'empathy' | 'trust_change' | 'coordination';
  agentId: string;
  description: string;
  confidence: number;
  implications: string[];
}

export abstract class TheoryOfMindBaseAgent extends CausalBaseAgent {
  protected tomEngine: TheoryOfMindEngine;
  protected observationHistory: Map<string, ObservedBehavior[]> = new Map();
  protected interactionPartners: Set<string> = new Set();

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId);
    this.tomEngine = new TheoryOfMindEngine(this.agentType, 'ai');
  }

  // Enhanced process method with Theory of Mind
  async process(data: any, context?: AgentContext): Promise<TheoryOfMindProcessingResult> {
    // First, use causal processing
    const causalResult = await super.process(data, context);

    // If Theory of Mind is not needed, return early
    if (!this.requiresTheoryOfMind(data, context)) {
      return causalResult;
    }

    try {
      // Identify other agents involved
      const otherAgents = await this.identifyOtherAgents(data, context);

      // Model mental states of other agents
      const mentalStates = await this.modelOtherAgents(otherAgents, data, context);

      // Recognize intentions from observations
      const recognizedIntentions = await this.recognizeIntentions(data, context, otherAgents);

      // Take perspective if needed
      const perspectiveTaking = await this.takePerspectiveIfNeeded(data, context, otherAgents);

      // Generate empathy model if dealing with emotional situations
      const empathyModel = await this.generateEmpathyIfNeeded(data, context, otherAgents);

      // Create coordination plan if multiple agents involved
      const coordinationPlan = await this.createCoordinationPlanIfNeeded(
        data,
        context,
        otherAgents,
        mentalStates,
      );

      // Update trust based on interactions
      const trustUpdates = await this.updateTrustModels(data, context, otherAgents);

      // Identify shared beliefs
      const sharedBeliefs = Array.from(this.tomEngine.getSharedBeliefs().values());

      // Generate Theory of Mind insights
      const tomInsights = await this.generateToMInsights(
        mentalStates,
        recognizedIntentions,
        perspectiveTaking,
        empathyModel,
        coordinationPlan,
      );

      // Combine results
      const enhancedResult: TheoryOfMindProcessingResult = {
        ...causalResult,
        theoryOfMind: {
          otherAgentStates: mentalStates,
          recognizedIntentions,
          perspectiveTaking,
          empathyModel,
          coordinationPlan,
          trustUpdates,
          sharedBeliefs,
          insights: tomInsights,
        },
      };

      // Update interaction history
      this.updateInteractionHistory(otherAgents, data, enhancedResult);

      return enhancedResult;

    } catch (error) {
      console.error('Theory of Mind error:', error);
      return causalResult;
    }
  }

  // Determine if Theory of Mind reasoning is needed
  protected requiresTheoryOfMind(data: any, context?: AgentContext): boolean {
    // Check for multi-agent scenarios
    if (data.agents || data.participants || context?.otherAgents) {
      return true;
    }

    // Check for social/interaction keywords
    const socialKeywords = ['believe', 'think', 'want', 'intend', 'trust', 'coordinate',
                          'cooperate', 'understand', 'empathy', 'perspective'];
    const dataStr = JSON.stringify(data).toLowerCase();

    if (socialKeywords.some(keyword => dataStr.includes(keyword))) {
      return true;
    }

    // Check for communication
    if (data.messages || data.communication || data.dialogue) {
      return true;
    }

    return false;
  }

  // Identify other agents in the scenario
  protected async identifyOtherAgents(
    data: any,
    context?: AgentContext,
  ): Promise<string[]> {
    const agents = new Set<string>();

    // From explicit agent lists
    if (data.agents) {
      data.agents.forEach((agent: any) => agents.add(agent.id || agent));
    }

    if (context?.otherAgents) {
      context.otherAgents.forEach(agent => agents.add(agent));
    }

    // From messages
    if (data.messages) {
      data.messages.forEach((msg: any) => {
        if (msg.sender) {agents.add(msg.sender);}
        if (msg.recipient) {agents.add(msg.recipient);}
      });
    }

    // From observations
    if (data.observations) {
      data.observations.forEach((obs: any) => {
        if (obs.agentId) {agents.add(obs.agentId);}
      });
    }

    // Remove self
    agents.delete(this.agentType);

    return Array.from(agents);
  }

  // Model mental states of other agents
  protected async modelOtherAgents(
    agentIds: string[],
    data: any,
    context?: AgentContext,
  ): Promise<Map<string, MentalState>> {
    const mentalStates = new Map<string, MentalState>();

    for (const agentId of agentIds) {
      // Get observations for this agent
      const observations = this.extractObservationsForAgent(agentId, data);

      // Model the agent
      const mentalState = await this.tomEngine.modelAgent(
        agentId,
        this.inferAgentType(agentId, data),
        observations,
      );

      // Add domain-specific beliefs
      await this.addDomainSpecificBeliefs(mentalState, data, context);

      mentalStates.set(agentId, mentalState);
    }

    return mentalStates;
  }

  // Recognize intentions from observations
  protected async recognizeIntentions(
    data: any,
    _context: AgentContext | undefined,
    agentIds: string[],
  ): Promise<Map<string, IntentionHypothesis[]>> {
    const allIntentions = new Map<string, IntentionHypothesis[]>();

    for (const agentId of agentIds) {
      const observations = this.extractObservationsForAgent(agentId, data);

      if (observations.length > 0) {
        const intentions: IntentionHypothesis[] = [];

        for (const obs of observations) {
          const hypotheses = await this.tomEngine.recognizeIntentions(obs);
          intentions.push(...hypotheses);
        }

        // Deduplicate and sort by probability
        const uniqueIntentions = this.deduplicateIntentions(intentions);
        allIntentions.set(agentId, uniqueIntentions);
      }
    }

    return allIntentions;
  }

  // Take perspective if needed
  protected async takePerspectiveIfNeeded(
    data: any,
    context: AgentContext | undefined,
    agentIds: string[],
  ): Promise<PerspectiveTaking | undefined> {
    // Check if perspective taking is requested
    if (!data.takePerspective && !data.understandViewpoint) {
      return undefined;
    }

    const targetAgent = data.perspectiveTarget || agentIds[0];
    if (!targetAgent) {return undefined;}

    const situation = this.extractSituation(data, context);
    return this.tomEngine.takePerspective(targetAgent, situation);
  }

  // Generate empathy model if needed
  protected async generateEmpathyIfNeeded(
    data: any,
    context: AgentContext | undefined,
    agentIds: string[],
  ): Promise<EmpathyModel | undefined> {
    // Check if empathy is relevant
    if (!data.emotionalContext && !data.empathize && !this.hasEmotionalContent(data)) {
      return undefined;
    }

    const targetAgent = data.empathyTarget || agentIds[0];
    if (!targetAgent) {return undefined;}

    const situation = this.extractSituation(data, context);
    return this.tomEngine.generateEmpathyModel(targetAgent, situation);
  }

  // Create coordination plan if needed
  protected async createCoordinationPlanIfNeeded(
    data: any,
    _context: AgentContext | undefined,
    agentIds: string[],
    _mentalStates: Map<string, MentalState>,
  ): Promise<CoordinationPlan | undefined> {
    // Check if coordination is needed
    if (!data.coordinate && !data.collaborate && agentIds.length < 2) {
      return undefined;
    }

    if (!data.sharedGoal && !data.objective) {
      return undefined;
    }

    const goal = data.sharedGoal || data.objective;
    const participants = [this.agentType, ...agentIds];

    return this.tomEngine.createCoordinationPlan(
      goal,
      participants,
      data.constraints,
    );
  }

  // Update trust models
  protected async updateTrustModels(
    data: any,
    _context: AgentContext | undefined,
    _agentIds: string[],
  ): Promise<Map<string, TrustModel>> {
    const trustUpdates = new Map<string, TrustModel>();

    // Check for interaction outcomes
    if (data.interactions) {
      for (const interaction of data.interactions) {
        if (interaction.outcome && interaction.partner) {
          const trust = await this.tomEngine.updateTrust(
            this.agentType,
            interaction.partner,
            interaction,
            interaction.outcome,
          );
          trustUpdates.set(interaction.partner, trust);
        }
      }
    }

    return trustUpdates;
  }

  // Generate Theory of Mind insights
  protected async generateToMInsights(
    mentalStates: Map<string, MentalState>,
    intentions: Map<string, IntentionHypothesis[]>,
    _perspective?: PerspectiveTaking,
    empathy?: EmpathyModel,
    coordination?: CoordinationPlan,
  ): Promise<ToMInsight[]> {
    const insights: ToMInsight[] = [];

    // Belief attribution insights
    for (const [agentId, state] of mentalStates) {
      const strongBeliefs = Array.from(state.beliefs.values())
        .filter((b: any) => b.confidence > 0.7);

      if (strongBeliefs.length > 0) {
        insights.push({
          type: 'belief_attribution',
          agentId,
          description: `${agentId} strongly believes: ${strongBeliefs[0].content}`,
          confidence: strongBeliefs[0].confidence,
          implications: this.generateBeliefImplications(strongBeliefs[0], state),
        });
      }
    }

    // Intention recognition insights
    for (const [agentId, hypotheses] of intentions) {
      if (hypotheses.length > 0 && hypotheses[0].probability > 0.6) {
        insights.push({
          type: 'intention_recognition',
          agentId,
          description: `${agentId} intends to: ${hypotheses[0].intention.action}`,
          confidence: hypotheses[0].probability,
          implications: this.generateIntentionImplications(hypotheses[0]),
        });
      }
    }

    // Empathy insights
    if (empathy) {
      insights.push({
        type: 'empathy',
        agentId: empathy.targetAgent,
        description: `${empathy.targetAgent} is likely feeling ${this.describeEmotion(empathy.emotionalSimulation)}`,
        confidence: empathy.affectiveForecast.confidence,
        implications: [
          `Empathic concern level: ${(empathy.empathicConcern * 100).toFixed(0)}%`,
          'Consider emotional support strategies',
        ],
      });
    }

    // Coordination insights
    if (coordination) {
      insights.push({
        type: 'coordination',
        agentId: 'all',
        description: `Coordination plan created for: ${coordination.goal}`,
        confidence: 0.8,
        implications: [
          `${coordination.participants.size} agents involved`,
          `${coordination.sharedPlan.steps.length} steps identified`,
          'Success depends on maintaining shared understanding',
        ],
      });
    }

    return insights;
  }

  // Update interaction history
  protected updateInteractionHistory(
    agentIds: string[],
    data: any,
    _result: TheoryOfMindProcessingResult,
  ): void {
    for (const agentId of agentIds) {
      this.interactionPartners.add(agentId);

      // Store observations
      if (!this.observationHistory.has(agentId)) {
        this.observationHistory.set(agentId, []);
      }

      const observations = this.extractObservationsForAgent(agentId, data);
      this.observationHistory.get(agentId)!.push(...observations);

      // Keep only recent history (last 50 observations)
      const history = this.observationHistory.get(agentId)!;
      if (history.length > 50) {
        this.observationHistory.set(agentId, history.slice(-50));
      }
    }
  }

  // Helper methods

  protected extractObservationsForAgent(agentId: string, data: any): ObservedBehavior[] {
    const observations: ObservedBehavior[] = [];

    // From explicit observations
    if (data.observations) {
      const agentObs = data.observations.filter((o: any) => o.agentId === agentId);
      observations.push(...agentObs.map((o: any) => ({
        agentId,
        actions: o.actions || [],
        context: o.context || {},
        timestamp: o.timestamp || new Date().toISOString(),
      })));
    }

    // From actions
    if (data.actions) {
      const agentActions = data.actions.filter((a: any) => a.agentId === agentId);
      if (agentActions.length > 0) {
        observations.push({
          agentId,
          actions: agentActions,
          context: data.context || {},
          timestamp: new Date().toISOString(),
        });
      }
    }

    return observations;
  }

  protected inferAgentType(agentId: string, data: any): 'human' | 'ai' | 'system' {
    // Check explicit type information
    if (data.agentTypes?.[agentId]) {
      return data.agentTypes[agentId];
    }

    // Infer from ID patterns
    if (agentId.includes('user') || agentId.includes('human')) {return 'human';}
    if (agentId.includes('system') || agentId.includes('bot')) {return 'system';}

    return 'ai'; // Default
  }

  protected async addDomainSpecificBeliefs(
    _mentalState: MentalState,
    _data: any,
    _context?: AgentContext,
  ): Promise<void> {
    // Override in domain-specific implementations
  }

  protected deduplicateIntentions(
    intentions: IntentionHypothesis[],
  ): IntentionHypothesis[] {
    const unique = new Map<string, IntentionHypothesis>();

    for (const hypothesis of intentions) {
      const key = hypothesis.intention.action;
      const existing = unique.get(key);

      if (!existing || hypothesis.probability > existing.probability) {
        unique.set(key, hypothesis);
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => b.probability - a.probability);
  }

  protected extractSituation(data: any, context?: AgentContext): any {
    return {
      ...data,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  protected hasEmotionalContent(data: any): boolean {
    const emotionalKeywords = ['feel', 'emotion', 'happy', 'sad', 'angry', 'fear',
                              'joy', 'frustrat', 'excit', 'disappoint'];
    const dataStr = JSON.stringify(data).toLowerCase();

    return emotionalKeywords.some(keyword => dataStr.includes(keyword));
  }

  protected generateBeliefImplications(belief: Belief, state: MentalState): string[] {
    const implications: string[] = [];

    // Check if belief affects goals
    const relatedGoals = Array.from(state.desires.values())
      .filter(d => this.beliefAffectsDesire(belief, d));

    if (relatedGoals.length > 0) {
      implications.push(`This belief affects their goal: ${relatedGoals[0].goal}`);
    }

    // Check if belief contradicts other beliefs
    if (belief.contradictions && belief.contradictions.length > 0) {
      implications.push('This belief conflicts with other held beliefs');
    }

    // Suggest action based on belief
    implications.push('They may act based on this belief');

    return implications;
  }

  protected beliefAffectsDesire(belief: Belief, desire: Desire): boolean {
    // Simple keyword matching - override for domain-specific logic
    return belief.content.toLowerCase().includes(desire.goal.toLowerCase()) ||
           desire.goal.toLowerCase().includes(belief.content.toLowerCase());
  }

  protected generateIntentionImplications(hypothesis: IntentionHypothesis): string[] {
    const implications: string[] = [];
    const { intention } = hypothesis;

    // Expected outcome
    implications.push(
      `Expected outcome: ${intention.expectedOutcome.description} ` +
      `(${(intention.expectedOutcome.probability * 100).toFixed(0)}% likely)`,
    );

    // Commitment level
    if (intention.commitment > 0.8) {
      implications.push('High commitment - likely to follow through');
    } else if (intention.commitment < 0.4) {
      implications.push('Low commitment - may change plans');
    }

    // Alternative explanations
    if (hypothesis.alternativeExplanations.length > 0) {
      implications.push(
        `Alternative explanation: ${hypothesis.alternativeExplanations[0].intention.purpose}`,
      );
    }

    return implications;
  }

  protected describeEmotion(emotion: any): string {
    if (emotion.primaryEmotion) {
      return `${emotion.primaryEmotion} (intensity: ${(emotion.intensity * 100).toFixed(0)}%)`;
    }

    if (emotion.valence > 0.3) {return 'positive';}
    if (emotion.valence < -0.3) {return 'negative';}
    return 'neutral';
  }

  // Recursive belief modeling
  async modelRecursiveBelief(
    level: number,
    aboutAgent: string,
    belief: Belief,
  ): Promise<RecursiveBelief> {
    return this.tomEngine.modelRecursiveBelief(
      level,
      this.agentType,
      aboutAgent,
      belief,
    );
  }

  // Predict other agent's next actions
  async predictAgentActions(
    agentId: string,
    situation: any,
    timeHorizon: number = 1,
  ): Promise<Action[]> {
    return this.tomEngine.predictActions(agentId, situation, timeHorizon);
  }

  // Interpret messages with mental state context
  async interpretMessage(message: Message, context: any): Promise<Message> {
    return this.tomEngine.interpretMessage(message, context);
  }

  // Get current trust level with another agent
  getTrustLevel(agentId: string): number {
    const relationship = this.tomEngine.getRelationship(this.agentType, agentId);
    return relationship?.trust || 0.5;
  }

  // Get shared beliefs with other agents
  getSharedBeliefs(): SharedBelief[] {
    return Array.from(this.tomEngine.getSharedBeliefs().values());
  }

  // Abstract methods for domain-specific implementations
  protected abstract generateDomainToMInsights(
    data: any,
    mentalStates: Map<string, MentalState>
  ): Promise<ToMInsight[]>;
}