import { withMiddleware } from '../_shared/middleware.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Validation schemas
const calculateTariffSchema = z.object({
  hts_code: z.string().min(4).max(15),
  origin_country: z.string().length(2).or(z.string().length(3)),
  value: z.number().positive(),
  is_usmca_qualifying: z.boolean().optional().default(false),
});

const batchCalculateSchema = z.object({
  items: z.array(calculateTariffSchema).min(1).max(100),
});

const lineItemTariffSchema = z.object({
  line_item_id: z.string().uuid(),
});

const contractTariffSchema = z.object({
  contract_id: z.string().uuid(),
});

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // POST /tariff-calculation - Calculate tariff for a single item
    if (method === 'POST' && pathname === '/tariff-calculation') {
      const body = await req.json();
      const validatedData = calculateTariffSchema.parse(body);

      // Use cached calculation function
      const { data, error } = await supabase.rpc('get_or_calculate_tariff', {
        p_enterprise_id: profile.enterprise_id,
        p_hts_code: validatedData.hts_code,
        p_origin_country: validatedData.origin_country,
        p_is_usmca_qualifying: validatedData.is_usmca_qualifying,
      });

      if (error) {
        throw error;
      }

      // Calculate cost based on value
      const totalRate = data?.total_rate || 0;
      const tariffCost = Math.round(validatedData.value * (totalRate / 100) * 100) / 100;

      return createSuccessResponse({
        ...data,
        value: validatedData.value,
        tariff_cost: tariffCost,
      }, undefined, 200, req);
    }

    // POST /tariff-calculation/batch - Calculate tariffs for multiple items
    if (method === 'POST' && pathname === '/tariff-calculation/batch') {
      const body = await req.json();
      const validatedData = batchCalculateSchema.parse(body);

      const results = [];
      let totalTariffCost = 0;

      for (const item of validatedData.items) {
        const { data, error } = await supabase.rpc('get_or_calculate_tariff', {
          p_enterprise_id: profile.enterprise_id,
          p_hts_code: item.hts_code,
          p_origin_country: item.origin_country,
          p_is_usmca_qualifying: item.is_usmca_qualifying,
        });

        if (error) {
          results.push({
            hts_code: item.hts_code,
            origin_country: item.origin_country,
            error: error.message,
          });
          continue;
        }

        const totalRate = data?.total_rate || 0;
        const tariffCost = Math.round(item.value * (totalRate / 100) * 100) / 100;
        totalTariffCost += tariffCost;

        results.push({
          ...data,
          value: item.value,
          tariff_cost: tariffCost,
        });
      }

      return createSuccessResponse({
        items: results,
        summary: {
          total_items: validatedData.items.length,
          calculated_items: results.filter(r => !r.error).length,
          total_value: validatedData.items.reduce((sum, item) => sum + item.value, 0),
          total_tariff_cost: totalTariffCost,
        },
      }, undefined, 200, req);
    }

    // POST /tariff-calculation/line-item/:id - Calculate tariff for a contract line item
    if (method === 'POST' && pathname.match(/^\/tariff-calculation\/line-item\/[a-f0-9-]+$/)) {
      const lineItemId = pathname.split('/')[3];

      // Validate access to line item
      const { data: lineItem, error: lineItemError } = await supabase
        .from('contract_line_items')
        .select('*')
        .eq('id', lineItemId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (lineItemError || !lineItem) {
        return createErrorResponseSync('Line item not found', 404, req);
      }

      if (!lineItem.hts_code || !lineItem.origin_country) {
        return createErrorResponseSync(
          'Line item missing HTS code or origin country',
          400,
          req
        );
      }

      // Calculate tariff using database function
      const { data, error } = await supabase.rpc('calculate_line_item_tariff', {
        p_line_item_id: lineItemId,
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /tariff-calculation/contract/:id - Recalculate all tariffs for a contract
    if (method === 'POST' && pathname.match(/^\/tariff-calculation\/contract\/[a-f0-9-]+$/)) {
      const contractId = pathname.split('/')[3];

      // Validate access to contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (contractError || !contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Recalculate all tariffs for the contract
      const { data, error } = await supabase.rpc('recalculate_contract_tariffs', {
        p_contract_id: contractId,
      });

      if (error) {
        throw error;
      }

      // Also update the contract-level summary
      await supabase.rpc('calculate_contract_tariff_totals', {
        p_contract_id: contractId,
      });

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /tariff-calculation/contract/:id/summary - Get tariff summary for a contract
    if (method === 'GET' && pathname.match(/^\/tariff-calculation\/contract\/[a-f0-9-]+\/summary$/)) {
      const contractId = pathname.split('/')[3];

      // Validate access to contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, value, total_tariff_exposure, tariff_by_country, tariff_risk_level, tariff_last_calculated')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (contractError || !contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Get detailed breakdown by country
      const { data: countryBreakdown } = await supabase.rpc('get_contract_tariff_by_country', {
        p_contract_id: contractId,
      });

      return createSuccessResponse({
        contract_id: contractId,
        contract_value: contract.value,
        total_tariff_exposure: contract.total_tariff_exposure,
        tariff_percentage: contract.value > 0
          ? Math.round((contract.total_tariff_exposure / contract.value) * 10000) / 100
          : 0,
        tariff_risk_level: contract.tariff_risk_level,
        tariff_by_country: contract.tariff_by_country,
        country_breakdown: countryBreakdown,
        last_calculated: contract.tariff_last_calculated,
      }, undefined, 200, req);
    }

    // GET /tariff-calculation/enterprise/summary - Get enterprise-wide tariff summary
    if (method === 'GET' && pathname === '/tariff-calculation/enterprise/summary') {
      const { data, error } = await supabase.rpc('get_enterprise_tariff_summary', {
        p_enterprise_id: profile.enterprise_id,
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /tariff-calculation/enterprise/top-contracts - Get top tariff exposure contracts
    if (method === 'GET' && pathname === '/tariff-calculation/enterprise/top-contracts') {
      const limit = parseInt(url.searchParams.get('limit') || '10');

      const { data, error } = await supabase.rpc('get_top_tariff_contracts', {
        p_enterprise_id: profile.enterprise_id,
        p_limit: Math.min(limit, 50),
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse({ data }, undefined, 200, req);
    }

    // GET /tariff-calculation/enterprise/by-country - Get tariff breakdown by country
    if (method === 'GET' && pathname === '/tariff-calculation/enterprise/by-country') {
      const { data, error } = await supabase.rpc('get_enterprise_tariff_by_country', {
        p_enterprise_id: profile.enterprise_id,
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse({ data }, undefined, 200, req);
    }

    // GET /tariff-calculation/countries - Get list of countries with tariff rules
    if (method === 'GET' && pathname === '/tariff-calculation/countries') {
      const { data, error } = await supabase
        .from('country_tariff_rules')
        .select('country_code, country_name, base_additional_rate, is_usmca_country, has_fta, fta_name')
        .neq('country_code', 'DEFAULT')
        .order('country_name');

      if (error) {
        throw error;
      }

      return createSuccessResponse({ data }, undefined, 200, req);
    }

    // GET /tariff-calculation/hts-codes/search - Search HTS codes
    if (method === 'GET' && pathname === '/tariff-calculation/hts-codes/search') {
      const query = url.searchParams.get('q') || '';
      const limit = parseInt(url.searchParams.get('limit') || '20');

      if (query.length < 2) {
        return createErrorResponseSync('Query must be at least 2 characters', 400, req);
      }

      const { data, error } = await supabase.rpc('search_hts_codes_by_text', {
        p_query: query,
        p_limit: Math.min(limit, 50),
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse({ data }, undefined, 200, req);
    }

    // GET /tariff-calculation/hts-codes/:code - Get details for a specific HTS code
    if (method === 'GET' && pathname.match(/^\/tariff-calculation\/hts-codes\/[\d.]+$/)) {
      const htsCode = pathname.split('/')[3];

      const { data, error } = await supabase
        .from('hts_codes')
        .select('*')
        .eq('code', htsCode)
        .single();

      if (error || !data) {
        return createErrorResponseSync('HTS code not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    return createErrorResponseSync('Method not allowed', 405, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'tariffs', action: 'access' },
  },
  'tariff-calculation',
);
