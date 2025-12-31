import { withMiddleware } from '../_shared/middleware.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Validation schemas
const htsSuggestionSchema = z.object({
  item_name: z.string().min(2).max(500),
  item_description: z.string().optional(),
  material: z.string().optional(),
  origin_country: z.string().optional(),
  taxonomy_code: z.string().optional(),
});

const htsVerifySchema = z.object({
  hts_code: z.string().min(4).max(15),
  item_name: z.string().min(2).max(500),
  material: z.string().optional(),
});

const htsBatchSchema = z.object({
  items: z.array(htsSuggestionSchema).min(1).max(20),
});

// System prompts for AI classification
const HTS_LOOKUP_SYSTEM_PROMPT = `You are an expert in US Harmonized Tariff Schedule (HTS) classification.

Your task is to determine the correct HTS code for imported products based on their description.

Key principles:
1. Use the General Rules of Interpretation (GRI) for classification
2. Consider the material composition, use, and specific features
3. For composite goods, classify by the component giving essential character
4. When multiple codes could apply, explain the reasoning

Return your response as valid JSON only (no markdown, no code blocks):
{
  "primary_hts_code": "8471.30.0100",
  "primary_description": "Portable automatic data processing machines, weighing not more than 10 kg",
  "confidence": 0.85,
  "reasoning": "Classification reasoning here",
  "alternative_codes": [
    {"hts_code": "8471.41.0150", "description": "Alternative description", "confidence": 0.7}
  ],
  "classification_notes": ["Note 1", "Note 2"]
}

Always use 10-digit HTS codes when possible (e.g., 8471.30.0100).
If uncertain, provide alternatives with lower confidence scores.`;

const HTS_VERIFICATION_SYSTEM_PROMPT = `You are an expert in US Harmonized Tariff Schedule (HTS) classification verification.

Your task is to verify whether an HTS code classification is correct for a given product.

Analyze:
1. Does the product description match the HTS code description?
2. Are there more specific codes that should be used?
3. Are there any common misclassification issues for this product type?

Return your response as valid JSON only (no markdown, no code blocks):
{
  "is_correct": true,
  "confidence": 0.90,
  "current_code": "7318.15.2000",
  "issues": [],
  "recommended_code": null,
  "recommended_description": null,
  "recommendation_reason": null
}`;

interface HTSSuggestionResult {
  success: boolean;
  primary_code: string | null;
  primary_description: string | null;
  confidence: number;
  reasoning: string | null;
  alternative_codes: Array<{ hts_code: string; description: string; confidence: number }>;
  classification_notes: string[];
  fallback_used: boolean;
  error?: string;
}

interface HTSVerifyResult {
  success: boolean;
  is_correct: boolean;
  confidence: number;
  issues: string[];
  recommended_code: string | null;
  recommended_description: string | null;
  recommendation_reason: string | null;
  error?: string;
}

// Call OpenAI for classification (Pactwise uses OpenAI)
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    return null;
  }
}

// Semantic search fallback using database
async function semanticSearchFallback(
  supabase: ReturnType<typeof createAdminClient>,
  itemName: string,
  itemDescription?: string
): Promise<HTSSuggestionResult> {
  const query = itemDescription ? `${itemName} ${itemDescription}` : itemName;

  // Use text search function
  const { data, error } = await supabase.rpc('search_hts_codes_by_text', {
    p_query: query,
    p_limit: 5,
  });

  if (error || !data || data.length === 0) {
    return {
      success: false,
      primary_code: null,
      primary_description: null,
      confidence: 0,
      reasoning: null,
      alternative_codes: [],
      classification_notes: ['No matching HTS codes found in database'],
      fallback_used: true,
      error: 'No matching HTS codes found',
    };
  }

  const primary = data[0];
  const alternatives = data.slice(1).map((item: { code: string; description: string }) => ({
    hts_code: item.code,
    description: item.description,
    confidence: 0.5,
  }));

  return {
    success: true,
    primary_code: primary.code,
    primary_description: primary.description,
    confidence: 0.6, // Lower confidence for text search
    reasoning: 'Found via database text search - recommend manual verification',
    alternative_codes: alternatives,
    classification_notes: ['Classified via database search', 'Manual verification recommended'],
    fallback_used: true,
  };
}

// Lookup HTS code using AI
async function lookupHTSCode(
  supabase: ReturnType<typeof createAdminClient>,
  itemName: string,
  itemDescription?: string,
  material?: string,
  originCountry?: string
): Promise<HTSSuggestionResult> {
  // Build prompt
  const promptParts = [`Product: ${itemName}`];
  if (itemDescription) promptParts.push(`Description: ${itemDescription}`);
  if (material) promptParts.push(`Material/Composition: ${material}`);
  if (originCountry) promptParts.push(`Country of Origin: ${originCountry}`);
  promptParts.push('\nPlease determine the correct HTS classification for this product.');

  const userPrompt = promptParts.join('\n');

  // Try AI first
  const aiResponse = await callOpenAI(HTS_LOOKUP_SYSTEM_PROMPT, userPrompt);

  if (aiResponse) {
    try {
      const data = JSON.parse(aiResponse);
      return {
        success: true,
        primary_code: data.primary_hts_code,
        primary_description: data.primary_description,
        confidence: data.confidence || 0.8,
        reasoning: data.reasoning,
        alternative_codes: data.alternative_codes || [],
        classification_notes: data.classification_notes || [],
        fallback_used: false,
      };
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
  }

  // Fallback to database search
  return await semanticSearchFallback(supabase, itemName, itemDescription);
}

// Verify HTS code using AI
async function verifyHTSCode(
  htsCode: string,
  itemName: string,
  material?: string
): Promise<HTSVerifyResult> {
  const promptParts = [
    `HTS Code to verify: ${htsCode}`,
    `Product Description: ${itemName}`,
  ];
  if (material) promptParts.push(`Material: ${material}`);
  promptParts.push('\nPlease verify if this HTS classification is correct.');

  const userPrompt = promptParts.join('\n');

  const aiResponse = await callOpenAI(HTS_VERIFICATION_SYSTEM_PROMPT, userPrompt);

  if (!aiResponse) {
    return {
      success: false,
      is_correct: false,
      confidence: 0,
      issues: [],
      recommended_code: null,
      recommended_description: null,
      recommendation_reason: null,
      error: 'AI verification not available',
    };
  }

  try {
    const data = JSON.parse(aiResponse);
    return {
      success: true,
      is_correct: data.is_correct || false,
      confidence: data.confidence || 0.8,
      issues: data.issues || [],
      recommended_code: data.recommended_code,
      recommended_description: data.recommended_description,
      recommendation_reason: data.recommendation_reason,
    };
  } catch (e) {
    console.error('Failed to parse verification response:', e);
    return {
      success: false,
      is_correct: false,
      confidence: 0,
      issues: [],
      recommended_code: null,
      recommended_description: null,
      recommendation_reason: null,
      error: 'Failed to parse AI response',
    };
  }
}

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // POST /hts-suggestion - Get HTS code suggestion for an item
    if (method === 'POST' && pathname === '/hts-suggestion') {
      const body = await req.json();
      const validatedData = htsSuggestionSchema.parse(body);

      const result = await lookupHTSCode(
        supabase,
        validatedData.item_name,
        validatedData.item_description,
        validatedData.material,
        validatedData.origin_country
      );

      return createSuccessResponse(result, undefined, 200, req);
    }

    // POST /hts-suggestion/verify - Verify an HTS code classification
    if (method === 'POST' && pathname === '/hts-suggestion/verify') {
      const body = await req.json();
      const validatedData = htsVerifySchema.parse(body);

      const result = await verifyHTSCode(
        validatedData.hts_code,
        validatedData.item_name,
        validatedData.material
      );

      return createSuccessResponse(result, undefined, 200, req);
    }

    // POST /hts-suggestion/batch - Get HTS suggestions for multiple items
    if (method === 'POST' && pathname === '/hts-suggestion/batch') {
      const body = await req.json();
      const validatedData = htsBatchSchema.parse(body);

      const results = [];
      for (const item of validatedData.items) {
        const result = await lookupHTSCode(
          supabase,
          item.item_name,
          item.item_description,
          item.material,
          item.origin_country
        );
        results.push({
          item_name: item.item_name,
          ...result,
        });
      }

      const successCount = results.filter(r => r.success).length;
      const aiCount = results.filter(r => r.success && !r.fallback_used).length;

      return createSuccessResponse({
        results,
        summary: {
          total: results.length,
          successful: successCount,
          ai_classified: aiCount,
          fallback_classified: successCount - aiCount,
        },
      }, undefined, 200, req);
    }

    // POST /hts-suggestion/line-item/:id - Suggest HTS for a contract line item
    if (method === 'POST' && pathname.match(/^\/hts-suggestion\/line-item\/[a-f0-9-]+$/)) {
      const lineItemId = pathname.split('/')[3];

      // Get line item
      const { data: lineItem, error: lineItemError } = await supabase
        .from('contract_line_items')
        .select('id, item_name, item_description, sku, taxonomy_code, origin_country')
        .eq('id', lineItemId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (lineItemError || !lineItem) {
        return createErrorResponseSync('Line item not found', 404, req);
      }

      // Get HTS suggestion
      const result = await lookupHTSCode(
        supabase,
        lineItem.item_name,
        lineItem.item_description || undefined,
        undefined, // material not available
        lineItem.origin_country || undefined
      );

      if (result.success && result.primary_code) {
        // Optionally update the line item with suggestion
        const updateData = url.searchParams.get('apply') === 'true';
        if (updateData) {
          await supabase
            .from('contract_line_items')
            .update({
              hts_code: result.primary_code,
              hts_description: result.primary_description,
              hts_confidence: result.confidence,
              hts_match_method: result.fallback_used ? 'auto_matched' : 'ai_suggested',
              updated_at: new Date().toISOString(),
            })
            .eq('id', lineItemId);
        }
      }

      return createSuccessResponse({
        line_item_id: lineItemId,
        item_name: lineItem.item_name,
        ...result,
      }, undefined, 200, req);
    }

    // POST /hts-suggestion/contract/:id - Suggest HTS for all line items in a contract
    if (method === 'POST' && pathname.match(/^\/hts-suggestion\/contract\/[a-f0-9-]+$/)) {
      const contractId = pathname.split('/')[3];
      const applyUpdates = url.searchParams.get('apply') === 'true';

      // Validate contract access
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (contractError || !contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Get line items without HTS codes
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('contract_line_items')
        .select('id, item_name, item_description, origin_country')
        .eq('contract_id', contractId)
        .is('hts_code', null);

      if (lineItemsError) {
        throw lineItemsError;
      }

      if (!lineItems || lineItems.length === 0) {
        return createSuccessResponse({
          message: 'No line items require HTS classification',
          items_processed: 0,
        }, undefined, 200, req);
      }

      const results = [];
      for (const item of lineItems) {
        const result = await lookupHTSCode(
          supabase,
          item.item_name,
          item.item_description || undefined,
          undefined,
          item.origin_country || undefined
        );

        if (result.success && result.primary_code && applyUpdates) {
          await supabase
            .from('contract_line_items')
            .update({
              hts_code: result.primary_code,
              hts_description: result.primary_description,
              hts_confidence: result.confidence,
              hts_match_method: result.fallback_used ? 'auto_matched' : 'ai_suggested',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }

        results.push({
          line_item_id: item.id,
          item_name: item.item_name,
          ...result,
        });
      }

      const successCount = results.filter(r => r.success).length;

      return createSuccessResponse({
        contract_id: contractId,
        results,
        summary: {
          total_items: lineItems.length,
          classified: successCount,
          updates_applied: applyUpdates,
        },
      }, undefined, 200, req);
    }

    // GET /hts-suggestion/status - Check if AI classification is available
    if (method === 'GET' && pathname === '/hts-suggestion/status') {
      const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');

      return createSuccessResponse({
        ai_enabled: hasOpenAI,
        fallback_available: true,
        provider: hasOpenAI ? 'openai' : 'database_only',
      }, undefined, 200, req);
    }

    return createErrorResponseSync('Method not allowed', 405, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'tariffs', action: 'access' },
  },
  'hts-suggestion',
);
