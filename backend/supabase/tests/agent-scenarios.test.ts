import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestEnterprise } from '../../tests/setup';
import { SupabaseClient } from '@supabase/supabase-js';

describe('Real-World Agent Scenarios', () => {
  let supabase: SupabaseClient;
  let enterpriseId: string;
  let userId: string;

  beforeEach(async () => {
    supabase = await setupTestDatabase();

    // Create test enterprise first
    const testEnterprise = await createTestEnterprise();
    enterpriseId = testEnterprise.id;
    
    // Then create test user
    const user = await createTestUser(enterpriseId, 'admin');
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(supabase);
  });

  describe('Contract Lifecycle Management', () => {
    it('should handle complete contract review workflow', async () => {
      // Create vendor and contract
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Enterprise Software Corp',
          email: 'contact@software.com',
          status: 'active',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: contract } = await supabase
        .from('contracts')
        .insert({
          name: 'Annual Software License Agreement',
          vendor_id: vendor.id,
          status: 'draft',
          type: 'software',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          value: 250000,
          currency: 'USD',
          metadata: {
            licenseCount: 100,
            supportLevel: 'premium',
            dataProcessingAddendum: true,
          },
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Stage 1: Initial Analysis
      const analysisAgents = ['secretary', 'financial', 'legal', 'compliance'];
      const analysisTasks = [];

      for (const agentType of analysisAgents) {
        const { data: agent } = await supabase
          .from('agents')
          .insert({
            name: `${agentType} Agent`,
            type: agentType,
            enterprise_id: enterpriseId,
          })
          .select()
          .single();

        const taskType = {
          secretary: 'extract_metadata',
          financial: 'analyze_costs',
          legal: 'review_terms',
          compliance: 'check_compliance',
        }[agentType];

        const { data: task } = await supabase
          .from('agent_tasks')
          .insert({
            agent_id: agent.id,
            task_type: taskType,
            priority: 8,
            status: 'pending',
            payload: {
              contractId: contract.id,
              stage: 'initial_review',
            },
            contract_id: contract.id,
            enterprise_id: enterpriseId,
          })
          .select()
          .single();

        analysisTasks.push(task);
      }

      // Simulate task completion with results
      const analysisResults = {
        secretary: {
          keyTerms: ['auto-renewal', 'termination-30-days', 'unlimited-users'],
          dates: { start: contract.start_date, end: contract.end_date },
          parties: ['Enterprise Software Corp', 'Customer'],
        },
        financial: {
          totalCost: 250000,
          monthlyBreakdown: 20833.33,
          additionalCosts: { support: 50000, training: 10000 },
          paymentTerms: 'NET 30',
        },
        legal: {
          risks: [
            { clause: 'liability-limitation', risk: 'medium' },
            { clause: 'data-ownership', risk: 'high' },
          ],
          recommendations: ['negotiate liability cap', 'clarify data ownership'],
        },
        compliance: {
          compliant: true,
          certifications: ['SOC2', 'ISO27001'],
          gdprCompliant: true,
          warnings: ['data residency not specified'],
        },
      };

      for (const task of analysisTasks) {
        const agentType = analysisAgents[analysisTasks.indexOf(task)];
        await supabase
          .from('agent_tasks')
          .update({
            status: 'completed',
            result: {
              success: true,
              data: analysisResults[agentType],
            },
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.id);
      }

      // Stage 2: Risk Assessment
      const { data: riskAgent } = await supabase
        .from('agents')
        .insert({
          name: 'Risk Assessment Agent',
          type: 'risk-assessment',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: riskTask } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: riskAgent.id,
          task_type: 'comprehensive_risk',
          priority: 9,
          status: 'completed',
          payload: {
            contractId: contract.id,
            analysisResults,
          },
          result: {
            success: true,
            data: {
              overallRisk: 6.5,
              categories: {
                financial: 3,
                legal: 7,
                operational: 5,
                compliance: 2,
              },
              recommendations: [
                'Negotiate liability cap to $500k',
                'Add data deletion clause',
                'Include SLA penalties',
              ],
            },
          },
          contract_id: contract.id,
          enterprise_id: enterpriseId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Stage 3: Manager Decision
      const { data: managerAgent } = await supabase
        .from('agents')
        .insert({
          name: 'Manager Agent',
          type: 'manager',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: decisionTask } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: managerAgent.id,
          task_type: 'make_decision',
          priority: 10,
          status: 'completed',
          payload: {
            contractId: contract.id,
            riskAssessment: riskTask.result.data,
            threshold: 7,
          },
          result: {
            success: true,
            data: {
              decision: 'approve_with_conditions',
              conditions: [
                'Negotiate liability cap',
                'Add data deletion clause',
                'Confirm data residency',
              ],
              reasoning: 'Risk score below threshold but requires amendments',
            },
          },
          contract_id: contract.id,
          enterprise_id: enterpriseId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Verify complete workflow
      const { data: allTasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('contract_id', contract.id)
        .order('created_at');

      expect(allTasks).toHaveLength(6); // 4 analysis + 1 risk + 1 decision
      expect(allTasks?.every((t: { status: string }) => t.status === 'completed')).toBe(true);

      // Verify insights were generated
      const { data: insights } = await supabase
        .from('agent_insights')
        .select('*')
        .eq('contract_id', contract.id);

      expect(insights?.length ?? 0).toBeGreaterThan(0);

      // Update contract status based on decision
      await supabase
        .from('contracts')
        .update({
          status: 'pending_negotiation',
          metadata: {
            ...contract.metadata,
            reviewCompleted: true,
            decision: decisionTask.result.data.decision,
            conditions: decisionTask.result.data.conditions,
          },
        })
        .eq('id', contract.id);
    });

    it('should handle contract renewal assessment', async () => {
      // Create expiring contract
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Cloud Services Inc',
          status: 'active',
          performance_score: 8.5,
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: contract } = await supabase
        .from('contracts')
        .insert({
          name: 'Cloud Infrastructure Services',
          vendor_id: vendor.id,
          status: 'active',
          type: 'service',
          start_date: new Date(Date.now() - 335 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: expiryDate.toISOString(),
          value: 500000,
          currency: 'USD',
          auto_renew: true,
          renewal_notice_days: 60,
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Create renewal assessment workflow
      const renewalSteps = [
        {
          agent: 'vendor',
          task: 'assess_vendor_performance',
          data: {
            vendorId: vendor.id,
            contractId: contract.id,
            period: 'last_year',
          },
        },
        {
          agent: 'financial',
          task: 'calculate_renewal_roi',
          data: {
            currentCost: 500000,
            usage: { compute: 85, storage: 92, bandwidth: 78 },
          },
        },
        {
          agent: 'analytics',
          task: 'analyze_usage_trends',
          data: {
            contractId: contract.id,
            predictNext: 12, // months
          },
        },
        {
          agent: 'manager',
          task: 'renewal_decision',
          data: {
            vendorPerformance: null, // Will be filled by previous steps
            roi: null,
            trends: null,
          },
        },
      ];

      const renewalResults = [];

      for (const step of renewalSteps) {
        const { data: agent } = await supabase
          .from('agents')
          .insert({
            name: `${step.agent} Renewal Agent`,
            type: step.agent,
            enterprise_id: enterpriseId,
          })
          .select()
          .single();

        // Fill in data from previous steps
        if (step.agent === 'manager' && renewalResults.length > 0) {
          step.data.vendorPerformance = renewalResults[0];
          step.data.roi = renewalResults[1];
          step.data.trends = renewalResults[2];
        }

        const result = {
          vendor: {
            performanceScore: 8.5,
            slaCompliance: 99.5,
            supportRating: 4.7,
            incidents: 3,
            recommendation: 'continue',
          },
          financial: {
            currentROI: 2.3,
            projectedROI: 2.5,
            costPerUnit: { compute: 0.08, storage: 0.023, bandwidth: 0.12 },
            marketComparison: 'competitive',
            savingsOpportunity: 50000,
          },
          analytics: {
            usageTrend: 'increasing',
            projectedGrowth: 15,
            seasonality: { q4: 1.3, q1: 0.9 },
            recommendations: ['increase compute allocation', 'optimize storage'],
          },
          manager: {
            decision: 'renew_with_negotiation',
            terms: {
              duration: 12,
              priceIncrease: 5,
              additionalServices: ['dedicated support', 'priority access'],
            },
            reasoning: 'Strong performance, competitive pricing, growing needs',
          },
        }[step.agent];

        renewalResults.push(result);

        await supabase
          .from('agent_tasks')
          .insert({
            agent_id: agent.id,
            task_type: step.task,
            priority: 9,
            status: 'completed',
            payload: step.data,
            result: { success: true, data: result },
            contract_id: contract.id,
            enterprise_id: enterpriseId,
            completed_at: new Date().toISOString(),
          });
      }

      // Create renewal notification
      await supabase
        .from('notifications')
        .insert({
          type: 'contract_renewal',
          title: 'Contract Renewal Assessment Complete',
          message: `Renewal assessment for ${contract.name} recommends: Renew with negotiation`,
          severity: 'medium',
          user_id: userId,
          data: {
            contractId: contract.id,
            decision: 'renew_with_negotiation',
            expiryDate: contract.end_date,
          },
          enterprise_id: enterpriseId,
        });

      // Verify renewal workflow completed
      const { data: renewalTasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('contract_id', contract.id)
        .in('task_type', renewalSteps.map(s => s.task));

      expect(renewalTasks).toHaveLength(4);
      expect(renewalTasks?.every((t: { status: string }) => t.status === 'completed')).toBe(true);
    });
  });

  describe('Vendor Risk Management', () => {
    it('should detect and escalate vendor compliance issues', async () => {
      // Create vendor with compliance issues
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'RiskyTech Solutions',
          status: 'active',
          compliance_status: 'pending',
          risk_score: 7.8,
          enterprise_id: enterpriseId,
          metadata: {
            lastAudit: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
            certifications: ['ISO27001'], // Missing SOC2
            incidents: 2,
          },
        })
        .select()
        .single();

      // Create contracts with this vendor
      const contracts = [];
      for (let i = 0; i < 3; i++) {
        const { data: contract } = await supabase
          .from('contracts')
          .insert({
            name: `Service Agreement ${i + 1}`,
            vendor_id: vendor.id,
            status: 'active',
            type: 'service',
            value: 100000 * (i + 1),
            enterprise_id: enterpriseId,
          })
          .select()
          .single();
        contracts.push(contract);
      }

      // Compliance agent detects issues
      const { data: complianceAgent } = await supabase
        .from('agents')
        .insert({
          name: 'Compliance Monitor',
          type: 'compliance',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const complianceIssues = [
        {
          issue: 'missing_certification',
          severity: 'high',
          details: 'SOC2 certification expired',
          requiredAction: 'obtain_certification',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          issue: 'audit_overdue',
          severity: 'medium',
          details: 'Security audit overdue by 35 days',
          requiredAction: 'schedule_audit',
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // Create compliance check task
      const { } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: complianceAgent.id,
          task_type: 'vendor_compliance_check',
          priority: 8,
          status: 'completed',
          payload: { vendorId: vendor.id },
          result: {
            success: true,
            data: {
              compliant: false,
              issues: complianceIssues,
              riskLevel: 'high',
              affectedContracts: contracts.map(c => c.id),
              totalExposure: 600000,
            },
          },
          vendor_id: vendor.id,
          enterprise_id: enterpriseId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Create high-severity insight
      await supabase
        .from('agent_insights')
        .insert({
          agent_id: complianceAgent.id,
          insight_type: 'compliance_violation',
          title: 'Vendor Compliance Issues Detected',
          description: `${vendor.name} has 2 compliance issues affecting $600,000 in contracts`,
          severity: 'high',
          confidence_score: 0.95,
          data: {
            vendorId: vendor.id,
            issues: complianceIssues,
            affectedContracts: contracts.length,
            totalExposure: 600000,
          },
          vendor_id: vendor.id,
          is_actionable: true,
          enterprise_id: enterpriseId,
        });

      // Risk assessment agent evaluates impact
      const { data: riskAgent } = await supabase
        .from('agents')
        .insert({
          name: 'Risk Evaluator',
          type: 'risk-assessment',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: riskTask } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: riskAgent.id,
          task_type: 'vendor_risk_assessment',
          priority: 9,
          status: 'completed',
          payload: {
            vendorId: vendor.id,
            complianceIssues,
            contracts: contracts.map(c => ({ id: c.id, value: c.value })),
          },
          result: {
            success: true,
            data: {
              riskScore: 8.2,
              impact: 'high',
              likelihood: 'medium',
              recommendations: [
                'Immediate vendor meeting required',
                'Pause new contracts',
                'Prepare contingency plan',
                'Monthly compliance monitoring',
              ],
              mitigationPlan: {
                immediate: ['vendor notification', 'compliance deadline'],
                shortTerm: ['alternative vendor evaluation', 'contract review'],
                longTerm: ['vendor replacement', 'in-house capabilities'],
              },
            },
          },
          vendor_id: vendor.id,
          enterprise_id: enterpriseId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Manager agent creates action plan
      const { data: managerAgent } = await supabase
        .from('agents')
        .insert({
          name: 'Action Manager',
          type: 'manager',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      await supabase
        .from('agent_tasks')
        .insert({
          agent_id: managerAgent.id,
          task_type: 'create_action_plan',
          priority: 10,
          status: 'completed',
          payload: {
            vendorId: vendor.id,
            riskAssessment: riskTask.result.data,
            urgency: 'high',
          },
          result: {
            success: true,
            data: {
              actionPlan: [
                {
                  action: 'notify_vendor',
                  assignee: 'vendor_management',
                  deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  status: 'pending',
                },
                {
                  action: 'review_alternatives',
                  assignee: 'procurement',
                  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  status: 'pending',
                },
                {
                  action: 'update_risk_register',
                  assignee: 'risk_management',
                  deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                  status: 'pending',
                },
              ],
              escalated: true,
              notifiedStakeholders: ['CFO', 'Legal', 'Procurement Head'],
            },
          },
          vendor_id: vendor.id,
          enterprise_id: enterpriseId,
          completed_at: new Date().toISOString(),
        });

      // Update vendor status
      await supabase
        .from('vendors')
        .update({
          compliance_status: 'non_compliant',
          risk_score: 8.2,
          status: 'under_review',
        })
        .eq('id', vendor.id);

      // Verify escalation workflow
      const { data: vendorTasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('priority', { ascending: false });

      expect(vendorTasks).toHaveLength(3);
      expect(vendorTasks?.[0]?.priority).toBe(10); // Manager task highest priority

      // Verify notifications created
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('data->vendorId', vendor.id)
        .eq('enterprise_id', enterpriseId);

      expect(notifications?.length ?? 0).toBeGreaterThan(0);
    });
  });

  describe('Multi-Enterprise Scenarios', () => {
    it('should maintain data isolation between enterprises', async () => {
      // Create second enterprise
      const { data: enterprise2 } = await supabase
        .from('enterprises')
        .insert({
          name: 'Competing Corp',
          settings: {},
        })
        .select()
        .single();

      // Create agents for both enterprises
      const { data: agent1 } = await supabase
        .from('agents')
        .insert({
          name: 'Enterprise 1 Secretary',
          type: 'secretary',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: agent2 } = await supabase
        .from('agents')
        .insert({
          name: 'Enterprise 2 Secretary',
          type: 'secretary',
          enterprise_id: enterprise2.id,
        })
        .select()
        .single();

      // Create tasks for both enterprises
      await supabase
        .from('agent_tasks')
        .insert([
          {
            agent_id: agent1.id,
            task_type: 'process',
            priority: 5,
            status: 'pending',
            payload: { data: 'Enterprise 1 confidential' },
            enterprise_id: enterpriseId,
          },
          {
            agent_id: agent2.id,
            task_type: 'process',
            priority: 5,
            status: 'pending',
            payload: { data: 'Enterprise 2 confidential' },
            enterprise_id: enterprise2.id,
          },
        ]);

      // Verify data isolation
      const { data: enterprise1Tasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('enterprise_id', enterpriseId);

      const { data: enterprise2Tasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('enterprise_id', enterprise2.id);

      expect(enterprise1Tasks).toHaveLength(1);
      expect(enterprise2Tasks).toHaveLength(1);
      expect(enterprise1Tasks?.[0]?.payload?.data).toContain('Enterprise 1');
      expect(enterprise2Tasks?.[0]?.payload?.data).toContain('Enterprise 2');

      // Ensure cross-enterprise queries return empty
      const { data: crossQuery } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', agent1.id)
        .eq('enterprise_id', enterprise2.id);

      expect(crossQuery).toHaveLength(0);
    });
  });
});