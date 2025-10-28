/**
 * AI-specific type definitions for Donna, Theory of Mind, Causal, Quantum, and Swarm systems
 */

import { AgentContext, Task, AgentResult } from './agent-core';

// Donna AI types
export interface DonnaLearningInput {
  enterpriseId: string;
  eventType: string;
  data: DonnaEventData;
  outcome: DonnaOutcome;
  metadata?: Record<string, unknown>;
}

export interface DonnaEventData {
  taskType: string;
  agentType: string;
  input: Record<string, unknown>;
  context: AgentContext;
  features: DonnaFeatures;
}

export interface DonnaFeatures {
  complexity: number;
  urgency: number;
  dataVolume: number;
  dependencies: string[];
  customFeatures?: Record<string, number>;
}

export interface DonnaOutcome {
  success: boolean;
  performanceScore: number;
  executionTime: number;
  accuracy?: number;
  userSatisfaction?: number;
  metrics: Record<string, number>;
}

export interface DonnaInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'optimization' | 'warning';
  confidence: number;
  content: DonnaInsightContent;
  applicability: DonnaApplicability;
  createdAt: Date;
  validUntil?: Date;
}

export interface DonnaInsightContent {
  title: string;
  description: string;
  data: Record<string, unknown>;
  supportingEvidence: Evidence[];
  actionableSteps?: ActionableStep[];
}

export interface Evidence {
  source: string;
  dataPoints: number;
  confidence: number;
  summary: string;
}

export interface ActionableStep {
  step: number;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number;
}

export interface DonnaApplicability {
  industries?: string[];
  companySize?: ('small' | 'medium' | 'large' | 'enterprise')[];
  useCases?: string[];
  excludedScenarios?: string[];
}

export interface DonnaKnowledgeBase {
  patterns: LearnedPattern[];
  bestPractices: BestPractice[];
  optimizations: Optimization[];
  warnings: KnowledgeWarning[];
}

export interface LearnedPattern {
  id: string;
  pattern: string;
  frequency: number;
  successRate: number;
  context: PatternContext;
  extractedAt: Date;
}

export interface PatternContext {
  taskTypes: string[];
  industries: string[];
  dataCharacteristics: Record<string, unknown>;
}

export interface BestPractice {
  id: string;
  category: string;
  practice: string;
  evidence: Evidence[];
  applicability: DonnaApplicability;
  priority: number;
}

export interface Optimization {
  id: string;
  target: 'performance' | 'accuracy' | 'cost' | 'quality';
  description: string;
  expectedImprovement: number;
  implementation: string;
  effort: 'low' | 'medium' | 'high';
}

export interface KnowledgeWarning {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  warning: string;
  triggers: string[];
  mitigation: string;
}

// Theory of Mind types
export interface MentalState {
  userId: string;
  beliefs: Belief[];
  goals: Goal[];
  intentions: Intention[];
  emotions: EmotionalState;
  preferences: UserPreference[];
  workload: WorkloadState;
  updatedAt: Date;
}

export interface Belief {
  id: string;
  content: string;
  confidence: number;
  source: 'stated' | 'inferred' | 'observed';
  supportingEvidence: Evidence[];
  contradictions?: string[];
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  status: 'active' | 'achieved' | 'abandoned' | 'blocked';
  subgoals?: string[];
  deadline?: Date;
  progress: number;
}

export interface Intention {
  id: string;
  action: string;
  goalId: string;
  plannedAt: Date;
  executedAt?: Date;
  status: 'planned' | 'executing' | 'completed' | 'cancelled';
  confidence: number;
}

export interface EmotionalState {
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
  dominantEmotion?: 'satisfied' | 'frustrated' | 'confused' | 'confident' | 'anxious' | 'neutral';
  factors: EmotionalFactor[];
  timestamp: Date;
}

export interface EmotionalFactor {
  factor: string;
  impact: number;
  source: string;
}

export interface UserPreference {
  category: string;
  preference: string;
  strength: number;
  learnedFrom: 'explicit' | 'implicit';
  examples: string[];
}

export interface WorkloadState {
  currentLoad: number; // 0 to 1
  capacity: number;
  stressLevel: number; // 0 to 1
  pendingTasks: number;
  overdueTasks: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface TeamDynamics {
  teamId: string;
  members: TeamMember[];
  relationships: MemberRelationship[];
  communicationPatterns: CommunicationPattern[];
  collaborationScore: number;
  conflicts?: Conflict[];
}

export interface TeamMember {
  userId: string;
  role: string;
  expertise: string[];
  availability: number; // 0 to 1
  contributionScore: number;
  mentalState: MentalState;
}

export interface MemberRelationship {
  userId1: string;
  userId2: string;
  relationshipType: 'collaborative' | 'competitive' | 'neutral' | 'conflicting';
  strength: number;
  history: InteractionHistory[];
}

export interface InteractionHistory {
  timestamp: Date;
  interactionType: string;
  outcome: 'positive' | 'neutral' | 'negative';
  context: string;
}

export interface CommunicationPattern {
  pattern: string;
  frequency: number;
  effectiveness: number;
  participants: string[];
}

export interface Conflict {
  id: string;
  type: 'task' | 'process' | 'relationship' | 'values';
  severity: number;
  parties: string[];
  description: string;
  detectedAt: Date;
  resolved: boolean;
  resolution?: string;
}

// Causal Analysis types
export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  metadata: CausalGraphMetadata;
}

export interface CausalNode {
  id: string;
  variable: string;
  type: 'cause' | 'effect' | 'mediator' | 'confounder';
  observed: boolean;
  values?: unknown[];
  distribution?: Distribution;
}

export interface CausalEdge {
  source: string;
  target: string;
  strength: number;
  confidence: number;
  mechanism?: string;
  lagTime?: number; // in seconds
  directionality: 'forward' | 'bidirectional' | 'uncertain';
}

export interface CausalGraphMetadata {
  domain: string;
  createdAt: Date;
  updatedAt: Date;
  dataSource: string;
  sampleSize: number;
  timeRange?: TimeRange;
}

export interface Distribution {
  type: 'normal' | 'binomial' | 'categorical' | 'exponential' | 'custom';
  parameters: Record<string, number>;
  samples?: number[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface CausalIntervention {
  id: string;
  targetVariable: string;
  interventionType: 'do' | 'observe' | 'counterfactual';
  value: unknown;
  context: Record<string, unknown>;
  expectedEffects: CausalEffect[];
}

export interface CausalEffect {
  variable: string;
  expectedChange: number;
  confidence: number;
  mechanism: string;
  timeToEffect?: number;
}

export interface CounterfactualQuery {
  observed: Record<string, unknown>;
  intervention: Record<string, unknown>;
  query: string[];
}

export interface CounterfactualResult {
  query: CounterfactualQuery;
  results: Record<string, unknown>;
  probability: number;
  explanation: string;
}

// Quantum-inspired types
export interface QuantumState<T = unknown> {
  superposition: StateComponent<T>[];
  entanglements: QuantumEntanglement[];
  measurementTime?: Date;
  collapsed: boolean;
}

export interface StateComponent<T = unknown> {
  state: T;
  amplitude: number; // probability amplitude
  phase: number; // 0 to 2π
}

export interface QuantumEntanglement {
  qubit1: string;
  qubit2: string;
  correlationType: 'positive' | 'negative' | 'complex';
  strength: number;
}

export interface QuantumMeasurement<T = unknown> {
  observable: string;
  result: T;
  probability: number;
  collapsedState: T;
  measurementBasis: string;
  timestamp: Date;
}

export interface QuantumOptimizationProblem {
  id: string;
  objective: ObjectiveFunction;
  constraints: Constraint[];
  variables: OptimizationVariable[];
  algorithm: 'QAOA' | 'VQE' | 'grover' | 'annealing';
  parameters: QuantumAlgorithmParams;
}

export interface ObjectiveFunction {
  type: 'minimize' | 'maximize';
  expression: string;
  variables: string[];
}

export interface Constraint {
  type: 'equality' | 'inequality' | 'bound';
  expression: string;
  value: number;
}

export interface OptimizationVariable {
  name: string;
  type: 'continuous' | 'discrete' | 'binary';
  bounds?: [number, number];
  initialValue?: number;
}

export interface QuantumAlgorithmParams {
  iterations: number;
  depth?: number;
  shots?: number;
  optimizer?: string;
  customParams?: Record<string, unknown>;
}

export interface QuantumSolution {
  problemId: string;
  optimalValue: number;
  optimalState: Record<string, unknown>;
  convergenceHistory: number[];
  executionTime: number;
  quality: number; // 0 to 1
}

// Swarm Intelligence types
export interface SwarmConfiguration {
  swarmId: string;
  agentCount: number;
  topology: SwarmTopology;
  algorithm: SwarmAlgorithm;
  parameters: SwarmParameters;
  objective: SwarmObjective;
}

export interface SwarmTopology {
  type: 'fully_connected' | 'ring' | 'star' | 'mesh' | 'custom';
  connections?: SwarmConnection[];
}

export interface SwarmConnection {
  from: string;
  to: string;
  weight: number;
  bidirectional: boolean;
}

export type SwarmAlgorithm = 'PSO' | 'ACO' | 'bee_colony' | 'firefly' | 'custom';

export interface SwarmParameters {
  inertia?: number;
  cognitiveWeight?: number;
  socialWeight?: number;
  evaporationRate?: number;
  pheromoneStrength?: number;
  customParams?: Record<string, number>;
}

export interface SwarmObjective {
  fitnessFunction: string;
  targetValue?: number;
  constraints?: Constraint[];
  multiObjective?: boolean;
  objectives?: ObjectiveFunction[];
}

export interface SwarmAgent {
  id: string;
  position: number[];
  velocity?: number[];
  fitness: number;
  personalBest?: AgentBest;
  memory?: SwarmAgentMemory;
  state: AgentState;
}

export interface AgentBest {
  position: number[];
  fitness: number;
  iteration: number;
}

export interface SwarmAgentMemory {
  visitedPositions: number[][];
  interactions: SwarmInteraction[];
  learnedPatterns: string[];
}

export interface SwarmInteraction {
  withAgent: string;
  interactionType: 'cooperation' | 'competition' | 'information_exchange';
  timestamp: Date;
  outcome: Record<string, unknown>;
}

export interface AgentState {
  status: 'exploring' | 'exploiting' | 'idle' | 'converged';
  energy?: number;
  age: number;
  lastUpdate: Date;
}

export interface SwarmConvergence {
  converged: boolean;
  iteration: number;
  bestFitness: number;
  bestPosition: number[];
  diversity: number; // measure of swarm spread
  stagnationCount: number;
}

// Continual Learning types
export interface LearningExperience {
  id: string;
  taskType: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  feedback: LearningFeedback;
  context: AgentContext;
  timestamp: Date;
  replayPriority: number;
}

export interface LearningFeedback {
  success: boolean;
  qualityScore: number;
  corrections?: Record<string, unknown>;
  userRating?: number;
  automaticMetrics: Record<string, number>;
}

export interface KnowledgeConsolidation {
  sessionId: string;
  experiences: string[]; // IDs of learning experiences
  consolidatedPatterns: ConsolidatedPattern[];
  forgottenPatterns: string[];
  timestamp: Date;
  method: 'rehearsal' | 'interference_reduction' | 'integration';
}

export interface ConsolidatedPattern {
  id: string;
  pattern: string;
  strength: number;
  generalization: number;
  applicableContexts: string[];
  examples: string[];
}

export interface CatastrophicForgettingMitigation {
  strategy: 'elastic_weight_consolidation' | 'progressive_neural_networks' | 'rehearsal' | 'generative_replay';
  parameters: Record<string, unknown>;
  protectedKnowledge: string[];
  importanceWeights?: Record<string, number>;
}

export interface ModelVersioning {
  version: string;
  timestamp: Date;
  performanceMetrics: Record<string, number>;
  knowledgeSnapshot: KnowledgeSnapshot;
  changesSinceLastVersion: ModelChange[];
}

export interface KnowledgeSnapshot {
  patternsCount: number;
  totalExperiences: number;
  domains: string[];
  capabilities: string[];
  checksum: string;
}

export interface ModelChange {
  changeType: 'addition' | 'modification' | 'deletion';
  component: string;
  description: string;
  impact: 'minor' | 'moderate' | 'major';
}

// Generic AI processing types
export interface AIProcessingRequest {
  requestId: string;
  processingType: 'analysis' | 'generation' | 'classification' | 'extraction' | 'prediction';
  input: AIInput;
  options: AIProcessingOptions;
  context: AgentContext;
}

export interface AIInput {
  data: unknown;
  format: 'text' | 'json' | 'binary' | 'structured';
  metadata?: Record<string, unknown>;
  preprocessed?: boolean;
}

export interface AIProcessingOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  streaming?: boolean;
  customParams?: Record<string, unknown>;
}

export interface AIProcessingResponse<T = unknown> {
  requestId: string;
  result: T;
  confidence: number;
  processingTime: number;
  modelUsed: string;
  tokensUsed?: number;
  metadata?: AIResponseMetadata;
}

export interface AIResponseMetadata {
  cached: boolean;
  retries: number;
  warnings?: string[];
  qualityIndicators?: Record<string, number>;
}

// Vector embedding types
export interface VectorEmbedding {
  id: string;
  vector: number[];
  dimensions: number;
  model: string;
  sourceText?: string;
  sourceType: string;
  metadata: EmbeddingMetadata;
  createdAt: Date;
}

export interface EmbeddingMetadata {
  entityId?: string;
  entityType?: string;
  chunkIndex?: number;
  totalChunks?: number;
  language?: string;
  customMetadata?: Record<string, unknown>;
}

export interface SimilaritySearchRequest {
  queryVector: number[];
  topK: number;
  filters?: EmbeddingFilter[];
  threshold?: number;
}

export interface EmbeddingFilter {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'gt' | 'lt';
  value: unknown;
}

export interface SimilaritySearchResult {
  id: string;
  score: number;
  embedding: VectorEmbedding;
  metadata: Record<string, unknown>;
}
