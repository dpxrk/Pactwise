-- Agent Authentication System
-- Implements secure agent-to-agent authentication with JWT tokens and key management

-- Agent credentials table
CREATE TABLE agent_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL, -- 'api_key', 'jwt_secret', 'certificate'
    credential_value TEXT NOT NULL, -- Encrypted credential
    credential_hash VARCHAR(256) NOT NULL, -- For quick lookups without decryption
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    rotation_scheduled_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,
    
    CONSTRAINT unique_active_credential UNIQUE (agent_id, credential_type, is_active)
);

-- Agent authentication tokens (active sessions)
CREATE TABLE agent_auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    token_hash VARCHAR(256) NOT NULL UNIQUE, -- SHA-256 hash of token
    token_type VARCHAR(50) NOT NULL, -- 'access', 'refresh'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    scope JSONB DEFAULT '[]', -- Permitted operations
    claims JSONB DEFAULT '{}', -- Additional JWT claims
    parent_token_id UUID REFERENCES agent_auth_tokens(id), -- For refresh tokens
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoke_reason TEXT
);

-- Agent authentication logs
CREATE TABLE agent_auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'token_refresh', 'auth_failure', 'permission_denied'
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    token_id UUID REFERENCES agent_auth_tokens(id),
    requesting_agent_id UUID REFERENCES agents(id), -- For agent-to-agent auth
    target_resource TEXT, -- What was being accessed
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent permissions (for fine-grained access control)
CREATE TABLE agent_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    permission_type VARCHAR(100) NOT NULL, -- 'call_agent', 'access_data', 'modify_workflow'
    resource_type VARCHAR(100), -- 'agent', 'contract', 'vendor', 'workflow'
    resource_id UUID, -- Specific resource ID (null for wildcard)
    allowed_actions JSONB DEFAULT '[]', -- ['read', 'write', 'execute']
    conditions JSONB DEFAULT '{}', -- Additional conditions for permission
    granted_by UUID REFERENCES users(id),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_agent_permission UNIQUE (agent_id, permission_type, resource_type, resource_id)
);

-- Agent trust relationships (for agent-to-agent communication)
CREATE TABLE agent_trust_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trustor_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trustee_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trust_level VARCHAR(50) NOT NULL, -- 'full', 'limited', 'read_only'
    allowed_operations JSONB DEFAULT '[]',
    established_by UUID REFERENCES users(id),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    interaction_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_trust_relationship UNIQUE (trustor_agent_id, trustee_agent_id),
    CONSTRAINT no_self_trust CHECK (trustor_agent_id != trustee_agent_id)
);

-- Create indexes for performance
CREATE INDEX idx_agent_credentials_agent ON agent_credentials(agent_id) WHERE is_active = true;
CREATE INDEX idx_agent_credentials_hash ON agent_credentials(credential_hash) WHERE is_active = true;
CREATE INDEX idx_agent_credentials_rotation ON agent_credentials(rotation_scheduled_at) WHERE is_active = true AND rotation_scheduled_at IS NOT NULL;

CREATE INDEX idx_agent_auth_tokens_agent ON agent_auth_tokens(agent_id) WHERE is_revoked = false;
CREATE INDEX idx_agent_auth_tokens_hash ON agent_auth_tokens(token_hash) WHERE is_revoked = false;
CREATE INDEX idx_agent_auth_tokens_expiry ON agent_auth_tokens(expires_at) WHERE is_revoked = false;
CREATE INDEX idx_agent_auth_tokens_refresh ON agent_auth_tokens(parent_token_id) WHERE token_type = 'refresh' AND is_revoked = false;

CREATE INDEX idx_agent_auth_logs_agent ON agent_auth_logs(agent_id, created_at DESC);
CREATE INDEX idx_agent_auth_logs_failures ON agent_auth_logs(agent_id, created_at DESC) WHERE success = false;
CREATE INDEX idx_agent_auth_logs_enterprise ON agent_auth_logs(enterprise_id, created_at DESC);

CREATE INDEX idx_agent_permissions_agent ON agent_permissions(agent_id) WHERE valid_until IS NULL;
CREATE INDEX idx_agent_permissions_resource ON agent_permissions(resource_type, resource_id) WHERE valid_until IS NULL;

CREATE INDEX idx_agent_trust_relationships_trustor ON agent_trust_relationships(trustor_agent_id) WHERE valid_until IS NULL;
CREATE INDEX idx_agent_trust_relationships_trustee ON agent_trust_relationships(trustee_agent_id) WHERE valid_until IS NULL;

-- Functions for authentication

-- Encryption key management
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT AS $$
BEGIN
    -- In production, retrieve from secure environment variable
    -- This should be a 256-bit key (32 bytes)
    RETURN coalesce(
        current_setting('app.encryption_key', true),
        'pactwise_default_encryption_key_32_bytes_length'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate agent API key
CREATE OR REPLACE FUNCTION generate_agent_api_key(
    p_agent_id UUID,
    p_created_by UUID,
    p_expires_in_days INTEGER DEFAULT 365
)
RETURNS TABLE (
    api_key TEXT,
    key_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_key_prefix TEXT;
    v_random_bytes TEXT;
    v_api_key TEXT;
    v_key_hash TEXT;
    v_credential_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_enterprise_id UUID;
BEGIN
    -- Get enterprise ID
    SELECT enterprise_id INTO v_enterprise_id
    FROM agents
    WHERE id = p_agent_id;
    
    -- Generate API key with prefix for easy identification
    v_key_prefix := 'pak_'; -- Pactwise Agent Key
    v_random_bytes := encode(gen_random_bytes(32), 'base64');
    v_random_bytes := regexp_replace(v_random_bytes, '[/+=]', '', 'g'); -- Remove special chars
    v_api_key := v_key_prefix || v_random_bytes;
    
    -- Hash the key for storage
    v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
    
    -- Calculate expiration
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
    
    -- Deactivate existing keys
    UPDATE agent_credentials
    SET is_active = false
    WHERE agent_id = p_agent_id
      AND credential_type = 'api_key'
      AND is_active = true;
    
    -- Store the credential (encrypted)
    INSERT INTO agent_credentials (
        agent_id,
        credential_type,
        credential_value,
        credential_hash,
        expires_at,
        created_by,
        enterprise_id,
        metadata
    ) VALUES (
        p_agent_id,
        'api_key',
        pgp_sym_encrypt(v_api_key, get_encryption_key()), -- FIXED: Now properly encrypted
        v_key_hash,
        v_expires_at,
        p_created_by,
        v_enterprise_id,
        jsonb_build_object(
            'key_prefix', v_key_prefix,
            'algorithm', 'random_bytes_32',
            'encryption', 'pgp_sym_encrypt'
        )
    ) RETURNING id INTO v_credential_id;
    
    -- Log the creation
    INSERT INTO agent_auth_logs (
        agent_id,
        event_type,
        success,
        metadata,
        enterprise_id
    ) VALUES (
        p_agent_id,
        'api_key_created',
        true,
        jsonb_build_object(
            'credential_id', v_credential_id,
            'expires_in_days', p_expires_in_days,
            'created_by', p_created_by
        ),
        v_enterprise_id
    );
    
    RETURN QUERY
    SELECT v_api_key, v_credential_id, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate agent API key
CREATE OR REPLACE FUNCTION validate_agent_api_key(
    p_api_key TEXT
)
RETURNS TABLE (
    agent_id UUID,
    enterprise_id UUID,
    is_valid BOOLEAN,
    failure_reason TEXT
) AS $$
DECLARE
    v_key_hash TEXT;
    v_credential RECORD;
    v_decrypted_key TEXT;
BEGIN
    -- Hash the provided key
    v_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');
    
    -- Look up the credential and decrypt it for verification
    SELECT c.*, a.enterprise_id as ent_id,
           pgp_sym_decrypt(c.credential_value, get_encryption_key()) as decrypted_value
    INTO v_credential
    FROM agent_credentials c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.credential_hash = v_key_hash
      AND c.credential_type = 'api_key'
      AND c.is_active = true;
    
    IF NOT FOUND THEN
        -- Log failed attempt (without exposing the key)
        INSERT INTO agent_auth_logs (
            agent_id,
            event_type,
            success,
            failure_reason,
            enterprise_id
        ) VALUES (
            NULL,
            'auth_failure',
            false,
            'Invalid API key',
            NULL
        );
        
        RETURN QUERY
        SELECT NULL::UUID, NULL::UUID, false, 'Invalid API key';
        RETURN;
    END IF;
    
    -- Verify the decrypted key matches the provided key (double-check security)
    IF v_credential.decrypted_value != p_api_key THEN
        -- Log verification failure
        INSERT INTO agent_auth_logs (
            agent_id,
            event_type,
            success,
            failure_reason,
            enterprise_id
        ) VALUES (
            v_credential.agent_id,
            'auth_failure',
            false,
            'Key verification failed',
            v_credential.ent_id
        );
        
        RETURN QUERY
        SELECT v_credential.agent_id, v_credential.ent_id, false, 'Key verification failed';
        RETURN;
    END IF;
    
    -- Check expiration
    IF v_credential.expires_at IS NOT NULL AND v_credential.expires_at < NOW() THEN
        -- Log expired key attempt
        INSERT INTO agent_auth_logs (
            agent_id,
            event_type,
            success,
            failure_reason,
            enterprise_id
        ) VALUES (
            v_credential.agent_id,
            'auth_failure',
            false,
            'API key expired',
            v_credential.ent_id
        );
        
        RETURN QUERY
        SELECT v_credential.agent_id, v_credential.ent_id, false, 'API key expired';
        RETURN;
    END IF;
    
    -- Update last used
    UPDATE agent_credentials
    SET last_used_at = NOW()
    WHERE id = v_credential.id;
    
    -- Log successful authentication
    INSERT INTO agent_auth_logs (
        agent_id,
        event_type,
        success,
        enterprise_id
    ) VALUES (
        v_credential.agent_id,
        'api_key_auth',
        true,
        v_credential.ent_id
    );
    
    RETURN QUERY
    SELECT v_credential.agent_id, v_credential.ent_id, true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check agent permission
CREATE OR REPLACE FUNCTION check_agent_permission(
    p_agent_id UUID,
    p_permission_type VARCHAR(100),
    p_resource_type VARCHAR(100) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_action VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- Check for matching permission
    SELECT EXISTS (
        SELECT 1
        FROM agent_permissions ap
        WHERE ap.agent_id = p_agent_id
          AND ap.permission_type = p_permission_type
          AND (p_resource_type IS NULL OR ap.resource_type = p_resource_type OR ap.resource_type IS NULL)
          AND (p_resource_id IS NULL OR ap.resource_id = p_resource_id OR ap.resource_id IS NULL)
          AND (p_action IS NULL OR ap.allowed_actions ? p_action)
          AND (ap.valid_from IS NULL OR ap.valid_from <= NOW())
          AND (ap.valid_until IS NULL OR ap.valid_until > NOW())
    ) INTO v_has_permission;
    
    -- Log permission check
    INSERT INTO agent_auth_logs (
        agent_id,
        event_type,
        success,
        target_resource,
        metadata,
        enterprise_id
    ) VALUES (
        p_agent_id,
        'permission_check',
        v_has_permission,
        COALESCE(p_resource_type || ':' || p_resource_id::TEXT, p_permission_type),
        jsonb_build_object(
            'permission_type', p_permission_type,
            'resource_type', p_resource_type,
            'resource_id', p_resource_id,
            'action', p_action
        ),
        (SELECT enterprise_id FROM agents WHERE id = p_agent_id)
    );
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check agent trust relationship
CREATE OR REPLACE FUNCTION check_agent_trust(
    p_trustor_id UUID,
    p_trustee_id UUID,
    p_operation VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_trust_exists BOOLEAN;
    v_trust_level VARCHAR(50);
BEGIN
    -- Check for trust relationship
    SELECT 
        EXISTS (
            SELECT 1
            WHERE trust_level IN ('full', 'limited')
              AND (p_operation IS NULL OR allowed_operations ? p_operation)
        ),
        trust_level
    INTO v_trust_exists, v_trust_level
    FROM agent_trust_relationships
    WHERE trustor_agent_id = p_trustor_id
      AND trustee_agent_id = p_trustee_id
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until > NOW());
    
    IF v_trust_exists THEN
        -- Update interaction tracking
        UPDATE agent_trust_relationships
        SET last_interaction_at = NOW(),
            interaction_count = interaction_count + 1
        WHERE trustor_agent_id = p_trustor_id
          AND trustee_agent_id = p_trustee_id;
    END IF;
    
    RETURN COALESCE(v_trust_exists, false);
END;
$$ LANGUAGE plpgsql;

-- Clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete expired tokens
    WITH deleted AS (
        DELETE FROM agent_auth_tokens
        WHERE expires_at < NOW() - INTERVAL '24 hours'
           OR (is_revoked = true AND revoked_at < NOW() - INTERVAL '7 days')
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
    
    -- Clean up old auth logs
    DELETE FROM agent_auth_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trust_relationships ENABLE ROW LEVEL SECURITY;

-- Only admins can manage agent credentials
CREATE POLICY "Admins can manage agent credentials"
    ON agent_credentials
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id 
            FROM users 
            WHERE auth_id = auth.uid() 
              AND role IN ('admin', 'owner')
        )
    );

-- Agents can read their own tokens
CREATE POLICY "Agents can read own tokens"
    ON agent_auth_tokens
    FOR SELECT
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE enterprise_id IN (
                SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- View own auth logs
CREATE POLICY "View own enterprise auth logs"
    ON agent_auth_logs
    FOR SELECT
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

-- Manage permissions (admin only)
CREATE POLICY "Admins manage agent permissions"
    ON agent_permissions
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id 
            FROM users 
            WHERE auth_id = auth.uid() 
              AND role IN ('admin', 'owner')
        )
    );

-- Manage trust relationships (admin only)
CREATE POLICY "Admins manage trust relationships"
    ON agent_trust_relationships
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id 
            FROM users 
            WHERE auth_id = auth.uid() 
              AND role IN ('admin', 'owner')
        )
    );

-- Grant permissions
GRANT SELECT ON agent_credentials TO authenticated;
GRANT SELECT ON agent_auth_tokens TO authenticated;
GRANT SELECT ON agent_auth_logs TO authenticated;
GRANT SELECT ON agent_permissions TO authenticated;
GRANT SELECT ON agent_trust_relationships TO authenticated;

GRANT EXECUTE ON FUNCTION generate_agent_api_key(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_agent_api_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_agent_permission(UUID, VARCHAR, VARCHAR, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION check_agent_trust(UUID, UUID, VARCHAR) TO authenticated;