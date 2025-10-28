// Theory of Mind Types and Interfaces

export interface Belief {
  id: string;
  content: string;
  confidence: number; // 0-1, how strongly the belief is held
  source: 'observation' | 'inference' | 'communication' | 'assumption';
  timestamp: string;
  evidence: Evidence[];
  contradictions?: Belief[]; // Conflicting beliefs
}

export interface Evidence {
  type: 'observation' | 'action' | 'statement' | 'inference';
  content: string;
  reliability: number; // 0-1
  timestamp: string;
  source?: string; // Who/what provided this evidence
}

export interface Desire {
  id: string;
  goal: string;
  priority: number; // 0-1
  type: 'achievement' | 'maintenance' | 'avoidance';
  constraints: Constraint[];
  deadline?: string;
  progress: number; // 0-1
}

export interface Intention {
  id: string;
  action: string;
  purpose: string; // Link to desire/goal
  commitment: number; // 0-1, how committed to this intention
  preconditions: Condition[];
  expectedOutcome: Outcome;
  alternatives?: Intention[]; // Backup plans
}

export interface Constraint {
  type: 'resource' | 'temporal' | 'normative' | 'physical';
  description: string;
  value: string | number | boolean | Date | Record<string, unknown>;
}

export interface Condition {
  type: 'belief' | 'state' | 'resource';
  requirement: string;
  satisfied: boolean;
}

export interface Outcome {
  description: string;
  probability: number;
  utility: number; // How good/bad this outcome is
  effects: StateChange[];
}

export interface StateChange {
  variable: string;
  from: unknown;
  to: unknown;
  confidence: number;
}

export interface MentalState {
  agentId: string;
  agentType: 'human' | 'ai' | 'system';
  beliefs: Map<string, Belief>;
  desires: Map<string, Desire>;
  intentions: Map<string, Intention>;
  emotions?: EmotionalState;
  personality?: PersonalityTraits;
  lastUpdated: string;
}

export interface EmotionalState {
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
  dominance: number; // 0 to 1 (submissive to dominant)
  primaryEmotion?: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust';
  intensity: number; // 0-1
}

export interface PersonalityTraits {
  openness: number; // 0-1
  conscientiousness: number; // 0-1
  extraversion: number; // 0-1
  agreeableness: number; // 0-1
  neuroticism: number; // 0-1
  riskTolerance: number; // 0-1
  cooperativeness: number; // 0-1
}

export interface TheoryOfMindModel {
  self: MentalState; // Own mental state
  others: Map<string, MentalState>; // Mental states of other agents
  sharedBeliefs: Map<string, SharedBelief>; // Common ground
  socialContext: SocialContext;
  interactionHistory: Interaction[];
}

export interface SharedBelief {
  belief: Belief;
  knownBy: Set<string>; // Agent IDs who share this belief
  establishedAt: string;
  certainty: number; // How certain we are that others share this belief
}

export interface SocialContext {
  relationships: Map<string, Relationship>;
  norms: SocialNorm[];
  roles: Map<string, Role>;
  culture?: CulturalContext;
}

export interface Relationship {
  agentA: string;
  agentB: string;
  type: 'peer' | 'superior' | 'subordinate' | 'partner' | 'competitor' | 'neutral';
  trust: number; // -1 to 1
  affinity: number; // -1 to 1
  history: RelationshipEvent[];
}

export interface RelationshipEvent {
  id?: string;
  type: string;
  timestamp: string;
  description?: string;
  impact?: number;
}

export interface SocialNorm {
  id: string;
  description: string;
  applicability: (context: Record<string, unknown>) => boolean;
  expectedBehavior: string;
  violationConsequence?: string;
}

export interface Role {
  agentId: string;
  roleType: string;
  responsibilities: string[];
  authority: string[];
  expectations: string[];
}

export interface CulturalContext {
  communicationStyle: 'direct' | 'indirect' | 'formal' | 'casual';
  decisionMaking: 'individual' | 'consensus' | 'hierarchical';
  conflictResolution: 'confrontational' | 'avoidance' | 'mediation';
  timeOrientation: 'short-term' | 'long-term';
}

export interface Interaction {
  id: string;
  participants: string[];
  timestamp: string;
  type: 'communication' | 'cooperation' | 'negotiation' | 'conflict';
  content: InteractionContent;
  outcomes: InteractionOutcome[];
}

export interface InteractionContent {
  messages?: Message[];
  actions?: Action[];
  context: Record<string, unknown>;
}

export interface Message {
  sender: string;
  content: string;
  intent?: CommunicativeIntent;
  interpretation?: MessageInterpretation;
}

export interface CommunicativeIntent {
  type: 'inform' | 'request' | 'promise' | 'threat' | 'question' | 'express';
  directMeaning: string;
  impliedMeaning?: string;
  illocutionaryForce?: string; // Speech act theory
}

export interface MessageInterpretation {
  literal: string;
  inferred: string;
  believedIntent: CommunicativeIntent;
  confidence: number;
}

export interface Action {
  agentId: string;
  actionType: string;
  parameters: Record<string, unknown>;
  observedBy: string[];
  interpretations: Map<string, ActionInterpretation>; // How each observer interpreted it
}

export interface ActionInterpretation {
  observer: string;
  believedIntent: string;
  believedGoal: string;
  rationality: number; // How rational the action seems to the observer
  surprisal: number; // How unexpected the action was
}

export interface InteractionOutcome {
  type: 'success' | 'failure' | 'partial' | 'ongoing';
  affectedAgents: string[];
  stateChanges: StateChange[];
  relationshipChanges?: RelationshipChange[];
}

export interface RelationshipChange {
  relationship: string; // relationship ID
  trustDelta: number;
  affinityDelta: number;
  reason: string;
}

// Recursive reasoning types
export interface RecursiveBelief {
  level: number; // 0 = direct belief, 1 = belief about belief, etc.
  holder: string; // Who holds this belief
  aboutAgent?: string; // Whose mental state is being modeled
  content: Belief | RecursiveBelief;
}

export interface PerspectiveTaking {
  viewpoint: string; // Agent ID whose perspective we're taking
  simulatedMentalState: MentalState;
  confidence: number;
  assumptions: Assumption[];
}

export interface Assumption {
  type: 'belief' | 'goal' | 'preference' | 'capability';
  content: string;
  basis: 'stereotype' | 'experience' | 'default' | 'communicated';
  confidence: number;
}

// Intention recognition types
export interface ObservedBehavior {
  agentId: string;
  actions: Action[];
  context: Record<string, unknown>;
  timestamp: string;
}

export interface IntentionHypothesis {
  intention: Intention;
  probability: number;
  supportingEvidence: Evidence[];
  alternativeExplanations: IntentionHypothesis[];
}

export interface BeliefUpdate {
  agentId: string;
  beliefId: string;
  previousState: Belief;
  newState: Belief;
  reason: 'new_evidence' | 'inference' | 'communication' | 'contradiction_resolution';
  evidence?: Evidence;
}

// Coordination types
export interface CoordinationPlan {
  goal: string;
  participants: Map<string, AgentRole>;
  sharedPlan: SharedPlan;
  contingencies: Contingency[];
  successCriteria: SuccessCriterion[];
}

export interface AgentRole {
  agentId: string;
  responsibilities: string[];
  requiredCapabilities: string[];
  expectedContribution: string;
  incentives?: Incentive[];
}

export interface SharedPlan {
  steps: PlanStep[];
  dependencies: Dependency[];
  timeline: Timeline;
  requiredResources: Resource[];
}

export interface PlanStep {
  id: string;
  description: string;
  assignedTo: string[];
  preconditions: Condition[];
  expectedDuration: number;
  criticality: 'critical' | 'important' | 'optional';
}

export interface Dependency {
  from: string; // step ID
  to: string; // step ID
  type: 'causal' | 'temporal' | 'resource';
  strength: 'hard' | 'soft';
}

export interface Contingency {
  trigger: Condition;
  alternativePlan: SharedPlan;
  probability: number;
}

export interface SuccessCriterion {
  description: string;
  measurable: boolean;
  evaluator: (state: Record<string, unknown>) => boolean;
}

export interface Incentive {
  type: 'reward' | 'punishment' | 'reputation' | 'reciprocal';
  value: unknown;
  condition: Condition;
}

export interface Resource {
  type: string;
  amount: number;
  owner?: string;
  sharable: boolean;
}

export interface Timeline {
  start: string;
  end?: string;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  deadline: string;
  deliverables: string[];
  responsible: string[];
}

// Empathy and emotional modeling
export interface EmpathyModel {
  targetAgent: string;
  emotionalSimulation: EmotionalState;
  situationalContext: Record<string, unknown>;
  affectiveForecast: AffectiveForecast;
  empathicConcern: number; // 0-1
  personalDistress: number; // 0-1
}

export interface AffectiveForecast {
  predictedEmotion: EmotionalState;
  confidence: number;
  timeHorizon: string;
  influencingFactors: string[];
}

// Trust and reputation
export interface TrustModel {
  trustor: string;
  trustee: string;
  competenceTrust: number; // Trust in ability
  benevolenceTrust: number; // Trust in good intentions
  integrityTrust: number; // Trust in principles
  predictabilityTrust: number; // Trust in consistency
  evidenceBase: TrustEvidence[];
}

export interface TrustEvidence {
  type: 'direct_experience' | 'reputation' | 'recommendation' | 'institutional';
  content: string;
  impact: number; // How much this evidence affects trust
  timestamp: string;
  decay: number; // How quickly this evidence loses relevance
}

export interface ReputationProfile {
  agentId: string;
  domain: string;
  score: number; // -1 to 1
  confidence: number;
  sources: ReputationSource[];
  history: ReputationEvent[];
}

export interface ReputationSource {
  reporterId: string;
  report: string;
  sentiment: number; // -1 to 1
  weight: number; // How much we trust this source
  timestamp: string;
}

export interface ReputationEvent {
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  impact: number;
  witnesses: string[];
  timestamp: string;
}

// Action pattern types for intention recognition
export interface ActionPattern {
  type: 'sequence' | 'repetition' | 'alternation' | 'escalation';
  actions?: Action[];
  actionType?: string;
  count?: number;
  frequency?: number;
  description?: string;
}

// Interaction pattern types
export interface InteractionPattern {
  type: string;
  description: string;
  frequency: number;
}

// Precondition types with specific structure
export interface TypedCondition extends Condition {
  type: 'belief' | 'state' | 'resource';
  requirement: string;
  satisfied: boolean;
}

// Situation context types
export interface SituationContext {
  [key: string]: unknown;
  resources?: Record<string, number>;
  advances?: Record<string, boolean>;
  threatens?: Record<string, boolean>;
  goalAchieved?: boolean;
}