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

type EntityType = 'contracts' | 'vendors' | 'budgets' | 'documents';

interface TrashItem {
  id: string;
  entity_type: EntityType;
  title: string;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_name?: string;
  metadata?: Record<string, unknown>;
}

interface TrashStats {
  contracts: number;
  vendors: number;
  budgets: number;
  documents: number;
  total: number;
  oldest_item?: string;
  newest_item?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const entityTypeSchema = z.enum(['contracts', 'vendors', 'budgets', 'documents']);

const restoreSchema = z.object({
  entity_type: entityTypeSchema,
  entity_id: z.string().uuid(),
});

const bulkRestoreSchema = z.object({
  items: z.array(restoreSchema).min(1).max(100),
});

const emptyTrashSchema = z.object({
  entity_type: entityTypeSchema.optional(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Confirmation required to empty trash' }),
  }),
  older_than_days: z.number().int().positive().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the table name and key columns for each entity type
 */
function getEntityConfig(entityType: EntityType): {
  table: string;
  titleColumn: string;
  additionalColumns?: string[];
} {
  const configs: Record<EntityType, { table: string; titleColumn: string; additionalColumns?: string[] }> = {
    contracts: { table: 'contracts', titleColumn: 'title', additionalColumns: ['status', 'value', 'vendor_id'] },
    vendors: { table: 'vendors', titleColumn: 'name', additionalColumns: ['status', 'category'] },
    budgets: { table: 'budgets', titleColumn: 'name', additionalColumns: ['budget_type', 'total_budget'] },
    documents: { table: 'collaborative_documents', titleColumn: 'title', additionalColumns: ['document_type', 'status'] },
  };
  return configs[entityType];
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

    // Get user's permissions for trash operations (require manage permission)
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ========================================================================
    // GET /trash - List all soft-deleted items
    // ========================================================================
    if (method === 'GET' && pathname === '/trash') {
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const entityType = params.entity_type as EntityType | undefined;
      const search = params.search ? sanitizeInput.searchQuery(params.search) : undefined;

      const offset = (page - 1) * limit;

      // Build array of trash items from all entity types
      const trashItems: TrashItem[] = [];
      const entityTypes: EntityType[] = entityType
        ? [entityType]
        : ['contracts', 'vendors', 'budgets', 'documents'];

      for (const type of entityTypes) {
        const config = getEntityConfig(type);

        let query = supabase
          .from(config.table)
          .select(`
            id,
            ${config.titleColumn},
            deleted_at,
            deleted_by,
            ${config.additionalColumns?.join(', ') || ''}
          `)
          .eq('enterprise_id', profile.enterprise_id)
          .not('deleted_at', 'is', null);

        // Apply search filter if provided
        if (search) {
          query = query.ilike(config.titleColumn, `%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Error fetching ${type} trash:`, error);
          continue;
        }

        if (data) {
          for (const item of data) {
            trashItems.push({
              id: item.id,
              entity_type: type,
              title: item[config.titleColumn as keyof typeof item] as string,
              deleted_at: item.deleted_at as string,
              deleted_by: item.deleted_by as string | null,
              metadata: config.additionalColumns?.reduce((acc, col) => {
                acc[col] = item[col as keyof typeof item];
                return acc;
              }, {} as Record<string, unknown>),
            });
          }
        }
      }

      // Sort trash items
      const orderColumn = sortBy || 'deleted_at';
      const ascending = sortOrder === 'asc';

      trashItems.sort((a, b) => {
        let aVal: string | number = orderColumn === 'deleted_at' ? a.deleted_at : a.title;
        let bVal: string | number = orderColumn === 'deleted_at' ? b.deleted_at : b.title;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });

      // Paginate
      const total = trashItems.length;
      const paginatedItems = trashItems.slice(offset, offset + limit);

      // Fetch deleted_by user names
      const userIds = [...new Set(paginatedItems.map(i => i.deleted_by).filter(Boolean))] as string[];

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        if (users) {
          const userMap = new Map(users.map(u => [u.id, u.full_name]));
          for (const item of paginatedItems) {
            if (item.deleted_by) {
              item.deleted_by_name = userMap.get(item.deleted_by) || undefined;
            }
          }
        }
      }

      return createSuccessResponse({
        data: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /trash/stats - Get trash statistics
    // ========================================================================
    if (method === 'GET' && pathname === '/trash/stats') {
      const stats: TrashStats = {
        contracts: 0,
        vendors: 0,
        budgets: 0,
        documents: 0,
        total: 0,
      };

      let oldestDate: string | undefined;
      let newestDate: string | undefined;

      const entityTypes: EntityType[] = ['contracts', 'vendors', 'budgets', 'documents'];

      for (const type of entityTypes) {
        const config = getEntityConfig(type);

        const { count, data, error } = await supabase
          .from(config.table)
          .select('deleted_at', { count: 'exact', head: false })
          .eq('enterprise_id', profile.enterprise_id)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: true })
          .limit(1);

        if (!error && count !== null) {
          stats[type] = count;
          stats.total += count;

          // Track oldest and newest items
          if (data && data.length > 0 && data[0].deleted_at) {
            const itemDate = data[0].deleted_at;
            if (!oldestDate || itemDate < oldestDate) {
              oldestDate = itemDate;
            }
          }
        }

        // Get newest item
        const { data: newestData } = await supabase
          .from(config.table)
          .select('deleted_at')
          .eq('enterprise_id', profile.enterprise_id)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
          .limit(1);

        if (newestData && newestData.length > 0 && newestData[0].deleted_at) {
          const itemDate = newestData[0].deleted_at;
          if (!newestDate || itemDate > newestDate) {
            newestDate = itemDate;
          }
        }
      }

      stats.oldest_item = oldestDate;
      stats.newest_item = newestDate;

      return createSuccessResponse(stats, undefined, 200, req);
    }

    // ========================================================================
    // POST /trash/restore - Restore a soft-deleted item
    // ========================================================================
    if (method === 'POST' && pathname === '/trash/restore') {
      // Check manage permission for restore
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to restore items', 403, req);
      }

      const body = await req.json();
      const { entity_type, entity_id } = validateRequest(restoreSchema, body);

      const config = getEntityConfig(entity_type);

      // Check if item exists and is deleted
      const { data: existingItem, error: findError } = await supabase
        .from(config.table)
        .select('id, deleted_at')
        .eq('id', entity_id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !existingItem) {
        return createErrorResponseSync('Item not found', 404, req);
      }

      if (!existingItem.deleted_at) {
        return createErrorResponseSync('Item is not in trash', 400, req);
      }

      // Restore the item
      const { data, error } = await supabase
        .from(config.table)
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
          last_modified_by: profile.id,
        })
        .eq('id', entity_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Item restored successfully',
        entity_type,
        entity_id,
        restored_at: new Date().toISOString(),
        data,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /trash/bulk-restore - Restore multiple soft-deleted items
    // ========================================================================
    if (method === 'POST' && pathname === '/trash/bulk-restore') {
      // Check manage permission for restore
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to restore items', 403, req);
      }

      const body = await req.json();
      const { items } = validateRequest(bulkRestoreSchema, body);

      const results: Array<{ entity_type: EntityType; entity_id: string; success: boolean; error?: string }> = [];

      // Group items by entity type for batch processing
      const itemsByType = new Map<EntityType, string[]>();
      for (const item of items) {
        const existing = itemsByType.get(item.entity_type) || [];
        existing.push(item.entity_id);
        itemsByType.set(item.entity_type, existing);
      }

      for (const [entityType, entityIds] of itemsByType) {
        const config = getEntityConfig(entityType);

        const { data, error } = await supabase
          .from(config.table)
          .update({
            deleted_at: null,
            deleted_by: null,
            updated_at: new Date().toISOString(),
            last_modified_by: profile.id,
          })
          .in('id', entityIds)
          .eq('enterprise_id', profile.enterprise_id)
          .not('deleted_at', 'is', null)
          .select('id');

        if (error) {
          for (const id of entityIds) {
            results.push({ entity_type: entityType, entity_id: id, success: false, error: error.message });
          }
        } else {
          const restoredIds = new Set(data?.map(d => d.id) || []);
          for (const id of entityIds) {
            results.push({
              entity_type: entityType,
              entity_id: id,
              success: restoredIds.has(id),
              error: restoredIds.has(id) ? undefined : 'Item not found or not in trash',
            });
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return createSuccessResponse({
        message: `Restored ${successCount} items, ${failureCount} failed`,
        results,
        restored_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /trash/empty - Permanently delete all trash items
    // ========================================================================
    if (method === 'DELETE' && pathname === '/trash/empty') {
      // Check manage permission for permanent deletion
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to empty trash', 403, req);
      }

      const body = await req.json();
      const { entity_type, confirm, older_than_days } = validateRequest(emptyTrashSchema, body);

      if (!confirm) {
        return createErrorResponseSync('Confirmation required to empty trash', 400, req);
      }

      const results: Record<EntityType, number> = {
        contracts: 0,
        vendors: 0,
        budgets: 0,
        documents: 0,
      };

      const entityTypes: EntityType[] = entity_type ? [entity_type] : ['contracts', 'vendors', 'budgets', 'documents'];

      // Calculate cutoff date if older_than_days is specified
      const cutoffDate = older_than_days
        ? new Date(Date.now() - older_than_days * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      for (const type of entityTypes) {
        const config = getEntityConfig(type);

        let query = supabase
          .from(config.table)
          .delete()
          .eq('enterprise_id', profile.enterprise_id)
          .not('deleted_at', 'is', null);

        // Apply cutoff date filter if specified
        if (cutoffDate) {
          query = query.lt('deleted_at', cutoffDate);
        }

        const { error, count } = await query;

        if (error) {
          console.error(`Error emptying ${type} trash:`, error);
          continue;
        }

        results[type] = count || 0;
      }

      const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

      return createSuccessResponse({
        message: `Permanently deleted ${totalDeleted} items from trash`,
        deleted_counts: results,
        total_deleted: totalDeleted,
        emptied_at: new Date().toISOString(),
        filter: {
          entity_type: entity_type || 'all',
          older_than_days: older_than_days || null,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /trash/:entity_type/:id - Permanently delete a single item
    // ========================================================================
    const permanentDeleteMatch = pathname.match(/^\/trash\/(contracts|vendors|budgets|documents)\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && permanentDeleteMatch) {
      // Check manage permission for permanent deletion
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to permanently delete', 403, req);
      }

      const entityType = permanentDeleteMatch[1] as EntityType;
      const entityId = sanitizeInput.uuid(permanentDeleteMatch[2]);
      const config = getEntityConfig(entityType);

      // Check if item exists and is deleted
      const { data: existingItem, error: findError } = await supabase
        .from(config.table)
        .select('id, deleted_at')
        .eq('id', entityId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !existingItem) {
        return createErrorResponseSync('Item not found', 404, req);
      }

      if (!existingItem.deleted_at) {
        return createErrorResponseSync('Item is not in trash - cannot permanently delete active items', 400, req);
      }

      // Permanently delete the item
      const { error } = await supabase
        .from(config.table)
        .delete()
        .eq('id', entityId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Item permanently deleted',
        entity_type: entityType,
        entity_id: entityId,
        deleted_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'trash', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'trash',
);
