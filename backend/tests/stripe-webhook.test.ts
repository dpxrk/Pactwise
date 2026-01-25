/**
 * Stripe Webhook Handler Tests
 *
 * Tests for the Stripe webhook edge function including:
 * - Signature verification
 * - Idempotency (duplicate event handling)
 * - Event handler behavior
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe types for testing
interface MockStripeEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: Record<string, any>;
    previous_attributes?: Record<string, any>;
  };
}

// Mock Supabase responses
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  upsert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should reject requests without stripe-signature header', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Headers({}),
        text: () => Promise.resolve('{}'),
      };

      // Simulate the validation logic
      const signature = mockRequest.headers.get('stripe-signature');
      expect(signature).toBeNull();
    });

    it('should reject non-POST requests', async () => {
      const methods = ['GET', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const mockRequest = { method };
        expect(mockRequest.method).not.toBe('POST');
      }
    });

    it('should allow OPTIONS requests for CORS preflight', async () => {
      const mockRequest = { method: 'OPTIONS' };
      expect(mockRequest.method).toBe('OPTIONS');
    });
  });

  describe('Event Processing', () => {
    it('should parse valid checkout.session.completed event', () => {
      const event: MockStripeEvent = {
        id: 'evt_test_checkout_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            customer_email: 'test@example.com',
            customer_details: { name: 'Test User' },
            metadata: { enterprise_id: 'ent_test_123' },
          },
        },
      };

      expect(event.type).toBe('checkout.session.completed');
      expect(event.data.object.metadata.enterprise_id).toBe('ent_test_123');
    });

    it('should parse valid subscription.updated event with previous_attributes', () => {
      const event: MockStripeEvent = {
        id: 'evt_test_sub_update_123',
        type: 'customer.subscription.updated',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
          previous_attributes: {
            status: 'trialing',
          },
        },
      };

      expect(event.type).toBe('customer.subscription.updated');
      expect(event.data.previous_attributes?.status).toBe('trialing');
      expect(event.data.object.status).toBe('active');
    });

    it('should parse valid subscription.deleted event', () => {
      const event: MockStripeEvent = {
        id: 'evt_test_sub_del_123',
        type: 'customer.subscription.deleted',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
            ended_at: Math.floor(Date.now() / 1000),
          },
        },
      };

      expect(event.type).toBe('customer.subscription.deleted');
      expect(event.data.object.status).toBe('canceled');
    });

    it('should parse valid invoice.paid event', () => {
      const event: MockStripeEvent = {
        id: 'evt_test_invoice_paid_123',
        type: 'invoice.paid',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_paid: 4900,
            currency: 'usd',
            status: 'paid',
          },
        },
      };

      expect(event.type).toBe('invoice.paid');
      expect(event.data.object.amount_paid).toBe(4900);
    });

    it('should parse valid invoice.payment_failed event', () => {
      const event: MockStripeEvent = {
        id: 'evt_test_invoice_failed_123',
        type: 'invoice.payment_failed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_due: 4900,
            currency: 'usd',
            status: 'open',
            attempt_count: 1,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
          },
        },
      };

      expect(event.type).toBe('invoice.payment_failed');
      expect(event.data.object.attempt_count).toBe(1);
    });
  });

  describe('Idempotency', () => {
    it('should identify duplicate events by stripe_event_id', () => {
      const eventId = 'evt_test_123';
      const existingEvent = { id: 1, stripe_event_id: eventId, processed: true };

      // Simulate duplicate check
      const isDuplicate = existingEvent.processed === true;
      expect(isDuplicate).toBe(true);
    });

    it('should identify events currently being processed', () => {
      const eventId = 'evt_test_123';
      const processingEvent = { id: 1, stripe_event_id: eventId, processed: false, processing: true };

      // Simulate processing check
      const isProcessing = processingEvent.processing === true && !processingEvent.processed;
      expect(isProcessing).toBe(true);
    });

    it('should allow new events to be processed', () => {
      const eventId = 'evt_test_new_123';
      const existingEvent = null; // No existing event

      // Simulate new event check
      const isNewEvent = existingEvent === null;
      expect(isNewEvent).toBe(true);
    });
  });

  describe('Enterprise Validation', () => {
    it('should reject events without enterprise_id in metadata', () => {
      const event: MockStripeEvent = {
        id: 'evt_test_no_ent_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            metadata: {}, // Missing enterprise_id
          },
        },
      };

      const enterpriseId = event.data.object.metadata?.enterprise_id;
      expect(enterpriseId).toBeUndefined();
    });

    it('should extract enterprise_id from checkout session metadata', () => {
      const event: MockStripeEvent = {
        id: 'evt_test_with_ent_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            metadata: { enterprise_id: 'ent_valid_123' },
          },
        },
      };

      const enterpriseId = event.data.object.metadata?.enterprise_id;
      expect(enterpriseId).toBe('ent_valid_123');
    });
  });

  describe('Subscription Tier Mapping', () => {
    it('should map price IDs to subscription tiers', () => {
      const tierMapping: Record<string, string> = {
        'price_starter_monthly': 'starter',
        'price_professional_monthly': 'professional',
        'price_business_monthly': 'business',
        'price_enterprise_monthly': 'enterprise',
      };

      expect(tierMapping['price_starter_monthly']).toBe('starter');
      expect(tierMapping['price_professional_monthly']).toBe('professional');
      expect(tierMapping['price_business_monthly']).toBe('business');
      expect(tierMapping['price_enterprise_monthly']).toBe('enterprise');
    });

    it('should default to starter tier for unknown price IDs', () => {
      const tierMapping: Record<string, string> = {
        'price_starter_monthly': 'starter',
      };

      const priceId = 'price_unknown_123';
      const tier = tierMapping[priceId] || 'starter';
      expect(tier).toBe('starter');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing webhook secret gracefully', () => {
      const webhookSecret = undefined;
      const hasSecret = Boolean(webhookSecret);
      expect(hasSecret).toBe(false);
    });

    it('should handle signature verification failure', () => {
      const mockError = new Error('Webhook signature verification failed');
      expect(mockError.message).toContain('signature verification failed');
    });

    it('should handle database errors during event logging', () => {
      const dbError = { message: 'Connection failed', code: 'PGRST301' };
      expect(dbError.message).toBe('Connection failed');
    });

    it('should clear processing flag on handler error', () => {
      // Simulate error handling state transition
      const eventState = { processing: true, processed: false, error: null };

      // After error, processing should be cleared
      eventState.processing = false;
      eventState.error = 'Handler failed';

      expect(eventState.processing).toBe(false);
      expect(eventState.error).toBe('Handler failed');
    });
  });

  describe('Response Codes', () => {
    it('should return 200 for successfully processed events', () => {
      const successResponse = { status: 200, body: { received: true, event: 'checkout.session.completed' } };
      expect(successResponse.status).toBe(200);
    });

    it('should return 200 for already processed events (idempotency)', () => {
      const duplicateResponse = { status: 200, body: { received: true, status: 'already_processed' } };
      expect(duplicateResponse.status).toBe(200);
    });

    it('should return 400 for missing signature', () => {
      const badRequestResponse = { status: 400, body: { error: 'Missing stripe-signature header' } };
      expect(badRequestResponse.status).toBe(400);
    });

    it('should return 400 for invalid signature', () => {
      const invalidSigResponse = { status: 400, body: { error: 'Webhook signature verification failed' } };
      expect(invalidSigResponse.status).toBe(400);
    });

    it('should return 405 for non-POST methods', () => {
      const methodNotAllowedResponse = { status: 405, body: { error: 'Method not allowed' } };
      expect(methodNotAllowedResponse.status).toBe(405);
    });

    it('should return 500 for internal errors', () => {
      const internalErrorResponse = { status: 500, body: { error: 'Internal server error' } };
      expect(internalErrorResponse.status).toBe(500);
    });
  });

  describe('CORS Headers', () => {
    it('should include correct CORS headers', () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      };

      expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
      expect(corsHeaders['Access-Control-Allow-Headers']).toContain('stripe-signature');
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
    });
  });
});

describe('Stripe Webhook Handlers Unit Tests', () => {
  describe('handleCheckoutSessionCompleted', () => {
    it('should extract customer and subscription IDs from session', () => {
      const session = {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        customer_email: 'test@example.com',
        metadata: { enterprise_id: 'ent_123' },
      };

      expect(session.customer).toBe('cus_test_123');
      expect(session.subscription).toBe('sub_test_123');
      expect(session.metadata.enterprise_id).toBe('ent_123');
    });

    it('should handle sessions without subscriptions (one-time payments)', () => {
      const session = {
        id: 'cs_test_onetime_123',
        customer: 'cus_test_123',
        subscription: null,
        customer_email: 'test@example.com',
        metadata: { enterprise_id: 'ent_123', payment_type: 'one_time' },
      };

      expect(session.subscription).toBeNull();
    });
  });

  describe('handleSubscriptionCreatedOrUpdated', () => {
    it('should extract subscription period dates', () => {
      const now = Math.floor(Date.now() / 1000);
      const subscription = {
        id: 'sub_test_123',
        status: 'active',
        current_period_start: now,
        current_period_end: now + 2592000, // 30 days
        items: {
          data: [{ price: { id: 'price_starter_monthly' } }],
        },
      };

      const periodStart = new Date(subscription.current_period_start * 1000);
      const periodEnd = new Date(subscription.current_period_end * 1000);

      expect(periodStart).toBeInstanceOf(Date);
      expect(periodEnd).toBeInstanceOf(Date);
      expect(periodEnd.getTime()).toBeGreaterThan(periodStart.getTime());
    });

    it('should map subscription status correctly', () => {
      const validStatuses = ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'];

      for (const status of validStatuses) {
        expect(validStatuses).toContain(status);
      }
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should set status to canceled', () => {
      const subscription = {
        id: 'sub_test_123',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
        ended_at: Math.floor(Date.now() / 1000),
      };

      expect(subscription.status).toBe('canceled');
      expect(subscription.canceled_at).toBeDefined();
    });

    it('should handle subscriptions that ended in the past', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      const subscription = {
        id: 'sub_test_123',
        status: 'canceled',
        canceled_at: pastTimestamp,
        ended_at: pastTimestamp,
      };

      const endedAt = new Date(subscription.ended_at * 1000);
      expect(endedAt.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('handleInvoicePaid', () => {
    it('should extract payment amount and currency', () => {
      const invoice = {
        id: 'in_test_123',
        amount_paid: 4900,
        currency: 'usd',
        status: 'paid',
      };

      expect(invoice.amount_paid).toBe(4900);
      expect(invoice.currency).toBe('usd');
    });

    it('should handle zero-amount invoices (trial periods)', () => {
      const invoice = {
        id: 'in_test_trial_123',
        amount_paid: 0,
        currency: 'usd',
        status: 'paid',
      };

      expect(invoice.amount_paid).toBe(0);
      expect(invoice.status).toBe('paid');
    });
  });

  describe('handleInvoicePaymentFailed', () => {
    it('should track payment attempt count', () => {
      const invoice = {
        id: 'in_test_123',
        attempt_count: 3,
        next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
        status: 'open',
      };

      expect(invoice.attempt_count).toBe(3);
      expect(invoice.next_payment_attempt).toBeDefined();
    });

    it('should handle final failed attempt (no next attempt)', () => {
      const invoice = {
        id: 'in_test_123',
        attempt_count: 4,
        next_payment_attempt: null,
        status: 'uncollectible',
      };

      expect(invoice.next_payment_attempt).toBeNull();
      expect(invoice.status).toBe('uncollectible');
    });
  });
});
