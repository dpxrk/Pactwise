/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { validateRequest, z } from '../_shared/validation.ts';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const SearchTaxonomySchema = z.object({
  action: z.literal('search'),
  params: z.object({
    query: z.string().min(2).max(255),
    level: z.number().min(1).max(5).optional(),
    limit: z.number().min(1).max(50).default(10),
  }),
});

const GetTaxonomyPathSchema = z.object({
  action: z.literal('get_path'),
  params: z.object({
    code: z.string(),
  }),
});

const GetChildrenSchema = z.object({
  action: z.literal('get_children'),
  params: z.object({
    parent_code: z.string().optional(),
    level: z.number().min(1).max(5).default(1),
  }),
});

const MatchItemSchema = z.object({
  action: z.literal('match_item'),
  params: z.object({
    item_name: z.string().min(2).max(500),
    item_description: z.string().max(2000).optional(),
    context: z.object({
      vendor_category: z.string().optional(),
      contract_type: z.string().optional(),
      industry: z.string().optional(),
    }).optional(),
    limit: z.number().min(1).max(10).default(5),
    min_confidence: z.number().min(0).max(1).default(0.3),
  }),
});

const BulkMatchSchema = z.object({
  action: z.literal('bulk_match'),
  params: z.object({
    items: z.array(z.object({
      id: z.string().optional(),
      item_name: z.string(),
      item_description: z.string().optional(),
    })).min(1).max(100),
    min_confidence: z.number().min(0).max(1).default(0.3),
  }),
});

const GetAliasesSchema = z.object({
  action: z.literal('get_aliases'),
  params: z.object({
    taxonomy_code: z.string(),
  }),
});

const CreateAliasSchema = z.object({
  action: z.literal('create_alias'),
  params: z.object({
    taxonomy_code: z.string(),
    alias_name: z.string().min(2).max(255),
    alias_description: z.string().max(1000).optional(),
  }),
});

// Combined schema
const TaxonomyMatcherRequestSchema = z.discriminatedUnion('action', [
  SearchTaxonomySchema,
  GetTaxonomyPathSchema,
  GetChildrenSchema,
  MatchItemSchema,
  BulkMatchSchema,
  GetAliasesSchema,
  CreateAliasSchema,
]);

type TaxonomyMatcherRequest = z.infer<typeof TaxonomyMatcherRequestSchema>;

// ============================================================================
// MATCHING ALGORITHMS
// ============================================================================

interface TaxonomyMatch {
  code: string;
  name: string;
  description: string | null;
  level: number;
  confidence: number;
  match_method: 'exact' | 'synonym' | 'fuzzy' | 'embedding' | 'alias';
  path?: string;
}

/**
 * Match item to taxonomy using multiple strategies
 */
async function matchItemToTaxonomy(
  supabase: ReturnType<typeof createSupabaseClient>,
  itemName: string,
  itemDescription: string | undefined,
  enterpriseId: string,
  limit: number,
  minConfidence: number
): Promise<TaxonomyMatch[]> {
  const matches: TaxonomyMatch[] = [];
  const seenCodes = new Set<string>();

  // Normalize input
  const normalizedName = itemName.toLowerCase().trim();
  const normalizedDesc = itemDescription?.toLowerCase().trim() || '';
  const combinedText = `${normalizedName} ${normalizedDesc}`.trim();

  // 1. Check enterprise aliases first
  const { data: aliasMatches } = await supabase
    .from('taxonomy_aliases')
    .select(`
      taxonomy_code,
      alias_name,
      confidence,
      taxonomy:product_service_taxonomy!taxonomy_code (
        name,
        description,
        level
      )
    `)
    .eq('enterprise_id', enterpriseId)
    .ilike('alias_name', `%${normalizedName}%`)
    .limit(5);

  if (aliasMatches) {
    for (const alias of aliasMatches) {
      if (seenCodes.has(alias.taxonomy_code)) continue;
      seenCodes.add(alias.taxonomy_code);

      const taxonomy = alias.taxonomy as unknown as { name: string; description: string | null; level: number };
      const aliasConfidence = alias.alias_name.toLowerCase() === normalizedName
        ? 0.98 // Exact alias match
        : 0.85; // Partial alias match

      matches.push({
        code: alias.taxonomy_code,
        name: taxonomy?.name || alias.alias_name,
        description: taxonomy?.description || null,
        level: taxonomy?.level || 0,
        confidence: aliasConfidence * (alias.confidence || 1),
        match_method: 'alias',
      });
    }
  }

  // 2. Full-text search
  const { data: ftsMatches } = await supabase.rpc('search_taxonomy', {
    p_query: combinedText,
    p_level: null,
    p_limit: limit,
  });

  if (ftsMatches) {
    for (const match of ftsMatches) {
      const m = match as { code: string; name: string; description: string | null; level: number; relevance: number };
      if (seenCodes.has(m.code)) continue;
      seenCodes.add(m.code);

      // Determine match method based on relevance
      let matchMethod: TaxonomyMatch['match_method'] = 'fuzzy';
      let confidence = Math.min(0.95, m.relevance);

      if (m.name.toLowerCase() === normalizedName) {
        matchMethod = 'exact';
        confidence = 0.98;
      } else if (m.name.toLowerCase().includes(normalizedName) || normalizedName.includes(m.name.toLowerCase())) {
        matchMethod = 'fuzzy';
        confidence = Math.min(0.9, m.relevance + 0.1);
      }

      matches.push({
        code: m.code,
        name: m.name,
        description: m.description,
        level: m.level,
        confidence,
        match_method: matchMethod,
      });
    }
  }

  // 3. Synonym matching (check against taxonomy synonyms array)
  const { data: synonymMatches } = await supabase
    .from('product_service_taxonomy')
    .select('code, name, description, level, synonyms')
    .eq('is_active', true)
    .contains('synonyms', [normalizedName])
    .limit(5);

  if (synonymMatches) {
    for (const match of synonymMatches) {
      if (seenCodes.has(match.code)) continue;
      seenCodes.add(match.code);

      matches.push({
        code: match.code,
        name: match.name,
        description: match.description,
        level: match.level,
        confidence: 0.92,
        match_method: 'synonym',
      });
    }
  }

  // 4. Keyword-based matching (fallback)
  if (matches.length < limit) {
    const keywords = normalizedName.split(/\s+/).filter(w => w.length > 2);

    if (keywords.length > 0) {
      const { data: keywordMatches } = await supabase
        .from('product_service_taxonomy')
        .select('code, name, description, level, keywords')
        .eq('is_active', true)
        .overlaps('keywords', keywords)
        .limit(limit - matches.length);

      if (keywordMatches) {
        for (const match of keywordMatches) {
          if (seenCodes.has(match.code)) continue;
          seenCodes.add(match.code);

          // Calculate confidence based on keyword overlap
          const taxonomyKeywords = new Set((match.keywords || []).map((k: string) => k.toLowerCase()));
          const overlap = keywords.filter(k => taxonomyKeywords.has(k)).length;
          const confidence = Math.min(0.7, (overlap / keywords.length) * 0.7);

          if (confidence >= minConfidence) {
            matches.push({
              code: match.code,
              name: match.name,
              description: match.description,
              level: match.level,
              confidence,
              match_method: 'fuzzy',
            });
          }
        }
      }
    }
  }

  // Sort by confidence and limit
  return matches
    .filter(m => m.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

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
    const { data: userProfile } = await supabase
      .from('users')
      .select('enterprise_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.enterprise_id) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Parse and validate request
    const body = await req.json();
    const validation = validateRequest(TaxonomyMatcherRequestSchema, body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Validation error', details: validation.error }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const request = validation.data as TaxonomyMatcherRequest;
    let result: unknown;

    switch (request.action) {
      case 'search':
        const { data: searchResults } = await supabase.rpc('search_taxonomy', {
          p_query: request.params.query,
          p_level: request.params.level || null,
          p_limit: request.params.limit,
        });
        result = { matches: searchResults || [] };
        break;

      case 'get_path':
        const { data: pathResults } = await supabase.rpc('get_taxonomy_path', {
          p_code: request.params.code,
        });
        result = { path: pathResults || [] };
        break;

      case 'get_children':
        let childQuery = supabase
          .from('product_service_taxonomy')
          .select('code, name, description, level, parent_code')
          .eq('is_active', true)
          .order('name');

        if (request.params.parent_code) {
          childQuery = childQuery.eq('parent_code', request.params.parent_code);
        } else {
          childQuery = childQuery.eq('level', request.params.level);
        }

        const { data: children } = await childQuery;
        result = { children: children || [] };
        break;

      case 'match_item':
        const matches = await matchItemToTaxonomy(
          supabase,
          request.params.item_name,
          request.params.item_description,
          userProfile.enterprise_id,
          request.params.limit,
          request.params.min_confidence
        );

        // Add taxonomy paths
        for (const match of matches) {
          const { data: path } = await supabase.rpc('get_taxonomy_path', { p_code: match.code });
          if (path) {
            match.path = path.map((p: { name: string }) => p.name).join(' > ');
          }
        }

        result = {
          matches,
          best_match: matches[0] || null,
          needs_review: matches.length === 0 || (matches[0]?.confidence || 0) < 0.5,
        };
        break;

      case 'bulk_match':
        const bulkResults: Array<{
          id?: string;
          item_name: string;
          matches: TaxonomyMatch[];
          best_match: TaxonomyMatch | null;
          needs_review: boolean;
        }> = [];

        for (const item of request.params.items) {
          const itemMatches = await matchItemToTaxonomy(
            supabase,
            item.item_name,
            item.item_description,
            userProfile.enterprise_id,
            3, // Limit per item in bulk
            request.params.min_confidence
          );

          bulkResults.push({
            id: item.id,
            item_name: item.item_name,
            matches: itemMatches,
            best_match: itemMatches[0] || null,
            needs_review: itemMatches.length === 0 || (itemMatches[0]?.confidence || 0) < 0.5,
          });
        }

        result = {
          results: bulkResults,
          summary: {
            total: bulkResults.length,
            matched: bulkResults.filter(r => r.best_match !== null).length,
            needs_review: bulkResults.filter(r => r.needs_review).length,
            avg_confidence: bulkResults.reduce((sum, r) => sum + (r.best_match?.confidence || 0), 0) / bulkResults.length,
          },
        };
        break;

      case 'get_aliases':
        const { data: aliases } = await supabase
          .from('taxonomy_aliases')
          .select('*')
          .eq('enterprise_id', userProfile.enterprise_id)
          .eq('taxonomy_code', request.params.taxonomy_code)
          .order('usage_count', { ascending: false });

        result = { aliases: aliases || [] };
        break;

      case 'create_alias':
        // Verify taxonomy code exists
        const { data: taxonomyExists } = await supabase
          .from('product_service_taxonomy')
          .select('code')
          .eq('code', request.params.taxonomy_code)
          .single();

        if (!taxonomyExists) {
          return new Response(JSON.stringify({ error: 'Invalid taxonomy code' }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const { data: newAlias, error: aliasError } = await supabase
          .from('taxonomy_aliases')
          .insert({
            enterprise_id: userProfile.enterprise_id,
            taxonomy_code: request.params.taxonomy_code,
            alias_name: request.params.alias_name,
            alias_description: request.params.alias_description,
            source: 'manual',
            confidence: 1.0,
          })
          .select()
          .single();

        if (aliasError) {
          if (aliasError.code === '23505') {
            return new Response(JSON.stringify({ error: 'Alias already exists' }), {
              headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
              status: 409,
            });
          }
          throw aliasError;
        }

        result = { alias: newAlias };
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
    console.error('[Taxonomy Matcher] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
