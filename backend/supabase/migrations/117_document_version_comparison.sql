-- Migration 117: Document Version Comparison System
-- Part of CLM Implementation - Redlining & Change Tracking
-- Creates: document_versions, document_comparisons, document_changes, document_version_comments

-- ============================================
-- 1. DOCUMENT VERSIONS (Contract Document Snapshots)
-- ============================================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Version Info
  version_number INTEGER NOT NULL,
  version_label TEXT,
  version_type TEXT NOT NULL CHECK (version_type IN (
    'draft', 'internal_review', 'external_review', 'negotiation',
    'redline', 'final', 'executed', 'amendment'
  )),

  -- Content
  content_text TEXT,
  content_html TEXT,
  content_markdown TEXT,

  -- File Reference (for uploaded documents)
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  file_hash TEXT,

  -- Extracted Content
  extracted_text TEXT,
  extracted_metadata JSONB DEFAULT '{}'::JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'reviewed', 'approved', 'rejected', 'superseded'
  )),
  is_current BOOLEAN DEFAULT false,

  -- Source Information
  source TEXT CHECK (source IN ('manual', 'upload', 'ocr', 'template', 'external', 'ai_generated')),
  source_reference TEXT,

  -- Change Summary
  change_summary TEXT,
  changes_count INTEGER DEFAULT 0,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(contract_id, version_number)
);

COMMENT ON TABLE document_versions IS 'Version history for contract documents';
COMMENT ON COLUMN document_versions.version_number IS 'Sequential version number starting at 1';
COMMENT ON COLUMN document_versions.version_type IS 'Type of version (draft, redline, final, etc.)';
COMMENT ON COLUMN document_versions.content_text IS 'Plain text content for comparison';
COMMENT ON COLUMN document_versions.content_html IS 'HTML formatted content for display';
COMMENT ON COLUMN document_versions.file_hash IS 'SHA-256 hash of uploaded file for integrity';
COMMENT ON COLUMN document_versions.extracted_text IS 'OCR extracted text from uploaded documents';
COMMENT ON COLUMN document_versions.is_current IS 'Only one version per contract should be current';

-- ============================================
-- 2. DOCUMENT COMPARISONS (Diff Results)
-- ============================================

CREATE TABLE IF NOT EXISTS document_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Versions Being Compared
  base_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  compare_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,

  -- Comparison Results
  comparison_status TEXT NOT NULL DEFAULT 'pending' CHECK (comparison_status IN (
    'pending', 'processing', 'completed', 'failed'
  )),

  -- Change Statistics
  total_changes INTEGER DEFAULT 0,
  additions_count INTEGER DEFAULT 0,
  deletions_count INTEGER DEFAULT 0,
  modifications_count INTEGER DEFAULT 0,
  moves_count INTEGER DEFAULT 0,

  -- Content Stats
  words_added INTEGER DEFAULT 0,
  words_deleted INTEGER DEFAULT 0,
  characters_added INTEGER DEFAULT 0,
  characters_deleted INTEGER DEFAULT 0,

  -- Similarity Metrics
  similarity_score DECIMAL(5,4),
  content_overlap_percentage DECIMAL(5,2),

  -- Rendered Diff
  diff_html TEXT,
  diff_json JSONB,
  side_by_side_html TEXT,

  -- Risk Assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB DEFAULT '[]'::JSONB,
  flagged_changes JSONB DEFAULT '[]'::JSONB,

  -- Processing Info
  processing_time_ms INTEGER,
  algorithm_used TEXT DEFAULT 'diff-match-patch',
  error_message TEXT,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(base_version_id, compare_version_id)
);

COMMENT ON TABLE document_comparisons IS 'Stores comparison results between document versions';
COMMENT ON COLUMN document_comparisons.base_version_id IS 'The original/older version';
COMMENT ON COLUMN document_comparisons.compare_version_id IS 'The new/modified version';
COMMENT ON COLUMN document_comparisons.similarity_score IS 'Cosine similarity score (0-1)';
COMMENT ON COLUMN document_comparisons.diff_html IS 'HTML rendered diff with highlighting';
COMMENT ON COLUMN document_comparisons.diff_json IS 'Structured JSON representation of changes';
COMMENT ON COLUMN document_comparisons.side_by_side_html IS 'Two-column side-by-side comparison HTML';
COMMENT ON COLUMN document_comparisons.flagged_changes IS 'Changes flagged for legal/compliance review';

-- ============================================
-- 3. DOCUMENT CHANGES (Individual Change Items)
-- ============================================

CREATE TABLE IF NOT EXISTS document_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES document_comparisons(id) ON DELETE CASCADE,

  -- Change Details
  change_type TEXT NOT NULL CHECK (change_type IN (
    'addition', 'deletion', 'modification', 'move', 'format_change'
  )),
  change_order INTEGER NOT NULL,

  -- Content
  original_text TEXT,
  modified_text TEXT,
  context_before TEXT,
  context_after TEXT,

  -- Location
  section_id TEXT,
  section_name TEXT,
  paragraph_number INTEGER,
  line_number INTEGER,
  character_position INTEGER,
  word_position INTEGER,

  -- Classification
  category TEXT CHECK (category IN (
    'legal_term', 'financial', 'date', 'party_name', 'obligation',
    'liability', 'termination', 'warranty', 'indemnification',
    'formatting', 'typo', 'clarification', 'other'
  )),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),

  -- Risk Flags
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  requires_review BOOLEAN DEFAULT false,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Action Taken
  action TEXT CHECK (action IN ('accept', 'reject', 'pending', 'modified')),
  action_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE document_changes IS 'Individual changes detected between document versions';
COMMENT ON COLUMN document_changes.change_order IS 'Order of change in the document';
COMMENT ON COLUMN document_changes.context_before IS 'Text context before the change';
COMMENT ON COLUMN document_changes.context_after IS 'Text context after the change';
COMMENT ON COLUMN document_changes.category IS 'Classification of change type';
COMMENT ON COLUMN document_changes.severity IS 'Risk severity of the change';
COMMENT ON COLUMN document_changes.is_flagged IS 'Whether this change needs attention';

-- ============================================
-- 4. DOCUMENT COMMENTS (Annotations & Notes)
-- ============================================

CREATE TABLE IF NOT EXISTS document_version_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Optional: Tied to specific change
  change_id UUID REFERENCES document_changes(id) ON DELETE SET NULL,

  -- Location
  section_id TEXT,
  paragraph_number INTEGER,
  start_position INTEGER,
  end_position INTEGER,
  selected_text TEXT,

  -- Comment Content
  comment_type TEXT NOT NULL CHECK (comment_type IN (
    'note', 'question', 'suggestion', 'approval', 'rejection',
    'legal_concern', 'financial_concern', 'compliance_issue'
  )),
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note TEXT,

  -- Threading
  parent_comment_id UUID REFERENCES document_version_comments(id) ON DELETE SET NULL,
  thread_id UUID,

  -- Visibility
  is_internal BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'enterprise' CHECK (visibility IN (
    'private', 'enterprise', 'external'
  )),

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE document_version_comments IS 'Comments and annotations on document versions';
COMMENT ON COLUMN document_version_comments.is_internal IS 'Whether comment is visible to external parties';
COMMENT ON COLUMN document_version_comments.thread_id IS 'Groups replies into a conversation thread';
COMMENT ON COLUMN document_version_comments.visibility IS 'Who can see this comment';

-- ============================================
-- 5. REDLINE SESSIONS (Collaborative Editing)
-- ============================================

CREATE TABLE redline_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Session Info
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'paused', 'completed', 'cancelled'
  )),

  -- Versions
  base_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  working_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,

  -- Participants
  participants JSONB DEFAULT '[]'::JSONB,
  external_participants JSONB DEFAULT '[]'::JSONB,

  -- Settings
  allow_external_edits BOOLEAN DEFAULT false,
  require_approval_for_changes BOOLEAN DEFAULT true,
  auto_accept_minor_changes BOOLEAN DEFAULT false,

  -- Progress
  total_proposed_changes INTEGER DEFAULT 0,
  accepted_changes INTEGER DEFAULT 0,
  rejected_changes INTEGER DEFAULT 0,
  pending_changes INTEGER DEFAULT 0,

  -- Dates
  started_at TIMESTAMPTZ DEFAULT NOW(),
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE redline_sessions IS 'Collaborative redlining/negotiation sessions';
COMMENT ON COLUMN redline_sessions.participants IS 'JSON array of internal user IDs participating';
COMMENT ON COLUMN redline_sessions.external_participants IS 'JSON array of external party emails/names';

-- ============================================
-- 6. INDEXES
-- ============================================

-- document_versions indexes
CREATE INDEX idx_document_versions_contract ON document_versions(contract_id);
CREATE INDEX idx_document_versions_enterprise ON document_versions(enterprise_id);
CREATE INDEX idx_document_versions_current ON document_versions(contract_id) WHERE is_current = true;
CREATE INDEX idx_document_versions_type ON document_versions(version_type);
CREATE INDEX idx_document_versions_status ON document_versions(status);
CREATE INDEX idx_document_versions_created ON document_versions(created_at DESC);

-- document_comparisons indexes
CREATE INDEX idx_document_comparisons_contract ON document_comparisons(contract_id);
CREATE INDEX idx_document_comparisons_enterprise ON document_comparisons(enterprise_id);
CREATE INDEX idx_document_comparisons_base ON document_comparisons(base_version_id);
CREATE INDEX idx_document_comparisons_compare ON document_comparisons(compare_version_id);
CREATE INDEX idx_document_comparisons_status ON document_comparisons(comparison_status);

-- document_changes indexes
CREATE INDEX idx_document_changes_comparison ON document_changes(comparison_id);
CREATE INDEX idx_document_changes_type ON document_changes(change_type);
CREATE INDEX idx_document_changes_severity ON document_changes(severity);
CREATE INDEX idx_document_changes_flagged ON document_changes(comparison_id) WHERE is_flagged = true;
CREATE INDEX idx_document_changes_pending ON document_changes(comparison_id) WHERE action = 'pending';

-- document_version_comments indexes
CREATE INDEX idx_document_version_comments_version ON document_version_comments(version_id);
CREATE INDEX idx_document_version_comments_enterprise ON document_version_comments(enterprise_id);
CREATE INDEX idx_document_version_comments_thread ON document_version_comments(thread_id);
CREATE INDEX idx_document_version_comments_unresolved ON document_version_comments(version_id) WHERE is_resolved = false;

-- redline_sessions indexes
CREATE INDEX idx_redline_sessions_contract ON redline_sessions(contract_id);
CREATE INDEX idx_redline_sessions_enterprise ON redline_sessions(enterprise_id);
CREATE INDEX idx_redline_sessions_active ON redline_sessions(enterprise_id, status) WHERE status = 'active';

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_version_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE redline_sessions ENABLE ROW LEVEL SECURITY;

-- document_versions RLS
CREATE POLICY "document_versions_enterprise_isolation" ON document_versions
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- document_comparisons RLS
CREATE POLICY "document_comparisons_enterprise_isolation" ON document_comparisons
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- document_changes RLS (via comparison)
CREATE POLICY "document_changes_via_comparison" ON document_changes
  FOR ALL USING (
    comparison_id IN (
      SELECT id FROM document_comparisons
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- document_version_comments RLS
CREATE POLICY "document_version_comments_enterprise_isolation" ON document_version_comments
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- redline_sessions RLS
CREATE POLICY "redline_sessions_enterprise_isolation" ON redline_sessions
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- ============================================
-- 8. TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_document_version_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER document_versions_update_timestamp
  BEFORE UPDATE ON document_versions
  FOR EACH ROW EXECUTE FUNCTION update_document_version_timestamp();

CREATE TRIGGER document_version_comments_update_timestamp
  BEFORE UPDATE ON document_version_comments
  FOR EACH ROW EXECUTE FUNCTION update_document_version_timestamp();

CREATE TRIGGER redline_sessions_update_timestamp
  BEFORE UPDATE ON redline_sessions
  FOR EACH ROW EXECUTE FUNCTION update_document_version_timestamp();

-- Function to ensure only one current version per contract
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE document_versions
    SET is_current = false
    WHERE contract_id = NEW.contract_id
    AND id != NEW.id
    AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_versions_single_current
  BEFORE INSERT OR UPDATE ON document_versions
  FOR EACH ROW EXECUTE FUNCTION ensure_single_current_version();

-- Function to auto-set thread_id for top-level comments
CREATE OR REPLACE FUNCTION set_comment_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    NEW.thread_id := NEW.id;
  ELSE
    SELECT thread_id INTO NEW.thread_id
    FROM document_version_comments
    WHERE id = NEW.parent_comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_version_comments_set_thread
  BEFORE INSERT ON document_version_comments
  FOR EACH ROW EXECUTE FUNCTION set_comment_thread_id();

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to create a new document version
CREATE OR REPLACE FUNCTION create_document_version(
  p_contract_id UUID,
  p_version_type TEXT,
  p_content_text TEXT DEFAULT NULL,
  p_content_html TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_change_summary TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_enterprise_id UUID;
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get enterprise_id from contract
  SELECT enterprise_id INTO v_enterprise_id
  FROM contracts WHERE id = p_contract_id;

  IF v_enterprise_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM document_versions WHERE contract_id = p_contract_id;

  -- Mark old current as not current
  UPDATE document_versions
  SET is_current = false
  WHERE contract_id = p_contract_id AND is_current = true;

  -- Insert new version
  INSERT INTO document_versions (
    contract_id,
    enterprise_id,
    version_number,
    version_label,
    version_type,
    content_text,
    content_html,
    source,
    change_summary,
    is_current,
    created_by
  ) VALUES (
    p_contract_id,
    v_enterprise_id,
    v_version_number,
    'v' || v_version_number::TEXT,
    p_version_type,
    p_content_text,
    p_content_html,
    p_source,
    p_change_summary,
    true,
    p_created_by
  ) RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get version history for a contract
CREATE OR REPLACE FUNCTION get_contract_version_history(
  p_contract_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  version_label TEXT,
  version_type TEXT,
  status TEXT,
  is_current BOOLEAN,
  change_summary TEXT,
  changes_count INTEGER,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  comparison_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dv.id,
    dv.version_number,
    dv.version_label,
    dv.version_type,
    dv.status,
    dv.is_current,
    dv.change_summary,
    dv.changes_count,
    dv.created_by,
    u.full_name AS created_by_name,
    dv.created_at,
    (SELECT COUNT(*) FROM document_comparisons dc WHERE dc.base_version_id = dv.id OR dc.compare_version_id = dv.id) AS comparison_count
  FROM document_versions dv
  LEFT JOIN users u ON dv.created_by = u.id
  WHERE dv.contract_id = p_contract_id
  ORDER BY dv.version_number DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to compare two document versions (basic diff)
-- Note: Full diff logic should be implemented in application code
CREATE OR REPLACE FUNCTION create_document_comparison(
  p_base_version_id UUID,
  p_compare_version_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_contract_id UUID;
  v_enterprise_id UUID;
  v_comparison_id UUID;
  v_base_text TEXT;
  v_compare_text TEXT;
  v_base_words INTEGER;
  v_compare_words INTEGER;
BEGIN
  -- Get contract and enterprise info from base version
  SELECT contract_id, enterprise_id, content_text
  INTO v_contract_id, v_enterprise_id, v_base_text
  FROM document_versions WHERE id = p_base_version_id;

  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'Base version not found';
  END IF;

  -- Get compare version text
  SELECT content_text INTO v_compare_text
  FROM document_versions WHERE id = p_compare_version_id;

  IF v_compare_text IS NULL THEN
    -- Get from compare version
    SELECT content_text INTO v_compare_text
    FROM document_versions WHERE id = p_compare_version_id;
  END IF;

  -- Calculate basic stats
  v_base_words := array_length(regexp_split_to_array(COALESCE(v_base_text, ''), '\s+'), 1);
  v_compare_words := array_length(regexp_split_to_array(COALESCE(v_compare_text, ''), '\s+'), 1);

  -- Insert comparison record
  INSERT INTO document_comparisons (
    contract_id,
    enterprise_id,
    base_version_id,
    compare_version_id,
    comparison_status,
    words_added,
    words_deleted,
    created_by
  ) VALUES (
    v_contract_id,
    v_enterprise_id,
    p_base_version_id,
    p_compare_version_id,
    'pending',
    GREATEST(v_compare_words - v_base_words, 0),
    GREATEST(v_base_words - v_compare_words, 0),
    p_created_by
  ) RETURNING id INTO v_comparison_id;

  RETURN v_comparison_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comparison summary
CREATE OR REPLACE FUNCTION get_comparison_summary(p_comparison_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', dc.id,
    'contract_id', dc.contract_id,
    'comparison_status', dc.comparison_status,
    'base_version', jsonb_build_object(
      'id', bv.id,
      'version_number', bv.version_number,
      'version_label', bv.version_label,
      'version_type', bv.version_type
    ),
    'compare_version', jsonb_build_object(
      'id', cv.id,
      'version_number', cv.version_number,
      'version_label', cv.version_label,
      'version_type', cv.version_type
    ),
    'statistics', jsonb_build_object(
      'total_changes', dc.total_changes,
      'additions', dc.additions_count,
      'deletions', dc.deletions_count,
      'modifications', dc.modifications_count,
      'words_added', dc.words_added,
      'words_deleted', dc.words_deleted,
      'similarity_score', dc.similarity_score
    ),
    'risk', jsonb_build_object(
      'level', dc.risk_level,
      'factors', dc.risk_factors,
      'flagged_changes', dc.flagged_changes
    ),
    'created_at', dc.created_at
  ) INTO v_result
  FROM document_comparisons dc
  JOIN document_versions bv ON dc.base_version_id = bv.id
  JOIN document_versions cv ON dc.compare_version_id = cv.id
  WHERE dc.id = p_comparison_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get changes by category
CREATE OR REPLACE FUNCTION get_changes_by_category(p_comparison_id UUID)
RETURNS TABLE (
  category TEXT,
  change_count BIGINT,
  critical_count BIGINT,
  high_count BIGINT,
  medium_count BIGINT,
  low_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(dc.category, 'other') AS category,
    COUNT(*) AS change_count,
    COUNT(*) FILTER (WHERE dc.severity = 'critical') AS critical_count,
    COUNT(*) FILTER (WHERE dc.severity = 'high') AS high_count,
    COUNT(*) FILTER (WHERE dc.severity = 'medium') AS medium_count,
    COUNT(*) FILTER (WHERE dc.severity = 'low' OR dc.severity = 'info') AS low_count
  FROM document_changes dc
  WHERE dc.comparison_id = p_comparison_id
  GROUP BY dc.category
  ORDER BY change_count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to accept/reject a change
CREATE OR REPLACE FUNCTION process_document_change(
  p_change_id UUID,
  p_action TEXT,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_comparison_id UUID;
BEGIN
  -- Validate action
  IF p_action NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be accept or reject';
  END IF;

  -- Update the change
  UPDATE document_changes
  SET
    action = p_action,
    action_by = p_user_id,
    action_at = NOW(),
    reviewed = true,
    reviewed_by = p_user_id,
    reviewed_at = NOW(),
    review_notes = p_notes
  WHERE id = p_change_id
  RETURNING comparison_id INTO v_comparison_id;

  IF v_comparison_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update comparison statistics
  UPDATE document_comparisons
  SET
    pending_changes = (
      SELECT COUNT(*) FROM document_changes
      WHERE comparison_id = v_comparison_id AND action = 'pending'
    )
  WHERE id = v_comparison_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_document_version TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_version_history TO authenticated;
GRANT EXECUTE ON FUNCTION create_document_comparison TO authenticated;
GRANT EXECUTE ON FUNCTION get_comparison_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_changes_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION process_document_change TO authenticated;

-- ============================================
-- 10. ADD template_id TO contracts TABLE (if not exists)
-- ============================================

-- Add template_id column to contracts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL;
    CREATE INDEX idx_contracts_template ON contracts(template_id);
    COMMENT ON COLUMN contracts.template_id IS 'Reference to the template used to create this contract';
  END IF;
END $$;
