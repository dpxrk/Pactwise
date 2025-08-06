import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase } from '../../tests/setup';
import { SupabaseClient } from '@supabase/supabase-js';

describe('Agent Tasks Performance', () => {
  let supabase: SupabaseClient;
  let enterpriseId: string;
  let agentId: string;

  beforeEach(async () => {
    supabase = await setupTestDatabase();

    // Create test enterprise
    const { data: enterprise } = await supabase
      .from('enterprises')
      .insert({ name: 'Test Enterprise' })
      .select()
      .single();
    enterpriseId = enterprise.id;

    // Create test agent system
    const { data: system } = await supabase
      .from('agent_system')
      .insert({
        name: 'Test System',
        version: '1.0.0',
        config: {},
        capabilities: ['test'],
      })
      .select()
      .single();

    // Create test agent
    const { data: agent } = await supabase
      .from('agents')
      .insert({
        name: 'Test Agent',
        type: 'test',
        system_id: system.id,
        enterprise_id: enterpriseId,
      })
      .select()
      .single();
    agentId = agent.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(supabase);
  });

  it('should efficiently query pending tasks by priority', async () => {
    // Insert test tasks with various priorities
    const tasks = [];
    for (let i = 0; i < 100; i++) {
      tasks.push({
        agent_id: agentId,
        task_type: 'test',
        priority: Math.floor(Math.random() * 10) + 1,
        status: i < 80 ? 'pending' : 'completed',
        payload: { test: true },
        enterprise_id: enterpriseId,
        scheduled_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      });
    }

    await supabase.from('agent_tasks').insert(tasks);

    // Query high-priority pending tasks
    const startTime = Date.now();
    const { data: highPriorityTasks, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'pending')
      .gte('priority', 8)
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at')
      .limit(10);

    const queryTime = Date.now() - startTime;

    expect(error).toBeNull();
    expect(highPriorityTasks).toBeDefined();
    expect(queryTime).toBeLessThan(100); // Should be fast with index

    // Verify results are correctly ordered
    if (highPriorityTasks) {
      for (let i = 1; i < highPriorityTasks.length; i++) {
        expect(highPriorityTasks[i].priority).toBeLessThanOrEqual(highPriorityTasks[i - 1].priority);
      }
    }
  });

  it('should efficiently query tasks by agent and status', async () => {
    // Create multiple agents
    const agents = [];
    for (let i = 0; i < 5; i++) {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: `Agent ${i}`,
          type: `type${i}`,
          enterprise_id: enterpriseId,
        })
        .select()
        .single();
      agents.push(agent);
    }

    // Insert tasks for each agent
    const tasks = [];
    for (const agent of agents) {
      for (let i = 0; i < 20; i++) {
        tasks.push({
          agent_id: agent.id,
          task_type: 'test',
          priority: 5,
          status: i < 10 ? 'pending' : i < 15 ? 'processing' : 'completed',
          payload: { test: true },
          enterprise_id: enterpriseId,
        });
      }
    }

    await supabase.from('agent_tasks').insert(tasks);

    // Query specific agent's active tasks
    const startTime = Date.now();
    const { data: activeTasks, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('agent_id', agents[0].id)
      .in('status', ['pending', 'processing']);

    const queryTime = Date.now() - startTime;

    expect(error).toBeNull();
    expect(activeTasks).toHaveLength(15);
    expect(queryTime).toBeLessThan(50); // Should be very fast with index
  });

  it('should efficiently analyze task queue health', async () => {
    // Create diverse task data
    const tasks = [];
    const now = Date.now();

    // Add some old pending tasks
    for (let i = 0; i < 10; i++) {
      tasks.push({
        agent_id: agentId,
        task_type: 'test',
        priority: i < 5 ? 9 : 5,
        status: 'pending',
        payload: { test: true },
        enterprise_id: enterpriseId,
        created_at: new Date(now - 90 * 60 * 1000).toISOString(), // 90 minutes old
      });
    }

    // Add some failed tasks
    for (let i = 0; i < 15; i++) {
      tasks.push({
        agent_id: agentId,
        task_type: 'test',
        priority: 5,
        status: 'failed',
        payload: { test: true },
        error: 'Test error',
        enterprise_id: enterpriseId,
        updated_at: new Date(now - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      });
    }

    await supabase.from('agent_tasks').insert(tasks);

    // Call health analysis function
    const startTime = Date.now();
    const { data: health, error } = await supabase
      .rpc('analyze_task_queue_health', {
        p_enterprise_id: enterpriseId,
      });

    const queryTime = Date.now() - startTime;

    expect(error).toBeNull();
    expect(health).toBeDefined();
    expect(health[0]).toMatchObject({
      agent_type: 'test',
      health_status: expect.stringMatching(/critical|warning/),
    });
    expect(queryTime).toBeLessThan(200); // Should be fast even with complex analysis
  });

  it('should efficiently retrieve task throughput statistics', async () => {
    // Create completed and failed tasks
    const tasks = [];
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      const isCompleted = i < 80;
      const startedAt = new Date(now - (120 + i) * 1000);
      const completedAt = isCompleted ? new Date(now - i * 1000) : null;

      tasks.push({
        agent_id: agentId,
        task_type: 'test',
        priority: 5,
        status: isCompleted ? 'completed' : 'failed',
        payload: { test: true },
        enterprise_id: enterpriseId,
        started_at: startedAt.toISOString(),
        completed_at: completedAt?.toISOString(),
        created_at: new Date(now - (180 + i) * 1000).toISOString(),
      });
    }

    await supabase.from('agent_tasks').insert(tasks);

    // Get throughput stats
    const startTime = Date.now();
    const { data: stats, error } = await supabase
      .rpc('get_task_throughput_stats', {
        p_enterprise_id: enterpriseId,
        p_time_range: '1 hour',
      });

    const queryTime = Date.now() - startTime;

    expect(error).toBeNull();
    expect(stats).toBeDefined();
    expect(stats[0]).toMatchObject({
      agent_type: 'test',
      total_tasks: 100,
      completed_tasks: 80,
      failed_tasks: 20,
      success_rate: 80,
    });
    expect(queryTime).toBeLessThan(150); // Should be fast with proper indexes
  });

  it('should efficiently query task errors', async () => {
    // Create tasks with various error states
    const tasks = [];
    for (let i = 0; i < 50; i++) {
      tasks.push({
        agent_id: agentId,
        task_type: 'test',
        priority: 5,
        status: 'failed',
        payload: { test: true },
        error: i < 25 ? 'Network error' : 'Processing error',
        enterprise_id: enterpriseId,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      });
    }

    // Add some successful tasks
    for (let i = 0; i < 50; i++) {
      tasks.push({
        agent_id: agentId,
        task_type: 'test',
        priority: 5,
        status: 'completed',
        payload: { test: true },
        enterprise_id: enterpriseId,
      });
    }

    await supabase.from('agent_tasks').insert(tasks);

    // Query recent errors
    const startTime = Date.now();
    const { data: errorTasks, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .not('error', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const queryTime = Date.now() - startTime;

    expect(error).toBeNull();
    expect(errorTasks).toHaveLength(20);
    expect(errorTasks?.[0]?.error).toBeDefined();
    expect(queryTime).toBeLessThan(100); // Should be fast with error index
  });

  it('should efficiently monitor queue status', async () => {
    // Create diverse task statuses
    const tasks = [];
    const statuses = ['pending', 'processing', 'completed', 'failed'];

    for (let i = 0; i < 200; i++) {
      tasks.push({
        agent_id: agentId,
        task_type: 'test',
        priority: Math.floor(Math.random() * 10) + 1,
        status: statuses[i % statuses.length],
        payload: { test: true },
        enterprise_id: enterpriseId,
        scheduled_at: new Date(Date.now() + (i - 100) * 60000).toISOString(),
      });
    }

    await supabase.from('agent_tasks').insert(tasks);

    // Query queue status view
    const startTime = Date.now();
    const { data: queueStatus, error } = await supabase
      .from('agent_task_queue_status')
      .select('*')
      .eq('enterprise_id', enterpriseId);

    const queryTime = Date.now() - startTime;

    expect(error).toBeNull();
    expect(queueStatus).toBeDefined();
    expect(queueStatus?.[0]).toHaveProperty('task_count');
    expect(queueStatus?.[0]).toHaveProperty('avg_age_seconds');
    expect(queryTime).toBeLessThan(200); // View should be fast
  });
});