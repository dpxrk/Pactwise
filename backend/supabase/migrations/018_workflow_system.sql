-- Workflow System Tables for Complex Multi-Step Processes

-- ============================================
-- WORKFLOW DEFINITIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    workflow_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    
    -- Workflow configuration
    steps JSONB NOT NULL, -- Array of workflow steps
    variables JSONB DEFAULT '{}', -- Default variables
    triggers JSONB DEFAULT '[]', -- Workflow triggers
    timeout_ms INTEGER DEFAULT 3600000, -- 1 hour default
    retry_policy JSONB DEFAULT '{"maxRetries": 3, "backoffMultiplier": 2}',
    
    -- Permissions
    allowed_roles TEXT[] DEFAULT ARRAY['manager', 'admin', 'owner'],
    created_by UUID REFERENCES users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_workflow_name_version UNIQUE (enterprise_id, name, version)
);

-- ============================================
-- WORKFLOW EXECUTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR(100) PRIMARY KEY, -- Custom ID format: wf_exec_timestamp_random
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
    workflow_version INTEGER NOT NULL,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    
    -- Execution state
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_step VARCHAR(100),
    context JSONB DEFAULT '{}', -- Workflow variables and context
    step_results JSONB DEFAULT '{}', -- Results from each step
    
    -- Related entities
    contract_id UUID REFERENCES contracts(id),
    vendor_id UUID REFERENCES vendors(id),
    budget_id UUID REFERENCES budgets(id),
    
    -- Execution details
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error TEXT,
    
    -- User tracking
    created_by UUID REFERENCES users(id),
    last_modified_by UUID REFERENCES users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'cancelled'))
);

-- ============================================
-- WORKFLOW STEP RESULTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_step_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    step_name VARCHAR(255),
    step_type VARCHAR(50),
    
    -- Step execution details
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Agent tracking (if agent step)
    agent_id UUID REFERENCES agents(id),
    agent_task_id UUID REFERENCES agent_tasks(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_step_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped'))
);

-- ============================================
-- WORKFLOW APPROVALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_approvals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_execution_id VARCHAR(100) NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    
    -- Approval details
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    required_approvers TEXT[], -- User IDs or roles
    approved_by UUID REFERENCES users(id),
    rejected_by UUID REFERENCES users(id),
    
    -- Decision details
    decision VARCHAR(50),
    comments TEXT,
    conditions JSONB DEFAULT '[]',
    
    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    -- Context
    context JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_approval_status CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'timeout'))
);

-- ============================================
-- WORKFLOW TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Template definition
    workflow_definition JSONB NOT NULL,
    required_inputs JSONB DEFAULT '[]',
    output_schema JSONB,
    
    -- Sharing and visibility
    is_public BOOLEAN DEFAULT false,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE, -- NULL for system templates
    created_by UUID REFERENCES users(id),
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_template_name UNIQUE (name, enterprise_id)
);

-- ============================================
-- SCHEDULED WORKFLOWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    schedule_type VARCHAR(50) NOT NULL, -- 'cron', 'interval', 'one_time'
    cron_expression VARCHAR(100), -- For cron schedules
    interval_minutes INTEGER, -- For interval schedules
    scheduled_at TIMESTAMP WITH TIME ZONE, -- For one-time schedules
    
    -- Execution control
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Input data for workflow
    input_data JSONB DEFAULT '{}',
    
    -- User tracking
    created_by UUID REFERENCES users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('cron', 'interval', 'one_time'))
);

-- ============================================
-- WORKFLOW EVENTS TABLE (for event-driven workflows)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(100),
    
    -- Event data
    payload JSONB NOT NULL,
    
    -- Workflow trigger
    triggered_workflow_id UUID REFERENCES workflow_definitions(id),
    execution_id VARCHAR(100) REFERENCES workflow_executions(id),
    
    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_event_status CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'ignored'))
);

-- ============================================
-- INDEXES
-- ============================================

-- Workflow definitions indexes
CREATE INDEX idx_workflow_definitions_enterprise ON workflow_definitions(enterprise_id) WHERE is_active = true;
CREATE INDEX idx_workflow_definitions_type ON workflow_definitions(workflow_type, enterprise_id);
CREATE INDEX idx_workflow_definitions_active ON workflow_definitions(is_active, is_template);

-- Workflow executions indexes
CREATE INDEX idx_workflow_executions_enterprise ON workflow_executions(enterprise_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status, enterprise_id);
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id, status);
CREATE INDEX idx_workflow_executions_dates ON workflow_executions(created_at, completed_at);
CREATE INDEX idx_workflow_executions_entities ON workflow_executions(contract_id, vendor_id, budget_id);

-- Step results indexes
CREATE INDEX idx_workflow_step_results_execution ON workflow_step_results(execution_id);
CREATE INDEX idx_workflow_step_results_status ON workflow_step_results(status, execution_id);

-- Approvals indexes
CREATE INDEX idx_workflow_approvals_execution ON workflow_approvals(workflow_execution_id);
CREATE INDEX idx_workflow_approvals_status ON workflow_approvals(status, enterprise_id);
CREATE INDEX idx_workflow_approvals_approver ON workflow_approvals(approved_by) WHERE status = 'pending';

-- Templates indexes
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category) WHERE is_public = true;
CREATE INDEX idx_workflow_templates_enterprise ON workflow_templates(enterprise_id);
CREATE INDEX idx_workflow_templates_usage ON workflow_templates(usage_count DESC);

-- Scheduled workflows indexes
CREATE INDEX idx_scheduled_workflows_active ON scheduled_workflows(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_workflows_enterprise ON scheduled_workflows(enterprise_id);

-- Events indexes
CREATE INDEX idx_workflow_events_pending ON workflow_events(created_at) WHERE status = 'pending';
CREATE INDEX idx_workflow_events_type ON workflow_events(event_type, enterprise_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- Workflow definitions policies
CREATE POLICY workflow_definitions_view ON workflow_definitions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE enterprise_id = workflow_definitions.enterprise_id
        )
    );

CREATE POLICY workflow_definitions_create ON workflow_definitions
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE enterprise_id = workflow_definitions.enterprise_id
            AND role IN ('manager', 'admin', 'owner')
        )
    );

CREATE POLICY workflow_definitions_update ON workflow_definitions
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE enterprise_id = workflow_definitions.enterprise_id
            AND role IN ('admin', 'owner')
        )
    );

-- Workflow executions policies
CREATE POLICY workflow_executions_view ON workflow_executions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE enterprise_id = workflow_executions.enterprise_id
        )
    );

CREATE POLICY workflow_executions_create ON workflow_executions
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE enterprise_id = workflow_executions.enterprise_id
            AND role IN ('user', 'manager', 'admin', 'owner')
        )
    );

-- Workflow approvals policies
CREATE POLICY workflow_approvals_view ON workflow_approvals
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE enterprise_id = workflow_approvals.enterprise_id
        ) OR
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE id = ANY(workflow_approvals.required_approvers::UUID[])
        )
    );

CREATE POLICY workflow_approvals_update ON workflow_approvals
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_id FROM users 
            WHERE id = ANY(workflow_approvals.required_approvers::UUID[])
            OR role IN ('admin', 'owner')
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE TRIGGER update_workflow_definitions_updated_at
    BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_approvals_updated_at
    BEFORE UPDATE ON workflow_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE ON workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_workflows_updated_at
    BEFORE UPDATE ON scheduled_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- WORKFLOW HELPER FUNCTIONS
-- ============================================

-- Get workflow execution status summary
CREATE OR REPLACE FUNCTION get_workflow_execution_summary(
    p_enterprise_id UUID,
    p_time_range INTERVAL DEFAULT INTERVAL '7 days'
) RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'total_executions', (
            SELECT COUNT(*) 
            FROM workflow_executions 
            WHERE enterprise_id = p_enterprise_id 
            AND created_at >= NOW() - p_time_range
        ),
        'by_status', (
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM workflow_executions
                WHERE enterprise_id = p_enterprise_id
                AND created_at >= NOW() - p_time_range
                GROUP BY status
            ) s
        ),
        'by_workflow', (
            SELECT jsonb_object_agg(name, count)
            FROM (
                SELECT wd.name, COUNT(*) as count
                FROM workflow_executions we
                JOIN workflow_definitions wd ON wd.id = we.workflow_id
                WHERE we.enterprise_id = p_enterprise_id
                AND we.created_at >= NOW() - p_time_range
                GROUP BY wd.name
            ) w
        ),
        'avg_duration_ms', (
            SELECT AVG(duration_ms)
            FROM workflow_executions
            WHERE enterprise_id = p_enterprise_id
            AND status = 'completed'
            AND created_at >= NOW() - p_time_range
        ),
        'pending_approvals', (
            SELECT COUNT(*)
            FROM workflow_approvals
            WHERE enterprise_id = p_enterprise_id
            AND status = 'pending'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Get next scheduled workflows
CREATE OR REPLACE FUNCTION get_next_scheduled_workflows(
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    workflow_id UUID,
    workflow_name VARCHAR,
    next_run_at TIMESTAMP WITH TIME ZONE,
    schedule_type VARCHAR,
    enterprise_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sw.workflow_id,
        wd.name as workflow_name,
        sw.next_run_at,
        sw.schedule_type,
        sw.enterprise_id
    FROM scheduled_workflows sw
    JOIN workflow_definitions wd ON wd.id = sw.workflow_id
    WHERE sw.is_active = true
    AND sw.next_run_at <= NOW() + INTERVAL '1 hour'
    ORDER BY sw.next_run_at
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DEFAULT WORKFLOW TEMPLATES
-- ============================================

INSERT INTO workflow_templates (name, category, description, workflow_definition, required_inputs, is_public) VALUES
(
    'Basic Contract Approval',
    'contract',
    'Simple contract approval workflow with manager review',
    '{
        "id": "basic_contract_approval",
        "name": "Basic Contract Approval",
        "steps": [
            {
                "id": "extract_data",
                "name": "Extract Contract Data",
                "type": "agent",
                "agent": "secretary",
                "action": "extract_contract"
            },
            {
                "id": "manager_review",
                "name": "Manager Review",
                "type": "approval",
                "approvers": ["${manager_id}"]
            },
            {
                "id": "notify_result",
                "name": "Notify Result",
                "type": "notification"
            }
        ]
    }',
    '["contract_id", "manager_id"]',
    true
),
(
    'Vendor Quick Check',
    'vendor',
    'Quick vendor verification workflow',
    '{
        "id": "vendor_quick_check",
        "name": "Vendor Quick Check",
        "steps": [
            {
                "id": "basic_screening",
                "name": "Basic Screening",
                "type": "agent",
                "agent": "vendor",
                "action": "screen_vendor"
            },
            {
                "id": "compliance_check",
                "name": "Compliance Check",
                "type": "agent",
                "agent": "legal",
                "action": "check_vendor_compliance"
            }
        ]
    }',
    '["vendor_id"]',
    true
);

-- Add comments for documentation
COMMENT ON TABLE workflow_definitions IS 'Stores workflow definitions with versioning support';
COMMENT ON TABLE workflow_executions IS 'Tracks individual workflow execution instances';
COMMENT ON TABLE workflow_step_results IS 'Stores results from each workflow step execution';
COMMENT ON TABLE workflow_approvals IS 'Manages approval requests within workflows';
COMMENT ON TABLE workflow_templates IS 'Reusable workflow templates';
COMMENT ON TABLE scheduled_workflows IS 'Manages scheduled and recurring workflows';
COMMENT ON TABLE workflow_events IS 'Event-driven workflow triggers';