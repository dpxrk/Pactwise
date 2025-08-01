-- Agent Logs Table for tracking agent execution

CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    task_id UUID REFERENCES agent_tasks(id),
    log_type VARCHAR(50) NOT NULL, -- request, response, error, info, debug
    log_level VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    execution_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_id, created_at DESC);
CREATE INDEX idx_agent_logs_task ON agent_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_agent_logs_type ON agent_logs(log_type, created_at DESC);
CREATE INDEX idx_agent_logs_level ON agent_logs(log_level) WHERE log_level IN ('warning', 'error', 'critical');

-- RLS
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view agent logs" ON agent_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role IN ('admin', 'owner')
        )
    );