import { NextResponse } from 'next/server';
import { headers } from 'next/headers';


// Health check endpoint for production monitoring
export async function GET() {
  try {
    // Check various system components
    const checks = {
      server: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      region: process.env.VERCEL_REGION || 'unknown',
    };

    // Determine overall health
    const isHealthy = Object.values(checks).every(
      (check) => check !== false && check !== null
    );

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'unhealthy',
        ...checks,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
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