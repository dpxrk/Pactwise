-- Migration: Vendor Performance Statistics Function
-- Description: Comprehensive function to get vendor-specific performance metrics
-- Author: System
-- Date: 2025-01-XX

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_vendor_performance_stats(UUID, UUID, TEXT);

-- Create vendor performance statistics function
CREATE OR REPLACE FUNCTION get_vendor_performance_stats(
    p_vendor_id UUID,
    p_enterprise_id UUID,
    p_time_range TEXT DEFAULT '90d'
) RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
    v_date_threshold TIMESTAMP;
    v_performance_metrics JSONB;
    v_time_series JSONB;
    v_contract_performance JSONB;
    v_vendor_info JSONB;
BEGIN
    -- Calculate date threshold based on time range
    v_date_threshold := CASE
        WHEN p_time_range = '30d' THEN NOW() - INTERVAL '30 days'
        WHEN p_time_range = '90d' THEN NOW() - INTERVAL '90 days'
        WHEN p_time_range = '12m' THEN NOW() - INTERVAL '12 months'
        ELSE NOW() - INTERVAL '90 days'
    END;

    -- Get vendor basic info
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'category', category,
        'status', status,
        'performanceScore', performance_score,
        'totalContracts', active_contracts,
        'totalValue', total_contract_value
    )
    INTO v_vendor_info
    FROM vendors
    WHERE id = p_vendor_id
    AND enterprise_id = p_enterprise_id
    AND deleted_at IS NULL;

    -- Calculate performance metrics
    WITH contract_metrics AS (
        SELECT
            COUNT(*) as total_contracts,
            COUNT(*) FILTER (WHERE status = 'active') as active_contracts,
            COUNT(*) FILTER (WHERE status = 'expired') as expired_contracts,
            COUNT(*) FILTER (WHERE end_date < NOW()) as overdue_contracts,
            COUNT(*) FILTER (WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days') as expiring_soon,
            COALESCE(SUM(value), 0) as total_value,
            COALESCE(AVG(value), 0) as avg_contract_value,
            -- Delivery timeliness: percentage of contracts not expired
            CASE
                WHEN COUNT(*) > 0 THEN
                    ROUND((COUNT(*) FILTER (WHERE status = 'active' OR end_date >= NOW())::DECIMAL / COUNT(*)) * 100, 1)
                ELSE 100.0
            END as delivery_timeliness,
            -- Contract renewal rate
            CASE
                WHEN COUNT(*) FILTER (WHERE status = 'expired') > 0 THEN
                    ROUND((COUNT(*) FILTER (WHERE status = 'active' AND created_at > NOW() - INTERVAL '1 year')::DECIMAL /
                           COUNT(*) FILTER (WHERE status = 'expired')) * 100, 1)
                ELSE 0.0
            END as renewal_rate
        FROM contracts
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
        AND (
            -- Check both vendors JSONB array and legacy vendor_id
            (vendors ? p_vendor_id::TEXT) OR
            (vendor_id = p_vendor_id)
        )
        AND created_at >= v_date_threshold
    ),
    compliance_metrics AS (
        SELECT
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE passed = true) as passed_checks,
            COUNT(*) FILTER (WHERE passed = false AND severity = 'critical') as critical_issues,
            COUNT(*) FILTER (WHERE passed = false AND severity = 'high') as high_issues,
            CASE
                WHEN COUNT(*) > 0 THEN
                    ROUND((COUNT(*) FILTER (WHERE passed = true)::DECIMAL / COUNT(*)) * 100, 1)
                ELSE 100.0
            END as compliance_rate
        FROM compliance_checks
        WHERE enterprise_id = p_enterprise_id
        AND contract_id IN (
            SELECT id FROM contracts
            WHERE enterprise_id = p_enterprise_id
            AND deleted_at IS NULL
            AND (
                (vendors ? p_vendor_id::TEXT) OR
                (vendor_id = p_vendor_id)
            )
        )
        AND performed_at >= v_date_threshold
    ),
    cost_metrics AS (
        SELECT
            COALESCE(SUM(c.value), 0) as total_spend,
            COALESCE(AVG(c.value), 0) as avg_spend,
            -- Cost efficiency: compare to budget
            CASE
                WHEN SUM(c.value) > 0 AND SUM(b.allocated_amount) > 0 THEN
                    ROUND((1 - (SUM(c.value) / SUM(b.allocated_amount))) * 100, 1)
                ELSE 100.0
            END as cost_efficiency
        FROM contracts c
        LEFT JOIN budgets b ON c.budget_id = b.id AND b.deleted_at IS NULL
        WHERE c.enterprise_id = p_enterprise_id
        AND c.deleted_at IS NULL
        AND (
            (c.vendors ? p_vendor_id::TEXT) OR
            (c.vendor_id = p_vendor_id)
        )
        AND c.created_at >= v_date_threshold
    )
    SELECT jsonb_build_object(
        'overallScore', COALESCE(
            ROUND((
                COALESCE((SELECT delivery_timeliness FROM contract_metrics), 0) * 0.25 +
                COALESCE((SELECT compliance_rate FROM compliance_metrics), 0) * 0.30 +
                COALESCE((SELECT cost_efficiency FROM cost_metrics), 0) * 0.25 +
                COALESCE((SELECT renewal_rate FROM contract_metrics), 0) * 0.20
            ), 1), 0
        ),
        'costEfficiency', COALESCE((SELECT cost_efficiency FROM cost_metrics), 0),
        'deliveryTimeliness', COALESCE((SELECT delivery_timeliness FROM contract_metrics), 0),
        'qualityScore', COALESCE((SELECT compliance_rate FROM compliance_metrics), 0),
        'riskAssessment', COALESCE(
            (SELECT critical_issues * 10 + high_issues * 5 FROM compliance_metrics), 0
        ),
        'communicationScore', 85.0, -- Placeholder: could be calculated from task response times
        'metrics', jsonb_build_object(
            'totalContracts', COALESCE((SELECT total_contracts FROM contract_metrics), 0),
            'activeContracts', COALESCE((SELECT active_contracts FROM contract_metrics), 0),
            'expiredContracts', COALESCE((SELECT expired_contracts FROM contract_metrics), 0),
            'expiringSoon', COALESCE((SELECT expiring_soon FROM contract_metrics), 0),
            'totalValue', COALESCE((SELECT total_value FROM contract_metrics), 0),
            'avgContractValue', COALESCE((SELECT avg_contract_value FROM contract_metrics), 0),
            'totalSpend', COALESCE((SELECT total_spend FROM cost_metrics), 0),
            'complianceChecks', COALESCE((SELECT total_checks FROM compliance_metrics), 0),
            'compliancePassed', COALESCE((SELECT passed_checks FROM compliance_metrics), 0),
            'criticalIssues', COALESCE((SELECT critical_issues FROM compliance_metrics), 0),
            'highIssues', COALESCE((SELECT high_issues FROM compliance_metrics), 0)
        )
    )
    INTO v_performance_metrics;

    -- Get time series performance data (monthly aggregation)
    WITH monthly_performance AS (
        SELECT
            DATE_TRUNC('month', c.created_at) as month,
            COUNT(*) as contracts_count,
            COALESCE(AVG(
                CASE
                    WHEN c.status = 'active' THEN 90.0
                    WHEN c.status = 'expired' AND c.end_date >= NOW() THEN 70.0
                    ELSE 50.0
                END
            ), 0) as performance_score
        FROM contracts c
        WHERE c.enterprise_id = p_enterprise_id
        AND c.deleted_at IS NULL
        AND (
            (c.vendors ? p_vendor_id::TEXT) OR
            (c.vendor_id = p_vendor_id)
        )
        AND c.created_at >= v_date_threshold
        GROUP BY DATE_TRUNC('month', c.created_at)
        ORDER BY month DESC
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', TO_CHAR(month, 'YYYY-MM-DD'),
            'value', ROUND(performance_score::NUMERIC, 1),
            'contractCount', contracts_count
        )
        ORDER BY month ASC
    )
    INTO v_time_series
    FROM monthly_performance;

    -- Get individual contract performance
    WITH contract_perf AS (
        SELECT
            c.id,
            c.title,
            -- Performance score based on status and dates
            CASE
                WHEN c.status = 'active' AND c.end_date > NOW() + INTERVAL '30 days' THEN 95.0
                WHEN c.status = 'active' AND c.end_date > NOW() THEN 85.0
                WHEN c.status = 'active' AND c.end_date < NOW() THEN 60.0
                WHEN c.status = 'expired' AND c.end_date >= NOW() - INTERVAL '30 days' THEN 75.0
                ELSE 50.0
            END as performance_score,
            -- Delivery score based on timeliness
            CASE
                WHEN c.end_date > NOW() + INTERVAL '90 days' THEN 100.0
                WHEN c.end_date > NOW() + INTERVAL '30 days' THEN 90.0
                WHEN c.end_date > NOW() THEN 75.0
                ELSE 50.0
            END as delivery_score,
            -- Quality score from compliance
            COALESCE(
                (SELECT
                    ROUND((COUNT(*) FILTER (WHERE passed = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 1)
                FROM compliance_checks
                WHERE contract_id = c.id
                ), 100.0
            ) as quality_score,
            -- Cost efficiency
            CASE
                WHEN b.allocated_amount > 0 AND c.value <= b.allocated_amount THEN 100.0
                WHEN b.allocated_amount > 0 THEN GREATEST(50.0, 100.0 - ((c.value - b.allocated_amount) / b.allocated_amount * 50))
                ELSE 90.0
            END as cost_efficiency,
            -- Risk level
            CASE
                WHEN (SELECT COUNT(*) FROM compliance_checks
                      WHERE contract_id = c.id AND passed = false AND severity = 'critical') > 0
                THEN 'high'
                WHEN (SELECT COUNT(*) FROM compliance_checks
                      WHERE contract_id = c.id AND passed = false AND severity = 'high') > 0
                THEN 'medium'
                ELSE 'low'
            END as risk_level,
            c.updated_at
        FROM contracts c
        LEFT JOIN budgets b ON c.budget_id = b.id AND b.deleted_at IS NULL
        WHERE c.enterprise_id = p_enterprise_id
        AND c.deleted_at IS NULL
        AND (
            (c.vendors ? p_vendor_id::TEXT) OR
            (c.vendor_id = p_vendor_id)
        )
        AND c.created_at >= v_date_threshold
        ORDER BY c.created_at DESC
        LIMIT 10
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'contractId', id,
            'contractTitle', title,
            'performanceScore', ROUND(performance_score::NUMERIC, 1),
            'deliveryScore', ROUND(delivery_score::NUMERIC, 1),
            'qualityScore', ROUND(quality_score::NUMERIC, 1),
            'costEfficiency', ROUND(cost_efficiency::NUMERIC, 1),
            'riskLevel', risk_level,
            'lastUpdated', TO_CHAR(updated_at, 'YYYY-MM-DD')
        )
    )
    INTO v_contract_performance
    FROM contract_perf;

    -- Combine all statistics
    v_stats := jsonb_build_object(
        'vendor', v_vendor_info,
        'performance', v_performance_metrics,
        'timeSeries', COALESCE(v_time_series, '[]'::jsonb),
        'contractPerformance', COALESCE(v_contract_performance, '[]'::jsonb),
        'timeRange', p_time_range,
        'timestamp', NOW()
    );

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_vendor_performance_stats(UUID, UUID, TEXT) IS
'Returns comprehensive performance statistics for a specific vendor including metrics, time series data, and individual contract performance';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_vendor_performance_stats(UUID, UUID, TEXT) TO authenticated;
