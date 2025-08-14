#!/usr/bin/env node

/**
 * Manual Stripe Integration Test Script
 * Run this script to test your Stripe integration
 */

const https = require('https')

const TEST_BASE_URL = 'http://localhost:3000'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testCreateCheckout() {
  log('blue', '\n🧪 Testing Create Checkout Session...')
  
  try {
    const response = await fetch(`${TEST_BASE_URL}/api/create-demo-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        demoName: 'Contract Analysis',
        amount: 1000
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.url) {
      log('green', '✅ Checkout session created successfully')
      log('blue', `   URL: ${data.url}`)
      return data.url
    } else {
      log('red', '❌ Failed to create checkout session')
      log('red', `   Error: ${data.error || 'Unknown error'}`)
      return null
    }
  } catch (error) {
    log('red', '❌ Network error during checkout creation')
    log('red', `   Error: ${error.message}`)
    return null
  }
}

async function testInvalidRequest() {
  log('blue', '\n🧪 Testing Invalid Request (Missing Fields)...')
  
  try {
    const response = await fetch(`${TEST_BASE_URL}/api/create-demo-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        demoName: 'Contract Analysis'
        // Missing amount field
      })
    })
    
    const data = await response.json()
    
    if (response.status === 400) {
      log('green', '✅ Properly handled invalid request')
      log('blue', `   Error: ${data.error}`)
    } else {
      log('red', '❌ Should have returned 400 for invalid request')
    }
  } catch (error) {
    log('red', '❌ Network error during invalid request test')
    log('red', `   Error: ${error.message}`)
  }
}

async function testEnvironmentVariables() {
  log('blue', '\n🧪 Testing Environment Variables...')
  
  // Check if the server can access Stripe keys
  try {
    const response = await fetch(`${TEST_BASE_URL}/api/create-demo-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        demoName: 'Test Demo',
        amount: 100
      })
    })
    
    if (response.status === 500) {
      const data = await response.json()
      if (data.error && data.error.includes('API key')) {
        log('red', '❌ Stripe API key not configured properly')
        log('yellow', '   Please check your .env.local file')
      }
    } else {
      log('green', '✅ Environment variables appear to be configured')
    }
  } catch (error) {
    log('red', '❌ Cannot test environment variables')
    log('red', `   Error: ${error.message}`)
  }
}

async function runTests() {
  log('blue', '🚀 Starting Stripe Integration Tests...')
  log('yellow', `Testing against: ${TEST_BASE_URL}`)
  
  // Test 1: Valid checkout creation
  await testCreateCheckout()
  
  // Test 2: Invalid request handling
  await testInvalidRequest()
  
  // Test 3: Environment variables
  await testEnvironmentVariables()
  
  log('blue', '\n📋 Test Summary:')
  log('green', '✅ = Test passed')
  log('red', '❌ = Test failed')
  log('yellow', '⚠️  = Check configuration')
  
  log('blue', '\n🔧 Manual Testing Steps:')
  log('yellow', '1. Start your dev server: npm run dev')
  log('yellow', '2. Open http://localhost:3000')
  log('yellow', '3. Click any demo and try the payment flow')
  log('yellow', '4. Use Stripe test cards: 4242424242424242')
  log('yellow', '5. Check the demo-success page redirects properly')
  
  log('blue', '\n📚 Stripe Test Cards:')
  log('green', '• 4242424242424242 - Visa (Success)')
  log('green', '• 4000000000000002 - Visa (Declined)')
  log('green', '• 4000000000009995 - Visa (Insufficient funds)')
}

// Check if we're running in Node.js
if (typeof window === 'undefined') {
  runTests().catch(console.error)
} else {
  console.log('This script should be run in Node.js, not in the browser')
}

module.exports = { runTests }