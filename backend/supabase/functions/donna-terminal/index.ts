/// <reference path="../../types/global.d.ts" />
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { DonnaInterface, type DonnaQuery } from '../local-agents/donna/interface.ts';
import { MarketIntelligenceAgent } from '../local-agents/agents/market-intelligence.ts';
import { DonnaMarketIntelligence } from '../local-agents/donna/market-intelligence.ts';

interface TerminalQueryRequest {
  query: string;
  context?: {
    page?: string;
    entityType?: string;
    entityId?: string;
    userAction?: string;
    contractId?: string;
    vendorId?: string;
    taxonomyCode?: string;
  };
}

interface TerminalResponse {
  id: string;
  type: 'system_response' | 'insight' | 'error' | 'market_intelligence';
  content: {
    message: string;
    insights?: unknown[];
    recommendations?: string[];
    bestPractices?: unknown[];
    confidence?: number;
    metadata?: {
      patternCount?: number;
      industries?: string[];
      avgSavings?: number;
      successRate?: number;
    };
    // Market intelligence specific
    marketData?: {
      benchmark?: {
        median_price: number;
        percentile_25: number;
        percentile_75: number;
        sample_size: number;
        your_position?: string;
      };
      anomalies?: Array<{
        severity: string;
        type: string;
        expected_value: number;
        actual_value: number;
        deviation_percent: number;
      }>;
      trends?: Array<{
        category: string;
        direction: string;
        change_percent: number;
        period: string;
      }>;
      vendorComparison?: {
        vendor_name: string;
        vs_market_avg: number;
        ranking: string;
        total_spend: number;
      };
    };
  };
  actions?: Array<{
    label: string;
    type: string;
    payload?: unknown;
  }>;
  timestamp: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Create Supabase client
    const supabase = createSupabaseClient(authHeader);
    const user = await getUserFromAuth(supabase);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Get request body
    const body: TerminalQueryRequest = await req.json();
    const { query, context = {} } = body;

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Query is required',
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get user's enterprise
    const { data: userProfile } = await supabase
      .from('users')
      .select('enterprise_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.enterprise_id) {
      return new Response(
        JSON.stringify({
          error: 'User profile not found',
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Initialize Donna interface
    const donna = new DonnaInterface(supabase);

    // Parse query intent
    const queryType = parseQueryIntent(query);

    // Check if this is a market intelligence query
    if (isMarketIntelligenceQuery(queryType)) {
      // Handle market intelligence queries with specialized agent
      const marketIntelAgent = new MarketIntelligenceAgent(
        supabase,
        userProfile.enterprise_id,
        user.id
      );
      const marketIntel = new DonnaMarketIntelligence(supabase, userProfile.enterprise_id);

      const marketResponse = await handleMarketIntelligenceQuery(
        queryType,
        query,
        context,
        marketIntelAgent,
        marketIntel,
        userProfile.enterprise_id
      );

      return new Response(
        JSON.stringify(marketResponse),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Build Donna query with context for non-market queries
    const donnaQuery: DonnaQuery = {
      type: queryType,
      context: {
        query,
        page: context.page,
        entityType: context.entityType,
        entityId: context.entityId,
        userAction: context.userAction,
      },
      enterpriseId: userProfile.enterprise_id,
      userId: user.id,
    };

    // Query Donna
    const analysis = await donna.query(donnaQuery);

    // Format response for terminal display
    const response: TerminalResponse = formatTerminalResponse(
      analysis,
      query,
      queryType
    );

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Donna Terminal] Error:', error);

    const errorResponse: TerminalResponse = {
      id: crypto.randomUUID(),
      type: 'error',
      content: {
        message: `Error processing your query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to parse query intent
function parseQueryIntent(query: string): string {
  const lowerQuery = query.toLowerCase();

  // Market intelligence - price benchmark queries
  if (
    lowerQuery.includes('benchmark') ||
    lowerQuery.includes('market price') ||
    lowerQuery.includes('market rate') ||
    lowerQuery.includes('fair price') ||
    lowerQuery.includes('competitive price') ||
    (lowerQuery.includes('price') && lowerQuery.includes('compare')) ||
    (lowerQuery.includes('how much') && lowerQuery.includes('pay'))
  ) {
    return 'market_price_benchmark';
  }

  // Market intelligence - price anomaly queries
  if (
    lowerQuery.includes('overpay') ||
    lowerQuery.includes('overcharg') ||
    lowerQuery.includes('anomal') ||
    lowerQuery.includes('outlier') ||
    lowerQuery.includes('unusual price') ||
    lowerQuery.includes('too high') ||
    lowerQuery.includes('too expensive') ||
    (lowerQuery.includes('price') && lowerQuery.includes('wrong'))
  ) {
    return 'market_price_anomaly';
  }

  // Market intelligence - trend analysis queries
  if (
    (lowerQuery.includes('market') && lowerQuery.includes('trend')) ||
    lowerQuery.includes('price trend') ||
    lowerQuery.includes('going up') ||
    lowerQuery.includes('going down') ||
    lowerQuery.includes('price change') ||
    lowerQuery.includes('price movement') ||
    lowerQuery.includes('inflation') ||
    lowerQuery.includes('market shift')
  ) {
    return 'market_trend_analysis';
  }

  // Market intelligence - vendor price comparison
  if (
    (lowerQuery.includes('vendor') && lowerQuery.includes('price')) ||
    (lowerQuery.includes('supplier') && lowerQuery.includes('price')) ||
    lowerQuery.includes('vendor comparison') ||
    lowerQuery.includes('compare vendor') ||
    lowerQuery.includes('cheaper vendor') ||
    lowerQuery.includes('better deal') ||
    lowerQuery.includes('same product') ||
    lowerQuery.includes('same service')
  ) {
    return 'market_vendor_comparison';
  }

  // Market intelligence - dashboard/summary
  if (
    lowerQuery.includes('market summary') ||
    lowerQuery.includes('market overview') ||
    lowerQuery.includes('market dashboard') ||
    lowerQuery.includes('price intelligence') ||
    lowerQuery.includes('market intel')
  ) {
    return 'market_dashboard';
  }

  // Vendor-related queries (non-market)
  if (
    lowerQuery.includes('vendor') ||
    lowerQuery.includes('supplier') ||
    lowerQuery.includes('consolidat')
  ) {
    return 'vendor_optimization';
  }

  // Contract-related queries
  if (
    lowerQuery.includes('contract') ||
    lowerQuery.includes('renew') ||
    lowerQuery.includes('expir')
  ) {
    return 'contract_strategy';
  }

  // Cost/savings queries
  if (
    lowerQuery.includes('cost') ||
    lowerQuery.includes('save') ||
    lowerQuery.includes('spend') ||
    lowerQuery.includes('budget')
  ) {
    return 'cost_optimization';
  }

  // Compliance queries
  if (
    lowerQuery.includes('complian') ||
    lowerQuery.includes('risk') ||
    lowerQuery.includes('audit')
  ) {
    return 'compliance_check';
  }

  // Analytics queries
  if (
    lowerQuery.includes('pattern') ||
    lowerQuery.includes('trend') ||
    lowerQuery.includes('insight') ||
    lowerQuery.includes('analyz') ||
    lowerQuery.includes('how')
  ) {
    return 'pattern_analysis';
  }

  // Best practices queries
  if (
    lowerQuery.includes('best practice') ||
    lowerQuery.includes('recommendation') ||
    lowerQuery.includes('should i') ||
    lowerQuery.includes('what') ||
    lowerQuery.includes('advice')
  ) {
    return 'best_practices';
  }

  // Default to general analysis
  return 'general_analysis';
}

// Check if query is market intelligence related
function isMarketIntelligenceQuery(queryType: string): boolean {
  return [
    'market_price_benchmark',
    'market_price_anomaly',
    'market_trend_analysis',
    'market_vendor_comparison',
    'market_dashboard',
  ].includes(queryType);
}

// Helper function to format response for terminal display
function formatTerminalResponse(
  analysis: {
    id: string;
    insights: unknown[];
    recommendations: string[];
    bestPractices: unknown[];
    confidence: number;
  },
  originalQuery: string,
  queryType: string
): TerminalResponse {
  const insights = analysis.insights as Array<{
    type?: string;
    description?: string;
    data?: unknown;
    pattern_count?: number;
    industries?: string[];
  }>;

  const bestPractices = analysis.bestPractices as Array<{
    title?: string;
    description?: string;
    success_rate?: number;
    usage_count?: number;
  }>;

  // Build natural language response
  let message = `Based on ${insights.length || 0} cross-enterprise patterns`;

  if (insights.length > 0 && insights[0].pattern_count) {
    message += ` (analyzing ${insights[0].pattern_count.toLocaleString()} similar scenarios)`;
  }

  message += ', here\'s what I found:\n\n';

  // Add insights
  if (insights.length > 0) {
    message += '**KEY INSIGHTS:**\n\n';
    insights.slice(0, 3).forEach((insight, idx) => {
      message += `${idx + 1}. ${insight.description || 'Insight available'}\n`;
    });
    message += '\n';
  }

  // Add recommendations
  if (analysis.recommendations.length > 0) {
    message += '**RECOMMENDATIONS:**\n\n';
    analysis.recommendations.slice(0, 3).forEach((rec, idx) => {
      message += `→ ${rec}\n`;
    });
    message += '\n';
  }

  // Add best practices
  if (bestPractices.length > 0) {
    message += '**PROVEN BEST PRACTICES:**\n\n';
    bestPractices.slice(0, 2).forEach((practice, idx) => {
      let practiceText = `${idx + 1}. ${practice.title || 'Best Practice'}`;
      if (practice.success_rate) {
        practiceText += ` (${(practice.success_rate * 100).toFixed(0)}% success rate)`;
      }
      message += `${practiceText}\n`;
      if (practice.description) {
        message += `   └─ ${practice.description}\n`;
      }
    });
  }

  // Calculate metadata
  const metadata = {
    patternCount: insights[0]?.pattern_count || 0,
    industries: insights[0]?.industries || [],
    avgSavings: 0, // TODO: Calculate from patterns
    successRate: bestPractices[0]?.success_rate || 0,
  };

  // Generate action buttons based on query type
  const actions = generateActions(queryType, analysis);

  return {
    id: analysis.id,
    type: 'system_response',
    content: {
      message,
      insights: insights.slice(0, 3),
      recommendations: analysis.recommendations.slice(0, 3),
      bestPractices: bestPractices.slice(0, 2),
      confidence: analysis.confidence,
      metadata,
    },
    actions,
    timestamp: new Date().toISOString(),
  };
}

// Helper function to generate contextual action buttons
function generateActions(
  queryType: string,
  analysis: {
    insights: unknown[];
    recommendations: string[];
    bestPractices: unknown[];
  }
): Array<{ label: string; type: string; payload?: unknown }> {
  const actions: Array<{ label: string; type: string; payload?: unknown }> = [];

  // Common actions
  if (analysis.recommendations.length > 0) {
    actions.push({
      label: 'SHOW MORE DETAILS',
      type: 'expand_analysis',
    });
  }

  // Query-specific actions
  switch (queryType) {
    case 'vendor_optimization':
      actions.push(
        {
          label: 'RUN VENDOR AUDIT',
          type: 'run_audit',
          payload: { auditType: 'vendor_consolidation' },
        },
        {
          label: 'ANALYZE MY VENDORS',
          type: 'navigate',
          payload: { route: '/dashboard/vendors' },
        }
      );
      break;

    case 'contract_strategy':
      actions.push(
        {
          label: 'VIEW EXPIRING CONTRACTS',
          type: 'navigate',
          payload: { route: '/dashboard/contracts?filter=expiring' },
        },
        {
          label: 'CREATE RENEWAL TASK',
          type: 'create_task',
          payload: { taskType: 'renewal_planning' },
        }
      );
      break;

    case 'cost_optimization':
      actions.push(
        {
          label: 'RUN COST ANALYSIS',
          type: 'run_analysis',
          payload: { analysisType: 'cost_savings' },
        }
      );
      break;
  }

  // Always add feedback action
  actions.push(
    {
      label: 'HELPFUL',
      type: 'feedback',
      payload: { helpful: true },
    },
    {
      label: 'NOT HELPFUL',
      type: 'feedback',
      payload: { helpful: false },
    }
  );

  return actions;
}

// Handle market intelligence queries
async function handleMarketIntelligenceQuery(
  queryType: string,
  query: string,
  context: {
    page?: string;
    entityType?: string;
    entityId?: string;
    userAction?: string;
    contractId?: string;
    vendorId?: string;
    taxonomyCode?: string;
  },
  marketIntelAgent: MarketIntelligenceAgent,
  marketIntel: DonnaMarketIntelligence,
  enterpriseId: string
): Promise<TerminalResponse> {
  const responseId = crypto.randomUUID();

  try {
    let marketData: TerminalResponse['content']['marketData'] = {};
    let message = '';
    const recommendations: string[] = [];
    const actions: Array<{ label: string; type: string; payload?: unknown }> = [];

    switch (queryType) {
      case 'market_price_benchmark': {
        // Extract taxonomy code from query or context
        const taxonomyCode = context.taxonomyCode || extractTaxonomyFromQuery(query);

        if (taxonomyCode) {
          const benchmark = await marketIntel.getPriceBenchmark(taxonomyCode);

          if (benchmark.sample_size > 0) {
            marketData.benchmark = {
              median_price: benchmark.median_price,
              percentile_25: benchmark.percentile_25,
              percentile_75: benchmark.percentile_75,
              sample_size: benchmark.sample_size,
            };

            message = `**MARKET PRICE BENCHMARK**\n\n`;
            message += `Based on ${benchmark.sample_size.toLocaleString()} comparable transactions:\n\n`;
            message += `• **Median Price:** $${benchmark.median_price.toLocaleString()}\n`;
            message += `• **25th Percentile:** $${benchmark.percentile_25.toLocaleString()}\n`;
            message += `• **75th Percentile:** $${benchmark.percentile_75.toLocaleString()}\n`;
            message += `• **Average Price:** $${benchmark.avg_price.toLocaleString()}\n\n`;

            if (benchmark.percentile_75 > benchmark.median_price * 1.3) {
              recommendations.push('There is significant price variation in this category. Consider negotiating based on market median.');
            }
          } else {
            message = `I don't have enough market data for this specific category yet. As more enterprises contribute pricing data, benchmarks will become available.`;
            recommendations.push('Consider contributing your pricing data to build market benchmarks.');
          }
        } else {
          // Get general dashboard summary
          const summary = await marketIntelAgent.getDashboardSummary();
          message = `**MARKET INTELLIGENCE SUMMARY**\n\n`;
          message += `Your enterprise has ${(summary as { total_line_items?: number }).total_line_items || 0} line items being tracked.\n\n`;
          message += `To get specific benchmarks, please specify a product/service category or provide a contract ID.`;
        }

        actions.push(
          { label: 'VIEW ALL BENCHMARKS', type: 'navigate', payload: { route: '/dashboard/market-intelligence' } },
          { label: 'CONTRIBUTE DATA', type: 'market_action', payload: { action: 'contribute_data' } }
        );
        break;
      }

      case 'market_price_anomaly': {
        const contractId = context.contractId;

        if (contractId) {
          const anomalies = await marketIntel.detectAnomalies(contractId);

          if (anomalies.length > 0) {
            marketData.anomalies = anomalies.map(a => ({
              severity: a.severity,
              type: a.anomaly_type,
              expected_value: a.expected_value,
              actual_value: a.actual_value,
              deviation_percent: a.deviation_percent,
            }));

            const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
            const highCount = anomalies.filter(a => a.severity === 'high').length;

            message = `**PRICE ANOMALY DETECTION**\n\n`;
            message += `Found ${anomalies.length} pricing anomalies:\n`;
            message += `• **Critical:** ${criticalCount}\n`;
            message += `• **High:** ${highCount}\n`;
            message += `• **Medium/Low:** ${anomalies.length - criticalCount - highCount}\n\n`;

            // Show top anomalies
            message += `**Top Anomalies:**\n`;
            anomalies.slice(0, 3).forEach((a, idx) => {
              message += `${idx + 1}. ${a.severity.toUpperCase()}: ${a.anomaly_type} - ${a.deviation_percent.toFixed(1)}% deviation\n`;
              message += `   Expected: $${a.expected_value.toLocaleString()} | Actual: $${a.actual_value.toLocaleString()}\n`;
            });

            if (criticalCount > 0) {
              recommendations.push('Review critical anomalies immediately - potential significant overcharges detected.');
            }
            recommendations.push('Consider renegotiating contracts with the highest price deviations.');
          } else {
            message = `**PRICE ANOMALY DETECTION**\n\nNo pricing anomalies detected for this contract. All line items appear to be within expected market ranges.`;
          }
        } else {
          // Get anomaly summary across all contracts
          const summary = await marketIntel.getAnomalySummary();
          const summaryData = summary as {
            total_anomalies?: number;
            critical_count?: number;
            high_count?: number;
            potential_savings?: number;
          };

          message = `**ENTERPRISE ANOMALY SUMMARY**\n\n`;
          message += `Total anomalies detected: ${summaryData.total_anomalies || 0}\n`;
          message += `• Critical: ${summaryData.critical_count || 0}\n`;
          message += `• High: ${summaryData.high_count || 0}\n\n`;

          if ((summaryData.potential_savings || 0) > 0) {
            message += `**Potential Savings:** $${(summaryData.potential_savings || 0).toLocaleString()}\n`;
            recommendations.push(`Review anomalies to potentially save $${(summaryData.potential_savings || 0).toLocaleString()}`);
          }
        }

        actions.push(
          { label: 'VIEW ALL ANOMALIES', type: 'navigate', payload: { route: '/dashboard/market-intelligence/anomalies' } },
          { label: 'RUN FULL AUDIT', type: 'market_action', payload: { action: 'full_anomaly_audit' } }
        );
        break;
      }

      case 'market_trend_analysis': {
        const taxonomyCode = context.taxonomyCode || extractTaxonomyFromQuery(query);
        const trends = await marketIntel.getTrends(taxonomyCode);

        if (trends.length > 0) {
          marketData.trends = trends.map(t => ({
            category: t.category_name,
            direction: t.trend_direction,
            change_percent: t.price_change_percent,
            period: t.period,
          }));

          message = `**MARKET TRENDS ANALYSIS**\n\n`;

          const increasing = trends.filter(t => t.trend_direction === 'increasing');
          const decreasing = trends.filter(t => t.trend_direction === 'decreasing');

          if (increasing.length > 0) {
            message += `**PRICES INCREASING:**\n`;
            increasing.slice(0, 5).forEach(t => {
              message += `• ${t.category_name}: +${t.price_change_percent.toFixed(1)}%\n`;
            });
            message += '\n';
          }

          if (decreasing.length > 0) {
            message += `**PRICES DECREASING:**\n`;
            decreasing.slice(0, 5).forEach(t => {
              message += `• ${t.category_name}: ${t.price_change_percent.toFixed(1)}%\n`;
            });
            message += '\n';
          }

          // Recommendations based on trends
          if (increasing.length > 0) {
            recommendations.push('Consider locking in long-term contracts for categories with rising prices.');
          }
          if (decreasing.length > 0) {
            recommendations.push('Categories with declining prices may be good opportunities for renegotiation.');
          }
        } else {
          message = `**MARKET TRENDS**\n\nNot enough historical data to show trends yet. As more data is collected over time, trends will become visible.`;
        }

        actions.push(
          { label: 'VIEW TREND CHARTS', type: 'navigate', payload: { route: '/dashboard/market-intelligence/trends' } }
        );
        break;
      }

      case 'market_vendor_comparison': {
        const vendorId = context.vendorId;

        if (vendorId) {
          const comparison = await marketIntel.compareVendorPricing(vendorId);

          if (comparison) {
            const comparisonData = comparison as {
              vendor_name: string;
              avg_deviation_percent: number;
              categories_compared: number;
              savings_opportunity: number;
              competitiveness_score: number;
            };

            marketData.vendorComparison = {
              vendor_name: comparisonData.vendor_name,
              vs_market_avg: comparisonData.avg_deviation_percent,
              ranking: comparisonData.competitiveness_score >= 0.8 ? 'Competitive' :
                       comparisonData.competitiveness_score >= 0.6 ? 'Average' : 'Above Market',
              total_spend: 0, // Would need to calculate
            };

            message = `**VENDOR PRICE COMPARISON: ${comparisonData.vendor_name}**\n\n`;
            message += `Compared across ${comparisonData.categories_compared} categories:\n\n`;

            if (comparisonData.avg_deviation_percent > 0) {
              message += `• **${comparisonData.avg_deviation_percent.toFixed(1)}% ABOVE** market average\n`;
              message += `• Potential savings opportunity: $${comparisonData.savings_opportunity.toLocaleString()}\n`;
              recommendations.push(`This vendor is ${comparisonData.avg_deviation_percent.toFixed(1)}% above market - consider renegotiation.`);
            } else {
              message += `• **${Math.abs(comparisonData.avg_deviation_percent).toFixed(1)}% BELOW** market average\n`;
              message += `• This vendor offers competitive pricing\n`;
            }

            message += `• Competitiveness Score: ${(comparisonData.competitiveness_score * 100).toFixed(0)}%\n`;
          }
        } else {
          message = `**VENDOR PRICE COMPARISON**\n\nPlease specify a vendor to compare against market rates. You can say "Compare [vendor name] pricing" or select a vendor from your vendors list.`;
        }

        actions.push(
          { label: 'COMPARE ALL VENDORS', type: 'navigate', payload: { route: '/dashboard/vendors?view=pricing' } },
          { label: 'FIND ALTERNATIVES', type: 'market_action', payload: { action: 'find_alternatives', vendorId } }
        );
        break;
      }

      case 'market_dashboard': {
        const summary = await marketIntelAgent.getDashboardSummary();
        const summaryData = summary as {
          total_line_items?: number;
          total_value?: number;
          anomalies_count?: number;
          potential_savings?: number;
          categories_tracked?: number;
          active_trends?: number;
        };

        message = `**MARKET INTELLIGENCE DASHBOARD**\n\n`;
        message += `**PORTFOLIO OVERVIEW:**\n`;
        message += `• Total Line Items: ${(summaryData.total_line_items || 0).toLocaleString()}\n`;
        message += `• Total Contract Value: $${(summaryData.total_value || 0).toLocaleString()}\n`;
        message += `• Categories Tracked: ${summaryData.categories_tracked || 0}\n\n`;

        message += `**INSIGHTS:**\n`;
        message += `• Price Anomalies Found: ${summaryData.anomalies_count || 0}\n`;
        message += `• Active Market Trends: ${summaryData.active_trends || 0}\n`;

        if ((summaryData.potential_savings || 0) > 0) {
          message += `• Potential Savings: $${(summaryData.potential_savings || 0).toLocaleString()}\n`;
        }

        actions.push(
          { label: 'VIEW FULL DASHBOARD', type: 'navigate', payload: { route: '/dashboard/market-intelligence' } },
          { label: 'RUN FULL ANALYSIS', type: 'market_action', payload: { action: 'full_analysis' } },
          { label: 'EXPORT REPORT', type: 'market_action', payload: { action: 'export_report' } }
        );
        break;
      }
    }

    // Add feedback actions
    actions.push(
      { label: 'HELPFUL', type: 'feedback', payload: { helpful: true } },
      { label: 'NOT HELPFUL', type: 'feedback', payload: { helpful: false } }
    );

    return {
      id: responseId,
      type: 'market_intelligence',
      content: {
        message,
        recommendations,
        marketData,
        confidence: 0.85,
      },
      actions,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[Donna Terminal] Market intelligence error:', error);

    return {
      id: responseId,
      type: 'error',
      content: {
        message: `Error processing market intelligence query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Helper to extract taxonomy code from query
function extractTaxonomyFromQuery(query: string): string | undefined {
  // Look for UNSPSC-like codes (2-11 digits)
  const codeMatch = query.match(/\b(\d{2,11})\b/);
  if (codeMatch) {
    return codeMatch[1];
  }

  // Could expand to look for category names and map them to codes
  return undefined;
}
