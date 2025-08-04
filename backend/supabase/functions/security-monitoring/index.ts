import { withMiddleware } from '../_shared/middleware.ts';
import { createErrorResponse, createSuccessResponse } from '../_shared/responses.ts';
import { SecurityMonitor } from '../_shared/security-monitoring.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

const securityQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d']).optional().default('24h'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  eventType: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const createAlertSchema = z.object({
  eventId: z.string().uuid(),
  channels: z.array(z.enum(['email', 'slack', 'webhook', 'sms'])),
  message: z.string().optional(),
});

const resolveAlertSchema = z.object({
  alertId: z.string().uuid(),
  resolution: z.string().optional(),
});

export default withMiddleware(async (context) => {
  const { req, user } = context;
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const { method } = req;
  const pathSegments = url.pathname.split('/').filter(Boolean);

  // Check user authentication
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, enterprise_id')
    .eq('user_id', user.id)
    .single();

  // Only admins and owners can access security monitoring
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return createErrorResponse('Insufficient permissions', 403);
  }

  const monitor = new SecurityMonitor();

  try {
    switch (method) {
      case 'GET': {
        if (pathSegments[1] === 'dashboard') {
          // GET /security-monitoring/dashboard - Security dashboard metrics
          const timeRange = url.searchParams.get('timeRange') as '1h' | '24h' | '7d' || '24h';
          const metrics = await monitor.getDashboardMetrics(profile.enterprise_id, timeRange);

          return createSuccessResponse({
            metrics,
            timeRange,
            enterprise_id: profile.enterprise_id,
          }, undefined, 200);
        }

        if (pathSegments[1] === 'events') {
          // GET /security-monitoring/events - List security events
          const queryParams = securityQuerySchema.parse({
            timeRange: url.searchParams.get('timeRange'),
            severity: url.searchParams.get('severity'),
            eventType: url.searchParams.get('eventType'),
            page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined,
            limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
          });

          let query = supabase
            .from('security_events')
            .select('*')
            .eq('enterprise_id', profile.enterprise_id)
            .order('created_at', { ascending: false });

          // Apply filters
          if (queryParams.severity) {
            query = query.eq('severity', queryParams.severity);
          }

          if (queryParams.eventType) {
            query = query.eq('event_type', queryParams.eventType);
          }

          // Apply time range filter
          const now = new Date();
          let cutoff: Date;
          switch (queryParams.timeRange) {
            case '1h':
              cutoff = new Date(now.getTime() - 60 * 60 * 1000);
              break;
            case '24h':
              cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case '7d':
              cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
          }
          query = query.gte('created_at', cutoff.toISOString());

          // Apply pagination
          const offset = (queryParams.page - 1) * queryParams.limit;
          query = query.range(offset, offset + queryParams.limit - 1);

          const { data: events, error } = await query;
          if (error) {
            return await createErrorResponse('Failed to fetch security events', 500, req, { error: error.message });
          }

          return createSuccessResponse({
            events,
            pagination: {
              page: queryParams.page,
              limit: queryParams.limit,
              total: events?.length || 0,
            },
            filters: {
              timeRange: queryParams.timeRange,
              severity: queryParams.severity,
              eventType: queryParams.eventType,
            },
          }, undefined, 200);
        }

        if (pathSegments[1] === 'alerts') {
          // GET /security-monitoring/alerts - List security alerts
          const { data: alerts, error } = await supabase
            .from('security_alerts')
            .select(`
              *,
              security_events!inner(enterprise_id)
            `)
            .eq('security_events.enterprise_id', profile.enterprise_id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) {
            return await createErrorResponse('Failed to fetch security alerts', 500, req, { error: error.message });
          }

          return createSuccessResponse({ alerts }, undefined, 200);
        }

        // GET /security-monitoring - General security status
        const summary = await monitor.getDashboardMetrics(profile.enterprise_id, '24h');
        return createSuccessResponse({
          status: 'operational',
          enterprise_id: profile.enterprise_id,
          summary,
        }, undefined, 200);
      }

      case 'POST': {
        if (pathSegments[1] === 'alerts') {
          // POST /security-monitoring/alerts - Create manual alert
          const body = await req.json();
          const { eventId, message } = createAlertSchema.parse(body);

          // Verify the event exists and belongs to this enterprise
          const { data: event, error: eventError } = await supabase
            .from('security_events')
            .select('*')
            .eq('id', eventId)
            .eq('enterprise_id', profile.enterprise_id)
            .single();

          if (eventError || !event) {
            return await createErrorResponse('Security event not found', 404);
          }

          const alertId = await monitor.createManualAlert({
            event_id: eventId,
            alert_type: 'manual',
            severity: event.severity,
            title: `Manual Alert: ${event.title}`,
            message: message || `Manual alert created for security event: ${event.description}`,
            created_by: user.id,
            enterprise_id: profile.enterprise_id,
          });

          return createSuccessResponse({
            alert_id: alertId,
            message: 'Security alert created successfully',
          }, undefined, 201);
        }

        return await createErrorResponse('Invalid endpoint', 404);
      }

      case 'PUT': {
        if (pathSegments[1] === 'alerts' && pathSegments[2] === 'resolve') {
          // PUT /security-monitoring/alerts/resolve - Resolve alert
          const body = await req.json();
          const { alertId, resolution } = resolveAlertSchema.parse(body);

          // Verify the alert exists and user has permission
          const { data: alert, error: alertError } = await supabase
            .from('security_alerts')
            .select(`
              *,
              security_events!inner(enterprise_id)
            `)
            .eq('id', alertId)
            .eq('security_events.enterprise_id', profile.enterprise_id)
            .single();

          if (alertError || !alert) {
            return await createErrorResponse('Security alert not found', 404);
          }

          await monitor.resolveAlert(alertId, user.id, resolution);

          return createSuccessResponse({
            message: 'Security alert resolved successfully',
            alert_id: alertId,
          }, undefined, 200);
        }

        return await createErrorResponse('Invalid endpoint', 404);
      }

      default:
        return await createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Security monitoring error:', error);
    return await createErrorResponse('Internal server error', 500, req,
      process.env.NODE_ENV === 'development' ? { error: error instanceof Error ? error.message : String(error) } : undefined,
    );
  }
}, {
  requireAuth: true,
  rateLimit: true,
  securityMonitoring: true,
});