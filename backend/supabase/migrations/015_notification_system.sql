-- Enhanced Notification System

-- Email queue table
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT[] DEFAULT '{}',
    bcc_emails TEXT[] DEFAULT '{}',
    from_email VARCHAR(255),
    subject TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    template_name VARCHAR(100),
    template_data JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, sent, failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification digest settings
CREATE TABLE notification_digest_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    digest_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly
    enabled BOOLEAN DEFAULT true,
    send_time TIME DEFAULT '09:00:00',
    send_day_of_week INTEGER, -- 0-6 for weekly (0 = Sunday)
    send_day_of_month INTEGER, -- 1-31 for monthly
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_scheduled_at TIMESTAMP WITH TIME ZONE,
    included_types TEXT[] DEFAULT '{}',
    excluded_types TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, digest_type)
);

-- Notification channels configuration
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    channel_type VARCHAR(50) NOT NULL, -- email, sms, slack, teams, webhook
    channel_config JSONB NOT NULL, -- channel-specific configuration
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_type)
);

-- Notification rules engine
CREATE TABLE notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    event_types TEXT[] NOT NULL,
    conditions JSONB DEFAULT '[]', -- Array of condition objects
    actions JSONB DEFAULT '[]', -- Array of action objects
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_at) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_email_queue_priority ON email_queue(priority DESC, scheduled_at) WHERE status = 'pending';

CREATE INDEX idx_notification_digest_next ON notification_digest_settings(next_scheduled_at) WHERE enabled = true;
CREATE INDEX idx_notification_digest_user ON notification_digest_settings(user_id);

CREATE INDEX idx_notification_channels_user ON notification_channels(user_id) WHERE is_active = true;
CREATE INDEX idx_notification_rules_enterprise ON notification_rules(enterprise_id) WHERE is_active = true;

-- Functions for notification processing

-- Queue email notification
CREATE OR REPLACE FUNCTION queue_email_notification(
    p_to_email VARCHAR,
    p_subject TEXT,
    p_template_name VARCHAR,
    p_template_data JSONB,
    p_priority INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
    v_email_id UUID;
BEGIN
    INSERT INTO email_queue (
        to_email,
        subject,
        template_name,
        template_data,
        priority,
        scheduled_at
    ) VALUES (
        p_to_email,
        p_subject,
        p_template_name,
        p_template_data,
        p_priority,
        CASE 
            WHEN p_priority >= 9 THEN NOW() -- Immediate for critical
            ELSE NOW() + INTERVAL '1 minute' -- Slight delay for batching
        END
    ) RETURNING id INTO v_email_id;
    
    RETURN v_email_id;
END;
$$ LANGUAGE plpgsql;

-- Process notification rules
CREATE OR REPLACE FUNCTION process_notification_rules(
    p_event_type VARCHAR,
    p_event_data JSONB,
    p_enterprise_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_rule RECORD;
    v_notifications_sent INTEGER := 0;
    v_condition_met BOOLEAN;
    action RECORD;
BEGIN
    -- Get applicable rules
    FOR v_rule IN 
        SELECT * FROM notification_rules
        WHERE enterprise_id = p_enterprise_id
        AND is_active = true
        AND p_event_type = ANY(event_types)
        ORDER BY priority DESC
    LOOP
        -- Evaluate conditions
        v_condition_met := evaluate_conditions(v_rule.conditions, p_event_data);
        
        IF v_condition_met THEN
            -- Execute actions
            FOR action IN SELECT * FROM jsonb_array_elements(v_rule.actions) LOOP
                CASE action->>'type'
                    WHEN 'send_email' THEN
                        PERFORM queue_email_notification(
                            action->>'to_email',
                            action->>'subject',
                            action->>'template',
                            p_event_data,
                            COALESCE((action->>'priority')::INTEGER, 5)
                        );
                        v_notifications_sent := v_notifications_sent + 1;
                        
                    WHEN 'create_task' THEN
                        INSERT INTO agent_tasks (
                            agent_id,
                            task_type,
                            priority,
                            payload,
                            enterprise_id
                        ) VALUES (
                            (action->>'agent_id')::UUID,
                            action->>'task_type',
                            COALESCE((action->>'priority')::INTEGER, 5),
                            p_event_data,
                            p_enterprise_id
                        );
                        
                    WHEN 'webhook' THEN
                        INSERT INTO webhook_deliveries (
                            webhook_id,
                            event_type,
                            payload
                        ) VALUES (
                            (action->>'webhook_id')::UUID,
                            p_event_type,
                            p_event_data
                        );
                END CASE;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN v_notifications_sent;
END;
$$ LANGUAGE plpgsql;

-- Evaluate conditions helper
CREATE OR REPLACE FUNCTION evaluate_conditions(
    p_conditions JSONB,
    p_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_condition JSONB;
    v_operator VARCHAR;
    v_field_value TEXT;
    v_expected_value TEXT;
    v_result BOOLEAN := true;
BEGIN
    IF p_conditions IS NULL OR jsonb_array_length(p_conditions) = 0 THEN
        RETURN true;
    END IF;
    
    FOR v_condition IN SELECT * FROM jsonb_array_elements(p_conditions) LOOP
        v_field_value := p_data #>> string_to_array(v_condition->>'field', '.');
        v_expected_value := v_condition->>'value';
        v_operator := v_condition->>'operator';
        
        v_result := CASE v_operator
            WHEN 'equals' THEN v_field_value = v_expected_value
            WHEN 'not_equals' THEN v_field_value != v_expected_value
            WHEN 'contains' THEN v_field_value LIKE '%' || v_expected_value || '%'
            WHEN 'greater_than' THEN v_field_value::DECIMAL > v_expected_value::DECIMAL
            WHEN 'less_than' THEN v_field_value::DECIMAL < v_expected_value::DECIMAL
            WHEN 'in' THEN v_field_value = ANY(SELECT jsonb_array_elements_text(v_condition->'values'))
            ELSE true
        END;
        
        -- AND logic - all conditions must be true
        IF NOT v_result THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Schedule digest generation
CREATE OR REPLACE FUNCTION schedule_notification_digests()
RETURNS INTEGER AS $$
DECLARE
    v_setting RECORD;
    v_scheduled_count INTEGER := 0;
    v_next_run TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR v_setting IN 
        SELECT * FROM notification_digest_settings
        WHERE enabled = true
        AND (next_scheduled_at IS NULL OR next_scheduled_at <= NOW())
    LOOP
        -- Calculate next run time
        v_next_run := CASE v_setting.digest_type
            WHEN 'daily' THEN 
                DATE_TRUNC('day', NOW() + INTERVAL '1 day') + v_setting.send_time
            WHEN 'weekly' THEN 
                DATE_TRUNC('week', NOW()) + 
                INTERVAL '1 week' + 
                (v_setting.send_day_of_week || ' days')::INTERVAL +
                v_setting.send_time
            WHEN 'monthly' THEN 
                DATE_TRUNC('month', NOW() + INTERVAL '1 month') + 
                ((v_setting.send_day_of_month - 1) || ' days')::INTERVAL +
                v_setting.send_time
        END;
        
        -- Update next scheduled time
        UPDATE notification_digest_settings
        SET next_scheduled_at = v_next_run,
            updated_at = NOW()
        WHERE id = v_setting.id;
        
        -- Queue digest generation task
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            scheduled_at,
            enterprise_id
        ) VALUES (
            (SELECT id FROM agents WHERE type = 'notifications' LIMIT 1),
            'generate_digest',
            3,
            jsonb_build_object(
                'user_id', v_setting.user_id,
                'digest_type', v_setting.digest_type,
                'settings_id', v_setting.id
            ),
            v_next_run,
            (SELECT enterprise_id FROM users WHERE id = v_setting.user_id)
        );
        
        v_scheduled_count := v_scheduled_count + 1;
    END LOOP;
    
    RETURN v_scheduled_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

-- Email queue is system-only
CREATE POLICY "System can manage email queue" ON email_queue
    FOR ALL USING (true);

-- Users can manage their own digest settings
CREATE POLICY "Users can manage their digest settings" ON notification_digest_settings
    FOR ALL USING (user_id = public.current_user_id());

-- Users can manage their notification channels
CREATE POLICY "Users can manage their channels" ON notification_channels
    FOR ALL USING (user_id = public.current_user_id());

-- Admins can manage notification rules
CREATE POLICY "Admins can manage notification rules" ON notification_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid()
            AND enterprise_id = notification_rules.enterprise_id
            AND role IN ('admin', 'owner')
        )
    );

-- Triggers
CREATE TRIGGER update_notification_digest_settings_updated_at 
    BEFORE UPDATE ON notification_digest_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channels_updated_at 
    BEFORE UPDATE ON notification_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at 
    BEFORE UPDATE ON notification_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();