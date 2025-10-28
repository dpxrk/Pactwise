/// <reference path="../../types/global.d.ts" />
// Serve function is available globally in Deno runtime
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
// Configuration may be used in future implementations
// import { config } from '../_shared/config.ts';
import { localChatAgent } from '../_shared/local-ai.ts';

// Agent definitions
const AGENT_TYPES = {
  manager: {
    name: 'Manager Agent',
    systemPrompt: 'You are the Manager Agent responsible for orchestrating other agents, routing tasks, and ensuring efficient workflow. Analyze incoming requests and delegate to appropriate specialized agents.',
    capabilities: ['task_routing', 'orchestration', 'priority_management'],
  },
  secretary: {
    name: 'Secretary Agent',
    systemPrompt: 'You are the Secretary Agent responsible for document processing, initial contract analysis, and administrative tasks. Focus on extracting key information and preparing data for other agents.',
    capabilities: ['document_processing', 'data_extraction', 'initial_analysis'],
  },
  financial: {
    name: 'Financial Agent',
    systemPrompt: 'You are the Financial Agent responsible for cost analysis, payment terms, budget impact assessment, and financial risk evaluation. Provide detailed financial insights.',
    capabilities: ['cost_analysis', 'payment_terms', 'budget_impact', 'financial_risk'],
  },
  legal: {
    name: 'Legal Agent',
    systemPrompt: 'You are the Legal Agent responsible for clause identification, risk assessment, compliance checking, and legal term analysis. Focus on legal implications and risks.',
    capabilities: ['clause_analysis', 'risk_assessment', 'compliance', 'legal_review'],
  },
  analytics: {
    name: 'Analytics Agent',
    systemPrompt: 'You are the Analytics Agent responsible for generating insights, identifying trends, and providing data-driven recommendations. Focus on patterns and actionable intelligence.',
    capabilities: ['trend_analysis', 'insights', 'predictions', 'recommendations'],
  },
  vendor: {
    name: 'Vendor Agent',
    systemPrompt: 'You are the Vendor Agent responsible for vendor management, performance tracking, and relationship insights. Focus on vendor-related analysis and recommendations.',
    capabilities: ['vendor_analysis', 'performance_tracking', 'relationship_management'],
  },
  notifications: {
    name: 'Notifications Agent',
    systemPrompt: 'You are the Notifications Agent responsible for managing alerts, reminders, and communication. Ensure timely and relevant notifications to users.',
    capabilities: ['alert_management', 'reminders', 'communication'],
  },
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {return corsResponse;}

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

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
    if (method === 'POST' && pathname === '/agents/initialize') {
      await initializeAgents(supabase, userData.enterprise_id);

      return new Response(
        JSON.stringify({ message: 'Agents initialized' }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Process request through Manager Agent
    if (method === 'POST' && pathname === '/agents/process') {
      const { query, context, priority = 5 } = await req.json();

      if (!query) {
        return new Response(JSON.stringify({ error: 'Query required' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Get Manager Agent
      const { data: managerAgent } = await supabase
        .from('agents')
        .select('*')
        .eq('type', 'manager')
        .eq('is_active', true)
        .single();

      if (!managerAgent) {
        return new Response(JSON.stringify({ error: 'Manager agent not available' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 503,
        });
      }

      // Analyze request with Manager Agent
      const analysis = await analyzeRequest(query, context);

      // Route to appropriate agents
      const tasks = analysis.requiredAgents.map(agentType => ({
        agent_id: null, // Will be set based on agent type
        task_type: 'process_query',
        priority,
        payload: {
          query,
          context,
          analysis,
          agentType,
        },
        enterprise_id: userData.enterprise_id,
      }));

      // Create tasks for each required agent
      for (const task of tasks) {
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('type', task.payload.agentType)
          .eq('is_active', true)
          .single();

        if (agent) {
          task.agent_id = agent.id;
          await supabase.from('agent_tasks').insert(task);
        }
      }

      // If high priority, process immediately
      if (priority >= 8) {
        const results = await Promise.all(
          tasks.map(task => processAgentTask(supabase, task)),
        );

        return new Response(
          JSON.stringify({
            analysis,
            results,
            processed: true,
          }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      }

      return new Response(
        JSON.stringify({
          analysis,
          tasksQueued: tasks.length,
          message: 'Request queued for processing',
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 202,
        },
      );
    }

    // Get agent insights
    if (method === 'GET' && pathname === '/agents/insights') {
      const params = Object.fromEntries(url.searchParams);
      const { severity, is_actionable, limit = '50' } = params;

      let query = supabase
        .from('agent_insights')
        .select(`
          *,
          agent:agents(name, type),
          contract:contracts(title),
          vendor:vendors(name)
        `)
        .eq('enterprise_id', userData.enterprise_id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (severity) {
        query = query.eq('severity', severity);
      }
      if (is_actionable !== undefined) {
        query = query.eq('is_actionable', is_actionable === 'true');
      }

      const { data, error } = await query;

      if (error) {throw error;}

      return new Response(JSON.stringify(data), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Acknowledge insight
    if (method === 'PUT' && pathname.match(/^\/agents\/insights\/[a-f0-9-]+\/acknowledge$/)) {
      const insightId = pathname.split('/')[3];

      const { data, error } = await supabase
        .from('agent_insights')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userData.id,
        })
        .eq('id', insightId)
        .eq('enterprise_id', userData.enterprise_id)
        .select()
        .single();

      if (error) {throw error;}

      return new Response(JSON.stringify(data), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get agent performance metrics
    if (method === 'GET' && pathname === '/agents/metrics') {
      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .or(`enterprise_id.eq.${userData.enterprise_id},enterprise_id.is.null`);

      if (!agents) {
        return new Response(JSON.stringify({ metrics: [] }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const metrics = await Promise.all(
        agents.map(async (agent: { id: string; agent_name: string; agent_type: string; status: string }) => {
          const { count: taskCount } = await supabase
            .from('agent_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .eq('status', 'completed')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          const { count: insightCount } = await supabase
            .from('agent_insights')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          return {
            agent,
            metrics: {
              tasksCompleted: taskCount || 0,
              insightsGenerated: insightCount || 0,
              successRate: 0.95, // Placeholder - calculate from actual data
              avgResponseTime: 2500, // Placeholder - calculate from actual data
            },
          };
        }),
      );

      return new Response(JSON.stringify(metrics), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 404,
    });

  } catch (error) {
    console.error('Agent error:', error);
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

async function initializeAgents(supabase: SupabaseClient, enterpriseId?: string) {
  // Check if system exists
  const { data: system } = await supabase
    .from('agent_system')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!system) {
    // Create system
    const { data: newSystem } = await supabase
      .from('agent_system')
      .insert({
        name: 'Pactwise Multi-Agent System',
        version: '1.0.0',
        config: {
          maxConcurrentTasks: 10,
          taskTimeout: 300000, // 5 minutes
          retryPolicy: { maxRetries: 3, backoffMultiplier: 2 },
        },
        capabilities: Object.keys(AGENT_TYPES),
      })
      .select()
      .single();

    // Create agents
    for (const [type, config] of Object.entries(AGENT_TYPES)) {
      await supabase
        .from('agents')
        .insert({
          name: config.name,
          type,
          description: config.systemPrompt,
          capabilities: config.capabilities,
          system_id: newSystem.id,
          enterprise_id: enterpriseId,
          config: {
            temperature: type === 'analytics' ? 0.3 : 0.7,
            maxTokens: 2000,
          },
        });
    }
  }
}

async function analyzeRequest(query: string, _context: Record<string, unknown>) {
  // Local rule-based agent routing
  const queryLower = query.toLowerCase();
  let requiredAgents: string[] = [];
  let priority = 5;
  let estimatedComplexity = 'medium';

  // Route based on keywords
  if (queryLower.includes('contract') || queryLower.includes('agreement')) {
    requiredAgents.push('secretary', 'legal');
    if (queryLower.includes('payment') || queryLower.includes('cost') || queryLower.includes('budget')) {
      requiredAgents.push('financial');
    }
  }

  if (queryLower.includes('vendor') || queryLower.includes('supplier')) {
    requiredAgents.push('vendor');
  }

  if (queryLower.includes('legal') || queryLower.includes('clause') || queryLower.includes('risk')) {
    requiredAgents.push('legal');
    priority = 8;
  }

  if (queryLower.includes('financial') || queryLower.includes('payment') || queryLower.includes('cost')) {
    requiredAgents.push('financial');
  }

  if (queryLower.includes('urgent') || queryLower.includes('critical')) {
    priority = 9;
    estimatedComplexity = 'high';
  }

  // Default to secretary for document processing
  if (requiredAgents.length === 0) {
    requiredAgents = ['secretary'];
  }

  // Add manager for coordination if multiple agents
  if (requiredAgents.length > 1) {
    requiredAgents.unshift('manager');
  }

  return {
    requiredAgents: [...new Set(requiredAgents)], // Remove duplicates
    priority,
    estimatedComplexity,
    summary: `Request requires ${requiredAgents.join(', ')} agents with ${estimatedComplexity} complexity`,
  };
}

async function processAgentTask(supabase: SupabaseClient, task: AgentTask) {
  const { agentType, query, context } = task.payload;
  const agentConfig = AGENT_TYPES[agentType as keyof typeof AGENT_TYPES];

  if (!agentConfig) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Generate response using local agent
  const localResponse = await localChatAgent.generateResponse(query, {
    agentType,
    systemPrompt: agentConfig.systemPrompt,
    context,
  });

  const response = `[${agentConfig.name}]: ${localResponse.message}`;

  // Store agent response
  await supabase
    .from('agent_logs')
    .insert({
      agent_id: task.agent_id,
      task_id: task.id,
      log_type: 'response',
      message: response,
      metadata: {
        tokens: Math.floor(query.length / 4), // Rough token estimate
        model: 'local_agent',
        confidence: localResponse.confidence,
      },
    });

  return {
    agentType,
    response,
    tokens: Math.floor(query.length / 4), // Local token estimate
  };
}