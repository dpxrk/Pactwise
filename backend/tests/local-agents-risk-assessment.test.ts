import { describe, it, expect, beforeEach } from 'vitest';
import { RiskAssessmentAgent } from '../supabase/functions/local-agents/agents/risk-assessment.ts';

// Mock Supabase client and DataLoader
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
  }),
};

// Mock DataLoader responses
const mockDataLoader = {
  getContract: (id: string) => {
    if (id === 'high-risk-contract') {
      return {
        id,
        contract_number: 'CTR-001',
        total_value: 5000000,
        payment_terms: 'Net 90',
        currency: 'EUR',
        liability_cap: 'unlimited',
        governing_law: 'CN',
        termination_clause: 'none',
        sla_requirements: { uptime: 99.99 },
        required_resources: 15,
      };
    }
    return {
      id,
      contract_number: 'CTR-002',
      total_value: 100000,
      payment_terms: 'Net 30',
      currency: 'USD',
      liability_cap: 1000000,
      governing_law: 'US',
      termination_clause: 'standard',
    };
  },
  getVendor: (id: string) => {
    if (id === 'risky-vendor') {
      return {
        id,
        name: 'RiskyVendor Inc',
        credit_rating: 'D',
        customer_concentration: 75,
        capacity_utilization: 95,
        locations: [{ city: 'Single Location' }],
        certifications: [],
        gdpr_compliant: false,
        handles_personal_data: true,
        incidents_last_year: 5,
        customer_satisfaction: 2.5,
        risk_score: 85,
        previous_risk_score: 65,
      };
    }
    return {
      id,
      name: 'SafeVendor Corp',
      credit_rating: 'A',
      customer_concentration: 30,
      capacity_utilization: 60,
      locations: [{ city: 'NYC' }, { city: 'LA' }],
      certifications: ['ISO9001', 'SOC2'],
      gdpr_compliant: true,
      handles_personal_data: true,
      incidents_last_year: 0,
      customer_satisfaction: 4.5,
      risk_score: 25,
    };
  },
};

const testEnterpriseId = 'test-enterprise-123';

describe('Risk Assessment Agent', () => {
  let agent: RiskAssessmentAgent;

  beforeEach(() => {
    agent = new RiskAssessmentAgent(mockSupabase as any, testEnterpriseId);
    // Mock the DataLoader
    (agent as any).dataLoader = mockDataLoader;
  });

  describe('Contract Risk Assessment', () => {
    it('should assess high-risk contract', async () => {
      const result = await agent.process({
        contractId: 'high-risk-contract',
      }, {
        taskType: 'contract_risk',
        enterpriseId: testEnterpriseId,
        sessionId: 'test-session',
        environment: { name: 'test' },
        permissions: ['read'],
      });

      expect(result.success).toBe(true);
      expect((result.data as any).level).toBe('critical');
      expect((result.data as any).dimensions).toHaveLength(3); // financial, legal, operational
      expect((result.data as any).topRisks.length).toBeGreaterThan(0);
      expect((result.data as any).recommendations.length).toBeGreaterThan(0);

      // Check for critical insights
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'critical_risk_detected',
          severity: 'critical',
        }),
      );
    });

    it('should assess low-risk contract', async () => {
      const result = await agent.process({
        contractId: 'low-risk-contract',
      }, {
        taskType: 'contract_risk',
        enterpriseId: testEnterpriseId,
        sessionId: 'test-session',
        environment: { name: 'test' },
        permissions: ['read'],
      });

      expect(result.success).toBe(true);
      expect(['low', 'medium']).toContain((result.data as any).level);
      expect((result.data as any).overallScore).toBeLessThan(2.5);
    });
  });

  describe('Vendor Risk Assessment', () => {
    it('should identify high-risk vendor', async () => {
      const result = await agent.process({
        vendorId: 'risky-vendor',
      }, {
        taskType: 'vendor_risk',
      });

      expect(result.success).toBe(true);
      expect((result.data as any).level).toBe('critical');
      expect((result.data as any).dimensions).toHaveLength(4); // financial, operational, legal, reputational

      // Check for vendor risk increase insight
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'vendor_risk_increase',
          severity: 'high',
        }),
      );
    });

    it('should assess low-risk vendor', async () => {
      const result = await agent.process({
        vendorId: 'safe-vendor',
      }, {
        taskType: 'vendor_risk',
      });

      expect(result.success).toBe(true);
      expect((result.data as any).level).toBe('low');
      expect((result.data as any).overallScore).toBeLessThan(1.5);
    });
  });

  describe('Project Risk Assessment', () => {
    it('should assess project risks', async () => {
      const result = await agent.process({
        projectId: 'project-123',
        timeline: { aggressive: true },
        budget: { contingency: 5 },
        resources: { keyPersonDependency: true },
        technology: { new: true },
      }, {
        taskType: 'project_risk',
      });

      expect(result.success).toBe(true);
      expect((result.data as any).dimensions.length).toBeGreaterThan(0);
      expect((result.data as any).topRisks).toContainEqual(
        expect.objectContaining({
          name: 'Aggressive Timeline',
        }),
      );
      expect((result.data as any).topRisks).toContainEqual(
        expect.objectContaining({
          name: 'Insufficient Contingency',
        }),
      );
    });
  });

  describe('Compliance Risk Assessment', () => {
    it('should assess GDPR compliance risks', async () => {
      const result = await agent.process({
        complianceFramework: 'GDPR',
        dataProcessing: true,
        encryption: false,
        auditTrail: false,
      }, {
        taskType: 'compliance_risk',
      });

      expect(result.success).toBe(true);
      expect((result.data as any).level).toBe('critical');
      expect((result.data as any).topRisks).toContainEqual(
        expect.objectContaining({
          name: 'Unencrypted Data Processing',
          impact: 'critical',
        }),
      );

      // Check for compliance alert
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'compliance_risk_alert',
          severity: 'high',
        }),
      );
    });
  });

  describe('Financial Risk Assessment', () => {
    it('should assess financial risks', async () => {
      const result = await agent.process({
        financialData: {
          cashFlowRatio: 0.8,
          daysOutstanding: 75,
          marketVolatility: 0.4,
          currentRatio: 1.2,
        },
      }, {
        taskType: 'financial_risk',
      });

      expect(result.success).toBe(true);
      expect((result.data as any).level).toBe('critical');
      expect((result.data as any).topRisks).toContainEqual(
        expect.objectContaining({
          name: 'Negative Cash Flow',
          impact: 'critical',
        }),
      );
    });
  });

  describe('Comprehensive Risk Assessment', () => {
    it('should perform comprehensive assessment with mitigation plan', async () => {
      const result = await agent.process({
        includeAllCategories: true,
      }, {
        taskType: 'comprehensive_risk',
      });

      expect(result.success).toBe(true);
      expect((result.data as any).dimensions).toHaveLength(6); // All risk categories
      expect((result.data as any).mitigationPlan).toBeDefined();
      expect((result.data as any).mitigationPlan.immediate).toBeDefined();
      expect((result.data as any).mitigationPlan.shortTerm).toBeDefined();
      expect((result.data as any).mitigationPlan.longTerm).toBeDefined();
      expect((result.data as any).mitigationPlan.estimatedEffort).toBeDefined();

      // Check for comprehensive insight
      expect(result.insights).toContainEqual(
        expect.objectContaining({
          type: 'comprehensive_risk_profile',
          severity: 'medium',
        }),
      );
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate risk scores correctly', async () => {
      const agent = new RiskAssessmentAgent(mockSupabase as any, testEnterpriseId);

      // Test risk score calculation
      const criticalCertain = (agent as any).calculateRiskScore('critical', 'certain');
      expect(criticalCertain).toBe(16); // 4 * 4

      const mediumPossible = (agent as any).calculateRiskScore('medium', 'possible');
      expect(mediumPossible).toBe(4); // 2 * 2

      const lowUnlikely = (agent as any).calculateRiskScore('low', 'unlikely');
      expect(lowUnlikely).toBe(1); // 1 * 1
    });

    it('should determine risk levels correctly', async () => {
      const agent = new RiskAssessmentAgent(mockSupabase as any, testEnterpriseId);

      // Test risk profile calculation
      const dimensions = [
        { category: 'financial', score: 3.8, weight: 0.25, factors: [] },
        { category: 'operational', score: 3.5, weight: 0.20, factors: [] },
        { category: 'legal', score: 3.6, weight: 0.20, factors: [] },
      ];

      const profile = (agent as any).calculateRiskProfile(dimensions, []);
      expect(profile.level).toBe('critical');
      expect(profile.overallScore).toBeGreaterThan(3.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid task type', async () => {
      const result = await agent.process({}, {
        taskType: 'invalid_risk',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported risk assessment type');
    });

    it('should handle missing contract', async () => {
      const result = await agent.process({
        contractId: 'non-existent',
      }, {
        taskType: 'contract_risk',
        enterpriseId: testEnterpriseId,
        sessionId: 'test-session',
        environment: { name: 'test' },
        permissions: ['read'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Contract not found');
    });

    it('should infer task type from data', async () => {
      const result = await agent.process({
        contractId: 'low-risk-contract',
      });

      expect(result.success).toBe(true);
      expect(result.metadata.rulesApplied).toContain('contract_risk_assessment');
    });
  });

  describe('Recommendations', () => {
    it('should generate relevant recommendations', async () => {
      const result = await agent.process({
        contractId: 'high-risk-contract',
      }, {
        taskType: 'contract_risk',
        enterpriseId: testEnterpriseId,
        sessionId: 'test-session',
        environment: { name: 'test' },
        permissions: ['read'],
      });

      expect(result.success).toBe(true);
      expect((result.data as any).recommendations).toContain('Implement immediate risk mitigation for financial risks');
      expect((result.data as any).recommendations).toContain('Implement immediate risk mitigation for legal risks');
      expect((result.data as any).recommendations.length).toBeLessThanOrEqual(10);
    });
  });
});