'use client';

import React from 'react';

import { AgentActivityIndicator } from '@/components/ai/AgentActivityIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentTaskSubscription } from '@/hooks/useAgentTaskSubscription';

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
  const { error } = useAgentTaskSubscription({
    // Subscribe to all agent types by default
    // Can be filtered per-page using the hook directly
    onTaskStarted: (_task) => {
    },
    onTaskCompleted: (_task) => {
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
