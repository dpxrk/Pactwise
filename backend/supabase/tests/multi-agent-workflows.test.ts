import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestEnterprise } from '../../tests/setup';
import { SupabaseClient } from '@supabase/supabase-js';
import { ManagerAgent } from '../functions/local-agents/agents/manager';
import { WorkflowAgent } from '../functions/local-agents/agents/workflow';
import { SecretaryAgent } from '../functions/local-agents/agents/secretary';
import { FinancialAgent } from '../functions/local-agents/agents/financial';
import { LegalAgent } from '../functions/local-agents/agents/legal';
import { ComplianceAgent } from '../functions/local-agents/agents/compliance';
import { RiskAssessmentAgent } from '../functions/local-agents/agents/risk-assessment';

describe('Multi-Agent Workflow Integration Tests', () => {
  let supabase: SupabaseClient;
  let enterpriseId: string;
  let userId: string;
  let contractId: string;
  let vendorId: string;
  const agents: Record<string, unknown> = {};

  beforeEach(async () => {
    supabase = await setupTestDatabase();

    // Create test enterprise and user
    const testEnterprise = await createTestEnterprise();
    enterpriseId = testEnterprise.id;
    
    const user = await createTestUser(enterpriseId, 'manager');
    userId = user.id;

    // Create test vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        name: 'Test Vendor Inc',
        email: 'vendor@test.com',
        status: 'active',
        enterprise_id: enterpriseId,
      })
      .select()
      .single();
    vendorId = vendor.id;

    // Create test contract
    const { data: contract } = await supabase
      .from('contracts')
      .insert({
        name: 'Test Service Agreement',
        vendor_id: vendorId,
        status: 'draft',
        type: 'service',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        value: 100000,
        currency: 'USD',
        enterprise_id: enterpriseId,
      })
      .select()
      .single();
    contractId = contract.id;

    // Initialize agents
    await initializeAgents();
  });

  afterEach(async () => {
    await cleanupTestDatabase(supabase);
  });

  async function initializeAgents() {
    // Initialize agent system
    const { data: system } = await supabase
      .from('agent_system')
      .insert({
        name: 'Test Agent System',
        version: '1.0.0',
        config: {},
        capabilities: Object.keys(agents),
      })
      .select()
      .single();

    // Initialize individual agents in database
    const agentTypes = [
      'manager', 'secretary', 'financial', 'legal',
      'compliance', 'risk-assessment', 'workflow',
    ];

    for (const type of agentTypes) {
      const { } = await supabase
        .from('agents')
        .insert({
          name: `Test ${type} Agent`,
          type,
          system_id: system.id,
          enterprise_id: enterpriseId,
          is_active: true,
          config: {},
          capabilities: [],
        })
        .select()
        .single();

      // Create agent instances
      switch (type) {
        case 'manager':
          agents[type] = new ManagerAgent(supabase, enterpriseId);
          break;
        case 'secretary':
          agents[type] = new SecretaryAgent(supabase, enterpriseId);
          break;
        case 'financial':
          agents[type] = new FinancialAgent(supabase, enterpriseId);
          break;
        case 'legal':
          agents[type] = new LegalAgent(supabase, enterpriseId);
          break;
        case 'compliance':
          agents[type] = new ComplianceAgent(supabase, enterpriseId);
          break;
        case 'risk-assessment':
          agents[type] = new RiskAssessmentAgent(supabase, enterpriseId);
          break;
        case 'workflow':
          agents[type] = new WorkflowAgent(supabase, enterpriseId);
          break;
      }
    }
  }

  describe('Manager Agent Orchestration', () => {
    it('should successfully orchestrate multiple agents for contract analysis', async () => {
      // Create a complex contract analysis task
      const analysisRequest = {
        action: 'analyze_contract',
        contractId,
        requiredAgents: ['secretary', 'financial', 'legal', 'compliance', 'risk-assessment'],
        priority: 8,
      };

      const result = await agents.manager.process(analysisRequest, {
        userId,
        contractId,
      });

      expect(result.success).toBe(true);
      expect(result.data.tasksCreated).toBe(5);
      expect(result.data.executionPlan).toBeDefined();
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].type).toBe('orchestration_complete');

      // Verify tasks were created for each agent
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('*, agent:agents!agent_id(type)')
        .eq('contract_id', contractId)
        .order('created_at');

      expect(tasks).toHaveLength(5);

      const agentTypes = tasks?.map((t: { agent: { type: string } }) => t.agent.type) ?? [];
      expect(agentTypes).toContain('secretary');
      expect(agentTypes).toContain('financial');
      expect(agentTypes).toContain('legal');
      expect(agentTypes).toContain('compliance');
      expect(agentTypes).toContain('risk-assessment');
    });

    it('should handle partial agent failures gracefully', async () => {
      // Mock one agent to fail
      vi.spyOn(agents.financial, 'process').mockRejectedValueOnce(
        new Error('Financial analysis failed'),
      );

      const analysisRequest = {
        action: 'analyze_contract',
        contractId,
        requiredAgents: ['secretary', 'financial', 'legal'],
        continueOnFailure: true,
      };

      const result = await agents.manager.process(analysisRequest, {
        userId,
        contractId,
      });

      expect(result.success).toBe(true);
      expect(result.data.failedAgents).toContain('financial');
      expect(result.data.successfulAgents).toContain('secretary');
      expect(result.data.successfulAgents).toContain('legal');
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'partial_failure',
          severity: 'medium',
        }),
      );
    });

    it('should respect agent dependencies', async () => {
      const workflowRequest = {
        action: 'execute_workflow',
        workflow: {
          steps: [
            { agent: 'secretary', task: 'extract_metadata', id: 'step1' },
            { agent: 'financial', task: 'analyze_costs', id: 'step2', dependsOn: ['step1'] },
            { agent: 'legal', task: 'review_terms', id: 'step3', dependsOn: ['step1'] },
            { agent: 'risk-assessment', task: 'comprehensive_risk', id: 'step4', dependsOn: ['step2', 'step3'] },
          ],
        },
      };

      const result = await agents.manager.process(workflowRequest, {
        userId,
        contractId,
      });

      expect(result.success).toBe(true);
      expect(result.data.executionOrder).toEqual(['step1', 'step2', 'step3', 'step4']);

      // Verify tasks were created with proper scheduling
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('*, agent:agents!agent_id(type)')
        .eq('contract_id', contractId)
        .order('scheduled_at');

      // Secretary task should be scheduled first
      expect(tasks?.[0]?.agent.type).toBe('secretary');

      // Financial and Legal should be scheduled after Secretary
      const financialTask = tasks?.find((t: { agent: { type: string } }) => t.agent.type === 'financial');
      const legalTask = tasks?.find((t: { agent: { type: string } }) => t.agent.type === 'legal');
      expect(new Date(financialTask?.scheduled_at ?? '').getTime()).toBeGreaterThan(
        new Date(tasks?.[0]?.scheduled_at ?? '').getTime(),
      );
      expect(new Date(legalTask?.scheduled_at ?? '').getTime()).toBeGreaterThan(
        new Date(tasks?.[0]?.scheduled_at ?? '').getTime(),
      );
    });
  });

  describe('Workflow Agent Multi-Step Execution', () => {
    it('should execute a complete contract approval workflow', async () => {
      const approvalWorkflow = {
        workflowId: 'contract-approval',
        name: 'Contract Approval Process',
        steps: [
          {
            id: 'extract',
            name: 'Extract Contract Data',
            agent: 'secretary',
            action: 'extract_metadata',
            config: { includesClauses: true },
          },
          {
            id: 'financial-review',
            name: 'Financial Review',
            agent: 'financial',
            action: 'analyze_financial_terms',
            dependsOn: ['extract'],
          },
          {
            id: 'legal-review',
            name: 'Legal Review',
            agent: 'legal',
            action: 'review_legal_terms',
            dependsOn: ['extract'],
            parallel: true,
          },
          {
            id: 'compliance-check',
            name: 'Compliance Check',
            agent: 'compliance',
            action: 'validate_compliance',
            dependsOn: ['extract'],
            parallel: true,
          },
          {
            id: 'risk-assessment',
            name: 'Risk Assessment',
            agent: 'risk-assessment',
            action: 'comprehensive_risk',
            dependsOn: ['financial-review', 'legal-review', 'compliance-check'],
          },
          {
            id: 'final-decision',
            name: 'Final Decision',
            agent: 'manager',
            action: 'make_decision',
            dependsOn: ['risk-assessment'],
            config: {
              decisionCriteria: {
                maxRiskScore: 7,
                requiredCompliance: true,
              },
            },
          },
        ],
        timeout: 300000, // 5 minutes
      };

      const result = await agents.workflow.process(approvalWorkflow, {
        userId,
        contractId,
      });

      expect(result.success).toBe(true);
      expect(result.data.completedSteps).toHaveLength(6);
      expect(result.data.workflowStatus).toBe('completed');
      expect(result.data.finalDecision).toBeDefined();

      // Verify parallel execution
      const parallelSteps = result.data.executionTimeline.filter(
        (step: { parallel?: boolean }) => step.parallel === true,
      );
      expect(parallelSteps).toHaveLength(2);

      // Verify insights were generated
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'workflow_complete',
          severity: 'low',
        }),
      );
    });

    it('should handle workflow rollback on critical failure', async () => {
      const rollbackWorkflow = {
        workflowId: 'vendor-onboarding',
        name: 'Vendor Onboarding',
        steps: [
          {
            id: 'create-vendor',
            name: 'Create Vendor Record',
            agent: 'secretary',
            action: 'create_vendor_record',
            compensationAction: 'delete_vendor_record',
            criticalStep: true,
          },
          {
            id: 'compliance-screening',
            name: 'Compliance Screening',
            agent: 'compliance',
            action: 'screen_vendor',
            dependsOn: ['create-vendor'],
            compensationAction: 'remove_screening_results',
            criticalStep: true,
          },
          {
            id: 'financial-setup',
            name: 'Financial Setup',
            agent: 'financial',
            action: 'setup_payment_terms',
            dependsOn: ['compliance-screening'],
            compensationAction: 'remove_payment_setup',
            // This step will fail
            errorHandler: {
              type: 'fail',
            },
          },
        ],
        enableRollback: true,
      };

      // Mock the financial setup to fail
      vi.spyOn(agents.financial, 'process').mockRejectedValueOnce(
        new Error('Payment gateway unavailable'),
      );

      const result = await agents.workflow.process(rollbackWorkflow, {
        userId,
        vendorId,
      });

      expect(result.success).toBe(false);
      expect(result.data.workflowStatus).toBe('rolled_back');
      expect(result.data.rollbackExecuted).toBe(true);
      expect(result.data.compensationSteps).toContain('remove_screening_results');
      expect(result.data.compensationSteps).toContain('delete_vendor_record');

      // Verify rollback insight
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'workflow_rollback',
          severity: 'high',
          title: expect.stringContaining('Workflow Rolled Back'),
        }),
      );
    });

    it('should recover workflow from checkpoint', async () => {
      const checkpointWorkflow = {
        workflowId: 'data-migration',
        name: 'Data Migration Workflow',
        steps: [
          {
            id: 'validate-data',
            name: 'Validate Source Data',
            agent: 'data-quality',
            action: 'validate',
            checkpoint: true,
          },
          {
            id: 'transform-data',
            name: 'Transform Data',
            agent: 'secretary',
            action: 'transform_data',
            dependsOn: ['validate-data'],
            checkpoint: true,
          },
          {
            id: 'migrate-data',
            name: 'Migrate Data',
            agent: 'integration',
            action: 'batch_integration',
            dependsOn: ['transform-data'],
            errorHandler: {
              type: 'retry',
              maxRetries: 2,
            },
          },
        ],
        checkpointInterval: 1,
      };

      // First execution - will fail at migrate-data
      vi.spyOn(agents.integration, 'process')
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          success: true,
          data: { recordsMigrated: 1000 },
          insights: [],
          rulesApplied: [],
          confidence: 0.95,
          processingTime: 5000,
        });

      const firstResult = await agents.workflow.process(checkpointWorkflow, {
        userId,
      });

      expect(firstResult.success).toBe(false);
      expect(firstResult.data.lastCheckpoint).toBe('transform-data');

      // Simulate recovery from checkpoint
      const recoveryRequest = {
        ...checkpointWorkflow,
        resumeFromCheckpoint: firstResult.data.lastCheckpoint,
        checkpointData: firstResult.data.checkpointData,
      };

      const recoveryResult = await agents.workflow.process(recoveryRequest, {
        userId,
      });

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.data.resumedFrom).toBe('transform-data');
      expect(recoveryResult.data.completedSteps).toContain('migrate-data');
    });
  });

  describe('Multi-Agent Data Consistency', () => {
    it('should maintain data consistency across multiple agents', async () => {
      // Create a contract analysis that updates data across agents
      const contractData = {
        content: 'This is a test contract with payment terms of NET 30 and a penalty clause of 5% per month.',
        metadata: {
          type: 'service',
          value: 50000,
          currency: 'USD',
        },
      };

      // Secretary extracts and stores metadata
      const secretaryResult = await agents.secretary.process({
        action: 'extract_metadata',
        contractId,
        content: contractData.content,
      }, { userId });

      expect(secretaryResult.success).toBe(true);

      // Financial agent analyzes payment terms
      const financialResult = await agents.financial.process({
        action: 'analyze_payment_terms',
        contractId,
      }, { userId });

      expect(financialResult.success).toBe(true);
      expect(financialResult.data.paymentTerms).toBe('NET 30');

      // Legal agent identifies penalty clause
      const legalResult = await agents.legal.process({
        action: 'identify_clauses',
        contractId,
      }, { userId });

      expect(legalResult.success).toBe(true);
      expect(legalResult.data.clauses).toContainEqual(
        expect.objectContaining({
          type: 'penalty',
          riskLevel: expect.stringMatching(/medium|high/),
        }),
      );

      // Verify all agents see consistent data
      const { data: contractClauses } = await supabase
        .from('contract_clauses')
        .select('*')
        .eq('contract_id', contractId);

      expect(contractClauses?.length ?? 0).toBeGreaterThan(0);

      const { data: insights } = await supabase
        .from('agent_insights')
        .select('*')
        .eq('contract_id', contractId);

      // Should have insights from multiple agents
      const insightAgents = new Set(insights?.map((i: { agent_id: string }) => i.agent_id) ?? []);
      expect(insightAgents.size).toBeGreaterThanOrEqual(3);
    });

    it('should handle concurrent agent execution without conflicts', async () => {
      // Execute multiple agents concurrently
      const concurrentTasks = [
        agents.secretary.process(
          { action: 'extract_metadata', contractId },
          { userId },
        ),
        agents.financial.process(
          { action: 'calculate_total_cost', contractId },
          { userId },
        ),
        agents.legal.process(
          { action: 'identify_risks', contractId },
          { userId },
        ),
        agents.compliance.process(
          { action: 'check_regulatory', contractId },
          { userId },
        ),
      ];

      const results = await Promise.all(concurrentTasks);

      // All agents should succeed
      results.forEach((result: { success: boolean }) => {
        expect(result.success).toBe(true);
      });

      // Verify no duplicate insights
      const { data: insights } = await supabase
        .from('agent_insights')
        .select('*')
        .eq('contract_id', contractId);

      const insightKeys = insights?.map((i: { agent_id: string; insight_type: string; title: string }) =>
        `${i.agent_id}-${i.insight_type}-${i.title}`,
      );
      const uniqueKeys = new Set(insightKeys);
      expect(uniqueKeys.size).toBe(insightKeys.length);
    });
  });

  describe('Multi-Agent Error Propagation', () => {
    it('should properly propagate errors through agent chain', async () => {
      const errorWorkflow = {
        action: 'analyze_contract',
        contractId: 'non-existent-id',
        requiredAgents: ['secretary', 'financial'],
      };

      const result = await agents.manager.process(errorWorkflow, {
        userId,
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toContain('not found');

      // Verify error was logged
      const { data: failedTasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('status', 'failed')
        .eq('contract_id', 'non-existent-id');

      expect(failedTasks?.length ?? 0).toBeGreaterThan(0);
    });

    it('should handle cascading failures gracefully', async () => {
      // Create a workflow where step 2 depends on step 1
      const cascadeWorkflow = {
        workflowId: 'cascade-test',
        steps: [
          {
            id: 'step1',
            agent: 'secretary',
            action: 'extract_metadata',
            errorHandler: { type: 'fail' },
          },
          {
            id: 'step2',
            agent: 'financial',
            action: 'analyze_costs',
            dependsOn: ['step1'],
          },
          {
            id: 'step3',
            agent: 'legal',
            action: 'review_terms',
            dependsOn: ['step1'],
          },
        ],
      };

      // Mock secretary to fail
      vi.spyOn(agents.secretary, 'process').mockRejectedValueOnce(
        new Error('Document parsing failed'),
      );

      const result = await agents.workflow.process(cascadeWorkflow, {
        userId,
        contractId,
      });

      expect(result.success).toBe(false);
      expect(result.data.failedStep).toBe('step1');
      expect(result.data.skippedSteps).toContain('step2');
      expect(result.data.skippedSteps).toContain('step3');
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'cascade_failure',
          severity: 'high',
        }),
      );
    });
  });

  describe('Multi-Agent Performance', () => {
    it('should complete multi-agent workflow within SLA', async () => {
      const startTime = Date.now();

      const performanceWorkflow = {
        action: 'quick_assessment',
        contractId,
        requiredAgents: ['secretary', 'financial', 'risk-assessment'],
        timeout: 10000, // 10 second SLA
      };

      const result = await agents.manager.process(performanceWorkflow, {
        userId,
        contractId,
      });

      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(totalTime).toBeLessThan(10000);
      expect(result.data.totalProcessingTime).toBeLessThan(10000);

      // Verify parallel execution optimized performance
      const { agentTimings } = result.data;
      // const maxAgentTime = Math.max(...Object.values(agentTimings));
      expect(result.data.totalProcessingTime).toBeLessThan(
        Object.values(agentTimings).reduce((sum: number, time: number) => sum + time, 0),
      );
    });

    it('should handle high-volume multi-agent tasks', async () => {
      // Create multiple contracts for batch processing
      const contracts = [];
      for (let i = 0; i < 10; i++) {
        const { data: contract } = await supabase
          .from('contracts')
          .insert({
            name: `Batch Contract ${i}`,
            vendor_id: vendorId,
            status: 'draft',
            type: 'service',
            value: 10000 * (i + 1),
            enterprise_id: enterpriseId,
          })
          .select()
          .single();
        contracts.push(contract);
      }

      // Process all contracts
      const batchRequest = {
        action: 'batch_analyze',
        contractIds: contracts.map(c => c.id),
        requiredAgents: ['secretary', 'financial'],
        parallel: true,
        maxConcurrency: 5,
      };

      const result = await agents.manager.process(batchRequest, {
        userId,
      });

      expect(result.success).toBe(true);
      expect(result.data.processedContracts).toBe(10);
      expect(result.data.failedContracts).toBe(0);

      // Verify task distribution
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('status, agent_id')
        .in('contract_id', contracts.map(c => c.id));

      const tasksByStatus = tasks?.reduce((acc: Record<string, number>, task: { status: string }) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {}) ?? {};

      expect(tasksByStatus.pending || 0).toBeLessThanOrEqual(5); // Respects max concurrency
    });
  });
});