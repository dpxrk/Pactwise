/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { validateRequest, z } from '../_shared/validation.ts';
import { logSecurityEvent } from '../_shared/security-monitoring.ts';
import { createHash } from 'node:crypto';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SearchEnterprisesSchema = z.object({
  search: z.string().min(2).max(100),
  invite_code: z.string().optional(), // Optional invite code for verification
});

const CreateEnterpriseSchema = z.object({
  name: z.string().min(2).max(200),
  domain: z.string().email().or(z.string().regex(/^[a-z0-9-]+\.[a-z]{2,}$/i)),
});

const JoinChildEnterpriseSchema = z.object({
  parent_enterprise_id: z.string().uuid(),
  child_name: z.string().min(2).max(200),
  pin: z.string().length(6).regex(/^\d{6}$/, 'PIN must be 6 digits'),
});

const VerifyPINSchema = z.object({
  enterprise_id: z.string().uuid(),
  pin: z.string().length(6).regex(/^\d{6}$/, 'PIN must be 6 digits'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Hash a PIN using SHA-256 for secure storage/comparison
 */
function hashPIN(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

/**
 * Verify PIN against stored hash
 */
async function verifyPIN(supabase: any, enterpriseId: string, pin: string): Promise<boolean> {
  try {
    const { data: enterprise, error } = await supabase
      .from('enterprises')
      .select('onboarding_pin_hash')
      .eq('id', enterpriseId)
      .single();

    if (error || !enterprise || !enterprise.onboarding_pin_hash) {
      return false;
    }

    const providedPinHash = hashPIN(pin);
    return providedPinHash === enterprise.onboarding_pin_hash;
  } catch {
    return false;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default withMiddleware(
  async (context) => {
    const { req, user: profile, isAuthenticated } = context;
    const { method } = req;
    const url = new URL(req.url);
    const { pathname } = url;

    // Require authentication for all onboarding operations
    if (!isAuthenticated || !profile) {
      return createErrorResponseSync('Authentication required', 401, req);
    }

    const supabase = createAdminClient();

    // ========================================================================
    // POST /onboarding/search-enterprises - Search for enterprises (rate-limited)
    // ========================================================================
    if (method === 'POST' && pathname === '/onboarding/search-enterprises') {
      const body = await req.json();
      const validation = validateRequest(SearchEnterprisesSchema, body);

      if (!validation.success) {
        return createErrorResponseSync(validation.error || 'Invalid request', 400, req);
      }

      const { search } = validation.data;

      // Log search attempt for security monitoring
      await logSecurityEvent({
        event_type: 'data_access',
        severity: 'low',
        title: 'Enterprise Search',
        description: `User searched for enterprises: "${search}"`,
        user_id: profile.id,
        enterprise_id: profile.enterprise_id,
        source_ip: req.headers.get('x-forwarded-for') || 'unknown',
        endpoint: 'POST /onboarding/search-enterprises',
        metadata: {
          search_term: search,
        },
      });

      // Only return limited information: name and whether it's a parent org
      // Do NOT return IDs until PIN is verified
      const { data: enterprises, error } = await supabase
        .from('enterprises')
        .select('id, name, is_parent_organization')
        .ilike('name', `%${search}%`)
        .eq('status', 'active')
        .limit(10);

      if (error) {
        console.error('[Onboarding] Enterprise search error:', error);
        return createErrorResponseSync('Search failed', 500, req);
      }

      // Return only names, not IDs (IDs revealed after PIN verification)
      const sanitizedResults = enterprises.map((ent: any) => ({
        name: ent.name,
        is_parent: ent.is_parent_organization || false,
        // Generate a temporary token for PIN verification (not the real ID)
        search_token: Buffer.from(ent.id).toString('base64'),
      }));

      return createSuccessResponse(sanitizedResults, undefined, 200, req);
    }

    // ========================================================================
    // POST /onboarding/verify-pin - Verify PIN for enterprise access
    // ========================================================================
    if (method === 'POST' && pathname === '/onboarding/verify-pin') {
      const body = await req.json();

      // Decode search token to get enterprise ID
      const searchToken = body.search_token;
      if (!searchToken) {
        return createErrorResponseSync('Search token required', 400, req);
      }

      let enterpriseId: string;
      try {
        enterpriseId = Buffer.from(searchToken, 'base64').toString('utf-8');
      } catch {
        return createErrorResponseSync('Invalid search token', 400, req);
      }

      const validation = validateRequest(VerifyPINSchema, {
        enterprise_id: enterpriseId,
        pin: body.pin,
      });

      if (!validation.success) {
        return createErrorResponseSync(validation.error || 'Invalid request', 400, req);
      }

      const { pin } = validation.data;

      // Verify PIN
      const isValid = await verifyPIN(supabase, enterpriseId, pin);

      if (!isValid) {
        // Log failed PIN attempt
        await logSecurityEvent({
          event_type: 'auth_failure',
          severity: 'medium',
          title: 'Failed PIN Verification',
          description: 'User provided incorrect PIN for enterprise access',
          user_id: profile.id,
          source_ip: req.headers.get('x-forwarded-for') || 'unknown',
          endpoint: 'POST /onboarding/verify-pin',
          metadata: {
            enterprise_id: enterpriseId,
          },
        });

        return createErrorResponseSync('Invalid PIN', 401, req);
      }

      // PIN is valid - return the enterprise ID for joining
      const { data: enterprise, error } = await supabase
        .from('enterprises')
        .select('id, name, is_parent_organization')
        .eq('id', enterpriseId)
        .single();

      if (error || !enterprise) {
        return createErrorResponseSync('Enterprise not found', 404, req);
      }

      return createSuccessResponse({
        enterprise_id: enterprise.id,
        name: enterprise.name,
        is_parent: enterprise.is_parent_organization,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /onboarding/create-enterprise - Create new enterprise
    // ========================================================================
    if (method === 'POST' && pathname === '/onboarding/create-enterprise') {
      const body = await req.json();
      const validation = validateRequest(CreateEnterpriseSchema, body);

      if (!validation.success) {
        return createErrorResponseSync(validation.error || 'Invalid request', 400, req);
      }

      const { name, domain } = validation.data;

      // Check if user already has an enterprise
      if (profile.enterprise_id) {
        return createErrorResponseSync('User already has an enterprise', 400, req);
      }

      // Use transaction-safe RPC for enterprise creation
      const { data, error } = await supabase.rpc('create_enterprise_with_owner', {
        p_enterprise_name: name,
        p_domain: domain,
        p_owner_id: profile.id,
      });

      if (error) {
        console.error('[Onboarding] Enterprise creation error:', error);
        return createErrorResponseSync('Failed to create enterprise', 500, req);
      }

      // Log enterprise creation
      await logSecurityEvent({
        event_type: 'account_created',
        severity: 'low',
        title: 'Enterprise Created',
        description: `New enterprise created: ${name}`,
        user_id: profile.id,
        enterprise_id: data.enterprise_id,
        source_ip: req.headers.get('x-forwarded-for') || 'unknown',
        endpoint: 'POST /onboarding/create-enterprise',
        metadata: {
          enterprise_name: name,
          domain,
        },
      });

      return createSuccessResponse(data, undefined, 201, req);
    }

    // ========================================================================
    // POST /onboarding/join-child-enterprise - Create child enterprise under parent
    // ========================================================================
    if (method === 'POST' && pathname === '/onboarding/join-child-enterprise') {
      const body = await req.json();
      const validation = validateRequest(JoinChildEnterpriseSchema, body);

      if (!validation.success) {
        return createErrorResponseSync(validation.error || 'Invalid request', 400, req);
      }

      const { parent_enterprise_id, child_name, pin } = validation.data;

      // Check if user already has an enterprise
      if (profile.enterprise_id) {
        return createErrorResponseSync('User already has an enterprise', 400, req);
      }

      // Verify PIN first
      const isValid = await verifyPIN(supabase, parent_enterprise_id, pin);

      if (!isValid) {
        // Log failed attempt
        await logSecurityEvent({
          event_type: 'auth_failure',
          severity: 'high',
          title: 'Failed Child Enterprise Creation',
          description: 'Invalid PIN provided for child enterprise creation',
          user_id: profile.id,
          source_ip: req.headers.get('x-forwarded-for') || 'unknown',
          endpoint: 'POST /onboarding/join-child-enterprise',
          metadata: {
            parent_enterprise_id,
            child_name,
          },
        });

        return createErrorResponseSync('Invalid PIN', 401, req);
      }

      // PIN verified - create child enterprise
      const { data, error } = await supabase.rpc('create_child_enterprise', {
        p_parent_id: parent_enterprise_id,
        p_child_name: child_name,
        p_admin_user_id: profile.id,
      });

      if (error) {
        console.error('[Onboarding] Child enterprise creation error:', error);
        return createErrorResponseSync('Failed to create child enterprise', 500, req);
      }

      // Log child enterprise creation
      await logSecurityEvent({
        event_type: 'account_created',
        severity: 'low',
        title: 'Child Enterprise Created',
        description: `Child enterprise created under parent: ${child_name}`,
        user_id: profile.id,
        enterprise_id: data.child_enterprise_id,
        source_ip: req.headers.get('x-forwarded-for') || 'unknown',
        endpoint: 'POST /onboarding/join-child-enterprise',
        metadata: {
          parent_enterprise_id,
          child_name,
        },
      });

      return createSuccessResponse(data, undefined, 201, req);
    }

    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    customRateLimitProfile: 'onboarding', // More restrictive rate limiting
    securityMonitoring: true,
    detectThreats: true,
  }
);
