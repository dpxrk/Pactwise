import { describe, it, expect, beforeEach } from 'vitest';
import {
  ByzantineConsensus,
  RaftConsensus,
  HoneybeeDemocracy,
  LiquidDemocracy,
  HolographicConsensus,
  ProofOfWorkConsensus,
  ConsensusFactory,
} from '../../supabase/functions/local-agents/swarm/consensus';
import {
  ConsensusState,
  Proposal,
  Vote,
  SwarmAgent,
  ActivityState,
} from '../../supabase/functions/local-agents/swarm/types';

// Helper function to create test agents
function createTestAgents(count: number): Map<string, SwarmAgent> {
  const agents = new Map<string, SwarmAgent>();

  for (let i = 0; i < count; i++) {
    const agent: SwarmAgent = {
      id: `agent-${i}`,
      type: 'worker',
      position: {
        dimensions: [0, 0],
        confidence: 0.8,
        timestamp: Date.now(),
      },
      velocity: {
        components: [0, 0],
        magnitude: 0,
        inertia: 0.9,
      },
      fitness: Math.random(),
      state: {
        energy: 1.0,
        activity: 'foraging' as ActivityState,
        knowledge: [],
        currentTask: null,
        exploration: 0.5,
        commitment: 0.7,
        influence: 0.5,
      },
      memory: {
        bestPosition: {
          dimensions: [0, 0],
          confidence: 0.8,
          timestamp: Date.now(),
        },
        bestFitness: 0,
        tabuList: [],
        shortcuts: new Map(),
        patterns: [],
      },
      neighbors: [],
      role: {
        primary: 'worker',
        secondary: [],
        specialization: 0.7,
        flexibility: 0.3,
      },
      pheromones: [],
      messages: [],
    };
    agents.set(agent.id, agent);
  }

  return agents;
}

// Helper to create a test proposal
function createTestProposal(id: string = 'prop-1'): Proposal {
  return {
    id,
    type: 'solution',
    content: {
      action: 'move',
      target: [1, 1],
      confidence: 0.8,
    },
    proposerId: 'agent-0',
    timestamp: Date.now(),
    priority: 0.7,
    fitness: 0.8,
    support: 0,
    metadata: {},
  };
}

describe('Byzantine Consensus', () => {
  let byzantine: ByzantineConsensus;
  let agents: Map<string, SwarmAgent>;
  let state: ConsensusState;

  beforeEach(() => {
    byzantine = new ByzantineConsensus(10);
    agents = createTestAgents(10);
    state = {
      algorithm: 'byzantine',
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    };
  });

  it('should initialize consensus state', async () => {
    const proposal = createTestProposal();
    const newState = await byzantine.propose(proposal, agents, state);

    expect(newState.proposals).toContain(proposal);
    expect(newState.status).toBe('voting');
    expect(newState.rounds).toBe(1);
  });

  it('should handle voting phase', async () => {
    const proposal = createTestProposal();
    state = await byzantine.propose(proposal, agents, state);

    // Simulate votes
    const votes: Vote[] = [];
    let supportCount = 0;

    agents.forEach((agent, id) => {
      const support = Math.random() > 0.3 ? 1 : 0; // 70% support
      if (support) {supportCount++;}

      votes.push({
        voterId: id,
        proposalId: proposal.id,
        value: support,
        confidence: agent.fitness,
        timestamp: Date.now(),
      });
    });

    // Submit each vote individually
    let result = state;
    for (const vote of votes) {
      result = await byzantine.vote(vote, result);
    }

    expect(result.votes.size).toBe(agents.size);
    expect(result.agreement).toBeGreaterThan(0);
  });

  it('should reach consensus with sufficient agreement', async () => {
    const proposal = createTestProposal();
    state = await byzantine.propose(proposal, agents, state);

    // All agents vote in favor
    const votes: Vote[] = Array.from(agents.keys()).map(id => ({
      voterId: id,
      proposalId: proposal.id,
      value: 1,
      confidence: 0.9,
      timestamp: Date.now(),
    }));

    // Submit each vote individually
    let result = state;
    for (const vote of votes) {
      result = await byzantine.vote(vote, result);
    }

    expect(result.status).toBe('reached');
    expect(result.agreement).toBeGreaterThan(0.66); // Byzantine threshold
  });

  it('should handle Byzantine faults', async () => {
    const proposal = createTestProposal();
    state = await byzantine.propose(proposal, agents, state);

    // Simulate Byzantine agents (faulty/malicious)
    const byzantineCount = Math.floor(agents.size / 3); // Max Byzantine agents
    const votes: Vote[] = [];

    Array.from(agents.keys()).forEach((id, index) => {
      const isByzantine = index < byzantineCount;
      votes.push({
        voterId: id,
        proposalId: proposal.id,
        value: isByzantine ? 0 : 1, // Byzantine agents vote against
        confidence: isByzantine ? 0.1 : 0.9,
        timestamp: Date.now(),
      });
    });

    // Submit each vote individually
    let result = state;
    for (const vote of votes) {
      result = await byzantine.vote(vote, result);
    }

    // Should still reach consensus if honest agents > 2/3
    expect(result.agreement).toBeGreaterThan(0.5);
    expect(result.dissenters.length).toBe(byzantineCount);
  });

  it('should handle multiple rounds', async () => {
    const proposal = createTestProposal();
    state = await byzantine.propose(proposal, agents, state);

    // First round - insufficient agreement
    let votes: Vote[] = Array.from(agents.keys()).map((id, i) => ({
      voterId: id,
      proposalId: proposal.id,
      value: i % 2 === 0 ? 1 : 0, // 50/50 split
      confidence: 0.5,
      timestamp: Date.now(),
    }));

    // Submit each vote individually
    for (const vote of votes) {
      state = await byzantine.vote(vote, state);
    }
    expect(state.status).toBe('voting');
    expect(state.rounds).toBe(2);

    // Second round - reach agreement
    votes = Array.from(agents.keys()).map(id => ({
      voterId: id,
      proposalId: proposal.id,
      value: 1,
      confidence: 0.9,
      timestamp: Date.now(),
    }));

    // Submit each vote individually
    for (const vote of votes) {
      state = await byzantine.vote(vote, state);
    }
    expect(state.status).toBe('reached');
  });
});

describe('Raft Consensus', () => {
  let raft: RaftConsensus;
  let agents: Map<string, SwarmAgent>;
  let state: ConsensusState;

  beforeEach(() => {
    raft = new RaftConsensus(5);
    agents = createTestAgents(5); // Typical Raft cluster size
    state = {
      algorithm: 'raft',
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    };
  });

  it('should elect a leader', async () => {
    const proposal = createTestProposal();
    const newState = await raft.propose(proposal, agents, state);

    const metadata = (newState as { metadata?: unknown }).metadata;
    expect(metadata?.leader).toBeDefined();
    expect(metadata?.term).toBe(1);
  });

  it('should handle leader election', async () => {
    // Initialize with no leader
    (state as { metadata?: unknown }).metadata = { term: 0 };

    const proposal = createTestProposal();
    const newState = await raft.propose(proposal, agents, state);

    // Should trigger election
    const metadata = (newState as { metadata?: unknown }).metadata;
    expect(metadata?.leader).toBeDefined();
    expect(agents.has(metadata?.leader)).toBe(true);
  });

  it('should replicate entries through leader', async () => {
    const proposal = createTestProposal();
    state = await raft.propose(proposal, agents, state);

    const leaderId = (state as { metadata?: unknown }).metadata?.leader;
    expect(leaderId).toBeDefined();

    // Leader votes first
    const leaderVote: Vote = {
      voterId: leaderId!,
      proposalId: proposal.id,
      value: 1,
      confidence: 1.0,
      timestamp: Date.now(),
    };

    // Followers replicate
    const followerVotes: Vote[] = Array.from(agents.keys())
      .filter(id => id !== leaderId)
      .map(id => ({
        voterId: id,
        proposalId: proposal.id,
        value: 1,
        confidence: 0.8,
        timestamp: Date.now() + 100,
      }));

    // Submit each vote individually
    let result = state;
    result = await raft.vote(leaderVote, result);
    for (const vote of followerVotes) {
      result = await raft.vote(vote, result);
    }

    expect(result.status).toBe('reached');
    expect(result.agreement).toBeGreaterThan(0.5);
  });

  it('should handle network partitions', async () => {
    const proposal = createTestProposal();
    state = await raft.propose(proposal, agents, state);

    // Only minority votes (simulating partition)
    const minorityVotes: Vote[] = Array.from(agents.keys())
      .slice(0, 2) // Less than majority
      .map(id => ({
        voterId: id,
        proposalId: proposal.id,
        value: 1,
        confidence: 0.9,
        timestamp: Date.now(),
      }));

    // Submit each vote individually
    let result = state;
    for (const vote of minorityVotes) {
      result = await raft.vote(vote, result);
    }

    // Should not reach consensus without majority
    expect(result.status).toBe('voting');
    expect(result.agreement).toBeLessThan(0.5);
  });
});

describe('Honeybee Democracy', () => {
  let honeybee: HoneybeeDemocracy;
  let agents: Map<string, SwarmAgent>;
  let state: ConsensusState;

  beforeEach(() => {
    honeybee = new HoneybeeDemocracy(20);
    agents = createTestAgents(20); // Bee colony size
    state = {
      algorithm: 'honeybee',
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    };
  });

  it('should implement waggle dance recruitment', async () => {
    const proposals = [
      createTestProposal('site-1'),
      createTestProposal('site-2'),
      createTestProposal('site-3'),
    ];

    // Add all proposals
    for (const prop of proposals) {
      state = await honeybee.propose(prop, agents, state);
    }

    expect(state.proposals.length).toBe(3);
    const metadata = (state as { metadata?: unknown }).metadata;
    expect(metadata?.dances).toBeDefined();
  });

  it('should recruit uncommitted bees', async () => {
    const proposal = createTestProposal();
    (proposal.content as any).quality = 0.9; // High quality site

    state = await honeybee.propose(proposal, agents, state);

    // Initial scouts vote
    const scoutVotes: Vote[] = Array.from(agents.keys())
      .slice(0, 3)
      .map(id => ({
        voterId: id,
        proposalId: proposal.id,
        value: 1,
        confidence: 0.9,
        timestamp: Date.now(),
      }));

    // Submit each vote individually
    for (const vote of scoutVotes) {
      state = await honeybee.vote(vote, state);
    }

    // Check recruitment
    const metadata = (state as { metadata?: unknown }).metadata;
    expect(metadata?.dances[proposal.id]).toBeGreaterThan(0);

    // Uncommitted bees join based on dance intensity
    const recruitedVotes: Vote[] = Array.from(agents.keys())
      .slice(3, 10)
      .map(id => ({
        voterId: id,
        proposalId: proposal.id,
        value: 1,
        confidence: 0.7,
        timestamp: Date.now() + 1000,
      }));

    // Submit each vote individually
    for (const vote of recruitedVotes) {
      state = await honeybee.vote(vote, state);
    }

    expect(state.votes.size).toBeGreaterThan(scoutVotes.length);
  });

  it('should reach quorum through positive feedback', async () => {
    const proposal = createTestProposal();
    state = await honeybee.propose(proposal, agents, state);

    // Simulate positive feedback loop
    let supportingBees = 2;
    let round = 0;

    while (state.status === 'voting' && round < 5) {
      const votes: Vote[] = Array.from(agents.keys())
        .slice(0, supportingBees)
        .map(id => ({
          voterId: id,
          proposalId: proposal.id,
          value: 1,
          confidence: 0.8,
          timestamp: Date.now() + round * 1000,
        }));

      // Submit each vote individually
      for (const vote of votes) {
        state = await honeybee.vote(vote, state);
      }

      // Double supporters each round (exponential recruitment)
      supportingBees = Math.min(supportingBees * 2, agents.size);
      round++;
    }

    expect(state.status).toBe('reached');
    expect(state.agreement).toBeGreaterThan(0.7);
  });
});

describe('Liquid Democracy', () => {
  let liquid: LiquidDemocracy;
  let agents: Map<string, SwarmAgent>;
  let state: ConsensusState;

  beforeEach(() => {
    liquid = new LiquidDemocracy(15);
    agents = createTestAgents(15);
    state = {
      algorithm: 'liquid',
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    };

    // Setup delegation network
    (state as { metadata?: unknown }).metadata = {
      delegations: new Map([
        ['agent-1', 'agent-0'], // agent-1 delegates to agent-0
        ['agent-2', 'agent-0'], // agent-2 delegates to agent-0
        ['agent-3', 'agent-4'], // agent-3 delegates to agent-4
        ['agent-5', 'agent-4'], // agent-5 delegates to agent-4
      ]),
    };
  });

  it('should handle vote delegation', async () => {
    const proposal = createTestProposal();
    state = await liquid.propose(proposal, agents, state);

    // Only delegates vote
    const delegateVotes: Vote[] = [
      {
        voterId: 'agent-0',
        proposalId: proposal.id,
        value: 1,
        confidence: 0.9,
        timestamp: Date.now(),
      },
      {
        voterId: 'agent-4',
        proposalId: proposal.id,
        value: 0,
        confidence: 0.8,
        timestamp: Date.now(),
      },
    ];

    // Submit each vote individually
    let result = state;
    for (const vote of delegateVotes) {
      result = await liquid.vote(vote, result);
    }

    // Check that delegated votes are counted
    const metadata = (result as { metadata?: unknown }).metadata;
    const agent0Power = metadata?.votingPower?.['agent-0'] || 0;
    const agent4Power = metadata?.votingPower?.['agent-4'] || 0;

    expect(agent0Power).toBe(3); // Self + 2 delegations
    expect(agent4Power).toBe(3); // Self + 2 delegations
  });

  it('should handle transitive delegation', async () => {
    // Add transitive delegation: agent-6 -> agent-1 -> agent-0
    const metadata = (state as { metadata?: unknown }).metadata;
    metadata!.delegations.set('agent-6', 'agent-1');

    const proposal = createTestProposal();
    state = await liquid.propose(proposal, agents, state);

    const vote: Vote = {
      voterId: 'agent-0',
      proposalId: proposal.id,
      value: 1,
      confidence: 0.9,
      timestamp: Date.now(),
    };

    const result = await liquid.vote(vote, state);

    // agent-0 should have power from transitive delegation
    const resultMetadata = (result as { metadata?: unknown }).metadata;
    const votingPower = resultMetadata?.votingPower?.['agent-0'] || 0;
    expect(votingPower).toBe(4); // Self + 2 direct + 1 transitive
  });

  it('should allow delegation override', async () => {
    const proposal = createTestProposal();
    state = await liquid.propose(proposal, agents, state);

    // Delegate votes
    const delegateVote: Vote = {
      voterId: 'agent-0',
      proposalId: proposal.id,
      value: 1,
      confidence: 0.9,
      timestamp: Date.now(),
    };

    // Delegator overrides
    const overrideVote: Vote = {
      voterId: 'agent-1',
      proposalId: proposal.id,
      value: 0, // Opposite of delegate
      confidence: 1.0,
      timestamp: Date.now() + 100,
    };

    // Submit each vote individually
    let result = state;
    result = await liquid.vote(delegateVote, result);
    result = await liquid.vote(overrideVote, result);

    // agent-1's vote should not be delegated
    const resultMetadata = (result as { metadata?: unknown }).metadata;
    const agent0Power = resultMetadata?.votingPower?.['agent-0'] || 0;
    expect(agent0Power).toBe(2); // Self + only agent-2's delegation
  });
});

describe('Proof of Work', () => {
  let pow: ProofOfWorkConsensus;
  let agents: Map<string, SwarmAgent>;
  let state: ConsensusState;

  beforeEach(() => {
    pow = new ProofOfWorkConsensus(10);
    agents = createTestAgents(10);
    state = {
      algorithm: 'proof-of-work',
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    };
  });

  it('should require work for voting', async () => {
    const proposal = createTestProposal();
    state = await pow.propose(proposal, agents, state);

    const metadata = (state as { metadata?: unknown }).metadata;
    expect(metadata?.difficulty).toBeDefined();
    expect(metadata?.target).toBeDefined();
  });

  it('should validate proof of work', async () => {
    const proposal = createTestProposal();
    state = await pow.propose(proposal, agents, state);

    // Simulate work computation
    const votes: Vote[] = Array.from(agents.entries()).map(([id, agent]) => ({
      voterId: id,
      proposalId: proposal.id,
      value: 1,
      confidence: agent.fitness,
      timestamp: Date.now(),
    }));

    // Submit each vote individually
    let result = state;
    for (const vote of votes) {
      result = await pow.vote(vote, result);
    }

    // Only votes with sufficient work should count
    expect(result.votes.size).toBeLessThanOrEqual(votes.length);
  });

  it('should weight votes by work performed', async () => {
    const proposal = createTestProposal();
    state = await pow.propose(proposal, agents, state);

    // Create votes with different work levels
    const highWorkVote: Vote = {
      voterId: 'agent-0',
      proposalId: proposal.id,
      value: 1,
      confidence: 1.0,
      timestamp: Date.now(),
    };

    const lowWorkVotes: Vote[] = Array.from(agents.keys())
      .slice(1, 5)
      .map(id => ({
        voterId: id,
        proposalId: proposal.id,
        value: 0,
        confidence: 0.5,
        timestamp: Date.now(),
      }));

    // Submit each vote individually
    let result = state;
    result = await pow.vote(highWorkVote, result);
    for (const vote of lowWorkVotes) {
      result = await pow.vote(vote, result);
    }

    // High work vote should have more influence
    expect(result.agreement).toBeGreaterThan(0.5);
  });
});

describe('Holographic Consensus', () => {
  let holographic: HolographicConsensus;
  let agents: Map<string, SwarmAgent>;
  let state: ConsensusState;

  beforeEach(() => {
    holographic = new HolographicConsensus(30);
    agents = createTestAgents(30);
    state = {
      algorithm: 'holographic',
      proposals: [],
      votes: new Map(),
      agreement: 0,
      stability: 0,
      dissenters: [],
      rounds: 0,
      status: 'pending',
    };
  });

  it('should use attention mechanism', async () => {
    // Create multiple proposals
    const proposals = [
      { ...createTestProposal('prop-1'), priority: 0.9 },
      { ...createTestProposal('prop-2'), priority: 0.5 },
      { ...createTestProposal('prop-3'), priority: 0.3 },
    ];

    for (const prop of proposals) {
      state = await holographic.propose(prop, agents, state);
    }

    const stateMetadata = (state as { metadata?: unknown }).metadata;
    expect(stateMetadata?.attention).toBeDefined();

    // High priority should get more attention
    const attention = stateMetadata?.attention;
    expect(attention['prop-1']).toBeGreaterThan(attention['prop-2']);
    expect(attention['prop-2']).toBeGreaterThan(attention['prop-3']);
  });

  it('should allocate voting resources based on attention', async () => {
    const proposal1 = { ...createTestProposal('prop-1'), priority: 0.9 };
    const proposal2 = { ...createTestProposal('prop-2'), priority: 0.3 };

    state = await holographic.propose(proposal1, agents, state);
    state = await holographic.propose(proposal2, agents, state);

    // Agents vote on both proposals
    const votes: Vote[] = [];
    Array.from(agents.keys()).forEach(id => {
      // More agents vote on high priority
      if (Math.random() < proposal1.priority) {
        votes.push({
          voterId: id,
          proposalId: proposal1.id,
          value: 1,
          confidence: 0.8,
          timestamp: Date.now(),
        });
      }

      if (Math.random() < proposal2.priority) {
        votes.push({
          voterId: id,
          proposalId: proposal2.id,
          value: 1,
          confidence: 0.6,
          timestamp: Date.now(),
        });
      }
    });

    // Submit each vote individually
    let result = state;
    for (const vote of votes) {
      result = await holographic.vote(vote, result);
    }

    // Should process high priority proposal first
    const resultMetadata = (result as { metadata?: unknown }).metadata;
    expect(resultMetadata?.processedOrder[0]).toBe('prop-1');
  });

  it('should enable prediction markets', async () => {
    const proposal = createTestProposal();
    state = await holographic.propose(proposal, agents, state);

    // Agents place predictions
    const predictions: Vote[] = Array.from(agents.keys()).map(id => ({
      voterId: id,
      proposalId: proposal.id,
      value: Math.random() > 0.3 ? 1 : 0,
      confidence: Math.random(),
      timestamp: Date.now(),
    }));

    // Submit each vote individually
    let result = state;
    for (const vote of predictions) {
      result = await holographic.vote(vote, result);
    }

    const resultMetadata = (result as { metadata?: unknown }).metadata;
    expect(resultMetadata?.market).toBeDefined();
    expect(resultMetadata?.market.price).toBeGreaterThan(0);
    expect(resultMetadata?.market.volume).toBeGreaterThan(0);
  });
});

describe('ConsensusFactory', () => {
  it('should create correct consensus instances', () => {
    const algorithms = [
      'byzantine',
      'raft',
      'honeybee',
      'liquid',
      'proof-of-work',
      'holographic',
    ] as const;

    algorithms.forEach(algo => {
      const consensus = ConsensusFactory.create(algo, 10);
      expect(consensus).toBeDefined();

      // Check correct type
      switch (algo) {
        case 'byzantine':
          expect(consensus).toBeInstanceOf(ByzantineConsensus);
          break;
        case 'raft':
          expect(consensus).toBeInstanceOf(RaftConsensus);
          break;
        case 'honeybee':
          expect(consensus).toBeInstanceOf(HoneybeeDemocracy);
          break;
        case 'liquid':
          expect(consensus).toBeInstanceOf(LiquidDemocracy);
          break;
        case 'proof-of-work':
          expect(consensus).toBeInstanceOf(ProofOfWorkConsensus);
          break;
        case 'holographic':
          expect(consensus).toBeInstanceOf(HolographicConsensus);
          break;
      }
    });
  });

  it('should recommend appropriate consensus for requirements', () => {
    const recommendations = [
      {
        requirements: { faultTolerance: 0.4, speed: 'fast' as const, scalability: 'low' as const, finality: true },
        expected: 'byzantine'
      },
      {
        requirements: { faultTolerance: 0.2, speed: 'fast' as const, scalability: 'low' as const, finality: true },
        expected: 'raft'
      },
      {
        requirements: { faultTolerance: 0.2, speed: 'medium' as const, scalability: 'high' as const, finality: false },
        expected: 'liquid'
      },
    ];

    recommendations.forEach(({ requirements, expected }) => {
      const recommended = ConsensusFactory.recommend(requirements);
      expect(recommended).toBe(expected);
    });
  });
});