# Procurement Agents

This directory contains extracted procurement-related agent code from the Pactwise codebase.

## Files

### Core Agents

| File | Description | Location in Codebase |
|------|-------------|---------------------|
| `sourcing.ts` | Supplier discovery, evaluation, market research, RFQ preparation, and quote analysis | `backend/supabase/functions/local-agents/agents/sourcing.ts` |
| `vendor.ts` | Vendor lifecycle management, performance tracking, relationship scoring, risk assessment | `backend/supabase/functions/local-agents/agents/vendor.ts` |
| `market-intelligence.ts` | Price benchmarking, anomaly detection, trend analysis, vendor comparison, taxonomy matching | `backend/supabase/functions/local-agents/agents/market-intelligence.ts` |

### Edge Functions

| File | Description | Location in Codebase |
|------|-------------|---------------------|
| `agents-sourcing-edge-function.ts` | AI-powered sourcing edge function with Anthropic Claude integration | `backend/supabase/functions/agents-sourcing/index.ts` |

### Types

| File | Description | Location in Codebase |
|------|-------------|---------------------|
| `vendor-types.ts` | TypeScript type definitions for vendor entities | `backend/supabase/types/common/vendor.ts` |

## Agent Capabilities

### Sourcing Agent (`sourcing.ts`)
- `supplier_discovery` - Find suppliers matching requirements
- `supplier_evaluation` - Score and evaluate suppliers
- `market_research` - Conduct market research for categories
- `rfq_preparation` - Prepare RFQ documents
- `quote_analysis` - Analyze and compare supplier quotes
- `vendor_comparison` - Compare vendors

### Vendor Agent (`vendor.ts`)
- `vendor_analysis` - Comprehensive vendor analysis
- `performance_tracking` - Track vendor performance metrics
- `relationship_scoring` - Calculate vendor relationship scores
- `risk_assessment` - Assess vendor risks

### Market Intelligence Agent (`market-intelligence.ts`)
- `price_benchmarking` - Benchmark prices against market data
- `anomaly_detection` - Detect price anomalies
- `market_trend_analysis` - Analyze market trends
- `vendor_price_comparison` - Compare vendor pricing
- `taxonomy_matching` - Match items to UNSPSC taxonomy
- `price_contribution` - Contribute price data to benchmarks
- `review_queue_management` - Manage taxonomy review queues

## Related Database Migrations

Key migrations for procurement functionality (in `backend/supabase/migrations/`):
- `067_rfq_rfp_and_sourcing_system.sql` - RFQ/RFP system tables
- `070_vendor_analytics_functions.sql` - Vendor analytics
- `089_vendor_contract_relationship_intelligence.sql` - Vendor relationship intelligence
- `091_vendor_consolidation_automation.sql` - Vendor consolidation
- `103_market_price_intelligence.sql` - Market price intelligence
- `104_donna_market_intelligence.sql` - Donna market intelligence integration
- `125_spend_analytics_and_vendor_scorecards.sql` - Spend analytics and scorecards
