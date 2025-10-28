/**
 * Continual Learning System Types
 *
 * Implements advanced learning mechanisms that eliminate catastrophic forgetting
 * and enable lifelong knowledge accumulation through elastic weight consolidation,
 * progressive neural networks, and memory replay systems.
 */

export interface ContinualLearningState {
  taskId: string;
  taskSequenceNumber: number;
  knowledgeBase: KnowledgeBase;
  parameterImportance: ParameterImportance;
  memoryBuffer: ExperienceReplay;
  taskBoundaries: TaskBoundary[];
  performanceMetrics: PerformanceMetrics;
  consolidationState: ConsolidationState;
}

/**
 * Knowledge base that accumulates over time
 */
export interface KnowledgeBase {
  coreKnowledge: CoreKnowledge[];
  taskSpecificKnowledge: Map<string, TaskKnowledge>;
  crossTaskPatterns: CrossTaskPattern[];
  knowledgeGraph: KnowledgeGraph;
  retentionScores: Map<string, number>;
}

/**
 * Core knowledge that persists across all tasks
 */
export interface CoreKnowledge {
  id: string;
  concept: string;
  embedding: number[];
  importance: number;
  firstLearnedAt: Date;
  lastAccessedAt: Date;
  reinforcementCount: number;
  decay: number;
}

/**
 * Task-specific knowledge with protection levels
 */
export interface TaskKnowledge {
  taskId: string;
  knowledge: {
    id: string;
    content: Record<string, unknown>;
    type: 'skill' | 'fact' | 'pattern' | 'strategy';
    protectionLevel: number; // 0-1, higher means more protected from forgetting
  }[];
  taskContext: Record<string, unknown>;
  learnedAt: Date;
}

/**
 * Patterns that emerge across multiple tasks
 */
export interface CrossTaskPattern {
  id: string;
  pattern: string;
  sourceTasks: string[];
  confidence: number;
  applicability: string[];
  emergentBehavior?: string;
}

/**
 * Knowledge graph for semantic relationships
 */
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  clusters: KnowledgeCluster[];
}

export interface KnowledgeNode {
  id: string;
  content: Record<string, unknown>;
  type: string;
  embedding: number[];
  activationLevel: number;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: string;
  strength: number;
}

export interface KnowledgeCluster {
  id: string;
  nodeIds: string[];
  centroid: number[];
  coherence: number;
}

/**
 * Elastic Weight Consolidation (EWC) parameter importance
 */
export interface ParameterImportance {
  fisherInformation: Map<string, number[][]>; // Parameter -> Fisher Information Matrix
  parameterMeans: Map<string, number[]>; // Optimal parameters for each task
  importanceWeights: Map<string, number>; // Overall importance scores
  taskContributions: Map<string, Map<string, number>>; // Task -> Parameter -> Contribution
}

/**
 * Experience replay buffer for memory consolidation
 */
export interface ExperienceReplay {
  experiences: Experience[];
  priorityQueue: PriorityQueue<Experience>;
  replayPolicy: ReplayPolicy;
  compressionRatio: number;
}

export interface Experience {
  id: string;
  taskId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reward: number;
  importance: number;
  timestamp: Date;
  replayCount: number;
  compressed?: boolean;
}

export interface ReplayPolicy {
  strategy: 'uniform' | 'prioritized' | 'diverse' | 'adaptive';
  batchSize: number;
  replayFrequency: number;
  priorityExponent: number;
  diversityWeight: number;
}

export interface PriorityQueue<T> {
  items: Array<{ item: T; priority: number }>;
  maxSize: number;
}

/**
 * Task boundaries for detecting distribution shifts
 */
export interface TaskBoundary {
  taskId: string;
  startTime: Date;
  endTime?: Date;
  inputDistribution: Distribution;
  outputDistribution: Distribution;
  conceptDrift?: ConceptDrift;
}

export interface Distribution {
  mean: number[];
  variance: number[];
  samples: number;
  kurtosis?: number[];
  skewness?: number[];
}

export interface ConceptDrift {
  detected: boolean;
  driftType: 'gradual' | 'sudden' | 'incremental' | 'recurring';
  magnitude: number;
  affectedDimensions: number[];
}

/**
 * Performance tracking across tasks
 */
export interface PerformanceMetrics {
  taskPerformance: Map<string, TaskPerformance>;
  forwardTransfer: Map<string, number>; // Positive = beneficial
  backwardTransfer: Map<string, number>; // Negative = catastrophic forgetting
  overallPlasticity: number; // Ability to learn new tasks
  overallStability: number; // Ability to retain old knowledge
}

export interface TaskPerformance {
  taskId: string;
  initialPerformance: number;
  currentPerformance: number;
  peakPerformance: number;
  degradation: number;
  evaluationHistory: Array<{
    timestamp: Date;
    score: number;
    context?: Record<string, unknown>;
  }>;
}

/**
 * Knowledge consolidation state
 */
export interface ConsolidationState {
  lastConsolidation: Date;
  consolidationMethod: ConsolidationMethod;
  compressionLevel: number;
  synapticIntelligence: SynapticIntelligence;
  progressiveNetworks: ProgressiveNetwork[];
}

export interface ConsolidationMethod {
  type: 'sleep' | 'rehearsal' | 'generation' | 'distillation';
  parameters: Record<string, unknown>;
  schedule: ConsolidationSchedule;
}

export interface ConsolidationSchedule {
  frequency: 'continuous' | 'periodic' | 'triggered';
  interval?: number;
  triggers?: string[];
}

export interface SynapticIntelligence {
  synapticImportance: Map<string, number>;
  pathIntegral: Map<string, number>;
  updateFrequency: number;
}

export interface ProgressiveNetwork {
  columnId: string;
  taskId: string;
  frozen: boolean;
  lateralConnections: Map<string, number[]>; // Connections to other columns
  capacity: number;
  utilization: number;
}

/**
 * Learning strategies for continual learning
 */
export interface LearningStrategy {
  name: string;
  type: 'regularization' | 'rehearsal' | 'architectural' | 'hybrid';
  hyperparameters: Record<string, unknown>;
  adaptiveSchedule?: AdaptiveSchedule;
}

export interface AdaptiveSchedule {
  metric: string;
  thresholds: number[];
  actions: string[];
  currentPhase: number;
}

/**
 * Memory management for efficient storage
 */
export interface MemoryManagement {
  totalCapacity: number;
  usedCapacity: number;
  compressionEnabled: boolean;
  pruningStrategy: PruningStrategy;
  hierarchicalStorage: HierarchicalStorage;
}

export interface PruningStrategy {
  method: 'lru' | 'importance' | 'redundancy' | 'hybrid';
  threshold: number;
  protectedMemories: Set<string>;
}

export interface HierarchicalStorage {
  levels: StorageLevel[];
  migrationPolicy: MigrationPolicy;
}

export interface StorageLevel {
  name: string;
  capacity: number;
  accessSpeed: number;
  retentionPeriod: number;
  compressionRatio: number;
}

export interface MigrationPolicy {
  upwardThreshold: number; // Move to faster storage
  downwardThreshold: number; // Move to slower storage
  migrationBatchSize: number;
}

/**
 * Continual learning analysis results
 */
export interface ContinualLearningAnalysis {
  stabilityPlasticityTradeoff: number;
  knowledgeRetention: number;
  transferEfficiency: number;
  memoryEfficiency: number;
  adaptationSpeed: number;
  recommendations: LearningRecommendation[];
}

export interface LearningRecommendation {
  type: 'consolidation' | 'rehearsal' | 'architecture' | 'hyperparameter';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImprovement: number;
  implementation: Record<string, unknown>;
}

/**
 * Integration with existing agent systems
 */
export interface ContinualLearningConfig {
  enabled: boolean;
  strategy: LearningStrategy;
  memoryManagement: MemoryManagement;
  consolidationSchedule: ConsolidationSchedule;
  performanceThresholds: {
    minRetention: number;
    maxForgetting: number;
    targetPlasticity: number;
  };
  integrationMode: 'standalone' | 'hybrid' | 'distributed';
}