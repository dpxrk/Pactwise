/**
 * Custom hook for agent operations with automatic swarm orchestration support
 *
 * Provides a normalized interface for invoking agents with swarmMode enabled by default.
 * SwarmMode leverages PSO (Particle Swarm Optimization), ACO (Ant Colony Optimization),
 * and Honeybee Democracy consensus algorithms for optimized multi-agent coordination.
 *
 * @module useAgentWithSwarm
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { SwarmConfig } from '@/types/agents.types';
import { useSendAIMessage, useStartConversation, useCreateAgentTask } from './useAgentData';

export interface BuildAgentContextOptions {
  page?: string;
  contractId?: string;
  vendorId?: string;
  metadata?: Record<string, unknown>;
  swarmMode?: boolean;
  swarmConfig?: Partial<SwarmConfig>;
}

export interface AgentContextWithSwarm {
  page?: string;
  contractId?: string;
  vendorId?: string;
  userId: string;
  enterpriseId: string;
  metadata: {
    swarmMode: boolean;
    swarmConfig?: Partial<SwarmConfig>;
    [key: string]: unknown;
  };
}

/**
 * Hook to invoke agents with automatic swarm orchestration support
 *
 * SwarmMode is enabled by default for manager agents per backend config.
 * Other agents can opt-in by passing swarmMode: true.
 *
 * @example
 * ```tsx
 * const { buildAgentContext, sendMessage } = useAgentWithSwarm();
 *
 * // Basic usage - swarmMode enabled by default
 * const context = buildAgentContext({ page: 'contracts' });
 * await sendMessage.mutateAsync({ message: 'Analyze this contract', context });
 *
 * // Disable swarmMode if needed
 * const contextNoSwarm = buildAgentContext({
 *   page: 'contracts',
 *   swarmMode: false
 * });
 *
 * // Custom swarm configuration
 * const contextCustom = buildAgentContext({
 *   page: 'contracts',
 *   swarmConfig: {
 *     algorithm: 'aco',
 *     consensusThreshold: 0.75
 *   }
 * });
 * ```
 */
export function useAgentWithSwarm() {
  const { user, userProfile } = useAuth();

  /**
   * Builds agent context with automatic swarmMode metadata injection
   *
   * @param options - Configuration options for the agent context
   * @returns Complete agent context with swarmMode enabled by default
   */
  const buildAgentContext = useCallback((options: BuildAgentContextOptions): AgentContextWithSwarm => {
    const {
      page,
      contractId,
      vendorId,
      metadata = {},
      swarmMode = true, // Default: enabled
      swarmConfig,
    } = options;

    return {
      page,
      contractId,
      vendorId,
      userId: userProfile?.id ?? '',
      enterpriseId: user?.user_metadata?.enterprise_id ?? '',
      metadata: {
        ...metadata,
        swarmMode,
        ...(swarmConfig && { swarmConfig }),
      },
    };
  }, [userProfile?.id, user?.user_metadata?.enterprise_id]);

  // Wrapped mutations with swarm support
  const sendMessage = useSendAIMessage();
  const startConversation = useStartConversation();
  const createTask = useCreateAgentTask();

  return useMemo(() => ({
    buildAgentContext,
    sendMessage,
    startConversation,
    createTask,
  }), [buildAgentContext, sendMessage, startConversation, createTask]);
}
