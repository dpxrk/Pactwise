import { withMiddleware } from '../_shared/middleware.ts';
import { createErrorResponse, createSuccessResponse } from '../_shared/responses.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { vendorSchema, paginationSchema, validateRequest } from '../_shared/validation.ts';

import { createAdminClient } from '../_shared/supabase.ts';
import type { Database } from '../../types/database.ts';

type Vendor = Database['public']['Tables']['vendors']['Row'];
type Contract = Database['public']['Tables']['contracts']['Row'];
type ComplianceCheck = Database['public']['Tables']['compliance_checks']['Row'];

export default withMiddleware(
  async (context) => {
    const { req, user } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Auth is required, so user is guaranteed to be defined
    if (!user) {
      return createErrorResponse('Unauthorized', 401, req);
    }

  // Get user's permissions for vendors
  const permissions = await getUserPermissions(supabase, user.profile, 'vendors');

  // Route handling
  if (method === 'GET' && pathname === '/vendors') {
    // List vendors with pagination and filtering
    const params = Object.fromEntries(url.searchParams);
    const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);

    const offset = (page - 1) * limit;

    // Use RPC function to get vendors with metrics in a single query
    // This eliminates N+1 query problem by using the materialized view
    const { data: vendorsData, error: vendorsError } = await supabase.rpc(
      'get_vendors_with_metrics',
      {
        p_enterprise_id: user.enterprise_id,
        p_category: params.category || null,
        p_status: params.status || null,
        p_search: params.search || null,
        p_limit: limit,
        p_offset: offset,
        p_sort_by: sortBy || 'name',
        p_sort_order: sortOrder || 'asc'
      }
    );

    if (vendorsError) {throw vendorsError;}

    // Get total count for pagination
    const { count } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('enterprise_id', user.enterprise_id)
      .is('deleted_at', null);

    return createSuccessResponse({
      data: vendorsData || [],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, undefined, 200, req);
  }

  if (method === 'POST' && pathname === '/vendors') {
    // Check create permission
    if (!permissions.canCreate) {
      return createErrorResponse('Insufficient permissions', 403, req);
    }

    // Create new vendor
    const body = await req.json();
    const validatedData = validateRequest(vendorSchema, body);

    // Check for duplicates
    const { data: duplicates } = await supabase.rpc('find_duplicate_vendors', {
      p_name: validatedData.name,
      p_enterprise_id: user.enterprise_id,
    });

    if (duplicates && duplicates.length > 0) {
      const exactMatch = duplicates.find((d: { match_type: string }) => d.match_type === 'exact');
      if (exactMatch) {
        return createErrorResponse('Vendor with this name already exists', 409, req, { duplicates });
      }
    }

    // Create vendor
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        ...validatedData,
        enterprise_id: user.enterprise_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {throw error;}

    return createSuccessResponse(data, undefined, 201, req);
  }

  if (method === 'GET' && pathname.match(/^\/vendors\/[a-f0-9-]+$/)) {
    // Get single vendor with full details using optimized CTE query
    const vendorId = pathname.split('/')[2];

    // Use materialized view for pre-calculated metrics (1-min cache)
    const { data: metrics } = await supabase
      .from('vendor_metrics_mv')
      .select('*')
      .eq('vendor_id', vendorId)
      .single();

    // Fetch vendor details with contracts
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select(`
        *,
        created_by_user:users!created_by(id, first_name, last_name, email),
        contracts:contracts(
          id,
          title,
          status,
          value,
          start_date,
          end_date,
          contract_type,
          is_auto_renew
        )
      `)
      .eq('id', vendorId)
      .eq('enterprise_id', user.enterprise_id)
      .single();

    if (error) {throw error;}
    if (!vendor) {
      return createErrorResponse('Vendor not found', 404, req);
    }

    // Fetch compliance checks separately for cleaner data
    const { data: complianceChecks } = await supabase
      .from('compliance_checks')
      .select(`
        *,
        performed_by_user:users!performed_by(id, first_name, last_name)
      `)
      .eq('vendor_id', vendorId)
      .order('performed_at', { ascending: false })
      .limit(10);

    // Build analytics from materialized view (already calculated)
    const analytics = metrics ? {
      total_contracts: metrics.total_contracts,
      active_contracts: metrics.active_contracts,
      total_value: metrics.total_contract_value,
      avg_contract_value: metrics.total_contracts > 0
        ? metrics.total_contract_value / metrics.total_contracts
        : 0,
      compliance_score: metrics.compliance_score,
      performance_score: metrics.performance_score,
      compliance_issues: complianceChecks?.filter((c: Partial<ComplianceCheck>) => !c.passed).length || 0,
    } : {
      // Fallback if materialized view not yet refreshed
      total_contracts: vendor.contracts?.length || 0,
      active_contracts: vendor.contracts?.filter((c: Partial<Contract>) => c.status === 'active').length || 0,
      total_value: vendor.contracts?.reduce((sum: number, c: Partial<Contract>) => sum + (c.value || 0), 0) || 0,
      avg_contract_value: 0,
      compliance_issues: complianceChecks?.filter((c: Partial<ComplianceCheck>) => !c.passed).length || 0,
    };

    return createSuccessResponse({
      ...vendor,
      compliance_checks: complianceChecks || [],
      analytics,
    }, undefined, 200, req);
  }

  if (method === 'GET' && pathname.match(/^\/vendors\/[a-f0-9-]+\/contracts$/)) {
    // Get vendor contracts with pagination
    const vendorId = pathname.split('/')[2];
    const params = Object.fromEntries(url.searchParams);
    const { page = 1, limit = 20 } = validateRequest(paginationSchema, params);
    const offset = (page - 1) * limit;

    // Verify vendor belongs to enterprise
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', vendorId)
      .eq('enterprise_id', user.enterprise_id)
      .single();

    if (!vendor) {
      return createErrorResponse('Vendor not found', 404, req);
    }

    // Fetch contracts with pagination
    const { data: contracts, error, count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .eq('enterprise_id', user.enterprise_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw error;}

    // 1-minute cache for vendor contracts (metrics change frequently)
    const response = createSuccessResponse({
      data: contracts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, undefined, 200, req);

    // Add cache control header (1 minute for frequently changing metrics)
    response.headers.set('Cache-Control', 'private, max-age=60');
    return response;
  }

  if (method === 'PUT' && pathname.match(/^\/vendors\/[a-f0-9-]+$/)) {
    // Check update permission
    if (!permissions.canUpdate) {
      return createErrorResponse('Insufficient permissions', 403, req);
    }

    // Update vendor
    const vendorId = pathname.split('/')[2];
    const body = await req.json();

    // Validate update data
    const updateData = Object.keys(body).reduce((acc, key) => {
      if (key in vendorSchema.shape) {
        (acc as Record<string, unknown>)[key] = body[key];
      }
      return acc;
    }, {} as Record<string, unknown>);

    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .eq('enterprise_id', user.enterprise_id)
      .select()
      .single();

    if (error) {throw error;}
    if (!data) {
      return createErrorResponse('Vendor not found', 404, req);
    }

    // Update performance metrics
    await supabase.rpc('update_vendor_performance_metrics', {
      p_vendor_id: vendorId,
    });

    return createSuccessResponse(data, undefined, 200, req);
  }

  if (method === 'POST' && pathname.match(/^\/vendors\/[a-f0-9-]+\/merge$/)) {
    // Check manage permission (merging requires manage)
    if (!permissions.canManage) {
      return createErrorResponse('Insufficient permissions', 403, req);
    }

    // Merge vendors
    const sourceVendorId = pathname.split('/')[2];
    const { targetVendorId } = await req.json();

    if (!targetVendorId) {
      return createErrorResponse('Target vendor ID required', 400, req);
    }

    // Check both vendors exist and belong to same enterprise
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name')
      .in('id', [sourceVendorId, targetVendorId])
      .eq('enterprise_id', user.enterprise_id);

    if (!vendors || vendors.length !== 2) {
      return createErrorResponse('Invalid vendor IDs', 404, req);
    }

    // Update all contracts to point to target vendor
    await supabase
      .from('contracts')
      .update({ vendor_id: targetVendorId })
      .eq('vendor_id', sourceVendorId);

    // Soft delete source vendor
    await supabase
      .from('vendors')
      .update({
        deleted_at: new Date().toISOString(),
        metadata: {
          merged_into: targetVendorId,
          merged_by: user.id,
          merged_at: new Date().toISOString(),
        },
      })
      .eq('id', sourceVendorId);

    // Update target vendor metrics
    await supabase.rpc('update_vendor_performance_metrics', {
      p_vendor_id: targetVendorId,
    });

    return createSuccessResponse({ message: 'Vendors merged successfully' }, undefined, 200, req);
  }

    // Method not allowed
    return createErrorResponse('Method not allowed', 405, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
  },
);