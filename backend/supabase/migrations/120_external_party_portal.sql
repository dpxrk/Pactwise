-- Migration 120: External Party Portal
-- Token-based access for vendors, counterparties, and external signatories
-- Provides: Access tokens, sessions, action audit, negotiation messages

-- ============================================
-- 1. ACCESS TOKENS FOR EXTERNAL PARTIES
-- ============================================

CREATE TABLE external_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Token (never store raw - only hash)
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of token
  token_prefix TEXT NOT NULL,  -- First 8 chars for identification

  -- Token Type & Permissions
  token_type TEXT NOT NULL CHECK (token_type IN (
    'sign',       -- Can only sign
    'view',       -- Read-only view
    'redline',    -- Can make redline edits
    'negotiate',  -- Full negotiation (redline + messages)
    'full'        -- All permissions
  )),

  -- Target Resource (one of these must be set)
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,
  redline_session_id UUID REFERENCES redline_sessions(id) ON DELETE CASCADE,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,

  -- External Party Info
  party_email TEXT NOT NULL,
  party_name TEXT NOT NULL,
  party_company TEXT,
  party_title TEXT,
  party_phone TEXT,
  party_role TEXT NOT NULL DEFAULT 'counterparty' CHECK (party_role IN (
    'counterparty', 'vendor', 'signer', 'reviewer', 'approver', 'observer'
  )),

  -- Security Options
  access_code_hash TEXT,  -- Optional PIN (SHA-256 hashed)
  require_email_verification BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token TEXT,
  email_verification_expires_at TIMESTAMPTZ,

  -- IP Restrictions
  ip_whitelist TEXT[] DEFAULT '{}',
  allowed_countries TEXT[] DEFAULT '{}',

  -- Usage Limits
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  max_concurrent_sessions INTEGER DEFAULT 3,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'pending_verification', 'active', 'used', 'expired', 'revoked'
  )),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoke_reason TEXT,

  -- Notification Tracking
  invitation_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Metadata
  custom_message TEXT,
  metadata JSONB DEFAULT '{}',

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one resource must be linked
  CONSTRAINT token_has_resource CHECK (
    contract_id IS NOT NULL OR
    signature_request_id IS NOT NULL OR
    redline_session_id IS NOT NULL OR
    document_version_id IS NOT NULL
  )
);

COMMENT ON TABLE external_access_tokens IS 'Secure tokens for external party access without accounts';
COMMENT ON COLUMN external_access_tokens.token_hash IS 'SHA-256 hash of the access token (never store raw)';
COMMENT ON COLUMN external_access_tokens.token_prefix IS 'First 8 characters for token identification';
COMMENT ON COLUMN external_access_tokens.access_code_hash IS 'Optional PIN code for additional security';

-- ============================================
-- 2. EXTERNAL PARTY SESSIONS
-- ============================================

CREATE TABLE external_party_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES external_access_tokens(id) ON DELETE CASCADE,

  -- Session Token
  session_token_hash TEXT NOT NULL UNIQUE,

  -- Client Info
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  geo_location JSONB DEFAULT '{}',

  -- Activity
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- State
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'idle', 'expired', 'terminated'
  )),
  terminated_reason TEXT,

  -- For collaborative editing
  cursor_position JSONB DEFAULT '{}',
  presence_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE external_party_sessions IS 'Active sessions for external party access';
COMMENT ON COLUMN external_party_sessions.device_fingerprint IS 'Browser/device fingerprint for security';

-- ============================================
-- 3. EXTERNAL PARTY ACTIONS (Audit)
-- ============================================

CREATE TABLE external_party_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES external_party_sessions(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES external_access_tokens(id) ON DELETE CASCADE,

  -- Action Info
  action_type TEXT NOT NULL CHECK (action_type IN (
    -- Document actions
    'view_document', 'download_document', 'print_document',
    -- Signature actions
    'view_signature_request', 'apply_signature', 'decline_signature',
    -- Redline actions
    'view_redline', 'add_redline', 'accept_redline', 'reject_redline',
    -- Comment/Message actions
    'add_comment', 'send_message', 'view_messages',
    -- Negotiation actions
    'accept_terms', 'counter_propose', 'request_change',
    -- Session actions
    'login', 'logout', 'session_timeout', 'verification_passed',
    -- Security events
    'access_denied', 'invalid_pin', 'ip_blocked'
  )),
  action_description TEXT,

  -- What was affected
  target_type TEXT,
  target_id UUID,
  target_data JSONB DEFAULT '{}',

  -- Before/After for changes
  previous_state JSONB,
  new_state JSONB,

  -- Client Info (snapshot)
  ip_address TEXT,
  user_agent TEXT,
  geo_location JSONB DEFAULT '{}',

  -- Metadata
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE external_party_actions IS 'Complete audit trail of external party activities';

-- ============================================
-- 4. NEGOTIATION MESSAGES
-- ============================================

CREATE TABLE negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Context
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  redline_session_id UUID REFERENCES redline_sessions(id) ON DELETE CASCADE,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,

  -- Thread
  thread_id UUID,  -- NULL = new thread, else reply
  parent_message_id UUID REFERENCES negotiation_messages(id) ON DELETE SET NULL,

  -- Sender
  sender_type TEXT NOT NULL CHECK (sender_type IN ('internal', 'external')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_token_id UUID REFERENCES external_access_tokens(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_company TEXT,

  -- Message Content
  subject TEXT,
  message_text TEXT NOT NULL,
  message_html TEXT,

  -- Attachments
  attachments JSONB DEFAULT '[]',

  -- Related Items (what is this message about)
  related_clause_id UUID,
  related_redline_id UUID,
  related_field TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'draft', 'sent', 'delivered', 'read', 'archived'
  )),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  read_by UUID[],

  -- Flags
  is_important BOOLEAN DEFAULT false,
  is_action_required BOOLEAN DEFAULT false,
  action_due_date TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either contract or redline session must be set
  CONSTRAINT msg_has_context CHECK (
    contract_id IS NOT NULL OR
    redline_session_id IS NOT NULL OR
    signature_request_id IS NOT NULL
  )
);

COMMENT ON TABLE negotiation_messages IS 'Negotiation communication between internal and external parties';
COMMENT ON COLUMN negotiation_messages.thread_id IS 'Groups messages into conversation threads';

-- ============================================
-- 5. PORTAL INVITATIONS
-- ============================================

CREATE TABLE portal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES external_access_tokens(id) ON DELETE CASCADE,

  -- Email Details
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,

  -- Template Used
  template_name TEXT DEFAULT 'default',
  template_variables JSONB DEFAULT '{}',

  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  )),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounce_reason TEXT,
  failure_reason TEXT,

  -- Email Provider
  email_provider TEXT,
  external_message_id TEXT,

  -- Tracking
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE portal_invitations IS 'Email invitations sent to external parties';

-- ============================================
-- 6. EXTERNAL PARTY SIGNATURES (drawn/typed)
-- ============================================

CREATE TABLE external_party_drawn_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES external_access_tokens(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES external_party_sessions(id) ON DELETE CASCADE,

  -- Signature Data
  signature_type TEXT NOT NULL CHECK (signature_type IN (
    'drawn', 'typed', 'uploaded'
  )),
  signature_data TEXT NOT NULL,  -- Base64 PNG for drawn, text for typed, path for uploaded
  signature_hash TEXT NOT NULL,  -- SHA-256 of signature_data

  -- For typed signatures
  font_family TEXT,
  font_size INTEGER,

  -- For drawn signatures
  stroke_data JSONB,  -- Array of stroke points for verification

  -- Capture Info
  canvas_width INTEGER,
  canvas_height INTEGER,
  device_type TEXT,

  -- Legal
  consent_text TEXT NOT NULL,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT NOT NULL,
  user_agent TEXT,

  -- Used In
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE external_party_drawn_signatures IS 'Captured drawn/typed signatures from external parties';
COMMENT ON COLUMN external_party_drawn_signatures.stroke_data IS 'Raw stroke data for signature verification';

-- ============================================
-- 7. INDEXES
-- ============================================

-- external_access_tokens indexes
CREATE INDEX idx_eat_enterprise ON external_access_tokens(enterprise_id);
CREATE INDEX idx_eat_hash ON external_access_tokens(token_hash);
CREATE INDEX idx_eat_email ON external_access_tokens(party_email);
CREATE INDEX idx_eat_contract ON external_access_tokens(contract_id);
CREATE INDEX idx_eat_signature ON external_access_tokens(signature_request_id);
CREATE INDEX idx_eat_redline ON external_access_tokens(redline_session_id);
CREATE INDEX idx_eat_status ON external_access_tokens(status);
CREATE INDEX idx_eat_expires ON external_access_tokens(expires_at) WHERE status = 'active';
CREATE INDEX idx_eat_active ON external_access_tokens(enterprise_id, status) WHERE status = 'active';

-- external_party_sessions indexes
CREATE INDEX idx_eps_token ON external_party_sessions(token_id);
CREATE INDEX idx_eps_hash ON external_party_sessions(session_token_hash);
CREATE INDEX idx_eps_status ON external_party_sessions(status);
CREATE INDEX idx_eps_activity ON external_party_sessions(last_activity);
CREATE INDEX idx_eps_expires ON external_party_sessions(expires_at) WHERE status = 'active';

-- external_party_actions indexes
CREATE INDEX idx_epa_session ON external_party_actions(session_id);
CREATE INDEX idx_epa_token ON external_party_actions(token_id);
CREATE INDEX idx_epa_type ON external_party_actions(action_type);
CREATE INDEX idx_epa_created ON external_party_actions(created_at DESC);
CREATE INDEX idx_epa_target ON external_party_actions(target_type, target_id);

-- negotiation_messages indexes
CREATE INDEX idx_nm_enterprise ON negotiation_messages(enterprise_id);
CREATE INDEX idx_nm_contract ON negotiation_messages(contract_id);
CREATE INDEX idx_nm_redline ON negotiation_messages(redline_session_id);
CREATE INDEX idx_nm_thread ON negotiation_messages(thread_id);
CREATE INDEX idx_nm_sender_user ON negotiation_messages(sender_user_id);
CREATE INDEX idx_nm_sender_token ON negotiation_messages(sender_token_id);
CREATE INDEX idx_nm_status ON negotiation_messages(status);
CREATE INDEX idx_nm_created ON negotiation_messages(created_at DESC);
CREATE INDEX idx_nm_unread ON negotiation_messages(contract_id, status) WHERE status IN ('sent', 'delivered');

-- portal_invitations indexes
CREATE INDEX idx_pi_enterprise ON portal_invitations(enterprise_id);
CREATE INDEX idx_pi_token ON portal_invitations(token_id);
CREATE INDEX idx_pi_email ON portal_invitations(recipient_email);
CREATE INDEX idx_pi_status ON portal_invitations(status);

-- external_party_drawn_signatures indexes
CREATE INDEX idx_epds_token ON external_party_drawn_signatures(token_id);
CREATE INDEX idx_epds_session ON external_party_drawn_signatures(session_id);

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE external_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_party_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_party_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_party_drawn_signatures ENABLE ROW LEVEL SECURITY;

-- external_access_tokens RLS
CREATE POLICY "eat_enterprise_isolation" ON external_access_tokens
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- external_party_sessions RLS (via token)
CREATE POLICY "eps_via_token" ON external_party_sessions
  FOR ALL USING (
    token_id IN (
      SELECT id FROM external_access_tokens
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- external_party_actions RLS (via token)
CREATE POLICY "epa_via_token" ON external_party_actions
  FOR ALL USING (
    token_id IN (
      SELECT id FROM external_access_tokens
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- negotiation_messages RLS
CREATE POLICY "nm_enterprise_isolation" ON negotiation_messages
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- portal_invitations RLS
CREATE POLICY "pi_enterprise_isolation" ON portal_invitations
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- external_party_drawn_signatures RLS (via token)
CREATE POLICY "epds_via_token" ON external_party_drawn_signatures
  FOR ALL USING (
    token_id IN (
      SELECT id FROM external_access_tokens
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_external_portal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eat_update_timestamp
  BEFORE UPDATE ON external_access_tokens
  FOR EACH ROW EXECUTE FUNCTION update_external_portal_timestamp();

CREATE TRIGGER nm_update_timestamp
  BEFORE UPDATE ON negotiation_messages
  FOR EACH ROW EXECUTE FUNCTION update_external_portal_timestamp();

-- Auto-expire tokens
CREATE OR REPLACE FUNCTION expire_old_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eat_auto_expire
  BEFORE UPDATE ON external_access_tokens
  FOR EACH ROW EXECUTE FUNCTION expire_old_tokens();

-- Auto-expire sessions
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eps_auto_expire
  BEFORE UPDATE ON external_party_sessions
  FOR EACH ROW EXECUTE FUNCTION expire_old_sessions();

-- Increment use count on session creation
CREATE OR REPLACE FUNCTION increment_token_use_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE external_access_tokens
  SET use_count = use_count + 1
  WHERE id = NEW.token_id;

  -- Check if max uses reached
  UPDATE external_access_tokens
  SET status = 'used'
  WHERE id = NEW.token_id
  AND max_uses > 0
  AND use_count >= max_uses
  AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eps_increment_use
  AFTER INSERT ON external_party_sessions
  FOR EACH ROW EXECUTE FUNCTION increment_token_use_count();

-- Set thread_id for messages
CREATE OR REPLACE FUNCTION set_message_thread()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    SELECT thread_id INTO NEW.thread_id
    FROM negotiation_messages
    WHERE id = NEW.parent_message_id;
  END IF;

  IF NEW.thread_id IS NULL THEN
    NEW.thread_id := NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nm_set_thread
  BEFORE INSERT ON negotiation_messages
  FOR EACH ROW EXECUTE FUNCTION set_message_thread();

-- ============================================
-- 10. HELPER FUNCTIONS
-- ============================================

-- Generate a secure access token
CREATE OR REPLACE FUNCTION generate_external_access_token(
  p_enterprise_id UUID,
  p_token_type TEXT,
  p_party_email TEXT,
  p_party_name TEXT,
  p_party_company TEXT DEFAULT NULL,
  p_party_role TEXT DEFAULT 'counterparty',
  p_contract_id UUID DEFAULT NULL,
  p_signature_request_id UUID DEFAULT NULL,
  p_redline_session_id UUID DEFAULT NULL,
  p_expires_days INTEGER DEFAULT 30,
  p_require_pin BOOLEAN DEFAULT false,
  p_custom_message TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  token_id UUID,
  raw_token TEXT,  -- Return raw token once, never stored
  token_prefix TEXT
) AS $$
DECLARE
  v_token_id UUID;
  v_raw_token TEXT;
  v_token_hash TEXT;
  v_token_prefix TEXT;
BEGIN
  -- Generate secure random token (32 bytes = 64 hex chars)
  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(sha256(v_raw_token::BYTEA), 'hex');
  v_token_prefix := LEFT(v_raw_token, 8);

  INSERT INTO external_access_tokens (
    enterprise_id,
    token_hash,
    token_prefix,
    token_type,
    contract_id,
    signature_request_id,
    redline_session_id,
    party_email,
    party_name,
    party_company,
    party_role,
    require_email_verification,
    expires_at,
    custom_message,
    created_by
  ) VALUES (
    p_enterprise_id,
    v_token_hash,
    v_token_prefix,
    p_token_type,
    p_contract_id,
    p_signature_request_id,
    p_redline_session_id,
    p_party_email,
    p_party_name,
    p_party_company,
    p_party_role,
    true,  -- Always require email verification
    NOW() + (p_expires_days || ' days')::INTERVAL,
    p_custom_message,
    p_created_by
  ) RETURNING id INTO v_token_id;

  RETURN QUERY SELECT v_token_id, v_raw_token, v_token_prefix;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate an access token
CREATE OR REPLACE FUNCTION validate_external_access_token(
  p_raw_token TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  token_id UUID,
  token_type TEXT,
  party_email TEXT,
  party_name TEXT,
  party_role TEXT,
  contract_id UUID,
  signature_request_id UUID,
  redline_session_id UUID,
  document_version_id UUID,
  enterprise_id UUID,
  requires_pin BOOLEAN,
  requires_email_verification BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_token_hash TEXT;
  v_token RECORD;
BEGIN
  v_token_hash := encode(sha256(p_raw_token::BYTEA), 'hex');

  SELECT * INTO v_token
  FROM external_access_tokens
  WHERE external_access_tokens.token_hash = v_token_hash;

  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL, NULL, NULL, NULL, NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID, false, false,
      'Invalid or expired token'::TEXT;
    RETURN;
  END IF;

  -- Token expired
  IF v_token.status != 'active' OR v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT
      false, v_token.id, v_token.token_type, v_token.party_email, v_token.party_name, v_token.party_role,
      v_token.contract_id, v_token.signature_request_id, v_token.redline_session_id, v_token.document_version_id,
      v_token.enterprise_id, v_token.access_code_hash IS NOT NULL, v_token.require_email_verification,
      'Token has expired'::TEXT;
    RETURN;
  END IF;

  -- Max uses reached
  IF v_token.max_uses > 0 AND v_token.use_count >= v_token.max_uses THEN
    RETURN QUERY SELECT
      false, v_token.id, v_token.token_type, v_token.party_email, v_token.party_name, v_token.party_role,
      v_token.contract_id, v_token.signature_request_id, v_token.redline_session_id, v_token.document_version_id,
      v_token.enterprise_id, v_token.access_code_hash IS NOT NULL, v_token.require_email_verification,
      'Maximum uses reached'::TEXT;
    RETURN;
  END IF;

  -- IP whitelist check
  IF array_length(v_token.ip_whitelist, 1) > 0 AND p_ip_address IS NOT NULL THEN
    IF NOT (p_ip_address = ANY(v_token.ip_whitelist)) THEN
      RETURN QUERY SELECT
        false, v_token.id, v_token.token_type, v_token.party_email, v_token.party_name, v_token.party_role,
        v_token.contract_id, v_token.signature_request_id, v_token.redline_session_id, v_token.document_version_id,
        v_token.enterprise_id, v_token.access_code_hash IS NOT NULL, v_token.require_email_verification,
        'Access denied from this IP address'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Valid token
  RETURN QUERY SELECT
    true,
    v_token.id,
    v_token.token_type,
    v_token.party_email,
    v_token.party_name,
    v_token.party_role,
    v_token.contract_id,
    v_token.signature_request_id,
    v_token.redline_session_id,
    v_token.document_version_id,
    v_token.enterprise_id,
    v_token.access_code_hash IS NOT NULL,
    v_token.require_email_verification AND NOT v_token.email_verified,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a session for external party
CREATE OR REPLACE FUNCTION create_external_party_session(
  p_token_id UUID,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_device_fingerprint TEXT DEFAULT NULL,
  p_geo_location JSONB DEFAULT '{}'
)
RETURNS TABLE (
  session_id UUID,
  session_token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_session_id UUID;
  v_session_token TEXT;
  v_session_hash TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_session_hash := encode(sha256(v_session_token::BYTEA), 'hex');
  v_expires := NOW() + INTERVAL '24 hours';

  INSERT INTO external_party_sessions (
    token_id,
    session_token_hash,
    ip_address,
    user_agent,
    device_fingerprint,
    geo_location,
    expires_at
  ) VALUES (
    p_token_id,
    v_session_hash,
    p_ip_address,
    p_user_agent,
    p_device_fingerprint,
    p_geo_location,
    v_expires
  ) RETURNING id INTO v_session_id;

  -- Log the login action
  INSERT INTO external_party_actions (
    session_id, token_id, action_type, action_description,
    ip_address, user_agent, geo_location
  ) VALUES (
    v_session_id, p_token_id, 'login', 'External party session started',
    p_ip_address, p_user_agent, p_geo_location
  );

  RETURN QUERY SELECT v_session_id, v_session_token, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log an external party action
CREATE OR REPLACE FUNCTION log_external_party_action(
  p_session_id UUID,
  p_action_type TEXT,
  p_action_description TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_data JSONB DEFAULT '{}',
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_token_id UUID;
  v_session RECORD;
BEGIN
  SELECT * INTO v_session
  FROM external_party_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  INSERT INTO external_party_actions (
    session_id,
    token_id,
    action_type,
    action_description,
    target_type,
    target_id,
    target_data,
    previous_state,
    new_state,
    ip_address,
    user_agent,
    geo_location,
    metadata
  ) VALUES (
    p_session_id,
    v_session.token_id,
    p_action_type,
    p_action_description,
    p_target_type,
    p_target_id,
    p_target_data,
    p_previous_state,
    p_new_state,
    v_session.ip_address,
    v_session.user_agent,
    v_session.geo_location,
    p_metadata
  ) RETURNING id INTO v_action_id;

  -- Update session activity
  UPDATE external_party_sessions
  SET last_activity = NOW()
  WHERE id = p_session_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send a negotiation message
CREATE OR REPLACE FUNCTION send_negotiation_message(
  p_enterprise_id UUID,
  p_contract_id UUID,
  p_sender_type TEXT,
  p_sender_user_id UUID DEFAULT NULL,
  p_sender_token_id UUID DEFAULT NULL,
  p_message_text TEXT DEFAULT NULL,
  p_parent_message_id UUID DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_is_important BOOLEAN DEFAULT false,
  p_related_clause_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_email TEXT;
  v_sender_company TEXT;
BEGIN
  -- Get sender info
  IF p_sender_type = 'internal' AND p_sender_user_id IS NOT NULL THEN
    SELECT
      COALESCE(u.raw_user_meta_data->>'full_name', u.email),
      u.email,
      e.name
    INTO v_sender_name, v_sender_email, v_sender_company
    FROM auth.users u
    JOIN users eu ON eu.auth_user_id = u.id
    LEFT JOIN enterprises e ON eu.enterprise_id = e.id
    WHERE u.id = p_sender_user_id;
  ELSIF p_sender_type = 'external' AND p_sender_token_id IS NOT NULL THEN
    SELECT party_name, party_email, party_company
    INTO v_sender_name, v_sender_email, v_sender_company
    FROM external_access_tokens
    WHERE id = p_sender_token_id;
  ELSE
    RAISE EXCEPTION 'Invalid sender information';
  END IF;

  INSERT INTO negotiation_messages (
    enterprise_id,
    contract_id,
    parent_message_id,
    sender_type,
    sender_user_id,
    sender_token_id,
    sender_name,
    sender_email,
    sender_company,
    subject,
    message_text,
    is_important,
    related_clause_id,
    status
  ) VALUES (
    p_enterprise_id,
    p_contract_id,
    p_parent_message_id,
    p_sender_type,
    p_sender_user_id,
    p_sender_token_id,
    v_sender_name,
    v_sender_email,
    v_sender_company,
    p_subject,
    p_message_text,
    p_is_important,
    p_related_clause_id,
    'sent'
  ) RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get messages for a contract/negotiation
CREATE OR REPLACE FUNCTION get_negotiation_messages(
  p_contract_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  message_id UUID,
  thread_id UUID,
  parent_message_id UUID,
  sender_type TEXT,
  sender_name TEXT,
  sender_email TEXT,
  sender_company TEXT,
  subject TEXT,
  message_text TEXT,
  is_important BOOLEAN,
  status TEXT,
  created_at TIMESTAMPTZ,
  reply_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nm.id,
    nm.thread_id,
    nm.parent_message_id,
    nm.sender_type,
    nm.sender_name,
    nm.sender_email,
    nm.sender_company,
    nm.subject,
    nm.message_text,
    nm.is_important,
    nm.status,
    nm.created_at,
    (SELECT COUNT(*) FROM negotiation_messages replies WHERE replies.thread_id = nm.id AND replies.id != nm.id)
  FROM negotiation_messages nm
  WHERE nm.contract_id = p_contract_id
  AND nm.parent_message_id IS NULL  -- Only root messages
  ORDER BY nm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Revoke an access token
CREATE OR REPLACE FUNCTION revoke_external_access_token(
  p_token_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_revoked_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE external_access_tokens
  SET
    status = 'revoked',
    revoked_at = NOW(),
    revoked_by = p_revoked_by,
    revoke_reason = p_reason
  WHERE id = p_token_id
  AND status = 'active';

  -- Terminate all active sessions
  UPDATE external_party_sessions
  SET
    status = 'terminated',
    terminated_reason = 'Token revoked'
  WHERE token_id = p_token_id
  AND status = 'active';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get external access summary for a contract
CREATE OR REPLACE FUNCTION get_contract_external_access_summary(p_contract_id UUID)
RETURNS TABLE (
  total_tokens INTEGER,
  active_tokens INTEGER,
  total_sessions INTEGER,
  total_actions INTEGER,
  parties JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT eat.id)::INTEGER,
    COUNT(DISTINCT eat.id) FILTER (WHERE eat.status = 'active')::INTEGER,
    COUNT(DISTINCT eps.id)::INTEGER,
    COUNT(DISTINCT epa.id)::INTEGER,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
      'email', eat.party_email,
      'name', eat.party_name,
      'company', eat.party_company,
      'role', eat.party_role,
      'token_type', eat.token_type,
      'status', eat.status,
      'last_access', (SELECT MAX(eps2.last_activity) FROM external_party_sessions eps2 WHERE eps2.token_id = eat.id)
    )) FILTER (WHERE eat.id IS NOT NULL), '[]'::JSONB)
  FROM external_access_tokens eat
  LEFT JOIN external_party_sessions eps ON eps.token_id = eat.id
  LEFT JOIN external_party_actions epa ON epa.token_id = eat.id
  WHERE eat.contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_external_access_token TO authenticated;
GRANT EXECUTE ON FUNCTION validate_external_access_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_external_party_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_external_party_action TO anon, authenticated;
GRANT EXECUTE ON FUNCTION send_negotiation_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_negotiation_messages TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_external_access_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_external_access_summary TO authenticated;
