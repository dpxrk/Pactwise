/**
 * Vendor Agent Prompt Templates
 *
 * Vendor evaluation, performance tracking, relationship scoring,
 * risk assessment, and portfolio analysis.
 */

import type { PromptTemplate } from '../../types.ts';

const META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const vendorTemplates: PromptTemplate[] = [
  // ── System Prompt ─────────────────────────────────────────────────
  {
    id: 'vendor-system',
    agentType: 'vendor',
    category: 'system',
    name: 'Vendor Agent System Prompt',
    description: 'Core system prompt for the Vendor Agent',
    version: '1.0.0',
    template: `You are the Vendor Agent for Pactwise, an enterprise contract management platform.

Your specialization is vendor evaluation, relationship management, and supply chain risk analysis. You combine quantitative scoring with qualitative assessment.

Core capabilities:
- Vendor onboarding evaluation and due diligence
- Performance tracking against SLAs and KPIs
- Relationship health scoring (composite of financial, delivery, communication metrics)
- Vendor risk assessment (operational, financial, compliance, geopolitical)
- Portfolio analysis (concentration, diversity, cost optimization)
- Competitive benchmarking and market positioning

Operating principles:
- Score vendors on a consistent 0-100 scale across all dimensions
- Weight performance metrics by recency (recent performance matters more)
- Consider both quantitative data and qualitative relationship factors
- Flag single-source dependencies and concentration risks
- Compare vendor performance against category benchmarks
- Track improvement or deterioration trends over time
- Consider total cost of switching when recommending vendor changes

Enterprise context: {{enterprise_name}} (ID: {{enterprise_id}})`,
    variables: [
      { name: 'enterprise_name', description: 'Name of the enterprise', required: false, defaultValue: 'Current Enterprise', type: 'string' },
      { name: 'enterprise_id', description: 'Enterprise identifier', required: true, type: 'string' },
    ],
    metadata: { ...META, tags: ['system', 'vendor'], maxTokens: 500, temperature: 0.2 },
  },

  // ── Vendor Evaluation ─────────────────────────────────────────────
  {
    id: 'vendor-evaluation',
    agentType: 'vendor',
    category: 'task',
    name: 'Comprehensive Vendor Evaluation',
    description: 'Full evaluation of a vendor for onboarding or renewal decisions',
    version: '1.0.0',
    template: `Evaluate this vendor for {{evaluation_purpose}}.

Vendor profile:
{{vendor_data}}

Performance history:
{{performance_history}}

Industry benchmarks:
{{industry_benchmarks}}

Evaluate across these dimensions (score 0-100 each):

1. **Financial stability** (weight: 20%)
   - Revenue/size, profitability, credit rating, payment history

2. **Service quality** (weight: 25%)
   - SLA compliance, defect rates, response times, issue resolution

3. **Compliance & security** (weight: 20%)
   - Certifications (SOC2, ISO 27001, etc.), regulatory compliance, data protection

4. **Relationship & communication** (weight: 15%)
   - Responsiveness, account management quality, escalation handling

5. **Innovation & capability** (weight: 10%)
   - Technology roadmap, R&D investment, adaptability to requirements

6. **Cost competitiveness** (weight: 10%)
   - Price vs. market, value for money, cost transparency

Output:
- Dimension scores with evidence
- Weighted composite score
- Rank relative to category peers (if benchmark data available)
- Recommendation: {{evaluation_purpose}} decision with rationale
- Key risks and mitigation strategies
- Improvement areas to discuss with vendor`,
    variables: [
      { name: 'vendor_data', description: 'Vendor profile and company data', required: true, type: 'json' },
      { name: 'performance_history', description: 'Historical performance metrics', required: false, defaultValue: 'No historical data (new vendor)', type: 'string' },
      { name: 'industry_benchmarks', description: 'Category benchmark data', required: false, defaultValue: 'Not available', type: 'string' },
      { name: 'evaluation_purpose', description: 'Purpose: onboarding, renewal, or quarterly review', required: true, type: 'string' },
    ],
    fewShotExamples: [
      {
        input: '{"name":"CloudServ Inc","revenue":"$50M","employees":200,"certifications":["SOC2","ISO27001"],"slaCompliance":96.5,"avgResponseTime":"2h"} Purpose: renewal',
        output: '{"dimensions":{"financialStability":{"score":72,"evidence":"Mid-market revenue, stable growth"},"serviceQuality":{"score":85,"evidence":"96.5% SLA compliance, 2h response time above 90th percentile"},"compliance":{"score":90,"evidence":"SOC2 and ISO27001 certified"},"relationship":{"score":78,"evidence":"Data insufficient for full assessment"},"innovation":{"score":65,"evidence":"No roadmap data provided"},"costCompetitiveness":{"score":70,"evidence":"No benchmark comparison available"}},"compositeScore":79.3,"recommendation":"RENEW with conditions: request technology roadmap, negotiate SLA improvement to 98%","keyRisks":["Single source for cloud hosting","No disaster recovery SLA specified"]}',
        explanation: 'Scored each dimension with available evidence, noted gaps, provided weighted composite, and gave actionable renewal recommendation.',
      },
    ],
    metadata: { ...META, tags: ['evaluation', 'scoring', 'vendor'], maxTokens: 2000, temperature: 0.2 },
  },

  // ── Vendor Risk Assessment ────────────────────────────────────────
  {
    id: 'vendor-risk-assessment',
    agentType: 'vendor',
    category: 'task',
    name: 'Vendor Risk Assessment',
    description: 'Evaluates risk factors associated with a vendor relationship',
    version: '1.0.0',
    template: `Assess the risk profile of this vendor relationship.

Vendor: {{vendor_name}}
Category: {{vendor_category}}
Annual spend: {{annual_spend}}
Contract details: {{contract_summary}}

Risk dimensions to evaluate:
1. **Operational risk**: Service continuity, capacity, single points of failure
2. **Financial risk**: Vendor solvency, going-concern indicators
3. **Compliance risk**: Regulatory exposure, certification gaps
4. **Geopolitical risk**: Location-based risks, sanctions exposure, supply chain disruption
5. **Concentration risk**: Dependency level, alternative availability
6. **Reputational risk**: Public incidents, litigation history

For each dimension:
- Risk level: critical / high / medium / low
- Likelihood: near_certain / likely / possible / unlikely / rare
- Impact if materialized: catastrophic / major / moderate / minor / negligible
- Current mitigations in place
- Recommended additional mitigations

Overall risk rating: 1-100
Risk trend: increasing / stable / decreasing`,
    variables: [
      { name: 'vendor_name', description: 'Vendor name', required: true, type: 'string' },
      { name: 'vendor_category', description: 'Vendor service category', required: true, type: 'string' },
      { name: 'annual_spend', description: 'Annual spend with this vendor', required: true, type: 'string' },
      { name: 'contract_summary', description: 'Summary of current contract terms', required: true, type: 'string' },
    ],
    metadata: { ...META, tags: ['risk', 'assessment', 'vendor'], maxTokens: 2000, temperature: 0.2 },
  },

  // ── Portfolio Analysis ────────────────────────────────────────────
  {
    id: 'vendor-portfolio-analysis',
    agentType: 'vendor',
    category: 'task',
    name: 'Vendor Portfolio Analysis',
    description: 'Analyzes the entire vendor portfolio for optimization opportunities',
    version: '1.0.0',
    template: `Analyze the vendor portfolio for optimization opportunities.

Portfolio data:
{{portfolio_data}}

Analysis areas:
1. **Concentration**: Which categories have single-source risk?
2. **Redundancy**: Are there overlapping vendors providing similar services?
3. **Spend distribution**: Pareto analysis (what % of vendors represent 80% of spend?)
4. **Performance distribution**: Top/bottom performers by category
5. **Contract alignment**: Misaligned terms, expiration clustering
6. **Consolidation opportunities**: Where can vendors be consolidated for better terms?
7. **Diversity metrics**: Geographic, size, and capability diversity

Output a prioritized list of optimization actions with estimated savings.`,
    variables: [
      { name: 'portfolio_data', description: 'Full vendor portfolio dataset', required: true, type: 'json' },
    ],
    metadata: { ...META, tags: ['portfolio', 'optimization', 'vendor'], maxTokens: 2000, temperature: 0.3 },
  },
];
