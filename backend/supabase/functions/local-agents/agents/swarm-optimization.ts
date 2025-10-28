/**
 * Swarm Optimization Agent
 *
 * Specialized agent for distributed optimization problems
 * using swarm intelligence algorithms.
 */

import {
  SwarmBaseAgent,
} from './swarm-base.ts';

import {
  AgentConfig,
  AgentType,
  Message,
  ProcessedMessage,
  Task,
  AgentContext,
  Experience,
  LearningResult,
  AgentCapability,
  Pattern,
  Improvement,
} from '../types.ts';

import {
  SwarmAgentType,
  Position,
  ProblemDefinition,
  SearchSpace,
  Constraint,
  Objective,
  AlgorithmType,
  AlgorithmParameters,
  Proposal,
  SwarmIntelligence,
  ProblemType,
} from '../swarm/types.ts';

import {
  SwarmAlgorithmFactory,
} from '../swarm/algorithms.ts';

/**
 * Optimization-focused swarm agent
 */
export class SwarmOptimizationAgent extends SwarmBaseAgent {
  // Optimization-specific state
  private activeOptimizations: Map<string, OptimizationTask> = new Map();
  private optimizationHistory: OptimizationResult[] = [];
  private algorithmPerformance: Map<AlgorithmType, PerformanceStats> = new Map();
  private parameterAdaptation: ParameterAdaptation;
  private constraintHandler: ConstraintHandler;

  // Swarm optimization state
  private currentAlgorithm: AlgorithmType = 'hybrid';
  private adaptiveParameters: AlgorithmParameters;
  private convergenceMonitor: ConvergenceMonitor;
  private diversityManager: DiversityManager;

  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.OPTIMIZATION,
    });

    // Initialize optimization components
    this.parameterAdaptation = new ParameterAdaptation();
    this.constraintHandler = new ConstraintHandler();
    // Removed multiObjectiveHandler initialization - property doesn't exist
    this.convergenceMonitor = new ConvergenceMonitor();
    this.diversityManager = new DiversityManager();

    // Initialize adaptive parameters
    this.adaptiveParameters = {
      populationSize: 50,
      inertiaWeight: 0.729,
      cognitiveWeight: 1.49445,
      socialWeight: 1.49445,
      evaporationRate: 0.1,
      explorationRate: 0.2,
      elitismRate: 0.1,
      mutationRate: 0.01,
      crossoverRate: 0.7,
    };

    // Add optimization capabilities
    this.capabilities.push(
      AgentCapability.QUANTUM_OPTIMIZATION,
      AgentCapability.PATTERN_RECOGNITION,
    );
  }

  /**
   * Map to swarm agent type
   */
  protected mapToSwarmType(): SwarmAgentType {
    return 'optimizer' as SwarmAgentType; // Would be 'innovator' or custom type
  }

  /**
   * Process message with optimization focus
   */
  async processMessage(message: Message): Promise<ProcessedMessage> {
    const baseResult = await super.processMessage(message);

    // Extract optimization problems
    const problems = this.extractOptimizationProblems(message);

    // Identify optimization patterns
    const optimizationPatterns = this.identifyOptimizationPatterns(message);

    // Check for constraint mentions
    const constraints = this.extractConstraints(message);

    // Enhance with optimization insights
    if (problems.length > 0) {
      const optimizationActions = this.generateOptimizationActions(
        problems,
        optimizationPatterns,
        constraints,
      );

      baseResult.suggestedActions.push(...optimizationActions);
    }

    // Adjust confidence based on problem complexity
    const complexity = this.assessProblemComplexity(problems, constraints);
    baseResult.confidence *= (1 - complexity * 0.2); // More complex = less initial confidence

    return baseResult;
  }

  /**
   * Execute optimization task
   */
  async executeTask(task: Task, context: AgentContext): Promise<unknown> {
    if (task.type === 'optimization' ||
        task.description.includes('optimize') ||
        task.description.includes('minimize') ||
        task.description.includes('maximize')) {
      return this.executeOptimizationTask(task, context);
    }

    return super.executeTask(task, context);
  }

  /**
   * Execute distributed optimization
   */
  private async executeOptimizationTask(
    task: Task,
    _context: AgentContext,
  ): Promise<OptimizationResult> {
    // Create optimization problem
    const problem = this.createProblemDefinition(task);

    // Create optimization task
    const optTask: OptimizationTask = {
      id: `opt-${Date.now()}`,
      problem,
      algorithm: this.selectBestAlgorithm(problem),
      startTime: Date.now(),
      iterations: 0,
      bestSolution: null,
      convergenceHistory: [],
      status: 'active',
    };

    this.activeOptimizations.set(optTask.id, optTask);

    // Phase 1: Initialize swarm with optimal algorithm
    const optimizer = await this.initializeOptimizer(optTask);

    // Phase 2: Distributed exploration
    const explorationResults = await this.distributedExploration(
      optTask,
      optimizer,
    );

    // Phase 3: Collaborative refinement
    const refinedSolution = await this.collaborativeRefinement(
      explorationResults,
      optTask,
    );

    // Phase 4: Constraint satisfaction
    const feasibleSolution = await this.ensureConstraintSatisfaction(
      refinedSolution,
      problem,
    );

    // Phase 5: Final consensus
    const finalSolution = await this.reachOptimizationConsensus(
      feasibleSolution,
      optTask,
    );

    // Create result
    const result: OptimizationResult = {
      taskId: optTask.id,
      problem,
      solution: finalSolution,
      fitness: await this.evaluateSolution(finalSolution, problem),
      iterations: optTask.iterations,
      convergenceTime: Date.now() - optTask.startTime,
      algorithm: optTask.algorithm,
      contributors: this.getContributingAgents(),
    };

    // Update history and performance
    this.optimizationHistory.push(result);
    this.updateAlgorithmPerformance(result);

    return result;
  }

  /**
   * Create problem definition from task
   */
  private createProblemDefinition(task: Task): ProblemDefinition {
    // Extract problem characteristics
    const dimensions = this.extractDimensions(task.description);
    const objectives = this.extractObjectives(task.description);
    const constraints = this.extractProblemConstraints(task);

    return {
      id: `problem-${task.id}`,
      type: this.classifyProblemType(task.description),
      dimensions: dimensions.length || 3, // Default to 3D
      constraints,
      objectives,
      searchSpace: this.createSearchSpace(dimensions, constraints),
      evaluationFunction: 'default', // Would be customized
    };
  }

  /**
   * Select best algorithm for problem
   */
  private selectBestAlgorithm(problem: ProblemDefinition): AlgorithmType {
    // Use performance history if available
    let bestAlgorithm: AlgorithmType = 'hybrid';
    let bestPerformance = 0;

    for (const [algorithm, stats] of this.algorithmPerformance) {
      const performance = stats.successRate * (1 - stats.avgConvergenceTime / 10000);
      if (performance > bestPerformance) {
        bestPerformance = performance;
        bestAlgorithm = algorithm;
      }
    }

    // Override based on problem characteristics
    if (problem.type === 'pathfinding') {
      return 'aco'; // Ant Colony for paths
    } else if (problem.constraints.length > 5) {
      return 'abc'; // Bee Colony for highly constrained
    } else if (problem.objectives.length > 1) {
      return 'hybrid'; // Hybrid for multi-objective
    }

    return bestAlgorithm;
  }

  /**
   * Initialize optimizer with swarm
   */
  private async initializeOptimizer(
    task: OptimizationTask,
  ): Promise<unknown> {
    // Adapt parameters based on problem
    const adaptedParams = this.parameterAdaptation.adapt(
      this.adaptiveParameters,
      task.problem,
    );

    // Create optimizer
    const optimizer = SwarmAlgorithmFactory.create(
      task.algorithm,
      adaptedParams,
    );

    // Initialize swarm agents if needed
    if (this.swarmId && this.swarmAgent) {
      // Broadcast optimization start
      this.depositPheromone(
        this.stigmergicEnv,
        this.swarmId,
        'convergence',
        0.9,
        {
          optimization: task.id,
          algorithm: task.algorithm,
          dimensions: task.problem.dimensions,
        },
      );
    }

    return optimizer;
  }

  /**
   * Distributed exploration phase
   */
  private async distributedExploration(
    task: OptimizationTask,
    _optimizer: unknown,
  ): Promise<ExplorationResult[]> {
    const results: ExplorationResult[] = [];
    const explorationIterations = 50;

    for (let i = 0; i < explorationIterations; i++) {
      // Update own position
      if (this.swarmAgent) {
        const newPosition = await this.explorePosition(task.problem);
        const fitness = await this.evaluatePosition(newPosition, task.problem);

        results.push({
          position: newPosition,
          fitness,
          iteration: i,
          discoveredBy: this.id,
        });

        // Update personal best
        if (fitness > this.swarmAgent.fitness) {
          this.swarmAgent.fitness = fitness;
          this.swarmAgent.position = newPosition;

          // Deposit quality pheromone
          this.depositQualityPheromone(fitness);
        }
      }

      // Collect neighbor explorations
      if (this.neighbors.size > 0) {
        const neighborExplorations = await this.collectNeighborExplorations(i);
        results.push(...neighborExplorations);
      }

      // Update convergence
      task.convergenceHistory.push({
        iteration: i,
        bestFitness: Math.max(...results.map(r => r.fitness)),
        diversity: this.diversityManager.calculate(results.map(r => r.position)),
      });

      // Check for early convergence
      if (this.convergenceMonitor.hasConverged(task.convergenceHistory)) {
        break;
      }

      task.iterations = i + 1;
    }

    return results;
  }

  /**
   * Collaborative refinement phase
   */
  private async collaborativeRefinement(
    explorations: ExplorationResult[],
    task: OptimizationTask,
  ): Promise<Solution> {
    // Select elite solutions
    const elites = explorations
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, Math.ceil(explorations.length * 0.1));

    // Create refined solution through collaboration
    let refinedPosition = this.createCentroid(elites.map(e => e.position));

    // Local search around best solutions
    for (const elite of elites.slice(0, 3)) {
      const locallyRefined = await this.localSearch(
        elite.position,
        task.problem,
      );

      if (locallyRefined.fitness > elite.fitness) {
        refinedPosition = this.blendPositions(
          refinedPosition,
          locallyRefined.position,
          0.3,
        );
      }
    }

    // Quantum-inspired refinement
    if (this.capabilities.includes(AgentCapability.QUANTUM_OPTIMIZATION)) {
      refinedPosition = await this.quantumRefinement(
        refinedPosition,
        task.problem,
      );
    }

    return {
      position: refinedPosition,
      fitness: await this.evaluatePosition(refinedPosition, task.problem),
      metadata: {
        refinementIterations: elites.length,
        contributors: [...new Set(elites.map(e => e.discoveredBy))],
      },
    };
  }

  /**
   * Ensure constraint satisfaction
   */
  private async ensureConstraintSatisfaction(
    solution: Solution,
    problem: ProblemDefinition,
  ): Promise<Solution> {
    // Check constraints
    const violations = this.constraintHandler.checkViolations(
      solution.position,
      problem.constraints,
    );

    if (violations.length === 0) {
      return solution;
    }

    // Repair solution
    let repairedPosition = solution.position;

    for (const violation of violations) {
      repairedPosition = this.constraintHandler.repair(
        repairedPosition,
        violation,
        problem,
      );
    }

    // If repair failed, use penalty method
    if (this.constraintHandler.checkViolations(repairedPosition, problem.constraints).length > 0) {
      repairedPosition = await this.penaltyMethod(
        solution.position,
        problem,
      );
    }

    return {
      position: repairedPosition,
      fitness: await this.evaluatePosition(repairedPosition, problem),
      metadata: {
        ...solution.metadata,
        repaired: true,
        violations: violations.length,
      },
    };
  }

  /**
   * Reach consensus on final solution
   */
  private async reachOptimizationConsensus(
    solution: Solution,
    _task: OptimizationTask,
  ): Promise<Solution> {
    if (!this.consensusMechanism || this.neighbors.size === 0) {
      return solution;
    }

    // Create proposal
    const proposal: Proposal = {
      id: `opt-proposal-${_task.id}`,
      type: 'solution',
      proposerId: this.id,
      content: solution,
      fitness: solution.fitness,
      support: 0,
      priority: solution.fitness,
      timestamp: Date.now(),
      metadata: { taskId: _task.id, algorithm: this.currentAlgorithm },
    };

    // Get consensus
    const consensusState = await this.consensusMechanism.executeRound(
      {} as SwarmIntelligence, // Would pass actual swarm intelligence
      [proposal],
    );

    // If consensus reached, use it
    if (consensusState.agreement > 0.7) {
      const winningProposal = consensusState.proposals
        .sort((a, b) => b.support - a.support)[0];

      if (winningProposal && winningProposal.content !== solution) {
        return winningProposal.content as Solution;
      }
    }

    return solution;
  }

  /**
   * Learn from optimization experience
   */
  async learn(experience: Experience): Promise<LearningResult> {
    const patterns: Pattern[] = [];
    const improvements: Improvement[] = [];

    if (experience.success) {
      // Learn successful optimization patterns
      patterns.push({
        id: `opt-pattern-${Date.now()}`,
        description: `Successful optimization: ${experience.action}`,
        frequency: 1,
        reliability: 0.85,
        conditions: [experience.situation],
        outcomes: [experience.outcome],
      });

      // Suggest parameter improvements
      if (experience.learnings.includes('faster convergence')) {
        improvements.push({
          area: 'convergence',
          current: this.adaptiveParameters.inertiaWeight,
          suggested: this.adaptiveParameters.inertiaWeight * 0.95,
          reasoning: 'Reduce inertia for faster convergence',
        });
      }

      if (experience.learnings.includes('better exploration')) {
        improvements.push({
          area: 'exploration',
          current: this.adaptiveParameters.explorationRate,
          suggested: Math.min(0.5, this.adaptiveParameters.explorationRate * 1.2),
          reasoning: 'Increase exploration rate',
        });
      }
    }

    // Update adaptive parameters
    this.applyParameterLearning(experience);

    return {
      patterns,
      insights: experience.learnings,
      improvements,
      confidence: 0.8,
    };
  }

  /**
   * Make optimization-oriented decisions
   */
  async decide(options: unknown[], _context: AgentContext): Promise<unknown> {
    // Evaluate options as optimization problems
    let bestOption = options[0];
    let bestPotential = 0;

    for (const option of options) {
      const potential = this.evaluateOptimizationPotential(option);
      if (potential > bestPotential) {
        bestPotential = potential;
        bestOption = option;
      }
    }

    return bestOption;
  }

  /**
   * Helper methods
   */

  private extractOptimizationProblems(message: Message): string[] {
    const problems: string[] = [];
    const keywords = [
      'optimize', 'minimize', 'maximize', 'best',
      'optimal', 'improve', 'enhance', 'reduce',
    ];

    const sentences = message.content.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (keywords.some(kw => sentence.toLowerCase().includes(kw))) {
        problems.push(sentence.trim());
      }
    }

    return problems;
  }

  private identifyOptimizationPatterns(message: Message): Pattern[] {
    const patterns: Pattern[] = [];

    // Single objective pattern
    if (message.content.match(/\b(minimize|maximize)\s+\w+/i)) {
      patterns.push({
        id: `single-obj-${Date.now()}`,
        description: 'Single objective optimization',
        frequency: 1,
        reliability: 0.9,
      });
    }

    // Multi-objective pattern
    if (message.content.includes('and') &&
        (message.content.includes('minimize') || message.content.includes('maximize'))) {
      patterns.push({
        id: `multi-obj-${Date.now()}`,
        description: 'Multi-objective optimization',
        frequency: 1,
        reliability: 0.8,
      });
    }

    // Constrained pattern
    if (message.content.includes('subject to') ||
        message.content.includes('constraint') ||
        message.content.includes('within')) {
      patterns.push({
        id: `constrained-${Date.now()}`,
        description: 'Constrained optimization',
        frequency: 1,
        reliability: 0.85,
      });
    }

    return patterns;
  }

  private extractConstraints(message: Message): string[] {
    const constraints: string[] = [];

    // Look for constraint patterns
    const constraintPatterns = [
      /must be (?:less|greater) than (\d+)/gi,
      /between (\d+) and (\d+)/gi,
      /at most (\d+)/gi,
      /at least (\d+)/gi,
      /within (\d+)% of/gi,
    ];

    for (const pattern of constraintPatterns) {
      const matches = message.content.matchAll(pattern);
      for (const match of matches) {
        constraints.push(match[0]);
      }
    }

    return constraints;
  }

  private generateOptimizationActions(
    problems: string[],
    patterns: Pattern[],
    constraints: string[],
  ): string[] {
    const actions: string[] = [];

    if (problems.length > 0) {
      actions.push(`Initialize swarm optimization for ${problems.length} objectives`);
    }

    if (patterns.some(p => p.description.includes('Multi-objective'))) {
      actions.push('Deploy multi-objective swarm optimization');
    }

    if (constraints.length > 0) {
      actions.push(`Apply ${constraints.length} constraints with penalty method`);
    }

    if (patterns.some(p => p.description.includes('Constrained'))) {
      actions.push('Activate constraint-handling swarm formation');
    }

    return actions;
  }

  private assessProblemComplexity(problems: string[], constraints: string[]): number {
    let complexity = 0;

    // More objectives increase complexity
    complexity += Math.min(0.3, problems.length * 0.1);

    // More constraints increase complexity
    complexity += Math.min(0.3, constraints.length * 0.05);

    // Nonlinear indicators
    const nonlinearKeywords = ['squared', 'exponential', 'logarithmic', 'power'];
    for (const problem of problems) {
      if (nonlinearKeywords.some(kw => problem.includes(kw))) {
        complexity += 0.2;
        break;
      }
    }

    return Math.min(1, complexity);
  }

  private extractDimensions(description: string): string[] {
    // Extract variable names
    const variables: string[] = [];
    const varPattern = /\b([a-z])\b/gi;
    const matches = description.matchAll(varPattern);

    for (const match of matches) {
      if (!variables.includes(match[1].toLowerCase())) {
        variables.push(match[1].toLowerCase());
      }
    }

    return variables;
  }

  private extractObjectives(description: string): Objective[] {
    const objectives: Objective[] = [];

    // Look for minimize/maximize patterns
    const patterns = [
      /(minimize|maximize)\s+(\w+)/gi,
      /(reduce|increase)\s+(\w+)/gi,
      /(lowest|highest)\s+(\w+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        objectives.push({
          name: match[2],
          weight: 1.0,
          direction: match[1].toLowerCase().includes('min') ||
                    match[1].toLowerCase().includes('reduc') ||
                    match[1].toLowerCase().includes('low') ?
                    'minimize' : 'maximize',
          function: 'default',
        });
      }
    }

    return objectives.length > 0 ? objectives : [{
      name: 'objective',
      weight: 1.0,
      direction: 'minimize',
      function: 'default',
    }];
  }

  private extractProblemConstraints(task: Task): Constraint[] {
    const constraints: Constraint[] = [];

    // Simple constraint extraction
    if (task.description.includes('less than')) {
      constraints.push({
        type: 'hard',
        condition: {
          field: 'value',
          operator: 'lt',
          value: 100, // Would extract actual value
        },
        penalty: 1000,
      });
    }

    return constraints;
  }

  private classifyProblemType(description: string): ProblemType {
    if (description.includes('path') || description.includes('route')) {
      return 'pathfinding';
    } else if (description.includes('cluster') || description.includes('group')) {
      return 'clustering';
    } else if (description.includes('predict') || description.includes('forecast')) {
      return 'prediction';
    }
    return 'optimization';
  }

  private createSearchSpace(
    dimensions: string[],
    _constraints: Constraint[],
  ): SearchSpace {
    const dims = dimensions.length || 3;

    return {
      dimensions: Array(dims).fill(0).map((_, i) => ({
        name: dimensions[i] || `x${i}`,
        type: 'continuous',
        range: [-100, 100], // Default range
        resolution: 0.01,
      })),
      topology: 'continuous',
      boundaries: Array(dims).fill(0).map((_, i) => ({
        type: 'reflect',
        dimension: i,
        value: 100,
      })),
    };
  }

  private async explorePosition(_problem: ProblemDefinition): Promise<Position> {
    if (!this.swarmAgent) {
      return this.createInitialPosition();
    }

    // Use current algorithm's exploration strategy
    const position = { ...this.swarmAgent.position };

    // Add exploration noise
    for (let i = 0; i < position.dimensions.length; i++) {
      const noise = (Math.random() - 0.5) * this.adaptiveParameters.explorationRate;
      position.dimensions[i] += noise;

      // Apply bounds
      position.dimensions[i] = Math.max(-100, Math.min(100, position.dimensions[i]));
    }

    position.timestamp = Date.now();
    return position;
  }

  private async evaluatePosition(
    position: Position,
    problem: ProblemDefinition,
  ): Promise<number> {
    // Simple sphere function for testing
    let fitness = 0;

    for (let i = 0; i < position.dimensions.length; i++) {
      fitness -= position.dimensions[i] * position.dimensions[i];
    }

    // Normalize to 0-1
    fitness = 1 / (1 + Math.abs(fitness));

    // Apply constraint penalties
    const violations = this.constraintHandler.checkViolations(
      position,
      problem.constraints,
    );

    fitness *= Math.pow(0.5, violations.length);

    return fitness;
  }

  private async evaluateSolution(
    solution: Solution,
    problem: ProblemDefinition,
  ): Promise<number> {
    return this.evaluatePosition(solution.position, problem);
  }

  private depositQualityPheromone(fitness: number): void {
    if (!this.swarmId || !this.swarmAgent) {return;}

    this.depositPheromone(
      this.stigmergicEnv,
      this.swarmId,
      'quality',
      fitness,
      {
        algorithm: this.currentAlgorithm,
        iteration: this.activeOptimizations.size,
        position: this.swarmAgent.position.dimensions,
      },
    );
  }

  private async collectNeighborExplorations(
    iteration: number,
  ): Promise<ExplorationResult[]> {
    const results: ExplorationResult[] = [];

    // Simulate neighbor explorations
    for (const [id, neighbor] of this.neighbors) {
      results.push({
        position: neighbor.position,
        fitness: neighbor.fitness,
        iteration,
        discoveredBy: id,
      });
    }

    return results;
  }

  private createCentroid(positions: Position[]): Position {
    if (positions.length === 0) {
      return this.createInitialPosition();
    }

    const dimensions = positions[0].dimensions.length;
    const centroid: number[] = new Array(dimensions).fill(0);

    for (const pos of positions) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += pos.dimensions[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= positions.length;
    }

    return {
      dimensions: centroid,
      confidence: positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length,
      timestamp: Date.now(),
    };
  }

  private async localSearch(
    position: Position,
    problem: ProblemDefinition,
  ): Promise<{ position: Position; fitness: number }> {
    let currentPos = { ...position };
    let currentFitness = await this.evaluatePosition(currentPos, problem);
    const stepSize = 0.01;

    // Simple hill climbing
    for (let iter = 0; iter < 10; iter++) {
      let improved = false;

      for (let i = 0; i < currentPos.dimensions.length; i++) {
        // Try positive direction
        const testPos = { ...currentPos };
        testPos.dimensions[i] += stepSize;
        const testFitness = await this.evaluatePosition(testPos, problem);

        if (testFitness > currentFitness) {
          currentPos = testPos;
          currentFitness = testFitness;
          improved = true;
        } else {
          // Try negative direction
          testPos.dimensions[i] = currentPos.dimensions[i] - stepSize;
          const testFitness2 = await this.evaluatePosition(testPos, problem);

          if (testFitness2 > currentFitness) {
            currentPos = testPos;
            currentFitness = testFitness2;
            improved = true;
          }
        }
      }

      if (!improved) {break;}
    }

    return { position: currentPos, fitness: currentFitness };
  }

  private blendPositions(
    pos1: Position,
    pos2: Position,
    weight: number,
  ): Position {
    const blended: number[] = [];

    for (let i = 0; i < pos1.dimensions.length; i++) {
      blended[i] = pos1.dimensions[i] * (1 - weight) + pos2.dimensions[i] * weight;
    }

    return {
      dimensions: blended,
      confidence: pos1.confidence * (1 - weight) + pos2.confidence * weight,
      timestamp: Date.now(),
    };
  }

  private async quantumRefinement(
    position: Position,
    problem: ProblemDefinition,
  ): Promise<Position> {
    // Simulate quantum-inspired optimization
    const superposition: Position[] = [];

    // Create superposition states
    for (let i = 0; i < 5; i++) {
      const phase = (i / 5) * 2 * Math.PI;
      const quantumPos = { ...position };

      for (let j = 0; j < quantumPos.dimensions.length; j++) {
        quantumPos.dimensions[j] += 0.1 * Math.sin(phase + j);
      }

      superposition.push(quantumPos);
    }

    // Collapse to best state
    let bestPos = position;
    let bestFitness = await this.evaluatePosition(position, problem);

    for (const qPos of superposition) {
      const fitness = await this.evaluatePosition(qPos, problem);
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestPos = qPos;
      }
    }

    return bestPos;
  }

  private async penaltyMethod(
    position: Position,
    problem: ProblemDefinition,
  ): Promise<Position> {
    // Simple penalty-based constraint handling
    const penalizedPos = { ...position };
    const penaltyFactor = 0.1;

    for (const constraint of problem.constraints) {
      if (constraint.type === 'hard') {
        // Move position to satisfy constraint
        for (let i = 0; i < penalizedPos.dimensions.length; i++) {
          penalizedPos.dimensions[i] *= (1 - penaltyFactor);
        }
      }
    }

    return penalizedPos;
  }

  private updateAlgorithmPerformance(result: OptimizationResult): void {
    const stats = this.algorithmPerformance.get(result.algorithm) || {
      totalRuns: 0,
      successCount: 0,
      successRate: 0,
      avgConvergenceTime: 0,
      avgIterations: 0,
    };

    stats.totalRuns++;
    if (result.fitness > 0.8) {
      stats.successCount++;
    }
    stats.successRate = stats.successCount / stats.totalRuns;
    stats.avgConvergenceTime = (stats.avgConvergenceTime * (stats.totalRuns - 1) +
                                result.convergenceTime) / stats.totalRuns;
    stats.avgIterations = (stats.avgIterations * (stats.totalRuns - 1) +
                          result.iterations) / stats.totalRuns;

    this.algorithmPerformance.set(result.algorithm, stats);
  }

  private applyParameterLearning(experience: Experience): void {
    if (experience.success) {
      // Slightly adjust parameters based on success
      this.adaptiveParameters.explorationRate *= 0.98; // Reduce exploration over time
      this.adaptiveParameters.elitismRate = Math.min(0.2,
        this.adaptiveParameters.elitismRate * 1.02); // Increase elitism
    } else {
      // Increase exploration on failure
      this.adaptiveParameters.explorationRate = Math.min(0.5,
        this.adaptiveParameters.explorationRate * 1.1);
    }
  }

  private evaluateOptimizationPotential(option: unknown): number {
    const optionStr = JSON.stringify(option);
    let score = 0;

    // Keywords indicating optimization
    const keywords = ['optimize', 'improve', 'best', 'minimize', 'maximize', 'enhance'];
    for (const keyword of keywords) {
      if (optionStr.includes(keyword)) {
        score += 0.15;
      }
    }

    // Problem complexity indicators
    if (optionStr.includes('constraint')) {score += 0.1;}
    if (optionStr.includes('multi')) {score += 0.1;}

    return Math.min(1, score);
  }

  private getContributingAgents(): string[] {
    return [this.id, ...Array.from(this.neighbors.keys())];
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): OptimizationStatistics {
    const activeOptimizations = Array.from(this.activeOptimizations.values())
      .filter(o => o.status === 'active').length;

    const successRate = this.optimizationHistory.length > 0 ?
      this.optimizationHistory.filter(r => r.fitness > 0.8).length /
      this.optimizationHistory.length : 0;

    const avgConvergenceTime = this.optimizationHistory.length > 0 ?
      this.optimizationHistory.reduce((sum, r) => sum + r.convergenceTime, 0) /
      this.optimizationHistory.length : 0;

    const algorithmStats = Object.fromEntries(
      Array.from(this.algorithmPerformance.entries()),
    );

    return {
      activeOptimizations,
      totalCompleted: this.optimizationHistory.length,
      successRate,
      avgConvergenceTime,
      algorithmPerformance: algorithmStats,
      currentAlgorithm: this.currentAlgorithm,
      adaptiveParameters: this.adaptiveParameters,
    };
  }
}

// Component classes
class ParameterAdaptation {
  adapt(
    params: AlgorithmParameters,
    problem: ProblemDefinition,
  ): AlgorithmParameters {
    const adapted = { ...params };

    // Adapt based on problem size
    adapted.populationSize = Math.min(200, 10 * problem.dimensions);

    // Adapt based on constraints
    if (problem.constraints.length > 0) {
      adapted.mutationRate = Math.min(0.1, params.mutationRate * 1.5);
    }

    // Adapt based on problem type
    if (problem.type === 'pathfinding') {
      adapted.evaporationRate = 0.2; // Faster evaporation for dynamic paths
    }

    return adapted;
  }
}

class ConstraintHandler {
  checkViolations(
    position: Position,
    constraints: Constraint[],
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const constraint of constraints) {
      // Simple constraint checking
      if (!this.satisfiesConstraint(position, constraint)) {
        violations.push({
          constraint,
          position,
          violationAmount: this.calculateViolation(position, constraint),
        });
      }
    }

    return violations;
  }

  repair(
    position: Position,
    _violation: ConstraintViolation,
    _problem: ProblemDefinition,
  ): Position {
    const repaired = { ...position };

    // Simple repair by moving toward feasible region
    for (let i = 0; i < repaired.dimensions.length; i++) {
      repaired.dimensions[i] *= 0.9; // Shrink toward origin
    }

    return repaired;
  }

  private satisfiesConstraint(_position: Position, _constraint: Constraint): boolean {
    // Simplified constraint satisfaction
    return Math.random() > 0.2; // 80% satisfaction for testing
  }

  private calculateViolation(_position: Position, _constraint: Constraint): number {
    return Math.random(); // Random violation amount for testing
  }
}

// Removed unused class - commented out for potential future use
/* class MultiObjectiveHandler {
  // Handle multi-objective optimization
  paretoRank(solutions: Solution[]): Map<Solution, number> {
    const ranks = new Map<Solution, number>();

    // Simple ranking
    solutions.forEach((sol, i) => {
      ranks.set(sol, i);
    });

    return ranks;
  }
} */

class ConvergenceMonitor {
  hasConverged(history: ConvergenceHistory[]): boolean {
    if (history.length < 10) {return false;}

    // Check if fitness improvement has stagnated
    const recent = history.slice(-10);
    const improvements = [];

    for (let i = 1; i < recent.length; i++) {
      improvements.push(recent[i].bestFitness - recent[i - 1].bestFitness);
    }

    const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;

    return avgImprovement < 0.001;
  }
}

class DiversityManager {
  calculate(positions: Position[]): number {
    if (positions.length < 2) {return 0;}

    // Calculate average pairwise distance
    let totalDistance = 0;
    let pairs = 0;

    for (let i = 0; i < positions.length - 1; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        totalDistance += this.euclideanDistance(positions[i], positions[j]);
        pairs++;
      }
    }

    return pairs > 0 ? totalDistance / pairs : 0;
  }

  private euclideanDistance(pos1: Position, pos2: Position): number {
    let sum = 0;
    for (let i = 0; i < pos1.dimensions.length; i++) {
      const diff = pos1.dimensions[i] - pos2.dimensions[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}

// Type definitions
interface OptimizationTask {
  id: string;
  problem: ProblemDefinition;
  algorithm: AlgorithmType;
  startTime: number;
  iterations: number;
  bestSolution: Solution | null;
  convergenceHistory: ConvergenceHistory[];
  status: 'active' | 'completed' | 'failed';
}

interface OptimizationResult {
  taskId: string;
  problem: ProblemDefinition;
  solution: Solution;
  fitness: number;
  iterations: number;
  convergenceTime: number;
  algorithm: AlgorithmType;
  contributors: string[];
}

interface Solution {
  position: Position;
  fitness: number;
  metadata?: Record<string, unknown>;
}

interface ExplorationResult {
  position: Position;
  fitness: number;
  iteration: number;
  discoveredBy: string;
}

interface ConvergenceHistory {
  iteration: number;
  bestFitness: number;
  diversity: number;
}

interface ConstraintViolation {
  constraint: Constraint;
  position: Position;
  violationAmount: number;
}

interface PerformanceStats {
  totalRuns: number;
  successCount: number;
  successRate: number;
  avgConvergenceTime: number;
  avgIterations: number;
}

interface OptimizationStatistics {
  activeOptimizations: number;
  totalCompleted: number;
  successRate: number;
  avgConvergenceTime: number;
  algorithmPerformance: Record<string, PerformanceStats>;
  currentAlgorithm: AlgorithmType;
  adaptiveParameters: AlgorithmParameters;
}