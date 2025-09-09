/// <reference path="../../types/global.d.ts" />

// FIXED: Secure CORS configuration to prevent CSRF attacks
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',  // Admin app local development
    'https://app.pactwise.com',
    'https://pactwise.io',
    'https://www.pactwise.io',
    'https://admin.pactwise.io',  // Admin portal production
    'https://staging.pactwise.com',
    'https://admin-staging.pactwise.com',  // Admin portal staging
  ];
  return allowedOrigins.map(origin => origin.trim());
};

const getOriginHeader = (request: Request): string => {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  // Default to first allowed origin if no match (safer than '*')
  return allowedOrigins[0];
};

export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

export const getCorsHeaders = (request: Request) => ({
  ...corsHeaders,
  'Access-Control-Allow-Origin': getOriginHeader(request),
});

export const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
};