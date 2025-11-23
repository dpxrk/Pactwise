-- Add 'pending_approval' to contract_status enum
-- This status is used by several automation triggers and workflows

-- Add the new value to the enum (after pending_review, before active)
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'pending_review';

-- Add comment to document the status
COMMENT ON TYPE contract_status IS
'Contract lifecycle statuses:
- draft: Initial creation, not yet submitted
- pending_analysis: Submitted for AI analysis
- pending_review: Under human review
- pending_approval: Awaiting approval from stakeholders
- active: Fully executed and in effect
- expired: End date has passed
- terminated: Ended before expiration date
- archived: Removed from active use';
