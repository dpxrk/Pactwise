/// <reference path="../../types/global.d.ts" />

/**
 * Enhanced SSE Streaming Utilities
 *
 * Provides robust Server-Sent Events streaming with:
 * - Automatic reconnection support
 * - Backpressure handling
 * - Event ID tracking for resume
 * - Heartbeat keepalive
 * - Error recovery
 */

import { getCorsHeaders } from './cors.ts';

// ==================== Types ====================

export interface SSEMessage {
  id?: string;
  event?: string;
  data: unknown;
  retry?: number;
}

export interface SSEOptions {
  /** Send heartbeat every N milliseconds (default: 30000) */
  heartbeatInterval?: number;
  /** Retry delay suggestion for clients (default: 3000) */
  retryDelay?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** On client disconnect callback */
  onDisconnect?: () => void;
  /** Request object for CORS */
  req?: Request;
}

export interface StreamWriter {
  write: (message: SSEMessage) => Promise<void>;
  writeText: (text: string, event?: string) => Promise<void>;
  writeJSON: (data: unknown, event?: string) => Promise<void>;
  writeError: (error: Error | string) => Promise<void>;
  close: () => void;
  isClosed: () => boolean;
}

// ==================== SSE Stream Creator ====================

/**
 * Create an SSE stream response
 */
export function createSSEStream(
  options: SSEOptions = {},
): { response: Response; writer: StreamWriter } {
  const {
    heartbeatInterval = 30000,
    retryDelay = 3000,
    headers = {},
    onDisconnect,
    req,
  } = options;

  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let isClosed = false;
  let heartbeatTimer: number | null = null;
  let messageCounter = 0;
  const encoder = new TextEncoder();

  // Create the stream
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;

      // Send initial retry suggestion
      if (retryDelay > 0) {
        const initMessage = `retry: ${retryDelay}\n\n`;
        controller.enqueue(encoder.encode(initMessage));
      }

      // Start heartbeat
      if (heartbeatInterval > 0) {
        heartbeatTimer = setInterval(() => {
          if (!isClosed && controller) {
            try {
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } catch {
              // Stream closed
            }
          }
        }, heartbeatInterval) as unknown as number;
      }
    },
    cancel() {
      isClosed = true;
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
      }
      onDisconnect?.();
    },
  });

  // Build headers
  const responseHeaders: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
    ...(req ? getCorsHeaders(req) : {}),
    ...headers,
  };

  // Create response
  const response = new Response(stream, {
    status: 200,
    headers: responseHeaders,
  });

  // Create writer interface
  const writer: StreamWriter = {
    write: async (message: SSEMessage) => {
      if (isClosed || !controller) {
        throw new Error('Stream is closed');
      }

      const lines: string[] = [];

      // Add message ID
      const id = message.id || `${Date.now()}-${++messageCounter}`;
      lines.push(`id: ${id}`);

      // Add event type
      if (message.event) {
        lines.push(`event: ${message.event}`);
      }

      // Add data (handle multi-line)
      const dataStr = typeof message.data === 'string'
        ? message.data
        : JSON.stringify(message.data);

      for (const line of dataStr.split('\n')) {
        lines.push(`data: ${line}`);
      }

      // Add retry if specified
      if (message.retry !== undefined) {
        lines.push(`retry: ${message.retry}`);
      }

      lines.push(''); // Empty line to end message
      lines.push('');

      const encoded = encoder.encode(lines.join('\n'));

      try {
        controller.enqueue(encoded);
      } catch (error) {
        isClosed = true;
        throw error;
      }
    },

    writeText: async (text: string, event?: string) => {
      await writer.write({ data: text, event });
    },

    writeJSON: async (data: unknown, event?: string) => {
      await writer.write({ data: JSON.stringify(data), event });
    },

    writeError: async (error: Error | string) => {
      const errorMessage = error instanceof Error ? error.message : error;
      await writer.write({
        event: 'error',
        data: { error: errorMessage },
      });
    },

    close: () => {
      if (!isClosed && controller) {
        isClosed = true;
        if (heartbeatTimer !== null) {
          clearInterval(heartbeatTimer);
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },

    isClosed: () => isClosed,
  };

  return { response, writer };
}

// ==================== Stream Transformers ====================

/**
 * Transform an async generator into an SSE stream
 */
export function generatorToSSE<T>(
  generator: AsyncGenerator<T>,
  options: SSEOptions & {
    transform?: (item: T) => SSEMessage | null;
    errorEvent?: string;
    completeEvent?: string;
  } = {},
): Response {
  const { transform, errorEvent = 'error', completeEvent = 'complete', ...sseOptions } = options;

  const { response, writer } = createSSEStream(sseOptions);

  // Process generator in background
  (async () => {
    try {
      for await (const item of generator) {
        if (writer.isClosed()) break;

        const message = transform
          ? transform(item)
          : { data: item };

        if (message) {
          await writer.write(message);
        }
      }

      // Send completion event
      if (!writer.isClosed()) {
        await writer.write({
          event: completeEvent,
          data: { status: 'complete' },
        });
      }
    } catch (error) {
      if (!writer.isClosed()) {
        await writer.write({
          event: errorEvent,
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } finally {
      writer.close();
    }
  })();

  return response;
}

/**
 * Create an SSE stream from Claude streaming response
 */
export async function* claudeStreamToSSE(
  streamGenerator: AsyncGenerator<{
    type: string;
    delta?: { type: string; text?: string };
    content_block?: { type: string; text?: string };
  }>,
): AsyncGenerator<SSEMessage> {
  let fullText = '';
  let tokenCount = 0;

  for await (const event of streamGenerator) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      fullText += event.delta.text;
      tokenCount++;

      yield {
        event: 'delta',
        data: {
          text: event.delta.text,
          fullText,
          tokenCount,
        },
      };
    } else if (event.type === 'message_stop') {
      yield {
        event: 'complete',
        data: {
          fullText,
          tokenCount,
        },
      };
    } else if (event.type === 'content_block_start' && event.content_block) {
      yield {
        event: 'start',
        data: {
          type: event.content_block.type,
        },
      };
    }
  }
}

// ==================== Resumable Stream ====================

/**
 * Create a resumable SSE stream that tracks Last-Event-ID
 */
export function createResumableSSEStream(
  req: Request,
  options: SSEOptions = {},
): {
  response: Response;
  writer: StreamWriter;
  lastEventId: string | null;
} {
  const lastEventId = req.headers.get('Last-Event-ID');

  const { response, writer } = createSSEStream({
    ...options,
    req,
  });

  return { response, writer, lastEventId };
}

// ==================== Backpressure Handler ====================

/**
 * Create an SSE stream with backpressure handling
 */
export function createBackpressureSSEStream(
  options: SSEOptions & {
    bufferSize?: number;
    onBackpressure?: () => void;
  } = {},
): {
  response: Response;
  writer: StreamWriter & { bufferLength: () => number };
} {
  const { bufferSize = 100, onBackpressure, ...sseOptions } = options;

  const buffer: SSEMessage[] = [];
  let isProcessing = false;

  const { response, writer: baseWriter } = createSSEStream(sseOptions);

  const processBuffer = async () => {
    if (isProcessing || buffer.length === 0) return;
    isProcessing = true;

    while (buffer.length > 0 && !baseWriter.isClosed()) {
      const message = buffer.shift()!;
      try {
        await baseWriter.write(message);
      } catch {
        // Put back in buffer on failure
        buffer.unshift(message);
        break;
      }
    }

    isProcessing = false;
  };

  const writer = {
    ...baseWriter,
    write: async (message: SSEMessage) => {
      if (buffer.length >= bufferSize) {
        onBackpressure?.();
        // Drop oldest messages when buffer is full
        buffer.shift();
      }
      buffer.push(message);
      await processBuffer();
    },
    bufferLength: () => buffer.length,
  };

  return { response, writer };
}

// ==================== Type Exports ====================

export type { SSEMessage, SSEOptions, StreamWriter };
