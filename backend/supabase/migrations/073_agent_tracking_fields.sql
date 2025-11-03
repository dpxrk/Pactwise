-- Migration 073: Add missing agent tracking fields
-- Adds tracking and metrics fields to agents and agent_system tables
-- to support frontend dashboard requirements

-- Add missing tracking fields to agents table
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_run TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_success TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}';

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_enterprise_status ON agents(enterprise_id, status);

-- Add missing fields to agent_system table (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'agent_system'
  ) THEN
    ALTER TABLE agent_system
      ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'stopped',
      ADD COLUMN IF NOT EXISTS last_started TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_stopped TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}';
  END IF;
END $$;

-- Update existing agents to have default metrics
UPDATE agents
SET metrics = '{
  "successfulRuns": 0,
  "failedRuns": 0,
  "avgResponseTime": 0,
  "lastResponseTime": 0
}'::jsonb
WHERE metrics IS NULL OR metrics = '{}'::jsonb;

-- Create a function to update agent tracking on task completion
CREATE OR REPLACE FUNCTION update_agent_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update on task completion or failure
  IF NEW.status IN ('completed', 'failed', 'timeout') AND OLD.status != NEW.status THEN
    UPDATE agents
    SET
      last_run = NOW(),
      last_success = CASE
        WHEN NEW.status = 'completed' THEN NOW()
        ELSE agents.last_success
      END,
      run_count = run_count + 1,
      error_count = CASE
        WHEN NEW.status IN ('failed', 'timeout') THEN error_count + 1
        ELSE error_count
      END,
      last_error = CASE
        WHEN NEW.status IN ('failed', 'timeout') THEN NEW.error_message
        ELSE last_error
      END,
      status = CASE
        WHEN NEW.status = 'completed' THEN 'active'
        WHEN NEW.status IN ('failed', 'timeout') THEN 'error'
        ELSE status
      END,
      metrics = jsonb_set(
        jsonb_set(
          metrics,
          '{successfulRuns}',
          to_jsonb((COALESCE((metrics->>'successfulRuns')::int, 0) + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END))
        ),
        '{failedRuns}',
        to_jsonb((COALESCE((metrics->>'failedRuns')::int, 0) + CASE WHEN NEW.status IN ('failed', 'timeout') THEN 1 ELSE 0 END))
      )
    WHERE id = NEW.agent_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update agent tracking
DROP TRIGGER IF EXISTS trigger_update_agent_tracking ON agent_tasks;
CREATE TRIGGER trigger_update_agent_tracking
  AFTER UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_tracking();

-- Comment on changes
COMMENT ON COLUMN agents.status IS 'Current agent status: inactive, active, busy, error';
COMMENT ON COLUMN agents.is_enabled IS 'Whether the agent is enabled for processing';
COMMENT ON COLUMN agents.last_run IS 'Last time the agent executed a task';
COMMENT ON COLUMN agents.last_success IS 'Last successful task completion';
COMMENT ON COLUMN agents.run_count IS 'Total number of tasks executed';
COMMENT ON COLUMN agents.error_count IS 'Total number of failed tasks';
COMMENT ON COLUMN agents.last_error IS 'Last error message';
COMMENT ON COLUMN agents.metrics IS 'Performance metrics in JSON format';
