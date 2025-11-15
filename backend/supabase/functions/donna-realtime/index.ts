/// &lt;reference path="../../types/global.d.ts" />
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

interface RealtimeMessage {
  type: 'insight' | 'pattern' | 'recommendation' | 'heartbeat';
  id: string;
  timestamp: string;
  data: {
    title?: string;
    description?: string;
    confidence?: number;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
    actionable?: boolean;
    actions?: Array<{
      label: string;
      type: string;
      payload?: unknown;
    }>;
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Get auth token from header or URL parameter (for EventSource compatibility)
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get('token');
    const authHeader = req.headers.get('Authorization') || (tokenParam ? `Bearer ${tokenParam}` : null);

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization token provided' }),
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

    // Get user's enterprise
    const { data: userProfile } = await supabase
      .from('users')
      .select('enterprise_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.enterprise_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const enterpriseId = userProfile.enterprise_id;

    // Set up Server-Sent Events stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send initial connection message
        const connectionMessage: RealtimeMessage = {
          type: 'heartbeat',
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          data: {
            title: 'Donna Terminal Connected',
            description: 'Real-time monitoring active',
          },
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectionMessage)}\n\n`));

        // Function to send heartbeat
        const sendHeartbeat = () => {
          try {
            const heartbeat: RealtimeMessage = {
              type: 'heartbeat',
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              data: {},
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
          } catch (error) {
            console.error('[Donna Realtime] Heartbeat error:', error);
          }
        };

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(sendHeartbeat, 30000);

        // Function to check for new insights
        const checkForInsights = async () => {
          try {
            // Query for recent insights from Donna system
            const { data: insights, error } = await supabase
              .from('donna_insights')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
              .order('created_at', { ascending: false })
              .limit(5);

            if (error) {
              console.error('[Donna Realtime] Insight query error:', error);
              return;
            }

            if (insights && insights.length > 0) {
              for (const insight of insights) {
                const message: RealtimeMessage = {
                  type: 'insight',
                  id: insight.id,
                  timestamp: insight.created_at,
                  data: {
                    title: insight.title || 'New Insight Discovered',
                    description: insight.description || insight.content,
                    confidence: insight.confidence || 0.85,
                    category: insight.category || 'general',
                    priority: determinePriority(insight),
                    metadata: insight.metadata || {},
                    actionable: insight.actionable || false,
                    actions: generateInsightActions(insight),
                  },
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              }
            }

            // Query for new patterns
            const { data: patterns, error: patternError } = await supabase
              .from('donna_knowledge_nodes')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .eq('node_type', 'pattern')
              .gte('created_at', new Date(Date.now() - 60000).toISOString())
              .order('created_at', { ascending: false })
              .limit(3);

            if (patternError) {
              console.error('[Donna Realtime] Pattern query error:', patternError);
              return;
            }

            if (patterns && patterns.length > 0) {
              for (const pattern of patterns) {
                const message: RealtimeMessage = {
                  type: 'pattern',
                  id: pattern.id,
                  timestamp: pattern.created_at,
                  data: {
                    title: pattern.label || 'New Pattern Detected',
                    description: extractPatternDescription(pattern),
                    confidence: (pattern.properties as any)?.confidence || 0.8,
                    category: (pattern.properties as any)?.category || 'analytics',
                    priority: 'medium',
                    metadata: pattern.properties || {},
                    actionable: true,
                    actions: generatePatternActions(pattern),
                  },
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              }
            }

            // Query for best practice recommendations
            const { data: recommendations, error: recError } = await supabase
              .from('donna_best_practices')
              .select('*')
              .gte('created_at', new Date(Date.now() - 60000).toISOString())
              .order('success_rate', { ascending: false })
              .limit(2);

            if (recError) {
              console.error('[Donna Realtime] Recommendation query error:', recError);
              return;
            }

            if (recommendations && recommendations.length > 0) {
              for (const rec of recommendations) {
                const message: RealtimeMessage = {
                  type: 'recommendation',
                  id: rec.id,
                  timestamp: rec.created_at,
                  data: {
                    title: rec.title || 'New Best Practice Available',
                    description: rec.description,
                    confidence: rec.success_rate || 0.9,
                    category: rec.category || 'optimization',
                    priority: rec.success_rate > 0.9 ? 'high' : 'medium',
                    metadata: {
                      successRate: rec.success_rate,
                      usageCount: rec.usage_count,
                      industries: rec.industries,
                    },
                    actionable: true,
                    actions: generateRecommendationActions(rec),
                  },
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              }
            }
          } catch (error) {
            console.error('[Donna Realtime] Check insights error:', error);
          }
        };

        // Check for new insights every 15 seconds
        const insightInterval = setInterval(checkForInsights, 15000);

        // Initial insight check
        await checkForInsights();

        // Cleanup on connection close
        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          clearInterval(insightInterval);
          try {
            controller.close();
          } catch (error) {
            console.error('[Donna Realtime] Controller close error:', error);
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('[Donna Realtime] Error:', error);

    return new Response(
      JSON.stringify({
        error: `Error establishing realtime connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to determine priority
function determinePriority(insight: any): 'low' | 'medium' | 'high' | 'critical' {
  const confidence = insight.confidence || 0;
  const impact = (insight.metadata as any)?.impact || 'low';

  if (confidence > 0.95 && impact === 'high') return 'critical';
  if (confidence > 0.85 || impact === 'high') return 'high';
  if (confidence > 0.7 || impact === 'medium') return 'medium';
  return 'low';
}

// Helper function to extract pattern description
function extractPatternDescription(pattern: any): string {
  const props = pattern.properties || {};

  if (props.description) return props.description;

  if (props.pattern_type === 'vendor_consolidation') {
    return `Identified ${props.vendor_count || 0} vendors that could be consolidated for potential savings`;
  }

  if (props.pattern_type === 'contract_renewal') {
    return `Detected renewal opportunity pattern affecting ${props.contract_count || 0} contracts`;
  }

  if (props.pattern_type === 'cost_optimization') {
    return `Found cost optimization opportunity with estimated savings of ${props.estimated_savings || 0}%`;
  }

  return pattern.label || 'Pattern detected in your enterprise data';
}

// Helper function to generate insight actions
function generateInsightActions(insight: any): Array<{ label: string; type: string; payload?: unknown }> {
  const actions: Array<{ label: string; type: string; payload?: unknown }> = [];

  if (insight.category === 'vendor') {
    actions.push({
      label: 'VIEW VENDORS',
      type: 'navigate',
      payload: { route: '/dashboard/vendors' },
    });
  }

  if (insight.category === 'contract') {
    actions.push({
      label: 'VIEW CONTRACTS',
      type: 'navigate',
      payload: { route: '/dashboard/contracts' },
    });
  }

  actions.push({
    label: 'DISMISS',
    type: 'dismiss',
    payload: { insightId: insight.id },
  });

  return actions;
}

// Helper function to generate pattern actions
function generatePatternActions(pattern: any): Array<{ label: string; type: string; payload?: unknown }> {
  const actions: Array<{ label: string; type: string; payload?: unknown }> = [];
  const props = pattern.properties || {};

  if (props.pattern_type === 'vendor_consolidation') {
    actions.push({
      label: 'RUN VENDOR AUDIT',
      type: 'run_audit',
      payload: { auditType: 'vendor_consolidation' },
    });
  }

  if (props.pattern_type === 'contract_renewal') {
    actions.push({
      label: 'VIEW EXPIRING CONTRACTS',
      type: 'navigate',
      payload: { route: '/dashboard/contracts?filter=expiring' },
    });
  }

  if (props.pattern_type === 'cost_optimization') {
    actions.push({
      label: 'ANALYZE SAVINGS',
      type: 'run_analysis',
      payload: { analysisType: 'cost_optimization' },
    });
  }

  actions.push({
    label: 'LEARN MORE',
    type: 'expand_pattern',
    payload: { patternId: pattern.id },
  });

  return actions;
}

// Helper function to generate recommendation actions
function generateRecommendationActions(rec: any): Array<{ label: string; type: string; payload?: unknown }> {
  const actions: Array<{ label: string; type: string; payload?: unknown }> = [];

  actions.push({
    label: 'APPLY BEST PRACTICE',
    type: 'apply_practice',
    payload: { practiceId: rec.id },
  });

  actions.push({
    label: 'VIEW DETAILS',
    type: 'expand_recommendation',
    payload: { recommendationId: rec.id },
  });

  return actions;
}
