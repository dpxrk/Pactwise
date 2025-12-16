/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import {
  createObligationAgent,
  type ObligationData,
} from '../local-agents/agents/obligation.ts';

/**
 * Obligation Management Edge Function
 *
 * Provides comprehensive obligation tracking and management endpoints.
 *
 * Endpoints:
 * - GET /obligation-management/calendar - Get obligations calendar view
 * - GET /obligation-management/upcoming - Get upcoming obligations
 * - GET /obligation-management/overdue - Get overdue obligations
 * - GET /obligation-management/stats - Get obligation statistics
 * - GET /obligation-management/performance - Get performance metrics
 * - GET /obligation-management/health - Get overall health score
 * - GET /obligation-management/:id - Get single obligation details
 * - GET /obligation-management/:id/dependencies - Get dependency graph
 * - GET /obligation-management/:id/cascade-impact - Calculate cascade impact
 * - POST /obligation-management/:id/complete - Record obligation completion
 * - POST /obligation-management/:id/escalate - Escalate obligation
 * - POST /obligation-management/:id/assign - Assign users to obligation
 * - POST /obligation-management/extract - Extract obligations from text
 * - POST /obligation-management/analyze - Run comprehensive analysis
 */

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TimeRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

const CalendarQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  contractId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

const CompletionBodySchema = z.object({
  completionDate: z.string().optional(),
  evidenceType: z.enum([
    'document', 'email', 'screenshot', 'attestation',
    'external_link', 'system_generated', 'report', 'other'
  ]).optional(),
  evidenceUrl: z.string().url().optional(),
  evidenceDescription: z.string().optional(),
  notes: z.string().optional(),
  requiresVerification: z.boolean().default(false),
});

const EscalationBodySchema = z.object({
  reason: z.string().min(1),
  escalateTo: z.array(z.string().uuid()).optional(),
});

const AssignmentBodySchema = z.object({
  assignments: z.array(z.object({
    userId: z.string().uuid(),
    role: z.enum(['primary', 'backup', 'reviewer', 'approver']),
  })),
});

const ExtractionBodySchema = z.object({
  content: z.string().min(1),
  contractId: z.string().uuid().optional(),
  autoSave: z.boolean().default(false),
});

// ============================================================================
// HANDLER
// ============================================================================

async function handleObligationManagement(context: RequestContext): Promise<Response> {
  const { req, user } = context;
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  // Require authentication for all endpoints
  if (!user) {
    return createErrorResponseSync('Authentication required', 401, req);
  }

  try {
    const supabase = createAdminClient();
    const agent = createObligationAgent(supabase, user.enterprise_id, user.id);

    // Parse query parameters
    const params: Record<string, string | undefined> = {};
    for (const [key, value] of url.searchParams) {
      params[key] = value;
    }

    // ========================================================================
    // GET /obligation-management/calendar - Calendar view
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/calendar') {
      const startDate = params.startDate || new Date().toISOString().split('T')[0];
      const endDate = params.endDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: calendar, error } = await supabase.rpc('get_obligations_calendar', {
        p_enterprise_id: user.enterprise_id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_user_id: params.userId || null,
        p_contract_id: params.contractId || null,
      });

      if (error) {
        return createErrorResponseSync(`Failed to fetch calendar: ${error.message}`, 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: calendar || [],
        count: calendar?.length || 0,
        dateRange: { start: startDate, end: endDate },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/upcoming - Upcoming deadlines
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/upcoming') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'deadline_monitoring',
        userId: params.userId,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: result.data?.upcomingDeadlines || [],
        count: result.data?.upcomingDeadlines?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/overdue - Overdue obligations
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/overdue') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'deadline_monitoring',
        userId: params.userId,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      const overdue = result.data?.overdueObligations || [];

      return createSuccessResponse({
        success: true,
        data: overdue,
        count: overdue.length,
        summary: {
          critical: overdue.filter(o => o.priority === 'critical').length,
          high: overdue.filter(o => o.priority === 'high').length,
          medium: overdue.filter(o => o.priority === 'medium').length,
          low: overdue.filter(o => o.priority === 'low').length,
          totalFinancialImpact: overdue.reduce((sum, o) => sum + (o.financialImpact || 0), 0),
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/stats - Statistics
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/stats') {
      const { data: stats, error } = await supabase.rpc('get_obligation_stats', {
        p_enterprise_id: user.enterprise_id,
        p_user_id: params.userId || null,
      });

      if (error) {
        return createErrorResponseSync(`Failed to fetch stats: ${error.message}`, 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: stats,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/performance - Performance metrics
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/performance') {
      const timeRange = {
        start: params.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: params.end || new Date().toISOString(),
      };

      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'performance_tracking',
        timeRange,
        obligationId: params.obligationId,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: result.data?.performanceMetrics || [],
        count: result.data?.performanceMetrics?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/health - Health score
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/health') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'comprehensive',
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: {
          healthScore: result.data?.healthScore,
          summary: result.data?.summary,
        },
        insights: result.insights,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/escalations - Active escalations
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/escalations') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'escalation_check',
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: result.data?.escalations || [],
        count: result.data?.escalations?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/risks - Risk assessments
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/risks') {
      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'risk_assessment',
        contractId: params.contractId,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      const risks = result.data?.riskAssessments || [];

      return createSuccessResponse({
        success: true,
        data: risks,
        count: risks.length,
        summary: {
          critical: risks.filter(r => r.riskLevel === 'critical').length,
          high: risks.filter(r => r.riskLevel === 'high').length,
          medium: risks.filter(r => r.riskLevel === 'medium').length,
          low: risks.filter(r => r.riskLevel === 'low').length,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/:id - Single obligation details
    // ========================================================================
    const singleMatch = pathname.match(/^\/obligation-management\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleMatch) {
      const obligationId = singleMatch[1];

      const { data: obligation, error } = await supabase
        .from('contract_obligations')
        .select(`
          *,
          contract:contracts(id, title, vendor:vendors(id, name)),
          assignments:obligation_assignments(
            user_id, role, accepted,
            user:users(id, email, full_name)
          ),
          completions:obligation_completions(
            id, completion_date, was_on_time, verified,
            completed_by:users(id, email)
          )
        `)
        .eq('id', obligationId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (error) {
        return createErrorResponseSync(`Obligation not found: ${error.message}`, 404, req);
      }

      // Get health score for this obligation
      const { data: healthScore } = await supabase.rpc('get_obligation_health_score', {
        p_obligation_id: obligationId,
      });

      return createSuccessResponse({
        success: true,
        data: {
          ...obligation,
          healthScore,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/:id/dependencies - Dependency graph
    // ========================================================================
    const depsMatch = pathname.match(/^\/obligation-management\/([a-f0-9-]+)\/dependencies$/);
    if (method === 'GET' && depsMatch) {
      const obligationId = depsMatch[1];

      // Get the obligation's contract first
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('contract_id')
        .eq('id', obligationId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'dependency_analysis',
        contractId: obligation.contract_id,
        obligationId,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Analysis failed', 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: {
          graph: result.data?.dependencyGraph || [],
          cascadeImpact: result.data?.cascadeImpact,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/:id/cascade-impact - Calculate cascade impact
    // ========================================================================
    const cascadeMatch = pathname.match(/^\/obligation-management\/([a-f0-9-]+)\/cascade-impact$/);
    if (method === 'GET' && cascadeMatch) {
      const obligationId = cascadeMatch[1];
      const delayDays = parseInt(params.delayDays || '7', 10);

      const { data: impact, error } = await supabase.rpc('calculate_obligation_cascade_impact', {
        p_obligation_id: obligationId,
        p_delay_days: delayDays,
      });

      if (error) {
        return createErrorResponseSync(`Failed to calculate cascade impact: ${error.message}`, 500, req);
      }

      return createSuccessResponse({
        success: true,
        data: impact,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /obligation-management/:id/complete - Record completion
    // ========================================================================
    const completeMatch = pathname.match(/^\/obligation-management\/([a-f0-9-]+)\/complete$/);
    if (method === 'POST' && completeMatch) {
      const obligationId = completeMatch[1];
      const body = await req.json().catch(() => ({}));
      const validation = CompletionBodySchema.safeParse(body);

      if (!validation.success) {
        return createErrorResponseSync(
          `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}`,
          400,
          req
        );
      }

      const completionData = validation.data;

      // Verify obligation exists and belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id, frequency, due_date, next_due_date')
        .eq('id', obligationId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      // Insert completion record
      const { data: completion, error } = await supabase
        .from('obligation_completions')
        .insert({
          obligation_id: obligationId,
          completion_date: completionData.completionDate || new Date().toISOString().split('T')[0],
          completed_by: user.id,
          evidence_type: completionData.evidenceType,
          evidence_url: completionData.evidenceUrl,
          evidence_description: completionData.evidenceDescription,
          notes: completionData.notes,
          requires_verification: completionData.requiresVerification,
          period_start: obligation.due_date,
          period_end: obligation.next_due_date,
        })
        .select()
        .single();

      if (error) {
        return createErrorResponseSync(`Failed to record completion: ${error.message}`, 500, req);
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        action: 'obligation_completed',
        entity_type: 'obligation',
        entity_id: obligationId,
        changes: {
          completion_id: completion.id,
          completed_by: user.id,
        },
        enterprise_id: user.enterprise_id,
        user_id: user.id,
      });

      return createSuccessResponse({
        success: true,
        message: 'Obligation completion recorded',
        data: completion,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /obligation-management/:id/escalate - Escalate obligation
    // ========================================================================
    const escalateMatch = pathname.match(/^\/obligation-management\/([a-f0-9-]+)\/escalate$/);
    if (method === 'POST' && escalateMatch) {
      const obligationId = escalateMatch[1];
      const body = await req.json().catch(() => ({}));
      const validation = EscalationBodySchema.safeParse(body);

      if (!validation.success) {
        return createErrorResponseSync(
          `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}`,
          400,
          req
        );
      }

      const escalationData = validation.data;

      // Get current escalation level
      const { data: currentEscalation } = await supabase
        .from('obligation_escalations')
        .select('escalation_level')
        .eq('obligation_id', obligationId)
        .order('escalated_at', { ascending: false })
        .limit(1)
        .single();

      const newLevel = (currentEscalation?.escalation_level || 0) + 1;

      // Determine escalation recipients
      let escalateTo = escalationData.escalateTo;
      if (!escalateTo || escalateTo.length === 0) {
        // Auto-determine based on level
        const roleFilter = newLevel >= 3 ? ['owner', 'admin'] : ['admin', 'manager'];
        const { data: recipients } = await supabase
          .from('users')
          .select('id')
          .eq('enterprise_id', user.enterprise_id)
          .in('role', roleFilter)
          .eq('is_active', true);
        escalateTo = recipients?.map(r => r.id) || [];
      }

      // Insert escalation record
      const { data: escalation, error } = await supabase
        .from('obligation_escalations')
        .insert({
          obligation_id: obligationId,
          enterprise_id: user.enterprise_id,
          escalation_level: newLevel,
          escalation_reason: escalationData.reason,
          escalated_by_user_id: user.id,
          escalated_to_user_ids: escalateTo,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return createErrorResponseSync(`Failed to escalate: ${error.message}`, 500, req);
      }

      // Create notifications for escalation recipients
      for (const recipientId of escalateTo) {
        await supabase.from('notifications').insert({
          user_id: recipientId,
          type: 'obligation_escalated',
          title: `Obligation Escalated (Level ${newLevel})`,
          message: `An obligation has been escalated: ${escalationData.reason}`,
          severity: newLevel >= 3 ? 'critical' : 'high',
          data: {
            obligation_id: obligationId,
            escalation_id: escalation.id,
            level: newLevel,
          },
          action_url: `/obligations/${obligationId}`,
          enterprise_id: user.enterprise_id,
        });
      }

      return createSuccessResponse({
        success: true,
        message: `Obligation escalated to level ${newLevel}`,
        data: escalation,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /obligation-management/:id/assign - Assign users
    // ========================================================================
    const assignMatch = pathname.match(/^\/obligation-management\/([a-f0-9-]+)\/assign$/);
    if (method === 'POST' && assignMatch) {
      const obligationId = assignMatch[1];
      const body = await req.json().catch(() => ({}));
      const validation = AssignmentBodySchema.safeParse(body);

      if (!validation.success) {
        return createErrorResponseSync(
          `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}`,
          400,
          req
        );
      }

      const { assignments } = validation.data;

      // Verify obligation exists
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      // Insert/update assignments
      const results = [];
      for (const assignment of assignments) {
        const { data, error } = await supabase
          .from('obligation_assignments')
          .upsert({
            obligation_id: obligationId,
            user_id: assignment.userId,
            role: assignment.role,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
          }, {
            onConflict: 'obligation_id,user_id,role',
          })
          .select()
          .single();

        if (error) {
          console.error('Assignment error:', error);
        } else {
          results.push(data);

          // Create notification
          await supabase.from('notifications').insert({
            user_id: assignment.userId,
            type: 'obligation_assigned',
            title: 'New Obligation Assignment',
            message: `You have been assigned as ${assignment.role} for an obligation`,
            severity: 'medium',
            data: { obligation_id: obligationId, role: assignment.role },
            action_url: `/obligations/${obligationId}`,
            enterprise_id: user.enterprise_id,
          });
        }
      }

      // Recreate reminders for the obligation
      await supabase.rpc('create_obligation_reminders', {
        p_obligation_id: obligationId,
      });

      return createSuccessResponse({
        success: true,
        message: `${results.length} assignment(s) saved`,
        data: results,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /obligation-management/extract - Extract from text
    // ========================================================================
    if (method === 'POST' && pathname === '/obligation-management/extract') {
      const body = await req.json().catch(() => ({}));
      const validation = ExtractionBodySchema.safeParse(body);

      if (!validation.success) {
        return createErrorResponseSync(
          `Validation error: ${validation.error.errors.map(e => e.message).join(', ')}`,
          400,
          req
        );
      }

      const { content, contractId, autoSave } = validation.data;

      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'obligation_extraction',
        content,
        contractId,
      });

      if (!result.success) {
        return createErrorResponseSync(result.error || 'Extraction failed', 500, req);
      }

      const extracted = result.data?.extractedObligations || [];

      // Auto-save if requested
      let savedCount = 0;
      if (autoSave && contractId && extracted.length > 0) {
        for (const obl of extracted) {
          const { error } = await supabase
            .from('contract_obligations')
            .insert({
              enterprise_id: user.enterprise_id,
              contract_id: contractId,
              title: obl.title,
              description: obl.description,
              obligation_type: obl.obligationType,
              party_responsible: obl.partyResponsible,
              frequency: obl.frequency,
              due_date: obl.dueDate,
              priority: obl.suggestedPriority,
              source_text: obl.sourceText,
              source_page: obl.sourcePage,
              extraction_confidence: Math.round(obl.confidence * 100),
              extracted_by: 'ai',
              risk_if_missed: obl.riskIfMissed,
              financial_impact: obl.financialImpact,
              status: 'pending',
              created_by: user.id,
            });

          if (!error) {
            savedCount++;
          }
        }
      }

      return createSuccessResponse({
        success: true,
        data: extracted,
        count: extracted.length,
        savedCount: autoSave ? savedCount : undefined,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /obligation-management/analyze - Comprehensive analysis
    // ========================================================================
    if (method === 'POST' && pathname === '/obligation-management/analyze') {
      const body = await req.json().catch(() => ({}));

      const result = await agent.process({
        enterpriseId: user.enterprise_id,
        analysisType: 'comprehensive',
        contractId: body.contractId,
        userId: body.userId,
        timeRange: body.timeRange,
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
    // POST /obligation-management/daily-monitoring - Trigger daily monitoring
    // ========================================================================
    if (method === 'POST' && pathname === '/obligation-management/daily-monitoring') {
      // Require admin permissions
      if (!['admin', 'owner'].includes(user.role)) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const { data, error } = await supabase.rpc('process_daily_obligation_monitoring', {
        p_enterprise_id: user.enterprise_id,
      });

      if (error) {
        return createErrorResponseSync(`Monitoring failed: ${error.message}`, 500, req);
      }

      return createSuccessResponse({
        success: true,
        message: 'Daily monitoring completed',
        data,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /obligation-management/api-health - Health check
    // ========================================================================
    if (method === 'GET' && pathname === '/obligation-management/api-health') {
      return createSuccessResponse({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);

  } catch (error) {
    console.error('Obligation management error:', error);

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
  withMiddleware(handleObligationManagement, {
    requireAuth: true,
    rateLimit: true,
    securityMonitoring: true,
    cache: {
      policy: 'default', // Short cache for obligation data
    },
  }, 'obligation-management')
);
