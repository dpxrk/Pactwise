/**
 * Distributed Consensus Mechanisms
 *
 * Advanced consensus algorithms for swarm decision-making,
 * enabling fault-tolerant collective intelligence.
 */

import {
  SwarmIntelligence,
  SwarmAgent,
  ConsensusState,
  ConsensusAlgorithm,
  Proposal,
  Vote,
  Position,
  SwarmMessage,
} from './types.ts';

/**
 * Base consensus mechanism
 */
export abstract class ConsensusMechanism {
  protected consensusState: ConsensusState;
  protected quorumSize: number;
  protected faultTolerance: number;

  constructor(
    algorithm: ConsensusAlgorithm,
    swarmSize: number,
    faultTolerance: number = 0.33,
  ) {
    this.consensusState = {
      algorithm,
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    };

    this.faultTolerance = faultTolerance;
    this.quorumSize = Math.floor(swarmSize * (1 - faultTolerance)) + 1;
  }

  /**
   * Execute consensus round
   */
  abstract executeRound(
    swarm: SwarmIntelligence,
    proposals: Proposal[]
  ): Promise<ConsensusState>;

  /**
   * Submit a proposal to the consensus mechanism
   */
  async propose(
    proposal: Proposal,
    agents: Map<string, SwarmAgent>,
    state: ConsensusState
  ): Promise<ConsensusState> {
    // Add proposal to state
    state.proposals.push(proposal);
    state.status = 'voting';
    state.rounds = (state.rounds || 0) + 1;
    
    // Broadcast proposal to agents
    for (const agent of agents.values()) {
      if (agent.propose) {
        agent.propose(proposal);
      }
    }
    
    return state;
  }

  /**
   * Process a vote from an agent
   */
  async vote(
    vote: Vote,
    state: ConsensusState
  ): Promise<ConsensusState> {
    const proposalVotes = state.votes.get(vote.proposalId) || [];
    proposalVotes.push(vote);
    state.votes.set(vote.proposalId, proposalVotes);
    
    // Update proposal support
    const proposal = state.proposals.find(p => p.id === vote.proposalId);
    if (proposal) {
      const totalVotes = proposalVotes.reduce((sum, v) => sum + v.value, 0);
      proposal.support = totalVotes / proposalVotes.length;
    }
    
    return state;
  }

  /**
   * Check if consensus reached
   */
  hasConsensus(): boolean {
    return this.consensusState.agreement >= (1 - this.faultTolerance);
  }

  /**
   * Get winning proposal
   */
  getWinningProposal(): Proposal | null {
    let best: Proposal | null = null;
    let maxSupport = 0;

    for (const proposal of this.consensusState.proposals) {
      if (proposal.support > maxSupport) {
        maxSupport = proposal.support;
        best = proposal;
      }
    }

    return best;
  }

  /**
   * Calculate agreement level
   */
  protected calculateAgreement(swarmSize: number): number {
    const winningProposal = this.getWinningProposal();
    if (!winningProposal) {return 0;}

    return winningProposal.support / swarmSize;
  }

  /**
   * Broadcast proposal to all agents
   */
  protected broadcastProposal(
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): void {
    const message: SwarmMessage = {
      id: `consensus-proposal-${proposal.id}`,
      type: 'consensus',
      senderId: proposal.proposerId,
      recipientIds: 'broadcast',
      content: {
        topic: 'proposal',
        data: proposal,
        confidence: proposal.fitness,
        evidence: [],
      },
      priority: proposal.fitness,
      ttl: 10,
      hops: 0,
      timestamp: Date.now(),
    };

    // Add to each agent's message queue
    for (const agent of swarm.agents.values()) {
      agent.messages.push(message);
    }
  }

  /**
   * Collect votes from agents
   */
  protected collectVotes(
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): Vote[] {
    const votes: Vote[] = [];

    for (const agent of swarm.agents.values()) {
      // Agent evaluates proposal
      const evaluation = this.evaluateProposal(agent, proposal, swarm);

      if (evaluation.support > 0.5) {
        const vote: Vote = {
          voterId: agent.id,
          proposalId: proposal.id,
          value: evaluation.support,
          confidence: evaluation.confidence,
          timestamp: Date.now(),
        };

        votes.push(vote);
      }
    }

    return votes;
  }

  /**
   * Evaluate proposal from agent's perspective
   */
  protected evaluateProposal(
    agent: SwarmAgent,
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): { support: number; confidence: number } {
    // Distance-based evaluation
    const proposalPos = (proposal.content as any).position;
    if (!proposalPos) {
      return { support: 0.5, confidence: 0.5 };
    }

    const distance = this.calculateDistance(agent.position, proposalPos);
    const maxDistance = Math.sqrt(swarm.problem.dimensions); // Normalized
    const proximity = 1 - (distance / maxDistance);

    // Fitness-based evaluation
    const fitnessRatio = proposal.fitness / (agent.fitness + 0.001);

    // Combined evaluation
    const support = (proximity * 0.3 + Math.min(fitnessRatio, 2) * 0.7);
    const confidence = agent.fitness * agent.state.influence;

    return { support: Math.max(0, Math.min(1, support)), confidence };
  }

  protected calculateDistance(pos1: Position, pos2: Position): number {
    let sum = 0;
    for (let i = 0; i < pos1.dimensions.length; i++) {
      const diff = pos1.dimensions[i] - pos2.dimensions[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}

/**
 * Byzantine Fault Tolerant Consensus
 *
 * Handles malicious or faulty agents
 */
export class ByzantineConsensus extends ConsensusMechanism {
  private byzantineAgents: Set<string> = new Set();
  private verificationRounds: number = 3;

  constructor(swarmSize: number) {
    // Byzantine requires at most 1/3 faulty nodes
    super('byzantine', swarmSize, 1 / 3);
  }

  async executeRound(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<ConsensusState> {
    this.consensusState.rounds++;
    this.consensusState.proposals = proposals;

    // Phase 1: Proposal broadcast with signatures
    for (const proposal of proposals) {
      this.broadcastSignedProposal(proposal, swarm);
    }

    // Phase 2: Echo phase - agents echo received proposals
    const echoVotes = await this.echoPhase(swarm, proposals);

    // Phase 3: Ready phase - agents indicate readiness
    const readyVotes = await this.readyPhase(swarm, proposals, echoVotes);

    // Phase 4: Commit phase - final commitment
    const commitVotes = await this.commitPhase(swarm, proposals, readyVotes);

    // Update consensus state
    this.updateConsensusState(swarm, commitVotes);

    return this.consensusState;
  }

  /**
   * Broadcast proposal with cryptographic signature
   */
  private broadcastSignedProposal(
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): void {
    const signedProposal = {
      ...proposal,
      signature: this.generateSignature(proposal),
      timestamp: Date.now(),
    };

    this.broadcastProposal(signedProposal as Proposal, swarm);
  }

  /**
   * Echo phase - agents echo valid proposals
   */
  private async echoPhase(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<Map<string, Map<string, Vote>>> {
    const echoVotes = new Map<string, Map<string, Vote>>();

    for (const proposal of proposals) {
      const proposalEchoes = new Map<string, Vote>();

      for (const agent of swarm.agents.values()) {
        // Skip Byzantine agents
        if (this.byzantineAgents.has(agent.id)) {continue;}

        // Verify proposal validity
        if (this.verifyProposal(proposal, agent)) {
          const echo: Vote = {
            voterId: agent.id,
            proposalId: proposal.id,
            value: 1,
            confidence: agent.state.influence,
            timestamp: Date.now(),
          };

          proposalEchoes.set(agent.id, echo);

          // Broadcast echo to neighbors
          this.broadcastEcho(agent, proposal, swarm);
        }
      }

      echoVotes.set(proposal.id, proposalEchoes);
    }

    return echoVotes;
  }

  /**
   * Ready phase - indicate readiness after receiving echoes
   */
  private async readyPhase(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
    echoVotes: Map<string, Map<string, Vote>>,
  ): Promise<Map<string, Map<string, Vote>>> {
    const readyVotes = new Map<string, Map<string, Vote>>();

    for (const proposal of proposals) {
      const echoes = echoVotes.get(proposal.id) || new Map();
      const proposalReady = new Map<string, Vote>();

      // Check if received enough echoes
      if (echoes.size >= this.quorumSize) {
        for (const agent of swarm.agents.values()) {
          if (this.byzantineAgents.has(agent.id)) {continue;}

          const ready: Vote = {
            voterId: agent.id,
            proposalId: proposal.id,
            value: 1,
            confidence: agent.state.influence * 0.9,
            timestamp: Date.now(),
          };

          proposalReady.set(agent.id, ready);
        }
      }

      readyVotes.set(proposal.id, proposalReady);
    }

    return readyVotes;
  }

  /**
   * Commit phase - final commitment
   */
  private async commitPhase(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
    readyVotes: Map<string, Map<string, Vote>>,
  ): Promise<Map<string, Vote[]>> {
    const commitVotes = new Map<string, Vote[]>();

    for (const proposal of proposals) {
      const ready = readyVotes.get(proposal.id) || new Map();
      const commits: Vote[] = [];

      // Commit if received enough ready messages
      if (ready.size >= this.quorumSize) {
        for (const agent of swarm.agents.values()) {
          if (this.byzantineAgents.has(agent.id)) {continue;}

          const commit: Vote = {
            voterId: agent.id,
            proposalId: proposal.id,
            value: 1,
            confidence: agent.state.influence * 0.95,
            timestamp: Date.now(),
          };

          commits.push(commit);
        }

        proposal.support = commits.length;
      }

      commitVotes.set(proposal.id, commits);
    }

    return commitVotes;
  }

  /**
   * Update consensus state after voting
   */
  private updateConsensusState(
    swarm: SwarmIntelligence,
    commitVotes: Map<string, Vote[]>,
  ): void {
    // Store votes
    this.consensusState.votes = commitVotes;

    // Calculate agreement
    let maxSupport = 0;
    for (const [proposalId, votes] of commitVotes) {
      const proposal = this.consensusState.proposals.find(p => p.id === proposalId);
      if (proposal) {
        proposal.support = votes.length;
        maxSupport = Math.max(maxSupport, proposal.support);
      }
    }

    this.consensusState.agreement = maxSupport / swarm.agents.size;

    // Identify dissenters
    const voters = new Set<string>();
    for (const votes of commitVotes.values()) {
      for (const vote of votes) {
        voters.add(vote.voterId);
      }
    }

    this.consensusState.dissenters = Array.from(swarm.agents.keys())
      .filter(id => !voters.has(id) && !this.byzantineAgents.has(id));

    // Update stability
    this.consensusState.stability =
      1 - (this.byzantineAgents.size / swarm.agents.size);
  }

  /**
   * Detect Byzantine agents
   */
  detectByzantineAgents(swarm: SwarmIntelligence): void {
    // Detect agents with inconsistent behavior
    for (const agent of swarm.agents.values()) {
      const inconsistencies = this.checkInconsistencies(agent, swarm);

      if (inconsistencies > this.verificationRounds) {
        this.byzantineAgents.add(agent.id);
      }
    }
  }

  /**
   * Check agent inconsistencies
   */
  private checkInconsistencies(
    agent: SwarmAgent,
    _swarm: SwarmIntelligence,
  ): number {
    let inconsistencies = 0;

    // Check for conflicting votes
    const agentVotes: Vote[] = [];
    for (const votes of this.consensusState.votes.values()) {
      agentVotes.push(...votes.filter(v => v.voterId === agent.id));
    }

    // Check for multiple votes on different proposals
    const proposalVotes = new Set<string>();
    for (const vote of agentVotes) {
      if (proposalVotes.has(vote.proposalId)) {
        inconsistencies++;
      }
      proposalVotes.add(vote.proposalId);
    }

    // Check for impossible positions
    if (agent.position.dimensions.some(d => !isFinite(d))) {
      inconsistencies++;
    }

    // Check for suspicious message patterns
    const messageRate = agent.messages.length / (Date.now() - agent.position.timestamp);
    if (messageRate > 100) { // Excessive messaging
      inconsistencies++;
    }

    return inconsistencies;
  }

  private generateSignature(proposal: Proposal): string {
    // Simplified signature generation
    return `sig-${proposal.id}-${proposal.proposerId}-${Date.now()}`;
  }

  private verifyProposal(proposal: Proposal, agent: SwarmAgent): boolean {
    // Verify proposal is valid from agent's perspective
    const evaluation = this.evaluateProposal(agent, proposal, {} as SwarmIntelligence);
    return evaluation.support > 0.3; // Lower threshold for Byzantine
  }

  private broadcastEcho(
    agent: SwarmAgent,
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): void {
    const message: SwarmMessage = {
      id: `echo-${proposal.id}-${agent.id}`,
      type: 'consensus',
      senderId: agent.id,
      recipientIds: agent.neighbors,
      content: {
        topic: 'echo',
        data: { proposalId: proposal.id, support: true },
        confidence: agent.state.influence,
        evidence: [],
      },
      priority: 0.8,
      ttl: 3,
      hops: 0,
      timestamp: Date.now(),
    };

    // Send to neighbors
    for (const neighborId of agent.neighbors) {
      const neighbor = swarm.agents.get(neighborId);
      if (neighbor) {
        neighbor.messages.push(message);
      }
    }
  }
}

/**
 * Raft Consensus
 *
 * Leader-based consensus for strong consistency
 */
export class RaftConsensus extends ConsensusMechanism {
  private currentTerm: number = 0;
  private leaderId: string | null = null;
  private votedFor: Map<number, string> = new Map();
  private electionTimeout: number = 150; // ms
  private lastHeartbeat: Map<string, number> = new Map();

  constructor(swarmSize: number) {
    super('raft', swarmSize, 0.5);
  }

  async executeRound(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<ConsensusState> {
    this.consensusState.rounds++;

    // Check for leader timeout
    if (this.needsElection(swarm)) {
      await this.conductElection(swarm);
    }

    // Leader processes proposals
    if (this.leaderId) {
      await this.leaderConsensus(swarm, proposals);
    }

    // Send heartbeats
    if (this.leaderId) {
      this.sendHeartbeats(swarm);
    }

    return this.consensusState;
  }

  /**
   * Check if election needed
   */
  private needsElection(_swarm: SwarmIntelligence): boolean {
    if (!this.leaderId) {return true;}

    const lastBeat = this.lastHeartbeat.get(this.leaderId) || 0;
    return Date.now() - lastBeat > this.electionTimeout;
  }

  /**
   * Conduct leader election
   */
  private async conductElection(swarm: SwarmIntelligence): Promise<void> {
    this.currentTerm++;

    // Find candidates (high-performing agents)
    const candidates = Array.from(swarm.agents.values())
      .filter(a => a.fitness > swarm.performance.solutionQuality * 0.8)
      .sort((a, b) => b.fitness - a.fitness);

    if (candidates.length === 0) {return;}

    // First candidate starts election
    const candidate = candidates[0];
    this.votedFor.set(this.currentTerm, candidate.id);

    // Request votes
    let votes = 1; // Self vote
    for (const agent of swarm.agents.values()) {
      if (agent.id === candidate.id) {continue;}

      const voteGranted = this.requestVote(agent, candidate, swarm);
      if (voteGranted) {
        votes++;
      }
    }

    // Check if won election
    if (votes > swarm.agents.size / 2) {
      this.leaderId = candidate.id;
      this.lastHeartbeat.set(this.leaderId, Date.now());

      // Notify all agents
      this.broadcastLeadership(candidate, swarm);
    }
  }

  /**
   * Request vote from agent
   */
  private requestVote(
    agent: SwarmAgent,
    candidate: SwarmAgent,
    _swarm: SwarmIntelligence,
  ): boolean {
    // Vote if candidate is better or haven't voted
    const alreadyVoted = this.votedFor.has(this.currentTerm);

    if (!alreadyVoted || this.votedFor.get(this.currentTerm) === candidate.id) {
      // Check if candidate is suitable
      if (candidate.fitness >= agent.fitness * 0.9) {
        this.votedFor.set(this.currentTerm, candidate.id);
        return true;
      }
    }

    return false;
  }

  /**
   * Leader-based consensus
   */
  private async leaderConsensus(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<void> {
    const leader = swarm.agents.get(this.leaderId!);
    if (!leader) {
      this.leaderId = null;
      return;
    }

    // Leader selects best proposal
    let bestProposal = proposals[0];
    for (const proposal of proposals) {
      if (proposal.fitness > bestProposal.fitness) {
        bestProposal = proposal;
      }
    }

    if (!bestProposal) {return;}

    // Leader appends to log and replicates
    this.consensusState.proposals = [bestProposal];

    // Collect acknowledgments
    let acks = 1; // Leader ack
    for (const agent of swarm.agents.values()) {
      if (agent.id === this.leaderId) {continue;}

      const ack = await this.replicateEntry(agent, bestProposal, swarm);
      if (ack) {
        acks++;
      }
    }

    // Commit if majority acknowledged
    if (acks > swarm.agents.size / 2) {
      bestProposal.support = acks;
      this.consensusState.agreement = acks / swarm.agents.size;

      // Notify commit
      this.broadcastCommit(bestProposal, swarm);
    }
  }

  /**
   * Replicate entry to follower
   */
  private async replicateEntry(
    follower: SwarmAgent,
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): Promise<boolean> {
    // Follower evaluates proposal
    const evaluation = this.evaluateProposal(follower, proposal, swarm);

    // Accept if reasonable
    return evaluation.support > 0.5;
  }

  /**
   * Send heartbeats to maintain leadership
   */
  private sendHeartbeats(swarm: SwarmIntelligence): void {
    const message: SwarmMessage = {
      id: `heartbeat-${this.currentTerm}-${Date.now()}`,
      type: 'heartbeat',
      senderId: this.leaderId!,
      recipientIds: 'broadcast',
      content: {
        topic: 'leader-heartbeat',
        data: { term: this.currentTerm, leaderId: this.leaderId },
        confidence: 1.0,
        evidence: [],
      },
      priority: 1.0,
      ttl: 1,
      hops: 0,
      timestamp: Date.now(),
    };

    for (const agent of swarm.agents.values()) {
      agent.messages.push(message);
    }

    this.lastHeartbeat.set(this.leaderId!, Date.now());
  }

  /**
   * Broadcast leadership announcement
   */
  private broadcastLeadership(leader: SwarmAgent, swarm: SwarmIntelligence): void {
    const message: SwarmMessage = {
      id: `leader-announce-${this.currentTerm}`,
      type: 'coordination',
      senderId: leader.id,
      recipientIds: 'broadcast',
      content: {
        topic: 'new-leader',
        data: {
          term: this.currentTerm,
          leaderId: leader.id,
          fitness: leader.fitness,
        },
        confidence: 1.0,
        evidence: [],
      },
      priority: 1.0,
      ttl: 5,
      hops: 0,
      timestamp: Date.now(),
    };

    for (const agent of swarm.agents.values()) {
      agent.messages.push(message);
    }
  }

  /**
   * Broadcast commit decision
   */
  private broadcastCommit(proposal: Proposal, swarm: SwarmIntelligence): void {
    const message: SwarmMessage = {
      id: `commit-${proposal.id}`,
      type: 'consensus',
      senderId: this.leaderId!,
      recipientIds: 'broadcast',
      content: {
        topic: 'commit-proposal',
        data: proposal,
        confidence: 1.0,
        evidence: [],
      },
      priority: 1.0,
      ttl: 10,
      hops: 0,
      timestamp: Date.now(),
    };

    for (const agent of swarm.agents.values()) {
      agent.messages.push(message);
    }
  }
}

/**
 * Honeybee Democracy Consensus
 *
 * Waggle dance inspired consensus
 */
export class HoneybeeDemocracy extends ConsensusMechanism {
  private danceFloor: Map<string, DancePerformance> = new Map();
  private scoutQuorum: number = 0.1; // 10% scouts
  private unanimityThreshold: number = 0.95;

  constructor(swarmSize: number) {
    super('honeybee', swarmSize, 0.2);
  }

  async executeRound(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<ConsensusState> {
    this.consensusState.rounds++;
    this.consensusState.proposals = proposals;

    // Phase 1: Scouts discover and evaluate options
    await this.scoutingPhase(swarm, proposals);

    // Phase 2: Waggle dance performances
    await this.dancingPhase(swarm);

    // Phase 3: Follower recruitment
    await this.recruitmentPhase(swarm);

    // Phase 4: Check for quorum
    const quorumReached = this.checkQuorum(swarm);

    // Phase 5: Prepare for takeoff (consensus)
    if (quorumReached) {
      await this.consensusPhase(swarm);
    }

    return this.consensusState;
  }

  /**
   * Scouting phase - discover options
   */
  private async scoutingPhase(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<void> {
    const scouts = Array.from(swarm.agents.values())
      .filter(a => a.type === 'scout' || a.state.activity === 'foraging');

    for (const scout of scouts) {
      // Evaluate proposals
      let bestProposal: Proposal | null = null;
      let bestEval = 0;

      for (const proposal of proposals) {
        const evaluation = this.evaluateProposal(scout, proposal, swarm);
        if (evaluation.support > bestEval) {
          bestEval = evaluation.support;
          bestProposal = proposal;
        }
      }

      // Start dancing for best proposal
      if (bestProposal && bestEval > 0.6) {
        this.startDancing(scout, bestProposal, bestEval);
      }
    }
  }

  /**
   * Dancing phase - communicate discoveries
   */
  private async dancingPhase(swarm: SwarmIntelligence): Promise<void> {
    // Update dance performances
    for (const [agentId, performance] of this.danceFloor) {
      const agent = swarm.agents.get(agentId);
      if (!agent) {continue;}

      // Dance duration based on quality
      performance.duration--;
      performance.intensity = performance.quality * (performance.duration / performance.maxDuration);

      // Stop dancing if exhausted
      if (performance.duration <= 0) {
        this.danceFloor.delete(agentId);
        agent.state.activity = 'following'; // Become follower
      }
    }
  }

  /**
   * Recruitment phase - followers join dances
   */
  private async recruitmentPhase(swarm: SwarmIntelligence): Promise<void> {
    const followers = Array.from(swarm.agents.values())
      .filter(a => a.state.activity === 'following' || a.state.activity === 'foraging');

    for (const follower of followers) {
      // Observe dances
      const observedDances = this.observeDances(follower, swarm);

      if (observedDances.length === 0) {continue;}

      // Choose dance to follow probabilistically
      const chosenDance = this.chooseDance(observedDances);

      if (chosenDance) {
        // Follow the dance
        follower.state.activity = 'following';

        // Update votes
        const proposal = this.consensusState.proposals.find(
          p => p.id === chosenDance.proposalId,
        );

        if (proposal) {
          const vote: Vote = {
            voterId: follower.id,
            proposalId: proposal.id,
            value: chosenDance.intensity,
            confidence: follower.state.influence,
            timestamp: Date.now(),
          };

          if (!this.consensusState.votes.has(proposal.id)) {
            this.consensusState.votes.set(proposal.id, []);
          }
          this.consensusState.votes.get(proposal.id)!.push(vote);

          proposal.support += chosenDance.intensity;
        }

        // Potentially become dancer
        if (Math.random() < chosenDance.intensity && follower.fitness > 0.7) {
          this.startDancing(follower, proposal!, chosenDance.quality * 0.9);
        }
      }
    }
  }

  /**
   * Check if quorum reached
   */
  private checkQuorum(swarm: SwarmIntelligence): boolean {
    // Count dancers for each proposal
    const proposalDancers = new Map<string, number>();

    for (const [_agentId, performance] of this.danceFloor) {
      const count = proposalDancers.get(performance.proposalId) || 0;
      proposalDancers.set(performance.proposalId, count + 1);
    }

    // Check if any proposal has quorum
    for (const [proposalId, count] of proposalDancers) {
      const ratio = count / swarm.agents.size;
      if (ratio >= this.scoutQuorum) {
        const proposal = this.consensusState.proposals.find(p => p.id === proposalId);
        if (proposal) {
          proposal.support = count;
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Consensus phase - prepare for action
   */
  private async consensusPhase(swarm: SwarmIntelligence): Promise<void> {
    // Find dominant proposal
    let bestProposal: Proposal | null = null;
    let maxDancers = 0;

    const proposalDancers = new Map<string, number>();
    for (const [_agentId, performance] of this.danceFloor) {
      const count = proposalDancers.get(performance.proposalId) || 0;
      proposalDancers.set(performance.proposalId, count + 1);
    }

    for (const [proposalId, count] of proposalDancers) {
      if (count > maxDancers) {
        maxDancers = count;
        bestProposal = this.consensusState.proposals.find(p => p.id === proposalId) || null;
      }
    }

    if (bestProposal) {
      // Check for near-unanimity
      const agreement = maxDancers / swarm.agents.size;
      this.consensusState.agreement = agreement;

      if (agreement >= this.unanimityThreshold) {
        // Full consensus achieved
        this.consensusState.stability = 1.0;

        // All agents commit
        for (const agent of swarm.agents.values()) {
          agent.state.activity = 'converging';
        }
      }
    }

    // Identify dissenters
    const committedAgents = new Set<string>();
    for (const votes of this.consensusState.votes.values()) {
      for (const vote of votes) {
        committedAgents.add(vote.voterId);
      }
    }

    this.consensusState.dissenters = Array.from(swarm.agents.keys())
      .filter(id => !committedAgents.has(id));
  }

  /**
   * Start waggle dance
   */
  private startDancing(
    agent: SwarmAgent,
    proposal: Proposal,
    quality: number,
  ): void {
    const maxDuration = Math.floor(quality * 100); // Quality determines duration

    const performance: DancePerformance = {
      agentId: agent.id,
      proposalId: proposal.id,
      quality,
      intensity: quality,
      duration: maxDuration,
      maxDuration,
      position: agent.position,
    };

    this.danceFloor.set(agent.id, performance);
    agent.state.activity = 'dancing';
  }

  /**
   * Observe nearby dances
   */
  private observeDances(
    observer: SwarmAgent,
    swarm: SwarmIntelligence,
  ): DancePerformance[] {
    const observed: DancePerformance[] = [];
    const observationRange = 0.3; // 30% of space

    for (const [dancerId, performance] of this.danceFloor) {
      const dancer = swarm.agents.get(dancerId);
      if (!dancer) {continue;}

      const distance = this.calculateDistance(observer.position, dancer.position);

      // Can observe if within range
      if (distance < observationRange) {
        observed.push(performance);
      }
    }

    return observed;
  }

  /**
   * Choose dance to follow
   */
  private chooseDance(dances: DancePerformance[]): DancePerformance | null {
    if (dances.length === 0) {return null;}

    // Weighted random selection based on intensity
    const totalIntensity = dances.reduce((sum, d) => sum + d.intensity, 0);
    const random = Math.random() * totalIntensity;

    let cumulative = 0;
    for (const dance of dances) {
      cumulative += dance.intensity;
      if (cumulative >= random) {
        return dance;
      }
    }

    return dances[0];
  }
}

/**
 * Liquid Democracy Consensus
 *
 * Delegative democracy with transitive voting
 */
export class LiquidDemocracy extends ConsensusMechanism {
  private delegations: Map<string, string> = new Map();
  private expertiseThreshold: number = 0.7;

  constructor(swarmSize: number) {
    super('liquid', swarmSize, 0.3);
  }

  async executeRound(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<ConsensusState> {
    this.consensusState.rounds++;
    this.consensusState.proposals = proposals;

    // Phase 1: Identify experts
    const experts = this.identifyExperts(swarm);

    // Phase 2: Establish delegations
    this.establishDelegations(swarm, experts);

    // Phase 3: Direct voting
    const directVotes = await this.directVoting(swarm, proposals);

    // Phase 4: Aggregate delegated votes
    const aggregatedVotes = this.aggregateDelegatedVotes(swarm, directVotes);

    // Phase 5: Calculate results
    this.calculateResults(swarm, aggregatedVotes);

    return this.consensusState;
  }

  /**
   * Identify domain experts
   */
  private identifyExperts(swarm: SwarmIntelligence): Map<string, number> {
    const experts = new Map<string, number>();

    for (const agent of swarm.agents.values()) {
      // Expertise based on performance and consistency
      const expertise = this.calculateExpertise(agent, swarm);

      if (expertise > this.expertiseThreshold) {
        experts.set(agent.id, expertise);
      }
    }

    return experts;
  }

  /**
   * Calculate agent expertise
   */
  private calculateExpertise(
    agent: SwarmAgent,
    swarm: SwarmIntelligence,
  ): number {
    // Performance component
    const performance = agent.fitness / (swarm.performance.solutionQuality + 0.001);

    // Consistency component
    const consistency = agent.memory.bestFitness > 0 ?
      agent.fitness / agent.memory.bestFitness : 0;

    // Knowledge component
    const knowledge = Math.min(1, agent.state.knowledge.length / 10);

    // Influence component
    const { influence } = agent.state;

    return (performance * 0.4 + consistency * 0.3 + knowledge * 0.2 + influence * 0.1);
  }

  /**
   * Establish delegation chains
   */
  private establishDelegations(
    swarm: SwarmIntelligence,
    experts: Map<string, number>,
  ): void {
    this.delegations.clear();

    for (const agent of swarm.agents.values()) {
      // Skip if already an expert
      if (experts.has(agent.id)) {continue;}

      // Find best expert to delegate to
      let bestExpert: string | null = null;
      let bestScore = 0;

      for (const [expertId, expertise] of experts) {
        const expert = swarm.agents.get(expertId)!;

        // Consider expertise and proximity
        const distance = this.calculateDistance(agent.position, expert.position);
        const score = expertise / (1 + distance);

        if (score > bestScore) {
          bestScore = score;
          bestExpert = expertId;
        }
      }

      // Establish delegation
      if (bestExpert && bestScore > 0.3) {
        this.delegations.set(agent.id, bestExpert);
      }
    }
  }

  /**
   * Direct voting phase
   */
  private async directVoting(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<Map<string, Map<string, Vote>>> {
    const votes = new Map<string, Map<string, Vote>>();

    for (const proposal of proposals) {
      const proposalVotes = new Map<string, Vote>();

      for (const agent of swarm.agents.values()) {
        // Check if wants to vote directly
        const votesDirect = !this.delegations.has(agent.id) ||
                          Math.random() < agent.state.commitment;

        if (votesDirect) {
          const evaluation = this.evaluateProposal(agent, proposal, swarm);

          if (evaluation.support > 0.5) {
            const vote: Vote = {
              voterId: agent.id,
              proposalId: proposal.id,
              value: evaluation.support,
              confidence: evaluation.confidence,
              timestamp: Date.now(),
            };

            proposalVotes.set(agent.id, vote);
          }
        }
      }

      votes.set(proposal.id, proposalVotes);
    }

    return votes;
  }

  /**
   * Aggregate votes with delegations
   */
  private aggregateDelegatedVotes(
    swarm: SwarmIntelligence,
    directVotes: Map<string, Map<string, Vote>>,
  ): Map<string, number> {
    const aggregated = new Map<string, number>();

    for (const [proposalId, votes] of directVotes) {
      let totalWeight = 0;

      // Calculate voting weight for each agent
      const votingWeights = this.calculateVotingWeights(swarm);

      // Apply weights to votes
      for (const [voterId, vote] of votes) {
        const weight = votingWeights.get(voterId) || 1;
        totalWeight += vote.value * weight;
      }

      aggregated.set(proposalId, totalWeight);
    }

    return aggregated;
  }

  /**
   * Calculate voting weights with delegations
   */
  private calculateVotingWeights(swarm: SwarmIntelligence): Map<string, number> {
    const weights = new Map<string, number>();

    // Initialize weights
    for (const agent of swarm.agents.values()) {
      weights.set(agent.id, 1);
    }

    // Add delegated weights
    for (const [delegator, delegate] of this.delegations) {
      const delegatorWeight = weights.get(delegator) || 1;
      const currentDelegateWeight = weights.get(delegate) || 1;

      // Transfer weight with decay
      const transferRate = 0.9; // 10% delegation tax
      weights.set(delegate, currentDelegateWeight + delegatorWeight * transferRate);
      weights.set(delegator, delegatorWeight * (1 - transferRate));
    }

    return weights;
  }

  /**
   * Calculate final results
   */
  private calculateResults(
    swarm: SwarmIntelligence,
    aggregatedVotes: Map<string, number>,
  ): void {
    let totalVotes = 0;
    let maxVotes = 0;
    let winningProposal: Proposal | null = null;

    for (const [proposalId, votes] of aggregatedVotes) {
      totalVotes += votes;

      const proposal = this.consensusState.proposals.find(p => p.id === proposalId);
      if (proposal) {
        proposal.support = votes;

        if (votes > maxVotes) {
          maxVotes = votes;
          winningProposal = proposal;
        }
      }
    }

    // Update consensus state
    if (winningProposal && totalVotes > 0) {
      this.consensusState.agreement = maxVotes / swarm.agents.size;
      this.consensusState.stability = 1 - (this.delegations.size / swarm.agents.size);
    }

    // Store aggregated votes
    for (const [proposalId, weight] of aggregatedVotes) {
      const aggregatedVote: Vote = {
        voterId: 'aggregated',
        proposalId,
        value: weight,
        confidence: 1.0,
        timestamp: Date.now(),
      };

      if (!this.consensusState.votes.has(proposalId)) {
        this.consensusState.votes.set(proposalId, []);
      }
      this.consensusState.votes.get(proposalId)!.push(aggregatedVote);
    }
  }
}

/**
 * Proof of Work Consensus
 *
 * Computational effort based consensus
 */
export class ProofOfWorkConsensus extends ConsensusMechanism {
  private difficulty: number = 4; // Number of leading zeros required
  private miningReward: number = 0.1;
  private blockchain: Block[] = [];

  constructor(swarmSize: number) {
    super('proof-of-work', swarmSize, 0.5);
  }

  async executeRound(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<ConsensusState> {
    this.consensusState.rounds++;
    this.consensusState.proposals = proposals;

    // Phase 1: Mining competition
    const miningResults = await this.miningPhase(swarm, proposals);

    // Phase 2: Block validation
    const validBlocks = this.validateBlocks(miningResults);

    // Phase 3: Chain selection
    const winningBlock = this.selectWinningBlock(validBlocks);

    // Phase 4: Update consensus
    if (winningBlock) {
      this.updateBlockchain(winningBlock);
      this.distributeRewards(swarm, winningBlock);
    }

    return this.consensusState;
  }

  /**
   * Mining phase - agents compete to find valid hash
   */
  private async miningPhase(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<Map<string, Block>> {
    const results = new Map<string, Block>();

    for (const agent of swarm.agents.values()) {
      // Only mine if have sufficient energy
      if (agent.state.energy < 0.3) {continue;}

      // Select proposal to mine
      const proposal = this.selectProposalToMine(agent, proposals);
      if (!proposal) {continue;}

      // Attempt mining
      const block = await this.mine(agent, proposal);

      if (block) {
        results.set(agent.id, block);

        // Deplete energy from mining
        agent.state.energy *= 0.7;
      }
    }

    return results;
  }

  /**
   * Mine a block
   */
  private async mine(
    agent: SwarmAgent,
    proposal: Proposal,
  ): Promise<Block | null> {
    const maxAttempts = 1000; // Limit computation
    let nonce = 0;

    const previousHash = this.blockchain.length > 0 ?
      this.blockchain[this.blockchain.length - 1].hash : '0';

    for (let i = 0; i < maxAttempts; i++) {
      nonce = Math.floor(Math.random() * 1000000);

      const block: Block = {
        index: this.blockchain.length,
        timestamp: Date.now(),
        data: proposal,
        previousHash,
        nonce,
        hash: '',
        minerId: agent.id,
      };

      block.hash = this.calculateHash(block);

      // Check if valid
      if (this.isValidHash(block.hash)) {
        return block;
      }
    }

    return null;
  }

  /**
   * Calculate block hash
   */
  private calculateHash(block: Block): string {
    const data = `${block.index}${block.timestamp}${JSON.stringify(block.data)}${block.previousHash}${block.nonce}`;

    // Simplified hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Check if hash meets difficulty
   */
  private isValidHash(hash: string): boolean {
    const prefix = '0'.repeat(this.difficulty);
    return hash.startsWith(prefix);
  }

  /**
   * Validate mined blocks
   */
  private validateBlocks(blocks: Map<string, Block>): Block[] {
    const valid: Block[] = [];

    for (const [_minerId, block] of blocks) {
      // Verify hash
      const calculatedHash = this.calculateHash(block);
      if (calculatedHash !== block.hash) {continue;}

      // Verify difficulty
      if (!this.isValidHash(block.hash)) {continue;}

      // Verify chain continuity
      if (this.blockchain.length > 0) {
        const lastBlock = this.blockchain[this.blockchain.length - 1];
        if (block.previousHash !== lastBlock.hash) {continue;}
      }

      valid.push(block);
    }

    return valid;
  }

  /**
   * Select winning block (first valid)
   */
  private selectWinningBlock(validBlocks: Block[]): Block | null {
    if (validBlocks.length === 0) {return null;}

    // Select block with lowest hash (most work)
    return validBlocks.reduce((best, block) => {
      return block.hash < best.hash ? block : best;
    });
  }

  /**
   * Update blockchain with new block
   */
  private updateBlockchain(block: Block): void {
    this.blockchain.push(block);

    // Update consensus state
    const proposal = block.data as Proposal;
    proposal.support = 1; // Mined block represents consensus

    this.consensusState.agreement = 1.0; // PoW provides finality
    this.consensusState.stability = 1.0;

    // Adjust difficulty
    if (this.blockchain.length % 10 === 0) {
      this.adjustDifficulty();
    }
  }

  /**
   * Distribute mining rewards
   */
  private distributeRewards(swarm: SwarmIntelligence, block: Block): void {
    const miner = swarm.agents.get(block.minerId);
    if (!miner) {return;}

    // Increase miner's influence
    miner.state.influence += this.miningReward;

    // Normalize influences
    const totalInfluence = Array.from(swarm.agents.values())
      .reduce((sum, a) => sum + a.state.influence, 0);

    for (const agent of swarm.agents.values()) {
      agent.state.influence /= totalInfluence;
    }
  }

  /**
   * Select proposal to mine based on preference
   */
  private selectProposalToMine(
    agent: SwarmAgent,
    proposals: Proposal[],
  ): Proposal | null {
    let best: Proposal | null = null;
    let bestScore = 0;

    for (const proposal of proposals) {
      const evaluation = this.evaluateProposal(agent, proposal, {} as SwarmIntelligence);
      const score = evaluation.support * evaluation.confidence;

      if (score > bestScore) {
        bestScore = score;
        best = proposal;
      }
    }

    return best;
  }

  /**
   * Adjust mining difficulty
   */
  private adjustDifficulty(): void {
    // Target: 1 block per 10 rounds
    const targetTime = 10;
    const actualTime = this.consensusState.rounds / this.blockchain.length;

    if (actualTime < targetTime) {
      this.difficulty = Math.min(6, this.difficulty + 1);
    } else {
      this.difficulty = Math.max(2, this.difficulty - 1);
    }
  }
}

/**
 * Holographic Consensus
 *
 * Attention-based consensus with predictive validation
 */
export class HolographicConsensus extends ConsensusMechanism {
  private attentionScores: Map<string, number> = new Map();
  private predictions: Map<string, PredictedOutcome> = new Map();
  private reputations: Map<string, number> = new Map();
  private boostThreshold: number = 0.05; // 5% can boost proposal

  constructor(swarmSize: number) {
    super('holographic', swarmSize, 0.3);
  }

  async executeRound(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<ConsensusState> {
    this.consensusState.rounds++;
    this.consensusState.proposals = proposals;

    // Phase 1: Calculate attention allocation
    this.allocateAttention(swarm);

    // Phase 2: Predictive validation
    await this.predictiveValidation(swarm, proposals);

    // Phase 3: Boosting phase
    const boostedProposals = await this.boostingPhase(swarm, proposals);

    // Phase 4: Relative majority voting
    await this.relativeMajorityVoting(swarm, boostedProposals);

    // Phase 5: Update reputations
    this.updateReputations(swarm);

    return this.consensusState;
  }

  /**
   * Allocate attention based on agent expertise
   */
  private allocateAttention(swarm: SwarmIntelligence): void {
    this.attentionScores.clear();

    // Calculate total expertise
    let totalExpertise = 0;
    for (const agent of swarm.agents.values()) {
      const expertise = agent.fitness * agent.state.influence *
                       (this.reputations.get(agent.id) || 1);
      totalExpertise += expertise;
    }

    // Allocate attention proportionally
    for (const agent of swarm.agents.values()) {
      const expertise = agent.fitness * agent.state.influence *
                       (this.reputations.get(agent.id) || 1);
      const attention = expertise / totalExpertise;
      this.attentionScores.set(agent.id, attention);
    }
  }

  /**
   * Predictive validation of proposals
   */
  private async predictiveValidation(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<void> {
    for (const proposal of proposals) {
      // Agents predict outcome
      const predictions: PredictedOutcome[] = [];

      for (const agent of swarm.agents.values()) {
        const prediction = this.makePrediction(agent, proposal, swarm);
        predictions.push(prediction);
      }

      // Aggregate predictions
      const aggregated = this.aggregatePredictions(predictions);
      this.predictions.set(proposal.id, aggregated);
    }
  }

  /**
   * Make outcome prediction
   */
  private makePrediction(
    agent: SwarmAgent,
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): PredictedOutcome {
    const evaluation = this.evaluateProposal(agent, proposal, swarm);

    // Predict based on agent's model
    const successProbability = evaluation.support * evaluation.confidence;
    const expectedImprovement = successProbability * proposal.fitness - agent.fitness;

    return {
      agentId: agent.id,
      proposalId: proposal.id,
      successProbability,
      expectedImprovement,
      confidence: evaluation.confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Aggregate predictions
   */
  private aggregatePredictions(predictions: PredictedOutcome[]): PredictedOutcome {
    let totalProb = 0;
    let totalImprovement = 0;
    let totalConfidence = 0;

    for (const pred of predictions) {
      const attention = this.attentionScores.get(pred.agentId) || 0;
      totalProb += pred.successProbability * attention;
      totalImprovement += pred.expectedImprovement * attention;
      totalConfidence += pred.confidence * attention;
    }

    return {
      agentId: 'aggregated',
      proposalId: predictions[0].proposalId,
      successProbability: totalProb,
      expectedImprovement: totalImprovement,
      confidence: totalConfidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Boosting phase - minority can boost proposals
   */
  private async boostingPhase(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<Proposal[]> {
    const boosted: Proposal[] = [...proposals];

    for (const proposal of proposals) {
      const prediction = this.predictions.get(proposal.id);
      if (!prediction) {continue;}

      // Count boosters
      let boostVotes = 0;
      let boostWeight = 0;

      for (const agent of swarm.agents.values()) {
        const wantsBoost = this.evaluateBoostWorthiness(agent, proposal, prediction);

        if (wantsBoost) {
          boostVotes++;
          boostWeight += this.attentionScores.get(agent.id) || 0;
        }
      }

      // Apply boost if threshold met
      if (boostVotes >= swarm.agents.size * this.boostThreshold) {
        proposal.fitness *= (1 + boostWeight); // Boost proportional to weight
        (proposal as any).boosted = true;
      }
    }

    return boosted;
  }

  /**
   * Evaluate if proposal worth boosting
   */
  private evaluateBoostWorthiness(
    agent: SwarmAgent,
    proposal: Proposal,
    prediction: PredictedOutcome,
  ): boolean {
    // Boost if high expected improvement but low current support
    const evaluation = this.evaluateProposal(agent, proposal, {} as SwarmIntelligence);
    const worthiness = prediction.expectedImprovement > 0.2 &&
                      proposal.support < 0.3 &&
                      evaluation.confidence > 0.7;

    return worthiness;
  }

  /**
   * Relative majority voting
   */
  private async relativeMajorityVoting(
    swarm: SwarmIntelligence,
    proposals: Proposal[],
  ): Promise<void> {
    // Sort by fitness (including boosts)
    const sorted = [...proposals].sort((a, b) => b.fitness - a.fitness);

    // Vote on top proposals with attention weighting
    for (const proposal of sorted.slice(0, 3)) {
      let weightedVotes = 0;

      for (const agent of swarm.agents.values()) {
        const evaluation = this.evaluateProposal(agent, proposal, swarm);
        const attention = this.attentionScores.get(agent.id) || 0;

        if (evaluation.support > 0.5) {
          weightedVotes += attention * evaluation.support;

          const vote: Vote = {
            voterId: agent.id,
            proposalId: proposal.id,
            value: evaluation.support * attention,
            confidence: evaluation.confidence,
            timestamp: Date.now(),
          };

          if (!this.consensusState.votes.has(proposal.id)) {
            this.consensusState.votes.set(proposal.id, []);
          }
          this.consensusState.votes.get(proposal.id)!.push(vote);
        }
      }

      proposal.support = weightedVotes;
    }

    // Update agreement
    const bestProposal = sorted[0];
    if (bestProposal) {
      this.consensusState.agreement = bestProposal.support;
      this.consensusState.stability =
        (bestProposal as any).boosted ? 0.8 : 0.9;
    }
  }

  /**
   * Update agent reputations based on predictions
   */
  private updateReputations(swarm: SwarmIntelligence): void {
    const winner = this.getWinningProposal();
    if (!winner) {return;}

    const actualOutcome = winner.fitness;

    for (const agent of swarm.agents.values()) {
      // Find agent's predictions
      const agentPredictions = Array.from(this.predictions.values())
        .filter(p => p.agentId === agent.id);

      for (const prediction of agentPredictions) {
        if (prediction.proposalId === winner.id) {
          // Calculate prediction accuracy
          const accuracy = 1 - Math.abs(prediction.successProbability - actualOutcome);

          // Update reputation
          const currentRep = this.reputations.get(agent.id) || 1;
          const newRep = currentRep * 0.9 + accuracy * 0.1; // Exponential moving average

          this.reputations.set(agent.id, newRep);
        }
      }
    }

    // Normalize reputations
    const avgRep = Array.from(this.reputations.values())
      .reduce((sum, r) => sum + r, 0) / this.reputations.size;

    for (const [agentId, rep] of this.reputations) {
      this.reputations.set(agentId, rep / avgRep);
    }
  }
}

// Helper interfaces
interface DancePerformance {
  agentId: string;
  proposalId: string;
  quality: number;
  intensity: number;
  duration: number;
  maxDuration: number;
  position: Position;
}

interface Block {
  index: number;
  timestamp: number;
  data: Proposal;
  previousHash: string;
  nonce: number;
  hash: string;
  minerId: string;
}

interface PredictedOutcome {
  agentId: string;
  proposalId: string;
  successProbability: number;
  expectedImprovement: number;
  confidence: number;
  timestamp: number;
}

/**
 * Consensus factory
 */
export class ConsensusFactory {
  static create(
    algorithm: ConsensusAlgorithm,
    swarmSize: number,
  ): ConsensusMechanism {
    switch (algorithm) {
      case 'byzantine':
        return new ByzantineConsensus(swarmSize);
      case 'raft':
        return new RaftConsensus(swarmSize);
      case 'honeybee':
        return new HoneybeeDemocracy(swarmSize);
      case 'liquid':
        return new LiquidDemocracy(swarmSize);
      case 'proof-of-work':
        return new ProofOfWorkConsensus(swarmSize);
      case 'holographic':
        return new HolographicConsensus(swarmSize);
      default:
        return new HoneybeeDemocracy(swarmSize);
    }
  }

  /**
   * Recommend consensus algorithm based on requirements
   */
  static recommend(requirements: {
    faultTolerance: number;
    speed: 'fast' | 'medium' | 'slow';
    scalability: 'high' | 'medium' | 'low';
    finality: boolean;
  }): ConsensusAlgorithm {
    if (requirements.faultTolerance > 0.33) {
      return 'byzantine';
    }

    if (requirements.finality && requirements.speed === 'fast') {
      return 'raft';
    }

    if (requirements.scalability === 'high' && requirements.speed === 'medium') {
      return 'liquid';
    }

    if (requirements.finality) {
      return 'proof-of-work';
    }

    if (requirements.scalability === 'high' && requirements.speed === 'fast') {
      return 'holographic';
    }

    return 'honeybee';
  }
}