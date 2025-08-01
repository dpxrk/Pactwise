// Causal reasoning and analysis type definitions

export interface Evidence {
  type: 'observational' | 'experimental' | 'theoretical';
  source: string;
  strength: number;
  description?: string;
}

export interface CausalModel {
  id: string;
  name: string;
  description?: string;
  variables: CausalVariable[];
  relationships: CausalRelationship[];
  assumptions: Assumption[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface CausalVariable {
  id: string;
  name: string;
  type: 'continuous' | 'discrete' | 'binary' | 'categorical';
  description?: string;
  values?: unknown[];
  range?: { min: number; max: number };
  unit?: string;
  observable: boolean;
  confounding?: boolean;
}

export interface CausalRelationship {
  id: string;
  from: string; // variable id
  to: string; // variable id
  type: 'direct' | 'indirect' | 'bidirectional' | 'confounded';
  strength: number; // -1 to 1
  confidence: number; // 0 to 1
  mechanism?: string;
  timelag?: number; // in relevant units
  evidence?: Evidence[];
}

export interface Assumption {
  id: string;
  type: 'independence' | 'exclusion' | 'sufficiency' | 'faithfulness';
  description: string;
  variables: string[]; // variable ids
  testable: boolean;
  validated?: boolean;
}

export interface CausalQuery {
  type: 'effect' | 'cause' | 'mediation' | 'confounding' | 'counterfactual';
  target: string; // variable id
  intervention?: Intervention;
  condition?: Condition;
  context?: Record<string, unknown>;
}

export interface Intervention {
  variable: string;
  value: unknown;
  type: 'do' | 'set' | 'increment';
}

export interface Condition {
  variable: string;
  operator: 'equals' | 'greater' | 'less' | 'in' | 'between';
  value: unknown;
}

export interface CausalAnalysisResult {
  query: CausalQuery;
  result: CausalEffect | CausalPath[] | Counterfactual;
  confidence: number;
  assumptions: string[];
  limitations: string[];
  recommendations?: string[];
}

export interface CausalEffect {
  variable: string;
  baseline: unknown;
  effect: unknown;
  change: number;
  standardError?: number;
  pValue?: number;
  confidenceInterval?: { lower: number; upper: number };
}

export interface CausalPath {
  path: string[]; // variable ids
  totalEffect: number;
  directEffect: number;
  indirectEffects: IndirectEffect[];
  strength: number;
}

export interface IndirectEffect {
  mediator: string;
  effect: number;
  proportion: number; // of total effect
}

export interface Counterfactual {
  scenario: string;
  actual: Record<string, unknown>;
  counterfactual: Record<string, unknown>;
  difference: Record<string, unknown>;
  probability?: number;
}

export interface CausalDiscovery {
  data: DataPoint[];
  algorithm: 'pc' | 'ges' | 'lingam' | 'fci';
  constraints?: DiscoveryConstraint[];
  result: DiscoveredModel;
}

export interface DataPoint {
  timestamp?: string;
  values: Record<string, unknown>;
  weight?: number;
}

export interface DiscoveryConstraint {
  type: 'forbidden' | 'required' | 'tiers';
  variables: string[];
  details?: unknown;
}

export interface DiscoveredModel {
  graph: CausalModel;
  score: number;
  confidence: number;
  alternativeGraphs?: CausalModel[];
  diagnostics: ModelDiagnostics;
}

export interface ModelDiagnostics {
  fit: number;
  complexity: number;
  stability: number;
  violations: string[];
}

export interface CausalIntervention {
  id: string;
  name: string;
  description: string;
  targetVariable: string;
  interventionType: 'policy' | 'treatment' | 'prevention';
  expectedEffect: CausalEffect;
  cost?: number;
  feasibility: 'low' | 'medium' | 'high';
  risks: InterventionRisk[];
  timeline?: string;
}

export interface InterventionRisk {
  type: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
}

export interface CausalQuestion {
  type: 'effect' | 'cause' | 'mediation' | 'confounding';
  target: string | string[];
  intervention?: Map<string, unknown>;
  conditions?: Map<string, unknown>;
}

export interface InterventionGoal {
  targetVariable: string;
  desiredValue?: unknown;
  constraints?: Array<{
    variable: string;
    minValue?: unknown;
    maxValue?: unknown;
  }>;
}

export interface InterventionRecommendation {
  intervention: Map<string, unknown>;
  expectedEffect: number;
  confidence: number;
  risks: InterventionRisk[];
}

export interface CounterfactualScenario {
  originalState: Map<string, unknown>;
  alternativeState: Map<string, unknown>;
  targetVariables: string[];
}

export interface CounterfactualResult {
  variable: string;
  originalValue: unknown;
  counterfactualValue: unknown;
  difference: number;
  confidence: number;
}