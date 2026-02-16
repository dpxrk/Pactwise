/**
 * Legal Agent Prompt Templates
 *
 * Clause analysis, risk assessment, compliance checking, and legal review.
 */

import type { PromptTemplate } from '../../types.ts';

const META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const legalTemplates: PromptTemplate[] = [
  // ── System Prompt ─────────────────────────────────────────────────
  {
    id: 'legal-system',
    agentType: 'legal',
    category: 'system',
    name: 'Legal Agent System Prompt',
    description: 'Core system prompt for the Legal Agent',
    version: '1.0.0',
    template: `You are the Legal Agent for Pactwise, an enterprise contract management platform.

Your specialization is legal analysis of contracts, compliance assessment, and risk identification. You reason like an experienced contracts attorney — thorough, precise, and conservative in risk assessment.

Core capabilities:
- Clause-by-clause contract analysis
- Legal risk identification and scoring
- Compliance checking against regulatory frameworks
- Non-standard clause detection
- Obligation tracking and deadline identification
- Negotiation position analysis

Operating principles:
- NEVER provide legal advice — frame all output as "analysis" and "observations" for review by qualified counsel
- Flag non-standard or unusual clauses explicitly
- Compare clauses against enterprise standard positions when available
- Identify missing standard clauses that should be present
- Use precise legal terminology but explain implications in plain language
- Always err on the side of flagging potential risks (false positives > false negatives)
- Track jurisdiction-specific requirements for {{jurisdiction}}

Enterprise context: {{enterprise_name}} (ID: {{enterprise_id}})
Primary jurisdiction: {{jurisdiction}}`,
    variables: [
      { name: 'enterprise_name', description: 'Name of the enterprise', required: false, defaultValue: 'Current Enterprise', type: 'string' },
      { name: 'enterprise_id', description: 'Enterprise identifier', required: true, type: 'string' },
      { name: 'jurisdiction', description: 'Primary legal jurisdiction', required: false, defaultValue: 'United States', type: 'string' },
    ],
    metadata: { ...META, tags: ['system', 'legal'], maxTokens: 600, temperature: 0.1 },
  },

  // ── Clause Analysis ───────────────────────────────────────────────
  {
    id: 'legal-clause-analysis',
    agentType: 'legal',
    category: 'task',
    name: 'Contract Clause Analysis',
    description: 'Detailed analysis of individual contract clauses',
    version: '1.0.0',
    template: `Analyze the following contract clauses.

Contract clauses:
{{clauses_text}}

Contract type: {{contract_type}}
Counterparty: {{counterparty_name}}

For each clause, analyze:
1. **Classification**: What type of clause is this? (indemnification, limitation of liability, termination, IP, confidentiality, warranty, force majeure, assignment, etc.)
2. **Risk level**: critical / high / medium / low / informational
3. **Position analysis**: Does this favor our enterprise, the counterparty, or is it balanced?
4. **Standard vs. non-standard**: How does this compare to typical market terms?
5. **Key obligations**: What specific obligations does this create for each party?
6. **Deadlines/triggers**: Any time-bound requirements or triggering events?
7. **Recommendations**: Suggested modifications or negotiation points

Flag any clauses that:
- Create unlimited liability exposure
- Contain broad indemnification without carve-outs
- Allow unilateral modification of terms
- Lack standard protections (e.g., no force majeure, no IP ownership clause)
- Contain automatic renewal without notification requirements`,
    variables: [
      { name: 'clauses_text', description: 'The contract clause text to analyze', required: true, type: 'string' },
      { name: 'contract_type', description: 'Type of contract (MSA, SOW, NDA, etc.)', required: true, type: 'string' },
      { name: 'counterparty_name', description: 'Name of the counterparty', required: true, type: 'string' },
    ],
    fewShotExamples: [
      {
        input: 'Clause: "Vendor shall indemnify and hold harmless Client from any and all claims, damages, losses, costs, and expenses arising from or related to Vendor\'s performance of Services." Contract type: MSA',
        output: '{"classification":"indemnification","riskLevel":"medium","positionAnalysis":"favors_enterprise","standardAssessment":"Broad but fairly standard vendor indemnification. Missing: (1) cap on indemnification, (2) notice requirements for claims, (3) control-of-defense provision, (4) mutual indemnification for enterprise IP infringement.","obligations":[{"party":"vendor","obligation":"Indemnify client for all claims related to service performance","deadline":"ongoing"}],"recommendations":["Add indemnification cap tied to contract value","Include notice and cooperation requirements","Add mutual indemnification for enterprise-provided materials","Specify control-of-defense and settlement rights"]}',
        explanation: 'This is a one-way vendor indemnification clause. While it favors the enterprise, it lacks standard protective provisions that both parties should want.',
      },
    ],
    metadata: { ...META, tags: ['clause-analysis', 'risk', 'legal'], maxTokens: 2000, temperature: 0.1 },
  },

  // ── Compliance Check ──────────────────────────────────────────────
  {
    id: 'legal-compliance-check',
    agentType: 'legal',
    category: 'task',
    name: 'Regulatory Compliance Check',
    description: 'Checks contract terms against regulatory requirements',
    version: '1.0.0',
    template: `Check this contract for compliance with applicable regulations.

Contract summary:
{{contract_summary}}

Applicable regulations: {{applicable_regulations}}
Industry: {{industry}}
Data handling: {{data_handling_scope}}

Check compliance with:
1. **Data protection**: GDPR, CCPA, or applicable privacy laws
   - Data processing agreements present?
   - Data transfer mechanisms (SCCs, adequacy decisions)?
   - Data breach notification requirements?
   - Right to audit?

2. **Industry-specific**: {{industry}} regulations
   - Required certifications mentioned?
   - Specific compliance clauses present?

3. **Anti-corruption**: FCPA, UK Bribery Act
   - Anti-corruption representations?
   - Audit rights for compliance?

4. **Export controls**: If applicable
   - Technology transfer restrictions?
   - Sanctioned party screening?

5. **Accessibility**: Section 508, WCAG (if applicable)

For each area:
- Status: compliant / partially_compliant / non_compliant / not_applicable
- Gaps: Specific missing clauses or terms
- Remediation: What needs to be added or modified
- Risk if unaddressed: Potential regulatory exposure`,
    variables: [
      { name: 'contract_summary', description: 'Summary of contract terms', required: true, type: 'string' },
      { name: 'applicable_regulations', description: 'List of applicable regulations', required: true, type: 'string' },
      { name: 'industry', description: 'Industry sector', required: true, type: 'string' },
      { name: 'data_handling_scope', description: 'Scope of data handling in the agreement', required: false, defaultValue: 'Not specified', type: 'string' },
    ],
    metadata: { ...META, tags: ['compliance', 'regulatory', 'legal'], maxTokens: 2000, temperature: 0.1 },
  },

  // ── Non-Standard Clause Detection ─────────────────────────────────
  {
    id: 'legal-nonstandard-detection',
    agentType: 'legal',
    category: 'task',
    name: 'Non-Standard Clause Detection',
    description: 'Identifies clauses that deviate from enterprise standard positions',
    version: '1.0.0',
    template: `Compare these contract clauses against our enterprise standard positions.

Contract clauses:
{{contract_clauses}}

Enterprise standard positions:
{{standard_positions}}

For each clause, determine:
1. Is this clause present in our standards? (yes/no/partial)
2. If present, does it match our standard position? (matches/deviates/contradicts)
3. Deviation severity: minor (wording differences) / moderate (substantive differences) / major (opposes our position)
4. Specific deviations with exact text comparison
5. Recommended action: accept / negotiate / reject / escalate_to_counsel

Also identify:
- Standard clauses MISSING from this contract
- Novel clauses not in our standards that need review
- Clauses that may have been modified from a previous version`,
    variables: [
      { name: 'contract_clauses', description: 'The contract clauses to check', required: true, type: 'string' },
      { name: 'standard_positions', description: 'Enterprise standard clause positions', required: true, type: 'json' },
    ],
    metadata: { ...META, tags: ['non-standard', 'comparison', 'legal'], maxTokens: 2000, temperature: 0.1 },
  },
];
