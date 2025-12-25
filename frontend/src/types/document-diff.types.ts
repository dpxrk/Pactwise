// src/types/document-diff.types.ts
// Types for Document Version Comparison System

// ============================================================================
// VERSION TYPES
// ============================================================================

export type VersionType =
  | 'draft'
  | 'internal_review'
  | 'external_review'
  | 'negotiation'
  | 'redline'
  | 'final'
  | 'executed'
  | 'amendment';

export type ChangeType =
  | 'addition'
  | 'deletion'
  | 'modification'
  | 'move'
  | 'format_change';

export type CommentType =
  | 'note'
  | 'question'
  | 'suggestion'
  | 'approval'
  | 'rejection'
  | 'legal_concern'
  | 'compliance_issue'
  | 'business_concern'
  | 'general';

export type CommentStatus = 'active' | 'resolved' | 'deleted';

export type ChangeStatus = 'pending' | 'accepted' | 'rejected';

// ============================================================================
// DOCUMENT VERSION TYPES
// ============================================================================

export interface DocumentVersion {
  id: string;
  contract_id: string;
  version_number: number;
  version_type: VersionType;
  file_path: string;
  file_name: string;
  file_size: number;
  file_hash: string;
  content_text: string | null;
  content_html: string | null;
  metadata: VersionMetadata;
  created_by: string;
  created_at: string;
  is_current: boolean;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface VersionMetadata {
  source?: 'upload' | 'generation' | 'redline' | 'external';
  external_party?: string;
  notes?: string;
  word_count?: number;
  page_count?: number;
}

export interface DocumentVersionListItem {
  id: string;
  version_number: number;
  version_type: VersionType;
  file_name: string;
  created_at: string;
  is_current: boolean;
  creator: {
    id: string;
    full_name: string;
  };
  changes_count?: number;
}

// ============================================================================
// COMPARISON TYPES
// ============================================================================

export interface DocumentComparison {
  id: string;
  contract_id: string;
  source_version_id: string;
  target_version_id: string;
  diff_data: DiffData;
  similarity_score: number;
  change_statistics: ChangeStatistics;
  created_by: string;
  created_at: string;
  source_version?: DocumentVersionListItem;
  target_version?: DocumentVersionListItem;
}

export interface DiffData {
  chunks: DiffChunk[];
  summary: DiffSummary;
}

export interface DiffChunk {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  source_start: number;
  source_end: number;
  target_start: number;
  target_end: number;
  source_text?: string;
  target_text?: string;
}

export interface DiffSummary {
  total_changes: number;
  additions: number;
  deletions: number;
  modifications: number;
}

export interface ChangeStatistics {
  total_changes: number;
  by_type: Record<ChangeType, number>;
  by_category: Record<string, number>;
  significant_changes: SignificantChange[];
}

export interface SignificantChange {
  type: ChangeType;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  location: {
    section?: string;
    page?: number;
    paragraph?: number;
  };
}

// ============================================================================
// DOCUMENT CHANGE TYPES
// ============================================================================

export interface DocumentChange {
  id: string;
  comparison_id: string;
  change_type: ChangeType;
  category: string | null;
  original_text: string | null;
  new_text: string | null;
  location: ChangeLocation;
  status: ChangeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  created_at: string;
  reviewer?: {
    id: string;
    full_name: string;
  };
}

export interface ChangeLocation {
  section?: string;
  clause?: string;
  page?: number;
  paragraph?: number;
  start_position: number;
  end_position: number;
}

// ============================================================================
// COMMENT TYPES
// ============================================================================

export interface DocumentComment {
  id: string;
  version_id: string;
  user_id: string;
  parent_comment_id: string | null;
  comment_type: CommentType;
  comment_text: string;
  anchor_data: CommentAnchor;
  status: CommentStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  replies?: DocumentComment[];
}

export interface CommentAnchor {
  type: 'text' | 'section' | 'page' | 'general';
  start_position?: number;
  end_position?: number;
  selected_text?: string;
  section_id?: string;
  page_number?: number;
}

export interface CommentThread {
  root_comment: DocumentComment;
  replies: DocumentComment[];
  is_resolved: boolean;
  participants: {
    id: string;
    full_name: string;
    avatar_url?: string;
  }[];
}

// ============================================================================
// REDLINE SESSION TYPES
// ============================================================================

export interface RedlineSession {
  id: string;
  contract_id: string;
  source_version_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'cancelled';
  participants: RedlineParticipant[];
  created_by: string;
  created_at: string;
  completed_at: string | null;
  result_version_id: string | null;
}

export interface RedlineParticipant {
  id: string;
  session_id: string;
  user_id: string | null;
  external_email: string | null;
  external_name: string | null;
  role: 'owner' | 'reviewer' | 'external';
  permissions: RedlinePermissions;
  joined_at: string;
  last_active: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface RedlinePermissions {
  can_edit: boolean;
  can_comment: boolean;
  can_approve_changes: boolean;
  can_invite: boolean;
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface CreateVersionPayload {
  contract_id: string;
  version_type: VersionType;
  file: File;
  metadata?: Partial<VersionMetadata>;
}

export interface CompareVersionsPayload {
  contract_id: string;
  source_version_id: string;
  target_version_id: string;
}

export interface CreateCommentPayload {
  version_id: string;
  comment_type: CommentType;
  comment_text: string;
  anchor_data: CommentAnchor;
  parent_comment_id?: string;
}

export interface UpdateCommentPayload {
  comment_text?: string;
  status?: CommentStatus;
}

export interface ReviewChangePayload {
  change_id: string;
  decision: 'accept' | 'reject';
  comments?: string;
}

export interface BulkReviewChangesPayload {
  change_ids: string[];
  decision: 'accept' | 'reject';
  comments?: string;
}

export interface CreateRedlineSessionPayload {
  contract_id: string;
  source_version_id: string;
  title: string;
  description?: string;
  participants?: {
    user_id?: string;
    external_email?: string;
    external_name?: string;
    role: 'reviewer' | 'external';
    permissions?: Partial<RedlinePermissions>;
  }[];
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface VersionFilters {
  version_type?: VersionType | VersionType[];
  created_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface CommentFilters {
  comment_type?: CommentType | CommentType[];
  status?: CommentStatus;
  user_id?: string;
  has_replies?: boolean;
}

export interface ChangeFilters {
  change_type?: ChangeType | ChangeType[];
  status?: ChangeStatus;
  category?: string;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface VersionStats {
  total_versions: number;
  by_type: Record<VersionType, number>;
  average_changes_per_version: number;
  most_active_reviewers: {
    user_id: string;
    user_name: string;
    changes_reviewed: number;
  }[];
}

export interface CommentStats {
  total: number;
  by_type: Record<CommentType, number>;
  by_status: Record<CommentStatus, number>;
  unresolved: number;
  average_resolution_time_hours: number;
}

// ============================================================================
// UTILITY TYPES & LABELS
// ============================================================================

export const versionTypeLabels: Record<VersionType, string> = {
  draft: 'Draft',
  internal_review: 'Internal Review',
  external_review: 'External Review',
  negotiation: 'Negotiation',
  redline: 'Redline',
  final: 'Final',
  executed: 'Executed',
  amendment: 'Amendment',
};

export const versionTypeColors: Record<VersionType, string> = {
  draft: 'bg-gray-100 text-gray-700',
  internal_review: 'bg-blue-100 text-blue-700',
  external_review: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-amber-100 text-amber-700',
  redline: 'bg-orange-100 text-orange-700',
  final: 'bg-green-100 text-green-700',
  executed: 'bg-emerald-100 text-emerald-700',
  amendment: 'bg-indigo-100 text-indigo-700',
};

export const changeTypeLabels: Record<ChangeType, string> = {
  addition: 'Addition',
  deletion: 'Deletion',
  modification: 'Modification',
  move: 'Moved',
  format_change: 'Formatting',
};

export const changeTypeColors: Record<ChangeType, string> = {
  addition: 'bg-green-100 text-green-700',
  deletion: 'bg-red-100 text-red-700',
  modification: 'bg-amber-100 text-amber-700',
  move: 'bg-blue-100 text-blue-700',
  format_change: 'bg-gray-100 text-gray-700',
};

export const commentTypeLabels: Record<CommentType, string> = {
  note: 'Note',
  question: 'Question',
  suggestion: 'Suggestion',
  approval: 'Approval',
  rejection: 'Rejection',
  legal_concern: 'Legal Concern',
  compliance_issue: 'Compliance Issue',
  business_concern: 'Business Concern',
  general: 'General',
};

export const commentTypeColors: Record<CommentType, string> = {
  note: 'bg-gray-100 text-gray-700',
  question: 'bg-blue-100 text-blue-700',
  suggestion: 'bg-purple-100 text-purple-700',
  approval: 'bg-green-100 text-green-700',
  rejection: 'bg-red-100 text-red-700',
  legal_concern: 'bg-amber-100 text-amber-700',
  compliance_issue: 'bg-orange-100 text-orange-700',
  business_concern: 'bg-indigo-100 text-indigo-700',
  general: 'bg-gray-100 text-gray-700',
};

export const changeStatusLabels: Record<ChangeStatus, string> = {
  pending: 'Pending Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const changeStatusColors: Record<ChangeStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
