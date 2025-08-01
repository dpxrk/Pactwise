/**
 * Continual Learning Base Agent
 *
 * Base class for agents with continual learning capabilities,
 * enabling lifelong learning without catastrophic forgetting.
 */

import { BaseAgent } from './base.ts';
import { ContinualLearningEngine } from '../continual-learning/continual-learning-engine.ts';
import { KnowledgeConsolidator } from '../continual-learning/knowledge-consolidator.ts';
import {
  ContinualLearningState,
  ContinualLearningConfig,
  Experience,
  TaskKnowledge,
  CoreKnowledge,
  ContinualLearningAnalysis,
} from '../continual-learning/types.ts';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.ts';

export abstract class ContinualLearningBaseAgent extends BaseAgent {
  protected continualLearningEngine: ContinualLearningEngine;
  protected knowledgeConsolidator: KnowledgeConsolidator;
  protected learningConfig: ContinualLearningConfig;
  protected currentTaskId: string | null = null;
  protected taskExperiences: Experience[] = [];
  protected learningEnabled = true;

  constructor(
    supabase: SupabaseClient<Database>,
    enterpriseId: string,
    config?: Partial<ContinualLearningConfig>,
  ) {
    super(supabase, enterpriseId);

    // Initialize continual learning configuration
    this.learningConfig = this.initializeLearningConfig(config);

    // Initialize learning engine
    this.continualLearningEngine = new ContinualLearningEngine();

    // Initialize knowledge consolidator
    this.knowledgeConsolidator = new KnowledgeConsolidator();
  }

  /**
   * Initialize continual learning configuration
   */
  private initializeLearningConfig(config?: Partial<ContinualLearningConfig>): ContinualLearningConfig {
    return {
      enabled: config?.enabled ?? true,
      strategy: config?.strategy ?? {
        name: 'Elastic Weight Consolidation',
        type: 'hybrid',
        hyperparameters: {
          lambda: 1000,
          replayRatio: 0.1,
          compressionThreshold: 0.8,
          epochs: 10,
          batchSize: 32,
        },
      },
      memoryManagement: config?.memoryManagement ?? {
        totalCapacity: 100000,
        usedCapacity: 0,
        compressionEnabled: true,
        pruningStrategy: {
          method: 'hybrid',
          threshold: 0.9,
          protectedMemories: new Set(),
        },
        hierarchicalStorage: {
          levels: [
            {
              name: 'working',
              capacity: 10000,
              accessSpeed: 1,
              retentionPeriod: 86400, // 1 day
              compressionRatio: 1,
            },
            {
              name: 'short-term',
              capacity: 30000,
              accessSpeed: 0.8,
              retentionPeriod: 604800, // 1 week
              compressionRatio: 0.8,
            },
            {
              name: 'long-term',
              capacity: 60000,
              accessSpeed: 0.5,
              retentionPeriod: Infinity,
              compressionRatio: 0.5,
            },
          ],
          migrationPolicy: {
            upwardThreshold: 0.8,
            downwardThreshold: 0.2,
            migrationBatchSize: 100,
          },
        },
      },
      consolidationSchedule: config?.consolidationSchedule ?? {
        frequency: 'periodic',
        interval: 3600, // 1 hour
      },
      performanceThresholds: config?.performanceThresholds ?? {
        minRetention: 0.8,
        maxForgetting: 0.2,
        targetPlasticity: 0.7,
      },
      integrationMode: config?.integrationMode ?? 'hybrid',
    };
  }

  /**
   * Start a new learning task
   */
  async startLearningTask(taskId: string, taskDescription?: string): Promise<void> {
    if (!this.learningEnabled) {return;}

    this.currentTaskId = taskId;
    this.taskExperiences = [];

    // Log task start
    await this.logTaskStart(taskId, taskDescription);

    // Prepare for new task learning
    await this.prepareForNewTask(taskId);
  }

  /**
   * End current learning task and consolidate knowledge
   */
  async endLearningTask(): Promise<ContinualLearningAnalysis | null> {
    if (!this.currentTaskId || !this.learningEnabled) {return null;}

    try {
      // Learn from collected experiences
      await this.continualLearningEngine.learnTask(
        this.currentTaskId,
        this.taskExperiences,
        this, // Pass agent as model
        this.learningConfig.strategy,
      );

      // Perform analysis
      const analysis = await this.continualLearningEngine.analyze();

      // Log task completion
      await this.logTaskCompletion(this.currentTaskId, analysis);

      // Check if consolidation is needed
      if (this.shouldTriggerConsolidation()) {
        await this.consolidateKnowledge();
      }

      return analysis;
    } finally {
      this.currentTaskId = null;
      this.taskExperiences = [];
    }
  }

  /**
   * Record an experience during task execution
   */
  protected async recordExperience(
    input: any,
    output: any,
    reward: number = 0,
    importance: number = 0.5,
  ): Promise<void> {
    if (!this.currentTaskId || !this.learningEnabled) {return;}

    const experience: Experience = {
      id: this.generateId(),
      taskId: this.currentTaskId,
      input,
      output,
      reward,
      importance,
      timestamp: new Date(),
      replayCount: 0,
      compressed: false,
    };

    this.taskExperiences.push(experience);

    // Auto-save if buffer is getting large
    if (this.taskExperiences.length >= 1000) {
      await this.saveExperienceBatch();
    }
  }

  /**
   * Consolidate knowledge across all tasks
   */
  async consolidateKnowledge(): Promise<void> {
    const state = this.continualLearningEngine.getState();

    // Perform consolidation
    const result = await this.knowledgeConsolidator.consolidate(
      state.knowledgeBase,
      state.memoryBuffer.experiences,
      state.consolidationState,
    );

    // Update engine state with consolidated knowledge
    state.knowledgeBase = result.consolidatedKnowledge;
    state.memoryBuffer.experiences = result.compressedExperiences;
    state.consolidationState.lastConsolidation = new Date();

    // Save consolidated state
    await this.saveConsolidatedState(state);

    // Log consolidation metrics
    await this.logConsolidationMetrics(result.consolidationMetrics);
  }

  /**
   * Query knowledge base for relevant information
   */
  async queryKnowledge(query: string, taskContext?: string): Promise<any[]> {
    const knowledgeBase = this.continualLearningEngine.getKnowledgeBase();
    const queryEmbedding = await this.computeQueryEmbedding(query);

    // Search core knowledge
    const relevantCore = this.searchCoreKnowledge(
      knowledgeBase.coreKnowledge,
      queryEmbedding,
    );

    // Search task-specific knowledge if context provided
    const relevantTask = taskContext
      ? this.searchTaskKnowledge(
          knowledgeBase.taskSpecificKnowledge.get(taskContext),
          queryEmbedding,
        )
      : [];

    // Search cross-task patterns
    const relevantPatterns = this.searchCrossTaskPatterns(
      knowledgeBase.crossTaskPatterns,
      query,
    );

    // Combine and rank results
    return this.rankKnowledgeResults([
      ...relevantCore,
      ...relevantTask,
      ...relevantPatterns,
    ]);
  }

  /**
   * Apply learned knowledge to new situation
   */
  async applyKnowledge(situation: any): Promise<any> {
    // Find relevant knowledge
    const relevantKnowledge = await this.queryKnowledge(
      JSON.stringify(situation),
      this.currentTaskId || undefined,
    );

    if (relevantKnowledge.length === 0) {
      return null;
    }

    // Apply top knowledge item
    const topKnowledge = relevantKnowledge[0];

    // Record this as a new experience if learning
    if (this.currentTaskId) {
      const output = await this.applyKnowledgeItem(topKnowledge, situation);
      await this.recordExperience(situation, output, 0, 0.7);
      return output;
    }

    return this.applyKnowledgeItem(topKnowledge, situation);
  }

  /**
   * Get current learning performance metrics
   */
  getPerformanceMetrics(): any {
    return this.continualLearningEngine.getPerformanceMetrics();
  }

  /**
   * Enable or disable learning
   */
  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  /**
   * Abstract method for computing query embeddings
   */
  protected abstract computeQueryEmbedding(query: string): Promise<number[]>;

  /**
   * Abstract method for applying knowledge items
   */
  protected abstract applyKnowledgeItem(knowledge: any, situation: any): Promise<any>;

  /**
   * Prepare agent for learning new task
   */
  private async prepareForNewTask(taskId: string): Promise<void> {
    // Load relevant past knowledge
    const relatedTasks = await this.findRelatedTasks(taskId);

    if (relatedTasks.length > 0) {
      // Pre-activate relevant knowledge for forward transfer
      await this.preActivateKnowledge(relatedTasks);
    }

    // Set up task-specific learning parameters
    await this.setupTaskParameters(taskId);
  }

  /**
   * Check if consolidation should be triggered
   */
  private shouldTriggerConsolidation(): boolean {
    const schedule = this.learningConfig.consolidationSchedule;
    const state = this.continualLearningEngine.getState();

    if (schedule.frequency === 'continuous') {
      return true;
    }

    if (schedule.frequency === 'periodic' && schedule.interval) {
      const timeSince = Date.now() - state.consolidationState.lastConsolidation.getTime();
      return timeSince > schedule.interval * 1000;
    }

    if (schedule.frequency === 'triggered' && schedule.triggers) {
      // Check custom triggers
      return this.checkConsolidationTriggers(schedule.triggers);
    }

    return false;
  }

  /**
   * Search core knowledge
   */
  private searchCoreKnowledge(
    coreKnowledge: CoreKnowledge[],
    queryEmbedding: number[],
  ): any[] {
    return coreKnowledge
      .map(knowledge => ({
        ...knowledge,
        relevance: this.cosineSimilarity(knowledge.embedding, queryEmbedding),
      }))
      .filter(k => k.relevance > 0.6)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  /**
   * Search task-specific knowledge
   */
  private searchTaskKnowledge(
    taskKnowledge: TaskKnowledge | undefined,
    _queryEmbedding: number[],
  ): any[] {
    if (!taskKnowledge) {return [];}

    return taskKnowledge.knowledge
      .map(k => ({
        ...k,
        relevance: 0.7, // Simplified relevance
      }))
      .filter(k => k.protectionLevel > 0.5)
      .slice(0, 5);
  }

  /**
   * Search cross-task patterns
   */
  private searchCrossTaskPatterns(patterns: any[], _query: string): any[] {
    // Simplified pattern matching
    return patterns
      .filter(p => p.confidence > 0.7)
      .map(p => ({
        ...p,
        relevance: 0.8,
      }))
      .slice(0, 5);
  }

  /**
   * Rank knowledge results by relevance and importance
   */
  private rankKnowledgeResults(results: any[]): any[] {
    return results
      .sort((a, b) => {
        const scoreA = a.relevance * (a.importance || 1);
        const scoreB = b.relevance * (b.importance || 1);
        return scoreB - scoreA;
      })
      .slice(0, 20);
  }

  /**
   * Save experience batch to storage
   */
  private async saveExperienceBatch(): Promise<void> {
    if (this.taskExperiences.length === 0) {return;}

    const { error } = await this.supabase
      .from('continual_learning_experiences')
      .insert(
        this.taskExperiences.map(exp => ({
          enterprise_id: this.enterpriseId,
          agent_type: this.constructor.name,
          task_id: exp.taskId,
          experience_data: exp,
          importance: exp.importance,
          created_at: exp.timestamp,
        })),
      );

    if (error) {
      console.error('Failed to save experiences:', error);
    }

    // Clear saved experiences
    this.taskExperiences = [];
  }

  /**
   * Save consolidated state
   */
  private async saveConsolidatedState(state: ContinualLearningState): Promise<void> {
    const { error } = await this.supabase
      .from('continual_learning_state')
      .upsert({
        enterprise_id: this.enterpriseId,
        agent_type: this.constructor.name,
        state_data: state,
        last_consolidation: state.consolidationState.lastConsolidation,
        updated_at: new Date(),
      });

    if (error) {
      console.error('Failed to save consolidated state:', error);
    }
  }

  /**
   * Log task start
   */
  private async logTaskStart(taskId: string, description?: string): Promise<void> {
    await this.supabase
      .from('continual_learning_tasks')
      .insert({
        enterprise_id: this.enterpriseId,
        agent_type: this.constructor.name,
        task_id: taskId,
        description,
        status: 'started',
        started_at: new Date(),
      });
  }

  /**
   * Log task completion
   */
  private async logTaskCompletion(
    taskId: string,
    analysis: ContinualLearningAnalysis,
  ): Promise<void> {
    await this.supabase
      .from('continual_learning_tasks')
      .update({
        status: 'completed',
        completed_at: new Date(),
        performance_metrics: analysis,
      })
      .eq('task_id', taskId)
      .eq('enterprise_id', this.enterpriseId);
  }

  /**
   * Log consolidation metrics
   */
  private async logConsolidationMetrics(metrics: any): Promise<void> {
    await this.supabase
      .from('continual_learning_consolidations')
      .insert({
        enterprise_id: this.enterpriseId,
        agent_type: this.constructor.name,
        consolidation_metrics: metrics,
        created_at: new Date(),
      });
  }

  /**
   * Find related past tasks
   */
  private async findRelatedTasks(_taskId: string): Promise<string[]> {
    // Query similar tasks from history
    const { data } = await this.supabase
      .from('continual_learning_tasks')
      .select('task_id')
      .eq('enterprise_id', this.enterpriseId)
      .eq('agent_type', this.constructor.name)
      .eq('status', 'completed')
      .limit(10);

    return data?.map(d => d.task_id) || [];
  }

  /**
   * Pre-activate relevant knowledge
   */
  private async preActivateKnowledge(relatedTasks: string[]): Promise<void> {
    const knowledgeBase = this.continualLearningEngine.getKnowledgeBase();

    // Increase activation for related task knowledge
    for (const taskId of relatedTasks) {
      const taskKnowledge = knowledgeBase.taskSpecificKnowledge.get(taskId);
      if (taskKnowledge) {
        // Increase protection levels temporarily
        taskKnowledge.knowledge.forEach(k => {
          k.protectionLevel = Math.min(1, k.protectionLevel + 0.2);
        });
      }
    }
  }

  /**
   * Set up task-specific parameters
   */
  private async setupTaskParameters(_taskId: string): Promise<void> {
    // Could adjust learning rate, regularization, etc. based on task
    // For now, using default parameters
  }

  /**
   * Check custom consolidation triggers
   */
  private checkConsolidationTriggers(_triggers: string[]): boolean {
    // Implement custom trigger logic
    // For now, return false
    return false;
  }

  /**
   * Utility: Cosine similarity
   */
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

  /**
   * Utility: Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load existing continual learning state
   */
  async loadState(): Promise<void> {
    const { data } = await this.supabase
      .from('continual_learning_state')
      .select('state_data')
      .eq('enterprise_id', this.enterpriseId)
      .eq('agent_type', this.constructor.name)
      .single();

    if (data?.state_data) {
      this.continualLearningEngine = new ContinualLearningEngine(data.state_data);
    }
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(): Promise<{
    totalTasks: number;
    averageRetention: number;
    knowledgeNodes: number;
    crossTaskPatterns: number;
  }> {
    const state = this.continualLearningEngine.getState();
    const metrics = this.continualLearningEngine.getPerformanceMetrics();

    const retentionScores = Array.from(metrics.taskPerformance.values()).map(p =>
      p.currentPerformance / (p.peakPerformance || 1),
    );

    return {
      totalTasks: state.taskSequenceNumber,
      averageRetention: retentionScores.length > 0
        ? retentionScores.reduce((a, b) => a + b, 0) / retentionScores.length
        : 1,
      knowledgeNodes: state.knowledgeBase.knowledgeGraph.nodes.length,
      crossTaskPatterns: state.knowledgeBase.crossTaskPatterns.length,
    };
  }
}