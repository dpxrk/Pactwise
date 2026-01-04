-- Pactwise Subscription Plans Seed Migration
--
-- This migration seeds the subscription_plans table with default plans.
-- After running setup-stripe-products.ts, update the stripe_product_id
-- and stripe_price_id values with real Stripe IDs.
--
-- Note: The IDs below are placeholders. Run the setup script to get real IDs:
--   cd backend && npx tsx scripts/setup-stripe-products.ts

-- Add a 'tier' column to subscription_plans if it doesn't exist
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS tier VARCHAR(50);

-- Add a 'display_name' column for user-friendly names
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Drop unique constraint on stripe_product_id (one product can have multiple prices)
ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS subscription_plans_stripe_product_id_key;

-- Create index on tier
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);

-- Insert/update subscription plans
-- Note: Replace placeholder IDs with real Stripe IDs after running setup-stripe-products.ts
INSERT INTO subscription_plans (
  name,
  stripe_product_id,
  stripe_price_id,
  description,
  price_amount,
  price_currency,
  billing_interval,
  trial_period_days,
  features,
  is_active,
  tier,
  display_name
) VALUES
  -- Starter Plans
  (
    'starter_monthly',
    'prod_PLACEHOLDER_STARTER',
    'price_PLACEHOLDER_STARTER_MONTHLY',
    'Perfect for small teams getting started with contract management',
    4900, -- $49.00
    'usd',
    'month',
    14,
    '{"contracts": 100, "users": 10, "vendors": 50, "integrations": 1, "support": "email"}'::jsonb,
    true,
    'starter',
    'Starter'
  ),
  (
    'starter_annual',
    'prod_PLACEHOLDER_STARTER',
    'price_PLACEHOLDER_STARTER_ANNUAL',
    'Perfect for small teams getting started with contract management (Annual)',
    46800, -- $468.00/year = $39/month
    'usd',
    'year',
    14,
    '{"contracts": 100, "users": 10, "vendors": 50, "integrations": 1, "support": "email"}'::jsonb,
    true,
    'starter',
    'Starter'
  ),

  -- Professional Plans
  (
    'professional_monthly',
    'prod_PLACEHOLDER_PROFESSIONAL',
    'price_PLACEHOLDER_PROFESSIONAL_MONTHLY',
    'Advanced features for growing teams with complex contract needs',
    9900, -- $99.00
    'usd',
    'month',
    14,
    '{"contracts": 500, "users": 25, "vendors": -1, "integrations": 5, "support": "priority", "ai_analysis": true, "compliance_tracking": true}'::jsonb,
    true,
    'professional',
    'Professional'
  ),
  (
    'professional_annual',
    'prod_PLACEHOLDER_PROFESSIONAL',
    'price_PLACEHOLDER_PROFESSIONAL_ANNUAL',
    'Advanced features for growing teams with complex contract needs (Annual)',
    94800, -- $948.00/year = $79/month
    'usd',
    'year',
    14,
    '{"contracts": 500, "users": 25, "vendors": -1, "integrations": 5, "support": "priority", "ai_analysis": true, "compliance_tracking": true}'::jsonb,
    true,
    'professional',
    'Professional'
  ),

  -- Business Plans
  (
    'business_monthly',
    'prod_PLACEHOLDER_BUSINESS',
    'price_PLACEHOLDER_BUSINESS_MONTHLY',
    'Full-featured solution for enterprises with unlimited contracts',
    14900, -- $149.00
    'usd',
    'month',
    14,
    '{"contracts": -1, "users": 100, "vendors": -1, "integrations": -1, "support": "dedicated", "ai_analysis": true, "compliance_tracking": true, "custom_workflows": true, "advanced_analytics": true}'::jsonb,
    true,
    'business',
    'Business'
  ),
  (
    'business_annual',
    'prod_PLACEHOLDER_BUSINESS',
    'price_PLACEHOLDER_BUSINESS_ANNUAL',
    'Full-featured solution for enterprises with unlimited contracts (Annual)',
    142800, -- $1,428.00/year = $119/month
    'usd',
    'year',
    14,
    '{"contracts": -1, "users": 100, "vendors": -1, "integrations": -1, "support": "dedicated", "ai_analysis": true, "compliance_tracking": true, "custom_workflows": true, "advanced_analytics": true}'::jsonb,
    true,
    'business',
    'Business'
  )
ON CONFLICT (stripe_price_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  tier = EXCLUDED.tier,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Create a function to get plan features by tier
CREATE OR REPLACE FUNCTION get_plan_features(p_tier VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_features JSONB;
BEGIN
  SELECT features INTO v_features
  FROM subscription_plans
  WHERE tier = p_tier AND is_active = true
  LIMIT 1;

  RETURN COALESCE(v_features, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a function to check if a feature is available for a plan
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_enterprise_id UUID,
  p_feature VARCHAR,
  p_current_usage INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_features JSONB;
BEGIN
  -- Get the enterprise's current subscription tier
  SELECT sp.features INTO v_features
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.enterprise_id = p_enterprise_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- If no subscription, use free tier limits
  IF v_features IS NULL THEN
    v_features := '{"contracts": 10, "users": 2, "vendors": 5}'::jsonb;
  END IF;

  -- Get the limit for the feature
  v_limit := (v_features ->> p_feature)::INTEGER;

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;

  -- Check if under limit
  RETURN p_current_usage < v_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE subscription_plans IS 'Pactwise subscription plans with Stripe integration';
COMMENT ON COLUMN subscription_plans.tier IS 'Plan tier: starter, professional, business, enterprise';
COMMENT ON COLUMN subscription_plans.display_name IS 'User-friendly display name for the plan';
