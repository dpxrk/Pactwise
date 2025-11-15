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

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      )
    }

    // Retrieve the checkout session from Stripe
    const session = await getStripe().checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        demoName: session.metadata?.demoName,
        amount: session.amount_total,
        customerEmail: session.customer_details?.email,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Payment not completed',
        status: session.payment_status,
      })
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}