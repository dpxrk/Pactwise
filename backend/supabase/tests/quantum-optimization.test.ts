import { describe, it, expect, beforeEach } from 'vitest';
import { QuantumOptimizer } from '../functions/local-agents/quantum/quantum-optimizer.ts';
import { QuantumNeuralNetworkEngine } from '../functions/local-agents/quantum/quantum-neural-network.ts';
import { QuantumFinancialAgent } from '../functions/local-agents/agents/quantum-financial.ts';
import {
  OptimizationProblemType,
  OptimizerConfig,
  Variable,
  ObjectiveFunction,
  Constraint,
} from '../functions/local-agents/quantum/types.ts';
import { createMockSupabase } from '../../tests/setup';

describe('Quantum Optimization System', () => {
  let optimizer: QuantumOptimizer;
  let config: OptimizerConfig;
  let supabase: SupabaseClient;

  beforeEach(() => {
    config = {
      maxIterations: 100,
      convergenceTolerance: 1e-4,
      populationSize: 20,
      quantumInspiredFeatures: [
        { type: 'superposition', strength: 0.9, parameters: new Map() },
        { type: 'entanglement', strength: 0.8, parameters: new Map() },
        { type: 'interference', strength: 0.7, parameters: new Map() },
        { type: 'tunneling', strength: 0.6, parameters: new Map() },
      ],
    };
    optimizer = new QuantumOptimizer(config, 42); // Fixed seed for reproducibility
    supabase = createMockSupabase();
  });

  describe('QuantumOptimizer', () => {
    describe('Combinatorial Optimization', () => {
      it('should solve traveling salesman problem', async () => {
        const cities = 5;
        const distances = generateDistanceMatrix(cities);

        const variables: Variable[] = [];
        for (let i = 0; i < cities; i++) {
          for (let j = 0; j < cities; j++) {
            variables.push({
              id: `x_${i}_${j}`,
              type: 'binary',
              domain: { type: 'binary' },
            });
          }
        }

        const objectives: ObjectiveFunction[] = [{
          id: 'tsp_distance',
          expression: (vars: Map<string, any>) => {
            let totalDistance = 0;
            for (let i = 0; i < cities; i++) {
              for (let j = 0; j < cities; j++) {
                if (vars.get(`x_${i}_${j}`)) {
                  totalDistance += distances[i][j];
                }
              }
            }
            return totalDistance;
          },
          type: 'minimize',
          weight: 1.0,
        }];

        const constraints: Constraint[] = [];

        // Each city visited exactly once
        for (let i = 0; i < cities; i++) {
          constraints.push({
            id: `visit_${i}`,
            type: 'equality',
            expression: (vars: Map<string, any>) => {
              let sum = 0;
              for (let j = 0; j < cities; j++) {
                sum += vars.get(`x_${j}_${i}`) || 0;
              }
              return sum;
            },
            bound: 1,
          });
        }

        const problem: OptimizationProblemType = {
          category: 'combinatorial',
          objectives,
          constraints,
          variables,
        };

        const result = await optimizer.optimize(problem);

        expect(result.convergence).toBe(true);
        expect(result.optimalValue).toBeLessThan(Infinity);
        expect(result.iterations).toBeGreaterThan(0);

        // Verify valid tour
        const tour = extractTour(result.optimalParameters, cities);
        expect(tour.length).toBe(cities);
        expect(new Set(tour).size).toBe(cities); // All unique
      });

      it('should solve knapsack problem with quantum advantage', async () => {
        const items = [
          { weight: 10, value: 60 },
          { weight: 20, value: 100 },
          { weight: 30, value: 120 },
        ];
        const capacity = 50;

        const variables: Variable[] = items.map((_, i) => ({
          id: `item_${i}`,
          type: 'binary',
          domain: { type: 'binary' },
        }));

        const objectives: ObjectiveFunction[] = [{
          id: 'knapsack_value',
          expression: (vars: Map<string, any>) => {
            return items.reduce((sum, item, i) =>
              sum + (vars.get(`item_${i}`) || 0) * item.value, 0,
            );
          },
          type: 'maximize',
          weight: 1.0,
        }];

        const constraints: Constraint[] = [{
          id: 'capacity',
          type: 'inequality',
          expression: (vars: Map<string, any>) => {
            return items.reduce((sum, item, i) =>
              sum + (vars.get(`item_${i}`) || 0) * item.weight, 0,
            );
          },
          bound: capacity,
        }];

        const problem: OptimizationProblemType = {
          category: 'combinatorial',
          objectives,
          constraints,
          variables,
        };

        const result = await optimizer.optimize(problem);
        const advantage = optimizer.getQuantumAdvantage();

        expect(result.convergence).toBe(true);
        expect(result.optimalValue).toBe(220); // Known optimal
        expect(advantage).toBeDefined();
        expect(advantage!.speedup).toBeGreaterThan(1);
      });
    });

    describe('Continuous Optimization', () => {
      it('should minimize Rosenbrock function', async () => {
        const variables: Variable[] = [
          { id: 'x', type: 'continuous', domain: { type: 'range', min: -5, max: 5 } },
          { id: 'y', type: 'continuous', domain: { type: 'range', min: -5, max: 5 } },
        ];

        const objectives: ObjectiveFunction[] = [{
          id: 'rosenbrock',
          expression: (vars: Map<string, any>) => {
            const x = vars.get('x') || 0;
            const y = vars.get('y') || 0;
            return Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2);
          },
          type: 'minimize',
          weight: 1.0,
        }];

        const problem: OptimizationProblemType = {
          category: 'continuous',
          objectives,
          constraints: [],
          variables,
        };

        const result = await optimizer.optimize(problem);

        expect(result.convergence).toBe(true);
        expect(result.optimalValue).toBeLessThan(0.01); // Near zero
        expect(Math.abs(result.optimalParameters[0] - 1)).toBeLessThan(0.1); // x ≈ 1
        expect(Math.abs(result.optimalParameters[1] - 1)).toBeLessThan(0.1); // y ≈ 1
      });

      it('should handle constrained optimization', async () => {
        const variables: Variable[] = [
          { id: 'x1', type: 'continuous', domain: { type: 'range', min: 0, max: 10 } },
          { id: 'x2', type: 'continuous', domain: { type: 'range', min: 0, max: 10 } },
        ];

        const objectives: ObjectiveFunction[] = [{
          id: 'constrained_obj',
          expression: (vars: Map<string, any>) => {
            const x1 = vars.get('x1') || 0;
            const x2 = vars.get('x2') || 0;
            return -(x1 + 2 * x2); // Maximize x1 + 2*x2
          },
          type: 'minimize',
          weight: 1.0,
        }];

        const constraints: Constraint[] = [
          {
            id: 'constraint1',
            type: 'inequality',
            expression: (vars: Map<string, any>) => {
              const x1 = vars.get('x1') || 0;
              const x2 = vars.get('x2') || 0;
              return x1 + x2;
            },
            bound: 5,
          },
          {
            id: 'constraint2',
            type: 'inequality',
            expression: (vars: Map<string, any>) => {
              const x1 = vars.get('x1') || 0;
              const x2 = vars.get('x2') || 0;
              return 2 * x1 + x2;
            },
            bound: 8,
          },
        ];

        const problem: OptimizationProblemType = {
          category: 'continuous',
          objectives,
          constraints,
          variables,
        };

        const result = await optimizer.optimize(problem);

        expect(result.convergence).toBe(true);
        // Verify constraints are satisfied
        const x1 = result.optimalParameters[0];
        const x2 = result.optimalParameters[1];
        expect(x1 + x2).toBeLessThanOrEqual(5.01); // Small tolerance
        expect(2 * x1 + x2).toBeLessThanOrEqual(8.01);
      });
    });

    describe('Quantum Features', () => {
      it('should use superposition for parallel exploration', async () => {
        const problem = createTestProblem(10); // 10 variables
        const result = await optimizer.optimize(problem);

        expect(result.convergence).toBe(true);
        expect(result.history.length).toBeLessThan(50); // Efficient convergence
      });

      it('should use entanglement for correlated variables', async () => {
        const variables: Variable[] = [
          {
            id: 'x1',
            type: 'continuous',
            domain: { type: 'range', min: -5, max: 5 },
            correlatedWith: ['x2'],
          },
          {
            id: 'x2',
            type: 'continuous',
            domain: { type: 'range', min: -5, max: 5 },
            correlatedWith: ['x1'],
          },
        ];

        const objectives: ObjectiveFunction[] = [{
          id: 'correlated_obj',
          expression: (vars: Map<string, any>) => {
            const x1 = vars.get('x1') || 0;
            const x2 = vars.get('x2') || 0;
            // Correlated objective: minimum when x1 ≈ x2
            return Math.pow(x1 - x2, 2) + 0.1 * (x1 * x1 + x2 * x2);
          },
          type: 'minimize',
          weight: 1.0,
        }];

        const problem: OptimizationProblemType = {
          category: 'continuous',
          objectives,
          constraints: [],
          variables,
        };

        const result = await optimizer.optimize(problem);

        expect(result.convergence).toBe(true);
        expect(Math.abs(result.optimalParameters[0] - result.optimalParameters[1])).toBeLessThan(0.1);
      });

      it('should use quantum tunneling to escape local optima', async () => {
        // Multi-modal function with local optima
        const objectives: ObjectiveFunction[] = [{
          id: 'multimodal',
          expression: (vars: Map<string, any>) => {
            const x = vars.get('x') || 0;
            // Function with local minimum at x=0 and global minimum at x=5
            return 0.1 * x * x - Math.cos(x) + 0.01 * Math.pow(x - 5, 2);
          },
          type: 'minimize',
          weight: 1.0,
        }];

        const problem: OptimizationProblemType = {
          category: 'continuous',
          objectives,
          constraints: [],
          variables: [{
            id: 'x',
            type: 'continuous',
            domain: { type: 'range', min: -10, max: 10 },
          }],
        };

        const result = await optimizer.optimize(problem);

        // Should find global optimum near x=5, not local optimum at x=0
        expect(result.convergence).toBe(true);
        expect(Math.abs(result.optimalParameters[0] - 5)).toBeLessThan(2);
      });
    });

    describe('Hybrid Optimization', () => {
      it('should decompose and solve hybrid problems', async () => {
        // Mix of discrete and continuous variables
        const variables: Variable[] = [
          { id: 'discrete1', type: 'discrete', domain: { type: 'set', values: [1, 2, 3, 4, 5] } },
          { id: 'continuous1', type: 'continuous', domain: { type: 'range', min: 0, max: 10 } },
          { id: 'binary1', type: 'binary', domain: { type: 'binary' } },
          { id: 'continuous2', type: 'continuous', domain: { type: 'range', min: -5, max: 5 } },
        ];

        const objectives: ObjectiveFunction[] = [{
          id: 'hybrid_obj',
          expression: (vars: Map<string, any>) => {
            const d1 = vars.get('discrete1') || 1;
            const c1 = vars.get('continuous1') || 0;
            const b1 = vars.get('binary1') || 0;
            const c2 = vars.get('continuous2') || 0;

            return d1 * c1 + b1 * Math.pow(c2, 2) - 10 * b1;
          },
          type: 'minimize',
          weight: 1.0,
        }];

        const problem: OptimizationProblemType = {
          category: 'mixed',
          objectives,
          constraints: [],
          variables,
        };

        const result = await optimizer.optimize(problem);

        expect(result.convergence).toBe(true);
        expect(result.optimalParameters[2]).toBe(1); // binary1 should be 1
        expect(result.optimalParameters[3]).toBeLessThan(0.1); // continuous2 near 0
      });
    });

    describe('Benchmarking', () => {
      it('should track quantum advantage', async () => {
        const problem = createTestProblem(5);
        await optimizer.optimize(problem);
        const benchmarks = optimizer.getBenchmarks();

        expect(benchmarks.length).toBe(1);
        expect(benchmarks[0].quantumAdvantage).toBeDefined();
        expect(benchmarks[0].quantumAdvantage.speedup).toBeGreaterThan(0);
        expect(benchmarks[0].quantumInspiredAccuracy).toBeLessThanOrEqual(
          benchmarks[0].classicalAccuracy,
        );
      });
    });
  });

  describe('QuantumNeuralNetwork', () => {
    let qnn: QuantumNeuralNetworkEngine;

    beforeEach(() => {
      qnn = new QuantumNeuralNetworkEngine(4, [8, 4], 2, 0.01);
    });

    it('should perform forward pass', async () => {
      const input = [0.5, 0.3, 0.8, 0.1];
      const output = await qnn.forward(input);

      expect(output).toHaveLength(2);
      expect(output[0]).toBeGreaterThanOrEqual(-1);
      expect(output[0]).toBeLessThanOrEqual(1);
    });

    it('should train on XOR-like problem', async () => {
      const inputs = [
        [0, 0, 0, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [1, 1, 1, 1],
      ];

      const targets = [
        [1, 0], // Class 0
        [0, 1], // Class 1
        [0, 1], // Class 1
        [1, 0],  // Class 0
      ];

      const result = await qnn.train(inputs, targets, 50, 4);

      expect(result.loss.length).toBe(50);
      expect(result.accuracy.length).toBe(50);
      expect(result.loss[result.loss.length - 1]).toBeLessThan(result.loss[0]);
      expect(result.accuracy[result.accuracy.length - 1]).toBeGreaterThan(0.5);
    });

    it('should estimate quantum advantage', () => {
      const classicalParams = 1000000; // 1M parameters classical network
      const advantage = qnn.estimateQuantumAdvantage(classicalParams);

      expect(advantage).toBeGreaterThan(1);
      expect(advantage).toBeLessThan(100); // Reasonable bound
    });
  });

  describe('QuantumFinancialAgent', () => {
    let agent: QuantumFinancialAgent;

    beforeEach(() => {
      agent = new QuantumFinancialAgent(supabase, 'test-enterprise');
    });

    it('should optimize portfolio allocation', async () => {
      const data = {
        optimize: 'portfolio',
        assets: [
          { symbol: 'STOCK_A', expectedReturn: 0.08, minWeight: 0.1 },
          { symbol: 'STOCK_B', expectedReturn: 0.12, maxWeight: 0.4 },
          { symbol: 'BOND_A', expectedReturn: 0.04 },
          { symbol: 'COMMODITY_A', expectedReturn: 0.06 },
        ],
        riskTolerance: 0.5,
        covariance: [
          [0.04, 0.01, 0.005, 0.002],
          [0.01, 0.09, 0.001, 0.003],
          [0.005, 0.001, 0.01, 0.001],
          [0.002, 0.003, 0.001, 0.02],
        ],
      };

      const result = await agent.process(data);

      expect(result.quantumOptimization).toBeDefined();
      expect(result.quantumOptimization!.result.convergence).toBe(true);

      // Check portfolio constraints
      const weights = result.quantumOptimization!.result.optimalParameters;
      expect(weights[0]).toBeGreaterThanOrEqual(0.09); // minWeight constraint
      expect(weights[1]).toBeLessThanOrEqual(0.41); // maxWeight constraint
      expect(weights.reduce((a, b) => a + b)).toBeCloseTo(1, 2); // Sum to 1

      // Check for insights
      expect(result.insights).toBeDefined();
      expect(result.insights!.length).toBeGreaterThan(0);

      const portfolioInsight = result.insights!.find(i =>
        i.category === 'Quantum optimization',
      );
      expect(portfolioInsight).toBeDefined();
    });

    it('should perform budget allocation', async () => {
      const data = {
        allocate: true,
        budgets: [
          { department: 'R&D', requested: 1000000, minimum: 500000 },
          { department: 'Marketing', requested: 750000, minimum: 400000 },
          { department: 'Operations', requested: 1500000, minimum: 1000000 },
          { department: 'IT', requested: 500000, minimum: 300000 },
        ],
        totalBudget: 3000000,
        priorities: {
          'R&D': 1.5,
          'Marketing': 1.0,
          'Operations': 1.2,
          'IT': 0.8,
        },
      };

      const result = await agent.process(data);

      expect(result.quantumOptimization).toBeDefined();
      expect(result.quantumOptimization!.result.convergence).toBe(true);

      const allocations = result.quantumOptimization!.result.optimalParameters;
      const totalAllocated = allocations.reduce((a, b) => a + b);

      expect(totalAllocated).toBeLessThanOrEqual(3000001); // Within budget
      expect(allocations[0]).toBeGreaterThanOrEqual(499999); // R&D minimum
    });

    it('should minimize risk with CVaR', async () => {
      const data = {
        minimize: 'risk',
        positions: [
          { current: 100000, asset: 'STOCK_A' },
          { current: 50000, asset: 'STOCK_B' },
          { current: 75000, asset: 'BOND_A' },
        ],
        confidenceLevel: 0.95,
      };

      const result = await agent.process(data);

      expect(result.quantumOptimization).toBeDefined();
      expect(result.quantumOptimization!.result.convergence).toBe(true);

      // Should have risk insights
      const riskInsight = result.insights!.find(i =>
        i.data?.description?.includes('risk'),
      );
      expect(riskInsight).toBeDefined();
    });

    it('should show quantum advantage for large portfolios', async () => {
      const numAssets = 30;
      const assets = Array.from({ length: numAssets }, (_, i) => ({
        symbol: `ASSET_${i}`,
        expectedReturn: 0.05 + Math.random() * 0.1,
      }));

      const data = {
        optimize: 'portfolio',
        assets,
        riskTolerance: 0.5,
      };

      const result = await agent.process(data);

      expect(result.quantumOptimization).toBeDefined();
      expect(result.quantumOptimization!.quantumAdvantage).toBeDefined();
      expect(result.quantumOptimization!.quantumAdvantage!.speedup).toBeGreaterThan(1);

      // Should have speedup insight for large portfolio
      const speedupInsight = result.insights!.find(i =>
        i.data && i.data.type === 'speedup',
      );
      expect(speedupInsight).toBeDefined();
    });
  });
});

// Helper functions

function generateDistanceMatrix(n: number): number[][] {
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = Math.random() * 100 + 10;
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}

function extractTour(parameters: number[], cities: number): number[] {
  const tour: number[] = [];
  const visited = new Set<number>();
  let current = 0;

  while (tour.length < cities) {
    tour.push(current);
    visited.add(current);

    for (let next = 0; next < cities; next++) {
      if (!visited.has(next) && parameters[current * cities + next] > 0.5) {
        current = next;
        break;
      }
    }

    if (tour.length < cities && visited.has(current)) {
      break; // Invalid tour
    }
  }

  return tour;
}

function createTestProblem(numVars: number): OptimizationProblemType {
  const variables: Variable[] = Array.from({ length: numVars }, (_, i) => ({
    id: `x${i}`,
    type: 'continuous',
    domain: { type: 'range', min: -10, max: 10 },
  }));

  const objectives: ObjectiveFunction[] = [{
    id: 'sphere',
    expression: (vars: Map<string, any>) => {
      let sum = 0;
      for (let i = 0; i < numVars; i++) {
        const x = vars.get(`x${i}`) || 0;
        sum += x * x;
      }
      return sum;
    },
    type: 'minimize',
    weight: 1.0,
  }];

  return {
    category: 'continuous',
    objectives,
    constraints: [],
    variables,
  };
}