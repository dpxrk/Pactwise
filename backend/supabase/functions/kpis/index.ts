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

const createKpiSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['financial', 'operational', 'vendor', 'compliance', 'contract', 'custom']),
  unit: z.string().max(50).optional(),
  target_value: z.number().optional(),
  warning_threshold: z.number().optional(),
  critical_threshold: z.number().optional(),
  comparison: z.enum(['higher_is_better', 'lower_is_better', 'target_is_best']).default('higher_is_better'),
  calculation_method: z.enum(['manual', 'automatic', 'formula']).default('manual'),
  formula: z.string().optional(),
  data_source: z.string().optional(),
  measurement_frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  is_active: z.boolean().default(true),
  visibility: z.enum(['private', 'team', 'enterprise']).default('enterprise'),
  metadata: z.record(z.unknown()).optional(),
});

const updateKpiSchema = createKpiSchema.partial();

const recordValueSchema = z.object({
  value: z.number(),
  measured_at: z.string().datetime().optional(),
  notes: z.string().optional(),
  breakdown: z.record(z.number()).optional(),
});

const bulkRecordSchema = z.object({
  values: z.array(z.object({
    kpi_id: z.string().uuid(),
    value: z.number(),
    measured_at: z.string().datetime().optional(),
    notes: z.string().optional(),
  })).min(1),
});

const createDashboardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  kpi_ids: z.array(z.string().uuid()).min(1),
  layout: z.record(z.unknown()).optional(),
  is_default: z.boolean().default(false),
  visibility: z.enum(['private', 'team', 'enterprise']).default('enterprise'),
});

const updateDashboardSchema = createDashboardSchema.partial();

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
    const permissions = await getUserPermissions(supabase, profile, 'kpis');

    // ========================================================================
    // GET /kpis - List KPIs
    // ========================================================================
    if (method === 'GET' && pathname === '/kpis') {
      const params = Object.fromEntries(url.searchParams);
      const category = params.category;
      const isActive = params.is_active;
      const search = params.search ? sanitizeInput.searchQuery(params.search) : undefined;

      let query = supabase
        .from('kpis')
        .select(`
          *,
          latest_value:kpi_values(
            value,
            measured_at
          )
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true');
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: kpis, error } = await query;

      if (error) {
        throw error;
      }

      // Format with latest value and status
      const formattedKpis = kpis?.map(kpi => {
        const latestValue = kpi.latest_value?.[0];
        return {
          ...kpi,
          current_value: latestValue?.value ?? null,
          last_measured: latestValue?.measured_at ?? null,
          status: calculateKpiStatus(kpi, latestValue?.value),
          latest_value: undefined,
        };
      }) || [];

      return createSuccessResponse({
        kpis: formattedKpis,
        total: formattedKpis.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /kpis - Create KPI
    // ========================================================================
    if (method === 'POST' && pathname === '/kpis') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create KPIs', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(createKpiSchema, body);

      const { data: kpi, error } = await supabase
        .from('kpis')
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

      return createSuccessResponse(kpi, undefined, 201, req);
    }

    // ========================================================================
    // GET /kpis/overview - KPI overview dashboard
    // ========================================================================
    if (method === 'GET' && pathname === '/kpis/overview') {
      const { data: kpis } = await supabase
        .from('kpis')
        .select(`
          id,
          name,
          category,
          target_value,
          warning_threshold,
          critical_threshold,
          comparison,
          current_value:kpi_values(value, measured_at)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      const stats = {
        total: kpis?.length || 0,
        by_category: {
          financial: 0,
          operational: 0,
          vendor: 0,
          compliance: 0,
          contract: 0,
          custom: 0,
        },
        by_status: {
          on_target: 0,
          warning: 0,
          critical: 0,
          no_data: 0,
        },
        overall_health: 100,
      };

      let healthScore = 0;
      let scoredKpis = 0;

      kpis?.forEach(kpi => {
        stats.by_category[kpi.category as keyof typeof stats.by_category]++;

        const latestValue = kpi.current_value?.[0]?.value;
        const status = calculateKpiStatus(kpi, latestValue);

        stats.by_status[status as keyof typeof stats.by_status]++;

        if (status !== 'no_data') {
          scoredKpis++;
          if (status === 'on_target') healthScore += 100;
          else if (status === 'warning') healthScore += 50;
        }
      });

      stats.overall_health = scoredKpis > 0 ? Math.round(healthScore / scoredKpis) : 100;

      // Get trending KPIs (most improved and most declined)
      const { data: trendingKpis } = await supabase
        .from('kpis')
        .select(`
          id,
          name,
          category,
          comparison,
          values:kpi_values(value, measured_at)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(20);

      const trendsAnalyzed = trendingKpis?.map(kpi => {
        const trend = calculateTrend(kpi.values || [], kpi.comparison);
        return { ...kpi, trend, values: undefined };
      }).sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend)).slice(0, 5) || [];

      return createSuccessResponse({
        stats,
        trending_kpis: trendsAnalyzed,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /kpis/:id - Get single KPI
    // ========================================================================
    const singleKpiMatch = pathname.match(/^\/kpis\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleKpiMatch) {
      const kpiId = sanitizeInput.uuid(singleKpiMatch[1]);

      const { data: kpi, error } = await supabase
        .from('kpis')
        .select(`
          *,
          recent_values:kpi_values(
            id,
            value,
            measured_at,
            notes,
            breakdown
          )
        `)
        .eq('id', kpiId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !kpi) {
        return createErrorResponseSync('KPI not found', 404, req);
      }

      const latestValue = kpi.recent_values?.[0];
      const enrichedKpi = {
        ...kpi,
        current_value: latestValue?.value ?? null,
        last_measured: latestValue?.measured_at ?? null,
        status: calculateKpiStatus(kpi, latestValue?.value),
        trend: calculateTrend(kpi.recent_values || [], kpi.comparison),
      };

      return createSuccessResponse(enrichedKpi, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /kpis/:id - Update KPI
    // ========================================================================
    if (method === 'PATCH' && singleKpiMatch) {
      const kpiId = sanitizeInput.uuid(singleKpiMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update KPIs', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(updateKpiSchema, body);

      const { data: kpi, error } = await supabase
        .from('kpis')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', kpiId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!kpi) {
        return createErrorResponseSync('KPI not found', 404, req);
      }

      return createSuccessResponse(kpi, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /kpis/:id - Delete KPI
    // ========================================================================
    if (method === 'DELETE' && singleKpiMatch) {
      const kpiId = sanitizeInput.uuid(singleKpiMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete KPIs', 403, req);
      }

      const { error } = await supabase
        .from('kpis')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', kpiId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'KPI deleted',
        id: kpiId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /kpis/:id/values - Record KPI value
    // ========================================================================
    const valuesMatch = pathname.match(/^\/kpis\/([a-f0-9-]+)\/values$/);
    if (method === 'POST' && valuesMatch) {
      const kpiId = sanitizeInput.uuid(valuesMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to record values', 403, req);
      }

      // Verify KPI exists
      const { data: kpi } = await supabase
        .from('kpis')
        .select('id')
        .eq('id', kpiId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!kpi) {
        return createErrorResponseSync('KPI not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(recordValueSchema, body);

      const { data: value, error } = await supabase
        .from('kpi_values')
        .insert({
          kpi_id: kpiId,
          ...validatedData,
          measured_at: validatedData.measured_at || new Date().toISOString(),
          recorded_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(value, undefined, 201, req);
    }

    // ========================================================================
    // GET /kpis/:id/values - Get KPI values history
    // ========================================================================
    if (method === 'GET' && valuesMatch) {
      const kpiId = sanitizeInput.uuid(valuesMatch[1]);
      const params = Object.fromEntries(url.searchParams);
      const startDate = params.start_date;
      const endDate = params.end_date;
      const limit = params.limit ? parseInt(params.limit, 10) : 100;

      let query = supabase
        .from('kpi_values')
        .select('*')
        .eq('kpi_id', kpiId)
        .eq('enterprise_id', profile.enterprise_id)
        .order('measured_at', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('measured_at', startDate);
      }
      if (endDate) {
        query = query.lte('measured_at', endDate);
      }

      const { data: values, error } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        kpi_id: kpiId,
        values: values || [],
        total: values?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /kpis/values/bulk - Record bulk KPI values
    // ========================================================================
    if (method === 'POST' && pathname === '/kpis/values/bulk') {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to record values', 403, req);
      }

      const body = await req.json();
      const { values } = validateRequest(bulkRecordSchema, body);

      // Verify all KPIs exist
      const kpiIds = [...new Set(values.map(v => v.kpi_id))];
      const { data: existingKpis } = await supabase
        .from('kpis')
        .select('id')
        .in('id', kpiIds)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const validKpiIds = new Set(existingKpis?.map(k => k.id) || []);
      const validValues = values.filter(v => validKpiIds.has(v.kpi_id));

      if (validValues.length === 0) {
        return createErrorResponseSync('No valid KPIs found', 400, req);
      }

      const insertData = validValues.map(v => ({
        kpi_id: v.kpi_id,
        value: v.value,
        measured_at: v.measured_at || new Date().toISOString(),
        notes: v.notes,
        recorded_by: profile.id,
        enterprise_id: profile.enterprise_id,
      }));

      const { data: insertedValues, error } = await supabase
        .from('kpi_values')
        .insert(insertData)
        .select();

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Values recorded',
        count: insertedValues?.length || 0,
        skipped: values.length - validValues.length,
      }, undefined, 201, req);
    }

    // ========================================================================
    // GET /kpis/dashboards - List KPI dashboards
    // ========================================================================
    if (method === 'GET' && pathname === '/kpis/dashboards') {
      const { data: dashboards, error } = await supabase
        .from('kpi_dashboards')
        .select(`
          *,
          kpi_count:kpi_dashboard_items(count)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .or(`visibility.eq.enterprise,created_by.eq.${profile.id}`)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      const formattedDashboards = dashboards?.map(d => ({
        ...d,
        kpi_count: d.kpi_count?.[0]?.count || 0,
      })) || [];

      return createSuccessResponse({
        dashboards: formattedDashboards,
        total: formattedDashboards.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /kpis/dashboards - Create KPI dashboard
    // ========================================================================
    if (method === 'POST' && pathname === '/kpis/dashboards') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create dashboards', 403, req);
      }

      const body = await req.json();
      const { kpi_ids, ...dashboardData } = validateRequest(createDashboardSchema, body);

      // If setting as default, unset other defaults
      if (dashboardData.is_default) {
        await supabase
          .from('kpi_dashboards')
          .update({ is_default: false })
          .eq('enterprise_id', profile.enterprise_id);
      }

      const { data: dashboard, error } = await supabase
        .from('kpi_dashboards')
        .insert({
          ...dashboardData,
          created_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add KPIs to dashboard
      const dashboardItems = kpi_ids.map((kpiId, index) => ({
        dashboard_id: dashboard.id,
        kpi_id: kpiId,
        position: index,
        enterprise_id: profile.enterprise_id,
      }));

      await supabase.from('kpi_dashboard_items').insert(dashboardItems);

      return createSuccessResponse(dashboard, undefined, 201, req);
    }

    // ========================================================================
    // GET /kpis/dashboards/:id - Get single dashboard with KPIs
    // ========================================================================
    const dashboardMatch = pathname.match(/^\/kpis\/dashboards\/([a-f0-9-]+)$/);
    if (method === 'GET' && dashboardMatch) {
      const dashboardId = sanitizeInput.uuid(dashboardMatch[1]);

      const { data: dashboard, error } = await supabase
        .from('kpi_dashboards')
        .select(`
          *,
          items:kpi_dashboard_items(
            position,
            kpi:kpis(
              id,
              name,
              description,
              category,
              unit,
              target_value,
              warning_threshold,
              critical_threshold,
              comparison,
              current_value:kpi_values(value, measured_at)
            )
          )
        `)
        .eq('id', dashboardId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !dashboard) {
        return createErrorResponseSync('Dashboard not found', 404, req);
      }

      // Format KPIs with status
      const formattedItems = dashboard.items?.map((item: { position: number; kpi: KpiItem }) => ({
        position: item.position,
        kpi: {
          ...item.kpi,
          current_value: item.kpi?.current_value?.[0]?.value ?? null,
          last_measured: item.kpi?.current_value?.[0]?.measured_at ?? null,
          status: calculateKpiStatus(item.kpi, item.kpi?.current_value?.[0]?.value),
        },
      })).sort((a: { position: number }, b: { position: number }) => a.position - b.position) || [];

      return createSuccessResponse({
        ...dashboard,
        items: formattedItems,
      }, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /kpis/dashboards/:id - Update dashboard
    // ========================================================================
    if (method === 'PATCH' && dashboardMatch) {
      const dashboardId = sanitizeInput.uuid(dashboardMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update dashboards', 403, req);
      }

      const body = await req.json();
      const { kpi_ids, ...dashboardData } = validateRequest(updateDashboardSchema, body);

      // If setting as default, unset other defaults
      if (dashboardData.is_default) {
        await supabase
          .from('kpi_dashboards')
          .update({ is_default: false })
          .eq('enterprise_id', profile.enterprise_id)
          .neq('id', dashboardId);
      }

      const { data: dashboard, error } = await supabase
        .from('kpi_dashboards')
        .update({
          ...dashboardData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dashboardId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!dashboard) {
        return createErrorResponseSync('Dashboard not found', 404, req);
      }

      // Update KPIs if provided
      if (kpi_ids) {
        await supabase
          .from('kpi_dashboard_items')
          .delete()
          .eq('dashboard_id', dashboardId);

        const dashboardItems = kpi_ids.map((kpiId, index) => ({
          dashboard_id: dashboardId,
          kpi_id: kpiId,
          position: index,
          enterprise_id: profile.enterprise_id,
        }));

        await supabase.from('kpi_dashboard_items').insert(dashboardItems);
      }

      return createSuccessResponse(dashboard, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /kpis/dashboards/:id - Delete dashboard
    // ========================================================================
    if (method === 'DELETE' && dashboardMatch) {
      const dashboardId = sanitizeInput.uuid(dashboardMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete dashboards', 403, req);
      }

      // Delete items first
      await supabase
        .from('kpi_dashboard_items')
        .delete()
        .eq('dashboard_id', dashboardId);

      const { error } = await supabase
        .from('kpi_dashboards')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', dashboardId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Dashboard deleted',
        id: dashboardId,
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'kpis', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'kpis',
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface KpiItem {
  target_value?: number | null;
  warning_threshold?: number | null;
  critical_threshold?: number | null;
  comparison?: string;
  current_value?: Array<{ value: number; measured_at: string }>;
}

function calculateKpiStatus(
  kpi: KpiItem,
  currentValue: number | null | undefined
): 'on_target' | 'warning' | 'critical' | 'no_data' {
  if (currentValue === null || currentValue === undefined) {
    return 'no_data';
  }

  const { target_value, warning_threshold, critical_threshold, comparison } = kpi;

  if (target_value === null || target_value === undefined) {
    return 'no_data';
  }

  const isHigherBetter = comparison === 'higher_is_better';
  const isLowerBetter = comparison === 'lower_is_better';

  if (isHigherBetter) {
    if (critical_threshold !== null && critical_threshold !== undefined && currentValue < critical_threshold) {
      return 'critical';
    }
    if (warning_threshold !== null && warning_threshold !== undefined && currentValue < warning_threshold) {
      return 'warning';
    }
    return currentValue >= target_value ? 'on_target' : 'warning';
  }

  if (isLowerBetter) {
    if (critical_threshold !== null && critical_threshold !== undefined && currentValue > critical_threshold) {
      return 'critical';
    }
    if (warning_threshold !== null && warning_threshold !== undefined && currentValue > warning_threshold) {
      return 'warning';
    }
    return currentValue <= target_value ? 'on_target' : 'warning';
  }

  // target_is_best
  const deviation = Math.abs(currentValue - target_value);
  if (critical_threshold !== null && critical_threshold !== undefined && deviation > critical_threshold) {
    return 'critical';
  }
  if (warning_threshold !== null && warning_threshold !== undefined && deviation > warning_threshold) {
    return 'warning';
  }
  return 'on_target';
}

function calculateTrend(
  values: Array<{ value: number; measured_at: string }>,
  comparison: string
): number {
  if (values.length < 2) return 0;

  const sorted = [...values].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );

  const oldValue = sorted[0].value;
  const newValue = sorted[sorted.length - 1].value;

  if (oldValue === 0) return 0;

  const percentChange = ((newValue - oldValue) / Math.abs(oldValue)) * 100;

  // For lower_is_better, invert the trend interpretation
  return comparison === 'lower_is_better' ? -percentChange : percentChange;
}
