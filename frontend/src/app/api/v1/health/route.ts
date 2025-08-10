import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
// import { api } from "../../../../convex/_generated/api";
// import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Health check endpoint for production monitoring
export async function GET() {
  try {
    // Get system health from Convex
    let convexHealth;
    try {
//       convexHealth = await convex.query(api.monitoring.systemHealth.getSystemHealth);
      
      // Record the health check
      // await convex.mutation(api.monitoring.systemHealth.recordHealthCheck, {
      //   status: convexHealth.status
      // }).catch(() => {
      //   // Ignore recording errors to avoid cascading failures
      // });
    } catch (error) {
      convexHealth = {
        status: 'degraded',
        checks: {
          database: { status: 'unknown', error: 'Could not reach Convex' },
          storage: { status: 'unknown' },
          authentication: { status: 'unknown' },
          aiServices: { status: 'unknown' },
        }
      };
    }

    // Check various system components
    const checks = {
      server: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      region: process.env.VERCEL_REGION || 'unknown',
      convex: convexHealth,
    };

    // Determine overall health
    const isHealthy = convexHealth.status === 'healthy' && 
                     Object.values(checks).every(
                       (check) => check !== false && check !== null
                     );

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : convexHealth.status === 'unhealthy' ? 'unhealthy' : 'degraded',
        ...checks,
      },
      {
        status: isHealthy ? 200 : convexHealth.status === 'unhealthy' ? 503 : 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}