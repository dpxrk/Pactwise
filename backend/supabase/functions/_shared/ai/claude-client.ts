/// <reference path="../../../types/global.d.ts" />

/**
 * Claude AI Client - State-of-the-art LLM integration
 *
 * Provides Claude integration with:
 * - Function calling / tool use
 * - Streaming responses
 * - Structured output validation
 * - Cost tracking
 * - Retry logic with exponential backoff
 */

import { z } from 'zod';

// ==================== Types ====================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface ClaudeRequestOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  system?: string;
  tools?: ClaudeTool[];
  toolChoice?: 'auto' | 'any' | { type: 'tool'; name: string };
  stream?: boolean;
  stopSequences?: string[];
  metadata?: {
    userId?: string;
    enterpriseId?: string;
    taskId?: string;
  };
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamEvent {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_delta' | 'message_stop';
  index?: number;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  content_block?: ContentBlock;
  message?: Partial<ClaudeResponse>;
}

export type ClaudeModel = 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022' | 'claude-3-opus-20240229';

// Model pricing per 1M tokens (as of 2025)
const MODEL_PRICING: Record<ClaudeModel, { input: number; output: number }> = {
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
};

// ==================== Claude Client ====================

export class ClaudeClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private defaultModel: ClaudeModel = 'claude-3-5-sonnet-20241022';
  private maxRetries = 3;
  private baseDelay = 1000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || Deno.env.get('ANTHROPIC_API_KEY') || '';
    if (!this.apiKey) {
      console.warn('ClaudeClient: ANTHROPIC_API_KEY not set. LLM features will be disabled.');
    }
  }

  /**
   * Check if the client is configured with an API key
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Send a message to Claude and get a response
   */
  async chat(
    messages: ClaudeMessage[],
    options: ClaudeRequestOptions = {},
  ): Promise<ClaudeResponse> {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 4096;

    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: this.formatMessages(messages),
    };

    if (options.system) {
      requestBody.system = options.system;
    }

    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.toolChoice || 'auto';
    }

    if (options.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    const response = await this.makeRequestWithRetry('/messages', requestBody);
    return this.parseResponse(response);
  }

  /**
   * Stream a response from Claude
   */
  async *chatStream(
    messages: ClaudeMessage[],
    options: ClaudeRequestOptions = {},
  ): AsyncGenerator<StreamEvent> {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 4096;

    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: this.formatMessages(messages),
      stream: true,
    };

    if (options.system) {
      requestBody.system = options.system;
    }

    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.toolChoice || 'auto';
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data && data !== '[DONE]') {
            try {
              const event = JSON.parse(data) as StreamEvent;
              yield event;
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    }
  }

  /**
   * Process with tools using the agentic loop pattern
   * Executes tools and continues conversation until completion
   */
  async processWithTools(
    prompt: string,
    tools: ClaudeTool[],
    toolExecutor: (name: string, input: Record<string, unknown>) => Promise<unknown>,
    options: ClaudeRequestOptions = {},
  ): Promise<{
    response: ClaudeResponse;
    toolCalls: Array<{ name: string; input: Record<string, unknown>; result: unknown }>;
    totalUsage: { inputTokens: number; outputTokens: number };
  }> {
    const messages: ClaudeMessage[] = [{ role: 'user', content: prompt }];
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: unknown }> = [];
    let totalUsage = { inputTokens: 0, outputTokens: 0 };
    let response: ClaudeResponse;
    const maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      response = await this.chat(messages, {
        ...options,
        tools,
        toolChoice: iteration === 1 ? 'auto' : 'auto',
      });

      totalUsage.inputTokens += response.usage.inputTokens;
      totalUsage.outputTokens += response.usage.outputTokens;

      // Check if Claude wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0 || response.stopReason !== 'tool_use') {
        // No more tool calls, return final response
        return { response, toolCalls, totalUsage };
      }

      // Execute all tool calls
      const assistantMessage: ClaudeMessage = {
        role: 'assistant',
        content: response.content,
      };
      messages.push(assistantMessage);

      const toolResults: ContentBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        try {
          const result = await toolExecutor(toolUse.name, toolUse.input);
          toolCalls.push({ name: toolUse.name, input: toolUse.input, result });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          toolCalls.push({ name: toolUse.name, input: toolUse.input, result: { error: errorMessage } });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: errorMessage }),
            is_error: true,
          });
        }
      }

      // Add tool results to conversation
      messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    throw new Error('Max iterations reached in tool processing loop');
  }

  /**
   * Process with structured output using Zod schema validation
   */
  async processWithSchema<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options: ClaudeRequestOptions = {},
  ): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
    // Convert Zod schema to JSON schema for Claude
    const jsonSchema = this.zodToJsonSchema(schema);

    const systemPrompt = `${options.system || ''}

You MUST respond with a valid JSON object that matches this schema exactly:
${JSON.stringify(jsonSchema, null, 2)}

Your response should be ONLY the JSON object, nothing else. No markdown, no explanation, just the JSON.`;

    const response = await this.chat(
      [{ role: 'user', content: prompt }],
      {
        ...options,
        system: systemPrompt,
        temperature: 0, // Lower temperature for structured output
      },
    );

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse and validate JSON
    const text = textContent.text || '';
    let jsonStr = text.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const validated = schema.parse(parsed);
      return { data: validated, usage: response.usage };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(
    model: ClaudeModel,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const pricing = MODEL_PRICING[model];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Get pricing info for a model
   */
  getModelPricing(model: ClaudeModel): { input: number; output: number } {
    return MODEL_PRICING[model];
  }

  // ==================== Private Methods ====================

  private formatMessages(messages: ClaudeMessage[]): ClaudeMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private async makeRequestWithRetry(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          return await response.json();
        }

        const errorText = await response.text();

        // Don't retry client errors (4xx) except rate limits (429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        // Retry on server errors and rate limits
        lastError = new Error(`Claude API error: ${response.status} - ${errorText}`);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Exponential backoff with jitter
      if (attempt < this.maxRetries - 1) {
        const delay = this.baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private parseResponse(raw: unknown): ClaudeResponse {
    const data = raw as Record<string, unknown>;
    return {
      id: data.id as string,
      type: 'message',
      role: 'assistant',
      content: (data.content as ContentBlock[]) || [],
      model: data.model as string,
      stopReason: data.stop_reason as ClaudeResponse['stopReason'],
      usage: {
        inputTokens: (data.usage as Record<string, number>)?.input_tokens || 0,
        outputTokens: (data.usage as Record<string, number>)?.output_tokens || 0,
      },
    };
  }

  /**
   * Convert Zod schema to JSON Schema (simplified version)
   */
  private zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
    // This is a simplified converter. For production, use zod-to-json-schema library
    const def = schema._def;

    if (def.typeName === 'ZodObject') {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodToJsonSchema(value as z.ZodSchema);
        const valueDef = (value as z.ZodSchema)._def;
        if (valueDef.typeName !== 'ZodOptional') {
          required.push(key);
        }
      }

      return { type: 'object', properties, required };
    }

    if (def.typeName === 'ZodString') {
      return { type: 'string' };
    }

    if (def.typeName === 'ZodNumber') {
      return { type: 'number' };
    }

    if (def.typeName === 'ZodBoolean') {
      return { type: 'boolean' };
    }

    if (def.typeName === 'ZodArray') {
      return {
        type: 'array',
        items: this.zodToJsonSchema(def.type),
      };
    }

    if (def.typeName === 'ZodEnum') {
      return {
        type: 'string',
        enum: def.values,
      };
    }

    if (def.typeName === 'ZodOptional') {
      return this.zodToJsonSchema(def.innerType);
    }

    if (def.typeName === 'ZodNullable') {
      const inner = this.zodToJsonSchema(def.innerType);
      return { ...inner, nullable: true };
    }

    // Default fallback
    return { type: 'string' };
  }
}

// ==================== Singleton Export ====================

let clientInstance: ClaudeClient | null = null;

export function getClaudeClient(): ClaudeClient {
  if (!clientInstance) {
    clientInstance = new ClaudeClient();
  }
  return clientInstance;
}

export function createClaudeClient(apiKey?: string): ClaudeClient {
  return new ClaudeClient(apiKey);
}
