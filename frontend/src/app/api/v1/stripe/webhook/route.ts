import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// This is a proxy route that forwards Stripe webhooks to Convex
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

  try {
    // Forward the webhook to Convex
    const convexWebhookUrl = `${process.env.NEXT_PUBLIC_CONVEX_URL}/stripe/webhook`;
    
    const response = await fetch(convexWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Convex webhook failed: ${response.statusText}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Stripe requires raw body for webhook verification
export const runtime = "edge";