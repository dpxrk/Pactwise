import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SecretaryAgent } from '../supabase/functions/local-agents/agents/secretary.ts';
import { FinancialAgent } from '../supabase/functions/local-agents/agents/financial.ts';
import { LegalAgent } from '../supabase/functions/local-agents/agents/legal.ts';
import { AnalyticsAgent } from '../supabase/functions/local-agents/agents/analytics.ts';
import { VendorAgent } from '../supabase/functions/local-agents/agents/vendor.ts';
import { NotificationsAgent } from '../supabase/functions/local-agents/agents/notifications.ts';
import { ManagerAgent } from '../supabase/functions/local-agents/agents/manager.ts';
import { createTestEnterprise, createTestUser, cleanupTestData } from './setup';
import type { AgentContext } from '../supabase/functions/local-agents/agents/base.ts';

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

// Helper to create valid AgentContext
const createAgentContext = (enterpriseId: string, overrides: Partial<AgentContext> = {}): AgentContext => ({
  enterpriseId,
  sessionId: 'test-session',
  environment: {},
  permissions: [],
  ...overrides,
});

describe('Comprehensive Local Agents Tests', () => {
  let testEnterpriseId: string;
  let testUserId: string;
  let testManagerId: string;
  let mockSupabase: any;

  beforeEach(async () => {
    // Create test data
    const enterprise = await createTestEnterprise({ name: 'Test Corp' });
    testEnterpriseId = enterprise.id;

    const user = await createTestUser(testEnterpriseId, 'user');
    testUserId = user.id;

    const manager = await createTestUser(testEnterpriseId, 'manager');
    testManagerId = manager.id;

    // Create enhanced mock Supabase client with database function support
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
      rpc: vi.fn().mockImplementation((functionName: string, _params?: any) => {
        // Mock database function responses
        const functionResponses: Record<string, any> = {
          'extract_contract_metadata': {
            data: {
              title: 'SERVICE AGREEMENT',
              parties: ['ABC Corporation', 'XYZ Services'],
              effective_date: '2024-01-01',
              expiration_date: '2024-12-31',
              total_value: 150000,
              key_terms: {
                payment_terms: 'Net 30',
                termination_notice: '30 days',
              },
            },
            error: null,
          },
          'extract_contract_clauses': {
            data: [
              { type: 'limitation_of_liability', text: 'Limited to contract value', risk_level: 'high' },
              { type: 'indemnification', text: 'Mutual indemnification', risk_level: 'medium' },
              { type: 'termination', text: '30 days notice', risk_level: 'low' },
            ],
            error: null,
          },
          'analyze_contract_legal_risks': {
            data: {
              overall_risk: 'medium',
              risk_factors: [
                { factor: 'No governing law clause', severity: 'high' },
                { factor: 'Broad limitation of liability', severity: 'medium' },
              ],
              recommendations: ['Add governing law clause', 'Negotiate liability terms'],
            },
            error: null,
          },
          'calculate_vendor_analytics': {
            data: {
              overview: {
                total_contracts: 5,
                active_contracts: 3,
                total_value: 500000,
              },
              performance_trend: [
                { month: '2024-04', contracts_created: 1, monthly_value: 100000 },
                { month: '2024-05', contracts_created: 2, monthly_value: 200000 },
              ],
              risk_score: 0.3,
              recommendation: 'Stable vendor relationship',
            },
            error: null,
          },
          'calculate_vendor_relationship_score': {
            data: {
              overall_score: 0.85,
              relationship_level: 'preferred_vendor',
              score_components: {
                performance: { score: 80, weight: 0.25 },
                compliance: { score: 90, weight: 0.20 },
                loyalty: { score: 85, weight: 0.20 },
                responsiveness: { score: 88, weight: 0.15 },
                financial: { score: 82, weight: 0.20 },
              },
              recommendations: [],
            },
            error: null,
          },
          'forecast_budget_usage': {
            data: {
              budget: { total_budget: 1000000, spent_amount: 400000, remaining_amount: 600000 },
              forecast: {
                burn_rate: 100000,
                months_until_depletion: 6,
                projections: [
                  { forecast_month: '2024-07', projected_spend: 100000, remaining_budget: 500000 },
                  { forecast_month: '2024-08', projected_spend: 100000, remaining_budget: 400000 },
                ],
              },
              recommendations: ['Current spending rate is sustainable'],
            },
            error: null,
          },
          'optimize_budget_allocation': {
            data: {
              optimization_target: 'efficiency',
              recommendations: [
                {
                  budget_id: 'budget-123',
                  action: 'increase_allocation',
                  amount: 50000,
                  reason: 'Low utilization rate with high efficiency potential',
                },
              ],
              potential_savings: 25000,
            },
            error: null,
          },
          'identify_cost_optimization_opportunities': {
            data: {
              opportunities: [
                { type: 'contract_consolidation', potential_savings: 50000 },
                { type: 'vendor_negotiation', potential_savings: 30000 },
              ],
              total_potential_savings: 80000,
            },
            error: null,
          },
          'get_enterprise_analytics': {
            data: {
              current_snapshot: {
                total_contracts: 50,
                active_contracts: 35,
                total_vendors: 20,
                total_contract_value: 5000000,
                compliance_rate: 92,
              },
              trends: {
                contract_growth: 15.5,
                vendor_performance_trend: 0.05,
              },
            },
            error: null,
          },
          'process_contract_approval': {
            data: {
              approval_id: 'approval-123',
              contract_status: 'pending_review',
              decision: 'approved',
              timestamp: new Date().toISOString(),
            },
            error: null,
          },
          'process_document_workflow': {
            data: {
              workflow_id: 'workflow-123',
              workflow_type: 'contract_onboarding',
              steps_completed: 6,
              total_steps: 6,
              status: 'completed',
            },
            error: null,
          },
          'send_smart_notification': {
            data: {
              event_type: 'contract_expiry',
              recipients_count: 3,
              severity: 'high',
              notifications_sent: 3,
              escalation_scheduled: true,
            },
            error: null,
          },
          'search_with_rls': {
            data: [
              { id: 'contract-1', title: 'Service Agreement', score: 0.95 },
              { id: 'contract-2', title: 'Software License', score: 0.85 },
            ],
            error: null,
          },
        };

        return Promise.resolve(functionResponses[functionName] || { data: null, error: null });
      }),
    };
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.clearAllMocks();
  });

  describe('Secretary Agent with Database Functions', () => {
    let agent: SecretaryAgent;

    beforeEach(() => {
      agent = new SecretaryAgent(mockSupabase, testEnterpriseId);
    });

    it('should extract contract metadata using database function', async () => {
      const context: AgentContext = {
        ...createAgentContext(testEnterpriseId, {
          contractId: 'contract-123',
          userId: testUserId,
        })
      };

      const result = await agent.process(
        { content: 'Contract content here' },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('extract_contract_metadata', {
        p_contract_id: 'contract-123',
        p_content: 'Contract content here',
      });
      expect(result.data).toMatchObject({
        title: 'SERVICE AGREEMENT',
        parties: ['ABC Corporation', 'XYZ Services'],
      });
    });

    it('should process document workflow for contract onboarding', async () => {
      const context = {
        ...createAgentContext(testEnterpriseId),
        documentId: 'doc-123',
        userId: testUserId,
        workflow: 'contract_onboarding',
      };

      const result = await agent.process(
        { content: 'Document requiring workflow' },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_document_workflow', {
        p_document_id: 'doc-123',
        p_workflow_type: 'contract_onboarding',
        p_user_id: testUserId,
      });
      expect(result.rulesApplied).toContain('document_workflow_processing');
    });

    it('should handle caching for repeated requests', async () => {
      const context: AgentContext = {
        ...createAgentContext(testEnterpriseId, {
          contractId: 'contract-123',
          userId: testUserId,
        })
      };

      // First call
      await agent.process({ content: 'Contract' }, context);

      // Second call - should use cache
      const result = await agent.process({ content: 'Contract' }, context);

      expect(result.success).toBe(true);
      expect(result.metadata?.cached).toBeDefined();
    });
  });

  describe('Legal Agent with Database Functions', () => {
    let agent: LegalAgent;

    beforeEach(() => {
      agent = new LegalAgent(mockSupabase, testEnterpriseId);
    });

    it('should extract contract clauses using database function', async () => {
      const context = {
        ...createAgentContext(testEnterpriseId),
        contractId: 'contract-123',
        userId: testManagerId, // Manager role required
      };

      const result = await agent.process(
        { content: 'Contract with various clauses' },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('extract_contract_clauses', {
        p_contract_id: 'contract-123',
        p_content: expect.any(String),
      });
      expect(result.data.clauses).toHaveLength(3);
      expect(result.data.clauses[0]).toMatchObject({
        type: 'limitation_of_liability',
        risk_level: 'high',
      });
    });

    it('should analyze legal risks using database function', async () => {
      const context = {
        ...createAgentContext(testEnterpriseId),
        contractId: 'contract-123',
        userId: testManagerId,
      };

      const result = await agent.process(
        { content: 'Risky contract terms' },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('analyze_contract_legal_risks', {
        p_contract_id: 'contract-123',
        p_clauses: expect.any(Object),
      });
      expect((result.data as any).riskAssessment?.overall || (result.data as any).overall_risk).toBe('medium');
    });

    it('should process contract approval workflow', async () => {
      const context = {
        ...createAgentContext(testEnterpriseId),
        contractId: 'contract-123',
        userId: testManagerId,
      };

      const result = await agent.process(
        {
          action: 'approve',
          comments: 'Looks good',
          conditions: ['Payment terms to be reviewed quarterly'],
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_contract_approval', {
        p_contract_id: 'contract-123',
        p_approval_type: 'legal_review',
        p_approver_id: testManagerId,
        p_decision: 'approved',
        p_comments: 'Looks good',
        p_conditions: '["Payment terms to be reviewed quarterly"]',
      });
    });

    it('should enforce role-based access control', async () => {
      const context: AgentContext = {
        ...createAgentContext(testEnterpriseId, {
          contractId: 'contract-123',
          userId: testUserId,
        }) // Regular user, not manager
      };

      // Mock user permission check to return false
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'user' },
          error: null,
        }),
      }));

      const result = await agent.process(
        { content: 'Contract analysis' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('Insufficient permissions');
    });
  });

  describe('Financial Agent with Database Functions', () => {
    let agent: FinancialAgent;

    beforeEach(() => {
      agent = new FinancialAgent(mockSupabase, testEnterpriseId);
    });

    it('should forecast budget usage using database function', async () => {
      const context = {
        ...createAgentContext(testEnterpriseId),
        budgetId: 'budget-123',
        userId: testUserId,
      };

      const result = await agent.process(
        { months: 3 },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('forecast_budget_usage', {
        p_budget_id: 'budget-123',
        p_months_ahead: 3,
      });
      expect(result.data.forecast.burnRate).toBe(100000);
      expect(result.data.forecast.monthsUntilDepletion).toBe(6);
    });

    it('should optimize budget allocation', async () => {
      const result = await agent.process(
        { optimizationTarget: 'efficiency' },
        createAgentContext(testEnterpriseId, { userId: testUserId }),
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('optimize_budget_allocation', {
        p_enterprise_id: testEnterpriseId,
        p_optimization_target: 'efficiency',
      });
      expect(result.data.recommendations).toHaveLength(1);
      expect(result.data.recommendations[0].action).toBe('increase_allocation');
    });

    it('should identify cost optimization opportunities', async () => {
      const result = await agent.process(
        { analysisType: 'optimization' },
        createAgentContext(testEnterpriseId, { userId: testUserId }),
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('identify_cost_optimization_opportunities', {
        p_enterprise_id: testEnterpriseId,
      });
      expect(result.data.opportunities).toHaveLength(2);
      expect(result.data.totalPotentialSavings).toBe(80000);
    });
  });

  describe('Analytics Agent with Database Functions', () => {
    let agent: AnalyticsAgent;

    beforeEach(() => {
      agent = new AnalyticsAgent(mockSupabase, testEnterpriseId);
    });

    it('should get enterprise analytics using database function', async () => {
      const result = await agent.process(
        { period: 'month', lookback: 12 },
        createAgentContext(testEnterpriseId, { userId: testUserId }),
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_enterprise_analytics', {
        p_enterprise_id: testEnterpriseId,
        p_period: 'month',
        p_lookback: 12,
      });
      expect((result.data as any).snapshot?.totalContracts || (result.data as any).current_snapshot?.total_contracts).toBe(50);
      expect((result.data as any).trends?.contractGrowth || (result.data as any).trends?.contract_growth).toBe(15.5);
    });

    it('should analyze vendor performance metrics', async () => {
      const context: AgentContext = {
        ...createAgentContext(testEnterpriseId, {
          vendorId: 'vendor-123',
          userId: testUserId,
        })
      };

      const result = await agent.process(
        { startDate: '2024-01-01', endDate: '2024-06-30' },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_vendor_analytics', {
        p_vendor_id: 'vendor-123',
        p_start_date: '2024-01-01',
        p_end_date: '2024-06-30',
      });
      expect((result.data as any).vendorMetrics?.riskScore || (result.data as any).risk_score).toBe(0.3);
    });
  });

  describe('Vendor Agent with Database Functions', () => {
    let agent: VendorAgent;

    beforeEach(() => {
      agent = new VendorAgent(mockSupabase, testEnterpriseId);
    });

    it('should calculate vendor relationship score', async () => {
      const context: AgentContext = {
        ...createAgentContext(testEnterpriseId, {
          vendorId: 'vendor-123',
          userId: testUserId,
        })
      };

      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_vendor_relationship_score', {
        p_vendor_id: 'vendor-123',
      });
      // Check if result is VendorAnalysis type
      const vendorAnalysis = result.data as any;
      expect(vendorAnalysis.relationshipScore?.score).toBe(0.85);
      expect(vendorAnalysis.relationshipScore?.strength).toBe('preferred_vendor');
    });

    it('should provide vendor onboarding assessment', async () => {
      const vendorData = {
        name: 'New Vendor Inc.',
        category: 'software',
        metadata: {
          financial_data: {
            revenue: 1000000,
            employees: 50,
          },
        },
      };

      const result = await agent.process(
        { ...vendorData, analysisType: 'onboarding' },
        createAgentContext(testEnterpriseId, { userId: testUserId }),
      );

      expect(result.success).toBe(true);
      const evaluation = result.data as any;
      expect(evaluation.score || evaluation.overallScore || evaluation.initialAssessment?.score).toBeDefined();
      expect(evaluation.recommendation || evaluation.recommendations || evaluation.initialAssessment?.recommendations).toBeDefined();
    });
  });

  describe('Notifications Agent with Smart Routing', () => {
    let agent: NotificationsAgent;

    beforeEach(() => {
      agent = new NotificationsAgent(mockSupabase, testEnterpriseId);
    });

    it('should use smart notification routing for alerts', async () => {
      const context = {
        ...createAgentContext(testEnterpriseId),
        userId: testUserId,
        eventType: 'contract_expiry',
      };

      const alertData = {
        contractId: 'contract-123',
        contractName: 'Critical Service',
        daysUntilExpiry: 7,
        contractValue: 250000,
      };

      const result = await agent.process(
        { ...alertData, notificationType: 'alert' },
        context,
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('send_smart_notification', {
        p_event_type: 'contract_expiry',
        p_event_data: expect.objectContaining({
          contractId: 'contract-123',
          severity: expect.any(String),
        }),
        p_enterprise_id: testEnterpriseId,
      });
      expect(result.data.notificationsSent).toBe(3);
      expect(result.data.escalationScheduled).toBe(true);
    });

    it('should fallback to standard routing on error', async () => {
      // Mock RPC to throw error
      mockSupabase.rpc = vi.fn().mockRejectedValue(new Error('Database function not available'));

      const result = await agent.process(
        { type: 'test_alert', severity: 'high', notificationType: 'alert' },
        createAgentContext(testEnterpriseId, { eventType: 'test' }),
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.routingMethod).toBe('standard');
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'routing_fallback',
          severity: 'medium',
        }),
      );
    });
  });

  describe('Manager Agent with Real Agent Orchestration', () => {
    let agent: ManagerAgent;

    beforeEach(() => {
      agent = new ManagerAgent(mockSupabase, testEnterpriseId);
    });

    it('should execute single agent tasks', async () => {
      const request = 'Extract key information from contract ABC-123';

      const result = await agent.process(request, createAgentContext(testEnterpriseId, { userId: testUserId }));

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('single_agent');
      expect(result.data.primaryAgent).toBe('secretary');
      expect(result.data.agents).toHaveLength(1);
    });

    it('should orchestrate multi-agent workflows', async () => {
      const request = 'Review contract ABC-123 for financial risks and legal compliance';

      const result = await agent.process(request, createAgentContext(testEnterpriseId, { userId: testManagerId }));

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('multi_agent');
      expect(result.data.agents.length).toBeGreaterThanOrEqual(3);

      const agentTypes = result.data.agents.map((a: any) => a.agent);
      expect(agentTypes).toContain('secretary');
      expect(agentTypes).toContain('financial');
      expect(agentTypes).toContain('legal');
    });

    it('should handle agent dependencies correctly', async () => {
      const request = 'Analyze vendor performance and generate recommendations';

      const result = await agent.process(request, createAgentContext(testEnterpriseId, { userId: testUserId }));

      expect(result.success).toBe(true);

      // Verify dependency order
      const agentOrder = result.data.agents.map((a: any) => a.agent);
      const vendorIndex = agentOrder.indexOf('vendor');
      const analyticsIndex = agentOrder.indexOf('analytics');

      if (vendorIndex !== -1 && analyticsIndex !== -1) {
        expect(vendorIndex).toBeLessThan(analyticsIndex);
      }
    });

    it('should queue tasks for async execution when specified', async () => {
      const request = {
        content: 'Perform comprehensive enterprise analysis',
        async: true,
      };

      const result = await agent.process(request, createAgentContext(testEnterpriseId, { userId: testUserId }));

      expect(result.success).toBe(true);
      expect(result.data.executionMode).toBe('async');
      expect(result.data.taskIds).toBeDefined();
      expect(result.data.taskIds.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing context gracefully', async () => {
      const secretary = new SecretaryAgent(mockSupabase, testEnterpriseId);

      const result = await secretary.process({ content: 'Test document' }, createAgentContext(testEnterpriseId));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle database errors properly', async () => {
      mockSupabase.rpc = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      const legal = new LegalAgent(mockSupabase, testEnterpriseId);
      const result = await legal.process(
        { content: 'Contract' },
        createAgentContext(testEnterpriseId, { contractId: 'contract-123', userId: testManagerId }),
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('Database connection failed');
    });

    it('should respect rate limits', async () => {
      const analytics = new AnalyticsAgent(mockSupabase, testEnterpriseId);

      // Mock rate limiter to deny request
      const RateLimiting = await import('../supabase/functions/_shared/rate-limiting.ts');
      vi.mocked(RateLimiting.EnhancedRateLimiter).mockImplementation(() => ({
        checkLimit: vi.fn().mockResolvedValue({ 
          allowed: false, 
          remaining: 0,
          limit: 100,
          resetAt: new Date(),
          rule: { id: 'test', name: 'test' },
          fingerprint: 'test'
        }),
        cleanup: vi.fn().mockResolvedValue(undefined),
      }) as any);

      const result = await analytics.process({}, createAgentContext(testEnterpriseId, { userId: testUserId }));

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('Rate limit');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete contract lifecycle', async () => {
      const manager = new ManagerAgent(mockSupabase, testEnterpriseId);

      // Step 1: Initial contract review
      const reviewResult = await manager.process(
        'Review new contract from TechVendor for $500k software license',
        createAgentContext(testEnterpriseId, { userId: testManagerId }),
      );

      expect(reviewResult.success).toBe(true);
      expect(reviewResult.data.agents.length).toBeGreaterThanOrEqual(4);

      // Step 2: Approval workflow
      const legal = new LegalAgent(mockSupabase, testEnterpriseId);
      const approvalResult = await legal.process(
        {
          action: 'approve',
          comments: 'Approved with conditions',
          conditions: ['Quarterly reviews required'],
        },
        createAgentContext(testEnterpriseId, {
          contractId: 'contract-123',
          userId: testManagerId,
        }),
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.data.approvalStatus).toBeDefined();

      // Step 3: Notification
      const notifications = new NotificationsAgent(mockSupabase, testEnterpriseId);
      const notifyResult = await notifications.process(
        {
          type: 'contract_approved',
          contractName: 'TechVendor Software License',
          approvedBy: testManagerId,
          notificationType: 'alert',
        },
        createAgentContext(testEnterpriseId, {
          eventType: 'contract_approval',
        }),
      );

      expect(notifyResult.success).toBe(true);
      expect(notifyResult.data.notificationsSent).toBeGreaterThan(0);
    });

    it('should perform vendor risk assessment workflow', async () => {
      const manager = new ManagerAgent(mockSupabase, testEnterpriseId);

      const result = await manager.process(
        'Assess risk for vendor ABC Corp with declining performance',
        createAgentContext(testEnterpriseId, { userId: testManagerId }),
      );

      expect(result.success).toBe(true);

      // Verify vendor and analytics agents were involved
      const agentTypes = result.data.agents.map((a: any) => a.agent);
      expect(agentTypes).toContain('vendor');
      expect(agentTypes).toContain('analytics');

      // Check for risk insights
      const hasRiskInsights = result.insights.some((i: any) =>
        i.type.includes('risk') || i.severity === 'high',
      );
      expect(hasRiskInsights).toBe(true);
    });
  });
});