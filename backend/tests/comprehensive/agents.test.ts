import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('AI Agent System', () => {
  let supabase: SupabaseClient;
  let testEnterprise: Enterprise;
  let testUser: User;
  let testContract: Contract;
  let testVendor: Vendor;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test enterprise
    const { data: enterprise } = await supabase
      .from('enterprises')
      .insert({
        name: 'Agent Test Enterprise',
        domain: 'agenttest.com',
        industry: 'technology'
      })
      .select()
      .single();
    
    testEnterprise = enterprise;

    // Create test user
    const { data: user } = await supabase
      .from('users')
      .insert({
        auth_id: 'agent-test-user',
        email: 'agent@test.com',
        enterprise_id: testEnterprise.id,
        role: 'manager'
      })
      .select()
      .single();
    
    testUser = user;

    // Create test vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        name: 'Agent Test Vendor',
        category: 'technology',
        status: 'active',
        enterprise_id: testEnterprise.id
      })
      .select()
      .single();
    
    testVendor = vendor;

    // Create test contract
    const { data: contract } = await supabase
      .from('contracts')
      .insert({
        title: 'Agent Test Contract',
        file_name: 'agent-test.pdf',
        storage_id: 'agent-test-123',
        vendor_id: testVendor.id,
        enterprise_id: testEnterprise.id,
        status: 'pending_analysis',
        created_by: testUser.id
      })
      .select()
      .single();
    
    testContract = contract;
  });

  afterEach(async () => {
    // Cleanup in reverse order
    if (testContract) {
      await supabase.from('contracts').delete().eq('id', testContract.id);
    }
    if (testVendor) {
      await supabase.from('vendors').delete().eq('id', testVendor.id);
    }
    if (testUser) {
      await supabase.from('users').delete().eq('id', testUser.id);
    }
    if (testEnterprise) {
      await supabase.from('enterprises').delete().eq('id', testEnterprise.id);
    }
  });

  describe('Agent Task Management', () => {
    it('should create agent task successfully', async () => {
      const taskData = {
        enterprise_id: testEnterprise.id,
        agent_type: 'secretary',
        task_type: 'document_analysis',
        priority: 7,
        status: 'pending',
        payload: {
          contract_id: testContract.id,
          analysis_type: 'full',
          options: {
            extract_clauses: true,
            identify_risks: true
          }
        },
        created_by: testUser.id
      };

      const { data: task, error } = await supabase
        .from('agent_tasks')
        .insert(taskData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(task).toBeDefined();
      expect(task.agent_type).toBe('secretary');
      expect(task.task_type).toBe('document_analysis');
      expect(task.priority).toBe(7);
      expect(task.status).toBe('pending');
    });

    it('should validate agent types', async () => {
      const validAgentTypes = [
        'secretary',
        'manager', 
        'financial',
        'legal',
        'analytics',
        'vendor',
        'notifications'
      ];

      for (const agentType of validAgentTypes) {
        const { data: task, error } = await supabase
          .from('agent_tasks')
          .insert({
            enterprise_id: testEnterprise.id,
            agent_type: agentType,
            task_type: 'test_task',
            priority: 5,
            status: 'pending',
            payload: {},
            created_by: testUser.id
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(task.agent_type).toBe(agentType);

        // Cleanup
        await supabase.from('agent_tasks').delete().eq('id', task.id);
      }
    });

    it('should handle task status transitions', async () => {
      const { data: task } = await supabase
        .from('agent_tasks')
        .insert({
          enterprise_id: testEnterprise.id,
          agent_type: 'secretary',
          task_type: 'document_analysis',
          priority: 5,
          status: 'pending',
          payload: { contract_id: testContract.id },
          created_by: testUser.id
        })
        .select()
        .single();

      // Transition to processing
      const { data: processing } = await supabase
        .from('agent_tasks')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', task.id)
        .select()
        .single();

      expect(processing.status).toBe('processing');
      expect(processing.started_at).toBeDefined();

      // Transition to completed
      const { data: completed } = await supabase
        .from('agent_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: {
            success: true,
            data: { analysis: 'complete' },
            confidence: 0.95
          }
        })
        .eq('id', task.id)
        .select()
        .single();

      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeDefined();
      expect(completed.result.success).toBe(true);

      // Cleanup
      await supabase.from('agent_tasks').delete().eq('id', task.id);
    });

    it('should prioritize tasks correctly', async () => {
      // Create tasks with different priorities
      const tasks = await Promise.all([
        supabase.from('agent_tasks').insert({
          enterprise_id: testEnterprise.id,
          agent_type: 'secretary',
          task_type: 'low_priority',
          priority: 3,
          status: 'pending',
          payload: {},
          created_by: testUser.id
        }).select().single(),
        supabase.from('agent_tasks').insert({
          enterprise_id: testEnterprise.id,
          agent_type: 'secretary',
          task_type: 'high_priority',
          priority: 9,
          status: 'pending',
          payload: {},
          created_by: testUser.id
        }).select().single()
      ]);

      // Query tasks by priority
      const { data: prioritizedTasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .order('priority', { ascending: false });

      expect(prioritizedTasks[0].priority).toBeGreaterThan(prioritizedTasks[1].priority);

      // Cleanup
      for (const task of tasks) {
        await supabase.from('agent_tasks').delete().eq('id', task.data.id);
      }
    });
  });

  describe('Agent Analysis Results', () => {
    it('should store analysis results', async () => {
      const analysisData = {
        contract_id: testContract.id,
        enterprise_id: testEnterprise.id,
        analysis_type: 'risk_assessment',
        status: 'completed',
        results: {
          riskScore: 0.4,
          keyRisks: [
            'Automatic renewal clause without opt-out',
            'Late payment penalties of 2% per month'
          ],
          recommendations: [
            'Negotiate opt-out clause for renewals',
            'Request reduction in late payment penalties'
          ],
          extractedData: {
            parties: ['Acme Corp', 'Test Vendor Inc'],
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            value: 50000
          }
        },
        confidence: 0.87,
        model_version: 'local-analyzer-v1.0'
      };

      const { data: analysis, error } = await supabase
        .from('ai_analysis')
        .insert(analysisData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(analysis.results.riskScore).toBe(0.4);
      expect(analysis.results.keyRisks).toHaveLength(2);
      expect(analysis.confidence).toBe(0.87);
    });

    it('should track analysis performance metrics', async () => {
      const metricsData = {
        agent_type: 'secretary',
        task_type: 'document_analysis',
        enterprise_id: testEnterprise.id,
        processing_time_ms: 1500,
        confidence_score: 0.92,
        success: true,
        metadata: {
          document_size: 2048,
          pages_processed: 5,
          clauses_extracted: 12
        }
      };

      const { data: metrics, error } = await supabase
        .from('agent_performance_metrics')
        .insert(metricsData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(metrics.processing_time_ms).toBe(1500);
      expect(metrics.confidence_score).toBe(0.92);
      expect(metrics.metadata.clauses_extracted).toBe(12);
    });

    it('should generate insights from analysis', async () => {
      const insightData = {
        contract_id: testContract.id,
        enterprise_id: testEnterprise.id,
        insight_type: 'cost_optimization',
        category: 'financial',
        title: 'Potential Cost Savings Identified',
        description: 'Analysis shows 15% cost reduction possible through term renegotiation',
        severity: 'medium',
        confidence: 0.78,
        actionable: true,
        data: {
          current_cost: 50000,
          projected_savings: 7500,
          savings_percentage: 15,
          recommendation: 'Renegotiate payment terms to quarterly instead of monthly'
        },
        generated_by: 'financial_agent'
      };

      const { data: insight, error } = await supabase
        .from('agent_insights')
        .insert(insightData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(insight.insight_type).toBe('cost_optimization');
      expect(insight.data.savings_percentage).toBe(15);
      expect(insight.actionable).toBe(true);
    });
  });

  describe('Agent Memory System', () => {
    it('should store short-term memories', async () => {
      const memoryData = {
        user_id: testUser.id,
        enterprise_id: testEnterprise.id,
        category: 'contract_analysis',
        content: 'User frequently asks about termination clauses in technology contracts',
        importance: 0.7,
        context: {
          contract_type: 'technology',
          frequent_topic: 'termination',
          interaction_count: 3
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      const { data: memory, error } = await supabase
        .from('short_term_memory')
        .insert(memoryData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(memory.category).toBe('contract_analysis');
      expect(memory.importance).toBe(0.7);
      expect(memory.context.frequent_topic).toBe('termination');
    });

    it('should promote important memories to long-term storage', async () => {
      // Create high-importance memory
      const { data: shortTerm } = await supabase
        .from('short_term_memory')
        .insert({
          user_id: testUser.id,
          enterprise_id: testEnterprise.id,
          category: 'user_preference',
          content: 'User always requests detailed risk analysis for contracts > $25k',
          importance: 0.9,
          context: {
            threshold: 25000,
            preference: 'detailed_risk_analysis'
          }
        })
        .select()
        .single();

      // Simulate memory consolidation
      const longTermData = {
        enterprise_id: testEnterprise.id,
        category: shortTerm.category,
        content: shortTerm.content,
        importance: shortTerm.importance,
        access_count: 1,
        context: shortTerm.context,
        source_type: 'short_term_promotion',
        source_id: shortTerm.id
      };

      const { data: longTerm, error } = await supabase
        .from('long_term_memory')
        .insert(longTermData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(longTerm.category).toBe('user_preference');
      expect(longTerm.importance).toBe(0.9);

      // Cleanup
      await supabase.from('short_term_memory').delete().eq('id', shortTerm.id);
      await supabase.from('long_term_memory').delete().eq('id', longTerm.id);
    });

    it('should search memories by similarity', async () => {
      // Create memories with different content
      const memories = [
        {
          enterprise_id: testEnterprise.id,
          category: 'contract_analysis',
          content: 'Software licensing agreements typically include usage restrictions',
          importance: 0.6,
          context: { topic: 'software_licensing' }
        },
        {
          enterprise_id: testEnterprise.id,
          category: 'contract_analysis', 
          content: 'Service agreements usually define SLA requirements and penalties',
          importance: 0.7,
          context: { topic: 'service_agreements' }
        }
      ];

      for (const memory of memories) {
        await supabase.from('long_term_memory').insert(memory);
      }

      // Search for memories related to contracts
      const { data: results } = await supabase
        .from('long_term_memory')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('category', 'contract_analysis')
        .ilike('content', '%agreement%');

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result: { status: string }) => {
        expect(result.content.toLowerCase()).toContain('agreement');
      });
    });
  });

  describe('Agent Security and Isolation', () => {
    it('should enforce enterprise isolation for tasks', async () => {
      // Create another enterprise
      const { data: otherEnterprise } = await supabase
        .from('enterprises')
        .insert({
          name: 'Other Enterprise',
          domain: 'other.com'
        })
        .select()
        .single();

      // Create task in other enterprise
      const { data: otherTask } = await supabase
        .from('agent_tasks')
        .insert({
          enterprise_id: otherEnterprise.id,
          agent_type: 'secretary',
          task_type: 'test',
          priority: 5,
          status: 'pending',
          payload: {}
        })
        .select()
        .single();

      // Query tasks for test enterprise should not include other enterprise's tasks
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('enterprise_id', testEnterprise.id);

      const foundOtherTask = tasks.find((t: { id: string }) => t.id === otherTask.id);
      expect(foundOtherTask).toBeUndefined();

      // Cleanup
      await supabase.from('agent_tasks').delete().eq('id', otherTask.id);
      await supabase.from('enterprises').delete().eq('id', otherEnterprise.id);
    });

    it('should validate task payload structure', async () => {
      const validPayload = {
        contract_id: testContract.id,
        analysis_type: 'risk_assessment',
        options: {
          extract_clauses: true,
          identify_parties: true
        }
      };

      const { data: task, error } = await supabase
        .from('agent_tasks')
        .insert({
          enterprise_id: testEnterprise.id,
          agent_type: 'secretary',
          task_type: 'document_analysis',
          priority: 5,
          status: 'pending',
          payload: validPayload,
          created_by: testUser.id
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(task.payload.contract_id).toBe(testContract.id);
      expect(task.payload.options.extract_clauses).toBe(true);

      // Cleanup
      await supabase.from('agent_tasks').delete().eq('id', task.id);
    });

    it('should track agent activity logs', async () => {
      const logData = {
        enterprise_id: testEnterprise.id,
        agent_type: 'secretary',
        action: 'process_document',
        user_id: testUser.id,
        target_type: 'contract',
        target_id: testContract.id,
        details: {
          document_name: 'test-contract.pdf',
          processing_time: 1250,
          success: true
        },
        ip_address: '192.168.1.100',
        user_agent: 'Test Client'
      };

      const { data: log, error } = await supabase
        .from('agent_logs')
        .insert(logData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(log.action).toBe('process_document');
      expect(log.details.success).toBe(true);
    });
  });

  describe('Agent Coordination', () => {
    it('should handle multi-agent workflows', async () => {
      // Create a workflow with multiple agent tasks
      const workflow = {
        enterprise_id: testEnterprise.id,
        name: 'Contract Analysis Workflow',
        description: 'Full contract analysis with multiple agents',
        status: 'active',
        steps: [
          {
            step_id: 'extract',
            agent_type: 'secretary',
            task_type: 'document_extraction',
            order: 1
          },
          {
            step_id: 'analyze_legal',
            agent_type: 'legal',
            task_type: 'legal_review',
            order: 2,
            depends_on: ['extract']
          },
          {
            step_id: 'analyze_financial',
            agent_type: 'financial',
            task_type: 'financial_analysis',
            order: 3,
            depends_on: ['extract']
          }
        ]
      };

      const { data: workflowDef, error } = await supabase
        .from('workflow_definitions')
        .insert(workflow)
        .select()
        .single();

      expect(error).toBeNull();
      expect(workflowDef.steps).toHaveLength(3);
      expect(workflowDef.status).toBe('active');

      // Cleanup
      await supabase.from('workflow_definitions').delete().eq('id', workflowDef.id);
    });

    it('should track workflow execution', async () => {
      const execution = {
        workflow_id: 'test-workflow-123',
        enterprise_id: testEnterprise.id,
        trigger_type: 'contract_upload',
        trigger_data: {
          contract_id: testContract.id,
          uploaded_by: testUser.id
        },
        status: 'running',
        started_by: testUser.id
      };

      const { data: exec, error } = await supabase
        .from('workflow_executions')
        .insert(execution)
        .select()
        .single();

      expect(error).toBeNull();
      expect(exec.trigger_type).toBe('contract_upload');
      expect(exec.status).toBe('running');

      // Cleanup
      await supabase.from('workflow_executions').delete().eq('id', exec.id);
    });
  });
});