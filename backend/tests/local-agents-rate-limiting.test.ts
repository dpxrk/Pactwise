import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseAgent } from '../supabase/functions/local-agents/agents/base.ts';
import { ProcessingResult, AgentContext } from '../supabase/functions/local-agents/agents/base.ts';

// Mock the config and rate limiter modules
vi.mock('../supabase/functions/local-agents/config/index.ts', () => ({
  getFeatureFlag: (flag: string) => flag === 'ENABLE_RATE_LIMITING',
  getAgentConfig: () => ({ timeout: 30000 }),
  getRateLimit: () => ({ requests: 10, window: 60 }),
  getTimeout: () => 30000,
}));

// Create a test agent that extends BaseAgent
class TestAgent extends BaseAgent {
  get agentType() {
    return 'test';
  }

  get capabilities() {
    return ['test_capability'];
  }

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId, 'test');
  }

  async process(_data: unknown, _context?: AgentContext): Promise<ProcessingResult> {
    return {
      success: true,
      data: { processed: true },
      insights: [],
      rulesApplied: ['test_rule'],
      confidence: 0.9,
      processingTime: 100,
      metadata: {
        rulesApplied: ['test_rule'],
        confidence: 0.9,
      },
    };
  }
}

describe('Rate Limiting in BaseAgent', () => {
  let agent: TestAgent;
  let mockSupabase: SupabaseClient;
  let mockRateLimiter: RateLimiter;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: { id: 'task-123', payload: { data: {}, context: {} } },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({ data: {}, error: null }),
        }),
        insert: () => ({ data: {}, error: null }),
      }),
    };

    // Create agent instance
    agent = new TestAgent(mockSupabase, 'test-enterprise-123');

    // Mock rate limiter
    mockRateLimiter = {
      checkLimit: vi.fn(),
    };
    agent.rateLimiter = mockRateLimiter;
  });

  it('should check rate limits when feature flag is enabled', async () => {
    // Set up rate limiter to allow the request
    mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true });

    // Process a task
    await agent.processTask('task-123');

    // Verify rate limiter was called
    expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith({
      maxRequests: 10,
      windowSeconds: 60,
      identifier: 'agent_test_test-enterprise-123',
      identifierType: 'agent',
      endpoint: 'test',
    });
  });

  it('should throw error when rate limit is exceeded', async () => {
    // Set up rate limiter to deny the request
    mockRateLimiter.checkLimit.mockResolvedValue({ allowed: false });

    // Attempt to process a task
    await expect(agent.processTask('task-123')).rejects.toThrow('Rate limit exceeded');

    // Verify task status was updated to failed
    const fromCalls = mockSupabase.from.mock.calls;
    const updateCall = fromCalls.find((call: unknown[]) => call[0] === 'agent_tasks');
    expect(updateCall).toBeDefined();
  });

  it('should not check rate limits when feature flag is disabled', async () => {
    // Mock feature flag to be disabled
    vi.doMock('../supabase/functions/local-agents/config/index.ts', () => ({
      getFeatureFlag: () => false,
      getAgentConfig: () => ({ timeout: 30000 }),
      getRateLimit: () => ({ requests: 10, window: 60 }),
      getTimeout: () => 30000,
    }));

    // Process a task
    await agent.processTask('task-123');

    // Verify rate limiter was NOT called
    expect(mockRateLimiter.checkLimit).not.toHaveBeenCalled();
  });

  it('should handle rate limiter errors gracefully', async () => {
    // Set up rate limiter to throw an error
    mockRateLimiter.checkLimit.mockRejectedValue(new Error('Rate limiter connection failed'));

    // Attempt to process a task
    await expect(agent.processTask('task-123')).rejects.toThrow('Rate limiter connection failed');
  });

  it('should not have duplicate rate limit checks', async () => {
    // This test ensures the bug fix is working
    // Set up rate limiter to allow the request
    mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true });

    // Process a task successfully
    const result = await agent.processTask('task-123');

    // Verify rate limiter was called exactly once
    expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(1);

    // Verify the task was processed successfully
    expect(result).toBeDefined();
  });
});