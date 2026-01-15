/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { paginationSchema, validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================================================
// EMAIL SERVICE CONFIGURATION
// ============================================================================

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@pactwise.com';
const APP_URL = Deno.env.get('APP_URL') || 'https://app.pactwise.io';

// Email templates for vendor communications
const VENDOR_EMAIL_TEMPLATES = {
  new_message: {
    subject: '{{company_name}}: {{subject}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #291528; padding: 20px; color: white;">
          <h2 style="margin: 0;">New Message from {{company_name}}</h2>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hello,</p>
          <p>You have received a new message regarding your business relationship with <strong>{{company_name}}</strong>.</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #291528;">
            <h3 style="margin-top: 0;">{{subject}}</h3>
            <div style="white-space: pre-wrap;">{{content}}</div>
          </div>

          {{#if contract_title}}
          <p><strong>Related Contract:</strong> {{contract_title}}</p>
          {{/if}}

          <p style="color: #666; font-size: 14px;">
            <strong>Priority:</strong> {{priority}}<br>
            <strong>Type:</strong> {{message_type}}
          </p>

          <div style="margin: 30px 0;">
            <a href="{{portal_url}}" style="background: #291528; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              View & Respond
            </a>
          </div>

          <p style="color: #666; font-size: 12px;">
            This message was sent through Pactwise. If you have questions, please respond through the portal or contact {{sender_name}}.
          </p>
        </div>
      </div>
    `,
  },
  reply_notification: {
    subject: 'Re: {{subject}} - {{company_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #291528; padding: 20px; color: white;">
          <h2 style="margin: 0;">New Reply from {{company_name}}</h2>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hello,</p>
          <p>A new reply has been added to your conversation.</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #291528;">
            <p style="margin-top: 0; color: #666; font-size: 14px;"><strong>From:</strong> {{sender_name}}</p>
            <div style="white-space: pre-wrap;">{{content}}</div>
          </div>

          <div style="margin: 30px 0;">
            <a href="{{portal_url}}" style="background: #291528; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              View Conversation
            </a>
          </div>
        </div>
      </div>
    `,
  },
};

// Send email helper function
async function sendVendorEmail(params: {
  to: string;
  template: keyof typeof VENDOR_EMAIL_TEMPLATES;
  data: Record<string, unknown>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('Email service not configured, skipping send');
    return { success: false, error: 'Email service not configured' };
  }

  const templateConfig = VENDOR_EMAIL_TEMPLATES[params.template];
  const subject = renderEmailTemplate(templateConfig.subject, params.data);
  const html = renderEmailTemplate(templateConfig.html, params.data);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: params.to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email send failed:', error);
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: (err as Error).message };
  }
}

// Template rendering helper
function renderEmailTemplate(template: string, data: Record<string, unknown>): string {
  // Handle basic {{variable}} substitution
  let result = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return (typeof value === 'string' || typeof value === 'number') ? String(value) : match;
  });

  // Handle {{#if variable}}...{{/if}} conditionals
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return data[key] ? content : '';
  });

  return result;
}

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

      // Send email to vendor if they have an email address
      let emailStatus: { sent: boolean; messageId?: string; error?: string } = { sent: false };
      if (vendor.primary_contact_email) {
        // Get enterprise info for the email template
        const { data: enterprise } = await supabase
          .from('enterprises')
          .select('name')
          .eq('id', profile.enterprise_id)
          .single();

        // Get related contract if provided
        let contractTitle: string | undefined;
        if (validatedData.related_contract_id) {
          const { data: contract } = await supabase
            .from('contracts')
            .select('title')
            .eq('id', validatedData.related_contract_id)
            .eq('enterprise_id', profile.enterprise_id)
            .single();
          contractTitle = contract?.title;
        }

        // Send the email
        const emailResult = await sendVendorEmail({
          to: vendor.primary_contact_email,
          template: 'new_message',
          data: {
            company_name: enterprise?.name || 'Your Business Partner',
            subject: validatedData.subject,
            content: validatedData.content,
            priority: validatedData.priority || 'normal',
            message_type: validatedData.message_type || 'general',
            contract_title: contractTitle,
            sender_name: `${profile.first_name} ${profile.last_name}`,
            portal_url: `${APP_URL}/portal/vendor/${vendorId}/communications/${communication.id}`,
          },
        });

        emailStatus = {
          sent: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
        };

        // Update communication record with email status
        if (emailResult.success) {
          await supabase
            .from('vendor_communications')
            .update({
              status: 'delivered',
              metadata: {
                ...(communication.metadata || {}),
                email_sent: true,
                email_message_id: emailResult.messageId,
                email_sent_at: new Date().toISOString(),
              },
            })
            .eq('id', communication.id);
        }
      }

      return createSuccessResponse({
        ...communication,
        email: emailStatus,
      }, undefined, 201, req);
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

      // Verify communication exists and get vendor info
      const { data: communication } = await supabase
        .from('vendor_communications')
        .select(`
          id,
          vendor_id,
          subject,
          vendor:vendors(id, name, primary_contact_email)
        `)
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

      // Send email notification to vendor
      let emailStatus: { sent: boolean; messageId?: string; error?: string } = { sent: false };
      const vendor = communication.vendor as { id: string; name: string; primary_contact_email: string | null } | null;
      if (vendor?.primary_contact_email) {
        // Get enterprise info
        const { data: enterprise } = await supabase
          .from('enterprises')
          .select('name')
          .eq('id', profile.enterprise_id)
          .single();

        const emailResult = await sendVendorEmail({
          to: vendor.primary_contact_email,
          template: 'reply_notification',
          data: {
            company_name: enterprise?.name || 'Your Business Partner',
            subject: communication.subject,
            content: validatedData.content,
            sender_name: `${profile.first_name} ${profile.last_name}`,
            portal_url: `${APP_URL}/portal/vendor/${communication.vendor_id}/communications/${commId}`,
          },
        });

        emailStatus = {
          sent: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
        };
      }

      return createSuccessResponse({
        ...reply,
        email: emailStatus,
      }, undefined, 201, req);
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
