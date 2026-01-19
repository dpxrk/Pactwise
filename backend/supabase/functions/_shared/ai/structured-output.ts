/// <reference path="../../../types/global.d.ts" />

/**
 * Structured Output Validation
 *
 * Ensures AI responses match expected Zod schemas with:
 * - Automatic retry on validation failure
 * - Schema-to-prompt conversion
 * - Fallback to rule-based processing
 */

import { z } from 'zod';
import { getClaudeClient, ClaudeModel, ClaudeRequestOptions } from './claude-client.ts';

// ==================== Types ====================

export interface StructuredOutputOptions<T> {
  schema: z.ZodSchema<T>;
  prompt: string;
  systemPrompt?: string;
  model?: ClaudeModel;
  maxRetries?: number;
  fallback?: () => T | Promise<T>;
  onValidationError?: (error: z.ZodError, attempt: number) => void;
}

export interface StructuredOutputResult<T> {
  data: T;
  attempts: number;
  usedFallback: boolean;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ==================== Pre-defined Output Schemas ====================

/**
 * Contract Analysis Output Schema
 */
export const ContractAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']),
  summary: z.string().max(500),
  keyFindings: z.array(z.object({
    category: z.string(),
    finding: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    recommendation: z.string().optional(),
  })),
  riskAreas: z.array(z.object({
    area: z.string(),
    riskLevel: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    mitigation: z.string().optional(),
  })),
  detailedScores: z.object({
    legalCompliance: z.number().min(0).max(100),
    financialTerms: z.number().min(0).max(100),
    riskExposure: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
  }),
  extractedTerms: z.object({
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    value: z.number().nullable(),
    autoRenewal: z.boolean().nullable(),
    terminationClause: z.string().nullable(),
    paymentTerms: z.string().nullable(),
  }),
});

export type ContractAnalysisOutput = z.infer<typeof ContractAnalysisSchema>;

/**
 * Vendor Analysis Output Schema
 */
export const VendorAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  recommendation: z.enum(['highly_recommended', 'recommended', 'neutral', 'caution', 'not_recommended']),
  summary: z.string().max(500),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
  })),
  categoryScores: z.object({
    reliability: z.number().min(0).max(100),
    pricing: z.number().min(0).max(100),
    quality: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    compliance: z.number().min(0).max(100),
  }),
});

export type VendorAnalysisOutput = z.infer<typeof VendorAnalysisSchema>;

/**
 * Clause Classification Output Schema
 */
export const ClauseClassificationSchema = z.object({
  clauseType: z.enum([
    'indemnification',
    'limitation_of_liability',
    'termination',
    'confidentiality',
    'intellectual_property',
    'payment_terms',
    'warranties',
    'force_majeure',
    'dispute_resolution',
    'governing_law',
    'assignment',
    'notice',
    'amendment',
    'severability',
    'entire_agreement',
    'other',
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(200),
  keyTerms: z.array(z.string()),
  riskLevel: z.enum(['critical', 'high', 'medium', 'low', 'none']),
  favorability: z.enum(['very_favorable', 'favorable', 'neutral', 'unfavorable', 'very_unfavorable']),
  suggestedChanges: z.array(z.string()).optional(),
});

export type ClauseClassificationOutput = z.infer<typeof ClauseClassificationSchema>;

/**
 * Task Planning Output Schema
 */
export const TaskPlanSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    estimatedEffort: z.enum(['minimal', 'small', 'medium', 'large', 'extensive']),
    dependencies: z.array(z.string()).default([]),
    assignedAgent: z.string().optional(),
  })),
  executionOrder: z.array(z.string()),
  totalEstimatedEffort: z.string(),
  risks: z.array(z.object({
    risk: z.string(),
    mitigation: z.string(),
  })),
});

export type TaskPlanOutput = z.infer<typeof TaskPlanSchema>;

/**
 * Intent Classification Output Schema
 */
export const IntentClassificationSchema = z.object({
  primaryIntent: z.string(),
  confidence: z.number().min(0).max(1),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  requiredActions: z.array(z.string()),
  suggestedAgent: z.string().optional(),
  urgency: z.enum(['immediate', 'high', 'normal', 'low']),
});

export type IntentClassificationOutput = z.infer<typeof IntentClassificationSchema>;

// ==================== Structured Output Processor ====================

export class StructuredOutputProcessor {
  private claude = getClaudeClient();

  /**
   * Process input and return validated structured output
   */
  async process<T>(options: StructuredOutputOptions<T>): Promise<StructuredOutputResult<T>> {
    const maxRetries = options.maxRetries || 3;
    let lastError: z.ZodError | null = null;
    let totalUsage = { inputTokens: 0, outputTokens: 0 };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Build system prompt with schema
        const schemaDescription = this.schemaToDescription(options.schema);
        const systemPrompt = this.buildSystemPrompt(options.systemPrompt, schemaDescription);

        // Add retry context if needed
        let prompt = options.prompt;
        if (attempt > 1 && lastError) {
          prompt = `${options.prompt}\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Errors:\n${lastError.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n')}\n\nPlease correct your response to match the schema exactly.`;
        }

        const result = await this.claude.processWithSchema(
          prompt,
          options.schema,
          {
            model: options.model || 'claude-3-5-sonnet-20241022',
            system: systemPrompt,
            temperature: attempt === 1 ? 0.1 : 0, // Lower temperature on retries
          },
        );

        totalUsage.inputTokens += result.usage.inputTokens;
        totalUsage.outputTokens += result.usage.outputTokens;

        return {
          data: result.data,
          attempts: attempt,
          usedFallback: false,
          usage: totalUsage,
        };

      } catch (error) {
        if (error instanceof z.ZodError) {
          lastError = error;
          options.onValidationError?.(error, attempt);
        } else {
          // Non-validation error, try fallback
          console.error(`Structured output error (attempt ${attempt}):`, error);
        }
      }
    }

    // Use fallback if provided
    if (options.fallback) {
      const fallbackData = await options.fallback();
      return {
        data: fallbackData,
        attempts: maxRetries,
        usedFallback: true,
        usage: totalUsage,
      };
    }

    throw new Error(`Failed to get valid structured output after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Analyze a contract with structured output
   */
  async analyzeContract(
    contractText: string,
    options: { model?: ClaudeModel; fallback?: () => ContractAnalysisOutput } = {},
  ): Promise<StructuredOutputResult<ContractAnalysisOutput>> {
    return this.process({
      schema: ContractAnalysisSchema,
      prompt: `Analyze the following contract and provide a comprehensive assessment:\n\n${contractText}`,
      systemPrompt: 'You are an expert contract analyst. Analyze contracts for legal compliance, financial terms, risk exposure, and provide actionable recommendations.',
      model: options.model,
      fallback: options.fallback,
    });
  }

  /**
   * Analyze a vendor with structured output
   */
  async analyzeVendor(
    vendorInfo: string,
    options: { model?: ClaudeModel; fallback?: () => VendorAnalysisOutput } = {},
  ): Promise<StructuredOutputResult<VendorAnalysisOutput>> {
    return this.process({
      schema: VendorAnalysisSchema,
      prompt: `Analyze the following vendor information and provide a comprehensive assessment:\n\n${vendorInfo}`,
      systemPrompt: 'You are an expert vendor analyst. Evaluate vendors based on reliability, pricing, quality, communication, and compliance.',
      model: options.model,
      fallback: options.fallback,
    });
  }

  /**
   * Classify a contract clause
   */
  async classifyClause(
    clauseText: string,
    options: { model?: ClaudeModel; fallback?: () => ClauseClassificationOutput } = {},
  ): Promise<StructuredOutputResult<ClauseClassificationOutput>> {
    return this.process({
      schema: ClauseClassificationSchema,
      prompt: `Classify and analyze the following contract clause:\n\n${clauseText}`,
      systemPrompt: 'You are a legal expert specializing in contract analysis. Classify clauses by type, assess their risk level, and determine favorability.',
      model: options.model || 'claude-3-5-haiku-20241022', // Use Haiku for faster classification
      fallback: options.fallback,
    });
  }

  /**
   * Plan tasks for an agent
   */
  async planTasks(
    taskDescription: string,
    options: { model?: ClaudeModel; fallback?: () => TaskPlanOutput } = {},
  ): Promise<StructuredOutputResult<TaskPlanOutput>> {
    return this.process({
      schema: TaskPlanSchema,
      prompt: `Create a detailed task plan for the following request:\n\n${taskDescription}`,
      systemPrompt: 'You are a project planning expert. Break down complex tasks into manageable subtasks with clear dependencies and priorities.',
      model: options.model,
      fallback: options.fallback,
    });
  }

  /**
   * Classify user intent
   */
  async classifyIntent(
    userMessage: string,
    options: { model?: ClaudeModel; fallback?: () => IntentClassificationOutput } = {},
  ): Promise<StructuredOutputResult<IntentClassificationOutput>> {
    return this.process({
      schema: IntentClassificationSchema,
      prompt: `Analyze the following user message and classify the intent:\n\n${userMessage}`,
      systemPrompt: 'You are an expert at understanding user intent. Extract the primary intent, relevant entities, and determine required actions.',
      model: options.model || 'claude-3-5-haiku-20241022',
      fallback: options.fallback,
    });
  }

  // ==================== Private Methods ====================

  private buildSystemPrompt(customPrompt?: string, schemaDescription?: string): string {
    const parts: string[] = [];

    if (customPrompt) {
      parts.push(customPrompt);
    }

    parts.push('You must respond with a valid JSON object that strictly follows the specified schema.');
    parts.push('Do not include any explanation, markdown formatting, or additional text outside the JSON.');

    if (schemaDescription) {
      parts.push(`\nRequired output format:\n${schemaDescription}`);
    }

    return parts.join('\n\n');
  }

  private schemaToDescription(schema: z.ZodSchema): string {
    // Convert Zod schema to human-readable description
    const def = schema._def;

    if (def.typeName === 'ZodObject') {
      const shape = def.shape();
      const fields: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const fieldDesc = this.fieldToDescription(key, value as z.ZodSchema);
        fields.push(fieldDesc);
      }

      return `{\n${fields.join(',\n')}\n}`;
    }

    return JSON.stringify(this.zodToJsonSchema(schema), null, 2);
  }

  private fieldToDescription(name: string, schema: z.ZodSchema): string {
    const def = schema._def;
    let type = def.typeName.replace('Zod', '').toLowerCase();

    if (def.typeName === 'ZodEnum') {
      type = `"${def.values.join('" | "')}"`;
    } else if (def.typeName === 'ZodArray') {
      type = `${this.fieldToDescription('', def.type).trim()}[]`;
    } else if (def.typeName === 'ZodObject') {
      type = '{...}';
    } else if (def.typeName === 'ZodOptional') {
      const inner = this.fieldToDescription(name, def.innerType);
      return `  "${name}": ${inner.split(':')[1]?.trim() || 'optional'}`;
    }

    return `  "${name}": ${type}`;
  }

  private zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
    const def = schema._def;

    if (def.typeName === 'ZodObject') {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodToJsonSchema(value as z.ZodSchema);
        if ((value as z.ZodSchema)._def.typeName !== 'ZodOptional') {
          required.push(key);
        }
      }

      return { type: 'object', properties, required };
    }

    if (def.typeName === 'ZodString') {
      return { type: 'string' };
    }

    if (def.typeName === 'ZodNumber') {
      const result: Record<string, unknown> = { type: 'number' };
      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === 'min') result.minimum = check.value;
          if (check.kind === 'max') result.maximum = check.value;
        }
      }
      return result;
    }

    if (def.typeName === 'ZodBoolean') {
      return { type: 'boolean' };
    }

    if (def.typeName === 'ZodArray') {
      return { type: 'array', items: this.zodToJsonSchema(def.type) };
    }

    if (def.typeName === 'ZodEnum') {
      return { type: 'string', enum: def.values };
    }

    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodNullable') {
      return this.zodToJsonSchema(def.innerType);
    }

    return { type: 'string' };
  }
}

// ==================== Singleton Export ====================

let processorInstance: StructuredOutputProcessor | null = null;

export function getStructuredOutputProcessor(): StructuredOutputProcessor {
  if (!processorInstance) {
    processorInstance = new StructuredOutputProcessor();
  }
  return processorInstance;
}
