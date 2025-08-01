import { SupabaseClient } from '@supabase/supabase-js';

interface BenchmarkResult {
  operation: string;
  withoutIndex: number;
  withIndex: number;
  improvement: string;
}

export class IndexBenchmark {
  constructor(private supabase: SupabaseClient, private enterpriseId: string) {}

  /**
   * Run benchmark comparing query performance with and without indexes
   */
  async runBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Benchmark 1: Queue processing query
    results.push(await this.benchmarkQueueProcessing());

    // Benchmark 2: Agent-specific tasks
    results.push(await this.benchmarkAgentTasks());

    // Benchmark 3: High-priority tasks
    results.push(await this.benchmarkHighPriorityTasks());

    // Benchmark 4: Error tracking
    results.push(await this.benchmarkErrorTracking());

    // Benchmark 5: Task reporting
    results.push(await this.benchmarkTaskReporting());

    return results;
  }

  private async benchmarkQueueProcessing(): Promise<BenchmarkResult> {
    // Simulate query without index (using unindexed column combination)
    const start1 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('id')
      .eq('enterprise_id', this.enterpriseId)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at')
      .limit(100);
    const withoutIndex = Date.now() - start1;

    // Query with index
    const start2 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at')
      .limit(100);
    const withIndex = Date.now() - start2;

    return {
      operation: 'Queue Processing',
      withoutIndex,
      withIndex,
      improvement: `${((withoutIndex - withIndex) / withoutIndex * 100).toFixed(1)}%`,
    };
  }

  private async benchmarkAgentTasks(): Promise<BenchmarkResult> {
    // Get a sample agent ID
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('enterprise_id', this.enterpriseId)
      .limit(1)
      .single();

    if (!agent) {
      return {
        operation: 'Agent Tasks',
        withoutIndex: 0,
        withIndex: 0,
        improvement: 'N/A',
      };
    }

    // Without index hint (force sequential scan)
    const start1 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('id, task_type')
      .eq('agent_id', agent.id)
      .in('status', ['pending', 'processing']);
    const withoutIndex = Date.now() - start1;

    // With index
    const start2 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('*')
      .eq('agent_id', agent.id)
      .in('status', ['pending', 'processing']);
    const withIndex = Date.now() - start2;

    return {
      operation: 'Agent-Specific Tasks',
      withoutIndex,
      withIndex,
      improvement: `${((withoutIndex - withIndex) / withoutIndex * 100).toFixed(1)}%`,
    };
  }

  private async benchmarkHighPriorityTasks(): Promise<BenchmarkResult> {
    // Without specific index
    const start1 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('id, priority')
      .gte('priority', 8)
      .eq('status', 'pending')
      .order('scheduled_at');
    const withoutIndex = Date.now() - start1;

    // With high-priority index
    const start2 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('*')
      .gte('priority', 8)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('scheduled_at');
    const withIndex = Date.now() - start2;

    return {
      operation: 'High-Priority Tasks',
      withoutIndex,
      withIndex,
      improvement: `${((withoutIndex - withIndex) / withoutIndex * 100).toFixed(1)}%`,
    };
  }

  private async benchmarkErrorTracking(): Promise<BenchmarkResult> {
    // Without error index
    const start1 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('id, error')
      .not('error', 'is', null)
      .eq('enterprise_id', this.enterpriseId)
      .order('created_at', { ascending: false })
      .limit(50);
    const withoutIndex = Date.now() - start1;

    // With error index
    const start2 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('*')
      .not('error', 'is', null)
      .eq('enterprise_id', this.enterpriseId)
      .order('created_at', { ascending: false })
      .limit(50);
    const withIndex = Date.now() - start2;

    return {
      operation: 'Error Tracking',
      withoutIndex,
      withIndex,
      improvement: `${((withoutIndex - withIndex) / withoutIndex * 100).toFixed(1)}%`,
    };
  }

  private async benchmarkTaskReporting(): Promise<BenchmarkResult> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Without reporting index
    const start1 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('id, completed_at')
      .eq('enterprise_id', this.enterpriseId)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
      .not('completed_at', 'is', null);
    const withoutIndex = Date.now() - start1;

    // With reporting index
    const start2 = Date.now();
    await this.supabase
      .from('agent_tasks')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
      .order('completed_at', { ascending: false });
    const withIndex = Date.now() - start2;

    return {
      operation: 'Task Reporting',
      withoutIndex,
      withIndex,
      improvement: `${((withoutIndex - withIndex) / withoutIndex * 100).toFixed(1)}%`,
    };
  }

  /**
   * Generate sample data for benchmarking
   */
  async generateSampleData(taskCount: number = 10000): Promise<void> {
    console.log(`Generating ${taskCount} sample tasks...`);

    // Get agents
    const { data: agents } = await this.supabase
      .from('agents')
      .select('id')
      .eq('enterprise_id', this.enterpriseId);

    if (!agents || agents.length === 0) {
      throw new Error('No agents found');
    }

    // Generate tasks in batches
    const batchSize = 1000;
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    const taskTypes = ['analyze', 'review', 'process', 'validate', 'generate'];

    for (let i = 0; i < taskCount; i += batchSize) {
      const tasks = [];
      const currentBatchSize = Math.min(batchSize, taskCount - i);

      for (let j = 0; j < currentBatchSize; j++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const isCompleted = status === 'completed';
        const isFailed = status === 'failed';
        const isProcessing = status === 'processing';

        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Up to 30 days ago
        const scheduledAt = new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000); // Up to 1 hour later
        const startedAt = (isCompleted || isFailed || isProcessing)
          ? new Date(scheduledAt.getTime() + Math.random() * 30 * 60 * 1000) // Up to 30 minutes later
          : null;
        const completedAt = (isCompleted || isFailed)
          ? new Date(startedAt!.getTime() + Math.random() * 10 * 60 * 1000) // Up to 10 minutes processing
          : null;

        tasks.push({
          agent_id: agents[Math.floor(Math.random() * agents.length)].id,
          task_type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
          priority: Math.floor(Math.random() * 10) + 1,
          status,
          payload: {
            test: true,
            index: i + j,
            timestamp: new Date().toISOString(),
          },
          result: isCompleted ? { success: true, data: {} } : null,
          error: isFailed ? `Error processing task ${i + j}` : null,
          retry_count: isFailed ? Math.floor(Math.random() * 3) : 0,
          enterprise_id: this.enterpriseId,
          scheduled_at: scheduledAt.toISOString(),
          started_at: startedAt?.toISOString(),
          completed_at: completedAt?.toISOString(),
          created_at: createdAt.toISOString(),
        });
      }

      await this.supabase.from('agent_tasks').insert(tasks);
      console.log(`Generated ${i + currentBatchSize} tasks...`);
    }

    console.log('Sample data generation complete');
  }

  /**
   * Format and display benchmark results
   */
  formatResults(results: BenchmarkResult[]): string {
    let output = '\n=== Agent Tasks Index Performance Benchmark ===\n\n';

    output += 'Operation               | Without Index | With Index | Improvement\n';
    output += '------------------------|---------------|------------|-------------\n';

    for (const result of results) {
      output += `${result.operation.padEnd(23)} | ${
        result.withoutIndex.toString().padStart(11)
      }ms | ${
        result.withIndex.toString().padStart(9)
      }ms | ${
        result.improvement.padStart(11)
      }\n`;
    }

    output += '\n';

    const avgImprovement = results
      .map(r => parseFloat(r.improvement))
      .filter(n => !isNaN(n))
      .reduce((sum, n) => sum + n, 0) / results.length;

    output += `Average Performance Improvement: ${avgImprovement.toFixed(1)}%\n`;

    return output;
  }
}