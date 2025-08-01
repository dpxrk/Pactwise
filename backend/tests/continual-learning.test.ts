/**
 * Tests for Continual Learning System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContinualLearningEngine } from '../supabase/functions/local-agents/continual-learning/continual-learning-engine.ts';
import { KnowledgeConsolidator } from '../supabase/functions/local-agents/continual-learning/knowledge-consolidator.ts';
import { ContinualLearningSecretaryAgent } from '../supabase/functions/local-agents/agents/continual-learning-secretary.ts';

// Test data
const testExperiences = [
  {
    id: 'exp-1',
    taskId: 'task-1',
    input: { text: 'Invoice #123', type: 'invoice' },
    output: { amount: 1000, date: '2024-01-01' },
    reward: 0.8,
    importance: 0.7,
    timestamp: new Date(),
    replayCount: 0,
    compressed: false,
  },
  {
    id: 'exp-2',
    taskId: 'task-1',
    input: { text: 'Contract ABC', type: 'contract' },
    output: { parties: ['A', 'B'], value: 50000 },
    reward: 0.9,
    importance: 0.9,
    timestamp: new Date(),
    replayCount: 0,
    compressed: false,
  },
];

describe('ContinualLearningEngine', () => {
  let engine: ContinualLearningEngine;

  beforeEach(() => {
    engine = new ContinualLearningEngine();
  });

  describe('Task Learning', () => {
    it('should learn a new task without forgetting', async () => {
      // Learn first task
      await engine.learnTask('task-1', testExperiences.slice(0, 1), {}, {
        name: 'test-strategy',
        type: 'regularization',
        hyperparameters: { epochs: 1, batchSize: 1 },
      });

      const state1 = engine.getState();
      expect(state1.taskSequenceNumber).toBe(1);
      expect(state1.knowledgeBase.coreKnowledge.length).toBeGreaterThan(0);

      // Learn second task
      await engine.learnTask('task-2', testExperiences.slice(1), {}, {
        name: 'test-strategy',
        type: 'regularization',
        hyperparameters: { epochs: 1, batchSize: 1 },
      });

      const state2 = engine.getState();
      expect(state2.taskSequenceNumber).toBe(2);

      // Check that knowledge from first task is retained
      const metrics = engine.getPerformanceMetrics();
      const backwardTransfer = Array.from(metrics.backwardTransfer.values());

      // Backward transfer should be minimal (close to 0 or slightly negative)
      backwardTransfer.forEach(transfer => {
        expect(transfer).toBeGreaterThan(-0.3); // Max 30% forgetting
      });
    });

    it('should consolidate knowledge periodically', async () => {
      await engine.learnTask('task-1', testExperiences, {}, {
        name: 'test-strategy',
        type: 'regularization',
        hyperparameters: { epochs: 1, batchSize: 1 },
      });

      await engine.consolidateKnowledge();

      const state = engine.getState();
      expect(state.consolidationState.lastConsolidation).toBeDefined();
      expect(state.knowledgeBase.knowledgeGraph.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze learning performance', async () => {
      await engine.learnTask('task-1', testExperiences, {}, {
        name: 'test-strategy',
        type: 'regularization',
        hyperparameters: { epochs: 1, batchSize: 1 },
      });

      const analysis = await engine.analyze();

      expect(analysis.stabilityPlasticityTradeoff).toBeGreaterThan(0);
      expect(analysis.knowledgeRetention).toBeGreaterThan(0.5);
      expect(analysis.transferEfficiency).toBeDefined();
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    it('should generate appropriate recommendations', async () => {
      const analysis = await engine.analyze();

      const hasValidRecommendations = analysis.recommendations.every(rec =>
        ['consolidation', 'rehearsal', 'architecture', 'hyperparameter'].includes(rec.type) &&
        ['low', 'medium', 'high'].includes(rec.priority),
      );

      expect(hasValidRecommendations).toBe(true);
    });
  });
});

describe('KnowledgeConsolidator', () => {
  let consolidator: KnowledgeConsolidator;

  beforeEach(() => {
    consolidator = new KnowledgeConsolidator();
  });

  describe('Consolidation Methods', () => {
    it('should perform sleep consolidation', async () => {
      const knowledgeBase = {
        coreKnowledge: [{
          id: 'k1',
          concept: 'test-concept',
          embedding: new Array(128).fill(0.1),
          importance: 0.8,
          firstLearnedAt: new Date(),
          lastAccessedAt: new Date(),
          reinforcementCount: 5,
          decay: 0.1,
        }],
        taskSpecificKnowledge: new Map(),
        crossTaskPatterns: [],
        knowledgeGraph: { nodes: [], edges: [], clusters: [] },
        retentionScores: new Map(),
      };

      const result = await consolidator.consolidate(
        knowledgeBase,
        testExperiences,
        {
          lastConsolidation: new Date(),
          consolidationMethod: {
            type: 'sleep',
            parameters: {},
            schedule: { frequency: 'periodic', interval: 3600 },
          },
          compressionLevel: 0,
          synapticIntelligence: {
            synapticImportance: new Map(),
            pathIntegral: new Map(),
            updateFrequency: 100,
          },
          progressiveNetworks: [],
        },
      );

      expect(result.consolidatedKnowledge).toBeDefined();
      expect(result.compressedExperiences).toBeDefined();
      expect(result.consolidationMetrics.knowledgeRetention).toBeGreaterThan(0);
    });

    it('should perform knowledge distillation', async () => {
      const knowledgeBase = {
        coreKnowledge: [],
        taskSpecificKnowledge: new Map([
          ['task-1', {
            taskId: 'task-1',
            knowledge: [{
              id: 'tk1',
              content: { data: 'test' },
              type: 'pattern' as const,
              protectionLevel: 0.9,
            }],
            taskContext: {},
            learnedAt: new Date(),
          }],
        ]),
        crossTaskPatterns: [],
        knowledgeGraph: { nodes: [], edges: [], clusters: [] },
        retentionScores: new Map(),
      };

      const result = await consolidator.consolidate(
        knowledgeBase,
        testExperiences,
        {
          lastConsolidation: new Date(),
          consolidationMethod: {
            type: 'distillation',
            parameters: {},
            schedule: { frequency: 'triggered' },
          },
          compressionLevel: 0,
          synapticIntelligence: {
            synapticImportance: new Map(),
            pathIntegral: new Map(),
            updateFrequency: 100,
          },
          progressiveNetworks: [],
        },
      );

      // Should have distilled concepts
      expect(result.consolidatedKnowledge.coreKnowledge.length).toBeGreaterThan(0);
      expect(result.consolidationMetrics.semanticPreservation).toBeGreaterThan(0.7);
    });
  });

  describe('Memory Compression', () => {
    it('should compress experiences efficiently', async () => {
      const manyExperiences = Array(100).fill(0).map((_, i) => ({
        ...testExperiences[0],
        id: `exp-${i}`,
        importance: Math.random(),
      }));

      const result = await consolidator.consolidate(
        {
          coreKnowledge: [],
          taskSpecificKnowledge: new Map(),
          crossTaskPatterns: [],
          knowledgeGraph: { nodes: [], edges: [], clusters: [] },
          retentionScores: new Map(),
        },
        manyExperiences,
        {
          lastConsolidation: new Date(),
          consolidationMethod: {
            type: 'rehearsal',
            parameters: {},
            schedule: { frequency: 'continuous' },
          },
          compressionLevel: 0.5,
          synapticIntelligence: {
            synapticImportance: new Map(),
            pathIntegral: new Map(),
            updateFrequency: 100,
          },
          progressiveNetworks: [],
        },
      );

      const compressedCount = result.compressedExperiences.filter(e => e.compressed).length;
      expect(compressedCount).toBeGreaterThan(0);
      expect(result.consolidationMetrics.compressionRatio).toBeLessThan(1);
    });
  });
});

describe('ContinualLearningSecretaryAgent', () => {
  let agent: ContinualLearningSecretaryAgent;
  let supabase: any;

  beforeEach(() => {
    // Mock Supabase client
    supabase = {
      from: () => ({
        insert: () => Promise.resolve({ error: null }),
        update: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null }),
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    };

    agent = new ContinualLearningSecretaryAgent(supabase, 'test-enterprise-id');
  });

  describe('Document Processing', () => {
    it('should process documents with learning', async () => {
      const input = {
        documentType: 'invoice',
        content: 'Invoice #12345\nAmount: $1,000\nDate: 2024-01-01',
        metadata: { source: 'email' },
      };

      const result = await agent.processDocument(input);

      expect(result.extractedData).toBeDefined();
      expect(result.documentCategory).toBeDefined();
      expect(result.suggestedActions).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should learn from document batches', async () => {
      const documents = [
        {
          documentType: 'invoice',
          content: 'Invoice #1\nAmount: $100',
        },
        {
          documentType: 'contract',
          content: 'Contract between A and B',
        },
      ];

      await agent.learnFromDocumentBatch(documents);

      const stats = await agent.getLearningStats();
      expect(stats.totalTasks).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Application', () => {
    it('should provide processing recommendations', async () => {
      const recommendations = await agent.getProcessingRecommendations('invoice');

      expect(recommendations.bestPractices).toBeInstanceOf(Array);
      expect(recommendations.commonPatterns).toBeInstanceOf(Array);
      expect(recommendations.suggestedOptimizations).toBeInstanceOf(Array);
    });

    it('should adapt to user preferences', async () => {
      const input = {
        documentType: 'report',
        content: 'Monthly sales report',
        userPreferences: {
          autoFile: true,
          fileLocation: '/reports/sales',
          notify: true,
          notifyUsers: ['manager@example.com'],
        },
      };

      const result = await agent.processDocument(input);

      // Should include preference-based actions
      const hasFileAction = result.suggestedActions.some(a =>
        a.includes('Auto-file'),
      );
      const hasNotifyAction = result.suggestedActions.some(a =>
        a.includes('Notify'),
      );

      expect(hasFileAction || hasNotifyAction).toBe(true);
    });
  });

  describe('Capabilities', () => {
    it('should report continual learning capabilities', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities.continualLearning).toBeDefined();
      expect(capabilities.continualLearning.enabled).toBe(true);
      expect(capabilities.specializedCapabilities).toContain(
        'Continuous improvement without forgetting',
      );
    });
  });
});

describe('Integration Tests', () => {
  it('should maintain performance across multiple learning cycles', async () => {
    const engine = new ContinualLearningEngine();

    // Simulate multiple learning cycles
    for (let i = 0; i < 5; i++) {
      const taskExperiences = testExperiences.map(exp => ({
        ...exp,
        taskId: `task-${i}`,
        id: `${exp.id}-${i}`,
      }));

      await engine.learnTask(`task-${i}`, taskExperiences, {}, {
        name: 'test-strategy',
        type: 'regularization',
        hyperparameters: { epochs: 1, batchSize: 1 },
      });

      if (i % 2 === 0) {
        await engine.consolidateKnowledge();
      }
    }

    const analysis = await engine.analyze();

    // Should maintain good performance
    expect(analysis.knowledgeRetention).toBeGreaterThan(0.7);
    expect(analysis.stabilityPlasticityTradeoff).toBeGreaterThan(0.5);

    // Should have learned patterns
    const state = engine.getState();
    expect(state.knowledgeBase.coreKnowledge.length).toBeGreaterThan(0);
    expect(state.taskSequenceNumber).toBe(5);
  });

  it('should efficiently handle memory constraints', async () => {
    const consolidator = new KnowledgeConsolidator();

    // Create many experiences to test memory management
    const largeExperienceSet = Array(1000).fill(0).map((_, i) => ({
      id: `exp-${i}`,
      taskId: `task-${Math.floor(i / 100)}`,
      input: { index: i, data: `data-${i}` },
      output: { result: i * 2 },
      reward: Math.random(),
      importance: Math.random(),
      timestamp: new Date(),
      replayCount: Math.floor(Math.random() * 10),
      compressed: false,
    }));

    const result = await consolidator.consolidate(
      {
        coreKnowledge: [],
        taskSpecificKnowledge: new Map(),
        crossTaskPatterns: [],
        knowledgeGraph: { nodes: [], edges: [], clusters: [] },
        retentionScores: new Map(),
      },
      largeExperienceSet,
      {
        lastConsolidation: new Date(Date.now() - 7200000), // 2 hours ago
        consolidationMethod: {
          type: 'rehearsal',
          parameters: { compressionTarget: 0.5 },
          schedule: { frequency: 'periodic', interval: 3600 },
        },
        compressionLevel: 0,
        synapticIntelligence: {
          synapticImportance: new Map(),
          pathIntegral: new Map(),
          updateFrequency: 100,
        },
        progressiveNetworks: [],
      },
    );

    // Should compress experiences
    expect(result.compressedExperiences.length).toBeLessThanOrEqual(largeExperienceSet.length);
    expect(result.consolidationMetrics.compressionRatio).toBeLessThan(1);
    expect(result.consolidationMetrics.consolidationEfficiency).toBeGreaterThan(0);
  });
});