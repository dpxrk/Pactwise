// Swarm intelligence and multi-agent coordination type definitions

export interface SwarmConfig {
  populationSize: number;
  dimensions: number;
  topology: 'global' | 'ring' | 'star' | 'mesh' | 'dynamic';
  communicationRadius?: number;
  algorithm: SwarmAlgorithm;
  parameters: SwarmParameters;
}

export interface SwarmAlgorithm {
  type: 'pso' | 'aco' | 'bee' | 'firefly' | 'bat' | 'hybrid';
  variant?: string;
  customOperators?: CustomOperator[];
}

export interface CustomOperator {
  name: string;
  type: 'selection' | 'crossover' | 'mutation' | 'local_search';
  probability: number;
  parameters: Record<string, unknown>;
}

export interface SwarmParameters {
  inertiaWeight?: number;
  cognitiveCoefficient?: number;
  socialCoefficient?: number;
  evaporationRate?: number;
  pheromoneImportance?: number;
  heuristicImportance?: number;
  [key: string]: unknown;
}

export interface SwarmAgent {
  id: string;
  position: number[];
  velocity?: number[];
  fitness: number;
  personalBest: Solution;
  neighbors: string[];
  state: AgentState;
  memory?: AgentMemory;
}

export interface Solution {
  position: number[];
  fitness: number;
  constraints?: ConstraintViolation[];
  metadata?: Record<string, unknown>;
}

export interface ConstraintViolation {
  constraint: string;
  violation: number;
  penalty: number;
}

export interface AgentState {
  activity: 'exploring' | 'exploiting' | 'following' | 'leading';
  energy: number;
  experience: number;
  role?: 'scout' | 'worker' | 'leader' | 'specialist';
}

export interface AgentMemory {
  tabuList?: unknown[];
  visitedSolutions?: string[];
  successfulMoves?: Move[];
  knowledgeBase?: Record<string, unknown>;
}

export interface Move {
  from: number[];
  to: number[];
  improvement: number;
  timestamp: string;
}

export interface SwarmState {
  iteration: number;
  globalBest: Solution;
  population: SwarmAgent[];
  diversity: number;
  convergence: number;
  stagnation: number;
  communicationGraph?: CommunicationGraph;
}

export interface CommunicationGraph {
  nodes: string[]; // agent ids
  edges: Edge[];
  clusters?: Cluster[];
}

export interface Edge {
  from: string;
  to: string;
  weight: number;
  type?: 'unidirectional' | 'bidirectional';
}

export interface Cluster {
  id: string;
  members: string[];
  leader?: string;
  centroid: number[];
  cohesion: number;
}

export interface SwarmTask {
  id: string;
  type: 'optimization' | 'search' | 'classification' | 'clustering';
  objective: ObjectiveFunction;
  constraints?: Constraint[];
  searchSpace: SearchSpace;
  terminationCriteria: TerminationCriteria;
}

export interface ObjectiveFunction {
  type: 'minimize' | 'maximize';
  expression?: string;
  evaluate: (solution: number[]) => number;
  gradient?: (solution: number[]) => number[];
}

export interface Constraint {
  type: 'equality' | 'inequality' | 'boundary';
  expression: string;
  evaluate: (solution: number[]) => number;
  penalty?: number;
}

export interface SearchSpace {
  dimensions: number;
  bounds: Bounds[];
  discrete?: boolean[];
  resolution?: number[];
}

export interface Bounds {
  lower: number;
  upper: number;
  type?: 'continuous' | 'discrete' | 'integer';
}

export interface TerminationCriteria {
  maxIterations?: number;
  maxTime?: number; // milliseconds
  targetFitness?: number;
  minImprovement?: number;
  stagnationLimit?: number;
}

export interface SwarmPerformance {
  bestFitness: number[];
  averageFitness: number[];
  diversity: number[];
  convergenceRate: number;
  computationTime: number;
  iterationsUsed: number;
  successRate?: number;
}

export interface EmergentBehavior {
  type: 'flocking' | 'clustering' | 'pattern_formation' | 'synchronization';
  strength: number;
  participants: string[];
  characteristics: Record<string, unknown>;
  timestamp: string;
}

export interface CollectiveIntelligence {
  problemSolvingCapability: number;
  adaptability: number;
  robustness: number;
  scalability: number;
  emergentProperties: EmergentBehavior[];
}

export interface SwarmCommunication {
  type: 'direct' | 'stigmergic' | 'broadcast' | 'gossip';
  message: SwarmMessage;
  sender: string;
  receivers: string[];
  timestamp: string;
}

export interface SwarmMessage {
  type: 'solution' | 'warning' | 'discovery' | 'coordination';
  content: unknown;
  priority: number;
  ttl?: number; // time to live
}