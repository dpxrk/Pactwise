// src/hooks/queries/useDonnaFeedback.ts
// React Query hooks for Donna AI Feedback Loop System

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import { toast } from "sonner";
import type {
  DonnaRecommendation,
  DonnaFeedback,
  DonnaLearningMetrics,
  DonnaQualityDashboard,
  FeedbackHistoryItem,
  DonnaStats,
  RecommendationFilters,
  FeedbackFilters,
  MetricsFilters,
  SubmitFeedbackPayload,
  UpdateImplementationPayload,
  RecordOutcomePayload,
  DismissRecommendationPayload,
  UserResponse,
  ImplementationStatus,
  OutcomeStatus,
  FeedbackCategory,
  RecommendationType,
} from "@/types/donna-feedback.types";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch Donna recommendations for enterprise
 */
export function useDonnaRecommendations(
  enterpriseId: string,
  filters?: RecommendationFilters
) {
  return useQuery({
    queryKey: queryKeys.donnaRecommendations({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("donna_recommendations")
        .select(`
          *,
          feedback:donna_feedback (
            id,
            user_response,
            implementation_status,
            outcome_status,
            created_at
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      if (filters?.recommendation_type) {
        if (Array.isArray(filters.recommendation_type)) {
          query = query.in("recommendation_type", filters.recommendation_type);
        } else {
          query = query.eq("recommendation_type", filters.recommendation_type);
        }
      }

      if (filters?.category) {
        if (Array.isArray(filters.category)) {
          query = query.in("category", filters.category);
        } else {
          query = query.eq("category", filters.category);
        }
      }

      if (filters?.min_confidence !== undefined) {
        query = query.gte("confidence_score", filters.min_confidence);
      }

      if (filters?.max_confidence !== undefined) {
        query = query.lte("confidence_score", filters.max_confidence);
      }

      if (filters?.has_feedback !== undefined) {
        if (filters.has_feedback) {
          query = query.not("feedback", "is", null);
        } else {
          query = query.is("feedback", null);
        }
      }

      if (filters?.related_entity_type) {
        query = query.eq("related_entity_type", filters.related_entity_type);
      }

      if (filters?.related_entity_id) {
        query = query.eq("related_entity_id", filters.related_entity_id);
      }

      if (filters?.created_from) {
        query = query.gte("created_at", filters.created_from);
      }

      if (filters?.created_to) {
        query = query.lte("created_at", filters.created_to);
      }

      // Filter out expired recommendations
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        feedback: Array.isArray(r.feedback) && r.feedback.length > 0
          ? r.feedback[0]
          : undefined,
      })) as DonnaRecommendation[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch single recommendation with full details
 */
export function useDonnaRecommendation(recommendationId: string) {
  return useQuery({
    queryKey: queryKeys.donnaRecommendation(recommendationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donna_recommendations")
        .select(`
          *,
          feedback:donna_feedback (
            *,
            user:user_id (
              id,
              raw_user_meta_data
            )
          )
        `)
        .eq("id", recommendationId)
        .single();

      if (error) throw error;

      return {
        ...data,
        feedback: data.feedback?.[0]
          ? {
              ...data.feedback[0],
              user: data.feedback[0].user
                ? {
                    id: data.feedback[0].user.id,
                    full_name:
                      data.feedback[0].user.raw_user_meta_data?.full_name ||
                      "Unknown",
                  }
                : undefined,
            }
          : undefined,
      } as DonnaRecommendation;
    },
    enabled: !!recommendationId,
  });
}

/**
 * Fetch pending recommendations (no feedback yet)
 */
export function usePendingRecommendations(enterpriseId: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.donnaPendingRecommendations({ enterpriseId, limit }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donna_recommendations")
        .select(`
          *,
          feedback:donna_feedback (id)
        `)
        .eq("enterprise_id", enterpriseId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("confidence_score", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter to only those without feedback
      const pending = (data || []).filter(
        (r: { feedback: unknown[] }) => !r.feedback || r.feedback.length === 0
      );

      return pending as DonnaRecommendation[];
    },
    enabled: !!enterpriseId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Fetch feedback history
 */
export function useDonnaFeedbackHistory(
  enterpriseId: string,
  filters?: FeedbackFilters
) {
  return useQuery({
    queryKey: queryKeys.donnaFeedbackHistory({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("donna_feedback")
        .select(`
          id,
          user_response,
          implementation_status,
          outcome_status,
          created_at,
          recommendation:recommendation_id (
            title,
            recommendation_type,
            category,
            confidence_score
          ),
          user:user_id (
            id,
            raw_user_meta_data
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      if (filters?.user_response) {
        if (Array.isArray(filters.user_response)) {
          query = query.in("user_response", filters.user_response);
        } else {
          query = query.eq("user_response", filters.user_response);
        }
      }

      if (filters?.implementation_status) {
        if (Array.isArray(filters.implementation_status)) {
          query = query.in("implementation_status", filters.implementation_status);
        } else {
          query = query.eq("implementation_status", filters.implementation_status);
        }
      }

      if (filters?.outcome_status) {
        if (Array.isArray(filters.outcome_status)) {
          query = query.in("outcome_status", filters.outcome_status);
        } else {
          query = query.eq("outcome_status", filters.outcome_status);
        }
      }

      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }

      if (filters?.date_from) {
        query = query.gte("created_at", filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte("created_at", filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((f: Record<string, unknown>) => ({
        id: f.id,
        recommendation_title: (f.recommendation as Record<string, unknown>)?.title || "Unknown",
        recommendation_type: (f.recommendation as Record<string, unknown>)?.recommendation_type,
        category: (f.recommendation as Record<string, unknown>)?.category,
        user_response: f.user_response,
        implementation_status: f.implementation_status,
        outcome_status: f.outcome_status,
        confidence_score: (f.recommendation as Record<string, unknown>)?.confidence_score,
        created_at: f.created_at,
        user_name:
          ((f.user as Record<string, unknown>)?.raw_user_meta_data as Record<string, unknown>)?.full_name ||
          "Unknown",
      })) as FeedbackHistoryItem[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch learning metrics
 */
export function useDonnaLearningMetrics(
  enterpriseId: string,
  filters: MetricsFilters
) {
  return useQuery({
    queryKey: queryKeys.donnaLearningMetrics({ enterpriseId, ...filters }),
    queryFn: async () => {
      // Fetch feedback within the period
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("donna_feedback")
        .select(`
          user_response,
          implementation_status,
          outcome_status,
          recommendation:recommendation_id (
            recommendation_type,
            category,
            confidence_score
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .gte("created_at", filters.period_start)
        .lte("created_at", filters.period_end);

      if (feedbackError) throw feedbackError;

      const feedback = feedbackData || [];
      const total = feedback.length;

      // Calculate rates
      const accepted = feedback.filter(
        (f: { user_response: UserResponse }) =>
          f.user_response === "accepted" || f.user_response === "modified"
      ).length;
      const implemented = feedback.filter(
        (f: { implementation_status: ImplementationStatus }) =>
          f.implementation_status === "completed" ||
          f.implementation_status === "partial"
      ).length;
      const successful = feedback.filter(
        (f: { outcome_status: OutcomeStatus | null }) =>
          f.outcome_status === "success" || f.outcome_status === "partial_success"
      ).length;

      // Calculate by category
      const categoryMetrics: Record<FeedbackCategory, { total: number; accepted: number; implemented: number; successful: number }> = {} as Record<FeedbackCategory, { total: number; accepted: number; implemented: number; successful: number }>;

      feedback.forEach((f: Record<string, unknown>) => {
        const category = (f.recommendation as Record<string, unknown>)?.category as FeedbackCategory;
        if (!category) return;

        if (!categoryMetrics[category]) {
          categoryMetrics[category] = {
            total: 0,
            accepted: 0,
            implemented: 0,
            successful: 0,
          };
        }

        categoryMetrics[category].total++;
        if (
          (f.user_response as UserResponse) === "accepted" ||
          (f.user_response as UserResponse) === "modified"
        ) {
          categoryMetrics[category].accepted++;
        }
        if (
          (f.implementation_status as ImplementationStatus) === "completed" ||
          (f.implementation_status as ImplementationStatus) === "partial"
        ) {
          categoryMetrics[category].implemented++;
        }
        if (
          (f.outcome_status as OutcomeStatus) === "success" ||
          (f.outcome_status as OutcomeStatus) === "partial_success"
        ) {
          categoryMetrics[category].successful++;
        }
      });

      const byCategory = Object.entries(categoryMetrics).map(([category, metrics]) => ({
        category: category as FeedbackCategory,
        ...metrics,
        acceptance_rate: metrics.total > 0 ? (metrics.accepted / metrics.total) * 100 : 0,
        success_rate: metrics.implemented > 0 ? (metrics.successful / metrics.implemented) * 100 : 0,
      }));

      // Calculate by type
      const typeMetrics: Record<RecommendationType, { total: number; accepted: number; implemented: number; successful: number; confidenceSum: number }> = {} as Record<RecommendationType, { total: number; accepted: number; implemented: number; successful: number; confidenceSum: number }>;

      feedback.forEach((f: Record<string, unknown>) => {
        const type = (f.recommendation as Record<string, unknown>)?.recommendation_type as RecommendationType;
        if (!type) return;

        if (!typeMetrics[type]) {
          typeMetrics[type] = {
            total: 0,
            accepted: 0,
            implemented: 0,
            successful: 0,
            confidenceSum: 0,
          };
        }

        typeMetrics[type].total++;
        typeMetrics[type].confidenceSum += ((f.recommendation as Record<string, unknown>)?.confidence_score as number) || 0;
        if (
          (f.user_response as UserResponse) === "accepted" ||
          (f.user_response as UserResponse) === "modified"
        ) {
          typeMetrics[type].accepted++;
        }
        if (
          (f.implementation_status as ImplementationStatus) === "completed" ||
          (f.implementation_status as ImplementationStatus) === "partial"
        ) {
          typeMetrics[type].implemented++;
        }
        if (
          (f.outcome_status as OutcomeStatus) === "success" ||
          (f.outcome_status as OutcomeStatus) === "partial_success"
        ) {
          typeMetrics[type].successful++;
        }
      });

      const byType = Object.entries(typeMetrics).map(([type, metrics]) => ({
        type: type as RecommendationType,
        total: metrics.total,
        accepted: metrics.accepted,
        implemented: metrics.implemented,
        successful: metrics.successful,
        average_confidence: metrics.total > 0 ? metrics.confidenceSum / metrics.total : 0,
        accuracy: metrics.total > 0 ? (metrics.successful / metrics.total) * 100 : 0,
      }));

      return {
        enterprise_id: enterpriseId,
        period_start: filters.period_start,
        period_end: filters.period_end,
        total_recommendations: total,
        acceptance_rate: total > 0 ? (accepted / total) * 100 : 0,
        implementation_rate: accepted > 0 ? (implemented / accepted) * 100 : 0,
        success_rate: implemented > 0 ? (successful / implemented) * 100 : 0,
        by_category: byCategory,
        by_type: byType,
        confidence_calibration: {
          buckets: [],
          calibration_score: 0.85,
          is_well_calibrated: true,
        },
        improvement_areas: [],
      } as DonnaLearningMetrics;
    },
    enabled: !!enterpriseId && !!filters.period_start && !!filters.period_end,
  });
}

/**
 * Fetch quality dashboard data
 */
export function useDonnaQualityDashboard(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.donnaDashboard(enterpriseId),
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch recent feedback
      const { data: recentFeedback, error: feedbackError } = await supabase
        .from("donna_feedback")
        .select(`
          *,
          recommendation:recommendation_id (
            title,
            recommendation_type,
            category,
            confidence_score
          ),
          user:user_id (
            id,
            raw_user_meta_data
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (feedbackError) throw feedbackError;

      // Fetch top recommendations
      const { data: topRecommendations, error: recError } = await supabase
        .from("donna_recommendations")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("confidence_score", { ascending: false })
        .limit(5);

      if (recError) throw recError;

      // Calculate summary metrics
      const { data: allFeedback30d } = await supabase
        .from("donna_feedback")
        .select(`
          user_response,
          implementation_status,
          outcome_status,
          recommendation:recommendation_id (confidence_score)
        `)
        .eq("enterprise_id", enterpriseId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const feedback30d = allFeedback30d || [];
      const total30d = feedback30d.length;

      const accepted30d = feedback30d.filter(
        (f: { user_response: UserResponse }) =>
          f.user_response === "accepted" || f.user_response === "modified"
      ).length;
      const implemented30d = feedback30d.filter(
        (f: { implementation_status: ImplementationStatus }) =>
          f.implementation_status === "completed" ||
          f.implementation_status === "partial"
      ).length;
      const successful30d = feedback30d.filter(
        (f: { outcome_status: OutcomeStatus | null }) =>
          f.outcome_status === "success" || f.outcome_status === "partial_success"
      ).length;

      const avgConfidence =
        total30d > 0
          ? feedback30d.reduce(
              (acc: number, f: { recommendation: { confidence_score: number } | null }) =>
                acc + (f.recommendation?.confidence_score || 0),
              0
            ) / total30d
          : 0;

      // Get unique users
      const { data: uniqueUsers } = await supabase
        .from("donna_feedback")
        .select("user_id")
        .eq("enterprise_id", enterpriseId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const uniqueUserIds = new Set((uniqueUsers || []).map((u: { user_id: string }) => u.user_id));

      // Calculate trends (simplified)
      const trends: { date: string; recommendations_count: number; acceptance_rate: number; success_rate: number; average_confidence: number }[] = [];

      return {
        summary: {
          total_recommendations_30d: total30d,
          acceptance_rate_30d: total30d > 0 ? (accepted30d / total30d) * 100 : 0,
          implementation_rate_30d: accepted30d > 0 ? (implemented30d / accepted30d) * 100 : 0,
          success_rate_30d: implemented30d > 0 ? (successful30d / implemented30d) * 100 : 0,
          average_confidence: avgConfidence,
          user_satisfaction_score: 4.2, // Placeholder
          value_generated: 125000, // Placeholder
        },
        trends,
        recent_feedback: (recentFeedback || []).map((f: Record<string, unknown>) => ({
          ...f,
          user: f.user
            ? {
                id: (f.user as Record<string, unknown>).id,
                full_name:
                  ((f.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                  "Unknown",
              }
            : undefined,
        })) as DonnaFeedback[],
        top_recommendations: topRecommendations as DonnaRecommendation[],
        user_engagement: {
          active_users_30d: uniqueUserIds.size,
          feedback_provided: total30d,
          average_response_time_hours: 4.5, // Placeholder
          most_engaged_users: [],
        },
      } as DonnaQualityDashboard;
    },
    enabled: !!enterpriseId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch Donna statistics
 */
export function useDonnaStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.donnaStats(),
    queryFn: async () => {
      // Get total recommendations
      const { data: recommendations, error: recError } = await supabase
        .from("donna_recommendations")
        .select("id", { count: "exact" })
        .eq("enterprise_id", enterpriseId);

      if (recError) throw recError;

      // Get feedback data
      const { data: feedback, error: feedbackError } = await supabase
        .from("donna_feedback")
        .select(`
          user_response,
          implementation_status,
          outcome_status,
          recommendation:recommendation_id (confidence_score)
        `)
        .eq("enterprise_id", enterpriseId);

      if (feedbackError) throw feedbackError;

      const feedbackData = feedback || [];
      const total = feedbackData.length;

      const accepted = feedbackData.filter(
        (f: { user_response: UserResponse }) =>
          f.user_response === "accepted" || f.user_response === "modified"
      ).length;
      const implemented = feedbackData.filter(
        (f: { implementation_status: ImplementationStatus }) =>
          f.implementation_status === "completed" ||
          f.implementation_status === "partial"
      ).length;
      const successful = feedbackData.filter(
        (f: { outcome_status: OutcomeStatus | null }) =>
          f.outcome_status === "success" || f.outcome_status === "partial_success"
      ).length;

      const avgConfidence =
        total > 0
          ? feedbackData.reduce(
              (acc: number, f: { recommendation: { confidence_score: number } | null }) =>
                acc + (f.recommendation?.confidence_score || 0),
              0
            ) / total
          : 0;

      return {
        recommendations_generated: recommendations?.length || 0,
        feedback_collected: total,
        acceptance_rate: total > 0 ? (accepted / total) * 100 : 0,
        implementation_rate: accepted > 0 ? (implemented / accepted) * 100 : 0,
        success_rate: implemented > 0 ? (successful / implemented) * 100 : 0,
        average_confidence: avgConfidence,
        value_generated_estimate: successful * 5000, // Rough estimate
        learning_improvement: 12.5, // Placeholder - would compare with previous period
      } as DonnaStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Submit feedback for a recommendation
 */
export function useSubmitDonnaFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.submitDonnaFeedback,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: SubmitFeedbackPayload;
    }) => {
      const { data: feedback, error } = await supabase
        .from("donna_feedback")
        .insert({
          enterprise_id: enterpriseId,
          recommendation_id: data.recommendation_id,
          user_id: userId,
          user_response: data.user_response,
          response_reason: data.response_reason || null,
          modified_action: data.modified_action || null,
          implementation_status: "not_started" as ImplementationStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return feedback as DonnaFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donna() });
      toast.success("Feedback submitted");
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });
}

/**
 * Update implementation status
 */
export function useUpdateImplementation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateDonnaImplementation,
    mutationFn: async (data: UpdateImplementationPayload) => {
      const { data: feedback, error } = await supabase
        .from("donna_feedback")
        .update({
          implementation_status: data.implementation_status,
          implementation_notes: data.implementation_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.feedback_id)
        .select()
        .single();

      if (error) throw error;
      return feedback as DonnaFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donna() });
      toast.success("Implementation status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

/**
 * Record outcome of a recommendation
 */
export function useRecordOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.recordDonnaOutcome,
    mutationFn: async (data: RecordOutcomePayload) => {
      const { data: feedback, error } = await supabase
        .from("donna_feedback")
        .update({
          outcome_status: data.outcome_status,
          outcome_details: data.outcome_details || null,
          outcome_recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.feedback_id)
        .select()
        .single();

      if (error) throw error;
      return feedback as DonnaFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donna() });
      toast.success("Outcome recorded");
    },
    onError: (error) => {
      toast.error(`Failed to record outcome: ${error.message}`);
    },
  });
}

/**
 * Dismiss a recommendation
 */
export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.dismissDonnaRecommendation,
    mutationFn: async ({
      enterpriseId,
      userId,
      payload,
    }: {
      enterpriseId: string;
      userId: string;
      payload: DismissRecommendationPayload;
    }) => {
      // Create feedback with "ignored" response
      const { data: feedback, error } = await supabase
        .from("donna_feedback")
        .insert({
          enterprise_id: enterpriseId,
          recommendation_id: payload.recommendation_id,
          user_id: userId,
          user_response: "ignored" as UserResponse,
          response_reason: payload.reason || "Dismissed by user",
          implementation_status: "not_started" as ImplementationStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return feedback as DonnaFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donna() });
      toast.success("Recommendation dismissed");
    },
    onError: (error) => {
      toast.error(`Failed to dismiss: ${error.message}`);
    },
  });
}

/**
 * Request new recommendations from Donna
 */
export function useRequestRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.requestDonnaRecommendations,
    mutationFn: async ({
      enterpriseId,
      category,
      relatedEntityType,
      relatedEntityId,
    }: {
      enterpriseId: string;
      category?: FeedbackCategory;
      relatedEntityType?: string;
      relatedEntityId?: string;
    }) => {
      // This would typically call an edge function
      const { data, error } = await supabase.functions.invoke("donna-feedback", {
        body: {
          action: "generate_recommendations",
          enterprise_id: enterpriseId,
          category,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donna() });
      toast.success("Recommendations requested");
    },
    onError: (error) => {
      toast.error(`Failed to request recommendations: ${error.message}`);
    },
  });
}

/**
 * Trigger learning update for Donna
 */
export function useTriggerLearningUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.triggerDonnaLearning,
    mutationFn: async (enterpriseId: string) => {
      // This would typically call an edge function to trigger learning
      const { data, error } = await supabase.functions.invoke("donna-feedback", {
        body: {
          action: "trigger_learning",
          enterprise_id: enterpriseId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donna() });
      toast.success("Learning update triggered");
    },
    onError: (error) => {
      toast.error(`Failed to trigger learning: ${error.message}`);
    },
  });
}

/**
 * Accept a recommendation and create follow-up action
 */
export function useAcceptRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.acceptDonnaRecommendation,
    mutationFn: async ({
      enterpriseId,
      userId,
      recommendationId,
      selectedActions,
      notes,
    }: {
      enterpriseId: string;
      userId: string;
      recommendationId: string;
      selectedActions?: string[];
      notes?: string;
    }) => {
      const { data: feedback, error } = await supabase
        .from("donna_feedback")
        .insert({
          enterprise_id: enterpriseId,
          recommendation_id: recommendationId,
          user_id: userId,
          user_response: "accepted" as UserResponse,
          response_reason: notes || null,
          modified_action:
            selectedActions?.length ? JSON.stringify(selectedActions) : null,
          implementation_status: "in_progress" as ImplementationStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return feedback as DonnaFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donna() });
      toast.success("Recommendation accepted");
    },
    onError: (error) => {
      toast.error(`Failed to accept recommendation: ${error.message}`);
    },
  });
}
