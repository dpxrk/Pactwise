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
      // TODO: Replace with actual backend endpoint when implemented
      // For now, return mock data structure
      const mockMetrics: SwarmMetrics = {
        totalOptimizations: 127,
        averageOptimizationTime: 73.4,
        consensusSuccessRate: 0.91,
        patternReuseRate: 0.34,

        psoMetrics: {
          averageIterations: 18.7,
          averageConvergenceTime: 65.2,
          convergenceHistory: [
            { timestamp: new Date(Date.now() - 3600000).toISOString(), iterations: 20, fitness: 0.85, algorithm: 'pso' },
            { timestamp: new Date(Date.now() - 1800000).toISOString(), iterations: 17, fitness: 0.89, algorithm: 'pso' },
            { timestamp: new Date().toISOString(), iterations: 15, fitness: 0.92, algorithm: 'pso' },
          ],
          particleCount: 20,
        },

        acoMetrics: {
          averagePathLength: 3.4,
          pheromoneTrails: [
            { path: 'legal→financial→manager', strength: 0.87, lastUpdated: new Date().toISOString(), successCount: 23 },
            { path: 'secretary→legal→manager', strength: 0.76, lastUpdated: new Date().toISOString(), successCount: 18 },
            { path: 'financial→legal→compliance', strength: 0.65, lastUpdated: new Date().toISOString(), successCount: 12 },
          ],
          bestPathQuality: 0.87,
        },

        consensusMetrics: {
          averageAgreementScore: 0.78,
          consensusDistribution: [
            { agreementRange: '50-60%', count: 3 },
            { agreementRange: '60-70%', count: 12 },
            { agreementRange: '70-80%', count: 28 },
            { agreementRange: '80-90%', count: 45 },
            { agreementRange: '90-100%', count: 39 },
          ],
          minorityOpinionRate: 0.18,
          averageVotingAgents: 4.2,
        },

        collaborationPatterns: {
          edges: [
            { fromAgent: 'legal', toAgent: 'financial', strength: 0.89, successRate: 0.94 },
            { fromAgent: 'secretary', toAgent: 'legal', strength: 0.76, successRate: 0.88 },
            { fromAgent: 'financial', toAgent: 'manager', strength: 0.71, successRate: 0.91 },
          ],
          mostFrequentPairs: [
            { agents: ['legal', 'financial'], frequency: 45 },
            { agents: ['secretary', 'legal'], frequency: 32 },
            { agents: ['financial', 'manager'], frequency: 28 },
          ],
        },

        timeRange,
        dataPoints: 127,
      };

      return mockMetrics;

      // Production implementation:
      // const response = await agentsAPI.getSwarmMetrics({
      //   enterpriseId,
      //   capability,
      //   timeRange
      // });
      // return response.data as SwarmMetrics;
    },
    enabled: !!enterpriseId,
    refetchInterval: refreshInterval,
    staleTime: refreshInterval / 2,
  });
}
