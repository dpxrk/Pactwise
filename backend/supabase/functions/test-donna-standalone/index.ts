import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Standalone Donna AI Transformer Test
 * No external dependencies - works immediately
 */

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

// Transformer configuration
const TRANSFORMER_CONFIG = {
  huggingFace: {
    apiUrl: 'https://api-inference.huggingface.co/models/',
    apiKey: () => Deno.env.get('HUGGINGFACE_API_KEY') || '',
    models: {
      legal: 'nlpaueb/legal-bert-base-uncased',
      financial: 'ProsusAI/finbert',
      general: 'sentence-transformers/all-MiniLM-L6-v2',
    },
  },
  cohere: {
    apiUrl: 'https://api.cohere.ai/v1/',
    apiKey: () => Deno.env.get('COHERE_API_KEY') || '',
  },
  google: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    apiKey: () => Deno.env.get('GOOGLE_AI_API_KEY') || '',
  },
  openAI: {
    apiUrl: 'https://api.openai.com/v1/',
    apiKey: () => Deno.env.get('OPENAI_API_KEY') || '',
  },
};

// Simple transformer service
class SimpleTransformerService {
  async processHuggingFace(text: string, model: string = 'general'): Promise<any> {
    const apiKey = TRANSFORMER_CONFIG.huggingFace.apiKey();
    if (!apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const modelName = TRANSFORMER_CONFIG.huggingFace.models[model as keyof typeof TRANSFORMER_CONFIG.huggingFace.models] 
                      || TRANSFORMER_CONFIG.huggingFace.models.general;

    // Check cache
    const cacheKey = `hf_${modelName}_${text}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // For sentence-transformers, use sentence similarity format
    let body: any;
    if (modelName.includes('sentence-transformers')) {
      body = {
        inputs: {
          source_sentence: text,
          sentences: ["legal document", "financial report", "technical specification", "business contract"]
        }
      };
    } else {
      body = { inputs: text };
    }

    const response = await fetch(
      `${TRANSFORMER_CONFIG.huggingFace.apiUrl}${modelName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${error}`);
    }

    const result = await response.json();
    
    // Cache the result
    this.setCache(cacheKey, result);

    return {
      result,
      model: modelName,
      provider: 'huggingface',
      cached: false,
      cost: 0,
    };
  }

  async processCohere(text: string, task: string = 'embed'): Promise<any> {
    const apiKey = TRANSFORMER_CONFIG.cohere.apiKey();
    if (!apiKey) {
      throw new Error('Cohere API key not configured');
    }

    const response = await fetch(
      `${TRANSFORMER_CONFIG.cohere.apiUrl}${task}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: [text],
          model: 'embed-english-light-v3.0',
          input_type: 'search_document',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cohere API error: ${error}`);
    }

    const result = await response.json();
    return {
      result: result.embeddings?.[0] || result,
      provider: 'cohere',
      cost: 0,
    };
  }

  private getFromCache(key: string): any {
    const cached = cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    cache.set(key, { data, timestamp: Date.now() });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action = 'test', text = 'This contract shall be governed by the laws of Delaware.', model = 'general' } = await req.json();
    
    const service = new SimpleTransformerService();
    const results: any = {
      timestamp: new Date().toISOString(),
      action,
      configuration: {
        huggingface: !!TRANSFORMER_CONFIG.huggingFace.apiKey(),
        cohere: !!TRANSFORMER_CONFIG.cohere.apiKey(),
        google: !!TRANSFORMER_CONFIG.google.apiKey(),
        openai: !!TRANSFORMER_CONFIG.openAI.apiKey(),
      },
    };

    // Count configured providers
    const configured = Object.values(results.configuration).filter(Boolean).length;
    results.providers_ready = configured;

    if (action === 'test' || action === 'huggingface') {
      if (TRANSFORMER_CONFIG.huggingFace.apiKey()) {
        try {
          const hfResult = await service.processHuggingFace(text, model);
          results.huggingface = {
            status: 'success',
            ...hfResult,
          };
          
          // Interpret results for sentence similarity
          if (Array.isArray(hfResult.result)) {
            const labels = ["legal document", "financial report", "technical specification", "business contract"];
            const scores = hfResult.result as number[];
            const maxIndex = scores.indexOf(Math.max(...scores));
            results.huggingface.interpretation = {
              best_match: labels[maxIndex],
              confidence: scores[maxIndex],
              all_scores: labels.map((label, i) => ({ label, score: scores[i] })),
            };
          }
        } catch (error) {
          results.huggingface = {
            status: 'error',
            message: error.message,
          };
        }
      } else {
        results.huggingface = {
          status: 'not_configured',
          instructions: 'Get free API key at https://huggingface.co/settings/tokens',
        };
      }
    }

    if (action === 'test' || action === 'cohere') {
      if (TRANSFORMER_CONFIG.cohere.apiKey()) {
        try {
          const cohereResult = await service.processCohere(text);
          results.cohere = {
            status: 'success',
            embedding_size: Array.isArray(cohereResult.result) ? cohereResult.result.length : 0,
            provider: cohereResult.provider,
          };
        } catch (error) {
          results.cohere = {
            status: 'error',
            message: error.message,
          };
        }
      } else {
        results.cohere = {
          status: 'not_configured',
          instructions: 'Get free API key (1000 calls/mo) at https://dashboard.cohere.com/api-keys',
        };
      }
    }

    // Summary
    results.summary = {
      status: configured > 0 ? 'operational' : 'needs_configuration',
      message: configured === 0 
        ? 'Please configure at least one API key to use Donna AI'
        : `Donna AI ready with ${configured} provider(s)`,
      total_cost: '$0/month',
      cache_size: cache.size,
    };

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
 * USAGE:
 * 
 * 1. Test locally:
 *    curl -X POST http://localhost:54321/functions/v1/test-donna-standalone \
 *      -H "Authorization: Bearer YOUR_KEY" \
 *      -H "Content-Type: application/json" \
 *      -d '{"action": "test"}'
 * 
 * 2. Test specific provider:
 *    -d '{"action": "huggingface", "text": "Your contract text here"}'
 * 
 * 3. Deploy (when project is active):
 *    supabase functions deploy test-donna-standalone
 */