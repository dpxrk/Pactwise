/**
 * Stripe Billing Portal - Supabase Edge Function
 *
 * Creates a Stripe billing portal session for customer self-service.
 *
 * POST /stripe-billing-portal
 * Body: { returnUrl?: string }
 * Returns: { url: string }
 */

import Stripe from 'npm:stripe@14.10.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Initialize Stripe
function getStripe(): Stripe {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

// Initialize Supabase Admin Client
function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// Extract and verify JWT
async function getAuthenticatedUser(authHeader: string | null, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: authUser, error: authError } = await supabase.auth.getUser(jwt);

  if (authError || !authUser?.user) {
    throw new Error('Invalid or expired token');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, enterprise_id, role')
    .eq('auth_id', authUser.user.id)
    .eq('is_active', true)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  return {
    auth: authUser.user,
    profile,
  };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    const user = await getAuthenticatedUser(authHeader, supabase);
    const enterpriseId = user.profile.enterprise_id;

    // Check if user has permission (admin or owner only)
    if (!['admin', 'owner'].includes(user.profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only admins and owners can access billing portal' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const origin = req.headers.get('origin') || 'https://app.pactwise.io';
    const returnUrl = body.returnUrl || `${origin}/dashboard/settings/billing`;

    // Get Stripe customer ID for enterprise
    const { data: stripeCustomer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('enterprise_id', enterpriseId)
      .single();

    if (customerError || !stripeCustomer) {
      return new Response(
        JSON.stringify({
          error: 'No billing account found',
          message: 'Please subscribe to a plan first to access the billing portal',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log(`✅ Created billing portal session for enterprise: ${enterpriseId}`);

    // Log the event
    await supabase.from('billing_events').insert({
      enterprise_id: enterpriseId,
      event_type: 'billing_portal.session.created',
      resource_type: 'billing_portal_session',
      resource_id: session.id,
      data: {
        user_id: user.profile.id,
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error('❌ Billing portal error:', err);

    let status = 500;
    if (err.message.includes('authorization') || err.message.includes('token')) {
      status = 401;
    } else if (err.message.includes('not found') || err.message.includes('No billing')) {
      status = 404;
    } else if (err.message.includes('permission') || err.message.includes('Only admins')) {
      status = 403;
    }

    return new Response(
      JSON.stringify({
        error: err.message || 'Failed to create billing portal session',
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
