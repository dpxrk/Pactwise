import { z } from 'zod';

/**
 * Environment variable validation schema
 * Ensures all required environment variables are present and valid
 */

// Server-side environment variables schema
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),
  
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Email
  RESEND_API_KEY: z.string().min(1).optional(),
  
  // Payment
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  
  // AI/ML Services
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  
  // Analytics
  GOOGLE_ANALYTICS_ID: z.string().startsWith('G-').optional(),
  
  // Feature Flags
  ENABLE_DEMO_MODE: z.enum(['true', 'false']).optional(),
  ENABLE_MAINTENANCE_MODE: z.enum(['true', 'false']).optional(),
});

// Client-side environment variables schema
const clientEnvSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Pactwise'),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().default('AI-Powered Contract Management Platform'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  
  // Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().startsWith('G-').optional(),
  NEXT_PUBLIC_HOTJAR_ID: z.string().optional(),
  NEXT_PUBLIC_HOTJAR_VERSION: z.string().optional(),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_ENABLE_CHAT: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_ENABLE_AI_FEATURES: z.enum(['true', 'false']).default('true'),
  
  // API Endpoints
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  
  // Environment
  NEXT_PUBLIC_VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// Type exports
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validates server-side environment variables
 * Should only be called on the server
 */
export function validateServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('validateServerEnv should only be called on the server');
  }
  
  const parsed = serverEnvSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid server environment variables');
  }
  
  return parsed.data;
}

/**
 * Validates client-side environment variables
 * Can be called on both client and server
 */
export function validateClientEnv(): ClientEnv {
  const env = {
    // App
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    
    // Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    
    // Analytics
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_HOTJAR_ID: process.env.NEXT_PUBLIC_HOTJAR_ID,
    NEXT_PUBLIC_HOTJAR_VERSION: process.env.NEXT_PUBLIC_HOTJAR_VERSION,
    
    // Feature Flags
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_CHAT: process.env.NEXT_PUBLIC_ENABLE_CHAT,
    NEXT_PUBLIC_ENABLE_AI_FEATURES: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES,
    
    // API
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    
    // Environment
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  };
  
  const parsed = clientEnvSchema.safeParse(env);
  
  if (!parsed.success) {
    console.error('❌ Invalid client environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid client environment variables');
  }
  
  return parsed.data;
}

/**
 * Cached environment variables
 * Prevents multiple validations
 */
let cachedServerEnv: ServerEnv | undefined;
let cachedClientEnv: ClientEnv | undefined;

/**
 * Get validated server environment variables
 * Uses cache to prevent multiple validations
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = validateServerEnv();
  return cachedServerEnv;
}

/**
 * Get validated client environment variables
 * Uses cache to prevent multiple validations
 */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;
  cachedClientEnv = validateClientEnv();
  return cachedClientEnv;
}

/**
 * Environment variable helpers
 */
export const env = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.NODE_ENV === 'production',
  isPreview: process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview',
  isClient: typeof window !== 'undefined',
  isServer: typeof window === 'undefined',
};

/**
 * Feature flags helper
 */
export const features = {
  analytics: () => getClientEnv().NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  chat: () => getClientEnv().NEXT_PUBLIC_ENABLE_CHAT === 'true',
  ai: () => getClientEnv().NEXT_PUBLIC_ENABLE_AI_FEATURES === 'true',
};

/**
 * Validate environment on module load in development
 */
if (env.isDevelopment && env.isServer) {
  try {
    validateClientEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
  }
}