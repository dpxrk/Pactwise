import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Simple test endpoint to verify Donna AI configuration
 * This doesn't make any API calls - just checks configuration
 */

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const config = {
      timestamp: new Date().toISOString(),
      environment: {
        supabase_configured: !!Deno.env.get('SUPABASE_URL'),
        supabase_url: Deno.env.get('SUPABASE_URL') || 'not set',
      },
      api_keys_configured: {
        huggingface: !!Deno.env.get('HUGGINGFACE_API_KEY'),
        cohere: !!Deno.env.get('COHERE_API_KEY'),
        google_ai: !!Deno.env.get('GOOGLE_AI_API_KEY'),
        openai: !!Deno.env.get('OPENAI_API_KEY'),
      },
      setup_instructions: {
        step1: {
          service: 'Hugging Face (FREE)',
          status: Deno.env.get('HUGGINGFACE_API_KEY') ? '✅ Configured' : '❌ Not configured',
          instructions: [
            '1. Go to https://huggingface.co/join',
            '2. Create free account',
            '3. Visit https://huggingface.co/settings/tokens',
            '4. Create new token with "Read" permission',
            '5. Add to .env: HUGGINGFACE_API_KEY=hf_xxx',
          ],
          cost: '$0/month forever',
        },
        step2: {
          service: 'Cohere (FREE tier)',
          status: Deno.env.get('COHERE_API_KEY') ? '✅ Configured' : '❌ Not configured',
          instructions: [
            '1. Go to https://dashboard.cohere.com/welcome/register',
            '2. Sign up for free',
            '3. Visit https://dashboard.cohere.com/api-keys',
            '4. Copy Trial API key',
            '5. Add to .env: COHERE_API_KEY=xxx',
          ],
          cost: '$0/month (1000 calls)',
        },
        step3: {
          service: 'Google AI (FREE tier)',
          status: Deno.env.get('GOOGLE_AI_API_KEY') ? '✅ Configured' : '❌ Not configured',
          instructions: [
            '1. Go to https://makersuite.google.com/app/apikey',
            '2. Sign in with Google',
            '3. Click "Create API Key"',
            '4. Copy the key',
            '5. Add to .env: GOOGLE_AI_API_KEY=xxx',
          ],
          cost: '$0/month (60 req/min)',
        },
      },
      ready_to_use: false,
      message: '',
    };

    // Check if at least one service is configured
    const configured_count = Object.values(config.api_keys_configured).filter(Boolean).length;
    
    if (configured_count === 0) {
      config.message = '🚀 Please configure at least one API service to start using Donna AI Transformers';
      config.ready_to_use = false;
    } else if (configured_count === 1) {
      config.message = '✅ Basic setup complete! Donna AI can work with one provider.';
      config.ready_to_use = true;
    } else if (configured_count === 2) {
      config.message = '✅ Good setup! Donna AI has fallback options.';
      config.ready_to_use = true;
    } else {
      config.message = '🎉 Excellent! All services configured for maximum reliability.';
      config.ready_to_use = true;
    }

    // Add summary
    config.summary = {
      total_providers: 4,
      configured: configured_count,
      missing: 4 - configured_count,
      estimated_monthly_cost: '$0',
      recommendation: configured_count === 0 
        ? 'Start with Hugging Face - it\'s completely free!'
        : configured_count < 3 
        ? 'Consider adding more providers for better reliability'
        : 'You\'re all set!',
    };

    return new Response(
      JSON.stringify(config, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Configuration check failed',
        message: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});