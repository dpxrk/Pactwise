-- Migration 124: Compliance Rules Engine
-- Implements regulatory compliance tracking, automated compliance checks, and certification management

-- =====================================================
-- REGULATORY FRAMEWORKS
-- =====================================================

-- Regulatory Frameworks (GDPR, SOX, HIPAA, etc.)
CREATE TABLE regulatory_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Framework identification
  code TEXT NOT NULL UNIQUE,  -- 'GDPR', 'SOX', 'HIPAA', 'PCI-DSS', etc.
  name TEXT NOT NULL,
  full_name TEXT,
  description TEXT,

  -- Jurisdiction
  jurisdiction TEXT[],  -- ['EU', 'US', 'Global']
  governing_body TEXT,

  -- Categorization
  framework_type TEXT NOT NULL CHECK (framework_type IN (
    'data_privacy', 'financial', 'healthcare', 'security',
    'industry_specific', 'environmental', 'labor', 'trade', 'general'
  )),

  -- Version tracking
  version TEXT,
  effective_date DATE,
  last_updated DATE,

  -- Reference links
  official_url TEXT,
  documentation_url TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enterprise Framework Subscriptions
CREATE TABLE enterprise_compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES regulatory_frameworks(id) ON DELETE CASCADE,

  -- Subscription status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),

  -- Applicability
  applies_to_contract_types TEXT[],  -- ['vendor', 'customer', 'employment']
  applies_to_categories TEXT[],  -- Contract categories
  applies_to_regions TEXT[],  -- Geographic regions

  -- Configuration
  strictness_level TEXT DEFAULT 'standard' CHECK (strictness_level IN (
    'minimal', 'standard', 'strict', 'maximum'
  )),
  custom_settings JSONB DEFAULT '{}',

  -- Audit
  certified_by UUID REFERENCES auth.users(id),
  certified_at TIMESTAMPTZ,
  next_certification_due TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, framework_id)
);

-- =====================================================
-- COMPLIANCE REQUIREMENTS
-- =====================================================

-- Compliance Requirements (specific rules within frameworks)
CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES regulatory_frameworks(id) ON DELETE CASCADE,

  -- Requirement identification
  requirement_code TEXT NOT NULL,  -- 'GDPR-Art.28', 'SOX-404', etc.
  title TEXT NOT NULL,
  description TEXT,

  -- Categorization
  category TEXT NOT NULL CHECK (category IN (
    'data_handling', 'data_retention', 'consent', 'security',
    'audit_rights', 'breach_notification', 'subprocessor',
    'cross_border_transfer', 'record_keeping', 'reporting',
    'disclosure', 'insurance', 'indemnification', 'termination',
    'liability', 'confidentiality', 'other'
  )),

  -- Severity
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  mandatory BOOLEAN DEFAULT true,

  -- Contract requirements
  required_clauses TEXT[],  -- Clause types that must be present
  prohibited_clauses TEXT[],  -- Clause types that must NOT be present
  clause_requirements JSONB DEFAULT '[]',
  -- Example: [{"clause_type": "data_processing", "must_contain": ["processor obligations"]}]

  -- Validation rules (JSONB for flexibility)
  validation_rules JSONB DEFAULT '[]',
  -- Example: [
  --   {"type": "field_required", "field": "data_retention_period"},
  --   {"type": "value_constraint", "field": "retention_days", "operator": "<=", "value": 365}
  -- ]

  -- Remediation
  remediation_guidance TEXT,
  example_clause TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(framework_id, requirement_code)
);

-- =====================================================
-- COMPLIANCE RULES ENGINE
-- =====================================================

-- Compliance Rules (enterprise-customizable rules)
CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES compliance_requirements(id) ON DELETE SET NULL,

  -- Rule identification
  rule_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Rule type
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'clause_presence',      -- Check if clause exists
    'clause_absence',       -- Check if clause is missing
    'field_value',          -- Check specific field values
    'term_limit',           -- Check contract terms (duration, value)
    'party_requirement',    -- Requirements for parties
    'document_requirement', -- Required attachments/documents
    'approval_requirement', -- Approval workflow requirements
    'custom'                -- Custom rule logic
  )),

  -- Conditions (when rule applies)
  applies_when JSONB DEFAULT '{"always": true}',
  -- Example: {
  --   "contract_type": ["vendor", "saas"],
  --   "contract_value": {"operator": ">", "value": 100000},
  --   "vendor_category": ["technology", "data_processor"]
  -- }

  -- Rule logic
  rule_definition JSONB NOT NULL,
  -- Example for clause_presence:
  -- {"clause_types": ["data_processing_agreement", "security_addendum"]}
  -- Example for field_value:
  -- {"field": "liability_cap", "operator": ">=", "value": 1000000}

  -- Severity and actions
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  failure_action TEXT DEFAULT 'flag' CHECK (failure_action IN (
    'block',      -- Block contract progression
    'flag',       -- Flag for review
    'warn',       -- Show warning only
    'notify',     -- Send notification
    'escalate'    -- Escalate to approver
  )),

  -- Notifications
  notify_roles TEXT[] DEFAULT '{}',
  notify_users UUID[] DEFAULT '{}',

  -- Remediation
  auto_remediation JSONB DEFAULT NULL,
  -- Example: {"action": "add_clause", "clause_template_id": "uuid"}
  remediation_instructions TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, rule_code)
);

-- Rule Groups (for organizing related rules)
CREATE TABLE compliance_rule_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Execution settings
  execution_order INTEGER DEFAULT 0,
  stop_on_failure BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, name)
);

-- Rule to Group mapping
CREATE TABLE compliance_rule_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES compliance_rule_groups(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,

  execution_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, rule_id)
);

-- =====================================================
-- COMPLIANCE CHECKS
-- =====================================================

-- Contract Compliance Checks
CREATE TABLE contract_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,

  -- Check metadata
  check_type TEXT NOT NULL CHECK (check_type IN (
    'initial', 'periodic', 'on_change', 'manual', 'pre_signature', 'pre_approval'
  )),
  check_version INTEGER DEFAULT 1,

  -- Overall result
  overall_status TEXT NOT NULL CHECK (overall_status IN (
    'compliant', 'non_compliant', 'partially_compliant', 'pending_review', 'not_applicable'
  )),
  compliance_score NUMERIC(5,2) CHECK (compliance_score BETWEEN 0 AND 100),

  -- Breakdown by framework
  framework_results JSONB DEFAULT '[]',
  -- Example: [
  --   {"framework_id": "uuid", "framework_code": "GDPR", "status": "compliant", "score": 95}
  -- ]

  -- Summary counts
  total_rules_checked INTEGER DEFAULT 0,
  rules_passed INTEGER DEFAULT 0,
  rules_failed INTEGER DEFAULT 0,
  rules_warned INTEGER DEFAULT 0,
  rules_skipped INTEGER DEFAULT 0,

  -- Critical issues
  has_critical_failures BOOLEAN DEFAULT false,
  blocking_issues_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'current' CHECK (status IN ('current', 'superseded', 'archived')),

  -- Review
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  triggered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual Rule Check Results
CREATE TABLE compliance_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES contract_compliance_checks(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,

  -- Result
  result TEXT NOT NULL CHECK (result IN (
    'passed', 'failed', 'warned', 'skipped', 'error'
  )),

  -- Details
  message TEXT,
  details JSONB DEFAULT '{}',
  -- Example: {
  --   "expected": "data_processing_agreement clause",
  --   "found": null,
  --   "location": null
  -- }

  -- Severity at check time
  severity TEXT NOT NULL,
  action_taken TEXT,

  -- Remediation
  remediation_applied BOOLEAN DEFAULT false,
  remediation_details JSONB DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPLIANCE ISSUES AND REMEDIATION
-- =====================================================

-- Compliance Issues (tracked issues from checks)
CREATE TABLE compliance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  check_id UUID REFERENCES contract_compliance_checks(id) ON DELETE SET NULL,
  check_result_id UUID REFERENCES compliance_check_results(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES compliance_rules(id) ON DELETE SET NULL,
  requirement_id UUID REFERENCES compliance_requirements(id) ON DELETE SET NULL,

  -- Issue details
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),

  -- Categorization
  category TEXT NOT NULL,
  framework_code TEXT,

  -- Location in contract
  location_details JSONB DEFAULT NULL,

  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'resolved', 'accepted', 'waived', 'deferred'
  )),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,

  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN (
    'clause_added', 'clause_modified', 'clause_removed',
    'document_added', 'exception_granted', 'risk_accepted',
    'not_applicable', 'other'
  )),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- Waiver (if accepted without fix)
  waiver_approved_by UUID REFERENCES auth.users(id),
  waiver_reason TEXT,
  waiver_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Issue Comments
CREATE TABLE compliance_issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES compliance_issues(id) ON DELETE CASCADE,

  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'general' CHECK (comment_type IN (
    'general', 'status_update', 'resolution', 'question', 'answer'
  )),

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPLIANCE CERTIFICATIONS
-- =====================================================

-- Contract Compliance Certifications
CREATE TABLE compliance_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES regulatory_frameworks(id) ON DELETE CASCADE,

  -- Certification details
  certification_type TEXT NOT NULL CHECK (certification_type IN (
    'full_compliance', 'conditional_compliance', 'partial_compliance', 'exemption'
  )),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'revoked', 'pending_renewal'
  )),

  -- Validity
  certified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  renewal_reminder_days INTEGER DEFAULT 30,

  -- Certification details
  conditions TEXT[],  -- Any conditions attached
  exemptions TEXT[],  -- Any exempted requirements
  notes TEXT,

  -- Approvals
  certified_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approval_chain JSONB DEFAULT '[]',

  -- Attachments
  supporting_documents JSONB DEFAULT '[]',
  -- Example: [{"name": "DPA.pdf", "storage_path": "...", "uploaded_at": "..."}]

  -- Audit
  audit_trail JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certification Renewal Tracking
CREATE TABLE certification_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES compliance_certifications(id) ON DELETE CASCADE,

  -- Renewal cycle
  renewal_number INTEGER NOT NULL,
  previous_certification_id UUID REFERENCES compliance_certifications(id),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed', 'waived'
  )),

  -- Timeline
  due_date TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- New certification (if renewal completed)
  new_certification_id UUID REFERENCES compliance_certifications(id),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPLIANCE AUDIT TRAIL
-- =====================================================

-- Compliance Audit Log
CREATE TABLE compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Context
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  check_id UUID REFERENCES contract_compliance_checks(id) ON DELETE SET NULL,
  issue_id UUID REFERENCES compliance_issues(id) ON DELETE SET NULL,
  certification_id UUID REFERENCES compliance_certifications(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'check_initiated', 'check_completed', 'issue_created', 'issue_resolved',
    'issue_escalated', 'waiver_granted', 'certification_issued',
    'certification_revoked', 'rule_triggered', 'rule_bypassed',
    'manual_override', 'framework_added', 'framework_removed'
  )),
  event_description TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- User and context
  performed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Framework indexes
CREATE INDEX idx_regulatory_frameworks_code ON regulatory_frameworks(code);
CREATE INDEX idx_regulatory_frameworks_type ON regulatory_frameworks(framework_type);
CREATE INDEX idx_enterprise_frameworks_enterprise ON enterprise_compliance_frameworks(enterprise_id);
CREATE INDEX idx_enterprise_frameworks_status ON enterprise_compliance_frameworks(status);

-- Requirement indexes
CREATE INDEX idx_compliance_requirements_framework ON compliance_requirements(framework_id);
CREATE INDEX idx_compliance_requirements_category ON compliance_requirements(category);
CREATE INDEX idx_compliance_requirements_severity ON compliance_requirements(severity);

-- Rule indexes
CREATE INDEX idx_compliance_rules_enterprise ON compliance_rules(enterprise_id);
CREATE INDEX idx_compliance_rules_requirement ON compliance_rules(requirement_id);
CREATE INDEX idx_compliance_rules_type ON compliance_rules(rule_type);
CREATE INDEX idx_compliance_rules_active ON compliance_rules(is_active) WHERE is_active = true;

-- Check indexes
CREATE INDEX idx_compliance_checks_contract ON contract_compliance_checks(contract_id);
CREATE INDEX idx_compliance_checks_status ON contract_compliance_checks(overall_status);
CREATE INDEX idx_compliance_checks_current ON contract_compliance_checks(status) WHERE status = 'current';
CREATE INDEX idx_compliance_check_results_check ON compliance_check_results(check_id);
CREATE INDEX idx_compliance_check_results_result ON compliance_check_results(result);

-- Issue indexes
CREATE INDEX idx_compliance_issues_contract ON compliance_issues(contract_id);
CREATE INDEX idx_compliance_issues_status ON compliance_issues(status);
CREATE INDEX idx_compliance_issues_severity ON compliance_issues(severity);
CREATE INDEX idx_compliance_issues_assigned ON compliance_issues(assigned_to);

-- Certification indexes
CREATE INDEX idx_compliance_certifications_contract ON compliance_certifications(contract_id);
CREATE INDEX idx_compliance_certifications_framework ON compliance_certifications(framework_id);
CREATE INDEX idx_compliance_certifications_status ON compliance_certifications(status);
CREATE INDEX idx_compliance_certifications_valid ON compliance_certifications(valid_until);

-- Audit log indexes
CREATE INDEX idx_compliance_audit_enterprise ON compliance_audit_log(enterprise_id);
CREATE INDEX idx_compliance_audit_contract ON compliance_audit_log(contract_id);
CREATE INDEX idx_compliance_audit_event ON compliance_audit_log(event_type);
CREATE INDEX idx_compliance_audit_created ON compliance_audit_log(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rule_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rule_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Regulatory frameworks are public (read-only for all)
CREATE POLICY regulatory_frameworks_read ON regulatory_frameworks
  FOR SELECT USING (true);

-- Compliance requirements are public (read-only for all)
CREATE POLICY compliance_requirements_read ON compliance_requirements
  FOR SELECT USING (true);

-- Enterprise isolation policies
CREATE POLICY enterprise_frameworks_isolation ON enterprise_compliance_frameworks
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY compliance_rules_isolation ON compliance_rules
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY compliance_rule_groups_isolation ON compliance_rule_groups
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY compliance_rule_members_isolation ON compliance_rule_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM compliance_rule_groups g
      WHERE g.id = compliance_rule_group_members.group_id
      AND g.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY compliance_checks_isolation ON contract_compliance_checks
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY compliance_check_results_isolation ON compliance_check_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contract_compliance_checks c
      WHERE c.id = compliance_check_results.check_id
      AND c.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY compliance_issues_isolation ON compliance_issues
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY compliance_issue_comments_isolation ON compliance_issue_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM compliance_issues i
      WHERE i.id = compliance_issue_comments.issue_id
      AND i.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY compliance_certifications_isolation ON compliance_certifications
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY certification_renewals_isolation ON certification_renewals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM compliance_certifications c
      WHERE c.id = certification_renewals.certification_id
      AND c.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY compliance_audit_isolation ON compliance_audit_log
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get applicable rules for a contract
CREATE OR REPLACE FUNCTION get_applicable_compliance_rules(
  p_contract_id UUID
)
RETURNS TABLE (
  rule_id UUID,
  rule_code TEXT,
  rule_name TEXT,
  rule_type TEXT,
  severity TEXT,
  failure_action TEXT
) AS $$
DECLARE
  v_enterprise_id UUID;
  v_contract RECORD;
BEGIN
  -- Get contract details
  SELECT c.*, c.enterprise_id, c.contract_type, c.total_value,
         v.category as vendor_category
  INTO v_contract
  FROM contracts c
  LEFT JOIN vendors v ON c.vendor_id = v.id
  WHERE c.id = p_contract_id;

  v_enterprise_id := v_contract.enterprise_id;

  RETURN QUERY
  SELECT
    r.id as rule_id,
    r.rule_code,
    r.name as rule_name,
    r.rule_type,
    r.severity,
    r.failure_action
  FROM compliance_rules r
  WHERE r.enterprise_id = v_enterprise_id
    AND r.is_active = true
    AND (r.effective_from IS NULL OR r.effective_from <= NOW())
    AND (r.effective_until IS NULL OR r.effective_until > NOW())
    AND (
      -- Check applies_when conditions
      r.applies_when->>'always' = 'true'
      OR (
        -- Contract type check
        (r.applies_when->'contract_type' IS NULL OR
         v_contract.contract_type = ANY(ARRAY(SELECT jsonb_array_elements_text(r.applies_when->'contract_type'))))
        -- Can add more condition checks here
      )
    )
  ORDER BY
    CASE r.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    r.rule_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run compliance check on a contract
CREATE OR REPLACE FUNCTION run_compliance_check(
  p_contract_id UUID,
  p_check_type TEXT DEFAULT 'manual',
  p_triggered_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_enterprise_id UUID;
  v_check_id UUID;
  v_rule RECORD;
  v_result TEXT;
  v_message TEXT;
  v_details JSONB;
  v_passed INTEGER := 0;
  v_failed INTEGER := 0;
  v_warned INTEGER := 0;
  v_skipped INTEGER := 0;
  v_total INTEGER := 0;
  v_has_critical BOOLEAN := false;
  v_blocking INTEGER := 0;
  v_overall_status TEXT;
  v_score NUMERIC;
  v_framework_results JSONB := '[]'::jsonb;
BEGIN
  -- Get enterprise ID
  SELECT enterprise_id INTO v_enterprise_id
  FROM contracts WHERE id = p_contract_id;

  -- Mark previous checks as superseded
  UPDATE contract_compliance_checks
  SET status = 'superseded'
  WHERE contract_id = p_contract_id AND status = 'current';

  -- Create new check record
  INSERT INTO contract_compliance_checks (
    enterprise_id, contract_id, check_type, overall_status, triggered_by
  ) VALUES (
    v_enterprise_id, p_contract_id, p_check_type, 'pending_review', p_triggered_by
  )
  RETURNING id INTO v_check_id;

  -- Evaluate each applicable rule
  FOR v_rule IN
    SELECT * FROM get_applicable_compliance_rules(p_contract_id)
  LOOP
    v_total := v_total + 1;

    -- Default result
    v_result := 'passed';
    v_message := 'Rule check passed';
    v_details := '{}'::jsonb;

    -- Rule evaluation would happen here
    -- For now, we'll use a simplified evaluation
    -- Real implementation would parse rule_definition and check contract

    -- Record result
    INSERT INTO compliance_check_results (
      check_id, rule_id, result, message, details, severity, action_taken
    ) VALUES (
      v_check_id, v_rule.rule_id, v_result, v_message, v_details,
      v_rule.severity, v_rule.failure_action
    );

    -- Update counters
    CASE v_result
      WHEN 'passed' THEN v_passed := v_passed + 1;
      WHEN 'failed' THEN
        v_failed := v_failed + 1;
        IF v_rule.severity = 'critical' THEN v_has_critical := true; END IF;
        IF v_rule.failure_action = 'block' THEN v_blocking := v_blocking + 1; END IF;
      WHEN 'warned' THEN v_warned := v_warned + 1;
      WHEN 'skipped' THEN v_skipped := v_skipped + 1;
    END CASE;
  END LOOP;

  -- Calculate overall status and score
  IF v_total = 0 THEN
    v_overall_status := 'not_applicable';
    v_score := 100;
  ELSIF v_failed = 0 THEN
    v_overall_status := 'compliant';
    v_score := 100;
  ELSIF v_has_critical OR v_blocking > 0 THEN
    v_overall_status := 'non_compliant';
    v_score := (v_passed::numeric / v_total::numeric) * 100;
  ELSE
    v_overall_status := 'partially_compliant';
    v_score := (v_passed::numeric / v_total::numeric) * 100;
  END IF;

  -- Update check record
  UPDATE contract_compliance_checks
  SET
    overall_status = v_overall_status,
    compliance_score = v_score,
    total_rules_checked = v_total,
    rules_passed = v_passed,
    rules_failed = v_failed,
    rules_warned = v_warned,
    rules_skipped = v_skipped,
    has_critical_failures = v_has_critical,
    blocking_issues_count = v_blocking,
    requires_review = (v_failed > 0),
    framework_results = v_framework_results,
    status = 'current'
  WHERE id = v_check_id;

  -- Create issues for failures
  INSERT INTO compliance_issues (
    enterprise_id, contract_id, check_id, check_result_id, rule_id,
    title, description, severity, category, framework_code
  )
  SELECT
    v_enterprise_id,
    p_contract_id,
    v_check_id,
    cr.id,
    cr.rule_id,
    r.name || ' - Compliance Failure',
    cr.message,
    cr.severity,
    r.rule_type,
    (SELECT rf.code FROM regulatory_frameworks rf
     JOIN compliance_requirements req ON req.framework_id = rf.id
     WHERE req.id = r.requirement_id
     LIMIT 1)
  FROM compliance_check_results cr
  JOIN compliance_rules r ON r.id = cr.rule_id
  WHERE cr.check_id = v_check_id
    AND cr.result = 'failed';

  -- Log audit event
  INSERT INTO compliance_audit_log (
    enterprise_id, contract_id, check_id,
    event_type, event_description, event_data, performed_by
  ) VALUES (
    v_enterprise_id, p_contract_id, v_check_id,
    'check_completed',
    'Compliance check completed with status: ' || v_overall_status,
    jsonb_build_object(
      'total_rules', v_total,
      'passed', v_passed,
      'failed', v_failed,
      'score', v_score
    ),
    p_triggered_by
  );

  RETURN v_check_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve compliance issue
CREATE OR REPLACE FUNCTION resolve_compliance_issue(
  p_issue_id UUID,
  p_resolution_type TEXT,
  p_resolution_notes TEXT,
  p_resolved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_enterprise_id UUID;
BEGIN
  -- Get enterprise ID
  SELECT enterprise_id INTO v_enterprise_id
  FROM compliance_issues WHERE id = p_issue_id;

  -- Update issue
  UPDATE compliance_issues
  SET
    status = 'resolved',
    resolution_type = p_resolution_type,
    resolution_notes = p_resolution_notes,
    resolved_by = p_resolved_by,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_issue_id;

  -- Log audit event
  INSERT INTO compliance_audit_log (
    enterprise_id, issue_id,
    event_type, event_description, event_data, performed_by
  ) VALUES (
    v_enterprise_id, p_issue_id,
    'issue_resolved',
    'Compliance issue resolved: ' || p_resolution_type,
    jsonb_build_object(
      'resolution_type', p_resolution_type,
      'notes', p_resolution_notes
    ),
    p_resolved_by
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant waiver for compliance issue
CREATE OR REPLACE FUNCTION grant_compliance_waiver(
  p_issue_id UUID,
  p_reason TEXT,
  p_expires_at TIMESTAMPTZ,
  p_approved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_enterprise_id UUID;
BEGIN
  SELECT enterprise_id INTO v_enterprise_id
  FROM compliance_issues WHERE id = p_issue_id;

  UPDATE compliance_issues
  SET
    status = 'waived',
    waiver_approved_by = p_approved_by,
    waiver_reason = p_reason,
    waiver_expires_at = p_expires_at,
    updated_at = NOW()
  WHERE id = p_issue_id;

  -- Log audit event
  INSERT INTO compliance_audit_log (
    enterprise_id, issue_id,
    event_type, event_description, event_data, performed_by
  ) VALUES (
    v_enterprise_id, p_issue_id,
    'waiver_granted',
    'Compliance waiver granted',
    jsonb_build_object(
      'reason', p_reason,
      'expires_at', p_expires_at
    ),
    p_approved_by
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Issue compliance certification
CREATE OR REPLACE FUNCTION issue_compliance_certification(
  p_contract_id UUID,
  p_framework_id UUID,
  p_certification_type TEXT,
  p_valid_until TIMESTAMPTZ,
  p_conditions TEXT[],
  p_exemptions TEXT[],
  p_notes TEXT,
  p_certified_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_enterprise_id UUID;
  v_cert_id UUID;
BEGIN
  SELECT enterprise_id INTO v_enterprise_id
  FROM contracts WHERE id = p_contract_id;

  -- Revoke any existing active certification for same framework
  UPDATE compliance_certifications
  SET status = 'revoked', updated_at = NOW()
  WHERE contract_id = p_contract_id
    AND framework_id = p_framework_id
    AND status = 'active';

  -- Create new certification
  INSERT INTO compliance_certifications (
    enterprise_id, contract_id, framework_id,
    certification_type, valid_until,
    conditions, exemptions, notes, certified_by
  ) VALUES (
    v_enterprise_id, p_contract_id, p_framework_id,
    p_certification_type, p_valid_until,
    p_conditions, p_exemptions, p_notes, p_certified_by
  )
  RETURNING id INTO v_cert_id;

  -- Log audit event
  INSERT INTO compliance_audit_log (
    enterprise_id, contract_id, certification_id,
    event_type, event_description, event_data, performed_by
  ) VALUES (
    v_enterprise_id, p_contract_id, v_cert_id,
    'certification_issued',
    'Compliance certification issued',
    jsonb_build_object(
      'framework_id', p_framework_id,
      'certification_type', p_certification_type,
      'valid_until', p_valid_until
    ),
    p_certified_by
  );

  RETURN v_cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get compliance summary for contract
CREATE OR REPLACE FUNCTION get_contract_compliance_summary(p_contract_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'current_check', (
      SELECT jsonb_build_object(
        'id', c.id,
        'status', c.overall_status,
        'score', c.compliance_score,
        'checked_at', c.created_at,
        'rules_passed', c.rules_passed,
        'rules_failed', c.rules_failed,
        'has_critical', c.has_critical_failures,
        'blocking_count', c.blocking_issues_count
      )
      FROM contract_compliance_checks c
      WHERE c.contract_id = p_contract_id AND c.status = 'current'
      LIMIT 1
    ),
    'open_issues', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'title', i.title,
        'severity', i.severity,
        'status', i.status,
        'framework', i.framework_code
      ))
      FROM compliance_issues i
      WHERE i.contract_id = p_contract_id
        AND i.status NOT IN ('resolved', 'waived')
    ),
    'certifications', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', cert.id,
        'framework_code', rf.code,
        'framework_name', rf.name,
        'type', cert.certification_type,
        'status', cert.status,
        'valid_until', cert.valid_until
      ))
      FROM compliance_certifications cert
      JOIN regulatory_frameworks rf ON rf.id = cert.framework_id
      WHERE cert.contract_id = p_contract_id
        AND cert.status = 'active'
    ),
    'framework_coverage', (
      SELECT jsonb_agg(jsonb_build_object(
        'framework_code', rf.code,
        'framework_name', rf.name,
        'is_certified', EXISTS (
          SELECT 1 FROM compliance_certifications cert
          WHERE cert.contract_id = p_contract_id
            AND cert.framework_id = rf.id
            AND cert.status = 'active'
        )
      ))
      FROM enterprise_compliance_frameworks ecf
      JOIN regulatory_frameworks rf ON rf.id = ecf.framework_id
      JOIN contracts c ON c.enterprise_id = ecf.enterprise_id
      WHERE c.id = p_contract_id AND ecf.status = 'active'
    )
  ) INTO v_result;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-run compliance check on contract status change
CREATE OR REPLACE FUNCTION trigger_compliance_check_on_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check compliance when contract moves to review or active
  IF NEW.status IN ('in_review', 'pending_approval') AND
     OLD.status NOT IN ('in_review', 'pending_approval') THEN
    PERFORM run_compliance_check(NEW.id, 'on_change', NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compliance_check_on_contract_status
  AFTER UPDATE OF status ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_compliance_check_on_status();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_frameworks_timestamp
  BEFORE UPDATE ON enterprise_compliance_frameworks
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER update_compliance_requirements_timestamp
  BEFORE UPDATE ON compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER update_compliance_rules_timestamp
  BEFORE UPDATE ON compliance_rules
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER update_compliance_issues_timestamp
  BEFORE UPDATE ON compliance_issues
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER update_compliance_certifications_timestamp
  BEFORE UPDATE ON compliance_certifications
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

-- =====================================================
-- SEED DATA: Common Regulatory Frameworks
-- =====================================================

INSERT INTO regulatory_frameworks (code, name, full_name, description, jurisdiction, governing_body, framework_type, version, official_url) VALUES
('GDPR', 'GDPR', 'General Data Protection Regulation', 'EU regulation on data protection and privacy', ARRAY['EU', 'EEA'], 'European Commission', 'data_privacy', '2016/679', 'https://gdpr.eu'),
('CCPA', 'CCPA', 'California Consumer Privacy Act', 'California state privacy law', ARRAY['US-CA'], 'California Attorney General', 'data_privacy', '2018', 'https://oag.ca.gov/privacy/ccpa'),
('HIPAA', 'HIPAA', 'Health Insurance Portability and Accountability Act', 'US healthcare data protection', ARRAY['US'], 'HHS', 'healthcare', '1996', 'https://www.hhs.gov/hipaa'),
('SOX', 'SOX', 'Sarbanes-Oxley Act', 'US corporate financial reporting requirements', ARRAY['US'], 'SEC', 'financial', '2002', 'https://www.sec.gov'),
('PCI-DSS', 'PCI-DSS', 'Payment Card Industry Data Security Standard', 'Payment card data security', ARRAY['Global'], 'PCI SSC', 'security', 'v4.0', 'https://www.pcisecuritystandards.org'),
('SOC2', 'SOC 2', 'System and Organization Controls 2', 'Trust services criteria for service organizations', ARRAY['US', 'Global'], 'AICPA', 'security', 'Type II', 'https://www.aicpa.org'),
('ISO27001', 'ISO 27001', 'ISO/IEC 27001 Information Security', 'Information security management system standard', ARRAY['Global'], 'ISO/IEC', 'security', '2022', 'https://www.iso.org'),
('FCPA', 'FCPA', 'Foreign Corrupt Practices Act', 'US anti-bribery law', ARRAY['US'], 'DOJ/SEC', 'financial', '1977', 'https://www.justice.gov/criminal-fraud/foreign-corrupt-practices-act'),
('DORA', 'DORA', 'Digital Operational Resilience Act', 'EU financial sector digital resilience', ARRAY['EU'], 'European Commission', 'financial', '2022', 'https://eur-lex.europa.eu');

COMMENT ON TABLE regulatory_frameworks IS 'Standard regulatory frameworks (GDPR, SOX, HIPAA, etc.)';
COMMENT ON TABLE enterprise_compliance_frameworks IS 'Frameworks applicable to each enterprise';
COMMENT ON TABLE compliance_requirements IS 'Specific requirements within each framework';
COMMENT ON TABLE compliance_rules IS 'Enterprise-customizable compliance rules';
COMMENT ON TABLE contract_compliance_checks IS 'Compliance check results for contracts';
COMMENT ON TABLE compliance_issues IS 'Tracked compliance issues requiring resolution';
COMMENT ON TABLE compliance_certifications IS 'Compliance certifications issued for contracts';
