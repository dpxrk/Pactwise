import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { demoName, amount } = await request.json()

    if (!demoName || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: demoName, amount' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${demoName} Demo Access`,
            description: 'Unlock full demo results and insights',
            images: [`${request.headers.get('origin')}/icon-512.png`],
          },
          unit_amount: amount, // Amount in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/demo-success?session_id={CHECKOUT_SESSION_ID}&demo=${encodeURIComponent(demoName)}`,
      cancel_url: `${request.headers.get('origin')}/?canceled=true`,
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