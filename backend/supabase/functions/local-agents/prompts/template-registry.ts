/**
 * Prompt Template Registry
 *
 * Central registry that loads, caches, and provides access to all
 * prompt templates across agent types. This is the main entry point
 * for agents to retrieve their prompts.
 */

import type {
  PromptTemplate,
  PromptAgentType,
  PromptCategory,
  PromptSelector,
  ChainOfThoughtTemplate,
  RenderedPrompt,
} from './types.ts';
import { renderTemplate } from './template-renderer.ts';

// Import agent templates
import { secretaryTemplates } from './templates/secretary/index.ts';
import { managerTemplates } from './templates/manager/index.ts';
import { financialTemplates } from './templates/financial/index.ts';
import { legalTemplates } from './templates/legal/index.ts';
import { analyticsTemplates } from './templates/analytics/index.ts';
import { vendorTemplates } from './templates/vendor/index.ts';
import { notificationsTemplates } from './templates/notifications/index.ts';
import { sharedTemplates } from './templates/shared/index.ts';

// Import chain-of-thought templates
import { chainOfThoughtTemplates } from './chain-of-thought/index.ts';

/** Singleton template registry instance */
let registryInstance: TemplateRegistry | null = null;

export class TemplateRegistry {
  private templates: Map<string, PromptTemplate> = new Map();
  private cotTemplates: Map<string, ChainOfThoughtTemplate> = new Map();

  constructor() {
    this.loadAllTemplates();
  }

  /**
   * Get the singleton registry instance.
   */
  static getInstance(): TemplateRegistry {
    if (!registryInstance) {
      registryInstance = new TemplateRegistry();
    }
    return registryInstance;
  }

  /**
   * Load all templates from the template modules.
   */
  private loadAllTemplates(): void {
    const allTemplates: PromptTemplate[] = [
      ...secretaryTemplates,
      ...managerTemplates,
      ...financialTemplates,
      ...legalTemplates,
      ...analyticsTemplates,
      ...vendorTemplates,
      ...notificationsTemplates,
      ...sharedTemplates,
    ];

    for (const template of allTemplates) {
      this.templates.set(template.id, template);
    }

    for (const cot of chainOfThoughtTemplates) {
      this.cotTemplates.set(cot.id, cot);
    }
  }

  /**
   * Get a template by ID.
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get a chain-of-thought template by ID.
   */
  getChainOfThought(id: string): ChainOfThoughtTemplate | undefined {
    return this.cotTemplates.get(id);
  }

  /**
   * Find templates matching a selector.
   */
  findTemplates(selector: PromptSelector): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => {
      if (t.agentType !== selector.agentType) return false;
      if (selector.category && t.category !== selector.category) return false;
      if (selector.taskType) {
        const hasTag = t.metadata.tags.includes(selector.taskType);
        if (!hasTag) return false;
      }
      return true;
    });
  }

  /**
   * Get the system prompt template for an agent type.
   */
  getSystemPrompt(agentType: PromptAgentType): PromptTemplate | undefined {
    return Array.from(this.templates.values()).find(
      t => t.agentType === agentType && t.category === 'system',
    );
  }

  /**
   * Render a template by ID with variables.
   */
  render(
    templateId: string,
    variables: Record<string, string>,
    options?: {
      maxFewShotExamples?: number;
      chainOfThoughtId?: string;
      memoryContext?: string;
      additionalContext?: string;
    },
  ): RenderedPrompt {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const cot = options?.chainOfThoughtId
      ? this.cotTemplates.get(options.chainOfThoughtId)
      : undefined;

    return renderTemplate(template, variables, {
      maxFewShotExamples: options?.maxFewShotExamples,
      chainOfThought: cot,
      memoryContext: options?.memoryContext,
      additionalContext: options?.additionalContext,
    });
  }

  /**
   * List all available template IDs grouped by agent type.
   */
  listAll(): Record<PromptAgentType | 'shared', string[]> {
    const result: Record<string, string[]> = {
      secretary: [],
      manager: [],
      financial: [],
      legal: [],
      analytics: [],
      vendor: [],
      notifications: [],
      shared: [],
    };

    for (const [id, template] of this.templates) {
      const key = template.agentType;
      if (result[key]) {
        result[key].push(id);
      }
    }

    return result as Record<PromptAgentType | 'shared', string[]>;
  }

  /**
   * Get total template count.
   */
  get size(): number {
    return this.templates.size;
  }
}

/** Convenience function to get the global registry */
export function getTemplateRegistry(): TemplateRegistry {
  return TemplateRegistry.getInstance();
}
