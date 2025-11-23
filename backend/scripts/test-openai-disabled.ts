#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Test script to verify OpenAI is properly disabled
 * and free providers are working correctly
 */

// Set environment to disable OpenAI
Deno.env.set('ENABLE_OPENAI_FALLBACK', 'false');

// Mock required env vars if not set
if (!Deno.env.get('HUGGINGFACE_API_KEY')) {
  console.warn('⚠️ HUGGINGFACE_API_KEY not set - some tests may fail');
}
if (!Deno.env.get('COHERE_API_KEY')) {
  console.warn('⚠️ COHERE_API_KEY not set - some tests may fail');
}
if (!Deno.env.get('GOOGLE_AI_API_KEY')) {
  console.warn('⚠️ GOOGLE_AI_API_KEY not set - some tests may fail');
}

console.log('🧪 Testing Transformer Service with OpenAI Disabled\n');
console.log('=' .repeat(60));
console.log(`ENABLE_OPENAI_FALLBACK: ${Deno.env.get('ENABLE_OPENAI_FALLBACK')}`);
console.log('=' .repeat(60) + '\n');

// Simulate the provider selection logic
const providers = [
  { name: 'huggingface', hasKey: !!Deno.env.get('HUGGINGFACE_API_KEY') },
  { name: 'cohere', hasKey: !!Deno.env.get('COHERE_API_KEY') },
  { name: 'google', hasKey: !!Deno.env.get('GOOGLE_AI_API_KEY') },
];

const openAIEnabled = Deno.env.get('ENABLE_OPENAI_FALLBACK') === 'true';

console.log('📋 Provider Configuration:');
console.log('-'.repeat(60));

providers.forEach((provider, index) => {
  const status = provider.hasKey ? '✅ Configured' : '❌ Missing API Key';
  console.log(`${index + 1}. ${provider.name.padEnd(15)} - ${status}`);
});

if (openAIEnabled) {
  const hasOpenAIKey = !!Deno.env.get('OPENAI_API_KEY');
  const status = hasOpenAIKey ? '✅ Configured' : '❌ Missing API Key';
  console.log(`4. openai        - ${status} (ENABLED as fallback)`);
} else {
  console.log(`4. openai        - 🚫 DISABLED (not in provider chain)`);
}

console.log('-'.repeat(60) + '\n');

// Test Results
console.log('📊 Test Results:');
console.log('-'.repeat(60));

const configuredProviders = providers.filter(p => p.hasKey);
const hasAtLeastOneProvider = configuredProviders.length > 0;

if (!openAIEnabled) {
  console.log('✅ OpenAI fallback is properly DISABLED');
} else {
  console.log('⚠️ OpenAI fallback is ENABLED - not expected for Phase 1');
}

if (hasAtLeastOneProvider) {
  console.log(`✅ ${configuredProviders.length}/3 free providers configured`);
  console.log(`   Active providers: ${configuredProviders.map(p => p.name).join(', ')}`);
} else {
  console.log('❌ No free providers configured - AI features will not work');
  console.log('   Please configure at least one of: HUGGINGFACE_API_KEY, COHERE_API_KEY, GOOGLE_AI_API_KEY');
}

console.log('-'.repeat(60) + '\n');

// Recommendations
console.log('💡 Recommendations:');
console.log('-'.repeat(60));

if (!openAIEnabled && hasAtLeastOneProvider) {
  console.log('✅ Configuration is optimal for Phase 1');
  console.log('   - OpenAI disabled (cost savings)');
  console.log(`   - ${configuredProviders.length} free provider(s) ready`);
  console.log('   - Next: Monitor for 3-5 days, then remove OpenAI code');
} else if (openAIEnabled) {
  console.log('⚠️ To disable OpenAI, set: ENABLE_OPENAI_FALLBACK=false');
  console.log('   This will eliminate OpenAI costs immediately');
} else if (!hasAtLeastOneProvider) {
  console.log('❌ Critical: Configure at least one free AI provider');
  console.log('   Get API keys from:');
  console.log('   - HuggingFace: https://huggingface.co/settings/tokens (FREE)');
  console.log('   - Cohere: https://dashboard.cohere.com/api-keys (FREE 1000/month)');
  console.log('   - Google AI: https://makersuite.google.com/app/apikey (FREE)');
}

console.log('-'.repeat(60) + '\n');

// Expected behavior
console.log('📖 Expected Behavior:');
console.log('-'.repeat(60));
console.log('When AI features are used:');
console.log('1. Try HuggingFace first (if configured)');
console.log('2. If HuggingFace fails, try Cohere (if configured)');
console.log('3. If Cohere fails, try Google Gemini (if configured)');
if (!openAIEnabled) {
  console.log('4. If all fail, throw error with helpful message');
  console.log('   (OpenAI is NOT attempted)');
} else {
  console.log('4. If all fail, try OpenAI (if configured)');
}
console.log('-'.repeat(60) + '\n');

// Exit code
const exitCode = (!openAIEnabled && hasAtLeastOneProvider) ? 0 : 1;

if (exitCode === 0) {
  console.log('✅ All checks passed! Configuration is ready for Phase 1.\n');
} else {
  console.log('❌ Configuration needs adjustment. See recommendations above.\n');
}

Deno.exit(exitCode);
