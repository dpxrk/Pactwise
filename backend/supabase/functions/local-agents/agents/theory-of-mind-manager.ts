import { TheoryOfMindBaseAgent, TheoryOfMindProcessingResult, ToMInsight } from './theory-of-mind-base.ts';
import {
  MentalState,
  Belief,
  Desire,
} from '../theory-of-mind/types.ts';

export class TheoryOfMindManagerAgent extends TheoryOfMindBaseAgent {
  private teamDynamics: Map<string, TeamMemberProfile> = new Map();
  private communicationPatterns: Map<string, CommunicationStyle> = new Map();

  get agentType() {
    return 'theory_of_mind_manager';
  }

  get capabilities() {
    return [
      'team_coordination',
      'mental_state_modeling',
      'intention_recognition',
      'empathetic_leadership',
      'conflict_resolution',
      'trust_building',
      'perspective_taking',
      'multi_agent_orchestration',
    ];
  }

  // Override to add manager-specific beliefs
  protected async addDomainSpecificBeliefs(
    mentalState: MentalState,
    data: any,
    context?: any,
  ): Promise<void> {
    // Add beliefs about team roles and responsibilities
    if (data.teamStructure) {
      for (const member of data.teamStructure.members) {
        if (member.id === mentalState.agentId) {
          // Belief about own role
          const roleBelief: Belief = {
            id: `role_${member.role}`,
            content: `My role is ${member.role}`,
            confidence: 0.9,
            source: 'communication',
            timestamp: new Date().toISOString(),
            evidence: [{
              type: 'statement',
              content: 'Role assignment',
              reliability: 0.95,
              timestamp: new Date().toISOString(),
            }],
          };
          mentalState.beliefs.set(roleBelief.id, roleBelief);

          // Belief about responsibilities
          for (const responsibility of member.responsibilities || []) {
            const respBelief: Belief = {
              id: `resp_${responsibility}`,
              content: `I am responsible for ${responsibility}`,
              confidence: 0.85,
              source: 'inference',
              timestamp: new Date().toISOString(),
              evidence: [],
            };
            mentalState.beliefs.set(respBelief.id, respBelief);
          }
        }
      }
    }

    // Add beliefs about project goals
    if (data.projectGoals) {
      for (const goal of data.projectGoals) {
        const goalBelief: Belief = {
          id: `project_goal_${goal.id}`,
          content: `Project goal: ${goal.description}`,
          confidence: 0.9,
          source: 'communication',
          timestamp: new Date().toISOString(),
          evidence: [],
        };
        mentalState.beliefs.set(goalBelief.id, goalBelief);

        // Add corresponding desire
        const goalDesire: Desire = {
          id: `achieve_${goal.id}`,
          goal: goal.description,
          priority: goal.priority || 0.7,
          type: 'achievement',
          constraints: goal.constraints || [],
          deadline: goal.deadline,
          progress: goal.progress || 0,
        };
        mentalState.desires.set(goalDesire.id, goalDesire);
      }
    }

    // Add beliefs about team culture
    if (data.teamCulture) {
      const cultureBelief: Belief = {
        id: 'team_culture',
        content: `Our team values: ${data.teamCulture.values.join(', ')}`,
        confidence: 0.8,
        source: 'observation',
        timestamp: new Date().toISOString(),
        evidence: [],
      };
      mentalState.beliefs.set(cultureBelief.id, cultureBelief);
    }
  }

  // Generate manager-specific Theory of Mind insights
  protected async generateDomainToMInsights(
    data: any,
    mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight[]> {
    const insights: ToMInsight[] = [];

    // Analyze team cohesion
    const cohesionInsight = await this.analyzeTeamCohesion(mentalStates);
    if (cohesionInsight) {insights.push(cohesionInsight);}

    // Identify potential conflicts
    const conflictInsights = await this.identifyPotentialConflicts(mentalStates);
    insights.push(...conflictInsights);

    // Assess motivation levels
    const motivationInsights = await this.assessTeamMotivation(mentalStates);
    insights.push(...motivationInsights);

    // Identify collaboration opportunities
    const collaborationInsights = await this.identifyCollaborationOpportunities(mentalStates);
    insights.push(...collaborationInsights);

    // Analyze communication effectiveness
    const communicationInsights = await this.analyzeCommunicationEffectiveness(data, mentalStates);
    insights.push(...communicationInsights);

    return insights;
  }

  // Analyze team cohesion based on shared beliefs and goals
  private async analyzeTeamCohesion(
    mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight | null> {
    const sharedBeliefs = this.tomEngine.getSharedBeliefs();
    const totalPossibleBeliefs = this.countTotalBeliefs(mentalStates);

    if (totalPossibleBeliefs === 0) {return null;}

    const cohesionScore = sharedBeliefs.size / totalPossibleBeliefs;

    if (cohesionScore < 0.5) {
      return {
        type: 'coordination',
        agentId: 'team',
        description: 'Team cohesion is low - limited shared understanding',
        confidence: 0.8,
        implications: [
          'Schedule team alignment meeting',
          'Clarify shared goals and values',
          'Improve communication channels',
          `Only ${(cohesionScore * 100).toFixed(0)}% belief alignment`,
        ],
      };
    } else if (cohesionScore > 0.8) {
      return {
        type: 'coordination',
        agentId: 'team',
        description: 'Team shows strong cohesion and shared understanding',
        confidence: 0.9,
        implications: [
          'Team is well-aligned on goals',
          'Continue current communication practices',
          `${(cohesionScore * 100).toFixed(0)}% belief alignment`,
        ],
      };
    }

    return null;
  }

  // Identify potential conflicts based on contradicting beliefs or goals
  private async identifyPotentialConflicts(
    mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight[]> {
    const insights: ToMInsight[] = [];
    const agents = Array.from(mentalStates.keys());

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const agentA = agents[i];
        const agentB = agents[j];
        const stateA = mentalStates.get(agentA)!;
        const stateB = mentalStates.get(agentB)!;

        // Check for conflicting goals
        const conflictingGoals = this.findConflictingGoals(stateA, stateB);
        if (conflictingGoals.length > 0) {
          insights.push({
            type: 'belief_attribution',
            agentId: `${agentA}_${agentB}`,
            description: `Potential goal conflict between ${agentA} and ${agentB}`,
            confidence: 0.7,
            implications: [
              `Conflicting goals: ${conflictingGoals[0].description}`,
              'Schedule mediation session',
              'Align on priorities',
              'Consider resource reallocation',
            ],
          });
        }

        // Check for trust issues
        const trust = this.getTrustLevel(agentB);
        if (trust < 0.3) {
          insights.push({
            type: 'trust_change',
            agentId: agentB,
            description: `Low trust level with ${agentB} may impact collaboration`,
            confidence: 0.8,
            implications: [
              'Focus on trust-building activities',
              'Increase transparency in communications',
              'Assign collaborative tasks to rebuild trust',
            ],
          });
        }
      }
    }

    return insights;
  }

  // Assess team motivation based on goal progress and emotional states
  private async assessTeamMotivation(
    mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight[]> {
    const insights: ToMInsight[] = [];

    for (const [agentId, state] of mentalStates) {
      // Check goal progress
      const activeGoals = Array.from(state.desires.values())
        .filter(d => d.priority > 0.5);

      const avgProgress = activeGoals.length > 0
        ? activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length
        : 0;

      // Check emotional state
      const emotionalValence = state.emotions?.valence || 0;

      // Low progress and negative emotion indicates low motivation
      if (avgProgress < 0.3 && emotionalValence < -0.2) {
        insights.push({
          type: 'empathy',
          agentId,
          description: `${agentId} appears demotivated - low progress and negative emotional state`,
          confidence: 0.75,
          implications: [
            'Provide additional support or resources',
            'Break down goals into smaller, achievable tasks',
            'Schedule one-on-one to understand challenges',
            'Consider workload redistribution',
          ],
        });
      }

      // High progress but negative emotion might indicate burnout
      if (avgProgress > 0.7 && emotionalValence < -0.3) {
        insights.push({
          type: 'empathy',
          agentId,
          description: `${agentId} may be experiencing burnout despite high productivity`,
          confidence: 0.7,
          implications: [
            'Check workload and work-life balance',
            'Recognize achievements publicly',
            'Encourage taking breaks',
            'Assess if goals are too demanding',
          ],
        });
      }
    }

    return insights;
  }

  // Identify collaboration opportunities based on complementary skills
  private async identifyCollaborationOpportunities(
    mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight[]> {
    const insights: ToMInsight[] = [];
    const agents = Array.from(mentalStates.entries());

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const [agentA, stateA] = agents[i];
        const [agentB, stateB] = agents[j];

        // Check for complementary goals
        const complementaryGoals = this.findComplementaryGoals(stateA, stateB);
        if (complementaryGoals.length > 0) {
          insights.push({
            type: 'coordination',
            agentId: `${agentA}_${agentB}`,
            description: `${agentA} and ${agentB} have complementary goals - collaboration opportunity`,
            confidence: 0.8,
            implications: [
              `Shared interest in: ${complementaryGoals[0]}`,
              'Assign joint tasks',
              'Facilitate knowledge sharing',
              'Create cross-functional initiatives',
            ],
          });
        }

        // Check for skill complementarity based on intentions
        const complementarySkills = this.identifyComplementarySkills(stateA, stateB);
        if (complementarySkills) {
          insights.push({
            type: 'coordination',
            agentId: `${agentA}_${agentB}`,
            description: `${agentA} and ${agentB} have complementary skills`,
            confidence: 0.7,
            implications: [
              'Pair for complex projects',
              'Enable skill transfer through collaboration',
              'Leverage diverse perspectives',
            ],
          });
        }
      }
    }

    return insights;
  }

  // Analyze communication effectiveness
  private async analyzeCommunicationEffectiveness(
    data: any,
    mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight[]> {
    const insights: ToMInsight[] = [];

    if (!data.communications) {return insights;}

    // Analyze message patterns
    const messagePatterns = this.analyzeMessagePatterns(data.communications);

    // Check for communication imbalances
    if (messagePatterns.imbalance > 0.6) {
      insights.push({
        type: 'coordination',
        agentId: 'team',
        description: 'Communication imbalance detected - some team members dominate discussions',
        confidence: 0.8,
        implications: [
          'Encourage quieter team members to share views',
          'Implement structured communication protocols',
          'Use round-robin in meetings',
          `${messagePatterns.dominantSpeaker} speaks ${(messagePatterns.imbalance * 100).toFixed(0)}% of the time`,
        ],
      });
    }

    // Check for miscommunications
    const miscommunications = await this.detectMiscommunications(data.communications, mentalStates);
    if (miscommunications.length > 0) {
      insights.push({
        type: 'belief_attribution',
        agentId: miscommunications[0].between.join('_'),
        description: 'Potential miscommunication detected',
        confidence: 0.7,
        implications: [
          'Clarify terminology and expectations',
          'Use visual aids for complex concepts',
          'Implement feedback loops',
          `Misalignment on: ${miscommunications[0].topic}`,
        ],
      });
    }

    return insights;
  }

  // Helper methods

  private countTotalBeliefs(mentalStates: Map<string, MentalState>): number {
    let total = 0;
    for (const state of mentalStates.values()) {
      total += state.beliefs.size;
    }
    return total;
  }

  private findConflictingGoals(stateA: MentalState, stateB: MentalState): any[] {
    const conflicts = [];

    for (const desireA of stateA.desires.values()) {
      for (const desireB of stateB.desires.values()) {
        if (this.goalsConflict(desireA, desireB)) {
          conflicts.push({
            description: `${desireA.goal} vs ${desireB.goal}`,
            agentA: stateA.agentId,
            agentB: stateB.agentId,
          });
        }
      }
    }

    return conflicts;
  }

  private goalsConflict(desireA: Desire, desireB: Desire): boolean {
    // Simple conflict detection - check for resource conflicts
    const resourcesA = desireA.constraints
      .filter(c => c.type === 'resource')
      .map(c => c.value);
    const resourcesB = desireB.constraints
      .filter(c => c.type === 'resource')
      .map(c => c.value);

    // Check for shared resources
    return resourcesA.some(r => resourcesB.includes(r));
  }

  private findComplementaryGoals(stateA: MentalState, stateB: MentalState): string[] {
    const complementary = [];

    for (const desireA of stateA.desires.values()) {
      for (const desireB of stateB.desires.values()) {
        if (this.goalsComplement(desireA, desireB)) {
          complementary.push(`${desireA.goal} + ${desireB.goal}`);
        }
      }
    }

    return complementary;
  }

  private goalsComplement(desireA: Desire, desireB: Desire): boolean {
    // Check if goals are related but not conflicting
    const keywordsA = desireA.goal.toLowerCase().split(' ');
    const keywordsB = desireB.goal.toLowerCase().split(' ');

    const sharedKeywords = keywordsA.filter(k => keywordsB.includes(k));
    return sharedKeywords.length > 0 && !this.goalsConflict(desireA, desireB);
  }

  private identifyComplementarySkills(stateA: MentalState, stateB: MentalState): boolean {
    const skillsA = this.extractSkillsFromIntentions(stateA);
    const skillsB = this.extractSkillsFromIntentions(stateB);

    // Check if they have different but related skills
    const overlap = skillsA.filter(s => skillsB.includes(s));
    const different = skillsA.length + skillsB.length - 2 * overlap.length;

    return overlap.length > 0 && different > 0;
  }

  private extractSkillsFromIntentions(state: MentalState): string[] {
    const skills = [];

    for (const intention of state.intentions.values()) {
      // Extract skill from action type
      if (intention.action.includes('analyze')) {skills.push('analytical');}
      if (intention.action.includes('create')) {skills.push('creative');}
      if (intention.action.includes('coordinate')) {skills.push('leadership');}
      if (intention.action.includes('implement')) {skills.push('execution');}
    }

    return [...new Set(skills)];
  }

  private analyzeMessagePatterns(communications: any[]): any {
    const senderCounts = new Map<string, number>();

    for (const comm of communications) {
      const sender = comm.sender || 'unknown';
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
    }

    const total = communications.length;
    let maxCount = 0;
    let dominantSpeaker = '';

    for (const [sender, count] of senderCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantSpeaker = sender;
      }
    }

    return {
      imbalance: total > 0 ? maxCount / total : 0,
      dominantSpeaker,
      participation: senderCounts,
    };
  }

  private async detectMiscommunications(
    communications: any[],
    mentalStates: Map<string, MentalState>,
  ): Promise<any[]> {
    const miscommunications = [];

    // Look for messages followed by confusion indicators
    for (let i = 0; i < communications.length - 1; i++) {
      const message = communications[i];
      const response = communications[i + 1];

      if (this.indicatesConfusion(response)) {
        miscommunications.push({
          between: [message.sender, response.sender],
          topic: message.content,
          timestamp: message.timestamp,
        });
      }
    }

    return miscommunications;
  }

  private indicatesConfusion(message: any): boolean {
    const confusionIndicators = ['clarify', 'confused', "don't understand",
                                 'what do you mean', 'could you explain', '?'];
    const content = message.content?.toLowerCase() || '';

    return confusionIndicators.some(indicator => content.includes(indicator));
  }

  // Override process to handle team management scenarios
  async process(data: any, context?: any): Promise<TheoryOfMindProcessingResult> {
    // Add team context if managing a team
    if (data.manageTeam || data.teamInteraction) {
      data.requireMultiAgentCoordination = true;

      // Ensure we model all team members
      if (data.team) {
        data.agents = data.team.members || data.team;
      }
    }

    const result = await super.process(data, context);

    // Add management-specific processing
    if (result.theoryOfMind && data.managementDecision) {
      const decision = await this.makeManagementDecision(
        data.managementDecision,
        result.theoryOfMind.otherAgentStates,
      );

      result.insights = result.insights || [];
      result.insights.push(this.createInsight(
        'management_decision',
        'high',
        'Management Decision',
        decision.description,
        null,
        decision,
      ));
    }

    return result;
  }

  // Make management decisions based on team mental states
  private async makeManagementDecision(
    decisionType: string,
    teamStates: Map<string, MentalState>,
  ): Promise<any> {
    switch (decisionType) {
      case 'task_assignment':
        return this.optimizeTaskAssignment(teamStates);

      case 'conflict_resolution':
        return this.proposeConflictResolution(teamStates);

      case 'team_building':
        return this.suggestTeamBuildingActivities(teamStates);

      default:
        return {
          description: 'Continue monitoring team dynamics',
          actions: ['Regular check-ins', 'Maintain open communication'],
        };
    }
  }

  private optimizeTaskAssignment(teamStates: Map<string, MentalState>): any {
    const assignments = [];

    for (const [agentId, state] of teamStates) {
      // Assign based on current workload and interests
      const workload = Array.from(state.intentions.values())
        .filter(i => i.commitment > 0.5).length;

      const capacity = 1 - (workload / 5); // Assume max 5 concurrent tasks

      if (capacity > 0.3) {
        assignments.push({
          agent: agentId,
          capacity,
          suggestedTasks: this.matchTasksToAgent(state),
        });
      }
    }

    return {
      description: 'Optimized task assignments based on capacity and interests',
      assignments,
      actions: ['Communicate new assignments', 'Set clear expectations'],
    };
  }

  private proposeConflictResolution(teamStates: Map<string, MentalState>): any {
    return {
      description: 'Conflict resolution strategy',
      actions: [
        'Schedule mediation meeting',
        'Identify common ground',
        'Clarify miscommunications',
        'Establish shared goals',
        'Define clear boundaries',
      ],
    };
  }

  private suggestTeamBuildingActivities(teamStates: Map<string, MentalState>): any {
    const activities = [];

    // Check overall team emotional state
    let avgValence = 0;
    let count = 0;

    for (const state of teamStates.values()) {
      if (state.emotions) {
        avgValence += state.emotions.valence;
        count++;
      }
    }

    avgValence = count > 0 ? avgValence / count : 0;

    if (avgValence < 0) {
      activities.push('Stress-relief activities (meditation, team lunch)');
      activities.push('Success celebration session');
    }

    activities.push('Collaborative problem-solving workshop');
    activities.push('Skill-sharing sessions');
    activities.push('Team retrospective');

    return {
      description: 'Team building recommendations',
      activities,
      priority: avgValence < -0.3 ? 'high' : 'medium',
    };
  }

  private matchTasksToAgent(state: MentalState): string[] {
    const tasks = [];

    // Match based on desires and skills
    for (const desire of state.desires.values()) {
      if (desire.priority > 0.6 && desire.type === 'achievement') {
        tasks.push(`Tasks related to: ${desire.goal}`);
      }
    }

    return tasks;
  }
}

interface TeamMemberProfile {
  agentId: string;
  role: string;
  strengths: string[];
  workStyle: string;
  communicationPreference: string;
}

interface CommunicationStyle {
  directness: number; // 0-1
  formality: number; // 0-1
  responsiveness: number; // 0-1
  detailLevel: number; // 0-1
}