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
      throw new Error(`Failed to fetch recommendations: ${error.message}`);
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
      throw new Error(`Failed to update outcome: ${error.message}`);
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
      throw new Error(`Failed to fetch conversations: ${error.message}`);
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
      throw new Error(`Failed to fetch messages: ${error.message}`);
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
      throw new Error(`Failed to send message: ${error.message}`);
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
      throw new Error(`Failed to fetch learning stats: ${error.message}`);
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
      throw new Error(`Failed to fetch agent metrics: ${error.message}`);
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
      throw new Error(`Failed to create agent task: ${error.message}`);
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
      throw new Error(`Failed to fetch task status: ${error.message}`);
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
      throw new Error(`Failed to train agent: ${error.message}`);
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
      throw new Error(`Failed to fetch insights: ${error.message}`);
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
      throw new Error(`Failed to fetch workflow suggestions: ${error.message}`);
    }

    return data;
  }
}

// Export singleton instance
export const agentsAPI = new AgentsAPI();