# Stripe Webhook Handler - Supabase Edge Function

This edge function handles Stripe webhook events for payment processing.

## Events Handled

- `checkout.session.completed` - New subscription purchase
- `customer.subscription.created` - Subscription creation
- `customer.subscription.updated` - Plan changes, renewals
- `customer.subscription.deleted` - Cancellations
- `invoice.paid` - Payment confirmations
- `invoice.payment_failed` - Failed payments

## Environment Variables

Required in Supabase Edge Function secrets:

```bash
STRIPE_SECRET_KEY=sk_live_...           # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret
SUPABASE_URL=https://xxx.supabase.co    # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Service role key for admin access
```

## Local Testing

### 1. Set environment variables

```bash
cd /home/dpxrk/Pactwise/backend
cp .env.example .env
# Edit .env with your keys
```

### 2. Start Supabase locally

```bash
supabase start
```

### 3. Serve the edge function

```bash
supabase functions serve stripe-webhook --env-file .env
```

### 4. Forward Stripe webhooks using Stripe CLI

Install Stripe CLI: https://stripe.com/docs/stripe-cli

```bash
stripe login
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

This will output a webhook signing secret. Add it to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5. Trigger test events

```bash
# Test checkout session completed
stripe trigger checkout.session.completed

# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test subscription deleted
stripe trigger customer.subscription.deleted

# Test invoice paid
stripe trigger invoice.paid

# Test invoice payment failed
stripe trigger invoice.payment_failed
```

### 6. View logs

```bash
supabase functions logs stripe-webhook --follow
```

## Deployment

### 1. Deploy to Supabase

```bash
supabase functions deploy stripe-webhook
```

### 2. Set production secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Get webhook URL

Your webhook URL will be:
```
https://[project-id].supabase.co/functions/v1/stripe-webhook
```

### 4. Update Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL
4. Select events to listen to:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.paid
   - invoice.payment_failed
5. Copy the **Signing secret** and update your Supabase secrets:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Database Tables Updated

This function updates the following tables:

- `billing_events` - Logs all webhook events
- `stripe_customers` - Stores Stripe customer data
- `subscriptions` - Manages subscription lifecycle
- `subscription_plans` - Links Stripe prices to plans
- `enterprises` - Updates subscription tier

## Monitoring

### View function logs

```bash
supabase functions logs stripe-webhook --follow
```

### Check Stripe Dashboard

Monitor webhook deliveries at:
https://dashboard.stripe.com/webhooks

Failed webhooks will show error details and allow manual retry.

## Troubleshooting

### Webhook signature verification failed

- Ensure `STRIPE_WEBHOOK_SECRET` matches the secret in Stripe Dashboard
- Check that you're using the correct signing secret for your environment (test/live)

### Missing enterprise_id in session metadata

- Ensure your checkout session includes `enterprise_id` in metadata:

```typescript
const session = await stripe.checkout.sessions.create({
  metadata: {
    enterprise_id: 'uuid-here',
  },
  // ... other params
});
```

### Database update failures

- Check Supabase logs for SQL errors
- Verify RLS policies allow service role access
- Ensure all required tables exist (run migrations)

## Migration from Next.js

This edge function replaces the Next.js webhook at:
`/frontend/src/app/api/v1/stripe/webhook/route.ts`

After verifying this works:
1. Update Stripe webhook URL to Supabase function
2. Delete the Next.js route
3. Monitor for any issues
4. Keep Next.js route as backup for 1 week before full removal
