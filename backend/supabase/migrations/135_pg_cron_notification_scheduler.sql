-- Migration 135: pg_cron Notification Scheduler
-- Description: Sets up scheduled jobs for notification processing using pg_cron
-- Author: System
-- Date: 2026-01-17
--
-- NOTE: pg_cron extension must be enabled in your Supabase project settings.
-- For local development, you may need to enable it manually or use an alternative scheduler.

-- ============================================================================
-- ENABLE pg_cron EXTENSION (requires superuser)
-- ============================================================================
-- This is typically enabled via Supabase dashboard: Database > Extensions > pg_cron
-- The following is idempotent and will work if you have permissions

DO $$
BEGIN
    -- Try to create the extension if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        RAISE NOTICE 'pg_cron extension created';
    ELSE
        RAISE NOTICE 'pg_cron extension already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create pg_cron extension. Error: %. Please enable it via Supabase dashboard.', SQLERRM;
END $$;

-- ============================================================================
-- SCHEDULED JOBS
-- ============================================================================

-- Helper function to safely schedule cron jobs
CREATE OR REPLACE FUNCTION safe_schedule_cron_job(
    p_job_name TEXT,
    p_schedule TEXT,
    p_command TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if it exists
        PERFORM cron.unschedule(p_job_name);

        -- Schedule new job
        PERFORM cron.schedule(p_job_name, p_schedule, p_command);

        RAISE NOTICE 'Scheduled cron job: % with schedule: %', p_job_name, p_schedule;
        RETURN TRUE;
    ELSE
        RAISE WARNING 'pg_cron not available. Job % not scheduled.', p_job_name;
        RETURN FALSE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to schedule job %: %', p_job_name, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEDULE NOTIFICATION JOBS
-- ============================================================================

DO $$
DECLARE
    v_job_scheduled BOOLEAN;
BEGIN
    -- Only proceed if pg_cron exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

        -- 1. Contract Expiry Check - Daily at 8:00 AM UTC
        -- Checks for contracts expiring in 7, 14, 30, 60 days and queues notifications
        PERFORM safe_schedule_cron_job(
            'check_contract_expiry_notifications',
            '0 8 * * *',  -- Every day at 8:00 AM UTC
            'SELECT check_and_queue_contract_expiry_notifications();'
        );

        -- 2. Budget Alert Check - Daily at 8:30 AM UTC
        -- Checks for budgets at 80%, 90%, 100%, 110% thresholds
        PERFORM safe_schedule_cron_job(
            'check_budget_alert_notifications',
            '30 8 * * *',  -- Every day at 8:30 AM UTC
            'SELECT check_and_queue_budget_alert_notifications();'
        );

        -- 3. Schedule Digest Generation - Daily at 6:00 AM UTC
        -- Schedules digest tasks for users who have digests enabled
        PERFORM safe_schedule_cron_job(
            'schedule_notification_digests',
            '0 6 * * *',  -- Every day at 6:00 AM UTC
            'SELECT schedule_notification_digests();'
        );

        -- 4. Process Email Queue - Every 2 minutes
        -- Picks up pending emails and marks them for processing
        PERFORM safe_schedule_cron_job(
            'process_email_queue',
            '*/2 * * * *',  -- Every 2 minutes
            'SELECT process_email_queue(20);'  -- Process up to 20 emails per batch
        );

        -- 5. Cleanup Old Notifications - Weekly on Sunday at 3:00 AM UTC
        -- Archives or deletes old read notifications (older than 90 days)
        PERFORM safe_schedule_cron_job(
            'cleanup_old_notifications',
            '0 3 * * 0',  -- Every Sunday at 3:00 AM UTC
            'DELETE FROM notifications WHERE read_at IS NOT NULL AND created_at < NOW() - INTERVAL ''90 days'';'
        );

        -- 6. Cleanup Old Digests - Monthly on 1st at 4:00 AM UTC
        -- Removes digest records older than 1 year
        PERFORM safe_schedule_cron_job(
            'cleanup_old_digests',
            '0 4 1 * *',  -- 1st of every month at 4:00 AM UTC
            'DELETE FROM notification_digests WHERE created_at < NOW() - INTERVAL ''1 year'';'
        );

        RAISE NOTICE 'All notification cron jobs scheduled successfully';
    ELSE
        RAISE WARNING 'pg_cron extension not available. Cron jobs not scheduled.';
        RAISE WARNING 'Please enable pg_cron via Supabase dashboard: Database > Extensions > pg_cron';
        RAISE WARNING 'Then run: SELECT safe_schedule_cron_job(...) for each job manually.';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Function to list all scheduled notification jobs
CREATE OR REPLACE FUNCTION list_notification_cron_jobs()
RETURNS TABLE (
    jobid BIGINT,
    jobname TEXT,
    schedule TEXT,
    command TEXT,
    active BOOLEAN
) AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RETURN QUERY
        SELECT
            j.jobid,
            j.jobname,
            j.schedule,
            j.command,
            j.active
        FROM cron.job j
        WHERE j.jobname LIKE '%notification%'
           OR j.jobname LIKE '%email%'
           OR j.jobname LIKE '%digest%'
           OR j.jobname LIKE '%contract_expiry%'
           OR j.jobname LIKE '%budget_alert%';
    ELSE
        RAISE WARNING 'pg_cron not available';
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MANUAL TRIGGER FUNCTIONS (for testing or manual runs)
-- ============================================================================

-- Function to manually run all notification checks
CREATE OR REPLACE FUNCTION run_all_notification_checks()
RETURNS TABLE (
    check_name TEXT,
    notifications_queued INTEGER
) AS $$
DECLARE
    v_contract_count INTEGER;
    v_budget_count INTEGER;
    v_digest_count INTEGER;
BEGIN
    -- Run contract expiry check
    SELECT check_and_queue_contract_expiry_notifications() INTO v_contract_count;
    check_name := 'contract_expiry';
    notifications_queued := v_contract_count;
    RETURN NEXT;

    -- Run budget alert check
    SELECT check_and_queue_budget_alert_notifications() INTO v_budget_count;
    check_name := 'budget_alerts';
    notifications_queued := v_budget_count;
    RETURN NEXT;

    -- Run digest scheduling
    SELECT schedule_notification_digests() INTO v_digest_count;
    check_name := 'digest_scheduling';
    notifications_queued := v_digest_count;
    RETURN NEXT;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EDGE FUNCTION WEBHOOK ALTERNATIVE
-- ============================================================================
-- For environments where pg_cron is not available, you can use an external
-- scheduler (like Vercel Cron, AWS EventBridge, or GitHub Actions) to call
-- these edge function endpoints:
--
-- POST /notifications/check-contract-expiry
-- POST /notifications/check-budget-alerts
-- POST /notifications/generate-bulk-digests
-- POST /notifications/process-email-queue
--
-- Example cron.yaml for Vercel:
-- crons:
--   - path: "/api/notifications/check-contract-expiry"
--     schedule: "0 8 * * *"
--   - path: "/api/notifications/check-budget-alerts"
--     schedule: "30 8 * * *"
--   - path: "/api/notifications/process-email-queue"
--     schedule: "*/2 * * * *"

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION safe_schedule_cron_job(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION list_notification_cron_jobs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION run_all_notification_checks() TO service_role;

-- ============================================================================
-- STATUS TABLE FOR MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_job_runs_name ON notification_job_runs(job_name, started_at DESC);
CREATE INDEX idx_notification_job_runs_status ON notification_job_runs(status) WHERE status = 'running';

-- Cleanup old job run records (keep 30 days)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM safe_schedule_cron_job(
            'cleanup_job_run_logs',
            '0 2 * * *',  -- Daily at 2:00 AM UTC
            'DELETE FROM notification_job_runs WHERE created_at < NOW() - INTERVAL ''30 days'';'
        );
    END IF;
END $$;

GRANT SELECT ON notification_job_runs TO authenticated;
GRANT ALL ON notification_job_runs TO service_role;

COMMENT ON TABLE notification_job_runs IS 'Tracks execution history of scheduled notification jobs';
