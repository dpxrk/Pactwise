/**
 * Stripe Checkout Session - Supabase Edge Function
 *
 * Creates a Stripe checkout session for subscription purchases.
 *
 * POST /stripe-checkout
 * Body: { planId: string, billingPeriod: 'monthly' | 'annual', quantity?: number }
 * Returns: { url: string, sessionId: string }
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
    .select('id, email, enterprise_id, role, first_name, last_name')
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

// Valid plan tiers and billing periods
const VALID_TIERS = ['starter', 'professional', 'business'] as const;
const VALID_PERIODS = ['monthly', 'annual'] as const;

type PlanTier = typeof VALID_TIERS[number];
type BillingPeriod = typeof VALID_PERIODS[number];

interface CheckoutRequest {
  planId: PlanTier;
  billingPeriod: BillingPeriod;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
}

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

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { planId, billingPeriod, quantity = 1, successUrl, cancelUrl } = body;

    // Validate input
    if (!planId || !VALID_TIERS.includes(planId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan ID. Must be: starter, professional, or business' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!billingPeriod || !VALID_PERIODS.includes(billingPeriod)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing period. Must be: monthly or annual' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (quantity < 1 || quantity > 1000) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be between 1 and 1000' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build plan name for lookup
    const planName = `${planId}_${billingPeriod === 'monthly' ? 'monthly' : 'annual'}`;

    // Look up the subscription plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Plan lookup error:', planError);
      return new Response(
        JSON.stringify({ error: 'Subscription plan not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if enterprise already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status, stripe_subscription_id')
      .eq('enterprise_id', user.profile.enterprise_id)
      .in('status', ['active', 'trialing'])
      .single();

    if (existingSubscription) {
      return new Response(
        JSON.stringify({
          error: 'Enterprise already has an active subscription',
          existingSubscriptionId: existingSubscription.stripe_subscription_id,
          message: 'Use the billing portal to manage your existing subscription'
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if enterprise already has a Stripe customer
    let stripeCustomerId: string | undefined;
    const { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('enterprise_id', user.profile.enterprise_id)
      .single();

    if (stripeCustomer) {
      stripeCustomerId = stripeCustomer.stripe_customer_id;
    }

    // Build success and cancel URLs
    const origin = req.headers.get('origin') || 'https://app.pactwise.io';
    const finalSuccessUrl = successUrl || `${origin}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${origin}/dashboard/settings/billing?canceled=true`;

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: quantity,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      customer_email: stripeCustomerId ? undefined : user.profile.email,
      customer: stripeCustomerId,
      metadata: {
        enterprise_id: user.profile.enterprise_id,
        user_id: user.profile.id,
        plan_id: plan.id,
        plan_name: planName,
        quantity: quantity.toString(),
      },
      subscription_data: {
        metadata: {
          enterprise_id: user.profile.enterprise_id,
          user_id: user.profile.id,
          plan_id: plan.id,
          plan_name: planName,
        },
        trial_period_days: plan.trial_period_days || undefined,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
    };

    // Add customer update if existing customer
    if (stripeCustomerId) {
      sessionParams.customer_update = {
        address: 'auto',
        name: 'auto',
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ Created checkout session: ${session.id} for enterprise: ${user.profile.enterprise_id}`);

    // Log the checkout attempt
    await supabase.from('billing_events').insert({
      enterprise_id: user.profile.enterprise_id,
      event_type: 'checkout.session.created',
      resource_type: 'checkout_session',
      resource_id: session.id,
      data: {
        plan_name: planName,
        quantity: quantity,
        user_id: user.profile.id,
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error('❌ Checkout error:', err);

    // Determine appropriate status code
    let status = 500;
    if (err.message.includes('authorization') || err.message.includes('token')) {
      status = 401;
    } else if (err.message.includes('not found')) {
      status = 404;
    }

    return new Response(
      JSON.stringify({
        error: err.message || 'Failed to create checkout session',
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
