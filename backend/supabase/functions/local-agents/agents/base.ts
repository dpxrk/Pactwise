import { SupabaseClient } from '@supabase/supabase-js';
import { getCache, getCacheSync, UnifiedCache, initializeCache } from '../../../functions-utils/cache-factory.ts';
import { EnhancedRateLimiter } from '../../_shared/rate-limiting.ts';
import {
  config,
  getFeatureFlag,
  getRateLimit,
  getCacheTTL,
} from '../config/index.ts';
import { TracingManager, TraceContext, SpanKind, SpanStatus } from '../utils/tracing.ts';
import { MemoryManager, Memory, MemorySearchResult } from '../utils/memory.ts';
import {
  CausalQuestion,
  CausalAnalysisResult,
  InterventionGoal,
  InterventionRecommendation,
  CounterfactualScenario,
  CounterfactualResult,
} from '../../../types/common/causal.ts';

// AI Module Imports for LLM Mode
import {
  ClaudeClient,
  getClaudeClient,
  ClaudeTool,
  ClaudeMessage,
  StreamEvent,
} from '../../_shared/ai/claude-client.ts';
import { ToolExecutor, createToolExecutor } from '../../_shared/ai/tool-executor.ts';
import { getCostTracker, CostTracker } from '../../_shared/ai/cost-tracker.ts';
import { createSSEStream, StreamWriter } from '../../_shared/streaming.ts';

export interface ProcessingResult<T = unknown> {
  success: boolean;
  data: T;
  insights: Insight[];
  rulesApplied: string[];
  confidence: number;
  processingTime: number;
  metadata?: Record<string, unknown>;
  error?: string;
  result?: T;
}

export interface Insight<T = unknown> {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  data?: T;
  isActionable: boolean;
}

export interface AgentContext {
  taskId?: string;
  userId?: string;
  contractId?: string;
  vendorId?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
  traceContext?: TraceContext;
  taskType?: string;
  memory?: MemorySearchResult[];
  otherAgents?: string[];
  enterpriseId: string;
  sessionId: string;
  environment: Record<string, unknown>;
  permissions: string[];
  // Causal reasoning methods
  requestCausalAnalysis?: (question: CausalQuestion) => Promise<CausalAnalysisResult>;
  recommendInterventions?: (goal: InterventionGoal) => Promise<InterventionRecommendation[]>;
  generateCounterfactuals?: (scenario: CounterfactualScenario) => Promise<CounterfactualResult[]>;
  systemState?: Record<string, unknown>;
  // Metacognitive properties
  timeConstraint?: number;
}

// LLM Processing Mode
export type ProcessingMode = 'rule_based' | 'llm' | 'hybrid';

// Streaming callback types
export interface StreamingCallbacks {
  onThought?: (thought: string) => void;
  onAction?: (action: string, tool: string) => void;
  onResult?: (result: unknown) => void;
  onError?: (error: string) => void;
  onComplete?: (result: ProcessingResult) => void;
}

export abstract class BaseAgent {
  protected supabase: SupabaseClient;
  protected enterpriseId: string;
  protected startTime: number;
  protected agentId?: string;
  protected syncCache = getCacheSync(); // Synchronous cache for immediate access
  protected asyncCache: UnifiedCache | null = null; // Async cache with Redis support
  protected cacheInitialized = false;
  protected rateLimiter: EnhancedRateLimiter;
  protected configManager: typeof config;
  protected metadata: Record<string, unknown> = {};
  protected tracingManager: TracingManager;
  protected traceContext?: TraceContext;
  protected memoryManager: MemoryManager;
  protected userId?: string;

  // LLM Mode properties
  protected claudeClient: ClaudeClient | null = null;
  protected toolExecutor: ToolExecutor | null = null;
  protected costTracker: CostTracker | null = null;
  protected processingMode: ProcessingMode = 'rule_based';
  protected llmInitialized = false;

  constructor(supabase: SupabaseClient, enterpriseId: string, userId?: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    if (userId) {
      this.userId = userId;
    }
    this.startTime = Date.now();
    this.rateLimiter = new EnhancedRateLimiter(supabase);
    this.configManager = config;
    this.tracingManager = new TracingManager(supabase, enterpriseId);
    this.memoryManager = new MemoryManager(supabase, enterpriseId, userId);

    // Initialize async cache in background
    this.initCacheAsync();
  }

  /**
   * Initialize the async cache (Redis-backed if available)
   * This runs in the background and doesn't block constructor
   */
  private async initCacheAsync(): Promise<void> {
    try {
      await initializeCache();
      this.asyncCache = await getCache();
      this.cacheInitialized = true;
    } catch (error) {
      console.error('BaseAgent: Failed to initialize async cache, using sync cache only:', error);
      this.cacheInitialized = true; // Mark as initialized even on failure, will use sync cache
    }
  }

  /**
   * Ensure async cache is ready before use
   */
  protected async ensureCacheReady(): Promise<UnifiedCache> {
    if (!this.cacheInitialized) {
      await this.initCacheAsync();
    }
    return this.asyncCache || await getCache();
  }

  abstract get agentType(): string;
  abstract get capabilities(): string[];

  // Main processing method with task queue integration
  async processTask(taskId: string): Promise<ProcessingResult> {
    // Extract or create trace context
    const traceContext = this.extractOrCreateTraceContext(taskId);
    const span = this.tracingManager.startSpan(
      `${this.agentType}.processTask`,
      traceContext,
      this.agentType,
      SpanKind.SERVER,
    );

    // Add initial tags
    this.tracingManager.addTags(span.spanId, {
      'task.id': taskId,
      'agent.type': this.agentType,
      'enterprise.id': this.enterpriseId,
    });

    try {
      // Get task details
      const { data: task, error } = await this.supabase
        .from('agent_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('enterprise_id', this.enterpriseId)
        .single();

      if (error || !task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      this.tracingManager.addTags(span.spanId, {
        'task.type': task.type,
        'task.priority': task.priority,
      });

      // Update task status to processing
      await this.updateTaskStatus(taskId, 'processing');

      // Check rate limits if enabled
      if (getFeatureFlag('ENABLE_RATE_LIMITING')) {
        const rateLimitSpan = this.tracingManager.startSpan(
          'rate_limit_check',
          this.tracingManager.createChildContext(traceContext),
          this.agentType,
          SpanKind.INTERNAL,
        );

        const rateLimit = getRateLimit('DEFAULT');
        // Create a fake request for rate limiting
        const fakeReq = new Request('http://localhost/agent-task');
        const rateLimitResult = await this.rateLimiter.checkLimit(
          fakeReq,
          [{
            id: 'agent_rate_limit',
            name: 'Agent Rate Limit',
            strategy: 'fixed_window',
            maxRequests: rateLimit.requests,
            windowSeconds: rateLimit.window,
            scope: 'user',
            enabled: true,
            priority: 1,
          }],
          `agent_${this.agentType}_${this.enterpriseId}`
        );

        this.tracingManager.endSpan(rateLimitSpan.spanId, SpanStatus.OK);

        if (!rateLimitResult.allowed) {
          throw new Error('Rate limit exceeded');
        }
      }

      // Process the task with trace context
      const processSpan = this.tracingManager.startSpan(
        `${this.agentType}.process`,
        this.tracingManager.createChildContext(traceContext),
        this.agentType,
        SpanKind.INTERNAL,
      );

      const result = await this.process(task.payload.data, {
        ...task.payload.context,
        taskId,
        traceContext: this.tracingManager.createChildContext(traceContext),
      });

      this.tracingManager.endSpan(processSpan.spanId, SpanStatus.OK);

      // Store insights if any
      if (result.insights.length > 0) {
        const insightSpan = this.tracingManager.startSpan(
          'store_insights',
          this.tracingManager.createChildContext(traceContext),
          this.agentType,
          SpanKind.INTERNAL,
        );

        await this.storeInsights(
          result.insights,
          task.contract_id || task.vendor_id,
          task.contract_id ? 'contract' : 'vendor',
        );

        this.tracingManager.endSpan(insightSpan.spanId, SpanStatus.OK);
      }

      // Update task with result
      await this.updateTaskStatus(taskId, 'completed', result);

      // Log success
      await this.logAgentActivity(taskId, 'completed', 'Task processed successfully', {
        processingTime: result.processingTime,
        insightCount: result.insights.length,
      });

      // Broadcast completion for real-time updates
      await this.broadcastTaskCompletion(taskId, result);

      // Add final tags and end span
      this.tracingManager.addTags(span.spanId, {
        'task.status': 'completed',
        'task.processing_time': result.processingTime,
        'task.insight_count': result.insights.length,
      });
      this.tracingManager.endSpan(span.spanId, SpanStatus.OK);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Log error to trace
      this.tracingManager.addLog(span.spanId, 'error', 'Task processing failed', {
        error: errorMessage,
        stack: errorStack,
      });
      this.tracingManager.addTags(span.spanId, {
        'task.status': 'failed',
        'error': errorMessage,
      });
      this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);

      // Handle errors with retry logic
      return await this.handleProcessingError(taskId, error);
    }
  }

  abstract process(data: unknown, context?: AgentContext): Promise<ProcessingResult<unknown>>;

  protected createResult<T = unknown>(
    success: boolean,
    data: T,
    insights: Insight[],
    rulesApplied: string[],
    confidence: number,
    metadata?: Record<string, unknown>,
  ): ProcessingResult<T> {
    const result = {
      success,
      data,
      insights,
      rulesApplied,
      confidence,
      processingTime: Date.now() - this.startTime,
      metadata: { ...this.metadata, ...metadata },
    };

    // Record metrics
    this.recordMetrics('process', result.processingTime, success).catch(console.error);

    return result;
  }

  protected createInsight(
    type: string,
    severity: Insight['severity'],
    title: string,
    description: string,
    recommendation?: string,
    data?: unknown,
    isActionable = true,
  ): Insight {
    const insight: Insight = {
      type,
      severity,
      title,
      description,
      data,
      isActionable,
    };
    
    if (recommendation !== undefined) {
      insight.recommendation = recommendation;
    }
    
    return insight;
  }

  protected async storeInsights(insights: Insight[], relatedEntityId?: string, entityType?: string) {
    if (insights.length === 0 || !getFeatureFlag('ENABLE_METRICS')) {return;}

    // Get agent ID with caching
    if (!this.agentId) {
      const cacheKey = `agent_id_${this.agentType}_${this.enterpriseId}`;
      this.agentId = await this.getCachedOrFetch(cacheKey, async () => {
        const { data: agent } = await this.supabase
          .from('agents')
          .select('id')
          .eq('type', this.agentType)
          .eq('enterprise_id', this.enterpriseId)
          .eq('is_active', true)
          .single();

        return agent?.id;
      }, 3600); // 1 hour cache
    }

    const insightRecords = insights.map(insight => ({
      agent_id: this.agentId,
      insight_type: insight.type,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      recommendation: insight.recommendation,
      metadata: insight.data,
      is_actionable: insight.isActionable,
      enterprise_id: this.enterpriseId,
      contract_id: entityType === 'contract' ? relatedEntityId : null,
      vendor_id: entityType === 'vendor' ? relatedEntityId : null,
    }));

    await this.supabase.from('agent_insights').insert(insightRecords);
  }

  protected async logAgentActivity(
    taskId: string,
    logType: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    if (!getFeatureFlag('ENABLE_AUDIT_LOGS')) {return;}

    await this.supabase.from('agent_logs').insert({
      agent_id: this.agentId,
      task_id: taskId,
      log_type: logType,
      message,
      metadata,
      enterprise_id: this.enterpriseId,
    });
  }

  protected async updateTaskStatus(
    taskId: string,
    status: string,
    result?: unknown,
    error?: string,
  ) {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'processing') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (result) {updateData.result = result;}
    if (error) {updateData.error = error;}

    await this.supabase
      .from('agent_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('enterprise_id', this.enterpriseId);

    // NEW: Transition contract status after analysis completes
    if ((status === 'completed' || status === 'failed')) {
      // Get task details to check if it's a contract analysis task
      const { data: task } = await this.supabase
        .from('agent_tasks')
        .select('task_type, contract_id')
        .eq('id', taskId)
        .single();

      if (task?.contract_id && task?.task_type === 'analyze_contract') {
        try {
          // Call the transition function to update contract status
          await this.supabase.rpc('transition_contract_after_analysis', {
            p_contract_id: task.contract_id,
            p_analysis_status: status === 'completed' ? 'completed' : 'failed',
          });
        } catch (err) {
          console.error('Failed to transition contract status after analysis:', err);
          // Don't fail the entire task update if this fails
        }
      }
    }
  }

  // Permission checking
  protected async checkUserPermission(userId: string, requiredRole: string): Promise<boolean> {
    const cacheKey = `user_role_${userId}_${this.enterpriseId}`;
    const cacheTTL = getCacheTTL('USER_PERMISSIONS');

    const userRole = await this.getCachedOrFetch(cacheKey, async () => {
      const { data: user } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .eq('enterprise_id', this.enterpriseId)
        .single();

      return user?.role;
    }, cacheTTL);

    const roleHierarchy = ['viewer', 'user', 'manager', 'admin', 'owner'];
    const userLevel = roleHierarchy.indexOf(userRole);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);

    return userLevel >= requiredLevel;
  }

  // Enterprise configuration with caching
  protected async getEnterpriseConfig() {
    const cacheKey = `enterprise_config_${this.enterpriseId}`;

    return this.getCachedOrFetch(cacheKey, async () => {
      const { data } = await this.supabase
        .from('enterprises')
        .select('settings')
        .eq('id', this.enterpriseId)
        .single();

      return data?.settings || {};
    }, getCacheTTL('DEFAULT'));
  }

  // Database function integration with timeout
  protected async callDatabaseFunction(functionName: string, params: Record<string, unknown>) {
    const { data, error } = await this.supabase.rpc(functionName, {
      ...params,
      p_enterprise_id: this.enterpriseId,
    });

    if (error) {throw new Error(`Database function error: ${error.message}`);}
    return data;
  }

  // Semantic search using existing infrastructure
  protected async performSemanticSearch(query: string, table: string, limit = 10) {
    const cacheKey = `search_${table}_${query}_${this.enterpriseId}`;

    return this.getCachedOrFetch(cacheKey, async () => {
      return this.callDatabaseFunction('search_with_rls', {
        search_query: query,
        search_type: table,
        limit_count: limit,
      });
    }, getCacheTTL('DEFAULT'));
  }

  // Real-time broadcasting
  protected async broadcastTaskCompletion(taskId: string, result: ProcessingResult) {
    if (!getFeatureFlag('ENABLE_REAL_TIME')) {return;}

    const channel = `agent_updates_${this.enterpriseId}`;

    await this.supabase
      .from('realtime_broadcasts')
      .insert({
        channel,
        event: 'task_completed',
        payload: {
          taskId,
          agentType: this.agentType,
          success: result.success,
          insights: result.insights.length,
          processingTime: result.processingTime,
        },
        enterprise_id: this.enterpriseId,
      });
  }

  // Error handling with retry
  protected async handleProcessingError(taskId: string, error: Error | unknown): Promise<ProcessingResult> {
    console.error(`Agent ${this.agentType} error:`, error);

    // Get current retry count
    const { data: task } = await this.supabase
      .from('agent_tasks')
      .select('retry_count, max_retries')
      .eq('id', taskId)
      .single();

    const retryConfig = this.configManager.getConfig().RETRY_CONFIG;
    const retryCount = (task?.retry_count || 0) + 1;
    const maxRetries = task?.max_retries || retryConfig.MAX_RETRIES;

    if (retryCount < maxRetries) {
      // Update retry count
      await this.supabase
        .from('agent_tasks')
        .update({
          retry_count: retryCount,
          status: 'pending', // Reset to pending for retry
          error: error instanceof Error ? error.message : String(error),
        })
        .eq('id', taskId);

      // Schedule retry with exponential backoff
      const baseDelay = retryConfig.INITIAL_DELAY;
      const delayMs = Math.min(
        baseDelay * Math.pow(retryConfig.BACKOFF_MULTIPLIER, retryCount - 1),
        retryConfig.MAX_DELAY,
      );

      // Add jitter if enabled
      const finalDelay = retryConfig.JITTER ?
        delayMs * (0.5 + Math.random() * 0.5) :
        delayMs;
      await this.scheduleRetry(taskId, finalDelay);

      await this.logAgentActivity(taskId, 'retry_scheduled', `Retry ${retryCount}/${maxRetries} scheduled`, {
        error: error instanceof Error ? error.message : String(error),
        delayMs,
      });
    } else {
      // Max retries reached
      await this.updateTaskStatus(taskId, 'failed', null, error instanceof Error ? error.message : String(error));
      await this.logAgentActivity(taskId, 'failed', 'Max retries exceeded', {
        error: error instanceof Error ? error.message : String(error),
        retryCount,
      });
    }

    return this.createResult(
      false,
      null,
      [],
      [],
      0,
      { error: error instanceof Error ? error.message : String(error), retryCount },
    );
  }

  // Schedule task retry
  protected async scheduleRetry(taskId: string, delayMs: number) {
    const scheduledAt = new Date(Date.now() + delayMs).toISOString();

    await this.supabase
      .from('agent_tasks')
      .update({ scheduled_at: scheduledAt })
      .eq('id', taskId);
  }

  // Performance metrics
  protected async recordMetrics(operation: string, duration: number, success: boolean) {
    if (!getFeatureFlag('ENABLE_METRICS')) {return;}

    const metrics = {
      agent_type: this.agentType,
      operation,
      duration,
      success,
      enterprise_id: this.enterpriseId,
      timestamp: new Date().toISOString(),
    };

    // Store in database
    try {
      await this.supabase
        .from('agent_metrics')
        .insert(metrics);
    } catch (error) {
      console.error(error); // Don't fail on metrics errors
    }

    // Also track in cache for quick access (uses async cache with Redis support)
    const metricsKey = `agent_metrics_${this.agentType}_${this.enterpriseId}`;
    try {
      const cache = await this.ensureCacheReady();
      const currentMetrics = await cache.get<{
        totalOperations: number;
        successCount: number;
        totalDuration: number;
      }>(metricsKey) || {
        totalOperations: 0,
        successCount: 0,
        totalDuration: 0,
      };

      currentMetrics.totalOperations++;
      if (success) {currentMetrics.successCount++;}
      currentMetrics.totalDuration += duration;

      await cache.set(metricsKey, currentMetrics, 3600); // 1 hour
    } catch (cacheError) {
      // Fall back to sync cache if async fails
      const currentMetrics = this.syncCache.get(metricsKey) as {
        totalOperations: number;
        successCount: number;
        totalDuration: number;
      } || {
        totalOperations: 0,
        successCount: 0,
        totalDuration: 0,
      };

      currentMetrics.totalOperations++;
      if (success) {currentMetrics.successCount++;}
      currentMetrics.totalDuration += duration;

      this.syncCache.set(metricsKey, currentMetrics, 3600);
    }
  }

  // Get cached data with fallback (uses async cache with Redis support)
  protected async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    if (!getFeatureFlag('ENABLE_CACHING')) {
      return fetcher();
    }

    try {
      // Try async cache first (Redis-backed if available)
      const cache = await this.ensureCacheReady();
      const cached = await cache.get<T>(key);
      if (cached !== null) {
        // Track cache hit in metadata
        this.metadata = { ...this.metadata, cached: true, cacheSource: cache.isRedisEnabled() ? 'redis' : 'memory' };
        return cached;
      }
    } catch (cacheError) {
      // Fall back to sync cache on error
      const syncCached = this.syncCache.get(key);
      if (syncCached) {
        this.metadata = { ...this.metadata, cached: true, cacheSource: 'memory-fallback' };
        return syncCached as T;
      }
    }

    // Fetch data if not in cache
    const data = await fetcher();

    // Store in both caches
    try {
      const cache = await this.ensureCacheReady();
      await cache.set(key, data, ttl);
    } catch {
      // Also store in sync cache as fallback
      this.syncCache.set(key, data, ttl);
    }

    return data;
  }

  // Audit logging
  protected async createAuditLog(
    action: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, unknown>,
  ) {
    if (!getFeatureFlag('ENABLE_AUDIT_LOGS')) {return;}

    await this.supabase
      .from('audit_logs')
      .insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes,
        agent_type: this.agentType,
        enterprise_id: this.enterpriseId,
        created_at: new Date().toISOString(),
      });
  }

  // Pattern extraction utilities
  protected extractPatterns(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];

    for (const pattern of patterns) {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    return [...new Set(matches)];
  }

  protected calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {return 1.0;}

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(
      () => Array(str1.length + 1).fill(null),
    );

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }

    return track[str2.length][str1.length];
  }

  protected extractOrCreateTraceContext(taskId: string): TraceContext {
    // Check if we have a trace context in the current execution
    if (this.traceContext) {
      return this.traceContext;
    }

    // Create a new trace context
    const traceContext = this.tracingManager.createTraceContext();

    // Add baggage with useful information
    this.tracingManager.addBaggage(traceContext, 'task.id', taskId);
    this.tracingManager.addBaggage(traceContext, 'agent.type', this.agentType);
    this.tracingManager.addBaggage(traceContext, 'enterprise.id', this.enterpriseId);

    this.traceContext = traceContext;
    return traceContext;
  }

  // Enable tracing for agent-to-agent calls
  protected async callAgent(
    agentType: string,
    data: unknown,
    context?: AgentContext,
  ): Promise<unknown> {
    const childContext = this.traceContext
      ? this.tracingManager.createChildContext(this.traceContext)
      : this.tracingManager.createTraceContext();

    const span = this.tracingManager.startSpan(
      `call_agent.${agentType}`,
      childContext,
      this.agentType,
      SpanKind.CLIENT,
    );

    try {
      // This would be the actual agent call implementation
      const result = await this.executeAgentCall(agentType, data, {
        enterpriseId: this.enterpriseId,
        sessionId: this.traceContext?.traceId || 'unknown',
        environment: {},
        permissions: [],
        ...context,
        traceContext: childContext,
      });

      this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
      return result;
    } catch (error) {
      this.tracingManager.addLog(span.spanId, 'error', `Agent call failed: ${error instanceof Error ? error.message : String(error)}`);
      this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
      throw error;
    }
  }

  private async executeAgentCall(
    _agentType: string,
    _data: unknown,
    _context?: AgentContext,
  ): Promise<unknown> {
    // This would be implemented to actually call another agent
    // For now, it's a placeholder
    throw new Error('Agent call not implemented');
  }

  // Memory Management Methods

  protected async loadMemoryContext(
    contextType: string,
    contextWindow = 10,
  ): Promise<Memory[]> {
    const span = this.traceContext
      ? this.tracingManager.startSpan(
          'load_memory_context',
          this.traceContext,
          this.agentType,
          SpanKind.INTERNAL,
        )
      : null;

    try {
      // Get memory context from database function
      const memories = await this.callDatabaseFunction('get_agent_memory_context', {
        p_agent_type: this.agentType,
        p_user_id: this.userId,
        p_context_window: contextWindow,
      });

      if (span) {
        this.tracingManager.addTags(span.spanId, {
          'memory.context_type': contextType,
          'memory.count': memories.length,
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
      }

      return memories;
    } catch (error) {
      if (span) {
        this.tracingManager.addLog(span.spanId, 'error', 'Failed to load memory context', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
      }
      console.error('Error loading memory context:', error);
      return [];
    }
  }

  protected async storeMemory(
    memoryType: string,
    content: string,
    context: Record<string, unknown> = {},
    importanceScore = 0.5,
    embedding?: number[],
  ): Promise<void> {
    if (!this.userId || !getFeatureFlag('ENABLE_MEMORY_SYSTEM')) {return;}

    const span = this.traceContext
      ? this.tracingManager.startSpan(
          'store_memory',
          this.traceContext,
          this.agentType,
          SpanKind.INTERNAL,
        )
      : null;

    try {
      await this.memoryManager.storeShortTermMemory(
        memoryType,
        content,
        {
          ...context,
          agent_type: this.agentType,
          timestamp: new Date().toISOString(),
        },
        importanceScore,
        embedding,
      );

      if (span) {
        this.tracingManager.addTags(span.spanId, {
          'memory.type': memoryType,
          'memory.importance': importanceScore,
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
      }
    } catch (error) {
      if (span) {
        this.tracingManager.addLog(span.spanId, 'error', 'Failed to store memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
      }
      console.error('Error storing memory:', error);
    }
  }

  protected async searchMemories(
    queryEmbedding: number[],
    memoryStore: 'short_term' | 'long_term' = 'short_term',
    limit = 5,
    threshold = 0.7,
  ): Promise<MemorySearchResult[]> {
    if (!getFeatureFlag('ENABLE_MEMORY_SYSTEM')) {return [];}

    const span = this.traceContext
      ? this.tracingManager.startSpan(
          'search_memories',
          this.traceContext,
          this.agentType,
          SpanKind.INTERNAL,
        )
      : null;

    try {
      const results = memoryStore === 'short_term'
        ? await this.memoryManager.searchShortTermMemory(queryEmbedding, limit, threshold)
        : await this.memoryManager.searchLongTermMemory(queryEmbedding, limit, threshold);

      if (span) {
        this.tracingManager.addTags(span.spanId, {
          'memory.store': memoryStore,
          'memory.results': results.length,
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
      }

      return results;
    } catch (error) {
      if (span) {
        this.tracingManager.addLog(span.spanId, 'error', 'Failed to search memories', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
      }
      console.error('Error searching memories:', error);
      return [];
    }
  }

  protected async consolidateUserMemories(): Promise<void> {
    if (!this.userId || !getFeatureFlag('ENABLE_MEMORY_SYSTEM')) {return;}

    try {
      const consolidatedCount = await this.callDatabaseFunction('consolidate_user_memories', {
        p_user_id: this.userId,
      });

      if (consolidatedCount > 0) {
        await this.logAgentActivity(
          'memory_consolidation',
          'info',
          `Consolidated ${consolidatedCount} memories to long-term storage`,
          { count: consolidatedCount },
        );
      }
    } catch (error) {
      console.error('Error consolidating memories:', error);
    }
  }

  protected async applyMemoryDecay(): Promise<void> {
    if (!getFeatureFlag('ENABLE_MEMORY_SYSTEM')) {return;}

    try {
      await this.memoryManager.applyMemoryDecay();
    } catch (error) {
      console.error('Error applying memory decay:', error);
    }
  }

  protected createDefaultContext(): AgentContext {
    return {
      enterpriseId: this.enterpriseId,
      sessionId: this.traceContext?.traceId || 'unknown',
      environment: {},
      permissions: [],
    };
  }

  protected async getMemoryStats(): Promise<{
    shortTermCount: number;
    longTermCount: number;
    totalMemorySize: number;
    categoryCounts: Record<string, number>;
  }> {
    if (!getFeatureFlag('ENABLE_MEMORY_SYSTEM')) {
      return {
        shortTermCount: 0,
        longTermCount: 0,
        totalMemorySize: 0,
        categoryCounts: {},
      };
    }

    return this.memoryManager.getMemoryStats();
  }

  // Enhanced process method to include memory context
  protected async processWithMemory(
    data: unknown,
    context?: AgentContext,
    processFunction?: (data: unknown, context: AgentContext, memories: Memory[]) => Promise<ProcessingResult>,
  ): Promise<ProcessingResult> {
    // Load relevant memories for context
    const memories = await this.loadMemoryContext(context?.taskId || 'general');

    // Add memory context to processing context
    const enhancedContext: AgentContext = {
      enterpriseId: this.enterpriseId,
      sessionId: this.traceContext?.traceId || 'unknown',
      environment: {},
      permissions: [],
      ...context,
      memories,
      memoryCount: memories.length,
    } as AgentContext & { memories: Memory[]; memoryCount: number };

    // Process with memory context
    const result = processFunction
      ? await processFunction(data, enhancedContext, memories)
      : await this.process(data, enhancedContext);

    // Store important insights as memories
    if (result.insights.length > 0) {
      for (const insight of result.insights) {
        if (insight.severity === 'high' || insight.severity === 'critical') {
          await this.storeMemory(
            `${this.agentType}_insight`,
            `${insight.title}: ${insight.description}`,
            {
              insight_type: insight.type,
              severity: insight.severity,
              actionable: insight.isActionable,
              data: insight.data,
            },
            insight.severity === 'critical' ? 0.9 : 0.7,
          );
        }
      }
    }

    // Consolidate memories periodically (every 10 tasks)
    if (Math.random() < 0.1) {
      await this.consolidateUserMemories();
    }

    return result;
  }

  // ==================== LLM Mode Methods ====================

  /**
   * Initialize LLM capabilities for the agent
   * This enables Claude-powered processing with tool use
   */
  protected async initializeLLM(): Promise<boolean> {
    if (this.llmInitialized) return true;

    try {
      this.claudeClient = getClaudeClient();

      if (!this.claudeClient.isConfigured()) {
        console.warn(`Agent ${this.agentType}: Claude API not configured, LLM mode unavailable`);
        return false;
      }

      this.toolExecutor = createToolExecutor(
        this.supabase,
        this.enterpriseId,
        this.userId || 'system',
        this.agentType,
      );

      this.costTracker = getCostTracker(this.supabase, this.enterpriseId);

      this.llmInitialized = true;
      return true;
    } catch (error) {
      console.error(`Agent ${this.agentType}: Failed to initialize LLM`, error);
      return false;
    }
  }

  /**
   * Set the processing mode for this agent
   */
  setProcessingMode(mode: ProcessingMode): void {
    this.processingMode = mode;
  }

  /**
   * Check if LLM mode is available
   */
  isLLMAvailable(): boolean {
    return this.llmInitialized && this.claudeClient?.isConfigured() || false;
  }

  /**
   * Get the system prompt for this agent type
   * Override in subclasses to customize behavior
   */
  protected getSystemPrompt(): string {
    return `You are a ${this.agentType} agent for Pactwise, an enterprise contract management platform.
Your role is to assist with ${this.capabilities.join(', ')}.

Guidelines:
- Be precise and factual
- Cite sources when making claims
- Use available tools when needed
- Escalate when uncertain
- Maintain enterprise security and compliance`;
  }

  /**
   * Get additional tools specific to this agent type
   * Override in subclasses to add specialized tools
   */
  protected getAdditionalTools(): ClaudeTool[] {
    return [];
  }

  /**
   * Process with LLM (Claude) and tool use
   */
  protected async processWithLLM(
    prompt: string,
    context?: AgentContext,
    options?: {
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
      callbacks?: StreamingCallbacks;
      estimatedInputTokens?: number;
    },
  ): Promise<ProcessingResult> {
    if (!await this.initializeLLM()) {
      return this.createResult(
        false,
        null,
        [],
        ['llm_unavailable'],
        0,
        { error: 'LLM mode not available' },
      );
    }

    const span = this.traceContext
      ? this.tracingManager.startSpan(
          `${this.agentType}.processWithLLM`,
          this.traceContext,
          this.agentType,
          SpanKind.INTERNAL,
        )
      : null;

    try {
      // Get user ID for budget check (from context or instance)
      const userId = context?.userId || this.userId;

      // Estimate cost and tokens for the operation
      const estimatedCost = 0.01; // Conservative estimate
      const estimatedTokens = options?.estimatedInputTokens || (options?.maxTokens || 2000);

      // Check user-level budget if userId is available
      if (userId) {
        const userBudgetCheck = await this.costTracker!.canUserPerformOperation(
          userId,
          estimatedCost,
          estimatedTokens,
        );

        if (!userBudgetCheck.allowed) {
          if (span) {
            this.tracingManager.addTags(span.spanId, {
              'budget.blocked': true,
              'budget.reason': userBudgetCheck.reason,
              'budget.user_daily_remaining': userBudgetCheck.userBudgetStatus.remaining.daily,
              'budget.user_monthly_remaining': userBudgetCheck.userBudgetStatus.remaining.monthly,
            });
            this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
          }

          return this.createResult(
            false,
            null,
            [this.createInsight(
              'user_budget_exceeded',
              'high',
              'AI Budget Exceeded',
              userBudgetCheck.reason || 'User budget limit reached',
              'Contact your administrator to increase your AI usage limits.',
            )],
            ['user_budget_check_failed'],
            0,
            {
              userBudgetStatus: userBudgetCheck.userBudgetStatus,
              enterpriseBudgetStatus: userBudgetCheck.enterpriseBudgetStatus,
            },
          );
        }

        // Get user's max tokens limit and apply it
        const userMaxTokens = userBudgetCheck.userBudgetStatus.limits.maxTokens;
        const requestedMaxTokens = options?.maxTokens || 2000;
        const effectiveMaxTokens = Math.min(requestedMaxTokens, userMaxTokens);

        // Update options with user-limited max tokens
        options = {
          ...options,
          maxTokens: effectiveMaxTokens,
        };
      } else {
        // Fallback to enterprise-level budget check only
        const budgetCheck = await this.costTracker!.canPerformOperation(estimatedCost);

        if (!budgetCheck.allowed) {
          return this.createResult(
            false,
            null,
            [this.createInsight(
              'budget_exceeded',
              'high',
              'AI Budget Exceeded',
              budgetCheck.reason || 'Budget limit reached',
            )],
            ['budget_check_failed'],
            0,
          );
        }
      }

      // Load memory context
      const memories = await this.loadMemoryContext(context?.taskId || 'llm_processing');
      const memoryContext = memories.length > 0
        ? `\n\nRelevant context from memory:\n${memories.map(m => `- ${m.content}`).join('\n')}`
        : '';

      // Build the full prompt with context
      const fullPrompt = `${prompt}${memoryContext}`;

      // Get tools from tool executor plus any additional agent-specific tools
      const tools = [
        ...this.toolExecutor!.getClaudeTools(),
        ...this.getAdditionalTools(),
      ];

      // Stream processing
      if (options?.stream && options.callbacks) {
        return await this.processWithLLMStream(fullPrompt, tools, context, options.callbacks);
      }

      // Non-streaming processing with tools
      const result = await this.toolExecutor!.processWithTools(fullPrompt, {
        systemPrompt: this.getSystemPrompt(),
        maxTokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.3,
      });

      // Store important results as memories
      if (result.response) {
        await this.storeMemory(
          `${this.agentType}_llm_response`,
          result.response.substring(0, 500), // Store summary
          {
            tool_calls: result.toolCalls.length,
            tokens: result.usage.inputTokens + result.usage.outputTokens,
          },
          0.5,
        );
      }

      if (span) {
        this.tracingManager.addTags(span.spanId, {
          'llm.tool_calls': result.toolCalls.length,
          'llm.input_tokens': result.usage.inputTokens,
          'llm.output_tokens': result.usage.outputTokens,
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
      }

      return this.createResult(
        true,
        { response: result.response, toolCalls: result.toolCalls },
        [],
        ['llm_processing'],
        0.8,
        {
          usage: result.usage,
          model: 'claude-3-5-sonnet',
        },
      );
    } catch (error) {
      if (span) {
        this.tracingManager.addLog(span.spanId, 'error', 'LLM processing failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
      }

      return this.createResult(
        false,
        null,
        [this.createInsight(
          'llm_error',
          'medium',
          'LLM Processing Error',
          error instanceof Error ? error.message : String(error),
        )],
        ['llm_error'],
        0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Process with streaming LLM response
   */
  protected async processWithLLMStream(
    prompt: string,
    tools: ClaudeTool[],
    _context: AgentContext | undefined,
    callbacks: StreamingCallbacks,
  ): Promise<ProcessingResult> {
    if (!this.claudeClient) {
      throw new Error('Claude client not initialized');
    }

    const messages: ClaudeMessage[] = [
      { role: 'user', content: prompt },
    ];

    let fullText = '';
    let toolCalls: Array<{ tool: string; input: Record<string, unknown>; result: unknown }> = [];
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      // Stream the response
      for await (const event of this.claudeClient.chatStream(messages, {
        system: this.getSystemPrompt(),
        tools,
        toolChoice: 'auto',
        maxTokens: 2000,
      })) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const text = event.delta.text || '';
          fullText += text;
          callbacks.onThought?.(text);
        } else if (event.type === 'content_block_start' && event.contentBlock?.type === 'tool_use') {
          callbacks.onAction?.('Starting tool execution', event.contentBlock.name || 'unknown');
        } else if (event.type === 'message_delta' && event.usage) {
          outputTokens = event.usage.output_tokens || 0;
        } else if (event.type === 'message_start' && event.message?.usage) {
          inputTokens = event.message.usage.input_tokens || 0;
        }
      }

      const result = this.createResult(
        true,
        { response: fullText, toolCalls },
        [],
        ['llm_streaming'],
        0.8,
        {
          usage: { inputTokens, outputTokens },
          model: 'claude-3-5-sonnet',
          streamed: true,
        },
      );

      callbacks.onComplete?.(result);
      return result;
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Create an SSE streaming response for real-time updates
   */
  createStreamingResponse(
    req: Request,
    processor: (writer: StreamWriter) => Promise<void>,
  ): Response {
    const { response, writer } = createSSEStream({ req });

    // Run processor in background
    (async () => {
      try {
        await processor(writer);
        await writer.write({
          event: 'complete',
          data: { status: 'complete' },
        });
      } catch (error) {
        await writer.writeError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        writer.close();
      }
    })();

    return response;
  }

  /**
   * Hybrid processing: try LLM first, fall back to rule-based
   */
  protected async processHybrid(
    data: unknown,
    context?: AgentContext,
    ruleBased?: () => Promise<ProcessingResult>,
    llmPrompt?: string,
  ): Promise<ProcessingResult> {
    if (this.processingMode === 'rule_based' || !llmPrompt) {
      return ruleBased ? await ruleBased() : await this.process(data, context);
    }

    if (this.processingMode === 'llm') {
      const llmResult = await this.processWithLLM(llmPrompt, context);
      if (llmResult.success) {
        return llmResult;
      }
      // LLM failed, fall back to rule-based
      if (ruleBased) {
        const fallbackResult = await ruleBased();
        fallbackResult.metadata = {
          ...fallbackResult.metadata,
          llm_fallback: true,
          llm_error: llmResult.error,
        };
        return fallbackResult;
      }
    }

    // Hybrid mode: combine results
    if (this.processingMode === 'hybrid' && ruleBased) {
      const [ruleResult, llmResult] = await Promise.allSettled([
        ruleBased(),
        this.processWithLLM(llmPrompt, context),
      ]);

      const ruleSuccess = ruleResult.status === 'fulfilled' && ruleResult.value.success;
      const llmSuccess = llmResult.status === 'fulfilled' && llmResult.value.success;

      if (ruleSuccess && llmSuccess) {
        // Merge insights from both
        const mergedInsights = [
          ...(ruleResult.value as ProcessingResult).insights,
          ...(llmResult.value as ProcessingResult).insights.map(i => ({
            ...i,
            title: `[AI] ${i.title}`,
          })),
        ];

        return this.createResult(
          true,
          {
            ruleBasedResult: (ruleResult.value as ProcessingResult).data,
            llmResult: (llmResult.value as ProcessingResult).data,
          },
          mergedInsights,
          ['hybrid_processing'],
          Math.max(
            (ruleResult.value as ProcessingResult).confidence,
            (llmResult.value as ProcessingResult).confidence,
          ),
          { processingMode: 'hybrid' },
        );
      }

      // Return whichever succeeded
      if (ruleSuccess) return ruleResult.value as ProcessingResult;
      if (llmSuccess) return llmResult.value as ProcessingResult;
    }

    // Default fallback
    return ruleBased ? await ruleBased() : await this.process(data, context);
  }
}