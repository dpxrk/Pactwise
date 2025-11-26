/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { paginationSchema, validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type EntityType = 'contracts' | 'vendors' | 'documents' | 'budgets';

interface Comment {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  parent_id: string | null;
  content: string;
  author_id: string;
  author?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  mentions: string[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  reactions: Record<string, string[]>;
  enterprise_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  replies?: Comment[];
  reply_count?: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const entityTypeSchema = z.enum(['contracts', 'vendors', 'documents', 'budgets']);

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parent_id: z.string().uuid().optional().nullable(),
  mentions: z.array(z.string().uuid()).optional().default([]),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
  })).optional().default([]),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

const resolveCommentSchema = z.object({
  resolved: z.boolean(),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has access to the entity
 */
async function checkEntityAccess(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: EntityType,
  entityId: string,
  enterpriseId: string,
): Promise<boolean> {
  const tableMap: Record<EntityType, string> = {
    contracts: 'contracts',
    vendors: 'vendors',
    documents: 'collaborative_documents',
    budgets: 'budgets',
  };

  const { data, error } = await supabase
    .from(tableMap[entityType])
    .select('id')
    .eq('id', entityId)
    .eq('enterprise_id', enterpriseId)
    .is('deleted_at', null)
    .single();

  return !error && !!data;
}

/**
 * Extract mentions from content
 */
function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]);
  }

  return mentions;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // ========================================================================
    // GET /:entity_type/:entity_id/comments - List comments for an entity
    // ========================================================================
    const listCommentsMatch = pathname.match(/^\/(contracts|vendors|documents|budgets)\/([a-f0-9-]+)\/comments$/);
    if (method === 'GET' && listCommentsMatch) {
      const entityType = listCommentsMatch[1] as EntityType;
      const entityId = sanitizeInput.uuid(listCommentsMatch[2]);

      // Check entity access
      const hasAccess = await checkEntityAccess(supabase, entityType, entityId, profile.enterprise_id);
      if (!hasAccess) {
        return createErrorResponseSync('Entity not found or access denied', 404, req);
      }

      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 50, sortOrder } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;
      const includeReplies = params.include_replies === 'true';
      const resolvedFilter = params.resolved; // 'true', 'false', or undefined for all

      // Build query for top-level comments
      let query = supabase
        .from('entity_comments')
        .select(`
          *,
          author:users!author_id(id, full_name, email, avatar_url)
        `, { count: 'exact' })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .is('parent_id', null) // Only top-level comments
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (resolvedFilter === 'true') {
        query = query.eq('is_resolved', true);
      } else if (resolvedFilter === 'false') {
        query = query.eq('is_resolved', false);
      }

      const { data: comments, error, count } = await query;

      if (error) {
        throw error;
      }

      // Fetch replies if requested
      let commentsWithReplies = comments || [];

      if (includeReplies && comments && comments.length > 0) {
        const commentIds = comments.map(c => c.id);

        const { data: replies } = await supabase
          .from('entity_comments')
          .select(`
            *,
            author:users!author_id(id, full_name, email, avatar_url)
          `)
          .in('parent_id', commentIds)
          .eq('enterprise_id', profile.enterprise_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        // Group replies by parent_id
        const repliesByParent = new Map<string, Comment[]>();
        for (const reply of (replies || [])) {
          const existing = repliesByParent.get(reply.parent_id) || [];
          existing.push(reply as Comment);
          repliesByParent.set(reply.parent_id, existing);
        }

        commentsWithReplies = comments.map(comment => ({
          ...comment,
          replies: repliesByParent.get(comment.id) || [],
          reply_count: (repliesByParent.get(comment.id) || []).length,
        }));
      } else {
        // Get reply counts
        const commentIds = (comments || []).map(c => c.id);
        if (commentIds.length > 0) {
          const { data: replyCounts } = await supabase
            .from('entity_comments')
            .select('parent_id')
            .in('parent_id', commentIds)
            .is('deleted_at', null);

          const countByParent = new Map<string, number>();
          for (const reply of (replyCounts || [])) {
            countByParent.set(reply.parent_id, (countByParent.get(reply.parent_id) || 0) + 1);
          }

          commentsWithReplies = (comments || []).map(comment => ({
            ...comment,
            reply_count: countByParent.get(comment.id) || 0,
          }));
        }
      }

      return createSuccessResponse({
        data: commentsWithReplies,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /:entity_type/:entity_id/comments - Create a comment
    // ========================================================================
    const createCommentMatch = pathname.match(/^\/(contracts|vendors|documents|budgets)\/([a-f0-9-]+)\/comments$/);
    if (method === 'POST' && createCommentMatch) {
      const entityType = createCommentMatch[1] as EntityType;
      const entityId = sanitizeInput.uuid(createCommentMatch[2]);

      // Check entity access
      const hasAccess = await checkEntityAccess(supabase, entityType, entityId, profile.enterprise_id);
      if (!hasAccess) {
        return createErrorResponseSync('Entity not found or access denied', 404, req);
      }

      const body = await req.json();
      const { content, parent_id, mentions, attachments } = validateRequest(createCommentSchema, body);

      // If replying, verify parent exists
      if (parent_id) {
        const { data: parentComment, error: parentError } = await supabase
          .from('entity_comments')
          .select('id')
          .eq('id', parent_id)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('enterprise_id', profile.enterprise_id)
          .is('deleted_at', null)
          .single();

        if (parentError || !parentComment) {
          return createErrorResponseSync('Parent comment not found', 404, req);
        }
      }

      // Extract mentions from content (in addition to explicit mentions)
      const extractedMentions = extractMentions(content);
      const allMentions = [...new Set([...mentions, ...extractedMentions])];

      // Create comment
      const { data: comment, error: insertError } = await supabase
        .from('entity_comments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          parent_id: parent_id || null,
          content,
          author_id: profile.id,
          mentions: allMentions,
          attachments,
          reactions: {},
          is_resolved: false,
          enterprise_id: profile.enterprise_id,
        })
        .select(`
          *,
          author:users!author_id(id, full_name, email, avatar_url)
        `)
        .single();

      if (insertError) {
        throw insertError;
      }

      // Create notifications for mentions
      if (allMentions.length > 0) {
        const notifications = allMentions.map(userId => ({
          user_id: userId,
          type: 'comment_mention',
          title: 'You were mentioned',
          message: `${profile.full_name || profile.email} mentioned you in a comment`,
          severity: 'medium' as const,
          data: {
            entity_type: entityType,
            entity_id: entityId,
            comment_id: comment?.id,
            author_id: profile.id,
          },
          enterprise_id: profile.enterprise_id,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Notify entity owner if this is a new comment (not a reply)
      if (!parent_id) {
        const ownerField = entityType === 'contracts' ? 'owner_id' : 'created_by';
        const tableMap: Record<EntityType, string> = {
          contracts: 'contracts',
          vendors: 'vendors',
          documents: 'collaborative_documents',
          budgets: 'budgets',
        };

        const { data: entity } = await supabase
          .from(tableMap[entityType])
          .select(ownerField)
          .eq('id', entityId)
          .single();

        const ownerId = entity?.[ownerField as keyof typeof entity];
        if (ownerId && ownerId !== profile.id && !allMentions.includes(ownerId as string)) {
          await supabase.from('notifications').insert({
            user_id: ownerId,
            type: 'new_comment',
            title: 'New Comment',
            message: `${profile.full_name || profile.email} commented on your ${entityType.slice(0, -1)}`,
            severity: 'low',
            data: {
              entity_type: entityType,
              entity_id: entityId,
              comment_id: comment?.id,
              author_id: profile.id,
            },
            enterprise_id: profile.enterprise_id,
          });
        }
      }

      return createSuccessResponse(comment, undefined, 201, req);
    }

    // ========================================================================
    // GET /comments/:id - Get a single comment with replies
    // ========================================================================
    const getCommentMatch = pathname.match(/^\/comments\/([a-f0-9-]+)$/);
    if (method === 'GET' && getCommentMatch) {
      const commentId = sanitizeInput.uuid(getCommentMatch[1]);

      const { data: comment, error } = await supabase
        .from('entity_comments')
        .select(`
          *,
          author:users!author_id(id, full_name, email, avatar_url)
        `)
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !comment) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      // Get replies
      const { data: replies } = await supabase
        .from('entity_comments')
        .select(`
          *,
          author:users!author_id(id, full_name, email, avatar_url)
        `)
        .eq('parent_id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      return createSuccessResponse({
        ...comment,
        replies: replies || [],
        reply_count: replies?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /comments/:id - Update a comment
    // ========================================================================
    if (method === 'PATCH' && getCommentMatch) {
      const commentId = sanitizeInput.uuid(getCommentMatch[1]);

      // Get comment
      const { data: comment, error: findError } = await supabase
        .from('entity_comments')
        .select('*')
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (findError || !comment) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      // Only author can edit their comment
      if (comment.author_id !== profile.id) {
        return createErrorResponseSync('You can only edit your own comments', 403, req);
      }

      const body = await req.json();
      const { content } = validateRequest(updateCommentSchema, body);

      // Extract new mentions
      const newMentions = extractMentions(content);

      const { data: updatedComment, error: updateError } = await supabase
        .from('entity_comments')
        .update({
          content,
          mentions: newMentions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select(`
          *,
          author:users!author_id(id, full_name, email, avatar_url)
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      return createSuccessResponse(updatedComment, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /comments/:id - Delete a comment
    // ========================================================================
    if (method === 'DELETE' && getCommentMatch) {
      const commentId = sanitizeInput.uuid(getCommentMatch[1]);

      // Get comment
      const { data: comment, error: findError } = await supabase
        .from('entity_comments')
        .select('*, author_id')
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (findError || !comment) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      // Get permissions for the entity type
      const permissions = await getUserPermissions(supabase, profile, comment.entity_type);

      // Author can delete their own comment, managers can delete any
      if (comment.author_id !== profile.id && !permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete this comment', 403, req);
      }

      // Soft delete (also soft delete replies)
      const { error: deleteError } = await supabase
        .from('entity_comments')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .or(`id.eq.${commentId},parent_id.eq.${commentId}`)
        .eq('enterprise_id', profile.enterprise_id);

      if (deleteError) {
        throw deleteError;
      }

      return createSuccessResponse({
        message: 'Comment deleted successfully',
        id: commentId,
        deleted_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /comments/:id/resolve - Resolve/unresolve a comment
    // ========================================================================
    const resolveMatch = pathname.match(/^\/comments\/([a-f0-9-]+)\/resolve$/);
    if (method === 'POST' && resolveMatch) {
      const commentId = sanitizeInput.uuid(resolveMatch[1]);

      const body = await req.json();
      const { resolved } = validateRequest(resolveCommentSchema, body);

      // Get comment
      const { data: comment, error: findError } = await supabase
        .from('entity_comments')
        .select('*')
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (findError || !comment) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      const { data: updatedComment, error: updateError } = await supabase
        .from('entity_comments')
        .update({
          is_resolved: resolved,
          resolved_by: resolved ? profile.id : null,
          resolved_at: resolved ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select(`
          *,
          author:users!author_id(id, full_name, email, avatar_url)
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      // Notify author if someone else resolved their comment
      if (resolved && comment.author_id !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: comment.author_id,
          type: 'comment_resolved',
          title: 'Comment Resolved',
          message: `${profile.full_name || profile.email} resolved your comment`,
          severity: 'low',
          data: {
            entity_type: comment.entity_type,
            entity_id: comment.entity_id,
            comment_id: commentId,
            resolved_by: profile.id,
          },
          enterprise_id: profile.enterprise_id,
        });
      }

      return createSuccessResponse(updatedComment, undefined, 200, req);
    }

    // ========================================================================
    // POST /comments/:id/react - Add/remove reaction
    // ========================================================================
    const reactMatch = pathname.match(/^\/comments\/([a-f0-9-]+)\/react$/);
    if (method === 'POST' && reactMatch) {
      const commentId = sanitizeInput.uuid(reactMatch[1]);

      const body = await req.json();
      const { emoji } = validateRequest(reactionSchema, body);

      // Get comment
      const { data: comment, error: findError } = await supabase
        .from('entity_comments')
        .select('reactions')
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (findError || !comment) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      // Toggle reaction
      const reactions = comment.reactions || {};
      const emojiReactions: string[] = reactions[emoji] || [];

      if (emojiReactions.includes(profile.id)) {
        // Remove reaction
        reactions[emoji] = emojiReactions.filter(id => id !== profile.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        // Add reaction
        reactions[emoji] = [...emojiReactions, profile.id];
      }

      const { data: updatedComment, error: updateError } = await supabase
        .from('entity_comments')
        .update({
          reactions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select(`
          *,
          author:users!author_id(id, full_name, email, avatar_url)
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      return createSuccessResponse(updatedComment, undefined, 200, req);
    }

    // ========================================================================
    // GET /comments/unread - Get unread comment count for user
    // ========================================================================
    if (method === 'GET' && pathname === '/comments/unread') {
      // Count comments that mention the user and are newer than their last view
      const { count, error } = await supabase
        .from('entity_comments')
        .select('id', { count: 'exact', head: true })
        .eq('enterprise_id', profile.enterprise_id)
        .contains('mentions', [profile.id])
        .is('deleted_at', null)
        .gt('created_at', profile.last_comment_view_at || '1970-01-01');

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        unread_count: count || 0,
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'comments', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'comments',
);
