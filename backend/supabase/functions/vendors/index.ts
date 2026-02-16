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

    // Parallel fetch all data (3 queries → 1 round-trip)
    const [
      { data: metrics },
      { data: vendor, error },
      { data: complianceChecks }
    ] = await Promise.all([
      // Use materialized view for pre-calculated metrics (1-min cache)
      supabase
        .from('vendor_metrics_mv')
        .select('*')
        .eq('vendor_id', vendorId)
        .single(),

      // Fetch vendor details with contracts
      supabase
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
        .single(),

      // Fetch compliance checks separately for cleaner data
      supabase
        .from('compliance_checks')
        .select(`
          *,
          performed_by_user:users!performed_by(id, first_name, last_name)
        `)
        .eq('vendor_id', vendorId)
        .order('performed_at', { ascending: false })
        .limit(10)
    ]);

    if (error) {throw error;}
    if (!vendor) {
      return createErrorResponse('Vendor not found', 404, req);
    }

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

    // Merge vendors using atomic transaction
    const sourceVendorId = pathname.split('/')[2];
    const { targetVendorId } = await req.json();

    if (!targetVendorId) {
      return createErrorResponse('Target vendor ID required', 400, req);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sourceVendorId) || !uuidRegex.test(targetVendorId)) {
      return createErrorResponse('Invalid vendor ID format', 400, req);
    }

    // Execute atomic merge via database transaction
    // This function updates ALL foreign key references across 25+ tables
    // and ensures either all updates succeed or all are rolled back
    const { data: mergeResult, error: mergeError } = await supabase.rpc('merge_vendors', {
      p_source_vendor_id: sourceVendorId,
      p_target_vendor_id: targetVendorId,
      p_enterprise_id: user.enterprise_id,
      p_user_id: user.profile.id,
    });

    if (mergeError) {
      console.error('Vendor merge failed:', mergeError);

      // Handle specific error cases
      if (mergeError.message.includes('not found')) {
        return createErrorResponse('Vendor not found or already deleted', 404, req);
      }
      if (mergeError.message.includes('itself')) {
        return createErrorResponse('Cannot merge vendor with itself', 400, req);
      }

      return createErrorResponse(
        `Vendor merge failed: ${mergeError.message}`,
        500,
        req
      );
    }

    // Log successful merge for audit trail
    await supabase.from('audit_logs').insert({
      enterprise_id: user.enterprise_id,
      user_id: user.profile.id,
      action: 'vendor.merge',
      resource_type: 'vendor',
      resource_id: sourceVendorId,
      metadata: {
        target_vendor_id: targetVendorId,
        contracts_migrated: mergeResult?.contracts_migrated || 0,
        merged_at: mergeResult?.merged_at,
      },
    });

    return createSuccessResponse(
      {
        message: 'Vendors merged successfully',
        contracts_migrated: mergeResult?.contracts_migrated || 0,
        source_vendor_id: sourceVendorId,
        target_vendor_id: targetVendorId,
      },
      undefined,
      200,
      req
    );
  }

  // PATCH - Partial update for vendors
  if (method === 'PATCH' && pathname.match(/^\/vendors\/[a-f0-9-]+$/)) {
    // Check update permission
    if (!permissions.canUpdate) {
      return createErrorResponse('Insufficient permissions', 403, req);
    }

    const vendorId = pathname.split('/')[2];
    const body = await req.json();

    // Verify vendor exists and belongs to enterprise
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('id', vendorId)
      .eq('enterprise_id', user.enterprise_id)
      .is('deleted_at', null)
      .single();

    if (!existingVendor) {
      return createErrorResponse('Vendor not found', 404, req);
    }

    // Define allowed fields for PATCH
    const allowedFields = [
      'name', 'category', 'status', 'email', 'phone', 'website',
      'address', 'city', 'state', 'country', 'postal_code',
      'tax_id', 'payment_terms', 'risk_level', 'tier',
      'notes', 'tags', 'custom_fields', 'metadata',
      'primary_contact_name', 'primary_contact_email', 'primary_contact_phone',
      'compliance_status', 'diversity_certifications', 'insurance_expiry'
    ];

    // Filter to only allowed fields
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('No valid fields to update', 400, req);
    }

    // Perform update
    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) {throw error;}

    // Update performance metrics if relevant fields changed
    const metricsFields = ['status', 'compliance_status', 'risk_level'];
    if (metricsFields.some(f => f in updateData)) {
      await supabase.rpc('update_vendor_performance_metrics', {
        p_vendor_id: vendorId,
      });
    }

    return createSuccessResponse(data, undefined, 200, req);
  }

  // DELETE - Soft delete vendor
  if (method === 'DELETE' && pathname.match(/^\/vendors\/[a-f0-9-]+$/)) {
    const vendorId = pathname.split('/')[2];

    // Check delete permission (requires manage)
    if (!permissions.canManage) {
      return createErrorResponse('Insufficient permissions to delete vendor', 403, req);
    }

    // Verify vendor exists and belongs to enterprise
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('id', vendorId)
      .eq('enterprise_id', user.enterprise_id)
      .is('deleted_at', null)
      .single();

    if (!vendor) {
      return createErrorResponse('Vendor not found', 404, req);
    }

    // Check for active contracts
    const { count: activeContracts } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (activeContracts && activeContracts > 0) {
      return createErrorResponse(
        `Cannot delete vendor with ${activeContracts} active contracts. Archive or reassign contracts first.`,
        409,
        req
      );
    }

    // Soft delete using database function
    const { data, error } = await supabase.rpc('bulk_soft_delete_vendors', {
      p_vendor_ids: [vendorId],
      p_enterprise_id: user.enterprise_id,
      p_user_id: user.id,
    });

    if (error) {throw error;}

    return createSuccessResponse({
      message: 'Vendor deleted successfully',
      id: vendorId,
      deleted_at: new Date().toISOString(),
    }, undefined, 200, req);
  }

  // BULK DELETE - Delete multiple vendors
  if (method === 'POST' && pathname === '/vendors/bulk-delete') {
    const body = await req.json();
    const { vendor_ids } = body;

    if (!Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return createErrorResponse('vendor_ids array is required', 400, req);
    }

    if (vendor_ids.length > 100) {
      return createErrorResponse('Maximum 100 vendors per bulk delete', 400, req);
    }

    // Check manage permission for bulk operations
    if (!permissions.canManage) {
      return createErrorResponse('Insufficient permissions for bulk delete', 403, req);
    }

    // Check for vendors with active contracts
    const { data: vendorsWithContracts } = await supabase
      .from('contracts')
      .select('vendor_id')
      .in('vendor_id', vendor_ids)
      .eq('status', 'active')
      .is('deleted_at', null);

    const vendorsWithActiveContracts = [...new Set(vendorsWithContracts?.map(v => v.vendor_id) || [])];

    if (vendorsWithActiveContracts.length > 0) {
      return createErrorResponse(
        `Cannot delete vendors with active contracts: ${vendorsWithActiveContracts.length} vendors have active contracts`,
        409,
        req,
        { vendors_with_contracts: vendorsWithActiveContracts }
      );
    }

    // Use database function for bulk delete
    const { data, error } = await supabase.rpc('bulk_soft_delete_vendors', {
      p_vendor_ids: vendor_ids,
      p_enterprise_id: user.enterprise_id,
      p_user_id: user.id,
    });

    if (error) {throw error;}

    return createSuccessResponse({
      message: 'Vendors deleted successfully',
      deleted_count: data?.deleted_count || vendor_ids.length,
      deleted_ids: vendor_ids,
    }, undefined, 200, req);
  }

  // BULK UPDATE - Update multiple vendor statuses
  if (method === 'POST' && pathname === '/vendors/bulk-update') {
    const body = await req.json();
    const { vendor_ids, status, risk_level, tier } = body;

    if (!Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return createErrorResponse('vendor_ids array is required', 400, req);
    }

    if (!status && !risk_level && !tier) {
      return createErrorResponse('At least one of status, risk_level, or tier is required', 400, req);
    }

    if (vendor_ids.length > 100) {
      return createErrorResponse('Maximum 100 vendors per bulk update', 400, req);
    }

    // Check manage permission for bulk operations
    if (!permissions.canManage) {
      return createErrorResponse('Insufficient permissions for bulk update', 403, req);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (status) updateData.status = status;
    if (risk_level) updateData.risk_level = risk_level;
    if (tier) updateData.tier = tier;

    // Perform bulk update
    const { data, error } = await supabase
      .from('vendors')
      .update(updateData)
      .in('id', vendor_ids)
      .eq('enterprise_id', user.enterprise_id)
      .is('deleted_at', null)
      .select('id');

    if (error) {throw error;}

    return createSuccessResponse({
      message: 'Vendors updated successfully',
      updated_count: data?.length || 0,
      updated_ids: data?.map((v: { id: string }) => v.id) || [],
    }, undefined, 200, req);
  }

    // Method not allowed
    return createErrorResponse('Method not allowed', 405, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
  },
);