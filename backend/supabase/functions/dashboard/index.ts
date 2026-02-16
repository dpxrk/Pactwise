/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { getLogger } from '../_shared/logger.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { invalidateOnDataChange, type InvalidationEvent } from '../_shared/cache-invalidation.ts';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  contracts: {
    total: number;
    active: number;
    expiring_soon: number;
    pending_approval: number;
    total_value: number;
    by_status: Record<string, number>;
  };
  vendors: {
    total: number;
    active: number;
    high_risk: number;
    avg_performance_score: number;
    by_tier: Record<string, number>;
  };
  budgets: {
    total_allocated: number;
    total_spent: number;
    utilization_rate: number;
    over_budget_count: number;
  };
  approvals: {
    pending: number;
    approved_today: number;
    rejected_today: number;
    avg_approval_time_hours: number;
  };
  compliance: {
    compliant_count: number;
    non_compliant_count: number;
    compliance_rate: number;
    issues_by_severity: Record<string, number>;
  };
  market_intelligence: {
    price_anomalies: number;
    savings_opportunities: number;
    market_benchmarks_available: number;
  };
  recent_activity: Array<{
    type: string;
    description: string;
    timestamp: string;
    user_id?: string;
    entity_id?: string;
  }>;
}

interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const logger = getLogger({ contextDefaults: { function_name: 'dashboard' } });

/**
 * Dashboard handler - processes all dashboard endpoints with caching
 */
async function handleDashboard(context: RequestContext): Promise<Response> {
  const { req, user } = context;

  if (!user) {
    return createErrorResponseSync('Authorization required', 401, req);
  }

  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  const supabase = createAdminClient();

  try {
    // ========================================================================
    // GET /dashboard/stats - Get comprehensive dashboard statistics
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/stats') {
      logger.info('Fetching dashboard stats', { enterprise_id: user.enterprise_id });

      // Use the optimized database function
      const { data: stats, error } = await supabase.rpc('get_enterprise_dashboard_stats', {
        p_enterprise_id: user.enterprise_id,
      });

      if (error) throw error;

      return createSuccessResponse(stats, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/contracts/timeline - Contract value over time
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/contracts/timeline') {
      const months = parseInt(url.searchParams.get('months') || '12', 10);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('contracts')
        .select('created_at, value, status')
        .eq('enterprise_id', user.enterprise_id)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { total_value: number; count: number }> = {};

      for (const contract of data || []) {
        const month = contract.created_at.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { total_value: 0, count: 0 };
        }
        monthlyData[month].total_value += contract.value || 0;
        monthlyData[month].count += 1;
      }

      const timeline: TimeSeriesData[] = Object.entries(monthlyData).map(([date, values]) => ({
        date,
        value: values.total_value,
        label: `${values.count} contracts`,
      }));

      return createSuccessResponse({ timeline }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/contracts/expiring - Contracts expiring soon
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/contracts/expiring') {
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id, title, end_date, value, status, is_auto_renew,
          vendor:vendors(id, name)
        `)
        .eq('enterprise_id', user.enterprise_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .lte('end_date', futureDate.toISOString())
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      return createSuccessResponse({
        contracts: data || [],
        total_value: (data || []).reduce((sum, c) => sum + (c.value || 0), 0),
        count: data?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/vendors/performance - Vendor performance distribution
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/vendors/performance') {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, performance_score, tier, risk_level')
        .eq('enterprise_id', user.enterprise_id)
        .is('deleted_at', null)
        .not('performance_score', 'is', null)
        .order('performance_score', { ascending: false });

      if (error) throw error;

      // Group by performance tier
      const distribution = {
        excellent: 0,  // 90-100
        good: 0,       // 70-89
        fair: 0,       // 50-69
        poor: 0,       // 0-49
      };

      for (const vendor of data || []) {
        const score = vendor.performance_score || 0;
        if (score >= 90) distribution.excellent++;
        else if (score >= 70) distribution.good++;
        else if (score >= 50) distribution.fair++;
        else distribution.poor++;
      }

      // Top and bottom performers
      const topPerformers = (data || []).slice(0, 5);
      const bottomPerformers = (data || []).slice(-5).reverse();

      return createSuccessResponse({
        distribution,
        top_performers: topPerformers,
        bottom_performers: bottomPerformers,
        average_score: data?.length
          ? (data.reduce((sum, v) => sum + (v.performance_score || 0), 0) / data.length)
          : 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/budgets/utilization - Budget utilization by category
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/budgets/utilization') {
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select(`
          id, name, category, total_amount, spent_amount, start_date, end_date,
          status
        `)
        .eq('enterprise_id', user.enterprise_id)
        .eq('status', 'active')
        .is('deleted_at', null);

      if (error) throw error;

      // Group by category
      const byCategory: Record<string, {
        allocated: number;
        spent: number;
        utilization: number;
        count: number;
      }> = {};

      for (const budget of budgets || []) {
        const category = budget.category || 'Uncategorized';
        if (!byCategory[category]) {
          byCategory[category] = { allocated: 0, spent: 0, utilization: 0, count: 0 };
        }
        byCategory[category].allocated += budget.total_amount || 0;
        byCategory[category].spent += budget.spent_amount || 0;
        byCategory[category].count++;
      }

      // Calculate utilization rates
      for (const category of Object.keys(byCategory)) {
        const cat = byCategory[category];
        cat.utilization = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
      }

      // Overall metrics
      const totalAllocated = Object.values(byCategory).reduce((sum, c) => sum + c.allocated, 0);
      const totalSpent = Object.values(byCategory).reduce((sum, c) => sum + c.spent, 0);

      return createSuccessResponse({
        by_category: byCategory,
        totals: {
          allocated: totalAllocated,
          spent: totalSpent,
          remaining: totalAllocated - totalSpent,
          utilization_rate: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
        },
        over_budget: (budgets || []).filter(b => (b.spent_amount || 0) > (b.total_amount || 0)),
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/approvals/pending - Pending approvals for current user
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/approvals/pending') {
      const { data, error } = await supabase
        .from('contract_approvals')
        .select(`
          id, status, due_date, created_at,
          contract:contracts(id, title, value, vendor:vendors(id, name)),
          requested_by_user:users!requested_by(id, full_name, email)
        `)
        .eq('approver_id', user.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Count overdue
      const now = new Date();
      const overdue = (data || []).filter(a => a.due_date && new Date(a.due_date) < now);

      return createSuccessResponse({
        pending: data || [],
        count: data?.length || 0,
        overdue_count: overdue.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/compliance/issues - Compliance issues summary
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/compliance/issues') {
      const { data, error } = await supabase
        .from('compliance_checks')
        .select(`
          id, check_type, passed, severity, notes, performed_at,
          vendor:vendors(id, name),
          contract:contracts(id, title)
        `)
        .eq('enterprise_id', user.enterprise_id)
        .eq('passed', false)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by severity
      const bySeverity: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      for (const issue of data || []) {
        const severity = issue.severity || 'low';
        bySeverity[severity] = (bySeverity[severity] || 0) + 1;
      }

      return createSuccessResponse({
        issues: data || [],
        by_severity: bySeverity,
        total_count: data?.length || 0,
        critical_count: bySeverity.critical + bySeverity.high,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/activity - Recent activity feed
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/activity') {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);

      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id, action, entity_type, entity_id, description, created_at,
          user:users(id, full_name, email)
        `)
        .eq('enterprise_id', user.enterprise_id)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 100));

      if (error) throw error;

      return createSuccessResponse({
        activities: data || [],
        count: data?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/kpis - Key Performance Indicators
    // ========================================================================
    if (method === 'GET' && pathname === '/dashboard/kpis') {
      // Get date ranges for comparison
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Parallel fetch all KPI data (5 queries → 1 round-trip)
      const [
        { count: thisMonthContracts },
        { count: lastMonthContracts },
        { data: thisMonthValue },
        { data: approvalTimes },
        { data: vendorCompliance }
      ] = await Promise.all([
        // This month's contracts
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('enterprise_id', user.enterprise_id)
          .is('deleted_at', null)
          .gte('created_at', thisMonthStart.toISOString()),

        // Last month's contracts
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('enterprise_id', user.enterprise_id)
          .is('deleted_at', null)
          .gte('created_at', lastMonthStart.toISOString())
          .lte('created_at', lastMonthEnd.toISOString()),

        // This month's contract value
        supabase
          .from('contracts')
          .select('value')
          .eq('enterprise_id', user.enterprise_id)
          .is('deleted_at', null)
          .gte('created_at', thisMonthStart.toISOString()),

        // Average time to approval
        supabase
          .from('contract_approvals')
          .select('created_at, approved_at')
          .eq('enterprise_id', user.enterprise_id)
          .eq('status', 'approved')
          .not('approved_at', 'is', null)
          .gte('created_at', lastMonthStart.toISOString()),

        // Vendor compliance rate
        supabase
          .from('vendors')
          .select('compliance_status')
          .eq('enterprise_id', user.enterprise_id)
          .is('deleted_at', null)
      ]);

      const totalThisMonth = (thisMonthValue || []).reduce((sum, c) => sum + (c.value || 0), 0);

      let avgApprovalHours = 0;
      if (approvalTimes && approvalTimes.length > 0) {
        const totalHours = approvalTimes.reduce((sum, a) => {
          const created = new Date(a.created_at);
          const approved = new Date(a.approved_at);
          return sum + (approved.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        avgApprovalHours = totalHours / approvalTimes.length;
      }

      const compliantVendors = (vendorCompliance || []).filter(v => v.compliance_status === 'compliant').length;
      const complianceRate = vendorCompliance?.length
        ? (compliantVendors / vendorCompliance.length) * 100
        : 0;

      return createSuccessResponse({
        kpis: [
          {
            name: 'Contracts This Month',
            value: thisMonthContracts || 0,
            previous: lastMonthContracts || 0,
            change: lastMonthContracts
              ? (((thisMonthContracts || 0) - lastMonthContracts) / lastMonthContracts) * 100
              : 0,
            unit: 'contracts',
          },
          {
            name: 'Contract Value This Month',
            value: totalThisMonth,
            unit: 'currency',
          },
          {
            name: 'Avg. Approval Time',
            value: Math.round(avgApprovalHours * 10) / 10,
            unit: 'hours',
          },
          {
            name: 'Vendor Compliance Rate',
            value: Math.round(complianceRate * 10) / 10,
            unit: 'percentage',
          },
        ],
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /dashboard/widgets/:widget - Individual widget data
    // ========================================================================
    if (method === 'GET' && pathname.match(/^\/dashboard\/widgets\/[a-z-]+$/)) {
      const widget = pathname.split('/')[3];

      switch (widget) {
        case 'contract-status': {
          const { data, error } = await supabase
            .from('contracts')
            .select('status')
            .eq('enterprise_id', user.enterprise_id)
            .is('deleted_at', null);

          if (error) throw error;

          const byStatus: Record<string, number> = {};
          for (const c of data || []) {
            byStatus[c.status] = (byStatus[c.status] || 0) + 1;
          }

          return createSuccessResponse({ by_status: byStatus, total: data?.length || 0 }, undefined, 200, req);
        }

        case 'vendor-risk': {
          const { data, error } = await supabase
            .from('vendors')
            .select('risk_level')
            .eq('enterprise_id', user.enterprise_id)
            .is('deleted_at', null);

          if (error) throw error;

          const byRisk: Record<string, number> = {};
          for (const v of data || []) {
            const risk = v.risk_level || 'unknown';
            byRisk[risk] = (byRisk[risk] || 0) + 1;
          }

          return createSuccessResponse({ by_risk: byRisk, total: data?.length || 0 }, undefined, 200, req);
        }

        default:
          return createErrorResponseSync('Widget not found', 404, req);
      }
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);
  } catch (error) {
    logger.error('Dashboard error', error);
    return createErrorResponseSync(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      req
    );
  }
}

// Serve with middleware wrapper (handles CORS, auth, rate limiting, and HTTP caching)
serve(
  withMiddleware(handleDashboard, {
    requireAuth: true,
    rateLimit: true,
    securityMonitoring: true,
    // Cache is automatically determined per-endpoint from cache-config.ts
    // Override with explicit policy if needed:
    // cache: { policy: 'dashboard-stats' }
  }, 'dashboard')
);
