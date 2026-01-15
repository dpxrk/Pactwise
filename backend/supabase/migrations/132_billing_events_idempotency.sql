-- Migration 132: Add idempotency support to billing_events table
-- This enables webhook idempotency checks to prevent duplicate Stripe event processing

-- Add processing flag for race condition prevention
ALTER TABLE billing_events
ADD COLUMN IF NOT EXISTS processing BOOLEAN DEFAULT false;

-- Add index for faster idempotency lookups
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id
ON billing_events(stripe_event_id)
WHERE stripe_event_id IS NOT NULL;

-- Add index for finding events being processed (for monitoring)
CREATE INDEX IF NOT EXISTS idx_billing_events_processing
ON billing_events(processing)
WHERE processing = true;

-- Add comment explaining the column
COMMENT ON COLUMN billing_events.processing IS
'Flag indicating event is currently being processed. Used for idempotency to prevent race conditions when multiple webhook instances receive the same event.';

-- Function to clean up stale processing flags (events that started processing but never completed)
CREATE OR REPLACE FUNCTION cleanup_stale_billing_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Reset processing flag for events that have been processing for more than 5 minutes
    -- This handles cases where a worker died mid-processing
    UPDATE billing_events
    SET processing = false
    WHERE processing = true
      AND processed = false
      AND created_at < NOW() - INTERVAL '5 minutes';

    GET DIAGNOSTICS cleaned_count = ROW_COUNT;

    -- Log cleanup activity if any events were cleaned
    IF cleaned_count > 0 THEN
        RAISE LOG 'Cleaned up % stale billing events', cleaned_count;
    END IF;

    RETURN cleaned_count;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_stale_billing_events() TO service_role;

COMMENT ON FUNCTION cleanup_stale_billing_events() IS
'Cleans up billing events that have been in processing state for too long (>5 min). Should be called periodically via cron job.';
