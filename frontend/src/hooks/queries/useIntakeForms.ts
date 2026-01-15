// src/hooks/queries/useIntakeForms.ts
// Note: These hooks use type assertions because the Supabase generated types
// don't include the contract_intake_forms, intake_form_fields, and related tables.
// Run `npm run types:generate` after applying migrations to update types.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  IntakeForm,
  IntakeFormField,
  IntakeFormStatus,
  IntakeFormType,
  CreateIntakeFormData,
  UpdateIntakeFormData,
  CreateIntakeFieldData,
  UpdateIntakeFieldData,
  IntakeStats,
  SubmissionStatus,
  SubmissionPriority,
} from "@/types/intake.types";
import { createClient } from "@/utils/supabase/client";

// Supabase client with type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// Type for submission data from stats query
interface SubmissionStatsRow {
  status: SubmissionStatus;
  priority: SubmissionPriority;
  created_at: string;
}

// Type for form data from stats query
interface FormStatsRow {
  id: string;
  status: IntakeFormStatus;
}

// ============================================================================
// FORM QUERIES
// ============================================================================

interface IntakeFormFilters {
  status?: IntakeFormStatus;
  form_type?: IntakeFormType;
}

/**
 * Fetch list of intake forms
 */
export function useIntakeFormList(
  enterpriseId: string,
  filters?: IntakeFormFilters
) {
  return useQuery({
    queryKey: queryKeys.intakeFormList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("contract_intake_forms")
        .select("*")
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      } else {
        query = query.neq("status", "archived");
      }

      if (filters?.form_type) {
        query = query.eq("form_type", filters.form_type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as IntakeForm[];
    },
    enabled: !!enterpriseId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch single intake form with fields
 */
export function useIntakeForm(formId: string) {
  return useQuery({
    queryKey: queryKeys.intakeForm(formId),
    queryFn: async () => {
      // Fetch form
      const { data: form, error: formError } = await supabase
        .from("contract_intake_forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (formError) throw formError;

      // Fetch fields
      const { data: fields, error: fieldsError } = await supabase
        .from("intake_form_fields")
        .select("*")
        .eq("form_id", formId)
        .order("display_order", { ascending: true });

      if (fieldsError) throw fieldsError;

      return {
        ...(form as IntakeForm),
        fields: (fields || []) as IntakeFormField[],
      } as IntakeForm & { fields: IntakeFormField[] };
    },
    enabled: !!formId,
  });
}

/**
 * Fetch intake statistics
 */
export function useIntakeStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.intakeStats(),
    queryFn: async () => {
      // Fetch submission counts by status
      const { data: submissions, error: subError } = await supabase
        .from("intake_submissions")
        .select("status, priority, created_at")
        .eq("enterprise_id", enterpriseId);

      if (subError) throw subError;

      // Fetch form counts
      const { data: forms, error: formError } = await supabase
        .from("contract_intake_forms")
        .select("id, status")
        .eq("enterprise_id", enterpriseId);

      if (formError) throw formError;

      const submissionData = (submissions || []) as SubmissionStatsRow[];
      const formData = (forms || []) as FormStatsRow[];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats: IntakeStats = {
        submissions: {
          total: submissionData.length,
          by_status: {
            draft: submissionData.filter((s) => s.status === "draft").length,
            submitted: submissionData.filter((s) => s.status === "submitted").length,
            under_review: submissionData.filter((s) => s.status === "under_review").length,
            approved: submissionData.filter((s) => s.status === "approved").length,
            rejected: submissionData.filter((s) => s.status === "rejected").length,
            converted: submissionData.filter((s) => s.status === "converted").length,
          },
          by_priority: {
            low: submissionData.filter((s) => s.priority === "low").length,
            normal: submissionData.filter((s) => s.priority === "normal").length,
            high: submissionData.filter((s) => s.priority === "high").length,
            urgent: submissionData.filter((s) => s.priority === "urgent").length,
          },
          pending_review: submissionData.filter((s) =>
            ["submitted", "under_review"].includes(s.status)
          ).length,
          last_30_days: submissionData.filter(
            (s) => new Date(s.created_at) >= thirtyDaysAgo
          ).length,
        },
        forms: {
          total_forms: formData.length,
          active_forms: formData.filter((f) => f.status === "active").length,
        },
      };

      return stats;
    },
    enabled: !!enterpriseId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// FORM MUTATIONS
// ============================================================================

/**
 * Create a new intake form
 */
export function useCreateIntakeForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createIntakeForm,
    mutationFn: async ({
      enterpriseId,
      data,
      userId,
    }: {
      enterpriseId: string;
      data: CreateIntakeFormData;
      userId: string;
    }) => {
      const { data: form, error } = await supabase
        .from("contract_intake_forms")
        .insert({
          enterprise_id: enterpriseId,
          name: data.name,
          description: data.description || null,
          form_type: data.form_type,
          settings: data.settings || {},
          status: "draft",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return form as IntakeForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForms() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });
      toast.success("Form created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create form: " + error.message);
    },
  });
}

/**
 * Update an intake form
 */
export function useUpdateIntakeForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateIntakeForm,
    mutationFn: async ({
      formId,
      data,
    }: {
      formId: string;
      data: UpdateIntakeFormData;
    }) => {
      const { data: form, error } = await supabase
        .from("contract_intake_forms")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formId)
        .select()
        .single();

      if (error) throw error;
      return form as IntakeForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForms() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForm(data.id) });
      toast.success("Form updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update form: " + error.message);
    },
  });
}

/**
 * Publish an intake form
 */
export function usePublishIntakeForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.publishIntakeForm,
    mutationFn: async (formId: string) => {
      // Check form has at least one field
      const { count } = await supabase
        .from("intake_form_fields")
        .select("id", { count: "exact", head: true })
        .eq("form_id", formId);

      if (!count || count === 0) {
        throw new Error("Form must have at least one field before publishing");
      }

      const { data: form, error } = await supabase
        .from("contract_intake_forms")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", formId)
        .select()
        .single();

      if (error) throw error;
      return form as IntakeForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForms() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForm(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });
      toast.success("Form published successfully");
    },
    onError: (error) => {
      toast.error("Failed to publish form: " + error.message);
    },
  });
}

/**
 * Archive an intake form
 */
export function useArchiveIntakeForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.archiveIntakeForm,
    mutationFn: async (formId: string) => {
      const { data: form, error } = await supabase
        .from("contract_intake_forms")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", formId)
        .select()
        .single();

      if (error) throw error;
      return form as IntakeForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForms() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForm(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });
      toast.success("Form archived successfully");
    },
    onError: (error) => {
      toast.error("Failed to archive form: " + error.message);
    },
  });
}

/**
 * Delete an intake form
 */
export function useDeleteIntakeForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteIntakeForm,
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from("contract_intake_forms")
        .delete()
        .eq("id", formId);

      if (error) throw error;
      return formId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeForms() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });
      toast.success("Form deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete form: " + error.message);
    },
  });
}

// ============================================================================
// FIELD MUTATIONS
// ============================================================================

/**
 * Create a new field
 */
export function useCreateIntakeField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createIntakeField,
    mutationFn: async ({
      formId,
      data,
    }: {
      formId: string;
      data: CreateIntakeFieldData;
    }) => {
      // Get max display order
      const { data: maxOrderField } = await supabase
        .from("intake_form_fields")
        .select("display_order")
        .eq("form_id", formId)
        .order("display_order", { ascending: false })
        .limit(1)
        .single();

      const maxOrder = (maxOrderField as { display_order: number } | null)?.display_order || 0;

      const { data: field, error } = await supabase
        .from("intake_form_fields")
        .insert({
          form_id: formId,
          field_name: data.field_name,
          field_label: data.field_label,
          field_type: data.field_type,
          field_config: data.field_config || {},
          validation_rules: data.validation_rules || {},
          is_required: data.is_required ?? false,
          display_order: data.display_order ?? (maxOrder + 1),
          conditional_logic: data.conditional_logic || null,
        })
        .select()
        .single();

      if (error) throw error;
      return field as IntakeFormField;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeForm(variables.formId),
      });
      toast.success("Field added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add field: " + error.message);
    },
  });
}

/**
 * Update a field
 */
export function useUpdateIntakeField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateIntakeField,
    mutationFn: async ({
      fieldId,
      formId,
      data,
    }: {
      fieldId: string;
      formId: string;
      data: UpdateIntakeFieldData;
    }) => {
      const { data: field, error } = await supabase
        .from("intake_form_fields")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fieldId)
        .select()
        .single();

      if (error) throw error;
      return { field: field as IntakeFormField, formId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeForm(data.formId),
      });
      toast.success("Field updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update field: " + error.message);
    },
  });
}

/**
 * Delete a field
 */
export function useDeleteIntakeField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteIntakeField,
    mutationFn: async ({
      fieldId,
      formId,
    }: {
      fieldId: string;
      formId: string;
    }) => {
      const { error } = await supabase
        .from("intake_form_fields")
        .delete()
        .eq("id", fieldId);

      if (error) throw error;
      return { fieldId, formId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeForm(data.formId),
      });
      toast.success("Field deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete field: " + error.message);
    },
  });
}

/**
 * Reorder fields
 */
export function useReorderIntakeFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.reorderIntakeFields,
    mutationFn: async ({
      formId,
      fieldOrder,
    }: {
      formId: string;
      fieldOrder: { field_id: string; display_order: number }[];
    }) => {
      // Update each field's order
      for (const item of fieldOrder) {
        const { error } = await supabase
          .from("intake_form_fields")
          .update({ display_order: item.display_order })
          .eq("id", item.field_id)
          .eq("form_id", formId);

        if (error) throw error;
      }

      return formId;
    },
    onSuccess: (formId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeForm(formId),
      });
    },
    onError: (error) => {
      toast.error("Failed to reorder fields: " + error.message);
    },
  });
}
