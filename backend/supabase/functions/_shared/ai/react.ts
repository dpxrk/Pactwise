/// <reference path="../../../types/global.d.ts" />

/**
 * ReAct Pattern Implementation
 *
 * Implements the Reason + Act pattern for agent reasoning:
 * - Explicit reasoning traces
 * - Iterative action-observation cycles
 * - Self-correction capabilities
 * - Structured output at each step
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getClaudeClient, ClaudeTool, ClaudeMessage } from './claude-client.ts';
import { ToolExecutor, createToolExecutor } from './tool-executor.ts';
import { getCostTracker } from './cost-tracker.ts';

// ==================== Types ====================

export interface ThoughtStep {
  type: 'thought';
  content: string;
  reasoning: string[];
  confidence: number;
}

export interface ActionStep {
  type: 'action';
  tool: string;
  input: Record<string, unknown>;
  reasoning: string;
}

export interface ObservationStep {
  type: 'observation';
  result: unknown;
  success: boolean;
  error?: string;
}

export interface FinalAnswerStep {
  type: 'final_answer';
  answer: string;
  confidence: number;
  sources: string[];
}

export type ReActStep = ThoughtStep | ActionStep | ObservationStep | FinalAnswerStep;

export interface ReActResult {
  answer: string;
  steps: ReActStep[];
  iterations: number;
  toolCalls: Array<{ tool: string; input: Record<string, unknown>; result: unknown }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  success: boolean;
  confidence: number;
}

export interface ReActOptions {
  maxIterations?: number;
  tools?: ClaudeTool[];
  systemPrompt?: string;
  verbose?: boolean;
  onStep?: (step: ReActStep, iteration: number) => void;
}

// ==================== ReAct Agent ====================

export class ReActAgent {
  private claude = getClaudeClient();
  private toolExecutor: ToolExecutor;
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private userId: string;

  constructor(
    supabase: SupabaseClient,
    enterpriseId: string,
    userId: string,
    agentId: string,
  ) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.userId = userId;
    this.toolExecutor = createToolExecutor(supabase, enterpriseId, userId, agentId);
  }

  /**
   * Execute a ReAct reasoning loop
   */
  async reason(
    query: string,
    options: ReActOptions = {},
  ): Promise<ReActResult> {
    const {
      maxIterations = 5,
      verbose = false,
      onStep,
    } = options;

    const steps: ReActStep[] = [];
    const toolCalls: Array<{ tool: string; input: Record<string, unknown>; result: unknown }> = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Get available tools
    const tools = options.tools || this.toolExecutor.getClaudeTools();

    // Build initial messages
    const messages: ClaudeMessage[] = [];
    const systemPrompt = this.buildReActSystemPrompt(options.systemPrompt, tools);

    // Initial user message
    messages.push({
      role: 'user',
      content: this.buildReActUserPrompt(query),
    });

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      if (verbose) {
        console.log(`\n=== ReAct Iteration ${iteration + 1} ===`);
      }

      // Get Claude's response
      const response = await this.claude.chat(messages, {
        system: systemPrompt,
        tools,
        toolChoice: 'auto',
        temperature: 0.3,
        maxTokens: 2000,
      });

      totalInputTokens += response.usage.inputTokens;
      totalOutputTokens += response.usage.outputTokens;

      // Parse the response
      const parsedSteps = this.parseReActResponse(response.content);

      for (const step of parsedSteps) {
        steps.push(step);
        onStep?.(step, iteration);

        if (verbose) {
          console.log(`Step: ${step.type}`, step);
        }

        // Check for final answer
        if (step.type === 'final_answer') {
          // Calculate cost
          const tracker = getCostTracker(this.supabase, this.enterpriseId);
          const { cost } = await tracker.recordUsage(
            response.model,
            totalInputTokens,
            totalOutputTokens,
            'react_reasoning',
            { userId: this.userId, iterations: iteration + 1 },
          );

          return {
            answer: step.answer,
            steps,
            iterations: iteration + 1,
            toolCalls,
            usage: {
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              totalCost: cost,
            },
            success: true,
            confidence: step.confidence,
          };
        }

        // Execute action if present
        if (step.type === 'action') {
          const observation = await this.executeAction(step);
          steps.push(observation);
          onStep?.(observation, iteration);

          toolCalls.push({
            tool: step.tool,
            input: step.input,
            result: observation.result,
          });

          // Add assistant message with action
          messages.push({
            role: 'assistant',
            content: response.content,
          });

          // Add observation as user message
          messages.push({
            role: 'user',
            content: this.formatObservation(observation),
          });
        }
      }

      // If no action or final answer, add the response and continue
      if (!parsedSteps.some(s => s.type === 'action' || s.type === 'final_answer')) {
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        messages.push({
          role: 'user',
          content: 'Continue reasoning. If you have enough information, provide your final answer. If not, take an action to gather more information.',
        });
      }
    }

    // Max iterations reached
    const tracker = getCostTracker(this.supabase, this.enterpriseId);
    const { cost } = await tracker.recordUsage(
      'claude-3-5-sonnet-20241022',
      totalInputTokens,
      totalOutputTokens,
      'react_reasoning',
      { userId: this.userId, iterations: maxIterations, incomplete: true },
    );

    // Extract best answer from steps
    const lastThought = steps.filter(s => s.type === 'thought').pop() as ThoughtStep | undefined;

    return {
      answer: lastThought?.content || 'I was unable to reach a conclusion within the allowed iterations.',
      steps,
      iterations: maxIterations,
      toolCalls,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalCost: cost,
      },
      success: false,
      confidence: lastThought?.confidence || 0,
    };
  }

  /**
   * Simple one-shot reasoning without iteration
   */
  async thinkOnce(
    query: string,
    context?: string,
  ): Promise<ThoughtStep> {
    const prompt = context
      ? `Context:\n${context}\n\nQuestion: ${query}\n\nThink step by step about this question.`
      : `Question: ${query}\n\nThink step by step about this question.`;

    const response = await this.claude.chat(
      [{ role: 'user', content: prompt }],
      {
        system: 'You are a careful reasoning assistant. Think through problems step by step before reaching conclusions.',
        temperature: 0.3,
        maxTokens: 1000,
      },
    );

    const textContent = response.content.find(b => b.type === 'text');
    const content = textContent?.type === 'text' ? textContent.text || '' : '';

    return {
      type: 'thought',
      content,
      reasoning: content.split('\n').filter(l => l.trim()),
      confidence: 0.7,
    };
  }

  // ==================== Private Methods ====================

  private buildReActSystemPrompt(customPrompt: string | undefined, tools: ClaudeTool[]): string {
    const toolDescriptions = tools
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    return `${customPrompt || 'You are a helpful AI assistant that reasons step by step.'}

You follow the ReAct (Reason + Act) pattern:

1. THOUGHT: First, think about what you need to do. Consider what information you have and what you still need.

2. ACTION: If you need more information, use a tool to get it. Specify the tool and input clearly.

3. OBSERVATION: After an action, you'll receive the result. Analyze it carefully.

4. Repeat steps 1-3 until you have enough information.

5. FINAL ANSWER: When ready, provide your final answer with confidence level (0-1).

Available tools:
${toolDescriptions}

Format your response as:

THOUGHT: [Your reasoning here]

ACTION: [tool_name]
INPUT: [tool input as JSON]

OR

FINAL ANSWER:
[Your answer here]
CONFIDENCE: [0-1]
SOURCES: [List sources used]

Always start with a THOUGHT before taking any ACTION.`;
  }

  private buildReActUserPrompt(query: string): string {
    return `Please help me with the following:

${query}

Begin by thinking about what you need to do to answer this question.`;
  }

  private parseReActResponse(content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>): ReActStep[] {
    const steps: ReActStep[] = [];

    for (const block of content) {
      // Handle tool use
      if (block.type === 'tool_use' && block.name && block.input) {
        steps.push({
          type: 'action',
          tool: block.name,
          input: block.input,
          reasoning: 'Tool call requested by Claude',
        });
        continue;
      }

      // Handle text content
      if (block.type === 'text' && block.text) {
        const text = block.text;

        // Parse THOUGHT
        const thoughtMatch = text.match(/THOUGHT:\s*(.+?)(?=ACTION:|FINAL ANSWER:|$)/is);
        if (thoughtMatch) {
          steps.push({
            type: 'thought',
            content: thoughtMatch[1].trim(),
            reasoning: thoughtMatch[1].trim().split('\n').filter(l => l.trim()),
            confidence: 0.7,
          });
        }

        // Parse ACTION (text format, not tool_use)
        const actionMatch = text.match(/ACTION:\s*(\w+)\s*INPUT:\s*(\{.*?\})/is);
        if (actionMatch) {
          try {
            const input = JSON.parse(actionMatch[2]);
            steps.push({
              type: 'action',
              tool: actionMatch[1].trim(),
              input,
              reasoning: 'Parsed from text response',
            });
          } catch {
            // Invalid JSON, skip
          }
        }

        // Parse FINAL ANSWER
        const finalMatch = text.match(/FINAL ANSWER:\s*(.+?)(?=CONFIDENCE:|SOURCES:|$)/is);
        if (finalMatch) {
          const confidenceMatch = text.match(/CONFIDENCE:\s*([\d.]+)/i);
          const sourcesMatch = text.match(/SOURCES:\s*(.+?)$/is);

          steps.push({
            type: 'final_answer',
            answer: finalMatch[1].trim(),
            confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8,
            sources: sourcesMatch
              ? sourcesMatch[1].split('\n').map(s => s.trim()).filter(Boolean)
              : [],
          });
        }
      }
    }

    return steps;
  }

  private async executeAction(action: ActionStep): Promise<ObservationStep> {
    try {
      const result = await this.toolExecutor.executeTool(action.tool, action.input);

      return {
        type: 'observation',
        result: result.data,
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        type: 'observation',
        result: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private formatObservation(observation: ObservationStep): string {
    if (!observation.success) {
      return `OBSERVATION: Action failed with error: ${observation.error}

Please consider this error and decide whether to try a different approach or provide your best answer with the information you have.`;
    }

    const resultStr = typeof observation.result === 'object'
      ? JSON.stringify(observation.result, null, 2)
      : String(observation.result);

    return `OBSERVATION: ${resultStr}

Analyze this result and continue reasoning. If you have enough information, provide your FINAL ANSWER.`;
  }
}

// ==================== Factory Function ====================

export function createReActAgent(
  supabase: SupabaseClient,
  enterpriseId: string,
  userId: string,
  agentId: string,
): ReActAgent {
  return new ReActAgent(supabase, enterpriseId, userId, agentId);
}

/**
 * Quick ReAct reasoning function
 */
export async function reactReason(
  supabase: SupabaseClient,
  enterpriseId: string,
  userId: string,
  query: string,
  options?: ReActOptions,
): Promise<ReActResult> {
  const agent = createReActAgent(supabase, enterpriseId, userId, 'react_agent');
  return agent.reason(query, options);
}
