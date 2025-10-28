#!/bin/bash

# Automated script to start Stripe webhooks and configure the webhook secret
# This script will:
# 1. Start stripe listen in the background
# 2. Capture the webhook secret
# 3. Update .env.local with the secret
# 4. Keep the webhook listener running

WEBHOOK_ENDPOINT="http://localhost:3000/api/v1/stripe/webhook"
ENV_FILE="/home/dpxrk/pactwise-fork/frontend/.env.local"
STRIPE_BIN="$HOME/.local/bin/stripe"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Stripe Webhook Setup for Pactwise"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Webhook endpoint: $WEBHOOK_ENDPOINT"
echo ""

# Check if stripe is logged in
if ! $STRIPE_BIN config --list >/dev/null 2>&1; then
    echo "❌ Stripe CLI not logged in. Please run: stripe login"
    exit 1
fi

echo "✅ Stripe CLI is logged in"
echo ""

# Start stripe listen and capture output
echo "🔊 Starting Stripe webhook listener..."
echo "📦 Listening for these events:"
echo "   • checkout.session.completed"
echo "   • customer.subscription.created"
echo "   • customer.subscription.updated"
echo "   • customer.subscription.deleted"
echo "   • invoice.paid"
echo "   • invoice.payment_failed"
echo ""

# Create a temporary file to capture the output
TEMP_OUTPUT=$(mktemp)

# Start stripe listen in background and capture initial output
$STRIPE_BIN listen \
  --forward-to "$WEBHOOK_ENDPOINT" \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed \
  > "$TEMP_OUTPUT" 2>&1 &

STRIPE_PID=$!

# Wait a moment for stripe to initialize
sleep 3

# Extract the webhook secret from the output
WEBHOOK_SECRET=$(grep -oP 'whsec_[a-zA-Z0-9]+' "$TEMP_OUTPUT" | head -1)

if [ -z "$WEBHOOK_SECRET" ]; then
    echo "❌ Failed to extract webhook secret"
    cat "$TEMP_OUTPUT"
    kill $STRIPE_PID 2>/dev/null
    rm "$TEMP_OUTPUT"
    exit 1
fi

echo "✅ Webhook secret obtained: ${WEBHOOK_SECRET:0:20}..."
echo ""

# Update .env.local with the webhook secret
if grep -q "STRIPE_WEBHOOK_SECRET=" "$ENV_FILE"; then
    # Replace existing secret
    sed -i "s|STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" "$ENV_FILE"
    echo "✅ Updated existing STRIPE_WEBHOOK_SECRET in .env.local"
else
    # Add new secret
    echo "" >> "$ENV_FILE"
    echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> "$ENV_FILE"
    echo "✅ Added STRIPE_WEBHOOK_SECRET to .env.local"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Stripe webhook listener is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Restart your Next.js dev server to load the new webhook secret"
echo ""
echo "📊 Webhook listener is running in the background (PID: $STRIPE_PID)"
echo "📝 Logs are being saved to: $TEMP_OUTPUT"
echo ""
echo "To stop the listener, run:"
echo "   kill $STRIPE_PID"
echo ""
echo "To view live webhook events:"
echo "   tail -f $TEMP_OUTPUT"
echo ""

# Keep showing the logs
echo "🔍 Watching for webhook events (Ctrl+C to stop)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Follow the logs
tail -f "$TEMP_OUTPUT"
