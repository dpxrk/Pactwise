import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/react-query-config";
import type { Id } from "@/types/id.types";
import { createClient } from "@/utils/supabase/client";


const supabase = createClient();

// Budget type (based on database schema)
export interface Budget {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  total_amount: number;
  spent_amount: number;
  remaining_amount: number;
  period_start: string;
  period_end: string;
  category: string | null;
  owner_id: string | null;
  status: "active" | "completed" | "cancelled";
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Fetch all budgets
export function useBudgetList(
  enterpriseId: Id<"enterprises">,
  filters?: {
    status?: string;
    category?: string;
  }
) {
  return useQuery({
    queryKey: ["budgets", enterpriseId, filters],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("budgets")
        .select(`
          *,
          owner:users!owner_id(id, first_name, last_name, email)
        `)
        .eq("enterprise_id", enterpriseId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate utilization for each budget
      return (data || []).map((budget: Budget & { owner?: unknown }) => ({
        ...budget,
        utilization_percentage: budget.total_amount > 0
          ? Math.round((budget.spent_amount / budget.total_amount) * 10000) / 100
          : 0,
      }));
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single budget
export function useBudget(budgetId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["budget", budgetId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("budgets")
        .select(`
          *,
          owner:users!owner_id(id, first_name, last_name, email),
          contracts:contracts(
            id,
            title,
            value,
            status
          )
        `)
        .eq("id", budgetId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;

      const budgetData = data as Budget & { owner?: unknown; contracts?: unknown[] };
      return {
        ...budgetData,
        utilization_percentage: budgetData.total_amount > 0
          ? Math.round((budgetData.spent_amount / budgetData.total_amount) * 10000) / 100
          : 0,
      };
    },
    enabled: options?.enabled !== false && !!budgetId,
  });
}

// Create budget mutation
export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createBudget"],
    mutationFn: async (budgetData: Omit<Partial<Budget>, 'id' | 'created_at' | 'updated_at'>) => {
      // Calculate remaining amount
      const remaining = (budgetData.total_amount || 0) - (budgetData.spent_amount || 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("budgets")
        .insert({
          ...budgetData,
          remaining_amount: remaining,
          spent_amount: budgetData.spent_amount || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Budget;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["budgets"]
      });

      queryClient.setQueryData(
        ["budget", data.id],
        data
      );

      // Also invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardMetrics()
      });

      toast.success("Budget created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create budget: ${error.message}`);
    },
  });
}

// Update budget mutation
export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateBudget"],
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<Budget>
    }) => {
      // Recalculate remaining if total or spent changed
      let remaining_amount = updates.remaining_amount;
      if (updates.total_amount !== undefined || updates.spent_amount !== undefined) {
        const currentBudget = queryClient.getQueryData<Budget>(["budget", id]);
        const total = updates.total_amount ?? currentBudget?.total_amount ?? 0;
        const spent = updates.spent_amount ?? currentBudget?.spent_amount ?? 0;
        remaining_amount = total - spent;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("budgets")
        .update({
          ...updates,
          remaining_amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Budget;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({
        queryKey: ["budget", id]
      });

      const previousBudget = queryClient.getQueryData(
        ["budget", id]
      );

      queryClient.setQueryData(
        ["budget", id],
        (old: Budget | undefined) =>
          old ? { ...old, ...updates } : old
      );

      return { previousBudget };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousBudget) {
        queryClient.setQueryData(
          ["budget", variables.id],
          context.previousBudget
        );
      }
      toast.error(`Failed to update budget: ${error.message}`);
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({
        queryKey: ["budgets"]
      });

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardMetrics()
      });

      toast.success("Budget updated successfully");
    },
  });
}

// Delete (soft delete) budget mutation
export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["deleteBudget"],
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("budgets")
        .update({
          deleted_at: new Date().toISOString(),
          status: 'cancelled',
        })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({
        queryKey: ["budget", id]
      });

      queryClient.invalidateQueries({
        queryKey: ["budgets"]
      });

      // Invalidate dashboard metrics
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardMetrics()
      });

      toast.success("Budget deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete budget: ${error.message}`);
    },
  });
}

// Record budget expenditure
export function useRecordExpenditure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["recordExpenditure"],
    mutationFn: async ({
      budgetId,
      amount,
      description,
    }: {
      budgetId: string;
      amount: number;
      description?: string;
    }) => {
      // Get current budget
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentBudget, error: fetchError } = await (supabase as any)
        .from("budgets")
        .select("spent_amount, total_amount")
        .eq("id", budgetId)
        .single();

      if (fetchError) throw fetchError;

      const budgetData = currentBudget as { spent_amount: number; total_amount: number };
      const newSpentAmount = (budgetData.spent_amount || 0) + amount;
      const remaining = (budgetData.total_amount || 0) - newSpentAmount;

      // Update budget
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("budgets")
        .update({
          spent_amount: newSpentAmount,
          remaining_amount: remaining,
          updated_at: new Date().toISOString(),
        })
        .eq("id", budgetId)
        .select()
        .single();

      if (error) throw error;

      // Create expenditure record in budget_transactions table
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("budget_transactions")
          .insert({
            budget_id: budgetId,
            transaction_type: 'expenditure',
            amount: amount,
            description: description || 'Expenditure recorded',
            transaction_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        // Silently ignore if table doesn't exist or insert fails
        // The budget update is the primary operation
      } catch {
        // budget_transactions table may not exist, continue without recording
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["budget", data.id]
      });

      queryClient.invalidateQueries({
        queryKey: ["budgets"]
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardMetrics()
      });

      toast.success("Expenditure recorded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to record expenditure: ${error.message}`);
    },
  });
}

// Get budget statistics
export function useBudgetStats(enterpriseId: Id<"enterprises">) {
  return useQuery({
    queryKey: ["budget-stats", enterpriseId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("budgets")
        .select("total_amount, spent_amount, remaining_amount, status")
        .eq("enterprise_id", enterpriseId)
        .is("deleted_at", null);

      if (error) throw error;

      type BudgetStat = { total_amount: number; spent_amount: number; remaining_amount: number; status: string };
      const budgets = (data || []) as BudgetStat[];
      const total_allocated = budgets.reduce((sum: number, b: BudgetStat) => sum + (b.total_amount || 0), 0);
      const total_spent = budgets.reduce((sum: number, b: BudgetStat) => sum + (b.spent_amount || 0), 0);
      const total_remaining = budgets.reduce((sum: number, b: BudgetStat) => sum + (b.remaining_amount || 0), 0);

      const active_budgets = budgets.filter((b: BudgetStat) => b.status === 'active').length;
      const completed_budgets = budgets.filter((b: BudgetStat) => b.status === 'completed').length;

      const over_budget_count = budgets.filter((b: BudgetStat) =>
        b.total_amount > 0 && (b.spent_amount / b.total_amount) > 1
      ).length;

      const at_risk_count = budgets.filter((b: BudgetStat) =>
        b.total_amount > 0 && (b.spent_amount / b.total_amount) >= 0.9
      ).length;

      return {
        total_allocated,
        total_spent,
        total_remaining,
        overall_utilization: total_allocated > 0
          ? Math.round((total_spent / total_allocated) * 10000) / 100
          : 0,
        active_budgets,
        completed_budgets,
        over_budget_count,
        at_risk_count,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
