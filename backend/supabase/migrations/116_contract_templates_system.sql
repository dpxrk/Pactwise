-- Migration 116: Contract Templates System
-- Part of CLM Implementation - Contract Authoring Phase
-- Creates: contract_templates, template_sections, template_clause_mappings, template_variables, template_versions, template_usage_analytics

-- ============================================
-- 1. CONTRACT TEMPLATES (Main Table)
-- ============================================

CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Classification
  template_type TEXT NOT NULL CHECK (template_type IN (
    'master_services_agreement', 'statement_of_work', 'nda', 'non_disclosure',
    'employment', 'contractor', 'lease', 'license', 'purchase_order',
    'sales', 'partnership', 'joint_venture', 'distribution', 'franchise',
    'consulting', 'maintenance', 'support', 'subscription', 'saas',
    'data_processing', 'vendor', 'supplier', 'amendment', 'addendum', 'other'
  )),
  category TEXT,

  -- Jurisdiction & Compliance
  jurisdictions TEXT[] DEFAULT '{}',
  governing_law TEXT,
  regulatory_requirements TEXT[] DEFAULT '{}',

  -- Status & Workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'pending_approval', 'approved', 'active', 'deprecated', 'archived'
  )),
  is_default BOOLEAN DEFAULT false,
  requires_legal_review BOOLEAN DEFAULT true,
  approval_workflow_id UUID,

  -- Content Structure
  header_content TEXT,
  header_content_html TEXT,
  footer_content TEXT,
  footer_content_html TEXT,
  signature_block_template TEXT,

  -- Risk & Scoring
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  complexity_score INTEGER DEFAULT 0 CHECK (complexity_score >= 0 AND complexity_score <= 100),

  -- Usage Settings
  max_contract_value DECIMAL(15,2),
  min_contract_value DECIMAL(15,2),
  allowed_contract_types TEXT[] DEFAULT '{}',
  restricted_vendors UUID[] DEFAULT '{}',

  -- Ownership & Dates
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  expiration_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Search
  search_vector TSVECTOR,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, slug)
);

COMMENT ON TABLE contract_templates IS 'Full document templates for contract creation';
COMMENT ON COLUMN contract_templates.slug IS 'URL-friendly unique identifier within enterprise';
COMMENT ON COLUMN contract_templates.template_type IS 'Type classification for the template';
COMMENT ON COLUMN contract_templates.is_default IS 'Whether this is the default template for its type';
COMMENT ON COLUMN contract_templates.header_content IS 'Standard header content for all contracts from this template';
COMMENT ON COLUMN contract_templates.signature_block_template IS 'Template for signature blocks at end of contract';
COMMENT ON COLUMN contract_templates.risk_score IS 'Calculated risk score based on clause composition (0-100)';
COMMENT ON COLUMN contract_templates.complexity_score IS 'Complexity score based on variables, clauses, and conditions (0-100)';
COMMENT ON COLUMN contract_templates.max_contract_value IS 'Maximum contract value this template can be used for';
COMMENT ON COLUMN contract_templates.restricted_vendors IS 'Vendors that cannot use this template';

-- ============================================
-- 2. TEMPLATE SECTIONS (Ordered Document Structure)
-- ============================================

CREATE TABLE template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  section_number TEXT,

  -- Ordering & Hierarchy
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_section_id UUID REFERENCES template_sections(id) ON DELETE SET NULL,
  depth INTEGER DEFAULT 0,

  -- Content
  intro_content TEXT,
  intro_content_html TEXT,
  outro_content TEXT,
  outro_content_html TEXT,

  -- Settings
  is_required BOOLEAN DEFAULT true,
  is_editable BOOLEAN DEFAULT true,
  is_conditional BOOLEAN DEFAULT false,
  condition_expression JSONB,

  -- Formatting
  page_break_before BOOLEAN DEFAULT false,
  numbering_style TEXT DEFAULT 'decimal' CHECK (numbering_style IN ('decimal', 'roman', 'alpha', 'none')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, sort_order)
);

COMMENT ON TABLE template_sections IS 'Ordered sections within a contract template';
COMMENT ON COLUMN template_sections.section_number IS 'Display number like "1", "1.1", "2.a"';
COMMENT ON COLUMN template_sections.sort_order IS 'Order of section within template (1, 2, 3...)';
COMMENT ON COLUMN template_sections.parent_section_id IS 'Parent section for nested subsections';
COMMENT ON COLUMN template_sections.depth IS 'Nesting depth (0 = top level, 1 = subsection, etc.)';
COMMENT ON COLUMN template_sections.intro_content IS 'Introduction text before clauses in this section';
COMMENT ON COLUMN template_sections.outro_content IS 'Closing text after clauses in this section';
COMMENT ON COLUMN template_sections.is_conditional IS 'Whether this section is conditionally included';
COMMENT ON COLUMN template_sections.condition_expression IS 'JSON expression defining when section is included';

-- ============================================
-- 3. TEMPLATE CLAUSE MAPPINGS (Link Clauses to Sections)
-- ============================================

CREATE TABLE template_clause_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES clause_library(id) ON DELETE CASCADE,

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Settings
  is_required BOOLEAN DEFAULT true,
  is_editable BOOLEAN DEFAULT true,
  allow_alternatives BOOLEAN DEFAULT true,
  default_alternative_id UUID REFERENCES clause_alternatives(id) ON DELETE SET NULL,

  -- Override Content (optional)
  override_content TEXT,
  override_content_html TEXT,

  -- Conditions
  is_conditional BOOLEAN DEFAULT false,
  condition_expression JSONB,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(section_id, clause_id),
  UNIQUE(section_id, sort_order)
);

COMMENT ON TABLE template_clause_mappings IS 'Links clauses from clause_library to template sections';
COMMENT ON COLUMN template_clause_mappings.sort_order IS 'Order of clause within section';
COMMENT ON COLUMN template_clause_mappings.allow_alternatives IS 'Whether user can select alternative clause positions';
COMMENT ON COLUMN template_clause_mappings.default_alternative_id IS 'Default alternative position if alternatives are allowed';
COMMENT ON COLUMN template_clause_mappings.override_content IS 'Optional override of clause content for this template';
COMMENT ON COLUMN template_clause_mappings.is_conditional IS 'Whether this clause is conditionally included';
COMMENT ON COLUMN template_clause_mappings.condition_expression IS 'JSON expression defining when clause is included';

-- ============================================
-- 4. TEMPLATE VARIABLES (Dynamic Field Definitions)
-- ============================================

CREATE TABLE template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,

  -- Identification
  variable_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,

  -- Type & Validation
  variable_type TEXT NOT NULL CHECK (variable_type IN (
    'text', 'number', 'currency', 'date', 'datetime', 'boolean',
    'select', 'multi_select', 'party', 'address', 'email', 'phone',
    'percentage', 'duration', 'user', 'vendor', 'custom'
  )),
  validation_rules JSONB DEFAULT '{}'::JSONB,
  format_pattern TEXT,

  -- Options (for select types)
  options JSONB DEFAULT '[]'::JSONB,

  -- Default Value
  default_value TEXT,
  default_expression TEXT,

  -- Settings
  is_required BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  group_name TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Display
  placeholder TEXT,
  help_text TEXT,
  display_format TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, variable_name)
);

COMMENT ON TABLE template_variables IS 'Variable definitions for template field population';
COMMENT ON COLUMN template_variables.variable_name IS 'Internal name used in template like {{PARTY_A_NAME}}';
COMMENT ON COLUMN template_variables.display_name IS 'Human-readable label shown in forms';
COMMENT ON COLUMN template_variables.variable_type IS 'Data type for validation and rendering';
COMMENT ON COLUMN template_variables.validation_rules IS 'JSON validation rules (min, max, pattern, etc.)';
COMMENT ON COLUMN template_variables.format_pattern IS 'Format pattern for display (e.g., date format)';
COMMENT ON COLUMN template_variables.options IS 'Options array for select/multi_select types';
COMMENT ON COLUMN template_variables.default_expression IS 'Dynamic expression to compute default value';
COMMENT ON COLUMN template_variables.is_system IS 'Whether this is a system-generated variable';
COMMENT ON COLUMN template_variables.group_name IS 'Group for organizing variables in forms';

-- ============================================
-- 5. TEMPLATE VERSIONS (Full History)
-- ============================================

CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,

  -- Version Info
  version_number INTEGER NOT NULL,
  version_label TEXT,

  -- Snapshot of Template State
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,

  -- Content Snapshot
  header_content TEXT,
  footer_content TEXT,
  signature_block_template TEXT,

  -- Sections Snapshot (denormalized for history)
  sections_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Clause Mappings Snapshot (denormalized for history)
  clause_mappings_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Variables Snapshot (denormalized for history)
  variables_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Change Info
  change_summary TEXT,
  change_type TEXT CHECK (change_type IN ('major', 'minor', 'patch')),
  is_current BOOLEAN DEFAULT false,

  -- Approval Info
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, version_number)
);

COMMENT ON TABLE template_versions IS 'Version history for contract templates';
COMMENT ON COLUMN template_versions.version_number IS 'Sequential version number starting at 1';
COMMENT ON COLUMN template_versions.version_label IS 'Human-readable version label like 1.0, 1.1, 2.0';
COMMENT ON COLUMN template_versions.sections_snapshot IS 'JSON snapshot of template sections at this version';
COMMENT ON COLUMN template_versions.clause_mappings_snapshot IS 'JSON snapshot of clause mappings at this version';
COMMENT ON COLUMN template_versions.variables_snapshot IS 'JSON snapshot of template variables at this version';
COMMENT ON COLUMN template_versions.change_type IS 'major = significant change, minor = small change, patch = typo/formatting';
COMMENT ON COLUMN template_versions.is_current IS 'Only one version per template should be marked current';

-- ============================================
-- 6. TEMPLATE USAGE ANALYTICS
-- ============================================

CREATE TABLE template_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- Usage Metrics
  contracts_created INTEGER DEFAULT 0,
  contracts_executed INTEGER DEFAULT 0,
  contracts_abandoned INTEGER DEFAULT 0,

  -- Time Metrics
  avg_completion_time_hours DECIMAL(10,2),
  avg_approval_time_hours DECIMAL(10,2),
  avg_execution_time_hours DECIMAL(10,2),

  -- Modification Metrics
  sections_modified_count INTEGER DEFAULT 0,
  clauses_modified_count INTEGER DEFAULT 0,
  variables_overridden_count INTEGER DEFAULT 0,

  -- Value Metrics
  total_contract_value DECIMAL(15,2) DEFAULT 0,
  avg_contract_value DECIMAL(15,2) DEFAULT 0,

  -- User Metrics
  unique_users INTEGER DEFAULT 0,
  most_common_modifications JSONB DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, period_start, period_type)
);

COMMENT ON TABLE template_usage_analytics IS 'Analytics tracking for template usage patterns';
COMMENT ON COLUMN template_usage_analytics.period_type IS 'Aggregation period: daily, weekly, monthly';
COMMENT ON COLUMN template_usage_analytics.contracts_created IS 'Number of contracts started from this template';
COMMENT ON COLUMN template_usage_analytics.contracts_executed IS 'Number of contracts that reached execution';
COMMENT ON COLUMN template_usage_analytics.contracts_abandoned IS 'Number of contracts abandoned before completion';
COMMENT ON COLUMN template_usage_analytics.avg_completion_time_hours IS 'Average time from creation to execution';
COMMENT ON COLUMN template_usage_analytics.most_common_modifications IS 'JSON array of most frequently modified sections/clauses';

-- ============================================
-- 7. CONTRACT TEMPLATE INHERITANCE (Template Composition)
-- ============================================

CREATE TABLE template_inheritance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  parent_template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,

  -- Inheritance Settings
  inherit_sections BOOLEAN DEFAULT true,
  inherit_variables BOOLEAN DEFAULT true,
  inherit_header_footer BOOLEAN DEFAULT true,

  -- Override Settings
  section_overrides JSONB DEFAULT '{}'::JSONB,
  variable_overrides JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_template_id, parent_template_id),
  CHECK (child_template_id != parent_template_id)
);

COMMENT ON TABLE template_inheritance IS 'Template inheritance relationships for composition';
COMMENT ON COLUMN template_inheritance.inherit_sections IS 'Whether child inherits parent sections';
COMMENT ON COLUMN template_inheritance.inherit_variables IS 'Whether child inherits parent variables';
COMMENT ON COLUMN template_inheritance.section_overrides IS 'JSON specifying which parent sections to override';
COMMENT ON COLUMN template_inheritance.variable_overrides IS 'JSON specifying which parent variables to override';

-- ============================================
-- 8. INDEXES
-- ============================================

-- contract_templates indexes
CREATE INDEX idx_contract_templates_enterprise ON contract_templates(enterprise_id);
CREATE INDEX idx_contract_templates_type ON contract_templates(template_type);
CREATE INDEX idx_contract_templates_status ON contract_templates(status);
CREATE INDEX idx_contract_templates_default ON contract_templates(enterprise_id, template_type, is_default) WHERE is_default = true;
CREATE INDEX idx_contract_templates_search ON contract_templates USING GIN(search_vector);
CREATE INDEX idx_contract_templates_tags ON contract_templates USING GIN(tags);
CREATE INDEX idx_contract_templates_active ON contract_templates(enterprise_id, status) WHERE status = 'active';

-- template_sections indexes
CREATE INDEX idx_template_sections_template ON template_sections(template_id);
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, sort_order);

-- template_clause_mappings indexes
CREATE INDEX idx_template_clause_mappings_template ON template_clause_mappings(template_id);
CREATE INDEX idx_template_clause_mappings_section ON template_clause_mappings(section_id);
CREATE INDEX idx_template_clause_mappings_clause ON template_clause_mappings(clause_id);

-- template_variables indexes
CREATE INDEX idx_template_variables_template ON template_variables(template_id);
CREATE INDEX idx_template_variables_group ON template_variables(template_id, group_name);

-- template_versions indexes
CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_template_versions_current ON template_versions(template_id) WHERE is_current = true;

-- template_usage_analytics indexes
CREATE INDEX idx_template_usage_template ON template_usage_analytics(template_id);
CREATE INDEX idx_template_usage_enterprise ON template_usage_analytics(enterprise_id);
CREATE INDEX idx_template_usage_period ON template_usage_analytics(period_start, period_type);

-- template_inheritance indexes
CREATE INDEX idx_template_inheritance_child ON template_inheritance(child_template_id);
CREATE INDEX idx_template_inheritance_parent ON template_inheritance(parent_template_id);

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_clause_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_inheritance ENABLE ROW LEVEL SECURITY;

-- contract_templates RLS
CREATE POLICY "contract_templates_enterprise_isolation" ON contract_templates
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- template_sections RLS (via template)
CREATE POLICY "template_sections_via_template" ON template_sections
  FOR ALL USING (
    template_id IN (
      SELECT id FROM contract_templates
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- template_clause_mappings RLS (via template)
CREATE POLICY "template_clause_mappings_via_template" ON template_clause_mappings
  FOR ALL USING (
    template_id IN (
      SELECT id FROM contract_templates
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- template_variables RLS (via template)
CREATE POLICY "template_variables_via_template" ON template_variables
  FOR ALL USING (
    template_id IN (
      SELECT id FROM contract_templates
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- template_versions RLS (via template)
CREATE POLICY "template_versions_via_template" ON template_versions
  FOR ALL USING (
    template_id IN (
      SELECT id FROM contract_templates
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- template_usage_analytics RLS
CREATE POLICY "template_usage_enterprise_isolation" ON template_usage_analytics
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- template_inheritance RLS (via child template)
CREATE POLICY "template_inheritance_via_child" ON template_inheritance
  FOR ALL USING (
    child_template_id IN (
      SELECT id FROM contract_templates
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- ============================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update search vector for templates
CREATE OR REPLACE FUNCTION update_template_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.template_type, '') || ' ' ||
    COALESCE(NEW.category, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector update
CREATE TRIGGER contract_templates_search_update
  BEFORE INSERT OR UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_template_search_vector();

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_template_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  -- If slug is provided, use it
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;

  -- Check for uniqueness within enterprise
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM contract_templates
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
CREATE TRIGGER contract_templates_generate_slug
  BEFORE INSERT OR UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION generate_template_slug();

-- Function to ensure only one default template per type
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE contract_templates
    SET is_default = false
    WHERE enterprise_id = NEW.enterprise_id
    AND template_type = NEW.template_type
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for single default per type
CREATE TRIGGER contract_templates_single_default
  BEFORE INSERT OR UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_template();

-- Function to create initial version on template insert
CREATE OR REPLACE FUNCTION create_initial_template_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO template_versions (
    template_id,
    version_number,
    version_label,
    name,
    description,
    template_type,
    header_content,
    footer_content,
    signature_block_template,
    sections_snapshot,
    clause_mappings_snapshot,
    variables_snapshot,
    change_summary,
    change_type,
    is_current,
    created_by
  ) VALUES (
    NEW.id,
    1,
    '1.0',
    NEW.name,
    NEW.description,
    NEW.template_type,
    NEW.header_content,
    NEW.footer_content,
    NEW.signature_block_template,
    '[]'::JSONB,
    '[]'::JSONB,
    '[]'::JSONB,
    'Initial version',
    'major',
    true,
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create initial version
CREATE TRIGGER contract_templates_create_initial_version
  AFTER INSERT ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION create_initial_template_version();

-- Function to update section timestamps
CREATE OR REPLACE FUNCTION update_template_section_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for section timestamp
CREATE TRIGGER template_sections_update_timestamp
  BEFORE UPDATE ON template_sections
  FOR EACH ROW EXECUTE FUNCTION update_template_section_timestamp();

-- Function to calculate template risk score
CREATE OR REPLACE FUNCTION calculate_template_risk_score(p_template_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_risk INTEGER := 0;
  clause_count INTEGER := 0;
  clause_risk TEXT;
  risk_value INTEGER;
BEGIN
  -- Calculate average risk from mapped clauses
  FOR clause_risk IN
    SELECT cl.risk_level
    FROM template_clause_mappings tcm
    JOIN clause_library cl ON tcm.clause_id = cl.id
    WHERE tcm.template_id = p_template_id
  LOOP
    clause_count := clause_count + 1;
    CASE clause_risk
      WHEN 'low' THEN risk_value := 10;
      WHEN 'medium' THEN risk_value := 40;
      WHEN 'high' THEN risk_value := 70;
      WHEN 'critical' THEN risk_value := 100;
      ELSE risk_value := 25;
    END CASE;
    total_risk := total_risk + risk_value;
  END LOOP;

  IF clause_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN total_risk / clause_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate template complexity score
CREATE OR REPLACE FUNCTION calculate_template_complexity_score(p_template_id UUID)
RETURNS INTEGER AS $$
DECLARE
  section_count INTEGER;
  clause_count INTEGER;
  variable_count INTEGER;
  conditional_count INTEGER;
  complexity INTEGER;
BEGIN
  SELECT COUNT(*) INTO section_count FROM template_sections WHERE template_id = p_template_id;
  SELECT COUNT(*) INTO clause_count FROM template_clause_mappings WHERE template_id = p_template_id;
  SELECT COUNT(*) INTO variable_count FROM template_variables WHERE template_id = p_template_id;
  SELECT COUNT(*) INTO conditional_count FROM template_sections WHERE template_id = p_template_id AND is_conditional = true;

  -- Complexity formula: weighted sum of components
  complexity := (section_count * 2) + (clause_count * 3) + (variable_count * 2) + (conditional_count * 5);

  -- Normalize to 0-100 scale (cap at 100)
  RETURN LEAST(complexity, 100);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================

-- Function to search templates
CREATE OR REPLACE FUNCTION search_templates(
  p_enterprise_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_template_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  template_type TEXT,
  status TEXT,
  is_default BOOLEAN,
  risk_score INTEGER,
  complexity_score INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  section_count BIGINT,
  clause_count BIGINT,
  variable_count BIGINT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.name,
    ct.slug,
    ct.description,
    ct.template_type,
    ct.status,
    ct.is_default,
    ct.risk_score,
    ct.complexity_score,
    ct.created_at,
    ct.updated_at,
    (SELECT COUNT(*) FROM template_sections ts WHERE ts.template_id = ct.id) AS section_count,
    (SELECT COUNT(*) FROM template_clause_mappings tcm WHERE tcm.template_id = ct.id) AS clause_count,
    (SELECT COUNT(*) FROM template_variables tv WHERE tv.template_id = ct.id) AS variable_count,
    CASE
      WHEN p_search_query IS NOT NULL AND p_search_query != '' THEN
        ts_rank(ct.search_vector, plainto_tsquery('english', p_search_query))
      ELSE 1.0
    END AS rank
  FROM contract_templates ct
  WHERE ct.enterprise_id = p_enterprise_id
    AND (p_search_query IS NULL OR p_search_query = '' OR ct.search_vector @@ plainto_tsquery('english', p_search_query))
    AND (p_template_type IS NULL OR ct.template_type = p_template_type)
    AND (p_status IS NULL OR ct.status = p_status)
  ORDER BY rank DESC, ct.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get full template with all components
CREATE OR REPLACE FUNCTION get_template_full(p_template_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sections_json JSONB;
  variables_json JSONB;
BEGIN
  -- Get template base
  SELECT jsonb_build_object(
    'id', ct.id,
    'name', ct.name,
    'slug', ct.slug,
    'description', ct.description,
    'template_type', ct.template_type,
    'status', ct.status,
    'is_default', ct.is_default,
    'header_content', ct.header_content,
    'footer_content', ct.footer_content,
    'signature_block_template', ct.signature_block_template,
    'risk_score', ct.risk_score,
    'complexity_score', ct.complexity_score,
    'jurisdictions', ct.jurisdictions,
    'governing_law', ct.governing_law,
    'tags', ct.tags,
    'metadata', ct.metadata,
    'created_at', ct.created_at,
    'updated_at', ct.updated_at
  ) INTO result
  FROM contract_templates ct
  WHERE ct.id = p_template_id;

  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get sections with their clause mappings
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ts.id,
      'name', ts.name,
      'title', ts.title,
      'section_number', ts.section_number,
      'sort_order', ts.sort_order,
      'intro_content', ts.intro_content,
      'outro_content', ts.outro_content,
      'is_required', ts.is_required,
      'is_editable', ts.is_editable,
      'is_conditional', ts.is_conditional,
      'clauses', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'mapping_id', tcm.id,
            'clause_id', cl.id,
            'title', cl.title,
            'content', cl.content,
            'clause_type', cl.clause_type,
            'risk_level', cl.risk_level,
            'sort_order', tcm.sort_order,
            'is_required', tcm.is_required,
            'is_editable', tcm.is_editable,
            'override_content', tcm.override_content
          ) ORDER BY tcm.sort_order
        ), '[]'::JSONB)
        FROM template_clause_mappings tcm
        JOIN clause_library cl ON tcm.clause_id = cl.id
        WHERE tcm.section_id = ts.id
      )
    ) ORDER BY ts.sort_order
  ), '[]'::JSONB) INTO sections_json
  FROM template_sections ts
  WHERE ts.template_id = p_template_id;

  -- Get variables
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', tv.id,
      'variable_name', tv.variable_name,
      'display_name', tv.display_name,
      'description', tv.description,
      'variable_type', tv.variable_type,
      'validation_rules', tv.validation_rules,
      'options', tv.options,
      'default_value', tv.default_value,
      'is_required', tv.is_required,
      'group_name', tv.group_name,
      'sort_order', tv.sort_order,
      'placeholder', tv.placeholder,
      'help_text', tv.help_text
    ) ORDER BY tv.group_name NULLS LAST, tv.sort_order
  ), '[]'::JSONB) INTO variables_json
  FROM template_variables tv
  WHERE tv.template_id = p_template_id;

  -- Combine all
  result := result || jsonb_build_object(
    'sections', sections_json,
    'variables', variables_json
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to render template with variable values
CREATE OR REPLACE FUNCTION render_template_content(
  p_template_id UUID,
  p_variable_values JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  template_data JSONB;
  sections JSONB;
  rendered_sections JSONB := '[]'::JSONB;
  section_item JSONB;
  clauses JSONB;
  rendered_clauses JSONB;
  clause_item JSONB;
  rendered_content TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Get full template
  template_data := get_template_full(p_template_id);

  IF template_data IS NULL THEN
    RETURN NULL;
  END IF;

  sections := template_data->'sections';

  -- Iterate through sections
  FOR section_item IN SELECT * FROM jsonb_array_elements(sections)
  LOOP
    clauses := section_item->'clauses';
    rendered_clauses := '[]'::JSONB;

    -- Render each clause content with variables
    FOR clause_item IN SELECT * FROM jsonb_array_elements(clauses)
    LOOP
      rendered_content := COALESCE(clause_item->>'override_content', clause_item->>'content');

      -- Replace variables
      FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variable_values)
      LOOP
        rendered_content := replace(rendered_content, '{{' || var_key || '}}', var_value);
      END LOOP;

      rendered_clauses := rendered_clauses || jsonb_build_object(
        'clause_id', clause_item->'clause_id',
        'title', clause_item->'title',
        'rendered_content', rendered_content,
        'sort_order', clause_item->'sort_order'
      );
    END LOOP;

    rendered_sections := rendered_sections || jsonb_build_object(
      'section_id', section_item->'id',
      'name', section_item->'name',
      'title', section_item->'title',
      'section_number', section_item->'section_number',
      'intro_content', section_item->'intro_content',
      'outro_content', section_item->'outro_content',
      'clauses', rendered_clauses
    );
  END LOOP;

  RETURN jsonb_build_object(
    'template_id', p_template_id,
    'name', template_data->'name',
    'header_content', template_data->'header_content',
    'footer_content', template_data->'footer_content',
    'signature_block_template', template_data->'signature_block_template',
    'sections', rendered_sections,
    'rendered_at', NOW()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to create new version of template
CREATE OR REPLACE FUNCTION create_template_version(
  p_template_id UUID,
  p_change_summary TEXT DEFAULT 'Version update',
  p_change_type TEXT DEFAULT 'minor',
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  latest_version INTEGER;
  new_version_id UUID;
  template_record RECORD;
  sections_json JSONB;
  clauses_json JSONB;
  variables_json JSONB;
BEGIN
  -- Get template
  SELECT * INTO template_record FROM contract_templates WHERE id = p_template_id;

  IF template_record IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Get latest version
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM template_versions WHERE template_id = p_template_id;

  -- Mark old current as not current
  UPDATE template_versions
  SET is_current = false
  WHERE template_id = p_template_id AND is_current = true;

  -- Snapshot sections
  SELECT COALESCE(jsonb_agg(to_jsonb(ts.*)), '[]'::JSONB) INTO sections_json
  FROM template_sections ts WHERE ts.template_id = p_template_id;

  -- Snapshot clause mappings
  SELECT COALESCE(jsonb_agg(to_jsonb(tcm.*)), '[]'::JSONB) INTO clauses_json
  FROM template_clause_mappings tcm WHERE tcm.template_id = p_template_id;

  -- Snapshot variables
  SELECT COALESCE(jsonb_agg(to_jsonb(tv.*)), '[]'::JSONB) INTO variables_json
  FROM template_variables tv WHERE tv.template_id = p_template_id;

  -- Insert new version
  INSERT INTO template_versions (
    template_id,
    version_number,
    version_label,
    name,
    description,
    template_type,
    header_content,
    footer_content,
    signature_block_template,
    sections_snapshot,
    clause_mappings_snapshot,
    variables_snapshot,
    change_summary,
    change_type,
    is_current,
    created_by
  ) VALUES (
    p_template_id,
    latest_version + 1,
    CASE p_change_type
      WHEN 'major' THEN (latest_version + 1)::TEXT || '.0'
      WHEN 'minor' THEN SPLIT_PART(template_record.slug, '.', 1) || '.' || (latest_version + 1)::TEXT
      ELSE SPLIT_PART(template_record.slug, '.', 1) || '.' || SPLIT_PART(template_record.slug, '.', 2) || '.' || (latest_version + 1)::TEXT
    END,
    template_record.name,
    template_record.description,
    template_record.template_type,
    template_record.header_content,
    template_record.footer_content,
    template_record.signature_block_template,
    sections_json,
    clauses_json,
    variables_json,
    p_change_summary,
    p_change_type,
    true,
    p_created_by
  ) RETURNING id INTO new_version_id;

  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_templates TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_full TO authenticated;
GRANT EXECUTE ON FUNCTION render_template_content TO authenticated;
GRANT EXECUTE ON FUNCTION create_template_version TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_template_risk_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_template_complexity_score TO authenticated;

-- ============================================
-- 12. AUTOMATION TRIGGERS
-- ============================================

-- Function to update template risk/complexity on clause mapping change
CREATE OR REPLACE FUNCTION update_template_scores_on_clause_change()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Get template_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_template_id := OLD.template_id;
  ELSE
    v_template_id := NEW.template_id;
  END IF;

  -- Update scores
  UPDATE contract_templates
  SET
    risk_score = calculate_template_risk_score(v_template_id),
    complexity_score = calculate_template_complexity_score(v_template_id)
  WHERE id = v_template_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for score updates
CREATE TRIGGER template_clause_mapping_score_update
  AFTER INSERT OR UPDATE OR DELETE ON template_clause_mappings
  FOR EACH ROW EXECUTE FUNCTION update_template_scores_on_clause_change();

-- Trigger for section changes affecting complexity
CREATE TRIGGER template_section_score_update
  AFTER INSERT OR UPDATE OR DELETE ON template_sections
  FOR EACH ROW EXECUTE FUNCTION update_template_scores_on_clause_change();

-- Trigger for variable changes affecting complexity
CREATE TRIGGER template_variable_score_update
  AFTER INSERT OR UPDATE OR DELETE ON template_variables
  FOR EACH ROW EXECUTE FUNCTION update_template_scores_on_clause_change();
