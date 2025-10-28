import { SupabaseClient } from '@supabase/supabase-js';
import { Memory } from './memory.ts';
import { getFeatureFlag } from '../config/index.ts';
import { DonnaInterface } from '../donna/interface.ts';

export interface ConsolidationConfig {
  batchSize: number;
  consolidationThreshold: number;
  importanceThreshold: number;
  maxMemoriesPerUser: number;
  decayRate: number;
}

export interface MemoryPattern {
  type: string;
  pattern: string;
  frequency: number;
  importance: number;
  context: Record<string, unknown>;
}

export class MemoryConsolidationProcessor {
  private supabase: SupabaseClient;
  private config: ConsolidationConfig;
  private donnaInterface: DonnaInterface;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.donnaInterface = new DonnaInterface(supabase);
    this.config = {
      batchSize: 100,
      consolidationThreshold: 5, // Access count threshold
      importanceThreshold: 0.7, // Importance score threshold
      maxMemoriesPerUser: 1000, // Max memories to retain per user
      decayRate: 0.95, // Daily decay rate for unused memories
    };
  }

  // Main consolidation process
  async processConsolidation(enterpriseId?: string): Promise<{
    processed: number;
    consolidated: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      consolidated: 0,
      errors: [] as string[],
    };

    if (!getFeatureFlag('ENABLE_MEMORY_SYSTEM')) {
      return results;
    }

    try {
      // Get users with memories to consolidate
      const users = await this.getUsersWithMemories(enterpriseId);

      for (const user of users) {
        try {
          const consolidatedCount = await this.consolidateUserMemories(
            user.user_id,
            user.enterprise_id,
          );

          results.processed++;
          results.consolidated += consolidatedCount;

          // Apply memory decay for this user
          await this.applyUserMemoryDecay(user.user_id, user.enterprise_id);

          // Cleanup expired memories
          await this.cleanupExpiredMemories(user.user_id, user.enterprise_id);

          // Enforce memory limits
          await this.enforceMemoryLimits(user.user_id, user.enterprise_id);

        } catch (error) {
          console.error(`Error consolidating memories for user ${user.user_id}:`, error);
          results.errors.push(`User ${user.user_id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Process enterprise-wide patterns for Donna AI
      if (enterpriseId) {
        await this.extractEnterprisePatterns(enterpriseId);
      }

    } catch (error) {
      console.error('Memory consolidation process error:', error);
      results.errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results;
  }

  // Get users with memories that need consolidation
  private async getUsersWithMemories(enterpriseId?: string): Promise<{user_id: string, enterprise_id: string}[]> {
    let query = this.supabase
      .from('short_term_memory')
      .select('user_id, enterprise_id')
      .gte('access_count', this.config.consolidationThreshold)
      .limit(this.config.batchSize);

    if (enterpriseId) {
      query = query.eq('enterprise_id', enterpriseId);
    }

    const { data, error } = await query;
    if (error) {throw error;}

    // Deduplicate users
    const uniqueUsers = new Map();
    for (const item of data || []) {
      const key = `${item.user_id}_${item.enterprise_id}`;
      if (!uniqueUsers.has(key)) {
        uniqueUsers.set(key, item);
      }
    }

    return Array.from(uniqueUsers.values());
  }

  // Consolidate memories for a specific user
  private async consolidateUserMemories(
    userId: string,
    enterpriseId: string,
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc('consolidate_user_memories', {
      p_user_id: userId,
      p_enterprise_id: enterpriseId,
      consolidation_threshold: this.config.consolidationThreshold,
      importance_threshold: this.config.importanceThreshold,
    });

    if (error) {throw error;}
    return data || 0;
  }

  // Apply memory decay to reduce importance of unused memories
  private async applyUserMemoryDecay(
    _userId: string,
    enterpriseId: string,
  ): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await this.supabase.rpc('apply_memory_decay', {
      decay_rate: this.config.decayRate,
      cutoff_date: thirtyDaysAgo.toISOString(),
      p_enterprise_id: enterpriseId,
    });
  }

  // Clean up expired short-term memories
  private async cleanupExpiredMemories(
    userId: string,
    enterpriseId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('short_term_memory')
      .delete()
      .eq('user_id', userId)
      .eq('enterprise_id', enterpriseId)
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired memories:', error);
    }
  }

  // Enforce memory limits per user
  private async enforceMemoryLimits(
    userId: string,
    enterpriseId: string,
  ): Promise<void> {
    // Count total memories
    const { count: totalCount } = await this.supabase
      .from('long_term_memory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('enterprise_id', enterpriseId);

    if (!totalCount || totalCount <= this.config.maxMemoriesPerUser) {
      return;
    }

    // Delete oldest, least important memories
    const toDelete = totalCount - this.config.maxMemoriesPerUser;

    const { data: memoriesToDelete } = await this.supabase
      .from('long_term_memory')
      .select('id')
      .eq('user_id', userId)
      .eq('enterprise_id', enterpriseId)
      .order('importance_score', { ascending: true })
      .order('last_accessed_at', { ascending: true, nullsFirst: true })
      .limit(toDelete);

    if (memoriesToDelete && memoriesToDelete.length > 0) {
      const idsToDelete = memoriesToDelete.map((m: { id: string }) => m.id);

      await this.supabase
        .from('long_term_memory')
        .delete()
        .in('id', idsToDelete);
    }
  }

  // Extract patterns from memories for enterprise-wide learning
  private async extractEnterprisePatterns(enterpriseId: string): Promise<void> {
    if (!getFeatureFlag('ENABLE_DONNA_AI')) return;

    try {
      // Extract common patterns from long-term memories
      const { data: memoryData } = await this.supabase
        .from('long_term_memory')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .gte('importance_score', 0.7)
        .limit(500);

      if (!memoryData || memoryData.length === 0) {return;}

      // Convert to Memory type
      const memories: Memory[] = memoryData.map((m: Record<string, unknown> & {
        id: string;
        content: string;
        context?: Record<string, unknown>;
        importance_score: number;
        access_count?: number;
        embedding: number[];
        created_at: string;
        expires_at: string | null;
        memory_type: string;
      }) => ({
        id: m.id,
        content: m.content,
        context: m.context || {},
        importance_score: m.importance_score,
        access_count: m.access_count || 0,
        embedding: m.embedding,
        created_at: m.created_at,
        expires_at: m.expires_at,
        memory_type: m.memory_type,
        category: m.category,
      }));

      // Group by memory type and category
      const patterns = this.identifyPatterns(memories);

      // Feed consolidated memories to Donna for learning
      for (const memory of memoryData) {
        try {
          await this.donnaInterface.submitLearningData(
            memory.memory_type,
            {
              content: memory.content,
              context: memory.context,
              category: memory.category,
              memory_type: memory.memory_type,
            },
            {
              success: true, // Consolidated memories are considered successful patterns
              metrics: {
                importance_score: 0.8, // High importance for consolidated memories
                pattern_confidence: 0.9,
                source: 'memory_consolidation',
              },
            },
            enterpriseId,
            memory.user_id
          );
        } catch (donnaError) {
          console.error('Error feeding memory to Donna:', donnaError);
        }
      }

      // Also store patterns directly in Donna's pattern table for pattern recognition
      for (const pattern of patterns) {
        await this.storeEnterprisePattern(enterpriseId, pattern);
      }

      console.log(`Fed ${memories.length} memories and ${patterns.length} patterns to Donna for enterprise ${enterpriseId}`);

    } catch (error) {
      console.error('Error extracting enterprise patterns:', error);
    }
  }

  // Identify patterns in memories
  private identifyPatterns(memories: Memory[]): MemoryPattern[] {
    const patterns: MemoryPattern[] = [];
    const typeGroups = new Map<string, unknown[]>();

    // Group memories by type
    for (const memory of memories) {
      const memoryWithType = memory as Memory & { memory_type?: string; category?: string };
      const key = `${memoryWithType.memory_type || 'unknown'}_${memoryWithType.category || 'general'}`;
      if (!typeGroups.has(key)) {
        typeGroups.set(key, []);
      }
      typeGroups.get(key)!.push(memory);
    }

    // Extract patterns from each group
    for (const [key, group] of typeGroups) {
      if (group.length >= 3) { // Need at least 3 instances to form a pattern
        const [memoryType, category] = key.split('_');

        // Extract common context fields
        const commonContext = this.extractCommonContext(group);

        // Extract common keywords
        const commonKeywords = this.extractCommonKeywords(group);

        if (Object.keys(commonContext).length > 0 || commonKeywords.length > 0) {
          patterns.push({
            pattern_type: 'memory_pattern',
            pattern_signature: key,
            pattern_data: {
              memory_type: memoryType,
              category,
              instance_count: group.length,
              common_context: commonContext,
              common_keywords: commonKeywords,
              confidence: group.length / memories.length,
            },
            frequency: group.length,
          });
        }
      }
    }

    return patterns;
  }

  // Extract common context fields from a group of memories
  private extractCommonContext(memories: Memory[]): Record<string, unknown> {
    if (memories.length === 0) {return {};}

    const commonContext: Record<string, unknown> = {};
    const firstContext = memories[0].context || {};

    // Check which fields are common across all memories
    for (const [key, value] of Object.entries(firstContext)) {
      const isCommon = memories.every(m =>
        m.context && m.context[key] !== undefined,
      );

      if (isCommon) {
        // For boolean/string fields, check if values are consistent
        if (typeof value === 'boolean' || typeof value === 'string') {
          const allSame = memories.every(m => m.context[key] === value);
          if (allSame) {
            commonContext[key] = value;
          }
        }
      }
    }

    return commonContext;
  }

  // Extract common keywords from memory content
  private extractCommonKeywords(memories: Memory[]): string[] {
    const keywordFreq = new Map<string, number>();

    for (const memory of memories) {
      const words = (memory.content || '').toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4); // Only consider words longer than 4 chars

      for (const word of words) {
        keywordFreq.set(word, (keywordFreq.get(word) || 0) + 1);
      }
    }

    // Find words that appear in at least 50% of memories
    const threshold = memories.length * 0.5;
    const commonKeywords: string[] = [];

    for (const [word, freq] of keywordFreq) {
      if (freq >= threshold) {
        commonKeywords.push(word);
      }
    }

    return commonKeywords.sort((a, b) =>
      (keywordFreq.get(b) || 0) - (keywordFreq.get(a) || 0),
    ).slice(0, 10); // Top 10 keywords
  }

  // Store pattern for enterprise learning
  private async storeEnterprisePattern(
    enterpriseId: string,
    pattern: MemoryPattern,
  ): Promise<void> {
    // Create pattern signature from pattern content
    const patternSignature = `${pattern.type}_${pattern.pattern}`;
    
    // Check if pattern already exists
    const { data: existing } = await this.supabase
      .from('donna_patterns')
      .select('id, frequency')
      .eq('pattern_signature', patternSignature)
      .eq('enterprise_id', enterpriseId)
      .single();

    if (existing) {
      // Update existing pattern
      await this.supabase
        .from('donna_patterns')
        .update({
          frequency: existing.frequency + 1,
          pattern_data: {
            type: pattern.type,
            pattern: pattern.pattern,
            importance: pattern.importance,
            context: pattern.context,
          },
          last_seen: new Date().toISOString(),
          confidence: Math.min(1, (existing.frequency + 1) / 100), // Increase confidence with frequency
        })
        .eq('id', existing.id);
    } else {
      // Insert new pattern
      await this.supabase
        .from('donna_patterns')
        .insert({
          enterprise_id: enterpriseId,
          pattern_type: pattern.type,
          pattern_signature: patternSignature,
          pattern_data: {
            type: pattern.type,
            pattern: pattern.pattern,
            importance: pattern.importance,
            context: pattern.context,
          },
          frequency: pattern.frequency,
          confidence: pattern.importance / 10, // Convert importance (0-10) to confidence (0-1)
          context: {
            source: 'memory_consolidation',
            extracted_at: new Date().toISOString(),
          },
        });
    }
  }

  // Get consolidation statistics
  async getConsolidationStats(enterpriseId: string): Promise<{
    shortTermCount: number;
    longTermCount: number;
    avgImportanceScore: number;
    consolidationRate: number;
    topMemoryTypes: Array<{ type: string; count: number }>;
  }> {
    const stats = {
      shortTermCount: 0,
      longTermCount: 0,
      avgImportanceScore: 0,
      consolidationRate: 0,
      topMemoryTypes: [] as Array<{ type: string; count: number }>,
    };

    // Get counts
    const [shortTerm, longTerm] = await Promise.all([
      this.supabase
        .from('short_term_memory')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId),
      this.supabase
        .from('long_term_memory')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId),
    ]);

    stats.shortTermCount = shortTerm.count || 0;
    stats.longTermCount = longTerm.count || 0;

    // Get average importance score
    const { data: avgScore } = await this.supabase
      .from('long_term_memory')
      .select('importance_score')
      .eq('enterprise_id', enterpriseId);

    if (avgScore && avgScore.length > 0) {
      const sum = avgScore.reduce((acc: number, m: { importance_score: number | null }) => acc + (m.importance_score || 0), 0);
      stats.avgImportanceScore = sum / avgScore.length;
    }

    // Calculate consolidation rate
    if (stats.shortTermCount + stats.longTermCount > 0) {
      stats.consolidationRate = stats.longTermCount / (stats.shortTermCount + stats.longTermCount);
    }

    // Get top memory types
    const { data: typeStats } = await this.supabase
      .from('long_term_memory')
      .select('memory_type')
      .eq('enterprise_id', enterpriseId);

    if (typeStats) {
      const typeCounts = new Map<string, number>();
      for (const item of typeStats) {
        typeCounts.set(item.memory_type, (typeCounts.get(item.memory_type) || 0) + 1);
      }

      stats.topMemoryTypes = Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    return stats;
  }
}