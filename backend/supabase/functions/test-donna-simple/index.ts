import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Simplified Donna AI Transformer Test
 * Tests the transformer services without complex dependencies
 */

// Simple transformer configuration
const TRANSFORMER_CONFIG = {
  huggingFace: {
    apiUrl: 'https://api-inference.huggingface.co/models/',
    models: {
      legal: 'nlpaueb/legal-bert-base-uncased',
      financial: 'ProsusAI/finbert',
      general: 'sentence-transformers/all-MiniLM-L6-v2',
    },
  },
  cohere: {
    apiUrl: 'https://api.cohere.ai/v1/',
  },
  google: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/',
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { test_type = 'config', text = 'This is a test contract clause.' } = await req.json();

    const results: Record<string, { configured: boolean; data?: unknown }> = {
      timestamp: new Date().toISOString(),
      test_type,
      status: 'starting',
    };

    // Test 1: Configuration check
    if (test_type === 'config' || test_type === 'all') {
      results.configuration = {
        huggingface: {
          configured: !!Deno.env.get('HUGGINGFACE_API_KEY'),
          key_prefix: Deno.env.get('HUGGINGFACE_API_KEY')?.substring(0, 7) || 'not set',
        },
        cohere: {
          configured: !!Deno.env.get('COHERE_API_KEY'),
          key_length: Deno.env.get('COHERE_API_KEY')?.length || 0,
        },
        google: {
          configured: !!Deno.env.get('GOOGLE_AI_API_KEY'),
          key_length: Deno.env.get('GOOGLE_AI_API_KEY')?.length || 0,
        },
        openai: {
          configured: !!Deno.env.get('OPENAI_API_KEY'),
          key_prefix: Deno.env.get('OPENAI_API_KEY')?.substring(0, 7) || 'not set',
        },
      };

      const configured = Object.values(results.configuration).filter((c: { configured: boolean }) => c.configured).length;
      results.summary = {
        providers_configured: configured,
        ready: configured > 0,
        message: configured === 0 
          ? 'No API keys configured. Add at least one to start.'
          : `${configured} provider(s) configured and ready!`,
      };
    }

    // Test 2: Hugging Face API
    if ((test_type === 'huggingface' || test_type === 'all') && Deno.env.get('HUGGINGFACE_API_KEY')) {
      try {
        const model = TRANSFORMER_CONFIG.huggingFace.models.legal;
        const response = await fetch(
          `${TRANSFORMER_CONFIG.huggingFace.apiUrl}${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: text,
              parameters: {
                candidate_labels: ['contract', 'legal', 'business', 'technical'],
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.huggingface = {
            status: 'success',
            model,
            response: data,
            latency: `${Date.now() - new Date(results.timestamp).getTime()}ms`,
          };
        } else {
          const error = await response.text();
          results.huggingface = {
            status: 'failed',
            error,
            hint: 'Check if your API key is valid',
          };
        }
      } catch (error) {
        results.huggingface = {
          status: 'error',
          message: error.message,
        };
      }
    }

    // Test 3: Cohere API
    if ((test_type === 'cohere' || test_type === 'all') && Deno.env.get('COHERE_API_KEY')) {
      try {
        const response = await fetch(
          `${TRANSFORMER_CONFIG.cohere.apiUrl}embed`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('COHERE_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              texts: [text],
              model: 'embed-english-light-v3.0',
              input_type: 'search_document',
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.cohere = {
            status: 'success',
            embedding_dimensions: data.embeddings?.[0]?.length || 0,
            model: 'embed-english-light-v3.0',
          };
        } else {
          const error = await response.text();
          results.cohere = {
            status: 'failed',
            error,
            hint: 'Free tier: 1000 calls/month',
          };
        }
      } catch (error) {
        results.cohere = {
          status: 'error',
          message: error.message,
        };
      }
    }

    // Test 4: Google AI
    if ((test_type === 'google' || test_type === 'all') && Deno.env.get('GOOGLE_AI_API_KEY')) {
      try {
        const response = await fetch(
          `${TRANSFORMER_CONFIG.google.apiUrl}models/gemini-pro:generateContent?key=${Deno.env.get('GOOGLE_AI_API_KEY')}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Classify this text: ${text}`,
                }],
              }],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.google = {
            status: 'success',
            model: 'gemini-pro',
            response_preview: data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100),
          };
        } else {
          const error = await response.text();
          results.google = {
            status: 'failed',
            error,
            hint: 'Free tier: 60 requests/minute',
          };
        }
      } catch (error) {
        results.google = {
          status: 'error',
          message: error.message,
        };
      }
    }

    // Overall status
    results.status = 'completed';
    results.processing_time = `${Date.now() - new Date(results.timestamp).getTime()}ms`;

    // Add setup instructions if no keys configured
    if (!results.summary || results.summary.providers_configured === 0) {
      results.setup_instructions = {
        step1: 'Get Hugging Face API key (FREE): https://huggingface.co/settings/tokens',
        step2: 'Get Cohere API key (FREE 1000/mo): https://dashboard.cohere.com/api-keys',
        step3: 'Get Google AI key (FREE): https://makersuite.google.com/app/apikey',
        step4: 'Add keys to /backend/supabase/functions/.env',
        step5: 'Restart functions: supabase functions serve --env-file ./supabase/functions/.env',
      };
    }

    return new Response(
      JSON.stringify(results, null, 2),
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
        error: 'Test failed',
        message: error.message,
        hint: 'Check your request format and API keys',
      }, null, 2),
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

/**
 * HOW TO USE:
 * 
 * 1. Deploy this function:
 *    supabase functions deploy test-donna-simple
 * 
 * 2. Test configuration:
 *    curl -X POST https://your-project.supabase.co/functions/v1/test-donna-simple \
 *      -H "Authorization: Bearer YOUR_ANON_KEY" \
 *      -H "Content-Type: application/json" \
 *      -d '{"test_type": "config"}'
 * 
 * 3. Test Hugging Face:
 *    curl -X POST https://your-project.supabase.co/functions/v1/test-donna-simple \
 *      -H "Authorization: Bearer YOUR_ANON_KEY" \
 *      -H "Content-Type: application/json" \
 *      -d '{"test_type": "huggingface", "text": "This agreement shall terminate."}'
 * 
 * 4. Test all providers:
 *    curl -X POST https://your-project.supabase.co/functions/v1/test-donna-simple \
 *      -H "Authorization: Bearer YOUR_ANON_KEY" \
 *      -H "Content-Type: application/json" \
 *      -d '{"test_type": "all"}'
 */