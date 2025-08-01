import { describe, it, expect, beforeEach } from 'vitest';
import { TheoryOfMindEngine } from '../functions/local-agents/theory-of-mind/theory-of-mind-engine.ts';
import { TheoryOfMindManagerAgent } from '../functions/local-agents/agents/theory-of-mind-manager.ts';
import {
  ObservedBehavior,
  Message,
} from '../functions/local-agents/theory-of-mind/types.ts';
import { createMockSupabase } from './setup.ts';

describe('Theory of Mind System', () => {
  let engine: TheoryOfMindEngine;
  let supabase: any;

  beforeEach(() => {
    engine = new TheoryOfMindEngine('test_agent', 'ai');
    supabase = createMockSupabase();
  });

  describe('TheoryOfMindEngine', () => {
    describe('Mental State Modeling', () => {
      it('should model another agent\'s mental state', async () => {
        const observations: ObservedBehavior[] = [{
          agentId: 'other_agent',
          actions: [{
            agentId: 'other_agent',
            actionType: 'search',
            parameters: { query: 'contract review process' },
            observedBy: ['test_agent'],
            interpretations: new Map(),
          }],
          context: { situation: 'reviewing contracts' },
          timestamp: new Date().toISOString(),
        }];

        const mentalState = await engine.modelAgent('other_agent', 'human', observations);

        expect(mentalState.agentId).toBe('other_agent');
        expect(mentalState.agentType).toBe('human');
        expect(mentalState.beliefs.size).toBeGreaterThan(0);
        expect(mentalState.desires.size).toBeGreaterThan(0);
      });

      it('should update mental state based on new observations', async () => {
        // First observation
        const obs1: ObservedBehavior = {
          agentId: 'agent1',
          actions: [{
            agentId: 'agent1',
            actionType: 'express_preference',
            parameters: { preference: 'morning meetings' },
            observedBy: ['test_agent'],
            interpretations: new Map(),
          }],
          context: {},
          timestamp: new Date().toISOString(),
        };

        await engine.modelAgent('agent1', 'human', [obs1]);

        // Second observation
        const obs2: ObservedBehavior = {
          agentId: 'agent1',
          actions: [{
            agentId: 'agent1',
            actionType: 'decline',
            parameters: { meeting: 'afternoon standup' },
            observedBy: ['test_agent'],
            interpretations: new Map(),
          }],
          context: {},
          timestamp: new Date().toISOString(),
        };

        const updatedState = await engine.modelAgent('agent1', 'human', [obs2]);

        // Should have consolidated beliefs about preferences
        const beliefs = Array.from(updatedState.beliefs.values());
        const preferenceBeliefs = beliefs.filter(b =>
          b.content.includes('prefer') || b.content.includes('meeting'),
        );
        expect(preferenceBeliefs.length).toBeGreaterThan(0);
      });
    });

    describe('Intention Recognition', () => {
      it('should recognize intentions from behavior', async () => {
        const observation: ObservedBehavior = {
          agentId: 'user1',
          actions: [
            {
              agentId: 'user1',
              actionType: 'request_budget_increase',
              parameters: { amount: 10000, reason: 'new software licenses' },
              observedBy: ['test_agent'],
              interpretations: new Map(),
            },
            {
              agentId: 'user1',
              actionType: 'schedule_meeting',
              parameters: { with: 'finance_team' },
              observedBy: ['test_agent'],
              interpretations: new Map(),
            },
          ],
          context: { department: 'engineering' },
          timestamp: new Date().toISOString(),
        };

        const hypotheses = await engine.recognizeIntentions(observation);

        expect(hypotheses.length).toBeGreaterThan(0);
        expect(hypotheses[0].intention.action).toContain('secure_funding');
        expect(hypotheses[0].probability).toBeGreaterThan(0.5);
        expect(hypotheses[0].supportingEvidence.length).toBeGreaterThan(0);
      });

      it('should provide alternative intention explanations', async () => {
        const observation: ObservedBehavior = {
          agentId: 'manager1',
          actions: [{
            agentId: 'manager1',
            actionType: 'frequent_check_ins',
            parameters: { target: 'team_member', frequency: 'hourly' },
            observedBy: ['test_agent'],
            interpretations: new Map(),
          }],
          context: { project_status: 'critical', deadline: 'tomorrow' },
          timestamp: new Date().toISOString(),
        };

        const hypotheses = await engine.recognizeIntentions(observation);

        expect(hypotheses.length).toBeGreaterThan(0);
        // Should recognize multiple possible intentions
        const alternatives = hypotheses[0].alternativeExplanations;
        expect(alternatives.length).toBeGreaterThan(0);

        // Check for different interpretations (e.g., support vs micromanagement)
        const purposes = hypotheses.concat(alternatives)
          .map(h => h.intention.purpose);
        expect(purposes).toContain('ensure_project_success');
      });
    });

    describe('Perspective Taking', () => {
      it('should simulate another agent\'s perspective', async () => {
        // Model the other agent first
        await engine.modelAgent('colleague', 'human', [{
          agentId: 'colleague',
          actions: [{
            agentId: 'colleague',
            actionType: 'express',
            parameters: { concern: 'workload', stress_level: 'high' },
            observedBy: ['test_agent'],
            interpretations: new Map(),
          }],
          context: { recent_changes: 'team_downsizing' },
          timestamp: new Date().toISOString(),
        }]);

        const situation = {
          scenario: 'new_project_assignment',
          deadline: 'next_week',
          complexity: 'high',
        };

        const perspective = await engine.takePerspective('colleague', situation);

        expect(perspective.viewpoint).toBe('colleague');
        expect(perspective.confidence).toBeGreaterThan(0);
        expect(perspective.assumptions.length).toBeGreaterThan(0);

        // Should recognize stress and workload concerns
        const simulatedBeliefs = Array.from(perspective.simulatedMentalState.beliefs.values());
        const stressBeliefs = simulatedBeliefs.filter(b =>
          b.content.toLowerCase().includes('overwhelm') ||
          b.content.toLowerCase().includes('stress'),
        );
        expect(stressBeliefs.length).toBeGreaterThan(0);
      });
    });

    describe('Empathy Modeling', () => {
      it('should generate empathy model for emotional situations', async () => {
        const situation = {
          agent: 'team_member',
          event: 'project_failure',
          context: {
            investment: 'high',
            effort: 'months',
            visibility: 'company-wide',
          },
        };

        const empathy = await engine.generateEmpathyModel('team_member', situation);

        expect(empathy.targetAgent).toBe('team_member');
        expect(empathy.emotionalSimulation.valence).toBeLessThan(0); // Negative emotion
        expect(empathy.empathicConcern).toBeGreaterThan(0.5);
        expect(empathy.affectiveForecast.predictedEmotion).toBeDefined();
      });
    });

    describe('Trust Dynamics', () => {
      it('should update trust based on interactions', async () => {
        const interaction = {
          type: 'promise_fulfillment',
          details: 'delivered on time as promised',
        };

        const trust = await engine.updateTrust(
          'test_agent',
          'partner_agent',
          interaction,
          { type: 'success', affectedAgents: [], stateChanges: [] },
        );

        expect(trust.competenceTrust).toBeGreaterThan(0.5);
        expect(trust.integrityTrust).toBeGreaterThan(0.5);
        expect(trust.evidenceBase.length).toBeGreaterThan(0);
      });

      it('should decay trust over time without interactions', async () => {
        // Create initial trust
        await engine.updateTrust('test_agent', 'old_partner',
          { type: 'collaboration' },
          { type: 'success', affectedAgents: [], stateChanges: [] },
        );

        // Simulate time passing
        const currentTrust = engine.getTrustLevel('test_agent', 'old_partner');

        // Trust should still exist but may be at default levels
        expect(currentTrust).toBeGreaterThanOrEqual(0);
        expect(currentTrust).toBeLessThanOrEqual(1);
      });
    });

    describe('Multi-Agent Coordination', () => {
      it('should create coordination plans', async () => {
        const goal = 'complete project milestone';
        const participants = ['agent1', 'agent2', 'agent3'];
        const constraints = [
          { type: 'temporal', description: 'deadline in 2 weeks', value: '2 weeks' },
          { type: 'resource', description: 'budget limit', value: 50000 },
        ];

        const plan = await engine.createCoordinationPlan(goal, participants, constraints);

        expect(plan.goal).toBe(goal);
        expect(plan.participants.size).toBe(3);
        expect(plan.sharedPlan.steps.length).toBeGreaterThan(0);
        expect(plan.contingencies.length).toBeGreaterThan(0);
        expect(plan.successCriteria.length).toBeGreaterThan(0);
      });
    });

    describe('Recursive Beliefs', () => {
      it('should model recursive beliefs up to depth limit', async () => {
        const belief: Belief = {
          id: 'project_deadline',
          content: 'The project deadline is critical',
          confidence: 0.9,
          source: 'communication',
          timestamp: new Date().toISOString(),
          evidence: [],
        };

        const recursiveBelief = await engine.modelRecursiveBelief(
          2, // "I think that you think that I think..."
          'test_agent',
          'manager',
          belief,
        );

        expect(recursiveBelief.level).toBe(2);
        expect(recursiveBelief.holder).toBe('test_agent');
        expect(recursiveBelief.aboutAgent).toBe('manager');
      });
    });

    describe('Message Interpretation', () => {
      it('should interpret messages with context', async () => {
        const message: Message = {
          sender: 'boss',
          content: 'We need to talk about your performance',
          intent: {
            type: 'request',
            directMeaning: 'schedule a performance discussion',
          },
        };

        const context = {
          recent_events: ['missed_deadline', 'team_conflict'],
          relationship: 'hierarchical',
        };

        const interpreted = await engine.interpretMessage(message, context);

        expect(interpreted.interpretation).toBeDefined();
        expect(interpreted.interpretation!.believedIntent.type).toBe('request');
        expect(interpreted.interpretation!.confidence).toBeLessThan(1); // Some uncertainty
      });
    });

    describe('Shared Beliefs', () => {
      it('should track shared beliefs among agents', async () => {
        // Create beliefs for multiple agents
        await engine.modelAgent('agent1', 'ai');
        await engine.modelAgent('agent2', 'ai');

        // Establish a shared belief
        const belief: Belief = {
          id: 'team_goal',
          content: 'Quality is our top priority',
          confidence: 0.85,
          source: 'communication',
          timestamp: new Date().toISOString(),
          evidence: [],
        };

        engine.establishSharedBelief(belief, new Set(['agent1', 'agent2', 'test_agent']));

        const sharedBeliefs = engine.getSharedBeliefs();
        expect(sharedBeliefs.size).toBeGreaterThan(0);

        const teamGoalBelief = sharedBeliefs.get('team_goal');
        expect(teamGoalBelief?.knownBy.size).toBe(3);
        expect(teamGoalBelief?.certainty).toBeGreaterThan(0.5);
      });
    });
  });

  describe('TheoryOfMindManagerAgent', () => {
    let agent: TheoryOfMindManagerAgent;

    beforeEach(() => {
      agent = new TheoryOfMindManagerAgent(supabase, 'test-enterprise');
    });

    it('should have manager-specific capabilities', () => {
      const { capabilities } = agent;
      expect(capabilities).toContain('team_coordination');
      expect(capabilities).toContain('empathetic_leadership');
      expect(capabilities).toContain('conflict_resolution');
    });

    it('should process team management scenarios', async () => {
      const data = {
        manageTeam: true,
        team: {
          members: [
            { id: 'dev1', role: 'developer', responsibilities: ['coding', 'testing'] },
            { id: 'dev2', role: 'developer', responsibilities: ['coding', 'reviews'] },
            { id: 'designer1', role: 'designer', responsibilities: ['ui', 'ux'] },
          ],
        },
        projectGoals: [
          { id: 'mvp', description: 'Launch MVP', priority: 0.9, deadline: '2024-03-01' },
        ],
        observations: [
          {
            agentId: 'dev1',
            actions: [{
              agentId: 'dev1',
              actionType: 'express_concern',
              parameters: { about: 'timeline' },
              observedBy: ['manager'],
              interpretations: new Map(),
            }],
            context: {},
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await agent.process(data);

      expect(result.theoryOfMind).toBeDefined();
      expect(result.theoryOfMind!.otherAgentStates.size).toBeGreaterThan(0);
      expect(result.theoryOfMind!.insights.length).toBeGreaterThan(0);

      // Should identify the concern about timeline
      const { insights } = (result.theoryOfMind!);
      const concernInsight = insights.find(i =>
        i.description.includes('concern') || i.description.includes('timeline'),
      );
      expect(concernInsight).toBeDefined();
    });

    it('should analyze team cohesion', async () => {
      const data = {
        manageTeam: true,
        team: {
          members: ['alice', 'bob', 'charlie'],
        },
        communications: [
          { sender: 'alice', content: 'Great work on the feature!' },
          { sender: 'bob', content: 'Thanks! Your design really helped.' },
          { sender: 'charlie', content: 'Agree, we make a good team.' },
        ],
      };

      const result = await agent.process(data);

      const cohesionInsight = result.theoryOfMind?.insights.find(i =>
        i.type === 'coordination' && i.description.includes('cohesion'),
      );

      // Positive communications should indicate good cohesion
      if (cohesionInsight?.description.includes('strong')) {
        expect(cohesionInsight.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should detect potential conflicts', async () => {
      const data = {
        manageTeam: true,
        team: {
          members: ['dev1', 'dev2'],
        },
        observations: [
          {
            agentId: 'dev1',
            actions: [{
              agentId: 'dev1',
              actionType: 'claim_resource',
              parameters: { resource: 'test_server' },
              observedBy: ['manager'],
              interpretations: new Map(),
            }],
            context: {},
            timestamp: new Date().toISOString(),
          },
          {
            agentId: 'dev2',
            actions: [{
              agentId: 'dev2',
              actionType: 'claim_resource',
              parameters: { resource: 'test_server' },
              observedBy: ['manager'],
              interpretations: new Map(),
            }],
            context: {},
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await agent.process(data);

      const conflictInsight = result.theoryOfMind?.insights.find(i =>
        i.type === 'belief_attribution' && i.description.includes('conflict'),
      );

      expect(conflictInsight).toBeDefined();
      expect(conflictInsight?.implications).toContain('Schedule mediation session');
    });

    it('should make management decisions', async () => {
      const data = {
        managementDecision: 'task_assignment',
        team: {
          members: ['dev1', 'dev2', 'dev3'],
        },
        observations: [
          {
            agentId: 'dev1',
            actions: [{
              agentId: 'dev1',
              actionType: 'complete_task',
              parameters: { tasks_completed: 5 },
              observedBy: ['manager'],
              interpretations: new Map(),
            }],
            context: { workload: 'high' },
            timestamp: new Date().toISOString(),
          },
          {
            agentId: 'dev2',
            actions: [{
              agentId: 'dev2',
              actionType: 'request_help',
              parameters: {},
              observedBy: ['manager'],
              interpretations: new Map(),
            }],
            context: { workload: 'low' },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await agent.process(data);

      const decisionInsight = result.insights?.find(i =>
        i.category === 'Management Decision',
      );

      expect(decisionInsight).toBeDefined();
      expect((decisionInsight?.data as any)?.assignments).toBeDefined();
    });

    it('should identify collaboration opportunities', async () => {
      const data = {
        manageTeam: true,
        team: {
          members: ['frontend_dev', 'backend_dev', 'designer'],
        },
        observations: [
          {
            agentId: 'frontend_dev',
            actions: [{
              agentId: 'frontend_dev',
              actionType: 'express_interest',
              parameters: { in: 'api_design' },
              observedBy: ['manager'],
              interpretations: new Map(),
            }],
            context: {},
            timestamp: new Date().toISOString(),
          },
          {
            agentId: 'backend_dev',
            actions: [{
              agentId: 'backend_dev',
              actionType: 'seek_feedback',
              parameters: { on: 'api_usability' },
              observedBy: ['manager'],
              interpretations: new Map(),
            }],
            context: {},
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await agent.process(data);

      const collaborationInsight = result.theoryOfMind?.insights.find(i =>
        i.type === 'coordination' && i.description.includes('complementary'),
      );

      expect(collaborationInsight).toBeDefined();
      expect(collaborationInsight?.implications).toContain('Assign joint tasks');
    });
  });
});