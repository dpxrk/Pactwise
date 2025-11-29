import { SupabaseClient } from '@supabase/supabase-js';
import { getCache, getCacheSync, UnifiedCache, initializeCache } from '../../../functions-utils/cache-factory.ts';
import { getFeatureFlag, getCacheTTL } from '../config/index.ts';

export interface Memory {
  id?: string;
  content: string;
  context: Record<string, unknown>;
  importance_score: number;
  access_count: number;
  embedding?: number[];
  created_at?: string;
  expires_at?: string;
}

export interface MemorySearchResult extends Memory {
  similarity_score: number;
}

export class MemoryManager {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private userId?: string;
  private syncCache = getCacheSync(); // Synchronous cache for immediate access
  private asyncCache: UnifiedCache | null = null;
  private cacheInitialized = false;
  private consolidationThreshold = 5; // Consolidate after 5 accesses
  private importanceThreshold = 0.7; // Move to long-term if importance > 0.7

  constructor(
    supabase: SupabaseClient,
    enterpriseId: string,
    userId?: string,
  ) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.userId = userId;

    // Initialize async cache in background
    this.initCacheAsync();
  }

  /**
   * Initialize the async cache (Redis-backed if available)
   */
  private async initCacheAsync(): Promise<void> {
    try {
      await initializeCache();
      this.asyncCache = await getCache();
      this.cacheInitialized = true;
    } catch (error) {
      console.error('MemoryManager: Failed to initialize async cache:', error);
      this.cacheInitialized = true; // Mark as initialized even on failure
    }
  }

  /**
   * Ensure async cache is ready before use
   */
  private async ensureCacheReady(): Promise<UnifiedCache> {
    if (!this.cacheInitialized) {
      await this.initCacheAsync();
    }
    return this.asyncCache || await getCache();
  }

  // Store memory in short-term memory
  async storeShortTermMemory(
    memoryType: string,
    content: string,
    context: Record<string, unknown> = {},
    importanceScore = 0.5,
    embedding?: number[],
  ): Promise<string> {
    if (!this.userId) {
      throw new Error('User ID required for short-term memory');
    }

    // Check for similar existing memories to avoid duplicates
    if (embedding) {
      const similar = await this.searchShortTermMemory(embedding, 1, 0.95);
      if (similar.length > 0) {
        // Update existing memory instead of creating new
        await this.updateMemoryAccess(similar[0].id!, 'short_term');
        return similar[0].id!;
      }
    }

    const { data, error } = await this.supabase
      .from('short_term_memory')
      .insert({
        user_id: this.userId,
        memory_type: memoryType,
        content,
        context,
        importance_score: importanceScore,
        embedding,
        enterprise_id: this.enterpriseId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (error) {throw error;}

    // Cache the memory for quick access (async, don't block return)
    this.cacheMemory(data.id, data, 'short_term').catch(console.error);

    return data.id;
  }

  // Store memory in long-term memory
  async storeLongTermMemory(
    memoryType: string,
    category: string,
    content: string,
    summary: string,
    context: Record<string, unknown> = {},
    importanceScore = 0.5,
    embedding?: number[],
  ): Promise<string> {
    // Check for similar existing memories
    if (embedding) {
      const similar = await this.searchLongTermMemory(embedding, 1, 0.9);
      if (similar.length > 0) {
        // Consolidate with existing memory
        await this.consolidateMemories(similar[0].id!, content, context);
        return similar[0].id!;
      }
    }

    const { data, error } = await this.supabase
      .from('long_term_memory')
      .insert({
        memory_type: memoryType,
        category,
        content,
        summary,
        context,
        importance_score: importanceScore,
        embedding,
        user_id: this.userId,
        enterprise_id: this.enterpriseId,
      })
      .select()
      .single();

    if (error) {throw error;}

    // Cache the memory (async, don't block return)
    this.cacheMemory(data.id, data, 'long_term').catch(console.error);

    return data.id;
  }

  // Search short-term memory using embeddings
  async searchShortTermMemory(
    queryEmbedding: number[],
    limit = 5,
    threshold = 0.7,
  ): Promise<MemorySearchResult[]> {
    if (!this.userId) {
      throw new Error('User ID required for short-term memory search');
    }

    const { data, error } = await this.supabase.rpc('search_short_term_memory', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      p_user_id: this.userId,
      p_enterprise_id: this.enterpriseId,
    });

    if (error) {throw error;}

    return data as MemorySearchResult[];
  }

  // Search long-term memory using embeddings
  async searchLongTermMemory(
    queryEmbedding: number[],
    limit = 10,
    threshold = 0.7,
    category?: string,
  ): Promise<MemorySearchResult[]> {
    const { data, error } = await this.supabase.rpc('search_long_term_memory', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      p_category: category,
      p_user_id: this.userId,
      p_enterprise_id: this.enterpriseId,
    });

    if (error) {throw error;}

    return data as MemorySearchResult[];
  }

  // Retrieve recent memories by type
  async getRecentMemories(
    memoryType: string,
    limit = 10,
    memoryStore: 'short_term' | 'long_term' = 'short_term',
  ): Promise<Memory[]> {
    const table = memoryStore === 'short_term' ? 'short_term_memory' : 'long_term_memory';

    let query = this.supabase
      .from(table)
      .select('*')
      .eq('memory_type', memoryType)
      .eq('enterprise_id', this.enterpriseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (memoryStore === 'short_term' && this.userId) {
      query = query.eq('user_id', this.userId);
    }

    const { data, error } = await query;

    if (error) {throw error;}

    return data as Memory[];
  }

  // Update memory access count and last accessed time
  private async updateMemoryAccess(
    memoryId: string,
    memoryStore: 'short_term' | 'long_term',
  ) {
    const table = memoryStore === 'short_term' ? 'short_term_memory' : 'long_term_memory';

    const { data, error } = await this.supabase
      .from(table)
      .update({
        access_count: this.supabase.rpc('increment', { value: 1 }),
        [memoryStore === 'short_term' ? 'accessed_at' : 'last_accessed_at']: new Date().toISOString(),
      })
      .eq('id', memoryId)
      .select()
      .single();

    if (error) {throw error;}

    // Check if memory should be promoted to long-term
    if (memoryStore === 'short_term' && data) {
      if (data.access_count >= this.consolidationThreshold ||
          data.importance_score >= this.importanceThreshold) {
        await this.promoteToLongTerm(data);
      }
    }
  }

  // Promote short-term memory to long-term
  private async promoteToLongTerm(shortTermMemory: Memory & { memory_type?: string }) {
    // Generate summary if not exists
    const summary = await this.generateSummary(shortTermMemory.content);

    // Determine category based on memory type and context
    const category = this.categorizeMemory(shortTermMemory);

    // Store in long-term memory
    await this.storeLongTermMemory(
      shortTermMemory.memory_type || 'general',
      category,
      shortTermMemory.content,
      summary,
      shortTermMemory.context,
      shortTermMemory.importance_score,
      shortTermMemory.embedding,
    );

    // Remove from short-term memory
    await this.supabase
      .from('short_term_memory')
      .delete()
      .eq('id', shortTermMemory.id);
  }

  // Consolidate memories
  private async consolidateMemories(
    existingMemoryId: string,
    newContent: string,
    newContext: Record<string, unknown>,
  ) {
    const { data: existing, error } = await this.supabase
      .from('long_term_memory')
      .select('*')
      .eq('id', existingMemoryId)
      .single();

    if (error) {throw error;}

    // Merge content and context
    const consolidatedContent = `${existing.content}\n\n---\n\n${newContent}`;
    const consolidatedContext = {
      ...existing.context,
      ...newContext,
      consolidation_history: [
        ...(existing.context.consolidation_history || []),
        {
          timestamp: new Date().toISOString(),
          added_content: newContent,
        },
      ],
    };

    // Update memory
    await this.supabase
      .from('long_term_memory')
      .update({
        content: consolidatedContent,
        context: consolidatedContext,
        consolidation_count: existing.consolidation_count + 1,
        consolidated_at: new Date().toISOString(),
      })
      .eq('id', existingMemoryId);
  }

  // Clean up expired short-term memories
  async cleanupExpiredMemories() {
    const { error } = await this.supabase
      .from('short_term_memory')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .eq('enterprise_id', this.enterpriseId);

    if (error) {throw error;}
  }

  // Memory decay - reduce importance of unused memories
  async applyMemoryDecay(decayRate = 0.95) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    await this.supabase.rpc('apply_memory_decay', {
      decay_rate: decayRate,
      cutoff_date: thirtyDaysAgo,
      p_enterprise_id: this.enterpriseId,
    });
  }

  // Generate summary for memory content
  private async generateSummary(content: string): Promise<string> {
    // In a real implementation, this would use an LLM or summarization service
    // For now, we'll use a simple truncation
    const maxLength = 200;
    if (content.length <= maxLength) {return content;}

    return `${content.substring(0, maxLength)}...`;
  }

  // Categorize memory based on type and context
  private categorizeMemory(memory: Memory): string {
    const { memory_type } = memory as { memory_type?: string };

    // Define category mapping
    const categoryMap: Record<string, string> = {
      contract_analysis: 'contracts',
      vendor_evaluation: 'vendors',
      budget_tracking: 'finance',
      compliance_check: 'compliance',
      user_preference: 'preferences',
      workflow_state: 'workflows',
      decision_history: 'decisions',
      insight_generated: 'insights',
    };

    return categoryMap[memory_type] || 'general';
  }

  // Cache memory for quick access (uses async cache with Redis support)
  private async cacheMemory(id: string, memory: Memory, store: 'short_term' | 'long_term'): Promise<void> {
    if (!getFeatureFlag('ENABLE_CACHING')) {return;}

    const cacheKey = `memory_${store}_${id}_${this.enterpriseId}`;
    const ttl = store === 'short_term' ?
      getCacheTTL('DEFAULT') :
      getCacheTTL('AGENT_RESULTS');

    try {
      const cache = await this.ensureCacheReady();
      await cache.set(cacheKey, memory, ttl);
    } catch {
      // Fall back to sync cache if async fails
      this.syncCache.set(cacheKey, memory, ttl);
    }
  }

  // Get memory from cache or database (uses async cache with Redis support)
  async getMemory(
    id: string,
    store: 'short_term' | 'long_term',
  ): Promise<Memory | null> {
    const cacheKey = `memory_${store}_${id}_${this.enterpriseId}`;

    // Check cache first (try async cache, fall back to sync)
    if (getFeatureFlag('ENABLE_CACHING')) {
      try {
        const cache = await this.ensureCacheReady();
        const cached = await cache.get<Memory>(cacheKey);
        if (cached) {return cached;}
      } catch {
        // Try sync cache as fallback
        const syncCached = this.syncCache.get(cacheKey);
        if (syncCached) {return syncCached as Memory;}
      }
    }

    // Fetch from database
    const table = store === 'short_term' ? 'short_term_memory' : 'long_term_memory';
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    if (error || !data) {return null;}

    // Update cache (async, don't block return)
    this.cacheMemory(id, data, store).catch(console.error);

    return data as Memory;
  }

  // Get memory statistics
  async getMemoryStats(): Promise<{
    shortTermCount: number;
    longTermCount: number;
    totalMemorySize: number;
    categoryCounts: Record<string, number>;
  }> {
    const [shortTermStats, longTermStats] = await Promise.all([
      this.supabase
        .from('short_term_memory')
        .select('id', { count: 'exact' })
        .eq('enterprise_id', this.enterpriseId)
        .eq('user_id', this.userId || ''),
      this.supabase
        .from('long_term_memory')
        .select('category', { count: 'exact' })
        .eq('enterprise_id', this.enterpriseId),
    ]);

    const categoryCounts: Record<string, number> = {};
    if (longTermStats.data) {
      for (const item of longTermStats.data) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    }

    return {
      shortTermCount: shortTermStats.count || 0,
      longTermCount: longTermStats.count || 0,
      totalMemorySize: (shortTermStats.count || 0) + (longTermStats.count || 0),
      categoryCounts,
    };
  }
}