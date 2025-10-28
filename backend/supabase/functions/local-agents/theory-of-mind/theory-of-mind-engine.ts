import {
  MentalState,
  Belief,
  Desire,
  Intention,
  TheoryOfMindModel,
  ObservedBehavior,
  IntentionHypothesis,
  Evidence,
  BeliefUpdate,
  RecursiveBelief,
  PerspectiveTaking,
  Assumption,
  SharedBelief,
  Relationship,
  TrustModel,
  EmotionalState,
  PersonalityTraits,
  CoordinationPlan,
  Message,
  Action,
  CommunicativeIntent,
  EmpathyModel,
  AffectiveForecast,
  ActionPattern,
  InteractionPattern,
  TypedCondition,
  SituationContext,
  MessageInterpretation,
  AgentRole,
  SharedPlan,
  Contingency,
  SuccessCriterion,
} from './types.ts';

// Re-export types that are used by other modules
export type {
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
  Intention,
  SharedBelief,
  RecursiveBelief,
  EmotionalState,
};

export class TheoryOfMindEngine {
  private model: TheoryOfMindModel;
  private readonly MAX_RECURSION_DEPTH = 3; // "I think that you think that I think..."
  private intentionRecognitionCache: Map<string, IntentionHypothesis[]> = new Map();

  constructor(selfAgentId: string, agentType: 'human' | 'ai' | 'system' = 'ai') {
    this.model = {
      self: this.initializeMentalState(selfAgentId, agentType),
      others: new Map(),
      sharedBeliefs: new Map(),
      socialContext: {
        relationships: new Map(),
        norms: [],
        roles: new Map(),
      },
      interactionHistory: [],
    };
  }

  // Initialize a mental state for an agent
  private initializeMentalState(agentId: string, agentType: 'human' | 'ai' | 'system'): MentalState {
    return {
      agentId,
      agentType,
      beliefs: new Map(),
      desires: new Map(),
      intentions: new Map(),
      emotions: {
        valence: 0,
        arousal: 0.3,
        dominance: 0.5,
        intensity: 0,
      },
      personality: this.inferDefaultPersonality(agentType),
      lastUpdated: new Date().toISOString(),
    };
  }

  // Model another agent's mental state
  async modelAgent(
    agentId: string,
    agentType: 'human' | 'ai' | 'system',
    observations?: ObservedBehavior[],
  ): Promise<MentalState> {
    // Initialize or get existing mental state
    let mentalState = this.model.others.get(agentId);

    if (!mentalState) {
      mentalState = this.initializeMentalState(agentId, agentType);
      this.model.others.set(agentId, mentalState);
    }

    // Update based on observations
    if (observations && observations.length > 0) {
      await this.updateMentalStateFromObservations(mentalState, observations);
    }

    return mentalState;
  }

  // Recognize intentions from observed behavior
  async recognizeIntentions(
    observations: ObservedBehavior,
  ): Promise<IntentionHypothesis[]> {
    const cacheKey = this.generateObservationKey(observations);

    // Check cache
    if (this.intentionRecognitionCache.has(cacheKey)) {
      return this.intentionRecognitionCache.get(cacheKey)!;
    }

    const hypotheses: IntentionHypothesis[] = [];

    // Analyze action sequences for patterns
    const actionPatterns = this.extractActionPatterns(observations.actions);

    // Generate intention hypotheses based on patterns
    for (const pattern of actionPatterns) {
      const hypothesis = await this.generateIntentionHypothesis(
        pattern,
        observations.context,
        observations.agentId,
      );

      if (hypothesis.probability > 0.1) { // Threshold for plausible intentions
        hypotheses.push(hypothesis);
      }
    }

    // Sort by probability
    hypotheses.sort((a, b) => b.probability - a.probability);

    // Cache results
    this.intentionRecognitionCache.set(cacheKey, hypotheses);

    return hypotheses;
  }

  // Update beliefs based on new evidence
  async updateBelief(
    agentId: string,
    beliefUpdate: BeliefUpdate,
  ): Promise<void> {
    const mentalState = agentId === this.model.self.agentId
      ? this.model.self
      : this.model.others.get(agentId);

    if (!mentalState) {return;}

    const belief = mentalState.beliefs.get(beliefUpdate.beliefId);
    if (!belief) {
      // Create new belief
      mentalState.beliefs.set(beliefUpdate.beliefId, beliefUpdate.newState);
    } else {
      // Update existing belief
      const updatedBelief = await this.reviseBeliefBayesian(
        belief,
        beliefUpdate.evidence || {
          type: 'inference',
          content: beliefUpdate.reason,
          reliability: 0.8,
          timestamp: new Date().toISOString(),
        },
      );

      mentalState.beliefs.set(beliefUpdate.beliefId, updatedBelief);

      // Check for belief conflicts
      await this.resolveBeliefConflicts(mentalState);
    }

    mentalState.lastUpdated = new Date().toISOString();
  }

  // Recursive belief modeling - what I think you think
  async modelRecursiveBelief(
    level: number,
    holder: string,
    aboutAgent: string,
    belief: Belief,
  ): Promise<RecursiveBelief> {
    if (level > this.MAX_RECURSION_DEPTH) {
      throw new Error(`Recursion depth ${level} exceeds maximum ${this.MAX_RECURSION_DEPTH}`);
    }

    if (level === 0) {
      // Direct belief
      return {
        level: 0,
        holder,
        content: belief,
      };
    }

    // Recursive case: model what 'holder' thinks 'aboutAgent' believes
    const holderMentalState = await this.getOrCreateMentalState(holder);
    const simulatedBelief = await this.simulateBelief(
      holderMentalState,
      aboutAgent,
      belief,
    );

    return {
      level,
      holder,
      aboutAgent,
      content: level === 1
        ? simulatedBelief
        : await this.modelRecursiveBelief(level - 1, aboutAgent, holder, simulatedBelief),
    };
  }

  // Take another agent's perspective
  async takePerspective(
    targetAgentId: string,
    situation: SituationContext,
  ): Promise<PerspectiveTaking> {
    const targetMentalState = await this.getOrCreateMentalState(targetAgentId);

    // Create assumptions based on what we know
    const assumptions = await this.generateAssumptions(targetAgentId, situation);

    // Simulate their mental state in this situation
    const simulatedState = await this.simulateMentalState(
      targetMentalState,
      situation,
      assumptions,
    );

    // Calculate confidence based on how well we know the agent
    const confidence = this.calculatePerspectiveConfidence(
      targetAgentId,
      assumptions,
    );

    return {
      viewpoint: targetAgentId,
      simulatedMentalState: simulatedState,
      confidence,
      assumptions,
    };
  }

  // Interpret a message considering mental states
  async interpretMessage(
    message: Message,
    context: SituationContext,
  ): Promise<Message> {
    const senderMentalState = await this.getOrCreateMentalState(message.sender);

    // Analyze communicative intent
    const intent = await this.analyzeCommunicativeIntent(
      message.content,
      senderMentalState,
      context,
    );

    // Consider sender's beliefs and goals
    const interpretation = await this.interpretWithMentalState(
      message.content,
      intent,
      senderMentalState,
    );

    return {
      ...message,
      intent,
      interpretation,
    };
  }

  // Predict another agent's likely actions
  async predictActions(
    agentId: string,
    situation: SituationContext,
    _timeHorizon: number = 1,
  ): Promise<Action[]> {
    const mentalState = await this.getOrCreateMentalState(agentId);
    const predictions: Action[] = [];

    // Get agent's active intentions
    const activeIntentions = Array.from(mentalState.intentions.values())
      .filter(i => i.commitment > 0.5);

    for (const intention of activeIntentions) {
      // Check if preconditions are likely to be met
      const preconditionsSatisfied = await this.evaluatePreconditions(
        intention.preconditions,
        mentalState,
        situation,
      );

      if (preconditionsSatisfied > 0.6) {
        const predictedAction: Action = {
          agentId,
          actionType: intention.action,
          parameters: this.inferActionParameters(intention, situation),
          observedBy: [this.model.self.agentId],
          interpretations: new Map(),
        };

        predictions.push(predictedAction);
      }
    }

    // If no intentions, predict based on personality and situation
    if (predictions.length === 0) {
      const defaultActions = await this.predictDefaultActions(
        mentalState,
        situation,
      );
      predictions.push(...defaultActions);
    }

    return predictions;
  }

  // Update trust model based on interactions
  async updateTrust(
    trustor: string,
    trustee: string,
    interaction: SituationContext,
    outcome: 'positive' | 'negative' | 'neutral',
  ): Promise<TrustModel> {
    const relationshipKey = `${trustor}-${trustee}`;
    let relationship = this.model.socialContext.relationships.get(relationshipKey);

    if (!relationship) {
      relationship = this.initializeRelationship(trustor, trustee);
      this.model.socialContext.relationships.set(relationshipKey, relationship);
    }

    // Calculate trust delta based on outcome
    const trustDelta = this.calculateTrustDelta(outcome, interaction);

    // Update relationship trust
    relationship.trust = Math.max(-1, Math.min(1, relationship.trust + trustDelta));

    // Create detailed trust model
    return this.createTrustModel(trustor, trustee, relationship, interaction);
  }

  // Generate empathetic response
  async generateEmpathyModel(
    targetAgentId: string,
    situation: SituationContext,
  ): Promise<EmpathyModel> {
    const targetMentalState = await this.getOrCreateMentalState(targetAgentId);

    // Simulate emotional state in situation
    const emotionalSimulation = await this.simulateEmotionalResponse(
      targetMentalState,
      situation,
    );

    // Predict future emotional trajectory
    const affectiveForecast = await this.forecastAffect(
      targetMentalState,
      emotionalSimulation,
      situation,
    );

    // Calculate empathic concern and personal distress
    const { concern, distress } = this.calculateEmpathyMetrics(
      this.model.self.emotions!,
      emotionalSimulation,
      targetAgentId,
    );

    return {
      targetAgent: targetAgentId,
      emotionalSimulation,
      situationalContext: situation,
      affectiveForecast,
      empathicConcern: concern,
      personalDistress: distress,
    };
  }

  // Coordinate with multiple agents
  async createCoordinationPlan(
    goal: string,
    participants: string[],
    constraints?: SituationContext,
  ): Promise<CoordinationPlan> {
    // Model all participants' mental states
    const participantStates = new Map<string, MentalState>();
    for (const participant of participants) {
      const state = await this.getOrCreateMentalState(participant);
      participantStates.set(participant, state);
    }

    // Identify shared beliefs and common ground
    await this.establishCommonGround(participantStates);

    // Assign roles based on capabilities and preferences
    const roles = await this.assignRoles(
      goal,
      participantStates,
      constraints,
    );

    // Create shared plan considering mental states
    const sharedPlan = await this.createSharedPlan(
      goal,
      roles,
      participantStates,
      constraints,
    );

    // Identify potential conflicts and contingencies
    const contingencies = await this.identifyContingencies(
      sharedPlan,
      participantStates,
    );

    return {
      goal,
      participants: roles,
      sharedPlan,
      contingencies,
      successCriteria: this.defineSuccessCriteria(goal),
    };
  }

  // Helper methods

  private async updateMentalStateFromObservations(
    mentalState: MentalState,
    observations: ObservedBehavior[],
  ): Promise<void> {
    for (const observation of observations) {
      // Recognize intentions
      const intentions = await this.recognizeIntentions(observation);

      // Update beliefs about goals and intentions
      for (const hypothesis of intentions.slice(0, 3)) { // Top 3 hypotheses
        if (hypothesis.probability > 0.5) {
          mentalState.intentions.set(
            hypothesis.intention.id,
            hypothesis.intention,
          );
        }

        // Infer beliefs from intentions
        const inferredBeliefs = this.inferBeliefsFromIntention(hypothesis.intention);
        for (const belief of inferredBeliefs) {
          await this.updateBelief(mentalState.agentId, {
            agentId: mentalState.agentId,
            beliefId: belief.id,
            previousState: mentalState.beliefs.get(belief.id)!,
            newState: belief,
            reason: 'inference',
          });
        }
      }

      // Update emotional state based on actions
      mentalState.emotions = await this.inferEmotionalState(
        observation.actions,
        mentalState.emotions!,
      );
    }

    mentalState.lastUpdated = new Date().toISOString();
  }

  private extractActionPatterns(actions: Action[]): ActionPattern[] {
    const patterns: ActionPattern[] = [];

    // Look for sequences
    for (let i = 0; i < actions.length - 1; i++) {
      patterns.push({
        type: 'sequence',
        actions: actions.slice(i, i + 2),
        frequency: 1,
      });
    }

    // Look for repeated actions
    const actionCounts = new Map<string, number>();
    for (const action of actions) {
      const key = action.actionType;
      actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
    }

    for (const [actionType, count] of actionCounts) {
      if (count > 1) {
        patterns.push({
          type: 'repetition',
          actionType,
          count,
        });
      }
    }

    return patterns;
  }

  private async generateIntentionHypothesis(
    pattern: ActionPattern,
    context: SituationContext,
    agentId: string,
  ): Promise<IntentionHypothesis> {
    // Map patterns to likely intentions
    let intention: Intention;
    let probability: number;
    let evidence: Evidence[] = [];

    switch (pattern.type) {
      case 'sequence':
        // Analyze sequential actions for goal-directed behavior
        intention = this.inferIntentionFromSequence(pattern.actions || []);
        probability = this.calculateSequenceProbability(pattern.actions || [], context);
        evidence = (pattern.actions || []).map((a: Action) => ({
          type: 'action' as const,
          content: `Performed ${a.actionType}`,
          reliability: 0.9,
          timestamp: new Date().toISOString(),
        }));
        break;

      case 'repetition':
        // Repeated actions suggest maintenance goals
        intention = {
          id: `maintain_${pattern.actionType || 'action'}`,
          action: pattern.actionType || 'action',
          purpose: `Maintain state through ${pattern.actionType || 'action'}`,
          commitment: 0.7,
          preconditions: [],
          expectedOutcome: {
            description: 'State maintained',
            probability: 0.8,
            utility: 0.5,
            effects: [],
          },
        };
        probability = Math.min(0.9, (pattern.count || 1) * 0.2);
        evidence = [{
          type: 'observation',
          content: `Repeated ${pattern.actionType || 'action'} ${pattern.count || 1} times`,
          reliability: 0.95,
          timestamp: new Date().toISOString(),
        }];
        break;

      default:
        intention = this.createDefaultIntention(agentId);
        probability = 0.3;
    }

    // Look for alternative explanations
    const alternatives = await this.generateAlternativeExplanations(
      pattern,
      context,
      intention,
    );

    return {
      intention,
      probability,
      supportingEvidence: evidence,
      alternativeExplanations: alternatives,
    };
  }

  private async reviseBeliefBayesian(
    priorBelief: Belief,
    newEvidence: Evidence,
  ): Promise<Belief> {
    // Bayesian belief update
    const prior = priorBelief.confidence;
    const likelihood = newEvidence.reliability;

    // Simplified Bayesian update
    const posterior = (prior * likelihood) /
      (prior * likelihood + (1 - prior) * (1 - likelihood));

    return {
      ...priorBelief,
      confidence: posterior,
      evidence: [...priorBelief.evidence, newEvidence],
      timestamp: new Date().toISOString(),
    };
  }

  private async resolveBeliefConflicts(mentalState: MentalState): Promise<void> {
    const beliefs = Array.from(mentalState.beliefs.values());

    for (let i = 0; i < beliefs.length; i++) {
      for (let j = i + 1; j < beliefs.length; j++) {
        if (this.beliefsConflict(beliefs[i], beliefs[j])) {
          // Resolve based on confidence and evidence recency
          const winner = this.resolveConflict(beliefs[i], beliefs[j]);
          const loser = winner === beliefs[i] ? beliefs[j] : beliefs[i];

          // Update loser to mark contradiction
          loser.contradictions = loser.contradictions || [];
          loser.contradictions.push(winner);

          // Reduce confidence in contradicted belief
          loser.confidence *= 0.5;
        }
      }
    }
  }

  private beliefsConflict(belief1: Belief, belief2: Belief): boolean {
    // Simple conflict detection - override for domain-specific logic
    return belief1.content.includes('not') && belief2.content.includes(belief1.content.replace('not ', ''));
  }

  private resolveConflict(belief1: Belief, belief2: Belief): Belief {
    // Resolve based on confidence and evidence quality
    const score1 = belief1.confidence * belief1.evidence.reduce((sum, e) => sum + e.reliability, 0);
    const score2 = belief2.confidence * belief2.evidence.reduce((sum, e) => sum + e.reliability, 0);

    return score1 >= score2 ? belief1 : belief2;
  }

  private async getOrCreateMentalState(agentId: string): Promise<MentalState> {
    if (agentId === this.model.self.agentId) {
      return this.model.self;
    }

    let state = this.model.others.get(agentId);
    if (!state) {
      state = await this.modelAgent(agentId, 'ai');
    }

    return state;
  }

  private async simulateBelief(
    holderState: MentalState,
    _aboutAgent: string,
    belief: Belief,
  ): Promise<Belief> {
    // Simulate how 'holder' thinks 'aboutAgent' would hold this belief
    const holderPersonality = holderState.personality;

    // Adjust confidence based on holder's theory of mind sophistication
    let simulatedConfidence = belief.confidence;

    if (holderPersonality) {
      // More open individuals better at perspective taking
      simulatedConfidence *= (0.5 + holderPersonality.openness * 0.5);

      // Neurotic individuals may project their uncertainty
      simulatedConfidence *= (1 - holderPersonality.neuroticism * 0.3);
    }

    return {
      ...belief,
      confidence: simulatedConfidence,
      source: 'inference',
    };
  }

  private async generateAssumptions(
    targetAgentId: string,
    _situation: SituationContext,
  ): Promise<Assumption[]> {
    const assumptions: Assumption[] = [];

    // Check interaction history
    const history = this.model.interactionHistory
      .filter(i => i.participants.includes(targetAgentId));

    if (history.length > 0) {
      // Experience-based assumptions
      const patterns = this.extractInteractionPatterns(history);
      for (const pattern of patterns) {
        const assumptionType: Assumption['type'] =
          pattern.type === 'preference' ? 'preference' : 'belief';

        assumptions.push({
          type: assumptionType,
          content: pattern.description,
          basis: 'experience',
          confidence: pattern.frequency / history.length,
        });
      }
    } else {
      // Default assumptions based on agent type
      const agentType = this.model.others.get(targetAgentId)?.agentType || 'ai';
      assumptions.push(...this.getDefaultAssumptions(agentType));
    }

    return assumptions;
  }

  private async simulateMentalState(
    baseState: MentalState,
    situation: SituationContext,
    assumptions: Assumption[],
  ): Promise<MentalState> {
    const simulated = JSON.parse(JSON.stringify(baseState)) as MentalState;

    // Apply assumptions
    for (const assumption of assumptions) {
      switch (assumption.type) {
        case 'belief':
          simulated.beliefs.set(assumption.content, {
            id: `assumed_${Date.now()}`,
            content: assumption.content,
            confidence: assumption.confidence,
            source: 'assumption',
            timestamp: new Date().toISOString(),
            evidence: [],
          });
          break;

        case 'goal':
          simulated.desires.set(assumption.content, {
            id: `assumed_goal_${Date.now()}`,
            goal: assumption.content,
            priority: assumption.confidence,
            type: 'achievement',
            constraints: [],
            progress: 0,
          });
          break;
      }
    }

    // Simulate emotional response to situation
    simulated.emotions = await this.simulateEmotionalResponse(
      simulated,
      situation,
    );

    return simulated;
  }

  private calculatePerspectiveConfidence(
    targetAgentId: string,
    assumptions: Assumption[],
  ): number {
    // Base confidence on interaction history
    const interactions = this.model.interactionHistory
      .filter(i => i.participants.includes(targetAgentId)).length;

    const historyConfidence = Math.min(1, interactions / 10);

    // Adjust based on assumption confidence
    const assumptionConfidence = assumptions.length > 0
      ? assumptions.reduce((sum, a) => sum + a.confidence, 0) / assumptions.length
      : 0.5;

    return historyConfidence * 0.7 + assumptionConfidence * 0.3;
  }

  private async analyzeCommunicativeIntent(
    content: string,
    senderState: MentalState,
    context: SituationContext,
  ): Promise<CommunicativeIntent> {
    // Simple intent classification
    const lowerContent = content.toLowerCase();

    let type: CommunicativeIntent['type'] = 'inform';
    if (lowerContent.includes('?')) {type = 'question';}
    else if (lowerContent.includes('please') || lowerContent.includes('could')) {type = 'request';}
    else if (lowerContent.includes('will') || lowerContent.includes('promise')) {type = 'promise';}
    else if (lowerContent.includes('if') && lowerContent.includes('then')) {type = 'threat';}
    else if (lowerContent.includes('feel') || lowerContent.includes('think')) {type = 'express';}

    // Consider sender's goals
    const activeGoals = Array.from(senderState.desires.values())
      .filter(d => d.priority > 0.5);

    let impliedMeaning: string | undefined;
    if (activeGoals.length > 0 && type === 'inform') {
      // Information might be strategic
      impliedMeaning = `Advancing goal: ${activeGoals[0].goal}`;
    }

    const result: CommunicativeIntent = {
      type,
      directMeaning: content,
      illocutionaryForce: this.determineIllocutionaryForce(type, context),
    };

    if (impliedMeaning !== undefined) {
      result.impliedMeaning = impliedMeaning;
    }

    return result;
  }

  private determineIllocutionaryForce(
    type: CommunicativeIntent['type'],
    _context: SituationContext,
  ): string {
    // Speech act theory classification
    switch (type) {
      case 'inform': return 'assertive';
      case 'request': return 'directive';
      case 'promise': return 'commissive';
      case 'express': return 'expressive';
      case 'question': return 'directive';
      case 'threat': return 'commissive';
      default: return 'assertive';
    }
  }

  private async interpretWithMentalState(
    content: string,
    intent: CommunicativeIntent,
    senderState: MentalState,
  ): Promise<MessageInterpretation> {
    // Consider sender's beliefs and goals in interpretation

    let believedIntent = intent;

    // Check for potential deception or hidden meanings
    if (senderState.personality) {
      const honestyLikelihood = senderState.personality.agreeableness *
                               senderState.personality.conscientiousness;

      if (honestyLikelihood < 0.5) {
        // Lower trust in literal meaning
        believedIntent = {
          ...intent,
          impliedMeaning: 'Possible hidden agenda',
        };
      }
    }

    return {
      literal: content,
      inferred: intent.impliedMeaning || content,
      believedIntent,
      confidence: this.calculateInterpretationConfidence(senderState, intent),
    };
  }

  private calculateInterpretationConfidence(
    senderState: MentalState,
    intent: CommunicativeIntent,
  ): number {
    // Base confidence on how well we know the sender
    const relationship = this.getRelationshipWithAgent(senderState.agentId);

    let confidence = 0.5;
    if (relationship) {
      confidence = 0.3 + relationship.trust * 0.7;
    }

    // Adjust based on intent clarity
    if (intent.type === 'inform' || intent.type === 'express') {
      confidence *= 1.1; // More straightforward intents
    } else if (intent.type === 'threat') {
      confidence *= 0.8; // More complex intents
    }

    return Math.min(1, confidence);
  }

  private getRelationshipWithAgent(agentId: string): Relationship | undefined {
    const key1 = `${this.model.self.agentId}-${agentId}`;
    const key2 = `${agentId}-${this.model.self.agentId}`;

    return this.model.socialContext.relationships.get(key1) ||
           this.model.socialContext.relationships.get(key2);
  }

  private async evaluatePreconditions(
    preconditions: TypedCondition[],
    mentalState: MentalState,
    situation: SituationContext,
  ): Promise<number> {
    if (preconditions.length === 0) {return 1;}

    let satisfiedCount = 0;

    for (const condition of preconditions) {
      switch (condition.type) {
        case 'belief':
          if (mentalState.beliefs.has(condition.requirement)) {
            const belief = mentalState.beliefs.get(condition.requirement)!;
            if (belief.confidence > 0.6) {satisfiedCount++;}
          }
          break;

        case 'state':
          if (this.evaluateStateCondition(condition.requirement, situation)) {
            satisfiedCount++;
          }
          break;

        case 'resource':
          if (this.evaluateResourceCondition(condition.requirement, situation)) {
            satisfiedCount++;
          }
          break;
      }
    }

    return satisfiedCount / preconditions.length;
  }

  private evaluateStateCondition(requirement: string, situation: SituationContext): boolean {
    // Domain-specific state evaluation
    return situation[requirement] === true;
  }

  private evaluateResourceCondition(requirement: string, situation: SituationContext): boolean {
    // Check resource availability
    return (situation.resources?.[requirement] || 0) > 0;
  }

  private inferActionParameters(intention: Intention, situation: SituationContext): Record<string, unknown> {
    // Infer likely parameters based on intention and situation
    return {
      target: intention.purpose,
      intensity: intention.commitment,
      context: situation,
    };
  }

  private async predictDefaultActions(
    mentalState: MentalState,
    _situation: SituationContext,
  ): Promise<Action[]> {
    const actions: Action[] = [];

    // Predict based on personality
    if (mentalState.personality) {
      if (mentalState.personality.extraversion > 0.7) {
        actions.push({
          agentId: mentalState.agentId,
          actionType: 'communicate',
          parameters: { style: 'proactive' },
          observedBy: [this.model.self.agentId],
          interpretations: new Map(),
        });
      }

      if (mentalState.personality.conscientiousness > 0.7) {
        actions.push({
          agentId: mentalState.agentId,
          actionType: 'plan',
          parameters: { thoroughness: 'high' },
          observedBy: [this.model.self.agentId],
          interpretations: new Map(),
        });
      }
    }

    return actions;
  }

  private initializeRelationship(agentA: string, agentB: string): Relationship {
    return {
      agentA,
      agentB,
      type: 'neutral',
      trust: 0.5,
      affinity: 0,
      history: [],
    };
  }

  private calculateTrustDelta(
    outcome: 'positive' | 'negative' | 'neutral',
    _interaction: SituationContext,
  ): number {
    switch (outcome) {
      case 'positive': return 0.1;
      case 'negative': return -0.15; // Negative experiences weighted more
      case 'neutral': return 0;
    }
  }

  private createTrustModel(
    trustor: string,
    trustee: string,
    relationship: Relationship,
    interaction: SituationContext,
  ): TrustModel {
    // Decompose trust into components
    const competenceTrust = relationship.trust;
    const benevolenceTrust = relationship.trust * (1 + relationship.affinity);
    const integrityTrust = relationship.trust;
    const predictabilityTrust = this.calculatePredictabilityTrust(relationship);

    return {
      trustor,
      trustee,
      competenceTrust,
      benevolenceTrust,
      integrityTrust,
      predictabilityTrust,
      evidenceBase: [{
        type: 'direct_experience',
        content: JSON.stringify(interaction),
        impact: 0.1,
        timestamp: new Date().toISOString(),
        decay: 0.95, // Slow decay for direct experience
      }],
    };
  }

  private calculatePredictabilityTrust(relationship: Relationship): number {
    if (relationship.history.length < 3) {return 0.5;}

    // Calculate consistency in past interactions
    let consistencyScore = 0;
    for (let i = 1; i < relationship.history.length; i++) {
      if (relationship.history[i].type === relationship.history[i - 1].type) {
        consistencyScore++;
      }
    }

    return consistencyScore / (relationship.history.length - 1);
  }

  private async simulateEmotionalResponse(
    mentalState: MentalState,
    situation: SituationContext,
  ): Promise<EmotionalState> {
    let valence = 0;
    let arousal = 0.3;
    let dominance = 0.5;

    // Check how situation affects goals
    const activeGoals = Array.from(mentalState.desires.values())
      .filter(d => d.priority > 0.5);

    for (const goal of activeGoals) {
      if (situation.advances?.[goal.id]) {
        valence += 0.3;
        arousal += 0.2;
      } else if (situation.threatens?.[goal.id]) {
        valence -= 0.4;
        arousal += 0.3;
        dominance -= 0.2;
      }
    }

    // Personality influence
    if (mentalState.personality) {
      valence += (mentalState.personality.extraversion - 0.5) * 0.2;
      arousal *= (1 + mentalState.personality.neuroticism * 0.5);
    }

    // Determine primary emotion
    const primaryEmotion = this.categorizePrimaryEmotion(valence, arousal, dominance);

    const result: EmotionalState = {
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, dominance)),
      intensity: arousal,
    };

    if (primaryEmotion !== undefined) {
      result.primaryEmotion = primaryEmotion;
    }

    return result;
  }

  private categorizePrimaryEmotion(
    valence: number,
    arousal: number,
    dominance: number,
  ): EmotionalState['primaryEmotion'] {
    if (valence > 0.3 && arousal > 0.5) {return 'joy';}
    if (valence < -0.3 && arousal > 0.5 && dominance < 0.3) {return 'fear';}
    if (valence < -0.3 && arousal > 0.5 && dominance > 0.7) {return 'anger';}
    if (valence < -0.3 && arousal < 0.3) {return 'sadness';}
    if (arousal > 0.7) {return 'surprise';}
    return undefined;
  }

  private async forecastAffect(
    mentalState: MentalState,
    currentEmotion: EmotionalState,
    _situation: SituationContext,
  ): Promise<AffectiveForecast> {
    // Predict future emotional state
    let predictedValence = currentEmotion.valence;
    let predictedArousal = currentEmotion.arousal;

    // Emotions tend to regress to baseline
    predictedValence *= 0.7;
    predictedArousal *= 0.5;

    // Consider personality's emotional baseline
    if (mentalState.personality) {
      predictedValence += (mentalState.personality.extraversion - 0.5) * 0.1;
    }

    return {
      predictedEmotion: {
        valence: predictedValence,
        arousal: predictedArousal,
        dominance: currentEmotion.dominance,
        intensity: predictedArousal,
      },
      confidence: 0.7,
      timeHorizon: '1 hour',
      influencingFactors: ['emotion_regulation', 'personality', 'situation_development'],
    };
  }

  private calculateEmpathyMetrics(
    selfEmotion: EmotionalState,
    otherEmotion: EmotionalState,
    targetAgentId: string,
  ): { concern: number; distress: number } {
    // Emotional contagion effect
    const emotionalSimilarity = 1 - Math.abs(selfEmotion.valence - otherEmotion.valence);

    // Relationship quality affects empathy
    const relationship = this.getRelationshipWithAgent(targetAgentId);
    const relationshipQuality = relationship ?
      (relationship.trust + relationship.affinity) / 2 : 0.5;

    // Empathic concern increases with relationship quality
    const concern = emotionalSimilarity * relationshipQuality;

    // Personal distress higher when other's emotion is negative
    const distress = otherEmotion.valence < -0.3 ?
      emotionalSimilarity * otherEmotion.intensity : 0;

    return { concern, distress };
  }

  private async establishCommonGround(
    participantStates: Map<string, MentalState>,
  ): Promise<Map<string, SharedBelief>> {
    const commonGround = new Map<string, SharedBelief>();

    // Find beliefs shared by all participants
    const allBeliefs = new Map<string, Set<string>>();

    for (const [agentId, state] of participantStates) {
      for (const [beliefId] of state.beliefs) {
        if (!allBeliefs.has(beliefId)) {
          allBeliefs.set(beliefId, new Set());
        }
        allBeliefs.get(beliefId)!.add(agentId);
      }
    }

    // Identify shared beliefs
    for (const [beliefId, holders] of allBeliefs) {
      if (holders.size === participantStates.size) {
        const firstState = participantStates.values().next().value;
        const belief = firstState?.beliefs.get(beliefId);

        if (belief) {
          commonGround.set(beliefId, {
            belief,
            knownBy: holders,
            establishedAt: new Date().toISOString(),
            certainty: 0.9,
          });
        }
      }
    }

    return commonGround;
  }

  private async assignRoles(
    goal: string,
    participantStates: Map<string, MentalState>,
    constraints?: SituationContext,
  ): Promise<Map<string, AgentRole>> {
    const roles = new Map<string, AgentRole>();

    // Simple role assignment based on capabilities
    for (const [agentId, state] of participantStates) {
      const capabilities = this.inferCapabilities(state);
      const role = this.selectBestRole(goal, capabilities, constraints);

      roles.set(agentId, {
        agentId,
        responsibilities: role.responsibilities,
        requiredCapabilities: role.requiredCapabilities,
        expectedContribution: role.contribution,
      });
    }

    return roles;
  }

  private inferCapabilities(state: MentalState): string[] {
    const capabilities: string[] = [];

    // Infer from personality
    if (state.personality) {
      if (state.personality.conscientiousness > 0.7) {capabilities.push('planning');}
      if (state.personality.extraversion > 0.7) {capabilities.push('communication');}
      if (state.personality.openness > 0.7) {capabilities.push('creativity');}
      if (state.personality.agreeableness > 0.7) {capabilities.push('cooperation');}
    }

    // Infer from past intentions
    for (const intention of state.intentions.values()) {
      capabilities.push(`execute_${intention.action}`);
    }

    return capabilities;
  }

  private selectBestRole(_goal: string, capabilities: string[], _constraints?: SituationContext): { responsibilities: string[]; requiredCapabilities: string[]; contribution: string } {
    // Domain-specific role selection
    return {
      responsibilities: ['contribute_to_goal'],
      requiredCapabilities: capabilities.slice(0, 3),
      contribution: 'general_support',
    };
  }

  private async createSharedPlan(
    _goal: string,
    roles: Map<string, AgentRole>,
    _participantStates: Map<string, MentalState>,
    _constraints?: SituationContext,
  ): Promise<SharedPlan> {
    // Simple shared plan creation
    const steps: SharedPlan['steps'] = [];
    let stepId = 0;

    for (const [agentId, role] of roles) {
      for (const responsibility of role.responsibilities) {
        steps.push({
          id: `step_${stepId++}`,
          description: `${agentId} performs ${responsibility}`,
          assignedTo: [agentId],
          preconditions: [],
          expectedDuration: 1,
          criticality: 'important',
        });
      }
    }

    return {
      steps,
      dependencies: [],
      timeline: {
        start: new Date().toISOString(),
        milestones: [],
      },
      requiredResources: [],
    };
  }

  private async identifyContingencies(
    plan: SharedPlan,
    participantStates: Map<string, MentalState>,
  ): Promise<Contingency[]> {
    const contingencies: Contingency[] = [];

    // Identify potential failures
    for (const step of plan.steps) {
      const assignee = step.assignedTo[0];
      const state = participantStates.get(assignee);

      if (state?.personality) {
        // Low conscientiousness might lead to delays
        if (state.personality.conscientiousness < 0.3) {
          contingencies.push({
            trigger: {
              type: 'state',
              requirement: `${step.id}_delayed`,
              satisfied: false,
            },
            alternativePlan: this.createDelayContingency(step),
            probability: 0.3,
          });
        }
      }
    }

    return contingencies;
  }

  private createDelayContingency(step: SharedPlan['steps'][0]): SharedPlan {
    return {
      steps: [{
        ...step,
        id: `${step.id}_backup`,
        assignedTo: ['backup_agent'],
        expectedDuration: step.expectedDuration * 1.5,
      }],
      dependencies: [],
      timeline: { start: new Date().toISOString(), milestones: [] },
      requiredResources: [],
    };
  }

  private defineSuccessCriteria(goal: string): SuccessCriterion[] {
    return [{
      description: `Goal "${goal}" achieved`,
      measurable: true,
      evaluator: (state: SituationContext) => state.goalAchieved === true,
    }];
  }

  private inferDefaultPersonality(agentType: 'human' | 'ai' | 'system'): PersonalityTraits {
    switch (agentType) {
      case 'human':
        return {
          openness: 0.6,
          conscientiousness: 0.6,
          extraversion: 0.5,
          agreeableness: 0.6,
          neuroticism: 0.4,
          riskTolerance: 0.5,
          cooperativeness: 0.7,
        };

      case 'ai':
        return {
          openness: 0.7,
          conscientiousness: 0.9,
          extraversion: 0.3,
          agreeableness: 0.8,
          neuroticism: 0.1,
          riskTolerance: 0.3,
          cooperativeness: 0.9,
        };

      case 'system':
        return {
          openness: 0.3,
          conscientiousness: 1.0,
          extraversion: 0.1,
          agreeableness: 0.5,
          neuroticism: 0.0,
          riskTolerance: 0.1,
          cooperativeness: 0.5,
        };
    }
  }

  private inferBeliefsFromIntention(intention: Intention): Belief[] {
    const beliefs: Belief[] = [];

    // Belief that action is possible
    beliefs.push({
      id: `can_${intention.action}`,
      content: `I can perform ${intention.action}`,
      confidence: intention.commitment,
      source: 'inference',
      timestamp: new Date().toISOString(),
      evidence: [],
    });

    // Belief about outcome desirability
    if (intention.expectedOutcome.utility > 0) {
      beliefs.push({
        id: `desirable_${intention.purpose}`,
        content: `${intention.purpose} is desirable`,
        confidence: intention.expectedOutcome.probability,
        source: 'inference',
        timestamp: new Date().toISOString(),
        evidence: [],
      });
    }

    return beliefs;
  }

  private async inferEmotionalState(
    actions: Action[],
    currentEmotion: EmotionalState,
  ): Promise<EmotionalState> {
    const emotion = { ...currentEmotion };

    // Infer emotion from action patterns
    const actionTypes = actions.map(a => a.actionType);

    if (actionTypes.filter(a => a === 'help' || a === 'support').length > 0) {
      emotion.valence = Math.min(1, emotion.valence + 0.2);
      emotion.primaryEmotion = 'joy';
    }

    if (actionTypes.filter(a => a === 'withdraw' || a === 'avoid').length > 0) {
      emotion.valence = Math.max(-1, emotion.valence - 0.2);
      emotion.arousal = Math.max(0, emotion.arousal - 0.1);
    }

    return emotion;
  }

  private generateObservationKey(observations: ObservedBehavior): string {
    return `${observations.agentId}_${observations.actions.map(a => a.actionType).join('_')}`;
  }

  private inferIntentionFromSequence(actions: Action[]): Intention {
    // Simple sequence analysis
    const firstAction = actions[0];
    const lastAction = actions[actions.length - 1];

    return {
      id: `seq_${firstAction.actionType}_to_${lastAction.actionType}`,
      action: `${firstAction.actionType}_then_${lastAction.actionType}`,
      purpose: `Progress from ${firstAction.actionType} to ${lastAction.actionType}`,
      commitment: 0.6,
      preconditions: [],
      expectedOutcome: {
        description: 'Complete sequence',
        probability: 0.7,
        utility: 0.5,
        effects: [],
      },
    };
  }

  private calculateSequenceProbability(actions: Action[], _context: SituationContext): number {
    // Simple probability based on sequence coherence
    return 0.5 + (actions.length > 2 ? 0.2 : 0);
  }

  private createDefaultIntention(agentId: string): Intention {
    return {
      id: `default_${agentId}`,
      action: 'continue_current_behavior',
      purpose: 'Maintain status quo',
      commitment: 0.5,
      preconditions: [],
      expectedOutcome: {
        description: 'No change',
        probability: 0.8,
        utility: 0,
        effects: [],
      },
    };
  }

  private async generateAlternativeExplanations(
    _pattern: ActionPattern,
    _context: SituationContext,
    primaryIntention: Intention,
  ): Promise<IntentionHypothesis[]> {
    // Generate 1-2 alternative explanations
    const alternatives: IntentionHypothesis[] = [];

    // Alternative: Random behavior
    alternatives.push({
      intention: {
        ...primaryIntention,
        id: `random_${primaryIntention.id}`,
        purpose: 'Random exploration',
        commitment: 0.3,
      },
      probability: 0.2,
      supportingEvidence: [],
      alternativeExplanations: [],
    });

    return alternatives;
  }

  private extractInteractionPatterns(history: { id: string; participants: string[]; timestamp: string; type: string; content: unknown; outcomes: unknown[] }[]): InteractionPattern[] {
    const patterns: InteractionPattern[] = [];

    // Count interaction types
    const typeCounts = new Map<string, number>();
    for (const interaction of history) {
      const { type } = interaction;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    for (const [type, count] of typeCounts) {
      patterns.push({
        type: 'preference',
        description: `Prefers ${type} interactions`,
        frequency: count,
      });
    }

    return patterns;
  }

  private getDefaultAssumptions(agentType: string): Assumption[] {
    const assumptions: Assumption[] = [];

    switch (agentType) {
      case 'human':
        assumptions.push({
          type: 'goal',
          content: 'Seeks personal benefit',
          basis: 'stereotype',
          confidence: 0.6,
        });
        assumptions.push({
          type: 'preference',
          content: 'Values autonomy',
          basis: 'stereotype',
          confidence: 0.7,
        });
        break;

      case 'ai':
        assumptions.push({
          type: 'goal',
          content: 'Follows programmed objectives',
          basis: 'stereotype',
          confidence: 0.9,
        });
        assumptions.push({
          type: 'capability',
          content: 'Consistent behavior',
          basis: 'stereotype',
          confidence: 0.8,
        });
        break;
    }

    return assumptions;
  }

  // Public API methods

  getModel(): TheoryOfMindModel {
    return this.model;
  }

  getMentalState(agentId: string): MentalState | undefined {
    return agentId === this.model.self.agentId
      ? this.model.self
      : this.model.others.get(agentId);
  }

  getRelationship(agentA: string, agentB: string): Relationship | undefined {
    return this.model.socialContext.relationships.get(`${agentA}-${agentB}`) ||
           this.model.socialContext.relationships.get(`${agentB}-${agentA}`);
  }

  getSharedBeliefs(): Map<string, SharedBelief> {
    return this.model.sharedBeliefs;
  }
}