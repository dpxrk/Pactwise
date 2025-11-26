/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  generateCsvWithColumns,
  createCsvResponse,
  CONTRACT_COLUMNS,
  VENDOR_COLUMNS,
  BUDGET_COLUMNS,
  CsvColumn,
} from '../_shared/csv-export.ts';
import { parseDate, getDateRange, formatISODate } from '../_shared/date-utils.ts';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type ExportFormat = 'csv' | 'json';
type EntityType = 'contracts' | 'vendors' | 'budgets';

interface ExportJob {
  id: string;
  entity_type: EntityType;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: Record<string, unknown>;
  total_records: number;
  file_url?: string;
  error?: string;
  created_at: string;
  completed_at?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const exportRequestSchema = z.object({
  entity_type: z.enum(['contracts', 'vendors', 'budgets']),
  format: z.enum(['csv', 'json']).optional().default('csv'),
  filters: z.object({
    status: z.string().optional(),
    date_range: z.string().optional(), // 'this_month', 'last_30_days', etc.
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    vendor_id: z.string().uuid().optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    include_archived: z.boolean().optional().default(false),
    include_deleted: z.boolean().optional().default(false),
  }).optional().default({}),
  columns: z.array(z.string()).optional(),
});

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

function getColumnsForEntity(entityType: EntityType, requestedColumns?: string[]): CsvColumn[] {
  const allColumns: Record<EntityType, CsvColumn[]> = {
    contracts: CONTRACT_COLUMNS,
    vendors: VENDOR_COLUMNS,
    budgets: BUDGET_COLUMNS,
  };

  const columns = allColumns[entityType];

  if (!requestedColumns || requestedColumns.length === 0) {
    return columns;
  }

  // Filter to only requested columns
  return columns.filter(col => requestedColumns.includes(col.key) || requestedColumns.includes(col.header));
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchContractsForExport(
  supabase: ReturnType<typeof createAdminClient>,
  enterpriseId: string,
  filters: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from('contracts')
    .select(`
      *,
      vendor:vendors(id, name, category),
      owner:users!owner_id(id, full_name, email)
    `)
    .eq('enterprise_id', enterpriseId);

  // Apply filters
  if (!filters.include_deleted) {
    query = query.is('deleted_at', null);
  }

  if (!filters.include_archived) {
    query = query.is('archived_at', null);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.vendor_id) {
    query = query.eq('vendor_id', filters.vendor_id);
  }

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  // Handle date range
  if (filters.date_range) {
    const range = getDateRange(filters.date_range as string);
    query = query
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());
  } else {
    if (filters.start_date) {
      const startDate = parseDate(filters.start_date as string);
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    if (filters.end_date) {
      const endDate = parseDate(filters.end_date as string);
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }
    }
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

async function fetchVendorsForExport(
  supabase: ReturnType<typeof createAdminClient>,
  enterpriseId: string,
  filters: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from('vendors')
    .select('*')
    .eq('enterprise_id', enterpriseId);

  // Apply filters
  if (!filters.include_deleted) {
    query = query.is('deleted_at', null);
  }

  if (!filters.include_archived) {
    query = query.is('archived_at', null);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  // Handle date range
  if (filters.date_range) {
    const range = getDateRange(filters.date_range as string);
    query = query
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());
  } else {
    if (filters.start_date) {
      const startDate = parseDate(filters.start_date as string);
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    if (filters.end_date) {
      const endDate = parseDate(filters.end_date as string);
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }
    }
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

async function fetchBudgetsForExport(
  supabase: ReturnType<typeof createAdminClient>,
  enterpriseId: string,
  filters: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from('budgets')
    .select(`
      *,
      owner:users!owner_id(id, full_name, email)
    `)
    .eq('enterprise_id', enterpriseId);

  // Apply filters
  if (!filters.include_deleted) {
    query = query.is('deleted_at', null);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  // Handle date range
  if (filters.date_range) {
    const range = getDateRange(filters.date_range as string);
    query = query
      .gte('start_date', range.start.toISOString())
      .lte('end_date', range.end.toISOString());
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

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
    // POST /exports - Create and download export
    // ========================================================================
    if (method === 'POST' && pathname === '/exports') {
      const body = await req.json();
      const { entity_type, format, filters, columns } = validateRequest(exportRequestSchema, body);

      // Sanitize search filter
      if (filters.search) {
        filters.search = sanitizeInput.searchQuery(filters.search);
      }

      // Fetch data based on entity type
      let data: Record<string, unknown>[];

      switch (entity_type) {
        case 'contracts':
          data = await fetchContractsForExport(supabase, profile.enterprise_id, filters);
          break;
        case 'vendors':
          data = await fetchVendorsForExport(supabase, profile.enterprise_id, filters);
          break;
        case 'budgets':
          data = await fetchBudgetsForExport(supabase, profile.enterprise_id, filters);
          break;
        default:
          return createErrorResponseSync('Invalid entity type', 400, req);
      }

      if (data.length === 0) {
        return createErrorResponseSync('No data to export', 404, req);
      }

      // Check export limit
      const MAX_EXPORT_RECORDS = 10000;
      if (data.length > MAX_EXPORT_RECORDS) {
        return createErrorResponseSync(
          `Export limit exceeded. Maximum ${MAX_EXPORT_RECORDS} records allowed. Found ${data.length} records. Please apply more filters.`,
          400,
          req,
        );
      }

      // Generate export based on format
      const timestamp = formatISODate(new Date());
      const filename = `${entity_type}_export_${timestamp}`;

      if (format === 'json') {
        // Return JSON export
        return new Response(JSON.stringify(data, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`,
            'Cache-Control': 'no-cache',
            ...getCorsHeaders(req),
          },
        });
      }

      // Generate CSV export
      const exportColumns = getColumnsForEntity(entity_type, columns);
      const csvContent = generateCsvWithColumns(data, exportColumns);

      return createCsvResponse(csvContent, `${filename}.csv`, getCorsHeaders(req));
    }

    // ========================================================================
    // GET /exports/preview - Preview export data (first 10 records)
    // ========================================================================
    if (method === 'GET' && pathname === '/exports/preview') {
      const params = Object.fromEntries(url.searchParams);
      const entityType = params.entity_type as EntityType;

      if (!entityType || !['contracts', 'vendors', 'budgets'].includes(entityType)) {
        return createErrorResponseSync('Invalid entity_type parameter', 400, req);
      }

      const filters = {
        status: params.status,
        date_range: params.date_range,
        search: params.search ? sanitizeInput.searchQuery(params.search) : undefined,
        include_archived: params.include_archived === 'true',
        include_deleted: false,
      };

      // Fetch limited data for preview
      let data: Record<string, unknown>[];
      let totalCount = 0;

      switch (entityType) {
        case 'contracts': {
          const allData = await fetchContractsForExport(supabase, profile.enterprise_id, filters);
          totalCount = allData.length;
          data = allData.slice(0, 10);
          break;
        }
        case 'vendors': {
          const allData = await fetchVendorsForExport(supabase, profile.enterprise_id, filters);
          totalCount = allData.length;
          data = allData.slice(0, 10);
          break;
        }
        case 'budgets': {
          const allData = await fetchBudgetsForExport(supabase, profile.enterprise_id, filters);
          totalCount = allData.length;
          data = allData.slice(0, 10);
          break;
        }
        default:
          return createErrorResponseSync('Invalid entity type', 400, req);
      }

      const columns = getColumnsForEntity(entityType);

      return createSuccessResponse({
        entity_type: entityType,
        total_records: totalCount,
        preview_count: data.length,
        available_columns: columns.map(c => ({ key: c.key, header: c.header })),
        preview_data: data,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /exports/columns - Get available columns for entity type
    // ========================================================================
    if (method === 'GET' && pathname === '/exports/columns') {
      const entityType = url.searchParams.get('entity_type') as EntityType;

      if (!entityType || !['contracts', 'vendors', 'budgets'].includes(entityType)) {
        return createErrorResponseSync('Invalid entity_type parameter', 400, req);
      }

      const columns = getColumnsForEntity(entityType);

      return createSuccessResponse({
        entity_type: entityType,
        columns: columns.map(c => ({
          key: c.key,
          header: c.header,
          description: getColumnDescription(entityType, c.key),
        })),
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /exports/contracts - Quick export contracts
    // ========================================================================
    if (method === 'POST' && pathname === '/exports/contracts') {
      const body = await req.json();
      const format = body.format || 'csv';
      const filters = body.filters || {};

      if (filters.search) {
        filters.search = sanitizeInput.searchQuery(filters.search);
      }

      const data = await fetchContractsForExport(supabase, profile.enterprise_id, filters);

      if (data.length === 0) {
        return createErrorResponseSync('No contracts to export', 404, req);
      }

      const timestamp = formatISODate(new Date());
      const filename = `contracts_export_${timestamp}`;

      if (format === 'json') {
        return new Response(JSON.stringify(data, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`,
            ...getCorsHeaders(req),
          },
        });
      }

      const csvContent = generateCsvWithColumns(data, CONTRACT_COLUMNS);
      return createCsvResponse(csvContent, `${filename}.csv`, getCorsHeaders(req));
    }

    // ========================================================================
    // POST /exports/vendors - Quick export vendors
    // ========================================================================
    if (method === 'POST' && pathname === '/exports/vendors') {
      const body = await req.json();
      const format = body.format || 'csv';
      const filters = body.filters || {};

      if (filters.search) {
        filters.search = sanitizeInput.searchQuery(filters.search);
      }

      const data = await fetchVendorsForExport(supabase, profile.enterprise_id, filters);

      if (data.length === 0) {
        return createErrorResponseSync('No vendors to export', 404, req);
      }

      const timestamp = formatISODate(new Date());
      const filename = `vendors_export_${timestamp}`;

      if (format === 'json') {
        return new Response(JSON.stringify(data, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`,
            ...getCorsHeaders(req),
          },
        });
      }

      const csvContent = generateCsvWithColumns(data, VENDOR_COLUMNS);
      return createCsvResponse(csvContent, `${filename}.csv`, getCorsHeaders(req));
    }

    // ========================================================================
    // POST /exports/budgets - Quick export budgets
    // ========================================================================
    if (method === 'POST' && pathname === '/exports/budgets') {
      const body = await req.json();
      const format = body.format || 'csv';
      const filters = body.filters || {};

      if (filters.search) {
        filters.search = sanitizeInput.searchQuery(filters.search);
      }

      const data = await fetchBudgetsForExport(supabase, profile.enterprise_id, filters);

      if (data.length === 0) {
        return createErrorResponseSync('No budgets to export', 404, req);
      }

      const timestamp = formatISODate(new Date());
      const filename = `budgets_export_${timestamp}`;

      if (format === 'json') {
        return new Response(JSON.stringify(data, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`,
            ...getCorsHeaders(req),
          },
        });
      }

      const csvContent = generateCsvWithColumns(data, BUDGET_COLUMNS);
      return createCsvResponse(csvContent, `${filename}.csv`, getCorsHeaders(req));
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'exports', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'exports',
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getColumnDescription(entityType: EntityType, key: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    contracts: {
      id: 'Unique contract identifier',
      title: 'Contract title/name',
      status: 'Current contract status (draft, active, expired, etc.)',
      contract_type: 'Type of contract (service, license, etc.)',
      value: 'Total contract value in dollars',
      start_date: 'Contract start date',
      end_date: 'Contract end/expiration date',
      'vendor.name': 'Associated vendor name',
      'owner.full_name': 'Contract owner name',
      is_auto_renew: 'Whether contract auto-renews',
      created_at: 'When contract was created',
      updated_at: 'When contract was last updated',
    },
    vendors: {
      id: 'Unique vendor identifier',
      name: 'Vendor name',
      category: 'Vendor category/type',
      status: 'Vendor status (active, inactive, etc.)',
      contact_name: 'Primary contact name',
      contact_email: 'Primary contact email',
      contact_phone: 'Primary contact phone',
      website: 'Vendor website URL',
      performance_score: 'Vendor performance score (0-100)',
      risk_score: 'Vendor risk score (0-100)',
      created_at: 'When vendor was created',
      updated_at: 'When vendor was last updated',
    },
    budgets: {
      id: 'Unique budget identifier',
      name: 'Budget name',
      budget_type: 'Budget type (annual, quarterly, etc.)',
      total_budget: 'Total budget amount',
      spent_amount: 'Amount spent from budget',
      start_date: 'Budget period start date',
      end_date: 'Budget period end date',
      department: 'Associated department',
      'owner.full_name': 'Budget owner name',
      created_at: 'When budget was created',
    },
  };

  return descriptions[entityType]?.[key] || '';
}
