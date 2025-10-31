-- Vendor Analytics Functions for AI Agent Analysis
-- Migration 068

-- Function to get comprehensive vendor data for AI analysis
CREATE OR REPLACE FUNCTION get_vendor_analytics_data(p_vendor_id UUID, p_enterprise_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vendor_data JSONB;
    v_contracts_data JSONB;
    v_performance_history JSONB;
    v_compliance_data JSONB;
    v_issues_data JSONB;
    v_spend_data JSONB;
BEGIN
    -- Check enterprise access
    IF NOT EXISTS (
        SELECT 1 FROM vendors
        WHERE id = p_vendor_id AND enterprise_id = p_enterprise_id
    ) THEN
        RAISE EXCEPTION 'Vendor not found or access denied';
    END IF;

    -- Get base vendor information
    SELECT jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'vendor_number', v.vendor_number,
        'category', v.category,
        'status', v.status,
        'risk_level', COALESCE(v.risk_level, 'low'),
        'contact_person', v.contact_person,
        'contact_email', v.contact_email,
        'contact_phone', v.contact_phone,
        'address', v.address,
        'performance_score', COALESCE(v.performance_score, 0.86),
        'compliance_score', COALESCE(v.compliance_score, 0.92),
        'metadata', COALESCE(v.metadata, '{}'::jsonb),
        'created_at', v.created_at,
        'updated_at', v.updated_at
    )
    INTO v_vendor_data
    FROM vendors v
    WHERE v.id = p_vendor_id;

    -- Get contracts data
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'title', c.title,
                'status', c.status,
                'contract_type', c.contract_type,
                'value', COALESCE(c.value, 0),
                'start_date', c.start_date,
                'end_date', c.end_date,
                'auto_renewal', c.auto_renewal,
                'renewal_notice_days', c.renewal_notice_days
            )
        ),
        '[]'::jsonb
    )
    INTO v_contracts_data
    FROM contracts c
    WHERE c.vendor_id = p_vendor_id
      AND c.enterprise_id = p_enterprise_id
      AND c.status IN ('active', 'pending', 'signed');

    -- Get performance history (from vendor_performance_scores or calculate from contracts)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'month', to_char(vps.evaluation_date, 'YYYY-MM'),
                'score', COALESCE(vps.overall_score, 0),
                'delivery_score', COALESCE(vps.delivery_score, 0),
                'quality_score', COALESCE(vps.quality_score, 0),
                'responsiveness_score', COALESCE(vps.responsiveness_score, 0),
                'cost_effectiveness_score', COALESCE(vps.cost_effectiveness_score, 0)
            ) ORDER BY vps.evaluation_date DESC
        ),
        '[]'::jsonb
    )
    INTO v_performance_history
    FROM vendor_performance_scores vps
    WHERE vps.vendor_id = p_vendor_id
      AND vps.enterprise_id = p_enterprise_id
      AND vps.evaluation_date >= NOW() - INTERVAL '6 months';

    -- Get compliance data
    SELECT jsonb_build_object(
        'insurance_verified', COALESCE((v_vendor_data->>'metadata')::jsonb->>'insurance_verified', 'false')::boolean,
        'certifications', COALESCE((v_vendor_data->>'metadata')::jsonb->'certifications', '[]'::jsonb),
        'last_audit_date', (v_vendor_data->>'metadata')::jsonb->>'last_audit_date',
        'next_review_date', (v_vendor_data->>'metadata')::jsonb->>'next_review_date',
        'compliance_score', (v_vendor_data->>'compliance_score')::decimal
    )
    INTO v_compliance_data;

    -- Get issues/incidents data
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'date', i.created_at,
                'type', i.issue_type,
                'severity', i.severity,
                'description', i.description,
                'status', i.status,
                'resolved_at', i.resolved_at
            ) ORDER BY i.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_issues_data
    FROM vendor_issues i
    WHERE i.vendor_id = p_vendor_id
      AND i.enterprise_id = p_enterprise_id
      AND i.created_at >= NOW() - INTERVAL '6 months';

    -- Calculate spend data from contracts
    SELECT jsonb_build_object(
        'total_contract_value', COALESCE(SUM(c.value), 0),
        'active_contract_value', COALESCE(
            SUM(CASE WHEN c.status = 'active' THEN c.value ELSE 0 END),
            0
        ),
        'annual_spend_estimate', COALESCE(
            SUM(CASE
                WHEN c.status = 'active' AND c.start_date IS NOT NULL AND c.end_date IS NOT NULL
                THEN c.value / NULLIF(EXTRACT(YEAR FROM AGE(c.end_date, c.start_date))::numeric, 0)
                ELSE 0
            END),
            0
        ),
        'contract_count', COUNT(*),
        'active_contract_count', COUNT(CASE WHEN c.status = 'active' THEN 1 END)
    )
    INTO v_spend_data
    FROM contracts c
    WHERE c.vendor_id = p_vendor_id
      AND c.enterprise_id = p_enterprise_id;

    -- Combine all data
    RETURN jsonb_build_object(
        'vendor', v_vendor_data,
        'contracts', v_contracts_data,
        'performance_history', v_performance_history,
        'compliance', v_compliance_data,
        'issues', v_issues_data,
        'spend', v_spend_data
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_vendor_analytics_data(UUID, UUID) TO authenticated;

-- Create vendor issues table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendor_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL, -- delivery_delay, quality_issue, communication, billing, compliance, other
    severity VARCHAR(20) DEFAULT 'medium', -- critical, high, medium, low
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, closed
    reported_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for vendor issues
CREATE INDEX IF NOT EXISTS idx_vendor_issues_vendor_id ON vendor_issues(vendor_id, enterprise_id);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_created_at ON vendor_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_status ON vendor_issues(status);

-- RLS for vendor issues
ALTER TABLE vendor_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_issues_select_policy ON vendor_issues
    FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY vendor_issues_insert_policy ON vendor_issues
    FOR INSERT
    WITH CHECK (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY vendor_issues_update_policy ON vendor_issues
    FOR UPDATE
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Add comment
COMMENT ON FUNCTION get_vendor_analytics_data IS 'Retrieves comprehensive vendor data for AI agent analysis including contracts, performance, compliance, and issues';
