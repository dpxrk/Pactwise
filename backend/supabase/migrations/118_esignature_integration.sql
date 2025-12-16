-- Migration 118: E-Signature Integration Foundation
-- Part of CLM Implementation - Contract Execution Phase
-- Creates: signature_requests, signature_signatories, signature_events, signature_documents, signature_provider_configs

-- ============================================
-- 1. SIGNATURE PROVIDER CONFIGS (Multi-provider support)
-- ============================================

CREATE TABLE signature_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Provider Info
  provider TEXT NOT NULL CHECK (provider IN (
    'docusign', 'adobe_sign', 'hellosign', 'pandadoc', 'signrequest', 'manual'
  )),
  display_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- API Configuration (encrypted in practice)
  api_endpoint TEXT,
  api_version TEXT,
  account_id TEXT,
  integration_key TEXT,
  api_key_encrypted TEXT,
  oauth_config JSONB DEFAULT '{}'::JSONB,

  -- Webhook Configuration
  webhook_url TEXT,
  webhook_secret_encrypted TEXT,
  webhook_events TEXT[] DEFAULT '{}',

  -- Settings
  settings JSONB DEFAULT '{}'::JSONB,
  branding_config JSONB DEFAULT '{}'::JSONB,

  -- Status
  last_verified_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'verified', 'failed', 'expired'
  )),

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE signature_provider_configs IS 'Configuration for e-signature providers';
COMMENT ON COLUMN signature_provider_configs.provider IS 'E-signature provider name';
COMMENT ON COLUMN signature_provider_configs.api_key_encrypted IS 'Encrypted API key';
COMMENT ON COLUMN signature_provider_configs.oauth_config IS 'OAuth tokens and configuration';
COMMENT ON COLUMN signature_provider_configs.branding_config IS 'Custom branding settings for signing experience';

-- ============================================
-- 2. SIGNATURE REQUESTS (Main Table)
-- ============================================

CREATE TABLE signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  provider_config_id UUID REFERENCES signature_provider_configs(id) ON DELETE SET NULL,

  -- External Provider Reference
  external_request_id TEXT,
  external_envelope_id TEXT,
  external_url TEXT,

  -- Request Info
  title TEXT NOT NULL,
  message TEXT,
  email_subject TEXT,
  email_body TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_send', 'sent', 'delivered', 'viewed',
    'partially_signed', 'completed', 'declined', 'voided',
    'expired', 'failed'
  )),
  status_reason TEXT,

  -- Signing Order
  signing_order TEXT DEFAULT 'parallel' CHECK (signing_order IN ('parallel', 'sequential')),
  current_signer_order INTEGER DEFAULT 1,

  -- Deadlines
  expires_at TIMESTAMPTZ,
  reminder_frequency_days INTEGER DEFAULT 3,
  last_reminder_sent_at TIMESTAMPTZ,
  reminders_sent INTEGER DEFAULT 0,

  -- Security
  require_id_verification BOOLEAN DEFAULT false,
  require_sms_auth BOOLEAN DEFAULT false,
  access_code TEXT,

  -- Completion Info
  completed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  void_reason TEXT,

  -- Document Info
  signed_document_url TEXT,
  certificate_url TEXT,
  audit_trail_url TEXT,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  provider_metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE signature_requests IS 'E-signature requests for contract execution';
COMMENT ON COLUMN signature_requests.external_request_id IS 'ID from the e-signature provider';
COMMENT ON COLUMN signature_requests.external_envelope_id IS 'DocuSign envelope ID or equivalent';
COMMENT ON COLUMN signature_requests.signing_order IS 'parallel = all at once, sequential = in order';
COMMENT ON COLUMN signature_requests.require_id_verification IS 'Require ID verification before signing';

-- ============================================
-- 3. SIGNATURE SIGNATORIES (Who Signs)
-- ============================================

CREATE TABLE signature_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,

  -- Signatory Info
  signatory_type TEXT NOT NULL CHECK (signatory_type IN (
    'signer', 'approver', 'cc', 'witness', 'notary'
  )),
  role_name TEXT NOT NULL,

  -- Contact Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  title TEXT,

  -- Internal Reference
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  contact_id UUID,

  -- Signing Order (for sequential)
  signing_order INTEGER DEFAULT 1,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'viewed', 'signed',
    'declined', 'authentication_failed', 'expired'
  )),
  status_reason TEXT,

  -- Signing Details
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  viewed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Verification
  ip_address TEXT,
  user_agent TEXT,
  signature_image_url TEXT,
  authentication_method TEXT,
  id_verification_status TEXT,

  -- External Reference
  external_recipient_id TEXT,
  external_routing_order INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(signature_request_id, email)
);

COMMENT ON TABLE signature_signatories IS 'Signatories for signature requests';
COMMENT ON COLUMN signature_signatories.signatory_type IS 'Type: signer (must sign), approver, cc (copy), witness, notary';
COMMENT ON COLUMN signature_signatories.signing_order IS 'Order in sequential signing (1 = first)';
COMMENT ON COLUMN signature_signatories.authentication_method IS 'How signatory was authenticated (email, sms, id_check, etc.)';

-- ============================================
-- 4. SIGNATURE DOCUMENTS (Documents in Request)
-- ============================================

CREATE TABLE signature_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,

  -- Document Info
  name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  file_hash TEXT,

  -- External Reference
  external_document_id TEXT,

  -- Document Order
  document_order INTEGER DEFAULT 1,

  -- Source
  source_type TEXT CHECK (source_type IN (
    'contract', 'attachment', 'template', 'upload', 'generated'
  )),
  source_id UUID,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploaded', 'processing', 'ready', 'signed', 'failed'
  )),

  -- Signed Version
  signed_file_path TEXT,
  signed_file_hash TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE signature_documents IS 'Documents included in signature requests';
COMMENT ON COLUMN signature_documents.source_type IS 'Where the document came from';
COMMENT ON COLUMN signature_documents.document_version_id IS 'Reference to document version being signed';

-- ============================================
-- 5. SIGNATURE EVENTS (Audit Log)
-- ============================================

CREATE TABLE signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  signatory_id UUID REFERENCES signature_signatories(id) ON DELETE SET NULL,

  -- Event Info
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'sent', 'delivered', 'viewed', 'signed',
    'declined', 'voided', 'completed', 'expired',
    'reminder_sent', 'authentication_failed', 'authentication_passed',
    'document_viewed', 'signature_applied', 'envelope_created',
    'recipient_added', 'recipient_updated', 'error', 'webhook_received'
  )),
  event_message TEXT,

  -- Actor Info
  actor_type TEXT CHECK (actor_type IN ('system', 'user', 'signatory', 'provider', 'webhook')),
  actor_id UUID,
  actor_email TEXT,

  -- Details
  ip_address TEXT,
  user_agent TEXT,
  location JSONB,

  -- External Reference
  external_event_id TEXT,
  provider_event_type TEXT,
  provider_timestamp TIMESTAMPTZ,

  -- Raw Data
  raw_event_data JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE signature_events IS 'Audit trail of all signature-related events';
COMMENT ON COLUMN signature_events.event_type IS 'Type of event';
COMMENT ON COLUMN signature_events.raw_event_data IS 'Raw event data from provider webhook';

-- ============================================
-- 6. SIGNATURE FIELDS (Placement on Documents)
-- ============================================

CREATE TABLE signature_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_document_id UUID NOT NULL REFERENCES signature_documents(id) ON DELETE CASCADE,
  signatory_id UUID NOT NULL REFERENCES signature_signatories(id) ON DELETE CASCADE,

  -- Field Type
  field_type TEXT NOT NULL CHECK (field_type IN (
    'signature', 'initial', 'date_signed', 'name', 'title',
    'company', 'email', 'text', 'checkbox', 'radio', 'dropdown'
  )),
  field_name TEXT,

  -- Position
  page_number INTEGER NOT NULL DEFAULT 1,
  x_position DECIMAL(10,4) NOT NULL,
  y_position DECIMAL(10,4) NOT NULL,
  width DECIMAL(10,4),
  height DECIMAL(10,4),

  -- Settings
  is_required BOOLEAN DEFAULT true,
  anchor_string TEXT,
  anchor_x_offset INTEGER DEFAULT 0,
  anchor_y_offset INTEGER DEFAULT 0,

  -- Value (for text fields)
  default_value TEXT,
  validation_pattern TEXT,
  options JSONB DEFAULT '[]'::JSONB,

  -- External Reference
  external_field_id TEXT,
  external_tab_label TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE signature_fields IS 'Signature field placements on documents';
COMMENT ON COLUMN signature_fields.field_type IS 'Type of field (signature, initial, date, etc.)';
COMMENT ON COLUMN signature_fields.anchor_string IS 'Text anchor for auto-positioning';

-- ============================================
-- 7. INDEXES
-- ============================================

-- signature_provider_configs indexes
CREATE INDEX idx_signature_provider_configs_enterprise ON signature_provider_configs(enterprise_id);
CREATE INDEX idx_signature_provider_configs_default ON signature_provider_configs(enterprise_id, is_default) WHERE is_default = true;
CREATE INDEX idx_signature_provider_configs_active ON signature_provider_configs(enterprise_id, is_active) WHERE is_active = true;

-- signature_requests indexes
CREATE INDEX idx_signature_requests_enterprise ON signature_requests(enterprise_id);
CREATE INDEX idx_signature_requests_contract ON signature_requests(contract_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_external ON signature_requests(external_envelope_id);
CREATE INDEX idx_signature_requests_pending ON signature_requests(enterprise_id, status) WHERE status IN ('sent', 'delivered', 'viewed', 'partially_signed');
CREATE INDEX idx_signature_requests_expires ON signature_requests(expires_at) WHERE status NOT IN ('completed', 'declined', 'voided', 'expired');

-- signature_signatories indexes
CREATE INDEX idx_signature_signatories_request ON signature_signatories(signature_request_id);
CREATE INDEX idx_signature_signatories_email ON signature_signatories(email);
CREATE INDEX idx_signature_signatories_user ON signature_signatories(user_id);
CREATE INDEX idx_signature_signatories_status ON signature_signatories(status);
CREATE INDEX idx_signature_signatories_pending ON signature_signatories(signature_request_id) WHERE status = 'pending';

-- signature_documents indexes
CREATE INDEX idx_signature_documents_request ON signature_documents(signature_request_id);
CREATE INDEX idx_signature_documents_version ON signature_documents(document_version_id);

-- signature_events indexes
CREATE INDEX idx_signature_events_request ON signature_events(signature_request_id);
CREATE INDEX idx_signature_events_signatory ON signature_events(signatory_id);
CREATE INDEX idx_signature_events_type ON signature_events(event_type);
CREATE INDEX idx_signature_events_created ON signature_events(created_at DESC);
CREATE INDEX idx_signature_events_external ON signature_events(external_event_id);

-- signature_fields indexes
CREATE INDEX idx_signature_fields_document ON signature_fields(signature_document_id);
CREATE INDEX idx_signature_fields_signatory ON signature_fields(signatory_id);

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE signature_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_fields ENABLE ROW LEVEL SECURITY;

-- signature_provider_configs RLS
CREATE POLICY "signature_provider_configs_enterprise_isolation" ON signature_provider_configs
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

-- signature_requests RLS
CREATE POLICY "signature_requests_enterprise_isolation" ON signature_requests
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

-- signature_signatories RLS (via request)
CREATE POLICY "signature_signatories_via_request" ON signature_signatories
  FOR ALL USING (
    signature_request_id IN (
      SELECT id FROM signature_requests
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- signature_documents RLS (via request)
CREATE POLICY "signature_documents_via_request" ON signature_documents
  FOR ALL USING (
    signature_request_id IN (
      SELECT id FROM signature_requests
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- signature_events RLS (via request)
CREATE POLICY "signature_events_via_request" ON signature_events
  FOR ALL USING (
    signature_request_id IN (
      SELECT id FROM signature_requests
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- signature_fields RLS (via document)
CREATE POLICY "signature_fields_via_document" ON signature_fields
  FOR ALL USING (
    signature_document_id IN (
      SELECT sd.id FROM signature_documents sd
      JOIN signature_requests sr ON sd.signature_request_id = sr.id
      WHERE sr.enterprise_id = get_user_enterprise_id()
    )
  );

-- ============================================
-- 9. TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_signature_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER signature_provider_configs_update_timestamp
  BEFORE UPDATE ON signature_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_signature_timestamp();

CREATE TRIGGER signature_requests_update_timestamp
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW EXECUTE FUNCTION update_signature_timestamp();

CREATE TRIGGER signature_signatories_update_timestamp
  BEFORE UPDATE ON signature_signatories
  FOR EACH ROW EXECUTE FUNCTION update_signature_timestamp();

-- Function to ensure only one default provider per enterprise
CREATE OR REPLACE FUNCTION ensure_single_default_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE signature_provider_configs
    SET is_default = false
    WHERE enterprise_id = NEW.enterprise_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_provider_single_default
  BEFORE INSERT OR UPDATE ON signature_provider_configs
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_provider();

-- Function to log signature events
CREATE OR REPLACE FUNCTION log_signature_event(
  p_request_id UUID,
  p_signatory_id UUID,
  p_event_type TEXT,
  p_event_message TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL,
  p_raw_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO signature_events (
    signature_request_id,
    signatory_id,
    event_type,
    event_message,
    actor_type,
    actor_id,
    raw_event_data
  ) VALUES (
    p_request_id,
    p_signatory_id,
    p_event_type,
    p_event_message,
    p_actor_type,
    p_actor_id,
    p_raw_data
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update request status based on signatory status
CREATE OR REPLACE FUNCTION update_signature_request_status()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id UUID;
  v_total_signers INTEGER;
  v_signed_count INTEGER;
  v_declined_count INTEGER;
  v_new_status TEXT;
BEGIN
  v_request_id := NEW.signature_request_id;

  -- Count signers only (not CC, approvers, etc.)
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status = 'signed'),
         COUNT(*) FILTER (WHERE status = 'declined')
  INTO v_total_signers, v_signed_count, v_declined_count
  FROM signature_signatories
  WHERE signature_request_id = v_request_id
  AND signatory_type IN ('signer', 'approver');

  -- Determine new status
  IF v_declined_count > 0 THEN
    v_new_status := 'declined';
  ELSIF v_signed_count = v_total_signers THEN
    v_new_status := 'completed';
  ELSIF v_signed_count > 0 THEN
    v_new_status := 'partially_signed';
  ELSE
    v_new_status := NULL; -- Don't change
  END IF;

  -- Update request status if needed
  IF v_new_status IS NOT NULL THEN
    UPDATE signature_requests
    SET
      status = v_new_status,
      completed_at = CASE WHEN v_new_status = 'completed' THEN NOW() ELSE completed_at END,
      declined_at = CASE WHEN v_new_status = 'declined' THEN NOW() ELSE declined_at END
    WHERE id = v_request_id
    AND status NOT IN ('completed', 'declined', 'voided', 'expired');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_signatories_status_change
  AFTER UPDATE OF status ON signature_signatories
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_signature_request_status();

-- Function to update contract status when signature completed
CREATE OR REPLACE FUNCTION update_contract_on_signature_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update contract status to executed
    UPDATE contracts
    SET
      status = 'active',
      updated_at = NOW()
    WHERE id = NEW.contract_id
    AND status = 'pending_signature';

    -- Log the event
    PERFORM log_signature_event(
      NEW.id,
      NULL,
      'completed',
      'All signatures collected, contract executed',
      'system',
      NULL,
      jsonb_build_object('contract_id', NEW.contract_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_request_completed
  AFTER UPDATE OF status ON signature_requests
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_contract_on_signature_complete();

-- ============================================
-- 10. HELPER FUNCTIONS
-- ============================================

-- Function to create a signature request
CREATE OR REPLACE FUNCTION create_signature_request(
  p_contract_id UUID,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_signatories JSONB DEFAULT '[]'::JSONB,
  p_expires_days INTEGER DEFAULT 30,
  p_signing_order TEXT DEFAULT 'parallel',
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_enterprise_id UUID;
  v_request_id UUID;
  v_provider_id UUID;
  v_signatory JSONB;
BEGIN
  -- Get enterprise from contract
  SELECT enterprise_id INTO v_enterprise_id
  FROM contracts WHERE id = p_contract_id;

  IF v_enterprise_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  -- Get default provider
  SELECT id INTO v_provider_id
  FROM signature_provider_configs
  WHERE enterprise_id = v_enterprise_id
  AND is_default = true
  AND is_active = true
  LIMIT 1;

  -- Create request
  INSERT INTO signature_requests (
    enterprise_id,
    contract_id,
    provider_config_id,
    title,
    message,
    email_subject,
    signing_order,
    expires_at,
    created_by
  ) VALUES (
    v_enterprise_id,
    p_contract_id,
    v_provider_id,
    p_title,
    p_message,
    'Signature Required: ' || p_title,
    p_signing_order,
    NOW() + (p_expires_days || ' days')::INTERVAL,
    p_created_by
  ) RETURNING id INTO v_request_id;

  -- Add signatories
  FOR v_signatory IN SELECT * FROM jsonb_array_elements(p_signatories)
  LOOP
    INSERT INTO signature_signatories (
      signature_request_id,
      signatory_type,
      role_name,
      name,
      email,
      signing_order
    ) VALUES (
      v_request_id,
      COALESCE(v_signatory->>'signatory_type', 'signer'),
      COALESCE(v_signatory->>'role_name', 'Signer'),
      v_signatory->>'name',
      v_signatory->>'email',
      COALESCE((v_signatory->>'signing_order')::INTEGER, 1)
    );
  END LOOP;

  -- Log creation event
  PERFORM log_signature_event(
    v_request_id,
    NULL,
    'created',
    'Signature request created',
    'user',
    p_created_by
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get signature request summary
CREATE OR REPLACE FUNCTION get_signature_request_summary(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', sr.id,
    'contract_id', sr.contract_id,
    'title', sr.title,
    'status', sr.status,
    'signing_order', sr.signing_order,
    'expires_at', sr.expires_at,
    'created_at', sr.created_at,
    'sent_at', sr.sent_at,
    'completed_at', sr.completed_at,
    'signatories', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ss.id,
          'name', ss.name,
          'email', ss.email,
          'role_name', ss.role_name,
          'signatory_type', ss.signatory_type,
          'status', ss.status,
          'signed_at', ss.signed_at,
          'signing_order', ss.signing_order
        ) ORDER BY ss.signing_order
      ), '[]'::JSONB)
      FROM signature_signatories ss
      WHERE ss.signature_request_id = sr.id
    ),
    'documents', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', sd.id,
          'name', sd.name,
          'status', sd.status,
          'document_order', sd.document_order
        ) ORDER BY sd.document_order
      ), '[]'::JSONB)
      FROM signature_documents sd
      WHERE sd.signature_request_id = sr.id
    ),
    'statistics', jsonb_build_object(
      'total_signers', (SELECT COUNT(*) FROM signature_signatories WHERE signature_request_id = sr.id AND signatory_type = 'signer'),
      'signed_count', (SELECT COUNT(*) FROM signature_signatories WHERE signature_request_id = sr.id AND status = 'signed'),
      'pending_count', (SELECT COUNT(*) FROM signature_signatories WHERE signature_request_id = sr.id AND status = 'pending'),
      'declined_count', (SELECT COUNT(*) FROM signature_signatories WHERE signature_request_id = sr.id AND status = 'declined')
    )
  ) INTO v_result
  FROM signature_requests sr
  WHERE sr.id = p_request_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get pending signatures for a user
CREATE OR REPLACE FUNCTION get_pending_signatures_for_user(
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  request_id UUID,
  contract_id UUID,
  contract_title TEXT,
  request_title TEXT,
  role_name TEXT,
  signing_order INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id AS request_id,
    sr.contract_id,
    c.title AS contract_title,
    sr.title AS request_title,
    ss.role_name,
    ss.signing_order,
    sr.expires_at,
    sr.created_at
  FROM signature_signatories ss
  JOIN signature_requests sr ON ss.signature_request_id = sr.id
  JOIN contracts c ON sr.contract_id = c.id
  WHERE ss.email = p_user_email
  AND ss.status = 'pending'
  AND sr.status IN ('sent', 'delivered', 'viewed', 'partially_signed')
  ORDER BY sr.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to void a signature request
CREATE OR REPLACE FUNCTION void_signature_request(
  p_request_id UUID,
  p_reason TEXT,
  p_voided_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status
  FROM signature_requests WHERE id = p_request_id;

  IF v_current_status IN ('completed', 'voided', 'expired') THEN
    RETURN false;
  END IF;

  UPDATE signature_requests
  SET
    status = 'voided',
    voided_at = NOW(),
    voided_by = p_voided_by,
    void_reason = p_reason
  WHERE id = p_request_id;

  -- Update all pending signatories
  UPDATE signature_signatories
  SET status = 'expired'
  WHERE signature_request_id = p_request_id
  AND status = 'pending';

  -- Log event
  PERFORM log_signature_event(
    p_request_id,
    NULL,
    'voided',
    'Signature request voided: ' || p_reason,
    'user',
    p_voided_by
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_signature_event TO authenticated;
GRANT EXECUTE ON FUNCTION create_signature_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_signature_request_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_signatures_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION void_signature_request TO authenticated;

-- ============================================
-- 11. ADD pending_signature STATUS TO CONTRACTS
-- ============================================

-- Add pending_signature to contract status enum if not exists
DO $$
BEGIN
  -- Check if pending_signature status exists in constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%contracts_status_check%'
    AND check_clause LIKE '%pending_signature%'
  ) THEN
    -- This is a safe operation - we're adding to an existing enum-like check
    EXECUTE 'ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check';
    EXECUTE 'ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (status IN (
      ''draft'', ''pending_review'', ''pending_approval'', ''pending_signature'',
      ''active'', ''expired'', ''terminated'', ''renewed'', ''archived''
    ))';
  END IF;
END $$;
