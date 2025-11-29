import { useQuery } from "@tanstack/react-query";

/**
 * Public agent statistics for landing page
 * No authentication required
 */

export interface AgentMetrics {
  processed?: number;
  accuracy?: number;
  reviewed?: number;
  flagged?: number;
  vendors?: number;
  score?: number;
  alerts?: number;
  value?: number;
  savings?: number;
  rules?: number;
  compliance_score?: number;
  sent?: number;
  pending?: number;
  latency?: number;
  total_runs?: number;
  success_rate?: number;
}

export interface AgentStats {
  type: string;
  name: string;
  description: string;
  status: string;
  metrics: AgentMetrics;
}

export interface ActivityLogEntry {
  timestamp: string;
  message: string;
  agent_type: string;
  log_type: string;
}

export interface PublicAgentStatistics {
  agents: AgentStats[];
  recent_activity: ActivityLogEntry[];
  updated_at: string;
}

interface PublicAgentStatsResponse {
  success: boolean;
  data: {
    contracts: number;
    active_contracts: number;
    vendors: number;
    compliance_avg: number;
    agents: number;
    processing_time_ms: number;
    updated_at: string;
    agent_statistics?: PublicAgentStatistics;
  };
  cached?: boolean;
  stale?: boolean;
  fallback?: boolean;
}

// Fallback data when API is unavailable
const FALLBACK_AGENT_STATS: PublicAgentStatistics = {
  agents: [],
  recent_activity: [],
  updated_at: new Date().toISOString(),
};

/**
 * Hook to fetch public agent statistics
 * Used on landing page - no authentication required
 */
export function usePublicAgentStats() {
  return useQuery({
    queryKey: ["public-agent-stats"],
    queryFn: async (): Promise<PublicAgentStatistics> => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!supabaseUrl) {
        console.warn("NEXT_PUBLIC_SUPABASE_URL not configured, using fallback agent stats");
        return FALLBACK_AGENT_STATS;
      }

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/public-metrics?include=agents`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.warn(`Public metrics API returned ${response.status}, using fallback`);
          return FALLBACK_AGENT_STATS;
        }

        const result: PublicAgentStatsResponse = await response.json();

        if (!result.success || !result.data?.agent_statistics) {
          console.warn("Public agent stats response invalid, using fallback");
          return FALLBACK_AGENT_STATS;
        }

        return result.data.agent_statistics;
      } catch (error) {
        console.warn("Failed to fetch public agent stats, using fallback:", error);
        return FALLBACK_AGENT_STATS;
      }
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 1, // Only retry once
    refetchOnWindowFocus: false, // Don't refetch on window focus for landing page
  });
}

/**
 * Format large numbers for display
 * e.g., 2500000 -> "2.5M"
 */
export function formatAgentMetricValue(value: number | undefined): string {
  if (value === undefined || value === null) return "0";

  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format percentage for display
 */
export function formatAgentPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return "0%";
  return `${value.toFixed(1)}%`;
}

/**
 * Format currency value for display
 */
export function formatAgentCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return "$0";

  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Map agent type to display-friendly metrics
 */
export function getAgentDisplayMetrics(agent: AgentStats): Record<string, string> {
  const metrics = agent.metrics;

  switch (agent.type) {
    case 'secretary':
    case 'continual_secretary':
    case 'metacognitive_secretary':
      return {
        processed: formatAgentMetricValue(metrics.processed),
        accuracy: formatAgentPercentage(metrics.accuracy || metrics.success_rate),
        latency: `${metrics.latency || 150}ms`,
      };

    case 'legal':
      return {
        reviewed: formatAgentMetricValue(metrics.reviewed),
        flagged: formatAgentMetricValue(metrics.flagged),
        latency: `${metrics.latency || 150}ms`,
      };

    case 'vendor':
      return {
        vendors: formatAgentMetricValue(metrics.vendors),
        score: metrics.score?.toFixed(1) || "0",
        alerts: String(metrics.alerts || 0),
      };

    case 'financial':
    case 'causal_financial':
    case 'quantum_financial':
      return {
        value: formatAgentCurrency(metrics.value),
        savings: formatAgentCurrency(metrics.savings),
        latency: `${metrics.latency || 150}ms`,
      };

    case 'compliance':
      return {
        rules: formatAgentMetricValue(metrics.rules),
        score: formatAgentPercentage(metrics.compliance_score),
        alerts: String(metrics.alerts || 0),
      };

    case 'notifications':
      return {
        sent: formatAgentMetricValue(metrics.sent),
        pending: String(metrics.pending || 0),
        latency: `${metrics.latency || 150}ms`,
      };

    default:
      return {
        runs: formatAgentMetricValue(metrics.total_runs),
        success: formatAgentPercentage(metrics.success_rate),
        latency: `${metrics.latency || 150}ms`,
      };
  }
}
