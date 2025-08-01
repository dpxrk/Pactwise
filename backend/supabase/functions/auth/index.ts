import { withMiddleware } from '../_shared/middleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient, getUserFromAuth, hasRole } from '../_shared/supabase.ts';
import { provisionUser, updateLastLogin, getUserPermissions, refreshUserToken } from '../_shared/auth.ts';
import { validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponse } from '../_shared/responses.ts';
import { z } from 'zod';

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  invitation_code: z.string().optional(),
  metadata: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  phone_number: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const roleUpdateSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'manager', 'user', 'viewer']),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'manager', 'user', 'viewer']).optional(),
  message: z.string().optional(),
});

// Response helpers are now imported from shared module

const passwordResetSchema = z.object({
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const emailVerificationSchema = z.object({
  token: z.string(),
});

const changePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8),
});

export default withMiddleware(
  async (context) => {
    const { req } = context;
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get request metadata
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const user_agent = req.headers.get('user-agent');

    // Public endpoints (no auth required)
    if (method === 'POST' && pathname === '/auth/signup') {
      // User signup with optional invitation
      const body = await req.json();
      const data = validateRequest(signupSchema, body);

      const adminClient = createAdminClient();

      // Create auth user
      const signUpOptions: any = {
        email: data.email,
        password: data.password,
      };
      
      if (data.metadata) {
        signUpOptions.options = { data: data.metadata };
      }
      
      const { data: authData, error: authError } = await adminClient.auth.signUp(signUpOptions);

      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: authError?.message || 'Signup failed' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Provision user profile
      try {
        const profile = await provisionUser({
          auth_user: authData.user,
          invitation_code: data.invitation_code,
          enterprise_domain: data.email.split('@')[1],
          metadata: {
            ...data.metadata,
            ip_address: ip_address || undefined,
            user_agent: user_agent || undefined,
          },
        });

        return new Response(JSON.stringify({
          user: profile,
          session: authData.session,
        }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 201,
        });
      } catch (provisionError) {
        // Clean up auth user if provisioning fails
        await adminClient.auth.admin.deleteUser(authData.user.id);
        throw provisionError;
      }
    }

    if (method === 'POST' && pathname === '/auth/login') {
      // User login
      const body = await req.json();
      const data = validateRequest(loginSchema, body);

      const adminClient = createAdminClient();

      // Authenticate user
      const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError || !authData.user || !authData.session) {
        // Log failed attempt
        await adminClient
          .from('login_attempts')
          .insert({
            email: data.email,
            ip_address: ip_address || undefined,
            user_agent: user_agent || undefined,
            success: false,
            failure_reason: authError?.message || 'Invalid credentials',
          });

        return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      // Get user profile
      const { data: profile } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();

      if (!profile) {
        // First time login - provision user
        const newProfile = await provisionUser({
          auth_user: authData.user,
          metadata: { ip_address: ip_address || undefined, user_agent: user_agent || undefined },
        });

        return new Response(JSON.stringify({
          user: newProfile,
          session: authData.session,
        }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Update last login
      await updateLastLogin(adminClient, profile.id, { ip_address: ip_address || undefined, user_agent: user_agent || undefined });

      return new Response(JSON.stringify({
        user: profile,
        session: authData.session,
      }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (method === 'POST' && pathname === '/auth/refresh') {
      // Refresh token
      const body = await req.json();
      const { refresh_token } = body;

      if (!refresh_token) {
        return new Response(JSON.stringify({ error: 'Refresh token required' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const adminClient = createAdminClient();
      const tokens = await refreshUserToken(adminClient, refresh_token);

      return new Response(JSON.stringify(tokens), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Protected endpoints (auth required)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const user = await getUserFromAuth(authHeader);

    if (method === 'POST' && pathname === '/auth/logout') {
      // Logout user
      const adminClient = createAdminClient();

      await adminClient.auth.signOut();

      // End active sessions
      await adminClient
        .from('user_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('user_id', user.profile.id)
        .is('ended_at', null);

      return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (method === 'GET' && pathname === '/auth/profile') {
      // Get current user profile
      return createSuccessResponse({
        user: user.profile,
        permissions: {
          contracts: await getUserPermissions(createAdminClient(), user.profile, 'contracts'),
          vendors: await getUserPermissions(createAdminClient(), user.profile, 'vendors'),
          budgets: await getUserPermissions(createAdminClient(), user.profile, 'budgets'),
          users: await getUserPermissions(createAdminClient(), user.profile, 'users'),
          settings: await getUserPermissions(createAdminClient(), user.profile, 'settings'),
        },
      }, 'Profile retrieved successfully', 200, req);
    }

    if (method === 'PUT' && pathname === '/auth/profile') {
      // Update current user profile
      const body = await req.json();
      const data = validateRequest(profileUpdateSchema, body);

      const adminClient = createAdminClient();

      const { data: updated, error } = await adminClient
        .from('users')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.profile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(updated, 'Profile updated successfully', 200, req);
    }

    if (method === 'POST' && pathname === '/auth/invite') {
      // Send invitation (admin/owner only)
      if (!hasRole(user.profile, ['admin', 'owner'])) {
        return await createErrorResponse('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const data = validateRequest(inviteSchema, body);

      const adminClient = createAdminClient();

      // Generate invitation code
      const code = Math.random().toString(36).substring(2, 15).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { data: invitation, error } = await adminClient
        .from('invitations')
        .insert({
          enterprise_id: user.profile.enterprise_id,
          email: data.email,
          role: data.role || 'user',
          code,
          invited_by: user.profile.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // TODO: Send invitation email
      // For now, just return the invitation details
      return createSuccessResponse({
        invitation,
        invitation_code: code,
      }, `Invitation created. Code: ${code}`, 201, req);
    }

    if (method === 'PUT' && pathname === '/auth/users/role') {
      // Update user role (admin/owner only)
      if (!hasRole(user.profile, ['admin', 'owner'])) {
        return await createErrorResponse('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const data = validateRequest(roleUpdateSchema, body);

      const adminClient = createAdminClient();

      // Check target user exists in same enterprise
      const { data: targetUser } = await adminClient
        .from('users')
        .select('role')
        .eq('id', data.user_id)
        .eq('enterprise_id', user.profile.enterprise_id)
        .single();

      if (!targetUser) {
        return await createErrorResponse('User not found', 404, req);
      }

      // Prevent demoting the last owner
      if (targetUser.role === 'owner' && data.role !== 'owner') {
        const { count } = await adminClient
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('enterprise_id', user.profile.enterprise_id)
          .eq('role', 'owner')
          .eq('is_active', true);

        if (count === 1) {
          return await createErrorResponse('Cannot demote the last owner', 400, req);
        }
      }

      // Update role
      const { data: updated, error } = await adminClient
        .from('users')
        .update({
          role: data.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(updated, 'User role updated successfully', 200, req);
    }

    if (method === 'GET' && pathname === '/auth/users') {
      // List users in enterprise (any authenticated user)
      const adminClient = createAdminClient();

      const { data: users, error } = await adminClient
        .from('users')
        .select('id, email, first_name, last_name, role, department, title, is_active, last_login_at')
        .eq('enterprise_id', user.profile.enterprise_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return createSuccessResponse(users, 'Users retrieved successfully', 200, req);
    }

    // Password reset request (public endpoint)
    if (method === 'POST' && pathname === '/auth/password-reset') {
      const body = await req.json();
      const data = validateRequest(passwordResetSchema, body);

      const adminClient = createAdminClient();

      // Check if user exists
      const { data: user } = await adminClient
        .from('users')
        .select('id, email')
        .eq('email', data.email)
        .single();

      if (user) {
        // Generate reset token
        const resetToken = crypto.randomUUID();
        const tokenHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(resetToken),
        );
        const hashedToken = btoa(String.fromCharCode(...new Uint8Array(tokenHash)));

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

        // Store reset token
        await adminClient
          .from('password_reset_tokens')
          .insert({
            user_id: user.id,
            token_hash: hashedToken,
            expires_at: expiresAt.toISOString(),
          });

        // TODO: Send password reset email with token
        // For now, return the token (in production, never do this)
        return createSuccessResponse({
          debug_token: resetToken,
        }, 'If the email exists, a password reset link has been sent.', 200, req);
      }

      // Always return success even if email doesn't exist (security)
      return createSuccessResponse({}, 'If the email exists, a password reset link has been sent.', 200, req);
    }

    // Confirm password reset (public endpoint)
    if (method === 'POST' && pathname === '/auth/password-reset/confirm') {
      const body = await req.json();
      const data = validateRequest(confirmResetSchema, body);

      const adminClient = createAdminClient();

      // Hash the provided token
      const tokenHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(data.token),
      );
      const hashedToken = btoa(String.fromCharCode(...new Uint8Array(tokenHash)));

      // Find valid reset token
      const { data: resetToken } = await adminClient
        .from('password_reset_tokens')
        .select('*, user:users!user_id(auth_id)')
        .eq('token_hash', hashedToken)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (!resetToken?.user) {
        return await createErrorResponse('Invalid or expired reset token', 400, req);
      }

      // Update password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        resetToken.user.auth_id,
        { password: data.password },
      );

      if (updateError) {
        throw updateError;
      }

      // Mark token as used
      await adminClient
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', resetToken.id);

      return createSuccessResponse({}, 'Password reset successful', 200, req);
    }

    // Change password (authenticated endpoint)
    if (method === 'POST' && pathname === '/auth/change-password') {
      if (!authHeader) {
        return await createErrorResponse('No authorization header', 401, req);
      }

      const user = await getUserFromAuth(authHeader);
      const body = await req.json();
      const data = validateRequest(changePasswordSchema, body);

      const adminClient = createAdminClient();

      // Verify current password
      const { error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.profile.email,
        password: data.current_password,
      });

      if (signInError) {
        return await createErrorResponse('Current password is incorrect', 400, req);
      }

      // Update password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        user.auth.id,
        { password: data.new_password },
      );

      if (updateError) {
        throw updateError;
      }

      return createSuccessResponse({}, 'Password changed successfully', 200, req);
    }

    // Request email verification (authenticated endpoint)
    if (method === 'POST' && pathname === '/auth/verify-email/send') {
      if (!authHeader) {
        return await createErrorResponse('No authorization header', 401, req);
      }

      const user = await getUserFromAuth(authHeader);
      const adminClient = createAdminClient();

      // Generate verification token
      const verificationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Store verification token in user metadata
      await adminClient.auth.admin.updateUserById(
        user.auth.id,
        {
          user_metadata: {
            ...user.auth.user_metadata,
            email_verification_token: verificationToken,
            email_verification_expires: expiresAt.toISOString(),
          },
        },
      );

      // TODO: Send verification email
      // For now, return the token (in production, never do this)
      return createSuccessResponse({
        debug_token: verificationToken,
      }, 'Verification email sent', 200, req);
    }

    // Confirm email verification (public endpoint)
    if (method === 'POST' && pathname === '/auth/verify-email/confirm') {
      const body = await req.json();
      const data = validateRequest(emailVerificationSchema, body);

      const adminClient = createAdminClient();

      // Find user with matching verification token
      const { data: users } = await adminClient.auth.admin.listUsers();
      const userWithToken = users.users.find(
        (u) => u.user_metadata?.email_verification_token === data.token &&
               u.user_metadata?.email_verification_expires &&
               new Date(u.user_metadata.email_verification_expires) > new Date(),
      );

      if (!userWithToken) {
        return await createErrorResponse('Invalid or expired verification token', 400, req);
      }

      // Mark email as verified
      await adminClient.auth.admin.updateUserById(
        userWithToken.id,
        {
          email_confirm: true,
          user_metadata: {
            ...userWithToken.user_metadata,
            email_verification_token: null,
            email_verification_expires: null,
            email_verified: true,
          },
        },
      );

      return createSuccessResponse({}, 'Email verified successfully', 200, req);
    }

    // Method not allowed
    return await createErrorResponse('Method not allowed', 405, req);
  }
);