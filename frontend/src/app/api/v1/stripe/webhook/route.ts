import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Initialize Stripe lazily to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });
  }
  return stripe;
}

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes the Stripe Checkout
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent
) {
  const session = event.data.object;

  console.log("Processing checkout.session.completed:", session.id);

  // Extract relevant data
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const metadata = session.metadata || {};
  const enterpriseId = metadata.enterprise_id;

  if (!enterpriseId) {
    throw new Error("Missing enterprise_id in session metadata");
  }

  // Log the billing event
  await supabaseAdmin.from("billing_events").insert({
    enterprise_id: enterpriseId,
    event_type: "checkout.session.completed",
    stripe_event_id: event.id,
    resource_type: "checkout_session",
    resource_id: session.id,
    data: session,
    processed: false,
  });

  // If this is a subscription checkout, fetch and store subscription details
  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await handleSubscriptionCreatedOrUpdated(subscription, enterpriseId);
  }

  // Update or create Stripe customer record
  await supabaseAdmin
    .from("stripe_customers")
    .upsert(
      {
        enterprise_id: enterpriseId,
        stripe_customer_id: customerId,
        email: session.customer_email || session.customer_details?.email || "",
        name: session.customer_details?.name || null,
        metadata: session.metadata || {},
      },
      { onConflict: "stripe_customer_id" }
    );

  console.log("✅ Checkout session completed successfully:", session.id);
}

/**
 * Handle customer.subscription.updated event
 * This is triggered when subscription details change (status, plan, etc.)
 */
async function handleSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent
) {
  const subscription = event.data.object;
  const previousAttributes = event.data.previous_attributes;

  console.log("Processing customer.subscription.updated:", subscription.id);
  console.log("Previous attributes:", previousAttributes);

  // Find the enterprise associated with this customer
  const { data: customerData } = await supabaseAdmin
    .from("stripe_customers")
    .select("enterprise_id")
    .eq("stripe_customer_id", subscription.customer as string)
    .single();

  if (!customerData) {
    throw new Error(
      `No enterprise found for customer: ${subscription.customer}`
    );
  }

  const enterpriseId = customerData.enterprise_id;

  // Log the billing event
  await supabaseAdmin.from("billing_events").insert({
    enterprise_id: enterpriseId,
    event_type: "customer.subscription.updated",
    stripe_event_id: event.id,
    resource_type: "subscription",
    resource_id: subscription.id,
    data: { subscription, previous_attributes: previousAttributes },
    processed: false,
  });

  await handleSubscriptionCreatedOrUpdated(subscription, enterpriseId);

  console.log("✅ Subscription updated successfully:", subscription.id);
}

/**
 * Handle customer.subscription.deleted event
 * This is triggered when a subscription is canceled or expires
 */
async function handleSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent
) {
  const subscription = event.data.object;

  console.log("Processing customer.subscription.deleted:", subscription.id);

  // Find the enterprise associated with this customer
  const { data: customerData } = await supabaseAdmin
    .from("stripe_customers")
    .select("enterprise_id")
    .eq("stripe_customer_id", subscription.customer as string)
    .single();

  if (!customerData) {
    throw new Error(
      `No enterprise found for customer: ${subscription.customer}`
    );
  }

  const enterpriseId = customerData.enterprise_id;

  // Log the billing event
  await supabaseAdmin.from("billing_events").insert({
    enterprise_id: enterpriseId,
    event_type: "customer.subscription.deleted",
    stripe_event_id: event.id,
    resource_type: "subscription",
    resource_id: subscription.id,
    data: subscription,
    processed: false,
  });

  // Update subscription status to canceled
  const subscriptionData = subscription as any;
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      ended_at: new Date(subscriptionData.ended_at! * 1000).toISOString(),
      canceled_at: subscriptionData.canceled_at
        ? new Date(subscriptionData.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // Optionally: Update enterprise tier to free tier
  await supabaseAdmin
    .from("enterprises")
    .update({
      subscription_tier: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("id", enterpriseId);

  console.log("✅ Subscription deleted successfully:", subscription.id);
}

/**
 * Helper function to create or update subscription in database
 */
async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription,
  enterpriseId: string
) {
  // Get the price ID to find the plan
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    throw new Error("No price found in subscription");
  }

  // Find the subscription plan
  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .single();

  if (!plan) {
    console.warn(`No plan found for price ID: ${priceId}. Skipping plan link.`);
  }

  // Upsert subscription
  const subscriptionData = subscription as any;
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
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
    { onConflict: "stripe_subscription_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }

  // Update enterprise subscription tier if subscription is active
  if (subscription.status === "active" || subscription.status === "trialing") {
    const tierMap: Record<string, string> = {
      starter: "starter",
      professional: "professional",
      enterprise: "enterprise",
    };

    const tier = tierMap[subscription.metadata?.plan] || "professional";

    await supabaseAdmin
      .from("enterprises")
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enterpriseId);
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const err = error as Error;
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`🔔 Webhook received: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event as Stripe.CheckoutSessionCompletedEvent
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event as Stripe.CustomerSubscriptionUpdatedEvent
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event as Stripe.CustomerSubscriptionDeletedEvent
        );
        break;

      case "customer.subscription.created":
        // Handle subscription creation (similar to update)
        const createEvent = event as Stripe.CustomerSubscriptionCreatedEvent;
        const { data: customerData } = await supabaseAdmin
          .from("stripe_customers")
          .select("enterprise_id")
          .eq("stripe_customer_id", createEvent.data.object.customer as string)
          .single();

        if (customerData) {
          await handleSubscriptionCreatedOrUpdated(
            createEvent.data.object,
            customerData.enterprise_id
          );
        }
        break;

      case "invoice.paid":
        // Log invoice payment
        const paidInvoice = (event as Stripe.InvoicePaidEvent).data.object;
        console.log("Invoice paid:", paidInvoice.id);
        // You can add invoice handling logic here if needed
        break;

      case "invoice.payment_failed":
        // Handle failed payment
        const failedInvoice = (event as Stripe.InvoicePaymentFailedEvent).data
          .object;
        console.warn("Invoice payment failed:", failedInvoice.id);
        // You can add notification logic here
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark the event as processed
    await supabaseAdmin
      .from("billing_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true, event: event.type });
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Webhook processing failed for ${event.type}:`, err);

    // Log the error in billing_events
    await supabaseAdmin
      .from("billing_events")
      .update({
        error: err.message,
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", event.id);

    return NextResponse.json(
      { error: "Webhook processing failed", details: err.message },
      { status: 500 }
    );
  }
}

// Stripe requires raw body for webhook verification
export const runtime = "edge";