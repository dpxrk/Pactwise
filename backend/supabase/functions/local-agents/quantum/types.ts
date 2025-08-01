// Quantum-Inspired Optimization Types and Interfaces

export interface QuantumState {
  amplitudes: Complex[]; // Probability amplitudes
  basis: string[]; // Computational basis states
  dimension: number; // Hilbert space dimension
  entanglements: Entanglement[]; // Entangled qubits
}

export interface Complex {
  real: number;
  imaginary: number;
  magnitude?: number;
  phase?: number;
}

export interface Qubit {
  id: string;
  state: QuantumState;
  measurement?: number; // 0 or 1 after measurement
  entangledWith: string[]; // Other qubit IDs
}

export interface QuantumRegister {
  qubits: Map<string, Qubit>;
  size: number;
  entanglementGraph: Map<string, Set<string>>;
}

export interface Entanglement {
  qubits: string[]; // Entangled qubit IDs
  type: 'bell' | 'ghz' | 'cluster' | 'custom';
  strength: number; // 0-1, degree of entanglement
  correlations: CorrelationMatrix;
}

export interface CorrelationMatrix {
  values: number[][]; // Correlation coefficients
  basis: string; // Measurement basis
}

// Quantum Gates and Operations
export interface QuantumGate {
  name: string;
  matrix: Complex[][]; // Unitary matrix
  qubits: number; // Number of qubits it acts on
  parameters?: number[]; // For parameterized gates
}

export interface QuantumCircuit {
  gates: GateApplication[];
  qubits: number;
  depth: number; // Circuit depth
  measurements: Measurement[];
}

export interface GateApplication {
  gate: QuantumGate;
  targetQubits: number[]; // Indices of target qubits
  controlQubits?: number[]; // For controlled gates
  timestamp: number; // Order of application
}

export interface Measurement {
  qubitIndex: number;
  basis: 'computational' | 'hadamard' | 'custom';
  outcome?: number; // Result after measurement
  probability?: number; // Probability of outcome
}

// Quantum Algorithms
export interface QuantumAlgorithm {
  name: string;
  type: 'optimization' | 'search' | 'simulation' | 'ml';
  requiredQubits: number;
  circuit: QuantumCircuit;
  classicalPreprocessing?: (input: any) => any;
  classicalPostprocessing?: (measurements: number[]) => any;
}

// Quantum Annealing
export interface AnnealingSchedule {
  initialHamiltonian: Hamiltonian;
  finalHamiltonian: Hamiltonian;
  schedule: (t: number) => number; // Annealing parameter as function of time
  totalTime: number;
  steps: number;
}

export interface Hamiltonian {
  terms: HamiltonianTerm[];
  groundStateEnergy?: number;
  spectrum?: number[]; // Energy eigenvalues
}

export interface HamiltonianTerm {
  coefficient: number;
  operators: PauliOperator[];
  qubits: number[];
}

export interface PauliOperator {
  type: 'I' | 'X' | 'Y' | 'Z';
  qubit: number;
}

// Variational Quantum Algorithms
export interface VariationalQuantumAlgorithm {
  ansatz: QuantumCircuit; // Parameterized circuit
  costFunction: (parameters: number[]) => number;
  optimizer: ClassicalOptimizer;
  parameters: number[];
  convergenceThreshold: number;
}

export interface ClassicalOptimizer {
  type: 'gradient' | 'gradient-free' | 'hybrid';
  name: string;
  hyperparameters: Map<string, any>;
  optimize: (costFn: (params: number[]) => number, initial: number[]) => OptimizationResult;
}

export interface OptimizationResult {
  optimalParameters: number[];
  optimalValue: number;
  iterations: number;
  convergence: boolean;
  history: OptimizationStep[];
}

export interface OptimizationStep {
  parameters: number[];
  value: number;
  gradient?: number[];
  iteration: number;
}

// Quantum Inspired Classical Algorithms
export interface QuantumInspiredOptimizer {
  type: 'qaoa' | 'vqe' | 'quantum-annealing' | 'grover-inspired' | 'hhl-inspired';
  problemType: OptimizationProblemType;
  configuration: OptimizerConfig;
}

export interface OptimizationProblemType {
  category: 'combinatorial' | 'continuous' | 'mixed' | 'constraint-satisfaction';
  objectives: ObjectiveFunction[];
  constraints: Constraint[];
  variables: Variable[];
}

export interface ObjectiveFunction {
  id: string;
  expression: (variables: Map<string, any>) => number;
  type: 'minimize' | 'maximize';
  weight: number; // For multi-objective
}

export interface Constraint {
  id: string;
  type: 'equality' | 'inequality' | 'boundary';
  expression: (variables: Map<string, any>) => number;
  bound: number;
  tolerance?: number;
}

export interface Variable {
  id: string;
  type: 'continuous' | 'discrete' | 'binary';
  domain: Domain;
  correlatedWith?: string[]; // Other variable IDs
}

export interface Domain {
  type: 'range' | 'set' | 'binary';
  values?: any[]; // For discrete domains
  min?: number; // For continuous
  max?: number; // For continuous
}

export interface OptimizerConfig {
  maxIterations: number;
  convergenceTolerance: number;
  populationSize?: number; // For population-based methods
  quantumInspiredFeatures: QuantumFeature[];
  hybridMode?: HybridConfig;
}

export interface QuantumFeature {
  type: 'superposition' | 'entanglement' | 'interference' | 'tunneling';
  strength: number; // 0-1, how much to use this feature
  parameters: Map<string, any>;
}

export interface HybridConfig {
  classicalRatio: number; // 0-1, portion of classical computation
  quantumRatio: number; // 0-1, portion of quantum-inspired computation
  switchingStrategy: 'adaptive' | 'fixed' | 'problem-dependent';
}

// Quantum Machine Learning
export interface QuantumNeuralNetwork {
  layers: QuantumLayer[];
  inputEncoding: EncodingScheme;
  outputDecoding: DecodingScheme;
  lossFunction: (predicted: number[], actual: number[]) => number;
}

export interface QuantumLayer {
  type: 'variational' | 'convolutional' | 'pooling' | 'entangling';
  qubits: number;
  gates: QuantumGate[];
  parameters: number[];
  activation?: QuantumActivation;
}

export interface EncodingScheme {
  type: 'amplitude' | 'basis' | 'angle' | 'kernel';
  encode: (classical: number[]) => QuantumState;
}

export interface DecodingScheme {
  type: 'measurement' | 'expectation' | 'density-matrix';
  decode: (quantum: QuantumState) => number[];
}

export interface QuantumActivation {
  name: string;
  apply: (state: QuantumState) => QuantumState;
  derivative?: (state: QuantumState) => QuantumState;
}

// Quantum Advantage Metrics
export interface QuantumAdvantage {
  speedup: number; // Quantum vs classical time ratio
  accuracyImprovement: number; // Relative improvement
  resourceReduction: number; // Memory/energy savings
  problemSize: number; // Size where advantage appears
  confidence: number; // Statistical confidence
}

export interface BenchmarkResult {
  algorithm: string;
  problemInstance: any;
  classicalTime: number;
  quantumInspiredTime: number;
  classicalAccuracy: number;
  quantumInspiredAccuracy: number;
  quantumAdvantage: QuantumAdvantage;
}

// Problem-specific quantum structures
export interface QuantumSATSolver {
  clauses: Clause[];
  variables: number;
  groverIterations: number;
  oracle: QuantumCircuit;
  diffuser: QuantumCircuit;
}

export interface Clause {
  literals: Literal[];
  satisfied?: boolean;
}

export interface Literal {
  variable: number;
  negated: boolean;
}

export interface QuantumPortfolioOptimizer {
  assets: Asset[];
  correlationMatrix: number[][];
  riskTolerance: number;
  expectedReturns: number[];
  quantumRiskModel: QuantumCircuit;
}

export interface Asset {
  id: string;
  symbol: string;
  weight?: number;
  constraints?: AssetConstraint[];
}

export interface AssetConstraint {
  type: 'min-weight' | 'max-weight' | 'sector-limit';
  value: number;
}

// Quantum Error Mitigation (for noisy quantum-inspired algorithms)
export interface NoiseModel {
  type: 'depolarizing' | 'amplitude-damping' | 'phase-damping' | 'custom';
  strength: number;
  affectedQubits: number[];
}

export interface ErrorMitigation {
  technique: 'zero-noise-extrapolation' | 'probabilistic-cancellation' | 'symmetry-verification';
  overhead: number; // Additional computational cost
  improvement: number; // Error reduction factor
}

// Quantum Tensor Networks (for efficient classical simulation)
export interface TensorNetwork {
  tensors: Map<string, Tensor>;
  contractionOrder: ContractionStep[];
  bondDimension: number; // Maximum dimension of indices
}

export interface Tensor {
  id: string;
  data: number[] | Complex[]; // Flattened tensor data
  shape: number[]; // Dimensions
  indices: TensorIndex[];
}

export interface TensorIndex {
  name: string;
  dimension: number;
  type: 'physical' | 'virtual'; // Physical = qubit, Virtual = bond
}

export interface ContractionStep {
  tensor1: string;
  tensor2: string;
  contractedIndices: string[];
  resultTensor: string;
}

// Integration with classical optimization
export interface HybridOptimizationProblem {
  classicalVariables: Variable[];
  quantumVariables: Variable[];
  couplingStrength: number; // How strongly quantum and classical parts interact
  decomposition: ProblemDecomposition;
}

export interface ProblemDecomposition {
  classicalSubproblems: OptimizationProblemType[];
  quantumSubproblems: OptimizationProblemType[];
  interface: VariableMapping[];
}

export interface VariableMapping {
  classicalVar: string;
  quantumVar: string;
  mappingFunction: (classical: any) => any;
  inverseMappingFunction: (quantum: any) => any;
}