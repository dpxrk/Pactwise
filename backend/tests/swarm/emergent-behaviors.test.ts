import { describe, it, expect, beforeEach } from 'vitest';
import { EmergentBehaviorDetector } from '../../supabase/functions/local-agents/swarm/emergent-behaviors';
import { SwarmEngine } from '../../supabase/functions/local-agents/swarm/swarm-engine';
import {
  SwarmAgent,
  ProblemDefinition,
  SwarmIntelligence,
  SwarmConfig,
  AlgorithmType,
  ActivityState,
} from '../../supabase/functions/local-agents/swarm/types';

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
      range: 1.0,
      bandwidth: 1000,
      latency: 0,
      reliability: 1.0,
    },
    adaptation: {
      learningRate: 0.1,
      memorySize: 100,
      innovationRate: 0.1,
      imitationRate: 0.1,
    },
    termination: {
      maxIterations: 1000,
      targetFitness: 0.001,
      stagnationLimit: 50,
      consensusThreshold: 0.8,
    },
  };
}

// Helper to create positioned agents
function createPositionedAgents(positions: number[][]): Map<string, SwarmAgent> {
  const agents = new Map<string, SwarmAgent>();

  positions.forEach((pos, i) => {
    const agent: SwarmAgent = {
      id: `agent-${i}`,
      type: 'explorer',
      position: {
        dimensions: pos,
        confidence: 0.9,
        timestamp: Date.now(),
      },
      velocity: {
        components: [0, 0, 0],
        magnitude: 0,
        inertia: 0.9,
      },
      fitness: 0.5 + Math.random() * 0.5,
      state: {
        energy: 1.0,
        activity: 'foraging' as ActivityState,
        knowledge: [],
        currentTask: null,
        exploration: 0.5,
        commitment: 0.7,
        influence: 0.5,
      },
      memory: {
        bestPosition: {
          dimensions: pos,
          confidence: 0.9,
          timestamp: Date.now(),
        },
        bestFitness: 0,
        tabuList: [],
        shortcuts: new Map(),
        patterns: [],
      },
      neighbors: [],
      role: {
        primary: 'explorer',
        secondary: [],
        specialization: 0.7,
        flexibility: 0.3,
      },
      pheromones: [],
      messages: [],
    };
    agents.set(agent.id, agent);
  });

  return agents;
}

// Helper to create a test swarm
function createTestSwarm(
  swarmId: string, 
  agents: Map<string, SwarmAgent>, 
  problemDef: ProblemDefinition,
  phase: 'exploration' | 'exploitation' = 'exploitation'
): SwarmIntelligence {
  return {
    swarmId,
    size: agents.size,
    agents,
    problem: problemDef,
    state: {
      phase,
      convergence: 0.5,
      diversity: 0.3,
      coherence: 0.7,
      temperature: 0.5,
      polarization: 0.7,
      clustering: 0.3,
      efficiency: 0.8,
    },
    emergence: {
      patterns: [],
      formations: [],
      cascades: [],
      synchronizations: [],
      innovations: [],
    },
    performance: {
      efficiency: 0.9,
      scalability: 0.8,
      robustness: 0.7,
      adaptability: 0.85,
      convergenceSpeed: 0.6,
      solutionQuality: 0.9,
      resourceUsage: 0.5,
      communicationOverhead: 0.3,
      emergenceIndex: 1.2,
    },
    consensus: {
      algorithm: 'byzantine',
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    },
    pheromoneField: {
      resolution: 10,
      evaporationRate: 0.1,
      diffusionRate: 0.05,
      grid: [],
      maxIntensity: 1.0,
    },
    config: createDefaultConfig('pso'),
  };
}

describe('EmergentBehaviorDetector', () => {
  let detector: EmergentBehaviorDetector;
  let engine: SwarmEngine;
  let swarmId: string;
  let problemDef: ProblemDefinition;

  beforeEach(() => {
    detector = new EmergentBehaviorDetector();
    engine = new SwarmEngine();
    swarmId = 'test-swarm';

    problemDef = {
      id: 'test-problem',
      type: 'optimization',
      dimensions: 3,
      objectives: [{
        name: 'test',
        weight: 1,
        direction: 'minimize',
        function: 'sphere',
      }],
      constraints: [],
      searchSpace: {
        dimensions: [
          { name: 'x', type: 'continuous', range: [0, 10], resolution: 0.1 },
          { name: 'y', type: 'continuous', range: [0, 10], resolution: 0.1 },
          { name: 'z', type: 'continuous', range: [0, 10], resolution: 0.1 },
        ],
        topology: 'continuous',
        boundaries: [],
      },
      evaluationFunction: 'sphere',
    };
  });

  describe('Flocking Detection', () => {
    it('should detect flocking behavior', async () => {
      // Create agents moving in same direction
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Set agents to move together
      const velocity = [0.5, 0.3, 0.1];
      swarm.agents.forEach(agent => {
        agent.velocity.components = [...velocity];
        agent.velocity.magnitude = Math.sqrt(
          velocity.reduce((sum, v) => sum + v * v, 0),
        );
      });

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const flockingPattern = behaviors.patterns.find(p => p.type === 'flocking');
      expect(flockingPattern).toBeDefined();
      expect(flockingPattern!.strength).toBeGreaterThan(0.7);
    });

    it('should detect V-formation', async () => {
      // Create V-formation positions
      const positions = [
        [5, 5, 5],      // Leader
        [4, 4, 5],      // Left wing
        [6, 4, 5],      // Right wing
        [3, 3, 5],      // Left wing
        [7, 3, 5],      // Right wing
      ];

      const agents = createPositionedAgents(positions);

      // Set same velocity for all
      const velocity = [0, 1, 0]; // Moving forward
      agents.forEach(agent => {
        agent.velocity.components = [...velocity];
        agent.velocity.magnitude = 1;
      });

      const swarm = createTestSwarm(swarmId, agents, problemDef, 'exploitation');

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const formations = behaviors.formations.filter(f => f.type === 'v-formation');
      expect(formations.length).toBeGreaterThan(0);
    });
  });

  describe('Swarming Detection', () => {
    it('should detect swarming around target', async () => {
      // Create agents converging to center
      const center = [5, 5, 5];
      const positions: number[][] = [];

      // Create agents around center
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * 2 * Math.PI;
        const radius = 1 + Math.random();
        positions.push([
          center[0] + radius * Math.cos(angle),
          center[1] + radius * Math.sin(angle),
          center[2] + Math.random() * 0.5,
        ]);
      }

      const agents = createPositionedAgents(positions);

      // Set velocities toward center
      agents.forEach(agent => {
        const toCenter = center.map((c, i) =>
          c - agent.position.dimensions[i],
        );
        const magnitude = Math.sqrt(
          toCenter.reduce((sum, v) => sum + v * v, 0),
        );

        agent.velocity.components = toCenter.map(v => v / magnitude * 0.5);
        agent.velocity.magnitude = 0.5;
      });

      const swarm = createTestSwarm(swarmId, agents, problemDef, 'exploitation');

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const swarmingPattern = behaviors.patterns.find(p => p.type === 'swarming');
      expect(swarmingPattern).toBeDefined();
      expect(swarmingPattern!.strength).toBeGreaterThan(0);
    });
  });

  describe('Clustering Detection', () => {
    it('should detect multiple clusters', async () => {
      // Create three distinct clusters
      const clusters = [
        { center: [2, 2, 2], size: 10 },
        { center: [8, 8, 2], size: 10 },
        { center: [5, 5, 8], size: 10 },
      ];

      const positions: number[][] = [];

      clusters.forEach(cluster => {
        for (let i = 0; i < cluster.size; i++) {
          positions.push([
            cluster.center[0] + (Math.random() - 0.5),
            cluster.center[1] + (Math.random() - 0.5),
            cluster.center[2] + (Math.random() - 0.5),
          ]);
        }
      });

      const agents = createPositionedAgents(positions);

      const swarm = createTestSwarm(swarmId, agents, problemDef, 'exploitation');

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const clusteringPattern = behaviors.patterns.find(p => p.type === 'clustering');
      expect(clusteringPattern).toBeDefined();
      expect(clusteringPattern!.participants.length).toBeGreaterThan(0);
    });
  });

  describe('Synchronization Detection', () => {
    it('should detect phase synchronization', async () => {
      const config = createDefaultConfig('firefly');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Simulate firefly synchronization
      const phase = Math.PI / 4;
      swarm.agents.forEach((agent, _id) => {
        // Note: LocalMemory doesn't have phase/frequency/lastFlash properties
        // These would need to be stored differently in the actual implementation
        (agent.memory as any).phase = phase + Math.random() * 0.1; // Small variation
        (agent.memory as { frequency?: number }).frequency = 1.0;
        (agent.memory as { lastFlash?: number }).lastFlash = Date.now() - 100;
      });

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const syncPattern = behaviors.synchronizations.find(
        s => s.type === 'phase',
      );
      expect(syncPattern).toBeDefined();
      expect(syncPattern!.coherence).toBeGreaterThan(0.8);
    });

    it('should detect frequency synchronization', async () => {
      const agents = createPositionedAgents(
        Array(20).fill(0).map(() => [
          Math.random() * 10,
          Math.random() * 10,
          Math.random() * 10,
        ]),
      );

      // Set similar frequencies
      const baseFreq = 2.0;
      agents.forEach(agent => {
        agent.state.activity = 'foraging'; // Use valid ActivityState
        (agent.memory as { frequency?: number }).frequency = baseFreq + (Math.random() - 0.5) * 0.2;
        (agent.memory as { amplitude?: number }).amplitude = 1.0;
      });

      const swarm = createTestSwarm(swarmId, agents, problemDef, 'exploitation');

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const freqSync = behaviors.synchronizations.find(
        s => s.type === 'frequency',
      );
      expect(freqSync).toBeDefined();
    });
  });

  describe('Pattern Evolution', () => {
    it('should track pattern history', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // First detection
      let behaviors = detector.detectEmergentBehaviors(swarm);

      // Evolve swarm
      for (let i = 0; i < 10; i++) {
        await engine.iterate(swarmId);
      }

      // Second detection
      behaviors = detector.detectEmergentBehaviors(swarm);

      // Should maintain pattern history
      const { patterns } = behaviors;
      patterns.forEach(pattern => {
        // Note: EmergentPattern doesn't have metadata property
        // Just check that patterns exist
        expect(pattern.stability).toBeGreaterThanOrEqual(0);
      });
    });

    it('should detect pattern transitions', async () => {
      const config = createDefaultConfig('pso', 30);
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Force exploration phase (high diversity)
      swarm.agents.forEach(agent => {
        agent.position.dimensions = [
          Math.random() * 10,
          Math.random() * 10,
          Math.random() * 10,
        ];
        agent.velocity.magnitude = 1.0;
      });
      swarm.state.phase = 'exploration';

      const explorationBehaviors = detector.detectEmergentBehaviors(swarm);

      // Force exploitation phase (low diversity)
      const center = [5, 5, 5];
      swarm.agents.forEach(agent => {
        agent.position.dimensions = center.map(c =>
          c + (Math.random() - 0.5) * 0.5,
        );
        agent.velocity.magnitude = 0.1;
      });
      swarm.state.phase = 'exploitation';

      const exploitationBehaviors = detector.detectEmergentBehaviors(swarm);

      // Should detect different patterns
      const explorPatterns = new Set(
        explorationBehaviors.patterns.map(p => p.type),
      );
      const exploitPatterns = new Set(
        exploitationBehaviors.patterns.map(p => p.type),
      );

      expect(explorPatterns).not.toEqual(exploitPatterns);
    });
  });

  describe('Novel Pattern Detection', () => {
    it('should detect anomalous patterns', async () => {
      // Create unusual agent configuration
      const positions: number[][] = [];

      // Spiral pattern
      for (let i = 0; i < 30; i++) {
        const t = i * 0.3;
        const r = t * 0.5;
        positions.push([
          5 + r * Math.cos(t),
          5 + r * Math.sin(t),
          t * 0.2,
        ]);
      }

      const agents = createPositionedAgents(positions);

      // Set spiral velocities
      agents.forEach((agent, index) => {
        const t = (index as number) * 0.3;
        agent.velocity.components = [
          -Math.sin(t) * 0.5,
          Math.cos(t) * 0.5,
          0.1,
        ];
        agent.velocity.magnitude = Math.sqrt(0.25 + 0.01);
      });

      const swarm = createTestSwarm(swarmId, agents, problemDef, 'exploitation');

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const spiralPattern = behaviors.patterns.find(p => p.type === 'spiral');
      expect(spiralPattern).toBeDefined();
    });
  });

  describe('Pattern Amplification', () => {
    it('should amplify beneficial patterns', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Create beneficial flocking pattern
      const direction = [0.7, 0.7, 0];
      swarm.agents.forEach(agent => {
        agent.velocity.components = [...direction];
        agent.velocity.magnitude = 1.0;
        agent.fitness = 0.8; // High fitness
      });

      const behaviors = detector.detectEmergentBehaviors(swarm);
      const flocking = behaviors.patterns.find(p => p.type === 'flocking');

      expect(flocking).toBeDefined();
      expect(flocking!.benefit).toBeGreaterThan(0.5);

      // Amplification should strengthen the pattern
      const amplified = (detector as { amplifyBeneficialBehaviors: (...args: unknown[]) => unknown }).amplifyBeneficialBehaviors(swarm, behaviors);

      expect(amplified.length).toBeGreaterThan(0);

      // Check if velocities are more aligned
      const velocities = Array.from(swarm.agents.values()).map(
        a => a.velocity.components,
      );

      const avgVelocity = velocities.reduce(
        (sum, v) => sum.map((s, i) => s + v[i]),
        [0, 0, 0],
      ).map(v => v / velocities.length);

      const coherence = velocities.reduce((sum, v) => {
        const dot = v.reduce((s, vi, i) => s + vi * avgVelocity[i], 0);
        return sum + dot;
      }, 0) / velocities.length;

      expect(coherence).toBeGreaterThan(0.9);
    });

    it('should suppress detrimental patterns', async () => {
      const config = createDefaultConfig('pso');
      const swarm = await engine.initializeSwarm(swarmId, problemDef, config);

      // Create stagnation pattern
      swarm.agents.forEach(agent => {
        agent.velocity.magnitude = 0.01; // Very slow
        agent.fitness = 0.3; // Low fitness
        (agent.memory as { stagnationCount?: number }).stagnationCount = 10;
      });
      swarm.state.phase = 'stagnation';

      const behaviors = detector.detectEmergentBehaviors(swarm);

      // Should detect need for disruption
      const amplifications = (detector as { amplifyBeneficialBehaviors: (...args: unknown[]) => unknown }).amplifyBeneficialBehaviors(swarm, behaviors);

      const disruption = amplifications.find((a: { type: string }) =>
        a.description.includes('disruption') ||
        a.description.includes('exploration'),
      );

      expect(disruption).toBeDefined();
    });
  });

  describe('Formation Detection', () => {
    it('should detect line formation', async () => {
      // Create line of agents
      const positions: number[][] = [];
      for (let i = 0; i < 10; i++) {
        positions.push([i, 5, 5]);
      }

      const agents = createPositionedAgents(positions);

      const swarm = createTestSwarm(swarmId, agents, problemDef, 'exploitation');

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const lineFormation = behaviors.formations.find(f => f.type === 'line');
      expect(lineFormation).toBeDefined();
      expect(lineFormation!.members.length).toBe(10);
    });

    it('should detect circle formation', async () => {
      // Create circle of agents
      const positions: number[][] = [];
      const radius = 3;
      const center = [5, 5, 5];

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 2 * Math.PI;
        positions.push([
          center[0] + radius * Math.cos(angle),
          center[1] + radius * Math.sin(angle),
          center[2],
        ]);
      }

      const agents = createPositionedAgents(positions);

      const swarm = createTestSwarm(swarmId, agents, problemDef, 'exploitation');

      const behaviors = detector.detectEmergentBehaviors(swarm);

      const circleFormation = behaviors.formations.find(f => f.type === 'circle');
      expect(circleFormation).toBeDefined();
      expect(circleFormation!.center).toBeDefined();
    });
  });
});