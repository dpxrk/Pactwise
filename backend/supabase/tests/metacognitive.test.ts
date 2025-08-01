import { describe, it, expect, beforeEach } from 'vitest';
import { MetacognitiveSecretaryAgent } from '../functions/local-agents/agents/metacognitive-secretary.ts';
import { MetacognitiveProcessingResult } from '../functions/local-agents/agents/metacognitive-base.ts';

describe('Metacognitive System Tests', () => {
  let supabase: any;
  let agent: MetacognitiveSecretaryAgent;
  const testEnterpriseId = 'test-enterprise-123';

  beforeEach(() => {
    // Mock Supabase client
    supabase = {
      from: (_table: string) => ({
        insert: async (data: any) => ({ data, error: null }),
        select: async () => ({ data: [], error: null }),
        update: async (data: any) => ({ data, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
      rpc: async (_fn: string, _params: any) => ({ data: null, error: null }),
    };

    agent = new MetacognitiveSecretaryAgent(supabase, testEnterpriseId);
  });

  describe('Strategy Selection', () => {
    it('should select appropriate strategy based on document complexity', async () => {
      // Simple document
      const simpleDoc = {
        content: 'This is a simple document with basic text.',
        metadata: { type: 'simple' },
      };

      const simpleResult = await agent.process(simpleDoc) as MetacognitiveProcessingResult;

      expect(simpleResult.metacognitive?.strategyUsed.name).toContain('quick_scan');
      expect(simpleResult.metacognitive?.strategyUsed.type).toBe('intuitive');

      // Complex document
      const complexDoc = {
        content: 'CONTRACTUAL AGREEMENT\n\nThis agreement is made between Party A and Party B...\n\nSection 1: Terms and Conditions\n...\nSection 2: Payment Terms\n...\nSignatures:',
        metadata: { type: 'contract', complexity: 'high' },
        structure: { depth: 5, sections: 10 },
      };

      const complexResult = await agent.process(complexDoc) as MetacognitiveProcessingResult;

      expect(complexResult.metacognitive?.strategyUsed.name).toContain('structured_extraction');
      expect(complexResult.metacognitive?.strategyUsed.type).toBe('analytical');
    });
  });

  describe('Confidence Calibration', () => {
    it('should calibrate confidence based on processing results', async () => {
      const testDoc = {
        content: 'Test document for confidence calibration',
        expectedResult: { type: 'test', extracted: true },
      };

      const result = await agent.process(testDoc) as MetacognitiveProcessingResult;

      expect(result.metacognitive?.calibration).toBeDefined();
      expect(result.metacognitive?.calibration.initialConfidence).toBeGreaterThan(0);
      expect(result.metacognitive?.calibration.finalConfidence).toBeGreaterThan(0);
      expect(result.metacognitive?.calibration.calibrationError).toBeLessThan(1);
    });

    it('should identify when agent is overconfident', async () => {
      const difficultDoc = {
        content: 'Ambiguous content that is hard to parse correctly',
        expectedResult: { type: 'specific', data: 'exact' },
      };

      const result = await agent.process(difficultDoc) as MetacognitiveProcessingResult;

      if (result.metacognitive?.calibration.adjustmentNeeded < 0) {
        expect(result.metacognitive.calibration.isWellCalibrated).toBe(false);
        expect(result.metacognitive.insights.some(i =>
          i.type === 'confidence_adjustment',
        )).toBe(true);
      }
    });
  });

  describe('Metacognitive Insights', () => {
    it('should generate learning insights from processing', async () => {
      const testDoc = {
        content: 'Document requiring multiple processing strategies',
        metadata: { requiresLearning: true },
      };

      const result = await agent.process(testDoc) as MetacognitiveProcessingResult;

      expect(result.metacognitive?.insights).toBeDefined();
      expect(Array.isArray(result.metacognitive?.insights)).toBe(true);

      const insightTypes = result.metacognitive?.insights.map(i => i.type) || [];
      expect(insightTypes.some(type =>
        ['learning_opportunity', 'strategy_recommendation', 'performance_prediction'].includes(type),
      )).toBe(true);
    });
  });

  describe('Self-Reflection', () => {
    it('should generate self-reflection report', async () => {
      // Process multiple documents to build history
      const documents = [
        { content: 'Contract document 1', type: 'contract' },
        { content: 'Invoice document', type: 'invoice' },
        { content: 'Report document', type: 'report' },
        { content: 'Contract document 2', type: 'contract' },
      ];

      for (const doc of documents) {
        await agent.process(doc);
      }

      // Process final document and check self-reflection
      const finalDoc = { content: 'Final test document' };
      const result = await agent.process(finalDoc) as MetacognitiveProcessingResult;

      expect(result.metacognitive?.selfReflection).toBeDefined();
      expect(result.metacognitive?.selfReflection.strengths).toBeDefined();
      expect(result.metacognitive?.selfReflection.weaknesses).toBeDefined();
      expect(result.metacognitive?.selfReflection.improvementAreas).toBeDefined();
      expect(result.metacognitive?.selfReflection.learningInsights).toBeDefined();
      expect(result.metacognitive?.selfReflection.confidenceAssessment).toBeDefined();
    });
  });

  describe('Process Monitoring', () => {
    it('should monitor cognitive process with checkpoints', async () => {
      const testDoc = {
        content: 'Document for process monitoring test',
        processMonitoring: true,
      };

      const result = await agent.process(testDoc) as MetacognitiveProcessingResult;

      expect(result.metacognitive?.processingMonitor).toBeDefined();
      expect(result.metacognitive?.processingMonitor.checkpointCount).toBeGreaterThan(2);
      expect(result.metacognitive?.processingMonitor.confidenceTrajectory).toBeDefined();
      expect(result.metacognitive?.processingMonitor.shouldContinue).toBeDefined();
    });
  });

  describe('Strategy Adaptation', () => {
    it('should adapt strategies based on performance', async () => {
      // Simulate poor performance with current strategy
      const difficultDocs = Array(5).fill({
        content: 'Very complex document that current strategy handles poorly',
        expectedResult: { success: false },
      });

      let lastStrategy = '';

      for (const doc of difficultDocs) {
        const result = await agent.process(doc) as MetacognitiveProcessingResult;
        const currentStrategy = result.metacognitive?.strategyUsed.name || '';

        if (lastStrategy && lastStrategy === currentStrategy) {
          // Check if exploration is happening
          const insights = result.metacognitive?.insights || [];
          const hasStrategyRecommendation = insights.some(i =>
            i.type === 'strategy_recommendation',
          );
          expect(hasStrategyRecommendation).toBe(true);
        }

        lastStrategy = currentStrategy;
      }
    });
  });

  describe('Error Learning', () => {
    it('should learn from errors and adjust strategies', async () => {
      const errorProneDoc = {
        content: null, // This will cause an error
        metadata: { testError: true },
      };

      const result = await agent.process(errorProneDoc) as MetacognitiveProcessingResult;

      expect(result.success).toBe(false);
      expect(result.metacognitive?.insights.some(i =>
        i.type === 'learning_opportunity' && i.description.includes('Error'),
      )).toBe(true);
    });
  });

  describe('Cognitive State Management', () => {
    it('should maintain and update cognitive state', async () => {
      const testDoc = {
        content: 'Test document for cognitive state tracking',
      };

      const result = await agent.process(testDoc) as MetacognitiveProcessingResult;
      const cognitiveState = result.metacognitive?.cognitiveState;

      expect(cognitiveState).toBeDefined();
      expect(cognitiveState?.confidence).toBeGreaterThanOrEqual(0);
      expect(cognitiveState?.confidence).toBeLessThanOrEqual(1);
      expect(cognitiveState?.uncertainty).toBeGreaterThanOrEqual(0);
      expect(cognitiveState?.uncertainty).toBeLessThanOrEqual(1);
      expect(cognitiveState?.cognitiveLoad).toBeGreaterThanOrEqual(0);
      expect(cognitiveState?.cognitiveLoad).toBeLessThanOrEqual(1);
      expect(cognitiveState?.performanceMetrics).toBeDefined();
      expect(cognitiveState?.activeStrategies.length).toBeGreaterThan(0);
    });
  });
});

describe('Metacognitive Integration Tests', () => {
  it('should demonstrate full metacognitive workflow', async () => {
    const supabase = {
      from: (_table: string) => ({
        insert: async (data: any) => ({ data, error: null }),
        select: async () => ({ data: [], error: null }),
        update: async (data: any) => ({ data, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
      rpc: async (_fn: string, _params: any) => ({ data: null, error: null }),
    };

    const agent = new MetacognitiveSecretaryAgent(supabase, 'test-enterprise');

    // Process a series of documents with increasing complexity
    const documents = [
      {
        content: 'Simple memo: Meeting at 3pm tomorrow.',
        complexity: 'low',
      },
      {
        content: 'PURCHASE ORDER #12345\nVendor: ABC Corp\nAmount: $5,000\nItems:\n- Widget A x100\n- Widget B x50',
        complexity: 'medium',
      },
      {
        content: `MASTER SERVICE AGREEMENT
        
This Master Service Agreement ("Agreement") is entered into as of January 1, 2024 ("Effective Date") 
between TechCorp Inc., a Delaware corporation ("Client"), and ServicePro LLC, a California limited 
liability company ("Service Provider").

WHEREAS, Client desires to engage Service Provider to perform certain services...

1. SERVICES
   1.1 Scope of Services. Service Provider shall provide the services described in Exhibit A...
   1.2 Service Levels. Service Provider shall maintain the service levels set forth in Exhibit B...

2. COMPENSATION
   2.1 Fees. Client shall pay Service Provider the fees set forth in Exhibit C...
   2.2 Payment Terms. All invoices shall be paid within thirty (30) days...

[... continues for 20 pages ...]`,
        complexity: 'high',
      },
    ];

    const results = [];

    for (const doc of documents) {
      console.log(`\nProcessing ${doc.complexity} complexity document...`);
      const result = await agent.process(doc) as MetacognitiveProcessingResult;

      console.log('Strategy used:', result.metacognitive?.strategyUsed.name);
      console.log('Confidence:', result.metacognitive?.cognitiveState.confidence);
      console.log('Cognitive load:', result.metacognitive?.cognitiveState.cognitiveLoad);
      console.log('Insights:', result.metacognitive?.insights.map(i => i.type));

      results.push(result);
    }

    // Verify adaptive behavior
    expect(results[0].metacognitive?.strategyUsed.type).toBe('intuitive'); // Simple doc
    expect(results[1].metacognitive?.strategyUsed.type).toBe('heuristic'); // Medium doc
    expect(results[2].metacognitive?.strategyUsed.type).toBe('analytical'); // Complex doc

    // Verify learning progression
    const cognitiveLoads = results.map(r => r.metacognitive?.cognitiveState.cognitiveLoad || 0);
    expect(cognitiveLoads[0]).toBeLessThan(cognitiveLoads[2]); // Load increases with complexity

    // Verify self-awareness
    const lastResult = results[results.length - 1];
    expect(lastResult.metacognitive?.selfReflection).toBeDefined();
    expect(lastResult.metacognitive?.insights.length).toBeGreaterThan(0);
  });
});