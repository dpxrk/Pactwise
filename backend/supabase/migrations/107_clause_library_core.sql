-- Migration 107: Clause Library Core
-- Part of CLM Implementation - Phase 1
-- Creates: clause_categories, clause_library, clause_versions, clause_alternatives

-- ============================================
-- 1. CLAUSE CATEGORIES (Hierarchical)
-- ============================================

CREATE TABLE clause_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES clause_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on enterprise, name, and parent (using COALESCE for NULL parent handling)
CREATE UNIQUE INDEX idx_clause_categories_unique_name
  ON clause_categories(enterprise_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::UUID));

COMMENT ON TABLE clause_categories IS 'Hierarchical organization of contract clauses';
COMMENT ON COLUMN clause_categories.parent_id IS 'Parent category for hierarchical nesting';
COMMENT ON COLUMN clause_categories.sort_order IS 'Display order within parent category';

-- ============================================
-- 2. CLAUSE LIBRARY (Main Table)
-- ============================================

CREATE TABLE clause_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Identification
  title TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Classification
  clause_type TEXT NOT NULL CHECK (clause_type IN (
    'indemnification', 'liability', 'limitation_of_liability',
    'ip_ownership', 'confidentiality', 'data_protection',
    'termination', 'termination_for_convenience', 'force_majeure',
    'payment', 'pricing', 'warranty', 'insurance',
    'dispute_resolution', 'governing_law', 'assignment',
    'notice', 'audit_rights', 'compliance', 'sla',
    'non_compete', 'non_solicitation', 'entire_agreement',
    'amendment', 'severability', 'waiver', 'definitions', 'other'
  )),
  category_id UUID REFERENCES clause_categories(id) ON DELETE SET NULL,

  -- Content
  content TEXT NOT NULL,
  content_html TEXT,
  variables JSONB DEFAULT '[]'::JSONB,

  -- Risk & Compliance
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  jurisdictions TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{en}',

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'deprecated', 'archived')),
  is_standard BOOLEAN DEFAULT false,
  requires_approval_if_modified BOOLEAN DEFAULT true,

  -- Dates
  effective_date DATE,
  expiration_date DATE,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Search
  search_vector TSVECTOR,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, slug)
);

COMMENT ON TABLE clause_library IS 'Central repository for reusable contract clauses';
COMMENT ON COLUMN clause_library.slug IS 'URL-friendly unique identifier within enterprise';
COMMENT ON COLUMN clause_library.clause_type IS 'Type classification for the clause';
COMMENT ON COLUMN clause_library.content IS 'Plain text content of the clause';
COMMENT ON COLUMN clause_library.content_html IS 'Rich HTML formatted version of the clause';
COMMENT ON COLUMN clause_library.variables IS 'List of placeholder variables like {{PARTY_A}}, {{EFFECTIVE_DATE}}';
COMMENT ON COLUMN clause_library.risk_level IS 'Risk classification: low, medium, high, critical';
COMMENT ON COLUMN clause_library.jurisdictions IS 'Array of applicable jurisdictions';
COMMENT ON COLUMN clause_library.is_standard IS 'Whether this is an approved standard clause';
COMMENT ON COLUMN clause_library.requires_approval_if_modified IS 'Whether modifications require approval';
COMMENT ON COLUMN clause_library.search_vector IS 'Full-text search vector for content and tags';

-- ============================================
-- 3. CLAUSE VERSIONS (Full History)
-- ============================================

CREATE TABLE clause_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id UUID NOT NULL REFERENCES clause_library(id) ON DELETE CASCADE,

  version_number INTEGER NOT NULL,
  version_label TEXT,

  content TEXT NOT NULL,
  content_html TEXT,
  variables JSONB DEFAULT '[]'::JSONB,

  change_summary TEXT,
  change_type TEXT CHECK (change_type IN ('major', 'minor', 'patch')),

  is_current BOOLEAN DEFAULT false,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(clause_id, version_number)
);

COMMENT ON TABLE clause_versions IS 'Version history for clause library entries';
COMMENT ON COLUMN clause_versions.version_number IS 'Sequential version number starting at 1';
COMMENT ON COLUMN clause_versions.version_label IS 'Human-readable version label like 1.0, 1.1, 2.0';
COMMENT ON COLUMN clause_versions.change_type IS 'major = significant change, minor = small change, patch = typo/formatting';
COMMENT ON COLUMN clause_versions.is_current IS 'Only one version per clause should be marked current';

-- ============================================
-- 4. CLAUSE ALTERNATIVES (Fallback Positions)
-- ============================================

CREATE TABLE clause_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id UUID NOT NULL REFERENCES clause_library(id) ON DELETE CASCADE,

  position_order INTEGER NOT NULL,
  position_label TEXT NOT NULL,

  content TEXT NOT NULL,
  content_html TEXT,

  description TEXT,
  risk_delta INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(clause_id, position_order)
);

COMMENT ON TABLE clause_alternatives IS 'Alternative negotiation positions for clauses';
COMMENT ON COLUMN clause_alternatives.position_order IS '1 = Fallback 1, 2 = Fallback 2, etc. Higher = less preferred';
COMMENT ON COLUMN clause_alternatives.position_label IS 'Label like "Fallback 1", "Walk Away"';
COMMENT ON COLUMN clause_alternatives.description IS 'When to use this alternative position';
COMMENT ON COLUMN clause_alternatives.risk_delta IS 'Change in risk score compared to standard (+positive = more risky)';
COMMENT ON COLUMN clause_alternatives.requires_approval IS 'Whether using this position requires approval';

-- ============================================
-- 5. INDEXES
-- ============================================

-- clause_categories indexes
CREATE INDEX idx_clause_categories_enterprise ON clause_categories(enterprise_id);
CREATE INDEX idx_clause_categories_parent ON clause_categories(parent_id);

-- clause_library indexes
CREATE INDEX idx_clause_library_enterprise ON clause_library(enterprise_id);
CREATE INDEX idx_clause_library_type ON clause_library(clause_type);
CREATE INDEX idx_clause_library_status ON clause_library(status);
CREATE INDEX idx_clause_library_category ON clause_library(category_id);
CREATE INDEX idx_clause_library_risk ON clause_library(risk_level);
CREATE INDEX idx_clause_library_search ON clause_library USING GIN(search_vector);
CREATE INDEX idx_clause_library_tags ON clause_library USING GIN(tags);
CREATE INDEX idx_clause_library_standard ON clause_library(enterprise_id, is_standard) WHERE is_standard = true;

-- clause_versions indexes
CREATE INDEX idx_clause_versions_clause ON clause_versions(clause_id);
CREATE INDEX idx_clause_versions_current ON clause_versions(clause_id) WHERE is_current = true;

-- clause_alternatives indexes
CREATE INDEX idx_clause_alternatives_clause ON clause_alternatives(clause_id);

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE clause_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_alternatives ENABLE ROW LEVEL SECURITY;

-- clause_categories RLS
CREATE POLICY "clause_categories_enterprise_isolation" ON clause_categories
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- clause_library RLS
CREATE POLICY "clause_library_enterprise_isolation" ON clause_library
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- clause_versions RLS (via clause)
CREATE POLICY "clause_versions_via_clause" ON clause_versions
  FOR ALL USING (
    clause_id IN (
      SELECT id FROM clause_library
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- clause_alternatives RLS (via clause)
CREATE POLICY "clause_alternatives_via_clause" ON clause_alternatives
  FOR ALL USING (
    clause_id IN (
      SELECT id FROM clause_library
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- ============================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_clause_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector update
CREATE TRIGGER clause_library_search_update
  BEFORE INSERT OR UPDATE ON clause_library
  FOR EACH ROW EXECUTE FUNCTION update_clause_search_vector();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_clause_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  -- If slug is provided, use it
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;

  -- Check for uniqueness within enterprise
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM clause_library
    WHERE enterprise_id = NEW.enterprise_id
    AND slug = final_slug
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating slug
CREATE TRIGGER clause_library_generate_slug
  BEFORE INSERT OR UPDATE ON clause_library
  FOR EACH ROW EXECUTE FUNCTION generate_clause_slug();

-- Function to create initial version on clause insert
CREATE OR REPLACE FUNCTION create_initial_clause_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clause_versions (
    clause_id,
    version_number,
    version_label,
    content,
    content_html,
    variables,
    change_summary,
    change_type,
    is_current,
    created_by
  ) VALUES (
    NEW.id,
    1,
    '1.0',
    NEW.content,
    NEW.content_html,
    NEW.variables,
    'Initial version',
    'major',
    true,
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create initial version
CREATE TRIGGER clause_library_create_initial_version
  AFTER INSERT ON clause_library
  FOR EACH ROW EXECUTE FUNCTION create_initial_clause_version();

-- Function to update version on clause content change
CREATE OR REPLACE FUNCTION update_clause_version_on_content_change()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
  new_version_label TEXT;
BEGIN
  -- Only create new version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    -- Get latest version number
    SELECT COALESCE(MAX(version_number), 0) INTO latest_version
    FROM clause_versions WHERE clause_id = NEW.id;

    -- Mark old current version as not current
    UPDATE clause_versions
    SET is_current = false
    WHERE clause_id = NEW.id AND is_current = true;

    -- Determine version label (auto-increment minor version)
    new_version_label := '1.' || (latest_version);

    -- Insert new version
    INSERT INTO clause_versions (
      clause_id,
      version_number,
      version_label,
      content,
      content_html,
      variables,
      change_summary,
      change_type,
      is_current,
      created_by
    ) VALUES (
      NEW.id,
      latest_version + 1,
      new_version_label,
      NEW.content,
      NEW.content_html,
      NEW.variables,
      'Content updated',
      'minor',
      true,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for version creation on content update
CREATE TRIGGER clause_library_version_on_update
  AFTER UPDATE ON clause_library
  FOR EACH ROW EXECUTE FUNCTION update_clause_version_on_content_change();

-- Function to update category updated_at
CREATE OR REPLACE FUNCTION update_clause_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for category timestamp
CREATE TRIGGER clause_categories_update_timestamp
  BEFORE UPDATE ON clause_categories
  FOR EACH ROW EXECUTE FUNCTION update_clause_category_timestamp();

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get full category path
CREATE OR REPLACE FUNCTION get_clause_category_path(category_id UUID)
RETURNS TEXT AS $$
DECLARE
  path TEXT := '';
  current_id UUID := category_id;
  current_name TEXT;
BEGIN
  WHILE current_id IS NOT NULL LOOP
    SELECT name, parent_id INTO current_name, current_id
    FROM clause_categories WHERE id = current_id;

    IF current_name IS NOT NULL THEN
      IF path = '' THEN
        path := current_name;
      ELSE
        path := current_name || ' > ' || path;
      END IF;
    END IF;
  END LOOP;

  RETURN path;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search clauses
CREATE OR REPLACE FUNCTION search_clauses(
  p_enterprise_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_clause_type TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  clause_type TEXT,
  category_id UUID,
  category_name TEXT,
  category_path TEXT,
  risk_level TEXT,
  status TEXT,
  is_standard BOOLEAN,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id,
    cl.title,
    cl.slug,
    cl.clause_type,
    cl.category_id,
    cc.name AS category_name,
    get_clause_category_path(cl.category_id) AS category_path,
    cl.risk_level,
    cl.status,
    cl.is_standard,
    cl.tags,
    cl.created_at,
    cl.updated_at,
    CASE
      WHEN p_search_query IS NOT NULL AND p_search_query != '' THEN
        ts_rank(cl.search_vector, plainto_tsquery('english', p_search_query))
      ELSE 1.0
    END AS rank
  FROM clause_library cl
  LEFT JOIN clause_categories cc ON cl.category_id = cc.id
  WHERE cl.enterprise_id = p_enterprise_id
    AND (p_search_query IS NULL OR p_search_query = '' OR cl.search_vector @@ plainto_tsquery('english', p_search_query))
    AND (p_clause_type IS NULL OR cl.clause_type = p_clause_type)
    AND (p_risk_level IS NULL OR cl.risk_level = p_risk_level)
    AND (p_status IS NULL OR cl.status = p_status)
    AND (p_category_id IS NULL OR cl.category_id = p_category_id)
  ORDER BY rank DESC, cl.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_clauses TO authenticated;
GRANT EXECUTE ON FUNCTION get_clause_category_path TO authenticated;

-- ============================================
-- 9. DEFAULT DATA (Common Clause Types)
-- ============================================

-- This will be populated per-enterprise through application logic
-- No default seed data needed here
