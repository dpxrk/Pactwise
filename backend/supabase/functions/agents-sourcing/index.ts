/// <reference path="../../types/global.d.ts" />
/**
 * Sourcing Agent - Intelligent supplier discovery and evaluation
 *
 * Capabilities:
 * - Supplier discovery and matching
 * - Market research and pricing intelligence
 * - Vendor risk assessment
 * - RFQ preparation and evaluation
 * - Supplier recommendations
 */

import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { handleError } from '../_shared/errors.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.17.1';
import {
  SourcingRequestSchema,
  SupplierEvaluationSchema,
  MarketResearchRequestSchema,
  CreateRFQSchema,
  QuoteAnalysisSchema,
  validateRequestBody,
  createValidationErrorResponse,
} from '../_shared/validation-schemas.ts';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('LLM_API_KEY'),
});

const MODEL = Deno.env.get('LLM_MODEL') || 'claude-3-5-sonnet-20241022';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    const { data: userData } = await supabase
      .from('users')
      .select('id, enterprise_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'find-suppliers':
        return await handleFindSuppliers(req, supabase, userData);

      case 'evaluate-supplier':
        return await handleEvaluateSupplier(req, supabase, userData);

      case 'market-research':
        return await handleMarketResearch(req, supabase, userData);

      case 'prepare-rfq':
        return await handlePrepareRFQ(req, supabase, userData);

      case 'analyze-quotes':
        return await handleAnalyzeQuotes(req, supabase, userData);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return handleError(error);
  }
});

/**
 * Find suppliers matching requirements
 */
async function handleFindSuppliers(req: Request, supabase: SupabaseClient, userData: any) {
  // Validate request body
  let validatedRequest;
  try {
    const body = await req.json();
    validatedRequest = validateRequestBody(SourcingRequestSchema, body);
  } catch (error) {
    return createValidationErrorResponse(error as Error);
  }

  const {
    category,
    specifications,
    quantity,
    budget,
    location,
    certifications,
  } = validatedRequest;

  // Search existing vendors in database
  const { data: existingVendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('enterprise_id', userData.enterprise_id)
    .eq('status', 'active')
    .contains('categories', [category]);

  // Use AI to analyze requirements and suggest search strategies
  const prompt = `
As a procurement sourcing specialist, help find suppliers for:

Category: ${category}
Specifications: ${specifications}
Quantity: ${quantity || 'Not specified'}
Budget: ${budget || 'Not specified'}
Location: ${location || 'Any'}
Required Certifications: ${certifications || 'None specified'}

Tasks:
1. Identify key supplier search criteria
2. Suggest supplier types (manufacturers, distributors, wholesalers)
3. List potential search platforms (Alibaba, ThomasNet, etc.)
4. Recommend supplier qualification criteria
5. Suggest questions for RFQ
6. Estimate market pricing range
7. Identify potential risks

Return as JSON:
{
  "search_strategy": {
    "supplier_types": ["string"],
    "search_platforms": ["string"],
    "keywords": ["string"]
  },
  "qualification_criteria": {
    "must_have": ["string"],
    "nice_to_have": ["string"],
    "deal_breakers": ["string"]
  },
  "rfq_questions": ["string"],
  "market_intelligence": {
    "typical_lead_time": "string",
    "price_range": "string",
    "market_conditions": "string"
  },
  "risks": ["string"],
  "recommendations": ["string"]
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const aiRecommendations = JSON.parse(message.content[0].text);

  // Score existing vendors against requirements
  const scoredVendors = await scoreVendorsAgainstRequirements(
    existingVendors || [],
    { category, specifications, certifications },
  );

  // Create sourcing request record
  const { data: sourcingRequest } = await supabase
    .from('sourcing_requests')
    .insert({
      enterprise_id: userData.enterprise_id,
      category,
      specifications,
      quantity,
      budget,
      location,
      required_certifications: certifications,
      status: 'active',
      ai_recommendations: aiRecommendations,
      created_by: userData.id,
    })
    .select()
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        sourcing_request_id: sourcingRequest?.id,
        matched_vendors: scoredVendors,
        ai_recommendations: aiRecommendations,
        next_steps: [
          'Review matched vendors',
          'Create RFQ from recommendations',
          'Search external marketplaces',
          'Contact top matches',
        ],
      },
    }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Evaluate a specific supplier
 */
async function handleEvaluateSupplier(req: Request, supabase: SupabaseClient, userData: any) {
  // Validate request body
  let validatedRequest;
  try {
    const body = await req.json();
    validatedRequest = validateRequestBody(SupplierEvaluationSchema, body);
  } catch (error) {
    return createValidationErrorResponse(error as Error);
  }

  const { vendorId, evaluationCriteria } = validatedRequest;

  // Get vendor data
  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .eq('enterprise_id', userData.enterprise_id)
    .single();

  if (error || !vendor) throw new Error('Vendor not found');

  // Get vendor history
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('enterprise_id', userData.enterprise_id);

  const prompt = `
Evaluate this supplier comprehensively:

Vendor Information:
${JSON.stringify(vendor, null, 2)}

Contract History:
${JSON.stringify(contracts, null, 2)}

Evaluation Criteria:
${JSON.stringify(evaluationCriteria, null, 2)}

Provide:
1. Overall supplier score (0-100)
2. Strengths and weaknesses
3. Risk assessment
4. Performance analysis
5. Pricing competitiveness
6. Quality and reliability assessment
7. Recommendation (approve/conditional/reject)

Return as JSON:
{
  "overall_score": number,
  "recommendation": "approve|conditional|reject",
  "scores": {
    "financial_stability": number,
    "quality": number,
    "delivery_performance": number,
    "pricing": number,
    "responsiveness": number
  },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "risks": [{"risk": "string", "severity": "string", "mitigation": "string"}],
  "conditions": ["string"],
  "summary": "string"
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  const evaluation = JSON.parse(message.content[0].text);

  // Update vendor scores
  await supabase
    .from('vendors')
    .update({
      performance_score: evaluation.overall_score / 100,
      last_evaluation_date: new Date().toISOString(),
      evaluation_notes: evaluation.summary,
    })
    .eq('id', vendorId);

  // Create insight if recommendation is conditional or reject
  if (evaluation.recommendation !== 'approve') {
    await supabase.from('agent_insights').insert({
      agent_id: await getAgentId(supabase, 'sourcing', userData.enterprise_id),
      insight_type: 'vendor_alert',
      title: `Vendor Evaluation: ${evaluation.recommendation}`,
      description: evaluation.summary,
      severity: evaluation.recommendation === 'reject' ? 'high' : 'medium',
      vendor_id: vendorId,
      enterprise_id: userData.enterprise_id,
      is_actionable: true,
    });
  }

  return new Response(
    JSON.stringify({ success: true, data: evaluation }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Conduct market research
 */
async function handleMarketResearch(req: Request, supabase: SupabaseClient, userData: any) {
  // Validate request body
  let validatedRequest;
  try {
    const body = await req.json();
    validatedRequest = validateRequestBody(MarketResearchRequestSchema, body);
  } catch (error) {
    return createValidationErrorResponse(error as Error);
  }

  const { category, region, timeframe } = validatedRequest;

  const prompt = `
Conduct market research for procurement:

Category: ${category}
Region: ${region || 'Global'}
Timeframe: ${timeframe || 'Current'}

Analyze:
1. Market trends and dynamics
2. Typical pricing ranges
3. Leading suppliers/manufacturers
4. Supply chain considerations
5. Risk factors (geopolitical, supply chain, etc.)
6. Technology and innovation trends
7. Sustainability considerations
8. Cost optimization opportunities

Provide actionable market intelligence for procurement decisions.

Return as JSON:
{
  "market_overview": {
    "size": "string",
    "growth_rate": "string",
    "key_trends": ["string"]
  },
  "pricing": {
    "low": number,
    "mid": number,
    "high": number,
    "factors_affecting_price": ["string"]
  },
  "leading_suppliers": [{"name": "string", "strengths": ["string"]}],
  "supply_chain": {
    "lead_times": "string",
    "risks": ["string"],
    "recommendations": ["string"]
  },
  "opportunities": ["string"],
  "recommendations": ["string"]
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    temperature: 0.4, // Slightly higher for market insights
    messages: [{ role: 'user', content: prompt }],
  });

  const research = JSON.parse(message.content[0].text);

  // Save market research
  await supabase.from('market_research').insert({
    enterprise_id: userData.enterprise_id,
    category,
    region,
    research_data: research,
    created_by: userData.id,
  });

  return new Response(
    JSON.stringify({ success: true, data: research }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Prepare RFQ document
 */
async function handlePrepareRFQ(req: Request, supabase: SupabaseClient, userData: any) {
  // Validate request body
  let validatedRequest;
  try {
    const body = await req.json();
    validatedRequest = validateRequestBody(CreateRFQSchema, body);
  } catch (error) {
    return createValidationErrorResponse(error as Error);
  }

  const {
    category,
    specifications,
    quantity,
    delivery_date: deliveryDate,
    payment_terms: paymentTerms,
    additional_requirements: additionalRequirements,
  } = validatedRequest;

  const prompt = `
Prepare a comprehensive RFQ (Request for Quotation) document:

Category: ${category}
Specifications: ${specifications}
Quantity: ${quantity}
Delivery Date: ${deliveryDate}
Payment Terms: ${paymentTerms || 'Standard'}
Additional Requirements: ${additionalRequirements || 'None'}

Create:
1. Professional RFQ introduction
2. Detailed specification requirements
3. Technical questions for suppliers
4. Commercial terms and conditions
5. Evaluation criteria
6. Submission requirements
7. Timeline
8. Contact information section

Return as structured JSON that can be used to generate the RFQ document.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  const rfqContent = JSON.parse(message.content[0].text);

  // Create RFQ record
  const { data: rfq } = await supabase
    .from('rfqs')
    .insert({
      enterprise_id: userData.enterprise_id,
      title: `RFQ - ${category}`,
      category,
      specifications,
      quantity,
      delivery_date: deliveryDate,
      payment_terms: paymentTerms,
      rfq_content: rfqContent,
      status: 'draft',
      created_by: userData.id,
    })
    .select()
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        rfq_id: rfq?.id,
        rfq_content: rfqContent,
      },
    }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Analyze and compare supplier quotes
 */
async function handleAnalyzeQuotes(req: Request, supabase: SupabaseClient, userData: any) {
  // Validate request body
  let validatedRequest;
  try {
    const body = await req.json();
    validatedRequest = validateRequestBody(QuoteAnalysisSchema, body);
  } catch (error) {
    return createValidationErrorResponse(error as Error);
  }

  const { rfqId, quotes } = validatedRequest;

  const prompt = `
Analyze and compare these supplier quotes:

${JSON.stringify(quotes, null, 2)}

Provide:
1. Comprehensive comparison matrix
2. Score each quote (0-100)
3. Identify best value (not just lowest price)
4. Highlight strengths and weaknesses of each
5. Risk assessment for each supplier
6. Recommendation with justification
7. Negotiation opportunities

Consider:
- Total cost of ownership (not just unit price)
- Quality indicators
- Delivery terms
- Payment terms
- Supplier reliability
- Risk factors

Return as JSON:
{
  "comparison_matrix": {"criteria": [{"name": "string", "weights": number, "scores": {}}]},
  "rankings": [{"vendor": "string", "total_score": number, "rank": number}],
  "best_value": {"vendor": "string", "reasoning": "string"},
  "analysis": {"vendor_name": {"strengths": [], "weaknesses": [], "risks": []}},
  "recommendation": "string",
  "negotiation_points": ["string"]
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  const analysis = JSON.parse(message.content[0].text);

  // Update RFQ with analysis
  if (rfqId) {
    await supabase
      .from('rfqs')
      .update({
        quote_analysis: analysis,
        status: 'evaluated',
      })
      .eq('id', rfqId);
  }

  // Create insight for top recommendation
  await supabase.from('agent_insights').insert({
    agent_id: await getAgentId(supabase, 'sourcing', userData.enterprise_id),
    insight_type: 'sourcing_recommendation',
    title: 'RFQ Analysis Complete',
    description: analysis.recommendation,
    severity: 'info',
    confidence_score: 0.85,
    enterprise_id: userData.enterprise_id,
    is_actionable: true,
  });

  return new Response(
    JSON.stringify({ success: true, data: analysis }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

// ==================== Helper Functions ====================

async function scoreVendorsAgainstRequirements(
  vendors: any[],
  requirements: any,
): Promise<any[]> {
  // Simple scoring logic - can be enhanced
  return vendors.map(vendor => ({
    ...vendor,
    match_score: calculateMatchScore(vendor, requirements),
  })).sort((a, b) => b.match_score - a.match_score);
}

function calculateMatchScore(vendor: any, requirements: any): number {
  let score = 50; // Base score

  // Category match
  if (vendor.categories?.includes(requirements.category)) {
    score += 25;
  }

  // Certification match
  if (requirements.certifications && vendor.certifications) {
    const certMatch = requirements.certifications.some((cert: string) =>
      vendor.certifications.includes(cert)
    );
    if (certMatch) score += 15;
  }

  // Performance score
  if (vendor.performance_score) {
    score += vendor.performance_score * 10;
  }

  return Math.min(100, score);
}

async function getAgentId(supabase: SupabaseClient, agentType: string, enterpriseId: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('enterprise_id', enterpriseId)
    .eq('is_active', true)
    .single();

  if (!data) {
    const { data: newAgent } = await supabase
      .from('agents')
      .insert({
        name: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`,
        type: agentType,
        enterprise_id: enterpriseId,
        is_active: true,
      })
      .select()
      .single();

    return newAgent?.id;
  }

  return data.id;
}
