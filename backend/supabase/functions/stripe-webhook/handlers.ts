/**
 * Stripe Webhook Event Handlers
 * Handles all Stripe webhook events and updates Supabase database
 */

import Stripe from 'npm:stripe@14.10.0';
import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes the Stripe Checkout
 */
export async function handleCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
  supabase: SupabaseClient
): Promise<void> {
  const session = event.data.object;

  console.log('Processing checkout.session.completed:', session.id);

  // Extract relevant data
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const metadata = session.metadata || {};
  const enterpriseId = metadata.enterprise_id;

  if (!enterpriseId) {
    throw new Error('Missing enterprise_id in session metadata');
  }

  // Log the billing event
  await supabase.from('billing_events').insert({
    enterprise_id: enterpriseId,
    event_type: 'checkout.session.completed',
    stripe_event_id: event.id,
    resource_type: 'checkout_session',
    resource_id: session.id,
    data: session,
    processed: false,
  });

  // If this is a subscription checkout, fetch and store subscription details
  if (subscriptionId) {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-08-27.basil' as '2025-08-27.basil',
    });
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionCreatedOrUpdated(subscription, enterpriseId, supabase);
  }

  // Update or create Stripe customer record
  await supabase
    .from('stripe_customers')
    .upsert(
      {
        enterprise_id: enterpriseId,
        stripe_customer_id: customerId,
        email: session.customer_email || session.customer_details?.email || '',
        name: session.customer_details?.name || null,
        metadata: session.metadata || {},
      },
      { onConflict: 'stripe_customer_id' }
    );

  console.log('✅ Checkout session completed successfully:', session.id);
}

/**
 * Handle customer.subscription.updated event
 * This is triggered when subscription details change (status, plan, etc.)
 */
export async function handleSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent,
  supabase: SupabaseClient
): Promise<void> {
  const subscription = event.data.object;
  const previousAttributes = event.data.previous_attributes;

  console.log('Processing customer.subscription.updated:', subscription.id);
  console.log('Previous attributes:', previousAttributes);

  // Find the enterprise associated with this customer
  const { data: customerData } = await supabase
    .from('stripe_customers')
    .select('enterprise_id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (!customerData) {
    throw new Error(
      `No enterprise found for customer: ${subscription.customer}`
    );
  }

  const enterpriseId = customerData.enterprise_id;

  // Log the billing event
  await supabase.from('billing_events').insert({
    enterprise_id: enterpriseId,
    event_type: 'customer.subscription.updated',
    stripe_event_id: event.id,
    resource_type: 'subscription',
    resource_id: subscription.id,
    data: { subscription, previous_attributes: previousAttributes },
    processed: false,
  });

  await handleSubscriptionCreatedOrUpdated(subscription, enterpriseId, supabase);

  console.log('✅ Subscription updated successfully:', subscription.id);
}

/**
 * Handle customer.subscription.deleted event
 * This is triggered when a subscription is canceled or expires
 */
export async function handleSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
  supabase: SupabaseClient
): Promise<void> {
  const subscription = event.data.object;

  console.log('Processing customer.subscription.deleted:', subscription.id);

  // Find the enterprise associated with this customer
  const { data: customerData } = await supabase
    .from('stripe_customers')
    .select('enterprise_id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (!customerData) {
    throw new Error(
      `No enterprise found for customer: ${subscription.customer}`
    );
  }

  const enterpriseId = customerData.enterprise_id;

  // Log the billing event
  await supabase.from('billing_events').insert({
    enterprise_id: enterpriseId,
    event_type: 'customer.subscription.deleted',
    stripe_event_id: event.id,
    resource_type: 'subscription',
    resource_id: subscription.id,
    data: subscription,
    processed: false,
  });

  // Update subscription status to canceled
  const subscriptionData = subscription as any;
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      ended_at: subscriptionData.ended_at
        ? new Date(subscriptionData.ended_at * 1000).toISOString()
        : null,
      canceled_at: subscriptionData.canceled_at
        ? new Date(subscriptionData.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // Update enterprise tier to free tier
  await supabase
    .from('enterprises')
    .update({
      subscription_tier: 'free',
      updated_at: new Date().toISOString(),
    })
    .eq('id', enterpriseId);

  console.log('✅ Subscription deleted successfully:', subscription.id);
}

/**
 * Handle customer.subscription.created event
 * This is triggered when a new subscription is created
 */
export async function handleSubscriptionCreated(
  event: Stripe.CustomerSubscriptionCreatedEvent,
  supabase: SupabaseClient
): Promise<void> {
  const subscription = event.data.object;

  console.log('Processing customer.subscription.created:', subscription.id);

  // Find the enterprise associated with this customer
  const { data: customerData } = await supabase
    .from('stripe_customers')
    .select('enterprise_id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (!customerData) {
    throw new Error(
      `No enterprise found for customer: ${subscription.customer}`
    );
  }

  await handleSubscriptionCreatedOrUpdated(
    subscription,
    customerData.enterprise_id,
    supabase
  );

  console.log('✅ Subscription created successfully:', subscription.id);
}

/**
 * Handle invoice.paid event
 * This is triggered when an invoice is successfully paid
 */
export async function handleInvoicePaid(
  event: Stripe.InvoicePaidEvent,
  supabase: SupabaseClient
): Promise<void> {
  const invoice = event.data.object;

  console.log('Processing invoice.paid:', invoice.id);

  // Find the enterprise associated with this customer
  const { data: customerData } = await supabase
    .from('stripe_customers')
    .select('enterprise_id')
    .eq('stripe_customer_id', invoice.customer as string)
    .single();

  if (customerData) {
    // Log the billing event
    await supabase.from('billing_events').insert({
      enterprise_id: customerData.enterprise_id,
      event_type: 'invoice.paid',
      stripe_event_id: event.id,
      resource_type: 'invoice',
      resource_id: invoice.id,
      data: invoice,
      processed: false,
    });
  }

  console.log('✅ Invoice paid successfully:', invoice.id);
}

/**
 * Handle invoice.payment_failed event
 * This is triggered when an invoice payment fails
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent,
  supabase: SupabaseClient
): Promise<void> {
  const invoice = event.data.object;

  console.warn('Processing invoice.payment_failed:', invoice.id);

  // Find the enterprise associated with this customer
  const { data: customerData } = await supabase
    .from('stripe_customers')
    .select('enterprise_id')
    .eq('stripe_customer_id', invoice.customer as string)
    .single();

  if (customerData) {
    // Log the billing event
    await supabase.from('billing_events').insert({
      enterprise_id: customerData.enterprise_id,
      event_type: 'invoice.payment_failed',
      stripe_event_id: event.id,
      resource_type: 'invoice',
      resource_id: invoice.id,
      data: invoice,
      processed: false,
    });
  }

  console.warn('⚠️ Invoice payment failed:', invoice.id);
}

/**
 * Helper function to create or update subscription in database
 */
async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription,
  enterpriseId: string,
  supabase: SupabaseClient
): Promise<void> {
  // Get the price ID to find the plan
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    throw new Error('No price found in subscription');
  }

  // Find the subscription plan
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .single();

  if (!plan) {
    console.warn(`No plan found for price ID: ${priceId}. Skipping plan link.`);
  }

  // Upsert subscription
  const subscriptionData = subscription as any;
  const { error } = await supabase.from('subscriptions').upsert(
    {
      enterprise_id: enterpriseId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      plan_id: plan?.id,
      status: subscription.status,
      current_period_start: new Date(
        subscriptionData.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscriptionData.current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      canceled_at: subscriptionData.canceled_at
        ? new Date(subscriptionData.canceled_at * 1000).toISOString()
        : null,
      trial_start: subscriptionData.trial_start
        ? new Date(subscriptionData.trial_start * 1000).toISOString()
        : null,
      trial_end: subscriptionData.trial_end
        ? new Date(subscriptionData.trial_end * 1000).toISOString()
        : null,
      metadata: subscription.metadata || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' }
  );

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }

  // Update enterprise subscription tier if subscription is active
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    const tierMap: Record<string, string> = {
      starter: 'starter',
      professional: 'professional',
      enterprise: 'enterprise',
    };

    const tier = tierMap[subscription.metadata?.plan] || 'professional';

    await supabase
      .from('enterprises')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enterpriseId);
  }
}
