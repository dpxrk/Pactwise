/**
 * Prompt Engineering Type System
 *
 * Core types for the prompt template library, versioning, and performance tracking.
 */

/** Supported agent types in the prompt system */
export type PromptAgentType =
  | 'secretary'
  | 'manager'
  | 'financial'
  | 'legal'
  | 'analytics'
  | 'vendor'
  | 'notifications';

/** Prompt template categories */
export type PromptCategory =
  | 'system'        // System-level instructions
  | 'task'          // Task-specific prompts
  | 'few-shot'      // Few-shot example prompts
  | 'chain-of-thought' // CoT reasoning templates
  | 'self-consistency' // Self-consistency patterns
  | 'refinement';   // Self-critique and refinement

/** Variable placeholder in a template */
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
}

/** A single prompt template */
export interface PromptTemplate {
  id: string;
  agentType: PromptAgentType;
  category: PromptCategory;
  name: string;
  description: string;
  version: string;
  template: string;
  variables: TemplateVariable[];
  fewShotExamples?: FewShotExample[];
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
}

/** A few-shot example for in-context learning */
export interface FewShotExample {
  input: string;
  output: string;
  explanation?: string;
  tags?: string[];
}

/** Chain-of-thought step definition */
export interface ChainOfThoughtStep {
  stepNumber: number;
  instruction: string;
  expectedOutput: string;
  validationCriteria?: string;
}

/** Chain-of-thought template */
export interface ChainOfThoughtTemplate {
  id: string;
  name: string;
  agentType: PromptAgentType | 'shared';
  steps: ChainOfThoughtStep[];
  preamble: string;
  conclusion: string;
}

/** Prompt version record for tracking */
export interface PromptVersion {
  id: string;
  templateId: string;
  version: string;
  content: string;
  checksum: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  metrics: PromptPerformanceMetrics;
}

/** Performance metrics for a prompt version */
export interface PromptPerformanceMetrics {
  totalUsageCount: number;
  successRate: number;
  averageLatencyMs: number;
  averageInputTokens: number;
  averageOutputTokens: number;
  averageCost: number;
  userSatisfactionScore: number | null;
  lastUsedAt: string | null;
}

/** A/B test configuration */
export interface PromptABTest {
  id: string;
  name: string;
  templateId: string;
  variantA: string; // version id
  variantB: string; // version id
  trafficSplitPercent: number; // 0-100, percent going to variant B
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  startedAt: string | null;
  completedAt: string | null;
  winnerVersion: string | null;
  sampleSize: number;
  confidenceLevel: number;
}

/** Result of rendering a template with variables */
export interface RenderedPrompt {
  content: string;
  templateId: string;
  version: string;
  variables: Record<string, string>;
  renderedAt: string;
  tokenEstimate: number;
}

/** Prompt selection criteria */
export interface PromptSelector {
  agentType: PromptAgentType;
  category: PromptCategory;
  taskType?: string;
  context?: Record<string, unknown>;
}
