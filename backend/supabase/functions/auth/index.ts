/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { validateRequest, z } from '../_shared/validation.ts';
import { logSecurityEvent } from '../_shared/security-monitoring.ts';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const LoginSchema = z.object({
  action: z.literal('LOGIN'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const SignupSchema = z.object({
  action: z.literal('SIGNUP'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  options: z.object({
    data: z.record(z.unknown()).optional(),
    emailRedirectTo: z.string().url().optional(),
  }).optional(),
});

const LogoutSchema = z.object({
  action: z.literal('LOGOUT'),
});

const GetUserSchema = z.object({
  action: z.literal('GET_USER'),
});

const UpdateUserSchema = z.object({
  action: z.literal('UPDATE_USER'),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  data: z.record(z.unknown()).optional(),
});

const AuthRequestSchema = z.discriminatedUnion('action', [
  LoginSchema,
  SignupSchema,
  LogoutSchema,
  GetUserSchema,
  UpdateUserSchema,
]);

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default withMiddleware(
  async (context) => {
    const { req, isAuthenticated } = context;
    const { method } = req;

    // Only allow POST requests
    if (method !== 'POST') {
      return createErrorResponseSync('Method not allowed', 405, req);
    }

    try {
      // Parse and validate request body
      const body = await req.json();
      const validation = validateRequest(AuthRequestSchema, body);

      if (!validation.success) {
        return createErrorResponseSync(
          validation.error || 'Invalid request format',
          400,
          req
        );
      }

      const { action, ...payload } = validation.data;

      // Create Supabase client (use auth header if present)
      const authHeader = req.headers.get('Authorization');
      const supabase = createSupabaseClient(authHeader || undefined);

      // ========================================================================
      // LOGIN
      // ========================================================================
      if (action === 'LOGIN') {
        const { email, password } = payload as z.infer<typeof LoginSchema>;

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Log failed login attempt
          await logSecurityEvent({
            event_type: 'auth_failure',
            severity: 'medium',
            title: 'Login Failed',
            description: `Failed login attempt for email: ${email}`,
            source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            endpoint: `POST /auth`,
            metadata: {
              email,
              error_code: error.status,
            },
          });

          return createErrorResponseSync('Invalid email or password', 401, req);
        }

        // Log successful login
        if (data.user) {
          await logSecurityEvent({
            event_type: 'auth_success',
            severity: 'low',
            title: 'Login Successful',
            description: `User logged in successfully: ${email}`,
            user_id: data.user.id,
            source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            endpoint: `POST /auth`,
            metadata: {
              email,
            },
          });
        }

        return createSuccessResponse(data, undefined, 200, req);
      }

      // ========================================================================
      // SIGNUP
      // ========================================================================
      if (action === 'SIGNUP') {
        const { email, password, options } = payload as z.infer<typeof SignupSchema>;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options,
        });

        if (error) {
          return createErrorResponseSync('Signup failed', 400, req);
        }

        // Log new account creation
        if (data.user) {
          await logSecurityEvent({
            event_type: 'account_created',
            severity: 'low',
            title: 'Account Created',
            description: `New account created: ${email}`,
            user_id: data.user.id,
            source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            endpoint: `POST /auth`,
            metadata: {
              email,
            },
          });
        }

        return createSuccessResponse(data, undefined, 200, req);
      }

      // ========================================================================
      // LOGOUT (requires authentication)
      // ========================================================================
      if (action === 'LOGOUT') {
        if (!isAuthenticated) {
          return createErrorResponseSync('Authentication required', 401, req);
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          return createErrorResponseSync('Logout failed', 500, req);
        }

        return createSuccessResponse(null, undefined, 204, req);
      }

      // ========================================================================
      // GET_USER (requires authentication)
      // ========================================================================
      if (action === 'GET_USER') {
        if (!isAuthenticated) {
          return createErrorResponseSync('Authentication required', 401, req);
        }

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          return createErrorResponseSync('Failed to fetch user', 401, req);
        }

        return createSuccessResponse(user, undefined, 200, req);
      }

      // ========================================================================
      // UPDATE_USER (requires authentication)
      // ========================================================================
      if (action === 'UPDATE_USER') {
        if (!isAuthenticated) {
          return createErrorResponseSync('Authentication required', 401, req);
        }

        const { email, password, data: userData } = payload as z.infer<typeof UpdateUserSchema>;

        const updatePayload: {
          email?: string;
          password?: string;
          data?: Record<string, unknown>;
        } = {};

        if (email) updatePayload.email = email;
        if (password) updatePayload.password = password;
        if (userData) updatePayload.data = userData;

        const { data, error } = await supabase.auth.updateUser(updatePayload);

        if (error) {
          return createErrorResponseSync('Failed to update user', 400, req);
        }

        return createSuccessResponse(data, undefined, 200, req);
      }

      // Should never reach here due to discriminated union validation
      return createErrorResponseSync('Invalid action', 400, req);

    } catch (error) {
      // Log unexpected errors
      console.error('[Auth] Unexpected error:', error);
      await logSecurityEvent({
        event_type: 'system_error',
        severity: 'high',
        title: 'Auth Function Error',
        description: 'Unexpected error in auth function',
        source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        endpoint: `POST /auth`,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      // Don't expose internal error details
      return createErrorResponseSync('An error occurred during authentication', 500, req);
    }
  },
  {
    requireAuth: false, // Auth is handled per-action
    rateLimit: true,
    customRateLimitProfile: 'auth_login', // Uses 5 requests per 15 minutes for login
    securityMonitoring: true,
    detectThreats: true, // Scan for SQL injection/XSS in payloads
  }
);
