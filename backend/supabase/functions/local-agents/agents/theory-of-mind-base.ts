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
  EmotionalState,
} from '../theory-of-mind/theory-of-mind-engine.ts';
import { SupabaseClient } from '@supabase/supabase-js';

// SituationContext interface for perspective taking
export interface SituationContext {
  [key: string]: unknown;
  context?: AgentContext;
  timestamp?: string;
}

// Helper interfaces for processing unknown data
export interface AgentReference {
  id?: string;
  type?: 'human' | 'ai' | 'system';
  [key: string]: unknown;
}

export interface MessageData {
  sender?: string;
  recipient?: string;
  content?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ObservationData {
  agentId?: string;
  actions?: unknown[];
  context?: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ActionData {
  agentId?: string;
  type?: string;
  parameters?: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

export interface InteractionData {
  partner: string;
  outcome: 'success' | 'failure' | 'partial';
  timestamp?: string;
  [key: string]: unknown;
}

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

// Type guard to check if data is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export abstract class TheoryOfMindBaseAgent extends CausalBaseAgent {
  protected tomEngine: TheoryOfMindEngine;
  protected observationHistory: Map<string, ObservedBehavior[]> = new Map();
  protected interactionPartners: Set<string> = new Set();

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId);
    this.tomEngine = new TheoryOfMindEngine('theory_of_mind_agent', 'ai');
  }

  // Enhanced process method with Theory of Mind
  async process(data: unknown, context?: AgentContext): Promise<TheoryOfMindProcessingResult> {
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
          ...(perspectiveTaking && { perspectiveTaking }),
          ...(empathyModel && { empathyModel }),
          ...(coordinationPlan && { coordinationPlan }),
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
  protected requiresTheoryOfMind(data: unknown, context?: AgentContext): boolean {
    if (!isRecord(data)) {
      return false;
    }

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
    data: unknown,
    context?: AgentContext,
  ): Promise<string[]> {
    const agents = new Set<string>();
    const dataObj = data as Record<string, unknown>;

    // From explicit agent lists
    if (Array.isArray(dataObj.agents)) {
      dataObj.agents.forEach((agent: unknown) => {
        const agentRef = agent as AgentReference;
        agents.add(agentRef.id || String(agent));
      });
    }

    if (context?.otherAgents) {
      context.otherAgents.forEach(agent => agents.add(agent));
    }

    // From messages
    if (Array.isArray(dataObj.messages)) {
      dataObj.messages.forEach((msg: unknown) => {
        const msgData = msg as MessageData;
        if (msgData.sender) {agents.add(msgData.sender);}
        if (msgData.recipient) {agents.add(msgData.recipient);}
      });
    }

    // From observations
    if (Array.isArray(dataObj.observations)) {
      dataObj.observations.forEach((obs: unknown) => {
        const obsData = obs as ObservationData;
        if (obsData.agentId) {agents.add(obsData.agentId);}
      });
    }

    // Remove self
    agents.delete(this.agentType);

    return Array.from(agents);
  }

  // Model mental states of other agents
  protected async modelOtherAgents(
    agentIds: string[],
    data: unknown,
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
    data: unknown,
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
    data: unknown,
    context: AgentContext | undefined,
    agentIds: string[],
  ): Promise<PerspectiveTaking | undefined> {
    if (!isRecord(data)) {
      return undefined;
    }

    // Check if perspective taking is requested
    if (!data.takePerspective && !data.understandViewpoint) {
      return undefined;
    }

    const targetAgent = (data.perspectiveTarget as string | undefined) || agentIds[0];
    if (!targetAgent) {return undefined;}

    const situation = this.extractSituation(data, context);
    return this.tomEngine.takePerspective(targetAgent, situation);
  }

  // Generate empathy model if needed
  protected async generateEmpathyIfNeeded(
    data: unknown,
    context: AgentContext | undefined,
    agentIds: string[],
  ): Promise<EmpathyModel | undefined> {
    if (!isRecord(data)) {
      return undefined;
    }

    // Check if empathy is relevant
    if (!data.emotionalContext && !data.empathize && !this.hasEmotionalContent(data)) {
      return undefined;
    }

    const targetAgent = (data.empathyTarget as string | undefined) || agentIds[0];
    if (!targetAgent) {return undefined;}

    const situation = this.extractSituation(data, context);
    return this.tomEngine.generateEmpathyModel(targetAgent, situation);
  }

  // Create coordination plan if needed
  protected async createCoordinationPlanIfNeeded(
    data: unknown,
    _context: AgentContext | undefined,
    agentIds: string[],
    _mentalStates: Map<string, MentalState>,
  ): Promise<CoordinationPlan | undefined> {
    if (!isRecord(data)) {
      return undefined;
    }

    // Check if coordination is needed
    if (!data.coordinate && !data.collaborate && agentIds.length < 2) {
      return undefined;
    }

    if (!data.sharedGoal && !data.objective) {
      return undefined;
    }

    const goal = (data.sharedGoal || data.objective) as string;
    const participants = [this.agentType, ...agentIds];

    return this.tomEngine.createCoordinationPlan(
      goal,
      participants,
      data.constraints as Record<string, unknown> | undefined,
    );
  }

  // Update trust models
  protected async updateTrustModels(
    data: unknown,
    _context: AgentContext | undefined,
    _agentIds: string[],
  ): Promise<Map<string, TrustModel>> {
    const trustUpdates = new Map<string, TrustModel>();
    const dataObj = data as Record<string, unknown>;

    // Check for interaction outcomes
    if (Array.isArray(dataObj.interactions)) {
      for (const interaction of dataObj.interactions) {
        const interactionData = interaction as InteractionData;
        if (interactionData.outcome && interactionData.partner) {
          // Map outcome to sentiment
          const sentiment: 'positive' | 'negative' | 'neutral' =
            interactionData.outcome === 'success' ? 'positive' :
            interactionData.outcome === 'failure' ? 'negative' :
            'neutral'; // 'partial' maps to neutral

          const trust = await this.tomEngine.updateTrust(
            this.agentType,
            interactionData.partner,
            interactionData,
            sentiment,
          );
          trustUpdates.set(interactionData.partner, trust);
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
        .filter((b: Belief) => b.confidence > 0.7);

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
    data: unknown,
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

  protected extractObservationsForAgent(agentId: string, data: unknown): ObservedBehavior[] {
    const observations: ObservedBehavior[] = [];
    const dataObj = data as Record<string, unknown>;

    // From explicit observations
    if (Array.isArray(dataObj.observations)) {
      const agentObs = dataObj.observations.filter((o: unknown) => {
        const obs = o as ObservationData;
        return obs.agentId === agentId;
      });
      observations.push(...agentObs.map((o: unknown) => {
        const obs = o as ObservationData;
        return {
          agentId,
          actions: (obs.actions || []) as Action[],
          context: obs.context || {},
          timestamp: obs.timestamp || new Date().toISOString(),
        };
      }));
    }

    // From actions
    if (Array.isArray(dataObj.actions)) {
      const agentActions = dataObj.actions.filter((a: unknown) => {
        const action = a as ActionData;
        return action.agentId === agentId;
      });
      if (agentActions.length > 0) {
        observations.push({
          agentId,
          actions: agentActions as Action[],
          context: (dataObj.context as Record<string, unknown>) || {},
          timestamp: new Date().toISOString(),
        });
      }
    }

    return observations;
  }

  protected inferAgentType(agentId: string, data: unknown): 'human' | 'ai' | 'system' {
    const dataObj = data as Record<string, unknown>;

    // Check explicit type information
    const agentTypes = dataObj.agentTypes as Record<string, 'human' | 'ai' | 'system'> | undefined;
    if (agentTypes?.[agentId]) {
      return agentTypes[agentId];
    }

    // Infer from ID patterns
    if (agentId.includes('user') || agentId.includes('human')) {return 'human';}
    if (agentId.includes('system') || agentId.includes('bot')) {return 'system';}

    return 'ai'; // Default
  }

  protected async addDomainSpecificBeliefs(
    _mentalState: MentalState,
    _data: unknown,
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

  protected extractSituation(data: unknown, context?: AgentContext): SituationContext {
    const dataObj = data as Record<string, unknown>;
    return {
      ...dataObj,
      ...(context ? { context } : {}),
      timestamp: new Date().toISOString(),
    };
  }

  protected hasEmotionalContent(data: unknown): boolean {
    const emotionalKeywords = ['feel', 'emotion', 'happy', 'sad', 'angry', 'fear',
                              'joy', 'frustrat', 'excit', 'disappoint'];
    const dataStr = JSON.stringify(data).toLowerCase();

    return emotionalKeywords.some(keyword => dataStr.includes(keyword));
  }

  protected generateBeliefImplications(belief: Belief, state: MentalState): string[] {
    const implications: string[] = [];

    // Check if belief affects goals
    const desires = Array.from(state.desires.values());
    const relatedGoals = desires.filter((d) => this.beliefAffectsDesire(belief, d));

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
    return belief.content.toLowerCase().includes(desire.goal?.toLowerCase() || '') ||
           desire.goal?.toLowerCase().includes(belief.content.toLowerCase()) || false;
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

  protected describeEmotion(emotion: EmotionalState): string {
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
    situation: SituationContext,
    timeHorizon: number = 1,
  ): Promise<Action[]> {
    return this.tomEngine.predictActions(agentId, situation, timeHorizon);
  }

  // Interpret messages with mental state context
  async interpretMessage(message: Message, context: SituationContext): Promise<Message> {
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
    data: unknown,
    mentalStates: Map<string, MentalState>
  ): Promise<ToMInsight[]>;
}