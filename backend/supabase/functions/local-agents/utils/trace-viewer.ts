import { Span } from './tracing.ts';

export interface TraceViewerOptions {
  showTags?: boolean;
  showLogs?: boolean;
  showDurations?: boolean;
  showTimeline?: boolean;
}

export class TraceViewer {
  /**
   * Format a trace as a hierarchical tree
   */
  static formatTraceTree(spans: Span[], options: TraceViewerOptions = {}): string {
    const spanMap = new Map<string, Span>();
    const rootSpans: Span[] = [];

    // Build span map and identify roots
    spans.forEach(span => {
      spanMap.set(span.spanId, span);
      if (!span.parentSpanId) {
        rootSpans.push(span);
      }
    });

    // Build tree structure
    const buildTree = (span: Span, depth: number = 0): string => {
      const indent = '  '.repeat(depth);
      const duration = span.duration ? `${span.duration}ms` : 'pending';
      const status = span.status === 0 ? '✓' : '✗';

      let output = `${indent}${status} ${span.operationName} [${span.serviceName}] - ${duration}\n`;

      if (options.showTags && Object.keys(span.tags).length > 0) {
        output += `${indent}  Tags: ${JSON.stringify(span.tags)}\n`;
      }

      if (options.showLogs && span.logs.length > 0) {
        span.logs.forEach(log => {
          output += `${indent}  [${log.level}] ${log.message}\n`;
        });
      }

      // Find children
      const children = spans.filter(s => s.parentSpanId === span.spanId);
      children.forEach(child => {
        output += buildTree(child, depth + 1);
      });

      return output;
    };

    return rootSpans.map(root => buildTree(root)).join('\n');
  }

  /**
   * Generate a timeline visualization
   */
  static generateTimeline(spans: Span[]): string {
    if (spans.length === 0) {return 'No spans found';}

    // Find time bounds
    const minTime = Math.min(...spans.map(s => s.startTime));
    const maxTime = Math.max(...spans.filter(s => s.endTime).map(s => s.endTime!));
    const totalDuration = maxTime - minTime;

    // Sort spans by start time
    const sortedSpans = [...spans].sort((a, b) => a.startTime - b.startTime);

    const timeline: string[] = ['Timeline:'];
    const scale = 50; // characters width

    sortedSpans.forEach(span => {
      const startOffset = ((span.startTime - minTime) / totalDuration) * scale;
      const duration = span.endTime
        ? ((span.endTime - span.startTime) / totalDuration) * scale
        : 1;

      const bar = '█'.repeat(Math.max(1, Math.round(duration)));
      const padding = ' '.repeat(Math.round(startOffset));

      timeline.push(
        `${padding}${bar} ${span.operationName} (${span.duration || '?'}ms)`,
      );
    });

    return timeline.join('\n');
  }

  /**
   * Get trace statistics
   */
  static getTraceStats(spans: Span[]): Record<string, any> {
    const stats = {
      totalSpans: spans.length,
      totalDuration: 0,
      errorCount: 0,
      serviceBreakdown: {} as Record<string, number>,
      slowestOperations: [] as Array<{ operation: string; duration: number }>,
    };

    // Calculate total duration
    if (spans.length > 0) {
      const minTime = Math.min(...spans.map(s => s.startTime));
      const maxTime = Math.max(...spans.filter(s => s.endTime).map(s => s.endTime!));
      stats.totalDuration = maxTime - minTime;
    }

    // Count errors and service breakdown
    spans.forEach(span => {
      if (span.status !== 0) {
        stats.errorCount++;
      }

      if (!stats.serviceBreakdown[span.serviceName]) {
        stats.serviceBreakdown[span.serviceName] = 0;
      }
      stats.serviceBreakdown[span.serviceName] += span.duration || 0;
    });

    // Find slowest operations
    stats.slowestOperations = spans
      .filter(s => s.duration)
      .sort((a, b) => b.duration! - a.duration!)
      .slice(0, 5)
      .map(s => ({
        operation: `${s.serviceName}.${s.operationName}`,
        duration: s.duration!,
      }));

    return stats;
  }

  /**
   * Find critical path through the trace
   */
  static findCriticalPath(spans: Span[]): Span[] {
    const spanMap = new Map<string, Span>();
    spans.forEach(span => spanMap.set(span.spanId, span));

    // Build parent-child relationships
    const childrenMap = new Map<string, Span[]>();
    spans.forEach(span => {
      if (span.parentSpanId) {
        if (!childrenMap.has(span.parentSpanId)) {
          childrenMap.set(span.parentSpanId, []);
        }
        childrenMap.get(span.parentSpanId)!.push(span);
      }
    });

    // Find critical path recursively
    const findLongestPath = (spanId: string): { path: Span[]; duration: number } => {
      const span = spanMap.get(spanId);
      if (!span) {return { path: [], duration: 0 };}

      const children = childrenMap.get(spanId) || [];

      if (children.length === 0) {
        return { path: [span], duration: span.duration || 0 };
      }

      // Find the child with the longest path
      let longestChildPath = { path: [] as Span[], duration: 0 };

      children.forEach(child => {
        const childPath = findLongestPath(child.spanId);
        if (childPath.duration > longestChildPath.duration) {
          longestChildPath = childPath;
        }
      });

      return {
        path: [span, ...longestChildPath.path],
        duration: (span.duration || 0) + longestChildPath.duration,
      };
    };

    // Find root spans and get longest path
    const rootSpans = spans.filter(s => !s.parentSpanId);
    let criticalPath: Span[] = [];
    let maxDuration = 0;

    rootSpans.forEach(root => {
      const { path, duration } = findLongestPath(root.spanId);
      if (duration > maxDuration) {
        criticalPath = path;
        maxDuration = duration;
      }
    });

    return criticalPath;
  }

  /**
   * Export trace as JSON for external analysis
   */
  static exportTrace(spans: Span[]): string {
    const trace = {
      traceId: spans[0]?.traceId,
      spans: spans.map(span => ({
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        operationName: span.operationName,
        serviceName: span.serviceName,
        startTime: new Date(span.startTime).toISOString(),
        endTime: span.endTime ? new Date(span.endTime).toISOString() : null,
        duration: span.duration,
        status: span.status,
        tags: span.tags,
        logs: span.logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp).toISOString(),
        })),
      })),
      summary: TraceViewer.getTraceStats(spans),
    };

    return JSON.stringify(trace, null, 2);
  }
}