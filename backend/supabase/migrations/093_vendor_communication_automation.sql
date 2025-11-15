-- =====================================================
-- Vendor Communication Automation
-- =====================================================
-- Description: Automatically generate and manage vendor communications
-- Agents triggered:
--   1. Integration Agent: Generate personalized communication (priority 5)
--   2. Notifications Agent: Delivery management (priority 6)
-- Triggers: Document expiration, SLA breach, compliance request, weekly reports
-- =====================================================

-- Table to track vendor communications
CREATE TABLE IF NOT EXISTS vendor_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    communication_type VARCHAR(100) NOT NULL, -- 'renewal_notice', 'sla_breach', 'compliance_request', 'performance_report', 'general'
    template_id UUID REFERENCES communication_templates(id),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced', 'opened', 'responded'
    delivery_error TEXT,
    response_received BOOLEAN DEFAULT false,
    response_date TIMESTAMP WITH TIME ZONE,
    response_data JSONB,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store communication templates
CREATE TABLE IF NOT EXISTS communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    communication_type VARCHAR(100) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- List of required template variables
    is_active BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'en',
    tone VARCHAR(50) DEFAULT 'professional', -- 'professional', 'friendly', 'formal', 'urgent'
    enterprise_id UUID REFERENCES enterprises(id), -- NULL = global template
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, enterprise_id)
);

-- Create indexes
CREATE INDEX idx_vendor_communications_vendor ON vendor_communications(vendor_id);
CREATE INDEX idx_vendor_communications_type ON vendor_communications(communication_type);
CREATE INDEX idx_vendor_communications_status ON vendor_communications(status);
CREATE INDEX idx_vendor_communications_enterprise ON vendor_communications(enterprise_id);
CREATE INDEX idx_vendor_communications_sent ON vendor_communications(sent_at DESC);

CREATE INDEX idx_communication_templates_type ON communication_templates(communication_type);
CREATE INDEX idx_communication_templates_active ON communication_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_communication_templates_enterprise ON communication_templates(enterprise_id);

-- Function to queue vendor communication
CREATE OR REPLACE FUNCTION queue_vendor_communication(
    p_vendor_id UUID,
    p_communication_type VARCHAR,
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_integration_agent_id UUID;
    v_notifications_agent_id UUID;
    v_vendor RECORD;
    v_template RECORD;
    v_communication_id UUID;
    v_enterprise_id UUID;
BEGIN
    -- Get vendor details
    SELECT * INTO v_vendor
    FROM vendors
    WHERE id = p_vendor_id
    AND deleted_at IS NULL;

    IF v_vendor.id IS NULL THEN
        RAISE EXCEPTION 'Vendor not found';
    END IF;

    v_enterprise_id := v_vendor.enterprise_id;

    -- Get appropriate template (enterprise-specific or global)
    SELECT * INTO v_template
    FROM communication_templates
    WHERE communication_type = p_communication_type
    AND is_active = true
    AND (enterprise_id = v_enterprise_id OR enterprise_id IS NULL)
    ORDER BY enterprise_id NULLS LAST
    LIMIT 1;

    -- Create communication record
    INSERT INTO vendor_communications (
        vendor_id,
        communication_type,
        template_id,
        subject,
        body,
        recipient_email,
        recipient_name,
        status,
        metadata,
        enterprise_id,
        created_by
    ) VALUES (
        p_vendor_id,
        p_communication_type,
        v_template.id,
        COALESCE(v_template.subject_template, format('%s Communication', v_vendor.name)),
        COALESCE(v_template.body_template, 'Template not configured'),
        v_vendor.contact_email,
        v_vendor.contact_name,
        'pending',
        p_context,
        v_enterprise_id,
        (SELECT id FROM users WHERE enterprise_id = v_enterprise_id AND role IN ('admin', 'owner') LIMIT 1)
    ) RETURNING id INTO v_communication_id;

    -- Get agent IDs
    SELECT id INTO v_integration_agent_id
    FROM agents
    WHERE type = 'integration'
    AND enterprise_id = v_enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_notifications_agent_id
    FROM agents
    WHERE type = 'notifications'
    AND enterprise_id = v_enterprise_id
    AND is_active = true
    LIMIT 1;

    -- Queue Integration Agent task: Generate personalized communication
    IF v_integration_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_integration_agent_id,
            'generate_vendor_communication',
            5,
            jsonb_build_object(
                'communication_id', v_communication_id,
                'vendor_id', p_vendor_id,
                'vendor_name', v_vendor.name,
                'communication_type', p_communication_type,
                'template_id', v_template.id,
                'context', p_context,
                'trigger_source', 'vendor_communication_automation',
                'requested_outputs', jsonb_build_array(
                    'personalized_subject',
                    'personalized_body',
                    'recommended_send_time',
                    'follow_up_suggestions'
                )
            ),
            p_vendor_id,
            v_enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Notifications Agent task: Delivery management
    IF v_notifications_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_notifications_agent_id,
            'vendor_communication_delivery',
            6,
            jsonb_build_object(
                'communication_id', v_communication_id,
                'vendor_id', p_vendor_id,
                'recipient_email', v_vendor.contact_email,
                'communication_type', p_communication_type,
                'trigger_source', 'vendor_communication_automation'
            ),
            p_vendor_id,
            v_enterprise_id,
            'pending'
        );
    END IF;

    RETURN v_communication_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for vendor document expiration notices
CREATE OR REPLACE FUNCTION send_vendor_document_expiration_notice()
RETURNS void AS $$
DECLARE
    v_document RECORD;
BEGIN
    -- Find documents expiring in 30 or 7 days
    FOR v_document IN
        SELECT
            vd.*,
            v.id as vendor_id,
            v.name as vendor_name,
            v.contact_email
        FROM vendor_documents vd
        JOIN vendors v ON v.id = vd.vendor_id
        WHERE vd.deleted_at IS NULL
        AND vd.status = 'verified'
        AND vd.expiration_date IS NOT NULL
        AND (
            vd.expiration_date = CURRENT_DATE + INTERVAL '30 days' OR
            vd.expiration_date = CURRENT_DATE + INTERVAL '7 days'
        )
    LOOP
        -- Queue communication
        PERFORM queue_vendor_communication(
            v_document.vendor_id,
            'renewal_notice',
            jsonb_build_object(
                'document_id', v_document.id,
                'document_name', v_document.document_name,
                'document_type', v_document.document_type,
                'expiration_date', v_document.expiration_date,
                'days_until_expiry', (v_document.expiration_date - CURRENT_DATE)
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default communication templates
INSERT INTO communication_templates (name, communication_type, subject_template, body_template, variables, tone)
VALUES
    (
        'Document Renewal Notice',
        'renewal_notice',
        'Action Required: {{document_name}} Expires in {{days_until_expiry}} Days',
        E'Dear {{vendor_name}},\n\nThis is a reminder that your {{document_type}} "{{document_name}}" is set to expire on {{expiration_date}}.\n\nPlease provide an updated copy at your earliest convenience to maintain compliance.\n\nThank you for your attention to this matter.\n\nBest regards',
        '["vendor_name", "document_name", "document_type", "expiration_date", "days_until_expiry"]'::jsonb,
        'professional'
    ),
    (
        'SLA Breach Notification',
        'sla_breach',
        'SLA Breach Alert: {{sla_name}}',
        E'Dear {{vendor_name}},\n\nWe have identified a breach of the Service Level Agreement "{{sla_name}}".\n\nDetails:\n- Metric: {{metric_name}}\n- Target: {{target_value}}\n- Actual: {{actual_value}}\n- Date: {{breach_date}}\n\nPlease provide a root cause analysis and remediation plan within 48 hours.\n\nBest regards',
        '["vendor_name", "sla_name", "metric_name", "target_value", "actual_value", "breach_date"]'::jsonb,
        'formal'
    ),
    (
        'Compliance Document Request',
        'compliance_request',
        'Compliance Documentation Required',
        E'Dear {{vendor_name}},\n\nTo maintain our vendor compliance standards, we require the following documentation:\n\n{{required_documents}}\n\nPlease submit these documents by {{deadline}}.\n\nThank you for your cooperation.\n\nBest regards',
        '["vendor_name", "required_documents", "deadline"]'::jsonb,
        'professional'
    ),
    (
        'Monthly Performance Report',
        'performance_report',
        'Monthly Performance Summary - {{month}}',
        E'Dear {{vendor_name}},\n\nHere is your performance summary for {{month}}:\n\n- Performance Score: {{performance_score}}/5\n- Compliance Score: {{compliance_score}}/5\n- Active Contracts: {{active_contracts}}\n- Total Contract Value: ${{total_value}}\n\nThank you for your continued partnership.\n\nBest regards',
        '["vendor_name", "month", "performance_score", "compliance_score", "active_contracts", "total_value"]'::jsonb,
        'friendly'
    )
ON CONFLICT (name, enterprise_id) DO NOTHING;

-- RLS policies
ALTER TABLE vendor_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor communications in their enterprise"
    ON vendor_communications FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create vendor communications in their enterprise"
    ON vendor_communications FOR INSERT
    WITH CHECK (
        enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid())
        AND created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "Users can update vendor communications in their enterprise"
    ON vendor_communications FOR UPDATE
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view communication templates"
    ON communication_templates FOR SELECT
    USING (enterprise_id IS NULL OR enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Admins can manage communication templates"
    ON communication_templates FOR ALL
    USING (
        enterprise_id IS NULL OR
        enterprise_id IN (
            SELECT enterprise_id FROM users
            WHERE auth_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- Comments
COMMENT ON TABLE vendor_communications IS
'Tracks automated and manual communications sent to vendors.
Includes renewal notices, SLA breaches, compliance requests, and performance reports.
Integrates with Integration Agent and Notifications Agent for automated delivery.';

COMMENT ON TABLE communication_templates IS
'Reusable templates for vendor communications with variable substitution.
Can be global (enterprise_id = NULL) or enterprise-specific.
Supports multiple tones (professional, friendly, formal, urgent).';

COMMENT ON FUNCTION queue_vendor_communication(UUID, VARCHAR, JSONB) IS
'Creates vendor communication record and queues Integration Agent (personalization) and Notifications Agent (delivery).
Automatically selects appropriate template (enterprise-specific or global).
Returns communication_id for tracking.';

COMMENT ON FUNCTION send_vendor_document_expiration_notice() IS
'Daily scheduled function to send renewal notices for expiring vendor documents (30/7 days).
Should be called via cron job every day at 9 AM.';
