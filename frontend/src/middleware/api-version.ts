import { NextRequest, NextResponse } from 'next/server';

export interface ApiVersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions?: Record<string, string>; // version -> deprecation date
}

const DEFAULT_CONFIG: ApiVersionConfig = {
  defaultVersion: 'v1',
  supportedVersions: ['v1'],
  deprecatedVersions: {},
};

export function apiVersionMiddleware(
  request: NextRequest,
  config: ApiVersionConfig = DEFAULT_CONFIG
): NextResponse | null {
  const { pathname } = request.nextUrl;
  
  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return null;
  }

  // Extract version from URL (e.g., /api/v1/users)
  const pathSegments = pathname.split('/').filter(Boolean);
  const versionFromUrl = pathSegments[1]; // After 'api'
  
  // Check Accept header for version (e.g., Accept: application/vnd.pactwise.v2+json)
  const acceptHeader = request.headers.get('accept') || '';
  const versionFromHeader = extractVersionFromAcceptHeader(acceptHeader);
  
  // Check custom API-Version header
  const versionFromCustomHeader = request.headers.get('api-version');
  
  // Determine the requested version
  const requestedVersion = 
    versionFromUrl?.startsWith('v') ? versionFromUrl :
    versionFromHeader ||
    versionFromCustomHeader ||
    config.defaultVersion;

  // If URL doesn't have version, redirect to versioned URL
  if (!versionFromUrl?.startsWith('v') && pathname !== '/api/' && pathname !== '/api') {
    const versionedPath = `/api/${requestedVersion}${pathname.slice(4)}`;
    const url = new URL(versionedPath, request.url);
    url.search = request.nextUrl.search;
    
    return NextResponse.redirect(url, { status: 308 }); // Permanent redirect
  }

  // Validate version
  if (!config.supportedVersions.includes(requestedVersion)) {
    return NextResponse.json(
      {
        error: 'Unsupported API Version',
        message: `API version '${requestedVersion}' is not supported`,
        supportedVersions: config.supportedVersions,
        defaultVersion: config.defaultVersion,
      },
      { 
        status: 400,
        headers: {
          'API-Version': config.defaultVersion,
          'X-Supported-Versions': config.supportedVersions.join(', '),
        },
      }
    );
  }

  // Check if version is deprecated
  const deprecationDate = config.deprecatedVersions?.[requestedVersion];
  if (deprecationDate) {
    // Add deprecation headers
    const response = NextResponse.next();
    response.headers.set('Deprecation', 'true');
    response.headers.set('Sunset', deprecationDate);
    response.headers.set(
      'Link',
      `</api/${config.defaultVersion}>; rel="successor-version"`
    );
    response.headers.set(
      'Warning',
      `299 - "API version ${requestedVersion} is deprecated and will be removed on ${deprecationDate}"`
    );
    return response;
  }

  // Add version headers to response
  const response = NextResponse.next();
  response.headers.set('API-Version', requestedVersion);
  response.headers.set('X-Supported-Versions', config.supportedVersions.join(', '));
  
  return response;
}

function extractVersionFromAcceptHeader(acceptHeader: string): string | null {
  // Match patterns like: application/vnd.pactwise.v2+json
  const match = acceptHeader.match(/application\/vnd\.pactwise\.v(\d+)\+json/);
  return match ? `v${match[1]}` : null;
}

// Helper to create versioned API routes
export function createVersionedRoute(
  handlers: Record<string, (req: NextRequest) => Promise<NextResponse>>,
  defaultVersion = 'v1'
) {
  return async (request: NextRequest) => {
    const { pathname } = request.nextUrl;
    const pathSegments = pathname.split('/').filter(Boolean);
    const version = pathSegments[1]?.startsWith('v') ? pathSegments[1] : defaultVersion;
    
    const handler = handlers[version];
    if (!handler) {
      return NextResponse.json(
        {
          error: 'Version Not Found',
          message: `No handler found for API version '${version}'`,
          availableVersions: Object.keys(handlers),
        },
        { status: 404 }
      );
    }
    
    return handler(request);
  };
}