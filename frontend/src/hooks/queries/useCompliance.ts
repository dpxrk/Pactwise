// src/hooks/queries/useCompliance.ts
// React Query hooks for Compliance Rules Engine

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import { toast } from "sonner";
import type {
  RegulatoryFramework,
  EnterpriseComplianceFramework,
  ComplianceRule,
  ContractComplianceCheck,
  ComplianceCheckListItem,
  ComplianceIssue,
  ComplianceIssueListItem,
  ComplianceCertification,
  ComplianceStats,
  ComplianceCheckFilters,
  ComplianceIssueFilters,
  ComplianceRuleFilters,
  CreateComplianceRulePayload,
  UpdateComplianceRulePayload,
  RunComplianceCheckPayload,
  CreateComplianceIssuePayload,
  UpdateComplianceIssuePayload,
  EnableFrameworkPayload,
  CheckStatus,
  IssueStatus,
  IssuePriority,
} from "@/types/compliance.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all available regulatory frameworks
 */
export function useRegulatoryFrameworks() {
  return useQuery({
    queryKey: queryKeys.complianceFrameworks(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regulatory_frameworks")
        .select("*")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as RegulatoryFramework[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch frameworks enabled for enterprise
 */
export function useEnterpriseFrameworks(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.complianceFramework(enterpriseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enterprise_compliance_frameworks")
        .select(`
          *,
          framework:regulatory_frameworks (*)
        `)
        .eq("enterprise_id", enterpriseId);

      if (error) throw error;
      return (data || []) as EnterpriseComplianceFramework[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch compliance rules
 */
export function useComplianceRules(
  enterpriseId: string,
  filters?: ComplianceRuleFilters
) {
  return useQuery({
    queryKey: queryKeys.complianceRules({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("compliance_rules")
        .select(`
          *,
          requirement:compliance_requirements (*),
          group:compliance_rule_groups (id, name)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("name", { ascending: true });

      if (filters?.rule_type) {
        if (Array.isArray(filters.rule_type)) {
          query = query.in("rule_type", filters.rule_type);
        } else {
          query = query.eq("rule_type", filters.rule_type);
        }
      }

      if (filters?.severity) {
        if (Array.isArray(filters.severity)) {
          query = query.in("severity", filters.severity);
        } else {
          query = query.eq("severity", filters.severity);
        }
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ComplianceRule[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch compliance checks
 */
export function useComplianceChecks(
  enterpriseId: string,
  filters?: ComplianceCheckFilters
) {
  return useQuery({
    queryKey: queryKeys.complianceChecks({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("contract_compliance_checks")
        .select(`
          id,
          contract_id,
          overall_status,
          score,
          findings_summary,
          checked_at,
          next_check_due,
          contracts (
            id,
            title
          ),
          framework:regulatory_frameworks (name)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("checked_at", { ascending: false });

      if (filters?.contract_id) {
        query = query.eq("contract_id", filters.contract_id);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("overall_status", filters.status);
        } else {
          query = query.eq("overall_status", filters.status);
        }
      }

      if (filters?.score_min !== undefined) {
        query = query.gte("score", filters.score_min);
      }

      if (filters?.score_max !== undefined) {
        query = query.lte("score", filters.score_max);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        contract_id: item.contract_id,
        contract_title: (item.contracts as Record<string, string>)?.title || "Unknown",
        framework_name: (item.framework as Record<string, string>)?.name || null,
        overall_status: item.overall_status,
        score: item.score,
        critical_failures: (item.findings_summary as Record<string, number>)?.critical_failures || 0,
        checked_at: item.checked_at,
        next_check_due: item.next_check_due,
      })) as ComplianceCheckListItem[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch single compliance check with results
 */
export function useComplianceCheck(checkId: string) {
  return useQuery({
    queryKey: queryKeys.complianceCheck(checkId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_compliance_checks")
        .select(`
          *,
          contracts (id, title, contract_number),
          results:compliance_check_results (
            *,
            rule:compliance_rules (id, name, severity)
          )
        `)
        .eq("id", checkId)
        .single();

      if (error) throw error;
      return data as ContractComplianceCheck;
    },
    enabled: !!checkId,
  });
}

/**
 * Fetch compliance issues
 */
export function useComplianceIssues(
  enterpriseId: string,
  filters?: ComplianceIssueFilters
) {
  return useQuery({
    queryKey: queryKeys.complianceIssues({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("compliance_issues")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          created_at,
          contract:contracts (title),
          assignee:users!assigned_to (
            id,
            raw_user_meta_data
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

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

      if (filters?.contract_id) {
        query = query.eq("contract_id", filters.contract_id);
      }

      if (filters?.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }

      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        title: item.title,
        contract_title: (item.contract as Record<string, string>)?.title || null,
        status: item.status,
        priority: item.priority,
        assigned_to_name: item.assignee
          ? ((item.assignee as Record<string, unknown>).raw_user_meta_data as Record<string, string>)?.full_name || null
          : null,
        due_date: item.due_date,
        created_at: item.created_at,
        is_overdue:
          item.due_date &&
          item.status !== "resolved" &&
          item.status !== "waived" &&
          new Date(item.due_date as string) < now,
      })) as ComplianceIssueListItem[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch single compliance issue
 */
export function useComplianceIssue(issueId: string) {
  return useQuery({
    queryKey: queryKeys.complianceIssue(issueId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_issues")
        .select(`
          *,
          contract:contracts (id, title),
          assignee:users!assigned_to (
            id,
            raw_user_meta_data
          ),
          comments:compliance_issue_comments (
            *,
            user:users (
              id,
              raw_user_meta_data
            )
          )
        `)
        .eq("id", issueId)
        .single();

      if (error) throw error;

      return {
        ...data,
        assignee: data.assignee
          ? {
              id: data.assignee.id,
              full_name: data.assignee.raw_user_meta_data?.full_name || "Unknown",
              email: data.assignee.raw_user_meta_data?.email || "",
            }
          : undefined,
        comments: (data.comments || []).map((c: Record<string, unknown>) => ({
          ...c,
          user: c.user
            ? {
                id: (c.user as Record<string, unknown>).id,
                full_name: ((c.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
              }
            : undefined,
        })),
      } as ComplianceIssue;
    },
    enabled: !!issueId,
  });
}

/**
 * Fetch certifications
 */
export function useComplianceCertifications(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.complianceCertifications(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_certifications")
        .select(`
          *,
          framework:regulatory_frameworks (id, name, code),
          renewals:certification_renewals (*)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      return (data || []) as ComplianceCertification[];
    },
    enabled: !!enterpriseId,
  });
}

/**
 * Fetch compliance statistics
 */
export function useComplianceStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.complianceStats(),
    queryFn: async () => {
      // Fetch checks
      const { data: checks, error: checksError } = await supabase
        .from("contract_compliance_checks")
        .select("overall_status, score")
        .eq("enterprise_id", enterpriseId);

      if (checksError) throw checksError;

      // Fetch issues
      const { data: issues, error: issuesError } = await supabase
        .from("compliance_issues")
        .select("status, priority")
        .eq("enterprise_id", enterpriseId);

      if (issuesError) throw issuesError;

      // Fetch certifications
      const { data: certs, error: certsError } = await supabase
        .from("compliance_certifications")
        .select("status, expiry_date")
        .eq("enterprise_id", enterpriseId);

      if (certsError) throw certsError;

      // Fetch enabled frameworks
      const { count: frameworkCount } = await supabase
        .from("enterprise_compliance_frameworks")
        .select("id", { count: "exact", head: true })
        .eq("enterprise_id", enterpriseId);

      const checkData = checks || [];
      const issueData = issues || [];
      const certData = certs || [];

      const byStatus: Record<CheckStatus, number> = {
        passed: 0,
        failed: 0,
        warning: 0,
        skipped: 0,
        pending: 0,
      };

      checkData.forEach((c: { overall_status: CheckStatus }) => {
        byStatus[c.overall_status]++;
      });

      const avgScore =
        checkData.length > 0
          ? checkData.reduce((sum: number, c: { score: number }) => sum + c.score, 0) / checkData.length
          : 0;

      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        overall_score: Math.round(avgScore),
        contracts_checked: checkData.length,
        total_checks: checkData.length,
        by_status: byStatus,
        critical_issues: issueData.filter((i: { priority: IssuePriority }) => i.priority === "critical").length,
        open_issues: issueData.filter((i: { status: IssueStatus }) =>
          ["open", "in_progress"].includes(i.status)
        ).length,
        certifications_expiring: certData.filter((c: { expiry_date: string }) =>
          new Date(c.expiry_date) <= thirtyDays
        ).length,
        frameworks_enabled: frameworkCount || 0,
      } as ComplianceStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Enable a framework for enterprise
 */
export function useEnableFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.enableFramework,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: EnableFrameworkPayload;
    }) => {
      const { data: framework, error } = await supabase
        .from("enterprise_compliance_frameworks")
        .insert({
          enterprise_id: enterpriseId,
          framework_id: data.framework_id,
          is_mandatory: data.is_mandatory ?? false,
          applies_to: data.applies_to || { all: true },
          customizations: data.customizations || {},
          enabled_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return framework as EnterpriseComplianceFramework;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.compliance() });
      toast.success("Framework enabled successfully");
    },
    onError: (error) => {
      toast.error(`Failed to enable framework: ${error.message}`);
    },
  });
}

/**
 * Disable a framework
 */
export function useDisableFramework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.disableFramework,
    mutationFn: async (enterpriseFrameworkId: string) => {
      const { error } = await supabase
        .from("enterprise_compliance_frameworks")
        .delete()
        .eq("id", enterpriseFrameworkId);

      if (error) throw error;
      return enterpriseFrameworkId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.compliance() });
      toast.success("Framework disabled successfully");
    },
    onError: (error) => {
      toast.error(`Failed to disable framework: ${error.message}`);
    },
  });
}

/**
 * Create a compliance rule
 */
export function useCreateComplianceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createComplianceRule,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: CreateComplianceRulePayload;
    }) => {
      const { data: rule, error } = await supabase
        .from("compliance_rules")
        .insert({
          enterprise_id: enterpriseId,
          requirement_id: data.requirement_id || null,
          group_id: data.group_id || null,
          name: data.name,
          description: data.description || null,
          rule_type: data.rule_type,
          rule_definition: data.rule_definition,
          severity: data.severity,
          auto_remediation: data.auto_remediation || null,
          applies_to: data.applies_to || {},
          status: "active",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return rule as ComplianceRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceRules() });
      toast.success("Compliance rule created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
}

/**
 * Update a compliance rule
 */
export function useUpdateComplianceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateComplianceRule,
    mutationFn: async ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: UpdateComplianceRulePayload;
    }) => {
      const { data: rule, error } = await supabase
        .from("compliance_rules")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ruleId)
        .select()
        .single();

      if (error) throw error;
      return rule as ComplianceRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceRules() });
      toast.success("Compliance rule updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

/**
 * Run a compliance check on a contract
 */
export function useRunComplianceCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.runComplianceCheck,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: RunComplianceCheckPayload;
    }) => {
      // Create the check record
      const { data: check, error } = await supabase
        .from("contract_compliance_checks")
        .insert({
          enterprise_id: enterpriseId,
          contract_id: data.contract_id,
          framework_id: data.framework_id || null,
          check_type: "manual",
          overall_status: "pending",
          score: 0,
          findings_summary: { total_rules: 0, passed: 0, failed: 0, warnings: 0, skipped: 0, critical_failures: 0 },
          checked_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // In a real implementation, this would trigger the actual compliance check
      // For now, we just return the created check
      return check as ContractComplianceCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceChecks() });
      toast.success("Compliance check initiated");
    },
    onError: (error) => {
      toast.error(`Failed to run compliance check: ${error.message}`);
    },
  });
}

/**
 * Create a compliance issue
 */
export function useCreateComplianceIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createComplianceIssue,
    mutationFn: async ({
      enterpriseId,
      data,
    }: {
      enterpriseId: string;
      data: CreateComplianceIssuePayload;
    }) => {
      const { data: issue, error } = await supabase
        .from("compliance_issues")
        .insert({
          enterprise_id: enterpriseId,
          contract_id: data.contract_id || null,
          check_result_id: data.check_result_id || null,
          rule_id: data.rule_id || null,
          title: data.title,
          description: data.description,
          priority: data.priority,
          assigned_to: data.assigned_to || null,
          due_date: data.due_date || null,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return issue as ComplianceIssue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceIssues() });
      toast.success("Issue created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create issue: ${error.message}`);
    },
  });
}

/**
 * Update a compliance issue
 */
export function useUpdateComplianceIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateComplianceIssue,
    mutationFn: async ({
      issueId,
      data,
    }: {
      issueId: string;
      data: UpdateComplianceIssuePayload;
    }) => {
      const updateData: Record<string, unknown> = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      if (data.status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data: issue, error } = await supabase
        .from("compliance_issues")
        .update(updateData)
        .eq("id", issueId)
        .select()
        .single();

      if (error) throw error;
      return issue as ComplianceIssue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceIssues() });
      queryClient.invalidateQueries({ queryKey: queryKeys.complianceIssue(data.id) });
      toast.success("Issue updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update issue: ${error.message}`);
    },
  });
}
