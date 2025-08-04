import { withMiddleware } from '../_shared/middleware.ts';
import { createUserClient, extractJWT } from '../_shared/supabase.ts';
import { createErrorResponse } from '../_shared/responses.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateRequest } from './middleware/validation.ts';
import { z } from 'zod';
import { TracingManager } from './utils/tracing.ts';
import { getFeatureFlag } from './config/index.ts';
import { TraceViewer } from './utils/trace-viewer.ts';
import { DonnaInterface, DonnaFeedback } from './donna/interface.ts';

// Import local agent implementations
import { SecretaryAgent } from './agents/secretary.ts';
import { FinancialAgent } from './agents/financial.ts';
import { LegalAgent } from './agents/legal.ts';
import { AnalyticsAgent } from './agents/analytics.ts';
import { VendorAgent } from './agents/vendor.ts';
import { NotificationsAgent } from './agents/notifications.ts';
import { ManagerAgent } from './agents/manager.ts';
import { WorkflowAgent } from './agents/workflow.ts';
import { ProcessingResult } from './agents/base.ts';
import { ComplianceAgent } from './agents/compliance.ts';
import { RiskAssessmentAgent } from './agents/risk-assessment.ts';
import { IntegrationAgent } from './agents/integration.ts';
import { DataQualityAgent } from './agents/data-quality.ts';

// Agent registry
const AGENTS = {
  secretary: SecretaryAgent,
  financial: FinancialAgent,
  legal: LegalAgent,
  analytics: AnalyticsAgent,
  vendor: VendorAgent,
  notifications: NotificationsAgent,
  manager: ManagerAgent,
  workflow: WorkflowAgent,
  compliance: ComplianceAgent,
  'risk-assessment': RiskAssessmentAgent,
  integration: IntegrationAgent,
  'data-quality': DataQualityAgent,
};

// Request schemas
const ProcessRequestSchema = z.object({
  agentType: z.enum(['secretary', 'financial', 'legal', 'analytics', 'vendor', 'notifications', 'manager', 'workflow', 'compliance', 'risk-assessment', 'integration', 'data-quality']),
  data: z.unknown(),
  context: z.object({
    priority: z.number().min(1).max(10).optional(),
    userId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
});

const QueueTaskSchema = z.object({
  taskType: z.string(),
  agentType: z.enum(['secretary', 'financial', 'legal', 'analytics', 'vendor', 'notifications', 'manager', 'workflow', 'compliance', 'risk-assessment', 'integration', 'data-quality']),
  priority: z.number().min(1).max(10).default(5),
  data: z.unknown(),
  context: z.any().optional(),
  contractId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const ProcessQueueSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  agentType: z.enum(['secretary', 'financial', 'legal', 'analytics', 'vendor', 'notifications', 'manager', 'workflow', 'compliance', 'risk-assessment', 'integration', 'data-quality']).optional(),
});

const DonnaQuerySchema = z.object({
  type: z.string(),
  context: z.record(z.unknown()),
});

const DonnaFeedbackSchema = z.object({
  queryId: z.string(),
  success: z.boolean(),
  metrics: z.record(z.unknown()).optional(),
  userSatisfaction: z.number().min(0).max(1).optional(),
});

export default withMiddleware(async (context) => {
  const { req, user } = context;
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return createErrorResponse('Missing authorization header', 401, req);
  }
  const token = extractJWT(authHeader);
  const supabase = createUserClient(token);

  try {
    if (!user) {
      return createErrorResponse('Authentication required', 401, req);
    }

    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user context
    const { data: userData } = await supabase
      .from('users')
      .select('id, enterprise_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Initialize agents if needed
    if (method === 'POST' && pathname === '/local-agents/initialize') {
      await initializeLocalAgents(supabase, userData.enterprise_id);

      return new Response(
        JSON.stringify({ message: 'Local agents initialized' }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Direct agent processing (synchronous)
    if (method === 'POST' && pathname === '/local-agents/process') {
      const { data, errors } = await validateRequest(ProcessRequestSchema, req);

      if (errors || !data) {
        return new Response(JSON.stringify({ errors: errors || ['Invalid request data'] }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const AgentClass = AGENTS[data.agentType];
      const agent = new AgentClass(supabase, userData.enterprise_id);

      // Check user permissions
      const requiredRole = getRequiredRoleForAgent(data.agentType);
      const hasPermission = await checkUserPermission(supabase, userData, requiredRole);

      if (!hasPermission) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      // Get Donna insights before processing (if enabled)
      let donnaInsights = null;
      if (getFeatureFlag('ENABLE_DONNA_AI')) {
        try {
          const donna = new DonnaInterface(supabase);
          donnaInsights = await donna.query({
            type: data.agentType,
            context: {
              task_type: data.agentType,
              data_summary: generateDataSummary(data.data),
              user_role: userData.role,
              ...data.context,
            },
            enterpriseId: userData.enterprise_id,
            userId: userData.id,
          });
          console.log(`Retrieved ${donnaInsights.insights.length} insights from Donna for ${data.agentType}`);
        } catch (error) {
          console.error('Error querying Donna AI:', error);
        }
      }

      // Process with Donna insights in context
      const result = await agent.process(data.data, {
        ...data.context,
        userId: userData.id,
        donnaInsights,
      });

      // Create audit log
      await createAuditLog(supabase, {
        action: 'agent_process',
        entity_type: 'agent',
        entity_id: data.agentType,
        user_id: userData.id,
        enterprise_id: userData.enterprise_id,
        metadata: {
          success: result.success,
          processingTime: result.processingTime,
          insightCount: result.insights.length,
        },
      });

      return new Response(JSON.stringify(result), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Queue task for async processing
    if (method === 'POST' && pathname === '/local-agents/queue') {
      const { data, errors } = await validateRequest(QueueTaskSchema, req);

      if (errors || !data) {
        return new Response(JSON.stringify({ errors: errors || ['Invalid request data'] }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Get agent ID
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('type', data.agentType)
        .eq('enterprise_id', userData.enterprise_id)
        .eq('is_active', true)
        .single();

      if (!agent) {
        return new Response(JSON.stringify({ error: 'Agent not found' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      // Create task
      const { data: task, error } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: data.taskType,
          priority: data.priority,
          status: 'pending',
          payload: {
            data: data.data,
            context: {
              ...data.context,
              userId: userData.id,
            },
          },
          contract_id: data.contractId,
          vendor_id: data.vendorId,
          enterprise_id: userData.enterprise_id,
          scheduled_at: data.scheduledAt || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {throw error;}

      return new Response(
        JSON.stringify({
          taskId: task.id,
          status: 'queued',
          priority: task.priority,
          scheduledAt: task.scheduled_at,
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 202,
        },
      );
    }

    // Process queued tasks (worker endpoint)
    if (method === 'POST' && pathname === '/local-agents/process-queue') {
      // Verify this is called by a service role or scheduled job
      const isServiceRole = req.headers.get('X-Service-Role') === 'true';
      if (!isServiceRole && userData.role !== 'admin' && userData.role !== 'owner') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      const { data, errors } = await validateRequest(ProcessQueueSchema, req);

      if (errors || !data) {
        return new Response(JSON.stringify({ errors: errors || ['Invalid request data'] }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Get pending tasks
      let query = supabase
        .from('agent_tasks')
        .select(`
          *,
          agent:agents!agent_id(type)
        `)
        .eq('status', 'pending')
        .eq('enterprise_id', userData.enterprise_id)
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at')
        .limit(data.limit || 10);

      if (data.agentType) {
        query = query.eq('agent.type', data.agentType);
      }

      const { data: tasks, error } = await query;

      if (error) {throw error;}

      if (!tasks || tasks.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No pending tasks', processed: 0 }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      // Process tasks
      const results = await Promise.all(
        tasks.map(async (task) => {
          try {
            const agentType = task.agent.type;
            const AgentClass = AGENTS[agentType as keyof typeof AGENTS];

            if (!AgentClass) {
              throw new Error(`No local implementation for agent type: ${agentType}`);
            }

            const agent = new AgentClass(supabase, task.enterprise_id);
            return await agent.processTask(task.id);
          } catch (error) {
            console.error(`Error processing task ${task.id}:`, error);
            return {
              taskId: task.id,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }),
      );

      const successCount = results.filter(r => r.success).length;

      return new Response(
        JSON.stringify({
          processed: tasks.length,
          successful: successCount,
          failed: tasks.length - successCount,
          results: results.map(r => ({
            taskId: 'taskId' in r ? r.taskId : (r as ProcessingResult).metadata?.taskId,
            success: r.success,
            processingTime: 'processingTime' in r ? r.processingTime : undefined,
            insightCount: 'insights' in r ? (r as ProcessingResult).insights?.length || 0 : 0,
            error: 'error' in r ? r.error : (r as ProcessingResult).metadata?.error,
          })),
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Get task status
    if (method === 'GET' && pathname.match(/^\/local-agents\/task\/[a-f0-9-]+$/)) {
      const taskId = pathname.split('/')[3];

      const { data: task, error } = await supabase
        .from('agent_tasks')
        .select(`
          *,
          agent:agents!agent_id(name, type)
        `)
        .eq('id', taskId)
        .eq('enterprise_id', userData.enterprise_id)
        .single();

      if (error || !task) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      return new Response(JSON.stringify(task), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get agent metrics
    if (method === 'GET' && pathname === '/local-agents/metrics') {
      const params = Object.fromEntries(url.searchParams);
      const { agentType, timeRange = '24h' } = params;

      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      const since = new Date(Date.now() - (timeRanges[timeRange as keyof typeof timeRanges] || timeRanges['24h'])).toISOString();

      let query = supabase
        .from('agent_metrics')
        .select('*')
        .eq('enterprise_id', userData.enterprise_id)
        .gte('timestamp', since);

      if (agentType) {
        query = query.eq('agent_type', agentType);
      }

      const { data: metrics, error } = await query;

      if (error) {throw error;}

      // Aggregate metrics
      const aggregated = metrics.reduce((acc: any, metric: any) => {
        const type = metric.agent_type;
        if (!acc[type]) {
          acc[type] = {
            totalOperations: 0,
            successCount: 0,
            totalDuration: 0,
            avgDuration: 0,
            successRate: 0,
          };
        }

        acc[type].totalOperations++;
        if (metric.success) {acc[type].successCount++;}
        acc[type].totalDuration += metric.duration;

        return acc;
      }, {});

      // Calculate averages
      for (const type in aggregated) {
        const stats = aggregated[type];
        stats.avgDuration = stats.totalDuration / stats.totalOperations;
        stats.successRate = stats.successCount / stats.totalOperations;
      }

      return new Response(JSON.stringify(aggregated), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Health check endpoint
    if (method === 'GET' && pathname === '/local-agents/health') {
      const health = await checkAgentHealth(supabase, userData.enterprise_id);

      return new Response(JSON.stringify(health), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: health.healthy ? 200 : 503,
      });
    }

    // Trace endpoints
    if (method === 'GET' && pathname.startsWith('/local-agents/traces/')) {
      const traceId = pathname.split('/').pop();
      if (!traceId) {
        return new Response(JSON.stringify({ error: 'Trace ID required' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const tracingManager = new TracingManager(supabase, userData.enterprise_id);
      const spans = await tracingManager.getTrace(traceId);

      const format = url.searchParams.get('format') || 'json';

      if (format === 'tree') {
        const tree = TraceViewer.formatTraceTree(spans, {
          showTags: url.searchParams.get('showTags') === 'true',
          showLogs: url.searchParams.get('showLogs') === 'true',
          showDurations: true,
        });

        return new Response(tree, {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'text/plain' },
          status: 200,
        });
      } else if (format === 'timeline') {
        const timeline = TraceViewer.generateTimeline(spans);

        return new Response(timeline, {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'text/plain' },
          status: 200,
        });
      }
        const stats = TraceViewer.getTraceStats(spans);
        const criticalPath = TraceViewer.findCriticalPath(spans);

        return new Response(JSON.stringify({
          traceId,
          spans,
          stats,
          criticalPath: criticalPath.map(s => ({
            spanId: s.spanId,
            operation: s.operationName,
            service: s.serviceName,
            duration: s.duration,
          })),
        }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        });

    }

    // Trace analysis endpoint
    if (method === 'POST' && pathname === '/local-agents/traces/analyze') {
      const body = await req.json();
      const { traceId } = body;

      if (!traceId) {
        return new Response(JSON.stringify({ error: 'Trace ID required' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { data: analysis } = await supabase
        .rpc('analyze_trace_performance', {
          p_trace_id: traceId,
          p_enterprise_id: userData.enterprise_id,
        });

      return new Response(JSON.stringify(analysis), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Donna AI query endpoint
    if (method === 'POST' && pathname === '/local-agents/donna/query') {
      if (!getFeatureFlag('ENABLE_DONNA_AI')) {
        return new Response(JSON.stringify({ error: 'Donna AI is not enabled' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 503,
        });
      }

      const { data, errors } = await validateRequest(DonnaQuerySchema, req);

      if (errors || !data) {
        return new Response(JSON.stringify({ errors: errors || ['Invalid request data'] }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const donna = new DonnaInterface(supabase);
      const insights = await donna.query({
        type: data.type,
        context: data.context,
        enterpriseId: userData.enterprise_id,
        userId: userData.id,
      });

      return new Response(JSON.stringify(insights), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Donna AI feedback endpoint
    if (method === 'POST' && pathname === '/local-agents/donna/feedback') {
      if (!getFeatureFlag('ENABLE_DONNA_AI')) {
        return new Response(JSON.stringify({ error: 'Donna AI is not enabled' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 503,
        });
      }

      const { data, errors } = await validateRequest(DonnaFeedbackSchema, req);

      if (errors || !data) {
        return new Response(JSON.stringify({ errors: errors || ['Invalid request data'] }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const donna = new DonnaInterface(supabase);
      const feedback: DonnaFeedback = {
        queryId: data.queryId,
        success: data.success,
        ...(data.metrics && { metrics: data.metrics }),
        ...(data.userSatisfaction !== undefined && { userSatisfaction: data.userSatisfaction }),
      };
      await donna.submitFeedback(feedback);

      return new Response(JSON.stringify({ message: 'Feedback submitted successfully' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Donna AI performance metrics endpoint
    if (method === 'GET' && pathname === '/local-agents/donna/metrics') {
      if (!getFeatureFlag('ENABLE_DONNA_AI')) {
        return new Response(JSON.stringify({ error: 'Donna AI is not enabled' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 503,
        });
      }

      const donna = new DonnaInterface(supabase);
      const metrics = await donna.getPerformanceMetrics(userData.enterprise_id);

      return new Response(JSON.stringify(metrics), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Donna AI knowledge stats endpoint
    if (method === 'GET' && pathname === '/local-agents/donna/knowledge') {
      if (!getFeatureFlag('ENABLE_DONNA_AI')) {
        return new Response(JSON.stringify({ error: 'Donna AI is not enabled' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 503,
        });
      }

      const donna = new DonnaInterface(supabase);
      const donnaInstance = donna['donna']; // Access private donna instance
      const stats = await donnaInstance.getKnowledgeStats();

      return new Response(JSON.stringify(stats), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return createErrorResponse('Not found', 404, req);

  } catch (error) {
    console.error('Local agent error:', error);
    return createErrorResponse(
      (error instanceof Error ? error.message : String(error)) || 'Internal server error',
      500,
      req
    );
  }
}, {
  requireAuth: true,
  rateLimit: true,
});

// Generate a summary of data for Donna context
function generateDataSummary(data: unknown): string {
  if (!data) return 'empty';
  
  if (typeof data === 'string') {
    return data.substring(0, 100) + (data.length > 100 ? '...' : '');
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    const summary = keys.slice(0, 5).join(', ');
    return keys.length > 5 ? `${summary}, ...` : summary;
  }
  
  return typeof data;
}

// Initialize local agents in the database
async function initializeLocalAgents(supabase: ReturnType<typeof createUserClient>, enterpriseId: string) {
  // Check if already initialized
  const { data: existingAgents } = await supabase
    .from('agents')
    .select('type')
    .eq('enterprise_id', enterpriseId)
    .eq('is_active', true);

  const existingTypes = new Set(existingAgents?.map((a: { type: string }) => a.type) || []);

  // Get or create system
  let { data: system } = await supabase
    .from('agent_system')
    .select('id')
    .eq('name', 'Pactwise Local Agent System')
    .eq('is_active', true)
    .single();

  if (!system) {
    const { data: newSystem } = await supabase
      .from('agent_system')
      .insert({
        name: 'Pactwise Local Agent System',
        version: '2.0.0',
        config: {
          processingMode: 'local',
          noLLMRequired: true,
          features: ['pattern-matching', 'rule-engine', 'database-functions'],
        },
        capabilities: Object.keys(AGENTS),
      })
      .select()
      .single();

    system = newSystem;
  }

  // Create missing agents
  const agentDefinitions = {
    secretary: {
      name: 'Local Secretary Agent',
      description: 'Pattern-based document processing and data extraction',
      capabilities: ['document_processing', 'data_extraction', 'metadata_generation'],
      config: { timeout: 30000 },
    },
    financial: {
      name: 'Local Financial Agent',
      description: 'Rule-based financial analysis and risk assessment',
      capabilities: ['cost_analysis', 'payment_terms', 'budget_impact', 'roi_calculation'],
      config: { timeout: 45000 },
    },
    legal: {
      name: 'Local Legal Agent',
      description: 'Clause pattern matching and compliance checking',
      capabilities: ['clause_analysis', 'risk_assessment', 'compliance_check'],
      config: { timeout: 60000 },
    },
    analytics: {
      name: 'Local Analytics Agent',
      description: 'SQL-based insights and trend analysis',
      capabilities: ['trend_analysis', 'insights_generation', 'anomaly_detection'],
      config: { timeout: 50000 },
    },
    vendor: {
      name: 'Local Vendor Agent',
      description: 'Vendor evaluation and relationship scoring',
      capabilities: ['vendor_analysis', 'performance_tracking', 'risk_assessment'],
      config: { timeout: 40000 },
    },
    notifications: {
      name: 'Local Notifications Agent',
      description: 'Rule engine for alerts and notification routing',
      capabilities: ['alert_management', 'reminder_generation', 'notification_routing'],
      config: { timeout: 20000 },
    },
    manager: {
      name: 'Local Manager Agent',
      description: 'Task orchestration and workflow coordination',
      capabilities: ['task_routing', 'orchestration', 'priority_management'],
      config: { timeout: 30000 },
    },
    workflow: {
      name: 'Local Workflow Agent',
      description: 'Complex multi-step workflow execution and state management',
      capabilities: ['workflow_orchestration', 'multi_step_execution', 'conditional_branching', 'parallel_processing', 'approval_management', 'state_tracking', 'rollback_handling', 'scheduled_workflows'],
      config: { timeout: 300000 },
    },
    compliance: {
      name: 'Local Compliance Agent',
      description: 'Regulatory compliance checking and audit preparation',
      capabilities: ['regulatory_compliance', 'policy_validation', 'audit_preparation', 'risk_assessment', 'compliance_monitoring', 'certification_tracking', 'compliance_reporting'],
      config: { timeout: 60000 },
    },
    'risk-assessment': {
      name: 'Local Risk Assessment Agent',
      description: 'Comprehensive risk analysis and mitigation planning',
      capabilities: ['contract_risk', 'vendor_risk', 'project_risk', 'compliance_risk', 'financial_risk', 'comprehensive_risk', 'mitigation_planning'],
      config: { timeout: 60000 },
    },
    integration: {
      name: 'Local Integration Agent',
      description: 'External system integration and API management',
      capabilities: ['webhook_receive', 'api_call', 'data_sync', 'batch_integration', 'integration_health', 'configure_integration'],
      config: { timeout: 60000 },
    },
    'data-quality': {
      name: 'Local Data Quality Agent',
      description: 'Data validation, cleaning, and quality assurance',
      capabilities: ['validate', 'clean', 'profile', 'standardize', 'enrich', 'deduplicate', 'quality_assessment'],
      config: { timeout: 45000 },
    },
  };

  for (const [type, definition] of Object.entries(agentDefinitions)) {
    if (!existingTypes.has(type)) {
      await supabase.from('agents').insert({
        ...definition,
        type,
        system_id: system?.id || 'default',
        enterprise_id: enterpriseId,
        is_active: true,
      });
    }
  }
}

// Permission checking
async function checkUserPermission(_supabase: any, user: any, requiredRole: string): Promise<boolean> {
  const roleHierarchy = ['viewer', 'user', 'manager', 'admin', 'owner'];
  const userLevel = roleHierarchy.indexOf(user.role);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);

  return userLevel >= requiredLevel;
}

// Get required role for agent type
function getRequiredRoleForAgent(agentType: string): string {
  const roleMap = {
    secretary: 'user',
    financial: 'user',
    legal: 'manager',
    analytics: 'user',
    vendor: 'user',
    notifications: 'user',
    manager: 'manager',
    workflow: 'manager',
    compliance: 'manager',
    'risk-assessment': 'manager',
    integration: 'manager',
    'data-quality': 'user',
  };

  return roleMap[agentType as keyof typeof roleMap] || 'user';
}

// Create audit log
async function createAuditLog(supabase: any, data: any) {
  await supabase.from('audit_logs').insert(data);
}

// Check agent health
async function checkAgentHealth(supabase: any, enterpriseId: string) {
  const health: any = {
    healthy: true,
    agents: {},
    issues: [],
  };

  // Check each agent type
  for (const agentType of Object.keys(AGENTS)) {
    const { data: agent } = await supabase
      .from('agents')
      .select('id, is_active')
      .eq('type', agentType)
      .eq('enterprise_id', enterpriseId)
      .single();

    if (!agent?.is_active) {
      health.healthy = false;
      health.issues.push(`${agentType} agent not active`);
      health.agents[agentType] = { status: 'inactive' };
      continue;
    }

    // Check recent task failures
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Last hour
    const { count: failureCount } = await supabase
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .eq('status', 'failed')
      .gte('created_at', since);

    // Check processing time
    const { data: metrics } = await supabase
      .from('agent_metrics')
      .select('duration')
      .eq('agent_type', agentType)
      .eq('enterprise_id', enterpriseId)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(10);

    const avgDuration = metrics?.length > 0
      ? metrics.reduce((sum: number, m: any) => sum + m.duration, 0) / metrics.length
      : 0;

    const agentHealth = {
      status: 'healthy',
      recentFailures: failureCount || 0,
      avgResponseTime: avgDuration,
    };

    if (failureCount > 5) {
      health.healthy = false;
      health.issues.push(`${agentType} agent has ${failureCount} recent failures`);
      agentHealth.status = 'unhealthy';
    } else if (avgDuration > 60000) { // > 1 minute
      health.issues.push(`${agentType} agent slow response time: ${avgDuration}ms`);
      agentHealth.status = 'degraded';
    }

    health.agents[agentType] = agentHealth;
  }

  // Check task queue
  const { count: pendingCount } = await supabase
    .from('agent_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('enterprise_id', enterpriseId);

  if (pendingCount > 100) {
    health.issues.push(`High pending task count: ${pendingCount}`);
  }

  health.queueSize = pendingCount || 0;

  return health;
}