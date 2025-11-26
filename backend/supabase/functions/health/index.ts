/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { getAllCircuitStats, circuitBreakerHealthCheck } from '../_shared/circuit-breaker.ts';
import { getLogger } from '../_shared/logger.ts';

// ============================================================================
// TYPES
// ============================================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime_seconds: number;
  checks: {
    database: ComponentHealth;
    cache?: ComponentHealth;
    external_services: ComponentHealth;
  };
  metrics?: {
    memory_usage_mb: number;
    active_connections?: number;
    requests_per_minute?: number;
  };
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms?: number;
  message?: string;
  last_check?: string;
}

interface DetailedHealth extends HealthStatus {
  database_details?: {
    connected: boolean;
    latency_ms: number;
    pool_size?: number;
    active_queries?: number;
  };
  circuit_breakers: Array<{
    name: string;
    state: string;
    healthy: boolean;
  }>;
  dependencies: Array<{
    name: string;
    status: string;
    latency_ms?: number;
  }>;
}

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

const startTime = Date.now();
const VERSION = Deno.env.get('VERSION') || '1.0.0';
const logger = getLogger({ contextDefaults: { function_name: 'health' } });

async function checkDatabase(): Promise<ComponentHealth> {
  const supabase = createAdminClient();
  const startTime = performance.now();

  try {
    // Use the database health check function
    const { data, error } = await supabase.rpc('system_health_check');

    const latency = Math.round(performance.now() - startTime);

    if (error) {
      return {
        status: 'unhealthy',
        latency_ms: latency,
        message: error.message,
      };
    }

    // Check if database reports issues
    const dbHealth = data as { database?: { connected: boolean } };
    if (!dbHealth?.database?.connected) {
      return {
        status: 'unhealthy',
        latency_ms: latency,
        message: 'Database connection failed',
      };
    }

    // Latency thresholds
    if (latency > 1000) {
      return {
        status: 'degraded',
        latency_ms: latency,
        message: 'High database latency',
      };
    }

    return {
      status: 'healthy',
      latency_ms: latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkExternalServices(): ComponentHealth {
  const circuitHealth = circuitBreakerHealthCheck();

  if (!circuitHealth.healthy) {
    const openCircuits = circuitHealth.circuits.filter(c => !c.healthy);
    return {
      status: 'degraded',
      message: `${openCircuits.length} service(s) unavailable: ${openCircuits.map(c => c.name).join(', ')}`,
    };
  }

  return {
    status: 'healthy',
  };
}

function getMemoryUsage(): number {
  // Deno memory info is available in some contexts
  try {
    const memInfo = Deno.memoryUsage();
    return Math.round(memInfo.heapUsed / 1024 / 1024);
  } catch {
    return 0;
  }
}

function calculateOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
  const statuses = Object.values(checks).filter(Boolean).map(c => c.status);

  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  return 'healthy';
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  try {
    // ========================================================================
    // GET /health - Basic health check (for load balancers)
    // ========================================================================
    if (method === 'GET' && pathname === '/health') {
      const dbHealth = await checkDatabase();
      const externalHealth = checkExternalServices();

      const checks = {
        database: dbHealth,
        external_services: externalHealth,
      };

      const status = calculateOverallStatus(checks);
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

      const healthStatus: HealthStatus = {
        status,
        timestamp: new Date().toISOString(),
        version: VERSION,
        uptime_seconds: uptimeSeconds,
        checks,
      };

      // Return 503 for unhealthy, 200 otherwise
      const httpStatus = status === 'unhealthy' ? 503 : 200;

      return new Response(JSON.stringify(healthStatus), {
        status: httpStatus,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(req),
        },
      });
    }

    // ========================================================================
    // GET /health/live - Kubernetes liveness probe
    // ========================================================================
    if (method === 'GET' && pathname === '/health/live') {
      // Simple check - if we can respond, we're alive
      return new Response(JSON.stringify({ status: 'alive' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(req),
        },
      });
    }

    // ========================================================================
    // GET /health/ready - Kubernetes readiness probe
    // ========================================================================
    if (method === 'GET' && pathname === '/health/ready') {
      const dbHealth = await checkDatabase();

      const ready = dbHealth.status !== 'unhealthy';

      return new Response(
        JSON.stringify({
          status: ready ? 'ready' : 'not_ready',
          database: dbHealth.status,
        }),
        {
          status: ready ? 200 : 503,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(req),
          },
        }
      );
    }

    // ========================================================================
    // GET /health/detailed - Detailed health information (authenticated)
    // ========================================================================
    if (method === 'GET' && pathname === '/health/detailed') {
      // This endpoint provides more details - could be protected
      const authHeader = req.headers.get('Authorization');
      const apiKey = req.headers.get('X-API-Key');
      const healthKey = Deno.env.get('HEALTH_CHECK_KEY');

      // Allow access with either auth header or health check API key
      if (!authHeader && (!apiKey || apiKey !== healthKey)) {
        return createErrorResponseSync('Authorization required', 401, req);
      }

      const dbHealth = await checkDatabase();
      const externalHealth = checkExternalServices();
      const circuitStats = getAllCircuitStats();

      const checks = {
        database: dbHealth,
        external_services: externalHealth,
      };

      const status = calculateOverallStatus(checks);
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

      // Get detailed database health
      const supabase = createAdminClient();
      const { data: dbDetails } = await supabase.rpc('system_health_check');

      const detailedHealth: DetailedHealth = {
        status,
        timestamp: new Date().toISOString(),
        version: VERSION,
        uptime_seconds: uptimeSeconds,
        checks,
        metrics: {
          memory_usage_mb: getMemoryUsage(),
        },
        database_details: dbDetails?.database || undefined,
        circuit_breakers: circuitStats.map(s => ({
          name: s.name,
          state: s.state,
          healthy: s.state !== 'open',
        })),
        dependencies: [
          {
            name: 'supabase',
            status: dbHealth.status,
            latency_ms: dbHealth.latency_ms,
          },
        ],
      };

      return createSuccessResponse(detailedHealth, undefined, 200, req);
    }

    // ========================================================================
    // GET /health/metrics - Prometheus-compatible metrics
    // ========================================================================
    if (method === 'GET' && pathname === '/health/metrics') {
      const dbHealth = await checkDatabase();
      const circuitStats = getAllCircuitStats();
      const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      const memoryMb = getMemoryUsage();

      // Prometheus format
      const metrics = [
        `# HELP pactwise_up Service availability (1 = up, 0 = down)`,
        `# TYPE pactwise_up gauge`,
        `pactwise_up{service="api"} ${dbHealth.status !== 'unhealthy' ? 1 : 0}`,
        ``,
        `# HELP pactwise_uptime_seconds Service uptime in seconds`,
        `# TYPE pactwise_uptime_seconds counter`,
        `pactwise_uptime_seconds ${uptimeSeconds}`,
        ``,
        `# HELP pactwise_db_latency_ms Database latency in milliseconds`,
        `# TYPE pactwise_db_latency_ms gauge`,
        `pactwise_db_latency_ms ${dbHealth.latency_ms || 0}`,
        ``,
        `# HELP pactwise_memory_usage_mb Memory usage in megabytes`,
        `# TYPE pactwise_memory_usage_mb gauge`,
        `pactwise_memory_usage_mb ${memoryMb}`,
        ``,
        `# HELP pactwise_circuit_breaker_state Circuit breaker state (0=closed, 1=open, 0.5=half-open)`,
        `# TYPE pactwise_circuit_breaker_state gauge`,
        ...circuitStats.map(s => {
          const value = s.state === 'open' ? 1 : s.state === 'half-open' ? 0.5 : 0;
          return `pactwise_circuit_breaker_state{service="${s.name}"} ${value}`;
        }),
      ];

      return new Response(metrics.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
          ...getCorsHeaders(req),
        },
      });
    }

    // ========================================================================
    // GET /health/version - Version information
    // ========================================================================
    if (method === 'GET' && pathname === '/health/version') {
      return createSuccessResponse({
        version: VERSION,
        build_time: Deno.env.get('BUILD_TIME') || 'unknown',
        git_commit: Deno.env.get('GIT_COMMIT') || 'unknown',
        environment: Deno.env.get('ENVIRONMENT') || 'development',
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /health/self-test - Run self-tests
    // ========================================================================
    if (method === 'POST' && pathname === '/health/self-test') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return createErrorResponseSync('Authorization required', 401, req);
      }

      logger.info('Running self-test');

      const tests: Array<{ name: string; passed: boolean; duration_ms: number; error?: string }> = [];

      // Test 1: Database connectivity
      const dbStart = performance.now();
      const dbHealth = await checkDatabase();
      tests.push({
        name: 'database_connectivity',
        passed: dbHealth.status !== 'unhealthy',
        duration_ms: Math.round(performance.now() - dbStart),
        error: dbHealth.message,
      });

      // Test 2: Database write/read
      const supabase = createAdminClient();
      const writeStart = performance.now();
      try {
        const testKey = `health_test_${Date.now()}`;
        await supabase.from('system_settings').upsert({
          key: testKey,
          value: { test: true },
          enterprise_id: null,
        });
        await supabase.from('system_settings').delete().eq('key', testKey);
        tests.push({
          name: 'database_write_read',
          passed: true,
          duration_ms: Math.round(performance.now() - writeStart),
        });
      } catch (error) {
        tests.push({
          name: 'database_write_read',
          passed: false,
          duration_ms: Math.round(performance.now() - writeStart),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test 3: Circuit breakers
      tests.push({
        name: 'circuit_breakers',
        passed: circuitBreakerHealthCheck().healthy,
        duration_ms: 0,
      });

      const allPassed = tests.every(t => t.passed);

      return createSuccessResponse({
        passed: allPassed,
        tests,
        timestamp: new Date().toISOString(),
      }, undefined, allPassed ? 200 : 500, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);

  } catch (error) {
    logger.error('Health check error', error);
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(req),
        },
      }
    );
  }
});
