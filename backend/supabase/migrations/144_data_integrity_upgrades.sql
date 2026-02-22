-- ============================================================================
-- Migration 144: Data Integrity Upgrades
-- Adds missing audit_logs columns, atomic RPCs, and audit triggers
-- ============================================================================

-- ============================================================================
-- 1. AUDIT LOGS SCHEMA ALIGNMENT
-- The TypeScript audit-logger writes these fields, but the DB silently drops them
-- ============================================================================

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changed_fields JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS compliance_tags TEXT[];
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS retention_days INTEGER DEFAULT 365;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS method TEXT;

-- Index for common audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);

-- ============================================================================
-- 2. ATOMIC RPC: copy_contract_template
-- Replaces the dangerous nested-loop copy in contract-templates/index.ts
-- ============================================================================

CREATE OR REPLACE FUNCTION copy_contract_template(
  p_source_template_id UUID,
  p_new_name TEXT,
  p_enterprise_id UUID,
  p_created_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_template_id UUID;
  v_source_template RECORD;
  v_section RECORD;
  v_new_section_id UUID;
  v_section_mapping JSONB := '{}'::JSONB;
  v_sections_copied INTEGER := 0;
  v_clause_mappings_copied INTEGER := 0;
  v_variables_copied INTEGER := 0;
BEGIN
  -- Get the source template and verify it belongs to the enterprise
  SELECT * INTO v_source_template
  FROM contract_templates
  WHERE id = p_source_template_id
    AND enterprise_id = p_enterprise_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Source template not found or access denied'
    );
  END IF;

  -- Copy the template row (excluding id, created_at, updated_at, approved_at, approved_by)
  INSERT INTO contract_templates (
    enterprise_id, name, description, template_type, category,
    jurisdictions, governing_law, regulatory_requirements,
    status, is_default, requires_legal_review,
    header_content, header_content_html, footer_content, footer_content_html,
    signature_block_template, max_contract_value, min_contract_value,
    allowed_contract_types, effective_date, expiration_date,
    tags, metadata, created_by, slug
  )
  SELECT
    enterprise_id, p_new_name, description, template_type, category,
    jurisdictions, governing_law, regulatory_requirements,
    'draft', false, requires_legal_review,
    header_content, header_content_html, footer_content, footer_content_html,
    signature_block_template, max_contract_value, min_contract_value,
    allowed_contract_types, effective_date, expiration_date,
    tags, metadata, p_created_by, NULL
  FROM contract_templates
  WHERE id = p_source_template_id
  RETURNING id INTO v_new_template_id;

  -- Copy all template_sections with parent_section_id remapping
  -- Process sections ordered by depth to ensure parents are copied before children
  FOR v_section IN
    SELECT *
    FROM template_sections
    WHERE template_id = p_source_template_id
    ORDER BY depth ASC, sort_order ASC
  LOOP
    INSERT INTO template_sections (
      template_id, name, title, section_number, sort_order,
      parent_section_id, depth, intro_content, intro_content_html,
      outro_content, outro_content_html, is_required, is_editable,
      is_conditional, condition_expression, page_break_before,
      numbering_style, metadata
    )
    VALUES (
      v_new_template_id, v_section.name, v_section.title, v_section.section_number, v_section.sort_order,
      CASE
        WHEN v_section.parent_section_id IS NOT NULL
        THEN (v_section_mapping ->> v_section.parent_section_id::TEXT)::UUID
        ELSE NULL
      END,
      v_section.depth, v_section.intro_content, v_section.intro_content_html,
      v_section.outro_content, v_section.outro_content_html, v_section.is_required, v_section.is_editable,
      v_section.is_conditional, v_section.condition_expression, v_section.page_break_before,
      v_section.numbering_style, v_section.metadata
    )
    RETURNING id INTO v_new_section_id;

    -- Store old->new section ID mapping
    v_section_mapping := v_section_mapping || jsonb_build_object(v_section.id::TEXT, v_new_section_id::TEXT);
    v_sections_copied := v_sections_copied + 1;
  END LOOP;

  -- Copy all template_clause_mappings with section_id remapping
  INSERT INTO template_clause_mappings (
    template_id, section_id, clause_id, sort_order,
    is_required, is_editable, allow_alternatives,
    default_alternative_id, override_content, override_content_html,
    is_conditional, condition_expression, notes, metadata
  )
  SELECT
    v_new_template_id,
    (v_section_mapping ->> tcm.section_id::TEXT)::UUID,
    tcm.clause_id, tcm.sort_order,
    tcm.is_required, tcm.is_editable, tcm.allow_alternatives,
    tcm.default_alternative_id, tcm.override_content, tcm.override_content_html,
    tcm.is_conditional, tcm.condition_expression, tcm.notes, tcm.metadata
  FROM template_clause_mappings tcm
  WHERE tcm.template_id = p_source_template_id
    AND (v_section_mapping ->> tcm.section_id::TEXT) IS NOT NULL;

  GET DIAGNOSTICS v_clause_mappings_copied = ROW_COUNT;

  -- Copy all template_variables
  INSERT INTO template_variables (
    template_id, variable_name, display_name, description,
    variable_type, validation_rules, format_pattern, options,
    default_value, default_expression, is_required, is_system,
    group_name, sort_order, placeholder, help_text,
    display_format, metadata
  )
  SELECT
    v_new_template_id, variable_name, display_name, description,
    variable_type, validation_rules, format_pattern, options,
    default_value, default_expression, is_required, is_system,
    group_name, sort_order, placeholder, help_text,
    display_format, metadata
  FROM template_variables
  WHERE template_id = p_source_template_id;

  GET DIAGNOSTICS v_variables_copied = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'template_id', v_new_template_id,
    'sections_copied', v_sections_copied,
    'clause_mappings_copied', v_clause_mappings_copied,
    'variables_copied', v_variables_copied
  );
END;
$$;

-- ============================================================================
-- 3. ATOMIC RPC: update_contract_status
-- Replaces separate writes in contracts/index.ts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contract_status(
  p_contract_id UUID,
  p_new_status TEXT,
  p_changed_by UUID,
  p_enterprise_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  -- Validate the contract exists and belongs to the enterprise
  SELECT status INTO v_old_status
  FROM contracts
  WHERE id = p_contract_id
    AND enterprise_id = p_enterprise_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Contract not found or access denied'
    );
  END IF;

  v_updated_at := NOW();

  -- Update contracts status, last_modified_by, updated_at
  UPDATE contracts
  SET status = p_new_status::contract_status,
      last_modified_by = p_changed_by,
      updated_at = v_updated_at
  WHERE id = p_contract_id
    AND enterprise_id = p_enterprise_id;

  -- Insert into contract_status_history
  INSERT INTO contract_status_history (
    contract_id, previous_status, new_status, changed_by, reason, created_at
  )
  VALUES (
    p_contract_id,
    v_old_status::contract_status,
    p_new_status::contract_status,
    p_changed_by,
    p_notes,
    v_updated_at
  );

  RETURN json_build_object(
    'success', true,
    'contract_id', p_contract_id,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'updated_at', v_updated_at
  );
END;
$$;

-- ============================================================================
-- 4. AUDIT TRIGGERS
-- Automatic audit logging on contracts, vendors, and enterprises
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enterprise_id UUID;
  v_user_id UUID;
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Determine the action type
  v_action := TG_OP;

  -- For UPDATE, only log if the row actually changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD IS NOT DISTINCT FROM NEW THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Extract enterprise_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_enterprise_id := OLD.enterprise_id;
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_enterprise_id := NEW.enterprise_id;
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSE
    v_enterprise_id := NEW.enterprise_id;
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  END IF;

  -- Try to get user_id from the new or old row
  IF TG_OP = 'DELETE' THEN
    v_user_id := NULL;
  ELSE
    -- Try common user columns
    BEGIN
      v_user_id := (to_jsonb(NEW) ->> 'last_modified_by')::UUID;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        v_user_id := (to_jsonb(NEW) ->> 'updated_by')::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
      END;
    END;
  END IF;

  -- Insert audit log entry
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    old_values, new_values, entity_type, enterprise_id
  )
  VALUES (
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    v_old_values,
    v_new_values,
    TG_TABLE_NAME,
    v_enterprise_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers on contracts
CREATE TRIGGER audit_contracts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create triggers on vendors
CREATE TRIGGER audit_vendors_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vendors
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create triggers on enterprises
CREATE TRIGGER audit_enterprises_trigger
  AFTER INSERT OR UPDATE OR DELETE ON enterprises
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION copy_contract_template(UUID, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_contract_status(UUID, TEXT, UUID, UUID, TEXT) TO authenticated;
