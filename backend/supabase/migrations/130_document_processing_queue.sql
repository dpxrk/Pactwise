-- Migration: 130_document_processing_queue.sql
-- Purpose: Document processing queue for intelligent agent automation
-- This table orchestrates the multi-agent document processing pipeline:
--   1. OCR Agent extracts text
--   2. Secretary Agent classifies document type
--   3. Vendor Agent matches to existing vendors
--
-- Features:
--   - Automatic agent task queuing via trigger
--   - Chained task execution (OCR -> Classification -> Vendor Matching)
--   - Confidence scoring for vendor matching
--   - Integration with contract and vendor assignment

-- ============================================================================
-- DOCUMENT PROCESSING QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- File information
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type VARCHAR(50), -- 'pdf', 'docx', 'png', 'jpg', etc.
    file_size_bytes BIGINT,
    storage_bucket VARCHAR(100) DEFAULT 'documents',

    -- Enterprise and user context
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Processing pipeline status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Waiting to start
        'ocr_processing',    -- OCR agent working
        'ocr_completed',     -- OCR done, classification queued
        'classifying',       -- Secretary agent working
        'classification_completed', -- Classification done, vendor matching queued
        'vendor_matching',   -- Vendor agent working
        'completed',         -- All processing done
        'failed',            -- Error occurred
        'cancelled'          -- User cancelled
    )),

    -- Agent task references (for tracking/cancellation)
    ocr_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    classification_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    vendor_match_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,

    -- OCR Results
    extracted_text TEXT,
    ocr_confidence DECIMAL(3,2), -- 0.00 - 1.00
    ocr_language VARCHAR(10), -- Detected language code
    ocr_completed_at TIMESTAMPTZ,

    -- Document Classification Results
    document_classification JSONB DEFAULT '{}',
    -- Expected structure:
    -- {
    --   "contract_type": "msa" | "nda" | "sow" | etc,
    --   "document_category": "original" | "amendment" | "addendum" | "renewal",
    --   "confidence": 0.95,
    --   "extracted_entities": {
    --     "parties": ["Company A", "Company B"],
    --     "effective_date": "2024-01-01",
    --     "expiration_date": "2025-01-01",
    --     "total_value": 50000,
    --     "currency": "USD"
    --   }
    -- }
    classification_confidence DECIMAL(3,2),
    classification_completed_at TIMESTAMPTZ,

    -- Vendor Matching Results
    vendor_match_result JSONB DEFAULT '{}',
    -- Expected structure:
    -- {
    --   "matches": [
    --     {
    --       "vendor_id": "uuid",
    --       "vendor_name": "Acme Corp",
    --       "confidence": 0.92,
    --       "matched_on": ["name", "domain", "tax_id"]
    --     }
    --   ],
    --   "extracted_vendor_info": {
    --     "name": "Acme Corporation",
    --     "email": "contracts@acme.com",
    --     "domain": "acme.com",
    --     "address": "123 Main St",
    --     "tax_id": "12-3456789"
    --   },
    --   "suggest_new_vendor": false
    -- }
    vendor_match_confidence DECIMAL(3,2),
    vendor_match_completed_at TIMESTAMPTZ,

    -- Auto-assignment (if confidence > 80%)
    auto_assigned_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    auto_assigned_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    auto_assignment_confidence DECIMAL(3,2),

    -- Review flags
    requires_review BOOLEAN DEFAULT false,
    review_reason TEXT, -- Why it needs review (e.g., "low confidence", "multiple matches")
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    -- Source context (where the upload originated)
    source_context VARCHAR(50) DEFAULT 'manual' CHECK (source_context IN (
        'manual',           -- Direct upload from user
        'contract_creation', -- During contract form
        'vendor_document',  -- Vendor document upload
        'bulk_upload',      -- Bulk import
        'email_ingestion',  -- From email integration
        'api'               -- API upload
    )),

    -- Target assignment (optional - if user already specified)
    target_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    target_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

    -- Processing metadata
    processing_started_at TIMESTAMPTZ,
    processing_duration_ms INTEGER, -- Total processing time
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Processing queue indexes
CREATE INDEX idx_doc_queue_status_enterprise
    ON document_processing_queue(enterprise_id, status, created_at DESC);

CREATE INDEX idx_doc_queue_user
    ON document_processing_queue(user_id, created_at DESC);

-- Task reference indexes
CREATE INDEX idx_doc_queue_ocr_task
    ON document_processing_queue(ocr_task_id) WHERE ocr_task_id IS NOT NULL;

CREATE INDEX idx_doc_queue_classification_task
    ON document_processing_queue(classification_task_id) WHERE classification_task_id IS NOT NULL;

CREATE INDEX idx_doc_queue_vendor_task
    ON document_processing_queue(vendor_match_task_id) WHERE vendor_match_task_id IS NOT NULL;

-- Review queue index
CREATE INDEX idx_doc_queue_needs_review
    ON document_processing_queue(enterprise_id, created_at DESC)
    WHERE requires_review = true AND reviewed_at IS NULL;

-- Auto-assignment index
CREATE INDEX idx_doc_queue_auto_assigned
    ON document_processing_queue(enterprise_id, auto_assigned_vendor_id, created_at DESC)
    WHERE auto_assigned_vendor_id IS NOT NULL;

-- Source context for analytics
CREATE INDEX idx_doc_queue_source_context
    ON document_processing_queue(enterprise_id, source_context, created_at DESC);

-- ============================================================================
-- AUTO-QUEUE OCR AGENT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_document_ocr_agent()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_ocr_agent_id UUID;
    v_task_id UUID;
BEGIN
    -- Find the OCR agent for this enterprise (or use secretary agent as fallback)
    SELECT id INTO v_ocr_agent_id
    FROM agents
    WHERE enterprise_id = NEW.enterprise_id
      AND type IN ('ocr', 'secretary')
      AND is_enabled = true
    ORDER BY CASE WHEN type = 'ocr' THEN 0 ELSE 1 END
    LIMIT 1;

    -- If no agent found, mark as failed
    IF v_ocr_agent_id IS NULL THEN
        UPDATE document_processing_queue
        SET status = 'failed',
            error_message = 'No OCR or Secretary agent available',
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- Queue OCR task with highest priority
    INSERT INTO agent_tasks (
        agent_id,
        task_type,
        priority,
        payload,
        enterprise_id,
        user_id,
        status,
        scheduled_at
    ) VALUES (
        v_ocr_agent_id,
        'process_document',
        9, -- High priority
        jsonb_build_object(
            'documentQueueId', NEW.id,
            'filePath', NEW.file_path,
            'fileName', NEW.file_name,
            'fileType', NEW.file_type,
            'sourceContext', NEW.source_context,
            'targetContractId', NEW.target_contract_id,
            'targetVendorId', NEW.target_vendor_id
        ),
        NEW.enterprise_id,
        NEW.user_id,
        'pending',
        NOW()
    )
    RETURNING id INTO v_task_id;

    -- Update queue with task reference
    UPDATE document_processing_queue
    SET ocr_task_id = v_task_id,
        status = 'ocr_processing',
        processing_started_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

-- Trigger on insert
DROP TRIGGER IF EXISTS trigger_queue_document_ocr ON document_processing_queue;
CREATE TRIGGER trigger_queue_document_ocr
AFTER INSERT ON document_processing_queue
FOR EACH ROW
EXECUTE FUNCTION queue_document_ocr_agent();

-- ============================================================================
-- CHAIN TO CLASSIFICATION AGENT (after OCR completes)
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_document_classification_agent()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_secretary_agent_id UUID;
    v_task_id UUID;
BEGIN
    -- Only proceed if OCR just completed
    IF OLD.status != 'ocr_processing' OR NEW.status != 'ocr_completed' THEN
        RETURN NEW;
    END IF;

    -- Skip if no text was extracted
    IF NEW.extracted_text IS NULL OR length(NEW.extracted_text) < 50 THEN
        UPDATE document_processing_queue
        SET status = 'failed',
            error_message = 'Insufficient text extracted for classification',
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- Find the Secretary agent for classification
    SELECT id INTO v_secretary_agent_id
    FROM agents
    WHERE enterprise_id = NEW.enterprise_id
      AND type = 'secretary'
      AND is_enabled = true
    LIMIT 1;

    IF v_secretary_agent_id IS NULL THEN
        UPDATE document_processing_queue
        SET status = 'failed',
            error_message = 'No Secretary agent available for classification',
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- Queue classification task
    INSERT INTO agent_tasks (
        agent_id,
        task_type,
        priority,
        payload,
        enterprise_id,
        user_id,
        status,
        scheduled_at
    ) VALUES (
        v_secretary_agent_id,
        'classify_document',
        8, -- High priority (slightly lower than OCR)
        jsonb_build_object(
            'documentQueueId', NEW.id,
            'extractedText', substring(NEW.extracted_text, 1, 50000), -- Limit text size
            'fileName', NEW.file_name,
            'fileType', NEW.file_type,
            'sourceContext', NEW.source_context
        ),
        NEW.enterprise_id,
        NEW.user_id,
        'pending',
        NOW()
    )
    RETURNING id INTO v_task_id;

    -- Update queue
    UPDATE document_processing_queue
    SET classification_task_id = v_task_id,
        status = 'classifying',
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_queue_document_classification ON document_processing_queue;
CREATE TRIGGER trigger_queue_document_classification
AFTER UPDATE OF status ON document_processing_queue
FOR EACH ROW
EXECUTE FUNCTION queue_document_classification_agent();

-- ============================================================================
-- CHAIN TO VENDOR MATCHING AGENT (after classification completes)
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_vendor_matching_agent()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_vendor_agent_id UUID;
    v_task_id UUID;
BEGIN
    -- Only proceed if classification just completed
    IF OLD.status != 'classifying' OR NEW.status != 'classification_completed' THEN
        RETURN NEW;
    END IF;

    -- Skip vendor matching if target vendor already specified
    IF NEW.target_vendor_id IS NOT NULL THEN
        UPDATE document_processing_queue
        SET status = 'completed',
            auto_assigned_vendor_id = NEW.target_vendor_id,
            auto_assignment_confidence = 1.0,
            completed_at = NOW(),
            processing_duration_ms = EXTRACT(EPOCH FROM (NOW() - NEW.processing_started_at)) * 1000,
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- Find the Vendor agent
    SELECT id INTO v_vendor_agent_id
    FROM agents
    WHERE enterprise_id = NEW.enterprise_id
      AND type = 'vendor'
      AND is_enabled = true
    LIMIT 1;

    IF v_vendor_agent_id IS NULL THEN
        -- Complete without vendor matching
        UPDATE document_processing_queue
        SET status = 'completed',
            requires_review = true,
            review_reason = 'No Vendor agent available for matching',
            completed_at = NOW(),
            processing_duration_ms = EXTRACT(EPOCH FROM (NOW() - NEW.processing_started_at)) * 1000,
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- Queue vendor matching task
    INSERT INTO agent_tasks (
        agent_id,
        task_type,
        priority,
        payload,
        enterprise_id,
        user_id,
        status,
        scheduled_at
    ) VALUES (
        v_vendor_agent_id,
        'match_document_to_vendor',
        7, -- High priority
        jsonb_build_object(
            'documentQueueId', NEW.id,
            'extractedText', substring(NEW.extracted_text, 1, 20000), -- Limit for matching
            'documentClassification', NEW.document_classification,
            'fileName', NEW.file_name
        ),
        NEW.enterprise_id,
        NEW.user_id,
        'pending',
        NOW()
    )
    RETURNING id INTO v_task_id;

    -- Update queue
    UPDATE document_processing_queue
    SET vendor_match_task_id = v_task_id,
        status = 'vendor_matching',
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_queue_vendor_matching ON document_processing_queue;
CREATE TRIGGER trigger_queue_vendor_matching
AFTER UPDATE OF status ON document_processing_queue
FOR EACH ROW
EXECUTE FUNCTION queue_vendor_matching_agent();

-- ============================================================================
-- AUTO-ASSIGN VENDOR (after vendor matching completes)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_vendor_match_result()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_best_match JSONB;
    v_confidence DECIMAL(3,2);
    v_vendor_id UUID;
BEGIN
    -- Only proceed if vendor matching just completed
    IF OLD.status != 'vendor_matching' OR NEW.vendor_match_result IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get best match
    v_best_match := NEW.vendor_match_result->'matches'->0;

    IF v_best_match IS NOT NULL THEN
        v_confidence := (v_best_match->>'confidence')::DECIMAL(3,2);
        v_vendor_id := (v_best_match->>'vendor_id')::UUID;

        -- Auto-assign if confidence > 80%
        IF v_confidence >= 0.80 AND v_vendor_id IS NOT NULL THEN
            UPDATE document_processing_queue
            SET status = 'completed',
                auto_assigned_vendor_id = v_vendor_id,
                auto_assignment_confidence = v_confidence,
                completed_at = NOW(),
                processing_duration_ms = EXTRACT(EPOCH FROM (NOW() - NEW.processing_started_at)) * 1000,
                updated_at = NOW()
            WHERE id = NEW.id;
        ELSE
            -- Flag for review
            UPDATE document_processing_queue
            SET status = 'completed',
                requires_review = true,
                review_reason = CASE
                    WHEN v_confidence < 0.80 THEN 'Low confidence vendor match (' || (v_confidence * 100)::INTEGER || '%)'
                    WHEN jsonb_array_length(NEW.vendor_match_result->'matches') > 1 THEN 'Multiple vendor matches found'
                    ELSE 'Unable to auto-assign vendor'
                END,
                vendor_match_confidence = v_confidence,
                completed_at = NOW(),
                processing_duration_ms = EXTRACT(EPOCH FROM (NOW() - NEW.processing_started_at)) * 1000,
                updated_at = NOW()
            WHERE id = NEW.id;
        END IF;
    ELSE
        -- No matches found
        UPDATE document_processing_queue
        SET status = 'completed',
            requires_review = true,
            review_reason = COALESCE(
                CASE WHEN (NEW.vendor_match_result->>'suggest_new_vendor')::BOOLEAN
                     THEN 'New vendor detected - please create vendor record'
                     ELSE 'No vendor matches found'
                END,
                'No vendor matches found'
            ),
            completed_at = NOW(),
            processing_duration_ms = EXTRACT(EPOCH FROM (NOW() - NEW.processing_started_at)) * 1000,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_process_vendor_match ON document_processing_queue;
CREATE TRIGGER trigger_process_vendor_match
AFTER UPDATE OF vendor_match_result ON document_processing_queue
FOR EACH ROW
WHEN (NEW.vendor_match_result IS DISTINCT FROM OLD.vendor_match_result)
EXECUTE FUNCTION process_vendor_match_result();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE document_processing_queue ENABLE ROW LEVEL SECURITY;

-- Users can see their own documents and their enterprise's documents
CREATE POLICY doc_queue_select_policy ON document_processing_queue
    FOR SELECT
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can insert documents for their enterprise
CREATE POLICY doc_queue_insert_policy ON document_processing_queue
    FOR INSERT
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Users can update their own documents, admins can update any
CREATE POLICY doc_queue_update_policy ON document_processing_queue
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.enterprise_id = document_processing_queue.enterprise_id
              AND u.role IN ('admin', 'owner')
        )
    );

-- Only admins can delete
CREATE POLICY doc_queue_delete_policy ON document_processing_queue
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.enterprise_id = document_processing_queue.enterprise_id
              AND u.role IN ('admin', 'owner')
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get pending documents for review
CREATE OR REPLACE FUNCTION get_pending_document_reviews(
    p_enterprise_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    status VARCHAR(50),
    document_classification JSONB,
    vendor_match_result JSONB,
    review_reason TEXT,
    created_at TIMESTAMPTZ,
    user_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dpq.id,
        dpq.file_name,
        dpq.status,
        dpq.document_classification,
        dpq.vendor_match_result,
        dpq.review_reason,
        dpq.created_at,
        u.full_name as user_name
    FROM document_processing_queue dpq
    LEFT JOIN users u ON dpq.user_id = u.id
    WHERE dpq.enterprise_id = p_enterprise_id
      AND dpq.requires_review = true
      AND dpq.reviewed_at IS NULL
    ORDER BY dpq.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Get document processing statistics
CREATE OR REPLACE FUNCTION get_document_processing_stats(
    p_enterprise_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_processed', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'ocr_processing', 'classifying', 'vendor_matching')),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'needs_review', COUNT(*) FILTER (WHERE requires_review = true AND reviewed_at IS NULL),
        'auto_assigned', COUNT(*) FILTER (WHERE auto_assigned_vendor_id IS NOT NULL),
        'avg_processing_time_ms', AVG(processing_duration_ms) FILTER (WHERE processing_duration_ms IS NOT NULL),
        'by_source', jsonb_object_agg(
            COALESCE(source_context, 'unknown'),
            source_count
        ),
        'avg_ocr_confidence', AVG(ocr_confidence) FILTER (WHERE ocr_confidence IS NOT NULL),
        'avg_classification_confidence', AVG(classification_confidence) FILTER (WHERE classification_confidence IS NOT NULL),
        'avg_vendor_match_confidence', AVG(vendor_match_confidence) FILTER (WHERE vendor_match_confidence IS NOT NULL)
    )
    INTO v_result
    FROM document_processing_queue dpq
    LEFT JOIN (
        SELECT source_context, COUNT(*) as source_count
        FROM document_processing_queue
        WHERE enterprise_id = p_enterprise_id
          AND created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY source_context
    ) src ON true
    WHERE dpq.enterprise_id = p_enterprise_id
      AND dpq.created_at > NOW() - (p_days || ' days')::INTERVAL;

    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_document_queue_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_document_queue_timestamp ON document_processing_queue;
CREATE TRIGGER trigger_update_document_queue_timestamp
BEFORE UPDATE ON document_processing_queue
FOR EACH ROW
EXECUTE FUNCTION update_document_queue_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE document_processing_queue IS
'Queue for intelligent document processing with multi-agent pipeline (OCR -> Classification -> Vendor Matching)';

COMMENT ON COLUMN document_processing_queue.status IS
'Processing pipeline status: pending -> ocr_processing -> ocr_completed -> classifying -> classification_completed -> vendor_matching -> completed/failed';

COMMENT ON COLUMN document_processing_queue.auto_assignment_confidence IS
'Confidence score for automatic vendor assignment. Auto-assigns if >= 0.80 (80%)';

COMMENT ON COLUMN document_processing_queue.requires_review IS
'Flag indicating document needs human review (low confidence, multiple matches, or new vendor)';
