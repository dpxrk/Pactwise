'use client';

import React from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useAgentTaskSubscription } from '@/hooks/useAgentTaskSubscription';
import { AgentActivityIndicator } from '@/components/ai/AgentActivityIndicator';

interface AgentProviderProps {
  children: React.ReactNode;
}

/**
 * AgentProvider - Wraps authenticated pages with agent task monitoring
 *
 * Features:
 * - Subscribes to real-time agent task updates via Supabase
 * - Renders the floating AgentActivityIndicator
 * - Only activates when user is authenticated
 */
export function AgentProvider({ children }: AgentProviderProps) {
  const { user } = useAuth();

  // Only subscribe when authenticated
  // The hook internally handles null userProfile gracefully
  const { isSubscribed, error } = useAgentTaskSubscription({
    // Subscribe to all agent types by default
    // Can be filtered per-page using the hook directly
    onTaskStarted: (task) => {
      console.log('[AgentProvider] Task started:', task.agentType, task.taskType);
    },
    onTaskCompleted: (task) => {
      console.log('[AgentProvider] Task completed:', task.agentType, task.taskType);
    },
    onTaskFailed: (task) => {
      console.error('[AgentProvider] Task failed:', task.agentType, task.taskType);
    },
  });

  // Log subscription status in development
  if (process.env.NODE_ENV === 'development' && user) {
    if (error) {
      console.warn('[AgentProvider] Subscription error:', error.message);
    }
  }

  return (
    <>
      {children}
      {/* Render activity indicator for authenticated users */}
      {user && <AgentActivityIndicator />}
    </>
  );
}

export default AgentProvider;
