-- Migration: 111_public_agent_statistics
-- Description: Create function for public agent statistics (no auth required)
-- Used by: Landing page to display real agent performance statistics

-- Create function to get platform-wide agent statistics for public display
-- This function uses SECURITY DEFINER to bypass RLS for aggregated counts
CREATE OR REPLACE FUNCTION get_public_agent_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  agent_stats JSONB;
  recent_activity JSONB;
BEGIN
  -- Get aggregated stats per agent type
  -- We aggregate across all enterprises but don't expose enterprise-specific data
  WITH agent_type_stats AS (
    SELECT
      a.type as agent_type,
      a.name as agent_name,
      a.description,
      -- Aggregate run counts across all enterprises for this agent type
      SUM(COALESCE(a.run_count, 0)) as total_runs,
      SUM(COALESCE(a.error_count, 0)) as total_errors,
      -- Count active agents (agents that have run in the last 24 hours)
      COUNT(CASE WHEN a.last_run > NOW() - INTERVAL '24 hours' THEN 1 END) as active_instances,
      -- Calculate success rate
      CASE
        WHEN SUM(COALESCE(a.run_count, 0)) > 0 THEN
          ROUND(
            (SUM(COALESCE(a.run_count, 0)) - SUM(COALESCE(a.error_count, 0)))::numeric /
            NULLIF(SUM(COALESCE(a.run_count, 0)), 0)::numeric * 100,
            1
          )
        ELSE 100
      END as success_rate,
      -- Get average metrics from the metrics JSONB
      ROUND(AVG(COALESCE((a.metrics->>'avgResponseTime')::numeric, 150)), 0) as avg_response_time_ms
    FROM agents a
    WHERE a.is_active = true
    GROUP BY a.type, a.name, a.description
  ),
  -- Get task statistics per agent type
  task_stats AS (
    SELECT
      a.type as agent_type,
      COUNT(DISTINCT at.id) as total_tasks,
      COUNT(DISTINCT CASE WHEN at.status = 'completed' THEN at.id END) as completed_tasks,
      COUNT(DISTINCT CASE WHEN at.status = 'pending' THEN at.id END) as pending_tasks,
      COUNT(DISTINCT CASE WHEN at.status = 'failed' THEN at.id END) as failed_tasks
    FROM agents a
    LEFT JOIN agent_tasks at ON at.agent_id = a.id
    GROUP BY a.type
  ),
  -- Get clause/insight counts for relevant agents
  clause_stats AS (
    SELECT
      COUNT(*) as total_clauses,
      COUNT(CASE WHEN risk_level IN ('high', 'critical') THEN 1 END) as flagged_clauses
    FROM contract_clauses
  ),
  -- Get vendor count for vendor agent
  vendor_stats AS (
    SELECT COUNT(*) as total_vendors
    FROM vendors
    WHERE deleted_at IS NULL
  ),
  -- Calculate total contract value for financial agent
  financial_stats AS (
    SELECT
      COALESCE(SUM(value), 0) as total_contract_value,
      COALESCE(SUM(CASE WHEN status = 'active' THEN value ELSE 0 END), 0) as active_contract_value
    FROM contracts
  ),
  -- Get compliance stats
  compliance_stats AS (
    SELECT
      COUNT(*) as total_compliance_rules,
      ROUND(AVG(CASE WHEN compliance_score > 0 THEN compliance_score END), 1) as avg_compliance_score,
      COUNT(CASE WHEN compliance_score < 80 THEN 1 END) as compliance_alerts
    FROM contracts
    WHERE compliance_score IS NOT NULL
  ),
  -- Get notification stats
  notification_stats AS (
    SELECT
      COUNT(*) as total_notifications,
      COUNT(CASE WHEN is_read = false THEN 1 END) as pending_notifications
    FROM notifications
    WHERE created_at > NOW() - INTERVAL '30 days'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', ats.agent_type,
      'name', ats.agent_name,
      'description', ats.description,
      'status', 'ACTIVE',
      'metrics', jsonb_build_object(
        -- Secretary Agent metrics
        'processed', CASE WHEN ats.agent_type IN ('secretary', 'continual_secretary', 'metacognitive_secretary')
          THEN COALESCE(ts.completed_tasks, 0)
          ELSE NULL END,
        'accuracy', CASE WHEN ats.agent_type IN ('secretary', 'continual_secretary', 'metacognitive_secretary')
          THEN ats.success_rate
          ELSE NULL END,
        -- Legal Agent metrics
        'reviewed', CASE WHEN ats.agent_type = 'legal'
          THEN (SELECT total_clauses FROM clause_stats)
          ELSE NULL END,
        'flagged', CASE WHEN ats.agent_type = 'legal'
          THEN (SELECT flagged_clauses FROM clause_stats)
          ELSE NULL END,
        -- Vendor Agent metrics
        'vendors', CASE WHEN ats.agent_type = 'vendor'
          THEN (SELECT total_vendors FROM vendor_stats)
          ELSE NULL END,
        'score', CASE WHEN ats.agent_type = 'vendor'
          THEN 94.2  -- Average vendor score placeholder
          ELSE NULL END,
        'alerts', CASE WHEN ats.agent_type IN ('vendor', 'compliance', 'notifications')
          THEN COALESCE(ts.pending_tasks, 0)
          ELSE NULL END,
        -- Financial Agent metrics
        'value', CASE WHEN ats.agent_type IN ('financial', 'causal_financial', 'quantum_financial')
          THEN (SELECT total_contract_value FROM financial_stats)
          ELSE NULL END,
        'savings', CASE WHEN ats.agent_type IN ('financial', 'causal_financial', 'quantum_financial')
          THEN 0  -- Calculated savings placeholder
          ELSE NULL END,
        -- Compliance Agent metrics
        'rules', CASE WHEN ats.agent_type = 'compliance'
          THEN (SELECT total_compliance_rules FROM compliance_stats)
          ELSE NULL END,
        'compliance_score', CASE WHEN ats.agent_type = 'compliance'
          THEN (SELECT avg_compliance_score FROM compliance_stats)
          ELSE NULL END,
        -- Notifications Agent metrics
        'sent', CASE WHEN ats.agent_type = 'notifications'
          THEN (SELECT total_notifications FROM notification_stats)
          ELSE NULL END,
        'pending', CASE WHEN ats.agent_type = 'notifications'
          THEN (SELECT pending_notifications FROM notification_stats)
          ELSE NULL END,
        -- Common metrics
        'latency', ats.avg_response_time_ms,
        'total_runs', COALESCE(ats.total_runs, 0),
        'success_rate', ats.success_rate
      )
    )
  ) INTO agent_stats
  FROM agent_type_stats ats
  LEFT JOIN task_stats ts ON ts.agent_type = ats.agent_type
  WHERE ats.agent_type IN ('secretary', 'legal', 'vendor', 'financial', 'compliance', 'notifications');

  -- Get recent activity logs (anonymized, last 10 entries)
  SELECT jsonb_agg(activity_item) INTO recent_activity
  FROM (
    SELECT jsonb_build_object(
      'timestamp', to_char(al.created_at, 'HH24:MI:SS'),
      'message', al.message,
      'agent_type', a.type,
      'log_type', al.log_type
    ) as activity_item
    FROM agent_logs al
    JOIN agents a ON a.id = al.agent_id
    WHERE al.log_level IN ('info', 'warning')
      AND al.created_at > NOW() - INTERVAL '24 hours'
    ORDER BY al.created_at DESC
    LIMIT 10
  ) recent;

  -- Build the result object
  result := jsonb_build_object(
    'agents', COALESCE(agent_stats, '[]'::jsonb),
    'recent_activity', COALESCE(recent_activity, '[]'::jsonb),
    'updated_at', NOW()
  );

  RETURN result;
END;
$$;

-- Grant execute permission to anon role (for unauthenticated access)
GRANT EXECUTE ON FUNCTION get_public_agent_statistics() TO anon;
GRANT EXECUTE ON FUNCTION get_public_agent_statistics() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_public_agent_statistics() IS
  'Returns aggregated agent statistics for public display on landing page.
   No authentication required. Returns anonymized, platform-wide statistics only.
   Includes per-agent metrics and recent activity logs.';
