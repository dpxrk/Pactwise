/**
 * Knowledge Consolidation System
 *
 * Implements advanced consolidation mechanisms for long-term knowledge retention,
 * including sleep-like replay, knowledge distillation, and semantic compression.
 */

import {
  KnowledgeBase,
  CoreKnowledge,
  TaskKnowledge,
  CrossTaskPattern,
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeCluster,
  Experience,
  ConsolidationState,
} from './types.ts';

// Extended internal types for knowledge consolidation
interface ExtractedPattern {
  concept: string;
  embedding: number[];
  importance: number;
}

interface GeneratedInsight {
  concept: string;
  embedding: number[];
  confidence: number;
}

interface GraphPattern {
  type: string;
  embedding: number[];
  confidence: number;
}

interface CrossTaskPatternData {
  description: string;
  confidence: number;
  applicability: string[];
  emergentBehavior: string;
}

interface DistilledConcept {
  name: string;
  embedding: number[];
  importance: number;
}

interface ConsolidatedKnowledge {
  coreKnowledge: CoreKnowledge[];
  taskSpecificKnowledge: Map<string, TaskKnowledge>;
}

export class KnowledgeConsolidator {
  private readonly compressionThreshold = 0.85;
  private readonly semanticThreshold = 0.75;

  /**
   * Perform comprehensive knowledge consolidation
   */
  async consolidate(
    knowledgeBase: KnowledgeBase,
    experiences: Experience[],
    consolidationState: ConsolidationState,
  ): Promise<{
    consolidatedKnowledge: KnowledgeBase;
    compressedExperiences: Experience[];
    consolidationMetrics: ConsolidationMetrics;
  }> {
    // Select consolidation method
    const method = consolidationState.consolidationMethod;

    let consolidatedKnowledge = { ...knowledgeBase };
    let compressedExperiences = [...experiences];

    // Apply consolidation based on method
    switch (method.type) {
      case 'sleep':
        const sleepResult = await this.sleepConsolidation(
          consolidatedKnowledge,
          compressedExperiences,
        );
        consolidatedKnowledge = sleepResult.knowledge;
        compressedExperiences = sleepResult.experiences;
        break;

      case 'rehearsal':
        const rehearsalResult = await this.rehearsalConsolidation(
          consolidatedKnowledge,
          compressedExperiences,
        );
        consolidatedKnowledge = rehearsalResult.knowledge;
        compressedExperiences = rehearsalResult.experiences;
        break;

      case 'generation':
        const generationResult = await this.generativeConsolidation(
          consolidatedKnowledge,
          compressedExperiences,
        );
        consolidatedKnowledge = generationResult.knowledge;
        compressedExperiences = generationResult.experiences;
        break;

      case 'distillation':
        const distillationResult = await this.knowledgeDistillation(
          consolidatedKnowledge,
          compressedExperiences,
        );
        consolidatedKnowledge = distillationResult.knowledge;
        compressedExperiences = distillationResult.experiences;
        break;
    }

    // Perform semantic compression
    consolidatedKnowledge = await this.semanticCompression(consolidatedKnowledge);

    // Update knowledge graph
    consolidatedKnowledge.knowledgeGraph = await this.optimizeKnowledgeGraph(
      consolidatedKnowledge.knowledgeGraph,
    );

    // Compute consolidation metrics
    const metrics = this.computeConsolidationMetrics(
      knowledgeBase,
      consolidatedKnowledge,
      experiences,
      compressedExperiences,
    );

    return {
      consolidatedKnowledge,
      compressedExperiences,
      consolidationMetrics: metrics,
    };
  }

  /**
   * Sleep-like consolidation with replay and reorganization
   */
  private async sleepConsolidation(
    knowledge: KnowledgeBase,
    experiences: Experience[],
  ): Promise<{ knowledge: KnowledgeBase; experiences: Experience[] }> {
    // Phase 1: Fast replay (REM-like)
    const importantExperiences = this.selectImportantExperiences(experiences);
    const replayedKnowledge = await this.fastReplay(knowledge, importantExperiences);

    // Phase 2: Slow wave consolidation
    const consolidatedCore = await this.slowWaveConsolidation(replayedKnowledge.coreKnowledge);

    // Phase 3: Memory trace reorganization
    const reorganized = await this.reorganizeMemoryTraces(
      consolidatedCore,
      replayedKnowledge.taskSpecificKnowledge,
    );

    // Phase 4: Synaptic homeostasis
    const pruned = await this.synapticHomeostasis(reorganized);

    return {
      knowledge: {
        ...replayedKnowledge,
        coreKnowledge: pruned.coreKnowledge,
        taskSpecificKnowledge: pruned.taskSpecificKnowledge,
      },
      experiences: this.compressExperiences(experiences, 0.7),
    };
  }

  /**
   * Fast replay of important experiences
   */
  private async fastReplay(
    knowledge: KnowledgeBase,
    experiences: Experience[],
  ): Promise<KnowledgeBase> {
    const updatedKnowledge = { ...knowledge };

    // Group experiences by similarity
    const experienceClusters = this.clusterExperiences(experiences);

    for (const cluster of experienceClusters) {
      // Extract pattern from cluster
      const pattern = await this.extractPatternFromCluster(cluster);

      // Reinforce or create knowledge
      const existingKnowledge = this.findSimilarKnowledge(
        pattern,
        updatedKnowledge.coreKnowledge,
      );

      if (existingKnowledge) {
        // Reinforce existing knowledge
        existingKnowledge.reinforcementCount++;
        existingKnowledge.importance *= 1.1;
        existingKnowledge.lastAccessedAt = new Date();
      } else {
        // Create new core knowledge
        const newKnowledge: CoreKnowledge = {
          id: this.generateId(),
          concept: pattern.concept,
          embedding: pattern.embedding,
          importance: pattern.importance,
          firstLearnedAt: new Date(),
          lastAccessedAt: new Date(),
          reinforcementCount: 1,
          decay: 0.1,
        };
        updatedKnowledge.coreKnowledge.push(newKnowledge);
      }
    }

    return updatedKnowledge;
  }

  /**
   * Slow wave consolidation for deep memory integration
   */
  private async slowWaveConsolidation(
    coreKnowledge: CoreKnowledge[],
  ): Promise<CoreKnowledge[]> {
    // Sort by importance and recency
    const sorted = [...coreKnowledge].sort((a, b) => {
      const scoreA = a.importance * Math.exp(-a.decay * this.daysSince(a.lastAccessedAt));
      const scoreB = b.importance * Math.exp(-b.decay * this.daysSince(b.lastAccessedAt));
      return scoreB - scoreA;
    });

    // Keep top knowledge and merge similar ones
    const consolidated: CoreKnowledge[] = [];
    const processed = new Set<string>();

    for (const knowledge of sorted) {
      if (processed.has(knowledge.id)) {continue;}

      // Find similar knowledge to merge
      const similar = sorted.filter(k =>
        !processed.has(k.id) &&
        k.id !== knowledge.id &&
        this.cosineSimilarity(knowledge.embedding, k.embedding) > this.semanticThreshold,
      );

      if (similar.length > 0) {
        // Merge similar knowledge
        const merged = this.mergeKnowledge(knowledge, similar);
        consolidated.push(merged);

        processed.add(knowledge.id);
        similar.forEach(k => processed.add(k.id));
      } else {
        consolidated.push(knowledge);
        processed.add(knowledge.id);
      }
    }

    return consolidated;
  }

  /**
   * Reorganize memory traces for efficient retrieval
   */
  private async reorganizeMemoryTraces(
    coreKnowledge: CoreKnowledge[],
    taskSpecific: Map<string, TaskKnowledge>,
  ): Promise<{
    coreKnowledge: CoreKnowledge[];
    taskSpecificKnowledge: Map<string, TaskKnowledge>;
  }> {
    // Build semantic index
    const semanticIndex = this.buildSemanticIndex(coreKnowledge);

    // Reorganize task-specific knowledge
    const reorganized = new Map<string, TaskKnowledge>();

    for (const [taskId, taskKnowledge] of taskSpecific) {
      const updatedKnowledge = { ...taskKnowledge };

      // Link task knowledge to core concepts
      updatedKnowledge.knowledge = taskKnowledge.knowledge.map(k => {
        const nearestCore = this.findNearestCore(k, semanticIndex);

        if (nearestCore) {
          // Increase protection for linked knowledge
          return {
            ...k,
            protectionLevel: Math.min(1, k.protectionLevel + 0.1),
          };
        }

        return k;
      });

      reorganized.set(taskId, updatedKnowledge);
    }

    return {
      coreKnowledge,
      taskSpecificKnowledge: reorganized,
    };
  }

  /**
   * Synaptic homeostasis - prune weak connections
   */
  private async synapticHomeostasis(
    knowledge: ConsolidatedKnowledge,
  ): Promise<ConsolidatedKnowledge> {
    const pruned: ConsolidatedKnowledge = {
      coreKnowledge: [...knowledge.coreKnowledge],
      taskSpecificKnowledge: new Map(knowledge.taskSpecificKnowledge),
    };

    // Remove low-importance core knowledge
    pruned.coreKnowledge = pruned.coreKnowledge.filter((k: CoreKnowledge) => {
      const age = this.daysSince(k.firstLearnedAt);
      const accessRecency = this.daysSince(k.lastAccessedAt);
      const retentionScore = k.importance * Math.exp(-k.decay * accessRecency) *
                           (k.reinforcementCount / (age + 1));

      return retentionScore > 0.1; // Retention threshold
    });

    // Prune task-specific knowledge
    for (const [taskId, taskKnowledge] of pruned.taskSpecificKnowledge) {
      const filtered = taskKnowledge.knowledge.filter((k: { protectionLevel: number }) => k.protectionLevel > 0.2);

      if (filtered.length > 0) {
        pruned.taskSpecificKnowledge.set(taskId, {
          ...taskKnowledge,
          knowledge: filtered,
        });
      } else {
        // Remove empty task knowledge
        pruned.taskSpecificKnowledge.delete(taskId);
      }
    }

    return pruned;
  }

  /**
   * Rehearsal-based consolidation
   */
  private async rehearsalConsolidation(
    knowledge: KnowledgeBase,
    experiences: Experience[],
  ): Promise<{ knowledge: KnowledgeBase; experiences: Experience[] }> {
    const updatedKnowledge = { ...knowledge };

    // Select diverse experiences for rehearsal
    const rehearsalSet = this.selectDiverseExperiences(experiences, 0.2);

    // Generate pseudo-experiences
    const augmented = await this.generatePseudoExperiences(rehearsalSet);

    // Update knowledge with rehearsal
    for (const exp of augmented) {
      // Update knowledge graph
      await this.updateKnowledgeFromExperience(updatedKnowledge, exp);
    }

    // Compress experiences
    const compressed = this.compressExperiences(
      [...experiences, ...augmented],
      this.compressionThreshold,
    );

    return {
      knowledge: updatedKnowledge,
      experiences: compressed,
    };
  }

  /**
   * Generative consolidation - create new knowledge
   */
  private async generativeConsolidation(
    knowledge: KnowledgeBase,
    experiences: Experience[],
  ): Promise<{ knowledge: KnowledgeBase; experiences: Experience[] }> {
    const updatedKnowledge = { ...knowledge };

    // Generate new insights from existing knowledge
    const insights = await this.generateInsights(knowledge);

    // Create new cross-task patterns
    const newPatterns = await this.discoverEmergentPatterns(
      knowledge,
      experiences,
    );

    // Add insights as core knowledge
    for (const insight of insights) {
      updatedKnowledge.coreKnowledge.push({
        id: this.generateId(),
        concept: insight.concept,
        embedding: insight.embedding,
        importance: insight.confidence,
        firstLearnedAt: new Date(),
        lastAccessedAt: new Date(),
        reinforcementCount: 0,
        decay: 0.05, // Lower decay for generated insights
      });
    }

    // Add emergent patterns
    updatedKnowledge.crossTaskPatterns.push(...newPatterns);

    return {
      knowledge: updatedKnowledge,
      experiences: this.compressExperiences(experiences, 0.8),
    };
  }

  /**
   * Knowledge distillation - extract essence
   */
  private async knowledgeDistillation(
    knowledge: KnowledgeBase,
    experiences: Experience[],
  ): Promise<{ knowledge: KnowledgeBase; experiences: Experience[] }> {
    const distilled = { ...knowledge };

    // Distill core concepts from task-specific knowledge
    const distilledConcepts = await this.distillConcepts(
      knowledge.taskSpecificKnowledge,
    );

    // Create abstracted knowledge
    for (const concept of distilledConcepts) {
      const existing = distilled.coreKnowledge.find(k =>
        this.cosineSimilarity(k.embedding, concept.embedding) > 0.9,
      );

      if (existing) {
        // Strengthen existing concept
        existing.importance = Math.min(1, existing.importance + concept.importance * 0.5);
        existing.reinforcementCount++;
      } else {
        // Add new distilled concept
        distilled.coreKnowledge.push({
          id: this.generateId(),
          concept: concept.name,
          embedding: concept.embedding,
          importance: concept.importance,
          firstLearnedAt: new Date(),
          lastAccessedAt: new Date(),
          reinforcementCount: 1,
          decay: 0.02, // Very low decay for distilled knowledge
        });
      }
    }

    // Create compressed representations
    const compressedExperiences = await this.createCompressedRepresentations(
      experiences,
      distilledConcepts,
    );

    return {
      knowledge: distilled,
      experiences: compressedExperiences,
    };
  }

  /**
   * Semantic compression of knowledge
   */
  private async semanticCompression(
    knowledge: KnowledgeBase,
  ): Promise<KnowledgeBase> {
    const compressed = { ...knowledge };

    // Compress knowledge graph
    compressed.knowledgeGraph = await this.compressKnowledgeGraph(
      knowledge.knowledgeGraph,
    );

    // Merge redundant patterns
    compressed.crossTaskPatterns = this.mergeRedundantPatterns(
      knowledge.crossTaskPatterns,
    );

    // Update retention scores
    compressed.retentionScores = this.updateRetentionScores(compressed);

    return compressed;
  }

  /**
   * Optimize knowledge graph structure
   */
  private async optimizeKnowledgeGraph(
    graph: KnowledgeGraph,
  ): Promise<KnowledgeGraph> {
    const optimized = { ...graph };

    // Remove weak edges
    optimized.edges = graph.edges.filter(e => e.strength > 0.3);

    // Recompute clusters
    optimized.clusters = await this.computeOptimalClusters(
      optimized.nodes,
      optimized.edges,
    );

    // Add shortcut edges for frequently accessed paths
    const shortcuts = await this.identifyShortcutEdges(optimized);
    optimized.edges.push(...shortcuts);

    return optimized;
  }

  // Helper methods

  private selectImportantExperiences(experiences: Experience[]): Experience[] {
    return experiences
      .sort((a, b) => b.importance - a.importance)
      .slice(0, Math.floor(experiences.length * 0.3));
  }

  private clusterExperiences(experiences: Experience[]): Experience[][] {
    // Simple clustering based on task ID
    const clusters = new Map<string, Experience[]>();

    for (const exp of experiences) {
      const cluster = clusters.get(exp.taskId) || [];
      cluster.push(exp);
      clusters.set(exp.taskId, cluster);
    }

    return Array.from(clusters.values());
  }

  private async extractPatternFromCluster(
    cluster: Experience[],
  ): Promise<ExtractedPattern> {
    // Extract common pattern from experience cluster
    const embeddings = cluster.map(exp => this.computeExperienceEmbedding(exp));
    const centroid = this.computeCentroid(embeddings);

    return {
      concept: `Pattern from ${cluster[0].taskId}`,
      embedding: centroid,
      importance: cluster.reduce((sum, exp) => sum + exp.importance, 0) / cluster.length,
    };
  }

  private findSimilarKnowledge(
    pattern: ExtractedPattern,
    coreKnowledge: CoreKnowledge[],
  ): CoreKnowledge | undefined {
    return coreKnowledge.find(k =>
      this.cosineSimilarity(k.embedding, pattern.embedding) > this.semanticThreshold,
    );
  }

  private mergeKnowledge(
    primary: CoreKnowledge,
    similar: CoreKnowledge[],
  ): CoreKnowledge {
    const allKnowledge = [primary, ...similar];
    const embeddings = allKnowledge.map(k => k.embedding);

    return {
      ...primary,
      embedding: this.computeCentroid(embeddings),
      importance: Math.max(...allKnowledge.map(k => k.importance)),
      reinforcementCount: allKnowledge.reduce((sum, k) => sum + k.reinforcementCount, 0),
      decay: Math.min(...allKnowledge.map(k => k.decay)),
    };
  }

  private buildSemanticIndex(
    coreKnowledge: CoreKnowledge[],
  ): Map<string, CoreKnowledge> {
    const index = new Map<string, CoreKnowledge>();

    for (const knowledge of coreKnowledge) {
      index.set(knowledge.id, knowledge);
    }

    return index;
  }

  private findNearestCore(
    taskKnowledge: unknown,
    semanticIndex: Map<string, CoreKnowledge>,
  ): CoreKnowledge | undefined {
    let nearest: CoreKnowledge | undefined;
    let maxSimilarity = 0;

    for (const core of semanticIndex.values()) {
      const similarity = this.computeConceptSimilarity(taskKnowledge, core);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        nearest = core;
      }
    }

    return maxSimilarity > 0.6 ? nearest : undefined;
  }

  private selectDiverseExperiences(
    experiences: Experience[],
    fraction: number,
  ): Experience[] {
    const targetCount = Math.floor(experiences.length * fraction);
    const selected: Experience[] = [];
    const remaining = [...experiences];

    // Greedy selection for diversity
    while (selected.length < targetCount && remaining.length > 0) {
      let maxMinDistance = -1;
      let bestIndex = 0;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        if (selected.length === 0) {
          selected.push(candidate);
          remaining.splice(i, 1);
          break;
        }

        // Find minimum distance to selected experiences
        const minDistance = Math.min(...selected.map(s =>
          this.experienceDistance(candidate, s),
        ));

        if (minDistance > maxMinDistance) {
          maxMinDistance = minDistance;
          bestIndex = i;
        }
      }

      if (selected.length > 0 && remaining.length > 0) {
        selected.push(remaining[bestIndex]);
        remaining.splice(bestIndex, 1);
      }
    }

    return selected;
  }

  private async generatePseudoExperiences(
    experiences: Experience[],
  ): Promise<Experience[]> {
    const pseudo: Experience[] = [];

    for (let i = 0; i < experiences.length - 1; i++) {
      const exp1 = experiences[i];
      const exp2 = experiences[i + 1];

      // Interpolate between experiences
      pseudo.push({
        id: this.generateId(),
        taskId: exp1.taskId,
        input: this.interpolate(exp1.input, exp2.input, 0.5),
        output: this.interpolate(exp1.output, exp2.output, 0.5),
        reward: (exp1.reward + exp2.reward) / 2,
        importance: (exp1.importance + exp2.importance) / 2,
        timestamp: new Date(),
        replayCount: 0,
        compressed: false,
      });
    }

    return pseudo;
  }

  private async updateKnowledgeFromExperience(
    knowledge: KnowledgeBase,
    experience: Experience,
  ): Promise<void> {
    // Create knowledge node from experience
    const node: KnowledgeNode = {
      id: `node-${experience.id}`,
      content: experience,
      type: 'experience',
      embedding: this.computeExperienceEmbedding(experience),
      activationLevel: experience.importance,
    };

    // Add to knowledge graph
    knowledge.knowledgeGraph.nodes.push(node);

    // Connect to similar nodes
    for (const existing of knowledge.knowledgeGraph.nodes) {
      if (existing.id !== node.id) {
        const similarity = this.cosineSimilarity(node.embedding, existing.embedding);
        if (similarity > 0.6) {
          knowledge.knowledgeGraph.edges.push({
            source: node.id,
            target: existing.id,
            relationship: 'similar',
            strength: similarity,
          });
        }
      }
    }
  }

  private compressExperiences(
    experiences: Experience[],
    threshold: number,
  ): Experience[] {
    // Sort by importance
    const sorted = [...experiences].sort((a, b) => b.importance - a.importance);

    // Keep top experiences
    const keepCount = Math.floor(experiences.length * threshold);
    const kept = sorted.slice(0, keepCount);

    // Compress remaining
    const compressed = sorted.slice(keepCount).map(exp => ({
      ...exp,
      compressed: true,
      input: this.compressData(exp.input),
      output: this.compressData(exp.output),
    }));

    return [...kept, ...compressed];
  }

  private async generateInsights(
    knowledge: KnowledgeBase,
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    // Analyze knowledge graph for patterns
    const patterns = this.analyzeGraphPatterns(knowledge.knowledgeGraph);

    for (const pattern of patterns) {
      insights.push({
        concept: `Insight: ${pattern.type}`,
        embedding: pattern.embedding,
        confidence: pattern.confidence,
      });
    }

    return insights;
  }

  private async discoverEmergentPatterns(
    _knowledge: KnowledgeBase,
    experiences: Experience[],
  ): Promise<CrossTaskPattern[]> {
    const patterns: CrossTaskPattern[] = [];

    // Group experiences by task
    const taskGroups = new Map<string, Experience[]>();
    for (const exp of experiences) {
      const group = taskGroups.get(exp.taskId) || [];
      group.push(exp);
      taskGroups.set(exp.taskId, group);
    }

    // Find patterns across task groups
    const taskIds = Array.from(taskGroups.keys());
    for (let i = 0; i < taskIds.length - 1; i++) {
      for (let j = i + 1; j < taskIds.length; j++) {
        const pattern = this.findCrossTaskPattern(
          taskGroups.get(taskIds[i])!,
          taskGroups.get(taskIds[j])!,
        );

        if (pattern) {
          patterns.push({
            id: this.generateId(),
            pattern: pattern.description,
            sourceTasks: [taskIds[i], taskIds[j]],
            confidence: pattern.confidence,
            applicability: pattern.applicability,
            emergentBehavior: pattern.emergentBehavior,
          });
        }
      }
    }

    return patterns;
  }

  private async distillConcepts(
    taskSpecific: Map<string, TaskKnowledge>,
  ): Promise<DistilledConcept[]> {
    const concepts: DistilledConcept[] = [];

    // Extract high-level concepts from each task
    for (const [taskId, taskKnowledge] of taskSpecific) {
      const taskConcepts = taskKnowledge.knowledge
        .filter(k => k.protectionLevel > 0.7)
        .map(k => ({
          name: `${k.type}_concept_${taskId}`,
          embedding: this.computeKnowledgeEmbedding(k),
          importance: k.protectionLevel,
        }));

      concepts.push(...taskConcepts);
    }

    // Merge similar concepts
    return this.mergeSimilarConcepts(concepts);
  }

  private async createCompressedRepresentations(
    experiences: Experience[],
    concepts: DistilledConcept[],
  ): Promise<Experience[]> {
    return experiences.map(exp => {
      // Find nearest concept
      const expEmbedding = this.computeExperienceEmbedding(exp);
      let nearestConcept: DistilledConcept | null = null;
      let maxSimilarity = 0;

      for (const concept of concepts) {
        const similarity = this.cosineSimilarity(expEmbedding, concept.embedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          nearestConcept = concept;
        }
      }

      if (nearestConcept && maxSimilarity > 0.8) {
        // Compress using concept reference
        return {
          ...exp,
          compressed: true,
          input: { conceptRef: nearestConcept.name, delta: this.computeDelta(exp.input, nearestConcept) },
          output: { conceptRef: nearestConcept.name, delta: this.computeDelta(exp.output, nearestConcept) },
        };
      }

      return exp;
    });
  }

  private async compressKnowledgeGraph(
    graph: KnowledgeGraph,
  ): Promise<KnowledgeGraph> {
    const compressed = { ...graph };

    // Merge highly connected nodes
    const mergedNodes = this.mergeHighlyConnectedNodes(graph.nodes, graph.edges);
    compressed.nodes = mergedNodes.nodes;

    // Update edges for merged nodes
    compressed.edges = this.updateEdgesForMergedNodes(
      graph.edges,
      mergedNodes.mergeMap,
    );

    return compressed;
  }

  private mergeRedundantPatterns(
    patterns: CrossTaskPattern[],
  ): CrossTaskPattern[] {
    const merged: CrossTaskPattern[] = [];
    const processed = new Set<string>();

    for (const pattern of patterns) {
      if (processed.has(pattern.id)) {continue;}

      // Find similar patterns
      const similar = patterns.filter(p =>
        !processed.has(p.id) &&
        p.id !== pattern.id &&
        this.patternSimilarity(pattern, p) > 0.8,
      );

      if (similar.length > 0) {
        // Merge patterns
        const mergedPattern: CrossTaskPattern = {
          ...pattern,
          sourceTasks: Array.from(new Set([
            ...pattern.sourceTasks,
            ...similar.flatMap(p => p.sourceTasks),
          ])),
          confidence: Math.max(pattern.confidence, ...similar.map(p => p.confidence)),
        };

        merged.push(mergedPattern);
        processed.add(pattern.id);
        similar.forEach(p => processed.add(p.id));
      } else {
        merged.push(pattern);
        processed.add(pattern.id);
      }
    }

    return merged;
  }

  private updateRetentionScores(
    knowledge: KnowledgeBase,
  ): Map<string, number> {
    const scores = new Map<string, number>();

    // Score core knowledge
    for (const k of knowledge.coreKnowledge) {
      const age = this.daysSince(k.firstLearnedAt);
      const recency = this.daysSince(k.lastAccessedAt);
      const score = k.importance * Math.exp(-k.decay * recency) *
                   (k.reinforcementCount / (age + 1));
      scores.set(k.id, score);
    }

    // Score task-specific knowledge
    for (const [taskId, taskKnowledge] of knowledge.taskSpecificKnowledge) {
      const taskScore = taskKnowledge.knowledge.reduce((sum, k) =>
        sum + k.protectionLevel, 0,
      ) / taskKnowledge.knowledge.length;
      scores.set(taskId, taskScore);
    }

    return scores;
  }

  private async computeOptimalClusters(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
  ): Promise<KnowledgeCluster[]> {
    // Simplified clustering using connected components
    const clusters: KnowledgeCluster[] = [];
    const visited = new Set<string>();

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const cluster = this.dfsCluster(node.id, nodes, edges, visited);

        if (cluster.size > 1) {
          const nodeArray = Array.from(cluster);
          clusters.push({
            id: `cluster-${clusters.length}`,
            nodeIds: nodeArray,
            centroid: this.computeClusterCentroid(nodeArray, nodes),
            coherence: this.computeClusterCoherence(nodeArray, nodes, edges),
          });
        }
      }
    }

    return clusters;
  }

  private dfsCluster(
    nodeId: string,
    _nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
    visited: Set<string>,
  ): Set<string> {
    const cluster = new Set<string>();
    const stack = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (visited.has(current)) {continue;}

      visited.add(current);
      cluster.add(current);

      // Find connected nodes
      const connected = edges
        .filter(e => (e.source === current || e.target === current) && e.strength > 0.5)
        .map(e => e.source === current ? e.target : e.source)
        .filter(n => !visited.has(n));

      stack.push(...connected);
    }

    return cluster;
  }

  private computeClusterCentroid(
    nodeIds: string[],
    nodes: KnowledgeNode[],
  ): number[] {
    const clusterNodes = nodeIds.map(id => nodes.find(n => n.id === id)!);
    return this.computeCentroid(clusterNodes.map(n => n.embedding));
  }

  private computeClusterCoherence(
    nodeIds: string[],
    _nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
  ): number {
    if (nodeIds.length < 2) {return 1;}

    let totalStrength = 0;
    let edgeCount = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const edge = edges.find(e =>
          (e.source === nodeIds[i] && e.target === nodeIds[j]) ||
          (e.source === nodeIds[j] && e.target === nodeIds[i]),
        );

        if (edge) {
          totalStrength += edge.strength;
          edgeCount++;
        }
      }
    }

    return edgeCount > 0 ? totalStrength / edgeCount : 0;
  }

  private async identifyShortcutEdges(
    graph: KnowledgeGraph,
  ): Promise<KnowledgeEdge[]> {
    const shortcuts: KnowledgeEdge[] = [];

    // Find frequently traversed paths
    const pathFrequencies = this.analyzePathFrequencies(graph);

    for (const [path, frequency] of pathFrequencies) {
      if (frequency > 10 && path.length > 2) {
        // Create shortcut between start and end
        const start = path[0];
        const end = path[path.length - 1];

        // Check if shortcut already exists
        const exists = graph.edges.some(e =>
          (e.source === start && e.target === end) ||
          (e.source === end && e.target === start),
        );

        if (!exists) {
          shortcuts.push({
            source: start,
            target: end,
            relationship: 'shortcut',
            strength: Math.min(1, frequency / 20),
          });
        }
      }
    }

    return shortcuts;
  }

  // Utility methods

  private computeConsolidationMetrics(
    original: KnowledgeBase,
    consolidated: KnowledgeBase,
    originalExp: Experience[],
    compressedExp: Experience[],
  ): ConsolidationMetrics {
    return {
      knowledgeRetention: this.computeKnowledgeRetention(original, consolidated),
      compressionRatio: compressedExp.length / originalExp.length,
      semanticPreservation: this.computeSemanticPreservation(original, consolidated),
      emergentPatterns: consolidated.crossTaskPatterns.length - original.crossTaskPatterns.length,
      consolidationEfficiency: this.computeConsolidationEfficiency(original, consolidated),
    };
  }

  private computeKnowledgeRetention(
    original: KnowledgeBase,
    consolidated: KnowledgeBase,
  ): number {
    const originalCore = original.coreKnowledge.length;
    const consolidatedCore = consolidated.coreKnowledge.length;

    return consolidatedCore / (originalCore + 1);
  }

  private computeSemanticPreservation(
    original: KnowledgeBase,
    consolidated: KnowledgeBase,
  ): number {
    // Compare semantic similarity of knowledge graphs
    const originalEmbeddings = original.knowledgeGraph.nodes.map(n => n.embedding);
    const consolidatedEmbeddings = consolidated.knowledgeGraph.nodes.map(n => n.embedding);

    if (originalEmbeddings.length === 0 || consolidatedEmbeddings.length === 0) {
      return 1;
    }

    // Average maximum similarity for each original embedding
    let totalSimilarity = 0;

    for (const origEmb of originalEmbeddings) {
      const maxSim = Math.max(...consolidatedEmbeddings.map(consEmb =>
        this.cosineSimilarity(origEmb, consEmb),
      ));
      totalSimilarity += maxSim;
    }

    return totalSimilarity / originalEmbeddings.length;
  }

  private computeConsolidationEfficiency(
    original: KnowledgeBase,
    consolidated: KnowledgeBase,
  ): number {
    const originalSize = this.estimateKnowledgeSize(original);
    const consolidatedSize = this.estimateKnowledgeSize(consolidated);

    const compressionRatio = consolidatedSize / originalSize;
    const qualityScore = this.computeSemanticPreservation(original, consolidated);

    // Efficiency is high when size is reduced but quality is preserved
    return qualityScore / compressionRatio;
  }

  private estimateKnowledgeSize(knowledge: KnowledgeBase): number {
    return (
      knowledge.coreKnowledge.length * 100 +
      Array.from(knowledge.taskSpecificKnowledge.values())
        .reduce((sum, t) => sum + t.knowledge.length, 0) * 50 +
      knowledge.knowledgeGraph.nodes.length * 10 +
      knowledge.knowledgeGraph.edges.length * 5
    );
  }

  private daysSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  private computeCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {return [];}

    const dims = embeddings[0].length;
    const centroid = new Array(dims).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dims; i++) {
        centroid[i] += emb[i] / embeddings.length;
      }
    }

    return centroid;
  }

  private computeExperienceEmbedding(exp: Experience): number[] {
    // Simplified embedding
    const str = JSON.stringify({ input: exp.input, output: exp.output });
    return Array(128).fill(0).map((_, i) =>
      Math.sin(str.charCodeAt(i % str.length) * (i + 1)),
    );
  }

  private computeConceptSimilarity(_taskKnowledge: unknown, _core: CoreKnowledge): number {
    // Simplified similarity
    return Math.random() * 0.5 + 0.5;
  }

  private experienceDistance(exp1: Experience, exp2: Experience): number {
    const emb1 = this.computeExperienceEmbedding(exp1);
    const emb2 = this.computeExperienceEmbedding(exp2);

    return Math.sqrt(
      emb1.reduce((sum, val, i) => sum + Math.pow(val - emb2[i], 2), 0),
    );
  }

  private interpolate(a: unknown, b: unknown, alpha: number): unknown {
    if (typeof a === 'number' && typeof b === 'number') {
      return a * (1 - alpha) + b * alpha;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((val, idx) => this.interpolate(val, b[idx], alpha));
    }
    return alpha < 0.5 ? a : b;
  }

  private compressData(data: unknown): unknown {
    // Simplified compression
    if (typeof data === 'object') {
      return { compressed: true, hash: JSON.stringify(data).length };
    }
    return data;
  }

  private analyzeGraphPatterns(graph: KnowledgeGraph): GraphPattern[] {
    // Simplified pattern analysis
    const patterns: GraphPattern[] = [];

    // Find hub nodes
    const hubNodes = graph.nodes.filter(node => {
      const degree = graph.edges.filter(e =>
        e.source === node.id || e.target === node.id,
      ).length;
      return degree > 5;
    });

    for (const hub of hubNodes) {
      patterns.push({
        type: 'hub_pattern',
        embedding: hub.embedding,
        confidence: 0.8,
      });
    }

    return patterns;
  }

  private findCrossTaskPattern(
    group1: Experience[],
    group2: Experience[],
  ): CrossTaskPatternData | null {
    // Simplified pattern finding
    const emb1 = this.computeCentroid(group1.map(e => this.computeExperienceEmbedding(e)));
    const emb2 = this.computeCentroid(group2.map(e => this.computeExperienceEmbedding(e)));

    const similarity = this.cosineSimilarity(emb1, emb2);

    if (similarity > 0.7) {
      return {
        description: 'Common behavioral pattern',
        confidence: similarity,
        applicability: ['general'],
        emergentBehavior: 'Cross-task transfer',
      };
    }

    return null;
  }

  private computeKnowledgeEmbedding(knowledge: unknown): number[] {
    // Simplified embedding
    const str = JSON.stringify(knowledge);
    return Array(128).fill(0).map((_, i) =>
      Math.cos(str.charCodeAt(i % str.length) * (i + 1)),
    );
  }

  private mergeSimilarConcepts(concepts: DistilledConcept[]): DistilledConcept[] {
    const merged: DistilledConcept[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < concepts.length; i++) {
      if (processed.has(i)) {continue;}

      const similar: number[] = [];

      for (let j = i + 1; j < concepts.length; j++) {
        if (!processed.has(j)) {
          const sim = this.cosineSimilarity(
            concepts[i].embedding,
            concepts[j].embedding,
          );

          if (sim > 0.85) {
            similar.push(j);
          }
        }
      }

      if (similar.length > 0) {
        // Merge concepts
        const allConcepts = [concepts[i], ...similar.map(j => concepts[j])];
        const mergedConcept: DistilledConcept = {
          name: concepts[i].name,
          embedding: this.computeCentroid(allConcepts.map(c => c.embedding)),
          importance: Math.max(...allConcepts.map(c => c.importance)),
        };

        merged.push(mergedConcept);
        processed.add(i);
        similar.forEach(j => processed.add(j));
      } else {
        merged.push(concepts[i]);
        processed.add(i);
      }
    }

    return merged;
  }

  private computeDelta(_data: unknown, _concept: DistilledConcept): { simplified: boolean } {
    // Simplified delta computation
    return { simplified: true };
  }

  private mergeHighlyConnectedNodes(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
  ): { nodes: KnowledgeNode[]; mergeMap: Map<string, string> } {
    const merged: KnowledgeNode[] = [];
    const mergeMap = new Map<string, string>();
    const processed = new Set<string>();

    for (const node of nodes) {
      if (processed.has(node.id)) {continue;}

      // Find strongly connected nodes
      const connected = edges
        .filter(e => (e.source === node.id || e.target === node.id) && e.strength > 0.9)
        .map(e => e.source === node.id ? e.target : e.source)
        .filter(id => !processed.has(id));

      if (connected.length > 2) {
        // Merge nodes
        const mergedNode: KnowledgeNode = {
          id: `merged-${node.id}`,
          content: { merged: true, originalIds: [node.id, ...connected] },
          type: 'merged',
          embedding: this.computeCentroid([
            node.embedding,
            ...connected.map(id => nodes.find(n => n.id === id)!.embedding),
          ]),
          activationLevel: Math.max(
            node.activationLevel,
            ...connected.map(id => nodes.find(n => n.id === id)!.activationLevel),
          ),
        };

        merged.push(mergedNode);
        processed.add(node.id);
        mergeMap.set(node.id, mergedNode.id);

        connected.forEach(id => {
          processed.add(id);
          mergeMap.set(id, mergedNode.id);
        });
      } else {
        merged.push(node);
        processed.add(node.id);
      }
    }

    return { nodes: merged, mergeMap };
  }

  private updateEdgesForMergedNodes(
    edges: KnowledgeEdge[],
    mergeMap: Map<string, string>,
  ): KnowledgeEdge[] {
    const updated: KnowledgeEdge[] = [];
    const seen = new Set<string>();

    for (const edge of edges) {
      const source = mergeMap.get(edge.source) || edge.source;
      const target = mergeMap.get(edge.target) || edge.target;

      if (source === target) {continue;} // Skip self-loops

      const edgeKey = `${source}-${target}`;
      const reverseKey = `${target}-${source}`;

      if (!seen.has(edgeKey) && !seen.has(reverseKey)) {
        updated.push({
          ...edge,
          source,
          target,
        });
        seen.add(edgeKey);
      }
    }

    return updated;
  }

  private patternSimilarity(p1: CrossTaskPattern, p2: CrossTaskPattern): number {
    // Check task overlap
    const taskOverlap = p1.sourceTasks.filter(t => p2.sourceTasks.includes(t)).length;
    const taskSimilarity = taskOverlap / Math.max(p1.sourceTasks.length, p2.sourceTasks.length);

    // Check description similarity (simplified)
    const descSimilarity = p1.pattern === p2.pattern ? 1 : 0.5;

    return (taskSimilarity + descSimilarity) / 2;
  }

  private analyzePathFrequencies(graph: KnowledgeGraph): Map<string[], number> {
    // Simplified path frequency analysis
    const frequencies = new Map<string[], number>();

    // Sample random paths
    for (let i = 0; i < 100; i++) {
      const path = this.randomPath(graph);
      if (path.length > 2) {
        frequencies.set(path, (frequencies.get(path) || 0) + 1);
      }
    }

    return frequencies;
  }

  private randomPath(graph: KnowledgeGraph): string[] {
    if (graph.nodes.length === 0) {return [];}

    const path: string[] = [];
    const start = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
    path.push(start.id);

    let current = start.id;
    const maxLength = 5;

    while (path.length < maxLength) {
      const edges = graph.edges.filter(e => e.source === current);
      if (edges.length === 0) {break;}

      const next = edges[Math.floor(Math.random() * edges.length)];
      path.push(next.target);
      current = next.target;
    }

    return path;
  }
}

interface ConsolidationMetrics {
  knowledgeRetention: number;
  compressionRatio: number;
  semanticPreservation: number;
  emergentPatterns: number;
  consolidationEfficiency: number;
}