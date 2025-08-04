import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WorkflowAgent } from '../supabase/functions/local-agents/agents/workflow.ts';
import { createTestEnterprise, createTestUser, createTestContract, createTestVendor, cleanupTestData } from './setup';
// import type { AgentContext } from '../supabase/functions/local-agents/agents/base.ts';

// Mock Redis for caching
vi.mock('../supabase/functions/local-agents/utils/cache-manager.ts', () => ({
  CacheManager: {
    getInstance: () => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
      exists: vi.fn().mockResolvedValue(false),
    }),
  },
}));

// Mock enhanced rate limiter
vi.mock('../supabase/functions/_shared/rate-limiting.ts', () => ({
  EnhancedRateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: vi.fn().mockResolvedValue({ 
      allowed: true, 
      remaining: 10, 
      limit: 100,
      resetAt: new Date(),
      rule: { id: 'test', name: 'test' },
      fingerprint: 'test'
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Workflow Agent Tests', () => {
  let testEnterpriseId: string;
  let testUserId: string;
  let testManagerId: string;
  let testContractId: string;
  let testVendorId: string;
  let mockSupabase: any;
  let agent: WorkflowAgent;

  // Helper to create a proper AgentContext
  const createContext = (overrides: any = {}) => ({
    enterpriseId: testEnterpriseId,
    sessionId: 'test-session',
    environment: { name: 'test' },
    permissions: ['read', 'write'],
    ...overrides,
  });

  beforeEach(async () => {
    // Create test data
    const enterprise = await createTestEnterprise({ name: 'Test Corp' });
    testEnterpriseId = enterprise.id;

    const user = await createTestUser(testEnterpriseId, 'user');
    testUserId = user.id;

    const manager = await createTestUser(testEnterpriseId, 'manager');
    testManagerId = manager.id;

    const contract = await createTestContract(testEnterpriseId, {
      title: 'Test Contract',
      value: 250000,
      status: 'draft',
    });
    testContractId = contract.id;

    const vendor = await createTestVendor(testEnterpriseId, {
      name: 'Test Vendor Inc.',
      category: 'software',
    });
    testVendorId = vendor.id;

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn((_table: string) => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        data: [],
        error: null,
      })),
      rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    agent = new WorkflowAgent(mockSupabase, testEnterpriseId);
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  describe('Workflow Type Detection', () => {
    it('should detect contract lifecycle workflow', async () => {
      const result = await agent.process(
        { action: 'lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.workflowType).toBe('contract_lifecycle');
    });

    it('should detect vendor onboarding workflow', async () => {
      const result = await agent.process(
        { action: 'onboard' },
        createContext({ vendorId: testVendorId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.workflowType).toBe('vendor_onboarding');
    });

    it('should detect budget planning workflow', async () => {
      const result = await agent.process(
        { budgetRequest: { department: 'IT', amount: 1000000 } },
        createContext({ userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.workflowType).toBe('budget_planning');
    });

    it('should detect compliance audit workflow', async () => {
      const result = await agent.process(
        { auditType: 'quarterly_compliance' },
        createContext({ userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.workflowType).toBe('compliance_audit');
    });

    it('should detect invoice processing workflow', async () => {
      const result = await agent.process(
        { invoiceId: 'inv-123', amount: 50000 },
        createContext({ userId: testUserId }),
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.workflowType).toBe('invoice_processing');
    });

    it('should handle custom workflow type', async () => {
      const result = await agent.process(
        { workflowType: 'custom_approval_flow' },
        createContext({ userId: testManagerId }),
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('Unknown workflow type');
    });
  });

  describe('Contract Lifecycle Workflow', () => {
    beforeEach(() => {
      // Mock workflow execution insert
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'workflow_executions') {
          return {
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'wf_exec_123', status: 'running' },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        };
      });

      // Mock agent process results
      vi.spyOn(agent as any, 'executeAgentStep').mockImplementation(async (step: any) => {
        switch (step.agent) {
          case 'secretary':
            return {
              title: 'SERVICE AGREEMENT',
              parties: ['ABC Corp', 'XYZ Services'],
              value: 250000,
              effectiveDate: '2024-01-01',
              expirationDate: '2024-12-31',
            };
          case 'legal':
            return {
              clauses: [
                { type: 'limitation_of_liability', risk: 'high' },
                { type: 'indemnification', risk: 'medium' },
              ],
              overallRisk: 'medium',
              approved: true,
            };
          case 'financial':
            return {
              riskLevel: 'medium',
              roi: 2.5,
              budgetImpact: 'moderate',
              approved: true,
            };
          case 'analytics':
            return {
              monitoringSetup: true,
              alertsConfigured: ['expiration', 'milestone', 'compliance'],
            };
          default:
            return { success: true };
        }
      });

      // Mock approval steps
      vi.spyOn(agent as any, 'executeApprovalStep').mockResolvedValue({
        approved: true,
        approver: testManagerId,
        comments: 'Approved with conditions',
        approvedAt: new Date().toISOString(),
      });

      // Mock notification steps
      vi.spyOn(agent as any, 'executeNotificationStep').mockResolvedValue({
        notificationsSent: 5,
        recipients: ['owner', 'legal_team', 'finance_team'],
      });
    });

    it('should execute complete contract lifecycle', async () => {
      const result = await agent.process(
        {
          action: 'lifecycle',
          contractData: {
            title: 'Enterprise Software License',
            value: 250000,
            vendor: testVendorId,
          },
        },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('completed');
      expect(result.data.results).toBeDefined();
      expect(Object.keys(result.data.results)).toContain('extract_contract_data');
      expect(Object.keys(result.data.results)).toContain('legal_review');
      expect(Object.keys(result.data.results)).toContain('risk_assessment');
    });

    it('should handle high-risk contract routing', async () => {
      // Mock high risk assessment
      vi.spyOn(agent as any, 'executeAgentStep').mockImplementation(async (step: any) => {
        if (step.agent === 'financial' && step.action === 'assess_contract_risk') {
          return {
            riskLevel: 'high',
            concerns: ['High value', 'New vendor', 'Complex terms'],
            requiresExecutiveApproval: true,
          };
        }
        return { success: true };
      });

      const result = await agent.process(
        { action: 'lifecycle', contractValue: 1000000 },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      // Verify executive approval was triggered
      const approvalSteps = result.insights.filter(i => i.type === 'approval_requested');
      expect(approvalSteps.some(s => s.description.includes('executive'))).toBe(true);
    });

    it('should generate appropriate insights', async () => {
      const result = await agent.process(
        { action: 'lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'workflow_completed',
          severity: 'low',
          title: 'Workflow Completed Successfully',
        }),
      );
    });
  });

  describe('Vendor Onboarding Workflow', () => {
    beforeEach(() => {
      // Mock workflow execution
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'workflow_executions') {
          return {
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'wf_exec_vendor_123', status: 'running' },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        };
      });

      // Mock vendor screening results
      vi.spyOn(agent as any, 'executeAgentStep').mockImplementation(async (step: any) => {
        switch (step.action) {
          case 'screen_vendor':
            return {
              screeningPassed: true,
              riskScore: 0.3,
              concerns: [],
            };
          case 'verify_vendor_financial':
            return {
              financialHealth: 'good',
              creditScore: 750,
              revenue: 5000000,
            };
          case 'check_vendor_compliance':
            return {
              complianceScore: 0.85,
              certifications: ['ISO 9001', 'SOC 2'],
              issues: [],
            };
          default:
            return { success: true };
        }
      });

      // Mock parallel step execution
      vi.spyOn(agent as any, 'executeParallelStep').mockResolvedValue({
        parallelResults: [
          { paymentSetup: true },
          { communicationChannels: ['email', 'portal'] },
          { reportingEnabled: true },
        ],
        allSucceeded: true,
      });
    });

    it('should successfully onboard a compliant vendor', async () => {
      const result = await agent.process(
        {
          action: 'onboard',
          vendorData: {
            name: 'New Software Vendor',
            category: 'software',
            financialData: {
              revenue: 5000000,
              employees: 50,
            },
          },
        },
        createContext({ vendorId: testVendorId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('completed');
      expect(Object.keys(result.data.results)).toContain('initial_screening');
      expect(Object.keys(result.data.results)).toContain('financial_verification');
      expect(Object.keys(result.data.results)).toContain('compliance_check');
    });

    it('should reject non-compliant vendor', async () => {
      // Mock low compliance score
      vi.spyOn(agent as any, 'executeAgentStep').mockImplementation(async (step: any) => {
        if (step.action === 'check_vendor_compliance') {
          return {
            complianceScore: 0.4,
            certifications: [],
            issues: ['No certifications', 'Failed background check'],
          };
        }
        return { success: true };
      });

      // Mock condition evaluation for rejection path
      vi.spyOn(agent as any, 'executeConditionStep').mockResolvedValue({
        conditionMet: true,
        nextStep: 'vendor_rejection',
      });

      const result = await agent.process(
        { action: 'onboard' },
        createContext({ vendorId: testVendorId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.data.results).toHaveProperty('vendor_rejection');
    });

    it('should execute parallel setup steps', async () => {
      const result = await agent.process(
        { action: 'onboard' },
        createContext({ vendorId: testVendorId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      // Verify parallel execution was called
      expect(agent['executeParallelStep']).toHaveBeenCalled();
    });
  });

  describe('Step Execution', () => {
    it('should execute agent steps correctly', async () => {
      const step = {
        id: 'test_step',
        name: 'Test Agent Step',
        type: 'agent' as const,
        agent: 'secretary',
        action: 'extract_data',
      };

      const state = {
        workflowId: 'test_workflow',
        executionId: 'exec_123',
        currentStep: 'test_step',
        status: 'running' as const,
        context: { data: 'test' },
        stepResults: {},
        stepErrors: {},
        checkpoints: [],
        compensationLog: [],
        startTime: new Date(),
        retryCount: 0,
      };

      const result = await agent['executeAgentStep'](step, state, []);

      expect(result).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_step_results');
    });

    it('should handle approval steps with timeout', async () => {
      const step = {
        id: 'approval_step',
        name: 'Manager Approval',
        type: 'approval' as const,
        approvers: [testManagerId],
      };

      const state = {
        workflowId: 'test_workflow',
        executionId: 'exec_123',
        currentStep: 'approval_step',
        status: 'running' as const,
        context: {},
        stepResults: {},
        startTime: new Date(),
      };

      // Mock approval request creation
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'approval_123', status: 'pending' },
          error: null,
        }),
      }));

      // Mock approval polling - simulate immediate approval
      vi.spyOn(agent as any, 'waitForApproval').mockResolvedValue({
        approved: true,
        approver: testManagerId,
        comments: 'Looks good',
        approvedAt: new Date().toISOString(),
      });

      const result = await agent['executeApprovalStep'](step, state, []);

      expect(result).toMatchObject({
        approved: true,
        approver: testManagerId,
      });
    });

    it('should evaluate conditions correctly', async () => {
      const step = {
        id: 'condition_step',
        name: 'Risk Check',
        type: 'condition' as const,
        conditions: [{
          field: 'riskScore',
          operator: 'greater_than' as const,
          value: 0.7,
        }],
        branches: [{
          condition: {
            field: 'riskScore',
            operator: 'greater_than' as const,
            value: 0.7,
          },
          nextStep: 'high_risk_path',
        }],
      };

      const state = {
        workflowId: 'test_workflow',
        executionId: 'exec_123',
        currentStep: 'condition_step',
        status: 'running' as const,
        context: { riskScore: 0.8 },
        stepResults: {},
        stepErrors: {},
        checkpoints: [],
        compensationLog: [],
        startTime: new Date(),
        retryCount: 0,
      };

      const result = await agent['executeConditionStep'](step, state);

      expect(result).toMatchObject({
        conditionMet: true,
        nextStep: 'high_risk_path',
      });
    });

    it('should handle wait steps', async () => {
      const step = {
        id: 'wait_step',
        name: 'Wait for Processing',
        type: 'wait' as const,
        waitDuration: 100, // 100ms for testing
      };

      const state = {
        workflowId: 'test_workflow',
        executionId: 'exec_123',
        currentStep: 'wait_step',
        status: 'running' as const,
        context: {},
        stepResults: {},
        stepErrors: {},
        checkpoints: [],
        compensationLog: [],
        startTime: new Date(),
        retryCount: 0,
      };

      const startTime = Date.now();
      const result = await agent['executeWaitStep'](step, state);
      const endTime = Date.now();

      expect(result.waitCompleted).toBe(true);
      expect(result.duration).toBe(100);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should handle workflow timeout', async () => {
      // Create a workflow with very short timeout
      const workflowDef = {
        id: 'timeout_test',
        name: 'Timeout Test',
        description: 'Test timeout handling',
        version: 1,
        steps: [{
          id: 'slow_step',
          name: 'Slow Step',
          type: 'wait' as const,
          waitDuration: 5000, // 5 seconds
        }],
        timeout: 100, // 100ms timeout
      };

      // Mock workflow definition loading
      vi.spyOn(agent as any, 'workflowDefinitions', 'get').mockReturnValue(workflowDef);

      const result = await agent.process(
        { workflowType: 'timeout_test' },
        createContext({ userId: testManagerId }),
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('timeout');
    });

    it('should attempt rollback on failure', async () => {
      // Mock a failing step
      vi.spyOn(agent as any, 'executeAgentStep')
        .mockResolvedValueOnce({ success: true, data: 'step1' })
        .mockRejectedValueOnce(new Error('Step 2 failed'));

      // Mock rollback execution
      const rollbackSpy = vi.spyOn(agent as any, 'executeRollbackAction').mockResolvedValue(true);

      const result = await agent.process(
        { workflowType: 'contract_lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(result.success).toBe(false);
      expect(rollbackSpy).toHaveBeenCalled();
    });

    it('should handle missing workflow definition', async () => {
      const result = await agent.process(
        { workflowType: 'non_existent_workflow' },
        createContext({ userId: testManagerId }),
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('Unknown workflow type');
    });
  });

  describe('Workflow State Management', () => {
    it('should track workflow state correctly', async () => {
      const updateStateSpy = vi.spyOn(agent as any, 'updateWorkflowState');

      await agent.process(
        { action: 'lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(updateStateSpy).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions');
    });

    it('should store step results', async () => {
      const storeResultSpy = vi.spyOn(agent as any, 'storeStepResult');

      await agent.process(
        { action: 'lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(storeResultSpy).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_step_results');
    });

    it('should finalize workflow on completion', async () => {
      const finalizeSpy = vi.spyOn(agent as any, 'finalizeWorkflow');

      await agent.process(
        { action: 'lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(finalizeSpy).toHaveBeenCalled();
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle budget planning with parallel department reviews', async () => {
      // Mock parallel department approvals
      vi.spyOn(agent as any, 'executeParallelStep').mockResolvedValue({
        parallelResults: [
          { approved: true, department: 'IT', feedback: 'Needs adjustment' },
          { approved: true, department: 'Marketing', feedback: 'Approved' },
          { approved: false, department: 'Operations', feedback: 'Over budget' },
        ],
        allSucceeded: false,
      });

      const result = await agent.process(
        { budgetRequest: { total: 5000000, fiscal_year: 2024 } },
        createContext({ userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'workflow_failures',
          severity: 'high',
        }),
      );
    });

    it('should process invoice with conditional approval routing', async () => {
      // Test small invoice (auto-approval)
      const smallInvoiceResult = await agent.process(
        { invoiceId: 'inv-small', amount: 1000 },
        createContext({ userId: testUserId }),
      );

      expect(smallInvoiceResult.success).toBe(true);
      expect(smallInvoiceResult.data.results).toHaveProperty('auto_approval');

      // Test large invoice (executive approval)
      vi.spyOn(agent as any, 'executeConditionStep').mockResolvedValue({
        conditionMet: true,
        nextStep: 'executive_approval',
      });

      const largeInvoiceResult = await agent.process(
        { invoiceId: 'inv-large', amount: 100000 },
        createContext({ userId: testManagerId }),
      );

      expect(largeInvoiceResult.success).toBe(true);
      expect(largeInvoiceResult.data.results).toHaveProperty('executive_approval');
    });

    it('should execute compliance audit with critical issue escalation', async () => {
      // Mock critical compliance issues
      vi.spyOn(agent as any, 'executeAgentStep').mockImplementation(async (step: any) => {
        if (step.action === 'generate_audit_report') {
          return {
            criticalIssues: 3,
            highRiskAreas: ['Data Privacy', 'Financial Controls'],
            complianceScore: 0.45,
          };
        }
        return { success: true };
      });

      const result = await agent.process(
        { auditType: 'quarterly_compliance' },
        createContext({ userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      // Verify critical escalation occurred
      expect(result.data.results).toHaveProperty('escalate_critical');
    });
  });

  describe('Performance and Insights', () => {
    it('should detect slow workflow execution', async () => {
      // Mock slow execution
      const originalProcess = agent.process.bind(agent);
      vi.spyOn(agent, 'process').mockImplementation(async (data, context) => {
        const startTime = agent['startTime'];
        agent['startTime'] = startTime - 360000; // 6 minutes ago
        return originalProcess(data, context);
      });

      const result = await agent.process(
        { action: 'lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'slow_workflow_execution',
          severity: 'medium',
        }),
      );
    });

    it('should track workflow metrics', async () => {
      const result = await agent.process(
        { action: 'lifecycle' },
        createContext({ contractId: testContractId, userId: testManagerId }),
      );

      expect(result.success).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.data.duration).toBeDefined();
    });
  });
});