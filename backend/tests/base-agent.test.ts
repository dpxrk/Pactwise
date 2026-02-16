import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// =============================================================================
// Mock all dependencies BEFORE importing the module under test.
// vi.mock calls are hoisted by vitest, but placing them early makes intent clear.
// =============================================================================

// Mock the config module
vi.mock('../supabase/functions/local-agents/config/index.ts', () => ({
  config: {
    getConfig: vi.fn().mockReturnValue({
      RETRY_CONFIG: {
        MAX_RETRIES: 3,
        INITIAL_DELAY: 1000,
        MAX_DELAY: 10000,
        BACKOFF_MULTIPLIER: 2,
        JITTER: true,
      },
    }),
    FEATURE_FLAGS: {
      ENABLE_CACHING: true,
      ENABLE_RATE_LIMITING: true,
      ENABLE_METRICS: true,
      ENABLE_AUDIT_LOGS: true,
      ENABLE_REAL_TIME: true,
      ENABLE_AI_ANALYSIS: true,
      ENABLE_MEMORY_SYSTEM: true,
    },
    RETRY_CONFIG: {
      MAX_RETRIES: 3,
      INITIAL_DELAY: 1000,
      MAX_DELAY: 10000,
      BACKOFF_MULTIPLIER: 2,
      JITTER: true,
    },
  },
  getFeatureFlag: vi.fn().mockReturnValue(true),
  getRateLimit: vi.fn().mockReturnValue({ requests: 100, window: 60 }),
  getCacheTTL: vi.fn().mockReturnValue(300),
  getTimeout: vi.fn().mockReturnValue(30000),
  getAgentConfig: vi.fn().mockReturnValue({}),
}));

// Mock the cache factory
vi.mock('../supabase/functions-utils/cache-factory.ts', () => ({
  getCache: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
    isRedisEnabled: vi.fn().mockReturnValue(false),
  }),
  getCacheSync: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(null),
    set: vi.fn().mockReturnValue(undefined),
    delete: vi.fn().mockReturnValue(true),
    clear: vi.fn().mockReturnValue(undefined),
    isRedisEnabled: vi.fn().mockReturnValue(false),
  }),
  initializeCache: vi.fn().mockResolvedValue(undefined),
  UnifiedCache: vi.fn(),
}));

// Mock the tracing module
vi.mock('../supabase/functions/local-agents/utils/tracing.ts', () => ({
  TracingManager: vi.fn().mockImplementation(() => ({
    startSpan: vi.fn().mockReturnValue({
      spanId: 'mock-span-id',
      end: vi.fn(),
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
    }),
    endSpan: vi.fn(),
    addTags: vi.fn(),
    addLog: vi.fn(),
    addBaggage: vi.fn(),
    createTraceContext: vi.fn().mockReturnValue({
      traceId: 'mock-trace-id',
      spanId: 'mock-span-id',
      flags: 1,
    }),
    createChildContext: vi.fn().mockReturnValue({
      traceId: 'mock-trace-id',
      spanId: 'mock-child-span-id',
      parentSpanId: 'mock-span-id',
      flags: 1,
    }),
  })),
  TraceContext: vi.fn(),
  SpanKind: { INTERNAL: 0, SERVER: 1, CLIENT: 2 },
  SpanStatus: { OK: 0, ERROR: 1 },
}));

// Mock the memory module
vi.mock('../supabase/functions/local-agents/utils/memory.ts', () => ({
  MemoryManager: vi.fn().mockImplementation(() => ({
    store: vi.fn().mockResolvedValue('mock-id'),
    search: vi.fn().mockResolvedValue([]),
    getRecent: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
    storeShortTermMemory: vi.fn().mockResolvedValue(undefined),
    searchShortTermMemory: vi.fn().mockResolvedValue([]),
    searchLongTermMemory: vi.fn().mockResolvedValue([]),
    applyMemoryDecay: vi.fn().mockResolvedValue(undefined),
    getMemoryStats: vi.fn().mockResolvedValue({
      shortTermCount: 0,
      longTermCount: 0,
      totalMemorySize: 0,
      categoryCounts: {},
    }),
  })),
  Memory: vi.fn(),
  MemorySearchResult: vi.fn(),
}));

// Mock the AI modules
vi.mock('../supabase/functions/_shared/ai/claude-client.ts', () => ({
  ClaudeClient: vi.fn(),
  getClaudeClient: vi.fn().mockReturnValue({
    chat: vi.fn().mockResolvedValue({ content: 'mock response' }),
    isConfigured: vi.fn().mockReturnValue(false),
    stream: vi.fn(),
  }),
  ClaudeTool: vi.fn(),
  ClaudeMessage: vi.fn(),
  StreamEvent: vi.fn(),
}));

vi.mock('../supabase/functions/_shared/ai/tool-executor.ts', () => ({
  ToolExecutor: vi.fn(),
  createToolExecutor: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ result: 'mock' }),
    getClaudeTools: vi.fn().mockReturnValue([]),
  }),
}));

vi.mock('../supabase/functions/_shared/ai/cost-tracker.ts', () => ({
  getCostTracker: vi.fn().mockReturnValue({
    track: vi.fn(),
    getStats: vi.fn().mockReturnValue({ total: 0 }),
    canPerformOperation: vi.fn().mockResolvedValue({ allowed: true }),
    canUserPerformOperation: vi.fn().mockResolvedValue({ allowed: true }),
  }),
  CostTracker: vi.fn(),
}));

// Mock enhanced rate limiter
vi.mock('../supabase/functions/_shared/rate-limiting.ts', () => ({
  EnhancedRateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 10,
      limit: 100,
      resetAt: new Date(),
      rule: { id: 'test', name: 'test' },
      fingerprint: 'test',
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock streaming module
vi.mock('../supabase/functions/_shared/streaming.ts', () => ({
  createSSEStream: vi.fn().mockReturnValue({
    response: new Response(),
    writer: {
      write: vi.fn().mockResolvedValue(undefined),
      writeError: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    },
  }),
  StreamWriter: vi.fn(),
}));

// Mock cache-manager (used indirectly by some agents)
vi.mock('../supabase/functions/local-agents/utils/cache-manager.ts', () => ({
  CacheManager: {
    getInstance: () => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
      exists: vi.fn().mockResolvedValue(false),
    }),
  },
}));

// =============================================================================
// Import module under test AFTER all vi.mock declarations
// =============================================================================

import {
  BaseAgent,
  ProcessingResult,
  Insight,
  AgentContext,
} from '../supabase/functions/local-agents/agents/base.ts';

import { getFeatureFlag } from '../supabase/functions/local-agents/config/index.ts';

// =============================================================================
// Concrete test agent extending the abstract BaseAgent
// =============================================================================

class TestAgent extends BaseAgent {
  get agentType(): string {
    return 'test';
  }
  get capabilities(): string[] {
    return ['test_processing', 'data_analysis'];
  }

  /** Expose protected helpers for direct testing. */
  public exposedCreateResult<T = unknown>(
    success: boolean,
    data: T,
    insights: Insight[],
    rulesApplied: string[],
    confidence: number,
    metadata?: Record<string, unknown>,
  ): ProcessingResult<T> {
    return this.createResult(success, data, insights, rulesApplied, confidence, metadata);
  }

  public exposedCreateInsight(
    type: string,
    severity: Insight['severity'],
    title: string,
    description: string,
    recommendation?: string,
    data?: unknown,
    isActionable?: boolean,
  ): Insight {
    return this.createInsight(type, severity, title, description, recommendation, data, isActionable);
  }

  public exposedExtractPatterns(text: string, patterns: RegExp[]): string[] {
    return this.extractPatterns(text, patterns);
  }

  public exposedCalculateSimilarity(str1: string, str2: string): number {
    return this.calculateSimilarity(str1, str2);
  }

  public exposedHandleProcessingError(
    taskId: string,
    error: Error | unknown,
  ): Promise<ProcessingResult> {
    return this.handleProcessingError(taskId, error);
  }

  public exposedUpdateTaskStatus(
    taskId: string,
    status: string,
    result?: unknown,
    error?: string,
  ): Promise<void> {
    return this.updateTaskStatus(taskId, status, result, error);
  }

  public exposedLogAgentActivity(
    taskId: string,
    logType: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.logAgentActivity(taskId, logType, message, metadata);
  }

  public exposedCheckUserPermission(
    userId: string,
    requiredRole: string,
  ): Promise<boolean> {
    return this.checkUserPermission(userId, requiredRole);
  }

  public exposedCreateDefaultContext(): AgentContext {
    return this.createDefaultContext();
  }

  public getEnterpriseIdValue(): string {
    return this.enterpriseId;
  }

  public getUserIdValue(): string | undefined {
    return this.userId;
  }

  async process(
    data: unknown,
    _context?: AgentContext,
  ): Promise<ProcessingResult<unknown>> {
    return this.createResult(
      true,
      { processed: data },
      [
        this.createInsight(
          'test',
          'low',
          'Test Insight',
          'Processing completed',
          undefined,
          data,
        ),
      ],
      ['rule1'],
      0.9,
    );
  }
}

// =============================================================================
// Helper: deeply chainable Supabase mock
// =============================================================================

function createDeepChainableMock(
  defaultResponse: { data: unknown; error: unknown } = { data: null, error: null },
) {
  const builder: Record<string, Mock> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'not',
    'or', 'and', 'filter', 'match',
    'order', 'limit', 'range', 'offset',
    'contains', 'containedBy', 'overlaps',
    'textSearch', 'throwOnError',
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods resolve the default response
  builder.single = vi.fn().mockResolvedValue(defaultResponse);
  builder.maybeSingle = vi.fn().mockResolvedValue(defaultResponse);

  const client = {
    from: vi.fn().mockReturnValue(builder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      }),
      signIn: vi.fn().mockResolvedValue({
        data: { user: { id: 'auth-1' } },
        error: null,
      }),
    },
    _builder: builder,
  };
  return client;
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('BaseAgent', () => {
  let mockSupabase: ReturnType<typeof createDeepChainableMock>;
  let agent: TestAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createDeepChainableMock();
    agent = new TestAgent(mockSupabase as any, 'enterprise-123', 'user-456');
  });

  // =========================================================================
  // 1. Construction & Initialization
  // =========================================================================
  describe('Construction & Initialization', () => {
    it('should set enterpriseId correctly from constructor argument', () => {
      expect(agent.getEnterpriseIdValue()).toBe('enterprise-123');
    });

    it('should return correct agentType from subclass', () => {
      expect(agent.agentType).toBe('test');
    });

    it('should return correct capabilities from subclass', () => {
      expect(agent.capabilities).toEqual(['test_processing', 'data_analysis']);
    });

    it('should store userId when provided in constructor', () => {
      expect(agent.getUserIdValue()).toBe('user-456');
    });

    it('should leave userId undefined when not provided in constructor', () => {
      const agentNoUser = new TestAgent(mockSupabase as any, 'enterprise-999');
      expect(agentNoUser.getUserIdValue()).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. createResult Helper
  // =========================================================================
  describe('createResult Helper', () => {
    it('should create a successful result with correct structure', () => {
      const result = agent.exposedCreateResult(
        true,
        { foo: 'bar' },
        [],
        ['r1'],
        0.95,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ foo: 'bar' });
      expect(result.rulesApplied).toEqual(['r1']);
      expect(result.confidence).toBe(0.95);
      expect(result.insights).toEqual([]);
      expect(typeof result.processingTime).toBe('number');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should create a failed result with success=false', () => {
      const result = agent.exposedCreateResult(false, null, [], [], 0);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should include insights in the result', () => {
      const insight = agent.exposedCreateInsight('risk', 'high', 'Title', 'Desc');
      const result = agent.exposedCreateResult(true, {}, [insight], [], 0.8);

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].type).toBe('risk');
      expect(result.insights[0].severity).toBe('high');
    });

    it('should include rulesApplied in the result', () => {
      const result = agent.exposedCreateResult(
        true,
        {},
        [],
        ['rule_a', 'rule_b', 'rule_c'],
        0.7,
      );

      expect(result.rulesApplied).toEqual(['rule_a', 'rule_b', 'rule_c']);
    });

    it('should compute processingTime as a non-negative number', () => {
      const result = agent.exposedCreateResult(true, {}, [], [], 1.0);

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should merge metadata from call-level argument into result', () => {
      const result = agent.exposedCreateResult(
        true,
        {},
        [],
        [],
        0.5,
        { extra: 'value' },
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.extra).toBe('value');
    });
  });

  // =========================================================================
  // 3. createInsight Helper
  // =========================================================================
  describe('createInsight Helper', () => {
    it('should create an insight with the correct type field', () => {
      const insight = agent.exposedCreateInsight('compliance', 'low', 'T', 'D');
      expect(insight.type).toBe('compliance');
    });

    it('should support all severity levels', () => {
      const severities: Array<Insight['severity']> = ['low', 'medium', 'high', 'critical'];
      for (const severity of severities) {
        const insight = agent.exposedCreateInsight('test', severity, 'Title', 'Desc');
        expect(insight.severity).toBe(severity);
      }
    });

    it('should include a recommendation when provided', () => {
      const insight = agent.exposedCreateInsight(
        'risk',
        'high',
        'Risk Found',
        'A risk was detected',
        'Mitigate the risk by reviewing clause 5',
      );
      expect(insight.recommendation).toBe(
        'Mitigate the risk by reviewing clause 5',
      );
    });

    it('should omit recommendation when not provided', () => {
      const insight = agent.exposedCreateInsight('info', 'low', 'Info', 'Details');
      expect(insight).not.toHaveProperty('recommendation');
    });

    it('should default isActionable to true', () => {
      const insight = agent.exposedCreateInsight('test', 'medium', 'T', 'D');
      expect(insight.isActionable).toBe(true);
    });

    it('should allow setting isActionable to false', () => {
      const insight = agent.exposedCreateInsight(
        'test',
        'low',
        'T',
        'D',
        undefined,
        undefined,
        false,
      );
      expect(insight.isActionable).toBe(false);
    });

    it('should attach data payload to the insight', () => {
      const payload = { contractId: 'c-1', clauses: [1, 2, 3] };
      const insight = agent.exposedCreateInsight(
        'analysis',
        'medium',
        'Title',
        'Desc',
        undefined,
        payload,
      );
      expect(insight.data).toEqual(payload);
    });
  });

  // =========================================================================
  // 4. process Method (via concrete TestAgent)
  // =========================================================================
  describe('process Method', () => {
    it('should return a ProcessingResult', async () => {
      const result = await agent.process({ value: 42 });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.rulesApplied)).toBe(true);
    });

    it('should return success=true for valid input', async () => {
      const result = await agent.process({ value: 42 });
      expect(result.success).toBe(true);
    });

    it('should include insights generated during processing', async () => {
      const result = await agent.process({ value: 42 });
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe('Test Insight');
      expect(result.insights[0].description).toBe('Processing completed');
    });

    it('should wrap input data in the result data field', async () => {
      const input = { key: 'value', nested: { a: 1 } };
      const result = await agent.process(input);
      expect(result.data).toEqual({ processed: input });
    });

    it('should have confidence within the 0-1 range', async () => {
      const result = await agent.process({});
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // 5. processTask Method
  // =========================================================================
  describe('processTask Method', () => {
    const TASK_ID = 'task-abc-123';

    /**
     * Create a fully self-referencing chainable mock that handles arbitrary
     * query chain depths (select/eq/eq/single, select/eq/single, update/eq/eq, etc.).
     */
    function createSelfRefBuilder(
      singleResponse: { data: unknown; error: unknown } = { data: null, error: null },
    ) {
      const builder: Record<string, any> = {};
      const chainMethods = [
        'select', 'insert', 'update', 'delete', 'upsert',
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'like', 'ilike', 'is', 'in', 'not',
        'or', 'and', 'filter', 'match',
        'order', 'limit', 'range', 'offset',
      ];
      for (const m of chainMethods) {
        builder[m] = vi.fn().mockReturnValue(builder);
      }
      builder.single = vi.fn().mockResolvedValue(singleResponse);
      builder.maybeSingle = vi.fn().mockResolvedValue(singleResponse);
      // Make insert also resolve when used as a terminal (e.g., .insert({}) with no chaining)
      builder.insert = vi.fn().mockImplementation(() => {
        // Return the builder so .select().single() can be chained after insert,
        // but also make it thenable in case it's awaited directly.
        const proxy = { ...builder };
        proxy.then = (resolve: (v: any) => void) => resolve({ data: null, error: null });
        return proxy;
      });
      return builder;
    }

    /**
     * Configure the mock so that queries against agent_tasks return the given
     * task data, and all follow-up update/insert operations succeed.
     */
    function setupTaskFetch(
      taskData: Record<string, unknown> | null,
      error: unknown = null,
    ) {
      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'agent_tasks') {
          return createSelfRefBuilder({ data: taskData, error });
        }
        // All other tables (agent_logs, agent_insights, agents, agent_metrics, realtime_broadcasts)
        return createSelfRefBuilder({ data: { id: 'agent-id-1' }, error: null });
      });

      // Also mock rpc for transition_contract_after_analysis
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
    }

    it('should fetch the task from the database using taskId and enterpriseId', async () => {
      const taskPayload = {
        id: TASK_ID,
        type: 'test',
        priority: 1,
        enterprise_id: 'enterprise-123',
        payload: { data: { value: 1 }, context: {} },
        contract_id: null,
        vendor_id: null,
      };

      setupTaskFetch(taskPayload);

      const result = await agent.processTask(TASK_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith('agent_tasks');
      expect(result.success).toBe(true);
    });

    it('should update task status to processing before executing', async () => {
      const taskPayload = {
        id: TASK_ID,
        type: 'test',
        priority: 1,
        enterprise_id: 'enterprise-123',
        payload: { data: { value: 1 }, context: {} },
        contract_id: null,
        vendor_id: null,
      };

      setupTaskFetch(taskPayload);

      await agent.processTask(TASK_ID);

      // The from mock should have been called multiple times for agent_tasks
      // (at least once for fetch, once for status-to-processing, once for status-to-completed)
      const agentTasksCalls = mockSupabase.from.mock.calls.filter(
        (call: string[]) => call[0] === 'agent_tasks',
      );
      expect(agentTasksCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should return failure for a missing task', async () => {
      setupTaskFetch(null, { message: 'Not found' });

      const result = await agent.processTask(TASK_ID);

      // processTask catches the error via handleProcessingError
      expect(result.success).toBe(false);
    });

    it('should return a successful result with processed data', async () => {
      const taskPayload = {
        id: TASK_ID,
        type: 'test',
        priority: 1,
        enterprise_id: 'enterprise-123',
        payload: { data: { value: 42 }, context: {} },
        contract_id: null,
        vendor_id: null,
      };

      setupTaskFetch(taskPayload);

      const result = await agent.processTask(TASK_ID);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: { value: 42 } });
    });

    it('should include processingTime in the result', async () => {
      const taskPayload = {
        id: TASK_ID,
        type: 'test',
        priority: 1,
        enterprise_id: 'enterprise-123',
        payload: { data: {}, context: {} },
        contract_id: null,
        vendor_id: null,
      };

      setupTaskFetch(taskPayload);

      const result = await agent.processTask(TASK_ID);

      expect(typeof result.processingTime).toBe('number');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 6. Error Handling (handleProcessingError)
  // =========================================================================
  describe('Error Handling', () => {
    const TASK_ID = 'task-err-456';

    /**
     * Create a self-referencing chainable mock for arbitrary query depths.
     */
    function createSelfRefBuilder(
      singleResponse: { data: unknown; error: unknown } = { data: null, error: null },
    ) {
      const builder: Record<string, any> = {};
      const chainMethods = [
        'select', 'update', 'delete', 'upsert',
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'like', 'ilike', 'is', 'in', 'not',
        'or', 'and', 'filter', 'match',
        'order', 'limit', 'range', 'offset',
      ];
      for (const m of chainMethods) {
        builder[m] = vi.fn().mockReturnValue(builder);
      }
      builder.single = vi.fn().mockResolvedValue(singleResponse);
      builder.maybeSingle = vi.fn().mockResolvedValue(singleResponse);
      builder.insert = vi.fn().mockImplementation(() => {
        const proxy = { ...builder };
        proxy.then = (resolve: (v: any) => void) => resolve({ data: null, error: null });
        return proxy;
      });
      return builder;
    }

    /**
     * Set up the mock for handleProcessingError operations:
     * 1. Fetch retry_count / max_retries from agent_tasks
     * 2. Update agent_tasks (retry count, scheduled_at, status)
     * 3. Insert into agent_logs
     */
    function setupErrorHandlingMocks(retryCount: number, maxRetries: number) {
      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'agent_tasks') {
          return createSelfRefBuilder({
            data: {
              retry_count: retryCount,
              max_retries: maxRetries,
              task_type: 'general',
              contract_id: null,
            },
            error: null,
          });
        }
        // agent_logs, agent_metrics, etc.
        return createSelfRefBuilder({ data: null, error: null });
      });
    }

    it('should return a failed ProcessingResult on error', async () => {
      setupErrorHandlingMocks(0, 3);

      const result = await agent.exposedHandleProcessingError(
        TASK_ID,
        new Error('Something went wrong'),
      );

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should include the error message in the result metadata', async () => {
      setupErrorHandlingMocks(0, 3);

      const result = await agent.exposedHandleProcessingError(
        TASK_ID,
        new Error('Database connection timeout'),
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.error).toBe('Database connection timeout');
    });

    it('should schedule a retry when retry_count is below max_retries', async () => {
      setupErrorHandlingMocks(0, 3);

      const result = await agent.exposedHandleProcessingError(
        TASK_ID,
        new Error('Transient failure'),
      );

      // The result metadata should include the retry count
      expect(result.metadata!.retryCount).toBe(1);

      // agent_tasks should have been updated (retry count reset + schedule)
      const agentTasksCalls = mockSupabase.from.mock.calls.filter(
        (call: string[]) => call[0] === 'agent_tasks',
      );
      expect(agentTasksCalls.length).toBeGreaterThan(0);
    });

    it('should mark the task as failed when max retries are exceeded', async () => {
      setupErrorHandlingMocks(2, 3);

      const result = await agent.exposedHandleProcessingError(
        TASK_ID,
        new Error('Persistent failure'),
      );

      expect(result.success).toBe(false);
      // retryCount = 2 + 1 = 3, which equals maxRetries, so task is marked failed
      expect(result.metadata!.retryCount).toBe(3);
    });

    it('should handle non-Error objects gracefully', async () => {
      setupErrorHandlingMocks(0, 3);

      const result = await agent.exposedHandleProcessingError(
        TASK_ID,
        'a string error',
      );

      expect(result.success).toBe(false);
      expect(result.metadata!.error).toBe('a string error');
    });
  });

  // =========================================================================
  // 7. Utility Methods
  // =========================================================================
  describe('Utility Methods', () => {
    describe('extractPatterns', () => {
      it('should extract matches from text using provided regex patterns', () => {
        const text =
          'Contact us at support@example.com or sales@example.com';
        const patterns = [/[\w.]+@[\w.]+\.\w+/g];

        const matches = agent.exposedExtractPatterns(text, patterns);

        expect(matches).toContain('support@example.com');
        expect(matches).toContain('sales@example.com');
      });

      it('should deduplicate matched patterns', () => {
        const text = 'repeat repeat repeat';
        const patterns = [/repeat/g];

        const matches = agent.exposedExtractPatterns(text, patterns);

        expect(matches).toEqual(['repeat']);
      });

      it('should return empty array when no patterns match', () => {
        const text = 'Hello world';
        const patterns = [/\d{4}-\d{2}-\d{2}/g];

        const matches = agent.exposedExtractPatterns(text, patterns);

        expect(matches).toEqual([]);
      });

      it('should handle multiple patterns and merge results', () => {
        const text = 'Call 555-1234 or email user@test.com for help.';
        const patterns = [/\d{3}-\d{4}/g, /[\w.]+@[\w.]+\.\w+/g];

        const matches = agent.exposedExtractPatterns(text, patterns);

        expect(matches).toContain('555-1234');
        expect(matches).toContain('user@test.com');
        expect(matches).toHaveLength(2);
      });
    });

    describe('calculateSimilarity', () => {
      it('should return 1.0 for identical strings', () => {
        expect(agent.exposedCalculateSimilarity('hello', 'hello')).toBe(1.0);
      });

      it('should return 0 for completely different strings of equal length', () => {
        expect(agent.exposedCalculateSimilarity('abcde', 'fghij')).toBe(0);
      });

      it('should return a value between 0 and 1 for partially similar strings', () => {
        const similarity = agent.exposedCalculateSimilarity(
          'kitten',
          'sitting',
        );
        expect(similarity).toBeGreaterThan(0);
        expect(similarity).toBeLessThan(1);
      });

      it('should return 1.0 for two empty strings', () => {
        expect(agent.exposedCalculateSimilarity('', '')).toBe(1.0);
      });

      it('should be symmetric (order of arguments does not matter)', () => {
        const sim1 = agent.exposedCalculateSimilarity('abc', 'axc');
        const sim2 = agent.exposedCalculateSimilarity('axc', 'abc');
        expect(sim1).toBeCloseTo(sim2);
      });
    });

    describe('createDefaultContext', () => {
      it('should return an AgentContext with the correct enterpriseId', () => {
        const ctx = agent.exposedCreateDefaultContext();
        expect(ctx.enterpriseId).toBe('enterprise-123');
      });

      it('should set empty environment and permissions', () => {
        const ctx = agent.exposedCreateDefaultContext();
        expect(ctx.environment).toEqual({});
        expect(ctx.permissions).toEqual([]);
      });

      it('should have a sessionId string', () => {
        const ctx = agent.exposedCreateDefaultContext();
        expect(typeof ctx.sessionId).toBe('string');
      });
    });
  });

  // =========================================================================
  // 8. updateTaskStatus
  // =========================================================================
  describe('updateTaskStatus', () => {
    function setupUpdateMock() {
      const capturedUpdates: Record<string, unknown>[] = [];

      mockSupabase.from.mockImplementation((_tableName: string) => {
        const updateEq2 = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });
        const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 });
        const updateMock = vi.fn().mockImplementation(
          (data: Record<string, unknown>) => {
            capturedUpdates.push(data);
            return { eq: updateEq1 };
          },
        );

        // For the follow-up select of task_type, contract_id after completed/failed
        const selectSingle = vi.fn().mockResolvedValue({
          data: { task_type: 'general', contract_id: null },
          error: null,
        });
        const selectEq = vi.fn().mockReturnValue({ single: selectSingle });
        const selectMock = vi.fn().mockReturnValue({ eq: selectEq });

        return {
          update: updateMock,
          select: selectMock,
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      return { capturedUpdates };
    }

    it('should set started_at when status is processing', async () => {
      const { capturedUpdates } = setupUpdateMock();

      await agent.exposedUpdateTaskStatus('task-1', 'processing');

      expect(capturedUpdates.length).toBeGreaterThan(0);
      const update = capturedUpdates[0];
      expect(update.status).toBe('processing');
      expect(update.started_at).toBeDefined();
      expect(typeof update.started_at).toBe('string');
    });

    it('should set completed_at when status is completed', async () => {
      const { capturedUpdates } = setupUpdateMock();

      await agent.exposedUpdateTaskStatus('task-1', 'completed', {
        some: 'result',
      });

      const update = capturedUpdates[0];
      expect(update.status).toBe('completed');
      expect(update.completed_at).toBeDefined();
      expect(update.result).toEqual({ some: 'result' });
    });

    it('should set completed_at and error when status is failed', async () => {
      const { capturedUpdates } = setupUpdateMock();

      await agent.exposedUpdateTaskStatus(
        'task-1',
        'failed',
        null,
        'Something broke',
      );

      const update = capturedUpdates[0];
      expect(update.status).toBe('failed');
      expect(update.completed_at).toBeDefined();
      expect(update.error).toBe('Something broke');
    });

    it('should not set started_at or completed_at for custom statuses', async () => {
      const { capturedUpdates } = setupUpdateMock();

      await agent.exposedUpdateTaskStatus('task-1', 'pending');

      const update = capturedUpdates[0];
      expect(update.status).toBe('pending');
      expect(update.started_at).toBeUndefined();
      expect(update.completed_at).toBeUndefined();
    });

    it('should always include updated_at timestamp', async () => {
      const { capturedUpdates } = setupUpdateMock();

      await agent.exposedUpdateTaskStatus('task-1', 'processing');

      const update = capturedUpdates[0];
      expect(update.updated_at).toBeDefined();
      expect(typeof update.updated_at).toBe('string');
    });
  });

  // =========================================================================
  // 9. logAgentActivity
  // =========================================================================
  describe('logAgentActivity', () => {
    it('should insert into agent_logs when ENABLE_AUDIT_LOGS is true', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'agent_logs') {
          return { insert: insertMock };
        }
        return mockSupabase._builder;
      });

      await agent.exposedLogAgentActivity('task-1', 'info', 'Test message', {
        key: 'val',
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 'task-1',
          log_type: 'info',
          message: 'Test message',
          metadata: { key: 'val' },
          enterprise_id: 'enterprise-123',
        }),
      );
    });

    it('should skip logging when ENABLE_AUDIT_LOGS is false', async () => {
      (getFeatureFlag as Mock).mockReturnValueOnce(false);

      const insertMock = vi.fn();
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      await agent.exposedLogAgentActivity('task-1', 'info', 'Skipped');

      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 10. checkUserPermission
  // =========================================================================
  describe('checkUserPermission', () => {
    function setupPermissionMock(role: string) {
      const singleMock = vi.fn().mockResolvedValue({
        data: { role },
        error: null,
      });
      const eqMock2 = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock1 });

      mockSupabase.from.mockImplementation((_tableName: string) => ({
        select: selectMock,
      }));
    }

    it('should return true when user role exceeds the required role', async () => {
      setupPermissionMock('admin');

      const allowed = await agent.exposedCheckUserPermission(
        'user-1',
        'manager',
      );

      expect(allowed).toBe(true);
    });

    it('should return true when user role equals the required role', async () => {
      setupPermissionMock('manager');

      const allowed = await agent.exposedCheckUserPermission(
        'user-1',
        'manager',
      );

      expect(allowed).toBe(true);
    });

    it('should return false when user role is below the required role', async () => {
      setupPermissionMock('viewer');

      const allowed = await agent.exposedCheckUserPermission(
        'user-1',
        'admin',
      );

      expect(allowed).toBe(false);
    });

    it('should handle the full role hierarchy correctly (owner satisfies all)', async () => {
      setupPermissionMock('owner');

      expect(
        await agent.exposedCheckUserPermission('user-1', 'viewer'),
      ).toBe(true);
      expect(
        await agent.exposedCheckUserPermission('user-1', 'user'),
      ).toBe(true);
      expect(
        await agent.exposedCheckUserPermission('user-1', 'manager'),
      ).toBe(true);
      expect(
        await agent.exposedCheckUserPermission('user-1', 'admin'),
      ).toBe(true);
      expect(
        await agent.exposedCheckUserPermission('user-1', 'owner'),
      ).toBe(true);
    });
  });

  // =========================================================================
  // 11. Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('should handle null data in process without crashing', async () => {
      const result = await agent.process(null);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: null });
    });

    it('should handle undefined data in process without crashing', async () => {
      const result = await agent.process(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: undefined });
    });

    it('should handle deeply nested data structures', async () => {
      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: { value: 'deep' },
            },
          },
        },
      };
      const result = await agent.process(deepData);
      expect(result.success).toBe(true);
      expect(
        (result.data as any).processed.level1.level2.level3.level4.value,
      ).toBe('deep');
    });

    it('should handle large arrays in process input', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
      }));
      const result = await agent.process(largeArray);
      expect(result.success).toBe(true);
    });

    it('should not share state between different agent instances', () => {
      const agent1 = new TestAgent(mockSupabase as any, 'ent-1', 'u-1');
      const agent2 = new TestAgent(mockSupabase as any, 'ent-2', 'u-2');

      expect(agent1.getEnterpriseIdValue()).toBe('ent-1');
      expect(agent2.getEnterpriseIdValue()).toBe('ent-2');
      expect(agent1.getUserIdValue()).toBe('u-1');
      expect(agent2.getUserIdValue()).toBe('u-2');
    });

    it('should preserve agentType and capabilities across multiple process calls', async () => {
      await agent.process({ call: 1 });
      await agent.process({ call: 2 });
      await agent.process({ call: 3 });

      expect(agent.agentType).toBe('test');
      expect(agent.capabilities).toEqual(['test_processing', 'data_analysis']);
    });
  });
});
