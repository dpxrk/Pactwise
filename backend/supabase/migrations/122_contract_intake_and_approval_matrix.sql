-- Migration 122: Contract Intake Forms and Approval Matrix
-- Enterprise CLM feature: Structured contract request intake with conditional routing
-- Provides: Intake form definitions, submissions, approval matrices, routing rules

-- ============================================
-- 1. INTAKE FORM DEFINITIONS
-- ============================================

CREATE TABLE contract_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Form Identity
  name TEXT NOT NULL,
  description TEXT,
  form_code TEXT NOT NULL,  -- Short code like "NDA-REQ", "MSA-REQ"

  -- Target
  target_contract_type TEXT,  -- Links to contract type
  target_template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,

  -- Form Structure (JSON Schema compatible)
  form_schema JSONB NOT NULL DEFAULT '{}',  -- Field definitions
  ui_schema JSONB DEFAULT '{}',  -- UI rendering hints
  validation_rules JSONB DEFAULT '{}',  -- Cross-field validation

  -- Conditional Logic
  conditional_logic JSONB DEFAULT '[]',  -- Show/hide fields based on answers

  -- Workflow Integration
  auto_create_contract BOOLEAN DEFAULT false,
  default_workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE SET NULL,
  auto_assign_rules JSONB DEFAULT '{}',  -- Auto-assign based on answers

  -- Settings
  requires_attachments BOOLEAN DEFAULT false,
  attachment_types TEXT[] DEFAULT '{}',  -- Allowed MIME types
  max_attachments INTEGER DEFAULT 10,
  requires_approval BOOLEAN DEFAULT true,
  allow_draft_save BOOLEAN DEFAULT true,
  allow_resubmission BOOLEAN DEFAULT true,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'inactive', 'archived'
  )),
  published_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,

  -- Usage Statistics
  submission_count INTEGER DEFAULT 0,
  avg_completion_time_minutes INTEGER,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, form_code)
);

COMMENT ON TABLE contract_intake_forms IS 'Contract request intake form definitions with conditional logic';
COMMENT ON COLUMN contract_intake_forms.form_schema IS 'JSON Schema for form fields with types, validation, and options';
COMMENT ON COLUMN contract_intake_forms.conditional_logic IS 'Rules for showing/hiding fields based on other field values';

-- ============================================
-- 2. INTAKE FORM FIELDS (Denormalized for performance)
-- ============================================

CREATE TABLE intake_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES contract_intake_forms(id) ON DELETE CASCADE,

  -- Field Identity
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text', 'textarea', 'number', 'currency', 'date', 'datetime',
    'select', 'multiselect', 'radio', 'checkbox', 'file',
    'user_picker', 'vendor_picker', 'template_picker',
    'section_header', 'rich_text', 'signature'
  )),

  -- Position
  field_order INTEGER NOT NULL,
  section TEXT,
  column_span INTEGER DEFAULT 1 CHECK (column_span BETWEEN 1 AND 4),

  -- Validation
  is_required BOOLEAN DEFAULT false,
  min_value NUMERIC,
  max_value NUMERIC,
  min_length INTEGER,
  max_length INTEGER,
  pattern TEXT,  -- Regex pattern
  validation_message TEXT,

  -- Options (for select, radio, etc.)
  options JSONB DEFAULT '[]',
  allow_other BOOLEAN DEFAULT false,

  -- Dependencies
  depends_on_field TEXT,
  depends_on_value JSONB,
  show_when TEXT CHECK (show_when IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than')),

  -- Mapping
  maps_to_contract_field TEXT,  -- Auto-populate contract field
  maps_to_workflow_variable TEXT,

  -- Help
  placeholder TEXT,
  help_text TEXT,
  tooltip TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(form_id, field_name)
);

COMMENT ON TABLE intake_form_fields IS 'Individual field definitions for intake forms';

-- ============================================
-- 3. INTAKE SUBMISSIONS
-- ============================================

CREATE TABLE intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES contract_intake_forms(id) ON DELETE CASCADE,

  -- Submission Identity
  submission_number TEXT NOT NULL,  -- Auto-generated: REQ-2025-00001
  title TEXT NOT NULL,

  -- Submitted Data
  form_data JSONB NOT NULL DEFAULT '{}',  -- Answers to form fields
  form_version INTEGER NOT NULL,  -- Version of form at submission time

  -- Classification (may be auto-detected)
  contract_type TEXT,
  estimated_value NUMERIC(15,2),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  urgency TEXT CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  business_unit TEXT,
  cost_center TEXT,

  -- Counterparty
  counterparty_name TEXT,
  counterparty_type TEXT,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'approved', 'rejected',
    'needs_info', 'withdrawn', 'converted'
  )),
  status_reason TEXT,

  -- Workflow
  current_approval_step INTEGER DEFAULT 0,
  workflow_instance_id UUID,

  -- Outcome
  resulting_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  first_reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Ownership
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, submission_number)
);

COMMENT ON TABLE intake_submissions IS 'Contract request submissions from intake forms';
COMMENT ON COLUMN intake_submissions.form_data IS 'JSON object with field_name: value pairs';

-- ============================================
-- 4. INTAKE ATTACHMENTS
-- ============================================

CREATE TABLE intake_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,

  -- File Info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  file_hash TEXT,

  -- Classification
  attachment_type TEXT DEFAULT 'supporting_document' CHECK (attachment_type IN (
    'supporting_document', 'existing_contract', 'vendor_proposal',
    'legal_review', 'compliance_cert', 'other'
  )),
  description TEXT,

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE intake_attachments IS 'File attachments for intake submissions';

-- ============================================
-- 5. INTAKE COMMENTS/NOTES
-- ============================================

CREATE TABLE intake_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,

  -- Comment
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note' CHECK (comment_type IN (
    'note', 'question', 'approval', 'rejection', 'info_request', 'internal'
  )),

  -- Visibility
  is_internal BOOLEAN DEFAULT false,  -- Hidden from requester

  -- Author
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. APPROVAL MATRICES
-- ============================================

CREATE TABLE approval_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Matrix Identity
  name TEXT NOT NULL,
  description TEXT,
  matrix_code TEXT NOT NULL,  -- "STD-APPROVAL", "HIGH-VALUE-APPROVAL"

  -- Scope
  applies_to TEXT NOT NULL CHECK (applies_to IN (
    'all_contracts', 'contract_type', 'intake_form', 'vendor_type',
    'business_unit', 'cost_center'
  )),
  scope_value TEXT,  -- The specific type/form/unit this applies to

  -- Priority (higher = checked first)
  priority INTEGER DEFAULT 100,

  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES approval_matrices(id) ON DELETE SET NULL,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, matrix_code, version)
);

COMMENT ON TABLE approval_matrices IS 'Approval matrix definitions for contract routing';
COMMENT ON COLUMN approval_matrices.priority IS 'Higher priority matrices are evaluated first';

-- ============================================
-- 7. APPROVAL MATRIX RULES
-- ============================================

CREATE TABLE approval_matrix_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES approval_matrices(id) ON DELETE CASCADE,

  -- Rule Identity
  rule_name TEXT NOT NULL,
  rule_order INTEGER NOT NULL,

  -- Conditions (ALL must match for rule to apply)
  conditions JSONB NOT NULL DEFAULT '[]',
  /*
    Example conditions:
    [
      {"field": "estimated_value", "operator": ">=", "value": 100000},
      {"field": "risk_level", "operator": "in", "value": ["high", "critical"]},
      {"field": "contract_type", "operator": "=", "value": "MSA"}
    ]
  */

  -- Approvers (ordered sequence)
  approvers JSONB NOT NULL DEFAULT '[]',
  /*
    Example approvers:
    [
      {"step": 1, "type": "user", "id": "uuid", "name": "Legal Counsel"},
      {"step": 2, "type": "role", "role": "finance_manager"},
      {"step": 3, "type": "dynamic", "field": "assigned_approver"},
      {"step": 4, "type": "committee", "committee_id": "uuid"}
    ]
  */

  -- Settings
  approval_type TEXT DEFAULT 'sequential' CHECK (approval_type IN (
    'sequential', 'parallel', 'any_one', 'majority', 'unanimous'
  )),
  escalation_days INTEGER DEFAULT 3,
  auto_approve_if_no_match BOOLEAN DEFAULT false,
  skip_if_self BOOLEAN DEFAULT true,  -- Skip step if requester = approver

  -- Notifications
  notify_on_assignment BOOLEAN DEFAULT true,
  notify_on_escalation BOOLEAN DEFAULT true,
  reminder_days INTEGER[] DEFAULT '{1, 3}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(matrix_id, rule_order)
);

COMMENT ON TABLE approval_matrix_rules IS 'Individual rules within an approval matrix';
COMMENT ON COLUMN approval_matrix_rules.conditions IS 'JSON array of conditions that must ALL be true';
COMMENT ON COLUMN approval_matrix_rules.approvers IS 'Ordered list of approvers with step numbers';

-- ============================================
-- 8. APPROVAL ROUTING HISTORY
-- ============================================

CREATE TABLE approval_routing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- What was routed
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'intake_submission', 'contract', 'signature_request', 'amendment'
  )),
  entity_id UUID NOT NULL,

  -- Which matrix/rule was used
  matrix_id UUID REFERENCES approval_matrices(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES approval_matrix_rules(id) ON DELETE SET NULL,
  matrix_name TEXT,
  rule_name TEXT,

  -- Routing Decision
  step_number INTEGER NOT NULL,
  approver_type TEXT NOT NULL,
  approver_id UUID,
  approver_role TEXT,
  approver_name TEXT,

  -- Timing
  routed_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,

  -- Result
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'escalated', 'skipped', 'delegated'
  )),
  decision_at TIMESTAMPTZ,
  decision_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_comment TEXT,

  -- Escalation
  escalated_from UUID REFERENCES approval_routing_history(id) ON DELETE SET NULL,
  escalation_reason TEXT,

  -- Conditions that triggered this routing
  matched_conditions JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE approval_routing_history IS 'Audit trail of approval routing decisions';

-- ============================================
-- 9. DELEGATION RULES
-- ============================================

CREATE TABLE approval_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Delegator
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Delegate
  delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Scope
  delegation_scope TEXT NOT NULL DEFAULT 'all' CHECK (delegation_scope IN (
    'all', 'contract_type', 'value_threshold', 'specific_matrix'
  )),
  scope_config JSONB DEFAULT '{}',  -- Additional scope parameters

  -- Value Limits
  max_approval_value NUMERIC(15,2),

  -- Time Window
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'revoked'
  )),

  -- Reason
  reason TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE approval_delegations IS 'Approval delegation rules for out-of-office or authority transfer';

-- ============================================
-- 10. SUBMISSION NUMBER SEQUENCE
-- ============================================

CREATE TABLE intake_submission_sequences (
  enterprise_id UUID PRIMARY KEY REFERENCES enterprises(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  prefix TEXT DEFAULT 'REQ',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get next submission number
CREATE OR REPLACE FUNCTION get_next_submission_number(p_enterprise_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_number INTEGER;
  v_prefix TEXT;
  v_result TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Get or create sequence
  INSERT INTO intake_submission_sequences (enterprise_id, year, next_number, prefix)
  VALUES (p_enterprise_id, v_year, 2, 'REQ')
  ON CONFLICT (enterprise_id) DO UPDATE
  SET
    next_number = CASE
      WHEN intake_submission_sequences.year = v_year THEN intake_submission_sequences.next_number + 1
      ELSE 1
    END,
    year = v_year,
    updated_at = NOW()
  RETURNING next_number - 1, prefix INTO v_number, v_prefix;

  -- Handle case where we reset the year
  IF v_number IS NULL OR v_number < 1 THEN
    v_number := 1;
  END IF;

  -- Get prefix
  SELECT prefix INTO v_prefix FROM intake_submission_sequences WHERE enterprise_id = p_enterprise_id;
  IF v_prefix IS NULL THEN v_prefix := 'REQ'; END IF;

  v_result := v_prefix || '-' || v_year || '-' || LPAD(v_number::TEXT, 5, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. INDEXES
-- ============================================

-- contract_intake_forms indexes
CREATE INDEX idx_cif_enterprise ON contract_intake_forms(enterprise_id);
CREATE INDEX idx_cif_status ON contract_intake_forms(status);
CREATE INDEX idx_cif_code ON contract_intake_forms(enterprise_id, form_code);
CREATE INDEX idx_cif_template ON contract_intake_forms(target_template_id);

-- intake_form_fields indexes
CREATE INDEX idx_iff_form ON intake_form_fields(form_id);
CREATE INDEX idx_iff_order ON intake_form_fields(form_id, field_order);

-- intake_submissions indexes
CREATE INDEX idx_is_enterprise ON intake_submissions(enterprise_id);
CREATE INDEX idx_is_form ON intake_submissions(form_id);
CREATE INDEX idx_is_status ON intake_submissions(status);
CREATE INDEX idx_is_submitted_by ON intake_submissions(submitted_by);
CREATE INDEX idx_is_assigned ON intake_submissions(assigned_to);
CREATE INDEX idx_is_number ON intake_submissions(enterprise_id, submission_number);
CREATE INDEX idx_is_vendor ON intake_submissions(vendor_id);
CREATE INDEX idx_is_pending ON intake_submissions(enterprise_id, status) WHERE status IN ('submitted', 'under_review', 'needs_info');

-- intake_attachments indexes
CREATE INDEX idx_ia_submission ON intake_attachments(submission_id);

-- intake_comments indexes
CREATE INDEX idx_ic_submission ON intake_comments(submission_id);

-- approval_matrices indexes
CREATE INDEX idx_am_enterprise ON approval_matrices(enterprise_id);
CREATE INDEX idx_am_code ON approval_matrices(enterprise_id, matrix_code);
CREATE INDEX idx_am_active ON approval_matrices(enterprise_id, is_active, priority DESC);
CREATE INDEX idx_am_scope ON approval_matrices(applies_to, scope_value);

-- approval_matrix_rules indexes
CREATE INDEX idx_amr_matrix ON approval_matrix_rules(matrix_id);
CREATE INDEX idx_amr_order ON approval_matrix_rules(matrix_id, rule_order);
CREATE INDEX idx_amr_active ON approval_matrix_rules(matrix_id, is_active);

-- approval_routing_history indexes
CREATE INDEX idx_arh_enterprise ON approval_routing_history(enterprise_id);
CREATE INDEX idx_arh_entity ON approval_routing_history(entity_type, entity_id);
CREATE INDEX idx_arh_approver ON approval_routing_history(approver_id);
CREATE INDEX idx_arh_status ON approval_routing_history(status);
CREATE INDEX idx_arh_pending ON approval_routing_history(approver_id, status) WHERE status = 'pending';
CREATE INDEX idx_arh_due ON approval_routing_history(due_date) WHERE status = 'pending';

-- approval_delegations indexes
CREATE INDEX idx_ad_enterprise ON approval_delegations(enterprise_id);
CREATE INDEX idx_ad_delegator ON approval_delegations(delegator_id);
CREATE INDEX idx_ad_delegate ON approval_delegations(delegate_id);
CREATE INDEX idx_ad_active ON approval_delegations(delegator_id, status, effective_from, effective_until);

-- ============================================
-- 12. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE contract_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_matrix_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_routing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_delegations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "cif_enterprise_isolation" ON contract_intake_forms
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

CREATE POLICY "iff_via_form" ON intake_form_fields
  FOR ALL USING (form_id IN (SELECT id FROM contract_intake_forms WHERE enterprise_id = get_user_enterprise_id()));

CREATE POLICY "is_enterprise_isolation" ON intake_submissions
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

CREATE POLICY "ia_via_submission" ON intake_attachments
  FOR ALL USING (submission_id IN (SELECT id FROM intake_submissions WHERE enterprise_id = get_user_enterprise_id()));

CREATE POLICY "ic_via_submission" ON intake_comments
  FOR ALL USING (submission_id IN (SELECT id FROM intake_submissions WHERE enterprise_id = get_user_enterprise_id()));

CREATE POLICY "am_enterprise_isolation" ON approval_matrices
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

CREATE POLICY "amr_via_matrix" ON approval_matrix_rules
  FOR ALL USING (matrix_id IN (SELECT id FROM approval_matrices WHERE enterprise_id = get_user_enterprise_id()));

CREATE POLICY "arh_enterprise_isolation" ON approval_routing_history
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

CREATE POLICY "ad_enterprise_isolation" ON approval_delegations
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

-- ============================================
-- 13. TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_intake_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cif_update_timestamp
  BEFORE UPDATE ON contract_intake_forms
  FOR EACH ROW EXECUTE FUNCTION update_intake_timestamp();

CREATE TRIGGER is_update_timestamp
  BEFORE UPDATE ON intake_submissions
  FOR EACH ROW EXECUTE FUNCTION update_intake_timestamp();

CREATE TRIGGER am_update_timestamp
  BEFORE UPDATE ON approval_matrices
  FOR EACH ROW EXECUTE FUNCTION update_intake_timestamp();

-- Auto-generate submission number
CREATE OR REPLACE FUNCTION auto_submission_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submission_number IS NULL THEN
    NEW.submission_number := get_next_submission_number(NEW.enterprise_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER is_auto_number
  BEFORE INSERT ON intake_submissions
  FOR EACH ROW EXECUTE FUNCTION auto_submission_number();

-- Update form submission count
CREATE OR REPLACE FUNCTION update_form_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'submitted' THEN
    UPDATE contract_intake_forms
    SET submission_count = submission_count + 1
    WHERE id = NEW.form_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER is_update_form_count
  AFTER INSERT ON intake_submissions
  FOR EACH ROW EXECUTE FUNCTION update_form_submission_count();

-- ============================================
-- 14. HELPER FUNCTIONS
-- ============================================

-- Create an intake form
CREATE OR REPLACE FUNCTION create_intake_form(
  p_enterprise_id UUID,
  p_name TEXT,
  p_form_code TEXT,
  p_description TEXT DEFAULT NULL,
  p_target_contract_type TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_form_id UUID;
BEGIN
  INSERT INTO contract_intake_forms (
    enterprise_id, name, form_code, description, target_contract_type, created_by
  ) VALUES (
    p_enterprise_id, p_name, p_form_code, p_description, p_target_contract_type, p_created_by
  ) RETURNING id INTO v_form_id;

  RETURN v_form_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit an intake request
CREATE OR REPLACE FUNCTION submit_intake_request(
  p_enterprise_id UUID,
  p_form_id UUID,
  p_title TEXT,
  p_form_data JSONB,
  p_submitted_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_submission_id UUID;
  v_form_version INTEGER;
BEGIN
  -- Get form version
  SELECT version INTO v_form_version FROM contract_intake_forms WHERE id = p_form_id;

  INSERT INTO intake_submissions (
    enterprise_id, form_id, title, form_data, form_version,
    status, submitted_at, submitted_by
  ) VALUES (
    p_enterprise_id, p_form_id, p_title, p_form_data, v_form_version,
    'submitted', NOW(), p_submitted_by
  ) RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Evaluate approval matrix for an entity
CREATE OR REPLACE FUNCTION evaluate_approval_matrix(
  p_enterprise_id UUID,
  p_entity_type TEXT,
  p_entity_data JSONB  -- Key-value pairs to match against conditions
)
RETURNS TABLE (
  matrix_id UUID,
  rule_id UUID,
  approvers JSONB,
  approval_type TEXT
) AS $$
DECLARE
  v_matrix RECORD;
  v_rule RECORD;
  v_condition JSONB;
  v_matches BOOLEAN;
  v_field_value TEXT;
  v_condition_value TEXT;
  v_operator TEXT;
BEGIN
  -- Find matching matrices (highest priority first)
  FOR v_matrix IN
    SELECT am.* FROM approval_matrices am
    WHERE am.enterprise_id = p_enterprise_id
    AND am.is_active = true
    AND (am.effective_until IS NULL OR am.effective_until > NOW())
    ORDER BY am.priority DESC
  LOOP
    -- Check each rule in the matrix
    FOR v_rule IN
      SELECT amr.* FROM approval_matrix_rules amr
      WHERE amr.matrix_id = v_matrix.id
      AND amr.is_active = true
      ORDER BY amr.rule_order
    LOOP
      v_matches := true;

      -- Evaluate all conditions
      FOR v_condition IN SELECT * FROM jsonb_array_elements(v_rule.conditions)
      LOOP
        v_field_value := p_entity_data->>(v_condition->>'field');
        v_condition_value := v_condition->>'value';
        v_operator := v_condition->>'operator';

        -- Check condition based on operator
        CASE v_operator
          WHEN '=' THEN
            v_matches := v_matches AND (v_field_value = v_condition_value);
          WHEN '!=' THEN
            v_matches := v_matches AND (v_field_value != v_condition_value);
          WHEN '>' THEN
            v_matches := v_matches AND (v_field_value::NUMERIC > v_condition_value::NUMERIC);
          WHEN '>=' THEN
            v_matches := v_matches AND (v_field_value::NUMERIC >= v_condition_value::NUMERIC);
          WHEN '<' THEN
            v_matches := v_matches AND (v_field_value::NUMERIC < v_condition_value::NUMERIC);
          WHEN '<=' THEN
            v_matches := v_matches AND (v_field_value::NUMERIC <= v_condition_value::NUMERIC);
          WHEN 'in' THEN
            v_matches := v_matches AND (v_field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(v_condition->'value'))));
          WHEN 'contains' THEN
            v_matches := v_matches AND (v_field_value ILIKE '%' || v_condition_value || '%');
          ELSE
            v_matches := false;
        END CASE;

        EXIT WHEN NOT v_matches;
      END LOOP;

      -- If all conditions match, return this rule
      IF v_matches THEN
        RETURN QUERY SELECT v_matrix.id, v_rule.id, v_rule.approvers, v_rule.approval_type;
        RETURN;  -- Return first matching rule
      END IF;
    END LOOP;
  END LOOP;

  -- No matching rule found
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Route entity for approval
CREATE OR REPLACE FUNCTION route_for_approval(
  p_enterprise_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_data JSONB,
  p_initiated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  routing_id UUID,
  step_number INTEGER,
  approver_type TEXT,
  approver_id UUID,
  approver_name TEXT
) AS $$
DECLARE
  v_matrix RECORD;
  v_approver JSONB;
  v_step INTEGER;
  v_routing_id UUID;
  v_approver_id UUID;
  v_approver_name TEXT;
BEGIN
  -- Find matching approval matrix
  SELECT * INTO v_matrix FROM evaluate_approval_matrix(p_enterprise_id, p_entity_type, p_entity_data);

  IF v_matrix IS NULL THEN
    RAISE EXCEPTION 'No approval matrix found for entity';
  END IF;

  -- Create routing entries for each approver
  FOR v_approver IN SELECT * FROM jsonb_array_elements(v_matrix.approvers)
  LOOP
    v_step := (v_approver->>'step')::INTEGER;

    -- Determine actual approver based on type
    CASE v_approver->>'type'
      WHEN 'user' THEN
        v_approver_id := (v_approver->>'id')::UUID;
        v_approver_name := v_approver->>'name';
      WHEN 'role' THEN
        -- Find user with this role (simplified - would query users table)
        v_approver_id := NULL;
        v_approver_name := 'Role: ' || (v_approver->>'role');
      WHEN 'dynamic' THEN
        -- Use value from entity_data
        v_approver_id := (p_entity_data->>(v_approver->>'field'))::UUID;
        v_approver_name := 'Dynamic';
      ELSE
        v_approver_id := NULL;
        v_approver_name := 'Unknown';
    END CASE;

    -- Check for delegation
    SELECT d.delegate_id INTO v_approver_id
    FROM approval_delegations d
    WHERE d.delegator_id = v_approver_id
    AND d.status = 'active'
    AND d.effective_from <= NOW()
    AND (d.effective_until IS NULL OR d.effective_until > NOW())
    LIMIT 1;

    INSERT INTO approval_routing_history (
      enterprise_id, entity_type, entity_id,
      matrix_id, rule_id, matrix_name, rule_name,
      step_number, approver_type, approver_id, approver_name,
      due_date, matched_conditions
    ) VALUES (
      p_enterprise_id, p_entity_type, p_entity_id,
      v_matrix.matrix_id, v_matrix.rule_id, NULL, NULL,
      v_step, v_approver->>'type', v_approver_id, v_approver_name,
      NOW() + INTERVAL '3 days', p_entity_data
    ) RETURNING id INTO v_routing_id;

    RETURN QUERY SELECT v_routing_id, v_step, v_approver->>'type', v_approver_id, v_approver_name;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process approval decision
CREATE OR REPLACE FUNCTION process_approval_decision(
  p_routing_id UUID,
  p_decision TEXT,  -- 'approved' or 'rejected'
  p_decision_by UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_routing RECORD;
  v_next_step INTEGER;
  v_all_approved BOOLEAN;
BEGIN
  -- Get routing record
  SELECT * INTO v_routing FROM approval_routing_history WHERE id = p_routing_id;

  IF v_routing IS NULL THEN
    RETURN false;
  END IF;

  -- Update decision
  UPDATE approval_routing_history
  SET
    status = p_decision,
    decision_at = NOW(),
    decision_by = p_decision_by,
    decision_comment = p_comment
  WHERE id = p_routing_id;

  -- If rejected, mark entity as rejected
  IF p_decision = 'rejected' THEN
    IF v_routing.entity_type = 'intake_submission' THEN
      UPDATE intake_submissions
      SET status = 'rejected', status_reason = p_comment
      WHERE id = v_routing.entity_id;
    END IF;
    RETURN true;
  END IF;

  -- If approved, check if all steps are approved
  SELECT NOT EXISTS (
    SELECT 1 FROM approval_routing_history
    WHERE entity_type = v_routing.entity_type
    AND entity_id = v_routing.entity_id
    AND step_number <= v_routing.step_number
    AND status = 'pending'
  ) INTO v_all_approved;

  IF v_all_approved THEN
    -- Activate next step if exists
    UPDATE approval_routing_history
    SET status = 'pending'
    WHERE entity_type = v_routing.entity_type
    AND entity_id = v_routing.entity_id
    AND step_number = v_routing.step_number + 1
    AND status = 'pending';

    -- Check if all steps complete
    IF NOT EXISTS (
      SELECT 1 FROM approval_routing_history
      WHERE entity_type = v_routing.entity_type
      AND entity_id = v_routing.entity_id
      AND status = 'pending'
    ) THEN
      -- All approved - update entity
      IF v_routing.entity_type = 'intake_submission' THEN
        UPDATE intake_submissions
        SET status = 'approved', completed_at = NOW()
        WHERE id = v_routing.entity_id;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending approvals for user
CREATE OR REPLACE FUNCTION get_pending_approvals(
  p_user_id UUID,
  p_enterprise_id UUID
)
RETURNS TABLE (
  routing_id UUID,
  entity_type TEXT,
  entity_id UUID,
  entity_title TEXT,
  step_number INTEGER,
  routed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    arh.id,
    arh.entity_type,
    arh.entity_id,
    CASE arh.entity_type
      WHEN 'intake_submission' THEN (SELECT title FROM intake_submissions WHERE id = arh.entity_id)
      WHEN 'contract' THEN (SELECT title FROM contracts WHERE id = arh.entity_id)
      ELSE 'Unknown'
    END,
    arh.step_number,
    arh.routed_at,
    arh.due_date,
    arh.due_date < NOW()
  FROM approval_routing_history arh
  WHERE arh.enterprise_id = p_enterprise_id
  AND arh.approver_id = p_user_id
  AND arh.status = 'pending'
  ORDER BY arh.due_date ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_next_submission_number TO authenticated;
GRANT EXECUTE ON FUNCTION create_intake_form TO authenticated;
GRANT EXECUTE ON FUNCTION submit_intake_request TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_approval_matrix TO authenticated;
GRANT EXECUTE ON FUNCTION route_for_approval TO authenticated;
GRANT EXECUTE ON FUNCTION process_approval_decision TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_approvals TO authenticated;
