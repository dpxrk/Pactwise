/**
 * Financial Agent Prompt Templates
 *
 * Cost analysis, payment terms extraction, budget impact assessment,
 * financial risk evaluation, and spend analytics.
 */

import type { PromptTemplate } from '../../types.ts';

const META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const financialTemplates: PromptTemplate[] = [
  // ── System Prompt ─────────────────────────────────────────────────
  {
    id: 'financial-system',
    agentType: 'financial',
    category: 'system',
    name: 'Financial Agent System Prompt',
    description: 'Core system prompt for the Financial Agent',
    version: '1.0.0',
    template: `You are the Financial Agent for Pactwise, an enterprise contract management platform.

Your specialization is financial analysis of contracts, vendor agreements, and enterprise spending. You combine quantitative rigor with business context.

Core capabilities:
- Payment terms extraction and analysis
- Total cost of ownership (TCO) calculation
- Budget impact assessment and forecasting
- Financial risk evaluation (credit risk, currency risk, concentration risk)
- Spend analytics and anomaly detection
- Contract value optimization and negotiation insights

Operating principles:
- Always show your calculations — no black-box numbers
- Use consistent currency (normalize to {{base_currency}} when comparing)
- Apply time value of money for multi-year contracts
- Flag financial anomalies (Z-score > 2.5 from historical patterns)
- Compare against industry benchmarks when available
- Distinguish between committed spend, forecasted spend, and contingent liabilities
- Report all monetary values with 2 decimal places

Enterprise context: {{enterprise_name}} (ID: {{enterprise_id}})
Budget year: {{budget_year}}`,
    variables: [
      { name: 'enterprise_name', description: 'Name of the enterprise', required: false, defaultValue: 'Current Enterprise', type: 'string' },
      { name: 'enterprise_id', description: 'Enterprise identifier', required: true, type: 'string' },
      { name: 'base_currency', description: 'Base currency for normalization', required: false, defaultValue: 'USD', type: 'string' },
      { name: 'budget_year', description: 'Current budget year', required: false, defaultValue: '2026', type: 'string' },
    ],
    metadata: { ...META, tags: ['system', 'financial'], maxTokens: 600, temperature: 0.1 },
  },

  // ── Cost Analysis ─────────────────────────────────────────────────
  {
    id: 'financial-cost-analysis',
    agentType: 'financial',
    category: 'task',
    name: 'Contract Cost Analysis',
    description: 'Deep analysis of contract financial terms and total cost of ownership',
    version: '1.0.0',
    template: `Perform a comprehensive cost analysis of this contract.

Contract financial data:
{{contract_financial_data}}

Historical spending context:
{{historical_context}}

Analysis required:
1. **Direct costs**: Base fees, per-unit costs, minimum commitments
2. **Hidden costs**: Implementation fees, training, transition costs, exit costs
3. **Variable costs**: Usage-based charges, overage penalties, escalation clauses
4. **Total Cost of Ownership**:
   - Year 1 cost (including one-time fees)
   - Annual recurring cost
   - {{contract_term_years}}-year TCO
   - NPV at {{discount_rate}}% discount rate
5. **Cost comparison**: Compare against historical average for similar contracts
6. **Optimization opportunities**: Where can costs be reduced or terms improved?
7. **Risk factors**: Cost escalation risks, hidden penalties, FX exposure

Show all calculations step by step.`,
    variables: [
      { name: 'contract_financial_data', description: 'Extracted financial terms from the contract', required: true, type: 'json' },
      { name: 'historical_context', description: 'Historical spending data for context', required: false, defaultValue: 'No historical data available', type: 'string' },
      { name: 'contract_term_years', description: 'Contract duration in years', required: false, defaultValue: '3', type: 'number' },
      { name: 'discount_rate', description: 'Discount rate for NPV calculation', required: false, defaultValue: '8', type: 'number' },
    ],
    fewShotExamples: [
      {
        input: '{"baseFee": 10000, "perUserFee": 50, "users": 200, "implementationFee": 25000, "annualEscalation": "3%", "termYears": 3}',
        output: '{"directCosts":{"monthlyBase":10000,"monthlyPerUser":10000,"monthlyTotal":20000},"year1":{"recurring":240000,"oneTime":25000,"total":265000},"year2":{"recurring":247200,"note":"3% escalation"},"year3":{"recurring":254616},"tco3Year":766816,"npv8pct":706543.21,"optimizationOpportunities":["Negotiate cap on annual escalation at 2%","Bulk user discount above 150 users","Waive implementation fee for 3-year commitment"]}',
        explanation: 'Calculated monthly costs, applied 3% annual escalation, computed 3-year TCO, and NPV at 8%. Identified three negotiation levers.',
      },
    ],
    metadata: { ...META, tags: ['cost-analysis', 'tco', 'financial'], maxTokens: 2000, temperature: 0.1 },
  },

  // ── Budget Impact Assessment ──────────────────────────────────────
  {
    id: 'financial-budget-impact',
    agentType: 'financial',
    category: 'task',
    name: 'Budget Impact Assessment',
    description: 'Assesses how a contract or change affects enterprise budgets',
    version: '1.0.0',
    template: `Assess the budget impact of this contract/change.

Proposed spend:
{{proposed_spend}}

Current budget status:
- Department: {{department}}
- Annual budget: {{annual_budget}}
- YTD spend: {{ytd_spend}}
- Remaining budget: {{remaining_budget}}
- Committed (signed, not yet invoiced): {{committed_spend}}

Analysis:
1. **Immediate impact**: How does this affect the current budget period?
2. **Available headroom**: Remaining budget minus committed minus proposed
3. **Budget utilization**: Current % and projected % after this commitment
4. **Approval requirements**: Based on amount thresholds, who needs to approve?
5. **Alternatives**: If budget is insufficient, suggest timing or phasing options
6. **Forecast impact**: How does this affect the next 4 quarters?

Flag if budget utilization exceeds {{warning_threshold}}%.`,
    variables: [
      { name: 'proposed_spend', description: 'The proposed spending amount and schedule', required: true, type: 'json' },
      { name: 'department', description: 'Department name', required: true, type: 'string' },
      { name: 'annual_budget', description: 'Total annual budget', required: true, type: 'string' },
      { name: 'ytd_spend', description: 'Year-to-date spending', required: true, type: 'string' },
      { name: 'remaining_budget', description: 'Remaining budget for the period', required: true, type: 'string' },
      { name: 'committed_spend', description: 'Committed but not yet invoiced amount', required: false, defaultValue: '0', type: 'string' },
      { name: 'warning_threshold', description: 'Budget utilization warning threshold percentage', required: false, defaultValue: '80', type: 'number' },
    ],
    metadata: { ...META, tags: ['budget', 'impact', 'financial'], maxTokens: 1500, temperature: 0.1 },
  },

  // ── Financial Risk Assessment ─────────────────────────────────────
  {
    id: 'financial-risk-assessment',
    agentType: 'financial',
    category: 'task',
    name: 'Financial Risk Assessment',
    description: 'Evaluates financial risks in contract terms',
    version: '1.0.0',
    template: `Evaluate the financial risks in this contract.

Contract terms:
{{contract_terms}}

Vendor financial profile:
{{vendor_profile}}

Assess these risk categories:

1. **Payment risk**: Unfavorable payment terms, prepayment requirements, no refund clauses
2. **Escalation risk**: Uncapped price increases, automatic renewals at higher rates
3. **Concentration risk**: Dependency on single vendor for critical services
4. **Currency risk**: Multi-currency exposure, no FX hedging provisions
5. **Termination risk**: Penalties for early termination, lock-in clauses
6. **Credit risk**: Vendor financial stability, bankruptcy exposure

For each risk:
- Severity: critical / high / medium / low
- Probability: likely / possible / unlikely
- Financial exposure: Estimated dollar impact
- Mitigation: Recommended contract changes or hedging strategies

Overall financial risk score: 1-100 (higher = more risk)`,
    variables: [
      { name: 'contract_terms', description: 'Relevant financial contract terms', required: true, type: 'json' },
      { name: 'vendor_profile', description: 'Vendor financial profile data', required: false, defaultValue: 'Not available', type: 'string' },
    ],
    metadata: { ...META, tags: ['risk', 'assessment', 'financial'], maxTokens: 2000, temperature: 0.2 },
  },
];
