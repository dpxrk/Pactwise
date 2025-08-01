-- Backup and System Management Tables

-- Backup configurations
CREATE TABLE backup_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50) NOT NULL, -- full, incremental, differential
    frequency VARCHAR(50) NOT NULL, -- hourly, daily, weekly, monthly
    retention_days INTEGER NOT NULL DEFAULT 30,
    target_storage VARCHAR(50) NOT NULL, -- s3, azure, gcs
    storage_config JSONB NOT NULL,
    include_patterns TEXT[] DEFAULT '{}',
    exclude_patterns TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup history
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES backup_schedules(id),
    backup_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- pending, running, completed, failed
    size_bytes BIGINT,
    duration_seconds INTEGER,
    storage_location TEXT,
    checksum VARCHAR(64),
    tables_included TEXT[] DEFAULT '{}',
    row_counts JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup metadata
CREATE TABLE backup_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_id UUID NOT NULL REFERENCES backups(id),
    table_name VARCHAR(255) NOT NULL,
    row_count INTEGER NOT NULL,
    size_bytes BIGINT,
    last_modified TIMESTAMP WITH TIME ZONE,
    schema_version VARCHAR(50),
    indexes TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(backup_id, table_name)
);

-- System health metrics
CREATE TABLE system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    component VARCHAR(100), -- database, storage, api, functions
    threshold_warning DECIMAL(15,4),
    threshold_critical DECIMAL(15,4),
    is_healthy BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature flags
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_enterprises UUID[] DEFAULT '{}',
    target_users UUID[] DEFAULT '{}',
    conditions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) NOT NULL, -- string, number, boolean, json
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration tracking
CREATE TABLE migration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    version VARCHAR(50) NOT NULL,
    checksum VARCHAR(64),
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_time_ms INTEGER,
    applied_by VARCHAR(255),
    rollback_sql TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Scheduled jobs
CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(255) UNIQUE NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    handler_function VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(50),
    last_run_error TEXT,
    next_run_at TIMESTAMP WITH TIME ZONE,
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_seconds": 60}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job execution history
CREATE TABLE job_execution_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES scheduled_jobs(id),
    status VARCHAR(50) NOT NULL, -- pending, running, completed, failed
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    output JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_backup_schedules_active ON backup_schedules(is_active, next_run_at) WHERE is_active = true;

CREATE INDEX idx_backups_schedule ON backups(schedule_id, created_at DESC);
CREATE INDEX idx_backups_status ON backups(status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_backups_expires ON backups(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_backup_metadata_backup ON backup_metadata(backup_id);

CREATE INDEX idx_system_health_metrics_component ON system_health_metrics(component, recorded_at DESC);
CREATE INDEX idx_system_health_metrics_unhealthy ON system_health_metrics(is_healthy, recorded_at DESC) WHERE is_healthy = false;

CREATE INDEX idx_feature_flags_enabled ON feature_flags(flag_name) WHERE is_enabled = true;

CREATE INDEX idx_system_config_key ON system_config(config_key);

CREATE INDEX idx_scheduled_jobs_active ON scheduled_jobs(is_active, next_run_at) WHERE is_active = true;

CREATE INDEX idx_job_execution_history_job ON job_execution_history(job_id, started_at DESC);

-- Add triggers
CREATE TRIGGER update_backup_schedules_updated_at BEFORE UPDATE ON backup_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_execution_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Only admins can manage backups" ON backup_schedules
    FOR ALL USING (auth.has_role('admin'));

CREATE POLICY "Only admins can view backups" ON backups
    FOR SELECT USING (auth.has_role('admin'));

CREATE POLICY "Only admins can view system health" ON system_health_metrics
    FOR SELECT USING (auth.has_role('admin'));

CREATE POLICY "Only owners can manage feature flags" ON feature_flags
    FOR ALL USING (auth.has_role('owner'));

CREATE POLICY "Only owners can manage system config" ON system_config
    FOR ALL USING (auth.has_role('owner'));

-- Function to check feature flag
CREATE OR REPLACE FUNCTION is_feature_enabled(
    p_flag_name VARCHAR,
    p_user_id UUID DEFAULT NULL,
    p_enterprise_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_flag RECORD;
    v_random INTEGER;
BEGIN
    SELECT * INTO v_flag
    FROM feature_flags
    WHERE flag_name = p_flag_name
    AND is_enabled = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check targeted rollout
    IF p_enterprise_id IS NOT NULL AND v_flag.target_enterprises != '{}' THEN
        IF p_enterprise_id = ANY(v_flag.target_enterprises) THEN
            RETURN true;
        END IF;
    END IF;
    
    IF p_user_id IS NOT NULL AND v_flag.target_users != '{}' THEN
        IF p_user_id = ANY(v_flag.target_users) THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check percentage rollout
    IF v_flag.rollout_percentage < 100 THEN
        v_random := floor(random() * 100)::int;
        RETURN v_random < v_flag.rollout_percentage;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;