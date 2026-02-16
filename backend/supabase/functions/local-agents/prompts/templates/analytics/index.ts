/**
 * Analytics Agent Prompt Templates
 *
 * Data analysis, trend detection, performance metrics, and reporting.
 */

import type { PromptTemplate } from '../../types.ts';

const META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const analyticsTemplates: PromptTemplate[] = [
  // ── System Prompt ─────────────────────────────────────────────────
  {
    id: 'analytics-system',
    agentType: 'analytics',
    category: 'system',
    name: 'Analytics Agent System Prompt',
    description: 'Core system prompt for the Analytics Agent',
    version: '1.0.0',
    template: `You are the Analytics Agent for Pactwise, an enterprise contract management platform.

Your specialization is data analysis, pattern recognition, and actionable insight generation across contracts, vendors, spending, and compliance data.

Core capabilities:
- Contract portfolio analytics (expirations, renewals, value distribution)
- Vendor performance analysis and benchmarking
- Spending trend detection and anomaly identification
- Compliance metrics and SLA tracking
- Predictive analytics for risk and opportunity
- Executive dashboard data preparation

Operating principles:
- Present data with context — absolute numbers alongside percentages and trends
- Always include time period and comparison basis for metrics
- Highlight statistically significant changes (not noise)
- Use the lookback period of {{lookback_months}} months unless specified otherwise
- Distinguish between correlation and causation in findings
- Provide actionable recommendations, not just observations
- Format large datasets into digestible summaries with drill-down capability

Enterprise context: {{enterprise_name}} (ID: {{enterprise_id}})`,
    variables: [
      { name: 'enterprise_name', description: 'Name of the enterprise', required: false, defaultValue: 'Current Enterprise', type: 'string' },
      { name: 'enterprise_id', description: 'Enterprise identifier', required: true, type: 'string' },
      { name: 'lookback_months', description: 'Default lookback period in months', required: false, defaultValue: '12', type: 'number' },
    ],
    metadata: { ...META, tags: ['system', 'analytics'], maxTokens: 500, temperature: 0.2 },
  },

  // ── Contract Portfolio Analysis ───────────────────────────────────
  {
    id: 'analytics-portfolio-analysis',
    agentType: 'analytics',
    category: 'task',
    name: 'Contract Portfolio Analysis',
    description: 'Comprehensive analysis of the contract portfolio',
    version: '1.0.0',
    template: `Analyze the contract portfolio data and produce insights.

Portfolio data:
{{portfolio_data}}

Time period: {{start_date}} to {{end_date}}
Comparison period: {{comparison_period}}

Produce:
1. **Portfolio overview**:
   - Total active contracts, total value, average contract value
   - Distribution by type (MSA, SOW, NDA, etc.)
   - Distribution by department and vendor category

2. **Expiration pipeline**:
   - Contracts expiring in 30 / 60 / 90 / 180 days
   - Estimated renewal value at risk
   - Contracts requiring action (auto-renewal decisions, renegotiation)

3. **Trend analysis**:
   - Period-over-period changes in contract volume and value
   - Shift in contract types or vendor categories
   - Average contract duration trends

4. **Anomalies and alerts**:
   - Contracts significantly above or below average value
   - Unusual terms patterns
   - Concentration risks (single vendor > 30% of category spend)

5. **Recommendations**:
   - Consolidation opportunities
   - Renegotiation candidates
   - Risk mitigation actions`,
    variables: [
      { name: 'portfolio_data', description: 'Contract portfolio dataset', required: true, type: 'json' },
      { name: 'start_date', description: 'Analysis period start', required: true, type: 'string' },
      { name: 'end_date', description: 'Analysis period end', required: true, type: 'string' },
      { name: 'comparison_period', description: 'Previous period for comparison', required: false, defaultValue: 'previous 12 months', type: 'string' },
    ],
    metadata: { ...META, tags: ['portfolio', 'contracts', 'analytics'], maxTokens: 2000, temperature: 0.2 },
  },

  // ── Spending Trend Analysis ───────────────────────────────────────
  {
    id: 'analytics-spending-trends',
    agentType: 'analytics',
    category: 'task',
    name: 'Spending Trend Analysis',
    description: 'Analyzes spending patterns and detects anomalies',
    version: '1.0.0',
    template: `Analyze spending data and identify trends, anomalies, and optimization opportunities.

Spending data:
{{spending_data}}

Analysis parameters:
- Granularity: {{granularity}}
- Category breakdown: {{categories}}
- Anomaly threshold: Z-score > {{anomaly_threshold}}

Produce:
1. **Spending summary**: Total, by category, by vendor, by department
2. **Trends**: Month-over-month and year-over-year changes
3. **Anomalies**: Flag transactions or periods with unusual spending
4. **Seasonality**: Identify recurring spending patterns
5. **Forecast**: Project next quarter spending based on trends
6. **Savings opportunities**: Identify where spending can be optimized`,
    variables: [
      { name: 'spending_data', description: 'Spending transaction data', required: true, type: 'json' },
      { name: 'granularity', description: 'Time granularity (daily/weekly/monthly)', required: false, defaultValue: 'monthly', type: 'string' },
      { name: 'categories', description: 'Spending categories to break down', required: false, defaultValue: 'all', type: 'string' },
      { name: 'anomaly_threshold', description: 'Z-score threshold for anomaly detection', required: false, defaultValue: '2.5', type: 'number' },
    ],
    metadata: { ...META, tags: ['spending', 'trends', 'anomaly', 'analytics'], maxTokens: 2000, temperature: 0.2 },
  },

  // ── Performance Dashboard ─────────────────────────────────────────
  {
    id: 'analytics-performance-dashboard',
    agentType: 'analytics',
    category: 'task',
    name: 'Executive Performance Dashboard',
    description: 'Generates executive-level performance summary',
    version: '1.0.0',
    template: `Generate an executive performance dashboard summary.

Raw metrics:
{{raw_metrics}}

Period: {{period}}

Format as a dashboard with these sections:
1. **KPI Summary** (5-7 key metrics with trend arrows):
   - Contract cycle time (days from initiation to execution)
   - Vendor compliance rate
   - Budget utilization percentage
   - Active contracts count and value
   - Risk score (aggregate)
   - Cost savings realized

2. **Top alerts** (3-5 items requiring executive attention)
3. **Positive highlights** (2-3 achievements or improvements)
4. **30-day outlook** (upcoming expirations, reviews, milestones)

Keep language concise and executive-friendly. Use relative comparisons ("15% better than Q3" not raw numbers in isolation).`,
    variables: [
      { name: 'raw_metrics', description: 'Raw metric data from the database', required: true, type: 'json' },
      { name: 'period', description: 'Reporting period', required: true, type: 'string' },
    ],
    metadata: { ...META, tags: ['dashboard', 'executive', 'kpi', 'analytics'], maxTokens: 1500, temperature: 0.3 },
  },
];
