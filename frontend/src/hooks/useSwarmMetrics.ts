/**
 * useSwarmMetrics - Hook to fetch swarm performance metrics
 *
 * Provides real-time swarm intelligence metrics including optimization
 * performance, consensus rates, and pattern learning statistics.
 *
 * @module useSwarmMetrics
 */

import { useQuery } from '@tanstack/react-query';
import { agentsAPI } from '@/lib/api/agents';

/**
 * Convergence history point
 */
interface ConvergencePoint {
  timestamp: string;
  iterations: number;
  fitness: number;
  algorithm: 'pso' | 'aco';
}

/**
 * Consensus agreement distribution
 */
interface ConsensusDistribution {
  agreementRange: string; // e.g., "60-70%", "70-80%"
  count: number;
}

/**
 * Agent collaboration edge
 */
interface CollaborationEdge {
  fromAgent: string;
  toAgent: string;
  strength: number; // 0-1, based on co-occurrence frequency
  successRate: number;
}

/**
 * ACO pheromone trail data
 */
interface PheromoneTrail {
  path: string;
  strength: number;
  lastUpdated: string;
  successCount: number;
}

/**
 * Swarm performance metrics
 */
export interface SwarmMetrics {
  // Overall metrics
  totalOptimizations: number;
  averageOptimizationTime: number;
  consensusSuccessRate: number;
  patternReuseRate: number;

  // PSO specific
  psoMetrics: {
    averageIterations: number;
    averageConvergenceTime: number;
    convergenceHistory: ConvergencePoint[];
    particleCount: number;
  };

  // ACO specific
  acoMetrics: {
    averagePathLength: number;
    pheromoneTrails: PheromoneTrail[];
    bestPathQuality: number;
  };

  // Consensus specific
  consensusMetrics: {
    averageAgreementScore: number;
    consensusDistribution: ConsensusDistribution[];
    minorityOpinionRate: number;
    averageVotingAgents: number;
  };

  // Collaboration patterns
  collaborationPatterns: {
    edges: CollaborationEdge[];
    mostFrequentPairs: Array<{
      agents: [string, string];
      frequency: number;
    }>;
  };

  // Time series data
  timeRange: string;
  dataPoints: number;
}

/**
 * Hook parameters
 */
interface UseSwarmMetricsParams {
  enterpriseId?: string;
  capability?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  refreshInterval?: number;
}

/**
 * useSwarmMetrics - Fetch swarm performance metrics
 *
 * Queries backend for swarm optimization statistics and performance data.
 *
 * @param params - Query parameters
 * @returns React Query result with metrics data
 *
 * @example
 * ```tsx
 * const { data: metrics, isLoading, error } = useSwarmMetrics({
 *   enterpriseId: 'ent-123',
 *   timeRange: '24h',
 *   refreshInterval: 30000 // 30 seconds
 * });
 *
 * if (metrics) {
 *   console.log('Consensus rate:', metrics.consensusSuccessRate);
 * }
 * ```
 */
export function useSwarmMetrics({
  enterpriseId,
  capability,
  timeRange = '24h',
  refreshInterval = 30000,
}: UseSwarmMetricsParams = {}) {
  return useQuery({
    queryKey: ['swarm-metrics', enterpriseId, capability, timeRange],
    queryFn: async () => {
      if (!enterpriseId) {
        throw new Error('enterpriseId is required');
      }

      // Call real backend endpoint
      const response = await agentsAPI.getSwarmMetrics({
        enterpriseId,
        capability,
        timeRange,
      });

      return response as SwarmMetrics;
    },
    enabled: !!enterpriseId,
    refetchInterval: refreshInterval,
    staleTime: refreshInterval / 2,
  });
}
