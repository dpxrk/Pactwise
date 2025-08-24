import { z } from 'zod';

/**
 * Environment variables validation and type safety
 */

const envSchema = z.object({
  // Public environment variables
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
  NEXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  
  // Server-side environment variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_AI_FEATURES: z.string().transform(val => val === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_PREMIUM_FEATURES: z.string().transform(val => val === 'true').default('true'),
  
  // Rate limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('60'),
  
  // Security
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters').optional(),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters').optional(),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse({
      // Public variables
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,
      
      // Server-side variables (only available on server)
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      
      // Feature flags
      NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
      NEXT_PUBLIC_ENABLE_AI_FEATURES: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES,
      NEXT_PUBLIC_ENABLE_PREMIUM_FEATURES: process.env.NEXT_PUBLIC_ENABLE_PREMIUM_FEATURES,
      
      // Rate limiting
      RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
      
      // Security
      SESSION_SECRET: process.env.SESSION_SECRET,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    });
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
      
      // In development, show detailed error
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Invalid environment variables: ${JSON.stringify(error.flatten().fieldErrors, null, 2)}`);
      }
      
      // In production, throw generic error
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

// Validate environment variables on module load
export const env = validateEnv();

// Type-safe environment variable access
export type Env = z.infer<typeof envSchema>;

// Helper functions for environment checks
export const isDevelopment = () => env.NEXT_PUBLIC_ENVIRONMENT === 'development';
export const isStaging = () => env.NEXT_PUBLIC_ENVIRONMENT === 'staging';
export const isProduction = () => env.NEXT_PUBLIC_ENVIRONMENT === 'production';

// Feature flag helpers
export const isAnalyticsEnabled = () => env.NEXT_PUBLIC_ENABLE_ANALYTICS;
export const isAIEnabled = () => env.NEXT_PUBLIC_ENABLE_AI_FEATURES;
export const isPremiumEnabled = () => env.NEXT_PUBLIC_ENABLE_PREMIUM_FEATURES;

// Security configuration
export const securityConfig = {
  rateLimiting: {
    enabled: env.RATE_LIMIT_ENABLED,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  session: {
    secret: env.SESSION_SECRET,
    secure: isProduction(),
    sameSite: 'strict' as const,
    httpOnly: true,
  },
  encryption: {
    key: env.ENCRYPTION_KEY,
  },
};

// Supabase configuration
export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
};

// Sentry configuration
export const sentryConfig = {
  dsn: env.NEXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN,
  authToken: env.SENTRY_AUTH_TOKEN,
  environment: env.NEXT_PUBLIC_ENVIRONMENT,
  enabled: isProduction() || isStaging(),
};

// App configuration
export const appConfig = {
  url: env.NEXT_PUBLIC_APP_URL || (isDevelopment() ? 'http://localhost:3000' : ''),
  environment: env.NEXT_PUBLIC_ENVIRONMENT,
};