// Distributed tracing type definitions

/**
 * Trace context for distributed tracing across agents and services
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
  flags: number;
}

/**
 * A span represents a unit of work in a distributed trace
 */
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

/**
 * Log entry within a span
 */
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
}

/**
 * Status of a span
 */
export enum SpanStatus {
  OK = 0,
  ERROR = 1,
  CANCELLED = 2,
}

/**
 * Kind of span indicating its role in the trace
 */
export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}
