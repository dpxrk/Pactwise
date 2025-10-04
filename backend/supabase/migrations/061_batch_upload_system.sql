-- Migration: 061_batch_upload_system.sql
-- Description: Batch upload system for contracts and vendors with intelligent vendor matching
-- Created: 2025-01-13

-- ================================================================
-- EXTEND ENTERPRISES TABLE WITH PRIMARY PARTY CONFIGURATION
-- ================================================================

-- Add primary party identification fields to enterprises
-- This allows the system to identify which party is "yours" in contracts
ALTER TABLE enterprises
  ADD COLUMN IF NOT EXISTS primary_party_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_party_aliases TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_party_identifiers JSONB DEFAULT '{}';

COMMENT ON COLUMN enterprises.primary_party_name IS 'Legal name of the enterprise as it appears in contracts';
COMMENT ON COLUMN enterprises.primary_party_aliases IS 'Array of name variations, abbreviations, and DBA names';
COMMENT ON COLUMN enterprises.primary_party_identifiers IS 'Tax IDs, registration numbers, and other identifiers (e.g., {"tax_id": "12-3456789", "duns": "123456789"})';

-- ================================================================
-- BATCH UPLOADS TABLE
-- ================================================================

-- Tracks batch upload operations for contracts and vendors
CREATE TABLE batch_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    upload_type VARCHAR(50) NOT NULL CHECK (upload_type IN ('contracts', 'vendors')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled')),
    total_items INTEGER NOT NULL DEFAULT 0 CHECK (total_items >= 0),
    processed_items INTEGER NOT NULL DEFAULT 0 CHECK (processed_items >= 0),
    successful_items INTEGER NOT NULL DEFAULT 0 CHECK (successful_items >= 0),
    failed_items INTEGER NOT NULL DEFAULT 0 CHECK (failed_items >= 0),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}', -- Upload settings: auto_analyze, auto_match_vendors, etc.
    error_summary TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Ensure processed + failed <= total
    CONSTRAINT batch_items_sum_check CHECK (processed_items + failed_items <= total_items)
);

COMMENT ON TABLE batch_uploads IS 'Tracks batch upload operations for contracts and vendors';
COMMENT ON COLUMN batch_uploads.settings IS 'Upload configuration: {"auto_analyze": true, "auto_match_vendors": true, "create_unmatched_vendors": true}';

-- Indexes
CREATE INDEX idx_batch_uploads_enterprise ON batch_uploads(enterprise_id, created_at DESC);
CREATE INDEX idx_batch_uploads_status ON batch_uploads(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_batch_uploads_uploaded_by ON batch_uploads(uploaded_by, created_at DESC);

-- ================================================================
-- BATCH UPLOAD ITEMS TABLE
-- ================================================================

-- Individual items within a batch upload
CREATE TABLE batch_upload_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_upload_id UUID NOT NULL REFERENCES batch_uploads(id) ON DELETE CASCADE,
    item_index INTEGER NOT NULL CHECK (item_index >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL, -- Storage path
    file_size BIGINT CHECK (file_size >= 0),
    mime_type VARCHAR(100),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('contract', 'vendor')),
    entity_id UUID, -- ID of created contract or vendor
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(batch_upload_id, item_index)
);

COMMENT ON TABLE batch_upload_items IS 'Individual items within a batch upload job';
COMMENT ON COLUMN batch_upload_items.entity_id IS 'ID of the contract or vendor created from this item';

-- Indexes
CREATE INDEX idx_batch_upload_items_batch ON batch_upload_items(batch_upload_id, item_index);
CREATE INDEX idx_batch_upload_items_status ON batch_upload_items(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_batch_upload_items_entity ON batch_upload_items(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- ================================================================
-- VENDOR MATCH SUGGESTIONS TABLE
-- ================================================================

-- AI-suggested vendor matches from contract extraction
CREATE TABLE vendor_match_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    batch_upload_item_id UUID REFERENCES batch_upload_items(id) ON DELETE SET NULL,
    suggested_vendor_name VARCHAR(255) NOT NULL,
    suggested_vendor_data JSONB DEFAULT '{}', -- Extracted contact info, address, etc.
    matched_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    match_type VARCHAR(50) NOT NULL CHECK (match_type IN ('exact', 'fuzzy', 'phonetic', 'new', 'manual')),
    matching_algorithm VARCHAR(100), -- e.g., 'levenshtein', 'trigram', 'soundex'
    similarity_details JSONB DEFAULT '{}', -- Detailed matching scores
    is_confirmed BOOLEAN NOT NULL DEFAULT false,
    is_rejected BOOLEAN NOT NULL DEFAULT false,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- If new vendor was created
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Can't be both confirmed and rejected
    CONSTRAINT vendor_match_not_both_confirmed_rejected CHECK (NOT (is_confirmed AND is_rejected))
);

COMMENT ON TABLE vendor_match_suggestions IS 'AI-suggested vendor matches from contract analysis';
COMMENT ON COLUMN vendor_match_suggestions.suggested_vendor_data IS 'Extracted vendor information: {"address": "...", "email": "...", "phone": "..."}';
COMMENT ON COLUMN vendor_match_suggestions.confidence_score IS 'Match confidence from 0-100, where >90 is auto-confirmed';

-- Indexes
CREATE INDEX idx_vendor_match_contract ON vendor_match_suggestions(contract_id);
CREATE INDEX idx_vendor_match_pending ON vendor_match_suggestions(enterprise_id, is_confirmed, is_rejected)
    WHERE NOT is_confirmed AND NOT is_rejected;
CREATE INDEX idx_vendor_match_batch_item ON vendor_match_suggestions(batch_upload_item_id) WHERE batch_upload_item_id IS NOT NULL;
CREATE INDEX idx_vendor_match_confidence ON vendor_match_suggestions(confidence_score DESC);

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to update batch upload progress
CREATE OR REPLACE FUNCTION update_batch_upload_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update batch_uploads with current progress
    UPDATE batch_uploads
    SET
        processed_items = (
            SELECT COUNT(*)
            FROM batch_upload_items
            WHERE batch_upload_id = NEW.batch_upload_id
              AND status = 'completed'
        ),
        failed_items = (
            SELECT COUNT(*)
            FROM batch_upload_items
            WHERE batch_upload_id = NEW.batch_upload_id
              AND status = 'failed'
        ),
        successful_items = (
            SELECT COUNT(*)
            FROM batch_upload_items
            WHERE batch_upload_id = NEW.batch_upload_id
              AND status = 'completed'
        ),
        status = CASE
            WHEN (
                SELECT COUNT(*)
                FROM batch_upload_items
                WHERE batch_upload_id = NEW.batch_upload_id
                  AND status IN ('completed', 'failed', 'skipped')
            ) >= (SELECT total_items FROM batch_uploads WHERE id = NEW.batch_upload_id)
            THEN 'completed'
            WHEN (
                SELECT COUNT(*)
                FROM batch_upload_items
                WHERE batch_upload_id = NEW.batch_upload_id
                  AND status = 'processing'
            ) > 0
            THEN 'processing'
            ELSE status
        END,
        completed_at = CASE
            WHEN (
                SELECT COUNT(*)
                FROM batch_upload_items
                WHERE batch_upload_id = NEW.batch_upload_id
                  AND status IN ('completed', 'failed', 'skipped')
            ) >= (SELECT total_items FROM batch_uploads WHERE id = NEW.batch_upload_id)
            THEN NOW()
            ELSE completed_at
        END,
        updated_at = NOW()
    WHERE id = NEW.batch_upload_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_batch_upload_progress IS 'Automatically updates batch upload progress when items complete';

-- Trigger to update batch progress when items change status
CREATE TRIGGER trigger_update_batch_upload_progress
AFTER UPDATE OF status ON batch_upload_items
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_batch_upload_progress();

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Enable RLS
ALTER TABLE batch_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_upload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_match_suggestions ENABLE ROW LEVEL SECURITY;

-- batch_uploads policies
CREATE POLICY "Users can view their enterprise batch uploads"
    ON batch_uploads FOR SELECT
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can create batch uploads for their enterprise"
    ON batch_uploads FOR INSERT
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their enterprise batch uploads"
    ON batch_uploads FOR UPDATE
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

-- batch_upload_items policies
CREATE POLICY "Users can view their enterprise batch items"
    ON batch_upload_items FOR SELECT
    USING (
        batch_upload_id IN (
            SELECT id FROM batch_uploads WHERE enterprise_id IN (
                SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert batch items for their enterprise"
    ON batch_upload_items FOR INSERT
    WITH CHECK (
        batch_upload_id IN (
            SELECT id FROM batch_uploads WHERE enterprise_id IN (
                SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update batch items for their enterprise"
    ON batch_upload_items FOR UPDATE
    USING (
        batch_upload_id IN (
            SELECT id FROM batch_uploads WHERE enterprise_id IN (
                SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- vendor_match_suggestions policies
CREATE POLICY "Users can view their enterprise vendor matches"
    ON vendor_match_suggestions FOR SELECT
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can create vendor match suggestions"
    ON vendor_match_suggestions FOR INSERT
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update vendor match suggestions"
    ON vendor_match_suggestions FOR UPDATE
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

-- ================================================================
-- UPDATED_AT TRIGGER
-- ================================================================

CREATE TRIGGER update_batch_uploads_updated_at
    BEFORE UPDATE ON batch_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- LOG COMPLETION
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 061: Batch upload system created successfully';
    RAISE NOTICE '  - Extended enterprises with primary party configuration';
    RAISE NOTICE '  - Created batch_uploads table for tracking batch operations';
    RAISE NOTICE '  - Created batch_upload_items table for individual items';
    RAISE NOTICE '  - Created vendor_match_suggestions table for intelligent matching';
    RAISE NOTICE '  - Added automatic progress tracking triggers';
    RAISE NOTICE '  - Configured RLS policies for multi-tenant security';
END $$;
