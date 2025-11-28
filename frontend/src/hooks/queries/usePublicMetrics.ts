import { useQuery } from "@tanstack/react-query";

/**
 * Public platform metrics for landing page
 * No authentication required
 */
export interface PublicMetrics {
  contracts: number;
  active_contracts: number;
  vendors: number;
  compliance_avg: number;
  agents: number;
  processing_time_ms: number;
  updated_at: string;
}

interface PublicMetricsResponse {
  success: boolean;
  data: PublicMetrics;
  cached?: boolean;
  stale?: boolean;
  fallback?: boolean;
}

// Fallback data when API is unavailable
const FALLBACK_METRICS: PublicMetrics = {
  contracts: 0,
  active_contracts: 0,
  vendors: 0,
  compliance_avg: 0,
  agents: 6,
  processing_time_ms: 150,
  updated_at: new Date().toISOString(),
};

/**
 * Hook to fetch public platform metrics
 * Used on landing page - no authentication required
 */
export function usePublicMetrics() {
  return useQuery({
    queryKey: ["public-metrics"],
    queryFn: async (): Promise<PublicMetrics> => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!supabaseUrl) {
        console.warn("NEXT_PUBLIC_SUPABASE_URL not configured, using fallback metrics");
        return FALLBACK_METRICS;
      }

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/public-metrics`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.warn(`Public metrics API returned ${response.status}, using fallback`);
          return FALLBACK_METRICS;
        }

        const result: PublicMetricsResponse = await response.json();

        if (!result.success || !result.data) {
          console.warn("Public metrics response invalid, using fallback");
          return FALLBACK_METRICS;
        }

        return result.data;
      } catch (error) {
        console.warn("Failed to fetch public metrics, using fallback:", error);
        return FALLBACK_METRICS;
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
 * e.g., 2500000 -> "2.5M+"
 */
export function formatMetricValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M+`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K+`;
  }
  return value.toString();
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
