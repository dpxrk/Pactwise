import { NextRequest, NextResponse } from 'next/server';

const API_VERSIONS = {
  v1: {
    version: '1.0.0',
    status: 'stable',
    released: '2024-01-01',
    endpoints: {
      contracts: '/api/v1/contracts',
      health: '/api/v1/health',
      stripe: '/api/v1/stripe',
      user: '/api/v1/user',
    },
    changelog: [
      'Initial API release',
      'Contract management endpoints',
      'User authentication and management',
      'Stripe payment integration',
      'Health check endpoint',
    ],
  },
  // Future versions can be added here
  // v2: {
  //   version: '2.0.0',
  //   status: 'beta',
  //   released: '2024-06-01',
  //   deprecated: '2025-01-01',
  //   endpoints: { ... },
  //   changelog: [ ... ],
  // },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get('version');

  if (version && !API_VERSIONS[version as keyof typeof API_VERSIONS]) {
    return NextResponse.json(
      {
        error: 'Version Not Found',
        message: `API version '${version}' does not exist`,
        availableVersions: Object.keys(API_VERSIONS),
      },
      { status: 404 }
    );
  }

  const response = version
    ? API_VERSIONS[version as keyof typeof API_VERSIONS]
    : {
        current: 'v1',
        versions: API_VERSIONS,
        documentation: process.env.NEXT_PUBLIC_APP_URL + '/api-docs',
        support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
      };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-API-Version': 'v1',
    },
  });
}