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

// RFQ Email templates
const RFQ_EMAIL_TEMPLATES = {
  vendor_invitation: {
    subject: 'You\'ve been invited to submit a quote: {{rfq_title}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #291528; padding: 20px; color: white;">
          <h2 style="margin: 0;">Request for Quote Invitation</h2>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hello,</p>
          <p><strong>{{company_name}}</strong> has invited you to submit a quote for the following request:</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #291528;">
            <h3 style="margin-top: 0;">{{rfq_title}}</h3>
            <p><strong>RFQ Number:</strong> {{rfq_number}}</p>
            <p><strong>Type:</strong> {{rfq_type}}</p>
            {{#if description}}
            <p><strong>Description:</strong></p>
            <p style="color: #666;">{{description}}</p>
            {{/if}}
            {{#if budget_estimate}}
            <p><strong>Estimated Budget:</strong> ${{budget_estimate}}</p>
            {{/if}}
          </div>

          <div style="background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Submission Deadline:</strong> {{deadline}}</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="{{portal_url}}" style="background: #291528; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              View RFQ & Submit Quote
            </a>
          </div>

          <p style="color: #666; font-size: 12px;">
            This invitation was sent through Pactwise on behalf of {{company_name}}.
          </p>
        </div>
      </div>
    `,
  },
  rfq_awarded: {
    subject: 'Congratulations! Your quote has been accepted: {{rfq_title}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10B981; padding: 20px; color: white;">
          <h2 style="margin: 0;">Quote Accepted!</h2>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hello,</p>
          <p>Great news! Your quote for <strong>{{rfq_title}}</strong> has been accepted by {{company_name}}.</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10B981;">
            <h3 style="margin-top: 0;">{{rfq_title}}</h3>
            <p><strong>RFQ Number:</strong> {{rfq_number}}</p>
            <p><strong>Awarded Amount:</strong> ${{awarded_amount}}</p>
          </div>

          <p>A representative from {{company_name}} will be in touch shortly to proceed with the next steps.</p>

          <div style="margin: 30px 0;">
            <a href="{{portal_url}}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              View Details
            </a>
          </div>
        </div>
      </div>
    `,
  },
  rfq_rejected: {
    subject: 'Update on your quote: {{rfq_title}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6B7280; padding: 20px; color: white;">
          <h2 style="margin: 0;">Quote Update</h2>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hello,</p>
          <p>Thank you for submitting your quote for <strong>{{rfq_title}}</strong>.</p>
          <p>After careful consideration, {{company_name}} has decided to proceed with another vendor for this request.</p>

          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">We appreciate the time and effort you put into your submission. We hope to work with you on future opportunities.</p>
          </div>

          <p>Best regards,<br>{{company_name}}</p>
        </div>
      </div>
    `,
  },
};

// Send RFQ email helper
async function sendRfqEmail(params: {
  to: string;
  template: keyof typeof RFQ_EMAIL_TEMPLATES;
  data: Record<string, unknown>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('Email service not configured, skipping send');
    return { success: false, error: 'Email service not configured' };
  }

  const templateConfig = RFQ_EMAIL_TEMPLATES[params.template];
  const subject = renderRfqTemplate(templateConfig.subject, params.data);
  const html = renderRfqTemplate(templateConfig.html, params.data);

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
      console.error('RFQ email send failed:', error);
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (err) {
    console.error('RFQ email send error:', err);
    return { success: false, error: (err as Error).message };
  }
}

// Template rendering helper
function renderRfqTemplate(template: string, data: Record<string, unknown>): string {
  let result = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return (typeof value === 'string' || typeof value === 'number') ? String(value) : match;
  });

  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return data[key] ? content : '';
  });

  return result;
}

// Send notifications to invited vendors
async function notifyInvitedVendors(
  supabase: ReturnType<typeof createAdminClient>,
  rfqId: string,
  rfq: Record<string, unknown>,
  enterpriseName: string
): Promise<{ sent: number; failed: number }> {
  // Get invited vendors with email addresses
  const { data: invitations } = await supabase
    .from('rfq_vendor_invitations')
    .select(`
      vendor_id,
      vendor:vendors(id, name, primary_contact_email)
    `)
    .eq('rfq_id', rfqId)
    .eq('status', 'invited');

  if (!invitations || invitations.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const invitation of invitations) {
    const vendor = invitation.vendor as { id: string; name: string; primary_contact_email: string | null } | null;
    if (!vendor?.primary_contact_email) {
      failed++;
      continue;
    }

    const result = await sendRfqEmail({
      to: vendor.primary_contact_email,
      template: 'vendor_invitation',
      data: {
        company_name: enterpriseName,
        rfq_title: rfq.title,
        rfq_number: rfq.rfq_number,
        rfq_type: rfq.rfq_type,
        description: rfq.description,
        budget_estimate: rfq.budget_estimate,
        deadline: new Date(rfq.submission_deadline as string).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        portal_url: `${APP_URL}/portal/vendor/${vendor.id}/rfqs/${rfqId}`,
      },
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit: z.string().max(50).optional(),
  specifications: z.string().optional(),
  estimated_unit_price: z.number().optional(),
});

const createRfqSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  rfq_type: z.enum(['goods', 'services', 'both']).default('goods'),
  category: z.string().max(100).optional(),
  line_items: z.array(lineItemSchema).min(1),
  requirements: z.string().optional(),
  evaluation_criteria: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(100),
    description: z.string().optional(),
  })).optional(),
  submission_deadline: z.string().datetime(),
  decision_deadline: z.string().datetime().optional(),
  budget_estimate: z.number().optional(),
  budget_id: z.string().uuid().optional(),
  invited_vendor_ids: z.array(z.string().uuid()).optional(),
  is_public: z.boolean().default(false),
  terms_and_conditions: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateRfqSchema = createRfqSchema.partial().extend({
  status: z.enum(['draft', 'published', 'closed', 'evaluating', 'awarded', 'cancelled']).optional(),
});

const submitQuoteSchema = z.object({
  line_items: z.array(z.object({
    line_item_index: z.number().int().min(0),
    unit_price: z.number().positive(),
    total_price: z.number().positive(),
    notes: z.string().optional(),
    lead_time_days: z.number().int().min(0).optional(),
  })).min(1),
  total_amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  validity_days: z.number().int().min(1).default(30),
  notes: z.string().optional(),
  terms: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
  })).optional(),
});

const evaluateQuoteSchema = z.object({
  scores: z.array(z.object({
    criterion_name: z.string(),
    score: z.number().min(0).max(100),
    notes: z.string().optional(),
  })),
  overall_notes: z.string().optional(),
  recommendation: z.enum(['accept', 'reject', 'negotiate', 'pending']).optional(),
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
    const permissions = await getUserPermissions(supabase, profile, 'rfqs');

    // ========================================================================
    // GET /rfqs - List RFQs
    // ========================================================================
    if (method === 'GET' && pathname === '/rfqs') {
      const params = Object.fromEntries(url.searchParams);
      const status = params.status;
      const rfqType = params.rfq_type;
      const search = params.search ? sanitizeInput.searchQuery(params.search) : undefined;

      let query = supabase
        .from('rfqs')
        .select(`
          *,
          quotes_count:rfq_quotes(count),
          created_by_user:profiles!rfqs_created_by_fkey(id, full_name)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }
      if (rfqType) {
        query = query.eq('rfq_type', rfqType);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: rfqs, error } = await query;

      if (error) {
        throw error;
      }

      const formattedRfqs = rfqs?.map(rfq => ({
        ...rfq,
        quotes_count: rfq.quotes_count?.[0]?.count || 0,
      })) || [];

      return createSuccessResponse({
        rfqs: formattedRfqs,
        total: formattedRfqs.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs - Create RFQ
    // ========================================================================
    if (method === 'POST' && pathname === '/rfqs') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create RFQs', 403, req);
      }

      const body = await req.json();
      const { invited_vendor_ids, ...rfqData } = validateRequest(createRfqSchema, body);

      // Generate RFQ number
      const { data: lastRfq } = await supabase
        .from('rfqs')
        .select('rfq_number')
        .eq('enterprise_id', profile.enterprise_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = lastRfq
        ? parseInt(lastRfq.rfq_number.split('-').pop() || '0', 10) + 1
        : 1;
      const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

      const { data: rfq, error } = await supabase
        .from('rfqs')
        .insert({
          ...rfqData,
          rfq_number: rfqNumber,
          status: 'draft',
          created_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Invite vendors if provided
      if (invited_vendor_ids && invited_vendor_ids.length > 0) {
        const invitations = invited_vendor_ids.map(vendorId => ({
          rfq_id: rfq.id,
          vendor_id: vendorId,
          status: 'invited',
          invited_at: new Date().toISOString(),
          enterprise_id: profile.enterprise_id,
        }));

        await supabase.from('rfq_vendor_invitations').insert(invitations);
      }

      return createSuccessResponse(rfq, undefined, 201, req);
    }

    // ========================================================================
    // GET /rfqs/dashboard - RFQ dashboard overview
    // ========================================================================
    if (method === 'GET' && pathname === '/rfqs/dashboard') {
      const { data: rfqs } = await supabase
        .from('rfqs')
        .select('id, status, rfq_type, budget_estimate, submission_deadline')
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const stats = {
        total: rfqs?.length || 0,
        by_status: {
          draft: 0,
          published: 0,
          closed: 0,
          evaluating: 0,
          awarded: 0,
          cancelled: 0,
        },
        by_type: {
          goods: 0,
          services: 0,
          both: 0,
        },
        total_budget_estimate: 0,
        active_count: 0,
        expiring_soon: 0,
      };

      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      rfqs?.forEach(rfq => {
        stats.by_status[rfq.status as keyof typeof stats.by_status]++;
        stats.by_type[rfq.rfq_type as keyof typeof stats.by_type]++;

        if (rfq.budget_estimate) {
          stats.total_budget_estimate += rfq.budget_estimate;
        }

        if (['published', 'evaluating'].includes(rfq.status)) {
          stats.active_count++;
        }

        if (rfq.submission_deadline) {
          const deadline = new Date(rfq.submission_deadline);
          if (deadline > now && deadline <= sevenDaysLater && rfq.status === 'published') {
            stats.expiring_soon++;
          }
        }
      });

      // Get recent quotes
      const { data: recentQuotes } = await supabase
        .from('rfq_quotes')
        .select(`
          id,
          total_amount,
          submitted_at,
          status,
          rfq:rfqs(id, title, rfq_number),
          vendor:vendors(id, name)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .order('submitted_at', { ascending: false })
        .limit(5);

      return createSuccessResponse({
        stats,
        recent_quotes: recentQuotes || [],
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /rfqs/:id - Get single RFQ
    // ========================================================================
    const singleRfqMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleRfqMatch) {
      const rfqId = sanitizeInput.uuid(singleRfqMatch[1]);

      const { data: rfq, error } = await supabase
        .from('rfqs')
        .select(`
          *,
          quotes:rfq_quotes(
            id,
            vendor_id,
            total_amount,
            currency,
            status,
            submitted_at,
            vendor:vendors(id, name)
          ),
          invitations:rfq_vendor_invitations(
            vendor_id,
            status,
            invited_at,
            responded_at,
            vendor:vendors(id, name)
          ),
          created_by_user:profiles!rfqs_created_by_fkey(id, full_name)
        `)
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !rfq) {
        return createErrorResponseSync('RFQ not found', 404, req);
      }

      return createSuccessResponse(rfq, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /rfqs/:id - Update RFQ
    // ========================================================================
    if (method === 'PATCH' && singleRfqMatch) {
      const rfqId = sanitizeInput.uuid(singleRfqMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update RFQs', 403, req);
      }

      // Verify RFQ exists and check status
      const { data: existingRfq } = await supabase
        .from('rfqs')
        .select('id, status')
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!existingRfq) {
        return createErrorResponseSync('RFQ not found', 404, req);
      }

      // Only allow updates in draft or published status
      if (!['draft', 'published'].includes(existingRfq.status)) {
        return createErrorResponseSync('Cannot update RFQ in current status', 400, req);
      }

      const body = await req.json();
      const { invited_vendor_ids, ...rfqData } = validateRequest(updateRfqSchema, body);

      const { data: rfq, error } = await supabase
        .from('rfqs')
        .update({
          ...rfqData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(rfq, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /rfqs/:id - Delete RFQ
    // ========================================================================
    if (method === 'DELETE' && singleRfqMatch) {
      const rfqId = sanitizeInput.uuid(singleRfqMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete RFQs', 403, req);
      }

      const { error } = await supabase
        .from('rfqs')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'RFQ deleted',
        id: rfqId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs/:id/publish - Publish RFQ
    // ========================================================================
    const publishMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/publish$/);
    if (method === 'POST' && publishMatch) {
      const rfqId = sanitizeInput.uuid(publishMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to publish RFQs', 403, req);
      }

      const { data: rfq, error } = await supabase
        .from('rfqs')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!rfq) {
        return createErrorResponseSync('RFQ not found or cannot be published', 404, req);
      }

      // Send notifications to invited vendors
      let notificationStats = { sent: 0, failed: 0 };
      try {
        // Get enterprise name
        const { data: enterprise } = await supabase
          .from('enterprises')
          .select('name')
          .eq('id', profile.enterprise_id)
          .single();

        notificationStats = await notifyInvitedVendors(
          supabase,
          rfqId,
          rfq,
          enterprise?.name || 'Your Business Partner'
        );
      } catch (notifyError) {
        console.error('Failed to send vendor notifications:', notifyError);
      }

      return createSuccessResponse({
        ...rfq,
        notifications: notificationStats,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs/:id/close - Close RFQ for submissions
    // ========================================================================
    const closeMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/close$/);
    if (method === 'POST' && closeMatch) {
      const rfqId = sanitizeInput.uuid(closeMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to close RFQs', 403, req);
      }

      const { data: rfq, error } = await supabase
        .from('rfqs')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!rfq) {
        return createErrorResponseSync('RFQ not found or cannot be closed', 404, req);
      }

      return createSuccessResponse(rfq, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs/:id/invite - Invite vendors to RFQ
    // ========================================================================
    const inviteMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/invite$/);
    if (method === 'POST' && inviteMatch) {
      const rfqId = sanitizeInput.uuid(inviteMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to invite vendors', 403, req);
      }

      const body = await req.json();
      const { vendor_ids } = z.object({
        vendor_ids: z.array(z.string().uuid()).min(1),
      }).parse(body);

      // Verify RFQ exists and get full details
      const { data: rfq } = await supabase
        .from('rfqs')
        .select('*')
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!rfq) {
        return createErrorResponseSync('RFQ not found', 404, req);
      }

      // Verify vendors exist and get their emails
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name, primary_contact_email')
        .in('id', vendor_ids)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const validVendors = vendors || [];
      const validVendorIds = validVendors.map(v => v.id);

      // Create invitations
      const invitations = validVendorIds.map(vendorId => ({
        rfq_id: rfqId,
        vendor_id: vendorId,
        status: 'invited',
        invited_at: new Date().toISOString(),
        enterprise_id: profile.enterprise_id,
      }));

      if (invitations.length > 0) {
        await supabase
          .from('rfq_vendor_invitations')
          .upsert(invitations, { onConflict: 'rfq_id,vendor_id' });
      }

      // Send notifications if RFQ is already published
      let notificationStats = { sent: 0, failed: 0 };
      if (rfq.status === 'published') {
        const { data: enterprise } = await supabase
          .from('enterprises')
          .select('name')
          .eq('id', profile.enterprise_id)
          .single();

        for (const vendor of validVendors) {
          if (!vendor.primary_contact_email) {
            notificationStats.failed++;
            continue;
          }

          const result = await sendRfqEmail({
            to: vendor.primary_contact_email,
            template: 'vendor_invitation',
            data: {
              company_name: enterprise?.name || 'Your Business Partner',
              rfq_title: rfq.title,
              rfq_number: rfq.rfq_number,
              rfq_type: rfq.rfq_type,
              description: rfq.description,
              budget_estimate: rfq.budget_estimate,
              deadline: new Date(rfq.submission_deadline).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              portal_url: `${APP_URL}/portal/vendor/${vendor.id}/rfqs/${rfqId}`,
            },
          });

          if (result.success) {
            notificationStats.sent++;
          } else {
            notificationStats.failed++;
          }
        }
      }

      return createSuccessResponse({
        message: 'Vendors invited',
        rfq_id: rfqId,
        invited_count: validVendorIds.length,
        notifications: notificationStats,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs/:id/quotes - Submit quote (vendor perspective)
    // ========================================================================
    const quotesMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/quotes$/);
    if (method === 'POST' && quotesMatch) {
      const rfqId = sanitizeInput.uuid(quotesMatch[1]);

      // This would typically be called by a vendor user
      // For now, we'll allow enterprise users to submit on behalf of vendors

      const body = await req.json();
      const { vendor_id, ...quoteData } = z.object({
        vendor_id: z.string().uuid(),
      }).merge(submitQuoteSchema).parse(body);

      // Verify RFQ is accepting quotes
      const { data: rfq } = await supabase
        .from('rfqs')
        .select('id, status, submission_deadline')
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .single();

      if (!rfq) {
        return createErrorResponseSync('RFQ not found or not accepting quotes', 404, req);
      }

      if (new Date(rfq.submission_deadline) < new Date()) {
        return createErrorResponseSync('Submission deadline has passed', 400, req);
      }

      // Check if vendor already submitted
      const { data: existingQuote } = await supabase
        .from('rfq_quotes')
        .select('id')
        .eq('rfq_id', rfqId)
        .eq('vendor_id', vendor_id)
        .single();

      if (existingQuote) {
        return createErrorResponseSync('Vendor has already submitted a quote', 400, req);
      }

      const { data: quote, error } = await supabase
        .from('rfq_quotes')
        .insert({
          rfq_id: rfqId,
          vendor_id,
          ...quoteData,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update vendor invitation status if exists
      await supabase
        .from('rfq_vendor_invitations')
        .update({
          status: 'quoted',
          responded_at: new Date().toISOString(),
        })
        .eq('rfq_id', rfqId)
        .eq('vendor_id', vendor_id);

      return createSuccessResponse(quote, undefined, 201, req);
    }

    // ========================================================================
    // GET /rfqs/:id/quotes - List quotes for RFQ
    // ========================================================================
    if (method === 'GET' && quotesMatch) {
      const rfqId = sanitizeInput.uuid(quotesMatch[1]);

      const { data: quotes, error } = await supabase
        .from('rfq_quotes')
        .select(`
          *,
          vendor:vendors(id, name, primary_contact_email),
          evaluation:rfq_quote_evaluations(
            scores,
            overall_notes,
            recommendation,
            evaluated_at
          )
        `)
        .eq('rfq_id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .order('submitted_at', { ascending: true });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        rfq_id: rfqId,
        quotes: quotes || [],
        total: quotes?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /rfqs/:id/quotes/:quoteId - Get single quote
    // ========================================================================
    const singleQuoteMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/quotes\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleQuoteMatch) {
      const rfqId = sanitizeInput.uuid(singleQuoteMatch[1]);
      const quoteId = sanitizeInput.uuid(singleQuoteMatch[2]);

      const { data: quote, error } = await supabase
        .from('rfq_quotes')
        .select(`
          *,
          vendor:vendors(id, name, primary_contact_email, address),
          rfq:rfqs(id, title, rfq_number, evaluation_criteria),
          evaluation:rfq_quote_evaluations(
            scores,
            overall_notes,
            recommendation,
            evaluated_at,
            evaluated_by
          )
        `)
        .eq('id', quoteId)
        .eq('rfq_id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error || !quote) {
        return createErrorResponseSync('Quote not found', 404, req);
      }

      return createSuccessResponse(quote, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs/:id/quotes/:quoteId/evaluate - Evaluate quote
    // ========================================================================
    const evaluateMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/quotes\/([a-f0-9-]+)\/evaluate$/);
    if (method === 'POST' && evaluateMatch) {
      const rfqId = sanitizeInput.uuid(evaluateMatch[1]);
      const quoteId = sanitizeInput.uuid(evaluateMatch[2]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to evaluate quotes', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(evaluateQuoteSchema, body);

      // Verify quote exists
      const { data: quote } = await supabase
        .from('rfq_quotes')
        .select('id')
        .eq('id', quoteId)
        .eq('rfq_id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!quote) {
        return createErrorResponseSync('Quote not found', 404, req);
      }

      // Calculate total score
      const totalScore = validatedData.scores.reduce((sum, s) => sum + s.score, 0) / validatedData.scores.length;

      const { data: evaluation, error } = await supabase
        .from('rfq_quote_evaluations')
        .upsert({
          quote_id: quoteId,
          rfq_id: rfqId,
          scores: validatedData.scores,
          total_score: Math.round(totalScore * 100) / 100,
          overall_notes: validatedData.overall_notes,
          recommendation: validatedData.recommendation,
          evaluated_at: new Date().toISOString(),
          evaluated_by: profile.id,
          enterprise_id: profile.enterprise_id,
        }, { onConflict: 'quote_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update quote status
      await supabase
        .from('rfq_quotes')
        .update({
          status: 'evaluated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      return createSuccessResponse(evaluation, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs/:id/award - Award RFQ to vendor
    // ========================================================================
    const awardMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/award$/);
    if (method === 'POST' && awardMatch) {
      const rfqId = sanitizeInput.uuid(awardMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to award RFQs', 403, req);
      }

      const body = await req.json();
      const { quote_id, notes } = z.object({
        quote_id: z.string().uuid(),
        notes: z.string().optional(),
      }).parse(body);

      // Verify RFQ and quote
      const { data: quote } = await supabase
        .from('rfq_quotes')
        .select('id, vendor_id')
        .eq('id', quote_id)
        .eq('rfq_id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!quote) {
        return createErrorResponseSync('Quote not found', 404, req);
      }

      // Update RFQ status
      const { data: rfq, error } = await supabase
        .from('rfqs')
        .update({
          status: 'awarded',
          awarded_quote_id: quote_id,
          awarded_vendor_id: quote.vendor_id,
          awarded_at: new Date().toISOString(),
          award_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .in('status', ['closed', 'evaluating'])
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!rfq) {
        return createErrorResponseSync('RFQ not found or cannot be awarded', 404, req);
      }

      // Update winning quote status
      await supabase
        .from('rfq_quotes')
        .update({ status: 'awarded' })
        .eq('id', quote_id);

      // Update losing quotes
      await supabase
        .from('rfq_quotes')
        .update({ status: 'rejected' })
        .eq('rfq_id', rfqId)
        .neq('id', quote_id);

      // Send notifications to winning and losing vendors
      let notificationStats = { winning_sent: false, losing_sent: 0, failed: 0 };
      try {
        // Get enterprise name
        const { data: enterprise } = await supabase
          .from('enterprises')
          .select('name')
          .eq('id', profile.enterprise_id)
          .single();

        const enterpriseName = enterprise?.name || 'Your Business Partner';

        // Get all quotes with vendor info
        const { data: allQuotes } = await supabase
          .from('rfq_quotes')
          .select(`
            id,
            total_amount,
            vendor:vendors(id, name, primary_contact_email)
          `)
          .eq('rfq_id', rfqId)
          .eq('enterprise_id', profile.enterprise_id);

        for (const quoteItem of allQuotes || []) {
          const vendor = quoteItem.vendor as { id: string; name: string; primary_contact_email: string | null } | null;
          if (!vendor?.primary_contact_email) {
            notificationStats.failed++;
            continue;
          }

          if (quoteItem.id === quote_id) {
            // Notify winning vendor
            const result = await sendRfqEmail({
              to: vendor.primary_contact_email,
              template: 'rfq_awarded',
              data: {
                company_name: enterpriseName,
                rfq_title: rfq.title,
                rfq_number: rfq.rfq_number,
                awarded_amount: quoteItem.total_amount,
                portal_url: `${APP_URL}/portal/vendor/${vendor.id}/rfqs/${rfqId}`,
              },
            });
            notificationStats.winning_sent = result.success;
          } else {
            // Notify losing vendors
            const result = await sendRfqEmail({
              to: vendor.primary_contact_email,
              template: 'rfq_rejected',
              data: {
                company_name: enterpriseName,
                rfq_title: rfq.title,
              },
            });
            if (result.success) {
              notificationStats.losing_sent++;
            } else {
              notificationStats.failed++;
            }
          }
        }
      } catch (notifyError) {
        console.error('Failed to send award notifications:', notifyError);
      }

      return createSuccessResponse({
        ...rfq,
        notifications: notificationStats,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /rfqs/:id/cancel - Cancel RFQ
    // ========================================================================
    const cancelMatch = pathname.match(/^\/rfqs\/([a-f0-9-]+)\/cancel$/);
    if (method === 'POST' && cancelMatch) {
      const rfqId = sanitizeInput.uuid(cancelMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to cancel RFQs', 403, req);
      }

      const body = await req.json();
      const { reason } = z.object({
        reason: z.string().optional(),
      }).parse(body);

      const { data: rfq, error } = await supabase
        .from('rfqs')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .not('status', 'eq', 'awarded')
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!rfq) {
        return createErrorResponseSync('RFQ not found or cannot be cancelled', 404, req);
      }

      return createSuccessResponse(rfq, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'rfqs', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'rfqs',
);
