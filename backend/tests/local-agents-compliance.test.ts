import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceAgent } from '../supabase/functions/local-agents/agents/compliance.ts';

// Helper to create valid AgentContext
const createAgentContext = (overrides = {}) => ({
  enterpriseId: 'test-enterprise',
  sessionId: 'test-session',
  environment: {},
  permissions: [],
  ...overrides,
});

// Mock Supabase client
const mockSupabase = {
  from: (_table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => ({ data: null, error: null }),
        data: [],
        error: null,
      }),
      data: [],
      error: null,
    }),
    insert: () => ({ data: {}, error: null }),
    update: () => ({ data: {}, error: null }),
    upsert: () => ({ data: {}, error: null }),
  }),
  rpc: (funcName: string, _params: unknown) => {
    // Mock responses for different RPC calls
    if (funcName === 'get_contract_compliance_status') {
      return {
        data: {
          compliant: true,
          violations: [],
          warnings: ['Contract renewal approaching'],
        },
        error: null,
      };
    }
    if (funcName === 'get_vendor_compliance_status') {
      return {
        data: {
          compliant: true,
          missing_documents: [],
          expired_certifications: [],
        },
        error: null,
      };
    }
    return { data: null, error: null };
  },
};

const testEnterpriseId = 'test-enterprise-123';

describe('Compliance Agent', () => {
  let agent: ComplianceAgent;

  beforeEach(() => {
    agent = new ComplianceAgent(mockSupabase as unknown as MockSupabaseClient, testEnterpriseId);
  });

  describe('Contract Compliance', () => {
    it('should check contract compliance', async () => {
      const result = await agent.process({
        contractId: 'contract-123',
      }, createAgentContext({
        taskType: 'contract_compliance',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).compliant).toBe(true);
      expect((result.data as Record<string, unknown>).violations).toEqual([]);
      expect((result.data as Record<string, unknown>).warnings).toContain('Contract renewal approaching');
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'contract_renewal_warning',
          severity: 'medium',
        }),
      );
    });

    it('should audit multiple contracts', async () => {
      const result = await agent.process({
        contractIds: ['contract-1', 'contract-2', 'contract-3'],
      }, createAgentContext({
        taskType: 'compliance_audit',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).auditResults).toBeDefined();
      expect((result.data as Record<string, unknown>).overallCompliance).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe('Vendor Compliance', () => {
    it('should check vendor compliance', async () => {
      const result = await agent.process({
        vendorId: 'vendor-123',
      }, createAgentContext({
        taskType: 'vendor_compliance',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).compliant).toBe(true);
      expect((result.data as Record<string, unknown>).missingDocuments).toEqual([]);
      expect((result.data as Record<string, unknown>).expiredCertifications).toEqual([]);
    });

    it('should perform vendor risk assessment', async () => {
      const result = await agent.process({
        vendorId: 'vendor-456',
        includeFinancial: true,
        includeOperational: true,
      }, createAgentContext({
        taskType: 'vendor_risk_assessment',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).riskScore).toBeDefined();
      expect((result.data as Record<string, unknown>).riskFactors).toBeDefined();
      expect((result.data as Record<string, unknown>).recommendations).toBeDefined();
    });
  });

  describe('Regulatory Compliance', () => {
    it('should validate GDPR compliance', async () => {
      const result = await agent.process({
        framework: 'gdpr',
        scope: 'data_processing',
      }, createAgentContext({
        taskType: 'regulatory_compliance',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).framework).toBe('gdpr');
      expect((result.data as Record<string, unknown>).compliant).toBeDefined();
      expect((result.data as Record<string, unknown>).requirements).toBeDefined();
      expect((result.data as Record<string, unknown>).gaps).toBeDefined();
    });

    it('should check multiple compliance frameworks', async () => {
      const result = await agent.process({
        frameworks: ['gdpr', 'ccpa', 'soc2'],
      }, createAgentContext({
        taskType: 'regulatory_compliance',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).frameworkResults).toBeDefined();
      expect(Object.keys((result.data as Record<string, unknown>).frameworkResults)).toHaveLength(3);
    });
  });

  describe('Audit Preparation', () => {
    it('should prepare audit documentation', async () => {
      const result = await agent.process({
        auditType: 'soc2',
        period: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      }, createAgentContext({
        taskType: 'audit_preparation',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).auditType).toBe('soc2');
      expect((result.data as Record<string, unknown>).documentationStatus).toBeDefined();
      expect((result.data as Record<string, unknown>).evidenceGathered).toBeDefined();
      expect((result.data as Record<string, unknown>).gapsIdentified).toBeDefined();
    });
  });

  describe('Policy Validation', () => {
    it('should validate security policies', async () => {
      const result = await agent.process({
        policyType: 'security',
        policies: [
          { name: 'Password Policy', content: 'Minimum 12 characters' },
          { name: 'Access Control', content: 'Role-based access' },
        ],
      }, createAgentContext({
        taskType: 'policy_validation',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).validatedPolicies).toHaveLength(2);
      expect((result.data as Record<string, unknown>).complianceScore).toBeDefined();
    });
  });

  describe('Compliance Monitoring', () => {
    it('should set up continuous monitoring', async () => {
      const result = await agent.process({
        monitoringType: 'continuous',
        scope: ['contracts', 'vendors', 'policies'],
        frequency: 'daily',
      }, createAgentContext({
        taskType: 'compliance_monitoring',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).monitoringEnabled).toBe(true);
      expect((result.data as Record<string, unknown>).monitoringScope).toHaveLength(3);
      expect((result.data as Record<string, unknown>).schedule).toBeDefined();
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report', async () => {
      const result = await agent.process({
        reportType: 'quarterly',
        includeMetrics: true,
        includeTrends: true,
      }, createAgentContext({
        taskType: 'compliance_reporting',
      }));

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).report).toBeDefined();
      expect((result.data as Record<string, unknown>).metrics).toBeDefined();
      expect((result.data as Record<string, unknown>).trends).toBeDefined();
      expect((result.data as Record<string, unknown>).recommendations).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid task type', async () => {
      const result = await agent.process({}, createAgentContext({
        taskType: 'invalid_task',
      }));

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported compliance task type');
    });

    it('should handle missing required data', async () => {
      const result = await agent.process({}, createAgentContext({
        taskType: 'contract_compliance',
      }));

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const errorSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              data: null,
              error: new Error('Database connection failed'),
            }),
          }),
        }),
        rpc: () => ({ data: null, error: new Error('RPC failed') }),
      };

      const errorAgent = new ComplianceAgent(errorSupabase as unknown as SupabaseClient, testEnterpriseId);
      const result = await errorAgent.process({
        contractId: 'contract-123',
      }, createAgentContext({
        taskType: 'contract_compliance',
      }));

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to perform contract compliance check');
    });
  });
});