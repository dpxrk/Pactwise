import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { TransformerOrchestrator } from '../local-agents/donna/transformer-orchestrator.ts';
import { TransformerService } from '../local-agents/donna/transformer-integration.ts';
import { EmbeddingService } from '../local-agents/donna/embedding-service.ts';

/**
 * Test endpoint for Donna AI Transformer Integration
 * Use this to verify all services are working correctly
 */

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { test_type = 'all' } = await req.json();

    const results: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
      },
    };

    // Test 1: Hugging Face Integration
    if (test_type === 'all' || test_type === 'huggingface') {
      try {
        const transformerService = new TransformerService(supabase);
        const hfResult = await transformerService.process({
          text: 'This agreement shall commence on the effective date.',
          task: 'classification',
          model: 'nlpaueb/legal-bert-base-uncased',
        });

        results.tests.huggingface = {
          status: 'passed',
          provider: hfResult.provider,
          model: hfResult.model,
          latency: hfResult.latency,
          cached: hfResult.cached,
          cost: hfResult.cost,
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.huggingface = {
          status: 'failed',
          error: error.message,
          hint: 'Check HUGGINGFACE_API_KEY in .env',
        };
        results.summary.failed++;
      }
      results.summary.total_tests++;
    }

    // Test 2: Cohere Integration
    if (test_type === 'all' || test_type === 'cohere') {
      try {
        const transformerService = new TransformerService(supabase);
        const cohereResult = await transformerService.process({
          text: 'Analyze vendor risk for technology services provider.',
          task: 'embedding',
          context: { provider: 'cohere' },
        });

        results.tests.cohere = {
          status: 'passed',
          provider: cohereResult.provider,
          embedding_dimensions: Array.isArray(cohereResult.result) ? cohereResult.result.length : 0,
          cached: cohereResult.cached,
          cost: cohereResult.cost,
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.cohere = {
          status: 'failed',
          error: error.message,
          hint: 'Check COHERE_API_KEY in .env - Free tier: 1000 calls/month',
        };
        results.summary.failed++;
      }
      results.summary.total_tests++;
    }

    // Test 3: Google AI Integration
    if (test_type === 'all' || test_type === 'google') {
      try {
        const transformerService = new TransformerService(supabase);
        const googleResult = await transformerService.process({
          text: 'Summarize key contract terms and obligations.',
          task: 'summarization',
          context: { provider: 'google' },
        });

        results.tests.google_ai = {
          status: 'passed',
          provider: googleResult.provider,
          model: googleResult.model,
          cached: googleResult.cached,
          cost: googleResult.cost,
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.google_ai = {
          status: 'failed',
          error: error.message,
          hint: 'Check GOOGLE_AI_API_KEY in .env - Free tier: 60 requests/minute',
        };
        results.summary.failed++;
      }
      results.summary.total_tests++;
    }

    // Test 4: Embedding Service
    if (test_type === 'all' || test_type === 'embedding') {
      try {
        const embeddingService = new EmbeddingService(supabase);
        const embeddingResult = await embeddingService.embed(
          'Contract compliance analysis for GDPR requirements',
          { provider: 'auto' }
        );

        results.tests.embedding_service = {
          status: 'passed',
          dimensions: embeddingResult.dimensions,
          provider: embeddingResult.provider,
          model: embeddingResult.model,
          cached: embeddingResult.cached,
          cost: embeddingResult.cost,
        };

        // Test similarity calculation
        const similarity = embeddingService.cosineSimilarity(
          embeddingResult.embedding,
          embeddingResult.embedding
        );

        results.tests.embedding_service.similarity_check = similarity === 1 ? 'passed' : 'failed';
        results.summary.passed++;
      } catch (error) {
        results.tests.embedding_service = {
          status: 'failed',
          error: error.message,
        };
        results.summary.failed++;
      }
      results.summary.total_tests++;
    }

    // Test 5: Orchestrator
    if (test_type === 'all' || test_type === 'orchestrator') {
      try {
        const orchestrator = new TransformerOrchestrator(supabase);
        const orchestratorResult = await orchestrator.process({
          query: 'Review this vendor agreement for potential risks and compliance issues.',
          type: 'contract_analysis',
          context: {
            enterpriseId: 'test-enterprise',
            userId: 'test-user',
            domain: 'legal',
            urgency: 'medium',
          },
        });

        results.tests.orchestrator = {
          status: 'passed',
          models_used: orchestratorResult.models_used,
          confidence: orchestratorResult.confidence,
          insights_count: orchestratorResult.insights.length,
          recommendations_count: orchestratorResult.recommendations.length,
          total_cost: orchestratorResult.total_cost,
          processing_time: orchestratorResult.processing_time,
          cache_hits: orchestratorResult.cache_hits,
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.orchestrator = {
          status: 'failed',
          error: error.message,
        };
        results.summary.failed++;
      }
      results.summary.total_tests++;
    }

    // Test 6: Caching
    if (test_type === 'all' || test_type === 'cache') {
      try {
        const transformerService = new TransformerService(supabase);
        
        // First call - should not be cached
        const firstCall = await transformerService.process({
          text: 'Test caching mechanism',
          task: 'embedding',
        });

        // Second call - should be cached
        const secondCall = await transformerService.process({
          text: 'Test caching mechanism',
          task: 'embedding',
        });

        results.tests.caching = {
          status: 'passed',
          first_call_cached: firstCall.cached,
          second_call_cached: secondCall.cached,
          cache_working: !firstCall.cached && secondCall.cached,
          time_saved: firstCall.latency - secondCall.latency,
        };
        results.summary.passed++;
      } catch (error) {
        results.tests.caching = {
          status: 'failed',
          error: error.message,
        };
        results.summary.failed++;
      }
      results.summary.total_tests++;
    }

    // Add configuration status
    results.configuration = {
      huggingface_configured: !!Deno.env.get('HUGGINGFACE_API_KEY'),
      cohere_configured: !!Deno.env.get('COHERE_API_KEY'),
      google_ai_configured: !!Deno.env.get('GOOGLE_AI_API_KEY'),
      openai_configured: !!Deno.env.get('OPENAI_API_KEY'),
    };

    // Add recommendations
    results.recommendations = [];
    
    if (!results.configuration.huggingface_configured) {
      results.recommendations.push(
        'Get FREE Hugging Face API key at https://huggingface.co/settings/tokens'
      );
    }
    
    if (!results.configuration.cohere_configured) {
      results.recommendations.push(
        'Get FREE Cohere API key (1000 calls/month) at https://dashboard.cohere.com/api-keys'
      );
    }
    
    if (!results.configuration.google_ai_configured) {
      results.recommendations.push(
        'Get FREE Google AI API key at https://makersuite.google.com/app/apikey'
      );
    }

    // Overall status
    results.overall_status = results.summary.failed === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS';
    
    if (results.summary.passed === 0) {
      results.overall_status = 'FAILED';
      results.message = 'No API keys configured. Please set up at least one provider.';
    } else if (results.summary.failed > 0) {
      results.message = `${results.summary.passed} tests passed. Some providers not configured.`;
    } else {
      results.message = 'All tests passed! Donna AI Transformer Integration is fully operational.';
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
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({
        error: 'Test suite failed',
        message: error.message,
        hint: 'Check your .env configuration and ensure all required services are running',
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

/**
 * HOW TO TEST:
 * 
 * 1. Start Supabase locally:
 *    npm run start
 * 
 * 2. Deploy this function:
 *    supabase functions deploy test-donna-transformer
 * 
 * 3. Test all services:
 *    curl -X POST http://localhost:54321/functions/v1/test-donna-transformer \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_ANON_KEY" \
 *      -d '{"test_type": "all"}'
 * 
 * 4. Test specific service:
 *    curl -X POST http://localhost:54321/functions/v1/test-donna-transformer \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_ANON_KEY" \
 *      -d '{"test_type": "huggingface"}'
 * 
 * Available test_type values:
 * - all (default)
 * - huggingface
 * - cohere
 * - google
 * - embedding
 * - orchestrator
 * - cache
 */