import { SupabaseClient } from '@supabase/supabase-js';
import { BaseAgent } from '../agents/base.ts';
import { SecretaryAgent } from '../agents/secretary.ts';
import { ManagerAgent } from '../agents/manager.ts';
import { FinancialAgent } from '../agents/financial.ts';
import { LegalAgent } from '../agents/legal.ts';
import { AnalyticsAgent } from '../agents/analytics.ts';
import { VendorAgent } from '../agents/vendor.ts';
import { NotificationsAgent } from '../agents/notifications.ts';
import { getCache, getCacheSync, UnifiedCache, initializeCache } from '../../../functions-utils/cache-factory.ts';
// import { config, getFeatureFlag } from '../config/index.ts';

export interface EnterpriseAgentConfig {
  enterpriseId: string;
  settings?: Record<string, unknown>;
  enabledAgents?: string[];
  memoryConfig?: {
    maxShortTermMemories: number;
    maxLongTermMemories: number;
    consolidationThreshold: number;
  };
}

export class EnterpriseAgentFactory {
  private supabase: SupabaseClient;
  private enterpriseConfigs: Map<string, EnterpriseAgentConfig> = new Map();
  private agentInstances: Map<string, BaseAgent> = new Map();
  private agentTypes: Map<string, typeof BaseAgent> = new Map();
  private syncCache = getCacheSync();
  private asyncCache: UnifiedCache | null = null;
  private cacheInitialized = false;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.registerAgentTypes();
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
      console.error('EnterpriseAgentFactory: Failed to initialize async cache:', error);
      this.cacheInitialized = true;
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

  // Register all available agent types
  private registerAgentTypes() {
    this.agentTypes.set('secretary', SecretaryAgent);
    this.agentTypes.set('manager', ManagerAgent);
    this.agentTypes.set('financial', FinancialAgent);
    this.agentTypes.set('legal', LegalAgent);
    this.agentTypes.set('analytics', AnalyticsAgent);
    this.agentTypes.set('vendor', VendorAgent);
    this.agentTypes.set('notifications', NotificationsAgent);
  }

  // Initialize enterprise configuration (uses async cache with Redis support)
  async initializeEnterprise(enterpriseId: string): Promise<EnterpriseAgentConfig> {
    // Check cache first
    const cacheKey = `enterprise_agent_config_${enterpriseId}`;

    try {
      const cache = await this.ensureCacheReady();
      const cached = await cache.get<EnterpriseAgentConfig>(cacheKey);
      if (cached) {
        this.enterpriseConfigs.set(enterpriseId, cached);
        return cached;
      }
    } catch {
      // Try sync cache as fallback
      const syncCached = this.syncCache.get(cacheKey);
      if (syncCached) {
        this.enterpriseConfigs.set(enterpriseId, syncCached as EnterpriseAgentConfig);
        return syncCached as EnterpriseAgentConfig;
      }
    }

    // Load enterprise settings
    const { data: enterprise } = await this.supabase
      .from('enterprises')
      .select('id, name, settings')
      .eq('id', enterpriseId)
      .single();

    if (!enterprise) {
      throw new Error(`Enterprise not found: ${enterpriseId}`);
    }

    // Load enabled agents for this enterprise
    const { data: agents } = await this.supabase
      .from('agents')
      .select('type, config')
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true);

    const enabledAgents = agents?.map((a: { type: string; config: unknown }) => a.type) || [];

    const config: EnterpriseAgentConfig = {
      enterpriseId,
      settings: enterprise.settings || {},
      enabledAgents,
      memoryConfig: {
        maxShortTermMemories: enterprise.settings?.maxShortTermMemories || 1000,
        maxLongTermMemories: enterprise.settings?.maxLongTermMemories || 10000,
        consolidationThreshold: enterprise.settings?.consolidationThreshold || 5,
      },
    };

    // Cache the configuration
    try {
      const cache = await this.ensureCacheReady();
      await cache.set(cacheKey, config, 3600); // 1 hour
    } catch {
      this.syncCache.set(cacheKey, config, 3600);
    }
    this.enterpriseConfigs.set(enterpriseId, config);

    // Initialize agent records if they don't exist
    await this.ensureAgentsExist(enterpriseId);

    return config;
  }

  // Ensure all agent records exist for an enterprise
  private async ensureAgentsExist(enterpriseId: string) {
    const existingAgents = new Set(
      (await this.supabase
        .from('agents')
        .select('type')
        .eq('enterprise_id', enterpriseId))
        .data?.map((a: { type: string }) => a.type) || [],
    );

    const agentsToCreate = [];

    for (const [type, AgentClass] of this.agentTypes) {
      if (!existingAgents.has(type)) {
        // Skip abstract classes - only create concrete agents
        if (AgentClass === BaseAgent || !AgentClass) continue;

        agentsToCreate.push({
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
          type,
          description: `${type} agent for automated processing`,
          is_active: true,
          config: {},
          capabilities: [],
          enterprise_id: enterpriseId,
        });
      }
    }

    if (agentsToCreate.length > 0) {
      await this.supabase
        .from('agents')
        .insert(agentsToCreate);
    }
  }

  // Get or create an agent instance
  async getAgent(
    enterpriseId: string,
    agentType: string,
    userId?: string,
  ): Promise<BaseAgent> {
    // Create unique key for this agent instance
    const instanceKey = `${enterpriseId}_${agentType}_${userId || 'system'}`;

    // Check if instance already exists
    if (this.agentInstances.has(instanceKey)) {
      return this.agentInstances.get(instanceKey)!;
    }

    // Ensure enterprise is initialized
    const config = await this.initializeEnterprise(enterpriseId);

    // Check if agent type is enabled for this enterprise
    if (!config.enabledAgents?.includes(agentType)) {
      throw new Error(`Agent type ${agentType} is not enabled for enterprise ${enterpriseId}`);
    }

    // Get agent class
    const AgentClass = this.agentTypes.get(agentType);
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Create new instance (ensure it's not abstract)
    if (AgentClass === BaseAgent) {
      throw new Error(`Cannot instantiate abstract agent type: ${agentType}`);
    }
    const agent = new (AgentClass as unknown as new (...args: unknown[]) => BaseAgent)(this.supabase, enterpriseId, userId);

    // Store instance for reuse (with short TTL)
    this.agentInstances.set(instanceKey, agent);

    // Remove instance after 5 minutes to prevent memory leaks
    setTimeout(() => {
      this.agentInstances.delete(instanceKey);
    }, 300000);

    return agent;
  }

  // Process a task with enterprise isolation
  async processEnterpriseTask(task: AgentTask): Promise<unknown> {
    const { enterprise_id, agent_id } = task;

    // Get agent details
    const { data: agentData } = await this.supabase
      .from('agents')
      .select('type')
      .eq('id', agent_id)
      .eq('enterprise_id', enterprise_id)
      .single();

    if (!agentData) {
      throw new Error('Agent not found or not authorized for this enterprise');
    }

    // Extract user context
    const userId = task.payload?.context?.userId;

    // Get the appropriate agent instance
    const agent = await this.getAgent(enterprise_id, agentData.type, userId);

    // Process the task
    return agent.processTask(task.id);
  }

  // Get enterprise statistics
  async getEnterpriseStats(enterpriseId: string): Promise<{
    activeAgents: number;
    totalTasks: number;
    completedTasks: number;
    avgProcessingTime: number;
    memoryUsage: {
      shortTermCount: number;
      longTermCount: number;
    };
  }> {
    const stats = {
      activeAgents: 0,
      totalTasks: 0,
      completedTasks: 0,
      avgProcessingTime: 0,
      memoryUsage: {
        shortTermCount: 0,
        longTermCount: 0,
      },
    };

    // Get active agents count
    const { count: agentCount } = await this.supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .eq('is_active', true);

    stats.activeAgents = agentCount || 0;

    // Get task statistics
    const { data: taskStats } = await this.supabase
      .from('agent_tasks')
      .select('status, started_at, completed_at')
      .eq('enterprise_id', enterpriseId);

    if (taskStats) {
      stats.totalTasks = taskStats.length;
      let totalTime = 0;
      let timeCount = 0;

      for (const task of taskStats) {
        if (task.status === 'completed') {
          stats.completedTasks++;

          if (task.started_at && task.completed_at) {
            const duration = new Date(task.completed_at).getTime() -
                           new Date(task.started_at).getTime();
            totalTime += duration;
            timeCount++;
          }
        }
      }

      if (timeCount > 0) {
        stats.avgProcessingTime = Math.round(totalTime / timeCount);
      }
    }

    // Get memory usage
    const [shortTermMemory, longTermMemory] = await Promise.all([
      this.supabase
        .from('short_term_memory')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId),
      this.supabase
        .from('long_term_memory')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId),
    ]);

    stats.memoryUsage.shortTermCount = shortTermMemory.count || 0;
    stats.memoryUsage.longTermCount = longTermMemory.count || 0;

    return stats;
  }

  // Update enterprise agent configuration
  async updateEnterpriseConfig(
    enterpriseId: string,
    updates: Partial<EnterpriseAgentConfig>,
  ): Promise<void> {
    // Update in database
    if (updates.settings || updates.memoryConfig) {
      const settings = {
        ...(updates.settings || {}),
        ...(updates.memoryConfig ? {
          maxShortTermMemories: updates.memoryConfig.maxShortTermMemories,
          maxLongTermMemories: updates.memoryConfig.maxLongTermMemories,
          consolidationThreshold: updates.memoryConfig.consolidationThreshold,
        } : {}),
      };

      await this.supabase
        .from('enterprises')
        .update({ settings })
        .eq('id', enterpriseId);
    }

    // Update enabled agents
    if (updates.enabledAgents) {
      // Disable all agents first
      await this.supabase
        .from('agents')
        .update({ is_active: false })
        .eq('enterprise_id', enterpriseId);

      // Enable specified agents
      if (updates.enabledAgents.length > 0) {
        await this.supabase
          .from('agents')
          .update({ is_active: true })
          .eq('enterprise_id', enterpriseId)
          .in('type', updates.enabledAgents);
      }
    }

    // Clear cache
    const cacheKey = `enterprise_agent_config_${enterpriseId}`;
    try {
      const cache = await this.ensureCacheReady();
      await cache.delete(cacheKey);
    } catch {
      this.syncCache.delete(cacheKey);
    }
    this.enterpriseConfigs.delete(enterpriseId);
  }

  // Clean up enterprise data (for GDPR compliance)
  async cleanupEnterpriseData(
    enterpriseId: string,
    options: {
      deleteMemories?: boolean;
      deleteInsights?: boolean;
      deleteTasks?: boolean;
    } = {},
  ): Promise<void> {
    const operations = [];

    if (options.deleteMemories) {
      operations.push(
        this.supabase
          .from('short_term_memory')
          .delete()
          .eq('enterprise_id', enterpriseId),
        this.supabase
          .from('long_term_memory')
          .delete()
          .eq('enterprise_id', enterpriseId),
      );
    }

    if (options.deleteInsights) {
      operations.push(
        this.supabase
          .from('agent_insights')
          .delete()
          .eq('enterprise_id', enterpriseId),
      );
    }

    if (options.deleteTasks) {
      operations.push(
        this.supabase
          .from('agent_tasks')
          .delete()
          .eq('enterprise_id', enterpriseId),
      );
    }

    await Promise.all(operations);

    // Clear all cached data
    this.enterpriseConfigs.delete(enterpriseId);

    // Remove all agent instances for this enterprise
    for (const key of this.agentInstances.keys()) {
      if (key.startsWith(enterpriseId)) {
        this.agentInstances.delete(key);
      }
    }
  }

  // Get all active enterprises
  async getActiveEnterprises(): Promise<string[]> {
    const { data } = await this.supabase
      .from('agents')
      .select('enterprise_id')
      .eq('is_active', true);

    const uniqueEnterprises = new Set(data?.map((a: { enterprise_id: string }) => a.enterprise_id) || []);
    return Array.from(uniqueEnterprises);
  }
}