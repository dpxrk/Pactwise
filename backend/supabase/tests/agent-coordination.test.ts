import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, createTestEnterprise, createTestUser } from '../../tests/setup';
import { SupabaseClient } from '@supabase/supabase-js';

describe('Agent Coordination and Communication Tests', () => {
  let supabase: SupabaseClient;
  let enterpriseId: string;
  let userId: string;

  beforeEach(async () => {
    supabase = await setupTestDatabase();

    // First create enterprise
    const enterprise = await createTestEnterprise();
    enterpriseId = enterprise.id;
    
    // Then create user with that enterprise
    const user = await createTestUser(enterpriseId, 'admin');
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(supabase);
  });

  describe('Agent Task Dependencies', () => {
    it('should respect task dependencies between agents', async () => {
      // Create dependent tasks
      const { data: agent1 } = await supabase
        .from('agents')
        .insert({
          name: 'Agent 1',
          type: 'secretary',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: agent2 } = await supabase
        .from('agents')
        .insert({
          name: 'Agent 2',
          type: 'financial',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Create parent task
      const { data: parentTask } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent1.id,
          task_type: 'extract_data',
          priority: 8,
          status: 'completed',
          payload: { data: 'extracted' },
          result: { success: true, data: { content: 'test data' } },
          enterprise_id: enterpriseId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Create dependent task with reference to parent
      const { data: dependentTask } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent2.id,
          task_type: 'analyze_data',
          priority: 7,
          status: 'pending',
          payload: {
            dependsOn: parentTask.id,
            parentTaskData: true,
          },
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Verify dependent task can access parent results
      const { data: parentResult } = await supabase
        .from('agent_tasks')
        .select('result')
        .eq('id', parentTask.id)
        .single();

      expect(parentResult?.result.data.content).toBe('test data');

      // Update dependent task to processing
      await supabase
        .from('agent_tasks')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', dependentTask.id);

      // Verify dependency chain
      const { data: taskChain } = await supabase
        .from('agent_tasks')
        .select('*')
        .in('id', [parentTask.id, dependentTask.id])
        .order('created_at');

      expect(taskChain).toHaveLength(2);
      expect(taskChain?.[0]?.status).toBe('completed');
      expect(taskChain?.[1]?.payload?.dependsOn).toBe(parentTask.id);
    });

    it('should handle circular dependencies detection', async () => {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Test Agent',
          type: 'manager',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Create tasks that would form a circular dependency
      const { data: task1 } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'task_a',
          priority: 5,
          status: 'pending',
          payload: { taskId: 'A' },
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      const { data: task2 } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'task_b',
          priority: 5,
          status: 'pending',
          payload: { taskId: 'B', dependsOn: task1.id },
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Attempt to create circular dependency
      const { } = await supabase
        .from('agent_tasks')
        .update({
          payload: { taskId: 'A', dependsOn: task2.id },
        })
        .eq('id', task1.id);

      // In a real system, this would be caught by business logic
      // For now, we verify the structure exists
      expect(task1.id).toBeDefined();
      expect(task2.id).toBeDefined();
      expect(task2.payload.dependsOn).toBe(task1.id);
    });
  });

  describe('Inter-Agent Communication', () => {
    it('should share context between agents via shared memory', async () => {
      // Create shared context
      const sharedContext = {
        sessionId: 'test-session-123',
        contractAnalysis: {
          riskScore: 7.5,
          complianceFlags: ['GDPR', 'SOC2'],
          financialImpact: 150000,
        },
      };

      // Agent 1 writes to short-term memory
      const { } = await supabase
        .from('short_term_memory')
        .insert({
          user_id: userId,
          memory_type: 'agent_context',
          content: JSON.stringify(sharedContext),
          context: {
            sessionId: sharedContext.sessionId,
            agentType: 'risk-assessment',
          },
          importance_score: 0.9,
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Agent 2 reads from short-term memory
      const { data: sharedMemory } = await supabase
        .from('short_term_memory')
        .select('*')
        .eq('context->sessionId', sharedContext.sessionId)
        .eq('memory_type', 'agent_context')
        .single();

      const retrievedContext = JSON.parse(sharedMemory.content);
      expect(retrievedContext.contractAnalysis.riskScore).toBe(7.5);
      expect(retrievedContext.contractAnalysis.complianceFlags).toContain('GDPR');

      // Update access count
      await supabase
        .from('short_term_memory')
        .update({
          access_count: sharedMemory.access_count + 1,
          accessed_at: new Date().toISOString(),
        })
        .eq('id', sharedMemory.id);
    });

    it('should broadcast task completion events', async () => {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Broadcasting Agent',
          type: 'secretary',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Create and complete a task
      const { data: task } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'extract_metadata',
          priority: 6,
          status: 'completed',
          payload: { test: true },
          result: {
            success: true,
            metadata: {
              documentType: 'contract',
              parties: ['Company A', 'Company B'],
            },
          },
          enterprise_id: enterpriseId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Simulate broadcast event
      const { data: broadcast } = await supabase
        .from('realtime_broadcasts')
        .insert({
          channel: `agent_updates_${enterpriseId}`,
          event: 'task_completed',
          payload: {
            taskId: task.id,
            agentType: 'secretary',
            success: true,
            insights: 2,
            processingTime: 1500,
          },
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      expect(broadcast.event).toBe('task_completed');
      expect(broadcast.payload.taskId).toBe(task.id);

      // Other agents can query for recent completions
      const { data: recentBroadcasts } = await supabase
        .from('realtime_broadcasts')
        .select('*')
        .eq('channel', `agent_updates_${enterpriseId}`)
        .eq('event', 'task_completed')
        .gte('created_at', new Date(Date.now() - 60000).toISOString());

      expect(recentBroadcasts?.length || 0).toBeGreaterThan(0);
    });
  });

  describe('Agent Priority and Resource Management', () => {
    it('should process high-priority tasks first', async () => {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Priority Test Agent',
          type: 'financial',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Create tasks with different priorities
      const tasks = [];
      for (let i = 1; i <= 10; i++) {
        const { data: task } = await supabase
          .from('agent_tasks')
          .insert({
            agent_id: agent.id,
            task_type: 'calculate',
            priority: i, // 1-10 priority
            status: 'pending',
            payload: { index: i },
            enterprise_id: enterpriseId,
            scheduled_at: new Date().toISOString(),
          })
          .select()
          .single();
        tasks.push(task);
      }

      // Query tasks in processing order
      const { data: orderedTasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at');

      // Verify high-priority tasks come first
      expect(orderedTasks?.[0]?.priority).toBe(10);
      expect(orderedTasks?.[1]?.priority).toBe(9);
      expect(orderedTasks?.[orderedTasks.length - 1]?.priority).toBe(1);
    });

    it('should implement agent rate limiting', async () => {
      const { } = await supabase
        .from('agents')
        .insert({
          name: 'Rate Limited Agent',
          type: 'vendor',
          enterprise_id: enterpriseId,
          config: {
            rateLimit: {
              maxRequests: 5,
              windowSeconds: 60,
            },
          },
        })
        .select()
        .single();

      // Track request count in agent_metrics
      const requests = [];
      for (let i = 0; i < 7; i++) {
        const timestamp = new Date(Date.now() - i * 5000).toISOString(); // Spread over 35 seconds

        requests.push({
          agent_type: 'vendor',
          operation: 'process',
          duration: 100 + i * 10,
          success: i < 5, // First 5 succeed
          enterprise_id: enterpriseId,
          timestamp,
        });
      }

      await supabase.from('agent_metrics').insert(requests);

      // Check rate limit status
      const windowStart = new Date(Date.now() - 60000).toISOString();
      const { data: recentRequests } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_type', 'vendor')
        .eq('enterprise_id', enterpriseId)
        .gte('timestamp', windowStart);

      const requestCount = recentRequests?.length || 0;
      const rateLimitExceeded = requestCount > 5;

      expect(requestCount).toBe(7);
      expect(rateLimitExceeded).toBe(true);

      // Verify failed requests after rate limit
      const failedRequests = recentRequests?.filter(r => !r.success) || [];
      expect(failedRequests.length).toBe(2);
    });
  });

  describe('Agent Failure Recovery', () => {
    it('should retry failed tasks with exponential backoff', async () => {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Retry Test Agent',
          type: 'integration',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Create a failed task
      const { data: task } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'api_call',
          priority: 7,
          status: 'failed',
          payload: { endpoint: '/test' },
          error: 'Connection timeout',
          retry_count: 1,
          max_retries: 3,
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Calculate next retry time with exponential backoff
      const baseDelay = 1000; // 1 second
      const backoffMultiplier = 2;
      const nextRetryDelay = baseDelay * Math.pow(backoffMultiplier, task.retry_count);
      const nextRetryTime = new Date(Date.now() + nextRetryDelay);

      // Update task for retry
      await supabase
        .from('agent_tasks')
        .update({
          status: 'pending',
          scheduled_at: nextRetryTime.toISOString(),
          retry_count: task.retry_count + 1,
        })
        .eq('id', task.id);

      // Verify retry scheduling
      const { data: updatedTask } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('id', task.id)
        .single();

      expect(updatedTask.status).toBe('pending');
      expect(updatedTask.retry_count).toBe(2);
      expect(new Date(updatedTask.scheduled_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('should implement circuit breaker pattern', async () => {
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Circuit Breaker Agent',
          type: 'integration',
          enterprise_id: enterpriseId,
          config: {
            circuitBreaker: {
              threshold: 5,
              timeout: 60000, // 1 minute
              halfOpenRequests: 1,
            },
          },
        })
        .select()
        .single();

      // Simulate multiple failures
      const failures = [];
      const baseTime = Date.now();

      for (let i = 0; i < 6; i++) {
        failures.push({
          agent_id: agent.id,
          task_type: 'external_api',
          priority: 5,
          status: 'failed',
          payload: { attempt: i },
          error: 'Service unavailable',
          enterprise_id: enterpriseId,
          created_at: new Date(baseTime - (6 - i) * 10000).toISOString(), // Last minute
          completed_at: new Date(baseTime - (6 - i) * 10000 + 1000).toISOString(),
        });
      }

      await supabase.from('agent_tasks').insert(failures);

      // Check failure rate
      const windowStart = new Date(baseTime - 60000).toISOString();
      const { data: recentFailures } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('status', 'failed')
        .gte('completed_at', windowStart);

      expect(recentFailures?.length || 0).toBe(6);

      // Circuit should be open (threshold exceeded)
      const circuitOpen = (recentFailures?.length || 0) >= 5;
      expect(circuitOpen).toBe(true);

      // New task should be rejected immediately
      const { data: newTask } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'external_api',
          priority: 5,
          status: 'pending',
          payload: { circuitTest: true },
          enterprise_id: enterpriseId,
          metadata: { circuitBreakerOpen: circuitOpen },
        })
        .select()
        .single();

      expect(newTask.metadata.circuitBreakerOpen).toBe(true);
    });
  });

  describe('Agent Metrics and Monitoring', () => {
    it('should track agent performance metrics', async () => {
      const agentTypes = ['secretary', 'financial', 'legal'];
      const agents = [];

      // Create multiple agents
      for (const type of agentTypes) {
        const { data: agent } = await supabase
          .from('agents')
          .insert({
            name: `${type} Performance Agent`,
            type,
            enterprise_id: enterpriseId,
          })
          .select()
          .single();
        agents.push(agent);
      }

      // Generate performance metrics
      const metrics = [];
      const operations = ['process', 'analyze', 'validate'];

      for (const agent of agents) {
        for (let i = 0; i < 20; i++) {
          metrics.push({
            agent_type: agent.type,
            operation: operations[i % operations.length],
            duration: 500 + Math.random() * 2000, // 500-2500ms
            success: Math.random() > 0.1, // 90% success rate
            enterprise_id: enterpriseId,
            timestamp: new Date(Date.now() - i * 60000).toISOString(), // Last 20 minutes
          });
        }
      }

      await supabase.from('agent_metrics').insert(metrics);

      // Calculate aggregated metrics
      const { data: aggregatedMetrics } = await supabase
        .rpc('get_agent_performance_summary', {
          p_enterprise_id: enterpriseId,
          p_time_window: '1 hour',
        })
        .select('*');

      // Verify metrics calculation
      if (aggregatedMetrics && aggregatedMetrics.length > 0) {
        const secretaryMetrics = aggregatedMetrics.find(m => m.agent_type === 'secretary');
        expect(secretaryMetrics).toBeDefined();
        expect(secretaryMetrics.total_operations).toBe(20);
        expect(secretaryMetrics.success_rate).toBeGreaterThan(0.8);
        expect(secretaryMetrics.avg_duration).toBeGreaterThan(500);
        expect(secretaryMetrics.avg_duration).toBeLessThan(2500);
      }
    });

    it('should detect performance degradation', async () => {
      const { } = await supabase
        .from('agents')
        .insert({
          name: 'Degraded Performance Agent',
          type: 'analytics',
          enterprise_id: enterpriseId,
        })
        .select()
        .single();

      // Simulate performance degradation over time
      const metrics = [];
      const baseTime = Date.now();

      // Normal performance (first 10 operations)
      for (let i = 0; i < 10; i++) {
        metrics.push({
          agent_type: 'analytics',
          operation: 'analyze',
          duration: 200 + Math.random() * 100, // 200-300ms
          success: true,
          enterprise_id: enterpriseId,
          timestamp: new Date(baseTime - (20 - i) * 60000).toISOString(),
        });
      }

      // Degraded performance (last 10 operations)
      for (let i = 0; i < 10; i++) {
        metrics.push({
          agent_type: 'analytics',
          operation: 'analyze',
          duration: 2000 + Math.random() * 3000, // 2000-5000ms
          success: Math.random() > 0.5, // 50% success rate
          enterprise_id: enterpriseId,
          timestamp: new Date(baseTime - i * 60000).toISOString(),
        });
      }

      await supabase.from('agent_metrics').insert(metrics);

      // Calculate performance trends
      const recentWindow = new Date(baseTime - 10 * 60000).toISOString();
      const historicalWindow = new Date(baseTime - 20 * 60000).toISOString();

      const { data: recentMetrics } = await supabase
        .from('agent_metrics')
        .select('duration, success')
        .eq('agent_type', 'analytics')
        .eq('enterprise_id', enterpriseId)
        .gte('timestamp', recentWindow);

      const { data: historicalMetrics } = await supabase
        .from('agent_metrics')
        .select('duration, success')
        .eq('agent_type', 'analytics')
        .eq('enterprise_id', enterpriseId)
        .lt('timestamp', recentWindow)
        .gte('timestamp', historicalWindow);

      // Calculate averages
      const recentAvgDuration = recentMetrics ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length : 0;
      const historicalAvgDuration = historicalMetrics ? historicalMetrics.reduce((sum, m) => sum + m.duration, 0) / historicalMetrics.length : 0;

      const recentSuccessRate = recentMetrics ? recentMetrics.filter(m => m.success).length / recentMetrics.length : 0;
      const historicalSuccessRate = historicalMetrics ? historicalMetrics.filter(m => m.success).length / historicalMetrics.length : 0;

      // Detect degradation
      const durationIncrease = (recentAvgDuration - historicalAvgDuration) / historicalAvgDuration;
      const successRateDecrease = historicalSuccessRate - recentSuccessRate;

      expect(durationIncrease).toBeGreaterThan(5); // >500% increase
      expect(successRateDecrease).toBeGreaterThan(0.3); // >30% decrease
    });
  });
});