/**
 * Swarm Coordination Engine
 *
 * Core engine for managing collective intelligence, emergent behaviors,
 * and distributed problem-solving through swarm coordination.
 */

import {
  SwarmIntelligence,
  SwarmAgent,
  PheromoneDeposit,
  SwarmMessage,
  EmergentPattern,
  DistributedSolution,
  ProblemDefinition,
  Position,
  Velocity,
  SwarmConfig,
  AlgorithmType,
  ActivityState,
  PheromoneType,
  Proposal,
  Vote,
  Formation,
  InformationCascade,
  Synchronization,
  CollectiveKnowledge,
  Innovation,
  PheromoneField,
  PheromoneCell,
  SwarmPerformance,
  SolutionFragment,
  SwarmAgentType,
  ConsensusAlgorithm,
  Evidence,
  Pattern,
  LearnedPattern,
  Strategy,
  Heuristic,
  SwarmTopology,
  SearchSpace,
} from './types.ts';

export class SwarmEngine {
  private swarms: Map<string, SwarmIntelligence> = new Map();
  private messageQueue: Map<string, SwarmMessage[]> = new Map();
  private pheromoneFields: Map<string, PheromoneField> = new Map();
  private knowledgeBase: Map<string, CollectiveKnowledge> = new Map();
  private performanceHistory: Map<string, SwarmPerformance[]> = new Map();

  /**
   * Initialize a new swarm with specified configuration
   */
  async initializeSwarm(
    swarmId: string,
    problem: ProblemDefinition,
    config: SwarmConfig,
  ): Promise<SwarmIntelligence> {
    // Create agent population
    const agents = await this.createAgentPopulation(
      config.size[0],
      problem,
      config,
    );

    // Initialize pheromone field
    const pheromoneField = this.initializePheromoneField(
      problem.searchSpace,
      config,
    );

    // Create swarm intelligence instance
    const swarm: SwarmIntelligence = {
      swarmId,
      size: agents.size,
      agents,
      problem,
      state: {
        phase: 'initialization',
        convergence: 0,
        diversity: 1,
        coherence: 0,
        temperature: 1,
        polarization: 0,
        clustering: 0,
        efficiency: 0.5,
      },
      emergence: {
        patterns: [],
        formations: [],
        cascades: [],
        synchronizations: [],
        innovations: [],
      },
      performance: {
        efficiency: 0,
        scalability: 0,
        robustness: 0,
        adaptability: 0,
        convergenceSpeed: 0,
        solutionQuality: 0,
        resourceUsage: 0,
        communicationOverhead: 0,
        emergenceIndex: 0,
      },
      consensus: {
        algorithm: this.selectConsensusAlgorithm(config.algorithm),
        proposals: [],
        votes: new Map(),
        agreement: 0,
        stability: 0,
        dissenters: [],
        rounds: 0,
      },
      pheromoneField,
    };

    this.swarms.set(swarmId, swarm);
    this.pheromoneFields.set(swarmId, pheromoneField);
    this.messageQueue.set(swarmId, []);
    this.knowledgeBase.set(swarmId, {
      facts: [],
      patterns: [],
      strategies: [],
      heuristics: [],
      innovations: [],
    });

    return swarm;
  }

  /**
   * Execute one iteration of swarm behavior
   */
  async iterate(swarmId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {throw new Error(`Swarm ${swarmId} not found`);}

    // Update swarm phase
    this.updateSwarmPhase(swarm);

    // Process messages
    await this.processMessages(swarm);

    // Update pheromones
    this.updatePheromones(swarm);

    // Execute agent behaviors
    await this.executeAgentBehaviors(swarm);

    // Detect emergent patterns
    this.detectEmergentPatterns(swarm);

    // Build consensus
    await this.buildConsensus(swarm);

    // Adapt and learn
    await this.adaptAndLearn(swarm);

    // Update performance metrics
    this.updatePerformance(swarm);

    // Check termination criteria
    if (this.shouldTerminate(swarm)) {
      swarm.state.phase = 'termination';
    }
  }

  /**
   * Create initial agent population
   */
  private async createAgentPopulation(
    size: number,
    problem: ProblemDefinition,
    config: SwarmConfig,
  ): Promise<Map<string, SwarmAgent>> {
    const agents = new Map<string, SwarmAgent>();

    for (let i = 0; i < size; i++) {
      const agent = await this.createAgent(i, problem, config);
      agents.set(agent.id, agent);
    }

    // Establish topology connections
    this.establishTopology(agents, config.topology);

    return agents;
  }

  /**
   * Create individual agent
   */
  private async createAgent(
    index: number,
    problem: ProblemDefinition,
    config: SwarmConfig,
  ): Promise<SwarmAgent> {
    const agentTypes: SwarmAgentType[] = [
      'explorer', 'worker', 'scout', 'coordinator',
      'aggregator', 'sentinel', 'messenger', 'architect',
      'harvester', 'innovator',
    ];

    // Assign roles based on distribution
    const primaryRole = agentTypes[index % agentTypes.length];
    const secondaryRoles = agentTypes.filter(t => t !== primaryRole)
      .slice(0, 2);

    return {
      id: `agent-${index}`,
      type: primaryRole,
      state: {
        energy: 1.0,
        activity: 'foraging',
        knowledge: [],
        currentTask: null,
        exploration: 0.5,
        commitment: 0,
        influence: 1.0 / config.size[0],
      },
      position: this.randomPosition(problem.searchSpace),
      velocity: this.randomVelocity(problem.searchSpace),
      fitness: 0,
      memory: {
        bestPosition: this.randomPosition(problem.searchSpace),
        bestFitness: 0,
        tabuList: [],
        shortcuts: new Map(),
        patterns: [],
      },
      neighbors: [],
      role: {
        primary: primaryRole,
        secondary: secondaryRoles,
        specialization: 0.7,
        flexibility: 0.3,
      },
      pheromones: [],
      messages: [],
    };
  }

  /**
   * Update swarm phase based on current state
   */
  private updateSwarmPhase(swarm: SwarmIntelligence): void {
    const { state } = swarm;
    const previousPhase = state.phase;

    // Phase transition logic
    if (state.phase === 'initialization' && swarm.agents.size > 0) {
      state.phase = 'exploration';
    } else if (state.phase === 'exploration' && state.convergence > 0.3) {
      state.phase = 'exploitation';
    } else if (state.phase === 'exploitation' && state.diversity < 0.1) {
      state.phase = 'stagnation';
    } else if (state.phase === 'stagnation' && state.temperature > 0.8) {
      state.phase = 'divergence';
    } else if (state.phase === 'divergence' && state.convergence > 0.5) {
      state.phase = 'convergence';
    } else if (state.phase === 'convergence' && state.convergence > 0.9) {
      state.phase = 'termination';
    }

    // Handle reorganization
    if (state.efficiency < 0.3 && state.phase !== 'reorganization') {
      state.phase = 'reorganization';
    } else if (state.phase === 'reorganization' && state.efficiency > 0.5) {
      state.phase = 'exploitation';
    }

    // Update temperature based on phase
    if (state.phase !== previousPhase) {
      this.adjustTemperature(swarm);
    }
  }

  /**
   * Process inter-agent messages
   */
  private async processMessages(swarm: SwarmIntelligence): Promise<void> {
    const messages = this.messageQueue.get(swarm.swarmId) || [];
    const processedMessages: SwarmMessage[] = [];

    for (const message of messages) {
      // Handle TTL
      if (message.ttl <= 0) {continue;}
      message.ttl--;
      message.hops++;

      // Process based on recipient
      if (message.recipientIds === 'broadcast') {
        // Broadcast to all agents
        for (const agent of swarm.agents.values()) {
          await this.deliverMessage(agent, message, swarm);
        }
      } else {
        // Targeted delivery
        for (const recipientId of message.recipientIds) {
          const agent = swarm.agents.get(recipientId);
          if (agent) {
            await this.deliverMessage(agent, message, swarm);
          }
        }
      }

      // Keep alive messages with remaining TTL
      if (message.ttl > 0) {
        processedMessages.push(message);
      }
    }

    this.messageQueue.set(swarm.swarmId, processedMessages);
  }

  /**
   * Update pheromone field
   */
  private updatePheromones(swarm: SwarmIntelligence): void {
    const field = this.pheromoneFields.get(swarm.swarmId);
    if (!field) {return;}

    // Evaporate existing pheromones
    for (let x = 0; x < field.grid.length; x++) {
      for (let y = 0; y < field.grid[x].length; y++) {
        for (let z = 0; z < field.grid[x][y].length; z++) {
          const cell = field.grid[x][y][z];

          // Apply evaporation
          for (const [type, intensity] of cell.deposits) {
            const newIntensity = intensity * (1 - field.evaporationRate);
            if (newIntensity < 0.01) {
              cell.deposits.delete(type);
            } else {
              cell.deposits.set(type, newIntensity);
            }
          }

          // Update gradient
          this.updatePheromoneGradient(field, x, y, z);
        }
      }
    }

    // Add new pheromone deposits
    for (const agent of swarm.agents.values()) {
      for (const deposit of agent.pheromones) {
        this.addPheromoneDeposit(field, deposit);
      }
      // Clear agent's pheromone buffer
      agent.pheromones = [];
    }

    // Apply diffusion
    this.diffusePheromones(field);
  }

  /**
   * Execute agent behaviors based on current state
   */
  private async executeAgentBehaviors(swarm: SwarmIntelligence): Promise<void> {
    const tasks: Promise<void>[] = [];

    for (const agent of swarm.agents.values()) {
      tasks.push(this.executeAgentBehavior(agent, swarm));
    }

    await Promise.all(tasks);
  }

  /**
   * Execute individual agent behavior
   */
  private async executeAgentBehavior(
    agent: SwarmAgent,
    swarm: SwarmIntelligence,
  ): Promise<void> {
    // Update agent state based on activity
    switch (agent.state.activity) {
      case 'foraging':
        await this.forage(agent, swarm);
        break;
      case 'recruiting':
        await this.recruit(agent, swarm);
        break;
      case 'following':
        await this.followPheromones(agent, swarm);
        break;
      case 'dancing':
        await this.performWaggleDance(agent, swarm);
        break;
      case 'building':
        await this.buildSolution(agent, swarm);
        break;
      case 'converging':
        await this.convergeToConsensus(agent, swarm);
        break;
      case 'diverging':
        await this.exploreAlternatives(agent, swarm);
        break;
      case 'synchronizing':
        await this.synchronizeWithSwarm(agent, swarm);
        break;
      case 'innovating':
        await this.innovate(agent, swarm);
        break;
    }

    // Update position and velocity
    this.updateAgentMovement(agent, swarm);

    // Evaluate fitness
    agent.fitness = await this.evaluateFitness(agent.position, swarm.problem);

    // Update personal best
    if (agent.fitness > agent.memory.bestFitness) {
      agent.memory.bestFitness = agent.fitness;
      agent.memory.bestPosition = { ...agent.position };
    }

    // Energy management
    this.updateAgentEnergy(agent, swarm);
  }

  /**
   * Detect emergent patterns in swarm behavior
   */
  private detectEmergentPatterns(swarm: SwarmIntelligence): void {
    // Detect flocking behavior
    const flocking = this.detectFlocking(swarm);
    if (flocking) {
      swarm.emergence.patterns.push(flocking);
    }

    // Detect clustering
    const clusters = this.detectClustering(swarm);
    for (const cluster of clusters) {
      swarm.emergence.formations.push(cluster);
    }

    // Detect information cascades
    const cascades = this.detectCascades(swarm);
    for (const cascade of cascades) {
      swarm.emergence.cascades.push(cascade);
    }

    // Detect synchronization
    const sync = this.detectSynchronization(swarm);
    if (sync) {
      swarm.emergence.synchronizations.push(sync);
    }

    // Detect innovations
    const innovations = this.detectInnovations(swarm);
    for (const innovation of innovations) {
      swarm.emergence.innovations.push(innovation);
    }

    // Clean up old patterns
    this.cleanupEmergentPatterns(swarm);
  }

  /**
   * Build consensus among agents
   */
  private async buildConsensus(swarm: SwarmIntelligence): Promise<void> {
    const { consensus } = swarm;

    // Generate proposals from high-performing agents
    const proposals = this.generateProposals(swarm);
    consensus.proposals.push(...proposals);

    // Execute consensus algorithm
    switch (consensus.algorithm) {
      case 'honeybee':
        await this.honeybeeConsensus(swarm);
        break;
      case 'antcolony':
        await this.antColonyConsensus(swarm);
        break;
      case 'byzantine':
        await this.byzantineConsensus(swarm);
        break;
      case 'raft':
        await this.raftConsensus(swarm);
        break;
      case 'proof-of-work':
        await this.proofOfWorkConsensus(swarm);
        break;
      case 'liquid':
        await this.liquidConsensus(swarm);
        break;
      case 'holographic':
        await this.holographicConsensus(swarm);
        break;
    }

    // Update consensus metrics
    this.updateConsensusMetrics(swarm);
  }

  /**
   * Adapt and learn from experience
   */
  private async adaptAndLearn(swarm: SwarmIntelligence): Promise<void> {
    const knowledge = this.knowledgeBase.get(swarm.swarmId);
    if (!knowledge) {return;}

    // Extract patterns from successful behaviors
    const patterns = this.extractPatterns(swarm);
    knowledge.patterns.push(...patterns);

    // Develop strategies from patterns
    const strategies = this.developStrategies(patterns, swarm);
    knowledge.strategies.push(...strategies);

    // Create heuristics from experience
    const heuristics = this.createHeuristics(swarm);
    knowledge.heuristics.push(...heuristics);

    // Share knowledge among agents
    await this.shareKnowledge(swarm, knowledge);

    // Prune ineffective knowledge
    this.pruneKnowledge(knowledge);
  }

  /**
   * Foraging behavior - search for solutions
   */
  private async forage(agent: SwarmAgent, swarm: SwarmIntelligence): Promise<void> {
    // Explore with Levy flight
    const levyStep = this.levyFlight(agent.position, swarm.problem.searchSpace);

    // Check pheromone gradient
    const gradient = this.getPheromoneGradient(agent.position, swarm);

    // Combine exploration and exploitation
    const explorationWeight = agent.state.exploration;
    const exploitationWeight = 1 - explorationWeight;

    // Update velocity
    for (let i = 0; i < agent.velocity.components.length; i++) {
      agent.velocity.components[i] =
        explorationWeight * levyStep.dimensions[i] +
        exploitationWeight * gradient[i];
    }

    // Check for food source (good solution)
    if (agent.fitness > swarm.performance.solutionQuality * 0.8) {
      agent.state.activity = 'recruiting';
      this.depositPheromone(agent, 'food', agent.fitness);
    }
  }

  /**
   * Recruit other agents to solution
   */
  private async recruit(agent: SwarmAgent, swarm: SwarmIntelligence): Promise<void> {
    // Create recruitment message
    const message: SwarmMessage = {
      id: `msg-${Date.now()}-${agent.id}`,
      type: 'recruitment',
      senderId: agent.id,
      recipientIds: agent.neighbors,
      content: {
        topic: 'solution-found',
        data: {
          position: agent.position,
          fitness: agent.fitness,
        },
        confidence: agent.fitness,
        evidence: [{
          type: 'fitness-evaluation',
          source: agent.id,
          confidence: 1,
          data: agent.fitness,
        }],
      },
      priority: agent.fitness,
      ttl: 5,
      hops: 0,
      timestamp: Date.now(),
    };

    // Send message
    this.sendMessage(swarm.swarmId, message);

    // Perform waggle dance
    agent.state.activity = 'dancing';
  }

  /**
   * Follow pheromone trails
   */
  private async followPheromones(
    agent: SwarmAgent,
    swarm: SwarmIntelligence,
  ): Promise<void> {
    const gradient = this.getPheromoneGradient(agent.position, swarm);

    // Update velocity to follow gradient
    const followStrength = 0.8;
    for (let i = 0; i < agent.velocity.components.length; i++) {
      agent.velocity.components[i] =
        (1 - followStrength) * agent.velocity.components[i] +
        followStrength * gradient[i];
    }

    // Add some noise to avoid getting stuck
    const noise = this.gaussianNoise(0.1);
    for (let i = 0; i < agent.velocity.components.length; i++) {
      agent.velocity.components[i] += noise[i];
    }

    // Check if reached food source
    const field = this.pheromoneFields.get(swarm.swarmId);
    if (field) {
      const cell = this.getCell(field, agent.position);
      const foodIntensity = cell.deposits.get('food') || 0;

      if (foodIntensity > 0.5) {
        agent.state.activity = 'building';
      }
    }
  }

  /**
   * Perform waggle dance to communicate solution
   */
  private async performWaggleDance(
    agent: SwarmAgent,
    swarm: SwarmIntelligence,
  ): Promise<void> {
    // Dance duration proportional to solution quality
    // Note: Duration could be used to affect recruitment probability

    // Attract nearby agents
    for (const neighborId of agent.neighbors) {
      const neighbor = swarm.agents.get(neighborId);
      if (neighbor && neighbor.state.activity === 'foraging') {
        // Probability of following based on dance quality
        const followProbability = agent.fitness * 0.7;
        if (Math.random() < followProbability) {
          neighbor.state.activity = 'following';

          // Share solution information
          neighbor.state.knowledge.push({
            id: `knowledge-${Date.now()}`,
            type: 'solution-location',
            content: agent.position,
            source: agent.id,
            confidence: agent.fitness,
          });
        }
      }
    }

    // Deposit trail pheromone
    this.depositPheromone(agent, 'trail', agent.fitness * 0.8);

    // Return to foraging after dance
    agent.state.activity = 'foraging';
  }

  /**
   * Detect flocking behavior
   */
  private detectFlocking(swarm: SwarmIntelligence): EmergentPattern | null {
    // Calculate average velocity
    const avgVelocity = new Array(swarm.problem.dimensions).fill(0);
    let alignedAgents = 0;

    for (const agent of swarm.agents.values()) {
      const { magnitude } = agent.velocity;
      if (magnitude > 0.1) {
        for (let i = 0; i < avgVelocity.length; i++) {
          avgVelocity[i] += agent.velocity.components[i] / magnitude;
        }
        alignedAgents++;
      }
    }

    if (alignedAgents === 0) {return null;}

    // Normalize average velocity
    for (let i = 0; i < avgVelocity.length; i++) {
      avgVelocity[i] /= alignedAgents;
    }

    // Calculate alignment
    let alignment = 0;
    const participants: string[] = [];

    for (const agent of swarm.agents.values()) {
      const { magnitude } = agent.velocity;
      if (magnitude > 0.1) {
        let dotProduct = 0;
        for (let i = 0; i < avgVelocity.length; i++) {
          dotProduct += (agent.velocity.components[i] / magnitude) * avgVelocity[i];
        }

        if (dotProduct > 0.7) {
          alignment += dotProduct;
          participants.push(agent.id);
        }
      }
    }

    const strength = alignment / swarm.agents.size;

    if (strength > 0.5 && participants.length > swarm.agents.size * 0.3) {
      return {
        id: `flocking-${Date.now()}`,
        type: 'flocking',
        strength,
        participants,
        stability: 0.8,
        benefit: strength * 0.5,
        description: `${participants.length} agents moving in coordinated direction`,
      };
    }

    return null;
  }

  /**
   * Helper methods
   */

  private randomPosition(searchSpace: SearchSpace): Position {
    const dimensions: number[] = [];

    for (const dim of searchSpace.dimensions) {
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        dimensions.push(min + Math.random() * (max - min));
      } else {
        dimensions.push(Math.floor(Math.random() * (dim.range as string[]).length));
      }
    }

    return {
      dimensions,
      confidence: 0.5,
      timestamp: Date.now(),
    };
  }

  private randomVelocity(searchSpace: SearchSpace): Velocity {
    const components: number[] = [];
    const maxVelocity = 0.1; // 10% of dimension range

    for (const dim of searchSpace.dimensions) {
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        const range = max - min;
        components.push((Math.random() - 0.5) * 2 * maxVelocity * range);
      } else {
        components.push((Math.random() - 0.5) * 2);
      }
    }

    const magnitude = Math.sqrt(components.reduce((sum, c) => sum + c * c, 0));

    return {
      components,
      magnitude,
      inertia: 0.7,
    };
  }

  private establishTopology(
    agents: Map<string, SwarmAgent>,
    topology: SwarmTopology,
  ): void {
    const agentArray = Array.from(agents.values());
    const n = agentArray.length;

    switch (topology.type) {
      case 'global':
        // Everyone connected to everyone
        for (const agent of agentArray) {
          agent.neighbors = agentArray
            .filter(a => a.id !== agent.id)
            .map(a => a.id);
        }
        break;

      case 'ring':
        // Connected to k nearest neighbors in a ring
        const k = Math.floor(topology.connectivity);
        for (let i = 0; i < n; i++) {
          const neighbors: string[] = [];
          for (let j = 1; j <= k / 2; j++) {
            neighbors.push(agentArray[(i + j) % n].id);
            neighbors.push(agentArray[(i - j + n) % n].id);
          }
          agentArray[i].neighbors = neighbors;
        }
        break;

      case 'star':
        // Central hub connected to all
        const hub = agentArray[0];
        hub.neighbors = agentArray.slice(1).map(a => a.id);
        for (let i = 1; i < n; i++) {
          agentArray[i].neighbors = [hub.id];
        }
        break;

      case 'mesh':
        // Random connections
        for (const agent of agentArray) {
          const numConnections = Math.floor(
            topology.connectivity * (0.5 + Math.random()),
          );
          const neighbors = new Set<string>();

          while (neighbors.size < numConnections) {
            const neighbor = agentArray[Math.floor(Math.random() * n)];
            if (neighbor.id !== agent.id) {
              neighbors.add(neighbor.id);
            }
          }

          agent.neighbors = Array.from(neighbors);
        }
        break;

      case 'small-world':
        // Ring with random rewiring
        this.establishTopology(agents, { ...topology, type: 'ring' });

        // Rewire some connections
        for (const agent of agentArray) {
          for (let i = 0; i < agent.neighbors.length; i++) {
            if (Math.random() < topology.rewiring) {
              // Rewire this connection
              const newNeighbor = agentArray[Math.floor(Math.random() * n)];
              if (newNeighbor.id !== agent.id &&
                  !agent.neighbors.includes(newNeighbor.id)) {
                agent.neighbors[i] = newNeighbor.id;
              }
            }
          }
        }
        break;

      case 'dynamic':
        // Connections change over time
        this.establishTopology(agents, { ...topology, type: 'mesh' });
        break;
    }
  }

  private selectConsensusAlgorithm(algorithm: AlgorithmType): ConsensusAlgorithm {
    const mapping: Record<AlgorithmType, ConsensusAlgorithm> = {
      'pso': 'honeybee',
      'aco': 'antcolony',
      'abc': 'honeybee',
      'firefly': 'byzantine',
      'cuckoo': 'raft',
      'wolf': 'byzantine',
      'whale': 'liquid',
      'dragonfly': 'holographic',
      'grasshopper': 'proof-of-work',
      'hybrid': 'holographic',
    };

    return mapping[algorithm] || 'honeybee';
  }

  private initializePheromoneField(
    _searchSpace: SearchSpace,
    _config: SwarmConfig,
  ): PheromoneField {
    const resolution = 10; // Grid cells per dimension
    const grid: PheromoneCell[][][] = [];

    // Create 3D grid (using first 3 dimensions or padding)
    for (let x = 0; x < resolution; x++) {
      grid[x] = [];
      for (let y = 0; y < resolution; y++) {
        grid[x][y] = [];
        for (let z = 0; z < resolution; z++) {
          const position: Position = {
            dimensions: [
              x / resolution,
              y / resolution,
              z / resolution,
            ],
            confidence: 0,
            timestamp: Date.now(),
          };

          grid[x][y][z] = {
            position,
            deposits: new Map(),
            lastUpdate: Date.now(),
            gradient: [0, 0, 0],
          };
        }
      }
    }

    return {
      grid,
      resolution,
      evaporationRate: 0.1,
      diffusionRate: 0.05,
      maxIntensity: 10,
    };
  }

  private sendMessage(swarmId: string, message: SwarmMessage): void {
    const queue = this.messageQueue.get(swarmId) || [];
    queue.push(message);
    this.messageQueue.set(swarmId, queue);
  }

  private async deliverMessage(
    agent: SwarmAgent,
    message: SwarmMessage,
    swarm: SwarmIntelligence,
  ): Promise<void> {
    // Add to agent's message buffer
    agent.messages.push(message);

    // Process based on message type
    switch (message.type) {
      case 'discovery':
        await this.handleDiscovery(agent, message, swarm);
        break;
      case 'recruitment':
        await this.handleRecruitment(agent, message, swarm);
        break;
      case 'warning':
        await this.handleWarning(agent, message, swarm);
        break;
      case 'coordination':
        await this.handleCoordination(agent, message, swarm);
        break;
      case 'consensus':
        // TODO: Implement handleConsensus
        console.log('Consensus handling not yet implemented');
        break;
      case 'innovation':
        await this.handleInnovation(agent, message, swarm);
        break;
      case 'evaluation':
        await this.handleEvaluation(agent, message, swarm);
        break;
      case 'heartbeat':
        await this.handleHeartbeat(agent, message, swarm);
        break;
    }

    // Clean old messages
    agent.messages = agent.messages.filter(
      m => Date.now() - m.timestamp < 60000, // Keep for 1 minute
    );
  }

  private async handleDiscovery(
    agent: SwarmAgent,
    message: SwarmMessage,
    _swarm: SwarmIntelligence,
  ): Promise<void> {
    const discovery = message.content.data as {
      position: Position;
      fitness: number;
      type: string;
    };

    // Add to knowledge
    agent.state.knowledge.push({
      id: `discovery-${message.id}`,
      type: 'discovery',
      content: discovery,
      source: message.senderId,
      confidence: message.content.confidence,
    });

    // Adjust behavior based on discovery quality
    if (discovery.fitness > agent.memory.bestFitness * 1.2) {
      agent.state.activity = 'following';

      // Bias velocity toward discovery
      const direction = this.calculateDirection(
        agent.position,
        discovery.position,
      );

      for (let i = 0; i < agent.velocity.components.length; i++) {
        agent.velocity.components[i] =
          0.3 * agent.velocity.components[i] +
          0.7 * direction[i];
      }
    }
  }

  private calculateDirection(from: Position, to: Position): number[] {
    const direction: number[] = [];
    let magnitude = 0;

    for (let i = 0; i < from.dimensions.length; i++) {
      const component = to.dimensions[i] - from.dimensions[i];
      direction.push(component);
      magnitude += component * component;
    }

    magnitude = Math.sqrt(magnitude);

    // Normalize
    if (magnitude > 0) {
      for (let i = 0; i < direction.length; i++) {
        direction[i] /= magnitude;
      }
    }

    return direction;
  }

  private depositPheromone(
    agent: SwarmAgent,
    type: PheromoneType,
    strength: number,
  ): void {
    const deposit: PheromoneDeposit = {
      id: `pheromone-${Date.now()}-${agent.id}`,
      type,
      position: { ...agent.position },
      strength,
      evaporationRate: 0.1,
      depositorId: agent.id,
      timestamp: Date.now(),
      metadata: {},
    };

    agent.pheromones.push(deposit);
  }

  private getPheromoneGradient(
    position: Position,
    swarm: SwarmIntelligence,
  ): number[] {
    const field = this.pheromoneFields.get(swarm.swarmId);
    if (!field) {return new Array(position.dimensions.length).fill(0);}

    const cell = this.getCell(field, position);
    return [...cell.gradient];
  }

  private getCell(field: PheromoneField, position: Position): PheromoneCell {
    const x = Math.floor(position.dimensions[0] * field.resolution);
    const y = Math.floor(position.dimensions[1] * field.resolution);
    const z = Math.floor(position.dimensions[2] * field.resolution);

    const clampedX = Math.max(0, Math.min(field.resolution - 1, x));
    const clampedY = Math.max(0, Math.min(field.resolution - 1, y));
    const clampedZ = Math.max(0, Math.min(field.resolution - 1, z));

    return field.grid[clampedX][clampedY][clampedZ];
  }

  private updatePheromoneGradient(
    field: PheromoneField,
    x: number,
    y: number,
    z: number,
  ): void {
    const cell = field.grid[x][y][z];
    const gradient = [0, 0, 0];

    // Calculate gradient from neighboring cells
    const neighbors = [
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 },
    ];

    for (const { dx, dy, dz } of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;

      if (nx >= 0 && nx < field.resolution &&
          ny >= 0 && ny < field.resolution &&
          nz >= 0 && nz < field.resolution) {

        const neighborCell = field.grid[nx][ny][nz];

        // Sum pheromone intensities
        let totalIntensity = 0;
        for (const intensity of neighborCell.deposits.values()) {
          totalIntensity += intensity;
        }

        let currentIntensity = 0;
        for (const intensity of cell.deposits.values()) {
          currentIntensity += intensity;
        }

        const diff = totalIntensity - currentIntensity;
        gradient[0] += dx * diff;
        gradient[1] += dy * diff;
        gradient[2] += dz * diff;
      }
    }

    // Normalize gradient
    const magnitude = Math.sqrt(
      gradient[0] * gradient[0] +
      gradient[1] * gradient[1] +
      gradient[2] * gradient[2],
    );

    if (magnitude > 0) {
      cell.gradient = gradient.map(g => g / magnitude);
    } else {
      cell.gradient = [0, 0, 0];
    }
  }

  private addPheromoneDeposit(
    field: PheromoneField,
    deposit: PheromoneDeposit,
  ): void {
    const cell = this.getCell(field, deposit.position);

    const currentIntensity = cell.deposits.get(deposit.type) || 0;
    const newIntensity = Math.min(
      field.maxIntensity,
      currentIntensity + deposit.strength,
    );

    cell.deposits.set(deposit.type, newIntensity);
    cell.lastUpdate = Date.now();
  }

  private diffusePheromones(field: PheromoneField): void {
    // Create temporary grid for diffusion
    const newGrid: Map<string, Map<PheromoneType, number>> = new Map();

    // Calculate diffusion
    for (let x = 0; x < field.resolution; x++) {
      for (let y = 0; y < field.resolution; y++) {
        for (let z = 0; z < field.resolution; z++) {
          const cell = field.grid[x][y][z];
          const key = `${x},${y},${z}`;

          if (!newGrid.has(key)) {
            newGrid.set(key, new Map());
          }

          // Diffuse to neighbors
          const neighbors = [
            { dx: 1, dy: 0, dz: 0 },
            { dx: -1, dy: 0, dz: 0 },
            { dx: 0, dy: 1, dz: 0 },
            { dx: 0, dy: -1, dz: 0 },
            { dx: 0, dy: 0, dz: 1 },
            { dx: 0, dy: 0, dz: -1 },
          ];

          for (const [type, intensity] of cell.deposits) {
            const diffusionAmount = intensity * field.diffusionRate / 6;

            for (const { dx, dy, dz } of neighbors) {
              const nx = x + dx;
              const ny = y + dy;
              const nz = z + dz;

              if (nx >= 0 && nx < field.resolution &&
                  ny >= 0 && ny < field.resolution &&
                  nz >= 0 && nz < field.resolution) {

                const nKey = `${nx},${ny},${nz}`;
                if (!newGrid.has(nKey)) {
                  newGrid.set(nKey, new Map());
                }

                const nDeposits = newGrid.get(nKey)!;
                const currentAmount = nDeposits.get(type) || 0;
                nDeposits.set(type, currentAmount + diffusionAmount);
              }
            }

            // Keep remaining intensity
            const deposits = newGrid.get(key)!;
            const remaining = deposits.get(type) || 0;
            deposits.set(type, remaining + intensity * (1 - field.diffusionRate));
          }
        }
      }
    }

    // Apply diffused values
    for (let x = 0; x < field.resolution; x++) {
      for (let y = 0; y < field.resolution; y++) {
        for (let z = 0; z < field.resolution; z++) {
          const key = `${x},${y},${z}`;
          const deposits = newGrid.get(key);

          if (deposits) {
            field.grid[x][y][z].deposits = deposits;
          }
        }
      }
    }
  }

  private levyFlight(position: Position, searchSpace: SearchSpace): Position {
    const beta = 1.5; // Levy index
    const sigma = Math.pow(
      (this.gamma(1 + beta) * Math.sin(Math.PI * beta / 2)) /
      (this.gamma((1 + beta) / 2) * beta * Math.pow(2, (beta - 1) / 2)),
      1 / beta,
    );

    const dimensions: number[] = [];

    for (let i = 0; i < position.dimensions.length; i++) {
      const u = this.gaussianRandom() * sigma;
      const v = this.gaussianRandom();
      const step = u / Math.pow(Math.abs(v), 1 / beta);

      const dim = searchSpace.dimensions[i];
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        const range = max - min;
        const newValue = position.dimensions[i] + step * range * 0.01;

        // Apply boundaries
        dimensions.push(Math.max(min, Math.min(max, newValue)));
      } else {
        dimensions.push(position.dimensions[i]);
      }
    }

    return {
      dimensions,
      confidence: position.confidence * 0.9, // Slightly less confident
      timestamp: Date.now(),
    };
  }

  private gamma(z: number): number {
    // Stirling's approximation for gamma function
    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
    }

    const g = 7;
    const n = 9;
    const C = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7,
    ];

    z -= 1;
    let x = C[0];
    for (let i = 1; i < n; i++) {
      x += C[i] / (z + i);
    }

    const t = z + g + 0.5;
    const sqrt2pi = Math.sqrt(2 * Math.PI);

    return sqrt2pi * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) {u = Math.random();}
    while (v === 0) {v = Math.random();}
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private gaussianNoise(scale: number): number[] {
    const noise: number[] = [];
    for (let i = 0; i < 3; i++) {
      noise.push(this.gaussianRandom() * scale);
    }
    return noise;
  }

  private async evaluateFitness(
    position: Position,
    _problem: ProblemDefinition,
  ): Promise<number> {
    // This would call the actual evaluation function
    // For now, return a mock fitness based on position
    let fitness = 0;

    for (let i = 0; i < position.dimensions.length; i++) {
      fitness += Math.sin(position.dimensions[i] * Math.PI);
    }

    return Math.max(0, Math.min(1, fitness / position.dimensions.length));
  }

  private updateAgentMovement(agent: SwarmAgent, swarm: SwarmIntelligence): void {
    // Apply velocity with inertia
    for (let i = 0; i < agent.position.dimensions.length; i++) {
      agent.position.dimensions[i] +=
        agent.velocity.components[i] * agent.velocity.inertia;
    }

    // Apply boundaries
    const { searchSpace } = swarm.problem;
    for (let i = 0; i < agent.position.dimensions.length; i++) {
      const dim = searchSpace.dimensions[i];
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];

        // Apply boundary conditions
        for (const boundary of searchSpace.boundaries) {
          if (boundary.dimension === i) {
            switch (boundary.type) {
              case 'wall':
                agent.position.dimensions[i] = Math.max(min, Math.min(max, agent.position.dimensions[i]));
                if (agent.position.dimensions[i] === min || agent.position.dimensions[i] === max) {
                  agent.velocity.components[i] = 0;
                }
                break;
              case 'wrap':
                if (agent.position.dimensions[i] < min) {
                  agent.position.dimensions[i] = max - (min - agent.position.dimensions[i]);
                } else if (agent.position.dimensions[i] > max) {
                  agent.position.dimensions[i] = min + (agent.position.dimensions[i] - max);
                }
                break;
              case 'reflect':
                if (agent.position.dimensions[i] < min || agent.position.dimensions[i] > max) {
                  agent.velocity.components[i] *= -1;
                  agent.position.dimensions[i] = Math.max(min, Math.min(max, agent.position.dimensions[i]));
                }
                break;
            }
          }
        }
      }
    }

    // Update velocity magnitude
    agent.velocity.magnitude = Math.sqrt(
      agent.velocity.components.reduce((sum, c) => sum + c * c, 0),
    );

    // Update position timestamp
    agent.position.timestamp = Date.now();
  }

  private updateAgentEnergy(agent: SwarmAgent, _swarm: SwarmIntelligence): void {
    // Energy consumption based on activity
    const energyCost: Record<ActivityState, number> = {
      foraging: 0.01,
      recruiting: 0.02,
      following: 0.005,
      dancing: 0.03,
      building: 0.02,
      converging: 0.01,
      diverging: 0.015,
      synchronizing: 0.01,
      innovating: 0.025,
    };

    agent.state.energy -= energyCost[agent.state.activity] || 0.01;

    // Energy recovery based on fitness
    agent.state.energy += agent.fitness * 0.005;

    // Clamp energy
    agent.state.energy = Math.max(0, Math.min(1, agent.state.energy));

    // Low energy affects behavior
    if (agent.state.energy < 0.2) {
      agent.state.exploration *= 0.5; // Conserve energy
      agent.velocity.inertia *= 0.8;
    }
  }

  private detectClustering(swarm: SwarmIntelligence): Formation[] {
    const formations: Formation[] = [];
    const visited = new Set<string>();
    const threshold = 0.2; // Distance threshold for clustering

    for (const agent of swarm.agents.values()) {
      if (visited.has(agent.id)) {continue;}

      const cluster: string[] = [agent.id];
      visited.add(agent.id);

      // Find nearby agents
      const queue = [agent];
      while (queue.length > 0) {
        const current = queue.shift()!;

        for (const other of swarm.agents.values()) {
          if (!visited.has(other.id)) {
            const distance = this.calculateDistance(
              current.position,
              other.position,
            );

            if (distance < threshold) {
              cluster.push(other.id);
              visited.add(other.id);
              queue.push(other);
            }
          }
        }
      }

      if (cluster.length > 3) {
        // Calculate cluster center
        const center: Position = {
          dimensions: new Array(swarm.problem.dimensions).fill(0),
          confidence: 0,
          timestamp: Date.now(),
        };

        for (const agentId of cluster) {
          const agent = swarm.agents.get(agentId)!;
          for (let i = 0; i < center.dimensions.length; i++) {
            center.dimensions[i] += agent.position.dimensions[i];
          }
          center.confidence += agent.position.confidence;
        }

        for (let i = 0; i < center.dimensions.length; i++) {
          center.dimensions[i] /= cluster.length;
        }
        center.confidence /= cluster.length;

        formations.push({
          type: 'cluster',
          members: cluster,
          center,
          radius: threshold,
          stability: 0.7,
        });
      }
    }

    return formations;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    let sum = 0;
    for (let i = 0; i < pos1.dimensions.length; i++) {
      const diff = pos1.dimensions[i] - pos2.dimensions[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private detectCascades(swarm: SwarmIntelligence): InformationCascade[] {
    const cascades: InformationCascade[] = [];

    // Track information spread through messages
    const messageGroups = new Map<string, SwarmMessage[]>();

    for (const agent of swarm.agents.values()) {
      for (const message of agent.messages) {
        const { topic } = message.content;
        if (!messageGroups.has(topic)) {
          messageGroups.set(topic, []);
        }
        messageGroups.get(topic)!.push(message);
      }
    }

    // Analyze cascade patterns
    for (const [topic, messages] of messageGroups) {
      if (messages.length > swarm.agents.size * 0.2) {
        // Find cascade initiator
        const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
        const initiator = sortedMessages[0].senderId;

        // Track adopters
        const adopters = new Set(messages.map(m => m.senderId));

        // Calculate spread speed
        const timeSpan = sortedMessages[sortedMessages.length - 1].timestamp -
                        sortedMessages[0].timestamp;
        const speed = adopters.size / (timeSpan / 1000); // Adoptions per second

        cascades.push({
          id: `cascade-${topic}-${Date.now()}`,
          initiator,
          information: topic,
          spread: adopters.size / swarm.agents.size,
          adopters: Array.from(adopters),
          resisters: [], // Would need to track who didn't adopt
          speed,
        });
      }
    }

    return cascades;
  }

  private detectSynchronization(swarm: SwarmIntelligence): Synchronization | null {
    // Detect phase synchronization in agent activities
    const activityCounts = new Map<ActivityState, number>();

    for (const agent of swarm.agents.values()) {
      const count = activityCounts.get(agent.state.activity) || 0;
      activityCounts.set(agent.state.activity, count + 1);
    }

    // Find dominant activity
    let maxActivity: ActivityState | null = null;
    let maxCount = 0;

    for (const [activity, count] of activityCounts) {
      if (count > maxCount) {
        maxCount = count;
        maxActivity = activity;
      }
    }

    const coherence = maxCount / swarm.agents.size;

    if (coherence > 0.6 && maxActivity) {
      const participants = Array.from(swarm.agents.values())
        .filter(a => a.state.activity === maxActivity)
        .map(a => a.id);

      return {
        type: 'phase',
        participants,
        coherence,
        period: 0, // Would need to track oscillation period
      };
    }

    return null;
  }

  private detectInnovations(swarm: SwarmIntelligence): Innovation[] {
    const innovations: Innovation[] = [];
    const knowledge = this.knowledgeBase.get(swarm.swarmId);

    if (!knowledge) {return innovations;}

    // Detect new patterns that weren't seen before
    for (const agent of swarm.agents.values()) {
      for (const pattern of agent.memory.patterns) {
        // Check if this pattern is novel
        const isNovel = !knowledge.patterns.some(
          p => this.arePatternsEqual(p, pattern),
        );

        if (isNovel && pattern.reliability > 0.7) {
          innovations.push({
            id: `innovation-${Date.now()}-${agent.id}`,
            innovatorId: agent.id,
            type: 'accident', // Default to accidental discovery
            parent: [],
            description: pattern.description,
            fitness: pattern.reliability,
            adopted: false,
            adopters: [],
          });
        }
      }
    }

    return innovations;
  }

  private arePatternsEqual(p1: any, p2: Pattern): boolean {
    // Simple pattern comparison - would be more sophisticated in real implementation
    return p1.description === p2.description;
  }

  private cleanupEmergentPatterns(swarm: SwarmIntelligence): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    // Clean up old patterns
    swarm.emergence.patterns = swarm.emergence.patterns.filter(p => {
      // Keep if still strong or recent
      return p.strength > 0.3 || (now - parseInt(p.id.split('-')[1])) < maxAge;
    });

    // Clean up old formations
    swarm.emergence.formations = swarm.emergence.formations.filter(f => {
      // Keep if still has members
      const stillExists = f.members.every(id => swarm.agents.has(id));
      return stillExists && f.stability > 0.2;
    });

    // Clean up completed cascades
    swarm.emergence.cascades = swarm.emergence.cascades.filter(c => {
      return c.spread < 0.95; // Keep if not fully spread
    });

    // Keep recent synchronizations
    swarm.emergence.synchronizations = swarm.emergence.synchronizations.slice(-10);

    // Keep successful innovations
    swarm.emergence.innovations = swarm.emergence.innovations.filter(i => {
      return i.adopted || i.fitness > 0.5;
    });
  }

  private generateProposals(swarm: SwarmIntelligence): Proposal[] {
    const proposals: Proposal[] = [];
    const topAgents = Array.from(swarm.agents.values())
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, Math.ceil(swarm.agents.size * 0.1));

    for (const agent of topAgents) {
      if (agent.fitness > swarm.performance.solutionQuality) {
        proposals.push({
          id: `proposal-${Date.now()}-${agent.id}`,
          proposerId: agent.id,
          content: {
            position: agent.position,
            fitness: agent.fitness,
            strategy: agent.state.activity,
          },
          fitness: agent.fitness,
          support: 0,
          timestamp: Date.now(),
        });
      }
    }

    return proposals;
  }

  private async honeybeeConsensus(swarm: SwarmIntelligence): Promise<void> {
    const { consensus } = swarm;

    // Waggle dance phase - agents advertise their proposals
    for (const proposal of consensus.proposals) {
      const proposer = swarm.agents.get(proposal.proposerId);
      if (!proposer || proposer.state.activity !== 'dancing') {continue;}

      // Duration proportional to quality
      // Note: Duration could be used to affect observation probability

      // Recruit followers
      for (const agent of swarm.agents.values()) {
        if (agent.id === proposal.proposerId) {continue;}

        const distance = this.calculateDistance(agent.position, proposer.position);
        const observationProbability = Math.exp(-distance);

        if (Math.random() < observationProbability) {
          // Agent observes dance
          const followProbability = proposal.fitness * 0.8;

          if (Math.random() < followProbability) {
            // Vote for proposal
            if (!consensus.votes.has(proposal.id)) {
              consensus.votes.set(proposal.id, []);
            }

            consensus.votes.get(proposal.id)!.push({
              voterId: agent.id,
              proposalId: proposal.id,
              value: 1,
              confidence: proposal.fitness,
              timestamp: Date.now(),
            });

            proposal.support++;
          }
        }
      }
    }

    consensus.rounds++;
  }

  private updateConsensusMetrics(swarm: SwarmIntelligence): void {
    const { consensus } = swarm;

    // Calculate agreement level
    let maxSupport = 0;
    let totalSupport = 0;

    for (const proposal of consensus.proposals) {
      totalSupport += proposal.support;
      maxSupport = Math.max(maxSupport, proposal.support);
    }

    consensus.agreement = swarm.agents.size > 0 ? maxSupport / swarm.agents.size : 0;

    // Calculate stability (how much agreement changes between rounds)
    consensus.stability = 1 - Math.abs(consensus.agreement - swarm.state.convergence);

    // Update swarm convergence
    swarm.state.convergence = consensus.agreement;

    // Identify dissenters
    const voters = new Set<string>();
    for (const votes of consensus.votes.values()) {
      for (const vote of votes) {
        voters.add(vote.voterId);
      }
    }

    consensus.dissenters = Array.from(swarm.agents.keys())
      .filter(id => !voters.has(id));
  }

  private extractPatterns(swarm: SwarmIntelligence): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Analyze successful agent behaviors
    for (const agent of swarm.agents.values()) {
      if (agent.fitness > swarm.performance.solutionQuality * 1.2) {
        // Extract pattern from successful behavior
        const pattern: LearnedPattern = {
          id: `pattern-${Date.now()}-${agent.id}`,
          trigger: [
            {
              field: 'fitness',
              operator: 'gt',
              value: swarm.performance.solutionQuality,
            },
          ],
          response: [
            {
              type: 'change-activity',
              target: 'self',
              parameters: { activity: agent.state.activity },
            },
          ],
          success: 1,
          failures: 0,
          adaptations: [],
        };

        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private developStrategies(
    patterns: LearnedPattern[],
    _swarm: SwarmIntelligence,
  ): Strategy[] {
    const strategies: Strategy[] = [];

    // Group patterns by similarity
    const patternGroups = this.groupPatterns(patterns);

    for (const group of patternGroups) {
      if (group.length >= 3) {
        // Develop strategy from pattern group
        const strategy: Strategy = {
          id: `strategy-${Date.now()}`,
          name: `strategy-${strategies.length}`,
          conditions: group[0].trigger, // Use most common trigger
          actions: group[0].response,    // Use most common response
          performance: group.reduce((sum, p) => sum + p.success, 0) / group.length,
        };

        strategies.push(strategy);
      }
    }

    return strategies;
  }

  private groupPatterns(patterns: LearnedPattern[]): LearnedPattern[][] {
    // Simple grouping - in reality would use clustering
    const groups: LearnedPattern[][] = [];
    const used = new Set<string>();

    for (const pattern of patterns) {
      if (used.has(pattern.id)) {continue;}

      const group = [pattern];
      used.add(pattern.id);

      // Find similar patterns
      for (const other of patterns) {
        if (!used.has(other.id) && this.areSimilarPatterns(pattern, other)) {
          group.push(other);
          used.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areSimilarPatterns(p1: LearnedPattern, p2: LearnedPattern): boolean {
    // Check if triggers are similar
    if (p1.trigger.length !== p2.trigger.length) {return false;}

    for (let i = 0; i < p1.trigger.length; i++) {
      if (p1.trigger[i].field !== p2.trigger[i].field ||
          p1.trigger[i].operator !== p2.trigger[i].operator) {
        return false;
      }
    }

    // Check if responses are similar
    if (p1.response.length !== p2.response.length) {return false;}

    for (let i = 0; i < p1.response.length; i++) {
      if (p1.response[i].type !== p2.response[i].type) {
        return false;
      }
    }

    return true;
  }

  private createHeuristics(swarm: SwarmIntelligence): Heuristic[] {
    const heuristics: Heuristic[] = [];

    // Create heuristics based on swarm performance
    if (swarm.state.convergence > 0.8) {
      heuristics.push({
        id: `heuristic-${Date.now()}-convergence`,
        rule: 'When convergence is high, reduce exploration',
        applicability: [
          {
            field: 'convergence',
            operator: 'gt',
            value: 0.8,
          },
        ],
        effectiveness: 0.8,
      });
    }

    if (swarm.state.diversity < 0.2) {
      heuristics.push({
        id: `heuristic-${Date.now()}-diversity`,
        rule: 'When diversity is low, increase temperature',
        applicability: [
          {
            field: 'diversity',
            operator: 'lt',
            value: 0.2,
          },
        ],
        effectiveness: 0.7,
      });
    }

    return heuristics;
  }

  private async shareKnowledge(
    swarm: SwarmIntelligence,
    knowledge: CollectiveKnowledge,
  ): Promise<void> {
    // Share successful strategies with all agents
    for (const agent of swarm.agents.values()) {
      // Add top strategies to agent knowledge
      const topStrategies = knowledge.strategies
        .sort((a, b) => b.performance - a.performance)
        .slice(0, 3);

      for (const strategy of topStrategies) {
        agent.state.knowledge.push({
          id: `shared-${strategy.id}`,
          type: 'strategy',
          content: strategy,
          source: 'collective',
          confidence: strategy.performance,
        });
      }

      // Share high-confidence facts
      const importantFacts = knowledge.facts
        .filter(f => f.confidence > 0.8)
        .slice(0, 5);

      for (const fact of importantFacts) {
        agent.state.knowledge.push({
          id: `shared-${fact.id}`,
          type: 'fact',
          content: fact.content,
          source: 'collective',
          confidence: fact.confidence,
        });
      }
    }
  }

  private pruneKnowledge(knowledge: CollectiveKnowledge): void {
    // Remove low-performing strategies
    knowledge.strategies = knowledge.strategies.filter(s => s.performance > 0.3);

    // Remove contradicted facts
    knowledge.facts = knowledge.facts.filter(f => f.contradictions.length === 0);

    // Remove failed patterns
    knowledge.patterns = knowledge.patterns.filter(p =>
      p.failures < p.success * 2,
    );

    // Remove ineffective heuristics
    knowledge.heuristics = knowledge.heuristics.filter(h => h.effectiveness > 0.3);

    // Keep only adopted innovations
    knowledge.innovations = knowledge.innovations.filter(i =>
      i.adopted || i.fitness > 0.8,
    );
  }

  private shouldTerminate(swarm: SwarmIntelligence): boolean {
    // Check various termination criteria
    const config = this.getSwarmConfig(swarm.swarmId);
    if (!config) {return false;}

    const criteria = config.termination;

    // Check max iterations (would need to track)
    // Check target fitness
    if (swarm.performance.solutionQuality >= criteria.targetFitness) {
      return true;
    }

    // Check stagnation
    const history = this.performanceHistory.get(swarm.swarmId) || [];
    if (history.length >= criteria.stagnationLimit) {
      const recent = history.slice(-criteria.stagnationLimit);
      const improvement = recent[recent.length - 1].solutionQuality -
                         recent[0].solutionQuality;

      if (improvement < 0.01) {
        return true;
      }
    }

    // Check consensus
    if (swarm.consensus.agreement >= criteria.consensusThreshold) {
      return true;
    }

    return false;
  }

  private getSwarmConfig(_swarmId: string): SwarmConfig | null {
    // Would retrieve stored config
    return null;
  }

  private updatePerformance(swarm: SwarmIntelligence): void {
    const performance: SwarmPerformance = {
      efficiency: this.calculateEfficiency(swarm),
      scalability: this.calculateScalability(swarm),
      robustness: this.calculateRobustness(swarm),
      adaptability: this.calculateAdaptability(swarm),
      convergenceSpeed: this.calculateConvergenceSpeed(swarm),
      solutionQuality: this.calculateSolutionQuality(swarm),
      resourceUsage: this.calculateResourceUsage(swarm),
      communicationOverhead: this.calculateCommunicationOverhead(swarm),
      emergenceIndex: this.calculateEmergenceIndex(swarm),
    };

    swarm.performance = performance;

    // Track history
    const history = this.performanceHistory.get(swarm.swarmId) || [];
    history.push(performance);

    // Keep last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    this.performanceHistory.set(swarm.swarmId, history);
  }

  private calculateEfficiency(swarm: SwarmIntelligence): number {
    // Ratio of solution quality to resources used
    const avgEnergy = Array.from(swarm.agents.values())
      .reduce((sum, a) => sum + a.state.energy, 0) / swarm.agents.size;

    return swarm.performance.solutionQuality / (2 - avgEnergy);
  }

  private calculateScalability(swarm: SwarmIntelligence): number {
    // How well performance scales with swarm size
    // For now, assume good scalability if convergence is maintained
    return swarm.state.convergence * (1 - 1 / Math.sqrt(swarm.agents.size));
  }

  private calculateRobustness(swarm: SwarmIntelligence): number {
    // Ability to maintain performance despite disturbances
    const lowEnergyAgents = Array.from(swarm.agents.values())
      .filter(a => a.state.energy < 0.3).length;

    return 1 - (lowEnergyAgents / swarm.agents.size);
  }

  private calculateAdaptability(swarm: SwarmIntelligence): number {
    // Ability to adapt to changing conditions
    const innovationRate = swarm.emergence.innovations.length / swarm.agents.size;
    const learningRate = (this.knowledgeBase.get(swarm.swarmId)?.strategies.length || 0) / 10;

    return Math.min(1, (innovationRate + learningRate) / 2);
  }

  private calculateConvergenceSpeed(swarm: SwarmIntelligence): number {
    // Rate of convergence
    const history = this.performanceHistory.get(swarm.swarmId) || [];
    if (history.length < 2) {return 0;}

    const recent = history.slice(-10);
    const convergenceRate = recent[recent.length - 1].solutionQuality -
                           recent[0].solutionQuality;

    return Math.max(0, Math.min(1, convergenceRate * 10));
  }

  private calculateSolutionQuality(swarm: SwarmIntelligence): number {
    // Best solution found so far
    let bestFitness = 0;

    for (const agent of swarm.agents.values()) {
      bestFitness = Math.max(bestFitness, agent.memory.bestFitness);
    }

    return bestFitness;
  }

  private calculateResourceUsage(swarm: SwarmIntelligence): number {
    // Average resource consumption
    const messages = this.messageQueue.get(swarm.swarmId)?.length || 0;
    const pheromones = Array.from(swarm.agents.values())
      .reduce((sum, a) => sum + a.pheromones.length, 0);

    const usage = (messages + pheromones) / (swarm.agents.size * 10);
    return Math.min(1, usage);
  }

  private calculateCommunicationOverhead(swarm: SwarmIntelligence): number {
    // Communication cost
    const messages = this.messageQueue.get(swarm.swarmId)?.length || 0;
    const maxMessages = swarm.agents.size * swarm.agents.size;

    return messages / maxMessages;
  }

  private calculateEmergenceIndex(swarm: SwarmIntelligence): number {
    // Measure of emergent behavior (collective > sum of parts)
    const collectiveQuality = swarm.performance.solutionQuality;
    const avgIndividualQuality = Array.from(swarm.agents.values())
      .reduce((sum, a) => sum + a.fitness, 0) / swarm.agents.size;

    const emergentPatterns = swarm.emergence.patterns.length;
    const formations = swarm.emergence.formations.length;
    const synchronizations = swarm.emergence.synchronizations.length;

    const structureBonus = (emergentPatterns + formations + synchronizations) * 0.05;

    return Math.max(0, (collectiveQuality / avgIndividualQuality - 1) + structureBonus);
  }

  private adjustTemperature(swarm: SwarmIntelligence): void {
    switch (swarm.state.phase) {
      case 'exploration':
        swarm.state.temperature = 0.8;
        break;
      case 'exploitation':
        swarm.state.temperature = 0.3;
        break;
      case 'stagnation':
        swarm.state.temperature = 0.9; // Heat up to escape
        break;
      case 'divergence':
        swarm.state.temperature = 1.0;
        break;
      case 'convergence':
        swarm.state.temperature = 0.1;
        break;
      case 'reorganization':
        swarm.state.temperature = 0.6;
        break;
      default:
        swarm.state.temperature = 0.5;
    }
  }

  // Additional consensus algorithms
  private async antColonyConsensus(swarm: SwarmIntelligence): Promise<void> {
    // Pheromone-based voting
    for (const proposal of swarm.consensus.proposals) {
      const { position } = (proposal.content as any);
      if (!position) {continue;}

      // Agents deposit pheromones on good proposals
      for (const agent of swarm.agents.values()) {
        const distance = this.calculateDistance(agent.position, position);

        if (distance < 0.3 && agent.fitness > 0.5) {
          // Deposit vote pheromone
          const deposit: PheromoneDeposit = {
            id: `vote-${proposal.id}-${agent.id}`,
            type: 'quality',
            position,
            strength: agent.fitness,
            evaporationRate: 0.05,
            depositorId: agent.id,
            timestamp: Date.now(),
            metadata: { proposalId: proposal.id },
          };

          agent.pheromones.push(deposit);
          proposal.support += agent.fitness;
        }
      }
    }
  }

  private async byzantineConsensus(swarm: SwarmIntelligence): Promise<void> {
    // Byzantine fault tolerant consensus
    const byzantineThreshold = Math.floor(swarm.agents.size / 3);

    for (const proposal of swarm.consensus.proposals) {
      const votes = swarm.consensus.votes.get(proposal.id) || [];

      // Require 2/3 majority
      if (votes.length > swarm.agents.size - byzantineThreshold) {
        proposal.support = votes.length / swarm.agents.size;
      }
    }
  }

  private async raftConsensus(swarm: SwarmIntelligence): Promise<void> {
    // Leader election based consensus
    // Select leader based on fitness
    let leader: SwarmAgent | null = null;
    let maxFitness = 0;

    for (const agent of swarm.agents.values()) {
      if (agent.fitness > maxFitness) {
        maxFitness = agent.fitness;
        leader = agent;
      }
    }

    if (leader) {
      // Leader proposes best solution
      const proposal: Proposal = {
        id: `leader-${Date.now()}`,
        proposerId: leader.id,
        content: {
          position: leader.position,
          fitness: leader.fitness,
        },
        fitness: leader.fitness,
        support: 1,
        timestamp: Date.now(),
      };

      swarm.consensus.proposals = [proposal];

      // Others follow leader
      for (const agent of swarm.agents.values()) {
        if (agent.id !== leader.id) {
          const vote: Vote = {
            voterId: agent.id,
            proposalId: proposal.id,
            value: 1,
            confidence: 0.8,
            timestamp: Date.now(),
          };

          if (!swarm.consensus.votes.has(proposal.id)) {
            swarm.consensus.votes.set(proposal.id, []);
          }
          swarm.consensus.votes.get(proposal.id)!.push(vote);
          proposal.support++;
        }
      }
    }
  }

  private async proofOfWorkConsensus(swarm: SwarmIntelligence): Promise<void> {
    // Computational effort based consensus
    for (const proposal of swarm.consensus.proposals) {
      // Agents "mine" by improving the proposal
      for (const agent of swarm.agents.values()) {
        if (agent.state.energy > 0.5) {
          // Spend energy to support proposal
          const work = agent.state.energy * agent.fitness;

          const vote: Vote = {
            voterId: agent.id,
            proposalId: proposal.id,
            value: work,
            confidence: agent.fitness,
            timestamp: Date.now(),
          };

          if (!swarm.consensus.votes.has(proposal.id)) {
            swarm.consensus.votes.set(proposal.id, []);
          }
          swarm.consensus.votes.get(proposal.id)!.push(vote);

          proposal.support += work;
          agent.state.energy *= 0.9; // Cost of work
        }
      }
    }
  }

  private async liquidConsensus(swarm: SwarmIntelligence): Promise<void> {
    // Delegated voting
    const delegations = new Map<string, string>();

    // Agents can delegate to higher fitness agents
    for (const agent of swarm.agents.values()) {
      let bestDelegate: SwarmAgent | null = null;
      let maxFitness = agent.fitness;

      for (const neighborId of agent.neighbors) {
        const neighbor = swarm.agents.get(neighborId);
        if (neighbor && neighbor.fitness > maxFitness * 1.2) {
          maxFitness = neighbor.fitness;
          bestDelegate = neighbor;
        }
      }

      if (bestDelegate) {
        delegations.set(agent.id, bestDelegate.id);
      }
    }

    // Count delegated votes
    for (const proposal of swarm.consensus.proposals) {
      const votes = new Map<string, number>();

      for (const agent of swarm.agents.values()) {
        let voterId = agent.id;
        let voteWeight = 1;

        // Follow delegation chain
        while (delegations.has(voterId)) {
          voterId = delegations.get(voterId)!;
          voteWeight *= 0.9; // Delegation decay
        }

        const currentWeight = votes.get(voterId) || 0;
        votes.set(voterId, currentWeight + voteWeight);
      }

      // Apply votes
      for (const [voterId, weight] of votes) {
        const voter = swarm.agents.get(voterId);
        if (voter && voter.fitness > 0.5) {
          proposal.support += weight * voter.fitness;
        }
      }
    }
  }

  private async holographicConsensus(swarm: SwarmIntelligence): Promise<void> {
    // Attention-weighted consensus
    for (const proposal of swarm.consensus.proposals) {
      let totalAttention = 0;

      // Calculate attention based on relevance
      for (const agent of swarm.agents.values()) {
        const relevance = this.calculateRelevance(agent, proposal, swarm);
        const attention = relevance * agent.state.influence;

        if (attention > 0.3) {
          const vote: Vote = {
            voterId: agent.id,
            proposalId: proposal.id,
            value: attention,
            confidence: relevance,
            timestamp: Date.now(),
          };

          if (!swarm.consensus.votes.has(proposal.id)) {
            swarm.consensus.votes.set(proposal.id, []);
          }
          swarm.consensus.votes.get(proposal.id)!.push(vote);

          totalAttention += attention;
        }
      }

      proposal.support = totalAttention / swarm.agents.size;
    }
  }

  private calculateRelevance(
    agent: SwarmAgent,
    proposal: Proposal,
    swarm: SwarmIntelligence,
  ): number {
    // Calculate how relevant this proposal is to the agent
    const proposalPosition = (proposal.content as any).position;
    if (!proposalPosition) {return 0;}

    const distance = this.calculateDistance(agent.position, proposalPosition);
    const similarity = Math.exp(-distance);

    // Factor in agent's expertise
    const expertise = agent.fitness / swarm.performance.solutionQuality;

    return similarity * expertise;
  }

  // Continued agent behaviors
  private async buildSolution(agent: SwarmAgent, swarm: SwarmIntelligence): Promise<void> {
    // Construct solution fragment
    const fragment: SolutionFragment = {
      id: `fragment-${Date.now()}-${agent.id}`,
      solverId: agent.id,
      subproblem: 'local-optimization',
      solution: {
        position: agent.position,
        fitness: agent.fitness,
        components: agent.state.knowledge,
      },
      dependencies: agent.neighbors,
      confidence: agent.fitness,
      validated: false,
    };

    // Share fragment
    const message: SwarmMessage = {
      id: `solution-${Date.now()}`,
      type: 'discovery',
      senderId: agent.id,
      recipientIds: 'broadcast',
      content: {
        topic: 'solution-fragment',
        data: fragment,
        confidence: agent.fitness,
        evidence: [],
      },
      priority: agent.fitness,
      ttl: 10,
      hops: 0,
      timestamp: Date.now(),
    };

    this.sendMessage(swarm.swarmId, message);

    // Continue building
    if (agent.fitness > 0.8) {
      agent.state.activity = 'recruiting';
    }
  }

  private async convergeToConsensus(agent: SwarmAgent, swarm: SwarmIntelligence): Promise<void> {
    // Move toward consensus position
    const bestProposal = swarm.consensus.proposals
      .sort((a, b) => b.support - a.support)[0];

    if (bestProposal) {
      const targetPosition = (bestProposal.content as any).position;
      if (targetPosition) {
        const direction = this.calculateDirection(agent.position, targetPosition);

        // Stronger convergence for lower fitness agents
        const convergenceStrength = 1 - agent.fitness;

        for (let i = 0; i < agent.velocity.components.length; i++) {
          agent.velocity.components[i] =
            (1 - convergenceStrength) * agent.velocity.components[i] +
            convergenceStrength * direction[i];
        }
      }
    }

    // Check if converged
    if (swarm.consensus.agreement > 0.8) {
      agent.state.activity = 'synchronizing';
    }
  }

  private async exploreAlternatives(agent: SwarmAgent, swarm: SwarmIntelligence): Promise<void> {
    // Diverge from current solutions
    const repulsion = new Array(agent.position.dimensions.length).fill(0);

    // Calculate repulsion from other agents
    for (const other of swarm.agents.values()) {
      if (other.id === agent.id) {continue;}

      const distance = this.calculateDistance(agent.position, other.position);
      if (distance < 0.5) {
        const direction = this.calculateDirection(other.position, agent.position);

        for (let i = 0; i < repulsion.length; i++) {
          repulsion[i] += direction[i] / (distance + 0.1);
        }
      }
    }

    // Apply repulsion
    for (let i = 0; i < agent.velocity.components.length; i++) {
      agent.velocity.components[i] += repulsion[i] * 0.5;
    }

    // Increase exploration
    agent.state.exploration = Math.min(1, agent.state.exploration * 1.2);

    // Random walk component
    const randomWalk = this.levyFlight(agent.position, swarm.problem.searchSpace);
    for (let i = 0; i < agent.velocity.components.length; i++) {
      agent.velocity.components[i] +=
        (randomWalk.dimensions[i] - agent.position.dimensions[i]) * 0.3;
    }
  }

  private async synchronizeWithSwarm(agent: SwarmAgent, swarm: SwarmIntelligence): Promise<void> {
    // Align with swarm behavior
    const avgVelocity = new Array(agent.velocity.components.length).fill(0);
    let count = 0;

    for (const neighborId of agent.neighbors) {
      const neighbor = swarm.agents.get(neighborId);
      if (neighbor) {
        for (let i = 0; i < avgVelocity.length; i++) {
          avgVelocity[i] += neighbor.velocity.components[i];
        }
        count++;
      }
    }

    if (count > 0) {
      // Average neighbor velocities
      for (let i = 0; i < avgVelocity.length; i++) {
        avgVelocity[i] /= count;
      }

      // Align velocity
      const alignmentStrength = 0.7;
      for (let i = 0; i < agent.velocity.components.length; i++) {
        agent.velocity.components[i] =
          (1 - alignmentStrength) * agent.velocity.components[i] +
          alignmentStrength * avgVelocity[i];
      }
    }

    // Synchronize activity
    const activities = new Map<ActivityState, number>();
    for (const neighborId of agent.neighbors) {
      const neighbor = swarm.agents.get(neighborId);
      if (neighbor) {
        const count = activities.get(neighbor.state.activity) || 0;
        activities.set(neighbor.state.activity, count + 1);
      }
    }

    // Adopt most common neighbor activity
    let maxActivity: ActivityState = agent.state.activity;
    let maxCount = 0;

    for (const [activity, count] of activities) {
      if (count > maxCount) {
        maxCount = count;
        maxActivity = activity;
      }
    }

    if (maxCount > agent.neighbors.length / 2) {
      agent.state.activity = maxActivity;
    }
  }

  private async innovate(agent: SwarmAgent, swarm: SwarmIntelligence): Promise<void> {
    // Try novel approaches
    const knowledge = this.knowledgeBase.get(swarm.swarmId);
    if (!knowledge) {return;}

    // Combine existing patterns in new ways
    if (agent.memory.patterns.length >= 2) {
      const p1 = agent.memory.patterns[Math.floor(Math.random() * agent.memory.patterns.length)];
      const p2 = agent.memory.patterns[Math.floor(Math.random() * agent.memory.patterns.length)];

      if (p1.id !== p2.id) {
        // Create hybrid pattern
        const hybrid: Pattern = {
          id: `hybrid-${Date.now()}`,
          description: `Combination of ${p1.description} and ${p2.description}`,
          frequency: 0,
          reliability: (p1.reliability + p2.reliability) / 2 * 0.8, // Slightly less reliable
        };

        agent.memory.patterns.push(hybrid);

        // Test innovation
        const testPosition = this.mutatePosition(agent.position, swarm.problem.searchSpace);
        const testFitness = await this.evaluateFitness(testPosition, swarm.problem);

        if (testFitness > agent.fitness * 1.1) {
          // Successful innovation
          const innovation: Innovation = {
            id: `innovation-${Date.now()}-${agent.id}`,
            innovatorId: agent.id,
            type: 'combination',
            parent: [p1.id, p2.id],
            description: hybrid.description,
            fitness: testFitness,
            adopted: false,
            adopters: [],
          };

          knowledge.innovations.push(innovation);

          // Share innovation
          const message: SwarmMessage = {
            id: `innovation-${innovation.id}`,
            type: 'innovation',
            senderId: agent.id,
            recipientIds: 'broadcast',
            content: {
              topic: 'new-innovation',
              data: innovation,
              confidence: testFitness,
              evidence: [],
            },
            priority: testFitness,
            ttl: 20,
            hops: 0,
            timestamp: Date.now(),
          };

          this.sendMessage(swarm.swarmId, message);

          // Adopt innovation
          agent.position = testPosition;
          agent.fitness = testFitness;
        }
      }
    }

    // Return to exploration
    agent.state.activity = 'foraging';
    agent.state.exploration = 0.8;
  }

  private mutatePosition(position: Position, searchSpace: SearchSpace): Position {
    const mutated: Position = {
      dimensions: [...position.dimensions],
      confidence: position.confidence * 0.9,
      timestamp: Date.now(),
    };

    // Mutate random dimensions
    const numMutations = Math.ceil(Math.random() * 3);

    for (let i = 0; i < numMutations; i++) {
      const dim = Math.floor(Math.random() * mutated.dimensions.length);
      const dimension = searchSpace.dimensions[dim];

      if (dimension.type === 'continuous') {
        const [min, max] = dimension.range as [number, number];
        const range = max - min;
        const mutation = (Math.random() - 0.5) * range * 0.1;

        mutated.dimensions[dim] = Math.max(min, Math.min(max,
          mutated.dimensions[dim] + mutation,
        ));
      }
    }

    return mutated;
  }

  private async handleRecruitment(
    agent: SwarmAgent,
    message: SwarmMessage,
    _swarm: SwarmIntelligence,
  ): Promise<void> {
    const recruitment = message.content.data as {
      position: Position;
      fitness: number;
    };

    // Decide whether to follow
    const followProbability = recruitment.fitness * message.content.confidence;

    if (Math.random() < followProbability && agent.state.activity === 'foraging') {
      agent.state.activity = 'following';

      // Update velocity toward recruitment location
      const direction = this.calculateDirection(agent.position, recruitment.position);

      for (let i = 0; i < agent.velocity.components.length; i++) {
        agent.velocity.components[i] =
          0.2 * agent.velocity.components[i] +
          0.8 * direction[i];
      }

      // Reduce exploration
      agent.state.exploration *= 0.5;
    }
  }

  private async handleWarning(
    agent: SwarmAgent,
    message: SwarmMessage,
    swarm: SwarmIntelligence,
  ): Promise<void> {
    const warning = message.content.data as {
      threat: string;
      position: Position;
      severity: number;
    };

    // React to warning
    if (warning.severity > 0.7) {
      // Move away from threat
      const direction = this.calculateDirection(warning.position, agent.position);

      for (let i = 0; i < agent.velocity.components.length; i++) {
        agent.velocity.components[i] += direction[i] * warning.severity;
      }

      // Increase caution
      agent.state.exploration *= 0.5;

      // Propagate warning
      if (message.hops < 3) {
        const propagatedMessage = { ...message };
        propagatedMessage.hops++;
        propagatedMessage.ttl--;
        propagatedMessage.recipientIds = agent.neighbors;

        this.sendMessage(swarm.swarmId, propagatedMessage);
      }
    }
  }

  private async handleCoordination(
    agent: SwarmAgent,
    message: SwarmMessage,
    _swarm: SwarmIntelligence,
  ): Promise<void> {
    const coordination = message.content.data as {
      action: string;
      target: Position;
      timing: number;
    };

    // Coordinate action
    agent.state.knowledge.push({
      id: `coord-${message.id}`,
      type: 'coordination',
      content: coordination,
      source: message.senderId,
      confidence: message.content.confidence,
    });

    // Adjust behavior for coordination
    if (coordination.action === 'converge') {
      agent.state.activity = 'converging';
    } else if (coordination.action === 'disperse') {
      agent.state.activity = 'diverging';
    }
  }

  private async handleInnovation(
    agent: SwarmAgent,
    message: SwarmMessage,
    _swarm: SwarmIntelligence,
  ): Promise<void> {
    const innovation = message.content.data as Innovation;

    // Evaluate innovation
    const adoptionProbability = innovation.fitness * message.content.confidence * 0.5;

    if (Math.random() < adoptionProbability) {
      // Adopt innovation
      agent.state.knowledge.push({
        id: `adopt-${innovation.id}`,
        type: 'innovation',
        content: innovation,
        source: message.senderId,
        confidence: innovation.fitness,
      });

      // Mark as adopter
      innovation.adopters.push(agent.id);
      innovation.adopted = true;

      // Adjust behavior
      agent.state.exploration = 0.6; // Moderate exploration
      agent.state.activity = 'innovating';
    }
  }

  private async handleEvaluation(
    agent: SwarmAgent,
    message: SwarmMessage,
    _swarm: SwarmIntelligence,
  ): Promise<void> {
    const evaluation = message.content.data as {
      target: string;
      quality: number;
      evidence: Evidence[];
    };

    // Update knowledge with evaluation
    agent.state.knowledge.push({
      id: `eval-${message.id}`,
      type: 'evaluation',
      content: evaluation,
      source: message.senderId,
      confidence: message.content.confidence,
    });

    // Adjust trust/influence based on evaluation accuracy
    // (Would need to track and verify evaluations)
  }

  private async handleHeartbeat(
    _agent: SwarmAgent,
    _message: SwarmMessage,
    _swarm: SwarmIntelligence,
  ): Promise<void> {
    // Update neighbor status
    // Could track neighbor health, last seen, etc.
  }

  /**
   * Get swarm solution
   */
  async getSolution(swarmId: string): Promise<DistributedSolution | null> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {return null;}

    // Find best solution
    let bestAgent: SwarmAgent | null = null;
    let bestFitness = 0;

    for (const agent of swarm.agents.values()) {
      if (agent.memory.bestFitness > bestFitness) {
        bestFitness = agent.memory.bestFitness;
        bestAgent = agent;
      }
    }

    if (!bestAgent) {return null;}

    // Collect solution fragments from top agents
    const fragments: SolutionFragment[] = [];
    const topAgents = Array.from(swarm.agents.values())
      .sort((a, b) => b.memory.bestFitness - a.memory.bestFitness)
      .slice(0, Math.ceil(swarm.agents.size * 0.2));

    for (const agent of topAgents) {
      fragments.push({
        id: `final-${agent.id}`,
        solverId: agent.id,
        subproblem: 'optimization',
        solution: {
          position: agent.memory.bestPosition,
          fitness: agent.memory.bestFitness,
          knowledge: agent.state.knowledge,
        },
        dependencies: [],
        confidence: agent.memory.bestFitness,
        validated: true,
      });
    }

    return {
      problemId: swarm.problem.id,
      fragments,
      assembly: 'weighted',
      quality: bestFitness,
      completeness: 1.0,
      contributors: topAgents.map(a => a.id),
      iterations: swarm.consensus.rounds,
    };
  }

  /**
   * Export swarm state for analysis
   */
  exportSwarmState(swarmId: string): any {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {return null;}

    return {
      swarmId,
      state: swarm.state,
      performance: swarm.performance,
      consensus: {
        algorithm: swarm.consensus.algorithm,
        agreement: swarm.consensus.agreement,
        rounds: swarm.consensus.rounds,
        proposals: swarm.consensus.proposals.length,
      },
      emergence: {
        patterns: swarm.emergence.patterns.length,
        formations: swarm.emergence.formations.length,
        cascades: swarm.emergence.cascades.length,
        synchronizations: swarm.emergence.synchronizations.length,
        innovations: swarm.emergence.innovations.length,
      },
      agents: Array.from(swarm.agents.values()).map(a => ({
        id: a.id,
        type: a.type,
        activity: a.state.activity,
        fitness: a.fitness,
        energy: a.state.energy,
        exploration: a.state.exploration,
      })),
    };
  }

  /**
   * Terminate swarm
   */
  terminateSwarm(swarmId: string): boolean {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {return false;}

    // Clean up resources
    this.swarms.delete(swarmId);
    this.messageQueue.delete(swarmId);
    this.pheromoneFields.delete(swarmId);
    this.knowledgeBase.delete(swarmId);
    this.performanceHistory.delete(swarmId);

    return true;
  }

  /**
   * Enable cross-swarm communication
   */
  enableCrossSwarmCommunication(swarmIds: string[]): void {
    // Implementation for cross-swarm communication
    for (const swarmId of swarmIds) {
      const swarm = this.swarms.get(swarmId);
      if (swarm) {
        // Enable communication between swarms
        swarm.config.communication = swarm.config.communication || { enabled: true, range: 10, frequency: 0.1, noise: 0.05 };
      }
    }
  }

  /**
   * Iterate over all swarms
   */
  iterateAll(): IterableIterator<SwarmIntelligence> {
    return this.swarms.values();
  }
}