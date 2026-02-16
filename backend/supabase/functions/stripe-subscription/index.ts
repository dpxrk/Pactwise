import { getCorsHeaders } from '../_shared/cors.ts';
/**
 * Stripe Subscription Management - Supabase Edge Function
 *
 * Handles subscription data retrieval and management operations.
 *
 * GET /stripe-subscription
 * Returns: { subscription, plan, usage, upcomingInvoice }
 *
 * POST /stripe-subscription/cancel
 * Body: { immediately?: boolean }
 * Returns: { success: true, cancelAt: string }
 *
 * POST /stripe-subscription/resume
 * Returns: { success: true }
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
// Use getCorsHeaders(req) instead of hardcoded wildcard
const getCorsHeadersStatic = (req: Request) => getCorsHeaders(req);

// Get subscription data
async function getSubscriptionData(enterpriseId: string, supabase: ReturnType<typeof getSupabaseAdmin>, stripe: Stripe) {
  // Get subscription from database
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('enterprise_id', enterpriseId)
    .in('status', ['active', 'trialing', 'past_due', 'canceled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subError || !subscription) {
    // No subscription found - return free tier info
    return {
      subscription: null,
      plan: {
        name: 'Free',
        tier: 'free',
        features: {
          contracts: 10,
          users: 2,
          vendors: 5,
        },
      },
      usage: {
        contracts: 0,
        users: 0,
        vendors: 0,
      },
      upcomingInvoice: null,
    };
  }

  // Calculate usage from enterprise data
  const { data: enterprise } = await supabase
    .from('enterprises')
    .select('id')
    .eq('id', enterpriseId)
    .single();

  // Get counts for usage
  const [contractCount, userCount, vendorCount] = await Promise.all([
    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .not('status', 'eq', 'deleted'),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true),
    supabase
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId),
  ]);

  const usage = {
    contracts: contractCount.count || 0,
    users: userCount.count || 0,
    vendors: vendorCount.count || 0,
  };

  // Get upcoming invoice from Stripe if subscription is active
  let upcomingInvoice = null;
  if (subscription.status === 'active' && subscription.stripe_subscription_id) {
    try {
      const invoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscription.stripe_subscription_id,
      });
      upcomingInvoice = {
        amount: invoice.amount_due,
        currency: invoice.currency,
        dueDate: invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null,
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
      };
    } catch (e) {
      console.log('Could not fetch upcoming invoice:', e);
    }
  }

  return {
    subscription: {
      id: subscription.id,
      stripeSubscriptionId: subscription.stripe_subscription_id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
      trialStart: subscription.trial_start,
      trialEnd: subscription.trial_end,
    },
    plan: subscription.plan,
    usage,
    upcomingInvoice,
  };
}

// Cancel subscription
async function cancelSubscription(
  enterpriseId: string,
  immediately: boolean,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  stripe: Stripe
) {
  // Get subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('enterprise_id', enterpriseId)
    .in('status', ['active', 'trialing'])
    .single();

  if (subError || !subscription) {
    throw new Error('No active subscription found');
  }

  // Cancel in Stripe
  if (immediately) {
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  } else {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }

  // Update local database
  const now = new Date().toISOString();
  await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: !immediately,
      canceled_at: now,
      status: immediately ? 'canceled' : subscription.status,
    })
    .eq('stripe_subscription_id', subscription.stripe_subscription_id);

  // Log event
  await supabase.from('billing_events').insert({
    enterprise_id: enterpriseId,
    event_type: 'subscription.canceled',
    resource_type: 'subscription',
    resource_id: subscription.stripe_subscription_id,
    data: {
      immediately,
      canceled_at: now,
    },
  });

  return {
    success: true,
    canceledAt: now,
    immediately,
  };
}

// Resume subscription (remove cancellation)
async function resumeSubscription(
  enterpriseId: string,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  stripe: Stripe
) {
  // Get subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status, cancel_at_period_end')
    .eq('enterprise_id', enterpriseId)
    .in('status', ['active', 'trialing'])
    .single();

  if (subError || !subscription) {
    throw new Error('No active subscription found');
  }

  if (!subscription.cancel_at_period_end) {
    throw new Error('Subscription is not scheduled for cancellation');
  }

  // Resume in Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Update local database
  await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq('stripe_subscription_id', subscription.stripe_subscription_id);

  // Log event
  await supabase.from('billing_events').insert({
    enterprise_id: enterpriseId,
    event_type: 'subscription.resumed',
    resource_type: 'subscription',
    resource_id: subscription.stripe_subscription_id,
    data: {},
  });

  return {
    success: true,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    const user = await getAuthenticatedUser(authHeader, supabase);
    const enterpriseId = user.profile.enterprise_id;

    const url = new URL(req.url);
    const pathname = url.pathname;

    // GET /stripe-subscription - Get subscription data
    if (req.method === 'GET') {
      const data = await getSubscriptionData(enterpriseId, supabase, stripe);
      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /stripe-subscription/cancel - Cancel subscription
    if (req.method === 'POST' && pathname.endsWith('/cancel')) {
      const body = await req.json().catch(() => ({}));
      const immediately = body.immediately === true;

      const result = await cancelSubscription(enterpriseId, immediately, supabase, stripe);
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /stripe-subscription/resume - Resume subscription
    if (req.method === 'POST' && pathname.endsWith('/resume')) {
      const result = await resumeSubscription(enterpriseId, supabase, stripe);
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error('❌ Subscription error:', err);

    let status = 500;
    if (err.message.includes('authorization') || err.message.includes('token')) {
      status = 401;
    } else if (err.message.includes('not found')) {
      status = 404;
    } else if (err.message.includes('already') || err.message.includes('not scheduled')) {
      status = 400;
    }

    return new Response(
      JSON.stringify({
        error: err.message || 'Subscription operation failed',
      }),
      {
        status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
