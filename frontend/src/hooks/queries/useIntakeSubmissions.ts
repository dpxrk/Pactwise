// src/hooks/queries/useIntakeSubmissions.ts
// Note: These hooks use type assertions because the Supabase generated types
// don't include the intake_submissions, intake_attachments, intake_comments, and related tables.
// Run `npm run types:generate` after applying migrations to update types.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type {
  IntakeSubmission,
  SubmissionStatus,
  SubmissionPriority,
  SubmitIntakeData,
  ReviewSubmissionData,
  ConvertSubmissionData,
} from "@/types/intake.types";
import { createClient } from "@/utils/supabase/client";

// Supabase client with type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// SUBMISSION QUERIES
// ============================================================================

interface SubmissionFilters {
  status?: SubmissionStatus;
  form_id?: string;
  priority?: SubmissionPriority;
}

/**
 * Fetch list of submissions
 */
export function useIntakeSubmissionList(
  enterpriseId: string,
  filters?: SubmissionFilters,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: queryKeys.intakeSubmissionList({ enterpriseId, ...filters, page, limit }),
    queryFn: async () => {
      const offset = (page - 1) * limit;

      let query = supabase
        .from("intake_submissions")
        .select(
          `
          *,
          form:contract_intake_forms(id, name, form_type),
          reviewer:users!reviewer_id(id, full_name, email)
        `,
          { count: "exact" }
        )
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.form_id) {
        query = query.eq("form_id", filters.form_id);
      }

      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        submissions: (data || []) as unknown as IntakeSubmission[],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
    enabled: !!enterpriseId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch pending submissions for review
 */
export function usePendingSubmissions(enterpriseId: string) {
  return useQuery({
    queryKey: queryKeys.intakeSubmissionsPending(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_submissions")
        .select(
          `
          *,
          form:contract_intake_forms(id, name, form_type)
        `
        )
        .eq("enterprise_id", enterpriseId)
        .in("status", ["submitted", "under_review"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as IntakeSubmission[];
    },
    enabled: !!enterpriseId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single submission with details
 */
export function useIntakeSubmission(submissionId: string) {
  return useQuery({
    queryKey: queryKeys.intakeSubmission(submissionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_submissions")
        .select(
          `
          *,
          form:contract_intake_forms(*, fields:intake_form_fields(*)),
          reviewer:users!reviewer_id(id, full_name, email),
          requester:users!requester_id(id, full_name, email),
          attachments:intake_attachments(*),
          comments:intake_comments(*, user:users(id, full_name))
        `
        )
        .eq("id", submissionId)
        .single();

      if (error) throw error;
      return data as unknown as IntakeSubmission;
    },
    enabled: !!submissionId,
  });
}

// ============================================================================
// SUBMISSION MUTATIONS
// ============================================================================

/**
 * Submit a new intake request
 */
export function useSubmitIntake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.submitIntake,
    mutationFn: async ({
      enterpriseId,
      userId,
      data,
    }: {
      enterpriseId: string;
      userId: string;
      data: SubmitIntakeData;
    }) => {
      // Generate submission number (simple version - backend has better function)
      const submissionNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;

      const { data: submission, error } = await supabase
        .from("intake_submissions")
        .insert({
          enterprise_id: enterpriseId,
          form_id: data.form_id,
          submission_number: submissionNumber,
          form_data: data.form_data,
          status: "submitted",
          requester_id: userId,
          requester_name: data.requester_name,
          requester_email: data.requester_email,
          requester_department: data.requester_department || null,
          priority: data.priority || "normal",
          target_date: data.target_date || null,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;

      const submissionData = submission as unknown as IntakeSubmission;

      // Add attachments if any
      if (data.attachments && data.attachments.length > 0) {
        const attachments = data.attachments.map((a) => ({
          submission_id: submissionData.id,
          file_name: a.file_name,
          file_path: a.file_path,
          file_size: a.file_size,
          mime_type: a.mime_type,
          uploaded_by: userId,
        }));

        const { error: attachError } = await supabase
          .from("intake_attachments")
          .insert(attachments as Record<string, unknown>[]);

        if (attachError) {
          console.error("Failed to add attachments:", attachError);
        }
      }

      return submissionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeSubmissions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });
      toast.success("Request submitted successfully");
    },
    onError: (error) => {
      toast.error("Failed to submit request: " + error.message);
    },
  });
}

/**
 * Review a submission (approve/reject/request changes)
 */
export function useReviewSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.reviewSubmission,
    mutationFn: async ({
      submissionId,
      reviewerId,
      data,
    }: {
      submissionId: string;
      reviewerId: string;
      data: ReviewSubmissionData;
    }) => {
      const newStatus =
        data.decision === "approve"
          ? "approved"
          : data.decision === "reject"
          ? "rejected"
          : "under_review";

      const { data: submission, error } = await supabase
        .from("intake_submissions")
        .update({
          status: newStatus,
          reviewer_id: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_comments: data.comments || null,
          assigned_owner_id: data.assigned_to || null,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;

      // Add review comment
      if (data.comments) {
        await supabase.from("intake_comments").insert({
          submission_id: submissionId,
          user_id: reviewerId,
          comment_text: data.comments,
          comment_type: "review",
        } as Record<string, unknown>);
      }

      return submission as unknown as IntakeSubmission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeSubmissions() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeSubmission(data.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });

      const message =
        data.status === "approved"
          ? "Submission approved"
          : data.status === "rejected"
          ? "Submission rejected"
          : "Submission updated";
      toast.success(message);
    },
    onError: (error) => {
      toast.error("Failed to review submission: " + error.message);
    },
  });
}

/**
 * Convert approved submission to contract
 */
export function useConvertSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.convertSubmission,
    mutationFn: async ({
      submissionId,
      enterpriseId,
      userId,
      data,
    }: {
      submissionId: string;
      enterpriseId: string;
      userId: string;
      data: ConvertSubmissionData;
    }) => {
      // Get submission first
      const { data: submissionRaw, error: subError } = await supabase
        .from("intake_submissions")
        .select("*, form:contract_intake_forms(*)")
        .eq("id", submissionId)
        .single();

      if (subError) throw subError;

      const submission = submissionRaw as unknown as IntakeSubmission & {
        form_data: Record<string, unknown>;
        form: { settings?: { default_contract_type?: string } } | null;
        assigned_owner_id: string | null;
        submission_number: string;
      };

      if (submission.status !== "approved") {
        throw new Error("Only approved submissions can be converted to contracts");
      }

      if (submission.contract_id) {
        throw new Error("Submission has already been converted");
      }

      // Create contract
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .insert({
          enterprise_id: enterpriseId,
          title: data.title,
          status: "draft",
          contract_type: data.contract_type || submission.form?.settings?.default_contract_type || "other",
          vendor_id: data.vendor_id || null,
          owner_id: data.owner_id || submission.assigned_owner_id || userId,
          created_by: userId,
          metadata: {
            intake_form_data: submission.form_data,
            intake_submission_number: submission.submission_number,
            ...data.additional_data,
          },
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Update submission
      const { error: updateError } = await supabase
        .from("intake_submissions")
        .update({
          status: "converted",
          contract_id: (contract as { id: string }).id,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", submissionId);

      if (updateError) throw updateError;

      return { submission, contract };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeSubmissions() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeSubmission(data.submission.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts() });
      toast.success("Submission converted to contract");
    },
    onError: (error) => {
      toast.error("Failed to convert submission: " + error.message);
    },
  });
}

/**
 * Add a comment to a submission
 */
export function useAddSubmissionComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.addSubmissionComment,
    mutationFn: async ({
      submissionId,
      userId,
      commentText,
      commentType = "general",
    }: {
      submissionId: string;
      userId: string;
      commentText: string;
      commentType?: "general" | "question" | "clarification" | "review";
    }) => {
      const { data, error } = await supabase
        .from("intake_comments")
        .insert({
          submission_id: submissionId,
          user_id: userId,
          comment_text: commentText,
          comment_type: commentType,
        } as Record<string, unknown>)
        .select("*, user:users(id, full_name)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeSubmission(variables.submissionId),
      });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });
}

/**
 * Update submission status only
 */
export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      status,
    }: {
      submissionId: string;
      status: SubmissionStatus;
    }) => {
      const { data, error } = await supabase
        .from("intake_submissions")
        .update({
          status,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as IntakeSubmission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeSubmissions() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.intakeSubmission(data.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.intakeStats() });
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });
}
