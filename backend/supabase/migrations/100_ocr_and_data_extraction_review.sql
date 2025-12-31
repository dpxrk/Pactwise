-- Migration 100: OCR and Data Extraction Review System
-- Description: Enhanced OCR processing with multi-item support and data extraction review interface

-- OCR Jobs table for batch processing
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Job details
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),

  -- Documents to process
  document_ids UUID[] NOT NULL DEFAULT '{}',
  total_documents INTEGER NOT NULL DEFAULT 0,
  processed_documents INTEGER NOT NULL DEFAULT 0,

  -- Processing configuration
  ocr_options JSONB DEFAULT '{
    "language": "eng",
    "detect_tables": true,
    "detect_signatures": true,
    "confidence_threshold": 0.7,
    "auto_correct": false
  }'::jsonb,

  -- Results
  results JSONB DEFAULT '[]'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  processing_time_ms INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Extracted data review table
CREATE TABLE IF NOT EXISTS extracted_data_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Document reference (stores storage object ID - no FK as documents may be in various storage backends)
  document_id UUID NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  ocr_job_id UUID REFERENCES ocr_jobs(id) ON DELETE SET NULL,

  -- Review status
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'in_review',
    'approved',
    'rejected',
    'auto_approved'
  )),

  -- Extracted data (as detected by OCR/AI)
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Corrected data (human-edited)
  corrected_data JSONB DEFAULT '{}'::jsonb,

  -- Confidence scores for each field
  confidence_scores JSONB DEFAULT '{}'::jsonb,

  -- Field-level corrections tracking
  corrections_made TEXT[] DEFAULT '{}',

  -- Entity highlights for UI
  entity_highlights JSONB DEFAULT '{
    "parties": [],
    "dates": [],
    "amounts": [],
    "clauses": [],
    "signatures": []
  }'::jsonb,

  -- Review metadata
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  review_time_seconds INTEGER,

  -- Quality metrics
  extraction_quality_score DECIMAL(3,2) CHECK (extraction_quality_score BETWEEN 0 AND 1),
  fields_corrected INTEGER DEFAULT 0,
  total_fields INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(document_id, ocr_job_id)
);

-- OCR processing results (detailed per-document results)
CREATE TABLE IF NOT EXISTS ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- References
  ocr_job_id UUID NOT NULL REFERENCES ocr_jobs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL, -- Storage object ID - no FK as documents may be in various storage backends

  -- OCR output
  extracted_text TEXT,
  raw_ocr_output JSONB,

  -- Confidence and quality
  overall_confidence DECIMAL(3,2) CHECK (overall_confidence BETWEEN 0 AND 1),
  quality_score DECIMAL(3,2) CHECK (quality_score BETWEEN 0 AND 1),

  -- Detected elements
  detected_language TEXT,
  page_count INTEGER,
  word_count INTEGER,
  has_tables BOOLEAN DEFAULT false,
  has_signatures BOOLEAN DEFAULT false,
  has_handwriting BOOLEAN DEFAULT false,

  -- Processing metadata
  ocr_engine TEXT, -- 'tesseract', 'pdf-parse', 'cloud-vision', etc.
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(ocr_job_id, document_id)
);

-- Indexes for performance
CREATE INDEX idx_ocr_jobs_enterprise ON ocr_jobs(enterprise_id, created_at DESC);
CREATE INDEX idx_ocr_jobs_status ON ocr_jobs(status, priority DESC);
CREATE INDEX idx_ocr_jobs_user ON ocr_jobs(user_id, created_at DESC);

CREATE INDEX idx_extracted_data_reviews_enterprise ON extracted_data_reviews(enterprise_id, status);
CREATE INDEX idx_extracted_data_reviews_document ON extracted_data_reviews(document_id);
CREATE INDEX idx_extracted_data_reviews_status ON extracted_data_reviews(status, created_at DESC);
CREATE INDEX idx_extracted_data_reviews_reviewer ON extracted_data_reviews(reviewed_by, reviewed_at DESC);

CREATE INDEX idx_ocr_results_job ON ocr_results(ocr_job_id);
CREATE INDEX idx_ocr_results_document ON ocr_results(document_id);
CREATE INDEX idx_ocr_results_enterprise ON ocr_results(enterprise_id);

-- RLS policies
ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;

-- OCR Jobs policies (using RLS helper functions from migration 006)
CREATE POLICY "Users can view their enterprise's OCR jobs"
  ON ocr_jobs FOR SELECT
  USING (enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Users can create OCR jobs for their enterprise"
  ON ocr_jobs FOR INSERT
  WITH CHECK (
    enterprise_id = public.current_user_enterprise_id()
    AND public.user_has_role('user')
  );

CREATE POLICY "Users can update their enterprise's OCR jobs"
  ON ocr_jobs FOR UPDATE
  USING (enterprise_id = public.current_user_enterprise_id())
  WITH CHECK (enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Admins can delete OCR jobs"
  ON ocr_jobs FOR DELETE
  USING (
    enterprise_id = public.current_user_enterprise_id()
    AND public.user_has_role('admin')
  );

-- Extracted Data Reviews policies
CREATE POLICY "Users can view their enterprise's data reviews"
  ON extracted_data_reviews FOR SELECT
  USING (enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Users can create data reviews for their enterprise"
  ON extracted_data_reviews FOR INSERT
  WITH CHECK (
    enterprise_id = public.current_user_enterprise_id()
    AND public.user_has_role('user')
  );

CREATE POLICY "Users can update their enterprise's data reviews"
  ON extracted_data_reviews FOR UPDATE
  USING (enterprise_id = public.current_user_enterprise_id())
  WITH CHECK (enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Admins can delete data reviews"
  ON extracted_data_reviews FOR DELETE
  USING (
    enterprise_id = public.current_user_enterprise_id()
    AND public.user_has_role('admin')
  );

-- OCR Results policies
CREATE POLICY "Users can view their enterprise's OCR results"
  ON ocr_results FOR SELECT
  USING (enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Service role can manage OCR results"
  ON ocr_results FOR ALL
  USING (auth.uid() IS NULL OR enterprise_id = public.current_user_enterprise_id());

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_ocr_jobs_updated_at BEFORE UPDATE ON ocr_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extracted_data_reviews_updated_at BEFORE UPDATE ON extracted_data_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ocr_results_updated_at BEFORE UPDATE ON ocr_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create OCR job with documents
CREATE OR REPLACE FUNCTION create_ocr_job(
  p_enterprise_id UUID,
  p_user_id UUID,
  p_job_name TEXT,
  p_document_ids UUID[],
  p_priority INTEGER DEFAULT 5,
  p_ocr_options JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
  v_doc_count INTEGER;
BEGIN
  -- Validate permissions
  IF NOT has_permission(p_user_id, 'user') THEN
    RAISE EXCEPTION 'Insufficient permissions to create OCR jobs';
  END IF;

  -- Count documents
  v_doc_count := array_length(p_document_ids, 1);

  -- Create OCR job
  INSERT INTO ocr_jobs (
    enterprise_id,
    user_id,
    job_name,
    document_ids,
    total_documents,
    priority,
    ocr_options
  ) VALUES (
    p_enterprise_id,
    p_user_id,
    p_job_name,
    p_document_ids,
    v_doc_count,
    p_priority,
    COALESCE(p_ocr_options, '{}'::jsonb)
  ) RETURNING id INTO v_job_id;

  -- Create extracted_data_reviews entries for each document
  INSERT INTO extracted_data_reviews (
    enterprise_id,
    document_id,
    ocr_job_id,
    status
  )
  SELECT
    p_enterprise_id,
    unnest(p_document_ids),
    v_job_id,
    'pending_review';

  -- Queue OCR agent task
  INSERT INTO agent_tasks (
    enterprise_id,
    agent_type,
    task_type,
    priority,
    payload,
    status
  ) VALUES (
    p_enterprise_id,
    'ocr',
    'batch_ocr_processing',
    p_priority,
    jsonb_build_object(
      'data', jsonb_build_object(
        'jobId', v_job_id,
        'documentIds', to_jsonb(p_document_ids),
        'options', COALESCE(p_ocr_options, '{}'::jsonb)
      ),
      'context', jsonb_build_object(
        'userId', p_user_id,
        'jobId', v_job_id
      )
    ),
    'pending'
  );

  RETURN v_job_id;
END;
$$;

-- Function to approve extracted data
CREATE OR REPLACE FUNCTION approve_extracted_data(
  p_review_id UUID,
  p_user_id UUID,
  p_corrected_data JSONB DEFAULT NULL,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review RECORD;
  v_enterprise_id UUID;
  v_corrections_count INTEGER := 0;
BEGIN
  -- Get review details
  SELECT * INTO v_review
  FROM extracted_data_reviews
  WHERE id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  -- Get user's enterprise
  SELECT enterprise_id INTO v_enterprise_id
  FROM users
  WHERE auth_id = p_user_id;

  -- Validate enterprise access
  IF v_review.enterprise_id != v_enterprise_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Count corrections if corrected_data provided
  IF p_corrected_data IS NOT NULL THEN
    v_corrections_count := (
      SELECT COUNT(*)
      FROM jsonb_each(p_corrected_data) AS c
      WHERE c.value IS DISTINCT FROM (v_review.extracted_data->>c.key)::jsonb
    );
  END IF;

  -- Update review
  UPDATE extracted_data_reviews
  SET
    status = 'approved',
    reviewed_by = p_user_id,
    reviewed_at = NOW(),
    corrected_data = COALESCE(p_corrected_data, extracted_data),
    review_notes = p_review_notes,
    fields_corrected = v_corrections_count,
    accuracy_rate = CASE
      WHEN total_fields > 0 THEN
        ((total_fields - v_corrections_count)::DECIMAL / total_fields) * 100
      ELSE 100
    END
  WHERE id = p_review_id;

  -- If this was for a contract, update contract with corrected data
  IF v_review.contract_id IS NOT NULL THEN
    UPDATE contracts
    SET
      extracted_metadata = COALESCE(p_corrected_data, v_review.extracted_data),
      title = COALESCE((p_corrected_data->>'title'), (v_review.extracted_data->>'title'), title),
      start_date = COALESCE(
        (p_corrected_data->'dates'->>'effectiveDate')::DATE,
        (v_review.extracted_data->'dates'->>'effectiveDate')::DATE,
        start_date
      ),
      end_date = COALESCE(
        (p_corrected_data->'dates'->>'expirationDate')::DATE,
        (v_review.extracted_data->'dates'->>'expirationDate')::DATE,
        end_date
      )
    WHERE id = v_review.contract_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to get OCR job status
CREATE OR REPLACE FUNCTION get_ocr_job_status(p_job_id UUID)
RETURNS TABLE (
  job_id UUID,
  status TEXT,
  total_documents INTEGER,
  processed_documents INTEGER,
  progress_percentage DECIMAL,
  pending_reviews INTEGER,
  approved_reviews INTEGER,
  estimated_time_remaining_seconds INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oj.id,
    oj.status,
    oj.total_documents,
    oj.processed_documents,
    CASE
      WHEN oj.total_documents > 0 THEN
        (oj.processed_documents::DECIMAL / oj.total_documents * 100)
      ELSE 0
    END AS progress_percentage,
    COUNT(*) FILTER (WHERE edr.status = 'pending_review')::INTEGER,
    COUNT(*) FILTER (WHERE edr.status = 'approved')::INTEGER,
    CASE
      WHEN oj.processed_documents > 0 AND oj.processing_time_ms > 0 THEN
        ((oj.total_documents - oj.processed_documents) *
         (oj.processing_time_ms / oj.processed_documents) / 1000)::INTEGER
      ELSE NULL
    END AS estimated_time_remaining_seconds
  FROM ocr_jobs oj
  LEFT JOIN extracted_data_reviews edr ON edr.ocr_job_id = oj.id
  WHERE oj.id = p_job_id
  GROUP BY oj.id, oj.status, oj.total_documents, oj.processed_documents, oj.processing_time_ms;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ocr_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON extracted_data_reviews TO authenticated;
GRANT SELECT ON ocr_results TO authenticated;
GRANT INSERT, UPDATE ON ocr_results TO service_role;
GRANT EXECUTE ON FUNCTION create_ocr_job TO authenticated;
GRANT EXECUTE ON FUNCTION approve_extracted_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_ocr_job_status TO authenticated;

-- Comments
COMMENT ON TABLE ocr_jobs IS 'Tracks batch OCR processing jobs for multiple documents';
COMMENT ON TABLE extracted_data_reviews IS 'Stores extracted data requiring human review and approval';
COMMENT ON TABLE ocr_results IS 'Detailed per-document OCR processing results';
COMMENT ON FUNCTION create_ocr_job IS 'Creates a new OCR job with document queue';
COMMENT ON FUNCTION approve_extracted_data IS 'Approves and optionally corrects extracted data';
COMMENT ON FUNCTION get_ocr_job_status IS 'Returns comprehensive status of an OCR job';
