/**
 * Chain-of-Thought Templates
 *
 * Step-by-step reasoning templates for complex agent tasks.
 * These guide the model through structured reasoning processes.
 */

import type { ChainOfThoughtTemplate } from '../types.ts';

export const chainOfThoughtTemplates: ChainOfThoughtTemplate[] = [
  // ── Contract Risk Analysis CoT ────────────────────────────────────
  {
    id: 'cot-contract-risk-analysis',
    name: 'Contract Risk Analysis Chain-of-Thought',
    agentType: 'legal',
    preamble: 'Analyze the contract risk step by step. Think through each stage carefully before moving to the next.',
    steps: [
      {
        stepNumber: 1,
        instruction: 'Identify all parties and their roles in the agreement. Note any third-party beneficiaries or guarantors.',
        expectedOutput: 'List of parties with roles and relationships',
        validationCriteria: 'At least 2 parties identified with clear roles',
      },
      {
        stepNumber: 2,
        instruction: 'Enumerate all obligations created by the contract for each party. Distinguish between conditions precedent, concurrent conditions, and conditions subsequent.',
        expectedOutput: 'Structured list of obligations per party with obligation type',
        validationCriteria: 'Each obligation has a responsible party and timeline',
      },
      {
        stepNumber: 3,
        instruction: 'For each obligation, assess the risk of non-performance. Consider: likelihood of breach, severity of impact, available remedies, and mitigation measures in the contract.',
        expectedOutput: 'Risk matrix: obligation × likelihood × impact × remedy availability',
        validationCriteria: 'Each risk has both likelihood and impact assessment',
      },
      {
        stepNumber: 4,
        instruction: 'Identify cross-clause interactions. Look for: conflicting terms, circular dependencies, ambiguous references, and gaps where standard protections are missing.',
        expectedOutput: 'List of clause interactions and potential conflicts',
        validationCriteria: 'At least checked for: liability caps vs indemnity, termination vs payment, IP vs confidentiality',
      },
      {
        stepNumber: 5,
        instruction: 'Synthesize into an overall risk profile. Weight risks by both probability and impact. Identify the top 3 risks that require immediate attention and provide specific mitigation recommendations.',
        expectedOutput: 'Prioritized risk summary with actionable mitigations',
        validationCriteria: 'Top risks are specific (not generic) and mitigations are contract-specific',
      },
    ],
    conclusion: 'Present your final risk assessment with confidence score, noting any areas where additional information would materially change the analysis.',
  },

  // ── Financial Impact CoT ──────────────────────────────────────────
  {
    id: 'cot-financial-impact',
    name: 'Financial Impact Assessment Chain-of-Thought',
    agentType: 'financial',
    preamble: 'Calculate the financial impact step by step. Show all calculations and state all assumptions explicitly.',
    steps: [
      {
        stepNumber: 1,
        instruction: 'Extract all monetary values from the input. Normalize to the same currency and time basis (annual). List any values that are estimated vs. explicit.',
        expectedOutput: 'Table of monetary values with source, currency, period, and certainty level',
        validationCriteria: 'All values have a source reference and certainty indicator',
      },
      {
        stepNumber: 2,
        instruction: 'Calculate direct costs: base fees, recurring charges, one-time costs. Show the formula for each calculation.',
        expectedOutput: 'Itemized direct cost breakdown with formulas',
        validationCriteria: 'Totals are verifiable from the component calculations',
      },
      {
        stepNumber: 3,
        instruction: 'Estimate indirect costs: implementation effort, operational overhead, opportunity costs, transition costs. State assumptions for each estimate.',
        expectedOutput: 'Itemized indirect costs with stated assumptions',
        validationCriteria: 'Each indirect cost has a stated basis/assumption',
      },
      {
        stepNumber: 4,
        instruction: 'Project multi-year costs including escalation clauses, renewal terms, and inflation. Calculate NPV using the specified discount rate.',
        expectedOutput: 'Year-by-year projection table and NPV calculation',
        validationCriteria: 'NPV calculation shows the discount factor applied to each year',
      },
      {
        stepNumber: 5,
        instruction: 'Compare against alternatives: do nothing, renegotiate, switch vendor. For each alternative, estimate the delta in total cost and qualitative trade-offs.',
        expectedOutput: 'Comparison matrix of options with cost and qualitative factors',
        validationCriteria: 'At least 2 alternatives compared with both cost and non-cost factors',
      },
    ],
    conclusion: 'Provide a clear recommendation with the financial case supporting it. Include sensitivity analysis: how would the conclusion change if key assumptions vary by ±20%?',
  },

  // ── Vendor Evaluation CoT ─────────────────────────────────────────
  {
    id: 'cot-vendor-evaluation',
    name: 'Vendor Evaluation Chain-of-Thought',
    agentType: 'vendor',
    preamble: 'Evaluate this vendor systematically. Consider each dimension independently before synthesizing.',
    steps: [
      {
        stepNumber: 1,
        instruction: 'Gather and organize available data about the vendor. Identify what data is available vs. missing for each evaluation dimension.',
        expectedOutput: 'Data availability matrix per dimension',
        validationCriteria: 'Each of the 6 evaluation dimensions has data availability assessed',
      },
      {
        stepNumber: 2,
        instruction: 'Score each dimension independently on the 0-100 scale. For dimensions with missing data, use a conservative estimate and flag the uncertainty.',
        expectedOutput: 'Dimension scores with evidence citations and confidence levels',
        validationCriteria: 'Scores are justified by specific data points, not generic statements',
      },
      {
        stepNumber: 3,
        instruction: 'Identify relationships between dimensions. A strong financial position may mitigate operational risk; poor communication may indicate deeper capability issues.',
        expectedOutput: 'Cross-dimension insights and risk correlations',
        validationCriteria: 'At least 2 cross-dimension relationships identified',
      },
      {
        stepNumber: 4,
        instruction: 'Calculate the weighted composite score. Then stress-test: if the weakest dimension deteriorated by 20 points, would the overall recommendation change?',
        expectedOutput: 'Composite score + sensitivity analysis',
        validationCriteria: 'Sensitivity analysis explicitly addresses whether recommendation holds',
      },
    ],
    conclusion: 'Deliver the final vendor assessment with a clear recommendation (approve/conditional approve/reject), key conditions, and monitoring plan for identified risks.',
  },

  // ── Task Decomposition CoT ────────────────────────────────────────
  {
    id: 'cot-task-decomposition',
    name: 'Multi-Agent Task Decomposition Chain-of-Thought',
    agentType: 'manager',
    preamble: 'Decompose this request into an optimal execution plan. Think about agent capabilities, dependencies, and parallelism.',
    steps: [
      {
        stepNumber: 1,
        instruction: 'Parse the user request to identify all distinct information needs and actions required. List each as a discrete task.',
        expectedOutput: 'Numbered list of discrete tasks with expected output type',
        validationCriteria: 'Tasks are atomic (cannot be meaningfully decomposed further)',
      },
      {
        stepNumber: 2,
        instruction: 'For each task, identify the best-suited agent based on the task domain and required capabilities. If a task spans multiple domains, split it.',
        expectedOutput: 'Task-to-agent mapping with justification',
        validationCriteria: 'Each task maps to exactly one agent',
      },
      {
        stepNumber: 3,
        instruction: 'Identify dependencies: which tasks need output from other tasks as input? Build a dependency graph. Maximize parallelism by minimizing unnecessary sequential chains.',
        expectedOutput: 'Dependency graph (task ID → depends on task IDs)',
        validationCriteria: 'No circular dependencies; parallel opportunities identified',
      },
      {
        stepNumber: 4,
        instruction: 'Estimate the critical path duration. Identify bottlenecks and consider if any can be mitigated (e.g., starting a task with partial input).',
        expectedOutput: 'Critical path with time estimates and optimization opportunities',
        validationCriteria: 'Total time accounts for parallel execution',
      },
    ],
    conclusion: 'Output the final execution plan as a structured task list with parallel groups, dependencies, and expected total duration.',
  },

  // ── Document Analysis CoT ─────────────────────────────────────────
  {
    id: 'cot-document-analysis',
    name: 'Document Analysis Chain-of-Thought',
    agentType: 'secretary',
    preamble: 'Analyze this document methodically. Extract information layer by layer.',
    steps: [
      {
        stepNumber: 1,
        instruction: 'Determine the document type and structure. Identify sections, headers, and the overall organization pattern.',
        expectedOutput: 'Document type classification and structural outline',
        validationCriteria: 'Document type identified with confidence score',
      },
      {
        stepNumber: 2,
        instruction: 'Extract factual metadata: parties, dates, reference numbers, addresses, and other concrete identifiers. Distinguish between explicitly stated and inferred values.',
        expectedOutput: 'Metadata table with source locations and certainty levels',
        validationCriteria: 'Each value has explicit/inferred tag and location reference',
      },
      {
        stepNumber: 3,
        instruction: 'Identify the substantive content: key terms, obligations, rights, conditions, and exceptions. Note any ambiguous language.',
        expectedOutput: 'Structured extraction of substantive content',
        validationCriteria: 'Ambiguous terms are flagged rather than resolved by assumption',
      },
      {
        stepNumber: 4,
        instruction: 'Cross-reference internally: are there contradictions between sections? Do referenced documents or clauses exist within the text?',
        expectedOutput: 'Internal consistency report',
        validationCriteria: 'Cross-references checked between at least 3 sections',
      },
    ],
    conclusion: 'Provide the final extraction with overall quality score and list of items requiring human verification.',
  },

  // ── Anomaly Investigation CoT ─────────────────────────────────────
  {
    id: 'cot-anomaly-investigation',
    name: 'Spending Anomaly Investigation Chain-of-Thought',
    agentType: 'analytics',
    preamble: 'Investigate this anomaly systematically. Determine whether it represents a genuine issue or an expected variation.',
    steps: [
      {
        stepNumber: 1,
        instruction: 'Characterize the anomaly: what metric deviated, by how much, and over what time period? Calculate the Z-score against historical baselines.',
        expectedOutput: 'Anomaly characterization with statistical significance',
        validationCriteria: 'Z-score or equivalent statistical measure provided',
      },
      {
        stepNumber: 2,
        instruction: 'Identify potential explanations. Consider: seasonal patterns, one-time events (new contract, early payment), data quality issues, and genuine overspend.',
        expectedOutput: 'Ranked list of possible explanations with likelihood',
        validationCriteria: 'At least 3 hypotheses considered',
      },
      {
        stepNumber: 3,
        instruction: 'For each hypothesis, identify what evidence would confirm or refute it. Check available data against each hypothesis.',
        expectedOutput: 'Evidence assessment per hypothesis',
        validationCriteria: 'Each hypothesis has supporting or refuting evidence cited',
      },
      {
        stepNumber: 4,
        instruction: 'Determine the most likely explanation and the appropriate response: no action, monitor, investigate further, or escalate.',
        expectedOutput: 'Conclusion with recommended action and confidence level',
        validationCriteria: 'Recommendation is proportionate to the severity and confidence',
      },
    ],
    conclusion: 'Report the finding with the determination (true anomaly / false positive / inconclusive) and next steps.',
  },
];
