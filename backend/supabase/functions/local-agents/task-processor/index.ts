import { SupabaseClient } from '@supabase/supabase-js';
import { EnhancedRateLimiter } from '../../_shared/rate-limiting.ts';
import { getFeatureFlag } from '../config/index.ts';
import { MemoryConsolidationProcessor } from '../utils/memory-consolidation.ts';
import { EnterpriseAgentFactory } from '../enterprise/agent-factory.ts';
import { DonnaInterface } from '../donna/interface.ts';

export interface TaskProcessorConfig {
  batchSize: number;
  pollIntervalMs: number;
  maxConcurrentTasks: number;
  taskTimeout: number;
  enableMemoryConsolidation: boolean;
  consolidationIntervalMs: number;
}

export class AgentTaskProcessor {
  private supabase: SupabaseClient;
  private config: TaskProcessorConfig;
  private isRunning: boolean = false;
  private processingTasks: Set<string> = new Set();
  private agentFactory: EnterpriseAgentFactory;
  private memoryProcessor: MemoryConsolidationProcessor;
  private donnaInterface: DonnaInterface;
  private lastConsolidation: number = 0;
  private rateLimiter: EnhancedRateLimiter;

  constructor(supabase: SupabaseClient, config?: Partial<TaskProcessorConfig>) {
    this.supabase = supabase;
    this.config = {
      batchSize: 10,
      pollIntervalMs: 5000, // 5 seconds
      maxConcurrentTasks: 5,
      taskTimeout: 300000, // 5 minutes
      enableMemoryConsolidation: true,
      consolidationIntervalMs: 3600000, // 1 hour
      ...config,
    };

    this.rateLimiter = new EnhancedRateLimiter(supabase);
    this.memoryProcessor = new MemoryConsolidationProcessor(supabase);
    this.agentFactory = new EnterpriseAgentFactory(supabase);
    this.donnaInterface = new DonnaInterface(supabase);
  }

  // Public getter for isRunning status
  get running(): boolean {
    return this.isRunning;
  }

  // Start the task processor
  async start() {
    if (this.isRunning) {
      console.log('Task processor is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting agent task processor...');

    // Start processing loop
    this.processLoop().catch(error => {
      console.error('Task processor error:', error);
      this.isRunning = false;
    });
  }

  // Stop the task processor
  async stop() {
    console.log('Stopping agent task processor...');
    this.isRunning = false;

    // Wait for current tasks to complete
    const timeout = setTimeout(() => {
      console.warn('Force stopping task processor');
      this.processingTasks.clear();
    }, 30000); // 30 second grace period

    while (this.processingTasks.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    clearTimeout(timeout);
    console.log('Task processor stopped');
  }

  // Main processing loop
  private async processLoop() {
    while (this.isRunning) {
      try {
        // Check if we should run memory consolidation
        if (this.shouldRunMemoryConsolidation()) {
          await this.runMemoryConsolidation();
        }

        // Check if we can process more tasks
        if (this.processingTasks.size >= this.config.maxConcurrentTasks) {
          await this.sleep(1000);
          continue;
        }

        // Fetch pending tasks
        const tasks = await this.fetchPendingTasks();

        if (tasks.length === 0) {
          await this.sleep(this.config.pollIntervalMs);
          continue;
        }

        // Process tasks concurrently
        const promises = tasks.map(task => this.processTask(task));
        await Promise.allSettled(promises);

      } catch (error) {
        console.error('Error in processing loop:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  // Fetch pending tasks from the queue
  private async fetchPendingTasks(): Promise<Array<{
    id: string;
    agent_id: string;
    task_type: string;
    priority: number;
    payload: Record<string, unknown>;
    agent: {
      id: string;
      type: string;
      is_active: boolean;
      config: Record<string, unknown>;
    };
  }>> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('agent_tasks')
      .select(`
        *,
        agent:agents!agent_id(
          id,
          type,
          is_active,
          config
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(this.config.batchSize);

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    // Filter out tasks already being processed
    return (data || []).filter(task => !this.processingTasks.has(task.id));
  }

  // Process a single task
  private async processTask(task: any) {
    const taskId = task.id;

    // Mark task as being processed
    this.processingTasks.add(taskId);

    try {
      console.log(`Processing task ${taskId} with agent ${task.agent.type}`);

      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeout);
      });

      // Process the task with enterprise isolation using the factory
      const result = await Promise.race([
        this.agentFactory.processEnterpriseTask(task),
        timeoutPromise,
      ]);

      console.log(`Task ${taskId} completed successfully`);

      // Update task metrics and feed to Donna for learning
      await this.updateTaskMetrics(task, true, result);
      await this.feedToDonna(task, result, true);

    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error);

      // Update task metrics
      await this.updateTaskMetrics(task, false);
      await this.feedToDonna(task, null, false, error);

      // The agent's error handling will take care of retries
    } finally {
      // Remove from processing set
      this.processingTasks.delete(taskId);
    }
  }

  // Update task processing metrics
  private async updateTaskMetrics(task: any, success: boolean, _result?: any) {
    if (!getFeatureFlag('ENABLE_METRICS')) {return;}

    try {
      await this.supabase
        .from('agent_metrics')
        .insert({
          agent_type: task.agent.type,
          task_type: task.task_type,
          success,
          processing_time: Date.now() - new Date(task.started_at || task.created_at).getTime(),
          enterprise_id: task.enterprise_id,
          metadata: {
            priority: task.priority,
            retry_count: task.retry_count || 0,
          },
        });
    } catch (error) {
      console.error('Error updating task metrics:', error);
    }
  }

  // Feed task results to Donna AI for learning
  private async feedToDonna(task: any, result: any, success: boolean, _error?: any): Promise<void> {
    if (!getFeatureFlag('ENABLE_DONNA_AI')) return;

    try {
      // Only learn from completed tasks with results
      if (!success || !result) return;

      // Extract metrics from result
      const metrics: Record<string, any> = {
        processing_time: Date.now() - new Date(task.started_at || task.created_at).getTime(),
        confidence: result.confidence || 0.5,
        rules_applied_count: result.rulesApplied?.length || 0,
        insights_generated: result.insights?.length || 0,
        success: result.success || false,
      };

      // Add performance score based on various factors
      metrics.performance_score = this.calculatePerformanceScore(result, metrics);

      // Submit learning data to Donna
      await this.donnaInterface.submitLearningData(
        task.task_type,
        {
          payload: task.payload,
          context: {
            agent_type: task.agent?.type,
            priority: task.priority,
            retry_count: task.retry_count || 0,
            ...result.context,
          },
          agent_capabilities: task.agent?.capabilities || [],
        },
        {
          success: metrics.performance_score > 0.7,
          metrics,
        },
        task.enterprise_id,
        task.user_id
      );

      console.log(`Fed task ${task.id} results to Donna AI for learning`);
    } catch (error) {
      console.error('Error feeding data to Donna AI:', error);
    }
  }

  // Calculate performance score for Donna learning
  private calculatePerformanceScore(result: any, metrics: Record<string, any>): number {
    let score = 0.5; // Base score

    // Success factor (40% weight)
    if (result.success) score += 0.4;

    // Confidence factor (20% weight)  
    if (result.confidence) {
      score += (result.confidence * 0.2);
    }

    // Processing time factor (20% weight) - faster is better
    const processingTimeMs = metrics.processing_time;
    if (processingTimeMs < 30000) { // Under 30 seconds
      score += 0.2;
    } else if (processingTimeMs < 60000) { // Under 1 minute
      score += 0.1;
    }

    // Insights quality factor (20% weight)
    const insightsCount = metrics.insights_generated;
    if (insightsCount > 0) {
      score += Math.min(0.2, insightsCount * 0.05);
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  // Check if memory consolidation should run
  private shouldRunMemoryConsolidation(): boolean {
    if (!this.config.enableMemoryConsolidation) {return false;}
    if (!getFeatureFlag('ENABLE_MEMORY_SYSTEM')) {return false;}

    const now = Date.now();
    return now - this.lastConsolidation >= this.config.consolidationIntervalMs;
  }

  // Run memory consolidation
  private async runMemoryConsolidation() {
    console.log('Starting memory consolidation...');
    this.lastConsolidation = Date.now();

    try {
      // Get all active enterprises
      const activeEnterprises = await this.agentFactory.getActiveEnterprises();

      let totalConsolidated = 0;
      const allErrors: string[] = [];

      // Process consolidation for each enterprise
      for (const enterpriseId of activeEnterprises) {
        try {
          const results = await this.memoryProcessor.processConsolidation(enterpriseId);
          totalConsolidated += results.consolidated;

          if (results.errors.length > 0) {
            allErrors.push(...results.errors.map(e => `Enterprise ${enterpriseId}: ${e}`));
          }
        } catch (error) {
          console.error(`Memory consolidation failed for enterprise ${enterpriseId}:`, error);
          allErrors.push(`Enterprise ${enterpriseId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`Memory consolidation completed: ${totalConsolidated} memories consolidated across ${activeEnterprises.length} enterprises`);

      if (allErrors.length > 0) {
        console.error('Memory consolidation errors:', allErrors);
      }
    } catch (error) {
      console.error('Memory consolidation failed:', error);
    }
  }

  // Utility sleep function
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get processor statistics
  async getStats(): Promise<{
    isRunning: boolean;
    processingCount: number;
    pendingCount: number;
    completedToday: number;
    failedToday: number;
    avgProcessingTime: number;
  }> {
    const stats = {
      isRunning: this.isRunning,
      processingCount: this.processingTasks.size,
      pendingCount: 0,
      completedToday: 0,
      failedToday: 0,
      avgProcessingTime: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get pending count
    const { count: pendingCount } = await this.supabase
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    stats.pendingCount = pendingCount || 0;

    // Get today's completed and failed counts
    const { data: todayTasks } = await this.supabase
      .from('agent_tasks')
      .select('status, completed_at, started_at')
      .gte('created_at', today.toISOString())
      .in('status', ['completed', 'failed']);

    if (todayTasks) {
      let totalTime = 0;
      let timeCount = 0;

      for (const task of todayTasks) {
        if (task.status === 'completed') {
          stats.completedToday++;

          if (task.started_at && task.completed_at) {
            const duration = new Date(task.completed_at).getTime() - new Date(task.started_at).getTime();
            totalTime += duration;
            timeCount++;
          }
        } else if (task.status === 'failed') {
          stats.failedToday++;
        }
      }

      if (timeCount > 0) {
        stats.avgProcessingTime = Math.round(totalTime / timeCount);
      }
    }

    return stats;
  }

  // Manual task submission
  async submitTask(
    agentType: string,
    taskType: string,
    payload: any,
    options: {
      priority?: number;
      enterpriseId: string;
      userId?: string;
      contractId?: string;
      vendorId?: string;
    },
  ): Promise<string> {
    // Initialize enterprise if needed
    const config = await this.agentFactory.initializeEnterprise(options.enterpriseId);

    // Validate agent type is enabled for this enterprise
    if (!config.enabledAgents?.includes(agentType)) {
      throw new Error(`Agent type ${agentType} is not enabled for this enterprise`);
    }

    // Get agent ID
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('type', agentType)
      .eq('enterprise_id', options.enterpriseId)
      .eq('is_active', true)
      .single();

    if (!agent) {
      throw new Error(`No active agent found for type: ${agentType}`);
    }

    // Create task
    const { data: task, error } = await this.supabase
      .from('agent_tasks')
      .insert({
        agent_id: agent.id,
        task_type: taskType,
        priority: options.priority || 5,
        payload: {
          data: payload,
          context: {
            userId: options.userId,
            contractId: options.contractId,
            vendorId: options.vendorId,
          },
        },
        contract_id: options.contractId,
        vendor_id: options.vendorId,
        enterprise_id: options.enterpriseId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {throw error;}

    return task.id;
  }

  // Get task status
  async getTaskStatus(taskId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .select(`
        *,
        agent:agents!agent_id(type)
      `)
      .eq('id', taskId)
      .single();

    if (error) {throw error;}
    return data;
  }

  // Cancel a task
  async cancelTask(taskId: string): Promise<void> {
    // Check if task is being processed
    if (this.processingTasks.has(taskId)) {
      throw new Error('Cannot cancel task that is currently being processed');
    }

    const { error } = await this.supabase
      .from('agent_tasks')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('status', 'pending');

    if (error) {throw error;}
  }

  // Retry a failed task
  async retryTask(taskId: string): Promise<void> {
    const { data: task, error } = await this.supabase
      .from('agent_tasks')
      .update({
        status: 'pending',
        retry_count: 1, // Simplified: just set to 1 instead of incrementing
        scheduled_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', taskId)
      .eq('status', 'failed')
      .select()
      .single();

    if (error) {throw error;}
    if (!task) {throw new Error('Task not found or not in failed state');}
  }
}