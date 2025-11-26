/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { paginationSchema, validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6b7280'),
  description: z.string().max(255).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(255).optional(),
});

const assignTagsSchema = z.object({
  tag_ids: z.array(z.string().uuid()).min(1),
});

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

    // Get user's permissions
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ========================================================================
    // GET /tags - List all tags
    // ========================================================================
    if (method === 'GET' && pathname === '/tags') {
      const params = Object.fromEntries(url.searchParams);
      const search = params.search ? sanitizeInput.searchQuery(params.search) : undefined;

      let query = supabase
        .from('tags')
        .select('*, usage_count:entity_tags(count)')
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data: tags, error } = await query;

      if (error) {
        throw error;
      }

      // Format usage counts
      const formattedTags = tags?.map(tag => ({
        ...tag,
        usage_count: tag.usage_count?.[0]?.count || 0,
      })) || [];

      return createSuccessResponse({
        tags: formattedTags,
        total: formattedTags.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /tags - Create a new tag
    // ========================================================================
    if (method === 'POST' && pathname === '/tags') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create tags', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(createTagSchema, body);

      // Check for duplicate name
      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('enterprise_id', profile.enterprise_id)
        .ilike('name', validatedData.name)
        .is('deleted_at', null)
        .single();

      if (existing) {
        return createErrorResponseSync('A tag with this name already exists', 400, req);
      }

      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          ...validatedData,
          created_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(tag, undefined, 201, req);
    }

    // ========================================================================
    // GET /tags/:id - Get a single tag
    // ========================================================================
    const singleTagMatch = pathname.match(/^\/tags\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleTagMatch) {
      const tagId = sanitizeInput.uuid(singleTagMatch[1]);

      const { data: tag, error } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !tag) {
        return createErrorResponseSync('Tag not found', 404, req);
      }

      // Get usage count
      const { count } = await supabase
        .from('entity_tags')
        .select('id', { count: 'exact', head: true })
        .eq('tag_id', tagId);

      return createSuccessResponse({
        ...tag,
        usage_count: count || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /tags/:id - Update a tag
    // ========================================================================
    if (method === 'PATCH' && singleTagMatch) {
      const tagId = sanitizeInput.uuid(singleTagMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update tags', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(updateTagSchema, body);

      // Check for duplicate name if name is being updated
      if (validatedData.name) {
        const { data: existing } = await supabase
          .from('tags')
          .select('id')
          .eq('enterprise_id', profile.enterprise_id)
          .ilike('name', validatedData.name)
          .neq('id', tagId)
          .is('deleted_at', null)
          .single();

        if (existing) {
          return createErrorResponseSync('A tag with this name already exists', 400, req);
        }
      }

      const { data: tag, error } = await supabase
        .from('tags')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tagId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!tag) {
        return createErrorResponseSync('Tag not found', 404, req);
      }

      return createSuccessResponse(tag, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /tags/:id - Delete a tag
    // ========================================================================
    if (method === 'DELETE' && singleTagMatch) {
      const tagId = sanitizeInput.uuid(singleTagMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete tags', 403, req);
      }

      // Remove all entity associations first
      await supabase
        .from('entity_tags')
        .delete()
        .eq('tag_id', tagId);

      // Soft delete the tag
      const { error } = await supabase
        .from('tags')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', tagId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Tag deleted',
        id: tagId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /contracts/:id/tags - Get tags for a contract
    // ========================================================================
    const contractTagsMatch = pathname.match(/^\/contracts\/([a-f0-9-]+)\/tags$/);
    if (method === 'GET' && contractTagsMatch) {
      const contractId = sanitizeInput.uuid(contractTagsMatch[1]);

      const { data: entityTags, error } = await supabase
        .from('entity_tags')
        .select(`
          tag:tags(id, name, color, description)
        `)
        .eq('entity_type', 'contracts')
        .eq('entity_id', contractId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      const tags = entityTags?.map(et => et.tag).filter(Boolean) || [];

      return createSuccessResponse({
        contract_id: contractId,
        tags,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /contracts/:id/tags - Add tags to a contract
    // ========================================================================
    if (method === 'POST' && contractTagsMatch) {
      const contractId = sanitizeInput.uuid(contractTagsMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to add tags', 403, req);
      }

      // Verify contract exists
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      const body = await req.json();
      const { tag_ids } = validateRequest(assignTagsSchema, body);

      // Verify tags exist
      const { data: validTags } = await supabase
        .from('tags')
        .select('id')
        .in('id', tag_ids)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const validTagIds = validTags?.map(t => t.id) || [];

      // Create entity_tags entries
      const entityTags = validTagIds.map(tagId => ({
        entity_type: 'contracts',
        entity_id: contractId,
        tag_id: tagId,
        enterprise_id: profile.enterprise_id,
      }));

      if (entityTags.length > 0) {
        await supabase
          .from('entity_tags')
          .upsert(entityTags, { onConflict: 'entity_type,entity_id,tag_id' });
      }

      return createSuccessResponse({
        message: 'Tags added',
        contract_id: contractId,
        added_tag_ids: validTagIds,
      }, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /contracts/:id/tags/:tagId - Remove a tag from a contract
    // ========================================================================
    const removeContractTagMatch = pathname.match(/^\/contracts\/([a-f0-9-]+)\/tags\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && removeContractTagMatch) {
      const contractId = sanitizeInput.uuid(removeContractTagMatch[1]);
      const tagId = sanitizeInput.uuid(removeContractTagMatch[2]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to remove tags', 403, req);
      }

      const { error } = await supabase
        .from('entity_tags')
        .delete()
        .eq('entity_type', 'contracts')
        .eq('entity_id', contractId)
        .eq('tag_id', tagId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Tag removed',
        contract_id: contractId,
        tag_id: tagId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /vendors/:id/tags - Get tags for a vendor
    // ========================================================================
    const vendorTagsMatch = pathname.match(/^\/vendors\/([a-f0-9-]+)\/tags$/);
    if (method === 'GET' && vendorTagsMatch) {
      const vendorId = sanitizeInput.uuid(vendorTagsMatch[1]);

      const { data: entityTags, error } = await supabase
        .from('entity_tags')
        .select(`
          tag:tags(id, name, color, description)
        `)
        .eq('entity_type', 'vendors')
        .eq('entity_id', vendorId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      const tags = entityTags?.map(et => et.tag).filter(Boolean) || [];

      return createSuccessResponse({
        vendor_id: vendorId,
        tags,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /vendors/:id/tags - Add tags to a vendor
    // ========================================================================
    if (method === 'POST' && vendorTagsMatch) {
      const vendorId = sanitizeInput.uuid(vendorTagsMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to add tags', 403, req);
      }

      // Verify vendor exists
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', vendorId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!vendor) {
        return createErrorResponseSync('Vendor not found', 404, req);
      }

      const body = await req.json();
      const { tag_ids } = validateRequest(assignTagsSchema, body);

      // Verify tags exist
      const { data: validTags } = await supabase
        .from('tags')
        .select('id')
        .in('id', tag_ids)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const validTagIds = validTags?.map(t => t.id) || [];

      // Create entity_tags entries
      const entityTags = validTagIds.map(tagId => ({
        entity_type: 'vendors',
        entity_id: vendorId,
        tag_id: tagId,
        enterprise_id: profile.enterprise_id,
      }));

      if (entityTags.length > 0) {
        await supabase
          .from('entity_tags')
          .upsert(entityTags, { onConflict: 'entity_type,entity_id,tag_id' });
      }

      return createSuccessResponse({
        message: 'Tags added',
        vendor_id: vendorId,
        added_tag_ids: validTagIds,
      }, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /vendors/:id/tags/:tagId - Remove a tag from a vendor
    // ========================================================================
    const removeVendorTagMatch = pathname.match(/^\/vendors\/([a-f0-9-]+)\/tags\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && removeVendorTagMatch) {
      const vendorId = sanitizeInput.uuid(removeVendorTagMatch[1]);
      const tagId = sanitizeInput.uuid(removeVendorTagMatch[2]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to remove tags', 403, req);
      }

      const { error } = await supabase
        .from('entity_tags')
        .delete()
        .eq('entity_type', 'vendors')
        .eq('entity_id', vendorId)
        .eq('tag_id', tagId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Tag removed',
        vendor_id: vendorId,
        tag_id: tagId,
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'tags', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'tags',
);
