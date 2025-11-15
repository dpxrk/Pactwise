/// <reference path="../../types/global.d.ts" />
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { DonnaInterface, type DonnaQuery } from '../local-agents/donna/interface.ts';

interface TerminalQueryRequest {
  query: string;
  context?: {
    page?: string;
    entityType?: string;
    entityId?: string;
    userAction?: string;
  };
}

interface TerminalResponse {
  id: string;
  type: 'system_response' | 'insight' | 'error';
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

    // Build Donna query with context
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

  // Vendor-related queries
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
