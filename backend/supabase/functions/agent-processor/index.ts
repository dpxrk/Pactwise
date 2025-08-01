/// <reference path="../../types/global.d.ts" />
// Serve function is available globally in Deno runtime
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '../_shared/cors.ts';
import { handleError } from '../_shared/errors.ts';
import { verifyAndGetUser } from '../_shared/supabase.ts';
import { AgentTaskProcessor } from '../local-agents/task-processor/index.ts';

// Global task processor instance
let taskProcessor: AgentTaskProcessor | null = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const { method, url } = req;
    const { pathname } = new URL(url);
    const pathParts = pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const user = await verifyAndGetUser(jwt);

    // Check if user is admin or owner
    if (!['admin', 'owner'].includes(user.role)) {
      throw new Error('Insufficient permissions. Admin or owner role required.');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different actions
    switch (action) {
      case 'start':
        return await handleStart(req, supabase, user.enterprise_id);

      case 'stop':
        return await handleStop(req);

      case 'status':
        return await handleStatus(req);

      case 'submit':
        return await handleSubmitTask(req, supabase, user);

      case 'task':
        if (method === 'GET') {
          return await handleGetTask(req, supabase, user.enterprise_id);
        } else if (method === 'DELETE') {
          return await handleCancelTask(req, supabase, user.enterprise_id);
        } else if (method === 'POST') {
          return await handleRetryTask(req, supabase, user.enterprise_id);
        }
        break;

      case 'stats':
        return await handleGetStats(req);

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    throw new Error('Invalid request');

  } catch (error) {
    return handleError(error);
  }
});

// Start the task processor
async function handleStart(req: Request, supabase: any, enterpriseId: string) {
  if (taskProcessor && taskProcessor.running) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Task processor is already running',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Create new processor instance
  taskProcessor = new AgentTaskProcessor(supabase, {
    batchSize: 10,
    pollIntervalMs: 5000,
    maxConcurrentTasks: 5,
    enableMemoryConsolidation: true,
  });

  // Start the processor
  await taskProcessor.start();

  // Log the start event
  await supabase
    .from('audit_logs')
    .insert({
      action: 'agent_processor_started',
      entity_type: 'system',
      entity_id: 'agent_processor',
      metadata: { started_at: new Date().toISOString() },
      enterprise_id: enterpriseId,
    });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Task processor started successfully',
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

// Stop the task processor
async function handleStop(req: Request) {
  if (!taskProcessor) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Task processor is not running',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  await taskProcessor.stop();
  taskProcessor = null;

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Task processor stopped successfully',
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

// Get processor status
async function handleStatus(req: Request) {
  const isRunning = taskProcessor !== null;

  return new Response(
    JSON.stringify({
      success: true,
      status: {
        isRunning,
        startedAt: isRunning ? new Date().toISOString() : null,
      },
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

// Submit a new task
async function handleSubmitTask(req: Request, _supabase: any, user: any) {
  const body = await req.json();
  const { agentType, taskType, payload, priority, contractId, vendorId } = body;

  if (!agentType || !taskType || !payload) {
    throw new Error('Missing required fields: agentType, taskType, payload');
  }

  if (!taskProcessor) {
    throw new Error('Task processor is not running');
  }

  const taskId = await taskProcessor.submitTask(
    agentType,
    taskType,
    payload,
    {
      priority,
      enterpriseId: user.enterprise_id,
      userId: user.id,
      contractId,
      vendorId,
    },
  );

  return new Response(
    JSON.stringify({
      success: true,
      taskId,
      message: 'Task submitted successfully',
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

// Get task details
async function handleGetTask(req: Request, _supabase: any, enterpriseId: string) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get('id');

  if (!taskId) {
    throw new Error('Task ID is required');
  }

  if (!taskProcessor) {
    throw new Error('Task processor is not running');
  }

  const task = await taskProcessor.getTaskStatus(taskId);

  // Verify task belongs to the enterprise
  if (task.enterprise_id !== enterpriseId) {
    throw new Error('Task not found');
  }

  return new Response(
    JSON.stringify({
      success: true,
      task,
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

// Cancel a task
async function handleCancelTask(req: Request, _supabase: any, enterpriseId: string) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get('id');

  if (!taskId) {
    throw new Error('Task ID is required');
  }

  if (!taskProcessor) {
    throw new Error('Task processor is not running');
  }

  // Verify task belongs to the enterprise
  const task = await taskProcessor.getTaskStatus(taskId);
  if (task.enterprise_id !== enterpriseId) {
    throw new Error('Task not found');
  }

  await taskProcessor.cancelTask(taskId);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Task cancelled successfully',
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

// Retry a failed task
async function handleRetryTask(req: Request, _supabase: any, enterpriseId: string) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get('id');

  if (!taskId) {
    throw new Error('Task ID is required');
  }

  if (!taskProcessor) {
    throw new Error('Task processor is not running');
  }

  // Verify task belongs to the enterprise
  const task = await taskProcessor.getTaskStatus(taskId);
  if (task.enterprise_id !== enterpriseId) {
    throw new Error('Task not found');
  }

  await taskProcessor.retryTask(taskId);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Task retry scheduled',
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}

// Get processor statistics
async function handleGetStats(req: Request) {
  if (!taskProcessor) {
    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          isRunning: false,
          processingCount: 0,
          pendingCount: 0,
          completedToday: 0,
          failedToday: 0,
          avgProcessingTime: 0,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const stats = await taskProcessor.getStats();

  return new Response(
    JSON.stringify({
      success: true,
      stats,
    }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
  );
}