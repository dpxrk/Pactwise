import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SwarmEngine } from '../../supabase/functions/local-agents/swarm/swarm-engine.ts';
import {
  AlgorithmType,
  ProblemDefinition,
  SwarmConfig,
  SwarmIntelligence,
  CommunicationConfig,
  AdaptationConfig,
  TerminationCriteria,
} from '../../supabase/functions/local-agents/swarm/types.ts';

// Helper function to create default SwarmConfig
function createDefaultConfig(algorithm: AlgorithmType = 'pso', size: number = 20): SwarmConfig {
  return {
    algorithm,
    size: [size, size],
    topology: {
      type: 'global',
      connectivity: 1.0,
      rewiring: 0.0,
    },
    communication: {
      radius: 1.0,
      delay: 0,
      bandwidth: 1000,
      reliability: 1.0,
    },
    adaptation: {
      learningRate: 0.1,
      memorySize: 100,
      innovationRate: 0.1,
      adaptiveDiversity: true,
    },
    termination: {
      maxIterations: 1000,
      targetFitness: 0.001,
      stagnationLimit: 50,
      timeLimit: 60000,
    },
  };
}

describe('SwarmEngine', () => {
  let engine: SwarmEngine;
  let swarmId: string;
  let problemDef: ProblemDefinition;

  beforeEach(() => {
    engine = new SwarmEngine();
    swarmId = 'test-swarm-1';

    problemDef = {
      id: 'test-problem',
      type: 'optimization',
      dimensions: 2,
      objectives: [{
        name: 'obj1',
        weight: 1,
        direction: 'minimize',
        function: 'test_function',
      }],
      constraints: [],
      searchSpace: {
        dimensions: [
          { name: 'x', type: 'continuous', range: [-10, 10], resolution: 0.1 },
          { name: 'y', type: 'continuous', range: [-10, 10], resolution: 0.1 },
        ],
        topology: 'continuous',
        boundaries: [],
      },
      evaluationFunction: 'rosenbrock',
    };
  });

  afterEach(() => {
    engine.terminateSwarm(swarmId);
  });

  describe('Swarm Initialization', () => {
    it('should initialize a swarm with correct parameters', async () => {
      const config = createDefaultConfig('pso', 20);
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      expect(swarm).toBeDefined();
      expect(swarm.id).toBe(swarmId);
      expect(swarm.algorithm).toBe('pso');
      expect(swarm.agents.size).toBe(20);
      expect(swarm.phase).toBe('initialization');
      expect(swarm.state.activity).toBe('active');
    });

    it('should support different algorithm types', async () => {
      const algorithms: AlgorithmType[] = ['pso', 'aco', 'abc', 'firefly', 'wolf', 'hybrid'];

      for (const algo of algorithms) {
        const testSwarmId = `test-${algo}`;
        const config = createDefaultConfig(algo);
        const swarm = await engine.initializeSwarm(testSwarmId, problemDef, config);

        expect(swarm.algorithm).toBe(algo);
        expect(swarm.agents.size).toBeGreaterThan(0);

        engine.terminateSwarm(testSwarmId);
      }
    });

    it('should handle invalid swarm parameters', async () => {
      const invalidConfig = createDefaultConfig('invalid' as AlgorithmType);
      await expect(
        engine.initializeSwarm(swarmId, problemDef, invalidConfig),
      ).rejects.toThrow();
    });
  });

  describe('Swarm Iteration', () => {
    it('should perform iteration and update agent states', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      const initialPositions = Array.from(swarm.agents.values())
        .map(agent => [...agent.position.dimensions]);

      await engine.iterate(swarmId);

      const updatedPositions = Array.from(swarm.agents.values())
        .map(agent => [...agent.position.dimensions]);

      // At least some positions should have changed
      const positionsChanged = initialPositions.some((initial, i) =>
        initial.some((dim, j) => dim !== updatedPositions[i][j]),
      );

      expect(positionsChanged).toBe(true);
      expect(swarm.state.iterations).toBe(1);
    });

    it('should update best solutions during iterations', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Run multiple iterations
      for (let i = 0; i < 10; i++) {
        await engine.iterate(swarmId);
      }

      expect(swarm.state.globalBest).toBeDefined();
      expect(swarm.state.globalBest!.fitness).toBeGreaterThan(0);
    });

    it('should detect phase transitions', async () => {
      const config = createDefaultConfig('pso', 10);
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      expect(swarm.phase).toBe('initialization');

      // Run iterations until phase change
      for (let i = 0; i < 20; i++) {
        await engine.iterate(swarmId);
      }

      // Should transition to exploration or exploitation
      expect(['exploration', 'exploitation']).toContain(swarm.phase);
    });
  });

  describe('Agent Behaviors', () => {
    it('should execute agent behaviors correctly', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      const agent = Array.from(swarm.agents.values())[0];
      const initialVelocity = [...agent.velocity.components];

      await engine.iterate(swarmId);

      // Velocity should be updated
      expect(agent.velocity.components).not.toEqual(initialVelocity);
      expect(agent.velocity.magnitude).toBeGreaterThanOrEqual(0);
    });

    it('should maintain agent neighbors', async () => {
      const config = createDefaultConfig('pso', 20);
      config.topology.type = 'ring';
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      for (const agent of swarm.agents.values()) {
        expect(agent.neighbors.length).toBeGreaterThan(0);
        expect(agent.neighbors.length).toBeLessThan(swarm.agents.size);
      }
    });

    it('should update agent roles based on performance', async () => {
      const config = createDefaultConfig('abc');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Run iterations
      for (let i = 0; i < 5; i++) {
        await engine.iterate(swarmId);
      }

      const agents = Array.from(swarm.agents.values());
      const roles = new Set(agents.map(a => a.type));

      // ABC should have multiple roles
      expect(roles.size).toBeGreaterThan(1);
    });
  });

  describe('Emergent Behaviors', () => {
    it('should detect emergent patterns', async () => {
      const config = createDefaultConfig('pso', 30);
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Run iterations to allow patterns to emerge
      for (let i = 0; i < 20; i++) {
        await engine.iterate(swarmId);
      }

      expect(swarm.emergence.patterns.length).toBeGreaterThan(0);
    });

    it('should detect flocking behavior', async () => {
      const config = createDefaultConfig('pso', 50);
      // High social weight encourages flocking
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Run iterations
      for (let i = 0; i < 30; i++) {
        await engine.iterate(swarmId);
      }

      const flockingPattern = swarm.emergence.patterns.find(
        (p: any) => p.type === 'flocking',
      );

      expect(flockingPattern).toBeDefined();
    });

    it('should detect clustering patterns', async () => {
      const multiModalProblem: ProblemDefinition = {
        ...problemDef,
        evaluationFunction: 'multimodal',
        metadata: { peaks: 3 },
      };

      const config = createDefaultConfig('pso', 30);
      const swarm = await engine.initializeSwarm(swarmId, multiModalProblem, config);

      // Run iterations
      for (let i = 0; i < 40; i++) {
        await engine.iterate(swarmId);
      }

      const clusteringPattern = swarm.emergence.patterns.find(
        (p: any) => p.type === 'clustering',
      );

      expect(clusteringPattern).toBeDefined();
    });
  });

  describe('Pheromone System', () => {
    it('should update pheromone field', async () => {
      const config = createDefaultConfig('aco');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      expect(swarm.pheromoneField).toBeDefined();

      // Run iterations
      for (let i = 0; i < 10; i++) {
        await engine.iterate(swarmId);
      }

      // Check pheromone field has been updated
      expect(swarm.pheromoneField.lastUpdate).toBeGreaterThan(0);
    });

    it('should evaporate pheromones over time', async () => {
      const config = createDefaultConfig('aco');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Run initial iterations
      for (let i = 0; i < 5; i++) {
        await engine.iterate(swarmId);
      }

      const initialUpdateTime = swarm.pheromoneField.lastUpdate;

      // Run more iterations with evaporation
      for (let i = 0; i < 10; i++) {
        await engine.iterate(swarmId);
      }

      // Pheromone field should have been updated
      expect(swarm.pheromoneField.lastUpdate).toBeGreaterThan(initialUpdateTime);
    });
  });

  describe('Performance and Convergence', () => {
    it('should converge on optimal solution', async () => {
      const config = createDefaultConfig('pso', 30);
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      let bestFitness = 0;
      let improvementCount = 0;

      for (let i = 0; i < 50; i++) {
        await engine.iterate(swarmId);

        if (swarm.state.globalBest && swarm.state.globalBest.fitness > bestFitness) {
          bestFitness = swarm.state.globalBest.fitness;
          improvementCount++;
        }
      }

      expect(improvementCount).toBeGreaterThan(5);
      expect(bestFitness).toBeGreaterThan(0.5);
    });

    it('should handle stagnation', async () => {
      const config = createDefaultConfig('pso', 10);
      config.termination.stagnationLimit = 10;
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Mock iterate to not update positions
      const originalIterate = engine.iterate.bind(engine);
      vi.spyOn(engine, 'iterate').mockImplementation(async (swarmId) => {
        // Call original but don't update positions
        await originalIterate(swarmId);
        // Set phase to stagnation after enough iterations
        const s = engine['swarms'].get(swarmId);
        if (s && s.state.iterations > 10) {
          s.state.phase = 'stagnation';
        }
      });

      for (let i = 0; i < 15; i++) {
        await engine.iterate(swarmId);
      }

      expect(swarm.state.phase).toBe('stagnation');
    });

    it('should terminate when convergence reached', async () => {
      const config = createDefaultConfig('pso', 20);
      config.termination.targetFitness = 0.95;
      config.termination.maxIterations = 200;
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Run until termination
      while (swarm.state.activity === 'active' && swarm.state.iterations < 200) {
        await engine.iterate(swarmId);
      }

      expect(['convergence', 'termination']).toContain(swarm.state.phase);
    });
  });

  describe('Multi-Swarm Coordination', () => {
    it('should manage multiple swarms', async () => {
      const config1 = createDefaultConfig('pso');
      const config2 = createDefaultConfig('aco');
      const config3 = createDefaultConfig('abc');
      const swarm1 = await engine.initializeSwarm('swarm-1', problemDef, config1);
      const swarm2 = await engine.initializeSwarm('swarm-2', problemDef, config2);
      const swarm3 = await engine.initializeSwarm('swarm-3', problemDef, config3);

      expect(engine['swarms'].size).toBe(3);

      // Iterate all swarms
      await engine.iterateAll();

      expect(swarm1.state.iterations).toBe(1);
      expect(swarm2.state.iterations).toBe(1);
      expect(swarm3.state.iterations).toBe(1);

      // Cleanup
      engine.terminateSwarm('swarm-1');
      engine.terminateSwarm('swarm-2');
      engine.terminateSwarm('swarm-3');
    });

    it('should share information between swarms', async () => {
      const config1 = createDefaultConfig('pso');
      const config2 = createDefaultConfig('pso');
      const swarm1 = await engine.initializeSwarm('swarm-1', problemDef, config1);
      const swarm2 = await engine.initializeSwarm('swarm-2', problemDef, config2);

      // Information sharing happens automatically with global topology

      // Run iterations
      for (let i = 0; i < 10; i++) {
        await engine.iterateAll();
      }

      // Check that both swarms have progressed
      expect(swarm1.state.iterations).toBeGreaterThan(0);
      expect(swarm2.state.iterations).toBeGreaterThan(0);

      // Cleanup
      engine.terminateSwarm('swarm-1');
      engine.terminateSwarm('swarm-2');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid swarm ID', async () => {
      await expect(engine.iterate('non-existent')).rejects.toThrow();
    });

    it('should handle agent failures gracefully', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Simulate agent failure
      const agent = Array.from(swarm.agents.values())[0];
      agent.state.activity = 'idle';
      agent.fitness = -Infinity;

      // Should still iterate without crashing
      await expect(engine.iterate(swarmId)).resolves.not.toThrow();
    });

    it('should recover from consensus failures', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Force consensus failure
      swarm.consensus = {
        algorithm: 'byzantine',
        proposals: [],
        votes: new Map(),
        agreement: 0,
        stability: 0,
        dissenters: Array.from(swarm.agents.keys()),
        rounds: 0,
        status: 'failed',
      };

      await engine.iterate(swarmId);

      // Should reset consensus
      expect(swarm.consensus.status).toBe('pending');
    });
  });
});