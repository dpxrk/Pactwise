import { describe, it, expect, beforeEach } from 'vitest';
import { StigmergicEnvironment } from '../../supabase/functions/local-agents/swarm/stigmergy.ts';
import {
  Position,
  DigitalPheromone,
} from '../../supabase/functions/local-agents/swarm/types.ts';

describe('StigmergicEnvironment', () => {
  let env: StigmergicEnvironment;
  let swarmId: string;

  beforeEach(() => {
    env = new StigmergicEnvironment();
    swarmId = 'test-swarm-1';
  });

  describe('Pheromone Field Management', () => {
    it('should initialize pheromone field for swarm', () => {
      const field = env.initializeField(swarmId, {
        resolution: 10,
        evaporationRate: 0.1,
        diffusionRate: 0.05,
      });

      expect(field).toBeDefined();
      expect(field.resolution).toBe(10);
      expect(field.grid.length).toBe(10);
      expect(field.grid[0].length).toBe(10);
      expect(field.grid[0][0].length).toBe(10);
    });

    it('should handle different field resolutions', () => {
      const resolutions = [5, 20, 50];

      resolutions.forEach((res, index) => {
        const field = env.initializeField(
          `swarm-res-${index}`,
          { resolution: res },
        );

        expect(field.grid.length).toBe(res);
        expect(field.grid[0].length).toBe(res);
      });
    });

    it('should deposit pheromones at position', () => {
      env.initializeField(swarmId, { resolution: 10 });

      const position: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 0.9,
        timestamp: Date.now(),
      };

      const deposit: DigitalPheromone = {
        id: 'pheromone-1',
        type: 'attraction',
        strength: 0.8,
        position,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };

      env.depositPheromone(swarmId, deposit);

      // Verify pheromone was deposited by reading it back
      const pheromones = env.readGradient(swarmId, position, 1);
      expect(pheromones.length).toBeGreaterThan(0);
    });

    it('should handle pheromone evaporation', () => {
      env.initializeField(swarmId, {
        resolution: 10,
        evaporationRate: 0.2,
      });

      // Deposit pheromone
      const position: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const deposit: DigitalPheromone = {
        id: 'pheromone-trail-1',
        type: 'trail',
        position,
        strength: 1.0,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.2,
        metadata: {},
      };
      env.depositPheromone(swarmId, deposit);

      // Get initial intensity
      const initialReading = env.readGradient(swarmId, position, 'trail');
      const initialIntensity = initialReading.strength;

      // Update field (triggers evaporation)
      env.update(swarmId);

      // Check reduced intensity
      const afterReading = env.readGradient(swarmId, position, 'trail');
      const afterIntensity = afterReading.strength;

      expect(afterIntensity).toBeLessThan(initialIntensity);
      expect(afterIntensity).toBeCloseTo(initialIntensity * 0.8, 2);
    });

    it('should handle pheromone diffusion', () => {
      env.initializeField(swarmId, {
        resolution: 20,
        diffusionRate: 0.1,
      });

      // Deposit strong pheromone at center
      const center: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const deposit: DigitalPheromone = {
        id: 'pheromone-food-1',
        type: 'food',
        position: center,
        strength: 10.0,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      env.depositPheromone(swarmId, deposit);

      // Check neighbor before diffusion
      const neighbor: Position = {
        dimensions: [0.55, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const beforeReading = env.readGradient(swarmId, neighbor, 'food');
      const beforeIntensity = beforeReading.strength;

      // Update field (triggers diffusion)
      env.update(swarmId);

      // Check neighbor after diffusion
      const afterReading = env.readGradient(swarmId, neighbor, 'food');
      const afterIntensity = afterReading.strength;

      expect(afterIntensity).toBeGreaterThan(beforeIntensity);
    });
  });

  describe('Pheromone Reading', () => {
    beforeEach(() => {
      env.initializeField(swarmId, { resolution: 10 });
    });

    it('should read pheromone intensity at position', () => {
      const position: Position = {
        dimensions: [0.3, 0.3, 0.3],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      // Deposit different pheromone types
      const attractionDeposit: DigitalPheromone = {
        id: 'pheromone-attr-1',
        type: 'attraction',
        position,
        strength: 0.7,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      const repulsionDeposit: DigitalPheromone = {
        id: 'pheromone-rep-1',
        type: 'repulsion',
        position,
        strength: 0.3,
        depositorId: 'agent-2',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      env.depositPheromone(swarmId, attractionDeposit);
      env.depositPheromone(swarmId, repulsionDeposit);
      const trailDeposit: DigitalPheromone = {
        id: 'pheromone-trail-2',
        type: 'trail',
        position,
        strength: 0.5,
        depositorId: 'agent-3',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      env.depositPheromone(swarmId, trailDeposit);

      const attractionReading = env.readGradient(swarmId, position, 'attraction');
      const repulsionReading = env.readGradient(swarmId, position, 'repulsion');
      const trailReading = env.readGradient(swarmId, position, 'trail');

      expect(attractionReading.types.get('attraction') || 0).toBeCloseTo(0.7, 1);
      expect(repulsionReading.types.get('repulsion') || 0).toBeCloseTo(0.3, 1);
      expect(trailReading.types.get('trail') || 0).toBeCloseTo(0.5, 1);
    });

    it('should calculate pheromone gradient', () => {
      // Create gradient by depositing at different positions
      const positions = [
        { pos: [0.3, 0.5, 0.5], strength: 0.3 },
        { pos: [0.5, 0.5, 0.5], strength: 0.6 },
        { pos: [0.7, 0.5, 0.5], strength: 0.9 },
      ];

      positions.forEach(({ pos, strength }, index) => {
        const deposit: DigitalPheromone = {
          id: `pheromone-gradient-${index}`,
          type: 'attraction',
          position: {
            dimensions: pos,
            confidence: 1.0,
            timestamp: Date.now(),
          },
          strength,
          depositorId: 'agent-1',
          timestamp: Date.now(),
          evaporationRate: 0.1,
          metadata: {},
        };
        env.depositPheromone(swarmId, deposit);
      });

      // Read at center
      const center: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const reading = env.readGradient(swarmId, center, 'attraction');

      expect(reading.direction).toBeDefined();
      expect(reading.direction[0]).toBeGreaterThan(0); // Points right
      expect(reading.strength).toBeGreaterThan(0);
    });

    it('should handle boundary conditions', () => {
      // Test positions at boundaries
      const boundaryPositions = [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0.5],
        [0.5, 0, 1],
      ];

      boundaryPositions.forEach(dims => {
        const position: Position = {
          dimensions: dims,
          confidence: 1.0,
          timestamp: Date.now(),
        };

        // Should not throw
        expect(() => {
          const deposit: DigitalPheromone = {
            id: `pheromone-boundary-${dims.join('-')}`,
            type: 'trail',
            position,
            strength: 0.5,
            depositorId: 'agent-1',
            timestamp: Date.now(),
            evaporationRate: 0.1,
            metadata: {},
          };
          env.depositPheromone(swarmId, deposit);
          env.readGradient(swarmId, position);
        }).not.toThrow();
      });
    });
  });

  describe('Digital Pheromones', () => {
    beforeEach(() => {
      env.initializeField(swarmId);
    });

    it('should store and retrieve digital pheromones', () => {
      const digitalPheromone: DigitalPheromone = {
        id: 'digital-1',
        type: 'information',
        position: {
          dimensions: [0.5, 0.5, 0.5],
          confidence: 1.0,
          timestamp: Date.now(),
        },
        strength: 0.9,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {
          message: 'Found good solution',
          quality: 0.9,
          location: [0.5, 0.5],
          ttl: 5000,
          propagation: {
            radius: 0.2,
            decay: 0.1,
            speed: 0.05,
          },
        },
      };

      env.depositPheromone(swarmId, digitalPheromone);

      const position: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const nearby = env.querySemanticPheromones(swarmId, { position, radius: 0.3 });

      expect(nearby.length).toBe(1);
      expect(nearby[0].metadata.message).toBe('Found good solution');
    });

    it('should respect TTL for digital pheromones', () => {
      const shortLivedPheromone: DigitalPheromone = {
        id: 'digital-2',
        type: 'alarm',
        position: {
          dimensions: [0.5, 0.5, 0.5],
          confidence: 1.0,
          timestamp: Date.now(),
        },
        strength: 1.0,
        depositorId: 'agent-1',
        timestamp: Date.now() - 6000, // Expired
        evaporationRate: 0.1,
        metadata: {
          alert: 'danger',
          ttl: 5000,
          propagation: {
            radius: 0.3,
            decay: 0.2,
            speed: 0.1,
          },
        },
      };

      env.depositPheromone(swarmId, shortLivedPheromone);

      const position: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const nearby = env.querySemanticPheromones(swarmId, { position, radius: 0.5 });

      expect(nearby.length).toBe(0); // Should be filtered out
    });

    it('should propagate digital pheromones', () => {
      const propagatingPheromone: DigitalPheromone = {
        id: 'digital-3',
        type: 'discovery',
        position: {
          dimensions: [0.5, 0.5, 0.5],
          confidence: 1.0,
          timestamp: Date.now(),
        },
        strength: 1.0,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {
          finding: 'new path',
          ttl: 10000,
          propagation: {
            radius: 0.1,
            decay: 0.1,
            speed: 0.1,
          },
        },
      };

      env.depositPheromone(swarmId, propagatingPheromone);

      // Initial radius
      const closePosition: Position = {
        dimensions: [0.55, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      let nearby = env.querySemanticPheromones(swarmId, { position: closePosition, radius: 0.08 });
      expect(nearby.length).toBe(0); // Outside initial radius

      // Update field (triggers propagation)
      env.update(swarmId);

      // Check expanded radius
      nearby = env.querySemanticPheromones(swarmId, { position: closePosition, radius: 0.12 });
      expect(nearby.length).toBe(1); // Now within propagated radius
    });
  });

  describe('Pheromone Patterns', () => {
    beforeEach(() => {
      env.initializeField(swarmId, { resolution: 20 });
    });

    it('should create trail patterns', () => {
      // Simulate ant trail
      const trailPoints = [];
      for (let i = 0; i < 10; i++) {
        trailPoints.push({
          dimensions: [i / 10, 0.5, 0.5],
          confidence: 1.0,
          timestamp: Date.now(),
        });
      }

      // Deposit pheromones along trail
      trailPoints.forEach((pos, index) => {
        const deposit: DigitalPheromone = {
          id: `trail-${index}`,
          type: 'trail',
          position: pos,
          strength: 0.8 - index * 0.05, // Decay along trail
          depositorId: `ant-${index}`,
          timestamp: Date.now(),
          evaporationRate: 0.1,
          metadata: {},
        };
        env.depositPheromone(swarmId, deposit);
      });

      // Check trail continuity
      const midPoint: Position = {
        dimensions: [0.45, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const reading = env.readGradient(swarmId, midPoint, 'trail');
      expect(reading.strength).toBeGreaterThan(0);

      // Check gradient points along trail
      expect(reading.direction[0]).not.toBe(0);
    });

    it('should create repulsion zones', () => {
      // Create danger zone
      const dangerCenter: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      // Multiple agents mark danger
      for (let i = 0; i < 5; i++) {
        const deposit: DigitalPheromone = {
          id: `alarm-${i}`,
          type: 'alarm',
          position: dangerCenter,
          strength: 1.0,
          depositorId: `agent-${i}`,
          timestamp: Date.now(),
          evaporationRate: 0.1,
          metadata: {},
        };
        env.depositPheromone(swarmId, deposit);
      }

      // Check strong repulsion at center
      const centerReading = env.readGradient(swarmId, dangerCenter, 'alarm');
      expect(centerReading.strength).toBeGreaterThan(3);

      // Check decreasing intensity away from center
      const awayPosition: Position = {
        dimensions: [0.7, 0.7, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      const awayReading = env.readGradient(swarmId, awayPosition, 'alarm');
      expect(awayReading.strength).toBeLessThan(
        centerReading.strength,
      );
    });

    it('should support multiple pheromone types interaction', () => {
      const position: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      // Deposit conflicting pheromones
      const foodDeposit: DigitalPheromone = {
        id: 'food-1',
        type: 'food',
        position,
        strength: 0.9,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      const alarmDeposit: DigitalPheromone = {
        id: 'alarm-1',
        type: 'alarm',
        position,
        strength: 0.7,
        depositorId: 'agent-2',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      env.depositPheromone(swarmId, foodDeposit);
      env.depositPheromone(swarmId, alarmDeposit);

      const foodReading = env.readGradient(swarmId, position, 'food');
      const alarmReading = env.readGradient(swarmId, position, 'alarm');

      // Both should be present
      expect(foodReading.types.get('food') || 0).toBeCloseTo(0.9, 1);
      expect(alarmReading.types.get('alarm') || 0).toBeCloseTo(0.7, 1);

      // Check overall strength
      const overallReading = env.readGradient(swarmId, position);
      expect(overallReading.strength).toBeGreaterThan(0);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large-scale deposits efficiently', () => {
      env.initializeField(swarmId, { resolution: 50 });

      const startTime = Date.now();

      // Deposit many pheromones
      for (let i = 0; i < 1000; i++) {
        const position: Position = {
          dimensions: [Math.random(), Math.random(), Math.random()],
          confidence: 1.0,
          timestamp: Date.now(),
        };

        const deposit: DigitalPheromone = {
          id: `perf-trail-${i}`,
          type: 'trail',
          position,
          strength: Math.random(),
          depositorId: `agent-${i % 100}`,
          timestamp: Date.now(),
          evaporationRate: 0.1,
          metadata: {},
        };
        env.depositPheromone(swarmId, deposit);
      }

      const depositTime = Date.now() - startTime;
      expect(depositTime).toBeLessThan(100); // Should be fast

      // Update should also be efficient
      const updateStart = Date.now();
      env.update(swarmId);
      const updateTime = Date.now() - updateStart;

      expect(updateTime).toBeLessThan(50);
    });

    it('should clean up old deposits', () => {
      env.initializeField(swarmId);

      // Add old deposits
      for (let i = 0; i < 100; i++) {
        const oldDeposit: DigitalPheromone = {
          id: `old-${i}`,
          depositorId: 'agent-1',
          type: 'trail',
          position: {
            dimensions: [Math.random(), Math.random(), Math.random()],
            confidence: 1.0,
            timestamp: Date.now() - 100000, // Very old
          },
          strength: 0.001, // Very weak
          timestamp: Date.now() - 100000,
          evaporationRate: 0.1,
          metadata: {},
        };

        // Directly add to test cleanup
        const deposits = env['deposits'].get(swarmId) || [];
        deposits.push(oldDeposit);
        env['deposits'].set(swarmId, deposits);
      }

      // Update triggers cleanup
      env.update(swarmId);

      const remainingDeposits = env['deposits'].get(swarmId) || [];
      expect(remainingDeposits.length).toBe(0);
    });
  });

  describe('Multi-swarm Support', () => {
    it('should maintain separate fields for different swarms', () => {
      const swarm1 = 'swarm-1';
      const swarm2 = 'swarm-2';

      env.initializeField(swarm1);
      env.initializeField(swarm2);

      const position: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      // Deposit in swarm1
      const deposit: DigitalPheromone = {
        id: 'swarm1-food-1',
        type: 'food',
        position,
        strength: 1.0,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      env.depositPheromone(swarm1, deposit);

      // Check readings
      const reading1 = env.readGradient(swarm1, position, 'food');
      const reading2 = env.readGradient(swarm2, position, 'food');

      expect(reading1.types.get('food') || 0).toBeCloseTo(1.0, 1);
      expect(reading2.types.get('food') || 0).toBe(0);
    });

    it('should support cross-swarm pheromone reading', () => {
      const swarm1 = 'swarm-1';
      const swarm2 = 'swarm-2';

      env.initializeField(swarm1);
      env.initializeField(swarm2);

      const position: Position = {
        dimensions: [0.5, 0.5, 0.5],
        confidence: 1.0,
        timestamp: Date.now(),
      };

      // Deposit in both swarms
      const deposit1: DigitalPheromone = {
        id: 'cross-swarm-1',
        type: 'trail',
        position,
        strength: 0.7,
        depositorId: 'agent-1',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      const deposit2: DigitalPheromone = {
        id: 'cross-swarm-2',
        type: 'trail',
        position,
        strength: 0.3,
        depositorId: 'agent-2',
        timestamp: Date.now(),
        evaporationRate: 0.1,
        metadata: {},
      };
      env.depositPheromone(swarm1, deposit1);
      env.depositPheromone(swarm2, deposit2);

      // Read from both swarms separately
      const reading1 = env.readGradient(swarm1, position, 'trail');
      const reading2 = env.readGradient(swarm2, position, 'trail');

      // Should have separate readings
      expect(reading1.types.get('trail') || 0).toBeCloseTo(0.7, 1);
      expect(reading2.types.get('trail') || 0).toBeCloseTo(0.3, 1);
    });
  });
});