import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys } from "@/lib/react-query-config";
import type { Id } from "@/types/id.types";

const supabase = createClient();

// Dashboard metrics type
export interface DashboardMetrics {
  contracts: {
    total: number;
    active: number;
    expiring_soon: number; // Within 30 days
    pending: number;
  };
  vendors: {
    total: number;
    active: number;
    inactive: number;
    at_risk: number; // High risk level
  };
  budget: {
    total_allocated: number;
    total_spent: number;
    utilization_percentage: number;
    at_risk_budgets: number; // Over 90%
  };
  value: {
    total_contract_value: number;
    active_contract_value: number;
    avg_contract_value: number;
  };
}

// Recent activity type
export interface DashboardActivity {
  id: string;
  type: "contract" | "vendor" | "budget" | "approval";
  action: string;
  description: string;
  timestamp: string;
  user_name?: string;
  metadata?: Record<string, any>;
}

// Fetch dashboard metrics
export function useDashboardMetrics(enterpriseId: Id<"enterprises">) {
  return useQuery({
    queryKey: queryKeys.dashboardMetrics(),
    queryFn: async () => {
      // Fetch all metrics in parallel
      const [
        contractsTotal,
        contractsActive,
        contractsExpiring,
        contractsPending,
        vendorsTotal,
        vendorsActive,
        vendorsInactive,
        vendorsAtRisk,
        budgetsData,
        contractValues,
      ] = await Promise.all([
        // Contracts total
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId),

        // Contracts active
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .eq("status", "active"),

        // Contracts expiring soon (within 30 days)
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .eq("status", "active")
          .gte("end_date", new Date().toISOString())
          .lte("end_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Contracts pending
        supabase
          .from("contracts")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .eq("status", "draft"),

        // Vendors total
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .is("deleted_at", null),

        // Vendors active
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .eq("status", "active")
          .is("deleted_at", null),

        // Vendors inactive
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .eq("status", "inactive")
          .is("deleted_at", null),

        // Vendors at risk
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .in("risk_level", ["high", "critical"])
          .is("deleted_at", null),

        // Budget aggregates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("budgets")
          .select("total_amount, spent_amount")
          .eq("enterprise_id", enterpriseId)
          .is("deleted_at", null),

        // Contract values
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("contracts")
          .select("value, status")
          .eq("enterprise_id", enterpriseId),
      ]);

      // Check for errors
      if (contractsTotal.error) throw contractsTotal.error;
      if (contractsActive.error) throw contractsActive.error;
      if (contractsExpiring.error) throw contractsExpiring.error;
      if (contractsPending.error) throw contractsPending.error;
      if (vendorsTotal.error) throw vendorsTotal.error;
      if (vendorsActive.error) throw vendorsActive.error;
      if (vendorsInactive.error) throw vendorsInactive.error;
      if (vendorsAtRisk.error) throw vendorsAtRisk.error;
      if (budgetsData.error) throw budgetsData.error;
      if (contractValues.error) throw contractValues.error;

      // Calculate budget metrics
      type BudgetData = { total_amount: number; spent_amount: number };
      type ContractValueData = { value: number; status: string };
      const budgetsList = (budgetsData.data || []) as BudgetData[];
      const contractsList = (contractValues.data || []) as ContractValueData[];

      const totalAllocated = budgetsList.reduce((sum: number, b: BudgetData) => sum + (b.total_amount || 0), 0);
      const totalSpent = budgetsList.reduce((sum: number, b: BudgetData) => sum + (b.spent_amount || 0), 0);
      const utilizationPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
      const atRiskBudgets = budgetsList.filter((b: BudgetData) => {
        const utilization = b.total_amount > 0 ? (b.spent_amount / b.total_amount) * 100 : 0;
        return utilization >= 90;
      }).length;

      // Calculate contract values
      const totalContractValue = contractsList.reduce((sum: number, c: ContractValueData) => sum + (c.value || 0), 0);
      const activeContractValue = contractsList.filter((c: ContractValueData) => c.status === 'active')
        .reduce((sum: number, c: ContractValueData) => sum + (c.value || 0), 0);
      const avgContractValue = contractsList.length > 0
        ? totalContractValue / contractsList.length
        : 0;

      const metrics: DashboardMetrics = {
        contracts: {
          total: contractsTotal.count ?? 0,
          active: contractsActive.count ?? 0,
          expiring_soon: contractsExpiring.count ?? 0,
          pending: contractsPending.count ?? 0,
        },
        vendors: {
          total: vendorsTotal.count ?? 0,
          active: vendorsActive.count ?? 0,
          inactive: vendorsInactive.count ?? 0,
          at_risk: vendorsAtRisk.count ?? 0,
        },
        budget: {
          total_allocated: totalAllocated,
          total_spent: totalSpent,
          utilization_percentage: Math.round(utilizationPercentage * 100) / 100,
          at_risk_budgets: atRiskBudgets,
        },
        value: {
          total_contract_value: totalContractValue,
          active_contract_value: activeContractValue,
          avg_contract_value: avgContractValue,
        },
      };

      return metrics;
    },
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}

// Fetch recent activity (from notifications or audit log)
export function useDashboardActivity(
  enterpriseId: Id<"enterprises">,
  limit = 10
) {
  return useQuery({
    queryKey: queryKeys.dashboardActivity(),
    queryFn: async () => {
      // Get recent notifications as activity feed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select(`
          id,
          type,
          data,
          created_at,
          user:users(first_name, last_name)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform notifications to activity format
      type NotificationData = { id: string; type: string; data: { message?: string } | null; created_at: string; user: { first_name: string; last_name: string }[] | null };
      const activities: DashboardActivity[] = ((data || []) as NotificationData[]).map((notification: NotificationData) => ({
        id: notification.id,
        type: notification.type.includes("contract") ? "contract" :
              notification.type.includes("vendor") ? "vendor" :
              notification.type.includes("budget") ? "budget" : "approval",
        action: notification.type,
        description: notification.data?.message || `${notification.type} activity`,
        timestamp: notification.created_at,
        user_name: Array.isArray(notification.user) && notification.user.length > 0
          ? `${notification.user[0].first_name} ${notification.user[0].last_name}`.trim()
          : undefined,
        metadata: notification.data || undefined,
      }));

      return activities;
    },
    staleTime: 60 * 1000, // Fresh for 1 minute
  });
}

// Fetch contracts expiring soon (detailed)
export function useExpiringContracts(
  enterpriseId: Id<"enterprises">,
  daysAhead = 30
) {
  return useQuery({
    queryKey: ["expiring-contracts", enterpriseId, daysAhead],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("contracts")
        .select(`
          id,
          title,
          end_date,
          value,
          status,
          vendor:vendors(id, name)
        `)
        .eq("enterprise_id", enterpriseId)
        .eq("status", "active")
        .gte("end_date", new Date().toISOString())
        .lte("end_date", futureDate.toISOString())
        .order("end_date", { ascending: true });

      if (error) throw error;

      // Add days until expiry
      type ContractData = { id: string; title: string; end_date: string; value: number; status: string; vendor: unknown };
      return ((data || []) as ContractData[]).map((contract: ContractData) => ({
        ...contract,
        days_until_expiry: Math.ceil(
          (new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      }));
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
  });
}

// Fetch budget alerts
export function useBudgetAlerts(enterpriseId: Id<"enterprises">) {
  return useQuery({
    queryKey: ["budget-alerts", enterpriseId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("budgets")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .is("deleted_at", null);

      if (error) throw error;

      // Filter budgets that are at risk (>= 80% utilization)
      type BudgetAlertData = { id: string; name: string; total_amount: number; spent_amount: number; period_start?: string; period_end?: string; remaining_amount?: number; category?: string; [key: string]: unknown };
      const budgetsList = (data || []) as BudgetAlertData[];
      const alerts = budgetsList.filter((budget: BudgetAlertData) => {
        if (!budget.total_amount || budget.total_amount === 0) return false;
        const utilization = (budget.spent_amount / budget.total_amount) * 100;
        return utilization >= 80;
      }).map((budget: BudgetAlertData) => {
        const utilization = (budget.spent_amount / budget.total_amount) * 100;
        return {
          ...budget,
          utilization_percentage: Math.round(utilization * 100) / 100,
          alert_level: utilization >= 100 ? "critical" :
                       utilization >= 90 ? "high" :
                       "medium",
        };
      }).sort((a, b) => b.utilization_percentage - a.utilization_percentage);

      return alerts;
    },
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
  });
}

// Fetch vendor performance summary
export function useVendorPerformanceSummary(enterpriseId: Id<"enterprises">) {
  return useQuery({
    queryKey: ["vendor-performance-summary", enterpriseId],
    queryFn: async () => {
      // First, get top vendors by performance
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendors")
        .select(`
          id,
          name,
          status,
          risk_level,
          performance_score
        `)
        .eq("enterprise_id", enterpriseId)
        .is("deleted_at", null)
        .not("performance_score", "is", null)
        .order("performance_score", { ascending: false })
        .limit(5)
        .returns<Array<{
          id: string;
          name: string;
          status: string | null;
          risk_level: string | null;
          performance_score: number | null;
        }>>();

      if (vendorsError) throw vendorsError;
      if (!vendors || vendors.length === 0) return [];

      // Fetch contract counts for each vendor
      const vendorsWithContracts = await Promise.all(
        vendors.map(async (vendor) => {
          const { count, error: countError } = await supabase
            .from("contracts")
            .select("id", { count: "exact", head: true })
            .eq("vendor_id", vendor.id)
            .eq("enterprise_id", enterpriseId);

          if (countError) {
            console.error(`Error counting contracts for vendor ${vendor.id}:`, countError);
            return { ...vendor, contracts: [] };
          }

          // Return vendor with contracts array (for compatibility with component)
          return {
            ...vendor,
            contracts: Array(count || 0).fill({}) // Create array with length = count
          };
        })
      );

      return vendorsWithContracts;
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
  });
}
