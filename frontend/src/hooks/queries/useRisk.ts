// src/hooks/queries/useRisk.ts
// React Query hooks for Risk Assessment and Clause Conflict Detection

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import { toast } from "sonner";
import type {
  ClauseDefinition,
  ClauseCategoryDefinition,
  ClauseConflictRule,
  ClauseCompatibilityMatrix,
  DetectedClauseConflict,
  ConflictResolutionHistory,
  RiskFactorDefinition,
  ContractRiskAssessment,
  RiskAssessmentFactor,
  RiskMitigationAction,
  RiskScoreHistory,
  RiskThresholdConfig,
  RiskAlert,
  RiskAssessmentListItem,
  ConflictListItem,
  RiskStats,
  ConflictStats,
  RiskAssessmentFilters,
  ConflictFilters,
  CreateRiskAssessmentPayload,
  UpdateRiskAssessmentPayload,
  CreateMitigationPayload,
  UpdateMitigationPayload,
  ResolveConflictPayload,
  CreateConflictRulePayload,
  RiskLevel,
  ConflictStatus,
  MitigationStatus,
} from "@/types/risk.types";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// CLAUSE DEFINITION HOOKS
// ============================================================================

/**
 * Fetch clause categories
 */
export function useClauseCategories(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.clauseCategories(enterpriseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clause_categories")
        .select("*")
        .or(`enterprise_id.eq.${enterpriseId},enterprise_id.is.null`)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []) as ClauseCategoryDefinition[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch clause definitions
 */
export function useClauseDefinitions(enterpriseId: string, categoryId?: string) {
  return useQuery({
    queryKey: queryKeys.clauseDefinitions({ enterpriseId, categoryId }),
    queryFn: async () => {
      let query = supabase
        .from("clause_definitions")
        .select(`
          *,
          category:clause_categories (
            id,
            name,
            description
          )
        `)
        .or(`enterprise_id.eq.${enterpriseId},enterprise_id.is.null`)
        .order("name", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as ClauseDefinition[];
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// CONFLICT RULE HOOKS
// ============================================================================

/**
 * Fetch clause conflict rules
 */
export function useConflictRules(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.conflictRules(enterpriseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clause_conflict_rules")
        .select(`
          *,
          clause_a:clause_a_id (
            id,
            name,
            category:clause_categories (
              name
            )
          ),
          clause_b:clause_b_id (
            id,
            name,
            category:clause_categories (
              name
            )
          )
        `)
        .or(`enterprise_id.eq.${enterpriseId},enterprise_id.is.null`)
        .eq("is_active", true)
        .order("severity", { ascending: true });

      if (error) throw error;
      return (data || []) as ClauseConflictRule[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch compatibility matrix
 */
export function useCompatibilityMatrix(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.compatibilityMatrix(enterpriseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clause_compatibility_matrices")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return (data || []) as ClauseCompatibilityMatrix[];
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// DETECTED CONFLICT HOOKS
// ============================================================================

/**
 * Fetch detected conflicts for a contract
 */
export function useContractConflicts(contractId: string, filters?: ConflictFilters) {
  return useQuery({
    queryKey: queryKeys.clauseConflicts({ contractId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("detected_clause_conflicts")
        .select(`
          *,
          conflict_rule:conflict_rule_id (
            *,
            clause_a:clause_a_id (name),
            clause_b:clause_b_id (name)
          )
        `)
        .eq("contract_id", contractId)
        .order("severity", { ascending: true });

      if (filters?.severity) {
        if (Array.isArray(filters.severity)) {
          query = query.in("severity", filters.severity);
        } else {
          query = query.eq("severity", filters.severity);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.detected_from) {
        query = query.gte("detected_at", filters.detected_from);
      }

      if (filters?.detected_to) {
        query = query.lte("detected_at", filters.detected_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as DetectedClauseConflict[];
    },
    enabled: !!contractId,
  });
}

/**
 * Fetch all detected conflicts for enterprise
 */
export function useEnterpriseConflicts(
  enterpriseId: string,
  filters?: ConflictFilters
) {
  return useQuery({
    queryKey: queryKeys.enterpriseClauseConflicts({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("detected_clause_conflicts")
        .select(`
          id,
          contract_id,
          severity,
          description,
          status,
          detected_at,
          contract:contracts (
            id,
            title
          )
        `)
        .eq("contracts.enterprise_id", enterpriseId)
        .order("detected_at", { ascending: false });

      if (filters?.severity) {
        if (Array.isArray(filters.severity)) {
          query = query.in("severity", filters.severity);
        } else {
          query = query.eq("severity", filters.severity);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        contract_id: c.contract_id,
        contract_title: (c.contract as Record<string, unknown>)?.title || "Unknown",
        severity: c.severity,
        description: c.description,
        status: c.status,
        detected_at: c.detected_at,
      })) as ConflictListItem[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch conflict resolution history
 */
export function useConflictHistory(conflictId: string) {
  return useQuery({
    queryKey: queryKeys.conflictHistory(conflictId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conflict_resolution_history")
        .select(`
          *,
          user:performed_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("conflict_id", conflictId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((h: Record<string, unknown>) => ({
        ...h,
        user: h.user
          ? {
              id: (h.user as Record<string, unknown>).id,
              full_name:
                ((h.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                "Unknown",
            }
          : undefined,
      })) as ConflictResolutionHistory[];
    },
    enabled: !!conflictId,
  });
}

// ============================================================================
// RISK FACTOR HOOKS
// ============================================================================

/**
 * Fetch risk factor definitions
 */
export function useRiskFactors(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.riskFactors(enterpriseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_factor_definitions")
        .select("*")
        .or(`enterprise_id.eq.${enterpriseId},enterprise_id.is.null`)
        .eq("is_active", true)
        .order("weight", { ascending: false });

      if (error) throw error;
      return (data || []) as RiskFactorDefinition[];
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// RISK ASSESSMENT HOOKS
// ============================================================================

/**
 * Fetch risk assessments for enterprise
 */
export function useRiskAssessments(
  enterpriseId: string,
  filters?: RiskAssessmentFilters
) {
  return useQuery({
    queryKey: queryKeys.riskAssessments({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("contract_risk_assessments")
        .select(`
          id,
          contract_id,
          overall_score,
          risk_level,
          assessment_date,
          contract:contracts (
            id,
            title
          ),
          mitigations:risk_mitigation_actions (
            id,
            status
          )
        `)
        .eq("contracts.enterprise_id", enterpriseId)
        .order("assessment_date", { ascending: false });

      if (filters?.risk_level) {
        if (Array.isArray(filters.risk_level)) {
          query = query.in("risk_level", filters.risk_level);
        } else {
          query = query.eq("risk_level", filters.risk_level);
        }
      }

      if (filters?.score_min !== undefined) {
        query = query.gte("overall_score", filters.score_min);
      }

      if (filters?.score_max !== undefined) {
        query = query.lte("overall_score", filters.score_max);
      }

      if (filters?.assessment_type) {
        query = query.eq("assessment_type", filters.assessment_type);
      }

      if (filters?.date_from) {
        query = query.gte("assessment_date", filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte("assessment_date", filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get conflict counts
      const contractIds = (data || []).map((a: { contract_id: string }) => a.contract_id);
      const { data: conflicts } = await supabase
        .from("detected_clause_conflicts")
        .select("contract_id")
        .in("contract_id", contractIds)
        .neq("status", "resolved");

      const conflictCounts = (conflicts || []).reduce(
        (acc: Record<string, number>, c: { contract_id: string }) => {
          acc[c.contract_id] = (acc[c.contract_id] || 0) + 1;
          return acc;
        },
        {}
      );

      return (data || []).map((a: Record<string, unknown>) => {
        const mitigations = (a.mitigations as { status: MitigationStatus }[]) || [];
        const pendingMitigations = mitigations.filter(
          (m) => m.status !== "completed" && m.status !== "rejected"
        ).length;

        return {
          id: a.id,
          contract_id: a.contract_id,
          contract_title: (a.contract as Record<string, unknown>)?.title || "Unknown",
          overall_score: a.overall_score,
          risk_level: a.risk_level,
          assessment_date: a.assessment_date,
          mitigations_pending: pendingMitigations,
          conflicts_detected: conflictCounts[a.contract_id as string] || 0,
        };
      }) as RiskAssessmentListItem[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch risk assessment for a contract
 */
export function useContractRiskAssessment(contractId: string) {
  return useQuery({
    queryKey: queryKeys.contractRisk(contractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_risk_assessments")
        .select(`
          *,
          contract:contracts (
            id,
            title,
            contract_number
          ),
          factors:risk_assessment_factors (
            *,
            factor:factor_id (
              *
            )
          ),
          mitigations:risk_mitigation_actions (
            *,
            assignee:assigned_to (
              id,
              raw_user_meta_data,
              email
            )
          )
        `)
        .eq("contract_id", contractId)
        .order("assessment_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        factors: (data.factors || []).map((f: Record<string, unknown>) => ({
          ...f,
          factor: f.factor,
        })),
        mitigations: (data.mitigations || []).map((m: Record<string, unknown>) => ({
          ...m,
          assignee: m.assignee
            ? {
                id: (m.assignee as Record<string, unknown>).id,
                full_name:
                  ((m.assignee as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                  "Unknown",
                email: (m.assignee as Record<string, unknown>).email,
              }
            : undefined,
        })),
      } as ContractRiskAssessment;
    },
    enabled: !!contractId,
  });
}

/**
 * Fetch risk score history for a contract
 */
export function useRiskScoreHistory(contractId: string) {
  return useQuery({
    queryKey: queryKeys.riskHistory(contractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_score_history")
        .select("*")
        .eq("contract_id", contractId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return (data || []) as RiskScoreHistory[];
    },
    enabled: !!contractId,
  });
}

/**
 * Fetch risk threshold configurations
 */
export function useRiskThresholds(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.riskThresholds(enterpriseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_threshold_configs")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .eq("is_active", true);

      if (error) throw error;
      return (data || []) as RiskThresholdConfig[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch risk alerts
 */
export function useRiskAlerts(enterpriseId: string, includeAcknowledged = false) {
  return useQuery({
    queryKey: queryKeys.riskAlerts({ enterpriseId, includeAcknowledged }),
    queryFn: async () => {
      let query = supabase
        .from("risk_alerts")
        .select(`
          *,
          contract:contracts (
            id,
            title
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      if (!includeAcknowledged) {
        query = query.is("acknowledged_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as RiskAlert[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch risk statistics
 */
export function useRiskStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.riskStats(),
    queryFn: async () => {
      const { data: assessments, error: e1 } = await supabase
        .from("contract_risk_assessments")
        .select(`
          overall_score,
          risk_level,
          contract:contracts!inner (
            enterprise_id
          )
        `)
        .eq("contracts.enterprise_id", enterpriseId);

      if (e1) throw e1;

      const assessmentData = assessments || [];

      // Count by risk level
      const byRiskLevel = assessmentData.reduce(
        (acc: Record<RiskLevel, number>, a: { risk_level: RiskLevel }) => {
          acc[a.risk_level] = (acc[a.risk_level] || 0) + 1;
          return acc;
        },
        {} as Record<RiskLevel, number>
      );

      // Calculate average score
      const avgScore =
        assessmentData.length > 0
          ? assessmentData.reduce((acc: number, a: { overall_score: number }) => acc + a.overall_score, 0) /
            assessmentData.length
          : 0;

      // Count contracts at risk (high or critical)
      const contractsAtRisk = assessmentData.filter(
        (a: { risk_level: RiskLevel }) =>
          a.risk_level === "high" || a.risk_level === "critical"
      ).length;

      // Get mitigation counts
      const { data: mitigations, error: e2 } = await supabase
        .from("risk_mitigation_actions")
        .select(`
          status,
          due_date,
          assessment:assessment_id (
            contract:contracts!inner (
              enterprise_id
            )
          )
        `)
        .eq("assessment.contracts.enterprise_id", enterpriseId)
        .neq("status", "completed")
        .neq("status", "rejected");

      if (e2) throw e2;

      const mitigationData = mitigations || [];
      const now = new Date();
      const mitigationsOverdue = mitigationData.filter(
        (m: { due_date: string | null }) => m.due_date && new Date(m.due_date) < now
      ).length;

      // Determine trend (would need historical data)
      const trend: "improving" | "stable" | "worsening" = "stable";

      return {
        total_assessments: assessmentData.length,
        average_score: avgScore,
        by_risk_level: byRiskLevel,
        contracts_at_risk: contractsAtRisk,
        mitigations_pending: mitigationData.length,
        mitigations_overdue: mitigationsOverdue,
        trend,
      } as RiskStats;
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch conflict statistics
 */
export function useConflictStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.conflictStats(),
    queryFn: async () => {
      const { data: conflicts, error } = await supabase
        .from("detected_clause_conflicts")
        .select(`
          severity,
          status,
          detected_at,
          resolved_at,
          contract:contracts!inner (
            enterprise_id
          )
        `)
        .eq("contracts.enterprise_id", enterpriseId);

      if (error) throw error;

      const conflictData = conflicts || [];

      const bySeverity = conflictData.reduce(
        (acc: Record<string, number>, c: { severity: string }) => {
          acc[c.severity] = (acc[c.severity] || 0) + 1;
          return acc;
        },
        {}
      );

      const byStatus = conflictData.reduce(
        (acc: Record<ConflictStatus, number>, c: { status: ConflictStatus }) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        },
        {} as Record<ConflictStatus, number>
      );

      // Calculate resolution rate
      const resolved = conflictData.filter(
        (c: { status: ConflictStatus }) => c.status === "resolved" || c.status === "accepted"
      );
      const resolutionRate =
        conflictData.length > 0 ? (resolved.length / conflictData.length) * 100 : 0;

      // Calculate average resolution time
      const resolvedWithDates = resolved.filter(
        (c: { resolved_at: string | null }) => c.resolved_at
      );
      let avgResolutionDays = 0;
      if (resolvedWithDates.length > 0) {
        const totalDays = resolvedWithDates.reduce(
          (acc: number, c: { detected_at: string; resolved_at: string }) => {
            const detected = new Date(c.detected_at).getTime();
            const resolvedAt = new Date(c.resolved_at).getTime();
            return acc + (resolvedAt - detected) / (1000 * 60 * 60 * 24);
          },
          0
        );
        avgResolutionDays = totalDays / resolvedWithDates.length;
      }

      return {
        total_conflicts: conflictData.length,
        by_severity: bySeverity,
        by_status: byStatus,
        resolution_rate: resolutionRate,
        average_resolution_days: avgResolutionDays,
      } as ConflictStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a risk assessment
 */
export function useCreateRiskAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createRiskAssessment,
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: CreateRiskAssessmentPayload;
    }) => {
      // Calculate overall score from factors
      let overallScore = 50; // Default
      if (data.factor_scores?.length) {
        const totalWeight = data.factor_scores.length;
        const weightedSum = data.factor_scores.reduce(
          (acc, f) => acc + f.score,
          0
        );
        overallScore = weightedSum / totalWeight;
      }

      // Determine risk level
      let riskLevel: RiskLevel = "medium";
      if (overallScore <= 20) riskLevel = "minimal";
      else if (overallScore <= 40) riskLevel = "low";
      else if (overallScore <= 60) riskLevel = "medium";
      else if (overallScore <= 80) riskLevel = "high";
      else riskLevel = "critical";

      // Create assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from("contract_risk_assessments")
        .insert({
          contract_id: data.contract_id,
          overall_score: overallScore,
          risk_level: riskLevel,
          assessment_date: new Date().toISOString(),
          assessed_by: userId,
          assessment_type: data.assessment_type || "manual",
          notes: data.notes || null,
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Create factor scores
      if (data.factor_scores?.length) {
        const factorInserts = data.factor_scores.map((f) => ({
          assessment_id: assessment.id,
          factor_id: f.factor_id,
          score: f.score,
          weighted_score: f.score, // Would calculate based on factor weight
          rationale: f.rationale || null,
          evidence: f.evidence || null,
        }));

        await supabase.from("risk_assessment_factors").insert(factorInserts);
      }

      // Record in history
      await supabase.from("risk_score_history").insert({
        contract_id: data.contract_id,
        overall_score: overallScore,
        risk_level: riskLevel,
        recorded_at: new Date().toISOString(),
        change_reason: "Initial assessment",
        recorded_by: userId,
      });

      return assessment as ContractRiskAssessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contractRisk(data.contract_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.risk() });
      toast.success("Risk assessment created");
    },
    onError: (error) => {
      toast.error(`Failed to create assessment: ${error.message}`);
    },
  });
}

/**
 * Update a risk assessment
 */
export function useUpdateRiskAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateRiskAssessment,
    mutationFn: async ({
      assessmentId,
      contractId,
      data,
    }: {
      assessmentId: string;
      contractId: string;
      data: UpdateRiskAssessmentPayload;
    }) => {
      const { data: assessment, error } = await supabase
        .from("contract_risk_assessments")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assessmentId)
        .select()
        .single();

      if (error) throw error;
      return { assessment: assessment as ContractRiskAssessment, contractId };
    },
    onSuccess: ({ contractId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contractRisk(contractId),
      });
      toast.success("Assessment updated");
    },
    onError: (error) => {
      toast.error(`Failed to update assessment: ${error.message}`);
    },
  });
}

/**
 * Create a mitigation action
 */
export function useCreateMitigation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createMitigation,
    mutationFn: async (data: CreateMitigationPayload) => {
      const { data: mitigation, error } = await supabase
        .from("risk_mitigation_actions")
        .insert({
          assessment_id: data.assessment_id,
          factor_id: data.factor_id || null,
          title: data.title,
          description: data.description,
          status: "proposed" as MitigationStatus,
          priority: data.priority,
          assigned_to: data.assigned_to || null,
          due_date: data.due_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mitigation as RiskMitigationAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risk() });
      toast.success("Mitigation created");
    },
    onError: (error) => {
      toast.error(`Failed to create mitigation: ${error.message}`);
    },
  });
}

/**
 * Update a mitigation action
 */
export function useUpdateMitigation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateMitigation,
    mutationFn: async ({
      mitigationId,
      data,
    }: {
      mitigationId: string;
      data: UpdateMitigationPayload;
    }) => {
      const updateData: Record<string, unknown> = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      if (data.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: mitigation, error } = await supabase
        .from("risk_mitigation_actions")
        .update(updateData)
        .eq("id", mitigationId)
        .select()
        .single();

      if (error) throw error;
      return mitigation as RiskMitigationAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risk() });
      toast.success("Mitigation updated");
    },
    onError: (error) => {
      toast.error(`Failed to update mitigation: ${error.message}`);
    },
  });
}

/**
 * Delete a mitigation action
 */
export function useDeleteMitigation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteMitigation,
    mutationFn: async (mitigationId: string) => {
      const { error } = await supabase
        .from("risk_mitigation_actions")
        .delete()
        .eq("id", mitigationId);

      if (error) throw error;
      return mitigationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risk() });
      toast.success("Mitigation deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete mitigation: ${error.message}`);
    },
  });
}

/**
 * Resolve a conflict
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.resolveConflict,
    mutationFn: async ({
      userId,
      payload,
    }: {
      userId: string;
      payload: ResolveConflictPayload;
    }) => {
      const status: ConflictStatus =
        payload.action === "resolve" ? "resolved" : "accepted";

      const { data: conflict, error } = await supabase
        .from("detected_clause_conflicts")
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          resolution_notes: payload.notes || null,
        })
        .eq("id", payload.conflict_id)
        .select()
        .single();

      if (error) throw error;

      // Record in history
      await supabase.from("conflict_resolution_history").insert({
        conflict_id: payload.conflict_id,
        action: status,
        performed_by: userId,
        notes: payload.notes || null,
      });

      return conflict as DetectedClauseConflict;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clauseConflicts({ contractId: data.contract_id }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clauseConflicts({}) });
      toast.success("Conflict resolved");
    },
    onError: (error) => {
      toast.error(`Failed to resolve conflict: ${error.message}`);
    },
  });
}

/**
 * Create a conflict rule
 */
export function useCreateConflictRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createConflictRule,
    mutationFn: async ({
      enterpriseId,
      data,
    }: {
      enterpriseId: string;
      data: CreateConflictRulePayload;
    }) => {
      const { data: rule, error } = await supabase
        .from("clause_conflict_rules")
        .insert({
          enterprise_id: enterpriseId,
          clause_a_id: data.clause_a_id,
          clause_b_id: data.clause_b_id,
          conflict_type: data.conflict_type,
          severity: data.severity,
          description: data.description,
          resolution_guidance: data.resolution_guidance || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return rule as ClauseConflictRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clauseConflicts({}) });
      toast.success("Conflict rule created");
    },
    onError: (error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
}

/**
 * Acknowledge a risk alert
 */
export function useAcknowledgeRiskAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.acknowledgeRiskAlert,
    mutationFn: async ({
      alertId,
      userId,
    }: {
      alertId: string;
      userId: string;
    }) => {
      const { data: alert, error } = await supabase
        .from("risk_alerts")
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
        })
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;
      return alert as RiskAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risk() });
      toast.success("Alert acknowledged");
    },
    onError: (error) => {
      toast.error(`Failed to acknowledge alert: ${error.message}`);
    },
  });
}

/**
 * Request risk analysis for a contract
 */
export function useRequestRiskAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.requestRiskAnalysis,
    mutationFn: async ({
      contractId,
      includeClauseConflicts = true,
    }: {
      contractId: string;
      includeClauseConflicts?: boolean;
    }) => {
      // This would typically call an edge function
      const { data, error } = await supabase.functions.invoke("risk-analysis", {
        body: {
          action: "analyze_contract",
          contract_id: contractId,
          include_clause_conflicts: includeClauseConflicts,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risk() });
      toast.success("Risk analysis requested");
    },
    onError: (error) => {
      toast.error(`Failed to request analysis: ${error.message}`);
    },
  });
}
