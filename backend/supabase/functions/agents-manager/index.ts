/// <reference path="../../types/global.d.ts" />
// Serve function is available globally in Deno runtime
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
// Configuration and local AI may be used in future implementations
// import { config } from '../_shared/config.ts';
// import { localChatAgent } from '../_shared/local-ai.ts';

interface OrchestrationStep {
  stepId: string;
  agentType: string;
  taskType: string;
  description: string;
  dependencies: string[];
  estimatedDuration: number;
  priority?: number;
}

interface OrchestrationPlan {
  steps: OrchestrationStep[];
  estimatedDuration: number;
  parallelizable: OrchestrationStep[];
  sequential: OrchestrationStep[];
}

interface AgentInfo {
  agent: string;
  taskType?: string;
  role?: string;
  dependencies?: string[];
  estimatedDuration?: number;
}

interface TaskAnalysis {
  requestType?: string;
  requiredAgents: AgentInfo[];
  complexity: string;
  estimatedDuration: number;
  estimatedTime?: number;
  dependencies: Record<string, string[]>;
  riskFactors?: string[];
  rawAnalysis?: string;
}

interface TaskItem {
  id: string;
  status: string;
  priority: number;
  payload?: unknown;
  result?: unknown;
  error?: Error | null;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

// Removed OpenAI - using local agents

// Manager Agent - Orchestrates all other agents
export const MANAGER_AGENT_PROMPT = `You are the Manager Agent, responsible for orchestrating and coordinating all other agents in the Pactwise system. Your role is to:

1. Analyze incoming requests and determine which agents should handle them
2. Break down complex tasks into subtasks for different agents
3. Coordinate multi-agent workflows
4. Monitor task progress and handle failures
5. Optimize task routing based on agent performance and workload

Available agents and their capabilities:
- Secretary Agent: Document processing, OCR, metadata extraction, initial analysis
- Financial Agent: Cost analysis, payment terms, budget impact, financial risk assessment
- Legal Agent: Contract clause analysis, compliance checking, risk assessment, legal recommendations
- Analytics Agent: Trend analysis, predictive insights, anomaly detection, reporting
- Vendor Agent: Vendor performance analysis, relationship scoring, vendor recommendations
- Notifications Agent: Alert management, notification routing, escalation handling

When analyzing a request, consider:
- Task complexity and required expertise
- Agent availability and current workload
- Dependencies between tasks
- Priority and urgency
- Historical performance data`;

serve(async (req:Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {return corsResponse;}

  try {
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    if (method === 'POST' && pathname === '/agents-manager/analyze') {
      const { request, context, priority = 5 } = await req.json();

      // Analyze request with Manager Agent
      const analysis = await analyzeRequest(request, context);

      // Create orchestration plan
      const plan = await createOrchestrationPlan(analysis, priority);

      return new Response(
        JSON.stringify({
          analysis,
          plan,
          estimatedDuration: plan.estimatedDuration,
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    if (method === 'POST' && pathname === '/agents-manager/orchestrate') {
      const { taskId, request, context, priority = 5 } = await req.json();
      const supabase = createSupabaseClient();

      // Get or create orchestration session
      const orchestrationId = taskId || crypto.randomUUID();

      // Analyze and create plan
      const analysis = await analyzeRequest(request, context);
      const plan = await createOrchestrationPlan(analysis, priority);

      // Create main orchestration task
      const { data: mainTask } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: await getAgentId(supabase, 'manager'),
          task_type: 'orchestration',
          priority,
          status: 'processing',
          payload: {
            orchestrationId,
            request,
            context,
            plan,
          },
          enterprise_id: context.enterprise_id,
        })
        .select()
        .single();

      // Create subtasks for each agent
      const subtasks = await createSubtasks(supabase, plan, orchestrationId, context.enterprise_id);

      // Start processing high-priority tasks immediately
      if (priority >= 8) {
        await processHighPriorityTasks(supabase, subtasks);
      }

      return new Response(
        JSON.stringify({
          orchestrationId,
          mainTaskId: mainTask.id,
          subtasks: subtasks.map(t => ({ id: t.id, agent: t.agent_type, status: t.status })),
          plan,
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    if (method === 'GET' && pathname.match(/^\/agents-manager\/status\/[a-f0-9-]+$/)) {
      const orchestrationId = pathname.split('/')[3];
      const supabase = createSupabaseClient();

      // Get orchestration status
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('payload->>orchestrationId', orchestrationId)
        .order('created_at');

      if (!tasks || tasks.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Orchestration not found' }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 404,
          },
        );
      }

      const mainTask = tasks.find((t: TaskItem & {task_type: string}) => t.task_type === 'orchestration');
      const subtasks = tasks.filter((t: TaskItem & {task_type: string}) => t.task_type !== 'orchestration');

      const status = {
        orchestrationId,
        status: calculateOverallStatus(subtasks),
        progress: calculateProgress(subtasks),
        mainTask: {
          id: mainTask?.id,
          status: mainTask?.status,
          startedAt: mainTask?.started_at,
          completedAt: mainTask?.completed_at,
        },
        subtasks: subtasks.map((t: TaskItem & {task_type: string, agent_type?: string}) => ({
          id: t.id,
          agentType: t.payload.agentType,
          status: t.status,
          result: t.result,
          error: t.error,
          startedAt: t.started_at,
          completedAt: t.completed_at,
        })),
        timeline: generateTimeline(tasks),
      };

      return new Response(
        JSON.stringify(status),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    if (method === 'POST' && pathname === '/agents-manager/rebalance') {
      const supabase = createSupabaseClient();

      // Get agent workloads
      const workloads = await getAgentWorkloads(supabase);

      // Identify overloaded agents
      const overloaded = workloads.filter((w: { taskCount: number; capacity: number; agentType?: string }) => w.taskCount > w.capacity * 0.8);
      const underutilized = workloads.filter((w: { taskCount: number; capacity: number; agentType?: string }) => w.taskCount < w.capacity * 0.3);

      // Rebalance tasks
      let rebalanced = 0;
      for (const agent of overloaded) {
        const tasksToMove = Math.floor((agent.taskCount - agent.capacity * 0.6) / 2);

        // Find tasks that can be reassigned
        const { data: reassignableTasks } = await supabase
          .from('agent_tasks')
          .select('*')
          .eq('agent_id', agent.agentId)
          .eq('status', 'pending')
          .in('task_type', ['analyze_contract', 'process_document', 'generate_insight'])
          .limit(tasksToMove);

        // Reassign to underutilized agents
        for (const task of reassignableTasks || []) {
          const targetAgent = underutilized.find((a: { taskCount: number; capacity: number; agentType: string }) =>
            a.capabilities.includes(task.task_type) &&
            a.taskCount < a.capacity * 0.7,
          );

          if (targetAgent) {
            await supabase
              .from('agent_tasks')
              .update({
                agent_id: targetAgent.agentId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', task.id);

            targetAgent.taskCount++;
            rebalanced++;
          }
        }
      }

      return new Response(
        JSON.stringify({
          workloads,
          overloadedAgents: overloaded.length,
          underutilizedAgents: underutilized.length,
          tasksRebalanced: rebalanced,
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      },
    );

  } catch (error: unknown) {
    console.error('Manager Agent error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

async function analyzeRequest(request: string, _context: Record<string, unknown>): Promise<TaskAnalysis> {
  // Local rule-based analysis
  const requestLower = request.toLowerCase();
  
  // Determine request type and complexity
  let requestType = 'general';
  let complexity = 'medium';
  let requiredAgents: string[] = [];
  let estimatedDuration = 300; // 5 minutes default
  
  if (requestLower.includes('contract') || requestLower.includes('agreement')) {
    requestType = 'contract_analysis';
    requiredAgents = ['secretary', 'legal'];
    estimatedDuration = 600; // 10 minutes
    
    if (requestLower.includes('payment') || requestLower.includes('financial')) {
      requiredAgents.push('financial');
      estimatedDuration = 900; // 15 minutes
    }
  }
  
  if (requestLower.includes('vendor') || requestLower.includes('supplier')) {
    requestType = 'vendor_management';
    requiredAgents = ['vendor', 'financial'];
    estimatedDuration = 450; // 7.5 minutes
  }
  
  if (requestLower.includes('budget') || requestLower.includes('cost') || requestLower.includes('financial')) {
    if (!requiredAgents.includes('financial')) {
      requiredAgents.push('financial');
    }
  }
  
  if (requestLower.includes('legal') || requestLower.includes('compliance') || requestLower.includes('risk')) {
    if (!requiredAgents.includes('legal')) {
      requiredAgents.push('legal');
    }
  }
  
  // Determine complexity
  if (requestLower.includes('complex') || requestLower.includes('urgent') || requiredAgents.length > 2) {
    complexity = 'high';
    estimatedDuration *= 1.5;
  } else if (requiredAgents.length === 1) {
    complexity = 'low';
    estimatedDuration *= 0.7;
  }
  
  // Default to secretary if no specific agents identified
  if (requiredAgents.length === 0) {
    requiredAgents = ['secretary'];
  }

  const analysisText = `Request Type: ${requestType}\nComplexity: ${complexity}\nRequired Agents: ${requiredAgents.join(', ')}\nEstimated Duration: ${Math.round(estimatedDuration / 60)} minutes`;

  // Parse the analysis to extract structured data
  return {
    requestType: extractRequestType(analysisText),
    complexity: extractComplexity(analysisText),
    requiredAgents: extractRequiredAgents(analysisText),
    dependencies: extractDependencies(analysisText),
    estimatedDuration: Math.round(estimatedDuration / 60),
    estimatedTime: extractEstimatedTime(analysisText),
    riskFactors: extractRiskFactors(analysisText),
    rawAnalysis: analysisText,
  };
}

async function createOrchestrationPlan(analysis: TaskAnalysis, priority: number): Promise<OrchestrationPlan> {
  const plan: OrchestrationPlan = {
    steps: [],
    estimatedDuration: 0,
    parallelizable: [],
    sequential: [],
  };

  // Create steps based on required agents
  for (const agentInfo of analysis.requiredAgents) {
    const step: OrchestrationStep = {
      stepId: crypto.randomUUID(),
      agentType: agentInfo.agent,
      taskType: agentInfo.taskType || 'process',
      description: agentInfo.role || 'Process task',
      dependencies: agentInfo.dependencies || [],
      estimatedDuration: agentInfo.estimatedDuration || 60,
      priority: calculateStepPriority(agentInfo, priority),
    };

    plan.steps.push(step);

    // Determine if step can be parallelized
    if (step.dependencies.length === 0) {
      plan.parallelizable.push(step);
    } else {
      plan.sequential.push(step);
    }
  }

  // Calculate total estimated duration
  plan.estimatedDuration = calculateTotalDuration(plan);

  return plan;
}

async function createSubtasks(supabase: import('@supabase/supabase-js').SupabaseClient, plan: OrchestrationPlan, orchestrationId: string, enterpriseId: string) {
  const subtasks: unknown[] = [];

  for (const step of plan.steps) {
    const agentId = await getAgentId(supabase, step.agentType);

    const { data: task } = await supabase
      .from('agent_tasks')
      .insert({
        agent_id: agentId,
        task_type: step.taskType,
        priority: step.priority || 5,
        status: 'pending',
        payload: {
          orchestrationId,
          stepId: step.stepId,
          agentType: step.agentType,
          description: step.description,
          dependencies: step.dependencies,
        },
        enterprise_id: enterpriseId,
      })
      .select()
      .single();

    if (task) {
      subtasks.push(task);
    }
  }

  return subtasks;
}

async function processHighPriorityTasks(supabase: import('@supabase/supabase-js').SupabaseClient, tasks: TaskItem[]) {
  // Process parallelizable tasks immediately
  const parallelTasks = tasks.filter(t =>
    !t.payload?.dependencies || t.payload.dependencies.length === 0,
  );

  await Promise.all(
    parallelTasks.map(task =>
      supabase
        .from('agent_tasks')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', task.id),
    ),
  );
}

async function getAgentWorkloads(supabase: import('@supabase/supabase-js').SupabaseClient): Promise<AgentWorkload[]> {
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('is_active', true);

  if (!agents) {
    return [];
  }

  const workloads = await Promise.all(
    agents.map(async (agent: { id: string; type: string }) => {
      const { count } = await supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .in('status', ['pending', 'processing']);

      return {
        agentId: agent.id,
        agentType: agent.type,
        capabilities: agent.capabilities || [],
        taskCount: count || 0,
        capacity: agent.config?.maxConcurrentTasks || 10,
      };
    }),
  );

  return workloads;
}

// Helper functions
function extractRequestType(analysis: string): string {
  const patterns = {
    contract_analysis: /contract\s+analysis|analyze\s+contract/i,
    vendor_evaluation: /vendor\s+evaluation|assess\s+vendor/i,
    compliance_check: /compliance\s+check|regulatory\s+review/i,
    financial_analysis: /financial\s+analysis|cost\s+analysis/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(analysis)) {return type;}
  }

  return 'general_processing';
}

function extractComplexity(analysis: string): string {
  if (/high\s+complexity|complex|complicated/i.test(analysis)) {return 'high';}
  if (/medium\s+complexity|moderate/i.test(analysis)) {return 'medium';}
  return 'low';
}

function extractRequiredAgents(analysis: string): AgentInfo[] {
  const agents: AgentInfo[] = [];
  const agentPatterns = {
    secretary: /secretary\s+agent/i,
    financial: /financial\s+agent/i,
    legal: /legal\s+agent/i,
    analytics: /analytics\s+agent/i,
    vendor: /vendor\s+agent/i,
    notifications: /notifications?\s+agent/i,
  };

  for (const [agent, pattern] of Object.entries(agentPatterns)) {
    if (pattern.test(analysis)) {
      agents.push({
        agent,
        role: extractAgentRole(analysis, agent),
        taskType: getDefaultTaskType(agent),
      });
    }
  }

  return agents.length > 0 ? agents : [{ agent: 'secretary', role: 'general processing', taskType: getDefaultTaskType('secretary') }];
}

function extractAgentRole(analysis: string, agent: string): string {
  // Extract the specific role mentioned for this agent
  const rolePattern = new RegExp(`${agent}\\s+agent[^.]*?(?:to|will|should)\\s+([^.]+)`, 'i');
  const match = analysis.match(rolePattern);
  return match ? match[1].trim() : `${agent} processing`;
}

function extractDependencies(analysis: string): Record<string, string[]> {
  // Simple dependency extraction - can be enhanced
  const dependencies: Record<string, string[]> = {};
  if (/after|following|once|then/i.test(analysis)) {
    // Parse sequential dependencies
    dependencies.sequential = ['previous_task'];
  }
  return dependencies;
}

function extractEstimatedTime(analysis: string): number {
  const timeMatch = analysis.match(/(\d+)\s*(minutes?|hours?|seconds?)/i);
  if (timeMatch) {
    const value = parseInt(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();
    if (unit.includes('hour')) {return value * 60;}
    if (unit.includes('second')) {return value / 60;}
    return value;
  }
  return 10; // Default 10 minutes
}

function extractRiskFactors(analysis: string): string[] {
  const risks: string[] = [];
  if (/high\s+value|significant\s+financial/i.test(analysis)) {
    risks.push('high_financial_impact');
  }
  if (/compliance|regulatory/i.test(analysis)) {
    risks.push('compliance_risk');
  }
  if (/urgent|immediate|critical/i.test(analysis)) {
    risks.push('time_sensitive');
  }
  return risks;
}

function calculateStepPriority(agentInfo: AgentInfo, basePriority: number): number {
  let priority = basePriority;

  // Adjust based on agent type
  if (agentInfo.agent === 'legal' || agentInfo.agent === 'financial') {
    priority += 1;
  }

  // Adjust based on dependencies
  if (!agentInfo.dependencies || agentInfo.dependencies.length === 0) {
    priority += 1; // Can start immediately
  }

  return Math.min(10, priority);
}

function calculateTotalDuration(plan: OrchestrationPlan): number {
  // Calculate critical path duration
  const parallelDuration = Math.max(
    ...plan.parallelizable.map((s: OrchestrationStep) => s.estimatedDuration),
    0,
  );

  const sequentialDuration = plan.sequential.reduce(
    (sum: number, step: OrchestrationStep) => sum + step.estimatedDuration,
    0,
  );

  return parallelDuration + sequentialDuration;
}

function calculateOverallStatus(tasks: TaskItem[]): string {
  const statuses = tasks.map(t => t.status);

  if (statuses.every(s => s === 'completed')) {return 'completed';}
  if (statuses.some(s => s === 'failed')) {return 'failed';}
  if (statuses.some(s => s === 'processing')) {return 'processing';}
  if (statuses.some(s => s === 'pending')) {return 'pending';}

  return 'unknown';
}

function calculateProgress(tasks: TaskItem[]): number {
  if (tasks.length === 0) {return 0;}

  const completed = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

function generateTimeline(tasks: TaskItem[]): unknown[] {
  return tasks
    .filter(t => t.started_at || t.completed_at)
    .map(t => ({
      taskId: t.id,
      agentType: t.payload?.agentType || 'unknown',
      event: t.completed_at ? 'completed' : 'started',
      timestamp: t.completed_at || t.started_at,
      duration: t.completed_at && t.started_at ?
        new Date(t.completed_at).getTime() - new Date(t.started_at).getTime() : null,
    }))
    .sort((a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime());
}

function getDefaultTaskType(agent: string): string {
  const taskTypes = {
    secretary: 'document_processing',
    financial: 'financial_analysis',
    legal: 'legal_review',
    analytics: 'generate_insights',
    vendor: 'vendor_analysis',
    notifications: 'send_notification',
  };

  return taskTypes[agent as keyof typeof taskTypes] || 'process';
}

async function getAgentId(supabase: import('@supabase/supabase-js').SupabaseClient, agentType: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('is_active', true)
    .single();

  return data?.id;
}