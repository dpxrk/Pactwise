import { describe, it, expect, beforeEach } from 'vitest';
import { SecretaryAgent } from '../supabase/functions/local-agents/agents/secretary.ts';
import { FinancialAgent } from '../supabase/functions/local-agents/agents/financial.ts';
import { LegalAgent } from '../supabase/functions/local-agents/agents/legal.ts';
import { AnalyticsAgent } from '../supabase/functions/local-agents/agents/analytics.ts';
import { VendorAgent } from '../supabase/functions/local-agents/agents/vendor.ts';
import { NotificationsAgent } from '../supabase/functions/local-agents/agents/notifications.ts';
import { ManagerAgent } from '../supabase/functions/local-agents/agents/manager.ts';
import { AgentContext } from '../supabase/types/common/agent';
import { MockSupabaseClient } from '../supabase/types/common/test';

// Mock Supabase client
const mockSupabase: MockSupabaseClient = {
  from: (_table) => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: {}, error: null }),
    update: () => ({ data: {}, error: null }),
    eq: () => ({ data: [], error: null }),
    single: () => ({ data: {}, error: null }),
    delete: () => ({ data: {}, error: null }),
    neq: () => ({ data: [], error: null }),
    gt: () => ({ data: [], error: null }),
    gte: () => ({ data: [], error: null }),
    lt: () => ({ data: [], error: null }),
    lte: () => ({ data: [], error: null }),
    in: () => ({ data: [], error: null }),
    is: () => ({ data: [], error: null }),
    csv: () => ({ data: [], error: null }),
    fts: () => ({ data: [], error: null }),
    plfts: () => ({ data: [], error: null }),
    phfts: () => ({ data: [], error: null }),
    wfts: () => ({ data: [], error: null }),
    ilike: () => ({ data: [], error: null }),
    like: () => ({ data: [], error: null }),
    cs: () => ({ data: [], error: null }),
    cd: () => ({ data: [], error: null }),
    ov: () => ({ data: [], error: null }),
    sl: () => ({ data: [], error: null }),
    sr: () => ({ data: [], error: null }),
    nxr: () => ({ data: [], error: null }),
    nxl: () => ({ data: [], error: null }),
    adj: () => ({ data: [], error: null }),
    not: () => ({ data: [], error: null }),
    or: () => ({ data: [], error: null }),
    filter: () => ({ data: [], error: null }),
    textSearch: () => ({ data: [], error: null }),
    match: () => ({ data: [], error: null }),
    order: () => ({ data: [], error: null }),
    limit: () => ({ data: [], error: null }),
    range: () => ({ data: [], error: null }),
    abortSignal: () => ({ data: [], error: null }),
  }),
  rpc: jest.fn(() => ({ data: [], error: null })),
  auth: {
    signUp: jest.fn(() => ({ data: { user: {} }, error: null })),
    signInWithPassword: jest.fn(() => ({ data: { user: {} }, error: null })),
    signOut: jest.fn(() => ({ error: null })),
    getUser: jest.fn(() => ({ data: { user: {} }, error: null })),
    admin: {
      updateUserById: jest.fn(() => ({ data: { user: {} }, error: null })),
      deleteUser: jest.fn(() => ({ data: null, error: null })),
      listUsers: jest.fn(() => ({ data: [], error: null })),
    },
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => ({ data: {}, error: null })),
      download: jest.fn(() => ({ data: {}, error: null })),
      remove: jest.fn(() => ({ data: {}, error: null })),
      copy: jest.fn(() => ({ data: {}, error: null })),
      move: jest.fn(() => ({ data: {}, error: null })),
      createSignedUrl: jest.fn(() => ({ data: { signedUrl: '' }, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' }, error: null })),
    })),
  },
  supabaseUrl: '',
  supabaseKey: '',
  realtime: {},
  realtimeUrl: '',
  authUrl: '',
  functionsUrl: '',
  storageUrl: '',
  schema: '',
  headers: {},
  fetch: jest.fn(),
  db: {},
  functions: {},
};

const testEnterpriseId = 'test-enterprise-123';

describe('Local Agents System', () => {
  describe('Secretary Agent', () => {
    let agent: SecretaryAgent;

    beforeEach(() => {
      agent = new SecretaryAgent(mockSupabase, testEnterpriseId);
    });

    it('should extract contract information', async () => {
      const contractData = {
        content: `
          SERVICE AGREEMENT
          
          This agreement is between ABC Corporation and XYZ Services.
          Effective Date: January 1, 2024
          Expiration Date: December 31, 2024
          
          Total Contract Value: $150,000
          Payment Terms: Net 30
          
          The vendor shall provide software development services.
        `,
      };

      const result = await agent.process(contractData, { dataType: 'contract', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as SecretaryAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('SERVICE AGREEMENT');
      expect(result.data.parties).toHaveLength(2);
      expect(result.data.amounts[0].value).toBe(150000);
      expect(result.data.documentType).toBe('service_agreement');
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'high_value_contract',
          severity: 'high',
        }),
      );
    });

    it('should process vendor information', async () => {
      const vendorData = {
        name: 'TechCorp Solutions Inc.',
        email: 'contact@techcorp.com',
        phone: '+1-555-123-4567',
        description: 'Leading software development company',
      };

      const result = await agent.process(vendorData, { dataType: 'vendor', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as SecretaryAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('TechCorp Solutions');
      expect(result.data.category).toBe('technology');
      expect(result.data.contactInfo.email).toBe('contact@techcorp.com');
      expect(result.data.contactInfo.phone).toBe('+1-555-123-4567');
    });

    it('should analyze document complexity', async () => {
      const complexDocument = {
        text: 'Lorem ipsum '.repeat(1000), // Long document
      };

      const result = await agent.process(complexDocument, { dataType: 'document', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as SecretaryAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.metadata.readabilityScore).toBeGreaterThan(15);
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'complex_document',
          severity: 'low',
        }),
      );
    });
  });

  describe('Financial Agent', () => {
    let agent: FinancialAgent;

    beforeEach(() => {
      agent = new FinancialAgent(mockSupabase, testEnterpriseId);
    });

    it('should analyze contract financials', async () => {
      const contractData = {
        contractValue: 250000,
        content: `
          Payment Schedule: 50% upfront, 50% on completion
          Implementation Fee: $50,000
          Annual Maintenance: $30,000
        `,
      };

      const result = await agent.process(contractData, { analysisType: 'contract', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as FinancialAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.totalValue).toBe(250000);
      expect(result.data.paymentSchedule.type).toBe('upfront');
      expect(result.data.costBreakdown.categories).toContainEqual(
        expect.objectContaining({
          name: 'implementation',
          amount: 50000,
        }),
      );
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'high_value_contract',
          severity: 'high',
        }),
      );
    });

    it('should calculate ROI', async () => {
      const investmentData = {
        content: `
          Investment: $100,000
          Expected annual savings: $150,000
          Implementation time: 6 months
        `,
      };

      const result = await agent.process(investmentData, { analysisType: 'contract', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as FinancialAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.roi.estimated).toBeGreaterThan(0);
      expect(result.data.roi.benefit).toBe(150000);
      expect(result.data.roi.cost).toBe(100000);
    });

    it('should detect budget risks', async () => {
      const budgetData = {
        budgetData: {
          total: 1000000,
          used: 950000,
          committed: 40000,
        },
      };

      const result = await agent.process(budgetData, { analysisType: 'budget', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as FinancialAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.budgetUtilization.percentage).toBeGreaterThan(90);
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'high_budget_utilization',
          severity: 'high',
        }),
      );
    });
  });

  describe('Legal Agent', () => {
    let agent: LegalAgent;

    beforeEach(() => {
      agent = new LegalAgent(mockSupabase, testEnterpriseId);
    });

    it('should identify legal clauses', async () => {
      const contractData = {
        content: `
          LIMITATION OF LIABILITY: In no event shall either party be liable for 
          indirect, incidental, or consequential damages exceeding the contract value.
          
          INDEMNIFICATION: The vendor shall indemnify and hold harmless the client
          from any third-party claims.
          
          TERMINATION: Either party may terminate this agreement with 30 days notice.
        `,
      };

      const result = await agent.process(contractData, { documentType: 'contract', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as LegalAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.clauses).toHaveLength(3);
      expect(result.data.clauses).toContainEqual(
        expect.objectContaining({
          type: 'limitation_of_liability',
          risk: 'high',
        }),
      );
      expect(result.data.clauses).toContainEqual(
        expect.objectContaining({
          type: 'indemnification',
        }),
      );
    });

    it('should check for missing clauses', async () => {
      const incompleteContract = {
        content: `
          This is a basic service agreement between Party A and Party B.
          Services will be provided for a fee of $50,000.
        `,
      };

      const result = await agent.process(incompleteContract, { documentType: 'contract', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as LegalAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.missingClauses).toContainEqual(
        expect.objectContaining({
          type: 'termination',
          severity: 'high',
        }),
      );
      expect(result.data.missingClauses).toContainEqual(
        expect.objectContaining({
          type: 'governing_law',
          severity: 'medium',
        }),
      );
    });

    it('should assess compliance requirements', async () => {
      const dataProcessingContract = {
        content: `
          The vendor will process personal data of EU residents.
          Data will be stored in secure cloud servers.
          Customer information includes names, emails, and addresses.
        `,
      };

      const result = await agent.process(dataProcessingContract, { checkType: 'compliance', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as LegalAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.regulations).toContainEqual(
        expect.objectContaining({
          regulation: 'GDPR',
          compliant: false,
        }),
      );
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'compliance_violation',
          severity: 'critical',
        }),
      );
    });
  });

  describe('Analytics Agent', () => {
    let agent: AnalyticsAgent;

    beforeEach(() => {
      agent = new AnalyticsAgent(mockSupabase, testEnterpriseId);
    });

    it('should analyze contract trends', async () => {
      const contractMetrics = {
        monthlyTrend: [
          { month: '2024-01', new: 10, expired: 5, value: 400000 },
          { month: '2024-02', new: 12, expired: 3, value: 500000 },
          { month: '2024-03', new: 15, expired: 8, value: 600000 },
        ],
      };

      const result = await agent.process(contractMetrics, { analysisType: 'contracts', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as AgentContext);

      expect(result.success).toBe(true);
      expect(result.data.trends).toContainEqual(
        expect.objectContaining({
          type: 'value',
          direction: 'positive',
        }),
      );
    });

    it('should detect spending anomalies', async () => {
      const spendingData = {
        unusualTransactions: [
          { date: '2024-05-15', amount: 150000, vendor: 'NewVendor', zscore: 3.2 },
        ],
      };

      const result = await agent.process(spendingData, { analysisType: 'spending', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as AgentContext);

      expect(result.success).toBe(true);
      expect(result.data.anomalies).toContainEqual(
        expect.objectContaining({
          type: 'unusual_transaction',
          severity: 'high',
        }),
      );
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'spending_anomaly',
          severity: 'high',
        }),
      );
    });
  });

  describe('Vendor Agent', () => {
    let agent: VendorAgent;

    beforeEach(() => {
      agent = new VendorAgent(mockSupabase, testEnterpriseId);
    });

    it('should evaluate vendor performance', async () => {
      const vendorData = {
        vendorId: 'vendor-123',
        performanceHistory: [
          { month: '2024-04', score: 0.75, issues: 2 },
          { month: '2024-05', score: 0.70, issues: 4 },
          { month: '2024-06', score: 0.65, issues: 5 },
        ],
      };

      const result = await agent.process(vendorData, { vendorId: 'vendor-123', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as AgentContext);

      expect(result.success).toBe(true);
      expect(result.data.performance.trend).toBe('declining');
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'poor_vendor_performance',
          severity: 'high',
        }),
      );
    });

    it('should assess new vendor onboarding', async () => {
      const newVendorData = {
        name: 'New Vendor Inc.',
        financial: {
          revenue: 500000,
          profitMargin: -0.05,
        },
        references: [
          { rating: 3, concern: 'Delivery delays' },
          { rating: 4, concern: 'None' },
        ],
        pricing: {
          total: 120000,
        },
        marketBenchmark: {
          average: 100000,
        },
      };

      const result = await agent.process(newVendorData, { analysisType: 'onboarding', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as AgentContext);

      expect(result.success).toBe(true);
      expect(result.data.financialStability.riskLevel).toBe('high');
      expect(result.data.pricing.competitiveness).toBe('above_market');
      expect(result.data.score).toBeLessThan(0.75);
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'financial_stability_concern',
          severity: 'high',
        }),
      );
    });
  });

  describe('Notifications Agent', () => {
    let agent: NotificationsAgent;

    beforeEach(() => {
      agent = new NotificationsAgent(mockSupabase, testEnterpriseId);
    });

    it('should process critical alerts', async () => {
      const alertData = {
        type: 'contract_expiration',
        contractName: 'Critical Service Agreement',
        daysUntil: 5,
        value: 500000,
      };

      const result = await agent.process(alertData, { notificationType: 'alert', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as NotificationsAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.severity).toBe('critical');
      expect(result.data.channels).toContain('email');
      expect(result.data.channels).toContain('sms');
      expect(result.data.escalation.required).toBe(true);
    });

    it('should handle overdue reminders', async () => {
      const reminderData = {
        title: 'Contract Renewal',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        assignedTo: 'user-123',
      };

      const result = await agent.process(reminderData, { notificationType: 'reminder', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as NotificationsAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.timing.isOverdue).toBe(true);
      expect(result.data.timing.daysOverdue).toBe(2);
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'overdue_item',
          severity: 'high',
        }),
      );
    });

    it('should generate digest summaries', async () => {
      const digestContext = {
        period: 'daily',
      };

      const result = await agent.process({}, {
        notificationType: 'digest',
        ...digestContext,
        enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read']
      } as NotificationsAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.period).toBe('daily');
      expect(result.data.summary).toHaveProperty('criticalItems');
      expect(result.data.sections).toBeInstanceOf(Array);
    });
  });

  describe('Manager Agent', () => {
    let agent: ManagerAgent;

    beforeEach(() => {
      agent = new ManagerAgent(mockSupabase, testEnterpriseId);
    });

    it('should analyze and route requests', async () => {
      const request = 'Review contract ABC-123 for financial and legal risks';

      const plan = await agent.analyzeRequest(request, { enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as ManagerAgentContext);

      expect(plan.type).toBe('multi_agent');
      expect(plan.requiredAgents).toContainEqual(
        expect.objectContaining({ type: 'secretary' }),
      );
      expect(plan.requiredAgents).toContainEqual(
        expect.objectContaining({ type: 'financial' }),
      );
      expect(plan.requiredAgents).toContainEqual(
        expect.objectContaining({ type: 'legal' }),
      );
      expect(plan.dependencies).toContainEqual(
        expect.objectContaining({
          agent: 'financial',
          dependsOn: 'secretary',
        }),
      );
    });

    it('should handle urgent requests', async () => {
      const urgentRequest = 'URGENT: Contract expires tomorrow, need immediate review and renewal';

      const plan = await agent.analyzeRequest(urgentRequest, { enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as ManagerAgentContext);

      expect(plan.priority).toBe('critical');
      expect(plan.requiredAgents).toContainEqual(
        expect.objectContaining({
          type: 'notifications',
          priority: 1,
        }),
      );
    });

    it('should execute multi-agent orchestration', async () => {
      const request = {
        content: 'Evaluate new vendor TechCorp with $200,000 contract proposal',
      };

      const result = await agent.process(request, { enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as ManagerAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('multi_agent');
      expect(result.data.agents).toBeInstanceOf(Array);
      expect(result.data.status).toBe('completed');
    });
  });

  describe('Integration Tests', () => {
    it('should handle end-to-end contract review workflow', async () => {
      const manager = new ManagerAgent(mockSupabase, testEnterpriseId);

      const contractReviewRequest = {
        type: 'contract_review',
        contract: {
          name: 'Enterprise Software License',
          content: `
            SOFTWARE LICENSE AGREEMENT
            
            Between MegaCorp (Client) and SoftwareVendor (Vendor)
            
            Effective Date: January 1, 2024
            Expiration Date: December 31, 2026
            
            License Fee: $500,000 annually
            Implementation: $100,000 one-time
            Support: $50,000 annually
            
            LIMITATION OF LIABILITY: Limited to annual license fee
            TERMINATION: 90 days notice required
            
            The vendor grants a non-exclusive license to use the software.
            All data processed will include customer personal information.
          `,
        },
      };

      const result = await manager.process(contractReviewRequest, { enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as ManagerAgentContext);

      expect(result.success).toBe(true);
      expect(result.data.orchestrationId).toBeDefined();
      expect(result.rulesApplied).toContain('multi_agent_orchestration');

      // Verify all necessary agents were involved
      const agentTypes = result.data.agents.map((a: { agent: string }) => a.agent);
      expect(agentTypes).toContain('secretary');
      expect(agentTypes).toContain('financial');
      expect(agentTypes).toContain('legal');
      expect(agentTypes).toContain('analytics');
    });
  });
});

describe('Performance Tests', () => {
  it('should process requests within acceptable time limits', async () => {
    const manager = new ManagerAgent(mockSupabase, testEnterpriseId);

    const startTime = Date.now();
    const result = await manager.process('Quick vendor check for ABC Corp', { enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as ManagerAgentContext);
    const endTime = Date.now();

    const processingTime = endTime - startTime;

    expect(result.success).toBe(true);
    expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should handle large documents efficiently', async () => {
    const secretary = new SecretaryAgent(mockSupabase, testEnterpriseId);

    const largeDocument = {
      content: 'Lorem ipsum '.repeat(10000), // ~120,000 characters
    };

    const startTime = Date.now();
    const result = await secretary.process(largeDocument, { dataType: 'document', enterpriseId: testEnterpriseId, sessionId: 'test-session', environment: { name: 'test' }, permissions: ['read'] } as SecretaryAgentContext);
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
  });
});