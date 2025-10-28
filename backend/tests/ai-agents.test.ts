import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from './setup';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                requiredAgents: ['financial', 'legal'],
                priority: 8,
                estimatedComplexity: 'medium',
                summary: 'Contract review required',
              }),
            },
          }],
          usage: { total_tokens: 100 },
        }),
      },
    };
  },
}));

describe('AI Agent System', () => {
  let supabase: SupabaseClient;
  let testUser: User;
  let testEnterprise: string;
  let testSystem: System;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    testEnterprise = await testHelpers.createTestEnterprise(supabase);
    const userResult = await testHelpers.createTestUser(supabase, {
      enterprise_id: testEnterprise,
      role: 'manager',
    });
    testUser = userResult.user;

    // Create test agent system
    const { data: system } = await supabase
      .from('agent_system')
      .insert({
        name: 'Test Agent System',
        version: '1.0.0',
        config: {},
        capabilities: ['manager', 'secretary', 'financial', 'legal'],
      })
      .select()
      .single();
    testSystem = system;
  });

  describe('Agent Management', () => {
    it('should create agents', async () => {
      const agents = [
        { name: 'Manager Agent', type: 'manager' },
        { name: 'Secretary Agent', type: 'secretary' },
        { name: 'Financial Agent', type: 'financial' },
        { name: 'Legal Agent', type: 'legal' },
      ];

      for (const agentData of agents) {
        const { data, error } = await supabase
          .from('agents')
          .insert({
            ...agentData,
            system_id: testSystem.id,
            description: `Test ${agentData.type} agent`,
            is_active: true,
            capabilities: [`${agentData.type}_analysis`],
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.type).toBe(agentData.type);
      }
    });

    it('should create and process agent tasks', async () => {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Test Agent',
          type: 'secretary',
          system_id: testSystem.id,
          is_active: true,
        })
        .select()
        .single();

      const { data: task, error } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'test_task',
          priority: 5,
          payload: { test: true },
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(task).toBeDefined();
      expect(task.status).toBe('pending');
    });

    it('should generate agent insights', async () => {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Analytics Agent',
          type: 'analytics',
          system_id: testSystem.id,
          is_active: true,
        })
        .select()
        .single();

      const { data: insight, error } = await supabase
        .from('agent_insights')
        .insert({
          agent_id: agent.id,
          insight_type: 'contract_trend',
          title: 'Increasing contract volume',
          description: 'Contract creation rate has increased by 25%',
          severity: 'info',
          confidence_score: 0.85,
          is_actionable: true,
          data: { trend: 'increasing', percentage: 25 },
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(insight).toBeDefined();
      expect(insight.severity).toBe('info');
    });
  });

  describe('Memory System', () => {
    it('should store short-term memory', async () => {
      const { data, error } = await supabase
        .from('short_term_memory')
        .insert({
          user_id: testUser.id,
          memory_type: 'interaction',
          content: 'User asked about contract renewal',
          context: { topic: 'contracts', action: 'renewal' },
          importance_score: 0.7,
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.memory_type).toBe('interaction');
    });

    it('should consolidate to long-term memory', async () => {
      // Create important short-term memory
      await supabase
        .from('short_term_memory')
        .insert({
          user_id: testUser.id,
          memory_type: 'pattern',
          content: 'User frequently reviews technology vendor contracts',
          importance_score: 0.9,
          access_count: 5,
          enterprise_id: testEnterprise,
        });

      // Simulate consolidation
      const { data: memories } = await supabase
        .from('short_term_memory')
        .select('*')
        .gte('importance_score', 0.7)
        .gte('access_count', 3)
        .eq('enterprise_id', testEnterprise);

      expect(memories).toHaveLength(1);

      // Move to long-term
      const { error } = await supabase
        .from('long_term_memory')
        .insert({
          memory_type: memories[0].memory_type,
          content: memories[0].content,
          context: memories[0].context,
          importance_score: memories[0].importance_score,
          user_id: memories[0].user_id,
          enterprise_id: testEnterprise,
          consolidated_at: new Date().toISOString(),
        });

      expect(error).toBeNull();
    });
  });

  describe('Chat System', () => {
    it('should create chat sessions', async () => {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: testUser.id,
          title: 'Contract Analysis Help',
          context_type: 'general',
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(session).toBeDefined();
      expect(session.is_active).toBe(true);
    });

    it('should store chat messages', async () => {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: testUser.id,
          title: 'Test Chat',
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      const messages = [
        { role: 'user', content: 'How do I analyze a contract?' },
        { role: 'assistant', content: 'To analyze a contract, you can...' },
      ];

      for (const msg of messages) {
        const { error } = await supabase
          .from('chat_messages')
          .insert({
            session_id: session.id,
            ...msg,
            tokens: 50,
          });

        expect(error).toBeNull();
      }

      const { data: savedMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at');

      expect(savedMessages).toHaveLength(2);
    });
  });

  describe('Donna AI System', () => {
    it('should create knowledge nodes', async () => {
      const { data: node, error } = await supabase
        .from('donna_knowledge_nodes')
        .insert({
          node_type: 'concept',
          name: 'Contract Renewal Process',
          description: 'Standard process for renewing contracts',
          properties: {
            steps: ['review', 'negotiate', 'approve', 'execute'],
          },
          importance_score: 0.8,
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(node).toBeDefined();
    });

    it('should create knowledge edges', async () => {
      // Create two nodes
      const { data: node1 } = await supabase
        .from('donna_knowledge_nodes')
        .insert({
          node_type: 'entity',
          name: 'Vendor Contract',
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      const { data: node2 } = await supabase
        .from('donna_knowledge_nodes')
        .insert({
          node_type: 'rule',
          name: 'Approval Required',
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      // Create edge
      const { data: edge, error } = await supabase
        .from('donna_knowledge_edges')
        .insert({
          source_node_id: node1.id,
          target_node_id: node2.id,
          edge_type: 'requires',
          weight: 0.9,
          confidence: 0.95,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(edge).toBeDefined();
    });

    it('should track learning history', async () => {
      const { data, error } = await supabase
        .from('donna_learning_history')
        .insert({
          learning_type: 'reinforcement',
          input_data: { action: 'approve_contract', context: 'high_value' },
          output_data: { result: 'success' },
          feedback_score: 0.9,
          reward: 1.0,
          model_version: '1.0',
          enterprise_id: testEnterprise,
          user_id: testUser.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
});