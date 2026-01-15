// src/hooks/queries/useApprovals.ts
// React Query hooks for Approval Matrix management

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  ApprovalMatrix,
  ApprovalMatrixListItem,
  ApprovalMatrixRule,
  ApprovalDelegation,
  PendingApproval,
  ApprovalRoutingHistory,
  ApprovalMatrixFilters,
  PendingApprovalFilters,
  RoutingHistoryFilters,
  ApprovalStats,
  CreateApprovalMatrixPayload,
  UpdateApprovalMatrixPayload,
  CreateApprovalRulePayload,
  UpdateApprovalRulePayload,
  CreateDelegationPayload,
  ApprovalDecisionPayload,
  AppliesTo,
  RoutingStatus,
} from "@/types/approvals.types";
import { createClient } from "@/utils/supabase/client";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch list of approval matrices
 */
export function useApprovalMatrixList(
  enterpriseId: string,
  filters?: ApprovalMatrixFilters
) {
  return useQuery({
    queryKey: queryKeys.approvalMatrixList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("approval_matrices")
        .select(`
          id,
          name,
          description,
          applies_to,
          status,
          is_default,
          created_at,
          updated_at,
          rules:approval_matrix_rules (id)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("priority", { ascending: true });

      if (filters?.applies_to) {
        query = query.eq("applies_to", filters.applies_to);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      if (filters?.is_default !== undefined) {
        query = query.eq("is_default", filters.is_default);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        applies_to: item.applies_to,
        status: item.status,
        is_default: item.is_default,
        rules_count: (item.rules as unknown[])?.length || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as ApprovalMatrixListItem[];
    },
    enabled: !!enterpriseId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch single approval matrix with rules
 */
export function useApprovalMatrix(matrixId: string) {
  return useQuery({
    queryKey: queryKeys.approvalMatrix(matrixId),
    queryFn: async () => {
      const { data: matrix, error: matrixError } = await supabase
        .from("approval_matrices")
        .select(`
          *,
          creator:created_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("id", matrixId)
        .single();

      if (matrixError) throw matrixError;

      // Fetch rules
      const { data: rules, error: rulesError } = await supabase
        .from("approval_matrix_rules")
        .select("*")
        .eq("matrix_id", matrixId)
        .order("priority", { ascending: true });

      if (rulesError) throw rulesError;

      return {
        ...matrix,
        rules: rules || [],
        creator: matrix.creator ? {
          id: matrix.creator.id,
          full_name: matrix.creator.raw_user_meta_data?.full_name || "Unknown",
        } : undefined,
      } as ApprovalMatrix;
    },
    enabled: !!matrixId,
  });
}

/**
 * Fetch pending approvals for current user
 */
export function usePendingApprovals(
  enterpriseId: string,
  userId: string,
  filters?: PendingApprovalFilters
) {
  return useQuery({
    queryKey: queryKeys.pendingApprovals({ enterpriseId, userId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("approval_routing_history")
        .select(`
          id,
          entity_type,
          entity_id,
          status,
          due_at,
          created_at,
          matrix:approval_matrices (name),
          rule:approval_matrix_rules (name)
        `)
        .eq("enterprise_id", enterpriseId)
        .eq("approver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (filters?.entity_type) {
        query = query.eq("entity_type", filters.entity_type);
      }

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();

      // Enrich with entity details
      const enrichedData = await Promise.all(
        (data || []).map(async (item: Record<string, unknown>) => {
          let entityTitle = "Unknown";

          // Fetch entity title based on type
          if (item.entity_type === "contracts") {
            const { data: contract } = await supabase
              .from("contracts")
              .select("title")
              .eq("id", item.entity_id)
              .single();
            entityTitle = contract?.title || "Unknown Contract";
          } else if (item.entity_type === "intake_submissions") {
            const { data: submission } = await supabase
              .from("intake_submissions")
              .select("submission_number")
              .eq("id", item.entity_id)
              .single();
            entityTitle = submission?.submission_number || "Unknown Submission";
          }

          return {
            id: item.id,
            entity_type: item.entity_type as AppliesTo,
            entity_id: item.entity_id as string,
            entity_title: entityTitle,
            matrix_name: (item.matrix as Record<string, string>)?.name || "Unknown",
            rule_name: (item.rule as Record<string, string>)?.name || "Unknown",
            requested_at: item.created_at as string,
            due_at: item.due_at as string | null,
            is_overdue: item.due_at ? new Date(item.due_at as string) < now : false,
            requester: { id: "", full_name: "System", email: "" },
            current_approvers: [],
            approval_progress: { total: 1, approved: 0, rejected: 0, pending: 1 },
          };
        })
      );

      if (filters?.is_overdue !== undefined) {
        return enrichedData.filter((item) => item.is_overdue === filters.is_overdue);
      }

      return enrichedData as PendingApproval[];
    },
    enabled: !!enterpriseId && !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch routing history
 */
export function useRoutingHistory(
  enterpriseId: string,
  filters?: RoutingHistoryFilters
) {
  return useQuery({
    queryKey: queryKeys.routingHistory({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("approval_routing_history")
        .select(`
          *,
          approver:users!approver_id (
            id,
            raw_user_meta_data
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.entity_type) {
        query = query.eq("entity_type", filters.entity_type);
      }

      if (filters?.entity_id) {
        query = query.eq("entity_id", filters.entity_id);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.approver_id) {
        query = query.eq("approver_id", filters.approver_id);
      }

      if (filters?.date_from) {
        query = query.gte("created_at", filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte("created_at", filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        ...item,
        approver: item.approver ? {
          id: (item.approver as Record<string, unknown>).id,
          full_name: ((item.approver as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
          email: ((item.approver as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.email || "",
        } : undefined,
      })) as ApprovalRoutingHistory[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch delegations
 */
export function useDelegations(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.delegations(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_delegations")
        .select(`
          *,
          delegator:users!delegator_id (
            id,
            raw_user_meta_data
          ),
          delegate:users!delegate_id (
            id,
            raw_user_meta_data
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        ...item,
        delegator: item.delegator ? {
          id: (item.delegator as Record<string, unknown>).id,
          full_name: ((item.delegator as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
          email: ((item.delegator as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.email || "",
        } : undefined,
        delegate: item.delegate ? {
          id: (item.delegate as Record<string, unknown>).id,
          full_name: ((item.delegate as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
          email: ((item.delegate as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.email || "",
        } : undefined,
      })) as ApprovalDelegation[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch approval statistics
 */
export function useApprovalStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.approvalStats(),
    queryFn: async () => {
      const { data: history, error } = await supabase
        .from("approval_routing_history")
        .select("status, entity_type, decision_at, created_at")
        .eq("enterprise_id", enterpriseId);

      if (error) throw error;

      const historyData = history || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pending = historyData.filter((h: { status: RoutingStatus }) => h.status === "pending").length;
      const approvedToday = historyData.filter((h: { status: RoutingStatus; decision_at: string | null }) =>
        h.status === "approved" && h.decision_at && new Date(h.decision_at) >= today
      ).length;
      const rejectedToday = historyData.filter((h: { status: RoutingStatus; decision_at: string | null }) =>
        h.status === "rejected" && h.decision_at && new Date(h.decision_at) >= today
      ).length;
      const overdue = historyData.filter((h: { status: RoutingStatus; due_at: string | null }) =>
        h.status === "pending" && h.due_at && new Date(h.due_at) < new Date()
      ).length;

      // Calculate average approval time
      const completedWithTime = historyData.filter((h: { status: RoutingStatus; decision_at: string | null }) =>
        (h.status === "approved" || h.status === "rejected") && h.decision_at
      );

      let avgTime = 0;
      if (completedWithTime.length > 0) {
        const totalHours = completedWithTime.reduce((sum: number, h: { created_at: string; decision_at: string }) => {
          const created = new Date(h.created_at).getTime();
          const decided = new Date(h.decision_at).getTime();
          return sum + (decided - created) / (1000 * 60 * 60);
        }, 0);
        avgTime = totalHours / completedWithTime.length;
      }

      // Group by entity type
      const byEntityType: Record<AppliesTo, { pending: number; approved: number; rejected: number }> = {
        contracts: { pending: 0, approved: 0, rejected: 0 },
        intake_submissions: { pending: 0, approved: 0, rejected: 0 },
        purchase_orders: { pending: 0, approved: 0, rejected: 0 },
        vendor_onboarding: { pending: 0, approved: 0, rejected: 0 },
        amendments: { pending: 0, approved: 0, rejected: 0 },
        renewals: { pending: 0, approved: 0, rejected: 0 },
        all: { pending: 0, approved: 0, rejected: 0 },
      };

      historyData.forEach((h: { entity_type: AppliesTo; status: RoutingStatus }) => {
        if (byEntityType[h.entity_type]) {
          if (h.status === "pending") byEntityType[h.entity_type].pending++;
          else if (h.status === "approved") byEntityType[h.entity_type].approved++;
          else if (h.status === "rejected") byEntityType[h.entity_type].rejected++;
        }
      });

      return {
        pending,
        approved_today: approvedToday,
        rejected_today: rejectedToday,
        overdue,
        average_approval_time_hours: Math.round(avgTime * 10) / 10,
        by_entity_type: byEntityType,
      } as ApprovalStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new approval matrix
 */
export function useCreateApprovalMatrix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createApprovalMatrix,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: CreateApprovalMatrixPayload;
    }) => {
      const { data: matrix, error } = await supabase
        .from("approval_matrices")
        .insert({
          enterprise_id: enterpriseId,
          name: data.name,
          description: data.description || null,
          applies_to: data.applies_to,
          is_default: data.is_default || false,
          priority: data.priority || 0,
          status: "draft",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return matrix as ApprovalMatrix;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
      toast.success("Approval matrix created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create approval matrix: ${error.message}`);
    },
  });
}

/**
 * Update an approval matrix
 */
export function useUpdateApprovalMatrix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateApprovalMatrix,
    mutationFn: async ({
      matrixId,
      data,
    }: {
      matrixId: string;
      data: UpdateApprovalMatrixPayload;
    }) => {
      const { data: matrix, error } = await supabase
        .from("approval_matrices")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matrixId)
        .select()
        .single();

      if (error) throw error;
      return matrix as ApprovalMatrix;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalMatrix(data.id) });
      toast.success("Approval matrix updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update approval matrix: ${error.message}`);
    },
  });
}

/**
 * Delete an approval matrix
 */
export function useDeleteApprovalMatrix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteApprovalMatrix,
    mutationFn: async (matrixId: string) => {
      const { error } = await supabase
        .from("approval_matrices")
        .delete()
        .eq("id", matrixId);

      if (error) throw error;
      return matrixId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
      toast.success("Approval matrix deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete approval matrix: ${error.message}`);
    },
  });
}

/**
 * Create an approval rule
 */
export function useCreateApprovalRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createApprovalRule,
    mutationFn: async (data: CreateApprovalRulePayload) => {
      const { data: rule, error } = await supabase
        .from("approval_matrix_rules")
        .insert({
          matrix_id: data.matrix_id,
          name: data.name,
          description: data.description || null,
          priority: data.priority || 0,
          conditions: data.conditions,
          action: data.action,
          approvers: data.approvers,
          approval_mode: data.approval_mode,
          approval_percentage: data.approval_percentage || null,
          escalation_rules: data.escalation_rules || null,
          sla_hours: data.sla_hours || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return rule as ApprovalMatrixRule;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvalMatrix(variables.matrix_id),
      });
      toast.success("Approval rule created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create approval rule: ${error.message}`);
    },
  });
}

/**
 * Update an approval rule
 */
export function useUpdateApprovalRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateApprovalRule,
    mutationFn: async ({
      ruleId,
      matrixId,
      data,
    }: {
      ruleId: string;
      matrixId: string;
      data: UpdateApprovalRulePayload;
    }) => {
      const { data: rule, error } = await supabase
        .from("approval_matrix_rules")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ruleId)
        .select()
        .single();

      if (error) throw error;
      return { rule: rule as ApprovalMatrixRule, matrixId };
    },
    onSuccess: ({ matrixId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvalMatrix(matrixId),
      });
      toast.success("Approval rule updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update approval rule: ${error.message}`);
    },
  });
}

/**
 * Delete an approval rule
 */
export function useDeleteApprovalRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteApprovalRule,
    mutationFn: async ({
      ruleId,
      matrixId,
    }: {
      ruleId: string;
      matrixId: string;
    }) => {
      const { error } = await supabase
        .from("approval_matrix_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
      return { ruleId, matrixId };
    },
    onSuccess: ({ matrixId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvalMatrix(matrixId),
      });
      toast.success("Approval rule deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete approval rule: ${error.message}`);
    },
  });
}

/**
 * Create a delegation
 */
export function useCreateDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createDelegation,
    mutationFn: async ({
      enterpriseId,
      delegatorId,
      data,
    }: {
      enterpriseId: string;
      delegatorId: string;
      data: CreateDelegationPayload;
    }) => {
      const { data: delegation, error } = await supabase
        .from("approval_delegations")
        .insert({
          enterprise_id: enterpriseId,
          delegator_id: delegatorId,
          delegate_id: data.delegate_id,
          applies_to: data.applies_to,
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return delegation as ApprovalDelegation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegations() });
      toast.success("Delegation created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create delegation: ${error.message}`);
    },
  });
}

/**
 * Delete a delegation
 */
export function useDeleteDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteDelegation,
    mutationFn: async (delegationId: string) => {
      const { error } = await supabase
        .from("approval_delegations")
        .delete()
        .eq("id", delegationId);

      if (error) throw error;
      return delegationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegations() });
      toast.success("Delegation removed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to remove delegation: ${error.message}`);
    },
  });
}

/**
 * Submit an approval decision
 */
export function useSubmitApprovalDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.submitApprovalDecision,
    mutationFn: async (payload: ApprovalDecisionPayload) => {
      const { data, error } = await supabase
        .from("approval_routing_history")
        .update({
          status: payload.decision === "approve" ? "approved" : "rejected",
          comments: payload.comments || null,
          decision_at: new Date().toISOString(),
        })
        .eq("id", payload.routing_id)
        .select()
        .single();

      if (error) throw error;
      return data as ApprovalRoutingHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
      toast.success("Decision submitted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to submit decision: ${error.message}`);
    },
  });
}
