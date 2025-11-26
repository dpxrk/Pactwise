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

      // TODO: Send notifications to invited vendors

      return createSuccessResponse(rfq, undefined, 200, req);
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

      // Verify RFQ exists
      const { data: rfq } = await supabase
        .from('rfqs')
        .select('id, status')
        .eq('id', rfqId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!rfq) {
        return createErrorResponseSync('RFQ not found', 404, req);
      }

      // Verify vendors exist
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id')
        .in('id', vendor_ids)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const validVendorIds = vendors?.map(v => v.id) || [];

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

      return createSuccessResponse({
        message: 'Vendors invited',
        rfq_id: rfqId,
        invited_count: validVendorIds.length,
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

      return createSuccessResponse(rfq, undefined, 200, req);
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
