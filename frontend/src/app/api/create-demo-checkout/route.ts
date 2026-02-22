import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe lazily to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-IP, 5 requests per 15 minutes)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodic cleanup so the map doesn't grow unbounded in long-running processes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------
const DEMO_AMOUNT_MAX_CENTS = 9999; // $99.99
const DEMO_NAME_MAX_LENGTH = 100;

function sanitizeDemoName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // Strip HTML tags and trim whitespace
  const cleaned = raw.replace(/<[^>]*>/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > DEMO_NAME_MAX_LENGTH) return null;
  return cleaned;
}

function validateAmount(raw: unknown): number | null {
  if (typeof raw !== 'number') return null;
  if (!Number.isInteger(raw)) return null;
  if (raw < 1 || raw > DEMO_AMOUNT_MAX_CENTS) return null;
  return raw;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { demoName: rawDemoName, amount: rawAmount } = body;

    // Validate and sanitize demoName
    const demoName = sanitizeDemoName(rawDemoName);
    if (!demoName) {
      return NextResponse.json(
        { error: 'Invalid or missing demoName. Must be a non-empty string up to 100 characters with no HTML.' },
        { status: 400 }
      );
    }

    // Validate amount
    const amount = validateAmount(rawAmount);
    if (amount === null) {
      return NextResponse.json(
        { error: `Invalid amount. Must be a positive integer between 1 and ${DEMO_AMOUNT_MAX_CENTS} (cents).` },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const origin = request.headers.get('origin') || '';

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${demoName} Demo Access`,
            description: 'Unlock full demo results and insights',
            images: origin ? [`${origin}/icon-512.png`] : [],
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/demo-success?session_id={CHECKOUT_SESSION_ID}&demo=${encodeURIComponent(demoName)}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        demoName,
        type: 'demo_unlock',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
