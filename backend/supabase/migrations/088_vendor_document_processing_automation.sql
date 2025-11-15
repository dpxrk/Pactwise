-- =====================================================
-- Vendor Document Processing Automation
-- =====================================================
-- Description: Automatically queue agent tasks when vendor documents are uploaded
-- Agents triggered:
--   1. Secretary Agent: Document extraction, expiration tracking (priority 7)
--   2. Compliance Agent: Validation, regulatory requirements (priority 6)
-- Triggers on: File uploads to 'vendor-documents' storage bucket
-- =====================================================

-- Create vendor_documents table to track vendor document metadata
CREATE TABLE IF NOT EXISTS vendor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'insurance', 'certificate', 'license', 'compliance', 'tax', 'other'
    document_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    expiration_date DATE,
    issue_date DATE,
    status VARCHAR(50) DEFAULT 'pending_review', -- 'pending_review', 'verified', 'expired', 'rejected'
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    extraction_results JSONB,
    compliance_results JSONB,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for vendor_documents
CREATE INDEX idx_vendor_documents_vendor_id ON vendor_documents(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_documents_enterprise_id ON vendor_documents(enterprise_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendor_documents_expiration ON vendor_documents(expiration_date) WHERE deleted_at IS NULL AND status = 'verified';
CREATE INDEX idx_vendor_documents_type ON vendor_documents(document_type) WHERE deleted_at IS NULL;

-- Function to queue agent tasks when vendor documents are uploaded
CREATE OR REPLACE FUNCTION queue_vendor_document_analysis()
RETURNS TRIGGER AS $$
DECLARE
    v_secretary_agent_id UUID;
    v_compliance_agent_id UUID;
    v_vendor_record RECORD;
BEGIN
    -- Get vendor details
    SELECT v.*, e.id as enterprise_id
    INTO v_vendor_record
    FROM vendors v
    JOIN enterprises e ON v.enterprise_id = e.id
    WHERE v.id = NEW.vendor_id;

    IF v_vendor_record IS NULL THEN
        RAISE EXCEPTION 'Vendor not found for document upload';
    END IF;

    -- Get agent IDs for this enterprise
    SELECT id INTO v_secretary_agent_id
    FROM agents
    WHERE type = 'secretary'
    AND enterprise_id = v_vendor_record.enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_compliance_agent_id
    FROM agents
    WHERE type = 'compliance'
    AND enterprise_id = v_vendor_record.enterprise_id
    AND is_active = true
    LIMIT 1;

    -- Queue Secretary Agent task: Document extraction and expiration tracking
    IF v_secretary_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_secretary_agent_id,
            'vendor_document_extraction',
            7,  -- High priority
            jsonb_build_object(
                'document_id', NEW.id,
                'vendor_id', NEW.vendor_id,
                'vendor_name', v_vendor_record.name,
                'document_name', NEW.document_name,
                'document_type', NEW.document_type,
                'storage_path', NEW.storage_path,
                'file_type', NEW.file_type,
                'analysis_type', 'document_extraction',
                'trigger_source', 'vendor_document_automation',
                'extraction_targets', jsonb_build_array(
                    'expiration_date',
                    'issue_date',
                    'issuing_authority',
                    'certificate_number',
                    'coverage_details',
                    'policy_limits',
                    'key_terms'
                )
            ),
            NEW.vendor_id,
            v_vendor_record.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Compliance Agent task: Validation and regulatory requirements
    IF v_compliance_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_compliance_agent_id,
            'vendor_document_compliance_check',
            6,  -- Medium-high priority
            jsonb_build_object(
                'document_id', NEW.id,
                'vendor_id', NEW.vendor_id,
                'vendor_name', v_vendor_record.name,
                'vendor_category', v_vendor_record.category,
                'document_name', NEW.document_name,
                'document_type', NEW.document_type,
                'storage_path', NEW.storage_path,
                'analysis_type', 'compliance_validation',
                'trigger_source', 'vendor_document_automation',
                'validation_checks', jsonb_build_array(
                    'document_authenticity',
                    'expiration_validity',
                    'coverage_adequacy',
                    'regulatory_compliance',
                    'required_clauses',
                    'industry_standards'
                )
            ),
            NEW.vendor_id,
            v_vendor_record.enterprise_id,
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on vendor_documents table
DROP TRIGGER IF EXISTS trigger_analyze_vendor_document ON vendor_documents;
CREATE TRIGGER trigger_analyze_vendor_document
    AFTER INSERT ON vendor_documents
    FOR EACH ROW
    EXECUTE FUNCTION queue_vendor_document_analysis();

-- Function to check and alert on expiring vendor documents
CREATE OR REPLACE FUNCTION check_expiring_vendor_documents()
RETURNS void AS $$
DECLARE
    v_document RECORD;
BEGIN
    -- Find documents expiring in 30, 7 days
    FOR v_document IN
        SELECT vd.*, v.name as vendor_name, v.enterprise_id
        FROM vendor_documents vd
        JOIN vendors v ON vd.vendor_id = v.id
        WHERE vd.deleted_at IS NULL
        AND vd.status = 'verified'
        AND vd.expiration_date IS NOT NULL
        AND vd.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
        AND vd.expiration_date > CURRENT_DATE
    LOOP
        -- Check if notification already exists
        IF NOT EXISTS (
            SELECT 1 FROM notifications
            WHERE data->>'document_id' = v_document.id::text
            AND type = 'vendor_document_expiring'
            AND created_at > NOW() - INTERVAL '7 days'
        ) THEN
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
                v_document.uploaded_by,
                'vendor_document_expiring',
                CASE
                    WHEN v_document.expiration_date <= CURRENT_DATE + INTERVAL '7 days'
                        THEN 'URGENT: Vendor Document Expiring Soon!'
                    ELSE 'Vendor Document Expiring in 30 Days'
                END,
                format(
                    'Vendor "%s" document "%s" expires on %s',
                    v_document.vendor_name,
                    v_document.document_name,
                    v_document.expiration_date
                ),
                CASE
                    WHEN v_document.expiration_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
                    WHEN v_document.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'high'
                    ELSE 'medium'
                END,
                jsonb_build_object(
                    'document_id', v_document.id,
                    'vendor_id', v_document.vendor_id,
                    'document_type', v_document.document_type,
                    'expiration_date', v_document.expiration_date
                ),
                v_document.enterprise_id,
                format('/dashboard/vendors/%s', v_document.vendor_id)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for vendor_documents
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor documents in their enterprise"
    ON vendor_documents FOR SELECT
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can insert vendor documents in their enterprise"
    ON vendor_documents FOR INSERT
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
        AND uploaded_by IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can update vendor documents in their enterprise"
    ON vendor_documents FOR UPDATE
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can delete vendor documents in their enterprise"
    ON vendor_documents FOR DELETE
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE vendor_documents IS
'Tracks vendor-uploaded documents (insurance, certificates, licenses, compliance docs).
Automatically triggers Secretary Agent (extraction) and Compliance Agent (validation) on upload.';

COMMENT ON FUNCTION queue_vendor_document_analysis() IS
'Automatically queues agent tasks when vendor documents are uploaded.
Triggers: Secretary Agent (document extraction) and Compliance Agent (validation).
Extracts expiration dates, policy details, and validates compliance requirements.';

COMMENT ON FUNCTION check_expiring_vendor_documents() IS
'Checks for vendor documents expiring in 30/7 days and creates notifications.
Should be called by a scheduled job (cron) daily.';

COMMENT ON TRIGGER trigger_analyze_vendor_document ON vendor_documents IS
'Automatically triggers document processing when vendor documents are uploaded.
Queues tasks for Secretary Agent (priority 7) and Compliance Agent (priority 6).';
