/// <reference path="../../types/global.d.ts" />
/**
 * Advanced Legal Contract Agent - State-of-the-art AI with full tool arsenal
 *
 * Features:
 * - Function/Tool calling
 * - Chain-of-thought reasoning
 * - Self-reflection and quality checking
 * - Memory system integration
 * - Multi-agent collaboration
 * - Autonomous task breakdown
 * - Learning and adaptation
 */

import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { handleError } from '../_shared/errors.ts';
import { toolRegistry, ToolContext } from '../_shared/agent-tools.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.17.1';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('LLM_API_KEY'),
});

const MODEL = Deno.env.get('LLM_MODEL') || 'claude-3-5-sonnet-20241022';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    const { data: userData } = await supabase
      .from('users')
      .select('id, enterprise_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Main agent endpoint
    if (action === 'analyze') {
      return await handleAdvancedAnalysis(req, supabase, userData);
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return handleError(error);
  }
});

/**
 * Advanced contract analysis with full reasoning and tool use
 */
async function handleAdvancedAnalysis(
  req: Request,
  supabase: SupabaseClient,
  userData: any,
) {
  const body = await req.json();
  const { contractId, analysisType = 'comprehensive', context } = body;

  if (!contractId) {
    throw new Error('contractId required');
  }

  // Get agent ID
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('type', 'legal')
    .eq('enterprise_id', userData.enterprise_id)
    .eq('is_active', true)
    .single();

  if (!agent) {
    throw new Error('Legal agent not found');
  }

  // Create task
  const { data: task, error: taskError } = await supabase
    .from('agent_tasks')
    .insert({
      agent_id: agent.id,
      task_type: 'advanced_analysis',
      priority: 8,
      status: 'processing',
      payload: { contractId, analysisType, context },
      contract_id: contractId,
      enterprise_id: userData.enterprise_id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (taskError) throw taskError;

  try {
    // Initialize tool context
    const toolContext: ToolContext = {
      supabase,
      enterpriseId: userData.enterprise_id,
      userId: userData.id,
      agentId: agent.id,
      taskId: task.id,
    };

    // Execute agent reasoning loop
    const result = await executeAgentReasoningLoop(
      contractId,
      analysisType,
      context,
      toolContext,
    );

    // Update task as completed
    await supabase
      .from('agent_tasks')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    // Update task as failed
    await supabase
      .from('agent_tasks')
      .update({
        status: 'failed',
        error: error.message,
      })
      .eq('id', task.id);

    throw error;
  }
}

/**
 * Main reasoning loop with chain-of-thought and tool use
 */
async function executeAgentReasoningLoop(
  contractId: string,
  analysisType: string,
  userContext: any,
  toolContext: ToolContext,
): Promise<any> {
  const { supabase } = toolContext;
  let stepNumber = 0;
  const maxSteps = 20; // Prevent infinite loops
  const reasoningTrace = [];

  // System prompt with tool use instructions
  const systemPrompt = `You are an advanced legal contract analyst with access to a comprehensive toolkit.

Your capabilities include:
- Database queries to retrieve contract and vendor information
- Web search for legal precedents and market data
- Financial calculations for cost analysis
- Risk assessment tools
- Document comparison
- Collaboration with other specialized agents
- Memory storage and retrieval for context

Approach every task methodically:
1. **Think** - Reason about what you need to do
2. **Act** - Use tools to gather information or perform actions
3. **Observe** - Analyze the results of your actions
4. **Reflect** - Consider if you've adequately addressed the task
5. **Decide** - Determine next steps or conclude

Be thorough but efficient. Use tools when needed, but don't overuse them. Always strive for accuracy and actionable insights.`;

  // Get contract data using tool
  const contractData = await toolRegistry.executeTool(
    'get_contract',
    { contract_id: contractId, include_clauses: true },
    toolContext,
  );

  if (!contractData.success) {
    throw new Error(`Failed to load contract: ${contractData.error}`);
  }

  // Check agent memory for relevant context
  const memoryQuery = `contract analysis ${contractData.result.contract_type}`;
  const memories = await toolRegistry.executeTool(
    'get_agent_memory',
    { query: memoryQuery, memory_type: 'long_term', limit: 5 },
    toolContext,
  );

  // Build initial user message
  const userMessage = buildInitialUserMessage(
    contractData.result,
    analysisType,
    userContext,
    memories.success ? memories.result.memories : [],
  );

  // Start reasoning loop
  let messages = [{ role: 'user', content: userMessage }];
  let finalResponse: any = null;

  while (stepNumber < maxSteps) {
    stepNumber++;

    // Call Claude with tool definitions
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.1,
      system: systemPrompt,
      tools: toolRegistry.getToolDefinitionsForClaude(),
      messages,
    });

    // Process response
    const { content, stop_reason } = response;

    // Extract thoughts and actions
    for (const block of content) {
      if (block.type === 'text') {
        // This is the agent's thinking
        await logReasoningStep(supabase, toolContext.taskId!, toolContext.agentId, {
          step_number: stepNumber,
          step_type: 'thought',
          content: block.text,
        });

        reasoningTrace.push({
          type: 'thought',
          content: block.text,
        });

        // Check if this is the final answer
        if (stop_reason === 'end_turn' && !content.some(b => b.type === 'tool_use')) {
          finalResponse = block.text;
          break;
        }
      } else if (block.type === 'tool_use') {
        // Agent wants to use a tool
        const toolName = block.name;
        const toolInput = block.input;

        await logReasoningStep(supabase, toolContext.taskId!, toolContext.agentId, {
          step_number: stepNumber,
          step_type: 'action',
          content: `Using tool: ${toolName}`,
          tool_used: toolName,
          tool_input: toolInput,
        });

        // Execute tool
        const startTime = Date.now();
        const toolResult = await toolRegistry.executeTool(
          toolName,
          toolInput,
          toolContext,
        );
        const duration = Date.now() - startTime;

        await logReasoningStep(supabase, toolContext.taskId!, toolContext.agentId, {
          step_number: stepNumber,
          step_type: 'observation',
          content: `Tool result: ${JSON.stringify(toolResult).substring(0, 500)}`,
          tool_used: toolName,
          tool_output: toolResult.result,
          success: toolResult.success,
          error_message: toolResult.error,
          duration_ms: duration,
        });

        reasoningTrace.push({
          type: 'action',
          tool: toolName,
          input: toolInput,
          output: toolResult,
        });

        // Add tool result to conversation
        messages.push({
          role: 'assistant',
          content: content,
        });

        messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(toolResult.success ? toolResult.result : { error: toolResult.error }),
          }],
        });
      }
    }

    if (finalResponse) break;

    // Safety check
    if (stepNumber >= maxSteps - 1) {
      finalResponse = "Analysis reached maximum steps. Partial results available in reasoning trace.";
      break;
    }
  }

  // Self-reflection phase
  const reflectionPrompt = `Review your analysis and ensure:
1. All key aspects were covered
2. Conclusions are well-supported
3. Recommendations are actionable
4. Nothing critical was missed

Provide your final, polished analysis.`;

  messages.push({
    role: 'user',
    content: reflectionPrompt,
  });

  const reflectionResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    temperature: 0.1,
    messages,
  });

  const refinedAnalysis = reflectionResponse.content[0].text;

  // Store important learnings in memory
  await storeMemory(toolContext, {
    content: `Contract analysis completed for ${contractData.result.contract_type}. Key insights: ${refinedAnalysis.substring(0, 500)}`,
    memory_type: 'episodic',
    importance_score: 0.7,
    tags: ['contract_analysis', contractData.result.contract_type, analysisType],
  });

  // Parse final response
  const analysisResult = parseAnalysisResponse(refinedAnalysis);

  return {
    analysis: analysisResult,
    reasoning_trace: reasoningTrace,
    steps_taken: stepNumber,
    refined_by_reflection: true,
  };
}

/**
 * Build initial user message with context
 */
function buildInitialUserMessage(
  contract: any,
  analysisType: string,
  userContext: any,
  memories: any[],
): string {
  let message = `Analyze this ${contract.contract_type} contract comprehensively.\n\n`;

  message += `**Contract Details:**\n`;
  message += `- Title: ${contract.title}\n`;
  message += `- Status: ${contract.status}\n`;
  message += `- Value: ${contract.value} ${contract.currency || 'USD'}\n`;
  message += `- Vendor: ${contract.vendor_name || 'Unknown'}\n\n`;

  if (contract.file_content) {
    message += `**Contract Text:**\n${contract.file_content.substring(0, 8000)}\n\n`;
  }

  if (contract.clauses && contract.clauses.length > 0) {
    message += `**Previously Extracted Clauses:**\n`;
    contract.clauses.forEach((clause: any, i: number) => {
      message += `${i + 1}. ${clause.clause_type}: ${clause.clause_text.substring(0, 200)}\n`;
    });
    message += `\n`;
  }

  if (memories.length > 0) {
    message += `**Relevant Past Experience:**\n`;
    memories.forEach((mem: any) => {
      message += `- ${mem.content.substring(0, 200)}\n`;
    });
    message += `\n`;
  }

  if (userContext) {
    message += `**User Context:** ${JSON.stringify(userContext)}\n\n`;
  }

  message += `**Analysis Type:** ${analysisType}\n\n`;

  message += `Perform a thorough analysis. Use your tools to:
1. Gather any additional information needed
2. Perform necessary calculations
3. Cross-reference with similar contracts
4. Assess risks comprehensively
5. Generate actionable recommendations

Think step-by-step and use tools as needed.`;

  return message;
}

/**
 * Log reasoning step to database
 */
async function logReasoningStep(
  supabase: SupabaseClient,
  taskId: string,
  agentId: string,
  step: any,
) {
  await supabase.from('agent_reasoning_traces').insert({
    task_id: taskId,
    agent_id: agentId,
    ...step,
  });
}

/**
 * Store information in agent memory
 */
async function storeMemory(toolContext: ToolContext, memory: any) {
  await toolContext.supabase.from('agent_memory').insert({
    agent_id: toolContext.agentId,
    enterprise_id: toolContext.enterpriseId,
    related_task_id: toolContext.taskId,
    ...memory,
    expires_at: memory.memory_type === 'short_term'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null,
  });
}

/**
 * Parse analysis response from Claude
 */
function parseAnalysisResponse(text: string): any {
  // Try to extract JSON if present
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      // Fall through to text parsing
    }
  }

  // Extract structured information from text
  const result: any = {
    summary: '',
    scores: {},
    risks: [],
    recommendations: [],
    insights: [],
  };

  // Parse scores
  const scorePattern = /(\w+)\s*(?:score|rating):\s*(\d+(?:\.\d+)?)/gi;
  let match;
  while ((match = scorePattern.exec(text)) !== null) {
    result.scores[match[1].toLowerCase()] = parseFloat(match[2]);
  }

  // Extract recommendations
  const recommendationPattern = /(?:recommend|suggestion):\s*(.+?)(?:\n|$)/gi;
  while ((match = recommendationPattern.exec(text)) !== null) {
    result.recommendations.push(match[1].trim());
  }

  // Extract risks
  const riskPattern = /(?:risk|concern):\s*(.+?)(?:\n|$)/gi;
  while ((match = riskPattern.exec(text)) !== null) {
    result.risks.push(match[1].trim());
  }

  // Use full text as summary if no structure found
  if (Object.keys(result.scores).length === 0) {
    result.summary = text;
  }

  return result;
}
