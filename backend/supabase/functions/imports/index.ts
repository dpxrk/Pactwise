/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type EntityType = 'contracts' | 'vendors';

interface ImportValidationResult {
  row: number;
  valid: boolean;
  errors: string[];
  data?: Record<string, unknown>;
}

interface ImportResult {
  total_rows: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; errors: string[] }>;
  created_ids: string[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const importRequestSchema = z.object({
  entity_type: z.enum(['contracts', 'vendors']),
  data: z.array(z.record(z.unknown())).min(1).max(1000),
  options: z.object({
    skip_duplicates: z.boolean().optional().default(false),
    update_existing: z.boolean().optional().default(false),
    dry_run: z.boolean().optional().default(false),
  }).optional().default({}),
});

// Field mappings for CSV headers
const CONTRACT_FIELD_MAPPINGS: Record<string, string> = {
  'title': 'title',
  'contract title': 'title',
  'name': 'title',
  'status': 'status',
  'contract status': 'status',
  'type': 'contract_type',
  'contract type': 'contract_type',
  'value': 'value',
  'contract value': 'value',
  'amount': 'value',
  'start date': 'start_date',
  'start': 'start_date',
  'end date': 'end_date',
  'end': 'end_date',
  'expiration': 'end_date',
  'expiration date': 'end_date',
  'vendor': 'vendor_name',
  'vendor name': 'vendor_name',
  'supplier': 'vendor_name',
  'auto renew': 'is_auto_renew',
  'auto-renew': 'is_auto_renew',
  'notes': 'notes',
  'description': 'description',
};

const VENDOR_FIELD_MAPPINGS: Record<string, string> = {
  'name': 'name',
  'vendor name': 'name',
  'company': 'name',
  'category': 'category',
  'type': 'category',
  'status': 'status',
  'contact name': 'contact_name',
  'contact': 'contact_name',
  'primary contact': 'contact_name',
  'email': 'contact_email',
  'contact email': 'contact_email',
  'phone': 'contact_phone',
  'contact phone': 'contact_phone',
  'website': 'website',
  'url': 'website',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'country': 'country',
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function normalizeFieldName(field: string): string {
  return field.toLowerCase().trim().replace(/[_-]/g, ' ');
}

function mapFields(data: Record<string, unknown>, mappings: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = normalizeFieldName(key);
    const mappedKey = mappings[normalizedKey] || key;
    result[mappedKey] = value;
  }

  return result;
}

function parseValue(value: unknown, expectedType: 'string' | 'number' | 'boolean' | 'date'): unknown {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  switch (expectedType) {
    case 'number':
      // Remove currency symbols and commas
      const numStr = String(value).replace(/[$,€£]/g, '').trim();
      const num = parseFloat(numStr);
      return isNaN(num) ? null : num;

    case 'boolean':
      const strVal = String(value).toLowerCase().trim();
      if (['true', 'yes', '1', 'y'].includes(strVal)) return true;
      if (['false', 'no', '0', 'n'].includes(strVal)) return false;
      return null;

    case 'date':
      // Try to parse as date
      const dateVal = new Date(String(value));
      return isNaN(dateVal.getTime()) ? null : dateVal.toISOString();

    case 'string':
    default:
      return String(value).trim();
  }
}

function validateContractRow(row: Record<string, unknown>, rowIndex: number): ImportValidationResult {
  const errors: string[] = [];
  const data = mapFields(row, CONTRACT_FIELD_MAPPINGS);

  // Required fields
  if (!data.title || String(data.title).trim().length === 0) {
    errors.push('Title is required');
  } else {
    data.title = sanitizeInput.string(String(data.title), 255);
  }

  // Optional fields with validation
  if (data.value !== undefined && data.value !== null && data.value !== '') {
    data.value = parseValue(data.value, 'number');
    if (data.value === null) {
      errors.push('Invalid value format');
    }
  }

  if (data.start_date) {
    data.start_date = parseValue(data.start_date, 'date');
    if (data.start_date === null) {
      errors.push('Invalid start date format');
    }
  }

  if (data.end_date) {
    data.end_date = parseValue(data.end_date, 'date');
    if (data.end_date === null) {
      errors.push('Invalid end date format');
    }
  }

  if (data.is_auto_renew !== undefined) {
    data.is_auto_renew = parseValue(data.is_auto_renew, 'boolean');
  }

  // Validate status
  const validStatuses = ['draft', 'pending_review', 'pending_approval', 'active', 'expired', 'terminated', 'renewed'];
  if (data.status && !validStatuses.includes(String(data.status).toLowerCase())) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  } else if (data.status) {
    data.status = String(data.status).toLowerCase();
  }

  // Validate contract type
  const validTypes = ['service', 'license', 'subscription', 'purchase', 'lease', 'nda', 'sla', 'other'];
  if (data.contract_type && !validTypes.includes(String(data.contract_type).toLowerCase())) {
    errors.push(`Invalid contract type. Must be one of: ${validTypes.join(', ')}`);
  } else if (data.contract_type) {
    data.contract_type = String(data.contract_type).toLowerCase();
  }

  return {
    row: rowIndex,
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}

function validateVendorRow(row: Record<string, unknown>, rowIndex: number): ImportValidationResult {
  const errors: string[] = [];
  const data = mapFields(row, VENDOR_FIELD_MAPPINGS);

  // Required fields
  if (!data.name || String(data.name).trim().length === 0) {
    errors.push('Name is required');
  } else {
    data.name = sanitizeInput.string(String(data.name), 255);
  }

  // Validate category
  const validCategories = ['technology', 'marketing', 'legal', 'finance', 'hr', 'facilities', 'logistics', 'manufacturing', 'consulting', 'other'];
  if (data.category) {
    const categoryLower = String(data.category).toLowerCase();
    if (!validCategories.includes(categoryLower)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    } else {
      data.category = categoryLower;
    }
  } else {
    data.category = 'other'; // Default
  }

  // Validate status
  const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
  if (data.status && !validStatuses.includes(String(data.status).toLowerCase())) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  } else if (data.status) {
    data.status = String(data.status).toLowerCase();
  } else {
    data.status = 'pending'; // Default
  }

  // Validate email format
  if (data.contact_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(data.contact_email))) {
      errors.push('Invalid email format');
    }
  }

  // Validate website URL
  if (data.website) {
    try {
      new URL(String(data.website).startsWith('http') ? String(data.website) : `https://${data.website}`);
      if (!String(data.website).startsWith('http')) {
        data.website = `https://${data.website}`;
      }
    } catch {
      errors.push('Invalid website URL');
    }
  }

  return {
    row: rowIndex,
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}

// ============================================================================
// IMPORT LOGIC
// ============================================================================

async function importContracts(
  supabase: ReturnType<typeof createAdminClient>,
  enterpriseId: string,
  userId: string,
  validatedRows: ImportValidationResult[],
  options: { skip_duplicates: boolean; update_existing: boolean; dry_run: boolean },
): Promise<ImportResult> {
  const result: ImportResult = {
    total_rows: validatedRows.length,
    successful: 0,
    failed: 0,
    errors: [],
    created_ids: [],
  };

  if (options.dry_run) {
    // Just return validation results
    for (const row of validatedRows) {
      if (row.valid) {
        result.successful++;
      } else {
        result.failed++;
        result.errors.push({ row: row.row, errors: row.errors });
      }
    }
    return result;
  }

  // Process valid rows
  for (const row of validatedRows) {
    if (!row.valid || !row.data) {
      result.failed++;
      result.errors.push({ row: row.row, errors: row.errors });
      continue;
    }

    try {
      const contractData = row.data;

      // Look up vendor by name if provided
      let vendorId: string | null = null;
      if (contractData.vendor_name) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('enterprise_id', enterpriseId)
          .ilike('name', String(contractData.vendor_name))
          .is('deleted_at', null)
          .single();

        if (vendor) {
          vendorId = vendor.id;
        }
      }

      // Check for duplicate by title
      if (options.skip_duplicates || options.update_existing) {
        const { data: existing } = await supabase
          .from('contracts')
          .select('id')
          .eq('enterprise_id', enterpriseId)
          .eq('title', contractData.title)
          .is('deleted_at', null)
          .single();

        if (existing) {
          if (options.skip_duplicates) {
            result.successful++; // Count as success but skip
            continue;
          }

          if (options.update_existing) {
            // Update existing contract
            const { error: updateError } = await supabase
              .from('contracts')
              .update({
                ...contractData,
                vendor_id: vendorId,
                last_modified_by: userId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (updateError) {
              throw updateError;
            }

            result.successful++;
            result.created_ids.push(existing.id);
            continue;
          }
        }
      }

      // Create new contract
      const { data: newContract, error: insertError } = await supabase
        .from('contracts')
        .insert({
          title: contractData.title,
          status: contractData.status || 'draft',
          contract_type: contractData.contract_type || 'other',
          value: contractData.value,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          is_auto_renew: contractData.is_auto_renew || false,
          notes: contractData.notes,
          description: contractData.description,
          vendor_id: vendorId,
          owner_id: userId,
          created_by: userId,
          enterprise_id: enterpriseId,
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      result.successful++;
      result.created_ids.push(newContract.id);

    } catch (error) {
      result.failed++;
      result.errors.push({
        row: row.row,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }

  return result;
}

async function importVendors(
  supabase: ReturnType<typeof createAdminClient>,
  enterpriseId: string,
  userId: string,
  validatedRows: ImportValidationResult[],
  options: { skip_duplicates: boolean; update_existing: boolean; dry_run: boolean },
): Promise<ImportResult> {
  const result: ImportResult = {
    total_rows: validatedRows.length,
    successful: 0,
    failed: 0,
    errors: [],
    created_ids: [],
  };

  if (options.dry_run) {
    // Just return validation results
    for (const row of validatedRows) {
      if (row.valid) {
        result.successful++;
      } else {
        result.failed++;
        result.errors.push({ row: row.row, errors: row.errors });
      }
    }
    return result;
  }

  // Process valid rows
  for (const row of validatedRows) {
    if (!row.valid || !row.data) {
      result.failed++;
      result.errors.push({ row: row.row, errors: row.errors });
      continue;
    }

    try {
      const vendorData = row.data;

      // Check for duplicate by name
      if (options.skip_duplicates || options.update_existing) {
        const { data: existing } = await supabase
          .from('vendors')
          .select('id')
          .eq('enterprise_id', enterpriseId)
          .ilike('name', String(vendorData.name))
          .is('deleted_at', null)
          .single();

        if (existing) {
          if (options.skip_duplicates) {
            result.successful++; // Count as success but skip
            continue;
          }

          if (options.update_existing) {
            // Update existing vendor
            const { error: updateError } = await supabase
              .from('vendors')
              .update({
                ...vendorData,
                last_modified_by: userId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (updateError) {
              throw updateError;
            }

            result.successful++;
            result.created_ids.push(existing.id);
            continue;
          }
        }
      }

      // Create new vendor
      const { data: newVendor, error: insertError } = await supabase
        .from('vendors')
        .insert({
          name: vendorData.name,
          category: vendorData.category || 'other',
          status: vendorData.status || 'pending',
          contact_name: vendorData.contact_name,
          contact_email: vendorData.contact_email,
          contact_phone: vendorData.contact_phone,
          website: vendorData.website,
          address: vendorData.address,
          city: vendorData.city,
          state: vendorData.state,
          country: vendorData.country,
          created_by: userId,
          enterprise_id: enterpriseId,
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      result.successful++;
      result.created_ids.push(newVendor.id);

    } catch (error) {
      result.failed++;
      result.errors.push({
        row: row.row,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }

  return result;
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

    // Get user's permissions - need create permission for imports
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    if (!permissions.canCreate) {
      return createErrorResponseSync('Insufficient permissions to import data', 403, req);
    }

    // ========================================================================
    // POST /imports - Import data
    // ========================================================================
    if (method === 'POST' && pathname === '/imports') {
      const body = await req.json();
      const { entity_type, data, options } = validateRequest(importRequestSchema, body);

      // Validate all rows first
      const validationResults: ImportValidationResult[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let result: ImportValidationResult;

        switch (entity_type) {
          case 'contracts':
            result = validateContractRow(row, i + 1);
            break;
          case 'vendors':
            result = validateVendorRow(row, i + 1);
            break;
          default:
            return createErrorResponseSync('Invalid entity type', 400, req);
        }

        validationResults.push(result);
      }

      // Import based on entity type
      let importResult: ImportResult;

      switch (entity_type) {
        case 'contracts':
          importResult = await importContracts(
            supabase,
            profile.enterprise_id,
            profile.id,
            validationResults,
            options,
          );
          break;
        case 'vendors':
          importResult = await importVendors(
            supabase,
            profile.enterprise_id,
            profile.id,
            validationResults,
            options,
          );
          break;
        default:
          return createErrorResponseSync('Invalid entity type', 400, req);
      }

      return createSuccessResponse({
        entity_type,
        dry_run: options.dry_run,
        result: importResult,
        imported_at: new Date().toISOString(),
      }, undefined, importResult.failed > 0 ? 207 : 201, req);
    }

    // ========================================================================
    // POST /imports/validate - Validate data without importing
    // ========================================================================
    if (method === 'POST' && pathname === '/imports/validate') {
      const body = await req.json();
      const { entity_type, data } = validateRequest(importRequestSchema.omit({ options: true }), body);

      const validationResults: ImportValidationResult[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let result: ImportValidationResult;

        switch (entity_type) {
          case 'contracts':
            result = validateContractRow(row, i + 1);
            break;
          case 'vendors':
            result = validateVendorRow(row, i + 1);
            break;
          default:
            return createErrorResponseSync('Invalid entity type', 400, req);
        }

        validationResults.push(result);
      }

      const validCount = validationResults.filter(r => r.valid).length;
      const invalidCount = validationResults.filter(r => !r.valid).length;

      return createSuccessResponse({
        entity_type,
        total_rows: data.length,
        valid_rows: validCount,
        invalid_rows: invalidCount,
        validation_results: validationResults.map(r => ({
          row: r.row,
          valid: r.valid,
          errors: r.errors,
        })),
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /imports/template - Get import template with required fields
    // ========================================================================
    if (method === 'GET' && pathname === '/imports/template') {
      const entityType = url.searchParams.get('entity_type') as EntityType;

      if (!entityType || !['contracts', 'vendors'].includes(entityType)) {
        return createErrorResponseSync('Invalid entity_type parameter', 400, req);
      }

      const templates = {
        contracts: {
          required_fields: ['title'],
          optional_fields: [
            'status',
            'contract_type',
            'value',
            'start_date',
            'end_date',
            'vendor_name',
            'is_auto_renew',
            'notes',
            'description',
          ],
          valid_statuses: ['draft', 'pending_review', 'pending_approval', 'active', 'expired', 'terminated', 'renewed'],
          valid_types: ['service', 'license', 'subscription', 'purchase', 'lease', 'nda', 'sla', 'other'],
          sample_data: [
            {
              title: 'Software License Agreement',
              status: 'active',
              contract_type: 'license',
              value: 50000,
              start_date: '2024-01-01',
              end_date: '2024-12-31',
              vendor_name: 'Acme Corp',
              is_auto_renew: true,
            },
            {
              title: 'Consulting Services',
              status: 'draft',
              contract_type: 'service',
              value: 25000,
              start_date: '2024-06-01',
              end_date: '2024-08-31',
              vendor_name: 'XYZ Consulting',
            },
          ],
        },
        vendors: {
          required_fields: ['name'],
          optional_fields: [
            'category',
            'status',
            'contact_name',
            'contact_email',
            'contact_phone',
            'website',
            'address',
            'city',
            'state',
            'country',
          ],
          valid_categories: ['technology', 'marketing', 'legal', 'finance', 'hr', 'facilities', 'logistics', 'manufacturing', 'consulting', 'other'],
          valid_statuses: ['active', 'inactive', 'pending', 'suspended'],
          sample_data: [
            {
              name: 'Acme Corporation',
              category: 'technology',
              status: 'active',
              contact_name: 'John Doe',
              contact_email: 'john@acme.com',
              contact_phone: '+1-555-0100',
              website: 'https://acme.com',
              city: 'San Francisco',
              state: 'CA',
              country: 'USA',
            },
            {
              name: 'Global Services Inc',
              category: 'consulting',
              status: 'pending',
              contact_name: 'Jane Smith',
              contact_email: 'jane@globalservices.com',
            },
          ],
        },
      };

      return createSuccessResponse(templates[entityType], undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'imports', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'imports',
);
