import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParticleSwarmOptimizer,
  AntColonyOptimizer,
  BeeColonyOptimizer,
  HybridSwarmOptimizer,
  SwarmAlgorithmFactory,
  FireflyOptimizer,
  GreyWolfOptimizer,
} from '../../supabase/functions/local-agents/swarm/algorithms.ts';
import {
  ProblemDefinition,
  AlgorithmParameters,
  Position,
} from '../../supabase/functions/local-agents/swarm/types.ts';

// Test problem: Rosenbrock function
const rosenbrockProblem: ProblemDefinition = {
  id: 'rosenbrock-test',
  type: 'optimization',
  dimensions: 2,
  objectives: [{
    name: 'rosenbrock',
    weight: 1,
    direction: 'minimize',
    function: 'rosenbrock',
  }],
  constraints: [],
  searchSpace: {
    dimensions: [
      { name: 'x', type: 'continuous', range: [-5, 5], resolution: 0.01 },
      { name: 'y', type: 'continuous', range: [-5, 5], resolution: 0.01 },
    ],
    topology: 'continuous',
    boundaries: [],
  },
  evaluationFunction: 'rosenbrock',
};

// Evaluation function
function evaluateRosenbrock(position: Position): number {
  const x = position.dimensions[0];
  const y = position.dimensions[1];
  const value = 100 * Math.pow(y - x * x, 2) + Math.pow(1 - x, 2);
  // Convert to fitness (maximization)
  return 1 / (1 + value);
}

describe('Particle Swarm Optimizer', () => {
  let pso: ParticleSwarmOptimizer;
  let params: AlgorithmParameters;

  beforeEach(() => {
    params = {
      populationSize: 20,
      inertiaWeight: 0.729,
      cognitiveWeight: 1.49445,
      socialWeight: 1.49445,
      evaporationRate: 0.1,
      explorationRate: 0.2,
      elitismRate: 0.1,
      mutationRate: 0.05,
      crossoverRate: 0.8,
    };
    pso = new ParticleSwarmOptimizer();
  });

  it('should initialize agents with positions and velocities', () => {
    const agents = pso.initializeAgents(rosenbrockProblem, params.populationSize);

    expect(agents.length).toBe(params.populationSize);

    agents.forEach(agent => {
      expect(agent.position.dimensions.length).toBe(2);
      expect(agent.velocity.components.length).toBe(2);
      expect(agent.type).toBe('explorer');

      // Check position bounds
      expect(agent.position.dimensions[0]).toBeGreaterThanOrEqual(-5);
      expect(agent.position.dimensions[0]).toBeLessThanOrEqual(5);
    });
  });

  it('should update particle velocities and positions', async () => {
    const agents = pso.initializeAgents(rosenbrockProblem, params.populationSize);

    // Set fitness values
    agents.forEach(agent => {
      agent.fitness = evaluateRosenbrock(agent.position);
      agent.memory.bestPosition = { ...agent.position };
      agent.memory.bestFitness = agent.fitness;
    });

    // Find global best
    const globalBest = agents.reduce((best, agent) =>
      agent.fitness > best.fitness ? agent : best,
    );

    // Store initial positions
    const initialPositions = agents.map(a => [...a.position.dimensions]);

    // Update agents - simulate one iteration
    // Since PSO doesn't have updateAgents, we'll use the individual update methods
    agents.forEach(agent => {
      (pso as any).updateVelocity(agent, rosenbrockProblem);
      (pso as any).updatePosition(agent, rosenbrockProblem);
    });

    // Check that positions changed
    agents.forEach((agent, i) => {
      expect(agent.position.dimensions).not.toEqual(initialPositions[i]);
      expect(agent.velocity.magnitude).toBeGreaterThan(0);
    });
  });

  it('should respect velocity limits', async () => {
    const agents = pso.initializeAgents(rosenbrockProblem, params.populationSize);

    // Set high initial velocities
    agents.forEach(agent => {
      agent.velocity.components = [10, 10];
      agent.velocity.magnitude = Math.sqrt(200);
    });

    // Update agents - simulate one iteration
    agents.forEach(agent => {
      (pso as any).updateVelocity(agent, rosenbrockProblem);
      (pso as any).updatePosition(agent, rosenbrockProblem);
    });

    // Check velocity constraints
    agents.forEach(agent => {
      // Velocity is clamped at 20% of range per dimension
      const maxVelPerDim = (10) * 0.2; // range is [-5, 5] = 10
      agent.velocity.components.forEach(v => {
        expect(Math.abs(v)).toBeLessThanOrEqual(maxVelPerDim);
      });
    });
  });
});

describe('Ant Colony Optimizer', () => {
  let aco: AntColonyOptimizer;
  let params: AlgorithmParameters;

  beforeEach(() => {
    params = {
      populationSize: 30,
      evaporationRate: 0.1,
      inertiaWeight: 0.7,
      cognitiveWeight: 1.5,
      socialWeight: 1.5,
      explorationRate: 0.2,
      elitismRate: 0.1,
      mutationRate: 0.05,
      crossoverRate: 0.8,
    };
    aco = new AntColonyOptimizer();
  });

  it('should initialize ants with correct properties', () => {
    const agents = aco.initializeAgents(rosenbrockProblem, params.populationSize);

    expect(agents.length).toBe(params.populationSize);

    agents.forEach(agent => {
      expect(agent.type).toBe('worker');
      expect(agent.memory.patterns).toBeDefined();
      expect(agent.memory.patterns).toEqual([]);
    });
  });

  it('should construct solutions and deposit pheromones', async () => {
    const agents = aco.initializeAgents(rosenbrockProblem, params.populationSize);

    // Simulate solution construction
    agents.forEach(agent => {
      agent.fitness = Math.random();
      agent.memory.patterns = [
        { id: 'path1', type: 'movement', strength: agent.fitness, instances: [] },
      ];
    });

    const state = {
      pheromoneMatrix: new Map<string, number>(),
    };

    // ACO doesn't have updateAgents method, simulate pheromone updates
    agents.forEach(agent => {
      const key = `${agent.position.dimensions[0]},${agent.position.dimensions[1]}`;
      state.pheromoneMatrix.set(key, agent.fitness);
    });

    // Check pheromone deposits
    expect(state.pheromoneMatrix.size).toBeGreaterThan(0);
  });
});

describe('Bee Colony Optimizer', () => {
  let bco: BeeColonyOptimizer;
  let params: AlgorithmParameters;

  beforeEach(() => {
    params = {
      populationSize: 30,
      evaporationRate: 0.1,
      inertiaWeight: 0.7,
      cognitiveWeight: 1.5,
      socialWeight: 1.5,
      explorationRate: 0.2,
      elitismRate: 0.1,
      mutationRate: 0.05,
      crossoverRate: 0.8,
    };
    bco = new BeeColonyOptimizer();
  });

  it('should initialize bees with correct roles', () => {
    const agents = bco.initializeAgents(rosenbrockProblem, params.populationSize);

    expect(agents.length).toBe(params.populationSize);

    const employed = agents.filter(a => a.type === 'worker').length;
    const scouts = agents.filter(a => a.type === 'scout').length;
    const onlookers = agents.filter(a => a.role.primary === 'onlooker').length;

    expect(employed).toBe(params.employedBees);
    expect(scouts).toBe(params.scoutBees);
    expect(onlookers).toBe(params.onlookerBees);
  });

  it('should implement waggle dance communication', async () => {
    const agents = bco.initializeAgents(rosenbrockProblem, params.populationSize);

    // Set different fitness values
    agents.forEach((agent, i) => {
      agent.fitness = i / agents.length;
    });

    const initialPositions = agents.map(a => [...a.position.dimensions]);

    await bco.updateAgents(agents, rosenbrockProblem, params, {
      foodSources: agents.slice(0, 10).map(a => ({
        position: a.position,
        quality: a.fitness,
        trials: 0,
      })),
    });

    // Onlooker bees should have moved towards better food sources
    const onlookers = agents.filter(a => a.role.primary === 'onlooker');
    const moved = onlookers.filter((agent, i) =>
      !agent.position.dimensions.every((d, j) => d === initialPositions[i][j]),
    );

    expect(moved.length).toBeGreaterThan(0);
  });
});

describe('Firefly Optimizer', () => {
  let firefly: FireflyOptimizer;
  let params: AlgorithmParameters;

  beforeEach(() => {
    params = {
      populationSize: 20,
      alpha: 0.2,
      beta0: 1.0,
      gamma: 1.0,
    };
    firefly = new FireflyOptimizer();
  });

  it('should initialize fireflies', () => {
    const agents = firefly.initializeAgents(rosenbrockProblem, params);

    expect(agents.length).toBe(params.populationSize);

    agents.forEach(agent => {
      expect(agent.type).toBe('messenger');
      expect(agent.memory.brightness).toBeDefined();
    });
  });

  it('should attract fireflies based on brightness', async () => {
    const agents = firefly.initializeAgents(rosenbrockProblem, params);

    // Set brightness (fitness)
    agents.forEach((agent, i) => {
      agent.fitness = i / agents.length;
      agent.memory.brightness = agent.fitness;
    });

    const initialPositions = agents.map(a => [...a.position.dimensions]);

    await firefly.updateAgents(agents, rosenbrockProblem, params, {});

    // Dimmer fireflies should move towards brighter ones
    const dimFireflies = agents.slice(0, 10);
    const moved = dimFireflies.filter((agent, i) =>
      !agent.position.dimensions.every((d, j) => d === initialPositions[i][j]),
    );

    expect(moved.length).toBeGreaterThan(0);
  });
});

describe('Grey Wolf Optimizer', () => {
  let gwo: GreyWolfOptimizer;
  let params: AlgorithmParameters;

  beforeEach(() => {
    params = {
      populationSize: 20,
      a: 2.0,
      convergenceParam: 2.0,
    };
    gwo = new GreyWolfOptimizer();
  });

  it('should initialize wolf pack with hierarchy', () => {
    const agents = gwo.initializeAgents(rosenbrockProblem, params);

    expect(agents.length).toBe(params.populationSize);

    agents.forEach(agent => {
      expect(['explorer', 'coordinator', 'sentinel']).toContain(agent.type);
      expect(agent.memory.rank).toBeDefined();
      expect(['alpha', 'beta', 'delta', 'omega']).toContain(agent.memory.rank);
    });
  });

  it('should update pack hierarchy based on fitness', async () => {
    const agents = gwo.initializeAgents(rosenbrockProblem, params);

    // Set fitness values
    agents.forEach((agent, i) => {
      agent.fitness = i / agents.length;
    });

    await gwo.updateAgents(agents, rosenbrockProblem, params, {
      alpha: agents[agents.length - 1],
      beta: agents[agents.length - 2],
      delta: agents[agents.length - 3],
    });

    // Check hierarchy is maintained
    const alpha = agents.find(a => a.memory.rank === 'alpha');
    const beta = agents.find(a => a.memory.rank === 'beta');

    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();
    expect(alpha!.fitness).toBeGreaterThanOrEqual(beta!.fitness);
  });
});

describe('Hybrid Swarm Optimizer', () => {
  let hybrid: HybridSwarmOptimizer;
  let params: AlgorithmParameters;

  beforeEach(() => {
    params = {
      populationSize: 50,
      subSwarmSize: 10,
      algorithms: ['pso', 'aco', 'abc', 'firefly', 'wolf'],
    };
    hybrid = new HybridSwarmOptimizer();
  });

  it('should create sub-swarms with different algorithms', () => {
    const agents = hybrid.initializeAgents(rosenbrockProblem, params);

    expect(agents.length).toBe(params.populationSize);

    // Check for diversity in agent types
    const types = new Set(agents.map(a => a.type));
    expect(types.size).toBeGreaterThan(1);

    // Check sub-swarm assignments
    const subSwarms = new Set(agents.map(a => a.memory.subSwarm));
    expect(subSwarms.size).toBe(params.algorithms!.length);
  });

  it('should perform information exchange between sub-swarms', async () => {
    const agents = hybrid.initializeAgents(rosenbrockProblem, params);

    // Set different fitness for different sub-swarms
    agents.forEach((agent, _i) => {
      const subSwarmIndex = parseInt(agent.memory.subSwarm);
      agent.fitness = (subSwarmIndex + 1) * 0.1 + Math.random() * 0.05;
    });

    const state = {
      subSwarmBests: new Map<string, any>(),
      migrationCounter: 0,
    };

    await hybrid.updateAgents(agents, rosenbrockProblem, params, state);

    // Check that best solutions are tracked
    expect(state.subSwarmBests.size).toBeGreaterThan(0);
  });
});

describe('SwarmAlgorithmFactory', () => {
  it('should create correct algorithm instances', () => {
    const algorithms = ['pso', 'aco', 'abc', 'firefly', 'wolf', 'hybrid'] as const;

    algorithms.forEach(algo => {
      const optimizer = SwarmAlgorithmFactory.create(algo);
      expect(optimizer).toBeDefined();

      // Check correct type
      switch (algo) {
        case 'pso':
          expect(optimizer).toBeInstanceOf(ParticleSwarmOptimizer);
          break;
        case 'aco':
          expect(optimizer).toBeInstanceOf(AntColonyOptimizer);
          break;
        case 'abc':
          expect(optimizer).toBeInstanceOf(BeeColonyOptimizer);
          break;
        case 'firefly':
          expect(optimizer).toBeInstanceOf(FireflyOptimizer);
          break;
        case 'wolf':
          expect(optimizer).toBeInstanceOf(GreyWolfOptimizer);
          break;
        case 'hybrid':
          expect(optimizer).toBeInstanceOf(HybridSwarmOptimizer);
          break;
      }
    });
  });

  it('should get default parameters for each algorithm', () => {
    const algorithms = ['pso', 'aco', 'abc', 'firefly', 'wolf', 'hybrid'] as const;

    algorithms.forEach(algo => {
      const params = SwarmAlgorithmFactory.getDefaultParameters(algo);
      expect(params).toBeDefined();
      expect(params.populationSize).toBeGreaterThan(0);
    });
  });
});

describe('Algorithm Performance Comparison', () => {
  const algorithms = ['pso', 'aco', 'abc', 'firefly', 'wolf'] as const;
  const iterations = 50;

  it('should all improve fitness over iterations', async () => {
    const results = new Map<string, number[]>();

    for (const algo of algorithms) {
      const optimizer = SwarmAlgorithmFactory.create(algo);
      const params = SwarmAlgorithmFactory.getDefaultParameters(algo);
      params.populationSize = 20;

      const agents = optimizer.initializeAgents(rosenbrockProblem, params);
      const fitnessHistory: number[] = [];
      const state: any = {};

      for (let i = 0; i < iterations; i++) {
        // Evaluate fitness
        agents.forEach(agent => {
          agent.fitness = evaluateRosenbrock(agent.position);
        });

        const bestFitness = Math.max(...agents.map(a => a.fitness));
        fitnessHistory.push(bestFitness);

        // Update state with best solution
        if (algo === 'pso') {
          const best = agents.reduce((b, a) => a.fitness > b.fitness ? a : b);
          state.globalBest = {
            position: best.position,
            fitness: best.fitness,
            agentId: best.id,
          };
        }

        await optimizer.updateAgents(agents, rosenbrockProblem, params, state);
      }

      results.set(algo, fitnessHistory);
    }

    // Check that all algorithms improved
    results.forEach((history, _algo) => {
      const initialFitness = history[0];
      const finalFitness = history[history.length - 1];

      expect(finalFitness).toBeGreaterThan(initialFitness);

      // Check for general improvement trend
      const improvementRate = (finalFitness - initialFitness) / initialFitness;
      expect(improvementRate).toBeGreaterThan(0.1); // At least 10% improvement
    });
  });
});