import { NextRequest } from 'next/server';

export interface SubdomainConfig {
  subdomain: string | null;
  isAdmin: boolean;
  isApp: boolean;
  isWWW: boolean;
  hostname: string;
}

/**
 * Extracts subdomain information from the request
 */
export function getSubdomain(req: NextRequest): SubdomainConfig {
  const hostname = req.headers.get('host') || '';
  
  // Handle localhost development
  if (hostname.includes('localhost')) {
    // Support localhost:3000/admin for development
    const isAdminPath = req.nextUrl.pathname.startsWith('/admin-portal');
    return {
      subdomain: isAdminPath ? 'admin' : null,
      isAdmin: isAdminPath,
      isApp: !isAdminPath,
      isWWW: false,
      hostname
    };
  }
  
  // Production subdomain detection
  const parts = hostname.split('.');
  
  // Handle cases like: admin.pactwise.io, app.pactwise.io, www.pactwise.io, pactwise.io
  let subdomain: string | null = null;
  let isAdmin = false;
  let isApp = false;
  let isWWW = false;
  
  if (parts.length >= 3) {
    // Has subdomain
    subdomain = parts[0];
    isAdmin = subdomain === 'admin';
    isApp = subdomain === 'app';
    isWWW = subdomain === 'www';
  } else if (parts.length === 2) {
    // No subdomain (e.g., pactwise.io)
    isApp = true; // Default to app behavior
  }
  
  return {
    subdomain,
    isAdmin,
    isApp: isApp || (!isAdmin && !isWWW),
    isWWW,
    hostname
  };
}

/**
 * Check if user has admin access
 */
export function requiresAdminAccess(pathname: string): boolean {
  const adminPaths = [
    '/admin',
    '/admin-portal',
    '/system',
    '/monitoring',
    '/users-management',
    '/enterprise-management'
  ];
  
  return adminPaths.some(path => pathname.startsWith(path));
}

/**
 * Get the appropriate redirect URL based on subdomain
 */
export function getRedirectUrl(subdomain: SubdomainConfig, pathname: string): string {
  if (subdomain.isAdmin) {
    // Admin subdomain redirects
    if (pathname === '/' || pathname === '') {
      return '/admin';
    }
    // Redirect non-admin paths to main app
    if (!requiresAdminAccess(pathname) && !pathname.startsWith('/auth')) {
      return process.env.NEXT_PUBLIC_APP_URL || 'https://pactwise.io';
    }
  } else {
    // Main app redirects
    if (requiresAdminAccess(pathname)) {
      return process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.pactwise.io';
    }
  }
  
  return pathname;
}