import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Transformer Integration for Donna AI
 * Provides free and low-cost access to transformer models
 * Bootstrap-friendly implementation with zero infrastructure costs
 */

// API Configuration - Set these in your .env file
export const TRANSFORMER_CONFIG = {
  // Hugging Face (FREE tier available)
  huggingFace: {
    apiUrl: 'https://api-inference.huggingface.co/models/',
    apiKey: process.env.HUGGINGFACE_API_KEY || '', // Get from: https://huggingface.co/settings/tokens
    models: {
      legal: 'nlpaueb/legal-bert-base-uncased',
      financial: 'ProsusAI/finbert',
      general: 'sentence-transformers/all-MiniLM-L6-v2',
      contractAnalysis: 'nlpaueb/legal-bert-base-uncased',
      riskAssessment: 'distilbert-base-uncased-finetuned-sst-2-english',
    },
    retryAttempts: 3,
    retryDelay: 1000, // ms
  },

  // OpenAI (for embeddings - very cheap)
  openAI: {
    apiUrl: 'https://api.openai.com/v1/',
    apiKey: process.env.OPENAI_API_KEY || '', // Get from: https://platform.openai.com/api-keys
    models: {
      embedding: 'text-embedding-3-small', // $0.00002 per 1K tokens
      completion: 'gpt-3.5-turbo', // Fallback for complex tasks
    },
    maxTokens: 1536,
  },

  // Cohere (FREE tier: 1000 calls/month)
  cohere: {
    apiUrl: 'https://api.cohere.ai/v1/',
    apiKey: process.env.COHERE_API_KEY || '', // Get from: https://dashboard.cohere.com/api-keys
    models: {
      embedding: 'embed-english-light-v3.0',
      classification: 'classify',
      summarization: 'summarize',
    },
    freeCallsPerMonth: 1000,
  },

  // Google AI (Gemini - FREE tier available)
  googleAI: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    apiKey: process.env.GOOGLE_AI_API_KEY || '', // Get from: https://makersuite.google.com/app/apikey
    models: {
      embedding: 'embedding-001',
      completion: 'gemini-pro',
    },
    freeRequestsPerMinute: 60,
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour in seconds
    maxSize: 1000, // Maximum cached items
  },
};

export interface TransformerRequest {
  text: string;
  task: 'classification' | 'embedding' | 'completion' | 'summarization';
  model?: string;
  context?: Record<string, unknown>;
}

export interface TransformerResponse {
  result: unknown;
  model: string;
  provider: string;
  cached: boolean;
  latency: number;
  cost: number;
}

export class TransformerService {
  private supabase: SupabaseClient;
  private cache: Map<string, { data: Partial<TransformerResponse>; timestamp: number }> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Main entry point for transformer requests
   * Automatically selects the best available provider
   */
  async process(request: TransformerRequest): Promise<TransformerResponse> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        cached: true,
        latency: Date.now() - startTime,
      };
    }

    // Try providers in order of cost-effectiveness
    const providers = [
      { name: 'huggingface', handler: this.processHuggingFace.bind(this) },
      { name: 'cohere', handler: this.processCohere.bind(this) },
      { name: 'google', handler: this.processGoogleAI.bind(this) },
      { name: 'openai', handler: this.processOpenAI.bind(this) },
    ];

    for (const provider of providers) {
      try {
        const result = await provider.handler(request);
        
        // Cache successful result
        this.setCache(cacheKey, result);

        return {
          ...result,
          provider: provider.name,
          cached: false,
          latency: Date.now() - startTime,
        };
      } catch (error) {
        console.warn(`${provider.name} failed:`, error);
        continue; // Try next provider
      }
    }

    throw new Error('All transformer providers failed');
  }

  /**
   * Process request using Hugging Face (FREE)
   */
  private async processHuggingFace(request: TransformerRequest): Promise<Partial<TransformerResponse>> {
    const { huggingFace } = TRANSFORMER_CONFIG;
    
    if (!huggingFace.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const model = this.selectHuggingFaceModel(request);
    const url = `${huggingFace.apiUrl}${model}`;

    let lastError;
    for (let attempt = 0; attempt < huggingFace.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingFace.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: request.text,
            parameters: this.getHuggingFaceParameters(request),
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`HuggingFace API error: ${error}`);
        }

        const result = await response.json();

        return {
          result: this.formatHuggingFaceResult(result, request.task),
          model,
          cost: 0, // FREE!
        };
      } catch (error) {
        lastError = error;
        if (attempt < huggingFace.retryAttempts - 1) {
          await this.delay(huggingFace.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Process request using Cohere (FREE tier)
   */
  private async processCohere(request: TransformerRequest): Promise<Partial<TransformerResponse>> {
    const { cohere } = TRANSFORMER_CONFIG;
    
    if (!cohere.apiKey) {
      throw new Error('Cohere API key not configured');
    }

    // Check monthly usage (you should track this in database)
    const monthlyUsage = await this.getCohereMonthlyUsage();
    if (monthlyUsage >= cohere.freeCallsPerMonth) {
      throw new Error('Cohere free tier limit reached');
    }

    let endpoint: string;
    let body: Record<string, unknown>;

    switch (request.task) {
      case 'embedding':
        endpoint = 'embed';
        body = {
          texts: [request.text],
          model: cohere.models.embedding,
          input_type: 'search_document',
        };
        break;
      case 'classification':
        endpoint = 'classify';
        body = {
          inputs: [request.text],
          examples: [], // You can add training examples
        };
        break;
      case 'summarization':
        endpoint = 'summarize';
        body = {
          text: request.text,
          length: 'medium',
        };
        break;
      default:
        throw new Error(`Cohere doesn't support task: ${request.task}`);
    }

    const response = await fetch(`${cohere.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohere.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Track usage
    await this.incrementCohereUsage();

    return {
      result: this.formatCohereResult(result, request.task),
      model: cohere.models[request.task] || 'cohere',
      cost: 0, // FREE tier
    };
  }

  /**
   * Process request using Google AI (Gemini FREE tier)
   */
  private async processGoogleAI(request: TransformerRequest): Promise<Partial<TransformerResponse>> {
    const { googleAI } = TRANSFORMER_CONFIG;
    
    if (!googleAI.apiKey) {
      throw new Error('Google AI API key not configured');
    }

    let endpoint: string;
    let body: Record<string, unknown>;

    switch (request.task) {
      case 'embedding':
        endpoint = `models/${googleAI.models.embedding}:embedContent`;
        body = {
          content: { parts: [{ text: request.text }] },
        };
        break;
      case 'completion':
      case 'summarization':
        endpoint = `models/${googleAI.models.completion}:generateContent`;
        body = {
          contents: [{
            parts: [{
              text: request.task === 'summarization' 
                ? `Summarize this text: ${request.text}`
                : request.text
            }]
          }],
        };
        break;
      default:
        throw new Error(`Google AI doesn't support task: ${request.task}`);
    }

    const response = await fetch(
      `${googleAI.apiUrl}${endpoint}?key=${googleAI.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      result: this.formatGoogleAIResult(result, request.task),
      model: googleAI.models[request.task === 'embedding' ? 'embedding' : 'completion'],
      cost: 0, // FREE tier
    };
  }

  /**
   * Process request using OpenAI (paid but very cheap for embeddings)
   */
  private async processOpenAI(request: TransformerRequest): Promise<Partial<TransformerResponse>> {
    const { openAI } = TRANSFORMER_CONFIG;
    
    if (!openAI.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let endpoint: string;
    let body: Record<string, unknown>;
    let costPerToken: number;

    switch (request.task) {
      case 'embedding':
        endpoint = 'embeddings';
        body = {
          model: openAI.models.embedding,
          input: request.text,
        };
        costPerToken = 0.00002 / 1000; // $0.00002 per 1K tokens
        break;
      case 'completion':
      case 'classification':
      case 'summarization':
        endpoint = 'chat/completions';
        body = {
          model: openAI.models.completion,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(request.task),
            },
            {
              role: 'user',
              content: request.text,
            },
          ],
          max_tokens: openAI.maxTokens,
          temperature: 0.3,
        };
        costPerToken = 0.0005 / 1000; // $0.0005 per 1K tokens for GPT-3.5
        break;
      default:
        throw new Error(`OpenAI doesn't support task: ${request.task}`);
    }

    const response = await fetch(`${openAI.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAI.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Calculate cost
    const tokens = result.usage?.total_tokens || 0;
    const cost = tokens * costPerToken;

    return {
      result: this.formatOpenAIResult(result, request.task),
      model: body.model,
      cost,
    };
  }

  // Helper methods

  private selectHuggingFaceModel(request: TransformerRequest): string {
    const { models } = TRANSFORMER_CONFIG.huggingFace;
    
    if (request.model) {
      return request.model;
    }

    // Select model based on context
    if (request.context?.domain === 'legal') {
      return models.legal;
    } else if (request.context?.domain === 'financial') {
      return models.financial;
    } else if (request.context?.type === 'contract') {
      return models.contractAnalysis;
    } else if (request.context?.type === 'risk') {
      return models.riskAssessment;
    }

    return models.general;
  }

  private getHuggingFaceParameters(request: TransformerRequest): Record<string, unknown> | undefined {
    switch (request.task) {
      case 'classification':
        return { candidate_labels: request.context?.labels || [] };
      case 'embedding':
        return { normalize: true };
      default:
        return {};
    }
  }

  private formatHuggingFaceResult(result: unknown, task: string): unknown {
    switch (task) {
      case 'embedding':
        return Array.isArray(result) ? result : (result as { embeddings?: unknown }).embeddings;
      case 'classification':
        return (result as { labels?: unknown }).labels ? result : { labels: result };
      default:
        return result;
    }
  }

  private formatCohereResult(result: unknown, task: string): unknown {
    const r = result as { embeddings?: unknown[]; classifications?: unknown[]; summary?: unknown };
    switch (task) {
      case 'embedding':
        return r.embeddings?.[0] || result;
      case 'classification':
        return r.classifications?.[0] || result;
      case 'summarization':
        return r.summary || result;
      default:
        return result;
    }
  }

  private formatGoogleAIResult(result: unknown, task: string): unknown {
    const r = result as {
      embedding?: { values?: unknown };
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    };
    switch (task) {
      case 'embedding':
        return r.embedding?.values || result;
      case 'completion':
      case 'summarization':
        return r.candidates?.[0]?.content?.parts?.[0]?.text || result;
      default:
        return result;
    }
  }

  private formatOpenAIResult(result: unknown, task: string): unknown {
    const r = result as {
      data?: Array<{ embedding?: unknown }>;
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    switch (task) {
      case 'embedding':
        return r.data?.[0]?.embedding || result;
      case 'completion':
      case 'classification':
      case 'summarization':
        return r.choices?.[0]?.message?.content || result;
      default:
        return result;
    }
  }

  private getSystemPrompt(task: string): string {
    switch (task) {
      case 'classification':
        return 'You are a classification expert. Classify the given text into appropriate categories.';
      case 'summarization':
        return 'You are a summarization expert. Provide a concise summary of the given text.';
      default:
        return 'You are a helpful assistant.';
    }
  }

  private getCacheKey(request: TransformerRequest): string {
    return `${request.task}_${request.model || 'auto'}_${this.hashString(request.text)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): Partial<TransformerResponse> | null {
    if (!TRANSFORMER_CONFIG.cache.enabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > TRANSFORMER_CONFIG.cache.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: Partial<TransformerResponse>): void {
    if (!TRANSFORMER_CONFIG.cache.enabled) return;

    // Enforce max cache size
    if (this.cache.size >= TRANSFORMER_CONFIG.cache.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getCohereMonthlyUsage(): Promise<number> {
    // Track in database
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await this.supabase
      .from('api_usage_tracking')
      .select('*', { count: 'exact' })
      .eq('provider', 'cohere')
      .gte('created_at', startOfMonth.toISOString());

    return count || 0;
  }

  private async incrementCohereUsage(): Promise<void> {
    await this.supabase
      .from('api_usage_tracking')
      .insert({
        provider: 'cohere',
        endpoint: 'api_call',
        created_at: new Date().toISOString(),
      });
  }
}

/**
 * Factory function to create transformer service
 */
export function createTransformerService(supabase: SupabaseClient): TransformerService {
  return new TransformerService(supabase);
}