/**
 * Custom hooks for AI agent interactions and learning
 * Tracks all user interactions for continuous improvement
 * NO HARDCODED DATA - Everything from APIs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI, type AgentContext, type AgentAction } from '@/lib/api/agents';

/**
 * Get AI recommendations based on current context
 */
export function useAgentRecommendations(context: Partial<AgentContext>) {
  const { user, userProfile } = useAuth();

  const fullContext: AgentContext = {
    ...context,
    userId: userProfile?.id ?? '',
    enterpriseId: user?.user_metadata?.enterprise_id ?? '',
  };

  const { data: recommendations, ...queryResult } = useQuery({
    queryKey: ['recommendations', fullContext],
    queryFn: () => agentsAPI.getRecommendations(fullContext),
    enabled: !!userProfile?.id && !!user?.user_metadata?.enterprise_id,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider stale after 15 seconds
  });

  const trackAction = useCallback(async (action: AgentAction, recommendationId: string) => {
    await agentsAPI.trackInteraction({
      recommendationId,
      action,
      context: fullContext,
      outcome: 'pending'
    });
  }, [fullContext]);

  return {
    recommendations: recommendations || [],
    trackAction,
    ...queryResult
  };
}

/**
 * Track user interactions with AI recommendations
 */
export function useTrackInteraction() {
  const { user, userProfile } = useAuth();

  return useMutation({
    mutationFn: (params: {
      recommendationId: string;
      action: AgentAction;
      context?: Partial<AgentContext>;
    }) => {
      const fullContext: AgentContext = {
        ...params.context,
        userId: userProfile?.id ?? '',
        enterpriseId: user?.user_metadata?.enterprise_id ?? '',
      };

      return agentsAPI.trackInteraction({
        ...params,
        context: fullContext,
      });
    },
    onError: (error) => {
      console.error('Failed to track interaction:', error);
    },
  });
}

/**
 * Get AI conversation history
 */
export function useAIConversations() {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['ai-conversations', userProfile?.id],
    queryFn: () => agentsAPI.getConversations(userProfile?.id ?? ''),
    enabled: !!userProfile?.id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get messages for a specific conversation
 */
export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => agentsAPI.getConversationMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 30000,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });
}

/**
 * Send message in AI chat
 */
export function useSendAIMessage() {
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  return useMutation({
    mutationFn: (params: {
      conversationId?: string;
      message: string;
      context?: Partial<AgentContext>;
    }) => {
      const fullContext: AgentContext = {
        ...params.context,
        userId: userProfile?.id ?? '',
        enterpriseId: user?.user_metadata?.enterprise_id ?? '',
      };

      return agentsAPI.sendMessage({
        ...params,
        context: fullContext,
      });
    },
    onSuccess: (_, variables) => {
      if (variables.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: ['conversation-messages', variables.conversationId] 
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });
}

/**
 * Start a new AI conversation
 */
export function useStartConversation() {
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();

  return useMutation({
    mutationFn: (params: {
      initialMessage: string;
      context?: Partial<AgentContext>;
      title?: string;
    }) => {
      const fullContext: AgentContext = {
        ...params.context,
        userId: userProfile?.id ?? '',
        enterpriseId: user?.user_metadata?.enterprise_id ?? '',
      };

      return agentsAPI.startConversation({
        ...params,
        context: fullContext,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
    onError: (error) => {
      toast.error(`Failed to start conversation: ${error.message}`);
    },
  });
}

/**
 * Get user's learning statistics
 */
export function useLearningStats() {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['learning-stats', userProfile?.id],
    queryFn: () => agentsAPI.getUserLearningStats(userProfile?.id ?? ''),
    enabled: !!userProfile?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get agent performance metrics
 */
export function useAgentPerformance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-performance', user?.user_metadata?.enterprise_id],
    queryFn: () => agentsAPI.getAgentPerformanceMetrics(user?.user_metadata?.enterprise_id ?? ''),
    enabled: !!user?.user_metadata?.enterprise_id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create an agent task for async processing
 */
export function useCreateAgentTask() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: {
      type: string;
      data: any;
      priority?: number;
    }) => agentsAPI.createAgentTask({
      ...task,
      userId: userProfile?.id ?? '',
      enterpriseId: user?.user_metadata?.enterprise_id ?? '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      toast.success('Task created and queued for processing');
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });
}

/**
 * Track task status
 */
export function useTaskStatus(taskId: string | null) {
  return useQuery({
    queryKey: ['agent-task', taskId],
    queryFn: () => agentsAPI.getTaskStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      // Poll while task is pending or processing
      const data = query.state.data as any;
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 2000; // Poll every 2 seconds
      }
      return false; // Stop polling when complete
    },
  });
}

/**
 * Train agent with explicit feedback
 */
export function useTrainAgent() {
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: (feedback: {
      agentType: string;
      action: string;
      context: any;
      wasHelpful: boolean;
      improvement?: string;
    }) => agentsAPI.trainAgent({
      ...feedback,
      userId: userProfile?.id ?? '',
    }),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
    },
    onError: (error) => {
      console.error('Failed to submit training feedback:', error);
    },
  });
}

/**
 * Get personalized insights
 */
export function usePersonalizedInsights() {
  const { user, userProfile } = useAuth();

  return useQuery({
    queryKey: ['personalized-insights', userProfile?.id],
    queryFn: () => agentsAPI.getPersonalizedInsights(
      userProfile?.id ?? '',
      user?.user_metadata?.enterprise_id ?? ''
    ),
    enabled: !!userProfile?.id && !!user?.user_metadata?.enterprise_id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}

/**
 * Subscribe to real-time agent updates
 */
export function useAgentUpdates(callback?: (update: any) => void) {
  const { userProfile } = useAuth();

  useEffect(() => {
    if (!userProfile?.id) return;

    const subscription = agentsAPI.subscribeToAgentUpdates(
      userProfile.id,
      (update) => {
        if (callback) callback(update);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [userProfile?.id, callback]);
}

/**
 * Get workflow automation suggestions
 */
export function useWorkflowSuggestions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workflow-suggestions', user?.user_metadata?.enterprise_id],
    queryFn: () => agentsAPI.getWorkflowSuggestions(user?.user_metadata?.enterprise_id ?? ''),
    enabled: !!user?.user_metadata?.enterprise_id,
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes
  });
}

/**
 * Update interaction outcome for delayed feedback
 */
export function useUpdateInteractionOutcome() {
  return useMutation({
    mutationFn: (params: {
      interactionId: string;
      outcome: 'success' | 'failure' | 'partial';
      metadata?: any;
    }) => agentsAPI.updateInteractionOutcome(
      params.interactionId,
      params.outcome,
      params.metadata
    ),
    onSuccess: () => {
    },
    onError: (error) => {
      console.error('Failed to update outcome:', error);
    },
  });
}