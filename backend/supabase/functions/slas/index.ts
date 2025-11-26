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

const metricSchema = z.object({
  name: z.string().min(1).max(100),
  target_value: z.number(),
  unit: z.string().max(50),
  comparison: z.enum(['gte', 'lte', 'eq', 'gt', 'lt']).default('gte'),
  weight: z.number().min(0).max(100).default(1),
});

const createSlaSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  vendor_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  sla_type: z.enum(['availability', 'response_time', 'resolution_time', 'performance', 'quality', 'custom']),
  metrics: z.array(metricSchema).min(1),
  measurement_period: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  penalty_terms: z.string().optional(),
  credit_terms: z.string().optional(),
  is_active: z.boolean().default(true),
  notification_threshold: z.number().min(0).max(100).default(90),
  metadata: z.record(z.unknown()).optional(),
});

const updateSlaSchema = createSlaSchema.partial();

const recordMeasurementSchema = z.object({
  metric_name: z.string().min(1),
  actual_value: z.number(),
  measured_at: z.string().datetime().optional(),
  notes: z.string().optional(),
  evidence_url: z.string().url().optional(),
});

const bulkMeasurementSchema = z.object({
  measurements: z.array(recordMeasurementSchema).min(1),
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
    const permissions = await getUserPermissions(supabase, profile, 'slas');

    // ========================================================================
    // GET /slas - List all SLAs
    // ========================================================================
    if (method === 'GET' && pathname === '/slas') {
      const params = Object.fromEntries(url.searchParams);
      const vendorId = params.vendor_id;
      const contractId = params.contract_id;
      const slaType = params.sla_type;
      const isActive = params.is_active;
      const search = params.search ? sanitizeInput.searchQuery(params.search) : undefined;

      let query = supabase
        .from('slas')
        .select(`
          *,
          vendor:vendors(id, name),
          contract:contracts(id, title),
          measurements_count:sla_measurements(count)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }
      if (contractId) {
        query = query.eq('contract_id', contractId);
      }
      if (slaType) {
        query = query.eq('sla_type', slaType);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true');
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: slas, error } = await query;

      if (error) {
        throw error;
      }

      const formattedSlas = slas?.map(sla => ({
        ...sla,
        measurements_count: sla.measurements_count?.[0]?.count || 0,
      })) || [];

      return createSuccessResponse({
        slas: formattedSlas,
        total: formattedSlas.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /slas - Create SLA
    // ========================================================================
    if (method === 'POST' && pathname === '/slas') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create SLAs', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(createSlaSchema, body);

      // Verify vendor/contract if provided
      if (validatedData.vendor_id) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('id', validatedData.vendor_id)
          .eq('enterprise_id', profile.enterprise_id)
          .is('deleted_at', null)
          .single();

        if (!vendor) {
          return createErrorResponseSync('Vendor not found', 404, req);
        }
      }

      if (validatedData.contract_id) {
        const { data: contract } = await supabase
          .from('contracts')
          .select('id')
          .eq('id', validatedData.contract_id)
          .eq('enterprise_id', profile.enterprise_id)
          .is('deleted_at', null)
          .single();

        if (!contract) {
          return createErrorResponseSync('Contract not found', 404, req);
        }
      }

      const { data: sla, error } = await supabase
        .from('slas')
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

      return createSuccessResponse(sla, undefined, 201, req);
    }

    // ========================================================================
    // GET /slas/dashboard - SLA dashboard overview
    // ========================================================================
    if (method === 'GET' && pathname === '/slas/dashboard') {
      const { data: slas } = await supabase
        .from('slas')
        .select('id, name, sla_type, is_active, metrics, current_score')
        .eq('enterprise_id', profile.enterprise_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      const stats = {
        total_active: slas?.length || 0,
        by_type: {
          availability: 0,
          response_time: 0,
          resolution_time: 0,
          performance: 0,
          quality: 0,
          custom: 0,
        },
        average_score: 0,
        at_risk: 0,
        breached: 0,
        compliant: 0,
      };

      let totalScore = 0;
      slas?.forEach(sla => {
        stats.by_type[sla.sla_type as keyof typeof stats.by_type]++;

        const score = sla.current_score || 100;
        totalScore += score;

        if (score >= 100) {
          stats.compliant++;
        } else if (score >= 90) {
          stats.at_risk++;
        } else {
          stats.breached++;
        }
      });

      stats.average_score = slas?.length ? Math.round(totalScore / slas.length) : 100;

      // Get recent measurements
      const { data: recentMeasurements } = await supabase
        .from('sla_measurements')
        .select(`
          id,
          metric_name,
          actual_value,
          target_value,
          is_met,
          measured_at,
          sla:slas(id, name)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .order('measured_at', { ascending: false })
        .limit(10);

      // Get SLAs at risk
      const { data: atRiskSlas } = await supabase
        .from('slas')
        .select('id, name, sla_type, current_score, vendor:vendors(id, name)')
        .eq('enterprise_id', profile.enterprise_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .lt('current_score', 95)
        .order('current_score', { ascending: true })
        .limit(5);

      return createSuccessResponse({
        stats,
        recent_measurements: recentMeasurements || [],
        at_risk_slas: atRiskSlas || [],
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /slas/:id - Get single SLA
    // ========================================================================
    const singleSlaMatch = pathname.match(/^\/slas\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleSlaMatch) {
      const slaId = sanitizeInput.uuid(singleSlaMatch[1]);

      const { data: sla, error } = await supabase
        .from('slas')
        .select(`
          *,
          vendor:vendors(id, name),
          contract:contracts(id, title),
          recent_measurements:sla_measurements(
            id,
            metric_name,
            actual_value,
            target_value,
            is_met,
            measured_at,
            notes
          )
        `)
        .eq('id', slaId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !sla) {
        return createErrorResponseSync('SLA not found', 404, req);
      }

      return createSuccessResponse(sla, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /slas/:id - Update SLA
    // ========================================================================
    if (method === 'PATCH' && singleSlaMatch) {
      const slaId = sanitizeInput.uuid(singleSlaMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update SLAs', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(updateSlaSchema, body);

      const { data: sla, error } = await supabase
        .from('slas')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', slaId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!sla) {
        return createErrorResponseSync('SLA not found', 404, req);
      }

      return createSuccessResponse(sla, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /slas/:id - Delete SLA
    // ========================================================================
    if (method === 'DELETE' && singleSlaMatch) {
      const slaId = sanitizeInput.uuid(singleSlaMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete SLAs', 403, req);
      }

      const { error } = await supabase
        .from('slas')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', slaId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'SLA deleted',
        id: slaId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /slas/:id/measurements - Record measurement
    // ========================================================================
    const measurementsMatch = pathname.match(/^\/slas\/([a-f0-9-]+)\/measurements$/);
    if (method === 'POST' && measurementsMatch) {
      const slaId = sanitizeInput.uuid(measurementsMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to record measurements', 403, req);
      }

      // Get SLA with metrics
      const { data: sla } = await supabase
        .from('slas')
        .select('id, metrics')
        .eq('id', slaId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!sla) {
        return createErrorResponseSync('SLA not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(recordMeasurementSchema, body);

      // Find the metric
      const metric = (sla.metrics as Array<{ name: string; target_value: number; comparison: string }>)
        .find(m => m.name === validatedData.metric_name);

      if (!metric) {
        return createErrorResponseSync(`Metric "${validatedData.metric_name}" not found in SLA`, 400, req);
      }

      // Determine if target is met
      let isMet = false;
      switch (metric.comparison) {
        case 'gte':
          isMet = validatedData.actual_value >= metric.target_value;
          break;
        case 'lte':
          isMet = validatedData.actual_value <= metric.target_value;
          break;
        case 'eq':
          isMet = validatedData.actual_value === metric.target_value;
          break;
        case 'gt':
          isMet = validatedData.actual_value > metric.target_value;
          break;
        case 'lt':
          isMet = validatedData.actual_value < metric.target_value;
          break;
      }

      const { data: measurement, error } = await supabase
        .from('sla_measurements')
        .insert({
          sla_id: slaId,
          metric_name: validatedData.metric_name,
          actual_value: validatedData.actual_value,
          target_value: metric.target_value,
          is_met: isMet,
          measured_at: validatedData.measured_at || new Date().toISOString(),
          notes: validatedData.notes,
          evidence_url: validatedData.evidence_url,
          recorded_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update SLA current score
      await updateSlaScore(supabase, slaId, profile.enterprise_id);

      return createSuccessResponse(measurement, undefined, 201, req);
    }

    // ========================================================================
    // POST /slas/:id/measurements/bulk - Record bulk measurements
    // ========================================================================
    const bulkMeasurementsMatch = pathname.match(/^\/slas\/([a-f0-9-]+)\/measurements\/bulk$/);
    if (method === 'POST' && bulkMeasurementsMatch) {
      const slaId = sanitizeInput.uuid(bulkMeasurementsMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to record measurements', 403, req);
      }

      // Get SLA with metrics
      const { data: sla } = await supabase
        .from('slas')
        .select('id, metrics')
        .eq('id', slaId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!sla) {
        return createErrorResponseSync('SLA not found', 404, req);
      }

      const body = await req.json();
      const { measurements } = validateRequest(bulkMeasurementSchema, body);

      const metricsMap = new Map(
        (sla.metrics as Array<{ name: string; target_value: number; comparison: string }>)
          .map(m => [m.name, m])
      );

      const insertData = measurements.map(m => {
        const metric = metricsMap.get(m.metric_name);
        if (!metric) {
          throw new Error(`Metric "${m.metric_name}" not found in SLA`);
        }

        let isMet = false;
        switch (metric.comparison) {
          case 'gte':
            isMet = m.actual_value >= metric.target_value;
            break;
          case 'lte':
            isMet = m.actual_value <= metric.target_value;
            break;
          case 'eq':
            isMet = m.actual_value === metric.target_value;
            break;
          case 'gt':
            isMet = m.actual_value > metric.target_value;
            break;
          case 'lt':
            isMet = m.actual_value < metric.target_value;
            break;
        }

        return {
          sla_id: slaId,
          metric_name: m.metric_name,
          actual_value: m.actual_value,
          target_value: metric.target_value,
          is_met: isMet,
          measured_at: m.measured_at || new Date().toISOString(),
          notes: m.notes,
          evidence_url: m.evidence_url,
          recorded_by: profile.id,
          enterprise_id: profile.enterprise_id,
        };
      });

      const { data: insertedMeasurements, error } = await supabase
        .from('sla_measurements')
        .insert(insertData)
        .select();

      if (error) {
        throw error;
      }

      // Update SLA current score
      await updateSlaScore(supabase, slaId, profile.enterprise_id);

      return createSuccessResponse({
        message: 'Measurements recorded',
        count: insertedMeasurements?.length || 0,
        measurements: insertedMeasurements,
      }, undefined, 201, req);
    }

    // ========================================================================
    // GET /slas/:id/measurements - Get measurements history
    // ========================================================================
    if (method === 'GET' && measurementsMatch) {
      const slaId = sanitizeInput.uuid(measurementsMatch[1]);
      const params = Object.fromEntries(url.searchParams);
      const metricName = params.metric_name;
      const startDate = params.start_date;
      const endDate = params.end_date;

      let query = supabase
        .from('sla_measurements')
        .select('*')
        .eq('sla_id', slaId)
        .eq('enterprise_id', profile.enterprise_id)
        .order('measured_at', { ascending: false });

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }
      if (startDate) {
        query = query.gte('measured_at', startDate);
      }
      if (endDate) {
        query = query.lte('measured_at', endDate);
      }

      const { data: measurements, error } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        sla_id: slaId,
        measurements: measurements || [],
        total: measurements?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /slas/:id/report - Generate SLA report
    // ========================================================================
    const reportMatch = pathname.match(/^\/slas\/([a-f0-9-]+)\/report$/);
    if (method === 'GET' && reportMatch) {
      const slaId = sanitizeInput.uuid(reportMatch[1]);
      const params = Object.fromEntries(url.searchParams);
      const startDate = params.start_date;
      const endDate = params.end_date || new Date().toISOString();

      // Get SLA details
      const { data: sla } = await supabase
        .from('slas')
        .select(`
          *,
          vendor:vendors(id, name),
          contract:contracts(id, title)
        `)
        .eq('id', slaId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!sla) {
        return createErrorResponseSync('SLA not found', 404, req);
      }

      // Get measurements for the period
      let measurementsQuery = supabase
        .from('sla_measurements')
        .select('*')
        .eq('sla_id', slaId)
        .eq('enterprise_id', profile.enterprise_id)
        .lte('measured_at', endDate)
        .order('measured_at', { ascending: true });

      if (startDate) {
        measurementsQuery = measurementsQuery.gte('measured_at', startDate);
      }

      const { data: measurements } = await measurementsQuery;

      // Calculate statistics per metric
      const metricStats: Record<string, {
        total: number;
        met: number;
        compliance_rate: number;
        avg_value: number;
        min_value: number;
        max_value: number;
        trend: 'improving' | 'stable' | 'declining';
      }> = {};

      (sla.metrics as Array<{ name: string }>).forEach(metric => {
        const metricMeasurements = measurements?.filter(m => m.metric_name === metric.name) || [];
        const metCount = metricMeasurements.filter(m => m.is_met).length;
        const values = metricMeasurements.map(m => m.actual_value);

        metricStats[metric.name] = {
          total: metricMeasurements.length,
          met: metCount,
          compliance_rate: metricMeasurements.length > 0
            ? Math.round((metCount / metricMeasurements.length) * 100)
            : 100,
          avg_value: values.length > 0
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100
            : 0,
          min_value: values.length > 0 ? Math.min(...values) : 0,
          max_value: values.length > 0 ? Math.max(...values) : 0,
          trend: calculateTrend(metricMeasurements),
        };
      });

      const overallCompliance = Object.values(metricStats).length > 0
        ? Math.round(
          Object.values(metricStats).reduce((sum, m) => sum + m.compliance_rate, 0) /
          Object.values(metricStats).length
        )
        : 100;

      return createSuccessResponse({
        report: {
          sla,
          period: {
            start: startDate || sla.start_date,
            end: endDate,
          },
          overall_compliance: overallCompliance,
          metric_stats: metricStats,
          total_measurements: measurements?.length || 0,
          generated_at: new Date().toISOString(),
        },
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'slas', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'slas',
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateSlaScore(
  supabase: ReturnType<typeof createAdminClient>,
  slaId: string,
  enterpriseId: string
): Promise<void> {
  // Get recent measurements (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: measurements } = await supabase
    .from('sla_measurements')
    .select('is_met')
    .eq('sla_id', slaId)
    .eq('enterprise_id', enterpriseId)
    .gte('measured_at', thirtyDaysAgo.toISOString());

  if (measurements && measurements.length > 0) {
    const metCount = measurements.filter(m => m.is_met).length;
    const score = Math.round((metCount / measurements.length) * 100);

    await supabase
      .from('slas')
      .update({
        current_score: score,
        last_measured_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', slaId);
  }
}

function calculateTrend(measurements: Array<{ is_met: boolean; measured_at: string }>): 'improving' | 'stable' | 'declining' {
  if (measurements.length < 4) return 'stable';

  const sorted = [...measurements].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );

  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);

  const firstRate = firstHalf.filter(m => m.is_met).length / firstHalf.length;
  const secondRate = secondHalf.filter(m => m.is_met).length / secondHalf.length;

  const diff = secondRate - firstRate;
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}
