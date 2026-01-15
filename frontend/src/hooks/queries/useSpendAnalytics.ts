// src/hooks/queries/useSpendAnalytics.ts
// React Query hooks for Spend Analytics and Vendor Scorecards

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  SpendRecord,
  SpendRecordListItem,
  SpendCategory,
  SpendAggregation,
  SpendTimeSeries,
  SpendSavings,
  SpendStats,
  SpendFilters,
  VendorScorecardTemplate,
  VendorScorecard,
  VendorScorecardListItem,
  VendorPerformanceTrend,
  ScorecardStats,
  ScorecardFilters,
  CreateSpendRecordPayload,
  UpdateSpendRecordPayload,
  CreateScorecardTemplatePayload,
  CreateVendorScorecardPayload,
  UpdateScorecardMetricPayload,
  CreateSavingsPayload,
  SpendType,
  AggregationPeriod,
} from "@/types/spend.types";
import { createClient } from "@/utils/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// SPEND QUERY HOOKS
// ============================================================================

/**
 * Fetch spend records
 */
export function useSpendList(enterpriseId: string, filters?: SpendFilters) {
  return useQuery({
    queryKey: queryKeys.spendList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("spend_records")
        .select(`
          id,
          spend_type,
          amount,
          currency,
          spend_date,
          status,
          description,
          vendor:vendors (id, name),
          contract:contracts (id, title),
          category:spend_categories (id, name)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("spend_date", { ascending: false });

      if (filters?.spend_type) {
        if (Array.isArray(filters.spend_type)) {
          query = query.in("spend_type", filters.spend_type);
        } else {
          query = query.eq("spend_type", filters.spend_type);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.vendor_id) {
        query = query.eq("vendor_id", filters.vendor_id);
      }

      if (filters?.contract_id) {
        query = query.eq("contract_id", filters.contract_id);
      }

      if (filters?.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters?.date_from) {
        query = query.gte("spend_date", filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte("spend_date", filters.date_to);
      }

      if (filters?.amount_min !== undefined) {
        query = query.gte("amount", filters.amount_min);
      }

      if (filters?.amount_max !== undefined) {
        query = query.lte("amount", filters.amount_max);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        vendor_name: (item.vendor as Record<string, string>)?.name || null,
        contract_title: (item.contract as Record<string, string>)?.title || null,
        category_name: (item.category as Record<string, string>)?.name || null,
        spend_type: item.spend_type,
        amount: item.amount,
        currency: item.currency,
        spend_date: item.spend_date,
        status: item.status,
      })) as SpendRecordListItem[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch spend categories
 */
export function useSpendCategories(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.spendCategories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spend_categories")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []) as SpendCategory[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch spend aggregations
 */
export function useSpendAggregations(
  enterpriseId: string,
  period: AggregationPeriod,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: queryKeys.spendAggregations({ enterpriseId, period, startDate, endDate }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spend_aggregations")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .eq("period", period)
        .gte("period_start", startDate)
        .lte("period_end", endDate)
        .order("period_start", { ascending: true });

      if (error) throw error;
      return (data || []) as SpendAggregation[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch spend time series for charts
 */
export function useSpendTimeSeries(
  enterpriseId: string,
  period: AggregationPeriod,
  months: number = 12
) {
  return useQuery({
    queryKey: queryKeys.spendAggregations({ enterpriseId, period, months }),
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from("spend_records")
        .select("spend_type, amount, spend_date")
        .eq("enterprise_id", enterpriseId)
        .gte("spend_date", startDate.toISOString())
        .lte("spend_date", endDate.toISOString())
        .order("spend_date", { ascending: true });

      if (error) throw error;

      // Group by period
      const dataPoints: Record<string, { actual: number; committed: number; forecast: number; budget: number }> = {};

      (data || []).forEach((item: { spend_type: SpendType; amount: number; spend_date: string }) => {
        const date = new Date(item.spend_date);
        let periodKey: string;

        if (period === "monthly") {
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        } else if (period === "quarterly") {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `${date.getFullYear()}-Q${quarter}`;
        } else {
          periodKey = `${date.getFullYear()}`;
        }

        if (!dataPoints[periodKey]) {
          dataPoints[periodKey] = { actual: 0, committed: 0, forecast: 0, budget: 0 };
        }

        dataPoints[periodKey][item.spend_type] += item.amount;
      });

      const timeSeries = Object.entries(dataPoints)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, values]) => ({
          period_start: key,
          period_end: key,
          actual: values.actual,
          committed: values.committed,
          forecast: values.forecast,
          budget: values.budget,
          variance: values.actual - values.budget,
          variance_percentage: values.budget > 0 ? ((values.actual - values.budget) / values.budget) * 100 : 0,
        }));

      const totalActual = timeSeries.reduce((sum, p) => sum + p.actual, 0);
      const totalBudget = timeSeries.reduce((sum, p) => sum + p.budget, 0);

      return {
        period,
        data_points: timeSeries,
        summary: {
          total_actual: totalActual,
          total_committed: timeSeries.reduce((sum, p) => sum + p.committed, 0),
          total_forecast: timeSeries.reduce((sum, p) => sum + p.forecast, 0),
          total_budget: totalBudget,
          overall_variance: totalActual - totalBudget,
          variance_percentage: totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0,
          trend: totalActual > totalBudget ? "increasing" : totalActual < totalBudget ? "decreasing" : "stable",
        },
      } as SpendTimeSeries;
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch spend statistics
 */
export function useSpendStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.spendStats(),
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // Fetch YTD spend
      const { data: spendData, error: spendError } = await supabase
        .from("spend_records")
        .select("spend_type, amount, category_id, vendor_id")
        .eq("enterprise_id", enterpriseId)
        .gte("spend_date", yearStart)
        .lte("spend_date", yearEnd);

      if (spendError) throw spendError;

      // Fetch savings
      const { data: savingsData, error: savingsError } = await supabase
        .from("spend_savings")
        .select("amount")
        .eq("enterprise_id", enterpriseId)
        .eq("fiscal_year", currentYear)
        .eq("status", "realized");

      if (savingsError) throw savingsError;

      // Fetch categories for names
      const { data: categories } = await supabase
        .from("spend_categories")
        .select("id, name")
        .eq("enterprise_id", enterpriseId);

      // Fetch vendors for names
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("enterprise_id", enterpriseId);

      const categoryMap = new Map((categories || []).map((c: { id: string; name: string }) => [c.id, c.name]));
      const vendorMap = new Map((vendors || []).map((v: { id: string; name: string }) => [v.id, v.name]));

      const records = spendData || [];
      let totalSpend = 0;
      let totalBudget = 0;
      const byCategory: Record<string, number> = {};
      const byVendor: Record<string, number> = {};

      records.forEach((r: { spend_type: SpendType; amount: number; category_id: string | null; vendor_id: string | null }) => {
        if (r.spend_type === "actual") {
          totalSpend += r.amount;
          if (r.category_id) {
            byCategory[r.category_id] = (byCategory[r.category_id] || 0) + r.amount;
          }
          if (r.vendor_id) {
            byVendor[r.vendor_id] = (byVendor[r.vendor_id] || 0) + r.amount;
          }
        } else if (r.spend_type === "budget") {
          totalBudget += r.amount;
        }
      });

      const totalSavings = (savingsData || []).reduce((sum: number, s: { amount: number }) => sum + s.amount, 0);

      return {
        total_spend_ytd: totalSpend,
        total_budget_ytd: totalBudget,
        variance_ytd: totalSpend - totalBudget,
        variance_percentage: totalBudget > 0 ? ((totalSpend - totalBudget) / totalBudget) * 100 : 0,
        total_savings_ytd: totalSavings,
        by_category: Object.entries(byCategory)
          .map(([id, amount]) => ({
            category_id: id,
            category_name: categoryMap.get(id) || "Unknown",
            amount,
            percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
        by_vendor: Object.entries(byVendor)
          .map(([id, amount]) => ({
            vendor_id: id,
            vendor_name: vendorMap.get(id) || "Unknown",
            amount,
            percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
        trend: totalSpend > totalBudget ? "increasing" : "stable",
      } as SpendStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// SCORECARD QUERY HOOKS
// ============================================================================

/**
 * Fetch scorecard templates
 */
export function useScorecardTemplates(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.scorecardTemplates(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_scorecard_templates")
        .select(`
          *,
          dimensions:scorecard_dimensions (
            *,
            metrics:scorecard_metrics (*)
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as VendorScorecardTemplate[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch vendor scorecards
 */
export function useScorecardList(
  enterpriseId: string,
  filters?: ScorecardFilters
) {
  return useQuery({
    queryKey: queryKeys.scorecardList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("vendor_scorecards")
        .select(`
          id,
          vendor_id,
          period_start,
          period_end,
          overall_score,
          status,
          completed_at,
          vendor:vendors (id, name),
          action_items:scorecard_action_items (id)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("period_end", { ascending: false });

      if (filters?.vendor_id) {
        query = query.eq("vendor_id", filters.vendor_id);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.score_min !== undefined) {
        query = query.gte("overall_score", filters.score_min);
      }

      if (filters?.score_max !== undefined) {
        query = query.lte("overall_score", filters.score_max);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        vendor_id: item.vendor_id,
        vendor_name: (item.vendor as Record<string, string>)?.name || "Unknown",
        period_start: item.period_start,
        period_end: item.period_end,
        overall_score: item.overall_score,
        status: item.status,
        action_items_count: (item.action_items as unknown[])?.length || 0,
        completed_at: item.completed_at,
      })) as VendorScorecardListItem[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch single scorecard with metrics
 */
export function useScorecard(scorecardId: string) {
  return useQuery({
    queryKey: queryKeys.scorecard(scorecardId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_scorecards")
        .select(`
          *,
          vendor:vendors (id, name, category),
          template:vendor_scorecard_templates (id, name),
          metric_values:scorecard_metric_values (
            *,
            metric:scorecard_metrics (*)
          ),
          action_items:scorecard_action_items (
            *,
            assignee:users!assigned_to (
              id,
              raw_user_meta_data
            )
          )
        `)
        .eq("id", scorecardId)
        .single();

      if (error) throw error;

      return {
        ...data,
        vendor: data.vendor
          ? {
              id: data.vendor.id,
              name: data.vendor.name,
              category: data.vendor.category,
            }
          : undefined,
        action_items: (data.action_items || []).map((item: Record<string, unknown>) => ({
          ...item,
          assignee: item.assignee
            ? {
                id: (item.assignee as Record<string, unknown>).id,
                full_name: ((item.assignee as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
              }
            : undefined,
        })),
      } as VendorScorecard;
    },
    enabled: !!scorecardId,
  });
}

/**
 * Fetch vendor performance history
 */
export function useVendorPerformanceHistory(vendorId: string) {
  return useQuery({
    queryKey: queryKeys.vendorPerformanceHistory(vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_scorecards")
        .select("id, overall_score, period_start, period_end")
        .eq("vendor_id", vendorId)
        .eq("status", "approved")
        .order("period_end", { ascending: true })
        .limit(12);

      if (error) throw error;

      if (!data?.length) return null;

      const dataPoints = data.map((s: { period_end: string; overall_score: number }) => ({
        period: s.period_end,
        value: s.overall_score,
      }));

      const avgScore = dataPoints.reduce((sum: number, p: { period: string; value: number }) => sum + p.value, 0) / dataPoints.length;
      const firstScore = dataPoints[0]?.value || 0;
      const lastScore = dataPoints[dataPoints.length - 1]?.value || 0;

      let trend: "improving" | "declining" | "stable" = "stable";
      if (lastScore - firstScore > 5) trend = "improving";
      else if (firstScore - lastScore > 5) trend = "declining";

      return {
        vendor_id: vendorId,
        vendor_name: "",
        metric_name: "Overall Score",
        data_points: dataPoints,
        trend,
        average_score: Math.round(avgScore),
      } as VendorPerformanceTrend;
    },
    enabled: !!vendorId,
  });
}

/**
 * Fetch scorecard statistics
 */
export function useScorecardStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.scorecardStats(),
    queryFn: async () => {
      const { data: scorecards, error: scError } = await supabase
        .from("vendor_scorecards")
        .select("status, overall_score")
        .eq("enterprise_id", enterpriseId);

      if (scError) throw scError;

      const { data: actionItems, error: aiError } = await supabase
        .from("scorecard_action_items")
        .select("status, due_date")
        .eq("scorecard_id", scorecards?.map((s: { id: string }) => s.id) || []);

      if (aiError) throw aiError;

      const scData = scorecards || [];
      const aiData = actionItems || [];

      const byStatus: Record<VendorScorecard["status"], number> = {
        draft: 0,
        in_progress: 0,
        completed: 0,
        approved: 0,
      };

      scData.forEach((s: { status: VendorScorecard["status"] }) => {
        byStatus[s.status]++;
      });

      const approvedScores = scData
        .filter((s: { status: VendorScorecard["status"] }) => s.status === "approved")
        .map((s: { overall_score: number }) => s.overall_score);

      const avgScore =
        approvedScores.length > 0
          ? approvedScores.reduce((sum: number, s: number) => sum + s, 0) / approvedScores.length
          : 0;

      const now = new Date();

      return {
        total_scorecards: scData.length,
        average_score: Math.round(avgScore),
        by_status: byStatus,
        vendors_above_target: approvedScores.filter((s: number) => s >= 75).length,
        vendors_below_target: approvedScores.filter((s: number) => s < 60).length,
        action_items_open: aiData.filter((a: { status: string }) => ["open", "in_progress"].includes(a.status)).length,
        action_items_overdue: aiData.filter(
          (a: { status: string; due_date: string | null }) =>
            a.status !== "completed" && a.due_date && new Date(a.due_date) < now
        ).length,
      } as ScorecardStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a spend record
 */
export function useCreateSpendRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createSpendRecord,
    mutationFn: async ({
      enterpriseId,
      data,
    }: {
      enterpriseId: string;
      data: CreateSpendRecordPayload;
    }) => {
      const spendDate = new Date(data.spend_date);

      const { data: record, error } = await supabase
        .from("spend_records")
        .insert({
          enterprise_id: enterpriseId,
          contract_id: data.contract_id || null,
          vendor_id: data.vendor_id || null,
          category_id: data.category_id || null,
          spend_type: data.spend_type,
          amount: data.amount,
          currency: data.currency || "USD",
          spend_date: data.spend_date,
          fiscal_year: spendDate.getFullYear(),
          fiscal_quarter: Math.floor(spendDate.getMonth() / 3) + 1,
          fiscal_month: spendDate.getMonth() + 1,
          description: data.description || null,
          reference_number: data.reference_number || null,
          status: "pending",
          metadata: data.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return record as SpendRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spend() });
      toast.success("Spend record created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create spend record: ${error.message}`);
    },
  });
}

/**
 * Update a spend record
 */
export function useUpdateSpendRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateSpendRecord,
    mutationFn: async ({
      recordId,
      data,
    }: {
      recordId: string;
      data: UpdateSpendRecordPayload;
    }) => {
      const { data: record, error } = await supabase
        .from("spend_records")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId)
        .select()
        .single();

      if (error) throw error;
      return record as SpendRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spend() });
      toast.success("Spend record updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update spend record: ${error.message}`);
    },
  });
}

/**
 * Record savings
 */
export function useRecordSavings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.recordSavings,
    mutationFn: async ({
      enterpriseId,
      data,
    }: {
      enterpriseId: string;
      data: CreateSavingsPayload;
    }) => {
      const savingsDate = new Date(data.savings_date);

      const { data: savings, error } = await supabase
        .from("spend_savings")
        .insert({
          enterprise_id: enterpriseId,
          contract_id: data.contract_id || null,
          vendor_id: data.vendor_id || null,
          savings_type: data.savings_type,
          amount: data.amount,
          currency: data.currency || "USD",
          baseline_amount: data.baseline_amount,
          new_amount: data.new_amount,
          savings_date: data.savings_date,
          fiscal_year: savingsDate.getFullYear(),
          status: "projected",
          description: data.description || null,
          documentation_path: data.documentation_path || null,
        })
        .select()
        .single();

      if (error) throw error;
      return savings as SpendSavings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spendSavings() });
      toast.success("Savings recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record savings: ${error.message}`);
    },
  });
}

/**
 * Create a scorecard template
 */
export function useCreateScorecardTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createScorecardTemplate,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: CreateScorecardTemplatePayload;
    }) => {
      const { data: template, error } = await supabase
        .from("vendor_scorecard_templates")
        .insert({
          enterprise_id: enterpriseId,
          name: data.name,
          description: data.description || null,
          applies_to_categories: data.applies_to_categories || [],
          period: data.period,
          is_default: data.is_default || false,
          status: "draft",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create dimensions and metrics
      if (data.dimensions?.length) {
        for (const dim of data.dimensions) {
          const { data: dimension, error: dimError } = await supabase
            .from("scorecard_dimensions")
            .insert({
              template_id: template.id,
              name: dim.name,
              description: dim.description || null,
              weight: dim.weight,
              display_order: data.dimensions.indexOf(dim),
            })
            .select()
            .single();

          if (dimError) throw dimError;

          if (dim.metrics?.length) {
            const { error: metricError } = await supabase.from("scorecard_metrics").insert(
              dim.metrics.map((m, idx) => ({
                dimension_id: dimension.id,
                name: m.name,
                description: m.description || null,
                measurement_type: m.measurement_type,
                target_value: m.target_value || null,
                min_value: m.min_value || 0,
                max_value: m.max_value || 100,
                weight: m.weight,
                data_source: m.data_source || "manual",
                calculation_formula: m.calculation_formula || null,
                display_order: idx,
              }))
            );

            if (metricError) throw metricError;
          }
        }
      }

      return template as VendorScorecardTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scorecardTemplates() });
      toast.success("Scorecard template created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

/**
 * Create a vendor scorecard
 */
export function useCreateScorecard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createScorecard,
    mutationFn: async ({
      enterpriseId,
      data,
    }: {
      enterpriseId: string;
      data: CreateVendorScorecardPayload;
    }) => {
      const { data: scorecard, error } = await supabase
        .from("vendor_scorecards")
        .insert({
          enterprise_id: enterpriseId,
          vendor_id: data.vendor_id,
          template_id: data.template_id,
          period_start: data.period_start,
          period_end: data.period_end,
          overall_score: 0,
          status: "draft",
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return scorecard as VendorScorecard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scorecards() });
      toast.success("Scorecard created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create scorecard: ${error.message}`);
    },
  });
}

/**
 * Update scorecard metric value
 */
export function useUpdateScorecardMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateScorecardMetric,
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: UpdateScorecardMetricPayload;
    }) => {
      // Check if value exists
      const { data: existing } = await supabase
        .from("scorecard_metric_values")
        .select("id")
        .eq("scorecard_id", data.scorecard_id)
        .eq("metric_id", data.metric_id)
        .single();

      let result;

      if (existing) {
        const { data: updated, error } = await supabase
          .from("scorecard_metric_values")
          .update({
            value: data.value,
            notes: data.notes || null,
            evidence_path: data.evidence_path || null,
            recorded_by: userId,
            recorded_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        result = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from("scorecard_metric_values")
          .insert({
            scorecard_id: data.scorecard_id,
            metric_id: data.metric_id,
            value: data.value,
            weighted_score: 0, // Will be calculated
            notes: data.notes || null,
            evidence_path: data.evidence_path || null,
            recorded_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        result = inserted;
      }

      // Recalculate overall score
      // This would typically be done in a database trigger
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scorecard(variables.data.scorecard_id),
      });
      toast.success("Metric updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update metric: ${error.message}`);
    },
  });
}

/**
 * Complete a scorecard
 */
export function useCompleteScorecard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.completeScorecard,
    mutationFn: async ({
      scorecardId,
      userId,
    }: {
      scorecardId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("vendor_scorecards")
        .update({
          status: "completed",
          completed_by: userId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", scorecardId)
        .select()
        .single();

      if (error) throw error;
      return data as VendorScorecard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scorecards() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scorecard(data.id) });
      toast.success("Scorecard completed");
    },
    onError: (error) => {
      toast.error(`Failed to complete scorecard: ${error.message}`);
    },
  });
}

/**
 * Approve a scorecard
 */
export function useApproveScorecard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.approveScorecard,
    mutationFn: async ({
      scorecardId,
      userId,
    }: {
      scorecardId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from("vendor_scorecards")
        .update({
          status: "approved",
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", scorecardId)
        .select()
        .single();

      if (error) throw error;
      return data as VendorScorecard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scorecards() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scorecard(data.id) });
      toast.success("Scorecard approved");
    },
    onError: (error) => {
      toast.error(`Failed to approve scorecard: ${error.message}`);
    },
  });
}
