#!/bin/bash

# Script to set up Stripe webhook forwarding for local development
# This will forward Stripe webhooks to your local Next.js server

set -e

WEBHOOK_ENDPOINT="http://localhost:3000/api/v1/stripe/webhook"
ENV_FILE="/home/dpxrk/pactwise-fork/frontend/.env.local"

echo "🎯 Setting up Stripe webhook forwarding..."
echo "📍 Endpoint: $WEBHOOK_ENDPOINT"
echo ""

# Start stripe listen in the foreground and capture the webhook secret
echo "🔊 Starting Stripe webhook listener..."
echo "⚠️  Press Ctrl+C to stop listening"
echo ""
echo "📝 Instructions:"
echo "   1. This will display a webhook signing secret"
echo "   2. Copy the secret (starts with whsec_)"
echo "   3. Add it to your .env.local file:"
echo "      STRIPE_WEBHOOK_SECRET=whsec_xxxxx"
echo "   4. Restart your Next.js dev server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

~/.local/bin/stripe listen \
  --forward-to "$WEBHOOK_ENDPOINT" \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
