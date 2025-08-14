#!/usr/bin/env node

/**
 * Simple Stripe Integration Test
 * Just tests if the Stripe setup is working
 */

console.log('🧪 Testing Stripe Integration Setup...\n')

// Test 1: Check if Stripe is installed
try {
  require('stripe')
  console.log('✅ Stripe package is installed')
} catch (error) {
  console.log('❌ Stripe package is missing')
  console.log('   Run: npm install stripe')
  process.exit(1)
}

// Test 2: Check environment variables from .env.local
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.join(__dirname, '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  if (envContent.includes('STRIPE_SECRET_KEY=sk_test_')) {
    console.log('✅ Stripe secret key is configured')
  } else if (envContent.includes('STRIPE_SECRET_KEY=sk_live_')) {
    console.log('⚠️  Live Stripe key detected - use test keys for development')
  } else {
    console.log('❌ Stripe secret key not found in .env.local')
  }
  
  if (envContent.includes('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_')) {
    console.log('✅ Stripe publishable key is configured')
  } else if (envContent.includes('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_')) {
    console.log('⚠️  Live Stripe publishable key detected - use test keys for development')
  } else {
    console.log('❌ Stripe publishable key not found in .env.local')
  }
} catch (error) {
  console.log('❌ Could not read .env.local file')
  console.log('   Make sure .env.local exists with your Stripe keys')
}

// Test 3: Check if our API routes exist
const apiPaths = [
  'src/app/api/create-demo-checkout/route.ts',
  'src/app/api/verify-payment/route.ts'
]

apiPaths.forEach(apiPath => {
  if (fs.existsSync(apiPath)) {
    console.log(`✅ API route exists: ${apiPath}`)
  } else {
    console.log(`❌ API route missing: ${apiPath}`)
  }
})

// Test 4: Check if demo components exist
const demoComponents = [
  'src/components/demo/DemoPaymentModal.tsx',
  'src/hooks/useDemoAccess.ts'
]

demoComponents.forEach(component => {
  if (fs.existsSync(component)) {
    console.log(`✅ Component exists: ${component}`)
  } else {
    console.log(`❌ Component missing: ${component}`)
  }
})

console.log('\n📋 Summary:')
console.log('✅ = Working correctly')
console.log('⚠️  = Check configuration')
console.log('❌ = Needs attention')

console.log('\n🚀 To test the full flow:')
console.log('1. Start dev server: npm run dev')
console.log('2. Visit: http://localhost:3000')
console.log('3. Open any demo and click "Unlock"')
console.log('4. Try both "Pay with Card" (real Stripe) and "Test Mode"')

console.log('\n💳 Stripe Test Cards:')
console.log('• 4242424242424242 - Success')
console.log('• 4000000000000002 - Declined')
console.log('• Any future expiry date')
console.log('• Any 3-digit CVC')
console.log('• Any zip code')