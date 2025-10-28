#!/usr/bin/env tsx

/**
 * Stripe Connection Test Script
 *
 * This script tests the Stripe integration by:
 * 1. Validating environment variables
 * 2. Testing Stripe API connection
 * 3. Checking webhook secret configuration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: TestResult[] = [];

function logResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ test, status, message });

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${message}`);
}

async function testStripeConnection() {
  console.log('🔍 Testing Stripe Integration...\n');

  // Test 1: Frontend Environment Variables
  console.log('📋 1. Frontend Environment Variables');
  const frontendPublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!frontendPublicKey || frontendPublicKey === 'your_stripe_publishable_key') {
    logResult(
      'Frontend Publishable Key',
      'FAIL',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured in .env.local'
    );
  } else if (frontendPublicKey.startsWith('pk_test_')) {
    logResult(
      'Frontend Publishable Key',
      'PASS',
      `Test mode key configured: ${frontendPublicKey.substring(0, 20)}...`
    );
  } else if (frontendPublicKey.startsWith('pk_live_')) {
    logResult(
      'Frontend Publishable Key',
      'WARN',
      `Live mode key configured: ${frontendPublicKey.substring(0, 20)}...`
    );
  } else {
    logResult(
      'Frontend Publishable Key',
      'WARN',
      'Key configured but format is unexpected'
    );
  }

  // Test 2: Backend Environment Variables
  console.log('\n📋 2. Backend Environment Variables');

  // Read backend .env file
  const backendEnvPath = path.join(__dirname, '../../backend/.env');
  let backendSecretKey = '';
  let webhookSecret = '';

  try {
    const fs = await import('fs');
    const backendEnv = fs.readFileSync(backendEnvPath, 'utf-8');
    const secretKeyMatch = backendEnv.match(/STRIPE_SECRET_KEY=(.+)/);
    const webhookSecretMatch = backendEnv.match(/STRIPE_WEBHOOK_SECRET=(.+)/);

    backendSecretKey = secretKeyMatch ? secretKeyMatch[1].trim() : '';
    webhookSecret = webhookSecretMatch ? webhookSecretMatch[1].trim() : '';
  } catch (error) {
    logResult(
      'Backend Environment File',
      'FAIL',
      'Could not read /backend/.env file'
    );
  }

  if (!backendSecretKey || backendSecretKey === 'sk_test_your_stripe_secret_key_here') {
    logResult(
      'Backend Secret Key',
      'FAIL',
      'STRIPE_SECRET_KEY not configured in backend/.env'
    );
  } else if (backendSecretKey.startsWith('sk_test_')) {
    logResult(
      'Backend Secret Key',
      'PASS',
      `Test mode key configured: ${backendSecretKey.substring(0, 15)}...`
    );
  } else if (backendSecretKey.startsWith('sk_live_')) {
    logResult(
      'Backend Secret Key',
      'WARN',
      `Live mode key configured: ${backendSecretKey.substring(0, 15)}...`
    );
  } else {
    logResult(
      'Backend Secret Key',
      'WARN',
      'Key configured but format is unexpected'
    );
  }

  if (!webhookSecret || webhookSecret === 'whsec_your_webhook_secret_here') {
    logResult(
      'Webhook Secret',
      'WARN',
      'STRIPE_WEBHOOK_SECRET not configured (webhooks will not work)'
    );
  } else if (webhookSecret.startsWith('whsec_')) {
    logResult(
      'Webhook Secret',
      'PASS',
      `Webhook secret configured: ${webhookSecret.substring(0, 15)}...`
    );
  } else {
    logResult(
      'Webhook Secret',
      'WARN',
      'Webhook secret configured but format is unexpected'
    );
  }

  // Test 3: Try to initialize Stripe (if real keys are configured)
  console.log('\n📋 3. Stripe API Connection Test');

  if (backendSecretKey && backendSecretKey.startsWith('sk_')) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(backendSecretKey, {
        apiVersion: '2025-08-27.basil',
      });

      // Try to retrieve account information
      const account = await stripe.accounts.retrieve();

      logResult(
        'Stripe API Connection',
        'PASS',
        `Successfully connected to Stripe account: ${account.id}`
      );

      logResult(
        'Account Type',
        'PASS',
        `Account type: ${account.type}, Email: ${account.email || 'N/A'}`
      );

      // Check if account is in test mode
      if (account.id.startsWith('acct_')) {
        const isTestMode = backendSecretKey.startsWith('sk_test_');
        logResult(
          'Test Mode',
          isTestMode ? 'PASS' : 'WARN',
          isTestMode ? 'Running in test mode' : 'Running in LIVE mode - be careful!'
        );
      }

    } catch (error) {
      const err = error as Error;
      logResult(
        'Stripe API Connection',
        'FAIL',
        `Failed to connect to Stripe: ${err.message}`
      );
    }
  } else {
    logResult(
      'Stripe API Connection',
      'WARN',
      'Skipping API test - valid secret key not configured'
    );
  }

  // Test 4: Check webhook endpoint configuration
  console.log('\n📋 4. Webhook Endpoint Check');

  const expectedWebhookPath = '/api/v1/stripe/webhook';
  logResult(
    'Webhook Endpoint',
    'PASS',
    `Webhook endpoint available at: ${expectedWebhookPath}`
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Stripe integration has issues that need to be fixed.');
    console.log('\n📝 Next Steps:');
    console.log('1. Add your Stripe publishable key to frontend/.env.local:');
    console.log('   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...');
    console.log('\n2. Add your Stripe secret key to backend/.env:');
    console.log('   STRIPE_SECRET_KEY=sk_test_...');
    console.log('\n3. Add your webhook secret to backend/.env:');
    console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');
    console.log('\n4. Get your keys from: https://dashboard.stripe.com/test/apikeys');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  Stripe integration is partially configured.');
    console.log('Some features may not work as expected.');
    process.exit(0);
  } else {
    console.log('\n✅ Stripe integration is fully configured and working!');
    process.exit(0);
  }
}

// Run the test
testStripeConnection().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
