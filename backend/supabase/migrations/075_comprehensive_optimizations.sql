-- Migration: 075_comprehensive_optimizations
-- Description: Add missing business-critical columns, optimize performance, and clean up dead rows
-- Created: 2025-11-08

BEGIN;

-- ============================================================================
-- PART 1: ADD MISSING BUSINESS-CRITICAL COLUMNS TO CONTRACTS
-- ============================================================================

-- Add currency column (default USD for existing contracts)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add payment terms
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Add renewal notice days (how many days before expiry to notify)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS renewal_notice_days INTEGER DEFAULT 90;

-- Add signed date (when contract was actually signed)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS signed_date DATE;

-- Add effective date (can differ from start_date)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS effective_date DATE;

-- Add notice period days (termination notice period)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER;

-- Add renewal date (for tracking actual renewal dates)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS last_renewal_date DATE;

-- Add next renewal date (calculated or set)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS next_renewal_date DATE;

-- Add notification tracking
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS renewal_notification_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS expiry_notification_sent_at TIMESTAMP WITH TIME ZONE;

-- Add contract version tracking
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS parent_contract_id UUID REFERENCES contracts(id);

-- Add approval status
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending_approval';

-- Add risk score (calculated field, can be updated by AI analysis)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2);

-- Add compliance score
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS compliance_score NUMERIC(5,2);

COMMENT ON COLUMN contracts.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP)';
COMMENT ON COLUMN contracts.payment_terms IS 'Payment terms description (e.g., "Net 30", "Quarterly in advance")';
COMMENT ON COLUMN contracts.renewal_notice_days IS 'Number of days before expiry to send renewal notifications';
COMMENT ON COLUMN contracts.signed_date IS 'Date when contract was signed by all parties';
COMMENT ON COLUMN contracts.effective_date IS 'Date when contract terms become effective';
COMMENT ON COLUMN contracts.notice_period_days IS 'Number of days notice required for termination';
COMMENT ON COLUMN contracts.last_renewal_date IS 'Date of last contract renewal';
COMMENT ON COLUMN contracts.next_renewal_date IS 'Calculated or set date for next renewal';
COMMENT ON COLUMN contracts.renewal_notification_sent_at IS 'Timestamp when renewal notification was sent';
COMMENT ON COLUMN contracts.expiry_notification_sent_at IS 'Timestamp when expiry notification was sent';
COMMENT ON COLUMN contracts.version IS 'Contract version number for tracking amendments';
COMMENT ON COLUMN contracts.parent_contract_id IS 'Reference to parent contract for amendments/renewals';
COMMENT ON COLUMN contracts.approval_status IS 'Current approval workflow status';
COMMENT ON COLUMN contracts.risk_score IS 'Calculated risk score (0-100) based on AI analysis';
COMMENT ON COLUMN contracts.compliance_score IS 'Calculated compliance score (0-100)';

-- ============================================================================
-- PART 2: ADD USEFUL COLUMNS TO VENDORS
-- ============================================================================

-- Add vendor risk assessment fields
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS last_audit_date DATE;

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS next_audit_date DATE;

-- Add vendor contact information
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS primary_contact_name VARCHAR(255);

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS primary_contact_email VARCHAR(255);

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS primary_contact_phone VARCHAR(50);

-- Add vendor certifications tracking
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- Add last review date
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS last_review_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Add vendor tier/classification
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS vendor_tier VARCHAR(20);

-- Add payment terms
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS default_payment_terms TEXT;

COMMENT ON COLUMN vendors.risk_level IS 'Vendor risk classification: low, medium, high, critical';
COMMENT ON COLUMN vendors.last_audit_date IS 'Date of last vendor audit';
COMMENT ON COLUMN vendors.next_audit_date IS 'Scheduled date for next vendor audit';
COMMENT ON COLUMN vendors.primary_contact_name IS 'Primary contact person name';
COMMENT ON COLUMN vendors.primary_contact_email IS 'Primary contact email address';
COMMENT ON COLUMN vendors.primary_contact_phone IS 'Primary contact phone number';
COMMENT ON COLUMN vendors.certifications IS 'Array of vendor certifications (ISO, SOC2, etc.)';
COMMENT ON COLUMN vendors.last_review_date IS 'Last vendor performance review date';
COMMENT ON COLUMN vendors.next_review_date IS 'Scheduled next vendor review date';
COMMENT ON COLUMN vendors.vendor_tier IS 'Vendor tier: strategic, preferred, approved, conditional';
COMMENT ON COLUMN vendors.default_payment_terms IS 'Default payment terms for this vendor';

-- ============================================================================
-- PART 3: CREATE COMPUTED/GENERATED COLUMNS
-- ============================================================================

-- Add contract_duration_days (computed - this one is safe as it doesn't use CURRENT_DATE)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS contract_duration_days INTEGER GENERATED ALWAYS AS (
  CASE
    WHEN start_date IS NOT NULL AND end_date IS NOT NULL
    THEN (end_date - start_date)
    ELSE NULL
  END
) STORED;

COMMENT ON COLUMN contracts.contract_duration_days IS 'Computed: Total contract duration in days';

-- Note: days_until_expiry and is_expiring_soon cannot be generated columns because they rely on CURRENT_DATE
-- These will be calculated in views and functions instead

-- ============================================================================
-- PART 4: CREATE PERFORMANCE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Index on currency for filtering/grouping
CREATE INDEX IF NOT EXISTS idx_contracts_currency
ON contracts(enterprise_id, currency)
WHERE deleted_at IS NULL;

-- Index on renewal notifications
CREATE INDEX IF NOT EXISTS idx_contracts_renewal_notifications
ON contracts(enterprise_id, next_renewal_date)
WHERE deleted_at IS NULL
AND status = 'active'
AND renewal_notification_sent_at IS NULL
AND next_renewal_date IS NOT NULL;

-- Index on expiring contracts with notifications
CREATE INDEX IF NOT EXISTS idx_contracts_expiring_need_notification
ON contracts(enterprise_id, end_date)
WHERE deleted_at IS NULL
AND status = 'active'
AND expiry_notification_sent_at IS NULL
AND end_date IS NOT NULL;

-- Index on contract versions
CREATE INDEX IF NOT EXISTS idx_contracts_versions
ON contracts(parent_contract_id, version)
WHERE parent_contract_id IS NOT NULL
AND deleted_at IS NULL;

-- Index on approval status
CREATE INDEX IF NOT EXISTS idx_contracts_approval_status
ON contracts(enterprise_id, approval_status, created_at)
WHERE deleted_at IS NULL
AND approval_status != 'approved';

-- Index on risk score (for finding high-risk contracts)
CREATE INDEX IF NOT EXISTS idx_contracts_high_risk
ON contracts(enterprise_id, risk_score DESC)
WHERE deleted_at IS NULL
AND risk_score IS NOT NULL
AND risk_score > 70;

-- Index on vendor risk level
CREATE INDEX IF NOT EXISTS idx_vendors_risk_level
ON vendors(enterprise_id, risk_level, performance_score)
WHERE deleted_at IS NULL;

-- Index on vendor audit dates (removed CURRENT_DATE from WHERE - not immutable)
CREATE INDEX IF NOT EXISTS idx_vendors_audit_due
ON vendors(enterprise_id, next_audit_date)
WHERE deleted_at IS NULL
AND next_audit_date IS NOT NULL;

-- Index on vendor tier
CREATE INDEX IF NOT EXISTS idx_vendors_tier
ON vendors(enterprise_id, vendor_tier, total_contract_value DESC)
WHERE deleted_at IS NULL
AND vendor_tier IS NOT NULL;

-- Index on vendor certifications (GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_vendors_certifications
ON vendors USING gin(certifications)
WHERE deleted_at IS NULL
AND certifications IS NOT NULL
AND jsonb_array_length(certifications) > 0;

-- ============================================================================
-- PART 5: ADD CHECK CONSTRAINTS FOR DATA QUALITY
-- ============================================================================

-- Add constraints only if they don't exist
DO $$
BEGIN
  -- Ensure currency is valid ISO code (3 characters)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_currency_valid') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_currency_valid
    CHECK (currency IS NULL OR length(currency) = 3);
  END IF;

  -- Ensure renewal notice days is positive
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_renewal_notice_positive') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_renewal_notice_positive
    CHECK (renewal_notice_days IS NULL OR renewal_notice_days > 0);
  END IF;

  -- Ensure notice period days is positive
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_notice_period_positive') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_notice_period_positive
    CHECK (notice_period_days IS NULL OR notice_period_days > 0);
  END IF;

  -- Ensure end date is after start date
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_dates_logical') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_dates_logical
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
  END IF;

  -- Ensure risk score is between 0 and 100
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_risk_score_range') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_risk_score_range
    CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100));
  END IF;

  -- Ensure compliance score is between 0 and 100
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_compliance_score_range') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_compliance_score_range
    CHECK (compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100));
  END IF;

  -- Ensure vendor risk level is valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_risk_level_valid') THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_risk_level_valid
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));
  END IF;

  -- Ensure vendor tier is valid
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_tier_valid') THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_tier_valid
    CHECK (vendor_tier IS NULL OR vendor_tier IN ('strategic', 'preferred', 'approved', 'conditional', 'restricted'));
  END IF;
END $$;

-- ============================================================================
-- PART 6: CREATE USEFUL VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for contracts expiring soon
CREATE OR REPLACE VIEW contracts_expiring_soon AS
SELECT
  c.*,
  v.name as vendor_name,
  v.category as vendor_category,
  e.name as enterprise_name,
  u.email as owner_email,
  (c.end_date - CURRENT_DATE) as days_remaining
FROM contracts c
LEFT JOIN vendors v ON c.vendor_id = v.id
LEFT JOIN enterprises e ON c.enterprise_id = e.id
LEFT JOIN users u ON c.owner_id = u.id
WHERE c.deleted_at IS NULL
AND c.status = 'active'
AND c.end_date IS NOT NULL
AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY c.end_date ASC;

-- View for high-value contracts
CREATE OR REPLACE VIEW contracts_high_value AS
SELECT
  c.*,
  v.name as vendor_name,
  v.performance_score as vendor_performance,
  e.name as enterprise_name
FROM contracts c
LEFT JOIN vendors v ON c.vendor_id = v.id
LEFT JOIN enterprises e ON c.enterprise_id = e.id
WHERE c.deleted_at IS NULL
AND c.status = 'active'
AND c.value > 100000
ORDER BY c.value DESC;

-- View for vendor performance dashboard
CREATE OR REPLACE VIEW vendor_performance_summary AS
SELECT
  v.id,
  v.name,
  v.category,
  v.performance_score,
  v.compliance_score,
  v.risk_level,
  v.vendor_tier,
  v.total_contract_value,
  v.active_contracts,
  COUNT(DISTINCT c.id) as total_contracts,
  COALESCE(SUM(CASE WHEN c.status = 'active' THEN c.value ELSE 0 END), 0) as active_contract_value,
  COALESCE(AVG(CASE WHEN c.status = 'active' THEN c.value ELSE NULL END), 0) as avg_contract_value,
  MIN(c.end_date) FILTER (WHERE c.status = 'active' AND c.end_date >= CURRENT_DATE) as next_expiring_contract,
  v.enterprise_id
FROM vendors v
LEFT JOIN contracts c ON c.vendor_id = v.id AND c.deleted_at IS NULL
WHERE v.deleted_at IS NULL
GROUP BY v.id, v.name, v.category, v.performance_score, v.compliance_score,
         v.risk_level, v.vendor_tier, v.total_contract_value, v.active_contracts, v.enterprise_id;

-- ============================================================================
-- PART 7: UPDATE EXISTING DATA WITH SENSIBLE DEFAULTS
-- ============================================================================

-- Set effective_date to start_date for existing contracts
UPDATE contracts
SET effective_date = start_date
WHERE effective_date IS NULL AND start_date IS NOT NULL;

-- Set next_renewal_date for auto-renew contracts
UPDATE contracts
SET next_renewal_date = end_date
WHERE next_renewal_date IS NULL
AND is_auto_renew = TRUE
AND end_date IS NOT NULL
AND status = 'active';

-- Set vendor tier based on contract value
UPDATE vendors v
SET vendor_tier = CASE
  WHEN v.total_contract_value >= 500000 THEN 'strategic'
  WHEN v.total_contract_value >= 200000 THEN 'preferred'
  WHEN v.total_contract_value >= 50000 THEN 'approved'
  ELSE 'conditional'
END
WHERE vendor_tier IS NULL;

-- Set risk level based on performance and compliance scores
UPDATE vendors
SET risk_level = CASE
  WHEN (performance_score >= 4.5 AND compliance_score >= 4.5) THEN 'low'
  WHEN (performance_score >= 4.0 AND compliance_score >= 4.0) THEN 'medium'
  WHEN (performance_score >= 3.0 AND compliance_score >= 3.0) THEN 'high'
  ELSE 'critical'
END
WHERE risk_level = 'medium'; -- Only update default value

-- ============================================================================
-- PART 8: UPDATE TABLE STATISTICS
-- ============================================================================

-- Update table statistics for query planner (VACUUM must be run outside transaction)
-- Note: Run 'VACUUM ANALYZE contracts, vendors, users, enterprises;' manually if needed
ANALYZE contracts;
ANALYZE vendors;
ANALYZE users;
ANALYZE enterprises;
ANALYZE contract_analyses;
ANALYZE budgets;

-- ============================================================================
-- PART 9: CREATE HELPFUL FUNCTIONS
-- ============================================================================

-- Function to calculate contract health score
CREATE OR REPLACE FUNCTION calculate_contract_health(contract_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  health_score NUMERIC := 100;
  contract_rec RECORD;
BEGIN
  SELECT * INTO contract_rec FROM contracts WHERE id = contract_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Deduct points for missing critical information
  IF contract_rec.signed_date IS NULL THEN health_score := health_score - 10; END IF;
  IF contract_rec.file_name IS NULL THEN health_score := health_score - 15; END IF;
  IF contract_rec.owner_id IS NULL THEN health_score := health_score - 10; END IF;

  -- Deduct points based on days until expiry
  IF contract_rec.status = 'active' AND contract_rec.end_date IS NOT NULL THEN
    IF (contract_rec.end_date - CURRENT_DATE) <= 30 AND NOT contract_rec.is_auto_renew THEN
      health_score := health_score - 20;
    ELSIF (contract_rec.end_date - CURRENT_DATE) <= 60 AND NOT contract_rec.is_auto_renew THEN
      health_score := health_score - 10;
    END IF;
  END IF;

  -- Add points for good practices
  IF contract_rec.renewal_notice_days IS NOT NULL THEN health_score := health_score + 5; END IF;
  IF contract_rec.analysis_status = 'completed' THEN health_score := health_score + 5; END IF;

  RETURN GREATEST(0, LEAST(100, health_score));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_contract_health IS 'Calculates a health score (0-100) for a contract based on completeness and risk factors';

-- Function to check if vendor needs audit
CREATE OR REPLACE FUNCTION vendor_needs_audit(vendor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  vendor_rec RECORD;
BEGIN
  SELECT * INTO vendor_rec FROM vendors WHERE id = vendor_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Needs audit if never audited or next audit date has passed
  RETURN (
    vendor_rec.last_audit_date IS NULL OR
    vendor_rec.next_audit_date IS NULL OR
    vendor_rec.next_audit_date <= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION vendor_needs_audit IS 'Returns TRUE if vendor is due for an audit';

COMMIT;

-- Summary of changes
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 075 completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to contracts table:';
  RAISE NOTICE '  • 16 new columns (currency, payment_terms, renewal tracking, risk scores, etc.)';
  RAISE NOTICE '  • 1 computed column (contract_duration_days)';
  RAISE NOTICE '  • 8 new indexes for performance';
  RAISE NOTICE '  • 6 check constraints for data quality';
  RAISE NOTICE '';
  RAISE NOTICE 'Added to vendors table:';
  RAISE NOTICE '  • 11 new columns (risk assessment, contact info, certifications, etc.)';
  RAISE NOTICE '  • 4 new indexes';
  RAISE NOTICE '  • 2 check constraints';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 3 useful views:';
  RAISE NOTICE '  • contracts_expiring_soon';
  RAISE NOTICE '  • contracts_high_value';
  RAISE NOTICE '  • vendor_performance_summary';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 2 helper functions:';
  RAISE NOTICE '  • calculate_contract_health()';
  RAISE NOTICE '  • vendor_needs_audit()';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated table statistics with ANALYZE.';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Run VACUUM manually outside transaction if needed to clean dead rows.';
END $$;
