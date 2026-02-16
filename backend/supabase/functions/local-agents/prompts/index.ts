/**
 * Prompt Engineering System — Public API
 *
 * Main entry point for the prompt template library.
 * Re-exports all types, utilities, and the template registry.
 */

// Core types
export type {
  PromptTemplate,
  PromptAgentType,
  PromptCategory,
  PromptSelector,
  PromptVersion,
  PromptPerformanceMetrics,
  PromptABTest,
  RenderedPrompt,
  FewShotExample,
  ChainOfThoughtStep,
  ChainOfThoughtTemplate,
  TemplateVariable,
} from './types.ts';

// Template registry (main access point)
export { TemplateRegistry, getTemplateRegistry } from './template-registry.ts';

// Template rendering utilities
export {
  renderTemplate,
  substituteVariables,
  formatFewShotExamples,
  formatChainOfThought,
  estimateTokens,
} from './template-renderer.ts';

// Version management
export { PromptVersionManager } from './version-manager.ts';

// Few-shot example library
export { getFewShotByTags, getFewShotByCategory } from './few-shot/index.ts';
