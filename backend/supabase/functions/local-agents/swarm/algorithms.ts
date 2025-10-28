/**
 * Distributed Problem-Solving Algorithms
 *
 * Implementation of nature-inspired optimization algorithms for
 * collective intelligence and distributed problem solving.
 */

import {
  SwarmAgent,
  Position,
  Velocity,
  ProblemDefinition,
  AlgorithmParameters,
  PheromoneDeposit,
  SwarmMessage,
  SearchSpace,
  AlgorithmType,
  SwarmAgentType,
} from './types';

/**
 * Particle Swarm Optimization (PSO)
 *
 * Global optimization through particle movement in solution space
 */
export class ParticleSwarmOptimizer {
  private parameters: AlgorithmParameters;
  private globalBest: Position | null = null;
  private globalBestFitness: number = -Infinity;

  constructor(parameters: AlgorithmParameters) {
    this.parameters = {
      populationSize: parameters.populationSize || 30,
      inertiaWeight: parameters.inertiaWeight || 0.729,
      cognitiveWeight: parameters.cognitiveWeight || 1.49445,
      socialWeight: parameters.socialWeight || 1.49445,
      evaporationRate: parameters.evaporationRate || 0,
      explorationRate: parameters.explorationRate || 0.1,
      elitismRate: parameters.elitismRate || 0.1,
      mutationRate: parameters.mutationRate || 0.01,
      crossoverRate: parameters.crossoverRate || 0,
    };
  }

  /**
   * Initialize PSO agents as particles
   */
  initializeAgents(
    problem: ProblemDefinition,
    count: number,
  ): SwarmAgent[] {
    const agents: SwarmAgent[] = [];

    for (let i = 0; i < count; i++) {
      const position = this.randomPosition(problem.searchSpace);
      const velocity = this.randomVelocity(problem.searchSpace);

      const agent: SwarmAgent = {
        id: `pso-particle-${i}`,
        type: 'explorer',
        state: {
          energy: 1.0,
          activity: 'foraging',
          knowledge: [],
          currentTask: null,
          exploration: this.parameters.explorationRate,
          commitment: 0.8,
          influence: 1.0 / count,
        },
        position,
        velocity,
        fitness: 0,
        memory: {
          bestPosition: { ...position },
          bestFitness: 0,
          tabuList: [],
          shortcuts: new Map(),
          patterns: [],
        },
        neighbors: [], // Will be set by topology
        role: {
          primary: 'explorer',
          secondary: ['scout'],
          specialization: 0.8,
          flexibility: 0.2,
        },
        pheromones: [],
        messages: [],
      };

      agents.push(agent);
    }

    return agents;
  }

  /**
   * Update particle velocities and positions
   */
  updateParticles(
    agents: SwarmAgent[],
    problem: ProblemDefinition,
    _evaluationFn: (position: Position) => Promise<number>,
  ): void {
    for (const agent of agents) {
      // Update velocity using PSO equation
      this.updateVelocity(agent, problem);

      // Update position
      this.updatePosition(agent, problem);

      // Apply mutation for diversity
      if (Math.random() < this.parameters.mutationRate) {
        this.mutatePosition(agent, problem);
      }
    }
  }

  /**
   * PSO velocity update equation
   */
  private updateVelocity(agent: SwarmAgent, problem: ProblemDefinition): void {
    const w = this.parameters.inertiaWeight;
    const c1 = this.parameters.cognitiveWeight;
    const c2 = this.parameters.socialWeight;

    for (let i = 0; i < agent.velocity.components.length; i++) {
      const r1 = Math.random();
      const r2 = Math.random();

      // Cognitive component (personal best)
      const cognitive = c1 * r1 * (
        agent.memory.bestPosition.dimensions[i] -
        agent.position.dimensions[i]
      );

      // Social component (global best)
      const social = this.globalBest ?
        c2 * r2 * (
          this.globalBest.dimensions[i] -
          agent.position.dimensions[i]
        ) : 0;

      // Update velocity
      agent.velocity.components[i] =
        w * agent.velocity.components[i] + cognitive + social;

      // Velocity clamping
      const dim = problem.searchSpace.dimensions[i];
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        const maxVel = (max - min) * 0.2; // 20% of range
        agent.velocity.components[i] = Math.max(-maxVel,
          Math.min(maxVel, agent.velocity.components[i]),
        );
      }
    }

    // Update magnitude
    agent.velocity.magnitude = Math.sqrt(
      agent.velocity.components.reduce((sum, c) => sum + c * c, 0),
    );
  }

  /**
   * Update particle position
   */
  private updatePosition(agent: SwarmAgent, problem: ProblemDefinition): void {
    for (let i = 0; i < agent.position.dimensions.length; i++) {
      agent.position.dimensions[i] += agent.velocity.components[i];

      // Boundary handling
      const dim = problem.searchSpace.dimensions[i];
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];

        // Reflect at boundaries
        if (agent.position.dimensions[i] < min) {
          agent.position.dimensions[i] = min + (min - agent.position.dimensions[i]);
          agent.velocity.components[i] *= -0.5; // Dampen
        } else if (agent.position.dimensions[i] > max) {
          agent.position.dimensions[i] = max - (agent.position.dimensions[i] - max);
          agent.velocity.components[i] *= -0.5; // Dampen
        }
      }
    }

    agent.position.timestamp = Date.now();
  }

  /**
   * Update global best if new best found
   */
  updateGlobalBest(agent: SwarmAgent): boolean {
    if (agent.fitness > this.globalBestFitness) {
      this.globalBestFitness = agent.fitness;
      this.globalBest = { ...agent.position };
      return true;
    }
    return false;
  }

  /**
   * Apply constriction factor variant
   */
  applyConstriction(): void {
    const phi = this.parameters.cognitiveWeight + this.parameters.socialWeight;
    if (phi > 4) {
      const chi = 2 / Math.abs(2 - phi - Math.sqrt(phi * phi - 4 * phi));
      this.parameters.inertiaWeight = chi;
      this.parameters.cognitiveWeight *= chi;
      this.parameters.socialWeight *= chi;
    }
  }

  /**
   * Adaptive parameter adjustment
   */
  adaptParameters(iteration: number, maxIterations: number): void {
    // Linear decrease of inertia weight
    const wMax = 0.9;
    const wMin = 0.4;
    this.parameters.inertiaWeight = wMax - (wMax - wMin) * (iteration / maxIterations);

    // Increase exploitation over time
    this.parameters.explorationRate = 0.2 * (1 - iteration / maxIterations);
  }

  private randomPosition(searchSpace: SearchSpace): Position {
    const dimensions: number[] = [];

    for (const dim of searchSpace.dimensions) {
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        dimensions.push(min + Math.random() * (max - min));
      } else if (dim.type === 'discrete') {
        const values = dim.range as number[];
        dimensions.push(values[Math.floor(Math.random() * values.length)]);
      } else {
        dimensions.push(0);
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

    for (const dim of searchSpace.dimensions) {
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        const range = max - min;
        components.push((Math.random() - 0.5) * range * 0.1);
      } else {
        components.push(0);
      }
    }

    const magnitude = Math.sqrt(components.reduce((sum, c) => sum + c * c, 0));

    return {
      components,
      magnitude,
      inertia: this.parameters.inertiaWeight,
    };
  }

  private mutatePosition(agent: SwarmAgent, problem: ProblemDefinition): void {
    const mutationDim = Math.floor(Math.random() * agent.position.dimensions.length);
    const dim = problem.searchSpace.dimensions[mutationDim];

    if (dim.type === 'continuous') {
      const [min, max] = dim.range as [number, number];
      const range = max - min;
      const mutation = (Math.random() - 0.5) * range * 0.1;

      agent.position.dimensions[mutationDim] = Math.max(min,
        Math.min(max, agent.position.dimensions[mutationDim] + mutation),
      );
    }
  }
}

/**
 * Ant Colony Optimization (ACO)
 *
 * Stigmergic optimization through pheromone trails
 */
export class AntColonyOptimizer {
  private parameters: AlgorithmParameters;
  private pheromoneMatrix: Map<string, Map<string, number>> = new Map();
  private bestPath: string[] = [];
  private bestPathCost: number = Infinity;

  constructor(parameters: AlgorithmParameters) {
    this.parameters = {
      populationSize: parameters.populationSize || 50,
      inertiaWeight: parameters.inertiaWeight || 1,
      cognitiveWeight: parameters.cognitiveWeight || 2, // Alpha - pheromone weight
      socialWeight: parameters.socialWeight || 5,       // Beta - heuristic weight
      evaporationRate: parameters.evaporationRate || 0.1,
      explorationRate: parameters.explorationRate || 0.1,
      elitismRate: parameters.elitismRate || 0.1,
      mutationRate: parameters.mutationRate || 0,
      crossoverRate: parameters.crossoverRate || 0,
    };
  }

  /**
   * Initialize ACO agents as ants
   */
  initializeAgents(
    problem: ProblemDefinition,
    count: number,
  ): SwarmAgent[] {
    const agents: SwarmAgent[] = [];
    const startPosition = this.getStartPosition(problem);

    for (let i = 0; i < count; i++) {
      const agent: SwarmAgent = {
        id: `aco-ant-${i}`,
        type: 'worker',
        state: {
          energy: 1.0,
          activity: 'foraging',
          knowledge: [{
            id: 'start',
            type: 'position',
            content: startPosition,
            source: 'initial',
            confidence: 1.0,
          }],
          currentTask: {
            id: 'find-path',
            type: 'pathfinding',
            priority: 1,
            requirements: { target: 'goal' },
          },
          exploration: this.parameters.explorationRate,
          commitment: 0.9,
          influence: 1.0 / count,
        },
        position: { ...startPosition },
        velocity: {
          components: new Array(problem.dimensions).fill(0),
          magnitude: 0,
          inertia: 0,
        },
        fitness: 0,
        memory: {
          bestPosition: { ...startPosition },
          bestFitness: 0,
          tabuList: [], // Visited nodes
          shortcuts: new Map(),
          patterns: [],
        },
        neighbors: [],
        role: {
          primary: 'worker',
          secondary: ['scout', 'harvester'],
          specialization: 0.7,
          flexibility: 0.3,
        },
        pheromones: [],
        messages: [],
      };

      agents.push(agent);
    }

    return agents;
  }

  /**
   * Construct solutions by following pheromone trails
   */
  async constructSolutions(
    agents: SwarmAgent[],
    problem: ProblemDefinition,
    graph: Map<string, Map<string, number>>, // Adjacency with costs
  ): Promise<void> {
    for (const agent of agents) {
      const path = await this.constructPath(agent, problem, graph);
      const cost = this.evaluatePath(path, graph);

      // Update agent's solution
      agent.state.knowledge.push({
        id: `path-${Date.now()}`,
        type: 'solution',
        content: { path, cost },
        source: agent.id,
        confidence: 1.0 / cost, // Better paths have higher confidence
      });

      agent.fitness = 1.0 / cost; // Inverse of cost

      // Update best if improved
      if (cost < this.bestPathCost) {
        this.bestPathCost = cost;
        this.bestPath = [...path];
      }

      // Deposit pheromones on path
      this.depositPheromones(agent, path, cost);
    }
  }

  /**
   * Construct path using probabilistic selection
   */
  private async constructPath(
    agent: SwarmAgent,
    problem: ProblemDefinition,
    graph: Map<string, Map<string, number>>,
  ): Promise<string[]> {
    const path: string[] = [];
    const visited = new Set<string>();
    let current = this.positionToNode(agent.position);

    path.push(current);
    visited.add(current);
    agent.memory.tabuList = [current];

    while (!this.isGoalNode(current, problem)) {
      const neighbors = graph.get(current);
      if (!neighbors || neighbors.size === 0) {break;}

      // Calculate probabilities for each neighbor
      const probabilities = new Map<string, number>();
      let totalProb = 0;

      for (const [neighbor, cost] of neighbors) {
        if (!visited.has(neighbor)) {
          const pheromone = this.getPheromone(current, neighbor);
          const heuristic = 1.0 / cost; // Inverse distance

          const prob = Math.pow(pheromone, this.parameters.cognitiveWeight) *
                       Math.pow(heuristic, this.parameters.socialWeight);

          probabilities.set(neighbor, prob);
          totalProb += prob;
        }
      }

      // Select next node
      if (totalProb === 0) {break;} // Dead end

      const selected = this.rouletteWheelSelection(probabilities, totalProb);
      if (!selected) {break;}

      current = selected;
      path.push(current);
      visited.add(current);
      agent.memory.tabuList.push(current);

      // Update agent position
      agent.position = this.nodeToPosition(current, problem);
    }

    return path;
  }

  /**
   * Roulette wheel selection
   */
  private rouletteWheelSelection(
    probabilities: Map<string, number>,
    total: number,
  ): string | null {
    const random = Math.random() * total;
    let cumulative = 0;

    for (const [node, prob] of probabilities) {
      cumulative += prob;
      if (cumulative >= random) {
        return node;
      }
    }

    return null;
  }

  /**
   * Update pheromone trails
   */
  updatePheromones(): void {
    // Evaporate existing pheromones
    for (const [_from, toMap] of this.pheromoneMatrix) {
      for (const [to, value] of toMap) {
        const evaporated = value * (1 - this.parameters.evaporationRate);
        if (evaporated < 0.001) {
          toMap.delete(to);
        } else {
          toMap.set(to, evaporated);
        }
      }
    }
  }

  /**
   * Deposit pheromones on path
   */
  private depositPheromones(
    agent: SwarmAgent,
    path: string[],
    cost: number,
  ): void {
    const deposit = 1.0 / cost; // Better paths get more pheromone

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      // Create pheromone deposit for agent
      const pheromoneDeposit: PheromoneDeposit = {
        id: `pheromone-${Date.now()}-${agent.id}`,
        type: 'trail',
        position: this.nodeToPosition(from, { dimensions: 2 } as ProblemDefinition),
        strength: deposit,
        evaporationRate: this.parameters.evaporationRate,
        depositorId: agent.id,
        timestamp: Date.now(),
        metadata: { from, to },
      };

      agent.pheromones.push(pheromoneDeposit);

      // Update pheromone matrix
      if (!this.pheromoneMatrix.has(from)) {
        this.pheromoneMatrix.set(from, new Map());
      }

      const current = this.pheromoneMatrix.get(from)!.get(to) || 0.1;
      this.pheromoneMatrix.get(from)!.set(to, current + deposit);
    }
  }

  /**
   * Get pheromone level between nodes
   */
  private getPheromone(from: string, to: string): number {
    const fromMap = this.pheromoneMatrix.get(from);
    if (!fromMap) {return 0.1;} // Minimum pheromone
    return fromMap.get(to) || 0.1;
  }

  /**
   * Apply elitist strategy
   */
  applyElitism(_agents: SwarmAgent[]): void {
    if (this.bestPath.length === 0) {return;}

    // Extra pheromone on best path
    const eliteDeposit = this.parameters.elitismRate / this.bestPathCost;

    for (let i = 0; i < this.bestPath.length - 1; i++) {
      const from = this.bestPath[i];
      const to = this.bestPath[i + 1];

      if (!this.pheromoneMatrix.has(from)) {
        this.pheromoneMatrix.set(from, new Map());
      }

      const current = this.pheromoneMatrix.get(from)!.get(to) || 0.1;
      this.pheromoneMatrix.get(from)!.set(to, current + eliteDeposit);
    }
  }

  /**
   * Max-Min Ant System (MMAS) bounds
   */
  applyPheromongBounds(): void {
    const tauMax = 1.0 / (this.parameters.evaporationRate * this.bestPathCost);
    const tauMin = tauMax / 50; // Heuristic ratio

    for (const [_from, toMap] of this.pheromoneMatrix) {
      for (const [to, value] of toMap) {
        const bounded = Math.max(tauMin, Math.min(tauMax, value));
        toMap.set(to, bounded);
      }
    }
  }

  private getStartPosition(problem: ProblemDefinition): Position {
    // Return origin or first valid position
    return {
      dimensions: new Array(problem.dimensions).fill(0),
      confidence: 1.0,
      timestamp: Date.now(),
    };
  }

  private positionToNode(position: Position): string {
    // Convert position to discrete node identifier
    return position.dimensions.map(d => Math.round(d)).join(',');
  }

  private nodeToPosition(node: string, _problem: ProblemDefinition): Position {
    const dims = node.split(',').map(Number);
    return {
      dimensions: dims,
      confidence: 1.0,
      timestamp: Date.now(),
    };
  }

  private isGoalNode(_node: string, _problem: ProblemDefinition): boolean {
    // Check if reached goal - would depend on problem
    return false; // Placeholder
  }

  private evaluatePath(path: string[], graph: Map<string, Map<string, number>>): number {
    let cost = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const neighbors = graph.get(from);

      if (neighbors) {
        cost += neighbors.get(to) || Infinity;
      }
    }

    return cost;
  }
}

/**
 * Artificial Bee Colony (ABC)
 *
 * Division of labor optimization with scouts, workers, and onlookers
 */
export class BeeColonyOptimizer {
  private parameters: AlgorithmParameters;
  private foodSources: Map<string, FoodSource> = new Map();
  private abandonmentLimit: number = 100;

  constructor(parameters: AlgorithmParameters) {
    this.parameters = {
      populationSize: parameters.populationSize || 40,
      inertiaWeight: parameters.inertiaWeight || 1,
      cognitiveWeight: parameters.cognitiveWeight || 1,
      socialWeight: parameters.socialWeight || 1,
      evaporationRate: parameters.evaporationRate || 0,
      explorationRate: parameters.explorationRate || 0.5,
      elitismRate: parameters.elitismRate || 0.1,
      mutationRate: parameters.mutationRate || 0.1,
      crossoverRate: parameters.crossoverRate || 0,
    };
  }

  /**
   * Initialize ABC agents as bees
   */
  initializeAgents(
    problem: ProblemDefinition,
    count: number,
  ): SwarmAgent[] {
    const agents: SwarmAgent[] = [];
    const numEmployed = Math.floor(count / 2);
    const numOnlooker = Math.floor(count / 2);
    const numScout = count - numEmployed - numOnlooker;

    // Create employed bees
    for (let i = 0; i < numEmployed; i++) {
      const position = this.randomPosition(problem.searchSpace);
      const foodSource: FoodSource = {
        position,
        fitness: 0,
        trials: 0,
        nectar: 1.0,
      };

      this.foodSources.set(`source-${i}`, foodSource);

      agents.push(this.createBee('worker', i, position, problem));
    }

    // Create onlooker bees
    for (let i = 0; i < numOnlooker; i++) {
      agents.push(this.createBee('aggregator', numEmployed + i,
        this.randomPosition(problem.searchSpace), problem));
    }

    // Create scout bees
    for (let i = 0; i < numScout; i++) {
      agents.push(this.createBee('scout', numEmployed + numOnlooker + i,
        this.randomPosition(problem.searchSpace), problem));
    }

    return agents;
  }

  /**
   * Create individual bee
   */
  private createBee(
    type: SwarmAgentType,
    id: number,
    position: Position,
    problem: ProblemDefinition,
  ): SwarmAgent {
    return {
      id: `abc-bee-${id}`,
      type,
      state: {
        energy: 1.0,
        activity: type === 'worker' ? 'foraging' :
                  type === 'scout' ? 'foraging' : 'following',
        knowledge: [],
        currentTask: null,
        exploration: type === 'scout' ? 0.8 : 0.3,
        commitment: type === 'worker' ? 0.8 : 0.5,
        influence: 1.0 / this.parameters.populationSize,
      },
      position,
      velocity: {
        components: new Array(problem.dimensions).fill(0),
        magnitude: 0,
        inertia: 0,
      },
      fitness: 0,
      memory: {
        bestPosition: { ...position },
        bestFitness: 0,
        tabuList: [],
        shortcuts: new Map(),
        patterns: [],
      },
      neighbors: [],
      role: {
        primary: type,
        secondary: type === 'worker' ? ['messenger'] :
                   type === 'scout' ? ['explorer'] : ['coordinator'],
        specialization: 0.8,
        flexibility: 0.2,
      },
      pheromones: [],
      messages: [],
    };
  }

  /**
   * Employed bee phase - exploit food sources
   */
  async employedBeePhase(
    agents: SwarmAgent[],
    problem: ProblemDefinition,
    evaluationFn: (position: Position) => Promise<number>,
  ): Promise<void> {
    const employedBees = agents.filter(a => a.type === 'worker');

    for (const bee of employedBees) {
      // Find bee's food source
      const sourceId = `source-${bee.id.split('-')[2]}`;
      const foodSource = this.foodSources.get(sourceId);
      if (!foodSource) {continue;}

      // Generate new solution in neighborhood
      const newPosition = await this.generateNeighborSolution(
        bee, foodSource.position, agents, problem,
      );

      // Evaluate new solution
      const newFitness = await evaluationFn(newPosition);

      // Greedy selection
      if (newFitness > foodSource.fitness) {
        foodSource.position = newPosition;
        foodSource.fitness = newFitness;
        foodSource.nectar = newFitness;
        foodSource.trials = 0;

        // Update bee position
        bee.position = { ...newPosition };
        bee.fitness = newFitness;

        // Perform waggle dance
        bee.state.activity = 'dancing';
      } else {
        foodSource.trials++;
      }
    }
  }

  /**
   * Onlooker bee phase - select food sources probabilistically
   */
  async onlookerBeePhase(
    agents: SwarmAgent[],
    problem: ProblemDefinition,
    evaluationFn: (position: Position) => Promise<number>,
  ): Promise<void> {
    const onlookerBees = agents.filter(a => a.type === 'aggregator');

    // Calculate selection probabilities
    const probabilities = this.calculateSelectionProbabilities();

    for (const bee of onlookerBees) {
      // Select food source
      const selectedSource = this.selectFoodSource(probabilities);
      if (!selectedSource) {continue;}

      // Generate new solution
      const newPosition = await this.generateNeighborSolution(
        bee, selectedSource.position, agents, problem,
      );

      // Evaluate
      const newFitness = await evaluationFn(newPosition);

      // Update if better
      if (newFitness > selectedSource.fitness) {
        selectedSource.position = newPosition;
        selectedSource.fitness = newFitness;
        selectedSource.nectar = newFitness;
        selectedSource.trials = 0;

        bee.position = { ...newPosition };
        bee.fitness = newFitness;
      } else {
        selectedSource.trials++;
      }
    }
  }

  /**
   * Scout bee phase - abandon exhausted sources
   */
  async scoutBeePhase(
    agents: SwarmAgent[],
    problem: ProblemDefinition,
    evaluationFn: (position: Position) => Promise<number>,
  ): Promise<void> {
    const scoutBees = agents.filter(a => a.type === 'scout');

    // Check for abandoned food sources
    for (const [sourceId, source] of this.foodSources) {
      if (source.trials > this.abandonmentLimit) {
        // Abandon source and explore new area
        const newPosition = this.randomPosition(problem.searchSpace);
        const newFitness = await evaluationFn(newPosition);

        source.position = newPosition;
        source.fitness = newFitness;
        source.nectar = newFitness;
        source.trials = 0;

        // Update associated bee
        const beeId = parseInt(sourceId.split('-')[1]);
        const bee = agents.find(a => a.id === `abc-bee-${beeId}`);
        if (bee) {
          bee.position = { ...newPosition };
          bee.fitness = newFitness;
          bee.state.activity = 'foraging';
        }
      }
    }

    // Scout bees explore randomly
    for (const scout of scoutBees) {
      if (Math.random() < this.parameters.explorationRate) {
        const newPosition = this.randomPosition(problem.searchSpace);
        const newFitness = await evaluationFn(newPosition);

        if (newFitness > scout.fitness) {
          scout.position = newPosition;
          scout.fitness = newFitness;

          // Share discovery
          const message: SwarmMessage = {
            id: `discovery-${Date.now()}-${scout.id}`,
            type: 'discovery',
            senderId: scout.id,
            recipientIds: 'broadcast',
            content: {
              topic: 'new-food-source',
              data: { position: newPosition, fitness: newFitness },
              confidence: newFitness,
              evidence: [],
            },
            priority: newFitness,
            ttl: 5,
            hops: 0,
            timestamp: Date.now(),
          };

          scout.messages.push(message);
        }
      }
    }
  }

  /**
   * Generate neighbor solution
   */
  private async generateNeighborSolution(
    bee: SwarmAgent,
    current: Position,
    agents: SwarmAgent[],
    problem: ProblemDefinition,
  ): Promise<Position> {
    const neighbor = { ...current };
    neighbor.dimensions = [...current.dimensions];

    // Select random dimension
    const dim = Math.floor(Math.random() * neighbor.dimensions.length);

    // Select random neighbor bee
    const otherBees = agents.filter(a => a.id !== bee.id);
    const partner = otherBees[Math.floor(Math.random() * otherBees.length)];

    // Generate new value
    const phi = (Math.random() - 0.5) * 2; // [-1, 1]
    neighbor.dimensions[dim] = current.dimensions[dim] +
      phi * (current.dimensions[dim] - partner.position.dimensions[dim]);

    // Apply bounds
    const dimension = problem.searchSpace.dimensions[dim];
    if (dimension.type === 'continuous') {
      const [min, max] = dimension.range as [number, number];
      neighbor.dimensions[dim] = Math.max(min, Math.min(max, neighbor.dimensions[dim]));
    }

    neighbor.timestamp = Date.now();
    return neighbor;
  }

  /**
   * Calculate selection probabilities based on fitness
   */
  private calculateSelectionProbabilities(): Map<string, number> {
    const probabilities = new Map<string, number>();
    let totalFitness = 0;

    // Calculate total fitness
    for (const source of this.foodSources.values()) {
      totalFitness += Math.max(0, source.fitness);
    }

    // Calculate probabilities
    for (const [id, source] of this.foodSources) {
      const prob = totalFitness > 0 ?
        Math.max(0, source.fitness) / totalFitness :
        1.0 / this.foodSources.size;
      probabilities.set(id, prob);
    }

    return probabilities;
  }

  /**
   * Select food source based on probabilities
   */
  private selectFoodSource(
    probabilities: Map<string, number>,
  ): FoodSource | null {
    const random = Math.random();
    let cumulative = 0;

    for (const [id, prob] of probabilities) {
      cumulative += prob;
      if (cumulative >= random) {
        return this.foodSources.get(id) || null;
      }
    }

    // Return first source if none selected
    return this.foodSources.values().next().value || null;
  }

  /**
   * Get best food source
   */
  getBestSolution(): { position: Position; fitness: number } | null {
    let best: FoodSource | null = null;
    let bestFitness = -Infinity;

    for (const source of this.foodSources.values()) {
      if (source.fitness > bestFitness) {
        bestFitness = source.fitness;
        best = source;
      }
    }

    return best ? { position: best.position, fitness: best.fitness } : null;
  }

  private randomPosition(searchSpace: SearchSpace): Position {
    const dimensions: number[] = [];

    for (const dim of searchSpace.dimensions) {
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        dimensions.push(min + Math.random() * (max - min));
      } else if (dim.type === 'discrete') {
        const values = dim.range as number[];
        dimensions.push(values[Math.floor(Math.random() * values.length)]);
      } else {
        dimensions.push(0);
      }
    }

    return {
      dimensions,
      confidence: 0.5,
      timestamp: Date.now(),
    };
  }
}

/**
 * Firefly Algorithm
 *
 * Attraction-based optimization using light intensity
 */
export class FireflyOptimizer {
  private parameters: AlgorithmParameters;
  private alpha: number = 0.2;      // Randomization parameter
  private beta0: number = 1.0;      // Attractiveness at r=0
  private gamma: number = 1.0;      // Light absorption coefficient

  constructor(parameters: AlgorithmParameters) {
    this.parameters = parameters;
  }

  /**
   * Initialize firefly agents
   */
  initializeAgents(
    problem: ProblemDefinition,
    count: number,
  ): SwarmAgent[] {
    const agents: SwarmAgent[] = [];

    for (let i = 0; i < count; i++) {
      const position = this.randomPosition(problem.searchSpace);

      agents.push({
        id: `firefly-${i}`,
        type: 'explorer',
        state: {
          energy: 1.0,
          activity: 'foraging',
          knowledge: [],
          currentTask: null,
          exploration: this.alpha,
          commitment: 0.7,
          influence: 1.0 / count,
        },
        position,
        velocity: {
          components: new Array(problem.dimensions).fill(0),
          magnitude: 0,
          inertia: 0,
        },
        fitness: 0, // Light intensity
        memory: {
          bestPosition: { ...position },
          bestFitness: 0,
          tabuList: [],
          shortcuts: new Map(),
          patterns: [],
        },
        neighbors: [],
        role: {
          primary: 'explorer',
          secondary: ['messenger'],
          specialization: 0.6,
          flexibility: 0.4,
        },
        pheromones: [],
        messages: [],
      });
    }

    return agents;
  }

  /**
   * Move fireflies based on attraction
   */
  async moveFireflies(
    agents: SwarmAgent[],
    problem: ProblemDefinition,
    evaluationFn: (position: Position) => Promise<number>,
  ): Promise<void> {
    // Sort by brightness (fitness)
    const sorted = [...agents].sort((a, b) => b.fitness - a.fitness);

    for (let i = 0; i < sorted.length; i++) {
      for (let j = 0; j < i; j++) {
        // Move firefly i toward j if j is brighter
        if (sorted[j].fitness > sorted[i].fitness) {
          await this.moveToward(
            sorted[i],
            sorted[j],
            problem,
            evaluationFn,
          );
        }
      }
    }

    // Random movement for diversity
    for (const firefly of agents) {
      if (Math.random() < this.parameters.explorationRate) {
        this.randomMove(firefly, problem);
      }
    }
  }

  /**
   * Move one firefly toward another
   */
  private async moveToward(
    firefly: SwarmAgent,
    attractor: SwarmAgent,
    problem: ProblemDefinition,
    evaluationFn: (position: Position) => Promise<number>,
  ): Promise<void> {
    // Calculate distance
    const r = this.calculateDistance(firefly.position, attractor.position);

    // Calculate attractiveness
    const beta = this.beta0 * Math.exp(-this.gamma * r * r);

    // Move firefly
    const newPosition: Position = {
      dimensions: [...firefly.position.dimensions],
      confidence: firefly.position.confidence,
      timestamp: Date.now(),
    };

    for (let i = 0; i < newPosition.dimensions.length; i++) {
      // Attraction term
      const attraction = beta * (
        attractor.position.dimensions[i] -
        firefly.position.dimensions[i]
      );

      // Random term
      const randomization = this.alpha * (Math.random() - 0.5);

      // Update position
      newPosition.dimensions[i] += attraction + randomization;

      // Apply bounds
      const dim = problem.searchSpace.dimensions[i];
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        newPosition.dimensions[i] = Math.max(min,
          Math.min(max, newPosition.dimensions[i]),
        );
      }
    }

    // Evaluate new position
    const newFitness = await evaluationFn(newPosition);

    // Update if improved
    if (newFitness > firefly.fitness) {
      firefly.position = newPosition;
      firefly.fitness = newFitness;

      if (newFitness > firefly.memory.bestFitness) {
        firefly.memory.bestPosition = { ...newPosition };
        firefly.memory.bestFitness = newFitness;
      }
    }
  }

  /**
   * Random movement for exploration
   */
  private randomMove(firefly: SwarmAgent, problem: ProblemDefinition): void {
    for (let i = 0; i < firefly.position.dimensions.length; i++) {
      const dim = problem.searchSpace.dimensions[i];

      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        const range = max - min;

        firefly.position.dimensions[i] +=
          this.alpha * (Math.random() - 0.5) * range;

        firefly.position.dimensions[i] = Math.max(min,
          Math.min(max, firefly.position.dimensions[i]),
        );
      }
    }

    firefly.position.timestamp = Date.now();
  }

  /**
   * Adapt parameters over time
   */
  adaptParameters(iteration: number, maxIterations: number): void {
    // Reduce randomization over time
    this.alpha = 0.2 * (1 - iteration / maxIterations);
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    let sum = 0;
    for (let i = 0; i < pos1.dimensions.length; i++) {
      const diff = pos1.dimensions[i] - pos2.dimensions[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private randomPosition(searchSpace: SearchSpace): Position {
    const dimensions: number[] = [];

    for (const dim of searchSpace.dimensions) {
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        dimensions.push(min + Math.random() * (max - min));
      } else {
        dimensions.push(0);
      }
    }

    return {
      dimensions,
      confidence: 0.5,
      timestamp: Date.now(),
    };
  }
}

/**
 * Grey Wolf Optimizer (GWO)
 *
 * Hierarchical hunting optimization
 */
export class GreyWolfOptimizer {
  private alpha: SwarmAgent | null = null;  // Best solution
  private beta: SwarmAgent | null = null;   // Second best
  private delta: SwarmAgent | null = null;  // Third best
  private a: number = 2.0;                  // Convergence parameter

  constructor(_parameters: AlgorithmParameters) {}

  /**
   * Initialize wolf pack
   */
  initializeAgents(
    problem: ProblemDefinition,
    count: number,
  ): SwarmAgent[] {
    const agents: SwarmAgent[] = [];

    for (let i = 0; i < count; i++) {
      const position = this.randomPosition(problem.searchSpace);

      // Assign roles based on hierarchy
      let type: SwarmAgentType = 'worker';
      if (i === 0) {type = 'coordinator';}      // Alpha
      else if (i === 1) {type = 'aggregator';}  // Beta
      else if (i === 2) {type = 'scout';}       // Delta

      agents.push({
        id: `wolf-${i}`,
        type,
        state: {
          energy: 1.0,
          activity: 'foraging',
          knowledge: [],
          currentTask: null,
          exploration: 0.5,
          commitment: 0.8,
          influence: type === 'coordinator' ? 0.5 :
                     type === 'aggregator' ? 0.3 :
                     type === 'scout' ? 0.2 : 0.1,
        },
        position,
        velocity: {
          components: new Array(problem.dimensions).fill(0),
          magnitude: 0,
          inertia: 0.5,
        },
        fitness: 0,
        memory: {
          bestPosition: { ...position },
          bestFitness: 0,
          tabuList: [],
          shortcuts: new Map(),
          patterns: [],
        },
        neighbors: [],
        role: {
          primary: type,
          secondary: [],
          specialization: 0.9,
          flexibility: 0.1,
        },
        pheromones: [],
        messages: [],
      });
    }

    return agents;
  }

  /**
   * Update wolf hierarchy
   */
  updateHierarchy(agents: SwarmAgent[]): void {
    // Sort by fitness
    const sorted = [...agents].sort((a, b) => b.fitness - a.fitness);

    // Update leadership
    this.alpha = sorted[0];
    this.beta = sorted[1];
    this.delta = sorted[2];

    // Update agent types based on hierarchy
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {sorted[i].type = 'coordinator';}
      else if (i === 1) {sorted[i].type = 'aggregator';}
      else if (i === 2) {sorted[i].type = 'scout';}
      else {sorted[i].type = 'worker';}
    }
  }

  /**
   * Hunt prey (optimize)
   */
  async hunt(
    agents: SwarmAgent[],
    problem: ProblemDefinition,
    iteration: number,
    maxIterations: number,
  ): Promise<void> {
    // Update convergence parameter
    this.a = 2.0 * (1 - iteration / maxIterations);

    // Update positions based on alpha, beta, delta
    for (const wolf of agents) {
      if (wolf === this.alpha || wolf === this.beta || wolf === this.delta) {
        continue; // Leaders don't move
      }

      await this.updateWolfPosition(wolf, problem);
    }
  }

  /**
   * Update omega wolf position
   */
  private async updateWolfPosition(
    wolf: SwarmAgent,
    problem: ProblemDefinition,
  ): Promise<void> {
    if (!this.alpha || !this.beta || !this.delta) {return;}

    const newPosition: Position = {
      dimensions: new Array(wolf.position.dimensions.length).fill(0),
      confidence: wolf.position.confidence,
      timestamp: Date.now(),
    };

    // Calculate position based on alpha, beta, delta
    for (let i = 0; i < newPosition.dimensions.length; i++) {
      // Coefficients
      const r1 = Math.random();
      const r2 = Math.random();
      const A1 = 2 * this.a * r1 - this.a;
      const C1 = 2 * r2;

      // Distance from alpha
      const D_alpha = Math.abs(
        C1 * this.alpha.position.dimensions[i] -
        wolf.position.dimensions[i],
      );
      const X1 = this.alpha.position.dimensions[i] - A1 * D_alpha;

      // Similar for beta and delta
      const A2 = 2 * this.a * Math.random() - this.a;
      const C2 = 2 * Math.random();
      const D_beta = Math.abs(
        C2 * this.beta.position.dimensions[i] -
        wolf.position.dimensions[i],
      );
      const X2 = this.beta.position.dimensions[i] - A2 * D_beta;

      const A3 = 2 * this.a * Math.random() - this.a;
      const C3 = 2 * Math.random();
      const D_delta = Math.abs(
        C3 * this.delta.position.dimensions[i] -
        wolf.position.dimensions[i],
      );
      const X3 = this.delta.position.dimensions[i] - A3 * D_delta;

      // Average position
      newPosition.dimensions[i] = (X1 + X2 + X3) / 3;

      // Apply bounds
      const dim = problem.searchSpace.dimensions[i];
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        newPosition.dimensions[i] = Math.max(min,
          Math.min(max, newPosition.dimensions[i]),
        );
      }
    }

    // Update wolf position
    wolf.position = newPosition;
  }

  private randomPosition(searchSpace: SearchSpace): Position {
    const dimensions: number[] = [];

    for (const dim of searchSpace.dimensions) {
      if (dim.type === 'continuous') {
        const [min, max] = dim.range as [number, number];
        dimensions.push(min + Math.random() * (max - min));
      } else {
        dimensions.push(0);
      }
    }

    return {
      dimensions,
      confidence: 0.5,
      timestamp: Date.now(),
    };
  }
}

/**
 * Hybrid Swarm Optimizer
 *
 * Combines multiple algorithms for enhanced performance
 */
export class HybridSwarmOptimizer {
  private pso: ParticleSwarmOptimizer;
  private aco: AntColonyOptimizer;
  private abc: BeeColonyOptimizer;
  private firefly: FireflyOptimizer;
  private gwo: GreyWolfOptimizer;

  constructor(parameters: AlgorithmParameters) {
    // Initialize all sub-optimizers
    this.pso = new ParticleSwarmOptimizer(parameters);
    this.aco = new AntColonyOptimizer(parameters);
    this.abc = new BeeColonyOptimizer(parameters);
    this.firefly = new FireflyOptimizer(parameters);
    this.gwo = new GreyWolfOptimizer(parameters);
  }

  /**
   * Initialize hybrid swarm with diverse agents
   */
  initializeAgents(
    problem: ProblemDefinition,
    count: number,
  ): SwarmAgent[] {
    const agents: SwarmAgent[] = [];
    const subSwarmSize = Math.floor(count / 5);

    // Create diverse sub-swarms
    agents.push(...this.pso.initializeAgents(problem, subSwarmSize));
    agents.push(...this.aco.initializeAgents(problem, subSwarmSize));
    agents.push(...this.abc.initializeAgents(problem, subSwarmSize));
    agents.push(...this.firefly.initializeAgents(problem, subSwarmSize));
    agents.push(...this.gwo.initializeAgents(problem, count - 4 * subSwarmSize));

    // Enable communication between sub-swarms
    this.establishCrossSwarmConnections(agents);

    return agents;
  }

  /**
   * Establish connections between different swarm types
   */
  private establishCrossSwarmConnections(agents: SwarmAgent[]): void {
    for (const agent of agents) {
      // Connect to agents from other swarm types
      const otherTypes = agents.filter(a =>
        a.id.split('-')[0] !== agent.id.split('-')[0],
      );

      // Random connections to other swarms
      const numConnections = 3;
      for (let i = 0; i < numConnections; i++) {
        const other = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        if (!agent.neighbors.includes(other.id)) {
          agent.neighbors.push(other.id);
        }
      }
    }
  }

  /**
   * Information exchange between sub-swarms
   */
  async exchangeInformation(agents: SwarmAgent[]): Promise<void> {
    // Find best agents from each sub-swarm
    const bestByType = new Map<string, SwarmAgent>();

    for (const agent of agents) {
      const type = agent.id.split('-')[0];
      const current = bestByType.get(type);

      if (!current || agent.fitness > current.fitness) {
        bestByType.set(type, agent);
      }
    }

    // Share best solutions
    for (const [_type, bestAgent] of bestByType) {
      const message: SwarmMessage = {
        id: `hybrid-best-${bestAgent.id.split('-')[0]}-${Date.now()}`,
        type: 'discovery',
        senderId: bestAgent.id,
        recipientIds: 'broadcast',
        content: {
          topic: 'best-solution',
          data: {
            position: bestAgent.position,
            fitness: bestAgent.fitness,
            algorithm: bestAgent.id.split('-')[0],
          },
          confidence: bestAgent.fitness,
          evidence: [],
        },
        priority: bestAgent.fitness,
        ttl: 10,
        hops: 0,
        timestamp: Date.now(),
      };

      // Send to all agents
      for (const agent of agents) {
        agent.messages.push(message);
      }
    }
  }

  /**
   * Adaptive algorithm selection
   */
  selectAlgorithm(
    phase: string,
    performance: Map<string, number>,
  ): string {
    // Select algorithm based on current phase and performance
    if (phase === 'exploration') {
      return 'firefly'; // Good for exploration
    } else if (phase === 'exploitation') {
      return 'pso'; // Good for convergence
    } else if (phase === 'stagnation') {
      return 'abc'; // Good for escaping local optima
    }

    // Performance-based selection
    let best = '';
    let bestPerf = -Infinity;

    for (const [alg, perf] of performance) {
      if (perf > bestPerf) {
        bestPerf = perf;
        best = alg;
      }
    }

    return best || 'pso';
  }
}

// Helper interfaces
interface FoodSource {
  position: Position;
  fitness: number;
  trials: number;
  nectar: number;
}

/**
 * Algorithm factory
 */
export class SwarmAlgorithmFactory {
  static create(
    type: AlgorithmType,
    parameters: AlgorithmParameters,
  ): OptimizationResult {
    switch (type) {
      case 'pso':
        return new ParticleSwarmOptimizer(parameters);
      case 'aco':
        return new AntColonyOptimizer(parameters);
      case 'abc':
        return new BeeColonyOptimizer(parameters);
      case 'firefly':
        return new FireflyOptimizer(parameters);
      case 'wolf':
        return new GreyWolfOptimizer(parameters);
      case 'hybrid':
        return new HybridSwarmOptimizer(parameters);
      default:
        return new ParticleSwarmOptimizer(parameters);
    }
  }

  /**
   * Get recommended algorithm for problem type
   */
  static recommendAlgorithm(problemType: string): AlgorithmType {
    const recommendations: Record<string, AlgorithmType> = {
      'optimization': 'pso',
      'pathfinding': 'aco',
      'exploration': 'abc',
      'clustering': 'firefly',
      'prediction': 'wolf',
      'classification': 'hybrid',
      'construction': 'aco',
      'consensus': 'abc',
      'adaptation': 'hybrid',
    };

    return recommendations[problemType] || 'hybrid';
  }
}