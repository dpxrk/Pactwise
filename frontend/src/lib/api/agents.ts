/**
 * Agents API Service Layer
 * Handles all AI agent interactions and learning
 * NO HARDCODED DATA - Everything from the database
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database.types';

type AgentInteraction = Database['public']['Tables']['agent_interactions']['Row'];
type AgentInteractionInsert = Database['public']['Tables']['agent_interactions']['Insert'];
type AgentTask = Database['public']['Tables']['agent_tasks']['Row'];
type AIConversation = Database['public']['Tables']['ai_conversations']['Row'];

export interface AgentContext {
  page?: string;
  contractId?: string;
  vendorId?: string;
  userId: string;
  enterpriseId: string;
  currentAction?: string;
  metadata?: Record<string, any>;
}

export interface AgentRecommendation {
  id: string;
  type: 'contract' | 'vendor' | 'workflow' | 'insight';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionType: string;
  actionData?: any;
  reasoning?: string;
}

export interface AgentAction {
  id: string;
  type: 'accepted' | 'dismissed' | 'modified' | 'deferred';
  confidence?: number;
  reason?: string;
  modifiedData?: any;
}

export interface LearningStats {
  totalInteractions: number;
  successRate: number;
  averageConfidence: number;
  mostSuccessfulActions: string[];
  improvementRate: number;
  lastUpdated: Date;
}

/**
 * Helper to safely get error message from various error formats
 */
function getErrorMessage(error: any, defaultMessage: string = 'Unknown error'): string {
  if (!error) return defaultMessage;
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  if (error.hint) return error.hint;
  return defaultMessage;
}

export class AgentsAPI {
  private supabase = createClient();

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
    // Store the interaction
    const { data: interactionData, error: interactionError } = await this.supabase
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
        interactionId: interactionData.id,
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
    metadata?: any
  ): Promise<void> {
    const { error } = await this.supabase
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
  async getConversations(userId: string, limit = 10): Promise<AIConversation[]> {
    const { data, error } = await this.supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversations:', error);
      throw new Error(`Failed to fetch conversations: ${getErrorMessage(error)}`);
    }

    return data || [];
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(conversationId: string) {
    const { data, error } = await this.supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${getErrorMessage(error)}`);
    }

    return data || [];
  }

  /**
   * Send a message in AI conversation
   */
  async sendMessage(params: {
    conversationId?: string;
    message: string;
    context?: AgentContext;
  }) {
    const { data, error } = await this.supabase.functions.invoke('ai-chat', {
      body: {
        conversationId: params.conversationId,
        message: params.message,
        context: params.context
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
  }) {
    const { data: conversation, error: convError } = await this.supabase
      .from('ai_conversations')
      .insert({
        user_id: params.context?.userId,
        enterprise_id: params.context?.enterpriseId,
        title: params.title || 'New Conversation',
        context_data: params.context,
        status: 'active'
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      throw new Error(`Failed to create conversation: ${convError.message}`);
    }

    // Send initial message
    const response = await this.sendMessage({
      conversationId: conversation.id,
      message: params.initialMessage,
      context: params.context
    });

    return { conversationId: conversation.id, response };
  }

  /**
   * Get user's learning statistics
   */
  async getUserLearningStats(userId: string): Promise<LearningStats> {
    const { data, error } = await this.supabase.rpc('get_user_learning_stats', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching learning stats:', error);
      throw new Error(`Failed to fetch learning stats: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformanceMetrics(enterpriseId: string) {
    const { data, error } = await this.supabase.rpc('get_agent_performance_metrics', {
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
  async createAgentTask(task: {
    type: string;
    data: any;
    priority?: number;
    userId: string;
    enterpriseId: string;
  }): Promise<AgentTask> {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .insert({
        agent_type: task.type,
        task_data: task.data,
        priority: task.priority || 5,
        status: 'pending',
        user_id: task.userId,
        enterprise_id: task.enterpriseId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent task:', error);
      throw new Error(`Failed to create agent task: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Get task status and results
   */
  async getTaskStatus(taskId: string) {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('Error fetching task status:', error);
      throw new Error(`Failed to fetch task status: ${getErrorMessage(error)}`);
    }

    return data;
  }

  /**
   * Train agent with explicit feedback
   */
  async trainAgent(feedback: {
    agentType: string;
    action: string;
    context: any;
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
    callback: (update: any) => void
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
    const { data, error } = await this.supabase.rpc('get_workflow_suggestions', {
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
    const agents = data.agents || [];
    const activeAgents = agents.filter((a: any) => a.is_enabled && a.status === 'active').length;

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
      agents: agents.map((a: any) => ({
        _id: a.id,
        name: a.name,
        type: a.type,
        status: a.status,
        description: a.description,
        isEnabled: a.is_enabled,
        lastRun: a.last_run,
        lastSuccess: a.last_success,
        runCount: a.run_count,
        errorCount: a.error_count,
        lastError: a.last_error,
        config: a.config,
        metrics: a.metrics,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      })),
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

    // Get contracts data
    const { data: contracts, error: contractsError } = await this.supabase
      .from('contracts')
      .select('id, status, value, expiration_date')
      .eq('enterprise_id', enterpriseId);

    if (contractsError && Object.keys(contractsError).length > 0) {
      console.error('Error fetching contracts:', getErrorMessage(contractsError, 'Failed to fetch contracts'));
    }

    // Get vendors data
    const { data: vendors, error: vendorsError } = await this.supabase
      .from('vendors')
      .select('id, status, compliance_rate')
      .eq('enterprise_id', enterpriseId);

    if (vendorsError && Object.keys(vendorsError).length > 0) {
      console.error('Error fetching vendors:', getErrorMessage(vendorsError, 'Failed to fetch vendors'));
    }

    // Calculate metrics
    const activeContracts = contracts?.filter(c => c.status === 'active').length || 0;
    const expiringContracts = contracts?.filter(c => {
      if (!c.expiration_date) return false;
      const expiryDate = new Date(c.expiration_date);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return expiryDate <= thirtyDaysFromNow;
    }).length || 0;

    const vendorsActive = vendors?.filter(v => v.status === 'active').length || 0;
    const avgCompliance = vendors && vendors.length > 0
      ? (vendors.reduce((sum, v) => sum + (v.compliance_rate || 0), 0) / vendors.length).toFixed(1) + '%'
      : '0%';

    // TODO: Calculate actual savings from agent_insights or a dedicated savings table
    const totalSavings = '$0';
    const savingsChange = '+0%';

    return {
      totalSavings,
      savingsChange,
      activeContracts,
      contractsChange: '+0', // TODO: Calculate change
      pendingApprovals: 0, // TODO: Get from approvals system
      approvalsChange: '0',
      vendorsActive,
      vendorsChange: '+0', // TODO: Calculate change
      expiringContracts,
      urgentApprovals: 0,
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

    const { data, error } = await this.supabase
      .from('agent_tasks')
      .select(`
        id,
        task_type,
        status,
        title,
        description,
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
    return data.map(task => {
      const timeAgo = this.getTimeAgo(new Date(task.created_at));
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
        message: task.title || task.description || `${(task.agents as any)?.name} - ${task.task_type}`,
        time: timeAgo,
        status,
        timestamp: new Date(task.created_at).getTime()
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

    const { data, error } = await this.supabase
      .from('agent_logs')
      .select(`
        id,
        level,
        message,
        data,
        task_id,
        timestamp,
        category,
        source,
        agents!inner(name, type)
      `)
      .eq('enterprise_id', enterpriseId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      // Only log if there's a meaningful error
      if (Object.keys(error).length > 0) {
        console.error('Error fetching logs:', getErrorMessage(error, 'Failed to fetch logs'));
      }
      return [];
    }

    // Transform to execution log format
    return data.map(log => ({
      id: log.id,
      agentName: (log.agents as any)?.name || 'Unknown',
      agentType: (log.agents as any)?.type || 'unknown',
      level: log.level as any,
      message: log.message,
      tool: log.data?.tool,
      parameters: log.data?.parameters,
      result: log.data?.result,
      duration: log.data?.duration,
      timestamp: log.timestamp,
      error: log.data?.error,
      step: log.data?.step,
      totalSteps: log.data?.total_steps
    })).reverse(); // Oldest first for terminal display
  }

  /**
   * Subscribe to real-time agent logs
   */
  subscribeToAgentLogs(
    enterpriseId: string,
    callback: (log: any) => void
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
            id: payload.new.id,
            agentName: agent?.name || 'Unknown',
            agentType: agent?.type || 'unknown',
            level: payload.new.level,
            message: payload.new.message,
            tool: payload.new.data?.tool,
            parameters: payload.new.data?.parameters,
            result: payload.new.data?.result,
            duration: payload.new.data?.duration,
            timestamp: payload.new.timestamp,
            error: payload.new.data?.error,
            step: payload.new.data?.step,
            totalSteps: payload.new.data?.total_steps
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
      const { data, error } = await this.supabase
        .rpc('initialize_agent_system', { p_enterprise_id: enterpriseId });

      if (error) {
        console.error('Error initializing agent system:', error);
        throw new Error(`Failed to initialize agent system: ${getErrorMessage(error)}`);
      }

      console.log(`Agent system initialized: ${data?.[0]?.agents_created || 0} agents created`);
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
}

// Export singleton instance
export const agentsAPI = new AgentsAPI();