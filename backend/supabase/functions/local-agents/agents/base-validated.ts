import { AuthenticatedBaseAgent } from './base-authenticated.ts';
import { ProcessingResult, AgentContext } from './base.ts';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { validateAgentOperation } from '../schemas/agent-operations.ts';
import { sanitizers } from '../middleware/validation.ts';
import { validateRequest } from '../../_shared/validation.ts';
import { SpanKind, SpanStatus } from '../utils/tracing.ts';

/**
 * Base agent with built-in validation
 */
export abstract class ValidatedBaseAgent extends AuthenticatedBaseAgent {
  private validationErrors: Array<{ timestamp: Date; operation: string; errors: string[] }> = [];

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId);
  }

  /**
   * Get operation schema for this agent
   */
  abstract getOperationSchema(): z.ZodSchema<unknown>;

  /**
   * Process with validation
   */
  async process(data: unknown, context?: AgentContext): Promise<ProcessingResult> {
    const span = this.tracingManager.startSpan(
      `${this.agentType}.validate_and_process`,
      this.traceContext || this.tracingManager.createTraceContext(),
      this.agentType,
      SpanKind.INTERNAL,
    );

    try {
      // Validate operation
      const validation = validateAgentOperation(this.agentType, data);

      if (!validation.success) {
        this.logValidationError(data.action || 'unknown', validation.errors!);

        this.tracingManager.addLog(
          span.spanId,
          'error',
          'Validation failed',
          { errors: validation.errors },
        );
        this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);

        return this.createResult(
          false,
          null,
          [
            this.createInsight(
              'validation_error',
              'high',
              'Input Validation Failed',
              `The provided data does not meet validation requirements: ${validation.errors?.join(', ')}`,
              'Review and correct the input data',
            ),
          ],
          [],
          0,
          { validationErrors: validation.errors },
        );
      }

      // Sanitize data
      const sanitizedData = this.sanitizeData(validation.data);

      this.tracingManager.addLog(
        span.spanId,
        'info',
        'Validation successful',
        { operation: sanitizedData.action },
      );

      // Process with validated and sanitized data
      const result = await this.processValidated(sanitizedData, context);

      this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
      return result;

    } catch (error) {
      this.tracingManager.addLog(
        span.spanId,
        'error',
        'Processing error',
        { error: error instanceof Error ? error.message : String(error) },
      );
      this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
      throw error;
    }
  }

  /**
   * Process with validated data
   */
  protected abstract processValidated(
    data: unknown,
    context?: AgentContext
  ): Promise<ProcessingResult>;

  /**
   * Validate entity data
   */
  protected async validateEntity<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    entityType: string,
  ): Promise<{ valid: boolean; data?: T; errors?: string[] }> {
    try {
      const validatedData = await validateRequest(schema, data);
      return { valid: true, data: validatedData as T };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) =>
          `${entityType}.${e.path.join('.')}: ${e.message}`,
        );
        return { valid: false, errors };
      }
      return { 
        valid: false, 
        errors: [`${entityType}: ${error instanceof Error ? error.message : String(error)}`] 
      };
    }
  }

  /**
   * Sanitize data based on type
   */
  protected sanitizeData(data: unknown): unknown {
    if (typeof data === 'string') {
      return sanitizers.normalizeWhitespace(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(data)) {
        // Skip null/undefined
        if (value === null || value === undefined) {continue;}

        // Special handling for known fields
        if (key === 'email' && typeof value === 'string') {
          sanitized[key] = value.toLowerCase().trim();
        } else if (key === 'phone' && typeof value === 'string') {
          sanitized[key] = value.replace(/\D/g, '');
        } else if (key.includes('url') && typeof value === 'string') {
          sanitized[key] = value.trim();
        } else if (typeof value === 'string' && key.includes('name')) {
          sanitized[key] = sanitizers.normalizeWhitespace(value);
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Validate batch operations
   */
  protected async validateBatch<T>(
    items: unknown[],
    schema: z.ZodSchema<T>,
    options: {
      continueOnError?: boolean;
      maxErrors?: number;
    } = {},
  ): Promise<{
    valid: T[];
    invalid: Array<{ index: number; errors: string[] }>;
  }> {
    const valid: T[] = [];
    const invalid: Array<{ index: number; errors: string[] }> = [];

    for (let i = 0; i < items.length; i++) {
      const result = schema.safeParse(items[i]);

      if (result.success) {
        valid.push(result.data);
      } else {
        const errors = result.error.errors.map(e =>
          `Item ${i}.${e.path.join('.')}: ${e.message}`,
        );

        invalid.push({ index: i, errors });

        if (!options.continueOnError) {
          break;
        }

        if (options.maxErrors && invalid.length >= options.maxErrors) {
          break;
        }
      }
    }

    return { valid, invalid };
  }

  /**
   * Validate business rules
   */
  protected async validateBusinessRules(
    operation: string,
    data: unknown,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Example business rules (override in subclasses)
    const dataObj = data as Record<string, unknown>;
    switch (operation) {
      case 'create_contract':
        if (dataObj.endDate && new Date(dataObj.endDate as string) < new Date()) {
          errors.push('Cannot create contract with past end date');
        }
        break;

      case 'approve_vendor':
        if (!dataObj.complianceChecked) {
          errors.push('Compliance check required before approval');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Log validation errors for monitoring
   */
  private logValidationError(operation: string, errors: string[]) {
    this.validationErrors.push({
      timestamp: new Date(),
      operation,
      errors,
    });

    // Keep only last 100 errors
    if (this.validationErrors.length > 100) {
      this.validationErrors = this.validationErrors.slice(-100);
    }

    // Log to database for monitoring
    (async () => {
      try {
        await this.supabase
          .from('agent_validation_errors')
          .insert({
            agent_id: this.agentId,
            agent_type: this.agentType,
            operation,
            errors,
            enterprise_id: this.enterpriseId,
          });
      } catch (error) {
        console.error(error);
      }
    })();
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalErrors: number;
    recentErrors: Array<{ timestamp: Date; operation: string; errorCount: number }>;
    commonErrors: Array<{ error: string; count: number }>;
  } {
    const allErrors = this.validationErrors.flatMap(ve => ve.errors);
    const errorCounts = new Map<string, number>();

    allErrors.forEach(error => {
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: this.validationErrors.length,
      recentErrors: this.validationErrors.slice(-10).map(ve => ({
        timestamp: ve.timestamp,
        operation: ve.operation,
        errorCount: ve.errors.length,
      })),
      commonErrors,
    };
  }

  /**
   * Create a validated sub-operation
   */
  protected async executeValidatedOperation<TInput, TOutput>(
    operationName: string,
    inputSchema: z.ZodSchema<TInput>,
    input: unknown,
    operation: (data: TInput) => Promise<TOutput>,
  ): Promise<{ success: boolean; data?: TOutput; error?: string }> {
    const validation = inputSchema.safeParse(input);

    if (!validation.success) {
      const errors = validation.error.errors.map(e =>
        `${e.path.join('.')}: ${e.message}`,
      );

      return {
        success: false,
        error: `Validation failed for ${operationName}: ${errors.join(', ')}`,
      };
    }

    try {
      const result = await operation(validation.data);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `${operationName} failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Validate configuration update
   */
  async updateConfiguration(config: unknown): Promise<{ success: boolean; errors?: string[] }> {
    // Define config schema (can be overridden)
    const configSchema = z.object({
      timeout: z.number().int().min(1000).max(300000).optional(),
      retryPolicy: z.object({
        maxRetries: z.number().int().min(0).max(10),
        initialDelay: z.number().int().min(100),
        backoffMultiplier: z.number().min(1).max(5),
      }).optional(),
      features: z.record(z.string(), z.boolean()).optional(),
    });

    const validation = configSchema.safeParse(config);

    if (!validation.success) {
      return {
        success: false,
        errors: validation.error.errors.map(e =>
          `config.${e.path.join('.')}: ${e.message}`,
        ),
      };
    }

    // Apply validated config
    this.metadata = { ...this.metadata, config: validation.data };

    return { success: true };
  }
}