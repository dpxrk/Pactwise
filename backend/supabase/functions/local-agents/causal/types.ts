// Causal Reasoning Types and Interfaces

export interface CausalNode {
  id: string;
  name: string;
  type: 'observed' | 'latent' | 'intervention';
  value?: unknown;
  domain?: unknown[]; // Possible values
  parents: string[];
  children: string[];
  metadata?: Record<string, unknown>;
}

export interface CausalEdge {
  from: string;
  to: string;
  strength?: number; // Edge weight/strength
  type: 'direct' | 'indirect' | 'spurious';
  mechanism?: (parentValue: any) => any; // Causal mechanism function
}

export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: Map<string, CausalEdge>;
  topologicalOrder?: string[];
}

export interface StructuralCausalModel {
  graph: CausalGraph;
  equations: Map<string, CausalEquation>;
  noiseDistributions: Map<string, NoiseDistribution>;
}

export interface CausalEquation {
  nodeId: string;
  // Structural equation: Y = f(parents, noise)
  compute: (parentValues: Map<string, unknown>, noise?: unknown) => unknown;
  isLinear: boolean;
  coefficients?: Map<string, number>; // For linear equations
}

export interface NoiseDistribution {
  nodeId: string;
  type: 'normal' | 'uniform' | 'bernoulli' | 'custom';
  parameters: Record<string, unknown>;
  sample: () => any;
}

export interface CausalQuery {
  type: 'observational' | 'interventional' | 'counterfactual';
  target: string | string[]; // Target variable(s)
  given?: Map<string, any>; // Conditioning variables
  intervention?: Map<string, any>; // do(X = x)
  evidence?: Map<string, any>; // For counterfactuals
}

export interface CausalEffect {
  query: CausalQuery;
  effect: number | Map<string, number>;
  confidence: number;
  identifiable: boolean;
  method: string; // Method used for identification
  explanation?: string;
}

export interface CounterfactualResult {
  query: CausalQuery;
  factual: Map<string, any>;
  counterfactual: Map<string, any>;
  difference: Map<string, any>;
  probability?: number;
  explanation: string;
}

export interface CausalInsight {
  type: 'direct_cause' | 'indirect_cause' | 'confounder' | 'collider' | 'mediator' | 'instrumental';
  source: string;
  target: string;
  strength: number;
  confidence: number;
  description: string;
  implications: string[];
}

export interface CausalPath {
  nodes: string[];
  edges: CausalEdge[];
  type: 'causal' | 'backdoor' | 'frontdoor';
  blocked: boolean;
  blockingSet?: string[];
}

export interface CausalDiscoveryResult {
  graph: CausalGraph;
  score: number;
  method: string;
  assumptions: string[];
  confidence: number;
  alternativeGraphs?: CausalGraph[];
}

export interface InterventionResult {
  intervention: Map<string, any>;
  outcomes: Map<string, any>;
  causalEffects: Map<string, number>;
  sideEffects: Map<string, any>;
  confidence: number;
}

export interface ConfounderSet {
  variables: string[];
  sufficient: boolean; // Sufficient for causal identification
  minimal: boolean; // Minimal adjustment set
  explanation: string;
}

export interface CausalQuestion {
  natural: string; // Natural language question
  formal: CausalQuery; // Formal representation
  answerType: 'value' | 'probability' | 'effect' | 'explanation';
}

export interface CausalAnswer {
  question: CausalQuestion;
  answer: unknown;
  confidence: number;
  methodology: string[];
  assumptions: string[];
  limitations: string[];
  visualization?: any; // Graph visualization data
}

// Causal Discovery Types
export interface CausalConstraint {
  type: 'independence' | 'dependence' | 'orientation';
  variables: string[];
  conditioning?: string[];
  satisfied: boolean;
}

export interface CausalSearchSpace {
  possibleEdges: Array<[string, string]>;
  forbiddenEdges: Array<[string, string]>;
  requiredEdges: Array<[string, string]>;
  tierOrdering?: string[][]; // Variables in temporal tiers
}

// Advanced Causal Concepts
export interface InstrumentalVariable {
  instrument: string;
  treatment: string;
  outcome: string;
  strength: number;
  validity: {
    relevance: boolean;
    exclusion: boolean;
    independence: boolean;
  };
}

export interface MediationAnalysis {
  treatment: string;
  mediator: string;
  outcome: string;
  directEffect: number;
  indirectEffect: number;
  totalEffect: number;
  proportionMediated: number;
}

export interface CausalBounds {
  query: CausalQuery;
  lowerBound: number;
  upperBound: number;
  tight: boolean; // Are bounds tight?
  method: string;
}

export interface TransportabilityResult {
  sourcePopulation: string;
  targetPopulation: string;
  query: CausalQuery;
  transportable: boolean;
  transported?: CausalEffect;
  requiredAssumptions: string[];
  selectionDiagram?: CausalGraph;
}