-- =====================================================
-- Compliance Evidence Auto-Collection
-- =====================================================
-- Description: Automatically collect and validate compliance evidence for contracts and vendors
-- Agents triggered:
--   1. Compliance Agent: Validate compliance evidence (priority 7)
--   2. Secretary Agent: Extract compliance artifacts from documents (priority 6)
-- Triggers: Contract activation, vendor assignment, monthly audit
-- =====================================================

-- Table to store compliance requirements master list
CREATE TABLE IF NOT EXISTS compliance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_name VARCHAR(255) NOT NULL,
    requirement_code VARCHAR(50) UNIQUE,
    requirement_type VARCHAR(100) NOT NULL, -- 'insurance', 'certification', 'audit', 'legal', 'tax', 'regulatory'
    applies_to VARCHAR(50) NOT NULL, -- 'contract', 'vendor', 'enterprise'
    industry VARCHAR(100), -- NULL = applies to all industries
    contract_category VARCHAR(100), -- NULL = applies to all categories
    vendor_category VARCHAR(100), -- NULL = applies to all vendor types
    description TEXT,
    evidence_required JSONB DEFAULT '[]', -- List of required documents/artifacts
    frequency VARCHAR(50) DEFAULT 'once', -- 'once', 'annual', 'quarterly', 'monthly', 'continuous'
    is_mandatory BOOLEAN DEFAULT true,
    regulatory_body VARCHAR(255), -- e.g., 'SOC 2', 'GDPR', 'HIPAA', 'ISO 27001'
    reference_url TEXT,
    enterprise_id UUID REFERENCES enterprises(id), -- NULL = global requirement
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track compliance evidence
CREATE TABLE IF NOT EXISTS compliance_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES compliance_requirements(id),
    contract_id UUID REFERENCES contracts(id),
    vendor_id UUID REFERENCES vendors(id),
    evidence_type VARCHAR(100), -- 'document', 'certificate', 'report', 'attestation'
    document_id UUID, -- Reference to vendor_documents or contract storage
    storage_path TEXT,
    file_name VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'submitted', 'under_review', 'approved', 'rejected', 'expired'
    issue_date DATE,
    expiration_date DATE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_compliance_requirements_type ON compliance_requirements(requirement_type);
CREATE INDEX idx_compliance_requirements_applies_to ON compliance_requirements(applies_to);
CREATE INDEX idx_compliance_requirements_enterprise ON compliance_requirements(enterprise_id);

CREATE INDEX idx_compliance_evidence_requirement ON compliance_evidence(requirement_id);
CREATE INDEX idx_compliance_evidence_contract ON compliance_evidence(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_compliance_evidence_vendor ON compliance_evidence(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_compliance_evidence_status ON compliance_evidence(status);
CREATE INDEX idx_compliance_evidence_expiration ON compliance_evidence(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_compliance_evidence_enterprise ON compliance_evidence(enterprise_id);

-- Function to auto-collect compliance evidence on contract activation
CREATE OR REPLACE FUNCTION collect_compliance_evidence_on_contract()
RETURNS TRIGGER AS $$
DECLARE
    v_requirement RECORD;
    v_compliance_agent_id UUID;
    v_secretary_agent_id UUID;
    v_missing_evidence_count INTEGER := 0;
BEGIN
    -- Only trigger on contract activation or vendor assignment
    IF NOT (
        (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') OR
        (TG_OP = 'UPDATE' AND OLD.vendor_id IS DISTINCT FROM NEW.vendor_id AND NEW.vendor_id IS NOT NULL)
    ) THEN
        RETURN NEW;
    END IF;

    -- Get applicable compliance requirements
    FOR v_requirement IN
        SELECT DISTINCT cr.*
        FROM compliance_requirements cr
        WHERE cr.applies_to IN ('contract', 'vendor')
        AND (cr.enterprise_id IS NULL OR cr.enterprise_id = NEW.enterprise_id)
        AND (cr.contract_category IS NULL OR cr.contract_category = NEW.category)
        AND (
            cr.vendor_category IS NULL OR
            cr.vendor_category IN (
                SELECT category::VARCHAR FROM vendors WHERE id = NEW.vendor_id
            )
        )
    LOOP
        -- Check if evidence already exists
        IF NOT EXISTS (
            SELECT 1 FROM compliance_evidence
            WHERE requirement_id = v_requirement.id
            AND contract_id = NEW.id
            AND status IN ('approved', 'under_review', 'submitted')
        ) THEN
            -- Create placeholder for missing evidence
            INSERT INTO compliance_evidence (
                requirement_id,
                contract_id,
                vendor_id,
                evidence_type,
                status,
                enterprise_id,
                created_by
            ) VALUES (
                v_requirement.id,
                NEW.id,
                NEW.vendor_id,
                'document',
                'pending',
                NEW.enterprise_id,
                NEW.created_by
            );

            v_missing_evidence_count := v_missing_evidence_count + 1;
        END IF;
    END LOOP;

    -- Queue agent tasks if missing evidence found
    IF v_missing_evidence_count > 0 THEN
        -- Get agent IDs
        SELECT id INTO v_compliance_agent_id
        FROM agents
        WHERE type = 'compliance'
        AND enterprise_id = NEW.enterprise_id
        AND is_active = true
        LIMIT 1;

        SELECT id INTO v_secretary_agent_id
        FROM agents
        WHERE type = 'secretary'
        AND enterprise_id = NEW.enterprise_id
        AND is_active = true
        LIMIT 1;

        -- Queue Compliance Agent task
        IF v_compliance_agent_id IS NOT NULL THEN
            INSERT INTO agent_tasks (
                agent_id,
                task_type,
                priority,
                payload,
                contract_id,
                vendor_id,
                enterprise_id,
                status
            ) VALUES (
                v_compliance_agent_id,
                'validate_compliance_evidence',
                7,
                jsonb_build_object(
                    'contract_id', NEW.id,
                    'contract_title', NEW.title,
                    'vendor_id', NEW.vendor_id,
                    'missing_evidence_count', v_missing_evidence_count,
                    'analysis_type', 'evidence_validation',
                    'trigger_source', 'compliance_evidence_automation',
                    'requested_outputs', jsonb_build_array(
                        'missing_evidence_list',
                        'compliance_checklist',
                        'collection_priority',
                        'vendor_communication_template',
                        'deadline_recommendations'
                    )
                ),
                NEW.id,
                NEW.vendor_id,
                NEW.enterprise_id,
                'pending'
            );
        END IF;

        -- Queue Secretary Agent task (extract from existing documents)
        IF v_secretary_agent_id IS NOT NULL THEN
            INSERT INTO agent_tasks (
                agent_id,
                task_type,
                priority,
                payload,
                contract_id,
                vendor_id,
                enterprise_id,
                status
            ) VALUES (
                v_secretary_agent_id,
                'extract_compliance_artifacts',
                6,
                jsonb_build_object(
                    'contract_id', NEW.id,
                    'contract_title', NEW.title,
                    'vendor_id', NEW.vendor_id,
                    'analysis_type', 'compliance_extraction',
                    'trigger_source', 'compliance_evidence_automation',
                    'requested_outputs', jsonb_build_array(
                        'extracted_certificates',
                        'identified_compliance_docs',
                        'expiration_dates',
                        'issuing_authorities'
                    )
                ),
                NEW.id,
                NEW.vendor_id,
                NEW.enterprise_id,
                'pending'
            );
        END IF;

        -- Create notification
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            severity,
            data,
            enterprise_id,
            action_url
        ) VALUES (
            COALESCE(NEW.owner_id, NEW.created_by),
            'compliance_evidence_required',
            format('Compliance Evidence Required: %s', NEW.title),
            format('%s compliance requirements need evidence collection for contract "%s".',
                v_missing_evidence_count,
                NEW.title
            ),
            'medium',
            jsonb_build_object(
                'contract_id', NEW.id,
                'missing_count', v_missing_evidence_count
            ),
            NEW.enterprise_id,
            format('/dashboard/contracts/%s?tab=compliance', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly scheduled function to audit compliance evidence completeness
CREATE OR REPLACE FUNCTION audit_compliance_evidence_monthly()
RETURNS void AS $$
DECLARE
    v_contract RECORD;
    v_vendor RECORD;
    v_expiring_evidence RECORD;
BEGIN
    -- Check for expiring evidence (30/7 days)
    FOR v_expiring_evidence IN
        SELECT
            ce.*,
            cr.requirement_name,
            c.title as contract_title,
            c.owner_id,
            c.enterprise_id
        FROM compliance_evidence ce
        JOIN compliance_requirements cr ON cr.id = ce.requirement_id
        LEFT JOIN contracts c ON c.id = ce.contract_id
        WHERE ce.status = 'approved'
        AND ce.expiration_date IS NOT NULL
        AND ce.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
        AND ce.expiration_date > CURRENT_DATE
    LOOP
        -- Create notification for expiring evidence
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            severity,
            data,
            enterprise_id,
            action_url
        ) VALUES (
            v_expiring_evidence.owner_id,
            'compliance_evidence_expiring',
            format('Compliance Evidence Expiring: %s', v_expiring_evidence.requirement_name),
            format(
                'Evidence "%s" for contract "%s" expires on %s (%s days).',
                v_expiring_evidence.requirement_name,
                v_expiring_evidence.contract_title,
                v_expiring_evidence.expiration_date,
                (v_expiring_evidence.expiration_date - CURRENT_DATE)
            ),
            CASE
                WHEN v_expiring_evidence.expiration_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
                ELSE 'high'
            END,
            jsonb_build_object(
                'evidence_id', v_expiring_evidence.id,
                'contract_id', v_expiring_evidence.contract_id,
                'expiration_date', v_expiring_evidence.expiration_date
            ),
            v_expiring_evidence.enterprise_id,
            format('/dashboard/contracts/%s?tab=compliance', v_expiring_evidence.contract_id)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on contracts
DROP TRIGGER IF EXISTS trigger_collect_compliance_evidence ON contracts;
CREATE TRIGGER trigger_collect_compliance_evidence
    AFTER INSERT OR UPDATE OF status, vendor_id ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION collect_compliance_evidence_on_contract();

-- RLS policies
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance requirements"
    ON compliance_requirements FOR SELECT
    USING (enterprise_id IS NULL OR enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Admins can manage compliance requirements"
    ON compliance_requirements FOR ALL
    USING (
        enterprise_id IS NULL OR
        enterprise_id IN (
            SELECT enterprise_id FROM users
            WHERE auth_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Users can view compliance evidence in their enterprise"
    ON compliance_evidence FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can submit compliance evidence"
    ON compliance_evidence FOR INSERT
    WITH CHECK (
        enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid())
        AND created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "Users can update compliance evidence"
    ON compliance_evidence FOR UPDATE
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Seed some common compliance requirements
INSERT INTO compliance_requirements (requirement_name, requirement_code, requirement_type, applies_to, description, evidence_required, frequency, is_mandatory, regulatory_body)
VALUES
    ('General Liability Insurance', 'GLI-001', 'insurance', 'vendor', 'Proof of general liability insurance coverage', '["Certificate of Insurance", "Policy Declaration Page"]'::jsonb, 'annual', true, 'Insurance Regulatory'),
    ('Workers Compensation Insurance', 'WCI-001', 'insurance', 'vendor', 'Proof of workers compensation insurance', '["Certificate of Insurance"]'::jsonb, 'annual', true, 'State Insurance Board'),
    ('W-9 Form', 'TAX-001', 'tax', 'vendor', 'IRS Form W-9 for tax reporting', '["W-9 Form"]'::jsonb, 'once', true, 'IRS'),
    ('SOC 2 Type II Certification', 'SOC2-001', 'certification', 'vendor', 'SOC 2 Type II audit report for data security', '["SOC 2 Report"]'::jsonb, 'annual', false, 'AICPA'),
    ('ISO 27001 Certification', 'ISO-001', 'certification', 'vendor', 'ISO 27001 information security certification', '["ISO 27001 Certificate"]'::jsonb, 'annual', false, 'ISO'),
    ('GDPR Data Processing Agreement', 'GDPR-001', 'legal', 'contract', 'Data Processing Agreement for GDPR compliance', '["Signed DPA"]'::jsonb, 'once', false, 'EU GDPR'),
    ('BAA (HIPAA)', 'HIPAA-001', 'legal', 'contract', 'Business Associate Agreement for HIPAA compliance', '["Signed BAA"]'::jsonb, 'once', false, 'HHS')
ON CONFLICT (requirement_code) DO NOTHING;

-- Comments
COMMENT ON TABLE compliance_requirements IS
'Master list of compliance requirements that can apply to contracts, vendors, or enterprises.
Supports industry-specific and global requirements with frequency tracking.';

COMMENT ON TABLE compliance_evidence IS
'Tracks compliance evidence collection and validation status.
Links to contracts/vendors and monitors expiration dates.
Auto-created when contracts activated or vendors assigned.';

COMMENT ON FUNCTION collect_compliance_evidence_on_contract() IS
'Automatically creates compliance evidence placeholders when contracts activated or vendors assigned.
Queues Compliance Agent (validation) and Secretary Agent (extraction) if missing evidence found.
Triggers on contract status change to active or vendor assignment.';

COMMENT ON FUNCTION audit_compliance_evidence_monthly() IS
'Monthly scheduled audit of compliance evidence completeness and expiration.
Creates notifications for expiring evidence (30/7 days before expiration).
Should be called via cron job on the 1st of each month.';
