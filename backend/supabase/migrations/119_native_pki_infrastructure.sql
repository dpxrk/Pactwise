-- Migration 119: Native PKI Infrastructure
-- Native e-signature system with eIDAS Advanced level compliance
-- Provides: Certificate Authorities, User Certificates, Timestamp Tokens, CRL Management

-- ============================================
-- 1. UPDATE SIGNATURE PROVIDER TO INCLUDE NATIVE
-- ============================================

-- Add 'native' as a valid provider option
ALTER TABLE signature_provider_configs
  DROP CONSTRAINT IF EXISTS signature_provider_configs_provider_check;
ALTER TABLE signature_provider_configs
  ADD CONSTRAINT signature_provider_configs_provider_check CHECK (provider IN (
    'docusign', 'adobe_sign', 'hellosign', 'pandadoc', 'signrequest', 'manual', 'native'
  ));

-- ============================================
-- 2. CERTIFICATE AUTHORITIES (Enterprise-level PKI)
-- ============================================

CREATE TABLE certificate_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- CA Identity
  name TEXT NOT NULL,
  description TEXT,

  -- Subject Distinguished Name (X.500)
  subject_dn JSONB NOT NULL,  -- {CN, O, OU, C, ST, L, emailAddress}

  -- Key Material
  public_key_pem TEXT NOT NULL,
  private_key_encrypted BYTEA NOT NULL,  -- AES-256-GCM encrypted with enterprise key
  key_algorithm TEXT NOT NULL DEFAULT 'RSA-2048' CHECK (key_algorithm IN (
    'RSA-2048', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384'
  )),

  -- Certificate Data
  certificate_pem TEXT NOT NULL,
  serial_number BIGINT NOT NULL,
  fingerprint_sha256 TEXT NOT NULL,

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,

  -- Hierarchy
  is_root BOOLEAN DEFAULT true,
  parent_ca_id UUID REFERENCES certificate_authorities(id) ON DELETE SET NULL,
  path_length_constraint INTEGER DEFAULT 0,  -- For certificate chain depth

  -- Key Usage
  key_usage TEXT[] DEFAULT '{keyCertSign, cRLSign}',

  -- CRL Configuration
  crl_url TEXT,
  crl_next_update TIMESTAMPTZ,
  crl_number BIGINT DEFAULT 0,

  -- OCSP Configuration (optional)
  ocsp_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'suspended', 'revoked', 'expired'
  )),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ca_validity_check CHECK (valid_until > valid_from),
  CONSTRAINT ca_serial_enterprise_unique UNIQUE (enterprise_id, serial_number)
);

COMMENT ON TABLE certificate_authorities IS 'Enterprise Certificate Authorities for native PKI';
COMMENT ON COLUMN certificate_authorities.subject_dn IS 'X.500 Distinguished Name: {CN, O, OU, C, ST, L, emailAddress}';
COMMENT ON COLUMN certificate_authorities.private_key_encrypted IS 'AES-256-GCM encrypted private key';
COMMENT ON COLUMN certificate_authorities.path_length_constraint IS 'Max intermediate CAs allowed (0 = end-entity only)';

-- ============================================
-- 3. USER/SIGNATORY CERTIFICATES
-- ============================================

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  ca_id UUID NOT NULL REFERENCES certificate_authorities(id) ON DELETE CASCADE,

  -- Subject Info
  subject_dn JSONB NOT NULL,  -- {CN, O, OU, C, emailAddress}
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Certificate Data
  serial_number BIGINT NOT NULL,
  certificate_pem TEXT NOT NULL,
  public_key_pem TEXT NOT NULL,
  fingerprint_sha256 TEXT NOT NULL UNIQUE,

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,

  -- Key Usage (eIDAS Advanced requirements)
  key_usage TEXT[] DEFAULT '{digitalSignature, nonRepudiation}',
  extended_key_usage TEXT[] DEFAULT '{emailProtection}',

  -- Certificate Policy
  policy_oids TEXT[] DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'suspended', 'revoked', 'expired'
  )),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT CHECK (revocation_reason IN (
    NULL, 'unspecified', 'keyCompromise', 'caCompromise', 'affiliationChanged',
    'superseded', 'cessationOfOperation', 'certificateHold', 'removeFromCRL',
    'privilegeWithdrawn', 'aaCompromise'
  )),

  -- Usage Statistics
  signature_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cert_validity_check CHECK (valid_until > valid_from),
  CONSTRAINT cert_serial_ca_unique UNIQUE (ca_id, serial_number)
);

COMMENT ON TABLE certificates IS 'User certificates for digital signatures (eIDAS Advanced)';
COMMENT ON COLUMN certificates.subject_dn IS 'X.500 Distinguished Name identifying the signatory';
COMMENT ON COLUMN certificates.key_usage IS 'digitalSignature + nonRepudiation for legal signatures';
COMMENT ON COLUMN certificates.revocation_reason IS 'RFC 5280 CRLReason values';

-- ============================================
-- 4. RFC 3161 TIMESTAMP TOKENS
-- ============================================

CREATE TABLE timestamp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Reference to signature
  signature_event_id UUID REFERENCES signature_events(id) ON DELETE SET NULL,
  signature_document_id UUID REFERENCES signature_documents(id) ON DELETE SET NULL,

  -- TSA Info
  tsa_name TEXT NOT NULL,  -- 'internal' or external TSA name
  tsa_url TEXT,
  tsa_policy_oid TEXT,  -- Timestamp Policy OID

  -- Token Data (RFC 3161 TimeStampToken)
  timestamp_token BYTEA NOT NULL,  -- DER-encoded TST
  timestamp_time TIMESTAMPTZ NOT NULL,

  -- Message Imprint (what was timestamped)
  message_imprint BYTEA NOT NULL,  -- Hash of signed content
  message_imprint_algorithm TEXT NOT NULL DEFAULT 'SHA-256' CHECK (
    message_imprint_algorithm IN ('SHA-256', 'SHA-384', 'SHA-512')
  ),

  -- Token Details
  serial_number BIGINT NOT NULL,
  nonce BYTEA,

  -- Accuracy (optional)
  accuracy_seconds INTEGER,
  accuracy_millis INTEGER,
  accuracy_micros INTEGER,

  -- Ordering
  ordering BOOLEAN DEFAULT false,

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE timestamp_tokens IS 'RFC 3161 timestamp tokens for non-repudiation';
COMMENT ON COLUMN timestamp_tokens.timestamp_token IS 'DER-encoded TimeStampToken (ContentInfo)';
COMMENT ON COLUMN timestamp_tokens.message_imprint IS 'Hash of the signed data that was timestamped';
COMMENT ON COLUMN timestamp_tokens.tsa_policy_oid IS 'TSA policy identifier OID';

-- ============================================
-- 5. CERTIFICATE REVOCATION LIST ENTRIES
-- ============================================

CREATE TABLE certificate_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ca_id UUID NOT NULL REFERENCES certificate_authorities(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,

  -- Revocation Info
  serial_number BIGINT NOT NULL,
  revocation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL DEFAULT 'unspecified' CHECK (reason IN (
    'unspecified', 'keyCompromise', 'caCompromise', 'affiliationChanged',
    'superseded', 'cessationOfOperation', 'certificateHold', 'removeFromCRL',
    'privilegeWithdrawn', 'aaCompromise'
  )),

  -- Hold Info (for certificateHold)
  invalidity_date TIMESTAMPTZ,

  -- CRL Entry Extensions
  crl_entry_extensions JSONB DEFAULT '{}',

  -- Which CRL includes this
  included_in_crl_number BIGINT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ca_id, serial_number)
);

COMMENT ON TABLE certificate_revocations IS 'Certificate revocation list entries for CRL generation';

-- ============================================
-- 6. SIGNATURE CERTIFICATES LINK TABLE
-- ============================================

-- Link signatures to their certificates for verification
CREATE TABLE signature_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Signature Reference
  signature_event_id UUID NOT NULL REFERENCES signature_events(id) ON DELETE CASCADE,
  signatory_id UUID REFERENCES signature_signatories(id) ON DELETE SET NULL,

  -- Certificate Used
  certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
  certificate_serial BIGINT NOT NULL,
  certificate_fingerprint TEXT NOT NULL,
  certificate_subject_dn JSONB NOT NULL,

  -- Signature Data
  signature_algorithm TEXT NOT NULL DEFAULT 'SHA256withRSA' CHECK (
    signature_algorithm IN (
      'SHA256withRSA', 'SHA384withRSA', 'SHA512withRSA',
      'SHA256withECDSA', 'SHA384withECDSA', 'SHA512withECDSA'
    )
  ),
  signature_value BYTEA NOT NULL,
  signed_data_hash TEXT NOT NULL,
  signed_data_hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',

  -- CMS/PKCS#7 Signed Data
  cms_signed_data BYTEA,  -- Full CMS structure

  -- Timestamp
  timestamp_token_id UUID REFERENCES timestamp_tokens(id) ON DELETE SET NULL,

  -- Verification at signing time
  certificate_valid_at_signing BOOLEAN NOT NULL DEFAULT true,
  certificate_chain JSONB DEFAULT '[]',  -- Serialized certificate chain

  -- LTV (Long-Term Validation) Data
  ocsp_response BYTEA,
  crl_snapshot BYTEA,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE signature_certificates IS 'Links signatures to certificates with cryptographic proof';
COMMENT ON COLUMN signature_certificates.cms_signed_data IS 'Full CMS SignedData structure (PKCS#7)';
COMMENT ON COLUMN signature_certificates.certificate_chain IS 'Certificate chain for validation';

-- ============================================
-- 7. PDF SIGNATURE METADATA
-- ============================================

CREATE TABLE pdf_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  signature_document_id UUID NOT NULL REFERENCES signature_documents(id) ON DELETE CASCADE,
  signature_certificate_id UUID REFERENCES signature_certificates(id) ON DELETE SET NULL,

  -- PDF Signature Info
  signature_name TEXT NOT NULL,
  signature_reason TEXT,
  signature_location TEXT,
  contact_info TEXT,

  -- Signature Field
  page_number INTEGER NOT NULL DEFAULT 1,
  rect_ll_x DECIMAL(10,4) NOT NULL,  -- Lower-left X
  rect_ll_y DECIMAL(10,4) NOT NULL,  -- Lower-left Y
  rect_ur_x DECIMAL(10,4) NOT NULL,  -- Upper-right X
  rect_ur_y DECIMAL(10,4) NOT NULL,  -- Upper-right Y

  -- ByteRange (PDF-specific)
  byte_range BIGINT[] NOT NULL,  -- [offset1, length1, offset2, length2]

  -- Signature Dictionary
  filter TEXT NOT NULL DEFAULT 'Adobe.PPKLite',
  sub_filter TEXT NOT NULL DEFAULT 'adbe.pkcs7.detached' CHECK (sub_filter IN (
    'adbe.pkcs7.detached', 'adbe.pkcs7.sha1', 'ETSI.CAdES.detached', 'ETSI.RFC3161'
  )),

  -- PAdES Level
  pades_level TEXT NOT NULL DEFAULT 'B-B' CHECK (pades_level IN (
    'B-B', 'B-T', 'B-LT', 'B-LTA'
  )),

  -- Visual Appearance
  has_visible_signature BOOLEAN DEFAULT true,
  appearance_stream BYTEA,

  -- Document Hash
  document_hash TEXT NOT NULL,
  document_hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',

  -- Timestamps
  signing_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_result JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pdf_signatures IS 'PAdES (PDF Advanced Electronic Signatures) metadata';
COMMENT ON COLUMN pdf_signatures.byte_range IS 'PDF ByteRange array for signature calculation';
COMMENT ON COLUMN pdf_signatures.pades_level IS 'PAdES conformance level: B-B, B-T (timestamped), B-LT (long-term), B-LTA (archival)';

-- ============================================
-- 8. CA SERIAL NUMBER SEQUENCE
-- ============================================

CREATE TABLE ca_serial_sequences (
  ca_id UUID PRIMARY KEY REFERENCES certificate_authorities(id) ON DELETE CASCADE,
  next_serial BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ca_serial_sequences IS 'Serial number sequences for certificate authorities';

-- Function to get next serial number atomically
CREATE OR REPLACE FUNCTION get_next_ca_serial(p_ca_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_serial BIGINT;
BEGIN
  UPDATE ca_serial_sequences
  SET next_serial = next_serial + 1, updated_at = NOW()
  WHERE ca_id = p_ca_id
  RETURNING next_serial - 1 INTO v_serial;

  IF v_serial IS NULL THEN
    INSERT INTO ca_serial_sequences (ca_id, next_serial)
    VALUES (p_ca_id, 2)
    ON CONFLICT (ca_id) DO UPDATE SET next_serial = ca_serial_sequences.next_serial + 1
    RETURNING next_serial - 1 INTO v_serial;
  END IF;

  RETURN v_serial;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. INDEXES
-- ============================================

-- certificate_authorities indexes
CREATE INDEX idx_ca_enterprise ON certificate_authorities(enterprise_id);
CREATE INDEX idx_ca_status ON certificate_authorities(status);
CREATE INDEX idx_ca_parent ON certificate_authorities(parent_ca_id);
CREATE INDEX idx_ca_valid ON certificate_authorities(valid_from, valid_until);
CREATE INDEX idx_ca_fingerprint ON certificate_authorities(fingerprint_sha256);

-- certificates indexes
CREATE INDEX idx_cert_enterprise ON certificates(enterprise_id);
CREATE INDEX idx_cert_ca ON certificates(ca_id);
CREATE INDEX idx_cert_user ON certificates(user_id);
CREATE INDEX idx_cert_email ON certificates(email);
CREATE INDEX idx_cert_status ON certificates(status);
CREATE INDEX idx_cert_valid ON certificates(valid_from, valid_until);
CREATE INDEX idx_cert_fingerprint ON certificates(fingerprint_sha256);
CREATE INDEX idx_cert_active ON certificates(enterprise_id, status) WHERE status = 'active';

-- timestamp_tokens indexes
CREATE INDEX idx_ts_enterprise ON timestamp_tokens(enterprise_id);
CREATE INDEX idx_ts_event ON timestamp_tokens(signature_event_id);
CREATE INDEX idx_ts_document ON timestamp_tokens(signature_document_id);
CREATE INDEX idx_ts_time ON timestamp_tokens(timestamp_time);
CREATE INDEX idx_ts_verified ON timestamp_tokens(verified);

-- certificate_revocations indexes
CREATE INDEX idx_revoc_ca ON certificate_revocations(ca_id);
CREATE INDEX idx_revoc_cert ON certificate_revocations(certificate_id);
CREATE INDEX idx_revoc_serial ON certificate_revocations(ca_id, serial_number);
CREATE INDEX idx_revoc_date ON certificate_revocations(revocation_date);

-- signature_certificates indexes
CREATE INDEX idx_sigcert_event ON signature_certificates(signature_event_id);
CREATE INDEX idx_sigcert_cert ON signature_certificates(certificate_id);
CREATE INDEX idx_sigcert_fingerprint ON signature_certificates(certificate_fingerprint);
CREATE INDEX idx_sigcert_timestamp ON signature_certificates(timestamp_token_id);

-- pdf_signatures indexes
CREATE INDEX idx_pdfsig_enterprise ON pdf_signatures(enterprise_id);
CREATE INDEX idx_pdfsig_document ON pdf_signatures(signature_document_id);
CREATE INDEX idx_pdfsig_cert ON pdf_signatures(signature_certificate_id);
CREATE INDEX idx_pdfsig_time ON pdf_signatures(signing_time);

-- ============================================
-- 10. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE certificate_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE timestamp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_serial_sequences ENABLE ROW LEVEL SECURITY;

-- certificate_authorities RLS
CREATE POLICY "ca_enterprise_isolation" ON certificate_authorities
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- certificates RLS
CREATE POLICY "cert_enterprise_isolation" ON certificates
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- timestamp_tokens RLS
CREATE POLICY "ts_enterprise_isolation" ON timestamp_tokens
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- certificate_revocations RLS (via CA)
CREATE POLICY "revoc_via_ca" ON certificate_revocations
  FOR ALL USING (
    ca_id IN (
      SELECT id FROM certificate_authorities
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- signature_certificates RLS (via signature_events)
CREATE POLICY "sigcert_via_event" ON signature_certificates
  FOR ALL USING (
    signature_event_id IN (
      SELECT se.id FROM signature_events se
      JOIN signature_requests sr ON se.signature_request_id = sr.id
      WHERE sr.enterprise_id = public.current_user_enterprise_id()
    )
  );

-- pdf_signatures RLS
CREATE POLICY "pdfsig_enterprise_isolation" ON pdf_signatures
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- ca_serial_sequences RLS (via CA)
CREATE POLICY "serial_via_ca" ON ca_serial_sequences
  FOR ALL USING (
    ca_id IN (
      SELECT id FROM certificate_authorities
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Update timestamps
CREATE TRIGGER ca_update_timestamp
  BEFORE UPDATE ON certificate_authorities
  FOR EACH ROW EXECUTE FUNCTION update_signature_timestamp();

CREATE TRIGGER cert_update_timestamp
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_signature_timestamp();

-- Increment signature count
CREATE OR REPLACE FUNCTION increment_cert_signature_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_id IS NOT NULL THEN
    UPDATE certificates
    SET signature_count = signature_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.certificate_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sigcert_increment_count
  AFTER INSERT ON signature_certificates
  FOR EACH ROW EXECUTE FUNCTION increment_cert_signature_count();

-- Auto-expire certificates
CREATE OR REPLACE FUNCTION check_certificate_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valid_until < NOW() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cert_check_expiry
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION check_certificate_expiry();

CREATE TRIGGER ca_check_expiry
  BEFORE UPDATE ON certificate_authorities
  FOR EACH ROW EXECUTE FUNCTION check_certificate_expiry();

-- Add revocation entry when certificate revoked
CREATE OR REPLACE FUNCTION create_revocation_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'revoked' AND OLD.status != 'revoked' THEN
    INSERT INTO certificate_revocations (
      ca_id,
      certificate_id,
      serial_number,
      revocation_date,
      reason,
      created_by
    ) VALUES (
      NEW.ca_id,
      NEW.id,
      NEW.serial_number,
      COALESCE(NEW.revoked_at, NOW()),
      COALESCE(NEW.revocation_reason, 'unspecified'),
      NEW.created_by
    )
    ON CONFLICT (ca_id, serial_number) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cert_create_revocation
  AFTER UPDATE OF status ON certificates
  FOR EACH ROW
  WHEN (NEW.status = 'revoked' AND OLD.status != 'revoked')
  EXECUTE FUNCTION create_revocation_entry();

-- ============================================
-- 12. HELPER FUNCTIONS
-- ============================================

-- Create a new Certificate Authority
CREATE OR REPLACE FUNCTION create_certificate_authority(
  p_enterprise_id UUID,
  p_name TEXT,
  p_subject_dn JSONB,
  p_public_key_pem TEXT,
  p_private_key_encrypted BYTEA,
  p_certificate_pem TEXT,
  p_key_algorithm TEXT DEFAULT 'RSA-2048',
  p_validity_years INTEGER DEFAULT 10,
  p_is_root BOOLEAN DEFAULT true,
  p_parent_ca_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ca_id UUID;
  v_serial BIGINT;
  v_fingerprint TEXT;
BEGIN
  -- Generate serial and fingerprint
  v_serial := FLOOR(RANDOM() * 9223372036854775807)::BIGINT;
  v_fingerprint := encode(sha256(p_certificate_pem::BYTEA), 'hex');

  INSERT INTO certificate_authorities (
    enterprise_id,
    name,
    subject_dn,
    public_key_pem,
    private_key_encrypted,
    certificate_pem,
    key_algorithm,
    serial_number,
    fingerprint_sha256,
    valid_from,
    valid_until,
    is_root,
    parent_ca_id,
    status,
    created_by
  ) VALUES (
    p_enterprise_id,
    p_name,
    p_subject_dn,
    p_public_key_pem,
    p_private_key_encrypted,
    p_certificate_pem,
    p_key_algorithm,
    v_serial,
    v_fingerprint,
    NOW(),
    NOW() + (p_validity_years || ' years')::INTERVAL,
    p_is_root,
    p_parent_ca_id,
    'active',
    p_created_by
  ) RETURNING id INTO v_ca_id;

  -- Initialize serial sequence
  INSERT INTO ca_serial_sequences (ca_id, next_serial)
  VALUES (v_ca_id, 1);

  RETURN v_ca_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a user certificate
CREATE OR REPLACE FUNCTION create_user_certificate(
  p_enterprise_id UUID,
  p_ca_id UUID,
  p_subject_dn JSONB,
  p_email TEXT,
  p_user_id UUID,
  p_public_key_pem TEXT,
  p_certificate_pem TEXT,
  p_validity_days INTEGER DEFAULT 365,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_cert_id UUID;
  v_serial BIGINT;
  v_fingerprint TEXT;
BEGIN
  -- Get next serial number
  v_serial := get_next_ca_serial(p_ca_id);
  v_fingerprint := encode(sha256(p_certificate_pem::BYTEA), 'hex');

  INSERT INTO certificates (
    enterprise_id,
    ca_id,
    subject_dn,
    email,
    user_id,
    serial_number,
    certificate_pem,
    public_key_pem,
    fingerprint_sha256,
    valid_from,
    valid_until,
    status,
    created_by
  ) VALUES (
    p_enterprise_id,
    p_ca_id,
    p_subject_dn,
    p_email,
    p_user_id,
    v_serial,
    p_certificate_pem,
    p_public_key_pem,
    v_fingerprint,
    NOW(),
    NOW() + (p_validity_days || ' days')::INTERVAL,
    'active',
    p_created_by
  ) RETURNING id INTO v_cert_id;

  RETURN v_cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke a certificate
CREATE OR REPLACE FUNCTION revoke_certificate(
  p_certificate_id UUID,
  p_reason TEXT DEFAULT 'unspecified',
  p_revoked_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE certificates
  SET
    status = 'revoked',
    revoked_at = NOW(),
    revocation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_certificate_id
  AND status = 'active';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active certificate for user
CREATE OR REPLACE FUNCTION get_active_certificate_for_user(
  p_enterprise_id UUID,
  p_user_email TEXT
)
RETURNS TABLE (
  certificate_id UUID,
  certificate_pem TEXT,
  fingerprint TEXT,
  expires_at TIMESTAMPTZ,
  ca_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.certificate_pem,
    c.fingerprint_sha256,
    c.valid_until,
    ca.name
  FROM certificates c
  JOIN certificate_authorities ca ON c.ca_id = ca.id
  WHERE c.enterprise_id = p_enterprise_id
  AND c.email = p_user_email
  AND c.status = 'active'
  AND c.valid_until > NOW()
  AND ca.status = 'active'
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Record a signature with certificate
CREATE OR REPLACE FUNCTION record_certificate_signature(
  p_signature_event_id UUID,
  p_signatory_id UUID,
  p_certificate_id UUID,
  p_signature_value BYTEA,
  p_signed_data_hash TEXT,
  p_cms_signed_data BYTEA DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_cert RECORD;
  v_sigcert_id UUID;
BEGIN
  -- Get certificate details
  SELECT
    c.serial_number,
    c.fingerprint_sha256,
    c.subject_dn,
    ca.key_algorithm
  INTO v_cert
  FROM certificates c
  JOIN certificate_authorities ca ON c.ca_id = ca.id
  WHERE c.id = p_certificate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate not found';
  END IF;

  -- Determine signature algorithm based on key
  INSERT INTO signature_certificates (
    signature_event_id,
    signatory_id,
    certificate_id,
    certificate_serial,
    certificate_fingerprint,
    certificate_subject_dn,
    signature_algorithm,
    signature_value,
    signed_data_hash,
    cms_signed_data
  ) VALUES (
    p_signature_event_id,
    p_signatory_id,
    p_certificate_id,
    v_cert.serial_number,
    v_cert.fingerprint_sha256,
    v_cert.subject_dn,
    CASE
      WHEN v_cert.key_algorithm LIKE 'RSA%' THEN 'SHA256withRSA'
      ELSE 'SHA256withECDSA'
    END,
    p_signature_value,
    p_signed_data_hash,
    p_cms_signed_data
  ) RETURNING id INTO v_sigcert_id;

  RETURN v_sigcert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get CRL entries for a CA
CREATE OR REPLACE FUNCTION get_crl_entries(p_ca_id UUID)
RETURNS TABLE (
  serial_number BIGINT,
  revocation_date TIMESTAMPTZ,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.serial_number,
    cr.revocation_date,
    cr.reason
  FROM certificate_revocations cr
  WHERE cr.ca_id = p_ca_id
  ORDER BY cr.serial_number;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Initialize native provider for enterprise
CREATE OR REPLACE FUNCTION initialize_native_signature_provider(
  p_enterprise_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_config_id UUID;
BEGIN
  -- Check if native provider already exists
  SELECT id INTO v_config_id
  FROM signature_provider_configs
  WHERE enterprise_id = p_enterprise_id
  AND provider = 'native';

  IF v_config_id IS NOT NULL THEN
    RETURN v_config_id;
  END IF;

  -- Create native provider config
  INSERT INTO signature_provider_configs (
    enterprise_id,
    provider,
    display_name,
    is_default,
    is_active,
    verification_status,
    settings,
    created_by
  ) VALUES (
    p_enterprise_id,
    'native',
    'Pactwise Native Signatures',
    true,  -- Make it default
    true,
    'verified',
    jsonb_build_object(
      'signature_format', 'PAdES-B',
      'timestamp_authority', 'internal',
      'certificate_validity_days', 365,
      'require_timestamp', true
    ),
    p_created_by
  ) RETURNING id INTO v_config_id;

  -- Unset other defaults
  UPDATE signature_provider_configs
  SET is_default = false
  WHERE enterprise_id = p_enterprise_id
  AND id != v_config_id
  AND is_default = true;

  RETURN v_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_next_ca_serial TO authenticated;
GRANT EXECUTE ON FUNCTION create_certificate_authority TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_certificate TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_certificate TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_certificate_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION record_certificate_signature TO authenticated;
GRANT EXECUTE ON FUNCTION get_crl_entries TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_native_signature_provider TO authenticated;

-- ============================================
-- 13. COMMENTS
-- ============================================

COMMENT ON FUNCTION create_certificate_authority IS 'Create an enterprise Certificate Authority with encrypted private key';
COMMENT ON FUNCTION create_user_certificate IS 'Issue a user certificate from enterprise CA';
COMMENT ON FUNCTION revoke_certificate IS 'Revoke a certificate with RFC 5280 reason code';
COMMENT ON FUNCTION get_active_certificate_for_user IS 'Get the active signing certificate for a user';
COMMENT ON FUNCTION record_certificate_signature IS 'Record a signature with its certificate and cryptographic proof';
COMMENT ON FUNCTION get_crl_entries IS 'Get all revoked certificates for CRL generation';
COMMENT ON FUNCTION initialize_native_signature_provider IS 'Initialize native e-signature provider for enterprise';
