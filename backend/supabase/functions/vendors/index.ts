import { withMiddleware } from '../_shared/middleware.ts';
import { createErrorResponse, createSuccessResponse } from '../_shared/responses.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { vendorSchema, paginationSchema, validateRequest } from '../_shared/validation.ts';

import { createAdminClient } from '../_shared/supabase.ts';

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

  // Get user's permissions for vendors
  const permissions = await getUserPermissions(supabase, profile, 'vendors');

  // Route handling
  if (method === 'GET' && pathname === '/vendors') {
    // List vendors with pagination and filtering
    const params = Object.fromEntries(url.searchParams);
    const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);

    const offset = (page - 1) * limit;

    let query = supabase
      .from('vendors')
      .select(`
        *,
        contracts:contracts(count)
      `, { count: 'exact' })
      .eq('enterprise_id', profile.enterprise_id)
      .is('deleted_at', null)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    // Apply sorting
    const orderColumn = sortBy || 'name';
    query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

    const { data, error, count } = await query;

    if (error) {throw error;}

    // Calculate additional metrics
    const vendorsWithMetrics = await Promise.all(
      data.map(async (vendor: any) => {
        const { count: contractCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('status', 'active');

        return {
          ...vendor,
          active_contracts: contractCount || 0,
        };
      }),
    );

    return createSuccessResponse({
      data: vendorsWithMetrics,
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
      p_enterprise_id: profile.enterprise_id,
    });

    if (duplicates && duplicates.length > 0) {
      const exactMatch = duplicates.find((d: any) => d.match_type === 'exact');
      if (exactMatch) {
        return createErrorResponse('Vendor with this name already exists', 409, req, { duplicates });
      }
    }

    // Create vendor
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        ...validatedData,
        enterprise_id: profile.enterprise_id,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) {throw error;}

    return createSuccessResponse(data, undefined, 201, req);
  }

  if (method === 'GET' && pathname.match(/^\/vendors\/[a-f0-9-]+$/)) {
    // Get single vendor with full details
    const vendorId = pathname.split('/')[2];

    const { data: vendor, error } = await supabase
      .from('vendors')
      .select(`
        *,
        created_by_user:users!created_by(*),
        contracts:contracts(
          id,
          title,
          status,
          value,
          start_date,
          end_date
        ),
        compliance_checks:compliance_checks(
          *,
          performed_by_user:users!performed_by(*)
        )
      `)
      .eq('id', vendorId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (error) {throw error;}
    if (!vendor) {
      return createErrorResponse('Vendor not found', 404, req);
    }

    // Calculate analytics
    const analytics = {
      total_contracts: vendor.contracts.length,
      active_contracts: vendor.contracts.filter((c: any) => c.status === 'active').length,
      total_value: vendor.contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0),
      avg_contract_value: vendor.contracts.length > 0
        ? vendor.contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0) / vendor.contracts.length
        : 0,
      compliance_issues: vendor.compliance_checks.filter((c: any) => !c.passed).length,
    };

    return createSuccessResponse({
      ...vendor,
      analytics,
    }, undefined, 200, req);
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
      if (vendorSchema.shape[key]) {
        acc[key] = body[key];
      }
      return acc;
    }, {});

    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .eq('enterprise_id', profile.enterprise_id)
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
      .eq('enterprise_id', profile.enterprise_id);

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
          merged_by: profile.id,
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