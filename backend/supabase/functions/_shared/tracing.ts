import { recordMetric } from './performance-monitoring.ts';

export interface TraceContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    sampled?: boolean;
}

export function createTraceContext(req?: Request): TraceContext {
    const traceParent = req?.headers.get('traceparent');
    if (traceParent) {
        const parts = traceParent.split('-');
        if (parts.length === 4) {
            return {
                traceId: parts[1],
                parentSpanId: parts[2],
                spanId: crypto.randomUUID(),
                sampled: parts[3] === '01',
            };
        }
    }

    return {
        traceId: crypto.randomUUID(),
        spanId: crypto.randomUUID(),
    };
}

export function startSpan(_name: string, context: TraceContext): TraceContext {
    const result: TraceContext = {
        traceId: context.traceId,
        parentSpanId: context.spanId,
        spanId: crypto.randomUUID(),
    };
    if (context.sampled !== undefined) {
        result.sampled = context.sampled;
    }
    return result;
}

export function endSpan(span: TraceContext, name: string, duration: number, tags?: Record<string, string>) {
    if (span.sampled) {
        recordMetric({
            name: `${name}.duration`,
            value: duration,
            unit: 'ms',
            tags: {
                ...tags,
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId || '',
            },
        });
    }
}

export async function withTracing<T>(
    name: string,
    context: TraceContext,
    fn: (spanContext: TraceContext) => Promise<T>
): Promise<T> {
    const spanContext = startSpan(name, context);
    const startTime = Date.now();
    try {
        return await fn(spanContext);
    } finally {
        const duration = Date.now() - startTime;
        endSpan(spanContext, name, duration);
    }
}
