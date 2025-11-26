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

const createMessageSchema = z.object({
  subject: z.string().min(1).max(255),
  content: z.string().min(1),
  message_type: z.enum(['inquiry', 'negotiation', 'issue', 'renewal', 'general', 'urgent']).default('general'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  related_contract_id: z.string().uuid().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const replyMessageSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(255),
  content: z.string().min(1),
  message_type: z.enum(['inquiry', 'negotiation', 'issue', 'renewal', 'general', 'urgent']).default('general'),
  variables: z.array(z.string()).optional(),
  is_default: z.boolean().default(false),
});

const updateTemplateSchema = createTemplateSchema.partial();

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
    const permissions = await getUserPermissions(supabase, profile, 'vendors');

    // ========================================================================
    // GET /vendors/:id/communications - List communications with a vendor
    // ========================================================================
    const vendorCommsMatch = pathname.match(/^\/vendors\/([a-f0-9-]+)\/communications$/);
    if (method === 'GET' && vendorCommsMatch) {
      const vendorId = sanitizeInput.uuid(vendorCommsMatch[1]);
      const params = Object.fromEntries(url.searchParams);
      const messageType = params.message_type;
      const status = params.status;

      // Verify vendor exists
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('id', vendorId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!vendor) {
        return createErrorResponseSync('Vendor not found', 404, req);
      }

      let query = supabase
        .from('vendor_communications')
        .select(`
          *,
          replies:vendor_communication_replies(
            id,
            content,
            created_at,
            created_by,
            is_from_vendor
          ),
          related_contract:contracts(id, title)
        `)
        .eq('vendor_id', vendorId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (messageType) {
        query = query.eq('message_type', messageType);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data: communications, error } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        vendor_id: vendorId,
        vendor_name: vendor.name,
        communications: communications || [],
        total: communications?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /vendors/:id/communications - Send message to vendor
    // ========================================================================
    if (method === 'POST' && vendorCommsMatch) {
      const vendorId = sanitizeInput.uuid(vendorCommsMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to send communications', 403, req);
      }

      // Verify vendor exists
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id, name, primary_contact_email')
        .eq('id', vendorId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!vendor) {
        return createErrorResponseSync('Vendor not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(createMessageSchema, body);

      const { data: communication, error } = await supabase
        .from('vendor_communications')
        .insert({
          vendor_id: vendorId,
          ...validatedData,
          status: 'sent',
          sent_at: new Date().toISOString(),
          created_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // TODO: Integrate with email service to actually send the message
      // This would be done via a separate email service/queue

      return createSuccessResponse(communication, undefined, 201, req);
    }

    // ========================================================================
    // GET /communications - List all communications
    // ========================================================================
    if (method === 'GET' && pathname === '/communications') {
      const params = Object.fromEntries(url.searchParams);
      const search = params.search ? sanitizeInput.searchQuery(params.search) : undefined;
      const status = params.status;
      const priority = params.priority;

      let query = supabase
        .from('vendor_communications')
        .select(`
          *,
          vendor:vendors(id, name),
          replies_count:vendor_communication_replies(count)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`subject.ilike.%${search}%,content.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data: communications, error } = await query;

      if (error) {
        throw error;
      }

      const formattedComms = communications?.map(comm => ({
        ...comm,
        replies_count: comm.replies_count?.[0]?.count || 0,
      })) || [];

      return createSuccessResponse({
        communications: formattedComms,
        total: formattedComms.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /communications/:id - Get single communication
    // ========================================================================
    const singleCommMatch = pathname.match(/^\/communications\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleCommMatch) {
      const commId = sanitizeInput.uuid(singleCommMatch[1]);

      const { data: communication, error } = await supabase
        .from('vendor_communications')
        .select(`
          *,
          vendor:vendors(id, name, primary_contact_email),
          related_contract:contracts(id, title),
          replies:vendor_communication_replies(
            id,
            content,
            attachments,
            created_at,
            created_by,
            is_from_vendor
          )
        `)
        .eq('id', commId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !communication) {
        return createErrorResponseSync('Communication not found', 404, req);
      }

      // Mark as read if unread
      if (!communication.read_at) {
        await supabase
          .from('vendor_communications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', commId);
      }

      return createSuccessResponse(communication, undefined, 200, req);
    }

    // ========================================================================
    // POST /communications/:id/reply - Reply to communication
    // ========================================================================
    const replyMatch = pathname.match(/^\/communications\/([a-f0-9-]+)\/reply$/);
    if (method === 'POST' && replyMatch) {
      const commId = sanitizeInput.uuid(replyMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to reply', 403, req);
      }

      // Verify communication exists
      const { data: communication } = await supabase
        .from('vendor_communications')
        .select('id, vendor_id')
        .eq('id', commId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!communication) {
        return createErrorResponseSync('Communication not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(replyMessageSchema, body);

      const { data: reply, error } = await supabase
        .from('vendor_communication_replies')
        .insert({
          communication_id: commId,
          ...validatedData,
          is_from_vendor: false,
          created_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update communication status
      await supabase
        .from('vendor_communications')
        .update({
          status: 'replied',
          last_reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commId);

      return createSuccessResponse(reply, undefined, 201, req);
    }

    // ========================================================================
    // PATCH /communications/:id/status - Update communication status
    // ========================================================================
    const statusMatch = pathname.match(/^\/communications\/([a-f0-9-]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      const commId = sanitizeInput.uuid(statusMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update status', 403, req);
      }

      const body = await req.json();
      const { status } = z.object({
        status: z.enum(['sent', 'delivered', 'read', 'replied', 'closed', 'archived']),
      }).parse(body);

      const { data: communication, error } = await supabase
        .from('vendor_communications')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!communication) {
        return createErrorResponseSync('Communication not found', 404, req);
      }

      return createSuccessResponse(communication, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /communications/:id - Delete communication
    // ========================================================================
    if (method === 'DELETE' && singleCommMatch) {
      const commId = sanitizeInput.uuid(singleCommMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete communications', 403, req);
      }

      const { error } = await supabase
        .from('vendor_communications')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', commId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Communication deleted',
        id: commId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /communications/templates - List message templates
    // ========================================================================
    if (method === 'GET' && pathname === '/communications/templates') {
      const { data: templates, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        templates: templates || [],
        total: templates?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /communications/templates - Create message template
    // ========================================================================
    if (method === 'POST' && pathname === '/communications/templates') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create templates', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(createTemplateSchema, body);

      // If setting as default, unset other defaults for this type
      if (validatedData.is_default) {
        await supabase
          .from('communication_templates')
          .update({ is_default: false })
          .eq('enterprise_id', profile.enterprise_id)
          .eq('message_type', validatedData.message_type);
      }

      const { data: template, error } = await supabase
        .from('communication_templates')
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

      return createSuccessResponse(template, undefined, 201, req);
    }

    // ========================================================================
    // GET /communications/templates/:id - Get single template
    // ========================================================================
    const singleTemplateMatch = pathname.match(/^\/communications\/templates\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleTemplateMatch) {
      const templateId = sanitizeInput.uuid(singleTemplateMatch[1]);

      const { data: template, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      return createSuccessResponse(template, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /communications/templates/:id - Update template
    // ========================================================================
    if (method === 'PATCH' && singleTemplateMatch) {
      const templateId = sanitizeInput.uuid(singleTemplateMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update templates', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(updateTemplateSchema, body);

      // If setting as default, get current type first
      if (validatedData.is_default) {
        const { data: current } = await supabase
          .from('communication_templates')
          .select('message_type')
          .eq('id', templateId)
          .single();

        if (current) {
          await supabase
            .from('communication_templates')
            .update({ is_default: false })
            .eq('enterprise_id', profile.enterprise_id)
            .eq('message_type', validatedData.message_type || current.message_type)
            .neq('id', templateId);
        }
      }

      const { data: template, error } = await supabase
        .from('communication_templates')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      return createSuccessResponse(template, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /communications/templates/:id - Delete template
    // ========================================================================
    if (method === 'DELETE' && singleTemplateMatch) {
      const templateId = sanitizeInput.uuid(singleTemplateMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete templates', 403, req);
      }

      const { error } = await supabase
        .from('communication_templates')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Template deleted',
        id: templateId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /communications/stats - Communication statistics
    // ========================================================================
    if (method === 'GET' && pathname === '/communications/stats') {
      const { data: communications } = await supabase
        .from('vendor_communications')
        .select('id, status, priority, message_type, created_at')
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const stats = {
        total: communications?.length || 0,
        by_status: {
          sent: 0,
          delivered: 0,
          read: 0,
          replied: 0,
          closed: 0,
          archived: 0,
        },
        by_priority: {
          low: 0,
          normal: 0,
          high: 0,
          urgent: 0,
        },
        by_type: {
          inquiry: 0,
          negotiation: 0,
          issue: 0,
          renewal: 0,
          general: 0,
          urgent: 0,
        },
        pending_response: 0,
        avg_response_time_hours: 0,
      };

      communications?.forEach(comm => {
        stats.by_status[comm.status as keyof typeof stats.by_status]++;
        stats.by_priority[comm.priority as keyof typeof stats.by_priority]++;
        stats.by_type[comm.message_type as keyof typeof stats.by_type]++;

        if (['sent', 'delivered', 'read'].includes(comm.status)) {
          stats.pending_response++;
        }
      });

      return createSuccessResponse({ stats }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'vendor_communications', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'vendor-communications',
);
