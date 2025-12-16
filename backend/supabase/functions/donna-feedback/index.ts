/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  getFeedbackLoopManager,
  trackRecommendationShown,
  recordUserResponse,
  recordImplementationStatus,
  recordOutcome,
  type RecommendationType,
  type UserResponse,
  type ImplementationStatus,
  type OutcomeStatus,
} from '../local-agents/donna/feedback-loop.ts';
import { processPendingFeedback } from '../local-agents/donna/learning-feedback-processor.ts';

/**
 * Donna Feedback Edge Function
 *
 * API for tracking Donna AI recommendation feedback and outcomes.
 * Used to improve Donna's learning quality through outcome validation.
 *
 * Endpoints:
 * - POST /donna-feedback/track-shown - Track recommendation shown
 * - POST /donna-feedback/record-response - Record user response
 * - POST /donna-feedback/record-implementation - Record implementation status
 * - POST /donna-feedback/submit-outcome - Submit outcome data
 * - GET /donna-feedback/quality-metrics - Get quality metrics dashboard
 * - GET /donna-feedback/tracking/:id - Get tracking record
 * - POST /donna-feedback/process-learning - Trigger learning processing (admin only)
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const RecommendationTypeSchema = z.enum([
  'pattern',
  'best_practice',
  'q_learning',
  'bandit',
  'insight',
  'market_intelligence',
]);

const UserResponseSchema = z.enum([
  'accepted',
  'rejected',
  'modified',
  'ignored',
  'deferred',
]);

const ImplementationStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'abandoned',
  'partial',
]);

const OutcomeStatusSchema = z.enum([
  'success',
  'partial_success',
  'failure',
  'neutral',
  'unknown',
]);

const TrackShownSchema = z.object({
  recommendation: z.object({
    type: RecommendationTypeSchema,
    content: z.record(z.unknown()),
    confidenceScore: z.number().min(0).max(1).optional(),
    predictedOutcome: z.string().optional(),
    sourcePatternId: z.string().uuid().optional(),
    sourceBestPracticeId: z.string().uuid().optional(),
  }),
  context: z.object({
    category: z.string(),
    industry: z.string().optional(),
    sizeCategory: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
  }),
});

const RecordResponseSchema = z.object({
  trackingId: z.string().uuid(),
  response: UserResponseSchema,
  modificationNotes: z.string().optional(),
});

const RecordImplementationSchema = z.object({
  trackingId: z.string().uuid(),
  status: ImplementationStatusSchema,
  progressNotes: z.string().optional(),
});

const SubmitOutcomeSchema = z.object({
  trackingId: z.string().uuid(),
  status: OutcomeStatusSchema,
  value: z.number().optional(),
  valueUnit: z.string().optional(),
  notes: z.string().optional(),
});

const QualityMetricsQuerySchema = z.object({
  bucketType: z.enum(['hourly', 'daily', 'weekly']).optional(),
  recommendationType: RecommendationTypeSchema.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

// ============================================================================
// HANDLER
// ============================================================================

async function handleDonnaFeedback(context: RequestContext): Promise<Response> {
  const { req, user } = context;
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  try {
    // ========================================================================
    // POST /donna-feedback/track-shown - Track recommendation shown
    // ========================================================================
    if (method === 'POST' && pathname === '/donna-feedback/track-shown') {
      const body = await req.json();
      const validated = TrackShownSchema.parse(body);

      const trackingId = await trackRecommendationShown(
        validated.recommendation as { type: RecommendationType; content: Record<string, unknown>; confidenceScore?: number; predictedOutcome?: string; sourcePatternId?: string; sourceBestPracticeId?: string },
        validated.context
      );

      return createSuccessResponse({
        success: true,
        trackingId,
        message: 'Recommendation tracked successfully',
      }, undefined, 201, req);
    }

    // ========================================================================
    // POST /donna-feedback/record-response - Record user response
    // ========================================================================
    if (method === 'POST' && pathname === '/donna-feedback/record-response') {
      const body = await req.json();
      const validated = RecordResponseSchema.parse(body);

      await recordUserResponse(
        validated.trackingId,
        validated.response as UserResponse,
        validated.modificationNotes
      );

      return createSuccessResponse({
        success: true,
        message: 'Response recorded successfully',
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /donna-feedback/record-implementation - Record implementation status
    // ========================================================================
    if (method === 'POST' && pathname === '/donna-feedback/record-implementation') {
      const body = await req.json();
      const validated = RecordImplementationSchema.parse(body);

      await recordImplementationStatus(
        validated.trackingId,
        validated.status as ImplementationStatus,
        validated.progressNotes
      );

      return createSuccessResponse({
        success: true,
        message: 'Implementation status recorded successfully',
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /donna-feedback/submit-outcome - Submit outcome data
    // ========================================================================
    if (method === 'POST' && pathname === '/donna-feedback/submit-outcome') {
      const body = await req.json();
      const validated = SubmitOutcomeSchema.parse(body);

      await recordOutcome(validated.trackingId, {
        status: validated.status as OutcomeStatus,
        value: validated.value,
        valueUnit: validated.valueUnit,
        notes: validated.notes,
      });

      return createSuccessResponse({
        success: true,
        message: 'Outcome recorded successfully',
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /donna-feedback/quality-metrics - Get quality metrics
    // ========================================================================
    if (method === 'GET' && pathname === '/donna-feedback/quality-metrics') {
      const params: Record<string, string | undefined> = {};
      for (const [key, value] of url.searchParams) {
        params[key] = value;
      }

      // Parse and validate query params
      const validated = QualityMetricsQuerySchema.parse({
        bucketType: params.bucketType,
        recommendationType: params.recommendationType,
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit ? parseInt(params.limit, 10) : undefined,
      });

      const manager = getFeedbackLoopManager();
      const metrics = await manager.getQualityMetrics({
        bucketType: validated.bucketType,
        recommendationType: validated.recommendationType as RecommendationType | undefined,
        startTime: validated.startTime ? new Date(validated.startTime) : undefined,
        endTime: validated.endTime ? new Date(validated.endTime) : undefined,
        limit: validated.limit,
      });

      return createSuccessResponse({
        success: true,
        metrics,
        count: metrics.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /donna-feedback/summary - Get summary metrics
    // ========================================================================
    if (method === 'GET' && pathname === '/donna-feedback/summary') {
      const manager = getFeedbackLoopManager();
      const summary = await manager.getSummaryMetrics();

      return createSuccessResponse({
        success: true,
        summary,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /donna-feedback/tracking/:id - Get tracking record
    // ========================================================================
    const trackingMatch = pathname.match(/^\/donna-feedback\/tracking\/([a-f0-9-]+)$/);
    if (method === 'GET' && trackingMatch) {
      const trackingId = trackingMatch[1];
      const manager = getFeedbackLoopManager();
      const record = await manager.getTrackingRecord(trackingId);

      if (!record) {
        return createErrorResponseSync('Tracking record not found', 404, req);
      }

      // Get event history
      const events = await manager.getEventHistory(trackingId);

      return createSuccessResponse({
        success: true,
        record,
        events,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /donna-feedback/process-learning - Trigger learning processing (admin only)
    // ========================================================================
    if (method === 'POST' && pathname === '/donna-feedback/process-learning') {
      // Require authentication and admin role
      if (!user) {
        return createErrorResponseSync('Authentication required', 401, req);
      }

      if (!['admin', 'owner'].includes(user.role)) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const result = await processPendingFeedback();

      return createSuccessResponse({
        success: true,
        result,
        message: 'Learning processing completed',
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /donna-feedback/health - Health check
    // ========================================================================
    if (method === 'GET' && pathname === '/donna-feedback/health') {
      return createSuccessResponse({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);

  } catch (error) {
    console.error('Donna feedback error:', error);

    // Handle Zod validation errors
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
  withMiddleware(handleDonnaFeedback, {
    requireAuth: false, // Some endpoints are public, auth checked per-endpoint
    rateLimit: true,
    securityMonitoring: true,
    cache: {
      skipCache: true, // Feedback endpoints shouldn't be cached
    },
  }, 'donna-feedback')
);
