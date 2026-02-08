/**
 * Agents API Service Layer
 * Handles all AI agent interactions and learning
 * NO HARDCODED DATA - Everything from the database
 */

import { createClient } from '@/utils/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { AgentType, AgentStatus, AgentMetrics, AgentConfig, LogLevel, SwarmConfig, PartialSwarmConfig } from '@/types/agents.types';

// ============================================================================
// TYPE DEFINITIONS FOR TABLES NOT IN GENERATED TYPES
// These tables exist in the database but types haven't been regenerated
// ============================================================================

/** AI Conversation table (not in generated types) */
interface AIConversationRow {
  id: string;
  user_id: string;
  enterprise_id?: string;
  title?: string;
  context_data?: Record<string, unknown>;
  status?: string;
  created_at: string;
  updated_at: string;
}

/** AI Message table (not in generated types) */
interface AIMessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/** Agent Interaction table (not in generated types) */
interface AgentInteractionRow {
  id: string;
  recommendation_id: string;
  action_type: string;
  action_data?: Record<string, unknown>;
  context_data?: Record<string, unknown>;
  outcome?: string;
  outcome_metadata?: Record<string, unknown>;
  feedback_timestamp?: string;
  user_id: string;
  enterprise_id: string;
  created_at: string;
}

/** Approvals table (not in generated types) */
interface ApprovalRow {
  id: string;
  enterprise_id: string;
  status: string;
  created_at: string;
}

/** Agent with database row shape */
interface AgentRow {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  is_enabled: boolean;
  last_run?: string;
  last_success?: string;
  run_count?: number;
  error_count?: number;
  last_error?: string;
  config?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  enterprise_id?: string;
  created_at: string;
  updated_at: string;
}

/** Agent task with joined agent data */
interface AgentTaskWithAgent {
  id: string;
  task_type: string;
  status: string;
  payload: { title?: string; description?: string } | null;
  created_at: string | null;
  completed_at: string | null;
  agents: { name?: string; type?: string };
}

/** Agent log with joined agent data */
interface AgentLogWithAgent {
  id: string;
  log_level?: string;
  log_type?: string;
  message: string;
  metadata?: Record<string, unknown>;
  task_id?: string;
  created_at: string;
  execution_time_ms?: number;
  tokens_used?: number;
  agents: AgentRow | null;
}

/** Memory consolidation record */
interface MemoryConsolidationRow {
  id: string;
  enterprise_id: string;
  started_at: string;
  completed_at?: string;
  status: string;
}

/** Agent trace record */
interface AgentTraceRow {
  id: string;
  enterprise_id: string;
  started_at: string;
  status: string;
  agent_type?: string;
}

/** Agent log entry for real-time subscription */
interface AgentLogEntry {
  id: string;
  agentName: string;
  agentType: AgentType;
  level: LogLevel;
  message: string;
  tool?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  duration?: number;
  timestamp: string;
  error?: string;
  step?: number;
  totalSteps?: number;
}

/** Real-time update payload from Supabase */
interface RealtimePayload {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  schema: string;
  table: string;
}

// Type alias for the untyped supabase client (for tables not in generated types)
type UntypedSupabaseClient = SupabaseClient<Database>;

// ============================================================================
// EXPORTED INTERFACES
// ============================================================================

// Agent task type - matches database schema
export interface AgentTask {
  id: string;
  agent_id: string;
  task_type: string;
  payload: Record<string, unknown>;
  status: string | null;
  priority: number | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  enterprise_id: string;
  contract_id?: string | null;
  vendor_id?: string | null;
  created_at: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  max_retries?: number | null;
  retry_count?: number | null;
  scheduled_at?: string | null;
  processing_time_ms?: number | null;
}

// AI Message type
export interface AIMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata?: {
    attachments?: Array<{ type: string; title: string }>;
    [key: string]: unknown;
  };
  created_at: string;
}

// AI Conversation type
export interface AIConversationType {
  id: string;
  user_id: string;
  title?: string;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentContext {
  page?: string;
  contractId?: string;
  vendorId?: string;
  userId: string;
  enterpriseId: string;
  currentAction?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRecommendation {
  id: string;
  type: 'contract' | 'vendor' | 'workflow' | 'insight';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionType: string;
  actionData?: Record<string, unknown>;
  reasoning?: string;
}

export interface AgentAction {
  id: string;
  type: 'accepted' | 'dismissed' | 'modified' | 'deferred';
  confidence?: number;
  reason?: string;
  modifiedData?: Record<string, unknown>;
}

export interface LearningStats {
  totalInteractions: number;
  successRate: number;
  averageConfidence: number;
  mostSuccessfulActions: string[];
  improvementRate: number;
  lastUpdated: Date;
}

/** Error object shape from Supabase/API responses */
interface ErrorLike {
  message?: string;
  error_description?: string;
  hint?: string;
  code?: string;
}

/**
 * Helper to safely get error message from various error formats
 */
function getErrorMessage(error: unknown, defaultMessage: string = 'Unknown error'): string {
  if (!error) return defaultMessage;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const err = error as ErrorLike;
    if (err.message) return err.message;
    if (err.error_description) return err.error_description;
    if (err.hint) return err.hint;
  }
  return defaultMessage;
}

export class AgentsAPI {
  private supabase = createClient();

  /**
   * Helper method to build swarm metadata for API calls
   * Consolidates the repeated pattern across all agent API methods
   *
   * @param swarmMode - Optional swarm mode override (defaults to true if undefined)
   * @param swarmConfig - Optional partial swarm configuration
   * @returns Metadata object with swarmMode and optional swarmConfig
   */
  private buildSwarmMetadata(
    swarmMode?: boolean,
    swarmConfig?: Partial<SwarmConfig>
  ): { swarmMode: boolean; swarmConfig?: Partial<SwarmConfig> } {
    return {
      swarmMode: swarmMode !== false, // default true unless explicitly disabled
      ...(swarmConfig && { swarmConfig })
    };
  }

  /**
   * Get AI recommendations based on current context
   * Uses the learning system to provide personalized suggestions
   */
  async getRecommendations(context: AgentContext): Promise<AgentRecommendation[]> {
    const { data, error } = await this.supabase.functions.invoke('agent-recommendations', {
      body: { 
        context,
        limit: 5,
        includeReasoning: true
      }
    });

    if (error) {
      console.error('Error fetching recommendations:', error);
      throw new Error(`Failed to fetch recommendations: ${getErrorMessage(error)}`);
    }

    return data.recommendations || [];
  }

  /**
   * Track user interaction with agent recommendation
   * This feeds the learning system
   */
  async trackInteraction(interaction: {
    recommendationId: string;
    action: AgentAction;
    context: AgentContext;
    outcome?: 'success' | 'failure' | 'partial' | 'pending';
  }): Promise<void> {
    // Store the interaction - use type assertion to avoid deep type instantiation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    const { data: interactionData, error: interactionError } = await (this.supabase as any)
      .from('agent_interactions')
      .insert({
        recommendation_id: interaction.recommendationId,
        action_type: interaction.action.type,
        action_data: interaction.action,
        context_data: interaction.context,
        outcome: interaction.outcome || 'pending',
        user_id: interaction.context.userId,
        enterprise_id: interaction.context.enterpriseId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (interactionError) {
      console.error('Error tracking interaction:', interactionError);
      throw new Error(`Failed to track interaction: ${interactionError.message}`);
    }

    // Trigger learning update in background
    await this.supabase.functions.invoke('update-agent-learning', {
      body: {
        interactionId: interactionData?.id,
        immediate: true
      }
    });
  }

  /**
   * Update interaction outcome (for delayed feedback)
   */
  async updateInteractionOutcome(
    interactionId: string,
    outcome: 'success' | 'failure' | 'partial',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    const { error } = await (this.supabase as any)
      .from('agent_interactions')
      .update({
        outcome,
        outcome_metadata: metadata,
        feedback_timestamp: new Date().toISOString()
      })
      .eq('id', interactionId);

    if (error) {
      console.error('Error updating interaction outcome:', error);
      throw new Error(`Failed to update outcome: ${getErrorMessage(error)}`);
    }

    // Process feedback for learning
    await this.supabase.functions.invoke('process-feedback', {
      body: {
        interactionId,
        outcome,
        reward: outcome === 'success' ? 1.0 : outcome === 'partial' ? 0.5 : -0.3
      }
    });
  }

  /**
   * Get AI conversation history for a user
   */
  async getConversations(userId: string, limit = 10): Promise<AIConversationType[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversations:', error);
      throw new Error(`Failed to fetch conversations: ${getErrorMessage(error)}`);
    }

    return (data as AIConversationType[]) || [];
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(conversationId: string): Promise<AIMessage[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${getErrorMessage(error)}`);
    }

    return (data as AIMessage[]) || [];
  }

  /**
   * Send a message in AI conversation
   */
  async sendMessage(params: {
    conversationId?: string;
    message: string;
    context?: AgentContext;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('ai-chat', {
      body: {
        conversationId: params.conversationId,
        message: params.message,
        context: {
          ...params.context,
          metadata: {
            ...params.context?.metadata,
            ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
          }
        }
      }
    });

    if (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Start a new AI conversation
   */
  async startConversation(params: {
    initialMessage: string;
    context?: AgentContext;
    title?: string;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    // Build context with swarm metadata
    const contextWithSwarm: AgentContext = {
      ...params.context,
      userId: params.context?.userId ?? '',
      enterpriseId: params.context?.enterpriseId ?? '',
      metadata: {
        ...params.context?.metadata,
        ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    const { data: conversation, error: convError } = await (this.supabase as any)
      .from('ai_conversations')
      .insert({
        user_id: params.context?.userId,
        enterprise_id: params.context?.enterpriseId,
        title: params.title || 'New Conversation',
        context_data: contextWithSwarm,
        status: 'active'
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      throw new Error(`Failed to create conversation: ${convError.message}`);
    }

    // Send initial message with swarm support
    const response = await this.sendMessage({
      conversationId: conversation?.id,
      message: params.initialMessage,
      context: contextWithSwarm,
      swarmMode: params.swarmMode,
      swarmConfig: params.swarmConfig
    });

    return { conversationId: conversation?.id, response };
  }

  /**
   * Get user's learning statistics
   */
  async getUserLearningStats(userId: string): Promise<LearningStats> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
    const { data, error } = await (this.supabase as any).rpc('get_user_learning_stats', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching learning stats:', error);
      throw new Error(`Failed to fetch learning stats: ${getErrorMessage(error)}`);
    }

    return data as LearningStats;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformanceMetrics(enterpriseId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
    const { data, error } = await (this.supabase as any).rpc('get_agent_performance_metrics', {
      p_enterprise_id: enterpriseId
    });

    if (error) {
      console.error('Error fetching agent metrics:', error);
      throw new Error(`Failed to fetch agent metrics: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Create an agent task for async processing
   */
  async createAgentTask<T extends object = Record<string, unknown>>(task: {
    type: string;
    agentId?: string;
    data: T;
    priority?: number;
    enterpriseId: string;
    userId?: string;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }): Promise<AgentTask> {
    // Build payload with swarm metadata
    const payloadWithSwarm = {
      ...task.data,
      metadata: {
        ...(task.data as any).metadata,
        ...this.buildSwarmMetadata(task.swarmMode, task.swarmConfig)
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- insert without full types
    const { data, error } = await (this.supabase as any)
      .from('agent_tasks')
      .insert({
        agent_id: task.agentId || task.type,
        task_type: task.type,
        payload: payloadWithSwarm,
        priority: task.priority || 5,
        status: 'pending',
        enterprise_id: task.enterpriseId,
        ...(task.userId && { created_by: task.userId })
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent task:', error);
      throw new Error(`Failed to create agent task: ${getErrorMessage(error)}`);
    }

    return data as AgentTask;
  }

  /**
   * Get task status and results
   */
  async getTaskStatus(taskId: string): Promise<AgentTask> {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('Error fetching task status:', error);
      throw new Error(`Failed to fetch task status: ${getErrorMessage(error)}`);
    }

    return data as AgentTask;
  }

  /**
   * Train agent with explicit feedback
   */
  async trainAgent(feedback: {
    agentType: string;
    action: string;
    context: Record<string, unknown>;
    wasHelpful: boolean;
    improvement?: string;
    userId: string;
  }) {
    const { error } = await this.supabase.functions.invoke('train-agent', {
      body: feedback
    });

    if (error) {
      console.error('Error training agent:', error);
      throw new Error(`Failed to train agent: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get personalized insights based on user behavior
   */
  async getPersonalizedInsights(userId: string, enterpriseId: string) {
    const { data, error } = await this.supabase.functions.invoke('personalized-insights', {
      body: {
        userId,
        enterpriseId,
        includeRecommendations: true
      }
    });

    if (error) {
      console.error('Error fetching insights:', error);
      throw new Error(`Failed to fetch insights: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Subscribe to real-time agent updates
   */
  subscribeToAgentUpdates(
    userId: string,
    callback: (update: RealtimePayload) => void
  ) {
    return this.supabase
      .channel(`agent-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_tasks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => callback(payload)
      )
      .subscribe();
  }

  /**
   * Get workflow automation suggestions
   */
  async getWorkflowSuggestions(enterpriseId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
    const { data, error } = await (this.supabase as any).rpc('get_workflow_suggestions', {
      p_enterprise_id: enterpriseId
    });

    if (error) {
      console.error('Error fetching workflow suggestions:', error);
      throw new Error(`Failed to fetch workflow suggestions: ${getErrorMessage(error)}`);
    }

    return data;
  }

  // ============================================================================
  // AGENT DASHBOARD SPECIFIC METHODS
  // ============================================================================

  /**
   * Get agent system status and overview
   */
  async getAgentSystemStatus(enterpriseId: string) {
    if (!enterpriseId) {
      console.warn('getAgentSystemStatus called without enterprise_id');
      return {
        system: null,
        agents: [],
        stats: {
          totalAgents: 0,
          activeAgents: 0,
          recentInsights: 0,
          pendingTasks: 0,
          activeTasks: 0
        }
      };
    }

    const { data, error } = await this.supabase
      .from('agent_system')
      .select(`
        *,
        agents:agents(
          id,
          name,
          type,
          status,
          description,
          is_enabled,
          last_run,
          last_success,
          run_count,
          error_count,
          last_error,
          config,
          metrics,
          created_at,
          updated_at
        )
      `)
      .eq('enterprise_id', enterpriseId)
      .single();

    // Handle errors, but ignore "not found" which is expected for new enterprises
    if (error) {
      // PGRST116 = not found, which is expected and handled below
      if (error.code && error.code !== 'PGRST116') {
        console.error('Error fetching agent system status:', getErrorMessage(error, 'Failed to fetch agent system status'));
        throw new Error(`Failed to fetch agent system status: ${getErrorMessage(error)}`);
      }
      // If error exists but has no code, it might be a network/connection issue
      if (!error.code && Object.keys(error).length > 0) {
        console.warn('Unexpected error format fetching agent system status:', getErrorMessage(error, 'Unknown error fetching agent system status'));
      }
    }

    // If no system exists, return default structure
    if (!data) {
      return {
        system: null,
        agents: [],
        stats: {
          totalAgents: 0,
          activeAgents: 0,
          recentInsights: 0,
          pendingTasks: 0,
          activeTasks: 0
        }
      };
    }

    // Calculate stats
    const agents = (data.agents || []) as AgentRow[];
    const activeAgents = agents.filter((a) => a.is_enabled && a.status === 'active').length;

    // Get task counts
    const { count: pendingTasks } = await this.supabase
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'pending');

    const { count: activeTasks } = await this.supabase
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'in_progress');

    // Get recent insights count
    const { count: recentInsights } = await this.supabase
      .from('agent_insights')
      .select('*', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return {
      system: {
        id: data.id,
        isRunning: data.is_running,
        status: data.status,
        lastStarted: data.last_started,
        lastStopped: data.last_stopped,
        errorMessage: data.error_message,
        config: data.config,
        metrics: data.metrics
      },
      agents: agents.map((a) => {
        // Convert raw metrics to AgentMetrics type with defaults
        const rawMetrics = (a.metrics || {}) as Record<string, unknown>;
        const metrics: AgentMetrics = {
          totalRuns: (rawMetrics.totalRuns as number) ?? (rawMetrics.total_runs as number) ?? 0,
          successfulRuns: (rawMetrics.successfulRuns as number) ?? (rawMetrics.successful_runs as number) ?? 0,
          failedRuns: (rawMetrics.failedRuns as number) ?? (rawMetrics.failed_runs as number) ?? 0,
          averageRunTime: (rawMetrics.averageRunTime as number) ?? (rawMetrics.average_run_time as number) ?? 0,
          lastRunDuration: (rawMetrics.lastRunDuration as number) ?? (rawMetrics.last_run_duration as number),
          dataProcessed: (rawMetrics.dataProcessed as number) ?? (rawMetrics.data_processed as number),
          insightsGenerated: (rawMetrics.insightsGenerated as number) ?? (rawMetrics.insights_generated as number),
          customMetrics: rawMetrics.customMetrics as Record<string, unknown> | undefined
        };

        return {
          _id: a.id,
          name: a.name,
          type: a.type as AgentType,
          status: a.status as AgentStatus,
          description: a.description,
          isEnabled: a.is_enabled,
          lastRun: a.last_run,
          lastSuccess: a.last_success,
          runCount: a.run_count ?? 0,
          errorCount: a.error_count ?? 0,
          lastError: a.last_error,
          config: a.config as AgentConfig | undefined,
          metrics,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        };
      }),
      stats: {
        totalAgents: agents.length,
        activeAgents,
        recentInsights: recentInsights || 0,
        pendingTasks: pendingTasks || 0,
        activeTasks: activeTasks || 0
      }
    };
  }

  /**
   * Get dashboard metrics (savings, contracts, etc.)
   */
  async getDashboardMetrics(enterpriseId: string) {
    if (!enterpriseId) {
      console.warn('getDashboardMetrics called without enterprise_id');
      return this.getDefaultMetrics();
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get contracts data
    const { data: contracts, error: contractsError } = await this.supabase
      .from('contracts')
      .select('id, status, value, end_date, created_at')
      .eq('enterprise_id', enterpriseId);

    if (contractsError && Object.keys(contractsError).length > 0) {
      console.error('Error fetching contracts:', getErrorMessage(contractsError, 'Failed to fetch contracts'));
    }

    // Get vendors data
    const { data: vendors, error: vendorsError } = await this.supabase
      .from('vendors')
      .select('id, status, compliance_score, created_at')
      .eq('enterprise_id', enterpriseId);

    if (vendorsError && Object.keys(vendorsError).length > 0) {
      console.error('Error fetching vendors:', getErrorMessage(vendorsError, 'Failed to fetch vendors'));
    }

    // Get pending approvals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    const { count: pendingApprovals } = await (this.supabase as any)
      .from('approvals')
      .select('id', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'pending');

    // Get urgent approvals (pending for > 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    const { count: urgentApprovals } = await (this.supabase as any)
      .from('approvals')
      .select('id', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString());

    // Get savings from agent_insights (insights with savings_amount in data)
    const { data: savingsInsights } = await this.supabase
      .from('agent_insights')
      .select('data')
      .eq('enterprise_id', enterpriseId)
      .eq('insight_type', 'cost_saving');

    const totalSavingsAmount = (savingsInsights || []).reduce((sum, insight) => {
      const data = insight.data as { savings_amount?: number } | null;
      const amount = data?.savings_amount || 0;
      return sum + amount;
    }, 0);

    // Calculate metrics
    const activeContracts = contracts?.filter(c => c.status === 'active').length || 0;
    const expiringContracts = contracts?.filter(c => {
      if (!c.end_date) return false;
      const expiryDate = new Date(c.end_date);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return expiryDate <= thirtyDaysFromNow;
    }).length || 0;

    // Calculate contracts change (compare last 30 days to previous 30 days)
    const recentContracts = contracts?.filter(c => c.created_at && new Date(c.created_at) >= thirtyDaysAgo).length || 0;
    const previousContracts = contracts?.filter(c => {
      if (!c.created_at) return false;
      const created = new Date(c.created_at);
      return created >= sixtyDaysAgo && created < thirtyDaysAgo;
    }).length || 0;
    const contractsChange = previousContracts > 0
      ? `${recentContracts >= previousContracts ? '+' : ''}${Math.round(((recentContracts - previousContracts) / previousContracts) * 100)}`
      : recentContracts > 0 ? `+${recentContracts}` : '+0';

    const vendorsActive = vendors?.filter(v => v.status === 'active').length || 0;

    // Calculate vendors change
    const recentVendors = vendors?.filter(v => v.created_at && new Date(v.created_at) >= thirtyDaysAgo).length || 0;
    const previousVendors = vendors?.filter(v => {
      if (!v.created_at) return false;
      const created = new Date(v.created_at);
      return created >= sixtyDaysAgo && created < thirtyDaysAgo;
    }).length || 0;
    const vendorsChange = previousVendors > 0
      ? `${recentVendors >= previousVendors ? '+' : ''}${Math.round(((recentVendors - previousVendors) / previousVendors) * 100)}`
      : recentVendors > 0 ? `+${recentVendors}` : '+0';

    const avgCompliance = vendors && vendors.length > 0
      ? (vendors.reduce((sum, v) => sum + (v.compliance_score || 0), 0) / vendors.length).toFixed(1) + '%'
      : '0%';

    // Format savings
    const totalSavings = totalSavingsAmount > 0
      ? `$${totalSavingsAmount.toLocaleString()}`
      : '$0';
    const savingsChange = '+0%'; // Would need historical savings data for change calculation

    return {
      totalSavings,
      savingsChange,
      activeContracts,
      contractsChange,
      pendingApprovals: pendingApprovals || 0,
      approvalsChange: '0',
      vendorsActive,
      vendorsChange,
      expiringContracts,
      urgentApprovals: urgentApprovals || 0,
      complianceRate: avgCompliance
    };
  }

  /**
   * Get default metrics when data is not available
   */
  private getDefaultMetrics() {
    return {
      totalSavings: '$0',
      savingsChange: '+0%',
      activeContracts: 0,
      contractsChange: '+0',
      pendingApprovals: 0,
      approvalsChange: '0',
      vendorsActive: 0,
      vendorsChange: '+0',
      expiringContracts: 0,
      urgentApprovals: 0,
      complianceRate: '0%'
    };
  }

  /**
   * Get recent activity from agent tasks
   */
  async getRecentActivity(enterpriseId: string, limit = 10) {
    if (!enterpriseId) {
      console.warn('getRecentActivity called without enterprise_id');
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- join query not in generated types
    const { data, error } = await (this.supabase as any)
      .from('agent_tasks')
      .select(`
        id,
        task_type,
        status,
        payload,
        created_at,
        completed_at,
        agents!inner(name, type)
      `)
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Only log if there's a meaningful error
      if (Object.keys(error).length > 0) {
        console.error('Error fetching recent activity:', getErrorMessage(error, 'Failed to fetch recent activity'));
      }
      return [];
    }

    // Transform to activity format
    const tasks = (data || []) as AgentTaskWithAgent[];
    return tasks.map((task) => {
      const timeAgo = this.getTimeAgo(new Date(task.created_at || ''));
      let status: 'success' | 'warning' | 'info' | 'error' = 'info';

      if (task.status === 'completed') status = 'success';
      else if (task.status === 'failed') status = 'error';
      else if (task.status === 'timeout') status = 'warning';

      // Determine activity type
      let type: 'contract' | 'savings' | 'rfp' | 'alert' | 'vendor' | 'approval' = 'alert';
      if (task.task_type.includes('contract')) type = 'contract';
      else if (task.task_type.includes('vendor')) type = 'vendor';
      else if (task.task_type.includes('rfp') || task.task_type.includes('rfq')) type = 'rfp';
      else if (task.task_type.includes('savings')) type = 'savings';

      return {
        id: task.id,
        type,
        message: task.payload?.title || task.payload?.description || `${task.agents?.name} - ${task.task_type}`,
        time: timeAgo,
        status,
        timestamp: new Date(task.created_at || '').getTime()
      };
    });
  }

  /**
   * Get recent agent logs for execution terminal
   */
  async getRecentLogs(enterpriseId: string, limit = 50) {
    if (!enterpriseId) {
      console.warn('getRecentLogs called without enterprise_id');
      return [];
    }

    // Query agent_logs with correct column names from database schema
    const { data, error } = await this.supabase
      .from('agent_logs')
      .select(`
        id,
        log_level,
        log_type,
        message,
        metadata,
        task_id,
        created_at,
        execution_time_ms,
        tokens_used,
        agents!inner(id, name, type, enterprise_id)
      `)
      .order('created_at', { ascending: false })
      .limit(limit) as { data: AgentLogWithAgent[] | null; error: ErrorLike | null };

    if (error) {
      // Only log if there's a meaningful error
      if (Object.keys(error).length > 0) {
        console.error('Error fetching logs:', getErrorMessage(error, 'Failed to fetch logs'));
      }
      return [];
    }

    // Filter by enterprise_id (through agents relation) and transform to execution log format
    const filteredData = (data || []).filter(log => log.agents?.enterprise_id === enterpriseId);

    return filteredData.map(log => {
      const metadata = log.metadata || {};
      return {
        id: log.id,
        agentName: log.agents?.name || 'Unknown',
        agentType: (log.agents?.type || 'manager') as AgentType,
        level: (log.log_level || 'info') as LogLevel,
        message: log.message,
        tool: metadata.tool as string | undefined,
        parameters: metadata.parameters as Record<string, unknown> | undefined,
        result: metadata.result,
        duration: log.execution_time_ms,
        timestamp: log.created_at,
        error: metadata.error as string | undefined,
        step: metadata.step as number | undefined,
        totalSteps: metadata.total_steps as number | undefined
      };
    }).reverse(); // Oldest first for terminal display
  }

  /**
   * Subscribe to real-time agent logs
   */
  subscribeToAgentLogs(
    enterpriseId: string,
    callback: (log: AgentLogEntry) => void
  ) {
    return this.supabase
      .channel(`agent-logs-${enterpriseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_logs',
          filter: `enterprise_id=eq.${enterpriseId}`
        },
        async (payload) => {
          // Fetch agent details
          const { data: agent } = await this.supabase
            .from('agents')
            .select('name, type')
            .eq('id', payload.new.agent_id)
            .single();

          callback({
            id: payload.new.id as string,
            agentName: agent?.name || 'Unknown',
            agentType: (agent?.type || 'manager') as AgentType,
            level: (payload.new.level || 'info') as LogLevel,
            message: payload.new.message as string,
            tool: payload.new.data?.tool as string | undefined,
            parameters: payload.new.data?.parameters as Record<string, unknown> | undefined,
            result: payload.new.data?.result,
            duration: payload.new.data?.duration as number | undefined,
            timestamp: payload.new.timestamp as string,
            error: payload.new.data?.error as string | undefined,
            step: payload.new.data?.step as number | undefined,
            totalSteps: payload.new.data?.total_steps as number | undefined
          });
        }
      )
      .subscribe();
  }

  /**
   * Helper to get relative time string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Toggle agent enabled/disabled
   */
  async toggleAgent(agentId: string, enabled: boolean) {
    const { error } = await this.supabase
      .from('agents')
      .update({ is_enabled: enabled })
      .eq('id', agentId);

    if (error) {
      console.error('Error toggling agent:', error);
      throw new Error(`Failed to toggle agent: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Initialize agent system for an enterprise
   * Creates the agent_system record and all 17 default agents
   */
  async initializeAgentSystem(enterpriseId: string) {
    if (!enterpriseId) {
      throw new Error('Enterprise ID is required to initialize agent system');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
      const { data, error } = await (this.supabase as any)
        .rpc('initialize_agent_system', { p_enterprise_id: enterpriseId });

      if (error) {
        console.error('Error initializing agent system:', error);
        throw new Error(`Failed to initialize agent system: ${getErrorMessage(error)}`);
      }

      return data?.[0] || { agent_system_id: null, agents_created: 0 };
    } catch (error) {
      console.error('Error calling initialize_agent_system:', error);
      throw error;
    }
  }

  /**
   * Start agent system
   */
  async startSystem(enterpriseId: string) {
    const { error } = await this.supabase
      .from('agent_system')
      .update({
        is_running: true,
        status: 'running',
        last_started: new Date().toISOString()
      })
      .eq('enterprise_id', enterpriseId);

    if (error) {
      console.error('Error starting system:', error);
      throw new Error(`Failed to start system: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Stop agent system
   */
  async stopSystem(enterpriseId: string) {
    const { error } = await this.supabase
      .from('agent_system')
      .update({
        is_running: false,
        status: 'stopped',
        last_stopped: new Date().toISOString()
      })
      .eq('enterprise_id', enterpriseId);

    if (error) {
      console.error('Error stopping system:', error);
      throw new Error(`Failed to stop system: ${getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // DONNA AI - GLOBAL LEARNING SYSTEM
  // ============================================================================

  /**
   * Query Donna AI for insights based on anonymized cross-enterprise patterns
   */
  async queryDonna(params: {
    query: string;
    enterpriseId: string;
    userId?: string;
    context?: Record<string, unknown>;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-donna-query', {
      body: {
        query: params.query,
        enterprise_id: params.enterpriseId,
        user_id: params.userId,
        context: {
          ...params.context,
          metadata: {
            ...(params.context as any)?.metadata,
            ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
          }
        }
      }
    });

    if (error) {
      console.error('Error querying Donna:', error);
      throw new Error(`Failed to query Donna: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Submit feedback on Donna's insights
   */
  async submitDonnaFeedback(params: {
    insightId: string;
    helpful: boolean;
    enterpriseId: string;
    userId?: string;
    comment?: string;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-donna-feedback', {
      body: {
        insight_id: params.insightId,
        helpful: params.helpful,
        enterprise_id: params.enterpriseId,
        user_id: params.userId,
        comment: params.comment,
        metadata: {
          ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
        }
      }
    });

    if (error) {
      console.error('Error submitting Donna feedback:', error);
      throw new Error(`Failed to submit feedback: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get Donna AI metrics (learning stats, accuracy, etc.)
   */
  async getDonnaMetrics(enterpriseId?: string, swarmMode?: boolean, swarmConfig?: PartialSwarmConfig) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-donna-metrics', {
      body: {
        enterprise_id: enterpriseId, // Optional - if provided, shows enterprise-specific stats
        metadata: {
          swarmMode: swarmMode !== false,
          ...(swarmConfig && { swarmConfig })
        }
      }
    });

    if (error) {
      console.error('Error fetching Donna metrics:', error);
      throw new Error(`Failed to fetch Donna metrics: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get Donna's knowledge statistics
   */
  async getDonnaKnowledge(params?: {
    category?: string;
    limit?: number;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-donna-knowledge', {
      body: {
        category: params?.category,
        limit: params?.limit || 100,
        metadata: {
          swarmMode: params?.swarmMode !== false,
          ...(params?.swarmConfig && { swarmConfig: params.swarmConfig })
        }
      }
    });

    if (error) {
      console.error('Error fetching Donna knowledge:', error);
      throw new Error(`Failed to fetch Donna knowledge: ${getErrorMessage(error)}`);
    }

    return data;
  }

  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================

  /**
   * Clear agent memory (short-term or all)
   */
  async clearAgentMemory(params: {
    agentType: string;
    enterpriseId: string;
    memoryType?: 'short_term' | 'long_term' | 'all';
    userId?: string;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-memory-clear', {
      body: {
        agent_type: params.agentType,
        enterprise_id: params.enterpriseId,
        memory_type: params.memoryType || 'all',
        user_id: params.userId,
        metadata: {
          ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
        }
      }
    });

    if (error) {
      console.error('Error clearing memory:', error);
      throw new Error(`Failed to clear memory: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Export agent memory to JSON
   */
  async exportAgentMemory(params: {
    agentType: string;
    enterpriseId: string;
    memoryType?: 'short_term' | 'long_term' | 'all';
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-memory-export', {
      body: {
        agent_type: params.agentType,
        enterprise_id: params.enterpriseId,
        memory_type: params.memoryType || 'all',
        metadata: {
          ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
        }
      }
    });

    if (error) {
      console.error('Error exporting memory:', error);
      throw new Error(`Failed to export memory: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get memory consolidation status
   */
  async getMemoryConsolidationStatus(enterpriseId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    const { data, error } = await (this.supabase as any)
      .from('agent_memory_consolidation')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching consolidation status:', error);
      throw new Error(`Failed to fetch consolidation status: ${getErrorMessage(error)}`);
    }

    return data || [];
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /**
   * Get health status for all agents
   */
  async getAgentHealth(enterpriseId: string, swarmMode?: boolean, swarmConfig?: PartialSwarmConfig) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-health', {
      body: {
        enterprise_id: enterpriseId,
        metadata: {
          swarmMode: swarmMode !== false,
          ...(swarmConfig && { swarmConfig })
        }
      }
    });

    if (error) {
      console.error('Error fetching agent health:', error);
      throw new Error(`Failed to fetch agent health: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get health status for a specific agent
   */
  async getAgentHealthByType(params: {
    agentType: string;
    enterpriseId: string;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-health', {
      body: {
        agent_type: params.agentType,
        enterprise_id: params.enterpriseId,
        metadata: {
          ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
        }
      }
    });

    if (error) {
      console.error('Error fetching agent health:', error);
      throw new Error(`Failed to fetch agent health: ${getErrorMessage(error)}`);
    }

    return data;
  }

  // ============================================================================
  // DISTRIBUTED TRACING
  // ============================================================================

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string) {
    const { data, error } = await this.supabase.functions.invoke(`local-agents-traces-${traceId}`, {
      method: 'GET'
    });

    if (error) {
      console.error('Error fetching trace:', error);
      throw new Error(`Failed to fetch trace: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get recent traces for an enterprise
   */
  async getRecentTraces(params: {
    enterpriseId: string;
    limit?: number;
    agentType?: string;
    status?: 'success' | 'error' | 'pending';
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    const { data, error } = await (this.supabase as any)
      .from('agent_traces')
      .select('*')
      .eq('enterprise_id', params.enterpriseId)
      .order('started_at', { ascending: false })
      .limit(params.limit || 50);

    if (error) {
      console.error('Error fetching traces:', error);
      throw new Error(`Failed to fetch traces: ${getErrorMessage(error)}`);
    }

    return data || [];
  }

  /**
   * Analyze trace for performance bottlenecks
   */
  async analyzeTrace(traceId: string, swarmMode?: boolean, swarmConfig?: PartialSwarmConfig) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-traces-analyze', {
      body: {
        trace_id: traceId,
        metadata: {
          swarmMode: swarmMode !== false,
          ...(swarmConfig && { swarmConfig })
        }
      }
    });

    if (error) {
      console.error('Error analyzing trace:', error);
      throw new Error(`Failed to analyze trace: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get performance metrics for traces
   */
  async getTraceMetrics(params: {
    enterpriseId: string;
    timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
    agentType?: string;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-traces-metrics', {
      body: {
        enterprise_id: params.enterpriseId,
        time_range: params.timeRange || '24h',
        agent_type: params.agentType,
        metadata: {
          ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
        }
      }
    });

    if (error) {
      console.error('Error fetching trace metrics:', error);
      throw new Error(`Failed to fetch trace metrics: ${getErrorMessage(error)}`);
    }

    return data;
  }

  // ============================================================================
  // TASK QUEUE MANAGEMENT (BULK OPERATIONS)
  // ============================================================================

  /**
   * Bulk update task statuses
   */
  async bulkUpdateTasks(params: {
    taskIds: string[];
    action: 'pause' | 'resume' | 'cancel' | 'retry';
    enterpriseId: string;
    swarmMode?: boolean;
    swarmConfig?: PartialSwarmConfig;
  }) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-tasks-bulk', {
      body: {
        task_ids: params.taskIds,
        action: params.action,
        enterprise_id: params.enterpriseId,
        metadata: {
          ...this.buildSwarmMetadata(params.swarmMode, params.swarmConfig)
        }
      }
    });

    if (error) {
      console.error('Error performing bulk action:', error);
      throw new Error(`Failed to perform bulk action: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get task queue performance metrics
   */
  async getTaskQueueMetrics(enterpriseId: string, swarmMode?: boolean, swarmConfig?: PartialSwarmConfig) {
    const { data, error } = await this.supabase.functions.invoke('local-agents-queue-metrics', {
      body: {
        enterprise_id: enterpriseId,
        metadata: {
          swarmMode: swarmMode !== false,
          ...(swarmConfig && { swarmConfig })
        }
      }
    });

    if (error) {
      console.error('Error fetching queue metrics:', error);
      throw new Error(`Failed to fetch queue metrics: ${getErrorMessage(error)}`);
    }

    return data;
  }
}

// Export singleton instance
export const agentsAPI = new AgentsAPI();