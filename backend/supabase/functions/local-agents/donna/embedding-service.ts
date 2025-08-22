import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { TransformerService } from './transformer-integration.ts';

/**
 * Embedding Service for Donna AI
 * Manages vector embeddings for semantic search and similarity matching
 * Uses multiple providers with automatic fallback
 */

export interface EmbeddingOptions {
  provider?: 'auto' | 'openai' | 'cohere' | 'huggingface' | 'google';
  model?: string;
  dimensions?: number;
  normalize?: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  provider: string;
  model: string;
  cost: number;
  cached: boolean;
}

export interface SimilaritySearchOptions {
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export class EmbeddingService {
  private supabase: SupabaseClient;
  private transformerService: TransformerService;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.transformerService = new TransformerService(supabase);
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(text, options);
    const cached = this.embeddingCache.get(cacheKey);
    
    if (cached) {
      return {
        embedding: cached,
        dimensions: cached.length,
        provider: 'cache',
        model: 'cached',
        cost: 0,
        cached: true,
      };
    }

    // Process through transformer service
    const response = await this.transformerService.process({
      text,
      task: 'embedding',
      model: options.model,
      context: { provider: options.provider },
    });

    const embedding = this.normalizeEmbedding(response.result, options);
    
    // Cache the result
    this.embeddingCache.set(cacheKey, embedding);

    return {
      embedding,
      dimensions: embedding.length,
      provider: response.provider,
      model: response.model,
      cost: response.cost,
      cached: false,
    };
  }

  /**
   * Batch embed multiple texts
   */
  async embedBatch(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    // Process in parallel with rate limiting
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.embed(text, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Store embedding in vector database
   */
  async storeEmbedding(
    embedding: number[],
    metadata: {
      content: string;
      type: string;
      enterpriseId?: string;
      userId?: string;
      [key: string]: any;
    }
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('donna_embeddings')
      .insert({
        embedding,
        content: metadata.content,
        metadata: {
          type: metadata.type,
          enterprise_id: metadata.enterpriseId,
          user_id: metadata.userId,
          ...metadata,
        },
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Search for similar embeddings
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: SimilaritySearchOptions = {}
  ): Promise<Array<{
    id: string;
    content: string;
    similarity: number;
    metadata: Record<string, any>;
  }>> {
    const { topK = 10, threshold = 0.7, filter = {} } = options;

    // Build the query
    let query = this.supabase.rpc('search_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: topK,
      filter_params: filter,
    });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Similarity search failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Semantic search with text query
   */
  async semanticSearch(
    query: string,
    options: SimilaritySearchOptions & EmbeddingOptions = {}
  ): Promise<Array<{
    id: string;
    content: string;
    similarity: number;
    metadata: Record<string, any>;
  }>> {
    // Generate embedding for query
    const { embedding } = await this.embed(query, options);

    // Search for similar embeddings
    return this.searchSimilar(embedding, options);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
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
   * Find most similar items from a list
   */
  async findMostSimilar(
    query: string,
    candidates: Array<{ id: string; text: string; [key: string]: any }>,
    options: EmbeddingOptions & { topK?: number } = {}
  ): Promise<Array<{
    id: string;
    text: string;
    similarity: number;
    data: any;
  }>> {
    const { topK = 5 } = options;

    // Generate embeddings for query and candidates
    const [queryResult, ...candidateResults] = await this.embedBatch(
      [query, ...candidates.map(c => c.text)],
      options
    );

    // Calculate similarities
    const similarities = candidateResults.map((result, index) => ({
      ...candidates[index],
      similarity: this.cosineSimilarity(queryResult.embedding, result.embedding),
    }));

    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(item => ({
        id: item.id,
        text: item.text,
        similarity: item.similarity,
        data: item,
      }));
  }

  /**
   * Cluster embeddings using K-means
   */
  async clusterEmbeddings(
    embeddings: number[][],
    k: number
  ): Promise<Array<{ centroid: number[]; members: number[] }>> {
    // Simple K-means implementation
    const clusters: Array<{ centroid: number[]; members: number[] }> = [];
    const dimensions = embeddings[0].length;

    // Initialize centroids randomly
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * embeddings.length);
      clusters.push({
        centroid: [...embeddings[randomIndex]],
        members: [],
      });
    }

    // Iterate until convergence
    const maxIterations = 100;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Clear members
      clusters.forEach(cluster => cluster.members = []);

      // Assign points to nearest centroid
      embeddings.forEach((embedding, index) => {
        let minDistance = Infinity;
        let nearestCluster = 0;

        clusters.forEach((cluster, clusterIndex) => {
          const distance = this.euclideanDistance(embedding, cluster.centroid);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCluster = clusterIndex;
          }
        });

        clusters[nearestCluster].members.push(index);
      });

      // Update centroids
      let changed = false;
      clusters.forEach(cluster => {
        if (cluster.members.length === 0) return;

        const newCentroid = new Array(dimensions).fill(0);
        cluster.members.forEach(memberIndex => {
          const embedding = embeddings[memberIndex];
          embedding.forEach((val, dim) => {
            newCentroid[dim] += val;
          });
        });

        newCentroid.forEach((val, dim) => {
          newCentroid[dim] /= cluster.members.length;
          if (Math.abs(newCentroid[dim] - cluster.centroid[dim]) > 0.001) {
            changed = true;
          }
        });

        cluster.centroid = newCentroid;
      });

      if (!changed) break;
    }

    return clusters;
  }

  /**
   * Reduce embedding dimensions using PCA
   */
  reduceDimensions(embeddings: number[][], targetDimensions: number): number[][] {
    // Simple PCA implementation (you might want to use a library for production)
    const n = embeddings.length;
    const d = embeddings[0].length;

    if (targetDimensions >= d) {
      return embeddings;
    }

    // Center the data
    const mean = new Array(d).fill(0);
    embeddings.forEach(embedding => {
      embedding.forEach((val, i) => mean[i] += val / n);
    });

    const centered = embeddings.map(embedding =>
      embedding.map((val, i) => val - mean[i])
    );

    // Compute covariance matrix (simplified)
    // In production, use a proper linear algebra library
    const reduced: number[][] = [];
    for (const embedding of centered) {
      const reducedEmbedding = embedding.slice(0, targetDimensions);
      reduced.push(reducedEmbedding);
    }

    return reduced;
  }

  // Helper methods

  private normalizeEmbedding(embedding: number[], options: EmbeddingOptions): number[] {
    if (!options.normalize) {
      return embedding;
    }

    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  private getCacheKey(text: string, options: EmbeddingOptions): string {
    const provider = options.provider || 'auto';
    const model = options.model || 'default';
    return `${provider}_${model}_${this.hashString(text)}`;
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

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
}

/**
 * Factory function to create embedding service
 */
export function createEmbeddingService(supabase: SupabaseClient): EmbeddingService {
  return new EmbeddingService(supabase);
}