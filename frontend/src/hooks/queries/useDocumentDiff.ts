// src/hooks/queries/useDocumentDiff.ts
// React Query hooks for Document Version Comparison System

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import { toast } from "sonner";
import type {
  DocumentVersion,
  DocumentVersionListItem,
  DocumentComparison,
  DocumentChange,
  DocumentComment,
  CommentThread,
  RedlineSession,
  VersionStats,
  CommentStats,
  VersionFilters,
  CommentFilters,
  ChangeFilters,
  CreateVersionPayload,
  CompareVersionsPayload,
  CreateCommentPayload,
  UpdateCommentPayload,
  ReviewChangePayload,
  BulkReviewChangesPayload,
  CreateRedlineSessionPayload,
  VersionType,
  ChangeStatus,
  CommentStatus,
} from "@/types/document-diff.types";

// Type assertion for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch document versions for a contract
 */
export function useDocumentVersions(
  contractId: string,
  filters?: VersionFilters
) {
  return useQuery({
    queryKey: queryKeys.documentVersions({ contractId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("document_versions")
        .select(`
          id,
          version_number,
          version_type,
          file_name,
          file_size,
          is_current,
          created_at,
          creator:created_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("contract_id", contractId)
        .order("version_number", { ascending: false });

      if (filters?.version_type) {
        if (Array.isArray(filters.version_type)) {
          query = query.in("version_type", filters.version_type);
        } else {
          query = query.eq("version_type", filters.version_type);
        }
      }

      if (filters?.created_by) {
        query = query.eq("created_by", filters.created_by);
      }

      if (filters?.date_from) {
        query = query.gte("created_at", filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte("created_at", filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get change counts for each version
      const versionIds = (data || []).map((v: { id: string }) => v.id);
      const { data: comparisons } = await supabase
        .from("document_comparisons")
        .select("target_version_id, change_statistics")
        .in("target_version_id", versionIds);

      const changeCounts = (comparisons || []).reduce(
        (acc: Record<string, number>, c: { target_version_id: string; change_statistics: { total_changes: number } }) => {
          acc[c.target_version_id] = c.change_statistics?.total_changes || 0;
          return acc;
        },
        {}
      );

      return (data || []).map((v: Record<string, unknown>) => ({
        id: v.id,
        version_number: v.version_number,
        version_type: v.version_type,
        file_name: v.file_name,
        created_at: v.created_at,
        is_current: v.is_current,
        creator: {
          id: (v.creator as Record<string, unknown>)?.id || "",
          full_name:
            ((v.creator as Record<string, unknown>)?.raw_user_meta_data as Record<string, unknown>)?.full_name ||
            "Unknown",
        },
        changes_count: changeCounts[v.id as string] || 0,
      })) as DocumentVersionListItem[];
    },
    enabled: !!contractId,
  });
}

/**
 * Fetch single document version with full content
 */
export function useDocumentVersion(versionId: string) {
  return useQuery({
    queryKey: queryKeys.documentVersion(versionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_versions")
        .select(`
          *,
          creator:created_by (
            id,
            raw_user_meta_data,
            email
          )
        `)
        .eq("id", versionId)
        .single();

      if (error) throw error;

      return {
        ...data,
        creator: data.creator
          ? {
              id: data.creator.id,
              full_name: data.creator.raw_user_meta_data?.full_name || "Unknown",
              email: data.creator.email,
            }
          : undefined,
      } as DocumentVersion;
    },
    enabled: !!versionId,
  });
}

/**
 * Fetch document comparison between two versions
 */
export function useDocumentComparison(
  sourceVersionId: string,
  targetVersionId: string
) {
  return useQuery({
    queryKey: queryKeys.documentComparison(sourceVersionId, targetVersionId),
    queryFn: async () => {
      // Check if comparison exists
      const { data: existing, error: existingError } = await supabase
        .from("document_comparisons")
        .select(`
          *,
          source_version:source_version_id (
            id,
            version_number,
            version_type,
            file_name,
            created_at
          ),
          target_version:target_version_id (
            id,
            version_number,
            version_type,
            file_name,
            created_at
          )
        `)
        .eq("source_version_id", sourceVersionId)
        .eq("target_version_id", targetVersionId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return existing as DocumentComparison;
      }

      // Generate new comparison if doesn't exist
      // This would typically be done server-side
      return null;
    },
    enabled: !!sourceVersionId && !!targetVersionId,
  });
}

/**
 * Fetch changes from a comparison
 */
export function useDocumentChanges(
  comparisonId: string,
  filters?: ChangeFilters
) {
  return useQuery({
    queryKey: queryKeys.documentChanges({ comparisonId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("document_changes")
        .select(`
          *,
          reviewer:reviewed_by (
            id,
            raw_user_meta_data
          )
        `)
        .eq("comparison_id", comparisonId)
        .order("location->start_position", { ascending: true });

      if (filters?.change_type) {
        if (Array.isArray(filters.change_type)) {
          query = query.in("change_type", filters.change_type);
        } else {
          query = query.eq("change_type", filters.change_type);
        }
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((c: Record<string, unknown>) => ({
        ...c,
        reviewer: c.reviewer
          ? {
              id: (c.reviewer as Record<string, unknown>).id,
              full_name:
                ((c.reviewer as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                "Unknown",
            }
          : undefined,
      })) as DocumentChange[];
    },
    enabled: !!comparisonId,
  });
}

/**
 * Fetch comments for a document version
 */
export function useDocumentComments(
  versionId: string,
  filters?: CommentFilters
) {
  return useQuery({
    queryKey: queryKeys.documentComments({ versionId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("document_comments")
        .select(`
          *,
          user:user_id (
            id,
            raw_user_meta_data,
            email
          )
        `)
        .eq("version_id", versionId)
        .is("parent_comment_id", null)
        .neq("status", "deleted")
        .order("created_at", { ascending: true });

      if (filters?.comment_type) {
        if (Array.isArray(filters.comment_type)) {
          query = query.in("comment_type", filters.comment_type);
        } else {
          query = query.eq("comment_type", filters.comment_type);
        }
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch replies for each comment
      const commentIds = (data || []).map((c: { id: string }) => c.id);
      const { data: replies } = await supabase
        .from("document_comments")
        .select(`
          *,
          user:user_id (
            id,
            raw_user_meta_data,
            email
          )
        `)
        .in("parent_comment_id", commentIds)
        .neq("status", "deleted")
        .order("created_at", { ascending: true });

      const repliesByParent = (replies || []).reduce(
        (acc: Record<string, DocumentComment[]>, r: Record<string, unknown>) => {
          const parentId = r.parent_comment_id as string;
          if (!acc[parentId]) acc[parentId] = [];
          acc[parentId].push({
            ...r,
            user: r.user
              ? {
                  id: (r.user as Record<string, unknown>).id as string,
                  full_name:
                    ((r.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name as string ||
                    "Unknown",
                  email: (r.user as Record<string, unknown>).email as string,
                }
              : undefined,
          } as DocumentComment);
          return acc;
        },
        {}
      );

      return (data || []).map((c: Record<string, unknown>) => ({
        ...c,
        user: c.user
          ? {
              id: (c.user as Record<string, unknown>).id,
              full_name:
                ((c.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                "Unknown",
              email: (c.user as Record<string, unknown>).email,
            }
          : undefined,
        replies: repliesByParent[c.id as string] || [],
      })) as DocumentComment[];
    },
    enabled: !!versionId,
  });
}

/**
 * Fetch comment threads for a version
 */
export function useCommentThreads(versionId: string) {
  return useQuery({
    queryKey: queryKeys.documentCommentThreads(versionId),
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("document_comments")
        .select(`
          *,
          user:user_id (
            id,
            raw_user_meta_data,
            email
          )
        `)
        .eq("version_id", versionId)
        .neq("status", "deleted")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Organize into threads
      const rootComments: Record<string, unknown>[] = [];
      const repliesByParent: Record<string, Record<string, unknown>[]> = {};

      (comments || []).forEach((c: Record<string, unknown>) => {
        if (!c.parent_comment_id) {
          rootComments.push(c);
        } else {
          const parentId = c.parent_comment_id as string;
          if (!repliesByParent[parentId]) repliesByParent[parentId] = [];
          repliesByParent[parentId].push(c);
        }
      });

      return rootComments.map((root) => {
        const replies = repliesByParent[root.id as string] || [];
        const allParticipantIds = new Set([
          root.user_id as string,
          ...replies.map((r) => r.user_id as string),
        ]);

        return {
          root_comment: {
            ...root,
            user: root.user
              ? {
                  id: (root.user as Record<string, unknown>).id,
                  full_name:
                    ((root.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                    "Unknown",
                  email: (root.user as Record<string, unknown>).email,
                }
              : undefined,
          } as DocumentComment,
          replies: replies.map((r) => ({
            ...r,
            user: r.user
              ? {
                  id: (r.user as Record<string, unknown>).id,
                  full_name:
                    ((r.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                    "Unknown",
                  email: (r.user as Record<string, unknown>).email,
                }
              : undefined,
          })) as DocumentComment[],
          is_resolved: root.status === "resolved",
          participants: Array.from(allParticipantIds).map((id) => {
            const user = [root, ...replies].find((c) => c.user_id === id)?.user as Record<string, unknown>;
            return {
              id,
              full_name:
                (user?.raw_user_meta_data as Record<string, unknown>)?.full_name as string || "Unknown",
            };
          }),
        } as CommentThread;
      });
    },
    enabled: !!versionId,
  });
}

/**
 * Fetch redline sessions for a contract
 */
export function useRedlineSessions(contractId: string) {
  return useQuery({
    queryKey: queryKeys.redlineSessions(contractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redline_sessions")
        .select(`
          *,
          source_version:source_version_id (
            id,
            version_number,
            file_name
          ),
          participants:redline_participants (
            *,
            user:user_id (
              id,
              raw_user_meta_data,
              email
            )
          )
        `)
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((s: Record<string, unknown>) => ({
        ...s,
        participants: ((s.participants as Record<string, unknown>[]) || []).map((p: Record<string, unknown>) => ({
          ...p,
          user: p.user
            ? {
                id: (p.user as Record<string, unknown>).id,
                full_name:
                  ((p.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                  "Unknown",
                email: (p.user as Record<string, unknown>).email,
              }
            : undefined,
        })),
      })) as RedlineSession[];
    },
    enabled: !!contractId,
  });
}

/**
 * Fetch single redline session
 */
export function useRedlineSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.redlineSession(sessionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redline_sessions")
        .select(`
          *,
          source_version:source_version_id (
            *
          ),
          result_version:result_version_id (
            *
          ),
          participants:redline_participants (
            *,
            user:user_id (
              id,
              raw_user_meta_data,
              email
            )
          )
        `)
        .eq("id", sessionId)
        .single();

      if (error) throw error;

      return {
        ...data,
        participants: (data.participants || []).map((p: Record<string, unknown>) => ({
          ...p,
          user: p.user
            ? {
                id: (p.user as Record<string, unknown>).id,
                full_name:
                  ((p.user as Record<string, unknown>).raw_user_meta_data as Record<string, unknown>)?.full_name ||
                  "Unknown",
                email: (p.user as Record<string, unknown>).email,
              }
            : undefined,
        })),
      } as RedlineSession;
    },
    enabled: !!sessionId,
  });
}

/**
 * Fetch version statistics
 */
export function useVersionStats(contractId: string) {
  return useQuery({
    queryKey: queryKeys.versionStats(contractId),
    queryFn: async () => {
      const { data: versions, error } = await supabase
        .from("document_versions")
        .select("id, version_type, created_by")
        .eq("contract_id", contractId);

      if (error) throw error;

      const versionData = versions || [];

      const byType = versionData.reduce(
        (acc: Record<VersionType, number>, v: { version_type: VersionType }) => {
          acc[v.version_type] = (acc[v.version_type] || 0) + 1;
          return acc;
        },
        {} as Record<VersionType, number>
      );

      // Get change counts
      const versionIds = versionData.map((v: { id: string }) => v.id);
      const { data: changes } = await supabase
        .from("document_changes")
        .select("id, reviewed_by")
        .in(
          "comparison_id",
          supabase
            .from("document_comparisons")
            .select("id")
            .in("target_version_id", versionIds)
        );

      const reviewerCounts: Record<string, number> = {};
      (changes || []).forEach((c: { reviewed_by: string | null }) => {
        if (c.reviewed_by) {
          reviewerCounts[c.reviewed_by] = (reviewerCounts[c.reviewed_by] || 0) + 1;
        }
      });

      return {
        total_versions: versionData.length,
        by_type: byType,
        average_changes_per_version:
          versionData.length > 0 ? (changes || []).length / versionData.length : 0,
        most_active_reviewers: Object.entries(reviewerCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([userId, count]) => ({
            user_id: userId,
            user_name: "Unknown",
            changes_reviewed: count,
          })),
      } as VersionStats;
    },
    enabled: !!contractId,
  });
}

/**
 * Fetch comment statistics
 */
export function useCommentStats(versionId: string) {
  return useQuery({
    queryKey: queryKeys.commentStats(versionId),
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("document_comments")
        .select("id, comment_type, status, created_at, resolved_at")
        .eq("version_id", versionId)
        .neq("status", "deleted");

      if (error) throw error;

      const commentData = comments || [];

      const byType = commentData.reduce(
        (acc: Record<string, number>, c: { comment_type: string }) => {
          acc[c.comment_type] = (acc[c.comment_type] || 0) + 1;
          return acc;
        },
        {}
      );

      const byStatus = commentData.reduce(
        (acc: Record<CommentStatus, number>, c: { status: CommentStatus }) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        },
        {} as Record<CommentStatus, number>
      );

      // Calculate average resolution time
      const resolvedComments = commentData.filter(
        (c: { status: CommentStatus; resolved_at: string | null }) =>
          c.status === "resolved" && c.resolved_at
      );
      let avgResolutionTime = 0;
      if (resolvedComments.length > 0) {
        const totalHours = resolvedComments.reduce(
          (acc: number, c: { created_at: string; resolved_at: string }) => {
            const created = new Date(c.created_at).getTime();
            const resolved = new Date(c.resolved_at).getTime();
            return acc + (resolved - created) / (1000 * 60 * 60);
          },
          0
        );
        avgResolutionTime = totalHours / resolvedComments.length;
      }

      return {
        total: commentData.length,
        by_type: byType,
        by_status: byStatus,
        unresolved: byStatus.active || 0,
        average_resolution_time_hours: avgResolutionTime,
      } as CommentStats;
    },
    enabled: !!versionId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Upload a new document version
 */
export function useCreateDocumentVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createDocumentVersion,
    mutationFn: async ({
      contractId,
      userId,
      data,
    }: {
      contractId: string;
      userId: string;
      data: CreateVersionPayload;
    }) => {
      // Upload file to storage
      const fileExt = data.file.name.split(".").pop();
      const fileName = `${contractId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("contract-documents")
        .upload(fileName, data.file);

      if (uploadError) throw uploadError;

      // Get current max version number
      const { data: maxVersion } = await supabase
        .from("document_versions")
        .select("version_number")
        .eq("contract_id", contractId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (maxVersion?.version_number || 0) + 1;

      // Set all existing versions as not current
      await supabase
        .from("document_versions")
        .update({ is_current: false })
        .eq("contract_id", contractId);

      // Create version record
      const { data: version, error } = await supabase
        .from("document_versions")
        .insert({
          contract_id: contractId,
          version_number: nextVersion,
          version_type: data.version_type,
          file_path: fileName,
          file_name: data.file.name,
          file_size: data.file.size,
          file_hash: "", // Would compute hash
          metadata: data.metadata || {},
          created_by: userId,
          is_current: true,
        })
        .select()
        .single();

      if (error) throw error;
      return version as DocumentVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentVersions({ contractId: data.contract_id }),
      });
      toast.success("Document version uploaded");
    },
    onError: (error) => {
      toast.error(`Failed to upload version: ${error.message}`);
    },
  });
}

/**
 * Compare two versions
 */
export function useCompareVersions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.compareVersions,
    mutationFn: async ({
      userId,
      payload,
    }: {
      userId: string;
      payload: CompareVersionsPayload;
    }) => {
      // Check if comparison exists
      const { data: existing } = await supabase
        .from("document_comparisons")
        .select("*")
        .eq("source_version_id", payload.source_version_id)
        .eq("target_version_id", payload.target_version_id)
        .maybeSingle();

      if (existing) {
        return existing as DocumentComparison;
      }

      // Create new comparison (would call edge function for actual diff)
      const { data: comparison, error } = await supabase
        .from("document_comparisons")
        .insert({
          contract_id: payload.contract_id,
          source_version_id: payload.source_version_id,
          target_version_id: payload.target_version_id,
          diff_data: { chunks: [], summary: { total_changes: 0, additions: 0, deletions: 0, modifications: 0 } },
          similarity_score: 0,
          change_statistics: { total_changes: 0, by_type: {}, by_category: {}, significant_changes: [] },
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return comparison as DocumentComparison;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentComparison(
          data.source_version_id,
          data.target_version_id
        ),
      });
      toast.success("Comparison generated");
    },
    onError: (error) => {
      toast.error(`Failed to compare versions: ${error.message}`);
    },
  });
}

/**
 * Create a comment on a document
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createDocumentComment,
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: CreateCommentPayload;
    }) => {
      const { data: comment, error } = await supabase
        .from("document_comments")
        .insert({
          version_id: data.version_id,
          user_id: userId,
          parent_comment_id: data.parent_comment_id || null,
          comment_type: data.comment_type,
          comment_text: data.comment_text,
          anchor_data: data.anchor_data,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return comment as DocumentComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentComments({ versionId: data.version_id }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentCommentThreads(data.version_id),
      });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateDocumentComment,
    mutationFn: async ({
      commentId,
      versionId,
      data,
    }: {
      commentId: string;
      versionId: string;
      data: UpdateCommentPayload;
    }) => {
      const { data: comment, error } = await supabase
        .from("document_comments")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return { comment: comment as DocumentComment, versionId };
    },
    onSuccess: ({ versionId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentComments({ versionId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentCommentThreads(versionId),
      });
      toast.success("Comment updated");
    },
    onError: (error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
}

/**
 * Resolve a comment
 */
export function useResolveComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.resolveDocumentComment,
    mutationFn: async ({
      commentId,
      versionId,
      userId,
    }: {
      commentId: string;
      versionId: string;
      userId: string;
    }) => {
      const { data: comment, error } = await supabase
        .from("document_comments")
        .update({
          status: "resolved" as CommentStatus,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return { comment: comment as DocumentComment, versionId };
    },
    onSuccess: ({ versionId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentComments({ versionId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentCommentThreads(versionId),
      });
      toast.success("Comment resolved");
    },
    onError: (error) => {
      toast.error(`Failed to resolve comment: ${error.message}`);
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteDocumentComment,
    mutationFn: async ({
      commentId,
      versionId,
    }: {
      commentId: string;
      versionId: string;
    }) => {
      const { error } = await supabase
        .from("document_comments")
        .update({ status: "deleted" as CommentStatus })
        .eq("id", commentId);

      if (error) throw error;
      return { commentId, versionId };
    },
    onSuccess: ({ versionId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentComments({ versionId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentCommentThreads(versionId),
      });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}

/**
 * Review a change (accept/reject)
 */
export function useReviewChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.reviewDocumentChange,
    mutationFn: async ({
      userId,
      payload,
    }: {
      userId: string;
      payload: ReviewChangePayload;
    }) => {
      const status: ChangeStatus =
        payload.decision === "accept" ? "accepted" : "rejected";

      const { data: change, error } = await supabase
        .from("document_changes")
        .update({
          status,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_comments: payload.comments || null,
        })
        .eq("id", payload.change_id)
        .select()
        .single();

      if (error) throw error;
      return change as DocumentChange;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentChanges({ comparisonId: data.comparison_id }),
      });
      toast.success(`Change ${data.status}`);
    },
    onError: (error) => {
      toast.error(`Failed to review change: ${error.message}`);
    },
  });
}

/**
 * Bulk review changes
 */
export function useBulkReviewChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.bulkReviewChanges,
    mutationFn: async ({
      userId,
      payload,
    }: {
      userId: string;
      payload: BulkReviewChangesPayload;
    }) => {
      const status: ChangeStatus =
        payload.decision === "accept" ? "accepted" : "rejected";

      const { data, error } = await supabase
        .from("document_changes")
        .update({
          status,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_comments: payload.comments || null,
        })
        .in("id", payload.change_ids)
        .select();

      if (error) throw error;
      return data as DocumentChange[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documentVersions"],
      });
      toast.success("Changes reviewed");
    },
    onError: (error) => {
      toast.error(`Failed to review changes: ${error.message}`);
    },
  });
}

/**
 * Create a redline session
 */
export function useCreateRedlineSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createRedlineSession,
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: CreateRedlineSessionPayload;
    }) => {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from("redline_sessions")
        .insert({
          contract_id: data.contract_id,
          source_version_id: data.source_version_id,
          title: data.title,
          description: data.description || null,
          status: "active",
          created_by: userId,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add owner as participant
      await supabase.from("redline_participants").insert({
        session_id: session.id,
        user_id: userId,
        role: "owner",
        permissions: {
          can_edit: true,
          can_comment: true,
          can_approve_changes: true,
          can_invite: true,
        },
      });

      // Add other participants
      if (data.participants?.length) {
        const participantInserts = data.participants.map((p) => ({
          session_id: session.id,
          user_id: p.user_id || null,
          external_email: p.external_email || null,
          external_name: p.external_name || null,
          role: p.role,
          permissions: p.permissions || {
            can_edit: true,
            can_comment: true,
            can_approve_changes: false,
            can_invite: false,
          },
        }));

        await supabase.from("redline_participants").insert(participantInserts);
      }

      return session as RedlineSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.redlineSessions(data.contract_id),
      });
      toast.success("Redline session created");
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });
}

/**
 * Complete a redline session
 */
export function useCompleteRedlineSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.completeRedlineSession,
    mutationFn: async ({
      sessionId,
      resultVersionId,
    }: {
      sessionId: string;
      resultVersionId?: string;
    }) => {
      const { data: session, error } = await supabase
        .from("redline_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          result_version_id: resultVersionId || null,
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return session as RedlineSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.redlineSessions(data.contract_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.redlineSession(data.id),
      });
      toast.success("Redline session completed");
    },
    onError: (error) => {
      toast.error(`Failed to complete session: ${error.message}`);
    },
  });
}

/**
 * Cancel a redline session
 */
export function useCancelRedlineSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.cancelRedlineSession,
    mutationFn: async (sessionId: string) => {
      const { data: session, error } = await supabase
        .from("redline_sessions")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return session as RedlineSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.redlineSessions(data.contract_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.redlineSession(data.id),
      });
      toast.success("Redline session cancelled");
    },
    onError: (error) => {
      toast.error(`Failed to cancel session: ${error.message}`);
    },
  });
}
