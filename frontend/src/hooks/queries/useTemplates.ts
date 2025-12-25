// src/hooks/queries/useTemplates.ts
// React Query hooks for Contract Templates management

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import { toast } from "sonner";
import type {
  ContractTemplate,
  TemplateListItem,
  TemplateSection,
  TemplateVariable,
  TemplateVersion,
  TemplateFilters,
  TemplateStats,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  CreateSectionPayload,
  UpdateSectionPayload,
  CreateVariablePayload,
  UpdateVariablePayload,
  RenderTemplatePayload,
  TemplateStatus,
} from "@/types/template.types";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch list of contract templates
 */
export function useTemplateList(
  enterpriseId: string,
  filters?: TemplateFilters
) {
  return useQuery({
    queryKey: queryKeys.templateList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("contract_templates")
        .select(`
          id,
          name,
          description,
          template_type,
          category,
          status,
          version,
          is_default,
          created_at,
          updated_at,
          created_by,
          users:created_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("enterprise_id", enterpriseId)
        .order("updated_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      } else {
        query = query.neq("status", "archived");
      }

      if (filters?.template_type) {
        if (Array.isArray(filters.template_type)) {
          query = query.in("template_type", filters.template_type);
        } else {
          query = query.eq("template_type", filters.template_type);
        }
      }

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.is_default !== undefined) {
        query = query.eq("is_default", filters.is_default);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get usage counts
      const templateIds = (data || []).map((t: { id: string }) => t.id);
      const { data: usageData } = await supabase
        .from("template_usage_analytics")
        .select("template_id")
        .in("template_id", templateIds);

      const usageCounts = (usageData || []).reduce((acc: Record<string, number>, item: { template_id: string }) => {
        acc[item.template_id] = (acc[item.template_id] || 0) + 1;
        return acc;
      }, {});

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        template_type: item.template_type,
        category: item.category,
        status: item.status,
        version: item.version,
        is_default: item.is_default,
        usage_count: usageCounts[item.id as string] || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_by: {
          id: item.created_by,
          full_name: ((item.users as Record<string, unknown>)?.raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
        },
      })) as TemplateListItem[];
    },
    enabled: !!enterpriseId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch single template with sections and variables
 */
export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: queryKeys.template(templateId),
    queryFn: async () => {
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from("contract_templates")
        .select(`
          *,
          users:created_by (
            id,
            raw_user_meta_data
          ),
          approver:approved_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Fetch sections
      const { data: sections, error: sectionsError } = await supabase
        .from("template_sections")
        .select(`
          *,
          clauses:template_clause_mappings (
            *,
            clause:clause_definitions (
              id,
              name,
              category,
              content
            )
          )
        `)
        .eq("template_id", templateId)
        .order("section_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch variables
      const { data: variables, error: variablesError } = await supabase
        .from("template_variables")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order", { ascending: true });

      if (variablesError) throw variablesError;

      return {
        ...template,
        sections: sections || [],
        variables: variables || [],
        creator: template.users ? {
          id: template.users.id,
          full_name: template.users.raw_user_meta_data?.full_name || "Unknown",
        } : undefined,
        approver: template.approver ? {
          id: template.approver.id,
          full_name: template.approver.raw_user_meta_data?.full_name || "Unknown",
        } : undefined,
      } as ContractTemplate;
    },
    enabled: !!templateId,
  });
}

/**
 * Fetch template version history
 */
export function useTemplateVersions(templateId: string) {
  return useQuery({
    queryKey: queryKeys.templateVersions(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_versions")
        .select(`
          *,
          creator:created_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("template_id", templateId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      return (data || []).map((v: Record<string, unknown>) => ({
        ...v,
        creator: v.creator ? {
          id: (v.creator as Record<string, unknown>).id,
          full_name: ((v.creator as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name || "Unknown",
        } : undefined,
      })) as TemplateVersion[];
    },
    enabled: !!templateId,
  });
}

/**
 * Fetch template statistics
 */
export function useTemplateStats(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.templateStats(),
    queryFn: async () => {
      const { data: templates, error } = await supabase
        .from("contract_templates")
        .select("id, status, template_type")
        .eq("enterprise_id", enterpriseId);

      if (error) throw error;

      const templateData = templates || [];

      // Count by status
      const byStatus = templateData.reduce((acc: Record<TemplateStatus, number>, t: { status: TemplateStatus }) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<TemplateStatus, number>);

      // Count by type
      const byType = templateData.reduce((acc: Record<string, number>, t: { template_type: string }) => {
        acc[t.template_type] = (acc[t.template_type] || 0) + 1;
        return acc;
      }, {});

      // Get most used templates
      const { data: usageData } = await supabase
        .from("template_usage_analytics")
        .select("template_id, contract_templates(name)")
        .eq("contract_templates.enterprise_id", enterpriseId);

      const usageCounts: Record<string, { id: string; name: string; count: number }> = {};
      (usageData || []).forEach((u: { template_id: string; contract_templates: { name: string } }) => {
        if (!usageCounts[u.template_id]) {
          usageCounts[u.template_id] = {
            id: u.template_id,
            name: u.contract_templates?.name || "Unknown",
            count: 0,
          };
        }
        usageCounts[u.template_id].count++;
      });

      const mostUsed = Object.values(usageCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((t) => ({
          template_id: t.id,
          template_name: t.name,
          usage_count: t.count,
        }));

      return {
        total: templateData.length,
        by_status: byStatus,
        by_type: byType,
        most_used: mostUsed,
        recently_updated: [],
      } as TemplateStats;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createTemplate,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: CreateTemplatePayload;
    }) => {
      const { data: template, error } = await supabase
        .from("contract_templates")
        .insert({
          enterprise_id: enterpriseId,
          name: data.name,
          description: data.description || null,
          template_type: data.template_type,
          category: data.category || null,
          jurisdiction: data.jurisdiction || null,
          language: data.language || "en",
          metadata: data.metadata || {},
          is_default: data.is_default || false,
          status: "draft",
          version: 1,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return template as ContractTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates() });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

/**
 * Update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateTemplate,
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateTemplatePayload;
    }) => {
      const { data: template, error } = await supabase
        .from("contract_templates")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return template as ContractTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.template(data.id) });
      toast.success("Template updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteTemplate,
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates() });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}

/**
 * Publish a template (set status to active)
 */
export function usePublishTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.publishTemplate,
    mutationFn: async ({
      templateId,
      approverId,
    }: {
      templateId: string;
      approverId: string;
    }) => {
      const { data: template, error } = await supabase
        .from("contract_templates")
        .update({
          status: "active",
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return template as ContractTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.template(data.id) });
      toast.success("Template published successfully");
    },
    onError: (error) => {
      toast.error(`Failed to publish template: ${error.message}`);
    },
  });
}

/**
 * Create a template section
 */
export function useCreateTemplateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createTemplateSection,
    mutationFn: async (data: CreateSectionPayload) => {
      // Get max section order
      const { data: maxOrderSection } = await supabase
        .from("template_sections")
        .select("section_order")
        .eq("template_id", data.template_id)
        .eq("parent_section_id", data.parent_section_id || null)
        .order("section_order", { ascending: false })
        .limit(1)
        .single();

      const maxOrder = (maxOrderSection as { section_order: number } | null)?.section_order || 0;

      const { data: section, error } = await supabase
        .from("template_sections")
        .insert({
          template_id: data.template_id,
          parent_section_id: data.parent_section_id || null,
          title: data.title,
          content: data.content,
          section_order: data.section_order ?? (maxOrder + 1),
          numbering_style: data.numbering_style || "numeric",
          is_optional: data.is_optional || false,
          conditional_logic: data.conditional_logic || null,
          metadata: data.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return section as TemplateSection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.template(variables.template_id),
      });
      toast.success("Section added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add section: ${error.message}`);
    },
  });
}

/**
 * Update a template section
 */
export function useUpdateTemplateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateTemplateSection,
    mutationFn: async ({
      sectionId,
      templateId,
      data,
    }: {
      sectionId: string;
      templateId: string;
      data: UpdateSectionPayload;
    }) => {
      const { data: section, error } = await supabase
        .from("template_sections")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sectionId)
        .select()
        .single();

      if (error) throw error;
      return { section: section as TemplateSection, templateId };
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.template(templateId),
      });
      toast.success("Section updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });
}

/**
 * Delete a template section
 */
export function useDeleteTemplateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteTemplateSection,
    mutationFn: async ({
      sectionId,
      templateId,
    }: {
      sectionId: string;
      templateId: string;
    }) => {
      const { error } = await supabase
        .from("template_sections")
        .delete()
        .eq("id", sectionId);

      if (error) throw error;
      return { sectionId, templateId };
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.template(templateId),
      });
      toast.success("Section deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });
}

/**
 * Create a template variable
 */
export function useCreateTemplateVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createTemplateVariable,
    mutationFn: async (data: CreateVariablePayload) => {
      // Get max display order
      const { data: maxOrderVariable } = await supabase
        .from("template_variables")
        .select("display_order")
        .eq("template_id", data.template_id)
        .order("display_order", { ascending: false })
        .limit(1)
        .single();

      const maxOrder = (maxOrderVariable as { display_order: number } | null)?.display_order || 0;

      const { data: variable, error } = await supabase
        .from("template_variables")
        .insert({
          template_id: data.template_id,
          variable_name: data.variable_name,
          variable_label: data.variable_label,
          variable_type: data.variable_type,
          default_value: data.default_value || null,
          is_required: data.is_required ?? false,
          validation_rules: data.validation_rules || {},
          options: data.options || null,
          description: data.description || null,
          display_order: data.display_order ?? (maxOrder + 1),
          group_name: data.group_name || null,
          computed_formula: data.computed_formula || null,
        })
        .select()
        .single();

      if (error) throw error;
      return variable as TemplateVariable;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.template(variables.template_id),
      });
      toast.success("Variable added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add variable: ${error.message}`);
    },
  });
}

/**
 * Update a template variable
 */
export function useUpdateTemplateVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateTemplateVariable,
    mutationFn: async ({
      variableId,
      templateId,
      data,
    }: {
      variableId: string;
      templateId: string;
      data: UpdateVariablePayload;
    }) => {
      const { data: variable, error } = await supabase
        .from("template_variables")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", variableId)
        .select()
        .single();

      if (error) throw error;
      return { variable: variable as TemplateVariable, templateId };
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.template(templateId),
      });
      toast.success("Variable updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update variable: ${error.message}`);
    },
  });
}

/**
 * Delete a template variable
 */
export function useDeleteTemplateVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteTemplateVariable,
    mutationFn: async ({
      variableId,
      templateId,
    }: {
      variableId: string;
      templateId: string;
    }) => {
      const { error } = await supabase
        .from("template_variables")
        .delete()
        .eq("id", variableId);

      if (error) throw error;
      return { variableId, templateId };
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.template(templateId),
      });
      toast.success("Variable deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete variable: ${error.message}`);
    },
  });
}

/**
 * Render a template with variables (preview)
 */
export function useRenderTemplate() {
  return useMutation({
    mutationKey: mutationKeys.renderTemplate,
    mutationFn: async (payload: RenderTemplatePayload) => {
      // Fetch template with sections
      const { data: template, error: templateError } = await supabase
        .from("contract_templates")
        .select(`
          *,
          sections:template_sections (*)
        `)
        .eq("id", payload.template_id)
        .single();

      if (templateError) throw templateError;

      // Simple variable substitution
      let renderedContent = "";
      const sections = (template.sections || [])
        .filter((s: TemplateSection) => {
          if (payload.include_sections?.length) {
            return payload.include_sections.includes(s.id);
          }
          if (payload.exclude_sections?.length) {
            return !payload.exclude_sections.includes(s.id);
          }
          return true;
        })
        .sort((a: TemplateSection, b: TemplateSection) => a.section_order - b.section_order);

      for (const section of sections) {
        let content = section.content;

        // Replace variables
        for (const [key, value] of Object.entries(payload.variables)) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
          content = content.replace(regex, String(value));
        }

        renderedContent += `\n## ${section.title}\n\n${content}\n`;
      }

      return {
        template_id: payload.template_id,
        rendered_content: renderedContent.trim(),
        variables_used: payload.variables,
      };
    },
  });
}
