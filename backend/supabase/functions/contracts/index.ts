
import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { contractSchema, paginationSchema, validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { Database } from '../../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../_shared/supabase.ts';
import { MemoryCache } from '../../functions-utils/cache.ts';

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

      // Apply filters
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.vendorId) {
        query = query.eq('vendor_id', params.vendorId);
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
      const cache = new MemoryCache();
      const cacheKey = `contract:${contractId}`;

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

      await cache.set(cacheKey, data, 300); // Cache for 5 minutes

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

      // Update contract
      const { data, error } = await supabase
        .from('contracts')
        .update({
          ...body,
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

      // Queue analysis task
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

      if (error) {throw error;}

      // Update contract status
      await supabase
        .from('contracts')
        .update({
          analysis_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId);

      return createSuccessResponse({ message: 'Analysis queued' }, 'Analysis queued', 202);
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