/**
 * Stripe Webhook Handler - Supabase Edge Function
 *
 * Handles Stripe webhook events and updates the database accordingly.
 * This replaces the Next.js API route for better architecture.
 *
 * Events handled:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 */

import Stripe from 'npm:stripe@14.10.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from './handlers.ts';

// Initialize Stripe
function getStripe(): Stripe {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil' as '2025-08-27.basil',
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

// CORS headers for webhook responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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
    // Get webhook signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get webhook secret
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();
    const stripe = getStripe();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('❌ Webhook signature verification failed:', error.message);
      return new Response(
        JSON.stringify({
          error: 'Webhook signature verification failed',
          details: error.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🔔 Webhook received: ${event.type}`);

    // Initialize Supabase client
    const supabase = getSupabaseAdmin();

    // Handle different event types
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(
            event as Stripe.CheckoutSessionCompletedEvent,
            supabase
          );
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(
            event as Stripe.CustomerSubscriptionCreatedEvent,
            supabase
          );
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(
            event as Stripe.CustomerSubscriptionUpdatedEvent,
            supabase
          );
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(
            event as Stripe.CustomerSubscriptionDeletedEvent,
            supabase
          );
          break;

        case 'invoice.paid':
          await handleInvoicePaid(
            event as Stripe.InvoicePaidEvent,
            supabase
          );
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(
            event as Stripe.InvoicePaymentFailedEvent,
            supabase
          );
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark the event as processed
      await supabase
        .from('billing_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('stripe_event_id', event.id);

      return new Response(
        JSON.stringify({ received: true, event: event.type }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      const err = error as Error;
      console.error(`❌ Webhook processing failed for ${event.type}:`, err);

      // Log the error in billing_events
      await supabase
        .from('billing_events')
        .update({
          error: err.message,
          processed_at: new Date().toISOString(),
        })
        .eq('stripe_event_id', event.id);

      return new Response(
        JSON.stringify({
          error: 'Webhook processing failed',
          details: err.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    const err = error as Error;
    console.error('❌ Webhook handler error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
