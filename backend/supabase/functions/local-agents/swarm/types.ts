/**
 * Swarm Intelligence Type System
 *
 * Revolutionary collective intelligence framework enabling emergent behaviors,
 * distributed problem-solving, and collective decision-making that exceeds
 * individual agent capabilities.
 */

export interface SwarmAgent {
  id: string;
  type: SwarmAgentType;
  state: AgentState;
  position: Position;
  velocity: Velocity;
  fitness: number;
  memory: LocalMemory;
  neighbors: string[];
  role: SwarmRole;
  pheromones: PheromoneDeposit[];
  messages: SwarmMessage[];
  propose?: (proposal: Proposal) => void;
  vote?: (proposal: Proposal) => Vote;
  readPheromones?: () => PheromoneDeposit[];
  initializePheromoneField?: () => void;
}

export type SwarmAgentType =
  | 'explorer'      // Searches solution space
  | 'worker'        // Executes specific tasks
  | 'scout'         // Evaluates new opportunities
  | 'coordinator'   // Local coordination
  | 'aggregator'    // Information fusion
  | 'sentinel'      // Monitors for threats/changes
  | 'messenger'     // Information propagation
  | 'architect'     // Structure builder
  | 'harvester'     // Resource collector
  | 'innovator';    // Creates variations

export interface AgentState {
  energy: number;
  activity: ActivityState;
  knowledge: KnowledgeFragment[];
  currentTask: Task | null;
  exploration: number;  // Exploration vs exploitation balance
  commitment: number;   // Task commitment level
  influence: number;    // Social influence factor
}

export type ActivityState =
  | 'foraging'      // Searching for solutions
  | 'recruiting'    // Attracting others to solution
  | 'following'     // Following pheromone trails
  | 'dancing'       // Communicating findings (bee-inspired)
  | 'building'      // Constructing solutions
  | 'converging'    // Moving toward consensus
  | 'diverging'     // Exploring alternatives
  | 'synchronizing' // Aligning with swarm
  | 'innovating';   // Creating new patterns

export interface Position {
  dimensions: number[];  // N-dimensional solution space
  confidence: number;
  timestamp: number;
}

export interface Velocity {
  components: number[];  // Movement in solution space
  magnitude: number;
  inertia: number;      // Resistance to change
}

export interface LocalMemory {
  bestPosition: Position;
  bestFitness: number;
  tabuList: string[];   // Avoided solutions
  shortcuts: Map<string, Position>;
  patterns: Pattern[];
}

export interface SwarmRole {
  primary: SwarmAgentType;
  secondary: SwarmAgentType[];
  specialization: number;  // 0-1, how specialized
  flexibility: number;     // Ability to change roles
}

// Pheromone System (Stigmergic Communication)
export interface PheromoneDeposit {
  id: string;
  type: PheromoneType;
  position: Position;
  strength: number;
  evaporationRate: number;
  depositorId: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export type PheromoneType =
  | 'attraction'    // Positive signal
  | 'repulsion'     // Negative signal
  | 'trail'         // Path marker
  | 'alarm'         // Danger/problem
  | 'food'          // Resource/solution found
  | 'nest'          // Home/base marker
  | 'boundary'      // Territory marker
  | 'convergence'   // Meeting point
  | 'quality';      // Solution quality indicator

// Swarm Communication
export interface SwarmMessage {
  id: string;
  type: MessageType;
  senderId: string;
  recipientIds: string[] | 'broadcast';
  content: MessageContent;
  priority: number;
  ttl: number;  // Time to live
  hops: number; // Message propagation count
  timestamp: number;
}

export type MessageType =
  | 'discovery'     // Found something
  | 'recruitment'   // Need help
  | 'warning'       // Danger/issue
  | 'coordination'  // Synchronization
  | 'consensus'     // Agreement building
  | 'innovation'    // New approach
  | 'evaluation'    // Quality assessment
  | 'heartbeat';    // Alive signal

export interface MessageContent {
  topic: string;
  data: unknown;
  confidence: number;
  evidence: Evidence[];
}

// Collective Intelligence
export interface SwarmIntelligence {
  swarmId: string;
  size: number;
  agents: Map<string, SwarmAgent>;
  problem: ProblemDefinition;
  state: SwarmState;
  emergence: EmergentBehavior;
  performance: SwarmPerformance;
  consensus: ConsensusState;
  pheromoneField: PheromoneField;
  messageQueue?: SwarmMessage[];
  config: SwarmConfig;
}

export interface ProblemDefinition {
  id: string;
  type: ProblemType;
  dimensions: number;
  constraints: Constraint[];
  objectives: Objective[];
  searchSpace: SearchSpace;
  evaluationFunction: string; // Function name/id
}

export type ProblemType =
  | 'optimization'      // Find best solution
  | 'exploration'       // Map solution space
  | 'classification'    // Categorize data
  | 'prediction'        // Forecast outcomes
  | 'construction'      // Build structure
  | 'pathfinding'       // Find routes
  | 'clustering'        // Group similar items
  | 'consensus'         // Reach agreement
  | 'adaptation';       // Adapt to changes

export interface SwarmState {
  phase: SwarmPhase;
  convergence: number;      // 0-1, how converged
  diversity: number;        // 0-1, solution diversity
  coherence: number;        // 0-1, swarm coordination
  temperature: number;      // System energy/chaos
  polarization: number;     // Direction alignment
  clustering: number;       // Group formation
  efficiency: number;       // Resource utilization
}

export type SwarmPhase =
  | 'initialization'    // Starting up
  | 'exploration'       // Broad search
  | 'exploitation'      // Refining solutions
  | 'convergence'       // Coming together
  | 'stagnation'        // Stuck
  | 'divergence'        // Spreading out
  | 'reorganization'    // Restructuring
  | 'termination';      // Ending

// Emergent Behaviors
export interface EmergentBehavior {
  patterns: EmergentPattern[];
  formations: Formation[];
  cascades: InformationCascade[];
  synchronizations: Synchronization[];
  innovations: Innovation[];
}

export interface EmergentPattern {
  id: string;
  type: PatternType;
  strength: number;
  participants: string[];
  stability: number;
  benefit: number;
  description: string;
}

export type PatternType =
  | 'flocking'          // Coordinated movement
  | 'swarming'          // Surrounding target
  | 'foraging'          // Efficient search
  | 'sorting'           // Self-organization
  | 'clustering'        // Group formation
  | 'synchronization'   // Time alignment
  | 'wave'              // Propagating pattern
  | 'spiral'            // Rotating formation
  | 'branching'         // Tree-like growth
  | 'crystallization';  // Ordered structure

// Consensus Mechanisms
export interface ConsensusState {
  algorithm: ConsensusAlgorithm;
  proposals: Proposal[];
  votes: Map<string, Vote[]>;
  agreement: number;  // 0-1
  stability: number;  // How stable the consensus
  dissenters: string[];
  rounds: number;
  status: 'pending' | 'voting' | 'committed' | 'failed';
}

export type ConsensusAlgorithm =
  | 'honeybee'      // Waggle dance inspired
  | 'antcolony'     // Pheromone voting
  | 'byzantine'     // Byzantine fault tolerant
  | 'raft'          // Leader election
  | 'proof-of-work' // Computational consensus
  | 'liquid'        // Delegated voting
  | 'holographic';  // Reputation weighted

export interface Proposal {
  id: string;
  type: 'solution' | 'action' | 'parameter' | 'strategy';
  proposerId: string;
  content: unknown;
  fitness: number;
  support: number;
  priority: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

// Distributed Problem Solving
export interface DistributedSolution {
  problemId: string;
  fragments: SolutionFragment[];
  assembly: AssemblyStrategy;
  quality: number;
  completeness: number;
  contributors: string[];
  iterations: number;
}

export interface SolutionFragment {
  id: string;
  solverId: string;
  subproblem: string;
  solution: unknown;
  dependencies: string[];
  confidence: number;
  validated: boolean;
}

export type AssemblyStrategy =
  | 'hierarchical'   // Tree-based assembly
  | 'mosaic'         // Tile-based combination
  | 'consensus'      // Voting-based merge
  | 'weighted'       // Quality-weighted blend
  | 'evolutionary'   // Genetic combination
  | 'crystalline';   // Structured growth

// Swarm Optimization Algorithms
export interface OptimizationAlgorithm {
  type: AlgorithmType;
  parameters: AlgorithmParameters;
  operators: Operator[];
}

export type AlgorithmType =
  | 'pso'            // Particle Swarm Optimization
  | 'aco'            // Ant Colony Optimization
  | 'abc'            // Artificial Bee Colony
  | 'firefly'        // Firefly Algorithm
  | 'cuckoo'         // Cuckoo Search
  | 'wolf'           // Grey Wolf Optimizer
  | 'whale'          // Whale Optimization
  | 'dragonfly'      // Dragonfly Algorithm
  | 'grasshopper'    // Grasshopper Optimization
  | 'hybrid';        // Combined approaches

export interface AlgorithmParameters {
  populationSize: number;
  inertiaWeight: number;
  cognitiveWeight: number;
  socialWeight: number;
  evaporationRate: number;
  explorationRate: number;
  elitismRate: number;
  mutationRate: number;
  crossoverRate: number;
}

// Stigmergic Environment
export interface PheromoneField {
  grid: PheromoneCell[][][];  // 3D grid
  resolution: number;
  evaporationRate: number;
  diffusionRate: number;
  maxIntensity: number;
}

export interface PheromoneCell {
  position: Position;
  deposits: Map<PheromoneType, number>;
  lastUpdate: number;
  gradient: number[];  // Directional gradient
}

// Performance Metrics
export interface SwarmPerformance {
  efficiency: number;
  scalability: number;
  robustness: number;
  adaptability: number;
  convergenceSpeed: number;
  solutionQuality: number;
  resourceUsage: number;
  communicationOverhead: number;
  emergenceIndex: number;  // Collective > sum of parts
}

// Knowledge and Learning
export interface CollectiveKnowledge {
  facts: KnowledgeFact[];
  patterns: LearnedPattern[];
  strategies: Strategy[];
  heuristics: Heuristic[];
  innovations: Innovation[];
}

export interface KnowledgeFact {
  id: string;
  content: unknown;
  confidence: number;
  validators: string[];
  contradictions: string[];
  timestamp: number;
}

export interface LearnedPattern {
  id: string;
  trigger: Condition[];
  response: Action[];
  success: number;
  failures: number;
  adaptations: Adaptation[];
}

export interface Innovation {
  id: string;
  innovatorId: string;
  type: 'combination' | 'mutation' | 'inspiration' | 'accident';
  parent: string[];
  description: string;
  fitness: number;
  adopted: boolean;
  adopters: string[];
}

// Collective Decision Making
export interface CollectiveDecision {
  id: string;
  question: string;
  options: DecisionOption[];
  process: DecisionProcess;
  outcome: DecisionOutcome;
  participants: string[];
  duration: number;
}

export interface DecisionOption {
  id: string;
  description: string;
  proposerId: string;
  pros: string[];
  cons: string[];
  support: number;
  evidence: Evidence[];
}

export interface DecisionProcess {
  method: DecisionMethod;
  rounds: DecisionRound[];
  convergence: number[];
  influences: SocialInfluence[];
}

export type DecisionMethod =
  | 'quorum'         // Threshold-based
  | 'unanimity'      // Full agreement
  | 'majority'       // Simple majority
  | 'weighted'       // Influence-weighted
  | 'delegated'      // Liquid democracy
  | 'futarchy'       // Prediction market
  | 'holographic';   // Attention-weighted

// Utility Types
export interface Evidence {
  type: string;
  source: string;
  confidence: number;
  data: unknown;
}

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: unknown;
}

export interface Action {
  type: string;
  target: string;
  parameters: Record<string, unknown>;
}

export interface Constraint {
  type: 'hard' | 'soft';
  condition: Condition;
  penalty: number;
}

export interface Objective {
  name: string;
  weight: number;
  direction: 'minimize' | 'maximize';
  function: string;
}

export interface SearchSpace {
  dimensions: Dimension[];
  topology: 'continuous' | 'discrete' | 'mixed';
  boundaries: Boundary[];
}

export interface Dimension {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  range: [number, number] | string[];
  resolution: number;
}

export interface Boundary {
  type: 'wall' | 'wrap' | 'reflect';
  dimension: number;
  value: number;
}

export interface Formation {
  type: string;
  members: string[];
  center: Position;
  radius: number;
  stability: number;
}

export interface InformationCascade {
  id: string;
  initiator: string;
  information: unknown;
  spread: number;
  adopters: string[];
  resisters: string[];
  speed: number;
}

export interface Synchronization {
  type: 'phase' | 'frequency' | 'amplitude';
  participants: string[];
  coherence: number;
  period: number;
}

export interface Vote {
  voterId: string;
  proposalId: string;
  value: number;  // Can be weighted
  confidence: number;
  timestamp: number;
}

export interface Adaptation {
  trigger: string;
  change: unknown;
  success: boolean;
  timestamp: number;
}

export interface SocialInfluence {
  influencerId: string;
  influencedId: string;
  strength: number;
  type: 'peer' | 'authority' | 'reputation';
}

export interface DecisionRound {
  number: number;
  votes: Vote[];
  changes: number;
  consensus: number;
}

export interface DecisionOutcome {
  selectedOption: string;
  confidence: number;
  dissent: number;
  implementation: unknown;
}

export interface Operator {
  type: 'selection' | 'crossover' | 'mutation' | 'migration' | 'elitism';
  probability: number;
  parameters: Record<string, unknown>;
}

export interface KnowledgeFragment {
  id: string;
  type: string;
  content: unknown;
  source: string;
  confidence: number;
}

export interface Pattern {
  id: string;
  description: string;
  frequency: number;
  reliability: number;
}

export interface Task {
  id: string;
  type: string;
  priority: number;
  requirements: unknown;
  deadline?: number;
}

export interface Strategy {
  id: string;
  name: string;
  conditions: Condition[];
  actions: Action[];
  performance: number;
}

export interface Heuristic {
  id: string;
  rule: string;
  applicability: Condition[];
  effectiveness: number;
}

// Swarm Configuration
export interface SwarmConfig {
  algorithm: AlgorithmType;
  size: [number, number];  // Min, max agents
  topology: SwarmTopology;
  communication: CommunicationConfig;
  adaptation: AdaptationConfig;
  termination: TerminationCriteria;
}

export interface SwarmTopology {
  type: 'global' | 'ring' | 'star' | 'mesh' | 'dynamic' | 'small-world';
  connectivity: number;  // Average connections per agent
  rewiring: number;      // Probability of connection change
}

export interface CommunicationConfig {
  range: number;         // Communication radius
  bandwidth: number;     // Messages per timestep
  latency: number;       // Message delay
  reliability: number;   // Success probability
}

export interface AdaptationConfig {
  learningRate: number;
  memorySize: number;
  innovationRate: number;
  imitationRate: number;
}

export interface TerminationCriteria {
  maxIterations: number;
  targetFitness: number;
  stagnationLimit: number;
  consensusThreshold: number;
}