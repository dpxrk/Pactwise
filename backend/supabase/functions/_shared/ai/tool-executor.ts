/// <reference path="../../../types/global.d.ts" />

/**
 * Tool Executor - Bridges ToolRegistry with Claude's function calling
 *
 * Provides:
 * - Automatic tool registration with Claude format
 * - Safe tool execution with validation
 * - Result formatting for Claude responses
 * - Tool call tracking and metrics
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ToolRegistry, Tool, ToolContext, ToolExecutionResult } from '../agent-tools.ts';
import { ClaudeTool, getClaudeClient } from './claude-client.ts';
import { getCostTracker } from './cost-tracker.ts';

// ==================== Types ====================

export interface ToolExecutionOptions {
  validateInput?: boolean;
  timeoutMs?: number;
  trackMetrics?: boolean;
}

export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  result: unknown;
  success: boolean;
  error?: string;
  durationMs: number;
  timestamp: string;
}

export interface AgentToolContext extends ToolContext {
  conversationId?: string;
  parentTaskId?: string;
}

// ==================== Tool Executor ====================

export class ToolExecutor {
  private registry: ToolRegistry;
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private userId: string;
  private agentId: string;
  private callHistory: ToolCallRecord[] = [];
  private maxHistorySize = 100;

  constructor(
    supabase: SupabaseClient,
    enterpriseId: string,
    userId: string,
    agentId: string,
    registry?: ToolRegistry,
  ) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.userId = userId;
    this.agentId = agentId;
    this.registry = registry || new ToolRegistry();
  }

  /**
   * Get all tools formatted for Claude
   */
  getClaudeTools(filter?: { categories?: string[]; names?: string[] }): ClaudeTool[] {
    let tools = this.registry.getAllTools();

    if (filter?.categories) {
      tools = tools.filter(t => filter.categories!.includes(t.category));
    }

    if (filter?.names) {
      tools = tools.filter(t => filter.names!.includes(t.name));
    }

    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  /**
   * Execute a tool by name with given input
   */
  async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    options: ToolExecutionOptions = {},
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const context = this.createContext();

    try {
      // Execute with optional timeout
      const result = options.timeoutMs
        ? await this.executeWithTimeout(toolName, input, context, options.timeoutMs)
        : await this.registry.executeTool(toolName, input, context);

      const durationMs = Date.now() - startTime;

      // Record call
      this.recordCall({
        toolName,
        input,
        result: result.data,
        success: result.success,
        error: result.error,
        durationMs,
        timestamp: new Date().toISOString(),
      });

      // Track metrics if enabled
      if (options.trackMetrics) {
        await this.trackToolMetrics(toolName, result.success, durationMs);
      }

      return result;

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordCall({
        toolName,
        input,
        result: null,
        success: false,
        error: errorMessage,
        durationMs,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create an executor function compatible with ClaudeClient.processWithTools
   */
  createExecutor(): (name: string, input: Record<string, unknown>) => Promise<unknown> {
    return async (name: string, input: Record<string, unknown>) => {
      const result = await this.executeTool(name, input, { trackMetrics: true });
      if (!result.success) {
        throw new Error(result.error || 'Tool execution failed');
      }
      return result.data;
    };
  }

  /**
   * Process a prompt with automatic tool use
   */
  async processWithTools(
    prompt: string,
    options: {
      systemPrompt?: string;
      toolFilter?: { categories?: string[]; names?: string[] };
      maxTokens?: number;
      trackCost?: boolean;
    } = {},
  ): Promise<{
    response: string;
    toolCalls: ToolCallRecord[];
    usage: { inputTokens: number; outputTokens: number };
    cost?: number;
  }> {
    const claude = getClaudeClient();
    const tools = this.getClaudeTools(options.toolFilter);
    const executor = this.createExecutor();

    const { response, toolCalls: claudeToolCalls, totalUsage } = await claude.processWithTools(
      prompt,
      tools,
      executor,
      {
        system: options.systemPrompt,
        maxTokens: options.maxTokens,
      },
    );

    // Extract text response
    const textContent = response.content.find(block => block.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text || '' : '';

    // Track cost if enabled
    let cost: number | undefined;
    if (options.trackCost) {
      const tracker = getCostTracker(this.supabase, this.enterpriseId);
      const result = await tracker.recordUsage(
        response.model,
        totalUsage.inputTokens,
        totalUsage.outputTokens,
        'tool_processing',
        {
          userId: this.userId,
          agentType: this.agentId,
          metadata: { toolsUsed: claudeToolCalls.map(c => c.name) },
        },
      );
      cost = result.cost;
    }

    // Convert tool calls to our format
    const toolCallRecords: ToolCallRecord[] = claudeToolCalls.map(call => ({
      toolName: call.name,
      input: call.input,
      result: call.result,
      success: !(call.result as Record<string, unknown>)?.error,
      error: (call.result as Record<string, unknown>)?.error as string | undefined,
      durationMs: 0, // We don't have individual timing from Claude
      timestamp: new Date().toISOString(),
    }));

    return {
      response: responseText,
      toolCalls: toolCallRecords,
      usage: totalUsage,
      cost,
    };
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: Tool): void {
    this.registry.registerTool(tool);
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.registry.getTool(name);
  }

  /**
   * Get all available tools
   */
  getAllTools(): Tool[] {
    return this.registry.getAllTools();
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): Tool[] {
    return this.registry.getToolsByCategory(category);
  }

  /**
   * Get recent call history
   */
  getCallHistory(limit?: number): ToolCallRecord[] {
    return limit ? this.callHistory.slice(-limit) : [...this.callHistory];
  }

  /**
   * Clear call history
   */
  clearHistory(): void {
    this.callHistory = [];
  }

  /**
   * Get call statistics
   */
  getCallStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDurationMs: number;
    callsByTool: Record<string, number>;
  } {
    const stats = {
      totalCalls: this.callHistory.length,
      successfulCalls: 0,
      failedCalls: 0,
      averageDurationMs: 0,
      callsByTool: {} as Record<string, number>,
    };

    let totalDuration = 0;

    for (const call of this.callHistory) {
      if (call.success) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
      }
      totalDuration += call.durationMs;
      stats.callsByTool[call.toolName] = (stats.callsByTool[call.toolName] || 0) + 1;
    }

    stats.averageDurationMs = stats.totalCalls > 0 ? totalDuration / stats.totalCalls : 0;

    return stats;
  }

  // ==================== Private Methods ====================

  private createContext(): ToolContext {
    return {
      supabase: this.supabase,
      enterpriseId: this.enterpriseId,
      userId: this.userId,
      agentId: this.agentId,
    };
  }

  private async executeWithTimeout(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolContext,
    timeoutMs: number,
  ): Promise<ToolExecutionResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.registry.executeTool(toolName, input, context)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private recordCall(call: ToolCallRecord): void {
    this.callHistory.push(call);

    // Maintain max size
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory = this.callHistory.slice(-this.maxHistorySize);
    }
  }

  private async trackToolMetrics(
    toolName: string,
    success: boolean,
    durationMs: number,
  ): Promise<void> {
    try {
      await this.supabase.from('agent_metrics').insert({
        agent_type: this.agentId,
        operation: `tool.${toolName}`,
        duration: durationMs,
        success,
        enterprise_id: this.enterpriseId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Don't fail on metrics errors
      console.error('Failed to track tool metrics:', error);
    }
  }
}

// ==================== Factory Function ====================

export function createToolExecutor(
  supabase: SupabaseClient,
  enterpriseId: string,
  userId: string,
  agentId: string,
): ToolExecutor {
  return new ToolExecutor(supabase, enterpriseId, userId, agentId);
}
