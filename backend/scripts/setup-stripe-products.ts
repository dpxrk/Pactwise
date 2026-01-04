/**
 * Stripe Product and Price Setup Script
 *
 * Creates Pactwise subscription products and prices in Stripe.
 * Run this script once to set up your Stripe account, then use the
 * output IDs to configure the database migration.
 *
 * Usage:
 *   npx tsx scripts/setup-stripe-products.ts
 *
 * Environment:
 *   STRIPE_SECRET_KEY - Your Stripe secret key (required)
 */

import Stripe from 'stripe';

// Validate environment
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY environment variable is required');
  console.error('Set it with: export STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Plan configuration
const PLANS = [
  {
    name: 'Pactwise Starter',
    id: 'pactwise_starter',
    description:
      'Perfect for small teams getting started with contract management',
    features: {
      contracts: 100,
      users: 10,
      vendors: 50,
      integrations: 1,
      support: 'email',
    },
    monthlyPrice: 4900, // $49.00 per user
    annualPrice: 46800, // $468.00 per user/year ($39/mo equivalent)
  },
  {
    name: 'Pactwise Professional',
    id: 'pactwise_professional',
    description:
      'Advanced features for growing teams with complex contract needs',
    features: {
      contracts: 500,
      users: 25,
      vendors: -1, // unlimited
      integrations: 5,
      support: 'priority',
      ai_analysis: true,
      compliance_tracking: true,
    },
    monthlyPrice: 9900, // $99.00 per user
    annualPrice: 94800, // $948.00 per user/year ($79/mo equivalent)
  },
  {
    name: 'Pactwise Business',
    id: 'pactwise_business',
    description:
      'Full-featured solution for enterprises with unlimited contracts',
    features: {
      contracts: -1, // unlimited
      users: 100,
      vendors: -1, // unlimited
      integrations: -1, // unlimited
      support: 'dedicated',
      ai_analysis: true,
      compliance_tracking: true,
      custom_workflows: true,
      advanced_analytics: true,
    },
    monthlyPrice: 14900, // $149.00 per user
    annualPrice: 142800, // $1,428.00 per user/year ($119/mo equivalent)
  },
];

interface CreatedPlan {
  name: string;
  productId: string;
  monthlyPriceId: string;
  annualPriceId: string;
  monthlyPrice: number;
  annualPrice: number;
  features: Record<string, unknown>;
}

async function createStripeProducts(): Promise<CreatedPlan[]> {
  console.log('Creating Stripe products and prices...\n');

  const createdPlans: CreatedPlan[] = [];

  for (const plan of PLANS) {
    console.log(`Creating product: ${plan.name}...`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['pactwise_id']:'${plan.id}'`,
    });

    let product: Stripe.Product;

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Product already exists: ${product.id}`);
    } else {
      // Create the product
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          pactwise_id: plan.id,
          features: JSON.stringify(plan.features),
        },
      });
      console.log(`  Created product: ${product.id}`);
    }

    // Check for existing prices
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    let monthlyPrice: Stripe.Price | undefined;
    let annualPrice: Stripe.Price | undefined;

    for (const price of existingPrices.data) {
      if (
        price.recurring?.interval === 'month' &&
        price.unit_amount === plan.monthlyPrice
      ) {
        monthlyPrice = price;
      }
      if (
        price.recurring?.interval === 'year' &&
        price.unit_amount === plan.annualPrice
      ) {
        annualPrice = price;
      }
    }

    // Create monthly price if not exists
    if (!monthlyPrice) {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          pactwise_id: `${plan.id}_monthly`,
          billing_period: 'monthly',
        },
      });
      console.log(`  Created monthly price: ${monthlyPrice.id}`);
    } else {
      console.log(`  Monthly price already exists: ${monthlyPrice.id}`);
    }

    // Create annual price if not exists
    if (!annualPrice) {
      annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.annualPrice,
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        metadata: {
          pactwise_id: `${plan.id}_annual`,
          billing_period: 'annual',
        },
      });
      console.log(`  Created annual price: ${annualPrice.id}`);
    } else {
      console.log(`  Annual price already exists: ${annualPrice.id}`);
    }

    createdPlans.push({
      name: plan.name,
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      annualPriceId: annualPrice.id,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      features: plan.features,
    });

    console.log('');
  }

  return createdPlans;
}

function generateMigrationSQL(plans: CreatedPlan[]): string {
  const values = plans.flatMap((plan) => [
    // Monthly plan
    `  ('${plan.name} - Monthly', '${plan.productId}', '${plan.monthlyPriceId}', '${plan.name.toLowerCase().replace(/\s+/g, '_').replace('pactwise_', '')}_monthly', '${plan.name} billed monthly', ${plan.monthlyPrice}, 'usd', 'month', 14, '${JSON.stringify(plan.features)}', true)`,
    // Annual plan
    `  ('${plan.name} - Annual', '${plan.productId}', '${plan.annualPriceId}', '${plan.name.toLowerCase().replace(/\s+/g, '_').replace('pactwise_', '')}_annual', '${plan.name} billed annually (20% savings)', ${plan.annualPrice}, 'usd', 'year', 14, '${JSON.stringify(plan.features)}', true)`,
  ]);

  return `-- Pactwise Subscription Plans
-- Generated by setup-stripe-products.ts on ${new Date().toISOString()}
--
-- This migration seeds the subscription_plans table with Stripe product/price IDs

-- First, clear any existing plans (be careful in production!)
-- DELETE FROM subscription_plans WHERE stripe_product_id LIKE 'prod_%';

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
  is_active
) VALUES
${values.join(',\n')}
ON CONFLICT (stripe_price_id) DO UPDATE SET
  name = EXCLUDED.name,
  stripe_product_id = EXCLUDED.stripe_product_id,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
`;
}

function generateEnvConfig(plans: CreatedPlan[]): string {
  return `# Stripe Price IDs for Pactwise
# Add these to your .env file

# Starter Plan
STRIPE_PRICE_ID_STARTER_MONTHLY=${plans[0].monthlyPriceId}
STRIPE_PRICE_ID_STARTER_ANNUAL=${plans[0].annualPriceId}

# Professional Plan
STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=${plans[1].monthlyPriceId}
STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL=${plans[1].annualPriceId}

# Business Plan
STRIPE_PRICE_ID_BUSINESS_MONTHLY=${plans[2].monthlyPriceId}
STRIPE_PRICE_ID_BUSINESS_ANNUAL=${plans[2].annualPriceId}
`;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Pactwise Stripe Product Setup');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Verify Stripe connection
    const account = await stripe.accounts.retrieve();
    console.log(`Connected to Stripe account: ${account.id}`);
    console.log(
      `Mode: ${STRIPE_SECRET_KEY.startsWith('sk_live') ? 'LIVE' : 'TEST'}`
    );
    console.log('');

    // Create products and prices
    const plans = await createStripeProducts();

    // Generate outputs
    console.log('='.repeat(60));
    console.log('SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('');

    console.log('Generated Migration SQL:');
    console.log('-'.repeat(40));
    const sql = generateMigrationSQL(plans);
    console.log(sql);
    console.log('');

    console.log('Environment Variables:');
    console.log('-'.repeat(40));
    const env = generateEnvConfig(plans);
    console.log(env);

    // Summary table
    console.log('');
    console.log('Plan Summary:');
    console.log('-'.repeat(60));
    console.log(
      '| Plan         | Monthly     | Annual      | Product ID        |'
    );
    console.log(
      '|--------------|-------------|-------------|-------------------|'
    );
    for (const plan of plans) {
      const name = plan.name.replace('Pactwise ', '').padEnd(12);
      const monthly = `$${(plan.monthlyPrice / 100).toFixed(2)}/mo`.padEnd(11);
      const annual = `$${(plan.annualPrice / 100 / 12).toFixed(2)}/mo`.padEnd(
        11
      );
      const productId = plan.productId.substring(0, 17).padEnd(17);
      console.log(`| ${name} | ${monthly} | ${annual} | ${productId} |`);
    }
    console.log('-'.repeat(60));
    console.log('');

    console.log('Next Steps:');
    console.log('1. Copy the SQL above to a new migration file');
    console.log('2. Add the environment variables to your .env file');
    console.log('3. Run: npm run migrate');
    console.log('');
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    process.exit(1);
  }
}

main();
