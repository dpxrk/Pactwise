/**
 * Emergent Behavior Detection and Amplification
 *
 * System for identifying, analyzing, and amplifying beneficial
 * emergent behaviors in swarm intelligence systems.
 */

import {
  SwarmIntelligence,
  SwarmAgent,
  EmergentPattern,
  EmergentBehavior,
  PatternType,
  Formation,
  InformationCascade,
  Synchronization,
  Innovation,
  Position,
  Velocity,
  ActivityState,
  PheromoneDeposit,
  PheromoneType,
  SwarmMessage,
  MessageType,
} from './types.ts';

import { StigmergicEnvironment } from './stigmergy.ts';

/**
 * Emergent Behavior Detector
 *
 * Identifies and analyzes emergent patterns in swarm behavior
 */
export class EmergentBehaviorDetector {
  private detectionThresholds: Map<PatternType, DetectionThreshold> = new Map();
  private patternHistory: Map<string, PatternHistory> = new Map();
  private amplificationStrategies: Map<PatternType, AmplificationStrategy> = new Map();

  constructor() {
    this.initializeThresholds();
    this.initializeStrategies();
  }

  /**
   * Detect all emergent behaviors in swarm
   */
  detectEmergentBehaviors(swarm: SwarmIntelligence): EmergentBehavior {
    const patterns = this.detectPatterns(swarm);
    const formations = this.detectFormations(swarm);
    const cascades = this.detectCascades(swarm);
    const synchronizations = this.detectSynchronizations(swarm);
    const innovations = this.detectInnovations(swarm);

    // Update pattern history
    this.updatePatternHistory(patterns);

    // Analyze pattern interactions
    this.analyzePatternInteractions(
      patterns,
      formations,
      cascades,
    );

    return {
      patterns,
      formations,
      cascades,
      synchronizations,
      innovations,
    };
  }

  /**
   * Detect emergent patterns
   */
  private detectPatterns(swarm: SwarmIntelligence): EmergentPattern[] {
    const patterns: EmergentPattern[] = [];

    // Check each pattern type
    for (const [type, threshold] of this.detectionThresholds) {
      const pattern = this.detectPatternType(type, swarm, threshold);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    // Detect novel patterns
    const novelPatterns = this.detectNovelPatterns(swarm);
    patterns.push(...novelPatterns);

    return patterns;
  }

  /**
   * Detect specific pattern type
   */
  private detectPatternType(
    type: PatternType,
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    switch (type) {
      case 'flocking':
        return this.detectFlocking(swarm, threshold);
      case 'swarming':
        return this.detectSwarming(swarm, threshold);
      case 'foraging':
        return this.detectForaging(swarm, threshold);
      case 'sorting':
        return this.detectSorting(swarm, threshold);
      case 'clustering':
        return this.detectClustering(swarm, threshold);
      case 'synchronization':
        return this.detectSynchronizationPattern(swarm, threshold);
      case 'wave':
        return this.detectWave(swarm, threshold);
      case 'spiral':
        return this.detectSpiral(swarm, threshold);
      case 'branching':
        return this.detectBranching(swarm, threshold);
      case 'crystallization':
        return this.detectCrystallization(swarm, threshold);
      default:
        return null;
    }
  }

  /**
   * Detect flocking behavior
   */
  private detectFlocking(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    const agents = Array.from(swarm.agents.values());
    if (agents.length < threshold.minAgents) {return null;}

    // Calculate alignment
    let alignedAgents = 0;
    let totalAlignment = 0;
    const avgVelocity = this.calculateAverageVelocity(agents);

    for (const agent of agents) {
      if (agent.velocity.magnitude > 0.1) {
        const alignment = this.calculateAlignment(agent.velocity, avgVelocity);
        if (alignment > threshold.alignmentThreshold) {
          alignedAgents++;
          totalAlignment += alignment;
        }
      }
    }

    const participationRate = alignedAgents / agents.length;
    if (participationRate < threshold.participationThreshold) {return null;}

    const strength = totalAlignment / alignedAgents;
    const stability = this.calculatePatternStability('flocking', swarm.swarmId);

    return {
      id: `flocking-${Date.now()}`,
      type: 'flocking',
      strength,
      participants: agents.filter(a => {
        const alignment = this.calculateAlignment(a.velocity, avgVelocity);
        return alignment > threshold.alignmentThreshold;
      }).map(a => a.id),
      stability,
      benefit: strength * stability * 0.8,
      description: `${alignedAgents} agents moving in coordinated direction with ${(strength * 100).toFixed(1)}% alignment`,
    };
  }

  /**
   * Detect swarming behavior (surrounding target)
   */
  private detectSwarming(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    const agents = Array.from(swarm.agents.values());

    // Find potential targets (high-value positions)
    const targets = this.findSwarmTargets(agents);

    for (const target of targets) {
      const surroundingAgents = agents.filter(agent => {
        const distance = this.calculateDistance(agent.position, target);
        return distance < threshold.distanceThreshold && distance > threshold.distanceThreshold * 0.2;
      });

      if (surroundingAgents.length >= threshold.minAgents) {
        // Check if agents are distributed around target
        const distribution = this.calculateAngularDistribution(surroundingAgents, target);

        if (distribution > 0.7) {
          return {
            id: `swarming-${Date.now()}`,
            type: 'swarming',
            strength: distribution,
            participants: surroundingAgents.map(a => a.id),
            stability: 0.8,
            benefit: 0.9,
            description: `${surroundingAgents.length} agents surrounding target position`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect foraging pattern
   */
  private detectForaging(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    const foragers = Array.from(swarm.agents.values()).filter(
      a => a.state.activity === 'foraging' || a.state.activity === 'following',
    );

    if (foragers.length < threshold.minAgents) {return null;}

    // Check for trail following
    const trailFollowers = foragers.filter(a => a.state.activity === 'following');
    const recruiters = foragers.filter(a => a.state.activity === 'recruiting');

    const efficiency = (trailFollowers.length + recruiters.length * 2) / foragers.length;

    if (efficiency > 0.5) {
      return {
        id: `foraging-${Date.now()}`,
        type: 'foraging',
        strength: efficiency,
        participants: foragers.map(a => a.id),
        stability: 0.7,
        benefit: efficiency * 0.9,
        description: `Efficient foraging with ${trailFollowers.length} followers and ${recruiters.length} recruiters`,
      };
    }

    return null;
  }

  /**
   * Detect sorting behavior
   */
  private detectSorting(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    // Analyze spatial distribution of agents by type
    const typeDistribution = this.analyzeTypeDistribution(swarm);

    if (typeDistribution.segregation > threshold.segregationThreshold) {
      return {
        id: `sorting-${Date.now()}`,
        type: 'sorting',
        strength: typeDistribution.segregation,
        participants: Array.from(swarm.agents.keys()),
        stability: 0.8,
        benefit: 0.7,
        description: `Self-organized sorting with ${(typeDistribution.segregation * 100).toFixed(1)}% segregation`,
      };
    }

    return null;
  }

  /**
   * Detect clustering
   */
  private detectClustering(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    const clusters = this.findClusters(swarm, threshold.distanceThreshold);

    if (clusters.length >= 2) {
      const largestCluster = clusters.reduce((max, c) =>
        c.members.length > max.members.length ? c : max,
      );

      const clusteringCoefficient = clusters.reduce((sum, c) =>
        sum + c.members.length, 0,
      ) / swarm.agents.size;

      return {
        id: `clustering-${Date.now()}`,
        type: 'clustering',
        strength: clusteringCoefficient,
        participants: clusters.flatMap(c => c.members),
        stability: largestCluster.density,
        benefit: 0.6,
        description: `${clusters.length} distinct clusters formed with ${(clusteringCoefficient * 100).toFixed(1)}% participation`,
      };
    }

    return null;
  }

  /**
   * Detect synchronization pattern
   */
  private detectSynchronizationPattern(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    // Analyze activity synchronization
    const activitySync = this.analyzeActivitySynchronization(swarm);

    if (activitySync.coherence > threshold.coherenceThreshold) {
      return {
        id: `synchronization-${Date.now()}`,
        type: 'synchronization',
        strength: activitySync.coherence,
        participants: activitySync.synchronizedAgents,
        stability: 0.9,
        benefit: 0.8,
        description: `${activitySync.synchronizedAgents.length} agents synchronized in ${activitySync.dominantActivity} activity`,
      };
    }

    return null;
  }

  /**
   * Detect wave patterns
   */
  private detectWave(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    // Look for propagating patterns
    const waveData = this.analyzeWavePropagation(swarm);

    if (waveData && waveData.strength > threshold.waveThreshold) {
      return {
        id: `wave-${Date.now()}`,
        type: 'wave',
        strength: waveData.strength,
        participants: waveData.participants,
        stability: 0.6,
        benefit: 0.5,
        description: `Wave pattern propagating at speed ${waveData.speed.toFixed(2)}`,
      };
    }

    return null;
  }

  /**
   * Detect spiral formation
   */
  private detectSpiral(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    const agents = Array.from(swarm.agents.values());
    const center = this.calculateSwarmCenter(agents);

    // Check for rotational movement
    let rotatingAgents = 0;
    let totalRotation = 0;

    for (const agent of agents) {
      const rotation = this.calculateRotation(agent, center);
      if (Math.abs(rotation) > threshold.rotationThreshold) {
        rotatingAgents++;
        totalRotation += rotation;
      }
    }

    const participationRate = rotatingAgents / agents.length;
    if (participationRate > threshold.participationThreshold) {
      return {
        id: `spiral-${Date.now()}`,
        type: 'spiral',
        strength: participationRate,
        participants: agents.filter(a => {
          const rotation = this.calculateRotation(a, center);
          return Math.abs(rotation) > threshold.rotationThreshold;
        }).map(a => a.id),
        stability: 0.7,
        benefit: 0.4,
        description: `Spiral formation with ${rotatingAgents} agents rotating ${totalRotation > 0 ? 'clockwise' : 'counter-clockwise'}`,
      };
    }

    return null;
  }

  /**
   * Detect branching structures
   */
  private detectBranching(
    swarm: SwarmIntelligence,
    _threshold: DetectionThreshold,
  ): EmergentPattern | null {
    // Analyze connection patterns
    const branches = this.analyzeBranchingStructure(swarm);

    if (branches.length >= 3) {
      const totalNodes = branches.reduce((sum, b) => sum + b.nodes, 0);

      return {
        id: `branching-${Date.now()}`,
        type: 'branching',
        strength: Math.min(1, branches.length / 10),
        participants: Array.from(swarm.agents.keys()).slice(0, totalNodes),
        stability: 0.8,
        benefit: 0.7,
        description: `Branching structure with ${branches.length} branches`,
      };
    }

    return null;
  }

  /**
   * Detect crystallization
   */
  private detectCrystallization(
    swarm: SwarmIntelligence,
    threshold: DetectionThreshold,
  ): EmergentPattern | null {
    // Check for regular lattice-like arrangements
    const latticeQuality = this.analyzeLatticeStructure(swarm);

    if (latticeQuality > threshold.crystallizationThreshold) {
      return {
        id: `crystallization-${Date.now()}`,
        type: 'crystallization',
        strength: latticeQuality,
        participants: Array.from(swarm.agents.keys()),
        stability: 0.95,
        benefit: 0.8,
        description: `Crystalline structure formed with ${(latticeQuality * 100).toFixed(1)}% regularity`,
      };
    }

    return null;
  }

  /**
   * Detect novel patterns not in predefined types
   */
  private detectNovelPatterns(swarm: SwarmIntelligence): EmergentPattern[] {
    const novelPatterns: EmergentPattern[] = [];

    // Use machine learning or statistical anomaly detection
    // For now, simple heuristic approach

    // Check for unusual agent density patterns
    const densityAnomaly = this.detectDensityAnomaly(swarm);
    if (densityAnomaly) {
      novelPatterns.push({
        id: `novel-density-${Date.now()}`,
        type: 'novel' as PatternType,
        strength: densityAnomaly.strength,
        participants: densityAnomaly.participants,
        stability: 0.5,
        benefit: 0.3,
        description: densityAnomaly.description,
      });
    }

    // Check for unusual communication patterns
    const commAnomaly = this.detectCommunicationAnomaly(swarm);
    if (commAnomaly) {
      novelPatterns.push({
        id: `novel-comm-${Date.now()}`,
        type: 'novel' as PatternType,
        strength: commAnomaly.strength,
        participants: commAnomaly.participants,
        stability: 0.4,
        benefit: 0.4,
        description: commAnomaly.description,
      });
    }

    return novelPatterns;
  }

  /**
   * Detect formations
   */
  private detectFormations(swarm: SwarmIntelligence): Formation[] {
    const formations: Formation[] = [];
    const agents = Array.from(swarm.agents.values());

    // Detect line formations
    const lines = this.detectLineFormations(agents);
    formations.push(...lines);

    // Detect circle formations
    const circles = this.detectCircleFormations(agents);
    formations.push(...circles);

    // Detect grid formations
    const grids = this.detectGridFormations(agents);
    formations.push(...grids);

    // Detect V formations
    const vFormations = this.detectVFormations(agents);
    formations.push(...vFormations);

    return formations;
  }

  /**
   * Detect information cascades
   */
  private detectCascades(swarm: SwarmIntelligence): InformationCascade[] {
    const cascades: InformationCascade[] = [];

    // Analyze message propagation
    const messageGroups = this.groupMessagesByTopic(swarm);

    for (const [topic, messages] of messageGroups) {
      if (messages.length >= swarm.agents.size * 0.2) {
        const cascade = this.analyzeCascade(topic, messages, swarm);
        if (cascade) {
          cascades.push(cascade);
        }
      }
    }

    return cascades;
  }

  /**
   * Detect synchronizations
   */
  private detectSynchronizations(swarm: SwarmIntelligence): Synchronization[] {
    const synchronizations: Synchronization[] = [];

    // Phase synchronization
    const phaseSync = this.detectPhaseSynchronization(swarm);
    if (phaseSync) {synchronizations.push(phaseSync);}

    // Frequency synchronization
    const freqSync = this.detectFrequencySynchronization(swarm);
    if (freqSync) {synchronizations.push(freqSync);}

    // Amplitude synchronization
    const ampSync = this.detectAmplitudeSynchronization(swarm);
    if (ampSync) {synchronizations.push(ampSync);}

    return synchronizations;
  }

  /**
   * Detect innovations
   */
  private detectInnovations(swarm: SwarmIntelligence): Innovation[] {
    const innovations: Innovation[] = [];

    // Check each agent for novel behaviors
    for (const agent of swarm.agents.values()) {
      // High fitness with unique position
      if (agent.fitness > swarm.performance.solutionQuality * 1.2) {
        const isUnique = this.isUniquePosition(agent.position, swarm);

        if (isUnique) {
          innovations.push({
            id: `innovation-${Date.now()}-${agent.id}`,
            innovatorId: agent.id,
            type: 'discovery',
            parent: [],
            description: 'Novel high-fitness position discovered',
            fitness: agent.fitness,
            adopted: false,
            adopters: [],
          });
        }
      }

      // Novel movement patterns
      const novelMovement = this.detectNovelMovement(agent, swarm);
      if (novelMovement) {
        innovations.push(novelMovement);
      }
    }

    return innovations;
  }

  /**
   * Amplify beneficial emergent behaviors
   */
  amplifyEmergentBehaviors(
    behaviors: EmergentBehavior,
    swarm: SwarmIntelligence,
    environment: StigmergicEnvironment,
  ): AmplificationResult {
    const amplifiedPatterns: string[] = [];
    const modifications: EnvironmentModification[] = [];

    // Amplify each beneficial pattern
    for (const pattern of behaviors.patterns) {
      if (pattern.benefit > 0.5) {
        const strategy = this.amplificationStrategies.get(pattern.type);
        if (strategy) {
          const result = this.applyAmplificationStrategy(
            pattern,
            strategy,
            swarm,
            environment,
          );

          if (result.success) {
            amplifiedPatterns.push(pattern.id);
            modifications.push(...result.modifications);
          }
        }
      }
    }

    // Amplify beneficial formations
    for (const formation of behaviors.formations) {
      if (formation.stability > 0.7) {
        const result = this.amplifyFormation(formation, swarm, environment);
        modifications.push(...result.modifications);
      }
    }

    // Spread successful innovations
    for (const innovation of behaviors.innovations) {
      if (innovation.fitness > swarm.performance.solutionQuality * 1.1) {
        this.spreadInnovation(innovation, swarm);
      }
    }

    return {
      amplifiedPatterns,
      modifications,
      expectedImprovement: this.calculateExpectedImprovement(
        amplifiedPatterns,
        behaviors,
      ),
    };
  }

  /**
   * Helper methods
   */

  private initializeThresholds(): void {
    // Flocking thresholds
    this.detectionThresholds.set('flocking', {
      minAgents: 5,
      alignmentThreshold: 0.7,
      distanceThreshold: 0.3,
      participationThreshold: 0.5,
      coherenceThreshold: 0.6,
      segregationThreshold: 0.7,
      rotationThreshold: 0.1,
      waveThreshold: 0.5,
      crystallizationThreshold: 0.8,
    });

    // Similar for other pattern types...
    const defaultThreshold: DetectionThreshold = {
      minAgents: 3,
      alignmentThreshold: 0.6,
      distanceThreshold: 0.4,
      participationThreshold: 0.4,
      coherenceThreshold: 0.5,
      segregationThreshold: 0.6,
      rotationThreshold: 0.15,
      waveThreshold: 0.4,
      crystallizationThreshold: 0.7,
    };

    const patternTypes: PatternType[] = [
      'swarming', 'foraging', 'sorting', 'clustering',
      'synchronization', 'wave', 'spiral', 'branching', 'crystallization',
    ];

    for (const type of patternTypes) {
      if (!this.detectionThresholds.has(type)) {
        this.detectionThresholds.set(type, { ...defaultThreshold });
      }
    }
  }

  private initializeStrategies(): void {
    // Flocking amplification
    this.amplificationStrategies.set('flocking', {
      type: 'flocking',
      pheromoneBoost: {
        type: 'convergence',
        intensityMultiplier: 1.5,
        rangeMultiplier: 1.2,
      },
      messageAmplification: {
        type: 'coordination',
        priorityBoost: 0.2,
        ttlExtension: 2,
      },
      environmentModifications: [
        {
          type: 'create-attractor',
          strength: 0.8,
          duration: 300,
        },
      ],
    });

    // Foraging amplification
    this.amplificationStrategies.set('foraging', {
      type: 'foraging',
      pheromoneBoost: {
        type: 'trail',
        intensityMultiplier: 2.0,
        rangeMultiplier: 1.0,
      },
      messageAmplification: {
        type: 'recruitment',
        priorityBoost: 0.3,
        ttlExtension: 3,
      },
      environmentModifications: [
        {
          type: 'enhance-gradient',
          strength: 0.9,
          duration: 600,
        },
      ],
    });

    // Add more strategies for other patterns...
  }

  private calculateAverageVelocity(agents: SwarmAgent[]): Velocity {
    const avgComponents = new Array(3).fill(0);
    let count = 0;

    for (const agent of agents) {
      if (agent.velocity.magnitude > 0) {
        for (let i = 0; i < avgComponents.length; i++) {
          avgComponents[i] += agent.velocity.components[i] || 0;
        }
        count++;
      }
    }

    if (count > 0) {
      for (let i = 0; i < avgComponents.length; i++) {
        avgComponents[i] /= count;
      }
    }

    const magnitude = Math.sqrt(avgComponents.reduce((sum, c) => sum + c * c, 0));

    return {
      components: avgComponents,
      magnitude,
      inertia: 0.7,
    };
  }

  private calculateAlignment(v1: Velocity, v2: Velocity): number {
    if (v1.magnitude === 0 || v2.magnitude === 0) {return 0;}

    let dotProduct = 0;
    for (let i = 0; i < v1.components.length; i++) {
      dotProduct += (v1.components[i] / v1.magnitude) *
                   (v2.components[i] / v2.magnitude);
    }

    return Math.max(0, dotProduct);
  }

  private calculateDistance(p1: Position, p2: Position): number {
    let sum = 0;
    for (let i = 0; i < p1.dimensions.length; i++) {
      const diff = p1.dimensions[i] - p2.dimensions[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private calculatePatternStability(
    patternType: string,
    swarmId: string,
  ): number {
    const history = this.patternHistory.get(`${patternType}-${swarmId}`);
    if (!history) {return 0.5;}

    // Calculate stability based on consistency over time
    const recentOccurrences = history.occurrences.filter(
      o => Date.now() - o.timestamp < 60000, // Last minute
    );

    if (recentOccurrences.length < 2) {return 0.5;}

    // Calculate variance in strength
    const strengths = recentOccurrences.map(o => o.strength);
    const avgStrength = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
    const variance = strengths.reduce((sum, s) =>
      sum + Math.pow(s - avgStrength, 2), 0,
    ) / strengths.length;

    // Lower variance = higher stability
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private findSwarmTargets(agents: SwarmAgent[]): Position[] {
    // Find high-value positions that agents might swarm around
    const targets: Position[] = [];

    // Use clustering to find concentration points
    const clusters = this.simpleClustering(
      agents.map(a => a.position),
      0.5,
    );

    for (const cluster of clusters) {
      if (cluster.length >= 5) {
        targets.push(this.calculateClusterCenter(cluster));
      }
    }

    return targets;
  }

  private calculateAngularDistribution(
    agents: SwarmAgent[],
    center: Position,
  ): number {
    // Calculate how evenly agents are distributed around center
    const angles: number[] = [];

    for (const agent of agents) {
      const dx = agent.position.dimensions[0] - center.dimensions[0];
      const dy = agent.position.dimensions[1] - center.dimensions[1];
      const angle = Math.atan2(dy, dx);
      angles.push(angle);
    }

    angles.sort((a, b) => a - b);

    // Calculate angular gaps
    const gaps: number[] = [];
    for (let i = 0; i < angles.length; i++) {
      const next = (i + 1) % angles.length;
      let gap = angles[next] - angles[i];
      if (gap < 0) {gap += 2 * Math.PI;}
      gaps.push(gap);
    }

    // Even distribution has similar gaps
    const avgGap = (2 * Math.PI) / angles.length;
    const gapVariance = gaps.reduce((sum, g) =>
      sum + Math.pow(g - avgGap, 2), 0,
    ) / gaps.length;

    // Lower variance = better distribution
    return Math.max(0, 1 - Math.sqrt(gapVariance) / avgGap);
  }

  private analyzeTypeDistribution(swarm: SwarmIntelligence): {
    segregation: number;
  } {
    // Analyze how well agents are sorted by type
    const typeGroups = new Map<string, Position[]>();

    for (const agent of swarm.agents.values()) {
      if (!typeGroups.has(agent.type)) {
        typeGroups.set(agent.type, []);
      }
      typeGroups.get(agent.type)!.push(agent.position);
    }

    // Calculate inter-type vs intra-type distances
    let intraTypeDistance = 0;
    let interTypeDistance = 0;
    let intraCount = 0;
    let interCount = 0;

    for (const [type1, positions1] of typeGroups) {
      // Intra-type distances
      for (let i = 0; i < positions1.length - 1; i++) {
        for (let j = i + 1; j < positions1.length; j++) {
          intraTypeDistance += this.calculateDistance(positions1[i], positions1[j]);
          intraCount++;
        }
      }

      // Inter-type distances
      for (const [type2, positions2] of typeGroups) {
        if (type1 !== type2) {
          for (const pos1 of positions1) {
            for (const pos2 of positions2) {
              interTypeDistance += this.calculateDistance(pos1, pos2);
              interCount++;
            }
          }
        }
      }
    }

    const avgIntraDistance = intraCount > 0 ? intraTypeDistance / intraCount : 0;
    const avgInterDistance = interCount > 0 ? interTypeDistance / interCount : 1;

    // High segregation when intra-type distance << inter-type distance
    const segregation = avgInterDistance > 0 ?
      (avgInterDistance - avgIntraDistance) / avgInterDistance : 0;

    return { segregation: Math.max(0, Math.min(1, segregation)) };
  }

  private findClusters(
    swarm: SwarmIntelligence,
    distanceThreshold: number,
  ): Cluster[] {
    const agents = Array.from(swarm.agents.values());
    const clusters: Cluster[] = [];
    const visited = new Set<string>();

    for (const agent of agents) {
      if (visited.has(agent.id)) {continue;}

      const cluster = this.expandCluster(
        agent,
        agents,
        distanceThreshold,
        visited,
      );

      if (cluster.members.length >= 3) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private expandCluster(
    seed: SwarmAgent,
    agents: SwarmAgent[],
    distanceThreshold: number,
    visited: Set<string>,
  ): Cluster {
    const members: string[] = [seed.id];
    visited.add(seed.id);

    const toCheck = [seed];
    const positions: Position[] = [seed.position];

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;

      for (const agent of agents) {
        if (visited.has(agent.id)) {continue;}

        const distance = this.calculateDistance(current.position, agent.position);
        if (distance <= distanceThreshold) {
          members.push(agent.id);
          positions.push(agent.position);
          visited.add(agent.id);
          toCheck.push(agent);
        }
      }
    }

    const center = this.calculateClusterCenter(positions);
    const density = members.length / (Math.PI * distanceThreshold * distanceThreshold);

    return {
      members,
      center,
      radius: distanceThreshold,
      density: Math.min(1, density),
    };
  }

  private calculateClusterCenter(positions: Position[]): Position {
    const dimensions = positions[0].dimensions.length;
    const center = new Array(dimensions).fill(0);

    for (const pos of positions) {
      for (let i = 0; i < dimensions; i++) {
        center[i] += pos.dimensions[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      center[i] /= positions.length;
    }

    return {
      dimensions: center,
      confidence: positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length,
      timestamp: Date.now(),
    };
  }

  private analyzeActivitySynchronization(swarm: SwarmIntelligence): {
    coherence: number;
    dominantActivity: ActivityState;
    synchronizedAgents: string[];
  } {
    const activityCounts = new Map<ActivityState, string[]>();

    for (const [id, agent] of swarm.agents) {
      const { activity } = agent.state;
      if (!activityCounts.has(activity)) {
        activityCounts.set(activity, []);
      }
      activityCounts.get(activity)!.push(id);
    }

    // Find dominant activity
    let dominantActivity: ActivityState = 'foraging';
    let maxCount = 0;

    for (const [activity, agents] of activityCounts) {
      if (agents.length > maxCount) {
        maxCount = agents.length;
        dominantActivity = activity;
      }
    }

    const coherence = maxCount / swarm.agents.size;
    const synchronizedAgents = activityCounts.get(dominantActivity) || [];

    return { coherence, dominantActivity, synchronizedAgents };
  }

  private analyzeWavePropagation(swarm: SwarmIntelligence): {
    strength: number;
    speed: number;
    participants: string[];
  } | null {
    // Simple wave detection based on sequential activation
    // In reality, would track temporal patterns

    const recentlyActive = Array.from(swarm.agents.values())
      .filter(a => a.state.energy > 0.8)
      .sort((a, b) => a.position.dimensions[0] - b.position.dimensions[0]);

    if (recentlyActive.length < 5) {return null;}

    // Check for wave-like progression
    let consistentProgression = 0;
    for (let i = 1; i < recentlyActive.length; i++) {
      const prevX = recentlyActive[i - 1].position.dimensions[0];
      const currX = recentlyActive[i].position.dimensions[0];
      if (currX > prevX) {
        consistentProgression++;
      }
    }

    const strength = consistentProgression / (recentlyActive.length - 1);

    if (strength > 0.7) {
      const distance = recentlyActive[recentlyActive.length - 1].position.dimensions[0] -
                      recentlyActive[0].position.dimensions[0];
      const speed = distance / recentlyActive.length;

      return {
        strength,
        speed,
        participants: recentlyActive.map(a => a.id),
      };
    }

    return null;
  }

  private calculateSwarmCenter(agents: SwarmAgent[]): Position {
    return this.calculateClusterCenter(agents.map(a => a.position));
  }

  private calculateRotation(agent: SwarmAgent, center: Position): number {
    // Calculate angular velocity around center
    const dx = agent.position.dimensions[0] - center.dimensions[0];
    const dy = agent.position.dimensions[1] - center.dimensions[1];
    const r = Math.sqrt(dx * dx + dy * dy);

    if (r < 0.1) {return 0;}

    // Cross product of radius and velocity vectors
    const crossProduct = dx * agent.velocity.components[1] -
                        dy * agent.velocity.components[0];

    return crossProduct / (r * r);
  }

  private analyzeBranchingStructure(_swarm: SwarmIntelligence): Branch[] {
    // Simplified branching detection
    const branches: Branch[] = [];

    // Would implement proper tree/graph analysis
    const mockBranches = Math.floor(Math.random() * 5);
    for (let i = 0; i < mockBranches; i++) {
      branches.push({
        id: `branch-${i}`,
        nodes: Math.floor(Math.random() * 10) + 3,
        depth: Math.floor(Math.random() * 4) + 1,
      });
    }

    return branches;
  }

  private analyzeLatticeStructure(swarm: SwarmIntelligence): number {
    // Check for regular grid-like arrangement
    const agents = Array.from(swarm.agents.values());
    if (agents.length < 9) {return 0;}

    // Find nearest neighbors for each agent
    let regularityScore = 0;

    for (const agent of agents) {
      const neighbors = this.findNearestNeighbors(agent, agents, 6);

      // Check if neighbors form regular pattern
      const distances = neighbors.map(n =>
        this.calculateDistance(agent.position, n.position),
      );

      const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
      const variance = distances.reduce((sum, d) =>
        sum + Math.pow(d - avgDistance, 2), 0,
      ) / distances.length;

      // Low variance indicates regularity
      if (variance < avgDistance * 0.1) {
        regularityScore++;
      }
    }

    return regularityScore / agents.length;
  }

  private findNearestNeighbors(
    agent: SwarmAgent,
    agents: SwarmAgent[],
    k: number,
  ): SwarmAgent[] {
    return agents
      .filter(a => a.id !== agent.id)
      .sort((a, b) =>
        this.calculateDistance(agent.position, a.position) -
        this.calculateDistance(agent.position, b.position),
      )
      .slice(0, k);
  }

  private detectDensityAnomaly(swarm: SwarmIntelligence): {
    strength: number;
    participants: string[];
    description: string;
  } | null {
    // Detect unusual agent concentrations
    const densityMap = this.calculateDensityMap(swarm);

    // Find anomalous high-density regions
    for (const [region, density] of densityMap) {
      if (density.value > density.expected * 2) {
        return {
          strength: Math.min(1, density.value / (density.expected * 3)),
          participants: density.agents,
          description: `Anomalous concentration in region ${region}`,
        };
      }
    }

    return null;
  }

  private calculateDensityMap(swarm: SwarmIntelligence): Map<string, {
    value: number;
    expected: number;
    agents: string[];
  }> {
    // Divide space into regions and calculate density
    const map = new Map<string, { value: number; expected: number; agents: string[] }>();

    // Simplified grid-based density
    const gridSize = 10;
    const agentsPerRegion = new Map<string, string[]>();

    for (const [id, agent] of swarm.agents) {
      const x = Math.floor(agent.position.dimensions[0] * gridSize);
      const y = Math.floor(agent.position.dimensions[1] * gridSize);
      const region = `${x},${y}`;

      if (!agentsPerRegion.has(region)) {
        agentsPerRegion.set(region, []);
      }
      agentsPerRegion.get(region)!.push(id);
    }

    const expectedPerRegion = swarm.agents.size / (gridSize * gridSize);

    for (const [region, agents] of agentsPerRegion) {
      map.set(region, {
        value: agents.length,
        expected: expectedPerRegion,
        agents,
      });
    }

    return map;
  }

  private detectCommunicationAnomaly(swarm: SwarmIntelligence): {
    strength: number;
    participants: string[];
    description: string;
  } | null {
    // Detect unusual communication patterns
    const messageStats = new Map<string, number>();

    // Count messages per agent
    for (const agent of swarm.agents.values()) {
      messageStats.set(agent.id, agent.messages.length);
    }

    // Find outliers
    const counts = Array.from(messageStats.values());
    const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    const stdDev = Math.sqrt(counts.reduce((sum, c) =>
      sum + Math.pow(c - avg, 2), 0,
    ) / counts.length);

    const outliers: string[] = [];
    for (const [id, count] of messageStats) {
      if (count > avg + 2 * stdDev) {
        outliers.push(id);
      }
    }

    if (outliers.length > 0) {
      return {
        strength: Math.min(1, outliers.length / swarm.agents.size),
        participants: outliers,
        description: `${outliers.length} agents showing unusual communication activity`,
      };
    }

    return null;
  }

  private simpleClustering(positions: Position[], epsilon: number): Position[][] {
    const clusters: Position[][] = [];
    const visited = new Set<number>();

    for (let i = 0; i < positions.length; i++) {
      if (visited.has(i)) {continue;}

      const cluster: Position[] = [positions[i]];
      visited.add(i);

      for (let j = i + 1; j < positions.length; j++) {
        if (visited.has(j)) {continue;}

        const distance = this.calculateDistance(positions[i], positions[j]);
        if (distance <= epsilon) {
          cluster.push(positions[j]);
          visited.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  private updatePatternHistory(patterns: EmergentPattern[]): void {
    for (const pattern of patterns) {
      const key = `${pattern.type}-${pattern.id.split('-')[1]}`;

      if (!this.patternHistory.has(key)) {
        this.patternHistory.set(key, {
          type: pattern.type,
          firstDetected: Date.now(),
          occurrences: [],
        });
      }

      const history = this.patternHistory.get(key)!;
      history.occurrences.push({
        timestamp: Date.now(),
        strength: pattern.strength,
        participantCount: pattern.participants.length,
      });

      // Keep only recent history
      const cutoff = Date.now() - 300000; // 5 minutes
      history.occurrences = history.occurrences.filter(o => o.timestamp > cutoff);
    }
  }

  private analyzePatternInteractions(
    patterns: EmergentPattern[],
    _formations: Formation[],
    _cascades: InformationCascade[],
  ): PatternInteraction[] {
    const interactions: PatternInteraction[] = [];

    // Check for pattern combinations
    for (let i = 0; i < patterns.length - 1; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const overlap = this.calculateParticipantOverlap(
          patterns[i].participants,
          patterns[j].participants,
        );

        if (overlap > 0.5) {
          interactions.push({
            pattern1: patterns[i].id,
            pattern2: patterns[j].id,
            type: 'synergistic',
            strength: overlap,
            effect: 'amplification',
          });
        }
      }
    }

    return interactions;
  }

  private calculateParticipantOverlap(
    participants1: string[],
    participants2: string[],
  ): number {
    const set1 = new Set(participants1);
    const set2 = new Set(participants2);

    let overlap = 0;
    for (const p of set1) {
      if (set2.has(p)) {overlap++;}
    }

    return overlap / Math.max(set1.size, set2.size);
  }

  private detectLineFormations(_agents: SwarmAgent[]): Formation[] {
    // Detect linear arrangements
    const formations: Formation[] = [];

    // Would implement RANSAC or similar line detection
    return formations;
  }

  private detectCircleFormations(_agents: SwarmAgent[]): Formation[] {
    // Detect circular arrangements
    const formations: Formation[] = [];

    // Would implement circle detection algorithm
    return formations;
  }

  private detectGridFormations(_agents: SwarmAgent[]): Formation[] {
    // Detect grid arrangements
    const formations: Formation[] = [];

    // Would implement grid detection
    return formations;
  }

  private detectVFormations(_agents: SwarmAgent[]): Formation[] {
    // Detect V-shaped formations (like migrating birds)
    const formations: Formation[] = [];

    // Would implement V-formation detection
    return formations;
  }

  private groupMessagesByTopic(
    swarm: SwarmIntelligence,
  ): Map<string, SwarmMessage[]> {
    const groups = new Map<string, SwarmMessage[]>();

    for (const agent of swarm.agents.values()) {
      for (const message of agent.messages) {
        const { topic } = message.content;
        if (!groups.has(topic)) {
          groups.set(topic, []);
        }
        groups.get(topic)!.push(message);
      }
    }

    return groups;
  }

  private analyzeCascade(
    topic: string,
    messages: SwarmMessage[],
    swarm: SwarmIntelligence,
  ): InformationCascade | null {
    if (messages.length < 3) {return null;}

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    const initiator = messages[0].senderId;
    const adopters = new Set(messages.map(m => m.senderId));
    const resisters = Array.from(swarm.agents.keys())
      .filter(id => !adopters.has(id));

    const timeSpan = messages[messages.length - 1].timestamp - messages[0].timestamp;
    const speed = adopters.size / (timeSpan / 1000);

    return {
      id: `cascade-${topic}-${Date.now()}`,
      initiator,
      information: topic,
      spread: adopters.size / swarm.agents.size,
      adopters: Array.from(adopters),
      resisters,
      speed,
    };
  }

  private detectPhaseSynchronization(
    swarm: SwarmIntelligence,
  ): Synchronization | null {
    // Detect phase alignment in cyclic behaviors
    const phases = new Map<string, number>();

    for (const [id, agent] of swarm.agents) {
      // Calculate phase based on position in activity cycle
      const phase = this.calculateActivityPhase(agent);
      phases.set(id, phase);
    }

    // Check for phase clustering
    const phaseCoherence = this.calculatePhaseCoherence(phases);

    if (phaseCoherence > 0.7) {
      return {
        type: 'phase',
        participants: Array.from(phases.keys()),
        coherence: phaseCoherence,
        period: 1.0, // Would calculate actual period
      };
    }

    return null;
  }

  private calculateActivityPhase(agent: SwarmAgent): number {
    // Map activity to phase
    const activityPhases: Record<ActivityState, number> = {
      'foraging': 0,
      'recruiting': 0.125,
      'following': 0.25,
      'dancing': 0.375,
      'building': 0.5,
      'converging': 0.625,
      'diverging': 0.75,
      'synchronizing': 0.875,
      'innovating': 1.0,
    };

    return activityPhases[agent.state.activity] || 0;
  }

  private calculatePhaseCoherence(phases: Map<string, number>): number {
    const values = Array.from(phases.values());

    // Calculate circular mean
    let sumSin = 0;
    let sumCos = 0;

    for (const phase of values) {
      sumSin += Math.sin(2 * Math.PI * phase);
      sumCos += Math.cos(2 * Math.PI * phase);
    }

    const meanVector = Math.sqrt(sumSin * sumSin + sumCos * sumCos) / values.length;
    return meanVector;
  }

  private detectFrequencySynchronization(
    _swarm: SwarmIntelligence,
  ): Synchronization | null {
    // Would analyze oscillation frequencies
    return null;
  }

  private detectAmplitudeSynchronization(
    _swarm: SwarmIntelligence,
  ): Synchronization | null {
    // Would analyze amplitude alignment
    return null;
  }

  private isUniquePosition(
    position: Position,
    swarm: SwarmIntelligence,
  ): boolean {
    for (const agent of swarm.agents.values()) {
      const distance = this.calculateDistance(position, agent.position);
      if (distance < 0.1) {return false;}
    }
    return true;
  }

  private detectNovelMovement(
    agent: SwarmAgent,
    swarm: SwarmIntelligence,
  ): Innovation | null {
    // Detect unusual movement patterns
    if (agent.velocity.magnitude > swarm.state.temperature * 2) {
      return {
        id: `innovation-movement-${Date.now()}`,
        innovatorId: agent.id,
        type: 'mutation',
        parent: [],
        description: 'High-velocity exploration pattern',
        fitness: agent.fitness,
        adopted: false,
        adopters: [],
      };
    }

    return null;
  }

  private applyAmplificationStrategy(
    pattern: EmergentPattern,
    strategy: AmplificationStrategy,
    swarm: SwarmIntelligence,
    environment: StigmergicEnvironment,
  ): { success: boolean; modifications: EnvironmentModification[] } {
    const modifications: EnvironmentModification[] = [];

    // Amplify pheromones
    if (strategy.pheromoneBoost && swarm.swarmId) {
      for (const participantId of pattern.participants) {
        const agent = swarm.agents.get(participantId);
        if (agent) {
          const boost: PheromoneDeposit = {
            id: `amplify-${pattern.id}-${participantId}`,
            type: strategy.pheromoneBoost.type,
            position: agent.position,
            strength: agent.fitness * strategy.pheromoneBoost.intensityMultiplier,
            evaporationRate: 0.05, // Slower evaporation for amplified
            depositorId: `amplifier-${pattern.type}`,
            timestamp: Date.now(),
            metadata: {
              pattern: pattern.type,
              amplification: true,
            },
          };

          environment.depositPheromone(swarm.swarmId, boost);
        }
      }
    }

    // Amplify messages
    if (strategy.messageAmplification) {
      for (const participantId of pattern.participants) {
        const agent = swarm.agents.get(participantId);
        if (agent) {
          for (const message of agent.messages) {
            if (message.type === strategy.messageAmplification.type) {
              message.priority += strategy.messageAmplification.priorityBoost;
              message.ttl += strategy.messageAmplification.ttlExtension;
            }
          }
        }
      }
    }

    // Apply environment modifications
    for (const mod of strategy.environmentModifications) {
      modifications.push({
        ...mod,
        position: this.calculatePatternCenter(pattern, swarm),
        timestamp: Date.now(),
      });
    }

    return { success: true, modifications };
  }

  private calculatePatternCenter(
    pattern: EmergentPattern,
    swarm: SwarmIntelligence,
  ): Position {
    const positions: Position[] = [];

    for (const participantId of pattern.participants) {
      const agent = swarm.agents.get(participantId);
      if (agent) {
        positions.push(agent.position);
      }
    }

    return this.calculateClusterCenter(positions);
  }

  private amplifyFormation(
    formation: Formation,
    _swarm: SwarmIntelligence,
    _environment: StigmergicEnvironment,
  ): { modifications: EnvironmentModification[] } {
    const modifications: EnvironmentModification[] = [];

    // Create attractive field around formation
    modifications.push({
      type: 'create-field',
      position: formation.center,
      strength: formation.stability,
      duration: 600,
      radius: formation.radius * 1.5,
      timestamp: Date.now(),
    });

    return { modifications };
  }

  private spreadInnovation(
    innovation: Innovation,
    swarm: SwarmIntelligence,
  ): void {
    const innovator = swarm.agents.get(innovation.innovatorId);
    if (!innovator) {return;}

    // Spread to neighbors
    for (const neighborId of innovator.neighbors) {
      const neighbor = swarm.agents.get(neighborId);
      if (neighbor && !innovation.adopters.includes(neighborId)) {
        // Send innovation message
        const message: SwarmMessage = {
          id: `spread-${innovation.id}-${neighborId}`,
          type: 'innovation',
          senderId: innovation.innovatorId,
          recipientIds: [neighborId],
          content: {
            topic: 'innovation-spread',
            data: innovation,
            confidence: innovation.fitness,
            evidence: [],
          },
          priority: innovation.fitness,
          ttl: 10,
          hops: 0,
          timestamp: Date.now(),
        };

        neighbor.messages.push(message);
      }
    }
  }

  private calculateExpectedImprovement(
    amplifiedPatterns: string[],
    behaviors: EmergentBehavior,
  ): number {
    let improvement = 0;

    for (const patternId of amplifiedPatterns) {
      const pattern = behaviors.patterns.find(p => p.id === patternId);
      if (pattern) {
        improvement += pattern.benefit * pattern.strength * 0.2;
      }
    }

    return Math.min(1, improvement);
  }
}

// Type definitions
interface DetectionThreshold {
  minAgents: number;
  alignmentThreshold: number;
  distanceThreshold: number;
  participationThreshold: number;
  coherenceThreshold: number;
  segregationThreshold: number;
  rotationThreshold: number;
  waveThreshold: number;
  crystallizationThreshold: number;
}

interface PatternHistory {
  type: PatternType;
  firstDetected: number;
  occurrences: Array<{
    timestamp: number;
    strength: number;
    participantCount: number;
  }>;
}

interface AmplificationStrategy {
  type: PatternType;
  pheromoneBoost?: {
    type: PheromoneType;
    intensityMultiplier: number;
    rangeMultiplier: number;
  };
  messageAmplification?: {
    type: MessageType;
    priorityBoost: number;
    ttlExtension: number;
  };
  environmentModifications: Array<{
    type: string;
    strength: number;
    duration: number;
  }>;
}

interface AmplificationResult {
  amplifiedPatterns: string[];
  modifications: EnvironmentModification[];
  expectedImprovement: number;
}

interface EnvironmentModification {
  type: string;
  position: Position;
  strength: number;
  duration: number;
  radius?: number;
  timestamp: number;
}

interface Cluster {
  members: string[];
  center: Position;
  radius: number;
  density: number;
}

interface Branch {
  id: string;
  nodes: number;
  depth: number;
}

interface PatternInteraction {
  pattern1: string;
  pattern2: string;
  type: 'synergistic' | 'antagonistic' | 'neutral';
  strength: number;
  effect: 'amplification' | 'suppression' | 'modulation';
}

/**
 * Export main detector
 */
export const emergentBehaviorDetector = new EmergentBehaviorDetector();