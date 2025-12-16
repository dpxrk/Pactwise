/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import {
  createTemporalReasoningAgent,
  type TemporalAnalysisData,
} from '../local-agents/agents/temporal-reasoning.ts';

/**
 * Temporal Analysis Edge Function
 *
 * Provides time-series analysis endpoints for contract lifecycle management.
 *
 * Endpoints:
 * - GET /temporal-analysis/lifecycle - Contract lifecycle event analysis
 * - GET /temporal-analysis/trends - Trend detection and forecasting
 * - GET /temporal-analysis/predictions - Renewal probability predictions
 * - GET /temporal-analysis/anomalies - Temporal anomaly detection
 * - GET /temporal-analysis/comprehensive - Full temporal analysis
 * - GET /temporal-analysis/alerts - Active temporal alerts
 * - POST /temporal-analysis/aggregate - Trigger metrics aggregation (admin)
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TimeRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

const BucketTypeSchema = z.enum(['hourly', 'daily', 'weekly', 'monthly']);

const AnalysisQuerySchema = z.object({
  contractId: z.string().uuid().optional(),
  timeRange: TimeRangeSchema.optional(),
  bucketType: BucketTypeSchema.optional(),
  metricCategory: z.string().optional(),
});

// ============================================================================
// HANDLER
// ============================================================================

async function handleTemporalAnalysis(context: RequestContext): Promise<Response> {
  const { req, user } = context;
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  // Require authentication for all endpoints
  if (!user) {
    return createErrorResponseSync('Authentication required', 401, req);
  }

  try {
    const agent = createTemporalReasoningAgent();

    // Parse query parameters
    const params: Record<string, string | undefined> = {};
    for (const [key, value] of url.searchParams) {
      params[key] = value;
    }

    // Build time range from query params
    const timeRange = {
      start: params.start || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      end: params.end || new Date().toISOString(),
    };

    // ========================================================================
    // GET /temporal-analysis/lifecycle - Lifecycle event analysis
    // ========================================================================
    if (method === 'GET' && pathname === '/temporal-analysis/lifecycle') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'lifecycle_analysis',
        contractId: params.contractId,
        timeRange,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: result.data?.lifecycleEvents,
        insights: result.insights,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /temporal-analysis/trends - Trend detection
    // ========================================================================
    if (method === 'GET' && pathname === '/temporal-analysis/trends') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'trend_detection',
        timeRange,
        bucketType: (params.bucketType as 'hourly' | 'daily' | 'weekly' | 'monthly') || 'daily',
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: result.data?.trends,
        count: result.data?.trends?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /temporal-analysis/predictions - Renewal predictions
    // ========================================================================
    if (method === 'GET' && pathname === '/temporal-analysis/predictions') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'renewal_prediction',
        contractId: params.contractId,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      const predictions = result.data?.renewalPredictions || [];

      return createSuccessResponse({
        success: true,
        data: predictions,
        count: predictions.length,
        summary: {
          highProbability: predictions.filter(p => p.probabilityTier === 'high').length,
          mediumProbability: predictions.filter(p => p.probabilityTier === 'medium').length,
          lowProbability: predictions.filter(p => p.probabilityTier === 'low').length,
          unlikely: predictions.filter(p => p.probabilityTier === 'unlikely').length,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /temporal-analysis/anomalies - Anomaly detection
    // ========================================================================
    if (method === 'GET' && pathname === '/temporal-analysis/anomalies') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'anomaly_detection',
        timeRange,
        metricCategory: params.metricCategory,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      const anomalies = result.data?.anomalies || [];

      return createSuccessResponse({
        success: true,
        data: anomalies,
        count: anomalies.length,
        summary: {
          critical: anomalies.filter(a => a.severity === 'critical').length,
          high: anomalies.filter(a => a.severity === 'high').length,
          medium: anomalies.filter(a => a.severity === 'medium').length,
          low: anomalies.filter(a => a.severity === 'low').length,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /temporal-analysis/comprehensive - Full analysis
    // ========================================================================
    if (method === 'GET' && pathname === '/temporal-analysis/comprehensive') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'comprehensive',
        contractId: params.contractId,
        timeRange,
        bucketType: (params.bucketType as 'hourly' | 'daily' | 'weekly' | 'monthly') || 'daily',
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: result.data,
        insights: result.insights,
        rulesApplied: result.rulesApplied,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /temporal-analysis/alerts - Active temporal alerts
    // ========================================================================
    if (method === 'GET' && pathname === '/temporal-analysis/alerts') {
      const supabase = createAdminClient();

      const { data: alerts, error } = await supabase
        .from('temporal_alerts')
        .select('*')
        .eq('enterprise_id', user.enterprise_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return createErrorResponseSync(`Failed to fetch alerts: ${error.message}`, 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: alerts || [],
        count: alerts?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /temporal-analysis/alerts/:id/acknowledge - Acknowledge alert
    // ========================================================================
    const acknowledgeMatch = pathname.match(/^\/temporal-analysis\/alerts\/([a-f0-9-]+)\/acknowledge$/);
    if (method === 'POST' && acknowledgeMatch) {
      const alertId = acknowledgeMatch[1];
      const supabase = createAdminClient();

      const { error } = await supabase
        .from('temporal_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by_user_id: user.id,
        })
        .eq('id', alertId)
        .eq('enterprise_id', user.enterprise_id);

      if (error) {
        return createErrorResponseSync(`Failed to acknowledge alert: ${error.message}`, 500, req);
      }

      return createSuccessResponse({
        success: true,
        message: 'Alert acknowledged',
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /temporal-analysis/aggregate - Trigger metrics aggregation (admin)
    // ========================================================================
    if (method === 'POST' && pathname === '/temporal-analysis/aggregate') {
      // Require admin permissions
      if (!['admin', 'owner'].includes(user.role)) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json().catch(() => ({}));
      const bucketType = body.bucketType || 'daily';
      const startDate = body.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = body.endDate || new Date().toISOString();

      const supabase = createAdminClient();

      const { data, error } = await supabase.rpc('aggregate_temporal_metrics', {
        p_enterprise_id: user.enterprise_id,
        p_bucket_type: bucketType,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        return createErrorResponseSync(`Aggregation failed: ${error.message}`, 500, req);
      }

      return createSuccessResponse({
        success: true,
        message: 'Metrics aggregated successfully',
        metricsCreated: data,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /temporal-analysis/health - Health check
    // ========================================================================
    if (method === 'GET' && pathname === '/temporal-analysis/health') {
      return createSuccessResponse({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);

  } catch (error) {
    console.error('Temporal analysis error:', error);

    if (error instanceof z.ZodError) {
      return createErrorResponseSync(
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        400,
        req
      );
    }

    return createErrorResponseSync(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      req
    );
  }
}

// Serve with middleware wrapper
serve(
  withMiddleware(handleTemporalAnalysis, {
    requireAuth: true,
    rateLimit: true,
    securityMonitoring: true,
    cache: {
      policy: 'analytics', // 10-minute cache for analysis results
    },
  }, 'temporal-analysis')
);
