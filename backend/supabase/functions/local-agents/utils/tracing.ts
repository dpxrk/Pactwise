// import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.1';
const uuidv4 = () => crypto.randomUUID(); // Use built-in crypto.randomUUID instead

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
  flags: number;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, unknown>;
  logs: LogEntry[];
  status: SpanStatus;
  kind: SpanKind;
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}

export enum SpanStatus {
  OK = 0,
  ERROR = 1,
  CANCELLED = 2,
}

export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

export class TracingManager {
  private spans: Map<string, Span> = new Map();
  private activeSpans: Map<string, Span> = new Map();
  private supabase: import('@supabase/supabase-js').SupabaseClient;
  private enterpriseId: string;
  private batchSize = 100;
  private batchInterval = 5000; // 5 seconds
  private pendingSpans: Span[] = [];
  private batchTimer?: ReturnType<typeof setInterval>;

  constructor(supabase: import('@supabase/supabase-js').SupabaseClient, enterpriseId: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.startBatchProcessor();
  }

  /**
   * Create a new trace context
   */
  createTraceContext(parentContext?: TraceContext): TraceContext {
    if (parentContext) {
      return {
        traceId: parentContext.traceId,
        spanId: this.generateSpanId(),
        parentSpanId: parentContext.spanId,
        baggage: { ...parentContext.baggage },
        flags: parentContext.flags,
      };
    }

    return {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      baggage: {},
      flags: 1, // Sampled
    };
  }

  /**
   * Start a new span
   */
  startSpan(
    operationName: string,
    context: TraceContext,
    serviceName: string,
    kind: SpanKind = SpanKind.INTERNAL,
  ): Span {
    const span: Span = {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operationName,
      serviceName,
      startTime: Date.now(),
      tags: {
        'enterprise.id': this.enterpriseId,
        'span.kind': SpanKind[kind],
      },
      logs: [],
      status: SpanStatus.OK,
      kind,
    };

    this.activeSpans.set(span.spanId, span);
    return span;
  }

  /**
   * End a span
   */
  endSpan(spanId: string, status: SpanStatus = SpanStatus.OK) {
    const span = this.activeSpans.get(spanId);
    if (!span) {return;}

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    this.activeSpans.delete(spanId);
    this.spans.set(spanId, span);
    this.pendingSpans.push(span);

    // Trigger batch processing if we hit the batch size
    if (this.pendingSpans.length >= this.batchSize) {
      this.flushSpans();
    }
  }

  /**
   * Add tags to a span
   */
  addTags(spanId: string, tags: Record<string, unknown>) {
    const span = this.activeSpans.get(spanId) || this.spans.get(spanId);
    if (span) {
      span.tags = { ...span.tags, ...tags };
    }
  }

  /**
   * Add a log entry to a span
   */
  addLog(spanId: string, level: LogEntry['level'], message: string, fields?: Record<string, unknown>) {
    const span = this.activeSpans.get(spanId) || this.spans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields,
      });
    }
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Headers): TraceContext | null {
    const traceHeader = headers.get('X-Trace-ID');
    const spanHeader = headers.get('X-Span-ID');
    const parentSpanHeader = headers.get('X-Parent-Span-ID');
    const baggageHeader = headers.get('X-Trace-Baggage');

    if (!traceHeader || !spanHeader) {
      return null;
    }

    return {
      traceId: traceHeader,
      spanId: spanHeader,
      parentSpanId: parentSpanHeader || undefined,
      baggage: baggageHeader ? JSON.parse(baggageHeader) : {},
      flags: 1,
    };
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(context: TraceContext, headers: Headers) {
    headers.set('X-Trace-ID', context.traceId);
    headers.set('X-Span-ID', context.spanId);
    if (context.parentSpanId) {
      headers.set('X-Parent-Span-ID', context.parentSpanId);
    }
    if (context.baggage && Object.keys(context.baggage).length > 0) {
      headers.set('X-Trace-Baggage', JSON.stringify(context.baggage));
    }
  }

  /**
   * Get current trace for a trace ID
   */
  async getTrace(traceId: string): Promise<Span[]> {
    // Get from memory first
    const memorySpans = Array.from(this.spans.values())
      .filter(span => span.traceId === traceId);

    // Get from database
    const { data: dbSpans } = await this.supabase
      .from('trace_spans')
      .select('*')
      .eq('trace_id', traceId)
      .eq('enterprise_id', this.enterpriseId);

    const allSpans = [...memorySpans];

    if (dbSpans) {
      dbSpans.forEach(dbSpan => {
        if (!allSpans.find(s => s.spanId === dbSpan.span_id)) {
          allSpans.push(this.deserializeSpan(dbSpan));
        }
      });
    }

    return allSpans.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Create a child span context
   */
  createChildContext(parentContext: TraceContext): TraceContext {
    return {
      traceId: parentContext.traceId,
      spanId: this.generateSpanId(),
      parentSpanId: parentContext.spanId,
      baggage: { ...parentContext.baggage },
      flags: parentContext.flags,
    };
  }

  /**
   * Add baggage to trace context
   */
  addBaggage(context: TraceContext, key: string, value: string): TraceContext {
    return {
      ...context,
      baggage: {
        ...context.baggage,
        [key]: value,
      },
    };
  }

  /**
   * Flush pending spans to database
   */
  private async flushSpans() {
    if (this.pendingSpans.length === 0) {return;}

    const spansToFlush = [...this.pendingSpans];
    this.pendingSpans = [];

    try {
      const serializedSpans = spansToFlush.map(span => ({
        span_id: span.spanId,
        trace_id: span.traceId,
        parent_span_id: span.parentSpanId,
        operation_name: span.operationName,
        service_name: span.serviceName,
        start_time: new Date(span.startTime).toISOString(),
        end_time: span.endTime ? new Date(span.endTime).toISOString() : null,
        duration_ms: span.duration,
        status: span.status,
        kind: span.kind,
        tags: span.tags,
        logs: span.logs,
        enterprise_id: this.enterpriseId,
      }));

      await this.supabase
        .from('trace_spans')
        .insert(serializedSpans);

      // Clean up old spans from memory
      const cutoffTime = Date.now() - 3600000; // 1 hour
      for (const [spanId, span] of this.spans) {
        if (span.endTime && span.endTime < cutoffTime) {
          this.spans.delete(spanId);
        }
      }
    } catch (error) {
      console.error('Failed to flush spans:', error);
      // Re-add spans to pending list for retry
      this.pendingSpans.unshift(...spansToFlush);
    }
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      this.flushSpans();
    }, this.batchInterval);
  }

  /**
   * Stop batch processor
   */
  stopBatchProcessor() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.flushSpans(); // Final flush
    }
  }

  /**
   * Generate a new trace ID
   */
  private generateTraceId(): string {
    return uuidv4().replace(/-/g, '');
  }

  /**
   * Generate a new span ID
   */
  private generateSpanId(): string {
    return uuidv4().replace(/-/g, '').substring(0, 16);
  }

  /**
   * Deserialize span from database
   */
  private deserializeSpan(dbSpan: Record<string, unknown>): Span {
    return {
      traceId: dbSpan.trace_id as string,
      spanId: dbSpan.span_id as string,
      parentSpanId: dbSpan.parent_span_id as string | undefined,
      operationName: dbSpan.operation_name as string,
      serviceName: dbSpan.service_name as string,
      startTime: new Date(dbSpan.start_time).getTime(),
      endTime: dbSpan.end_time ? new Date(dbSpan.end_time).getTime() : undefined,
      duration: dbSpan.duration_ms as number,
      tags: dbSpan.tags as Record<string, unknown>,
      logs: dbSpan.logs as LogEntry[],
      status: dbSpan.status as SpanStatus,
      kind: dbSpan.kind as SpanKind,
    };
  }
}

/**
 * Trace context propagation helper
 */
export class TraceContextPropagator {
  static inject(context: TraceContext): Record<string, string> {
    return {
      'x-trace-id': context.traceId,
      'x-span-id': context.spanId,
      'x-parent-span-id': context.parentSpanId || '',
      'x-trace-flags': context.flags.toString(),
      'x-trace-baggage': JSON.stringify(context.baggage || {}),
    };
  }

  static extract(headers: Record<string, string>): TraceContext | null {
    const traceId = headers['x-trace-id'];
    const spanId = headers['x-span-id'];

    if (!traceId || !spanId) {
      return null;
    }

    return {
      traceId,
      spanId,
      parentSpanId: headers['x-parent-span-id'] || undefined,
      flags: parseInt(headers['x-trace-flags'] || '1'),
      baggage: headers['x-trace-baggage'] ? JSON.parse(headers['x-trace-baggage']) : {},
    };
  }
}

/**
 * Decorator for automatic span creation
 */
export function traced(operationName?: string) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const context = (this as { traceContext?: TraceContext }).traceContext;
      const { tracingManager } = (this as { tracingManager?: TracingManager });

      if (!context || !tracingManager) {
        return originalMethod.apply(this, args);
      }

      const spanContext = tracingManager.createChildContext(context);
      const span = tracingManager.startSpan(
        operationName || `${(target as any).constructor.name}.${propertyKey}`,
        spanContext,
        (target as any).constructor.name,
        SpanKind.INTERNAL,
      );

      try {
        const result = await originalMethod.apply(this, args);
        tracingManager.endSpan(span.spanId, SpanStatus.OK);
        return result;
      } catch (error) {
        tracingManager.addLog(span.spanId, 'error', error instanceof Error ? error.message : String(error), {
          stack: error instanceof Error ? error.stack : undefined
        });
        tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
        throw error;
      }
    };

    return descriptor;
  };
}