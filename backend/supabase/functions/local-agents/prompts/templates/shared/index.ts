/**
 * Shared Prompt Templates
 *
 * Common templates used across all agent types for shared reasoning
 * patterns, output formatting, and error handling.
 */

import type { PromptTemplate } from '../../types.ts';

const SHARED_META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const sharedTemplates: PromptTemplate[] = [
  // ── Confidence Scoring ────────────────────────────────────────────
  {
    id: 'shared-confidence-scoring',
    agentType: 'manager' as const, // shared templates stored under manager
    category: 'task',
    name: 'Confidence Scoring',
    description: 'Appended to any task prompt to request structured confidence assessment',
    version: '1.0.0',
    template: `After completing your analysis, provide a confidence assessment:

<confidence>
- Overall confidence: [0.0-1.0]
- Data quality: [high/medium/low] — {{data_quality_context}}
- Reasoning certainty: [high/medium/low] — How certain are you about the logical steps?
- Key assumptions: List any assumptions made
- Caveats: Note any limitations or edge cases
</confidence>

If your overall confidence is below 0.6, explicitly flag areas of uncertainty and recommend human review.`,
    variables: [
      { name: 'data_quality_context', description: 'Context about input data quality', required: false, defaultValue: 'Based on completeness and recency of input data', type: 'string' },
    ],
    metadata: { ...SHARED_META, tags: ['confidence', 'shared', 'quality'] },
  },

  // ── Structured Output ─────────────────────────────────────────────
  {
    id: 'shared-structured-output',
    agentType: 'manager' as const,
    category: 'task',
    name: 'Structured JSON Output',
    description: 'Instructs the model to output structured JSON matching a schema',
    version: '1.0.0',
    template: `You MUST respond with valid JSON matching this schema:

{{json_schema}}

Rules:
- Output ONLY the JSON object, no markdown fences or explanations
- All required fields must be present
- Use null for optional fields you cannot determine
- Ensure all string values are properly escaped`,
    variables: [
      { name: 'json_schema', description: 'The JSON schema the output must match', required: true, type: 'json' },
    ],
    metadata: { ...SHARED_META, tags: ['output', 'json', 'structured', 'shared'] },
  },

  // ── Error Recovery ────────────────────────────────────────────────
  {
    id: 'shared-error-recovery',
    agentType: 'manager' as const,
    category: 'task',
    name: 'Error Recovery',
    description: 'Graceful degradation when primary analysis fails',
    version: '1.0.0',
    template: `The previous analysis attempt encountered an issue: {{error_description}}

Please attempt a recovery:
1. Identify what information is still available
2. Determine if a partial analysis is possible
3. If partial analysis is possible, provide it with clear caveats about what is missing
4. If analysis is not possible, explain exactly what is needed

Always prefer a partial result with clearly stated limitations over no result.`,
    variables: [
      { name: 'error_description', description: 'Description of the error that occurred', required: true, type: 'string' },
    ],
    metadata: { ...SHARED_META, tags: ['error', 'recovery', 'shared'] },
  },

  // ── Self-Consistency Check ────────────────────────────────────────
  {
    id: 'shared-self-consistency',
    agentType: 'manager' as const,
    category: 'self-consistency',
    name: 'Self-Consistency Verification',
    description: 'Prompts the model to verify its own output for internal consistency',
    version: '1.0.0',
    template: `Before finalizing your response, perform a self-consistency check:

1. Re-read your analysis from the perspective of a skeptical reviewer
2. Verify that:
   - All numerical values are internally consistent (totals match sums, percentages add up)
   - Recommendations align with the identified risks/findings
   - No contradictions exist between different sections
   - Evidence supports each claim made
3. If you find any inconsistency, correct it and note the correction

Previous analysis to verify:
{{previous_analysis}}`,
    variables: [
      { name: 'previous_analysis', description: 'The analysis output to verify', required: true, type: 'string' },
    ],
    metadata: { ...SHARED_META, tags: ['self-consistency', 'verification', 'shared'] },
  },

  // ── Multi-Perspective Analysis ────────────────────────────────────
  {
    id: 'shared-multi-perspective',
    agentType: 'manager' as const,
    category: 'refinement',
    name: 'Multi-Perspective Analysis',
    description: 'Analyzes a topic from multiple viewpoints to ensure comprehensive coverage',
    version: '1.0.0',
    template: `Analyze the following from multiple perspectives:

Topic: {{topic}}

Perspectives to consider:
1. **Risk perspective**: What could go wrong? What are the vulnerabilities?
2. **Opportunity perspective**: What benefits or advantages exist?
3. **Compliance perspective**: Does this meet regulatory and contractual requirements?
4. **Financial perspective**: What are the cost implications?
5. **Operational perspective**: How does this affect day-to-day operations?

For each perspective, provide:
- Key findings (2-3 bullet points)
- Risk level (low/medium/high)
- Recommended actions

Then synthesize across perspectives into a unified recommendation.`,
    variables: [
      { name: 'topic', description: 'The topic or item to analyze', required: true, type: 'string' },
    ],
    metadata: { ...SHARED_META, tags: ['multi-perspective', 'shared', 'analysis'] },
  },
];
