/// <reference path="../../../types/global.d.ts" />

/**
 * Embedding Service
 *
 * Generates vector embeddings using OpenAI's text-embedding-3-small:
 * - Batch embedding generation
 * - Caching for repeated queries
 * - Cost tracking
 * - Error handling with retries
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getCostTracker } from './cost-tracker.ts';

// ==================== Types ====================

export interface EmbeddingOptions {
  model?: EmbeddingModel;
  dimensions?: number;
  batchSize?: number;
}

export type EmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  totalTokens: number;
  cost: number;
}

// Model configurations
const MODEL_CONFIG: Record<EmbeddingModel, { dimensions: number; maxInput: number }> = {
  'text-embedding-3-small': { dimensions: 1536, maxInput: 8191 },
  'text-embedding-3-large': { dimensions: 3072, maxInput: 8191 },
};

// ==================== Embedding Service ====================

export class EmbeddingService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private defaultModel: EmbeddingModel = 'text-embedding-3-small';
  private supabase?: SupabaseClient;
  private enterpriseId?: string;
  private cache: Map<string, number[]> = new Map();
  private maxCacheSize = 1000;
  private maxRetries = 3;
  private baseDelay = 1000;

  constructor(options?: {
    apiKey?: string;
    supabase?: SupabaseClient;
    enterpriseId?: string;
  }) {
    this.apiKey = options?.apiKey || Deno.env.get('OPENAI_API_KEY') || '';
    this.supabase = options?.supabase;
    this.enterpriseId = options?.enterpriseId;

    if (!this.apiKey) {
      console.warn('EmbeddingService: OPENAI_API_KEY not set. Embedding generation will fail.');
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Generate embedding for a single text
   */
  async embed(
    text: string,
    options: EmbeddingOptions = {},
  ): Promise<EmbeddingResult> {
    const model = options.model || this.defaultModel;
    const cacheKey = this.getCacheKey(text, model);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        embedding: cached,
        model,
        tokenCount: 0, // From cache, no new tokens
      };
    }

    // Generate embedding
    const result = await this.callEmbeddingAPI([text], model, options.dimensions);

    // Cache result
    this.addToCache(cacheKey, result.embeddings[0]);

    // Track cost
    if (this.supabase && this.enterpriseId) {
      const tracker = getCostTracker(this.supabase, this.enterpriseId);
      await tracker.recordUsage(
        model,
        result.totalTokens,
        0, // No output tokens for embeddings
        'embedding',
        { provider: 'openai' },
      );
    }

    return {
      embedding: result.embeddings[0],
      model,
      tokenCount: result.totalTokens,
    };
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async embedBatch(
    texts: string[],
    options: EmbeddingOptions = {},
  ): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        model: options.model || this.defaultModel,
        totalTokens: 0,
        cost: 0,
      };
    }

    const model = options.model || this.defaultModel;
    const batchSize = options.batchSize || 100;
    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    // Check cache for each text
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i], model);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        allEmbeddings[i] = cached;
      } else {
        uncachedTexts.push(texts[i]);
        uncachedIndices.push(i);
      }
    }

    // Process uncached texts in batches
    for (let i = 0; i < uncachedTexts.length; i += batchSize) {
      const batch = uncachedTexts.slice(i, i + batchSize);
      const batchIndices = uncachedIndices.slice(i, i + batchSize);

      const result = await this.callEmbeddingAPI(batch, model, options.dimensions);
      totalTokens += result.totalTokens;

      // Store results
      for (let j = 0; j < result.embeddings.length; j++) {
        const originalIndex = batchIndices[j];
        allEmbeddings[originalIndex] = result.embeddings[j];

        // Cache result
        const cacheKey = this.getCacheKey(batch[j], model);
        this.addToCache(cacheKey, result.embeddings[j]);
      }
    }

    // Calculate cost
    const cost = this.calculateCost(model, totalTokens);

    // Track cost
    if (this.supabase && this.enterpriseId && totalTokens > 0) {
      const tracker = getCostTracker(this.supabase, this.enterpriseId);
      await tracker.recordUsage(
        model,
        totalTokens,
        0,
        'batch_embedding',
        { provider: 'openai', batchSize: texts.length },
      );
    }

    return {
      embeddings: allEmbeddings,
      model,
      totalTokens,
      cost,
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar texts from a corpus
   */
  async findSimilar(
    query: string,
    corpus: string[],
    topK = 5,
    options: EmbeddingOptions = {},
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    if (corpus.length === 0) {
      return [];
    }

    // Get query embedding
    const queryResult = await this.embed(query, options);

    // Get corpus embeddings
    const corpusResult = await this.embedBatch(corpus, options);

    // Calculate similarities
    const similarities = corpusResult.embeddings.map((embedding, index) => ({
      text: corpus[index],
      similarity: this.cosineSimilarity(queryResult.embedding, embedding),
      index,
    }));

    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Calculate cost for embedding
   */
  calculateCost(model: EmbeddingModel, tokens: number): number {
    const pricing: Record<EmbeddingModel, number> = {
      'text-embedding-3-small': 0.02 / 1_000_000,
      'text-embedding-3-large': 0.13 / 1_000_000,
    };
    return tokens * pricing[model];
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ==================== Private Methods ====================

  private async callEmbeddingAPI(
    texts: string[],
    model: EmbeddingModel,
    dimensions?: number,
  ): Promise<{ embeddings: number[][]; totalTokens: number }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const config = MODEL_CONFIG[model];

    // Truncate texts that are too long
    const truncatedTexts = texts.map(text => {
      // Rough estimate: 4 chars per token
      const maxChars = config.maxInput * 4;
      return text.length > maxChars ? text.substring(0, maxChars) : text;
    });

    const requestBody: Record<string, unknown> = {
      model,
      input: truncatedTexts,
    };

    if (dimensions && dimensions < config.dimensions) {
      requestBody.dimensions = dimensions;
    }

    const response = await this.makeRequestWithRetry('/embeddings', requestBody);
    const data = response as {
      data: Array<{ embedding: number[]; index: number }>;
      usage: { total_tokens: number };
    };

    // Sort by index to maintain order
    const sorted = data.data.sort((a, b) => a.index - b.index);

    return {
      embeddings: sorted.map(d => d.embedding),
      totalTokens: data.usage.total_tokens,
    };
  }

  private async makeRequestWithRetry(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          return await response.json();
        }

        const errorText = await response.text();

        // Don't retry client errors except rate limits
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        lastError = new Error(`OpenAI API error: ${response.status} - ${errorText}`);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Exponential backoff with jitter
      if (attempt < this.maxRetries - 1) {
        const delay = this.baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private getCacheKey(text: string, model: string): string {
    // Simple hash for cache key
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `${model}:${hash}:${text.length}`;
  }

  private addToCache(key: string, embedding: number[]): void {
    // Enforce max cache size with LRU-like behavior
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, embedding);
  }
}

// ==================== Factory Function ====================

let serviceInstance: EmbeddingService | null = null;

export function getEmbeddingService(options?: {
  apiKey?: string;
  supabase?: SupabaseClient;
  enterpriseId?: string;
}): EmbeddingService {
  if (!serviceInstance || options) {
    serviceInstance = new EmbeddingService(options);
  }
  return serviceInstance;
}

export function createEmbeddingService(options?: {
  apiKey?: string;
  supabase?: SupabaseClient;
  enterpriseId?: string;
}): EmbeddingService {
  return new EmbeddingService(options);
}
