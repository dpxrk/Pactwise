/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { validateRequest, z } from '../_shared/validation.ts';
import { MarketIntelligenceAgent } from '../local-agents/agents/market-intelligence.ts';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const PriceBenchmarkSchema = z.object({
  action: z.literal('get_price_benchmark'),
  params: z.object({
    taxonomy_code: z.string(),
    unit_price: z.number().optional(),
    industry: z.string().optional(),
    region: z.string().optional(),
    company_size: z.string().optional(),
  }),
});

const DetectAnomaliesSchema = z.object({
  action: z.literal('detect_anomalies'),
  params: z.object({
    contract_id: z.string().uuid().optional(),
    line_item_id: z.string().uuid().optional(),
  }).refine(data => data.contract_id || data.line_item_id, {
    message: 'Either contract_id or line_item_id is required',
  }),
});

const GetTrendsSchema = z.object({
  action: z.literal('get_trends'),
  params: z.object({
    taxonomy_code: z.string().optional(),
    industry: z.string().optional(),
    region: z.string().optional(),
    period: z.string().optional(),
  }),
});

const CompareVendorPricingSchema = z.object({
  action: z.literal('compare_vendor_pricing'),
  params: z.object({
    vendor_id: z.string().uuid(),
    taxonomy_code: z.string().optional(),
  }),
});

const MatchTaxonomySchema = z.object({
  action: z.literal('match_taxonomy'),
  params: z.object({
    item_name: z.string(),
    item_description: z.string().optional(),
    line_item_id: z.string().uuid().optional(),
    limit: z.number().min(1).max(20).default(5),
  }),
});

const ContributePriceDataSchema = z.object({
  action: z.literal('contribute_price_data'),
  params: z.object({
    line_item_id: z.string().uuid(),
  }),
});

const GetDashboardSummarySchema = z.object({
  action: z.literal('get_dashboard_summary'),
  params: z.object({}).optional(),
});

const GetAnomalySummarySchema = z.object({
  action: z.literal('get_anomaly_summary'),
  params: z.object({}).optional(),
});

const GetReviewQueueSchema = z.object({
  action: z.literal('get_review_queue'),
  params: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'new_code_requested']).default('pending'),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  }),
});

const ApproveReviewSchema = z.object({
  action: z.literal('approve_review'),
  params: z.object({
    review_id: z.string().uuid(),
    selected_taxonomy_code: z.string(),
    notes: z.string().optional(),
  }),
});

// Combined request schema
const MarketIntelligenceRequestSchema = z.discriminatedUnion('action', [
  PriceBenchmarkSchema,
  DetectAnomaliesSchema,
  GetTrendsSchema,
  CompareVendorPricingSchema,
  MatchTaxonomySchema,
  ContributePriceDataSchema,
  GetDashboardSummarySchema,
  GetAnomalySummarySchema,
  GetReviewQueueSchema,
  ApproveReviewSchema,
]);

type MarketIntelligenceRequest = z.infer<typeof MarketIntelligenceRequestSchema>;

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createSupabaseClient(authHeader);
    const user = await getUserFromAuth(supabase);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get user's enterprise
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('enterprise_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.enterprise_id) {
      return new Response(JSON.stringify({ error: 'User profile not found or no enterprise' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Parse and validate request
    const body = await req.json();
    const validation = validateRequest(MarketIntelligenceRequestSchema, body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Validation error', details: validation.error }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const request = validation.data as MarketIntelligenceRequest;

    // Initialize agent
    const agent = new MarketIntelligenceAgent(supabase, userProfile.enterprise_id, user.id);

    // Route to appropriate handler
    let result: unknown;

    switch (request.action) {
      case 'get_price_benchmark':
        result = await agent.process(
          { taxonomy_code: request.params.taxonomy_code, unit_price: request.params.unit_price },
          {
            analysisType: 'benchmark',
            taxonomyCode: request.params.taxonomy_code,
            industry: request.params.industry,
            region: request.params.region,
            enterpriseId: userProfile.enterprise_id,
            sessionId: crypto.randomUUID(),
            environment: {},
            permissions: [],
          }
        );
        break;

      case 'detect_anomalies':
        result = await agent.process(
          { contract_id: request.params.contract_id, line_item_id: request.params.line_item_id },
          {
            analysisType: 'anomaly_detection',
            contractId: request.params.contract_id,
            lineItemId: request.params.line_item_id,
            enterpriseId: userProfile.enterprise_id,
            sessionId: crypto.randomUUID(),
            environment: {},
            permissions: [],
          }
        );
        break;

      case 'get_trends':
        result = await agent.process(
          { taxonomy_code: request.params.taxonomy_code },
          {
            analysisType: 'trend_analysis',
            taxonomyCode: request.params.taxonomy_code,
            industry: request.params.industry,
            region: request.params.region,
            enterpriseId: userProfile.enterprise_id,
            sessionId: crypto.randomUUID(),
            environment: {},
            permissions: [],
          }
        );
        break;

      case 'compare_vendor_pricing':
        result = await agent.process(
          { vendor_id: request.params.vendor_id, taxonomy_code: request.params.taxonomy_code },
          {
            analysisType: 'vendor_comparison',
            vendorId: request.params.vendor_id,
            taxonomyCode: request.params.taxonomy_code,
            enterpriseId: userProfile.enterprise_id,
            sessionId: crypto.randomUUID(),
            environment: {},
            permissions: [],
          }
        );
        break;

      case 'match_taxonomy':
        result = await agent.process(
          {
            item_name: request.params.item_name,
            item_description: request.params.item_description,
            line_item_id: request.params.line_item_id,
          },
          {
            analysisType: 'taxonomy_match',
            enterpriseId: userProfile.enterprise_id,
            sessionId: crypto.randomUUID(),
            environment: {},
            permissions: [],
          }
        );
        break;

      case 'contribute_price_data':
        const { DonnaMarketIntelligence } = await import('../local-agents/donna/market-intelligence.ts');
        const marketIntelligence = new DonnaMarketIntelligence(supabase, userProfile.enterprise_id);
        const contributed = await marketIntelligence.contributePriceData(request.params.line_item_id);
        result = { success: contributed, message: contributed ? 'Price data contributed successfully' : 'Failed to contribute price data' };
        break;

      case 'get_dashboard_summary':
        result = await agent.getDashboardSummary();
        break;

      case 'get_anomaly_summary':
        const { DonnaMarketIntelligence: DonnaForSummary } = await import('../local-agents/donna/market-intelligence.ts');
        const miForSummary = new DonnaForSummary(supabase, userProfile.enterprise_id);
        result = await miForSummary.getAnomalySummary();
        break;

      case 'get_review_queue':
        const { data: queueItems, error: queueError } = await supabase
          .from('taxonomy_review_queue')
          .select(`
            *,
            contracts:contract_id (title, value),
            line_items:line_item_id (item_name, unit_price)
          `)
          .eq('enterprise_id', userProfile.enterprise_id)
          .eq('status', request.params.status)
          .order('priority', { ascending: true })
          .order('created_at', { ascending: true })
          .range(request.params.offset, request.params.offset + request.params.limit - 1);

        if (queueError) {
          throw new Error(`Failed to get review queue: ${queueError.message}`);
        }

        result = { items: queueItems, total: queueItems?.length || 0 };
        break;

      case 'approve_review':
        const { data: approvalResult, error: approvalError } = await supabase.rpc('approve_taxonomy_review', {
          p_review_id: request.params.review_id,
          p_selected_code: request.params.selected_taxonomy_code,
          p_reviewer_id: user.id,
          p_notes: request.params.notes || null,
        });

        if (approvalError) {
          throw new Error(`Failed to approve review: ${approvalError.message}`);
        }

        result = { success: approvalResult, message: approvalResult ? 'Review approved successfully' : 'Failed to approve review' };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[Market Intelligence] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
