/**
 * Agent Integration Module
 *
 * Provides the bridge between the prompt template system and the
 * BaseAgent class. Agents use this module to retrieve and render
 * prompts instead of constructing them inline.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  PromptAgentType,
  PromptCategory,
  RenderedPrompt,
} from './types.ts';
import { getTemplateRegistry, TemplateRegistry } from './template-registry.ts';
import { PromptVersionManager } from './version-manager.ts';

export interface PromptIntegrationConfig {
  agentType: PromptAgentType;
  enterpriseId: string;
  enterpriseName?: string;
  supabase?: SupabaseClient;
  /** When true, logs prompt usage to the version manager for metrics */
  trackPerformance?: boolean;
}

/**
 * PromptIntegration wraps the template registry and version manager
 * to provide a simple API for agents to get their prompts.
 */
export class PromptIntegration {
  private registry: TemplateRegistry;
  private versionManager: PromptVersionManager | null = null;
  private agentType: PromptAgentType;
  private enterpriseId: string;
  private enterpriseName: string;
  private trackPerformance: boolean;

  constructor(config: PromptIntegrationConfig) {
    this.registry = getTemplateRegistry();
    this.agentType = config.agentType;
    this.enterpriseId = config.enterpriseId;
    this.enterpriseName = config.enterpriseName || 'Current Enterprise';
    this.trackPerformance = config.trackPerformance ?? false;

    if (config.supabase && this.trackPerformance) {
      this.versionManager = new PromptVersionManager(config.supabase, config.enterpriseId);
    }
  }

  /**
   * Get the rendered system prompt for this agent.
   * This replaces the hardcoded `getSystemPrompt()` in BaseAgent.
   */
  getSystemPrompt(additionalVariables?: Record<string, string>): string {
    const template = this.registry.getSystemPrompt(this.agentType);
    if (!template) {
      // Fallback to basic prompt if template not found
      return `You are a ${this.agentType} agent for Pactwise, an enterprise contract management platform.`;
    }

    const variables: Record<string, string> = {
      enterprise_id: this.enterpriseId,
      enterprise_name: this.enterpriseName,
      ...additionalVariables,
    };

    const rendered = this.registry.render(template.id, variables);
    return rendered.content;
  }

  /**
   * Get a rendered task prompt by template name or ID.
   */
  getTaskPrompt(
    templateId: string,
    variables: Record<string, string>,
    options?: {
      maxFewShotExamples?: number;
      chainOfThoughtId?: string;
      memoryContext?: string;
    },
  ): RenderedPrompt {
    return this.registry.render(templateId, variables, options);
  }

  /**
   * Find the best template for a given task type.
   * Returns the first matching template or null.
   */
  findTemplateForTask(
    taskType: string,
    category: PromptCategory = 'task',
  ): string | null {
    const templates = this.registry.findTemplates({
      agentType: this.agentType,
      category,
      taskType,
    });

    return templates.length > 0 ? templates[0].id : null;
  }

  /**
   * Record execution metrics for a prompt (if performance tracking enabled).
   */
  async recordExecution(
    rendered: RenderedPrompt,
    execution: {
      success: boolean;
      latencyMs: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    },
  ): Promise<void> {
    if (!this.versionManager || !this.trackPerformance) return;

    try {
      const version = await this.versionManager.getActiveVersion(rendered.templateId);
      if (version) {
        await this.versionManager.recordExecution(version.id, execution);
      }
    } catch {
      // Non-critical: don't fail agent processing due to metrics logging
      console.warn('Failed to record prompt execution metrics');
    }
  }

  /**
   * List all available templates for this agent type.
   */
  listAvailableTemplates(): string[] {
    const all = this.registry.listAll();
    return all[this.agentType] || [];
  }

  /**
   * Get the version manager (for advanced operations like A/B testing).
   */
  getVersionManager(): PromptVersionManager | null {
    return this.versionManager;
  }
}

/**
 * Factory function to create a PromptIntegration instance for an agent.
 */
export function createPromptIntegration(
  config: PromptIntegrationConfig,
): PromptIntegration {
  return new PromptIntegration(config);
}
