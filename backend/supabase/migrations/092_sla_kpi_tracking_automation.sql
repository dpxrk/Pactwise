-- =====================================================
-- SLA & Performance KPI Tracking Automation
-- =====================================================
-- Description: Track vendor SLAs and KPIs, automatically detect breaches
-- Agents triggered:
--   1. Analytics Agent: SLA breach analysis (priority 7)
--   2. Vendor Agent: Remediation planning (priority 6)
-- Triggers: Event-driven (metric updates) + Daily scheduled compliance check
-- =====================================================

-- Table to store vendor SLA definitions
CREATE TABLE IF NOT EXISTS vendor_slas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    sla_name VARCHAR(255) NOT NULL,
    sla_type VARCHAR(100) NOT NULL, -- 'response_time', 'delivery_time', 'quality_score', 'uptime', 'custom'
    metric_name VARCHAR(100) NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    threshold_warning DECIMAL(10,2), -- Yellow alert threshold
    threshold_breach DECIMAL(10,2) NOT NULL, -- Red alert threshold
    measurement_unit VARCHAR(50), -- 'hours', 'days', 'percent', 'score', 'count'
    measurement_period VARCHAR(50) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly'
    is_active BOOLEAN DEFAULT true,
    breach_penalty DECIMAL(15,2), -- Financial penalty per breach
    escalation_rules JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(vendor_id, sla_name, deleted_at)
);

-- Table to track vendor KPI history
CREATE TABLE IF NOT EXISTS vendor_kpi_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    sla_id UUID REFERENCES vendor_slas(id) ON DELETE SET NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    target_value DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'compliant', -- 'compliant', 'warning', 'breached'
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    measurement_period VARCHAR(50),
    notes TEXT,
    evidence JSONB DEFAULT '{}', -- Supporting data/documentation
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_vendor_slas_vendor_id ON vendor_slas(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_slas_enterprise_id ON vendor_slas(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_slas_active ON vendor_slas(is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_vendor_kpi_tracking_vendor_id ON vendor_kpi_tracking(vendor_id);
CREATE INDEX idx_vendor_kpi_tracking_sla_id ON vendor_kpi_tracking(sla_id);
CREATE INDEX idx_vendor_kpi_tracking_date ON vendor_kpi_tracking(measurement_date DESC);
CREATE INDEX idx_vendor_kpi_tracking_status ON vendor_kpi_tracking(status) WHERE status IN ('warning', 'breached');

-- Function to check SLA compliance when KPI is recorded
CREATE OR REPLACE FUNCTION check_sla_compliance_on_kpi()
RETURNS TRIGGER AS $$
DECLARE
    v_sla RECORD;
    v_analytics_agent_id UUID;
    v_vendor_agent_id UUID;
    v_breach_severity VARCHAR(20);
    v_vendor_name VARCHAR(255);
BEGIN
    -- Get associated SLA if exists
    IF NEW.sla_id IS NOT NULL THEN
        SELECT * INTO v_sla FROM vendor_slas WHERE id = NEW.sla_id AND deleted_at IS NULL;

        IF v_sla.id IS NOT NULL AND v_sla.is_active THEN
            -- Check for breach or warning
            IF NEW.metric_value <= v_sla.threshold_breach THEN
                NEW.status := 'breached';
                v_breach_severity := 'critical';
            ELSIF NEW.metric_value <= v_sla.threshold_warning THEN
                NEW.status := 'warning';
                v_breach_severity := 'high';
            ELSE
                NEW.status := 'compliant';
                RETURN NEW; -- No action needed for compliant status
            END IF;

            -- Get vendor name
            SELECT name INTO v_vendor_name FROM vendors WHERE id = NEW.vendor_id;

            -- Get agent IDs
            SELECT id INTO v_analytics_agent_id FROM agents
            WHERE type = 'analytics' AND enterprise_id = NEW.enterprise_id AND is_active = true LIMIT 1;

            SELECT id INTO v_vendor_agent_id FROM agents
            WHERE type = 'vendor' AND enterprise_id = NEW.enterprise_id AND is_active = true LIMIT 1;

            -- Queue Analytics Agent task: SLA breach analysis
            IF v_analytics_agent_id IS NOT NULL AND NEW.status = 'breached' THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    vendor_id,
                    enterprise_id,
                    status
                ) VALUES (
                    v_analytics_agent_id,
                    'sla_breach_analysis',
                    7, -- High priority
                    jsonb_build_object(
                        'vendor_id', NEW.vendor_id,
                        'vendor_name', v_vendor_name,
                        'sla_id', v_sla.id,
                        'sla_name', v_sla.sla_name,
                        'sla_type', v_sla.sla_type,
                        'metric_name', NEW.metric_name,
                        'metric_value', NEW.metric_value,
                        'target_value', v_sla.target_value,
                        'threshold_breach', v_sla.threshold_breach,
                        'breach_penalty', v_sla.breach_penalty,
                        'measurement_date', NEW.measurement_date,
                        'analysis_type', 'sla_breach_root_cause',
                        'trigger_source', 'sla_tracking_automation',
                        'requested_outputs', jsonb_build_array(
                            'breach_root_cause_analysis',
                            'historical_trend_analysis',
                            'impact_assessment',
                            'frequency_analysis',
                            'vendor_comparison'
                        )
                    ),
                    NEW.vendor_id,
                    NEW.enterprise_id,
                    'pending'
                );
            END IF;

            -- Queue Vendor Agent task: Remediation planning
            IF v_vendor_agent_id IS NOT NULL AND NEW.status IN ('breached', 'warning') THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    vendor_id,
                    enterprise_id,
                    status
                ) VALUES (
                    v_vendor_agent_id,
                    'sla_remediation_planning',
                    CASE WHEN NEW.status = 'breached' THEN 7 ELSE 6 END,
                    jsonb_build_object(
                        'vendor_id', NEW.vendor_id,
                        'vendor_name', v_vendor_name,
                        'sla_name', v_sla.sla_name,
                        'breach_status', NEW.status,
                        'metric_value', NEW.metric_value,
                        'target_value', v_sla.target_value,
                        'escalation_rules', v_sla.escalation_rules,
                        'analysis_type', 'sla_remediation',
                        'trigger_source', 'sla_tracking_automation',
                        'requested_outputs', jsonb_build_array(
                            'remediation_plan',
                            'vendor_communication_draft',
                            'escalation_recommendation',
                            'penalty_assessment',
                            'contract_review_needed'
                        )
                    ),
                    NEW.vendor_id,
                    NEW.enterprise_id,
                    'pending'
                );
            END IF;

            -- Create notification for SLA breach/warning
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                severity,
                data,
                enterprise_id,
                action_url
            ) VALUES (
                COALESCE(NEW.recorded_by, (
                    SELECT created_by FROM vendors WHERE id = NEW.vendor_id
                )),
                'sla_breach_alert',
                format('SLA %s: %s - %s',
                    CASE WHEN NEW.status = 'breached' THEN 'BREACH' ELSE 'WARNING' END,
                    v_vendor_name,
                    v_sla.sla_name
                ),
                format(
                    'Vendor "%s" %s SLA "%s". Metric: %s (Target: %s, Actual: %s)',
                    v_vendor_name,
                    CASE WHEN NEW.status = 'breached' THEN 'breached' ELSE 'is in warning for' END,
                    v_sla.sla_name,
                    NEW.metric_name,
                    v_sla.target_value,
                    NEW.metric_value
                ),
                v_breach_severity,
                jsonb_build_object(
                    'vendor_id', NEW.vendor_id,
                    'sla_id', v_sla.id,
                    'kpi_tracking_id', NEW.id,
                    'metric_value', NEW.metric_value,
                    'target_value', v_sla.target_value,
                    'breach_penalty', v_sla.breach_penalty
                ),
                NEW.enterprise_id,
                format('/dashboard/vendors/%s?tab=slas', NEW.vendor_id)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily scheduled function to check all active SLAs
CREATE OR REPLACE FUNCTION check_vendor_sla_compliance_daily()
RETURNS void AS $$
DECLARE
    v_sla RECORD;
    v_latest_kpi RECORD;
BEGIN
    -- Loop through all active SLAs
    FOR v_sla IN
        SELECT * FROM vendor_slas
        WHERE is_active = true
        AND deleted_at IS NULL
    LOOP
        -- Get latest KPI measurement for this SLA
        SELECT * INTO v_latest_kpi
        FROM vendor_kpi_tracking
        WHERE sla_id = v_sla.id
        ORDER BY measurement_date DESC, created_at DESC
        LIMIT 1;

        -- If no recent measurement exists (>7 days old), create warning
        IF v_latest_kpi.id IS NULL OR v_latest_kpi.measurement_date < CURRENT_DATE - INTERVAL '7 days' THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                severity,
                data,
                enterprise_id
            ) VALUES (
                (SELECT created_by FROM vendors WHERE id = v_sla.vendor_id),
                'sla_measurement_overdue',
                'SLA Measurement Overdue',
                format('SLA "%s" for vendor "%s" has not been measured in over 7 days.',
                    v_sla.sla_name,
                    (SELECT name FROM vendors WHERE id = v_sla.vendor_id)
                ),
                'medium',
                jsonb_build_object(
                    'vendor_id', v_sla.vendor_id,
                    'sla_id', v_sla.id,
                    'last_measurement_date', COALESCE(v_latest_kpi.measurement_date, 'never')
                ),
                v_sla.enterprise_id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_check_sla_compliance_on_kpi ON vendor_kpi_tracking;
CREATE TRIGGER trigger_check_sla_compliance_on_kpi
    BEFORE INSERT ON vendor_kpi_tracking
    FOR EACH ROW
    EXECUTE FUNCTION check_sla_compliance_on_kpi();

-- Add RLS policies
ALTER TABLE vendor_slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_kpi_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SLAs in their enterprise"
    ON vendor_slas FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage SLAs in their enterprise"
    ON vendor_slas FOR ALL
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view KPIs in their enterprise"
    ON vendor_kpi_tracking FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can record KPIs in their enterprise"
    ON vendor_kpi_tracking FOR INSERT
    WITH CHECK (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Add comments
COMMENT ON TABLE vendor_slas IS
'Defines SLA agreements with vendors including targets, thresholds, and penalties.
Supports various SLA types: response time, delivery time, quality score, uptime, custom metrics.';

COMMENT ON TABLE vendor_kpi_tracking IS
'Historical tracking of vendor KPI measurements against defined SLAs.
Auto-triggers breach analysis and remediation planning when thresholds are exceeded.';

COMMENT ON FUNCTION check_sla_compliance_on_kpi() IS
'Automatically checks SLA compliance when new KPI measurement is recorded.
Triggers Analytics Agent (breach analysis) and Vendor Agent (remediation planning) on breaches.
Creates notifications for breaches and warnings.';

COMMENT ON FUNCTION check_vendor_sla_compliance_daily() IS
'Daily scheduled function to ensure SLAs are being measured regularly.
Creates alerts if SLA measurements are overdue (>7 days since last measurement).
Should be called via cron job every day.';
