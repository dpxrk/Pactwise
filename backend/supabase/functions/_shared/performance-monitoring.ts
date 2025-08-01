// import { logSecurityEvent } from './security-monitoring.ts'; // Unused import

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count';
    tags?: Record<string, string>;
}

export function recordMetric(metric: PerformanceMetric) {
    // In a real application, this would send the metric to a monitoring service like DataDog or Prometheus
    console.log(`PERF_METRIC: ${metric.name}=${metric.value}${metric.unit}`, metric.tags || '');
}

export async function measureQuery<T>(
    query: () => Promise<T>,
    name: string,
    tags?: Record<string, string>
): Promise<T> {
    const startTime = Date.now();
    try {
        return await query();
    } finally {
        const duration = Date.now() - startTime;
        const metric: PerformanceMetric = { name, value: duration, unit: 'ms' };
        if (tags) {
            metric.tags = tags;
        }
        recordMetric(metric);
    }
}

export function withPerformanceMonitoring(
    handler: (context: any) => Promise<Response>,
    handlerName: string
) {
    return async (context: any) => {
        const startTime = Date.now();
        try {
            const response = await handler(context);
            const duration = Date.now() - startTime;

            recordMetric({
                name: `${handlerName}.duration`,
                value: duration,
                unit: 'ms',
                tags: { status: response.status.toString() },
            });

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            recordMetric({
                name: `${handlerName}.duration`,
                value: duration,
                unit: 'ms',
                tags: { status: '500' },
            });
            throw error;
        }
    };
}
