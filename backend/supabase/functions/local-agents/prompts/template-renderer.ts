/**
 * Template Renderer
 *
 * Renders prompt templates by substituting variables and assembling
 * few-shot examples, chain-of-thought steps, and memory context.
 */

import type {
  PromptTemplate,
  FewShotExample,
  ChainOfThoughtTemplate,
  RenderedPrompt,
  TemplateVariable,
} from './types.ts';

/** Estimates token count from text (rough approximation: ~4 chars per token) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Generates a SHA-256 hex digest (used for cache keys) */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Substitutes {{variable}} placeholders in a template string.
 * Throws if a required variable is missing.
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string>,
  variableDefs: TemplateVariable[],
): string {
  let result = template;

  for (const def of variableDefs) {
    const placeholder = `{{${def.name}}}`;
    const value = variables[def.name] ?? def.defaultValue;

    if (value === undefined && def.required) {
      throw new Error(`Missing required template variable: ${def.name}`);
    }

    if (value !== undefined) {
      result = result.replaceAll(placeholder, value);
    }
  }

  // Warn about unresolved placeholders
  const unresolvedMatch = result.match(/\{\{(\w+)\}\}/g);
  if (unresolvedMatch) {
    console.warn(`Unresolved template placeholders: ${unresolvedMatch.join(', ')}`);
  }

  return result;
}

/**
 * Formats few-shot examples into a prompt section.
 */
export function formatFewShotExamples(
  examples: FewShotExample[],
  maxExamples?: number,
): string {
  const selected = maxExamples ? examples.slice(0, maxExamples) : examples;
  if (selected.length === 0) return '';

  const formatted = selected.map((ex, i) => {
    let block = `--- Example ${i + 1} ---\nInput: ${ex.input}\nOutput: ${ex.output}`;
    if (ex.explanation) {
      block += `\nReasoning: ${ex.explanation}`;
    }
    return block;
  }).join('\n\n');

  return `\nHere are examples of expected behavior:\n\n${formatted}\n\n--- End Examples ---\n`;
}

/**
 * Formats chain-of-thought steps into a reasoning prompt.
 */
export function formatChainOfThought(cot: ChainOfThoughtTemplate): string {
  const steps = cot.steps.map(step =>
    `Step ${step.stepNumber}: ${step.instruction}\n  Expected: ${step.expectedOutput}`
  ).join('\n\n');

  return `${cot.preamble}\n\nFollow these reasoning steps:\n\n${steps}\n\n${cot.conclusion}`;
}

/**
 * Renders a full prompt template with all components assembled.
 */
export function renderTemplate(
  template: PromptTemplate,
  variables: Record<string, string>,
  options?: {
    maxFewShotExamples?: number;
    chainOfThought?: ChainOfThoughtTemplate;
    memoryContext?: string;
    additionalContext?: string;
  },
): RenderedPrompt {
  // 1. Substitute variables in the main template
  let content = substituteVariables(
    template.template,
    variables,
    template.variables,
  );

  // 2. Append few-shot examples if present
  if (template.fewShotExamples && template.fewShotExamples.length > 0) {
    content += formatFewShotExamples(
      template.fewShotExamples,
      options?.maxFewShotExamples,
    );
  }

  // 3. Append chain-of-thought if provided
  if (options?.chainOfThought) {
    content += '\n' + formatChainOfThought(options.chainOfThought);
  }

  // 4. Append memory context
  if (options?.memoryContext) {
    content += `\n\nRelevant context from memory:\n${options.memoryContext}`;
  }

  // 5. Append additional context
  if (options?.additionalContext) {
    content += `\n\n${options.additionalContext}`;
  }

  return {
    content,
    templateId: template.id,
    version: template.version,
    variables,
    renderedAt: new Date().toISOString(),
    tokenEstimate: estimateTokens(content),
  };
}

export { estimateTokens, hashContent };
