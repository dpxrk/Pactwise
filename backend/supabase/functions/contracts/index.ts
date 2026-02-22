import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { contractSchema, paginationSchema, validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { Database } from '../../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../_shared/supabase.ts';
import { getCache, initializeCache } from '../../functions-utils/cache-factory.ts';
import { callAtomicOperation } from '../_shared/transaction.ts';
import { withCompensatingTransaction } from '../_shared/transaction.ts';

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user's permissions for contracts
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // Route handling
    if (method === 'GET' && pathname === '/contracts') {
      // List contracts with pagination
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);

      const offset = (page - 1) * limit;

      let query = supabase
        .from('contracts')
        .select('*, vendor:vendors(id, name)', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .range(offset, offset + limit - 1);

      // By default, exclude archived contracts unless explicitly requested
      if (params.include_archived !== 'true') {
        query = query.is('archived_at', null);
      }

      // Apply filters
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.vendorId) {
        query = query.eq('vendor_id', params.vendorId);
      }
      if (params.type) {
        query = query.eq('contract_type', params.type);
      }
      if (params.search) {
        query = query.ilike('title', `%${params.search}%`);
      }

      // Apply sorting
      const orderColumn = sortBy || 'created_at';
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {throw error;}

      return createSuccessResponse({
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, undefined, 200, req);
    }

    if (method === 'POST' && pathname === '/contracts') {
      // Check create permission
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Create new contract
      const body = await req.json();
      const validatedData = validateRequest(contractSchema, body);

      // Create contract using database function
      const { data, error } = await supabase.rpc('create_contract_with_analysis', {
        p_title: validatedData.title,
        p_file_name: validatedData.fileName,
        p_file_type: validatedData.fileType,
        p_storage_id: validatedData.storageId,
        p_vendor_id: validatedData.vendorId,
        p_notes: validatedData.notes,
        p_auto_analyze: validatedData.autoAnalyze ?? true,
      });

      if (error) {throw error;}

      // Fetch the created contract
      const { data: contract } = await supabase
        .from('contracts')
        .select('*, vendor:vendors(*)')
        .eq('id', data)
        .single();

      return createSuccessResponse(contract, undefined, 201, req);
    }

    if (method === 'GET' && pathname.match(/^\/contracts\/[a-f0-9-]+$/)) {
      // Get single contract
      const contractId = pathname.split('/')[2];

      // Use unified cache (Redis-backed if available)
      await initializeCache();
      const cache = await getCache();
      const cacheKey = `contract:${profile.enterprise_id}:${contractId}`;

      // Check cache first
      const cachedContract = await cache.get(cacheKey);
      if (cachedContract) {
        return createSuccessResponse(cachedContract, undefined, 200, req);
      }

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          vendor:vendors(id, name),
          owner:users!owner_id(id, full_name, email),
          created_by_user:users!created_by(id, full_name, email),
          assignments:contract_assignments(*, user:users(id, full_name, email)),
          budget_allocations:contract_budget_allocations(*, budget:budgets(id, name)),
          clauses:contract_clauses(id, title, content),
          status_history:contract_status_history(id, status, changed_at),
          approvals:contract_approvals(id, status, approver_id)
        `)
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error) {throw error;}
      if (!data) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Cache the result (5 minutes TTL)
      await cache.set(cacheKey, data, 300);

      return createSuccessResponse(data, undefined, 200, req);
    }

    if (method === 'PUT' && pathname.match(/^\/contracts\/[a-f0-9-]+$/)) {
      // Update contract
      const contractId = pathname.split('/')[2];
      const body = await req.json();

      // Check permissions
      const { data: contract } = await supabase
        .from('contracts')
        .select('owner_id, created_by')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Check update permission
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Define allowed fields for PUT (same as PATCH to prevent mass assignment)
      const allowedFields = [
        'title', 'description', 'notes', 'status', 'value',
        'start_date', 'end_date', 'contract_type', 'priority',
        'is_auto_renew', 'auto_renew_period', 'termination_notice_days',
        'vendor_id', 'owner_id', 'metadata',
      ];

      // Filter to only allowed fields
      const updateData: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in body) {
          updateData[key] = body[key];
        }
      }

      // Update contract with filtered data
      const { data, error } = await supabase
        .from('contracts')
        .update({
          ...updateData,
          last_modified_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) {throw error;}

      return createSuccessResponse(data, undefined, 200, req);
    }

    if (method === 'POST' && pathname.match(/^\/contracts\/[a-f0-9-]+\/analyze$/)) {
      // Check update permission (analysis requires update)
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Trigger contract analysis
      const contractId = pathname.split('/')[2];

      // Use compensating transaction for analysis task + status update
      await withCompensatingTransaction([
        {
          name: 'create_analysis_task',
          execute: async () => {
            const { error } = await supabase
              .from('agent_tasks')
              .insert({
                agent_id: await getAgentId(supabase, 'secretary'),
                task_type: 'analyze_contract',
                priority: 8,
                payload: { contract_id: contractId },
                contract_id: contractId,
                enterprise_id: profile.enterprise_id,
              });
            if (error) throw error;
          },
          rollback: async () => {
            await supabase
              .from('agent_tasks')
              .delete()
              .eq('contract_id', contractId)
              .eq('task_type', 'analyze_contract')
              .eq('enterprise_id', profile.enterprise_id);
          },
        },
        {
          name: 'update_analysis_status',
          execute: async () => {
            const { error } = await supabase
              .from('contracts')
              .update({
                analysis_status: 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', contractId);
            if (error) throw error;
          },
          rollback: async () => {
            await supabase
              .from('contracts')
              .update({
                analysis_status: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', contractId);
          },
        },
      ]);

      return createSuccessResponse({ message: 'Analysis queued' }, 'Analysis queued', 202);
    }

    // PATCH - Partial update for contracts
    if (method === 'PATCH' && pathname.match(/^\/contracts\/[a-f0-9-]+$/)) {
      const contractId = pathname.split('/')[2];
      const body = await req.json();

      // Check permissions
      const { data: contract } = await supabase
        .from('contracts')
        .select('owner_id, created_by, status')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Check update permission
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Define allowed fields for PATCH
      const allowedFields = [
        'title', 'description', 'notes', 'status', 'value',
        'start_date', 'end_date', 'contract_type', 'priority',
        'is_auto_renew', 'auto_renew_period', 'termination_notice_days',
        'tags', 'custom_fields', 'metadata'
      ];

      // Filter to only allowed fields
      const updateData: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in body) {
          updateData[key] = body[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return createErrorResponseSync('No valid fields to update', 400, req);
      }

      // Track status change for history
      const statusChanged = 'status' in updateData && updateData.status !== contract.status;

      if (statusChanged) {
        // Use atomic RPC for status change + history recording
        const result = await callAtomicOperation(supabase, 'update_contract_status', {
          p_contract_id: contractId,
          p_new_status: updateData.status as string,
          p_changed_by: profile.id,
          p_enterprise_id: profile.enterprise_id,
          p_notes: body.status_notes || null,
        });

        // Also update any other changed fields
        const nonStatusFields = { ...updateData };
        delete nonStatusFields.status;
        if (Object.keys(nonStatusFields).length > 0) {
          await supabase
            .from('contracts')
            .update({
              ...nonStatusFields,
              last_modified_by: profile.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contractId)
            .select()
            .single();
        }

        // Fetch updated contract
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();

        if (error) throw error;
        return createSuccessResponse(data, undefined, 200, req);
      } else {
        // Non-status update - keep existing logic
        const { data, error } = await supabase
          .from('contracts')
          .update({
            ...updateData,
            last_modified_by: profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contractId)
          .select()
          .single();

        if (error) throw error;
        return createSuccessResponse(data, undefined, 200, req);
      }
    }

    // DELETE - Soft delete contracts
    if (method === 'DELETE' && pathname.match(/^\/contracts\/[a-f0-9-]+$/)) {
      const contractId = pathname.split('/')[2];

      // Check permissions
      const { data: contract } = await supabase
        .from('contracts')
        .select('owner_id, created_by, status, title')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Check delete permission (requires manage permission or owner)
      const isOwner = contract.owner_id === profile.id || contract.created_by === profile.id;
      if (!permissions.canManage && !isOwner) {
        return createErrorResponseSync('Insufficient permissions to delete', 403, req);
      }

      // Soft delete using database function
      const { data, error } = await supabase.rpc('bulk_soft_delete_contracts', {
        p_contract_ids: [contractId],
        p_enterprise_id: profile.enterprise_id,
        p_user_id: profile.id,
      });

      if (error) {throw error;}

      return createSuccessResponse({
        message: 'Contract deleted successfully',
        id: contractId,
        deleted_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // BULK DELETE - Delete multiple contracts
    if (method === 'POST' && pathname === '/contracts/bulk-delete') {
      const body = await req.json();
      const { contract_ids } = body;

      if (!Array.isArray(contract_ids) || contract_ids.length === 0) {
        return createErrorResponseSync('contract_ids array is required', 400, req);
      }

      if (contract_ids.length > 100) {
        return createErrorResponseSync('Maximum 100 contracts per bulk delete', 400, req);
      }

      // Check manage permission for bulk operations
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions for bulk delete', 403, req);
      }

      // Use database function for bulk delete
      const { data, error } = await supabase.rpc('bulk_soft_delete_contracts', {
        p_contract_ids: contract_ids,
        p_enterprise_id: profile.enterprise_id,
        p_user_id: profile.id,
      });

      if (error) {throw error;}

      return createSuccessResponse({
        message: 'Contracts deleted successfully',
        deleted_count: data?.deleted_count || contract_ids.length,
        deleted_ids: contract_ids,
      }, undefined, 200, req);
    }

    // BULK UPDATE - Update multiple contracts
    if (method === 'POST' && pathname === '/contracts/bulk-update') {
      const body = await req.json();
      const { contract_ids, status } = body;

      if (!Array.isArray(contract_ids) || contract_ids.length === 0) {
        return createErrorResponseSync('contract_ids array is required', 400, req);
      }

      if (!status) {
        return createErrorResponseSync('status is required for bulk update', 400, req);
      }

      if (contract_ids.length > 100) {
        return createErrorResponseSync('Maximum 100 contracts per bulk update', 400, req);
      }

      // Check manage permission for bulk operations
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions for bulk update', 403, req);
      }

      // Use database function for bulk status update
      const { data, error } = await supabase.rpc('bulk_update_contract_status', {
        p_contract_ids: contract_ids,
        p_new_status: status,
        p_enterprise_id: profile.enterprise_id,
        p_user_id: profile.id,
      });

      if (error) {throw error;}

      return createSuccessResponse({
        message: 'Contracts updated successfully',
        updated_count: data?.updated_count || contract_ids.length,
        updated_ids: contract_ids,
        new_status: status,
      }, undefined, 200, req);
    }

    // POST /contracts/:id/archive - Archive a contract
    if (method === 'POST' && pathname.match(/^\/contracts\/[a-f0-9-]+\/archive$/)) {
      const contractId = pathname.split('/')[2];

      // Check permissions
      const { data: contract } = await supabase
        .from('contracts')
        .select('owner_id, created_by, status, archived_at')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      if (contract.archived_at) {
        return createErrorResponseSync('Contract is already archived', 400, req);
      }

      // Check update permission
      const isOwner = contract.owner_id === profile.id || contract.created_by === profile.id;
      if (!permissions.canUpdate && !isOwner) {
        return createErrorResponseSync('Insufficient permissions to archive', 403, req);
      }

      // Use database function to archive
      const { data, error } = await supabase.rpc('archive_contract', {
        p_contract_id: contractId,
        p_user_id: profile.id,
        p_enterprise_id: profile.enterprise_id,
      });

      if (error) {throw error;}

      return createSuccessResponse({
        message: 'Contract archived successfully',
        contract_id: contractId,
        archived_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // POST /contracts/:id/unarchive - Unarchive a contract
    if (method === 'POST' && pathname.match(/^\/contracts\/[a-f0-9-]+\/unarchive$/)) {
      const contractId = pathname.split('/')[2];

      // Check permissions
      const { data: contract } = await supabase
        .from('contracts')
        .select('owner_id, created_by, status, archived_at')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      if (!contract.archived_at) {
        return createErrorResponseSync('Contract is not archived', 400, req);
      }

      // Check update permission
      const isOwner = contract.owner_id === profile.id || contract.created_by === profile.id;
      if (!permissions.canUpdate && !isOwner) {
        return createErrorResponseSync('Insufficient permissions to unarchive', 403, req);
      }

      // Use database function to unarchive
      const { data, error } = await supabase.rpc('unarchive_contract', {
        p_contract_id: contractId,
        p_user_id: profile.id,
        p_enterprise_id: profile.enterprise_id,
      });

      if (error) {throw error;}

      return createSuccessResponse({
        message: 'Contract unarchived successfully',
        contract_id: contractId,
        unarchived_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // GET /contracts/archived - List archived contracts
    if (method === 'GET' && pathname === '/contracts/archived') {
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('contracts')
        .select('*, vendor:vendors(id, name)', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .not('archived_at', 'is', null)
        .range(offset, offset + limit - 1);

      // Apply sorting
      const orderColumn = sortBy || 'archived_at';
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {throw error;}

      return createSuccessResponse({
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'contracts', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'contracts',
);

async function getAgentId(supabase: SupabaseClient<Database>, agentType: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('is_active', true)
    .single();

  return data?.id;
}