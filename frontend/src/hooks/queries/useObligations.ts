// src/hooks/queries/useObligations.ts
// React Query hooks for Obligation Management

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  Obligation,
  ObligationListItem,
  CalendarMonth,
  CalendarObligation,
  ObligationStats,
  ObligationFilters,
  CreateObligationPayload,
  UpdateObligationPayload,
  CompleteObligationPayload,
  EscalateObligationPayload,
  AddDependencyPayload,
  ObligationStatus,
  ObligationType,
  ObligationPriority,
  DependencyGraph,
} from "@/types/obligations.types";
import { createClient } from "@/utils/supabase/client";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch list of obligations
 */
export function useObligationList(
  enterpriseId: string,
  filters?: ObligationFilters
) {
  return useQuery({
    queryKey: queryKeys.obligationList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("obligations")
        .select(`
          id,
          title,
          obligation_type,
          status,
          priority,
          due_date,
          contract_id,
          contracts (
            id,
            title
          ),
          assignees:obligation_assignees (id)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("due_date", { ascending: true });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in("priority", filters.priority);
        } else {
          query = query.eq("priority", filters.priority);
        }
      }

      if (filters?.obligation_type) {
        if (Array.isArray(filters.obligation_type)) {
          query = query.in("obligation_type", filters.obligation_type);
        } else {
          query = query.eq("obligation_type", filters.obligation_type);
        }
      }

      if (filters?.contract_id) {
        query = query.eq("contract_id", filters.contract_id);
      }

      if (filters?.due_from) {
        query = query.gte("due_date", filters.due_from);
      }

      if (filters?.due_to) {
        query = query.lte("due_date", filters.due_to);
      }

      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();

      return (data || []).map((item: Record<string, unknown>) => {
        const dueDate = new Date(item.due_date as string);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: item.id,
          title: item.title,
          obligation_type: item.obligation_type,
          status: item.status,
          priority: item.priority,
          due_date: item.due_date,
          contract_id: item.contract_id,
          contract_title: (item.contracts as Record<string, string>)?.title || "Unknown",
          assignee_count: (item.assignees as unknown[])?.length || 0,
          is_overdue: item.status !== "completed" && item.status !== "cancelled" && daysUntilDue < 0,
          days_until_due: daysUntilDue,
        };
      }) as ObligationListItem[];
    },
    enabled: !!enterpriseId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single obligation with details
 */
export function useObligation(obligationId: string) {
  return useQuery({
    queryKey: queryKeys.obligation(obligationId),
    queryFn: async () => {
      const { data: obligation, error: obligationError } = await supabase
        .from("obligations")
        .select(`
          *,
          contracts (
            id,
            title,
            contract_number,
            vendors (name)
          )
        `)
        .eq("id", obligationId)
        .single();

      if (obligationError) throw obligationError;

      // Fetch assignees
      const { data: assignees, error: assigneesError } = await supabase
        .from("obligation_assignees")
        .select(`
          *,
          user:users (
            id,
            raw_user_meta_data
          )
        `)
        .eq("obligation_id", obligationId);

      if (assigneesError) throw assigneesError;

      // Fetch dependencies
      const { data: dependencies, error: depsError } = await supabase
        .from("obligation_dependencies")
        .select(`
          *,
          depends_on:obligations!depends_on_id (
            id,
            title,
            status,
            due_date
          )
        `)
        .eq("obligation_id", obligationId);

      if (depsError) throw depsError;

      // Fetch performance
      const { data: performance, error: perfError } = await supabase
        .from("obligation_performance_tracking")
        .select("*")
        .eq("obligation_id", obligationId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...obligation,
        contract: obligation.contracts ? {
          id: obligation.contracts.id,
          title: obligation.contracts.title,
          contract_number: obligation.contracts.contract_number,
          vendor_name: obligation.contracts.vendors?.name,
        } : undefined,
        assignees: (assignees || []).map((a: Record<string, unknown>) => ({
          ...a,
          user: a.user ? {
            id: (a.user as Record<string, unknown>).id,
            full_name: ((a.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
            email: ((a.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.email || "",
          } : undefined,
        })),
        dependencies: dependencies || [],
        performance: perfError ? undefined : performance,
      } as Obligation;
    },
    enabled: !!obligationId,
  });
}

/**
 * Fetch obligations for calendar view
 */
export function useObligationCalendar(
  enterpriseId: string,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: queryKeys.obligationCalendar(year, month),
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data, error } = await supabase
        .from("obligations")
        .select(`
          id,
          title,
          status,
          priority,
          obligation_type,
          due_date,
          frequency,
          contracts (title)
        `)
        .eq("enterprise_id", enterpriseId)
        .gte("due_date", startDate.toISOString())
        .lte("due_date", endDate.toISOString())
        .order("due_date", { ascending: true });

      if (error) throw error;

      const obligations: CalendarObligation[] = (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        title: item.title as string,
        date: item.due_date as string,
        status: item.status as ObligationStatus,
        priority: item.priority as ObligationPriority,
        obligation_type: item.obligation_type as ObligationType,
        contract_title: (item.contracts as Record<string, string>)?.title || "Unknown",
        is_recurring: item.frequency !== "one_time",
      }));

      const summary = {
        total: obligations.length,
        pending: obligations.filter((o) => o.status === "pending").length,
        completed: obligations.filter((o) => o.status === "completed").length,
        overdue: obligations.filter((o) => o.status === "overdue").length,
      };

      return {
        year,
        month,
        obligations,
        summary,
      } as CalendarMonth;
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch obligation dependency graph
 */
export function useObligationDependencies(obligationId: string) {
  return useQuery({
    queryKey: queryKeys.obligationDependencies(obligationId),
    queryFn: async () => {
      // Fetch all dependencies recursively
      const { data: deps, error } = await supabase
        .from("obligation_dependencies")
        .select(`
          *,
          obligation:obligations!obligation_id (
            id,
            title,
            status,
            due_date,
            priority
          ),
          depends_on:obligations!depends_on_id (
            id,
            title,
            status,
            due_date,
            priority
          )
        `)
        .or(`obligation_id.eq.${obligationId},depends_on_id.eq.${obligationId}`);

      if (error) throw error;

      // Build graph
      const nodesMap = new Map<string, { id: string; title: string; status: ObligationStatus; due_date: string; priority: ObligationPriority; depth: number }>();
      const edges: { source: string; target: string; type: string }[] = [];

      (deps || []).forEach((dep: Record<string, unknown>) => {
        const obligation = dep.obligation as Record<string, unknown>;
        const dependsOn = dep.depends_on as Record<string, unknown>;

        if (obligation && !nodesMap.has(obligation.id as string)) {
          nodesMap.set(obligation.id as string, {
            id: obligation.id as string,
            title: obligation.title as string,
            status: obligation.status as ObligationStatus,
            due_date: obligation.due_date as string,
            priority: obligation.priority as ObligationPriority,
            depth: 0,
          });
        }

        if (dependsOn && !nodesMap.has(dependsOn.id as string)) {
          nodesMap.set(dependsOn.id as string, {
            id: dependsOn.id as string,
            title: dependsOn.title as string,
            status: dependsOn.status as ObligationStatus,
            due_date: dependsOn.due_date as string,
            priority: dependsOn.priority as ObligationPriority,
            depth: 1,
          });
        }

        if (obligation && dependsOn) {
          edges.push({
            source: dep.depends_on_id as string,
            target: dep.obligation_id as string,
            type: dep.dependency_type as string,
          });
        }
      });

      return {
        nodes: Array.from(nodesMap.values()),
        edges,
      } as DependencyGraph;
    },
    enabled: !!obligationId,
  });
}

/**
 * Fetch obligation statistics
 */
export function useObligationStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.obligationStats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obligations")
        .select("status, priority, obligation_type, due_date")
        .eq("enterprise_id", enterpriseId);

      if (error) throw error;

      const obligationData = data || [];
      const now = new Date();
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const byStatus: Record<ObligationStatus, number> = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        waived: 0,
        cancelled: 0,
      };

      const byPriority: Record<ObligationPriority, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      const byType: Record<ObligationType, number> = {
        payment: 0,
        delivery: 0,
        reporting: 0,
        compliance: 0,
        renewal: 0,
        notice: 0,
        performance: 0,
        audit: 0,
        insurance: 0,
        confidentiality: 0,
        other: 0,
      };

      let overdue = 0;
      let dueThisWeek = 0;
      let dueThisMonth = 0;

      obligationData.forEach((o: { status: ObligationStatus; priority: ObligationPriority; obligation_type: ObligationType; due_date: string }) => {
        byStatus[o.status]++;
        byPriority[o.priority]++;
        if (byType[o.obligation_type] !== undefined) {
          byType[o.obligation_type]++;
        }

        const dueDate = new Date(o.due_date);
        if (o.status !== "completed" && o.status !== "cancelled") {
          if (dueDate < now) overdue++;
          else if (dueDate <= oneWeek) dueThisWeek++;
          else if (dueDate <= oneMonth) dueThisMonth++;
        }
      });

      // Calculate health score (simplified)
      const total = obligationData.length;
      const completed = byStatus.completed;
      const healthScore = total > 0 ? Math.round((completed / total) * 100 - (overdue / total) * 50) : 100;

      return {
        total,
        by_status: byStatus,
        by_priority: byPriority,
        by_type: byType,
        overdue,
        due_this_week: dueThisWeek,
        due_this_month: dueThisMonth,
        health_score: Math.max(0, Math.min(100, healthScore)),
        performance_metrics: {
          on_time_rate: total > 0 ? (completed - overdue) / total : 1,
          average_delay_days: 0,
          completion_rate: total > 0 ? completed / total : 1,
          overdue_count: overdue,
          upcoming_count: dueThisWeek,
          health_score: Math.max(0, Math.min(100, healthScore)),
          trend: "stable" as const,
        },
      } as ObligationStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new obligation
 */
export function useCreateObligation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createObligation,
    mutationFn: async ({
      enterpriseId,
      data,
    }: {
      enterpriseId: string;
      data: CreateObligationPayload;
    }) => {
      const { data: obligation, error } = await supabase
        .from("obligations")
        .insert({
          enterprise_id: enterpriseId,
          contract_id: data.contract_id,
          title: data.title,
          description: data.description,
          obligation_type: data.obligation_type,
          priority: data.priority,
          due_date: data.due_date,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          frequency: data.frequency || "one_time",
          recurrence_rule: data.recurrence_rule || null,
          responsible_party: data.responsible_party || "internal",
          clause_reference: data.clause_reference || null,
          source_text: data.source_text || null,
          metadata: data.metadata || {},
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Add assignees if provided
      if (data.assignee_ids?.length) {
        const { error: assigneeError } = await supabase
          .from("obligation_assignees")
          .insert(
            data.assignee_ids.map((userId, index) => ({
              obligation_id: obligation.id,
              user_id: userId,
              role: index === 0 ? "primary" : "backup",
              assigned_by: enterpriseId,
            }))
          );

        if (assigneeError) throw assigneeError;
      }

      return obligation as Obligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obligations() });
      toast.success("Obligation created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create obligation: ${error.message}`);
    },
  });
}

/**
 * Update an obligation
 */
export function useUpdateObligation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateObligation,
    mutationFn: async ({
      obligationId,
      data,
    }: {
      obligationId: string;
      data: UpdateObligationPayload;
    }) => {
      const { data: obligation, error } = await supabase
        .from("obligations")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", obligationId)
        .select()
        .single();

      if (error) throw error;
      return obligation as Obligation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obligations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.obligation(data.id) });
      toast.success("Obligation updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update obligation: ${error.message}`);
    },
  });
}

/**
 * Complete an obligation
 */
export function useCompleteObligation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.completeObligation,
    mutationFn: async ({
      obligationId,
      userId,
      data,
    }: {
      obligationId: string;
      userId: string;
      data: CompleteObligationPayload;
    }) => {
      // Update obligation status
      const { data: obligation, error: obligationError } = await supabase
        .from("obligations")
        .update({
          status: "completed",
          completed_at: data.completion_date || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", obligationId)
        .select()
        .single();

      if (obligationError) throw obligationError;

      // Record performance
      const { error: perfError } = await supabase
        .from("obligation_performance_tracking")
        .insert({
          obligation_id: obligationId,
          expected_date: obligation.due_date,
          actual_date: data.completion_date || new Date().toISOString(),
          actual_value: data.actual_value || null,
          notes: data.notes || null,
          recorded_by: userId,
        });

      if (perfError) throw perfError;

      // Add evidence if provided
      if (data.evidence?.length) {
        const { error: evidenceError } = await supabase
          .from("completion_evidence")
          .insert(
            data.evidence.map((e) => ({
              obligation_id: obligationId,
              evidence_type: e.evidence_type,
              title: e.title,
              description: e.description || null,
              file_path: e.file_path || null,
              external_url: e.external_url || null,
              uploaded_by: userId,
            }))
          );

        if (evidenceError) throw evidenceError;
      }

      return obligation as Obligation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obligations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.obligation(data.id) });
      toast.success("Obligation completed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to complete obligation: ${error.message}`);
    },
  });
}

/**
 * Escalate an obligation
 */
export function useEscalateObligation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.escalateObligation,
    mutationFn: async ({
      obligationId,
      userId,
      data,
    }: {
      obligationId: string;
      userId: string;
      data: EscalateObligationPayload;
    }) => {
      // Get current escalation level
      const { data: currentEscalations } = await supabase
        .from("obligation_escalations")
        .select("escalation_level")
        .eq("obligation_id", obligationId)
        .order("escalation_level", { ascending: false })
        .limit(1);

      const nextLevel = ((currentEscalations?.[0]?.escalation_level || 0) + 1) as 1 | 2 | 3 | 4 | 5;

      const { data: escalation, error } = await supabase
        .from("obligation_escalations")
        .insert({
          obligation_id: obligationId,
          escalation_level: Math.min(nextLevel, 5),
          escalated_to: data.escalate_to_user_id,
          escalated_by: userId,
          reason: data.reason,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return escalation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.obligation(variables.obligationId),
      });
      toast.success("Obligation escalated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to escalate obligation: ${error.message}`);
    },
  });
}

/**
 * Add a dependency between obligations
 */
export function useAddObligationDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.addObligationDependency,
    mutationFn: async ({
      obligationId,
      data,
    }: {
      obligationId: string;
      data: AddDependencyPayload;
    }) => {
      const { data: dependency, error } = await supabase
        .from("obligation_dependencies")
        .insert({
          obligation_id: obligationId,
          depends_on_id: data.depends_on_id,
          dependency_type: data.dependency_type,
          cascade_on_delay: data.cascade_on_delay ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return dependency;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.obligation(variables.obligationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.obligationDependencies(variables.obligationId),
      });
      toast.success("Dependency added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add dependency: ${error.message}`);
    },
  });
}

/**
 * Remove a dependency
 */
export function useRemoveObligationDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.removeObligationDependency,
    mutationFn: async ({
      dependencyId,
      obligationId,
    }: {
      dependencyId: string;
      obligationId: string;
    }) => {
      const { error } = await supabase
        .from("obligation_dependencies")
        .delete()
        .eq("id", dependencyId);

      if (error) throw error;
      return { dependencyId, obligationId };
    },
    onSuccess: ({ obligationId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.obligation(obligationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.obligationDependencies(obligationId),
      });
      toast.success("Dependency removed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to remove dependency: ${error.message}`);
    },
  });
}

/**
 * Delete an obligation
 */
export function useDeleteObligation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteObligation,
    mutationFn: async (obligationId: string) => {
      const { error } = await supabase
        .from("obligations")
        .delete()
        .eq("id", obligationId);

      if (error) throw error;
      return obligationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.obligations() });
      toast.success("Obligation deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete obligation: ${error.message}`);
    },
  });
}
