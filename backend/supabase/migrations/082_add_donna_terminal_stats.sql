-- Migration: Add Donna Terminal Statistics to Dashboard
-- Description: Update get_dashboard_stats function to include real Donna AI terminal statistics
-- Author: System
-- Date: 2025-01-14

-- Drop existing function
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID);

-- Create updated dashboard statistics function with Donna stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_enterprise_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
    v_contract_stats JSONB;
    v_vendor_stats JSONB;
    v_agent_stats JSONB;
    v_compliance_stats JSONB;
    v_financial_stats JSONB;
BEGIN
    -- Contract Statistics
    WITH contract_data AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'draft') as draft,
            COUNT(*) FILTER (WHERE status = 'pending_analysis') as pending_analysis,
            COUNT(*) FILTER (WHERE status = 'expired') as expired,
            COUNT(*) FILTER (WHERE status = 'terminated') as terminated,
            COUNT(*) FILTER (WHERE status = 'archived') as archived,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recently_created,
            COUNT(*) FILTER (WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days') as expiring_soon,
            COALESCE(SUM(value), 0) as total_value,
            COALESCE(SUM(value) FILTER (WHERE status = 'active'), 0) as active_value
        FROM contracts
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
    ),
    contract_by_type AS (
        SELECT jsonb_object_agg(
            COALESCE(contract_type, 'Other'),
            type_count
        ) as by_type
        FROM (
            SELECT contract_type, COUNT(*) as type_count
            FROM contracts
            WHERE enterprise_id = p_enterprise_id
            AND deleted_at IS NULL
            AND contract_type IS NOT NULL
            GROUP BY contract_type
        ) t
    ),
    contract_by_analysis AS (
        SELECT jsonb_object_agg(
            COALESCE(analysis_status::TEXT, 'pending'),
            status_count
        ) as by_analysis_status
        FROM (
            SELECT analysis_status, COUNT(*) as status_count
            FROM contracts
            WHERE enterprise_id = p_enterprise_id
            AND deleted_at IS NULL
            GROUP BY analysis_status
        ) a
    )
    SELECT jsonb_build_object(
        'total', COALESCE(cd.total, 0),
        'byStatus', jsonb_build_object(
            'active', COALESCE(cd.active, 0),
            'draft', COALESCE(cd.draft, 0),
            'pending_analysis', COALESCE(cd.pending_analysis, 0),
            'expired', COALESCE(cd.expired, 0),
            'terminated', COALESCE(cd.terminated, 0),
            'archived', COALESCE(cd.archived, 0)
        ),
        'byType', COALESCE(cbt.by_type, '{}'::jsonb),
        'byAnalysisStatus', COALESCE(cba.by_analysis_status, '{}'::jsonb),
        'recentlyCreated', COALESCE(cd.recently_created, 0),
        'expiringSoon', COALESCE(cd.expiring_soon, 0),
        'totalValue', COALESCE(cd.total_value, 0),
        'activeValue', COALESCE(cd.active_value, 0)
    )
    INTO v_contract_stats
    FROM contract_data cd
    CROSS JOIN contract_by_type cbt
    CROSS JOIN contract_by_analysis cba;

    -- Vendor Statistics
    WITH vendor_data AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COALESCE(AVG(performance_score), 0) as avg_performance,
            COUNT(*) FILTER (WHERE performance_score >= 4.0) as high_performers,
            COUNT(*) FILTER (WHERE performance_score < 2.5) as at_risk,
            COALESCE(SUM(active_contracts), 0) as total_vendor_contracts,
            COALESCE(SUM(total_contract_value), 0) as total_spend
        FROM vendors
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
    ),
    vendor_by_category AS (
        SELECT jsonb_object_agg(
            COALESCE(category::TEXT, 'other'),
            category_count
        ) as by_category
        FROM (
            SELECT category, COUNT(*) as category_count
            FROM vendors
            WHERE enterprise_id = p_enterprise_id
            AND deleted_at IS NULL
            AND category IS NOT NULL
            GROUP BY category
        ) c
    )
    SELECT jsonb_build_object(
        'total', COALESCE(vd.total, 0),
        'active', COALESCE(vd.active, 0),
        'pending', COALESCE(vd.pending, 0),
        'avgPerformance', ROUND(COALESCE(vd.avg_performance, 0)::numeric, 1),
        'highPerformers', COALESCE(vd.high_performers, 0),
        'atRisk', COALESCE(vd.at_risk, 0),
        'byCategory', COALESCE(vbc.by_category, '{}'::jsonb),
        'totalContracts', COALESCE(vd.total_vendor_contracts, 0),
        'totalSpend', COALESCE(vd.total_spend, 0)
    )
    INTO v_vendor_stats
    FROM vendor_data vd
    CROSS JOIN vendor_by_category vbc;

    -- Agent System Statistics with Donna Terminal Stats
    WITH agent_data AS (
        SELECT
            COUNT(DISTINCT id) FILTER (WHERE status = 'running') as active_agents,
            COUNT(DISTINCT id) FILTER (WHERE status IN ('pending', 'running')) as active_tasks,
            COUNT(DISTINCT id) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_tasks
        FROM agent_tasks
        WHERE enterprise_id = p_enterprise_id
    ),
    donna_insight_data AS (
        SELECT
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_insights,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as daily_insights,
            COUNT(*) as total_insights,
            COALESCE(AVG(confidence), 0) as avg_confidence
        FROM donna_insights
        WHERE enterprise_id = p_enterprise_id
    ),
    donna_pattern_data AS (
        SELECT
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_patterns,
            COUNT(*) as total_patterns
        FROM donna_knowledge_nodes
        WHERE enterprise_id = p_enterprise_id
        AND node_type = 'pattern'
    ),
    donna_recommendation_data AS (
        SELECT
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_recommendations,
            COUNT(*) as total_recommendations,
            COALESCE(AVG(success_rate), 0) as avg_success_rate
        FROM donna_best_practices
    )
    SELECT jsonb_build_object(
        'activeAgents', COALESCE(ad.active_agents, 0),
        'activeTasks', COALESCE(ad.active_tasks, 0),
        'recentTasks', COALESCE(ad.recent_tasks, 0),
        'recentInsights', COALESCE(did.recent_insights, 0),
        'dailyInsights', COALESCE(did.daily_insights, 0),
        'totalInsights', COALESCE(did.total_insights, 0),
        'avgInsightConfidence', ROUND(COALESCE(did.avg_confidence, 0)::numeric, 2),
        'recentPatterns', COALESCE(dpd.recent_patterns, 0),
        'totalPatterns', COALESCE(dpd.total_patterns, 0),
        'recentRecommendations', COALESCE(drd.recent_recommendations, 0),
        'totalRecommendations', COALESCE(drd.total_recommendations, 0),
        'avgRecommendationSuccess', ROUND(COALESCE(drd.avg_success_rate, 0)::numeric, 2),
        'isRunning', COALESCE(ad.active_agents, 0) > 0
    )
    INTO v_agent_stats
    FROM agent_data ad
    CROSS JOIN donna_insight_data did
    CROSS JOIN donna_pattern_data dpd
    CROSS JOIN donna_recommendation_data drd;

    -- Compliance Statistics
    WITH compliance_data AS (
        SELECT
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE passed = true) as passed_checks,
            COUNT(*) FILTER (WHERE passed = false) as failed_checks,
            COUNT(*) FILTER (WHERE severity = 'critical' AND passed = false) as critical_issues,
            COUNT(*) FILTER (WHERE severity = 'high' AND passed = false) as high_issues,
            COUNT(*) FILTER (WHERE performed_at >= NOW() - INTERVAL '30 days') as recent_checks
        FROM compliance_checks
        WHERE enterprise_id = p_enterprise_id
    )
    SELECT jsonb_build_object(
        'totalChecks', COALESCE(total_checks, 0),
        'passedChecks', COALESCE(passed_checks, 0),
        'failedChecks', COALESCE(failed_checks, 0),
        'criticalIssues', COALESCE(critical_issues, 0),
        'highIssues', COALESCE(high_issues, 0),
        'recentChecks', COALESCE(recent_checks, 0),
        'complianceRate', CASE
            WHEN total_checks > 0 THEN ROUND((passed_checks::DECIMAL / total_checks) * 100, 1)
            ELSE 100.0
        END
    )
    INTO v_compliance_stats
    FROM compliance_data;

    -- Financial Statistics
    WITH budget_data AS (
        SELECT
            COALESCE(SUM(total_budget), 0) as total_budget,
            COALESCE(SUM(allocated_amount), 0) as allocated_amount,
            COALESCE(SUM(spent_amount), 0) as spent_amount,
            COALESCE(SUM(committed_amount), 0) as committed_amount,
            COUNT(*) FILTER (WHERE status = 'at_risk') as budgets_at_risk,
            COUNT(*) FILTER (WHERE status = 'exceeded') as budgets_exceeded
        FROM budgets
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
        AND end_date >= NOW()
    )
    SELECT jsonb_build_object(
        'totalBudget', COALESCE(total_budget, 0),
        'allocatedAmount', COALESCE(allocated_amount, 0),
        'spentAmount', COALESCE(spent_amount, 0),
        'committedAmount', COALESCE(committed_amount, 0),
        'budgetsAtRisk', COALESCE(budgets_at_risk, 0),
        'budgetsExceeded', COALESCE(budgets_exceeded, 0),
        'utilizationRate', CASE
            WHEN total_budget > 0 THEN ROUND((spent_amount / total_budget) * 100, 1)
            ELSE 0
        END
    )
    INTO v_financial_stats
    FROM budget_data;

    -- Combine all statistics
    v_stats := jsonb_build_object(
        'contracts', v_contract_stats,
        'vendors', v_vendor_stats,
        'agents', v_agent_stats,
        'compliance', v_compliance_stats,
        'financial', v_financial_stats,
        'timestamp', NOW()
    );

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_dashboard_stats(UUID) IS 'Returns comprehensive dashboard statistics for an enterprise including contracts, vendors, agents (with Donna terminal stats), compliance, and financial metrics';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
