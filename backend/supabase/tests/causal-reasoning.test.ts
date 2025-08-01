import { describe, it, expect, beforeEach } from 'vitest';
import { CausalFinancialAgent } from '../functions/local-agents/agents/causal-financial.ts';
import { CausalProcessingResult } from '../functions/local-agents/agents/causal-base.ts';
import { CausalReasoningEngine } from '../functions/local-agents/causal/causal-engine.ts';
import {
  CausalGraph,
  CausalQuery,
  StructuralCausalModel,
  CausalNode,
  CausalEdge,
} from '../functions/local-agents/causal/types.ts';

describe('Causal Reasoning System Tests', () => {
  let supabase: any;
  let agent: CausalFinancialAgent;
  let causalEngine: CausalReasoningEngine;
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

    agent = new CausalFinancialAgent(supabase, testEnterpriseId);
    causalEngine = new CausalReasoningEngine();
  });

  describe('Causal Graph Construction', () => {
    it('should create a valid causal graph', () => {
      const nodes = new Map<string, CausalNode>();
      nodes.set('X', {
        id: 'X',
        name: 'Treatment',
        type: 'intervention',
        parents: [],
        children: ['Y'],
      });
      nodes.set('Y', {
        id: 'Y',
        name: 'Outcome',
        type: 'observed',
        parents: ['X', 'Z'],
        children: [],
      });
      nodes.set('Z', {
        id: 'Z',
        name: 'Confounder',
        type: 'observed',
        parents: [],
        children: ['X', 'Y'],
      });

      const edges = new Map<string, CausalEdge>();
      edges.set('X->Y', { from: 'X', to: 'Y', type: 'direct', strength: 0.8 });
      edges.set('Z->X', { from: 'Z', to: 'X', type: 'direct', strength: 0.5 });
      edges.set('Z->Y', { from: 'Z', to: 'Y', type: 'direct', strength: 0.6 });

      const graph: CausalGraph = { nodes, edges };

      expect(graph.nodes.size).toBe(3);
      expect(graph.edges.size).toBe(3);
      expect(graph.nodes.get('Z')?.children).toContain('X');
      expect(graph.nodes.get('Z')?.children).toContain('Y');
    });
  });

  describe('Causal Inference - Do-Calculus', () => {
    it('should compute interventional queries using do-calculus', async () => {
      // Create a simple SCM for testing
      const scm = createTestSCM();
      const engine = new CausalReasoningEngine(scm);

      const query: CausalQuery = {
        type: 'interventional',
        target: 'revenue',
        intervention: new Map([['marketing_spend', 20000]]),
      };

      const result = await engine.performCausalInference(query);

      expect(result.query).toEqual(query);
      expect(result.identifiable).toBe(true);
      expect(result.method).toBeDefined();
      expect(typeof result.effect).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should identify when causal effect is not identifiable', async () => {
      const scm = createNonIdentifiableSCM();
      const engine = new CausalReasoningEngine(scm);

      const query: CausalQuery = {
        type: 'interventional',
        target: 'Y',
        intervention: new Map([['X', 1]]),
      };

      const result = await engine.performCausalInference(query);

      expect(result.identifiable).toBe(false);
      expect(result.explanation).toContain('not identifiable');
      expect(result.method).toBe('bounds_estimation');
    });
  });

  describe('Counterfactual Reasoning', () => {
    it('should compute counterfactual queries', async () => {
      const scm = createTestSCM();
      const engine = new CausalReasoningEngine(scm);

      const query: CausalQuery = {
        type: 'counterfactual',
        target: 'profit',
        intervention: new Map([['marketing_spend', 15000]]),
        evidence: new Map([
          ['marketing_spend', 10000],
          ['revenue', 100000],
          ['profit', 20000],
        ]),
      };

      const result = await engine.performCausalInference(query);

      expect(result.query.type).toBe('counterfactual');
      expect(result.identifiable).toBe(true);
      expect(result.method).toBe('three_step_counterfactual');
    });

    it('should generate counterfactual explanations', async () => {
      const scm = createTestSCM();
      const engine = new CausalReasoningEngine(scm);

      const factual = new Map([
        ['marketing_spend', 10000],
        ['sales_volume', 1000],
        ['revenue', 100000],
        ['profit', 10000],
      ]);

      const desiredOutcome = new Map([['profit', 50000]]);

      const counterfactual = await engine.generateCounterfactual(
        factual,
        desiredOutcome,
      );

      expect(counterfactual.factual).toEqual(factual);
      expect(counterfactual.intervention.size).toBeGreaterThan(0);
      expect(counterfactual.explanation).toContain('If');
      expect(counterfactual.difference.has('profit')).toBe(true);
    });
  });

  describe('Causal Discovery', () => {
    it('should discover causal structure from observational data', async () => {
      const data = new Map<string, any[]>();

      // Generate synthetic data with known causal relationships
      const n = 1000;
      const X = Array.from({ length: n }, () => Math.random() * 100);
      const Z = Array.from({ length: n }, () => Math.random() * 50);
      const Y = X.map((x, i) => x * 0.5 + Z[i] * 0.3 + Math.random() * 10);

      data.set('X', X);
      data.set('Z', Z);
      data.set('Y', Y);

      const discoveredGraph = await causalEngine.discoverCausalStructure(data);

      expect(discoveredGraph.nodes.size).toBe(3);
      expect(discoveredGraph.nodes.has('X')).toBe(true);
      expect(discoveredGraph.nodes.has('Y')).toBe(true);
      expect(discoveredGraph.nodes.has('Z')).toBe(true);

      // Should discover that X and Z cause Y
      const yNode = discoveredGraph.nodes.get('Y');
      expect(yNode?.parents.length).toBeGreaterThan(0);
    });
  });

  describe('Financial Agent with Causal Reasoning', () => {
    it('should identify causal relationships in financial data', async () => {
      const financialData = {
        causalQuestion: 'What is the causal effect of marketing spend on revenue?',
        variables: ['marketing_spend', 'revenue'],
        analyzeMarketing: true,
      };

      const result = await agent.process(financialData) as CausalProcessingResult;

      expect(result.causal).toBeDefined();
      expect(result.causal?.insights.length).toBeGreaterThan(0);

      const marketingInsight = result.causal?.insights.find(
        i => i.source === 'marketing_spend',
      );
      expect(marketingInsight).toBeDefined();
      expect(marketingInsight?.implications.length).toBeGreaterThan(0);
    });

    it('should recommend interventions for profit optimization', async () => {
      const optimizationRequest = {
        seekingInterventions: true,
        goals: [{
          variable: 'profit',
          value: 100000,
          priority: 1,
        }],
        currentState: {
          marketing_spend: 10000,
          revenue: 80000,
          operational_costs: 60000,
          profit: 10000,
        },
      };

      const result = await agent.process(optimizationRequest) as CausalProcessingResult;

      expect(result.causal?.interventions.length).toBeGreaterThan(0);

      const bestIntervention = result.causal?.interventions[0];
      expect(bestIntervention?.intervention.size).toBeGreaterThan(0);
      expect(bestIntervention?.outcomes.has('profit')).toBe(true);
      expect(bestIntervention?.confidence).toBeGreaterThan(0.5);
    });

    it('should perform what-if analysis', async () => {
      const whatIfScenario = {
        whatIf: {
          question: 'What if we increase marketing spend by 50%?',
          target: 'revenue',
          changes: { marketing_spend: 15000 },
          current: { marketing_spend: 10000 },
        },
      };

      const result = await agent.process(whatIfScenario) as CausalProcessingResult;

      expect(result.causal?.counterfactuals.length).toBeGreaterThan(0);

      const counterfactual = result.causal?.counterfactuals[0];
      expect(counterfactual?.intervention.has('marketing_spend')).toBe(true);
      expect(counterfactual?.explanation).toContain('marketing');
    });

    it('should explain causal relationships in natural language', async () => {
      const explanationRequest = {
        causalQuestion: 'Why does operational efficiency affect profitability?',
        variables: ['operational_costs', 'profit'],
        requestCausalAnalysis: true,
      };

      const result = await agent.process(explanationRequest) as CausalProcessingResult;

      expect(result.causal?.explanations.length).toBeGreaterThan(0);

      const explanation = result.causal?.explanations[0];
      expect(explanation).toContain('cause');
      expect(result.causal?.insights.some(i =>
        i.target === 'profit' && i.source === 'operational_costs',
      )).toBe(true);
    });

    it('should perform mediation analysis', async () => {
      const mediationRequest = {
        causalQuestion: 'How much of marketing effect on revenue is mediated through customer acquisition?',
        variables: ['marketing_spend', 'customer_acquisition', 'revenue'],
        analyzeMediation: true,
      };

      const result = await agent.process(mediationRequest) as CausalProcessingResult;

      expect(result.causal?.insights.some(i =>
        i.type === 'mediator',
      )).toBe(true);
    });
  });

  describe('Causal Insights Generation', () => {
    it('should identify confounders', async () => {
      const confoundedData = {
        causalQuestion: 'Does sales volume cause revenue or is there a confounder?',
        variables: ['sales_volume', 'revenue', 'market_conditions'],
        checkConfounding: true,
      };

      const result = await agent.process(confoundedData) as CausalProcessingResult;

      const confounderInsight = result.causal?.insights.find(
        i => i.type === 'confounder',
      );

      expect(confounderInsight).toBeDefined();
      expect(confounderInsight?.implications).toContain(
        expect.stringContaining('control for'),
      );
    });

    it('should identify indirect causal effects', async () => {
      const indirectEffectData = {
        causalQuestion: 'What are the indirect effects of efficiency initiatives on cash flow?',
        variables: ['efficiency_initiatives', 'cash_flow'],
      };

      const result = await agent.process(indirectEffectData) as CausalProcessingResult;

      const indirectInsight = result.causal?.insights.find(
        i => i.type === 'indirect_cause',
      );

      expect(indirectInsight).toBeDefined();
      expect(indirectInsight?.description).toContain('indirect');
    });
  });
});

// Helper functions to create test SCMs
function createTestSCM(): StructuralCausalModel {
  const nodes = new Map<string, CausalNode>();
  const edges = new Map<string, CausalEdge>();

  // Simple financial model
  nodes.set('marketing_spend', {
    id: 'marketing_spend',
    name: 'Marketing Spend',
    type: 'intervention',
    parents: [],
    children: ['sales_volume'],
  });

  nodes.set('sales_volume', {
    id: 'sales_volume',
    name: 'Sales Volume',
    type: 'observed',
    parents: ['marketing_spend'],
    children: ['revenue'],
  });

  nodes.set('revenue', {
    id: 'revenue',
    name: 'Revenue',
    type: 'observed',
    parents: ['sales_volume'],
    children: ['profit'],
  });

  nodes.set('operational_costs', {
    id: 'operational_costs',
    name: 'Operational Costs',
    type: 'observed',
    parents: [],
    children: ['profit'],
  });

  nodes.set('profit', {
    id: 'profit',
    name: 'Profit',
    type: 'observed',
    parents: ['revenue', 'operational_costs'],
    children: [],
  });

  // Add edges
  edges.set('marketing->sales', {
    from: 'marketing_spend',
    to: 'sales_volume',
    type: 'direct',
    strength: 0.7,
  });

  edges.set('sales->revenue', {
    from: 'sales_volume',
    to: 'revenue',
    type: 'direct',
    strength: 0.9,
  });

  edges.set('revenue->profit', {
    from: 'revenue',
    to: 'profit',
    type: 'direct',
    strength: 1.0,
  });

  edges.set('costs->profit', {
    from: 'operational_costs',
    to: 'profit',
    type: 'direct',
    strength: -1.0,
  });

  // Create equations
  const equations = new Map();

  equations.set('sales_volume', {
    nodeId: 'sales_volume',
    compute: (parents: Map<string, any>, noise: any) => {
      const marketing = parents.get('marketing_spend') || 0;
      return Math.sqrt(marketing) * 10 + (noise || 0);
    },
    isLinear: false,
  });

  equations.set('revenue', {
    nodeId: 'revenue',
    compute: (parents: Map<string, any>, noise: any) => {
      const sales = parents.get('sales_volume') || 0;
      return sales * 100 + (noise || 0);
    },
    isLinear: true,
    coefficients: new Map([['sales_volume', 100]]),
  });

  equations.set('profit', {
    nodeId: 'profit',
    compute: (parents: Map<string, any>, noise: any) => {
      const revenue = parents.get('revenue') || 0;
      const costs = parents.get('operational_costs') || 0;
      return revenue - costs + (noise || 0);
    },
    isLinear: true,
    coefficients: new Map([['revenue', 1], ['operational_costs', -1]]),
  });

  // Create noise distributions
  const noiseDistributions = new Map();

  for (const nodeId of nodes.keys()) {
    noiseDistributions.set(nodeId, {
      nodeId,
      type: 'normal',
      parameters: { mean: 0, stddev: 10 },
      sample: () => (Math.random() - 0.5) * 20,
    });
  }

  return {
    graph: { nodes, edges },
    equations,
    noiseDistributions,
  };
}

function createNonIdentifiableSCM(): StructuralCausalModel {
  const nodes = new Map<string, CausalNode>();
  const edges = new Map<string, CausalEdge>();

  // Model with unobserved confounder
  nodes.set('X', {
    id: 'X',
    name: 'Treatment',
    type: 'observed',
    parents: ['U'],
    children: ['Y'],
  });

  nodes.set('Y', {
    id: 'Y',
    name: 'Outcome',
    type: 'observed',
    parents: ['X', 'U'],
    children: [],
  });

  nodes.set('U', {
    id: 'U',
    name: 'Unobserved Confounder',
    type: 'latent',
    parents: [],
    children: ['X', 'Y'],
  });

  edges.set('U->X', { from: 'U', to: 'X', type: 'direct' });
  edges.set('U->Y', { from: 'U', to: 'Y', type: 'direct' });
  edges.set('X->Y', { from: 'X', to: 'Y', type: 'direct' });

  const equations = new Map();
  const noiseDistributions = new Map();

  return {
    graph: { nodes, edges },
    equations,
    noiseDistributions,
  };
}