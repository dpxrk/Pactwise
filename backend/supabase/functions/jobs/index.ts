import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createErrorResponseSync } from '../_shared/responses.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types
interface AgentTask {
  id: string;
  task_type: string;
  payload: Record<string, unknown>;
  retry_count: number;
  status: string;
}

interface ScheduledJob {
  id: string;
  job_name: string;
  handler_function: string;
  parameters: Record<string, unknown>;
  is_active: boolean;
}

// Job processors
const jobProcessors = {
  analyze_contract: processContractAnalysis,
  update_vendor_metrics: processVendorMetrics,
  send_notification: processSendNotification,
  cleanup_expired_data: processCleanupExpiredData,
  consolidate_memory: processMemoryConsolidation,
  generate_insights: processGenerateInsights,
  calculate_analytics: processCalculateAnalytics,
  process_webhook: processWebhook,
};

export default async function handler(req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) {return corsResponse;}

  try {
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // This function should be called by a cron job or internal system
    if (method === 'POST' && pathname === '/jobs/process') {
      const supabase = createAdminClient();

      // Get pending tasks
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .in('status', ['pending', 'failed'])
        .lt('retry_count', 3)
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (error) {throw error;}

      const results = await Promise.allSettled(
        tasks.map((task: AgentTask) => processTask(supabase, task)),
      );

      const processed = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length;
      const failed = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'rejected').length;

      return new Response(
        JSON.stringify({
          processed,
          failed,
          total: tasks.length,
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Process scheduled jobs
    if (method === 'POST' && pathname === '/jobs/scheduled') {
      const supabase = createAdminClient();

      // Get jobs that need to run
      const { data: jobs } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('is_active', true)
        .lte('next_run_at', new Date().toISOString())
        .limit(5);

      const results = jobs ? await Promise.allSettled(
        jobs.map((job: ScheduledJob) => processScheduledJob(supabase, job)),
      ) : [];

      return new Response(
        JSON.stringify({
          processed: results.length,
          jobs: jobs?.map((j: ScheduledJob) => j.job_name) || [],
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Manual job trigger (for testing/admin)
    if (method === 'POST' && pathname === '/jobs/trigger') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return createErrorResponseSync('Unauthorized', 401, req);
      }

      const { jobType, payload } = await req.json();

      if (!jobType || !(jobType in jobProcessors)) {
        return createErrorResponseSync('Unknown job type', 400, req);
      }

      const supabase = createAdminClient();
      const processor = jobProcessors[jobType as keyof typeof jobProcessors];
      const result = await processor(supabase, payload);

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 404,
    });

  } catch (error) {
    console.error('Job processing error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
}

async function processTask(supabase: SupabaseClient, task: AgentTask) {
  try {
    // Update task status
    await supabase
      .from('agent_tasks')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // Process based on task type
    const processor = jobProcessors[task.task_type as keyof typeof jobProcessors];
    if (!processor) {
      throw new Error(`Unknown task type: ${task.task_type}`);
    }

    const result = await processor(supabase, task.payload);

    // Update task as completed
    await supabase
      .from('agent_tasks')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    return result;

  } catch (error) {
    // Update task as failed
    await supabase
      .from('agent_tasks')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        retry_count: task.retry_count + 1,
      })
      .eq('id', task.id);

    throw error;
  }
}

async function processScheduledJob(supabase: SupabaseClient, job: ScheduledJob) {
  const startTime = Date.now();
  let status = 'completed';
  let error = null;
  let output = null;

  try {
    // Execute job handler
    const handler = jobProcessors[job.handler_function as keyof typeof jobProcessors];
    if (handler) {
      output = await handler(supabase, job.parameters);
    } else {
      throw new Error(`Unknown handler: ${job.handler_function}`);
    }
  } catch (err) {
    status = 'failed';
    error = err instanceof Error ? err.message : String(err);
  }

  const duration = Date.now() - startTime;

  // Record execution
  await supabase
    .from('job_execution_history')
    .insert({
      job_id: job.id,
      status,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      output,
      error_message: error,
    });

  // Update job
  await supabase
    .from('scheduled_jobs')
    .update({
      last_run_at: new Date().toISOString(),
      last_run_status: status,
      last_run_error: error,
      next_run_at: calculateNextRun(job.cron_expression),
    })
    .eq('id', job.id);

  return { job: job.job_name, status, duration };
}

// Job Processors

async function processContractAnalysis(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { contract_id, storage_id } = payload;

  // Get contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contract_id)
    .single();

  if (!contract) {throw new Error('Contract not found');}

  // Get file content (simplified - in production, parse PDF/DOC)
  const { data: fileData } = await supabase.storage
    .from('contracts')
    .download(storage_id);

  const fileContent = await fileData.text();

  // Analyze with local AI
  const { localAnalyzer } = await import('../_shared/local-ai.ts');
  const analysis = await localAnalyzer.analyzeContract(fileContent);

  // Update contract
  await supabase
    .from('contracts')
    .update({
      extracted_parties: analysis.parties,
      extracted_start_date: analysis.startDate,
      extracted_end_date: analysis.endDate,
      extracted_payment_schedule: analysis.paymentSchedule,
      extracted_pricing: analysis.pricing,
      extracted_scope: analysis.scope,
      analysis_status: 'completed',
      analyzed_at: new Date().toISOString(),
      analysis_summary: analysis.summary,
      confidence_score: analysis.confidence,
    })
    .eq('id', contract_id);

  return { contract_id, analysis };
}

async function processVendorMetrics(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { vendor_id } = payload;

  await supabase.rpc('update_vendor_performance_metrics', {
    p_vendor_id: vendor_id,
  });

  return { vendor_id, updated: true };
}

async function processSendNotification(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { user_id, type, title, message, data } = payload;

  await supabase
    .from('notifications')
    .insert({
      user_id,
      type,
      title,
      message,
      data,
      enterprise_id: data.enterprise_id,
    });

  // TODO: Send email/push notification

  return { notified: true };
}

async function processCleanupExpiredData(supabase: SupabaseClient, _payload?: unknown) {
  await supabase.rpc('cleanup_expired_data');
  await supabase.rpc('cleanup_auth_data');

  return { cleaned: true };
}

async function processMemoryConsolidation(supabase: SupabaseClient, _payload?: unknown) {
  // Move important short-term memories to long-term
  const { data: memories } = await supabase
    .from('short_term_memory')
    .select('*')
    .gte('importance_score', 0.7)
    .gte('access_count', 3)
    .limit(100);

  if (memories && memories.length > 0) {
    const longTermMemories = memories.map((m: { id: string; content: string; importance: number; memory_type: string }) => ({
      memory_type: m.memory_type,
      content: m.content,
      context: m.context,
      importance_score: m.importance_score,
      embedding: m.embedding,
      user_id: m.user_id,
      enterprise_id: m.enterprise_id,
      consolidated_at: new Date().toISOString(),
    }));

    await supabase
      .from('long_term_memory')
      .insert(longTermMemories);
  }

  return { consolidated: memories?.length || 0 };
}

async function processGenerateInsights(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { enterprise_id } = payload;

  // Get recent data for analysis
  const analytics = await supabase.rpc('get_contract_analytics', {
    p_enterprise_id: enterprise_id,
  });

  // Generate insights based on analytics
  const insights = [];

  if (analytics.contracts.expiring_soon > 5) {
    insights.push({
      agent_id: await getAgentId(supabase, 'analytics'),
      insight_type: 'contract_expiry_trend',
      title: 'High number of expiring contracts',
      description: `${analytics.contracts.expiring_soon} contracts are expiring soon. Consider renewal planning.`,
      severity: 'high',
      confidence_score: 0.9,
      is_actionable: true,
      enterprise_id,
    });
  }

  if (insights.length > 0) {
    await supabase
      .from('agent_insights')
      .insert(insights);
  }

  return { generated: insights.length };
}

async function processCalculateAnalytics(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { enterprise_id } = payload;

  const analytics = await supabase.rpc('get_contract_analytics', {
    p_enterprise_id: enterprise_id,
  });

  // Cache results
  await supabase
    .from('analytics_cache')
    .upsert({
      cache_key: `analytics_${enterprise_id}`,
      cache_type: 'dashboard',
      data: analytics,
      enterprise_id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    });

  return analytics;
}

async function processWebhook(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { webhook_id, event_type, event_data } = payload;

  // Get webhook configuration
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhook_id)
    .single();

  if (!webhook?.is_active) {
    throw new Error('Webhook not found or inactive');
  }

  // Send webhook
  const response = await fetch(webhook.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': webhook.secret,
      ...webhook.headers,
    },
    body: JSON.stringify({
      event: event_type,
      data: event_data,
      timestamp: new Date().toISOString(),
    }),
  });

  const delivery = {
    webhook_id,
    event_type,
    payload: event_data,
    response_status: response.status,
    response_body: await response.text(),
    delivered_at: response.ok ? new Date().toISOString() : null,
  };

  await supabase
    .from('webhook_deliveries')
    .insert(delivery);

  return { delivered: response.ok, status: response.status };
}

async function getAgentId(supabase: SupabaseClient, agentType: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('is_active', true)
    .single();

  return data?.id;
}

function calculateNextRun(cronExpression: string): string {
  // Simplified - in production use a proper cron parser
  // const parts = cronExpression.split(' ');
  const now = new Date();

  if (cronExpression === '0 * * * *') { // hourly
    now.setHours(now.getHours() + 1);
  } else if (cronExpression === '0 0 * * *') { // daily
    now.setDate(now.getDate() + 1);
  } else if (cronExpression === '0 0 * * 0') { // weekly
    now.setDate(now.getDate() + 7);
  } else {
    now.setHours(now.getHours() + 1); // default to hourly
  }

  return now.toISOString();
}