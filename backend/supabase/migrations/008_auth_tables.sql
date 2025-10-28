-- Authentication-related tables

-- Invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    email VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    code VARCHAR(20) UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES users(auth_id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions tracking (for analytics)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id)
);

-- Password reset tracking
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Two-factor authentication
CREATE TABLE two_factor_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    secret VARCHAR(255) NOT NULL,
    backup_codes TEXT[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT false,
    enabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login attempts tracking
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invitations_code ON invitations(code) WHERE is_used = false;
CREATE INDEX idx_invitations_email ON invitations(email) WHERE is_used = false;
CREATE INDEX idx_invitations_enterprise ON invitations(enterprise_id);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token) WHERE ended_at IS NULL;

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash) WHERE used = false;

CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at DESC);

-- Add triggers
CREATE TRIGGER update_two_factor_auth_updated_at BEFORE UPDATE ON two_factor_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Invitation policies
CREATE POLICY "Admins can manage invitations" ON invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.enterprise_id = invitations.enterprise_id
            AND users.role IN ('owner', 'admin')
        )
    );

-- Session policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (user_id = public.current_user_id());

-- 2FA policies
CREATE POLICY "Users can manage their own 2FA" ON two_factor_auth
    FOR ALL USING (user_id = public.current_user_id());

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_auth_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired invitations
    DELETE FROM invitations WHERE expires_at < NOW() AND is_used = false;
    
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND used = false;
    
    -- Clean up old login attempts (keep 30 days)
    DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
    
    -- End stale sessions (24 hours of inactivity)
    UPDATE user_sessions 
    SET ended_at = last_activity_at + INTERVAL '24 hours'
    WHERE ended_at IS NULL 
    AND last_activity_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;